"""Scoring endpoint: accept recording, score against reference."""

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from db import get_db
from config import RECORDINGS_DIR
from models import ScoreResult
from services.scorer import score_recording

router = APIRouter()


@router.post("/api/chunks/{chunk_id}/score")
async def score_chunk(chunk_id: str, file: UploadFile = File(...)) -> ScoreResult:
    # Get reference text
    db = await get_db()
    cursor = await db.execute("SELECT text FROM chunks WHERE id = ?", (chunk_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Chunk not found")
    reference = row["text"]

    # Save recording
    score_id = str(uuid.uuid4())
    ext = Path(file.filename or "rec.webm").suffix or ".webm"
    rec_path = RECORDINGS_DIR / f"{score_id}{ext}"
    content = await file.read()
    rec_path.write_bytes(content)

    # Score
    result = score_recording(rec_path, reference)

    # Save to DB
    await db.execute(
        """INSERT INTO scores (id, chunk_id, recording_path, transcript, wer, details_json)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            score_id, chunk_id, str(rec_path), result["transcript"],
            result["wer"], json.dumps(result),
        ),
    )
    await db.commit()

    # Fetch created_at from DB
    cursor = await db.execute("SELECT created_at FROM scores WHERE id = ?", (score_id,))
    score_row = await cursor.fetchone()

    return ScoreResult(
        id=score_id,
        wer=result["wer"],
        score_pct=result["score_pct"],
        transcript=result["transcript"],
        hits=result["hits"],
        insertions=result["insertions"],
        deletions=result["deletions"],
        substitutions=result["substitutions"],
        created_at=score_row["created_at"] if score_row else None,
        alignment=result.get("alignment"),
    )


@router.get("/api/chunks/{chunk_id}/scores")
async def list_scores(chunk_id: str) -> list[ScoreResult]:
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
    cursor = await db.execute("SELECT recording_path FROM scores WHERE id = ?", (score_id,))
    row = await cursor.fetchone()
    if not row or not row["recording_path"]:
        raise HTTPException(404, "Recording not found")
    path = Path(row["recording_path"])
    # Also check for WAV version (converted during scoring)
    wav_path = path.with_suffix(".wav")
    if wav_path.exists():
        return FileResponse(wav_path, media_type="audio/wav")
    if not path.exists():
        raise HTTPException(404, "Recording file missing")
    return FileResponse(path, media_type="audio/webm")
