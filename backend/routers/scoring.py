"""Scoring endpoint: accept recording, score against reference."""

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse

from db import get_db
from config import RECORDINGS_DIR
from models import ScoreResult, AttemptResult
from services.scorer import score_recording
from services.prosody import score_prosody

router = APIRouter()


@router.post("/api/chunks/{chunk_id}/score")
async def score_chunk(
    chunk_id: str,
    file: UploadFile = File(...),
    audio_mode: str = Form("tts"),
) -> AttemptResult:
    # Get reference text and word timings
    db = await get_db()
    cursor = await db.execute(
        "SELECT text, words_json, tts_words_json FROM chunks WHERE id = ?", (chunk_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Chunk not found")
    reference = row["text"]

    # Choose prosody reference based on which audio the user was shadowing
    if audio_mode == "tts" and row["tts_words_json"]:
        ref_words = json.loads(row["tts_words_json"])
    else:
        ref_words = json.loads(row["words_json"]) if row["words_json"] else []

    # Save recording
    attempt_id = str(uuid.uuid4())
    ext = Path(file.filename or "rec.webm").suffix or ".webm"
    rec_path = RECORDINGS_DIR / f"{attempt_id}{ext}"
    content = await file.read()
    rec_path.write_bytes(content)

    # WER scoring
    wer_result = score_recording(rec_path, reference)

    # Prosody scoring (compare reference word timings with user word timings)
    user_words = wer_result.get("user_words", [])
    prosody_result = score_prosody(ref_words, user_words)

    # Determine attempt number
    cursor = await db.execute(
        "SELECT COALESCE(MAX(attempt_number), 0) + 1 as next_num FROM attempts WHERE chunk_id = ?",
        (chunk_id,),
    )
    next_row = await cursor.fetchone()
    attempt_number = next_row["next_num"]

    # Save to attempts table
    wer_details = {k: v for k, v in wer_result.items() if k != "user_words"}
    await db.execute(
        """INSERT INTO attempts (id, chunk_id, attempt_number, recording_path, transcript, wer, wer_details, prosody_score, prosody_details)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            attempt_id, chunk_id, attempt_number, str(rec_path),
            wer_result["transcript"], wer_result["wer"],
            json.dumps(wer_details), prosody_result["prosody_score"],
            json.dumps(prosody_result),
        ),
    )

    # Also write to legacy scores table for backward compat
    await db.execute(
        """INSERT INTO scores (id, chunk_id, recording_path, transcript, wer, details_json)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            attempt_id, chunk_id, str(rec_path), wer_result["transcript"],
            wer_result["wer"], json.dumps(wer_details),
        ),
    )
    await db.commit()

    cursor = await db.execute("SELECT created_at FROM attempts WHERE id = ?", (attempt_id,))
    attempt_row = await cursor.fetchone()

    return AttemptResult(
        id=attempt_id,
        chunk_id=chunk_id,
        attempt_number=attempt_number,
        wer=wer_result["wer"],
        score_pct=wer_result["score_pct"],
        prosody_score=prosody_result["prosody_score"],
        mean_offset=prosody_result["mean_offset"],
        transcript=wer_result["transcript"],
        hits=wer_result["hits"],
        insertions=wer_result["insertions"],
        deletions=wer_result["deletions"],
        substitutions=wer_result["substitutions"],
        created_at=attempt_row["created_at"] if attempt_row else None,
        alignment=wer_result.get("alignment"),
    )


@router.get("/api/chunks/{chunk_id}/attempts")
async def list_attempts(chunk_id: str) -> list[AttemptResult]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM attempts WHERE chunk_id = ? ORDER BY attempt_number DESC",
        (chunk_id,),
    )
    rows = await cursor.fetchall()
    results = []
    for r in rows:
        wer_details = json.loads(r["wer_details"]) if r["wer_details"] else {}
        prosody_details = json.loads(r["prosody_details"]) if r["prosody_details"] else {}
        results.append(AttemptResult(
            id=r["id"],
            chunk_id=r["chunk_id"],
            attempt_number=r["attempt_number"],
            wer=r["wer"] or 1.0,
            score_pct=wer_details.get("score_pct", 0),
            prosody_score=prosody_details.get("prosody_score", 0),
            mean_offset=prosody_details.get("mean_offset", 0.0),
            transcript=r["transcript"] or "",
            hits=wer_details.get("hits", 0),
            insertions=wer_details.get("insertions", 0),
            deletions=wer_details.get("deletions", 0),
            substitutions=wer_details.get("substitutions", 0),
            created_at=r["created_at"],
            alignment=wer_details.get("alignment"),
        ))
    return results


@router.get("/api/chunks/{chunk_id}/scores")
async def list_scores(chunk_id: str) -> list[ScoreResult]:
    """Legacy endpoint - returns scores from old table."""
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM scores WHERE chunk_id = ? ORDER BY created_at DESC",
        (chunk_id,),
    )
    rows = await cursor.fetchall()
    results = []
    for r in rows:
        details = json.loads(r["details_json"]) if r["details_json"] else {}
        results.append(ScoreResult(
            id=r["id"],
            wer=r["wer"] or 1.0,
            score_pct=details.get("score_pct", 0),
            transcript=r["transcript"] or "",
            hits=details.get("hits", 0),
            insertions=details.get("insertions", 0),
            deletions=details.get("deletions", 0),
            substitutions=details.get("substitutions", 0),
            created_at=r["created_at"],
            alignment=details.get("alignment"),
        ))
    return results


@router.get("/api/scores/{score_id}/recording")
async def serve_recording(score_id: str):
    db = await get_db()
    # Check attempts first, fall back to scores
    cursor = await db.execute("SELECT recording_path FROM attempts WHERE id = ?", (score_id,))
    row = await cursor.fetchone()
    if not row:
        cursor = await db.execute("SELECT recording_path FROM scores WHERE id = ?", (score_id,))
        row = await cursor.fetchone()
    if not row or not row["recording_path"]:
        raise HTTPException(404, "Recording not found")
    path = Path(row["recording_path"])
    wav_path = path.with_suffix(".wav")
    if wav_path.exists():
        return FileResponse(wav_path, media_type="audio/wav")
    if not path.exists():
        raise HTTPException(404, "Recording file missing")
    return FileResponse(path, media_type="audio/webm")
