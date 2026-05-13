import { useState, useEffect } from "react";
import { useRecorder } from "../hooks/useRecorder";
import { postForm, fetchJson } from "../api";
import { ScoreResult, AttemptResult } from "../types";
import { ScoreDisplay } from "./ScoreDisplay";

interface Props {
  chunkId: string;
  audioMode?: "tts" | "original";
  segmentText?: string | null; // If set, score only this segment's text
  breaksActive?: boolean;
  isPlaying?: boolean;
  onRecordStart?: () => void;
  onRecordStop?: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "Z"); // SQLite stores UTC without Z
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Recorder({ chunkId, audioMode = "tts", segmentText, breaksActive = false, isPlaying = false, onRecordStart, onRecordStop }: Props) {
  const { start, stop, isRecording } = useRecorder();
  const [currentScore, setCurrentScore] = useState<ScoreResult | AttemptResult | null>(null);
  const [history, setHistory] = useState<(ScoreResult | AttemptResult)[]>([]);
  const [loading, setLoading] = useState(false);

  // Load history when chunk changes (try attempts first, fallback to scores)
  useEffect(() => {
    setCurrentScore(null);
    fetchJson<AttemptResult[]>(`/api/chunks/${chunkId}/attempts`)
      .then((data) => setHistory(data.length ? data : []))
      .catch(() => fetchJson<ScoreResult[]>(`/api/chunks/${chunkId}/scores`).then(setHistory));
  }, [chunkId]);

  const handleToggle = async () => {
    if (isRecording) {
      const blob = await stop();
      onRecordStop?.();
      setLoading(true);
      try {
        const form = new FormData();
        form.append("file", blob, "recording.webm");
        form.append("audio_mode", audioMode);
        if (segmentText) form.append("segment_text", segmentText);
        const result = await postForm<AttemptResult>(`/api/chunks/${chunkId}/score`, form);
        setCurrentScore(result);
        // Prepend to history
        setHistory((prev) => [result, ...prev]);
      } catch (e) {
        console.error("Scoring failed:", e);
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentScore(null);
      await start();
      onRecordStart?.();
    }
  };

  const selectHistory = (id: string) => {
    const selected = history.find((h) => h.id === id);
    if (selected) setCurrentScore(selected);
  };

  return (
    <div className="recorder">
      <div className="recorder-controls">
        <button
          onClick={handleToggle}
          className={`btn ${isRecording ? "btn-recording" : "btn-record"}`}
          disabled={loading || (!isRecording && isPlaying)}
        >
          {loading ? "Scoring..." : isRecording ? "Stop & Score" : breaksActive ? "Record /" : "Record"}
        </button>

        {history.length > 0 && (
          <select
            className="history-select"
            value={currentScore?.id || ""}
            onChange={(e) => selectHistory(e.target.value)}
          >
            <option value="" disabled>
              History ({history.length})
            </option>
            {history.map((h) => (
              <option key={h.id} value={h.id}>
                {"attempt_number" in h ? `#${h.attempt_number} ` : ""}
                {formatDate(h.created_at)} — {h.score_pct}%
                {"prosody_score" in h ? ` / ${h.prosody_score}%` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {currentScore && <ScoreDisplay score={currentScore} />}
    </div>
  );
}
