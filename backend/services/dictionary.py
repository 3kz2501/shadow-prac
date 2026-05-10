"""English-Japanese dictionary lookup using EJDict-hand (Public Domain)."""

import re
from pathlib import Path

import eng_to_ipa

from config import BASE_DIR

_dict: dict[str, str] | None = None


def _stem(word: str) -> list[str]:
    """Generate candidate base forms from an inflected English word."""
    candidates = []
    w = word.lower().strip()

    # -ing: running→run, making→make, trying→try
    if w.endswith("ing") and len(w) > 4:
        base = w[:-3]
        candidates.append(base)          # running → runn → run (doubled consonant)
        candidates.append(base + "e")    # making → mak + e
        if len(base) >= 2 and base[-1] == base[-2]:
            candidates.append(base[:-1]) # running → run

    # -ed: played→play, liked→like, tried→try
    if w.endswith("ed") and len(w) > 3:
        candidates.append(w[:-2])        # played → play
        candidates.append(w[:-1])        # liked → like (remove d only)
        base = w[:-2]
        if len(base) >= 2 and base[-1] == base[-2]:
            candidates.append(base[:-1]) # stopped → stop
        if w.endswith("ied"):
            candidates.append(w[:-3] + "y")  # tried → try

    # -s/-es: services→service, goes→go, tries→try
    if w.endswith("ies") and len(w) > 4:
        candidates.append(w[:-3] + "y")  # tries → try
    elif w.endswith("ses") or w.endswith("xes") or w.endswith("zes") or w.endswith("shes") or w.endswith("ches"):
        candidates.append(w[:-2])        # boxes → box
    elif w.endswith("s") and len(w) > 2:
        candidates.append(w[:-1])        # services → service

    # -er/-est: bigger→big, nicer→nice
    if w.endswith("er") and len(w) > 3:
        candidates.append(w[:-2])
        candidates.append(w[:-1])        # nicer → nice (remove r)
        base = w[:-2]
        if len(base) >= 2 and base[-1] == base[-2]:
            candidates.append(base[:-1]) # bigger → big
    if w.endswith("est") and len(w) > 4:
        candidates.append(w[:-3])
        candidates.append(w[:-3] + "e")
        base = w[:-3]
        if len(base) >= 2 and base[-1] == base[-2]:
            candidates.append(base[:-1])

    # -ly: quickly→quick
    if w.endswith("ly") and len(w) > 3:
        candidates.append(w[:-2])
        if w.endswith("ily"):
            candidates.append(w[:-3] + "y")  # happily → happy

    return candidates


def _load_dict() -> dict[str, str]:
    global _dict
    if _dict is not None:
        return _dict

    _dict = {}
    dict_path = BASE_DIR / "dict" / "ejdict.txt"
    if not dict_path.exists():
        return _dict

    for line in dict_path.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t", 1)
        if len(parts) == 2:
            word = parts[0].strip().lower()
            definition = parts[1].strip()
            if word and definition:
                _dict[word] = definition

    return _dict


def get_ipa(word: str) -> str | None:
    """Get IPA pronunciation for a word."""
    ipa = eng_to_ipa.convert(word.lower().strip())
    if not ipa or ipa.endswith("*"):
        return None
    return ipa


def lookup(word: str) -> tuple[str | None, str]:
    """Look up a word and return (definition, matched_form).

    Tries exact match first, then stems to find base form.
    """
    d = _load_dict()
    key = word.lower().strip()

    # Exact match
    if key in d:
        return d[key], key

    # Try stemmed forms
    for candidate in _stem(key):
        if candidate in d:
            return d[candidate], candidate

    return None, key


def lookup_many(words: list[str]) -> dict[str, str]:
    """Look up multiple words. Returns {word: definition} for found words."""
    result = {}
    for w in words:
        defn, _ = lookup(w)
        if defn:
            result[w.lower().strip()] = defn
    return result
