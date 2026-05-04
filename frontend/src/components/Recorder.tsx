import { useState, useEffect } from "react";
import { useRecorder } from "../hooks/useRecorder";
import { postForm, fetchJson } from "../api";
import { ScoreResult } from "../types";
import { ScoreDisplay } from "./ScoreDisplay";

interface Props {
  chunkId: string;
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

export function Recorder({ chunkId, onRecordStart, onRecordStop }: Props) {
  const { start, stop, isRecording } = useRecorder();
  const [currentScore, setCurrentScore] = useState<ScoreResult | null>(null);
  const [history, setHistory] = useState<ScoreResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Load history when chunk changes
  useEffect(() => {
    setCurrentScore(null);
    fetchJson<ScoreResult[]>(`/api/chunks/${chunkId}/scores`).then(setHistory);
  }, [chunkId]);

  const handleToggle = async () => {
    if (isRecording) {
      const blob = await stop();
      onRecordStop?.();
      setLoading(true);
      try {
        const form = new FormData();
        form.append("file", blob, "recording.webm");
        const result = await postForm<ScoreResult>(`/api/chunks/${chunkId}/score`, form);
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
          disabled={loading}
        >
          {loading ? "Scoring..." : isRecording ? "Stop & Score" : "Record"}
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
                {formatDate(h.created_at)} — {h.score_pct}%
              </option>
            ))}
          </select>
        )}
      </div>

      {currentScore && <ScoreDisplay score={currentScore} />}
    </div>
  );
}
