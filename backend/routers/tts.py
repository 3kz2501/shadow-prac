"""Single-word TTS endpoint."""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from services.tts_service import generate_word_tts

router = APIRouter()


@router.get("/api/tts/word")
async def word_tts(text: str = Query(..., min_length=1, max_length=100)):
    path = await generate_word_tts(text)
    if not path.exists():
        raise HTTPException(500, "TTS generation failed")
    return FileResponse(path, media_type="audio/mpeg")
