"""Text cleaning and chunking logic. Ported from iiw_sessions/tts_convert.py."""

import re


FILLER_PATTERNS = [
    (r'\b[Uu]h,?\s*', ''),
    (r'\b[Uu]m,?\s*', ''),
    (r',\s*you know,\s*', ', '),
]

CLEANUP_PATTERNS = [
    (r'\s*\.\.\.\s*', '. '),
    (r'([.!?])\s*\1+', r'\1'),
    (r'\s{2,}', ' '),
    (r'^\s*[.,]\s*', ''),
    (r'\s+([.,!?])', r'\1'),
]


def clean_text(text: str) -> str:
    t = text.strip()
    for pat, repl in FILLER_PATTERNS:
        t = re.sub(pat, repl, t)
    for pat, repl in CLEANUP_PATTERNS:
        t = re.sub(pat, repl, t)
    t = re.sub(r'([.!?])\s+([a-z])', lambda m: m.group(1) + ' ' + m.group(2).upper(), t)
    return t.strip()


def is_educational(seg: dict) -> bool:
    text = seg["text"].strip()
    duration = seg["end"] - seg["start"]

    if duration < 2.0 and len(text.split()) < 5:
        return False

    skip_patterns = [
        r'^(yeah|yes|no|okay|oh|right|sure|thanks|thank you|hey|hi|hello|wow|huh)[.!?,\s]*$',
        r'^(sorry|excuse me|go ahead|please)[.!?,\s]*$',
        r'^(can you hear me|is this on|testing)[.!?,\s]*$',
    ]
    lower = text.lower().strip()
    for pat in skip_patterns:
        if re.match(pat, lower):
            return False
    return True


def group_into_chunks(
    segments: list[dict],
    target_secs: float = 60.0,
    min_secs: float = 30.0,
    max_secs: float = 90.0,
) -> list[list[dict]]:
    if not segments:
        return []

    edu_segs = [s for s in segments if is_educational(s)]
    if not edu_segs:
        return []

    chunks = []
    current_chunk = [edu_segs[0]]
    chunk_start = edu_segs[0]["start"]

    for i in range(1, len(edu_segs)):
        seg = edu_segs[i]
        prev = edu_segs[i - 1]
        chunk_duration = seg["end"] - chunk_start
        gap = seg["start"] - prev["end"]

        should_break = False
        if chunk_duration >= max_secs:
            should_break = True
        elif chunk_duration >= target_secs and gap > 1.5:
            should_break = True
        elif chunk_duration >= min_secs and gap > 3.0:
            should_break = True

        if should_break:
            chunks.append(current_chunk)
            current_chunk = [seg]
            chunk_start = seg["start"]
        else:
            current_chunk.append(seg)

    if current_chunk:
        duration = current_chunk[-1]["end"] - current_chunk[0]["start"]
        if duration >= min_secs * 0.5:
            chunks.append(current_chunk)

    return chunks


def collect_words_from_segments(segments: list[dict]) -> list[dict]:
    """Extract word-level timings from Whisper segments."""
    words = []
    for seg in segments:
        for w in seg.get("words", []):
            word_text = w.get("word", "").strip()
            if word_text:
                words.append({
                    "word": word_text,
                    "start": w["start"],
                    "end": w["end"],
                })
    return words


def chunk_text(chunk: list[dict]) -> str:
    raw = " ".join(seg["text"].strip() for seg in chunk)
    return clean_text(raw)
