"""Word annotation endpoints for Stage 0 marking."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_db

router = APIRouter()


class AnnotationToggle(BaseModel):
    word_index: int
    mark_type: str  # "unclear", "stress", "break"


@router.get("/api/chunks/{chunk_id}/annotations")
async def get_annotations(chunk_id: str) -> dict[str, list[int]]:
    """Get all annotations for a chunk, grouped by mark type."""
    db = await get_db()
    cursor = await db.execute(
        "SELECT word_index, mark_type FROM annotations WHERE chunk_id = ?",
        (chunk_id,),
    )
    rows = await cursor.fetchall()

    result: dict[str, list[int]] = {}
    for r in rows:
        mt = r["mark_type"]
        if mt not in result:
            result[mt] = []
        result[mt].append(r["word_index"])
    return result


@router.post("/api/chunks/{chunk_id}/annotations")
async def toggle_annotation(chunk_id: str, body: AnnotationToggle) -> dict:
    """Toggle an annotation on a word. Returns the new state."""
    if body.mark_type not in ("unclear", "stress", "break"):
        raise HTTPException(400, "mark_type must be unclear, stress, or break")

    db = await get_db()

    # Check if exists
    cursor = await db.execute(
        "SELECT id FROM annotations WHERE chunk_id = ? AND word_index = ? AND mark_type = ?",
        (chunk_id, body.word_index, body.mark_type),
    )
    existing = await cursor.fetchone()

    if existing:
        await db.execute("DELETE FROM annotations WHERE id = ?", (existing["id"],))
        await db.commit()
        return {"action": "removed", "word_index": body.word_index, "mark_type": body.mark_type}
    else:
        await db.execute(
            "INSERT INTO annotations (chunk_id, word_index, mark_type) VALUES (?, ?, ?)",
            (chunk_id, body.word_index, body.mark_type),
        )
        await db.commit()
        return {"action": "added", "word_index": body.word_index, "mark_type": body.mark_type}
