"""Word difficulty level estimation using corpus frequency data (wordfreq).

Uses the Zipf frequency scale (0-8):
- 6+  = A1 (ultra common: the, is, have, go)
- 5-6 = A2 (common everyday: beautiful, remember, alive)
- 4-5 = B1 (intermediate: democracy, negotiate, curious)
- 3-4 = B2 (upper-intermediate: bureaucracy, synthesize)
- <3  = C1+ (advanced/specialized: cryptographic, concatenate)
"""

from wordfreq import zipf_frequency

LEVEL_RANK = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1+": 5}


def get_word_level(word: str) -> str:
    z = zipf_frequency(word.lower().strip("'"), "en")
    if z >= 6.0:
        return "A1"
    if z >= 5.0:
        return "A2"
    if z >= 4.0:
        return "B1"
    if z >= 3.0:
        return "B2"
    return "C1+"


def get_word_rank(word: str) -> int:
    return LEVEL_RANK[get_word_level(word)]
