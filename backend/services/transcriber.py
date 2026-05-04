"""Whisper transcription with word-level timestamps."""

from dataclasses import dataclass, field
from pathlib import Path

from config import WHISPER_ENGINE, WHISPER_MODEL


@dataclass
class WordInfo:
    word: str
    start: float
    end: float


@dataclass
class Segment:
    id: int
    start: float
    end: float
    text: str
    words: list[WordInfo] = field(default_factory=list)


@dataclass
class TranscribeResult:
    segments: list[Segment]
    text: str
    language: str
    duration: float


def transcribe(audio_path: str | Path, engine: str | None = None, model: str | None = None) -> TranscribeResult:
    engine = engine or WHISPER_ENGINE
    model = model or WHISPER_MODEL

    if engine == "faster-whisper":
        return _transcribe_faster(str(audio_path), model)
    else:
        return _transcribe_openai(str(audio_path), model)


def _transcribe_openai(audio_path: str, model_name: str) -> TranscribeResult:
    import whisper

    model = whisper.load_model(model_name)
    result = model.transcribe(audio_path, word_timestamps=True)

    segments = []
    for seg in result.get("segments", []):
        words = [
            WordInfo(word=w["word"].strip(), start=w["start"], end=w["end"])
            for w in seg.get("words", [])
            if w.get("word", "").strip()
        ]
        segments.append(Segment(
            id=seg["id"],
            start=seg["start"],
            end=seg["end"],
            text=seg["text"].strip(),
            words=words,
        ))

    duration = segments[-1].end if segments else 0.0

    return TranscribeResult(
        segments=segments,
        text=result.get("text", ""),
        language=result.get("language", "en"),
        duration=duration,
    )


def _transcribe_faster(audio_path: str, model_name: str) -> TranscribeResult:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, compute_type="int8")
    raw_segments, info = model.transcribe(audio_path, word_timestamps=True)

    segments = []
    full_text_parts = []
    for i, seg in enumerate(raw_segments):
        words = [
            WordInfo(word=w.word.strip(), start=w.start, end=w.end)
            for w in (seg.words or [])
            if w.word.strip()
        ]
        segments.append(Segment(
            id=i,
            start=seg.start,
            end=seg.end,
            text=seg.text.strip(),
            words=words,
        ))
        full_text_parts.append(seg.text.strip())

    duration = segments[-1].end if segments else 0.0

    return TranscribeResult(
        segments=segments,
        text=" ".join(full_text_parts),
        language=info.language or "en",
        duration=duration,
    )
