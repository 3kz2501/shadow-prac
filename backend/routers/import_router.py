"""Import endpoint: accept URL or file upload, run processing pipeline."""

import json
import uuid
import traceback

from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form

from db import get_db
from config import TTS_DIR
from services.downloader import download_youtube, save_uploaded_file
from services.transcriber import transcribe, align
from services.text_processing import group_into_chunks, collect_words_from_segments, chunk_text, clean_transcript, map_transcript_to_chunks
from services.tts_service import generate_tts_with_timing

router = APIRouter()


async def _update_session(session_id: str, **kwargs):
    db = await get_db()
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values())
    await db.execute(f"UPDATE sessions SET {sets} WHERE id = ?", vals + [session_id])
    await db.commit()


async def _run_pipeline(session_id: str, audio_path: str, transcript: str | None = None):
    """Background task: transcribe → chunk → TTS."""
    try:
        # Step 1: Transcribe (or align if transcript provided)
        await _update_session(session_id, status="transcribing", progress=10)
        if transcript:
            result = align(audio_path, transcript)
        else:
            result = transcribe(audio_path)
        await _update_session(session_id, duration_s=result.duration, progress=40)

        # Convert to dict format for text_processing functions
        segments_dict = []
        for seg in result.segments:
            segments_dict.append({
                "id": seg.id,
                "start": seg.start,
                "end": seg.end,
                "text": seg.text,
                "words": [{"word": w.word, "start": w.start, "end": w.end} for w in seg.words],
            })

        # Step 2: Chunk
        await _update_session(session_id, status="chunking", progress=50)
        chunks = group_into_chunks(segments_dict)

        # If transcript was provided, map it to chunks for display/scoring text
        if transcript:
            chunk_texts = map_transcript_to_chunks(transcript, chunks)
        else:
            chunk_texts = [chunk_text(chunk_segs) for chunk_segs in chunks]

        db = await get_db()
        for idx, chunk_segs in enumerate(chunks):
            chunk_id = str(uuid.uuid4())
            text = chunk_texts[idx] if idx < len(chunk_texts) else chunk_text(chunk_segs)
            if len(text) < 20:
                continue

            words = collect_words_from_segments(chunk_segs)
            start_time = chunk_segs[0]["start"]
            end_time = chunk_segs[-1]["end"]

            await db.execute(
                """INSERT INTO chunks (id, session_id, chunk_index, text, start_time, end_time, words_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (chunk_id, session_id, idx, text, start_time, end_time, json.dumps(words)),
            )
        await db.commit()

        await _update_session(session_id, status="generating_tts", progress=60)

        # Step 3: Generate TTS for each chunk
        cursor = await db.execute(
            "SELECT id, chunk_index, text FROM chunks WHERE session_id = ? ORDER BY chunk_index",
            (session_id,),
        )
        chunk_rows = await cursor.fetchall()

        total = len(chunk_rows)
        for i, row in enumerate(chunk_rows):
            tts_path = TTS_DIR / f"{row['id']}.mp3"
            tts_words = await generate_tts_with_timing(row["text"], tts_path)

            await db.execute(
                "UPDATE chunks SET tts_path = ?, tts_words_json = ? WHERE id = ?",
                (str(tts_path), json.dumps(tts_words), row["id"]),
            )
            await db.commit()

            progress = 60 + int(35 * (i + 1) / max(total, 1))
            await _update_session(session_id, progress=progress)

        await _update_session(session_id, status="ready", progress=100)

    except Exception as e:
        traceback.print_exc()
        await _update_session(session_id, status="error", error=str(e))


@router.post("/api/import")
async def import_content(
    background_tasks: BackgroundTasks,
    url: str | None = Form(None),
    file: UploadFile | None = File(None),
    transcript: str | None = Form(None),
    start_time: str | None = Form(None),
    end_time: str | None = Form(None),
):
    session_id = str(uuid.uuid4())

    # Parse optional time range
    from services.downloader import _parse_time
    st = _parse_time(start_time) if start_time else None
    et = _parse_time(end_time) if end_time else None

    if url:
        audio_path, title = download_youtube(url, session_id, start_time=st, end_time=et)
        source_url = url
        source_file = None
    elif file:
        content = await file.read()
        audio_path, title = save_uploaded_file(content, file.filename or "upload", session_id, start_time=st, end_time=et)
        source_url = None
        source_file = file.filename
    else:
        return {"error": "Provide either a URL or a file"}, 400

    db = await get_db()
    await db.execute(
        """INSERT INTO sessions (id, title, source_url, source_file, audio_path, status)
           VALUES (?, ?, ?, ?, ?, 'processing')""",
        (session_id, title, source_url, source_file, str(audio_path)),
    )
    await db.commit()

    # Clean and normalize transcript
    cleaned = clean_transcript(transcript) if transcript else None
    background_tasks.add_task(_run_pipeline, session_id, str(audio_path), cleaned or None)

    return {"session_id": session_id, "title": title, "status": "processing"}
