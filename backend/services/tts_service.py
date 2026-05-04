"""TTS generation with word-level timing using edge-tts."""

import json
from pathlib import Path

import edge_tts

from config import TTS_VOICE, TTS_DIR


async def generate_tts_with_timing(text: str, output_path: Path) -> list[dict]:
    """Generate TTS audio and return word boundary timings.

    Returns list of {word, start, end} in seconds.
    """
    communicate = edge_tts.Communicate(text, TTS_VOICE, boundary="WordBoundary")

    word_boundaries = []

    with open(output_path, "wb") as f:
        async for event in communicate.stream():
            if event["type"] == "audio":
                f.write(event["data"])
            elif event["type"] == "WordBoundary":
                # offset and duration are in 100-nanosecond units
                offset_s = event["offset"] / 10_000_000
                duration_s = event["duration"] / 10_000_000
                word_boundaries.append({
                    "word": event["text"],
                    "start": round(offset_s, 3),
                    "end": round(offset_s + duration_s, 3),
                })

    return word_boundaries


async def generate_word_tts(word: str) -> Path:
    """Generate TTS for a single word. Returns path to cached mp3."""
    safe_name = "".join(c if c.isalnum() else "_" for c in word.lower())
    cache_path = TTS_DIR / f"word_{safe_name}.mp3"

    if not cache_path.exists():
        communicate = edge_tts.Communicate(word, TTS_VOICE)
        await communicate.save(str(cache_path))

    return cache_path
