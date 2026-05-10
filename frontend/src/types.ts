export interface Session {
  id: string;
  title: string;
  source_url: string | null;
  status: string;
  progress: number;
  duration_s: number | null;
  created_at: string;
  chunk_count: number;
}

export interface SessionStatus {
  status: string;
  progress: number;
  error: string | null;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface ChunkSummary {
  id: string;
  chunk_index: number;
  text: string;
  start_time: number;
  end_time: number;
  word_count: number;
}

export interface ChunkDetail {
  id: string;
  session_id: string;
  chunk_index: number;
  text: string;
  start_time: number;
  end_time: number;
  words: WordTiming[];
  tts_words: WordTiming[] | null;
  has_tts: boolean;
}

export interface AlignmentItem {
  type: "equal" | "substitute" | "delete" | "insert";
  ref: string | null;
  hyp: string | null;
}

export interface ScoreResult {
  id: string;
  wer: number;
  score_pct: number;
  transcript: string;
  hits: number;
  insertions: number;
  deletions: number;
  substitutions: number;
  created_at: string | null;
  alignment: AlignmentItem[] | null;
}

export interface AttemptResult {
  id: string;
  chunk_id: string;
  attempt_number: number;
  wer: number;
  score_pct: number;
  prosody_score: number;
  mean_offset: number;
  transcript: string;
  hits: number;
  insertions: number;
  deletions: number;
  substitutions: number;
  created_at: string | null;
  alignment: AlignmentItem[] | null;
}

export interface VocabWord {
  word: string;
  frequency: number;
  chunk_indices: number[];
  level: string;
  level_rank: number;
}
