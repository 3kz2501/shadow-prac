# ShadowPrac

[日本語版 README](README.ja.md)

English shadowing practice app. Import audio from YouTube or local files, get automatic transcription and chunking, then practice with karaoke-style playback, recording, and pronunciation scoring.

> **Disclaimer**: This tool is for personal educational use only. Users are responsible for complying with the terms of service of any content platform they use with this tool.

## Features

- **Import** from YouTube URL or local audio/video files
- **Auto transcription** via OpenAI Whisper (word-level timestamps)
- **Smart chunking** into ~30-90 second segments at natural boundaries
- **Karaoke playback** with word-by-word highlighting synced to audio
- **Synth / Original** voice toggle (edge-tts generated or source audio)
- **Playback controls**: restart, sentence/word skip, speed adjustment (0.5x-2.0x)
- **Shadowing practice**: record yourself, get WER-based pronunciation score
- **Score history**: track your progress per chunk
- **Vocabulary list**: extracted content words with CEFR difficulty levels (A1-C1+), frequency sorting, and individual word TTS playback
- **Script toggle**: show/hide karaoke subtitles and full text (hidden by default for effective shadowing)

## Prerequisites

- Python 3.11+
- Node.js 18+
- ffmpeg
- yt-dlp (installed via pip)

## Quick start

```bash
./start.sh
```

This starts both backend and frontend in one terminal. Open http://localhost:5173.

Press `Ctrl+C` to stop both servers.

## Manual setup

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The API server starts at `http://localhost:8000`.

On first run, the SQLite database is created automatically in `backend/data/`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Usage

### 1. Import content

Open http://localhost:5173 and click **+ Import**.

- **YouTube**: Paste a URL and click Import. The app downloads audio, transcribes it with Whisper, splits into chunks, and generates TTS audio. This takes a few minutes depending on the video length.
- **Local file**: Upload an audio or video file (m4a, mp3, wav, mp4, etc.).

Progress is shown while processing.

### 2. Browse sessions

The home page lists all imported sessions with status, duration, and chunk count. Click a session to see its chunks and vocabulary.

### 3. Practice shadowing

Click any chunk to open the practice page.

**Player controls (top row)**:
- **Play / Pause**: start or stop playback
- **Restart**: jump to beginning of chunk
- **Sentence / Word skip**: navigate forward or backward by sentence or word

**Settings (second row)**:
- **Voice**: switch between **Synth** (clear TTS pronunciation) and **Original** (source audio)
- **Speed**: adjust playback speed from 0.5x to 2.0x

**Script**: click "Show Script" to reveal karaoke subtitles. Hidden by default — shadowing is more effective when you listen rather than read.

**Recording**:
1. Click **Record** — playback starts from the beginning automatically
2. Shadow along with the audio
3. Click **Stop & Score** — your recording is transcribed and compared against the reference text
4. View your score (percentage), word-level breakdown (correct / substituted / deleted / inserted), and your transcript vs the reference

Score history is saved per chunk. Use the **History** dropdown to review past attempts.

### 4. Vocabulary

On the session detail page, switch to the **Vocabulary** tab.

- Words are extracted from all chunks, excluding common function words (articles, prepositions, pronouns, etc.)
- Each word shows a **CEFR level** (A1/A2/B1/B2/C1+) based on corpus frequency
- **Sort** by difficulty, frequency, or alphabetical order
- **Filter** by level (click level buttons) or search by text
- **Click any word** to hear its pronunciation

## Configuration

Edit `backend/config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `WHISPER_ENGINE` | `openai-whisper` | `openai-whisper` or `faster-whisper` |
| `WHISPER_MODEL` | `base` | Whisper model size: tiny/base/small/medium/large |
| `WHISPER_SCORING_MODEL` | `base` | Model used for scoring recordings |
| `TTS_VOICE` | `en-US-GuyNeural` | edge-tts voice name |
| `PORT` | `8000` | Backend server port |

## Project structure

```
shadow-prac/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings
│   ├── db.py                # SQLite setup
│   ├── models.py            # Pydantic schemas
│   ├── requirements.txt
│   ├── regen_tts.py         # Utility: regenerate TTS with word timings
│   ├── routers/
│   │   ├── import_router.py # Import endpoint + processing pipeline
│   │   ├── sessions.py      # Session CRUD
│   │   ├── chunks.py        # Chunk data + audio serving
│   │   ├── scoring.py       # Recording upload + WER scoring
│   │   ├── vocab.py         # Vocabulary extraction
│   │   └── tts.py           # Single word TTS
│   ├── services/
│   │   ├── downloader.py    # yt-dlp + ffmpeg
│   │   ├── transcriber.py   # Whisper abstraction
│   │   ├── text_processing.py # Filler removal, chunking
│   │   ├── tts_service.py   # edge-tts with word timings
│   │   ├── scorer.py        # WER scoring via jiwer
│   │   └── word_level.py    # CEFR level estimation via wordfreq
│   └── data/                # Runtime data (gitignored)
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Router
│   │   ├── api.ts           # Backend API client
│   │   ├── types.ts         # TypeScript interfaces
│   │   ├── pages/           # ImportPage, SessionList, SessionDetail, PracticePage
│   │   ├── components/      # KaraokePlayer, WordDisplay, Recorder, ScoreDisplay, VocabList, ChunkSelector
│   │   └── hooks/           # useAudioPlayer, useRecorder
│   └── ...
└── README.md
```

## Tech stack

- **Backend**: Python, FastAPI, SQLite, OpenAI Whisper, edge-tts, jiwer, yt-dlp, wordfreq
- **Frontend**: React, TypeScript, Vite
- **Audio**: Web Audio API (browser), ffmpeg (server)
