# ShadowPrac

[日本語版 README](README.ja.md)

English shadowing practice app. Import audio from YouTube or local files, get automatic transcription and chunking, then practice with karaoke-style playback, recording, and multi-axis pronunciation scoring.

> **Disclaimer**: This tool is for personal educational use only. Users are responsible for complying with the terms of service of any content platform they use with this tool.

> **Privacy**: Once content is imported, all processing runs locally — transcription (Whisper), TTS (piper), scoring, and dictionary lookup. No audio or text is sent to external servers. The only network access is during YouTube download (yt-dlp) and initial piper voice model download.

## Features

- **Import** from YouTube URL or local audio/video files
- **Optional transcript input**: paste a known transcript (e.g. from InfoQ, TED) for more accurate reference text — Whisper is used only for word-level timestamp alignment
- **Transcript cleaning**: automatically strips speaker labels, timestamps, section headers, and stage directions from pasted transcripts
- **Auto transcription** via OpenAI Whisper (word-level timestamps)
- **Smart chunking** into ~15-45 second segments at natural pause boundaries
- **Karaoke playback** with word-by-word color highlighting synced to audio
- **Word click to seek**: click any word in the script to jump to that position
- **Synth / Original** voice toggle (piper TTS British English, fully offline, or source audio)
- **Playback controls**: restart, sentence/word/break skip, speed (0.05x step), volume (0-200% boost via Web Audio API GainNode)
- **Controls lock during recording**: all player controls are disabled while recording to prevent accidental interference
- **Shadowing practice**: record yourself, get multi-axis scoring
- **Multi-axis scoring**:
  - **Accuracy (WER)**: word error rate comparing your speech to reference text
  - **Timing (Prosody)**: how well your word timing follows the reference audio
  - Reference automatically switches based on voice mode (TTS timing for Synth, original audio timing for Original)
- **Attempt tracking**: each practice attempt is numbered and stored with full scoring details
- **Score history**: review past attempts with attempt number, accuracy %, and timing %
- **Vocabulary list**: extracted content words with CEFR difficulty levels (A1-C1+), frequency sorting, and individual word TTS playback
- **Script toggle**: show/hide karaoke subtitles and full text
- **Word alignment**: color-coded diff after scoring (correct / substituted / deleted / inserted)
- **Word annotations** (double-click any word in the script):
  - **? Unclear**: mark words you can't hear clearly (red wavy underline)
  - **! Stress**: mark stressed words (bold highlight)
  - **/ Break**: mark meaning-group boundaries (yellow `/` divider) — playback auto-stops at each `/`, press Play to continue to the next segment. Break mode can be toggled on/off via the Play button dropdown (data is preserved when off). Scoring in break mode evaluates only the current segment.
- **Dictionary with IPA**: hover any word for IPA pronunciation and Japanese translation (EJDict-hand, ~45k words)
- **Stemming support**: inflected forms (running, services, deployed) automatically resolve to base form for dictionary lookup
- **Audio cleanup**: background noise reduction and silence compression on import
- **Time range import**: specify start/end times for YouTube URLs or local files
- **Responsive UI**: mobile-friendly layout for practice on phone browsers

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

## Docker

```bash
docker compose up --build
```

Open http://localhost:3000. Data is persisted in a Docker volume (`backend-data`).

```bash
docker compose down       # stop
docker compose down -v    # stop and delete data
```

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
- **Transcript** (optional): Paste a transcript into the text area if you have one (e.g. from a talk page, subtitles, show notes). Speaker labels, timestamps, and section headers are automatically cleaned. When provided, Whisper is used only for word-level timing alignment — the pasted text becomes the authoritative reference for display and scoring.

Progress is shown while processing.

### 2. Browse sessions

The home page lists all imported sessions with status, duration, and chunk count. Click a session to see its chunks and vocabulary.

### 3. Practice shadowing

Click any chunk to open the practice page.

**Player controls (top row)**:
- **Play / Pause**: start or stop playback. When break marks exist, a **▾** dropdown appears to switch between **Play with breaks /** (auto-stop at each `/`) and **Play full** (ignore breaks). The selected mode is remembered.
- **Restart**: jump to beginning of chunk
- **/Break skip**: navigate forward or backward by break boundary (disabled when no breaks are set)
- **Sentence / Word skip**: navigate forward or backward by sentence or word

**Voice toggle**:
- **Synth**: clear British English TTS pronunciation (piper, en_GB-cori-high)
- **Original**: source audio at original speed
- Switching voice resets speed and volume to defaults

**Speed & Volume** (stacked sliders):
- **Speed**: 0-2.0x in 0.05 steps, with +/- buttons
- **Volume**: 0-200% with boost support (via Web Audio API GainNode), with +/- buttons

