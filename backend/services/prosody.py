"""Prosody scoring: compare word timing between reference and user recording."""

import statistics


def score_prosody(
    ref_words: list[dict],
    user_words: list[dict],
) -> dict:
    """Compare word-level timing between reference audio and user recording.

    Each word dict has: {"word": str, "start": float, "end": float}

    Returns prosody metrics based on timing alignment.
    """
    if not ref_words or not user_words:
        return {
            "prosody_score": 0.0,
            "mean_offset": 0.0,
            "std_offset": 0.0,
            "word_offsets": [],
        }

    # Normalize both to start at 0
    ref_start = ref_words[0]["start"]
    user_start = user_words[0]["start"]

    ref_normalized = [
        {"word": w["word"], "start": w["start"] - ref_start, "end": w["end"] - ref_start}
        for w in ref_words
    ]
    user_normalized = [
        {"word": w["word"], "start": w["start"] - user_start, "end": w["end"] - user_start}
        for w in user_words
    ]

    # Align by index (simple positional matching)
    # More sophisticated DTW alignment could be added later
    n = min(len(ref_normalized), len(user_normalized))
    offsets = []
    word_offsets = []

    for i in range(n):
        ref_w = ref_normalized[i]
        user_w = user_normalized[i]
        offset = abs(user_w["start"] - ref_w["start"])
        offsets.append(offset)
        word_offsets.append({
            "ref_word": ref_w["word"],
            "user_word": user_w["word"],
            "ref_start": ref_w["start"],
            "user_start": user_w["start"],
            "offset": round(offset, 3),
        })

    # Penalize missing/extra words
    len_diff = abs(len(ref_normalized) - len(user_normalized))

    mean_offset = statistics.mean(offsets) if offsets else 0.0
    std_offset = statistics.stdev(offsets) if len(offsets) > 1 else 0.0

    # Score: 100 = perfect sync, decays with offset
    # Threshold: 0.3s mean offset = ~70 score, 1.0s = ~30 score
    raw_score = max(0, 1.0 - (mean_offset / 1.5))
    # Penalize for word count mismatch
    length_penalty = len_diff / max(len(ref_normalized), 1) * 0.3
    final_score = max(0.0, min(1.0, raw_score - length_penalty))

    return {
        "prosody_score": round(final_score * 100),
        "mean_offset": round(mean_offset, 3),
        "std_offset": round(std_offset, 3),
        "word_offsets": word_offsets,
    }
