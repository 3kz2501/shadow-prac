"""Download audio from YouTube URLs or handle file uploads."""

import glob
import json
import subprocess
from pathlib import Path

from config import AUDIO_DIR


def _to_wav(input_path: Path, session_id: str) -> Path:
    """Convert any audio/video file to 16kHz mono WAV."""
    wav_path = AUDIO_DIR / f"{session_id}.wav"
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", str(input_path), "-ar", "16000", "-ac", "1", str(wav_path)],
        capture_output=True,
        text=True,
        timeout=300,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {result.stderr[-500:]}")

    # Clean up source if different from output
    if input_path != wav_path and input_path.exists():
        input_path.unlink()

    return wav_path


def download_youtube(url: str, session_id: str) -> tuple[Path, str]:
    """Download audio from YouTube URL. Returns (audio_path, title)."""
    out_template = str(AUDIO_DIR / f"{session_id}_dl.%(ext)s")

    # Step 1: Get title separately (--print can interfere with download)
    title_result = subprocess.run(
        ["yt-dlp", "--print", "title", "--no-playlist", "--remote-components", "ejs:github", url],
        capture_output=True,
        text=True,
        timeout=60,
    )
    title = title_result.stdout.strip().split("\n")[0] if title_result.returncode == 0 else "Untitled"
    title = title or "Untitled"

    # Step 2: Download audio
    result = subprocess.run(
        [
            "yt-dlp",
            "-x",
            "--remote-components", "ejs:github",
            "-o", out_template,
            "--no-playlist",
            url,
        ],
        capture_output=True,
        text=True,
        timeout=600,
    )

    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {result.stderr[-500:]}")

    # Find the downloaded file (extension varies: opus, m4a, webm, etc.)
    matches = glob.glob(str(AUDIO_DIR / f"{session_id}_dl.*"))
    if not matches:
        raise RuntimeError(f"yt-dlp produced no output file. stdout: {result.stdout[-200:]}, stderr: {result.stderr[-200:]}")

    dl_path = Path(matches[0])

    # Step 3: Convert to 16kHz mono WAV
    wav_path = _to_wav(dl_path, session_id)
    return wav_path, title


def save_uploaded_file(content: bytes, filename: str, session_id: str) -> tuple[Path, str]:
    """Save uploaded file and convert to WAV. Returns (audio_path, title)."""
    suffix = Path(filename).suffix.lower()
    raw_path = AUDIO_DIR / f"{session_id}_raw{suffix}"
    raw_path.write_bytes(content)

    title = Path(filename).stem
    wav_path = _to_wav(raw_path, session_id)
    return wav_path, title
