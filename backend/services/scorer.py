"""Pronunciation scoring via WER comparison."""

import re
import subprocess
from pathlib import Path

import jiwer

from config import RECORDINGS_DIR
from services.transcriber import transcribe


def _normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def score_recording(
    recording_path: Path,
    reference_text: str,
    engine: str | None = None,
    model: str | None = None,
) -> dict:
    """Transcribe a recording and score against reference text."""
    wav_path = recording_path.with_suffix(".wav")
    if recording_path.suffix != ".wav":
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(recording_path), "-ar", "16000", "-ac", "1", str(wav_path)],
            capture_output=True,
            timeout=60,
        )
    else:
        wav_path = recording_path

    from config import WHISPER_SCORING_MODEL, WHISPER_ENGINE
    result = transcribe(wav_path, engine=engine or WHISPER_ENGINE, model=model or WHISPER_SCORING_MODEL, language="en")
    hypothesis = result.text.strip()

    # Collect word timestamps from user recording for prosody scoring
    user_words = []
    for seg in result.segments:
        for w in seg.words:
            user_words.append({"word": w.word, "start": w.start, "end": w.end})

    ref_norm = _normalize(reference_text)
    ref_words = ref_norm.split()

    if not hypothesis:
        return {
            "wer": 1.0,
            "score_pct": 0,
            "transcript": "",
            "hits": 0,
            "insertions": 0,
            "deletions": len(ref_words),
            "substitutions": 0,
            "alignment": [{"type": "delete", "ref": w, "hyp": None} for w in ref_words],
            "user_words": [],
        }

    hyp_norm = _normalize(hypothesis)
    hyp_words = hyp_norm.split()

    output = jiwer.process_words(ref_norm, hyp_norm)

    # Build word-level alignment for frontend display
    alignment = []
    for chunk in output.alignments[0]:
        r_words = ref_words[chunk.ref_start_idx:chunk.ref_end_idx]
        h_words = hyp_words[chunk.hyp_start_idx:chunk.hyp_end_idx]

        if chunk.type == "equal":
            for rw, hw in zip(r_words, h_words):
                alignment.append({"type": "equal", "ref": rw, "hyp": hw})
        elif chunk.type == "substitute":
            for rw, hw in zip(r_words, h_words):
                alignment.append({"type": "substitute", "ref": rw, "hyp": hw})
        elif chunk.type == "delete":
            for rw in r_words:
                alignment.append({"type": "delete", "ref": rw, "hyp": None})
        elif chunk.type == "insert":
            for hw in h_words:
                alignment.append({"type": "insert", "ref": None, "hyp": hw})

    return {
        "wer": round(output.wer, 4),
        "score_pct": max(0, round((1 - output.wer) * 100)),
        "transcript": hypothesis,
        "hits": output.hits,
        "insertions": output.insertions,
        "deletions": output.deletions,
        "substitutions": output.substitutions,
        "alignment": alignment,
        "user_words": user_words,
    }
