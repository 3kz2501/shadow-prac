"""TTS generation with word-level timing using edge-tts."""

import re
from pathlib import Path

import edge_tts

from config import TTS_VOICE, TTS_DIR


def _restore_punctuation(text: str, word_boundaries: list[dict]) -> list[dict]:
    """Restore punctuation from source text to TTS word boundaries.

    edge-tts WordBoundary strips punctuation, so we match each boundary word
    back to the original text and re-attach trailing punctuation.
    """
    # Split text into tokens preserving punctuation (e.g. "Hello," "story." "real.")
    tokens = text.split()
    token_idx = 0

    for wb in word_boundaries:
        bare = wb["word"]
        # Find the matching token in the source text
        while token_idx < len(tokens):
            token_lower = tokens[token_idx].lower().strip("'\"()")
            bare_lower = bare.lower()
            # Match if token starts with the bare word
            if token_lower.startswith(bare_lower) or bare_lower.startswith(token_lower.rstrip(".,!?;:'\"")):
                # Re-attach trailing punctuation from the original token
                token = tokens[token_idx]
                # Find where the word ends and punctuation begins
                match = re.match(r"^['\"]?(.+?)[.,!?;:'\")]*$", token)
                if match:
                    suffix = token[match.end(1):]
                    wb["word"] = bare + suffix
                token_idx += 1
                break
            token_idx += 1

    return word_boundaries


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
                offset_s = event["offset"] / 10_000_000
                duration_s = event["duration"] / 10_000_000
                word_boundaries.append({
                    "word": event["text"],
                    "start": round(offset_s, 3),
                    "end": round(offset_s + duration_s, 3),
                })

    # Restore punctuation from source text
    word_boundaries = _restore_punctuation(text, word_boundaries)

    return word_boundaries


async def generate_word_tts(word: str) -> Path:
    """Generate TTS for a single word. Returns path to cached mp3."""
    safe_name = "".join(c if c.isalnum() else "_" for c in word.lower())
    cache_path = TTS_DIR / f"word_{safe_name}.mp3"

    if not cache_path.exists():
        communicate = edge_tts.Communicate(word, TTS_VOICE)
        await communicate.save(str(cache_path))

    return cache_path
