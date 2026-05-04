from pydantic import BaseModel


class ImportRequest(BaseModel):
    url: str | None = None


class SessionOut(BaseModel):
    id: str
    title: str
    source_url: str | None
    status: str
    progress: int
    duration_s: float | None
    created_at: str
    chunk_count: int = 0


class SessionStatus(BaseModel):
    status: str
    progress: int
    error: str | None = None


class WordTiming(BaseModel):
    word: str
    start: float
    end: float


class ChunkSummary(BaseModel):
    id: str
    chunk_index: int
    text: str
    start_time: float
    end_time: float
    word_count: int


class ChunkDetail(BaseModel):
    id: str
    session_id: str
    chunk_index: int
    text: str
    start_time: float
    end_time: float
    words: list[WordTiming]
    tts_words: list[WordTiming] | None = None
    has_tts: bool = False


class AlignmentItem(BaseModel):
    type: str          # equal, substitute, delete, insert
    ref: str | None
    hyp: str | None


class ScoreResult(BaseModel):
    id: str
    wer: float
    score_pct: int
    transcript: str
    hits: int
    insertions: int
    deletions: int
    substitutions: int
    created_at: str | None = None
    alignment: list[AlignmentItem] | None = None


class VocabWord(BaseModel):
    word: str
    frequency: int
    chunk_indices: list[int]
    level: str          # A1, A2, B1, B2, C1+
    level_rank: int     # 1-5 (higher = harder)
