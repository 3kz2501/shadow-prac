"""Session listing and detail endpoints."""

import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException

from db import get_db
from models import SessionOut, SessionStatus

router = APIRouter()


@router.get("/api/sessions")
async def list_sessions() -> list[SessionOut]:
    db = await get_db()
    cursor = await db.execute("""
        SELECT s.*, COUNT(c.id) as chunk_count
        FROM sessions s
        LEFT JOIN chunks c ON c.session_id = s.id
        GROUP BY s.id
        ORDER BY s.created_at DESC
    """)
    rows = await cursor.fetchall()
    return [
        SessionOut(
            id=r["id"],
            title=r["title"],
            source_url=r["source_url"],
            status=r["status"],
            progress=r["progress"] or 0,
            duration_s=r["duration_s"],
            created_at=r["created_at"],
            chunk_count=r["chunk_count"],
        )
        for r in rows
    ]


@router.get("/api/sessions/{session_id}")
async def get_session(session_id: str) -> SessionOut:
    db = await get_db()
    cursor = await db.execute("""
        SELECT s.*, COUNT(c.id) as chunk_count
        FROM sessions s
        LEFT JOIN chunks c ON c.session_id = s.id
        WHERE s.id = ?
        GROUP BY s.id
    """, (session_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    return SessionOut(
        id=row["id"],
        title=row["title"],
        source_url=row["source_url"],
        status=row["status"],
        progress=row["progress"] or 0,
        duration_s=row["duration_s"],
        created_at=row["created_at"],
        chunk_count=row["chunk_count"],
    )


@router.get("/api/sessions/{session_id}/status")
async def get_session_status(session_id: str) -> SessionStatus:
    db = await get_db()
    cursor = await db.execute(
        "SELECT status, progress, error FROM sessions WHERE id = ?", (session_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    return SessionStatus(status=row["status"], progress=row["progress"] or 0, error=row["error"])


@router.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    db = await get_db()
    cursor = await db.execute("SELECT audio_path FROM sessions WHERE id = ?", (session_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(404, "Session not found")

    # Delete audio file
    audio_path = Path(row["audio_path"])
    if audio_path.exists():
        audio_path.unlink()

    # Delete TTS files
    cursor = await db.execute("SELECT tts_path FROM chunks WHERE session_id = ?", (session_id,))
    for r in await cursor.fetchall():
        if r["tts_path"]:
            p = Path(r["tts_path"])
            if p.exists():
                p.unlink()

    # Delete DB records (CASCADE handles chunks and scores)
    await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    await db.commit()

    return {"ok": True}
