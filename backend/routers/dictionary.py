"""Dictionary lookup endpoint."""

from fastapi import APIRouter, Query

from services.dictionary import lookup, lookup_many

router = APIRouter()


@router.get("/api/dict/{word}")
async def dict_lookup(word: str) -> dict:
    definition = lookup(word)
    return {"word": word, "definition": definition}


@router.post("/api/dict/batch")
async def dict_batch(words: list[str]) -> dict[str, str]:
    return lookup_many(words)
