import aiosqlite
from config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    source_url  TEXT,
    source_file TEXT,
    audio_path  TEXT NOT NULL,
    language    TEXT DEFAULT 'en',
    status      TEXT DEFAULT 'pending',
    progress    INTEGER DEFAULT 0,
    error       TEXT,
    duration_s  REAL,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chunks (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    text            TEXT NOT NULL,
    start_time      REAL NOT NULL,
    end_time        REAL NOT NULL,
    words_json      TEXT NOT NULL,
    tts_path        TEXT,
    tts_words_json  TEXT,
    UNIQUE(session_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS attempts (
    id              TEXT PRIMARY KEY,
    chunk_id        TEXT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
    attempt_number  INTEGER NOT NULL,
    recording_path  TEXT,
    transcript      TEXT,
    wer             REAL,
    wer_details     TEXT,
    prosody_score   REAL,
    prosody_details TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    UNIQUE(chunk_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS annotations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    chunk_id        TEXT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
    word_index      INTEGER NOT NULL,
    mark_type       TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now')),
    UNIQUE(chunk_id, word_index, mark_type)
);

CREATE TABLE IF NOT EXISTS scores (
    id              TEXT PRIMARY KEY,
    chunk_id        TEXT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
    recording_path  TEXT,
    transcript      TEXT,
    wer             REAL,
    details_json    TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
);
"""

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(str(DB_PATH), timeout=30)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
        await _db.execute("PRAGMA busy_timeout=5000")
    return _db


async def init_db():
    db = await get_db()
    await db.executescript(SCHEMA)
    await db.commit()


async def close_db():
    global _db
    if _db is not None:
        await _db.close()
        _db = None
