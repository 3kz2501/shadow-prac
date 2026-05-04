import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { postForm, fetchJson } from "../api";
import { SessionStatus } from "../types";

export function ImportPage() {
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const pollStatus = async (sessionId: string) => {
    const poll = async () => {
      try {
        const s = await fetchJson<SessionStatus>(`/api/sessions/${sessionId}/status`);
        setProgress(s.progress);
        setStatus(s.status);

        if (s.status === "ready") {
          navigate(`/sessions/${sessionId}`);
          return;
        }
        if (s.status === "error") {
          setError(s.error || "Processing failed");
          setImporting(false);
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        setTimeout(poll, 3000);
      }
    };
    poll();
  };

  const handleUrl = async () => {
    if (!url.trim()) return;
    setImporting(true);
    setError("");
    try {
      const form = new FormData();
      form.append("url", url.trim());
      const res = await postForm<{ session_id: string }>("/api/import", form);
      pollStatus(res.session_id);
    } catch (e: any) {
      setError(e.message);
      setImporting(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await postForm<{ session_id: string }>("/api/import", form);
      pollStatus(res.session_id);
    } catch (err: any) {
      setError(err.message);
      setImporting(false);
    }
  };

  return (
    <div className="page import-page">
      <h1>Import Content</h1>

      <div className="import-section">
        <h2>YouTube URL</h2>
        <div className="input-row">
          <input
            type="text"
            className="input"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={importing}
            onKeyDown={(e) => e.key === "Enter" && handleUrl()}
          />
          <button className="btn btn-primary" onClick={handleUrl} disabled={importing || !url.trim()}>
            Import
          </button>
        </div>
      </div>

      <div className="import-divider">or</div>

      <div className="import-section">
        <h2>Local File</h2>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,video/*,.m4a,.mp3,.wav,.mp4,.webm,.ogg"
          onChange={handleFile}
          disabled={importing}
        />
      </div>

      {importing && (
        <div className="import-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p>{status} ({progress}%)</p>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
