import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { postForm, fetchJson } from "../api";
import { SessionStatus } from "../types";

export function ImportPage() {
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
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

  const appendCommonFields = (form: FormData) => {
    if (startTime.trim()) form.append("start_time", startTime.trim());
    if (endTime.trim()) form.append("end_time", endTime.trim());
    if (transcript.trim()) form.append("transcript", transcript.trim());
  };

  const handleUrl = async () => {
    if (!url.trim()) return;
    setImporting(true);
    setError("");
    try {
      const form = new FormData();
      form.append("url", url.trim());
      appendCommonFields(form);
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
      appendCommonFields(form);
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

      <div className="import-section">
        <h2>Transcript (optional)</h2>
        <p className="text-muted">Paste a transcript to use as ground truth. Whisper will only be used for word-level timing alignment.</p>
        <textarea
          className="input transcript-input"
          placeholder="Paste transcript here..."
          rows={5}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={importing}
        />
      </div>

      <div className="import-section time-range-section">
        <h2>Time Range (optional)</h2>
        <p className="text-muted">Specify start/end to import only a portion. Accepts seconds, m:ss, or h:mm:ss.</p>
        <div className="time-range-row">
          <div className="time-field">
            <label>Start</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 1:30"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={importing}
            />
          </div>
          <div className="time-field">
            <label>End</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 5:00"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={importing}
            />
          </div>
        </div>
        <p className="text-muted">YouTube URLs with ?t= are auto-detected as start time.</p>
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
