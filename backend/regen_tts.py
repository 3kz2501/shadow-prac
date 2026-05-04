#!/usr/bin/env python3
"""Regenerate TTS audio with WordBoundary timings for existing chunks."""

import asyncio
import json
import sqlite3
from pathlib import Path

from config import TTS_DIR
from services.tts_service import generate_tts_with_timing


async def main():
    db = sqlite3.connect("data/sessions.db")
    db.row_factory = sqlite3.Row

    rows = db.execute("SELECT id, text, tts_path FROM chunks ORDER BY session_id, chunk_index").fetchall()
    print(f"Regenerating TTS for {len(rows)} chunks...\n")

    for i, row in enumerate(rows):
        tts_path = Path(row["tts_path"]) if row["tts_path"] else TTS_DIR / f"{row['id']}.mp3"
        print(f"  [{i+1}/{len(rows)}] {row['id'][:8]}... ", end="", flush=True)

        tts_words = await generate_tts_with_timing(row["text"], tts_path)

        db.execute(
            "UPDATE chunks SET tts_path = ?, tts_words_json = ? WHERE id = ?",
            (str(tts_path), json.dumps(tts_words), row["id"]),
        )
        db.commit()
        print(f"{len(tts_words)} words")

    db.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
