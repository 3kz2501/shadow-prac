# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShadowPrac — English shadowing practice app. Import audio (YouTube/local files), auto-transcribe with Whisper, split into chunks, practice with karaoke playback + recording, get multi-axis scoring (WER + prosody). Fully offline after import.

## Commands

```bash
# Development (local)
./start.sh                            # Backend (:8000) + Frontend (:5173) together
cd backend && python main.py          # Backend only (uvicorn with reload)
cd frontend && npm run dev            # Frontend only (Vite)

# Docker
docker compose up --build             # Frontend :3000, backend proxied via nginx
docker compose down -v                # Stop + delete data

# Build & lint
cd frontend && npm run build          # TypeScript + Vite production build
cd frontend && npm run lint           # ESLint
cd frontend && npx tsc --noEmit       # Type check only

# Backend dependencies
cd backend && pip install -r requirements.txt

# Frontend dependencies
cd frontend && npm install
```

No test suite exists currently.

## Architecture

### Data Flow

```
Import (YouTube/file + optional transcript)
  → Whisper transcribe (word-level timestamps)
  → Split into 15-45s chunks at natural pauses
  → Generate TTS per chunk (Piper, en_GB-cori-high)
  → Practice: karaoke playback + record + score
```

### Backend (Python, FastAPI, SQLite)

**Entry**: `backend/main.py` — FastAPI app, CORS *, static mount at `/static/data`

**Routers** (`backend/routers/`): Each file = one concern
- `import_router.py` — Import pipeline (download → transcribe → chunk → TTS) runs as BackgroundTask
- `scoring.py` — Upload recording → WER + prosody scoring → save as attempt. Accepts `segment_text` for break-segment scoring
- `annotations.py` — Toggle word marks (unclear/stress/break) per chunk

**Services** (`backend/services/`): Stateless functions called by routers
- `transcriber.py` — `transcribe()` and `align()` (forced alignment with provided transcript)
- `scorer.py` — WER via jiwer, returns word-level alignment + user word timestamps
- `prosody.py` — Compare word timing offsets between reference and user recording
- `text_processing.py` — `clean_transcript()` strips speaker labels/timestamps; `group_into_chunks()` splits by pause boundaries; `map_transcript_to_chunks()` maps provided transcript to Whisper-segmented chunks
- `dictionary.py` — EJDict-hand lookup + `eng_to_ipa` + stemming (inflected forms → base form)
- `tts_service.py` — Piper TTS with word timing extraction

**DB** (`backend/db.py`): SQLite with aiosqlite, WAL mode, foreign keys ON
- Tables: `sessions`, `chunks`, `attempts`, `annotations`, `scores` (legacy)
- `chunks.words_json` / `tts_words_json` store word-level timestamps as JSON arrays

**Config** (`backend/config.py`): `WHISPER_MODEL=small.en`, `TTS_PIPER_MODEL=en_GB-cori-high`

### Frontend (React 19, TypeScript, Vite)

**Routing** (`src/App.tsx`): 4 routes
- `/` SessionList, `/import` ImportPage, `/sessions/:id` SessionDetail, `/practice/:sessionId` PracticePage

**Key component relationships**:
```
PracticePage
  ├── KaraokePlayer (ref-based handle for imperative control)
  │     ├── WordDisplay (karaoke highlighting, annotations, double-click menu)
  │     │     └── WordTooltip (hover: IPA + dictionary)
  │     └── useAudioPlayer hook (Web Audio API GainNode for volume boost)
  └── Recorder
        └── ScoreDisplay (WER + prosody circles, alignment view)
```

**State management**: Local React state only, no global store. `KaraokePlayer` exposes methods via `useImperativeHandle` (play, pause, seek, segment info, break mode). `PracticePage` coordinates player ↔ recorder via callbacks.

**API client** (`src/api.ts`): `fetchJson`, `postJson`, `postForm`, `del`. Base URL from `VITE_API_BASE` or `http://localhost:8000`.

### Break System

Annotations of type `break` create segment boundaries within chunks:
- **Playback**: Auto-stops at each `/` mark (when breaks enabled via Play ▾ dropdown)
- **Loop**: In break mode, loops within current segment; otherwise loops whole chunk
- **Recording**: Seeks to segment start, scores only segment text
- **Navigation**: `« /Break` and `/Break »` buttons jump between boundaries

### Key Design Decisions

- All processing is local (Whisper, Piper, scoring) — no external API calls after import
- Prosody reference switches automatically: TTS timings when practicing with Synth, original audio timings when practicing with Original
- Transcript input is optional; when provided, Whisper is used only for word timestamp alignment, provided text becomes the scoring reference
- `scores` table is legacy; `attempts` table is the primary scoring store (includes prosody)
