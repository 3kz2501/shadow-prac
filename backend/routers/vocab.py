"""Vocabulary endpoint: extract content words from session chunks."""

import re
from collections import defaultdict

from fastapi import APIRouter, HTTPException

from db import get_db
from models import VocabWord
from services.word_level import get_word_level, get_word_rank

router = APIRouter()

# Function words to exclude: pronouns, prepositions, conjunctions, articles,
# auxiliary verbs, determiners, common adverbs — these don't belong in a vocab list.
STOP_WORDS = {
    # Articles / Determiners
    "a", "an", "the", "this", "that", "these", "those", "my", "your", "his",
    "her", "its", "our", "their", "some", "any", "no", "every", "each", "all",
    "both", "few", "more", "most", "other", "such", "what", "which",
    # Pronouns
    "i", "me", "you", "he", "him", "she", "we", "us", "they", "them",
    "it", "who", "whom", "whose", "myself", "yourself", "himself", "herself",
    "itself", "ourselves", "themselves",
    # Prepositions
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "about",
    "into", "through", "during", "before", "after", "above", "below", "between",
    "under", "over", "out", "off", "down", "near", "against", "along", "around",
    "upon", "within", "without", "toward", "towards", "across", "behind",
    "beyond", "among", "beside", "besides", "since", "until", "onto",
    # Conjunctions
    "and", "but", "or", "nor", "so", "yet", "for", "because", "if", "when",
    "while", "although", "though", "unless", "than", "whether", "as",
    # Auxiliary / Modal verbs
    "is", "am", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "having",
    "do", "does", "did",
    "will", "would", "shall", "should", "can", "could", "may", "might", "must",
    # Common short verbs / contractions
    "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't",
    "shouldn't", "isn't", "aren't", "wasn't", "weren't", "hasn't", "haven't",
    "hadn't", "i'm", "i've", "i'll", "i'd", "you're", "you've", "you'll",
    "you'd", "he's", "she's", "it's", "we're", "we've", "we'll", "we'd",
    "they're", "they've", "they'll", "they'd", "that's", "there's", "here's",
    "what's", "who's", "let's",
    # Common adverbs / particles
    "not", "just", "also", "very", "too", "quite", "really", "then", "now",
    "here", "there", "where", "how", "why", "well", "still", "already",
    "even", "only", "ever", "never", "always", "often", "again",
    # Others
    "like", "get", "got", "go", "going", "went", "gone", "come", "came",
    "say", "said", "says", "tell", "told", "make", "made", "take", "took",
    "give", "gave", "know", "knew", "think", "thought", "see", "saw", "seen",
    "want", "need", "put", "keep", "let", "set",
    "thing", "things", "way", "ways", "lot", "lots",
    "yes", "no", "okay", "oh", "right", "yeah", "hey",
}


@router.get("/api/sessions/{session_id}/vocab")
async def get_vocab(session_id: str) -> list[VocabWord]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT chunk_index, text FROM chunks WHERE session_id = ? ORDER BY chunk_index",
        (session_id,),
    )
    rows = await cursor.fetchall()
    if not rows:
        raise HTTPException(404, "No chunks found")

    word_freq: dict[str, int] = defaultdict(int)
    word_chunks: dict[str, list[int]] = defaultdict(list)

    for row in rows:
        words = re.findall(r"[a-zA-Z']+", row["text"])
        seen_in_chunk = set()
        for w in words:
            lower = w.lower().strip("'")
            if len(lower) < 3:
                continue
            if lower in STOP_WORDS:
                continue
            word_freq[lower] += 1
            if lower not in seen_in_chunk:
                word_chunks[lower].append(row["chunk_index"])
                seen_in_chunk.add(lower)

    result = [
        VocabWord(
            word=w,
            frequency=word_freq[w],
            chunk_indices=word_chunks[w],
            level=get_word_level(w),
            level_rank=get_word_rank(w),
        )
        for w in sorted(word_freq, key=lambda x: -word_freq[x])
    ]
    return result
