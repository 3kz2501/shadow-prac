"""Chunk endpoints: list, detail, serve audio."""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from db import get_db
from models import ChunkSummary, ChunkDetail, WordTiming

router = APIRouter()


@router.get("/api/sessions/{session_id}/chunks")
async def list_chunks(session_id: str) -> list[ChunkSummary]:
    db = await get_db()
    cursor = await db.execute(
        """SELECT id, chunk_index, text, start_time, end_time
           FROM chunks WHERE session_id = ? ORDER BY chunk_index""",
        (session_id,),
    )
    rows = await cursor.fetchall()
    return [
        ChunkSummary(
            id=r["id"],
            chunk_index=r["chunk_index"],
            text=r["text"],
            start_time=r["start_time"],
            end_time=r["end_time"],
            word_count=len(r["text"].split()),
        )
        for r in rows
    ]


@router.get("/api/chunks/{chunk_id}")
async def get_chunk(chunk_id: str) -> ChunkDetail:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM chunks WHERE id = ?", (chunk_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Chunk not found")

    words = [WordTiming(**w) for w in json.loads(row["words_json"])]
    tts_words = None
    if row["tts_words_json"]:
        tts_words = [WordTiming(**w) for w in json.loads(row["tts_words_json"])]

    return ChunkDetail(
        id=row["id"],
        session_id=row["session_id"],
        chunk_index=row["chunk_index"],
        text=row["text"],
        start_time=row["start_time"],
        end_time=row["end_time"],
        words=words,
        tts_words=tts_words,
        has_tts=bool(row["tts_path"]),
    )


@router.get("/api/chunks/{chunk_id}/tts")
async def serve_chunk_tts(chunk_id: str):
    db = await get_db()
    cursor = await db.execute("SELECT tts_path FROM chunks WHERE id = ?", (chunk_id,))
    row = await cursor.fetchone()
    if not row or not row["tts_path"]:
        raise HTTPException(404, "TTS not found")
    path = Path(row["tts_path"])
    if not path.exists():
        raise HTTPException(404, "TTS file missing")
    return FileResponse(path, media_type="audio/mpeg")


@router.get("/api/chunks/{chunk_id}/audio")
async def serve_chunk_audio(chunk_id: str):
    """Serve the original audio for a chunk's session."""
    db = await get_db()
    cursor = await db.execute("""
        SELECT s.audio_path, c.start_time, c.end_time
        FROM chunks c JOIN sessions s ON c.session_id = s.id
        WHERE c.id = ?
    """, (chunk_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Chunk not found")

    audio_path = Path(row["audio_path"])
    if not audio_path.exists():
        raise HTTPException(404, "Audio file missing")

    # Return full audio file - frontend handles seeking
    return FileResponse(audio_path, media_type="audio/wav")
