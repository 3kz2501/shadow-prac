"""Download audio from YouTube URLs or handle file uploads."""

import glob
import re
import subprocess
from pathlib import Path
from urllib.parse import urlparse, parse_qs

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

    if input_path != wav_path and input_path.exists():
        input_path.unlink()

    return wav_path


def _parse_time(value: str) -> float | None:
    """Parse a time value like '120', '2m30s', '1h2m3s', '1:30:00' to seconds."""
    if not value:
        return None

    # HH:MM:SS or MM:SS
    colon_match = re.match(r'^(\d+):(\d+)(?::(\d+))?$', value)
    if colon_match:
        parts = [int(x) for x in colon_match.groups() if x is not None]
        if len(parts) == 2:
            return parts[0] * 60 + parts[1]
        return parts[0] * 3600 + parts[1] * 60 + parts[2]

    # 1h2m30s style
    hms_match = re.match(r'^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$', value)
    if hms_match and any(hms_match.groups()):
        h = int(hms_match.group(1) or 0)
        m = int(hms_match.group(2) or 0)
        s = int(hms_match.group(3) or 0)
        return h * 3600 + m * 60 + s

    # Plain seconds
    try:
        return float(value)
    except ValueError:
        return None


def _parse_time_range_from_url(url: str) -> tuple[float | None, float | None]:
    """Extract start/end time from YouTube URL parameters."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)

    start = None
    end = None

    # ?t=120 or ?t=2m30s (YouTube share link format)
    if "t" in params:
        start = _parse_time(params["t"][0])

    # ?start=60&end=180
    if "start" in params:
        start = _parse_time(params["start"][0])
    if "end" in params:
        end = _parse_time(params["end"][0])

    return start, end


def _format_yt_dlp_section(start: float | None, end: float | None) -> str | None:
    """Format a --download-sections argument for yt-dlp."""
    s = f"{start:.0f}" if start else "0"
    e = f"{end:.0f}" if end else "inf"
    if start or end:
        return f"*{s}-{e}"
    return None


def download_youtube(
    url: str,
    session_id: str,
    start_time: float | None = None,
    end_time: float | None = None,
) -> tuple[Path, str]:
    """Download audio from YouTube URL. Returns (audio_path, title).

    Time range can be specified explicitly or auto-detected from URL params.
    """
    out_template = str(AUDIO_DIR / f"{session_id}_dl.%(ext)s")

    # Fill in missing values from URL parameters (e.g. ?t=120 as start)
    url_start, url_end = _parse_time_range_from_url(url)
    if start_time is None:
        start_time = url_start
    if end_time is None:
        end_time = url_end

    # Step 1: Get title
    title_result = subprocess.run(
        ["yt-dlp", "--print", "title", "--no-playlist", "--remote-components", "ejs:github", url],
        capture_output=True,
        text=True,
        timeout=60,
    )
    title = title_result.stdout.strip().split("\n")[0] if title_result.returncode == 0 else "Untitled"
    title = title or "Untitled"

    # Step 2: Download audio
    cmd = [
        "yt-dlp",
        "-x",
        "--remote-components", "ejs:github",
        "-o", out_template,
        "--no-playlist",
    ]

    section = _format_yt_dlp_section(start_time, end_time)
    if section:
        cmd.extend(["--download-sections", section, "--force-keyframes-at-cuts"])

    cmd.append(url)

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {result.stderr[-500:]}")

    matches = glob.glob(str(AUDIO_DIR / f"{session_id}_dl.*"))
    if not matches:
        raise RuntimeError(f"yt-dlp produced no output file. stdout: {result.stdout[-200:]}, stderr: {result.stderr[-200:]}")

    dl_path = Path(matches[0])

    # Step 3: Convert to 16kHz mono WAV
    wav_path = _to_wav(dl_path, session_id)

    # Add time range info to title
    if start_time or end_time:
        range_str = f" [{_fmt_time(start_time or 0)}-{_fmt_time(end_time) if end_time else 'end'}]"
        title += range_str

    return wav_path, title


def _fmt_time(seconds: float | None) -> str:
    if seconds is None:
        return ""
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def save_uploaded_file(
    content: bytes,
    filename: str,
    session_id: str,
    start_time: float | None = None,
    end_time: float | None = None,
) -> tuple[Path, str]:
    """Save uploaded file and convert to WAV. Optionally trim to time range."""
    suffix = Path(filename).suffix.lower()
    raw_path = AUDIO_DIR / f"{session_id}_raw{suffix}"
    raw_path.write_bytes(content)

    title = Path(filename).stem

    wav_path = AUDIO_DIR / f"{session_id}.wav"

    # Build ffmpeg command with optional trim
    cmd = ["ffmpeg", "-y", "-i", str(raw_path)]
    if start_time is not None:
        cmd.extend(["-ss", str(start_time)])
    if end_time is not None:
        cmd.extend(["-to", str(end_time)])
    cmd.extend(["-ar", "16000", "-ac", "1", str(wav_path)])

    subprocess.run(cmd, capture_output=True, timeout=300)

    if raw_path != wav_path and raw_path.exists():
        raw_path.unlink()

    if not wav_path.exists():
        raise RuntimeError("Failed to convert audio to WAV")

    if start_time or end_time:
        range_str = f" [{_fmt_time(start_time or 0)}-{_fmt_time(end_time) if end_time else 'end'}]"
        title += range_str

    return wav_path, title