**Script**: click "Show Script" to reveal karaoke subtitles. Words are color-highlighted as they are spoken. **Click any word** to jump playback to that position. **Hover** any word to see IPA pronunciation and Japanese definition. **Double-click** any word to open the annotation menu.

**Word annotations** (double-click any word):
- **? Unclear**: mark words you can't hear clearly — red wavy underline
- **! Stress**: mark stressed words — bold highlight
- **/ Break**: mark meaning-group boundaries — yellow `/` appears after the word. When break marks are present, playback **auto-stops at each `/`**. Press Play to advance to the next segment. This enables phrase-by-phrase listening practice.

**Recording** (headphones recommended for best accuracy):
1. Click **Record** (or **Record /** in break mode) — playback starts automatically. In break mode, playback starts from the current segment position; otherwise from the beginning. All player controls are locked during recording.
2. Shadow along with the audio. In break mode, both playback and recording stop at the next `/` boundary.
3. Click **Stop & Score** — your recording is transcribed and compared against the reference text. In break mode, only the current segment's text is used for scoring.
4. View your scores:
   - **Accuracy** circle: WER-based percentage (how many words you got right)
   - **Timing** circle: prosody score (how closely your word timing followed the reference)
   - Word-level breakdown: correct / substituted / deleted / inserted
   - Average timing offset in seconds

The prosody reference automatically matches your voice mode — if you practiced with Synth, timing is compared against TTS; if you used Original, it's compared against the source audio.

### 4. Vocabulary

On the session detail page, switch to the **Vocabulary** tab.

- Words are extracted from all chunks, excluding common function words (articles, prepositions, pronouns, etc.)
- Each word shows a **CEFR level** (A1/A2/B1/B2/C1+) based on corpus frequency
- **Sort** by difficulty, frequency, or alphabetical order
- **Filter** by level (click level buttons) or search by text
- **Click any word** to hear its pronunciation
- **Hover any word** to see its IPA pronunciation and Japanese translation (powered by [EJDict-hand](https://github.com/kujirahand/EJDict), ~45k words, Public Domain)
- Inflected forms (plurals, past tense, -ing, etc.) are automatically resolved to base forms for dictionary lookup

The same word tooltip also works on the karaoke script view.

## Configuration

Edit `backend/config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `WHISPER_ENGINE` | `openai-whisper` | `openai-whisper` or `faster-whisper` |
| `WHISPER_MODEL` | `small.en` | Whisper model size: tiny/base/small/medium/large (.en for English-only) |
| `WHISPER_SCORING_MODEL` | `small.en` | Model used for scoring recordings |
| `TTS_PIPER_MODEL` | `en_GB-cori-high` | Piper voice model name |
| `PORT` | `8000` | Backend server port |

## Project structure

```
shadow-prac/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings
│   ├── db.py                # SQLite setup (sessions, chunks, attempts, scores, annotations)
│   ├── models.py            # Pydantic schemas
│   ├── requirements.txt
│   ├── regen_tts.py         # Utility: regenerate TTS with word timings
│   ├── routers/
│   │   ├── import_router.py # Import endpoint + processing pipeline
│   │   ├── sessions.py      # Session CRUD
│   │   ├── chunks.py        # Chunk data + audio serving
│   │   ├── scoring.py       # Recording upload + WER + prosody scoring
│   │   ├── vocab.py         # Vocabulary extraction
│   │   ├── dictionary.py    # Dictionary + IPA lookup
│   │   ├── annotations.py   # Word annotation CRUD (unclear/stress/break)
│   │   └── tts.py           # Single word TTS
│   ├── services/
│   │   ├── downloader.py    # yt-dlp + ffmpeg
│   │   ├── transcriber.py   # Whisper transcription + forced alignment
│   │   ├── text_processing.py # Filler removal, chunking, transcript cleaning
│   │   ├── tts_service.py   # piper TTS with word timings
│   │   ├── scorer.py        # WER scoring via jiwer
│   │   ├── prosody.py       # Prosody/timing score calculation
│   │   ├── word_level.py    # CEFR level estimation via wordfreq
│   │   └── dictionary.py    # EJDict-hand lookup + IPA + stemming
│   ├── dict/
│   │   └── ejdict.txt       # EN-JA dictionary (Public Domain, bundled)
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
├── docker-compose.yml
└── README.md
```

## Tech stack

- **Backend**: Python, FastAPI, SQLite, OpenAI Whisper, piper-tts, jiwer, yt-dlp, wordfreq, eng-to-ipa
- **Frontend**: React, TypeScript, Vite
- **Audio**: Web Audio API (browser recording + GainNode volume boost), ffmpeg (server-side processing)
