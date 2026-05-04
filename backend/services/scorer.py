"""Pronunciation scoring via WER comparison."""

import subprocess
from pathlib import Path

import jiwer

from config import RECORDINGS_DIR
from services.transcriber import transcribe


def score_recording(
    recording_path: Path,
    reference_text: str,
    engine: str | None = None,
    model: str | None = None,
) -> dict:
    """Transcribe a recording and score against reference text.

    Returns dict with wer, score_pct, transcript, and word-level details.
    """
    # Convert recording to WAV if needed (browser sends webm)
    wav_path = recording_path.with_suffix(".wav")
    if recording_path.suffix != ".wav":
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(recording_path), "-ar", "16000", "-ac", "1", str(wav_path)],
            capture_output=True,
            timeout=60,
        )
    else:
        wav_path = recording_path

    # Transcribe user recording
    from config import WHISPER_SCORING_MODEL, WHISPER_ENGINE
    result = transcribe(wav_path, engine=engine or WHISPER_ENGINE, model=model or WHISPER_SCORING_MODEL)
    hypothesis = result.text.strip()

    if not hypothesis:
        return {
            "wer": 1.0,
            "score_pct": 0,
            "transcript": "",
            "hits": 0,
            "insertions": 0,
            "deletions": len(reference_text.split()),
            "substitutions": 0,
        }

    # Compute WER
    transforms = jiwer.Compose([
        jiwer.ToLowerCase(),
        jiwer.RemovePunctuation(),
        jiwer.RemoveMultipleSpaces(),
        jiwer.Strip(),
    ])

    measures = jiwer.compute_measures(
        reference_text,
        hypothesis,
        truth_transform=transforms,
        hypothesis_transform=transforms,
    )

    return {
        "wer": round(measures["wer"], 4),
        "score_pct": max(0, round((1 - measures["wer"]) * 100)),
        "transcript": hypothesis,
        "hits": measures["hits"],
        "insertions": measures["insertions"],
        "deletions": measures["deletions"],
        "substitutions": measures["substitutions"],
    }
