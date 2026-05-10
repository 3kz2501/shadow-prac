"""Dictionary lookup endpoint."""

from fastapi import APIRouter, Query

from services.dictionary import lookup, lookup_many, get_ipa

router = APIRouter()


@router.get("/api/dict/{word}")
async def dict_lookup(word: str) -> dict:
    definition, matched = lookup(word)
    ipa = get_ipa(matched)
    return {"word": word, "matched": matched, "definition": definition, "ipa": ipa}


@router.post("/api/dict/batch")
async def dict_batch(words: list[str]) -> dict[str, str]:
    return lookup_many(words)
