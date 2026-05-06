"""TTS generation with word-level timing using piper (fully offline)."""

import subprocess
import wave
from pathlib import Path

from piper import PiperVoice

from config import TTS_DIR, BASE_DIR

_voice: PiperVoice | None = None

PIPER_MODEL_DIR = BASE_DIR / "data" / "piper"
PIPER_MODEL_NAME = "en_US-lessac-medium"


def _get_voice() -> PiperVoice:
    global _voice
    if _voice is None:
        model_path = PIPER_MODEL_DIR / f"{PIPER_MODEL_NAME}.onnx"
        if not model_path.exists():
            raise RuntimeError(
                f"Piper voice model not found at {model_path}. "
                f"Run: mkdir -p {PIPER_MODEL_DIR} && "
                f"curl -L https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/{PIPER_MODEL_NAME}.onnx -o {model_path} && "
                f"curl -L https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/{PIPER_MODEL_NAME}.onnx.json -o {model_path}.json"
            )
        _voice = PiperVoice.load(str(model_path))
    return _voice


def _synthesize_wav(text: str, wav_path: Path) -> None:
    """Synthesize text to WAV file using piper."""
    voice = _get_voice()
    with wave.open(str(wav_path), "wb") as wav:
        voice.synthesize_wav(text, wav)


def _wav_to_mp3(wav_path: Path, mp3_path: Path) -> None:
    """Convert WAV to MP3 using ffmpeg."""
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-q:a", "2", str(mp3_path)],
        capture_output=True,
        timeout=60,
    )
    wav_path.unlink(missing_ok=True)


def _get_word_timings(wav_path: Path) -> list[dict]:
    """Extract word-level timings from audio using Whisper."""
    import whisper
    from config import WHISPER_MODEL

    # Whisper expects 16kHz; piper outputs 22050Hz — convert first
    wav_16k = wav_path.with_name(wav_path.stem + "_16k.wav")
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav_path), "-ar", "16000", "-ac", "1", str(wav_16k)],
        capture_output=True,
        timeout=30,
    )

    model = whisper.load_model(WHISPER_MODEL)
    result = model.transcribe(str(wav_16k), word_timestamps=True)
    wav_16k.unlink(missing_ok=True)

    words = []
    for seg in result.get("segments", []):
        for w in seg.get("words", []):
            word_text = w.get("word", "").strip()
            if word_text:
                words.append({
                    "word": word_text,
                    "start": round(w["start"], 3),
                    "end": round(w["end"], 3),
                })
    return words


async def generate_tts_with_timing(text: str, output_path: Path) -> list[dict]:
    """Generate TTS audio and return word boundary timings.

    Uses piper for synthesis (offline) and Whisper for word timing extraction.
    Returns list of {word, start, end} in seconds.
    """
    # Generate WAV
    wav_path = output_path.with_suffix(".wav")
    _synthesize_wav(text, wav_path)

    # Get word timings from the generated audio
    word_timings = _get_word_timings(wav_path)

    # Convert to MP3
    _wav_to_mp3(wav_path, output_path)

    return word_timings


async def generate_word_tts(word: str) -> Path:
    """Generate TTS for a single word. Returns path to cached mp3."""
    safe_name = "".join(c if c.isalnum() else "_" for c in word.lower())
    cache_path = TTS_DIR / f"word_{safe_name}.mp3"

    if not cache_path.exists():
        wav_path = cache_path.with_suffix(".wav")
        _synthesize_wav(word, wav_path)
        _wav_to_mp3(wav_path, cache_path)

    return cache_path
