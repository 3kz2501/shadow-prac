"""English-Japanese dictionary lookup using EJDict-hand (Public Domain)."""

from pathlib import Path

from config import BASE_DIR

_dict: dict[str, str] | None = None


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


def lookup(word: str) -> str | None:
    """Look up a word and return its Japanese definition, or None."""
    d = _load_dict()
    return d.get(word.lower().strip())


def lookup_many(words: list[str]) -> dict[str, str]:
    """Look up multiple words. Returns {word: definition} for found words."""
    d = _load_dict()
    result = {}
    for w in words:
        key = w.lower().strip()
        if key in d:
            result[key] = d[key]
    return result
