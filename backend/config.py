from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
AUDIO_DIR = DATA_DIR / "audio"
TTS_DIR = DATA_DIR / "tts"
RECORDINGS_DIR = DATA_DIR / "recordings"
DB_PATH = DATA_DIR / "sessions.db"

# Ensure directories exist
for d in [AUDIO_DIR, TTS_DIR, RECORDINGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Whisper
WHISPER_ENGINE = "openai-whisper"  # or "faster-whisper"
WHISPER_MODEL = "small.en"         # tiny/base/small/medium/large
WHISPER_SCORING_MODEL = "small.en" # model used for scoring recordings

# TTS (piper)
TTS_PIPER_MODEL = "en_GB-cori-high"

# Server
HOST = "0.0.0.0"
PORT = 8000
