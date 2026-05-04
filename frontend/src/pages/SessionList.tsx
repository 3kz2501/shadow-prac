import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Session } from "../types";
import { fetchJson, del } from "../api";

export function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);

  const load = () => {
    fetchJson<Session[]>("/api/sessions").then(setSessions);
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    await del(`/api/sessions/${id}`);
    load();
  };

  const formatDuration = (s: number | null) => {
    if (!s) return "--";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sessions</h1>
        <Link to="/import" className="btn btn-primary">+ Import</Link>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p>No sessions yet. Import some content to get started.</p>
          <Link to="/import" className="btn btn-primary">Import Content</Link>
        </div>
      ) : (
        <div className="session-grid">
          {sessions.map((s) => (
            <div key={s.id} className="session-card">
              <Link to={`/sessions/${s.id}`} className="session-link">
                <h3>{s.title}</h3>
                <div className="session-meta">
                  <span>{formatDuration(s.duration_s)}</span>
                  <span>{s.chunk_count} chunks</span>
                  <span className={`status status-${s.status}`}>{s.status}</span>
                </div>
              </Link>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
