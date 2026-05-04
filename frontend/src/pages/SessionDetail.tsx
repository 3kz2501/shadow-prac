import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Session, ChunkSummary } from "../types";
import { fetchJson } from "../api";
import { VocabList } from "../components/VocabList";

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [chunks, setChunks] = useState<ChunkSummary[]>([]);
  const [tab, setTab] = useState<"chunks" | "vocab">("chunks");

  useEffect(() => {
    if (!id) return;
    fetchJson<Session>(`/api/sessions/${id}`).then(setSession);
    fetchJson<ChunkSummary[]>(`/api/sessions/${id}/chunks`).then(setChunks);
  }, [id]);

  if (!session || !id) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/" className="back-link">Sessions</Link>
          <h1>{session.title}</h1>
          <p className="text-muted">
            {chunks.length} chunks — {session.duration_s ? `${Math.round(session.duration_s / 60)} min` : ""}
          </p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "chunks" ? "tab-active" : ""}`} onClick={() => setTab("chunks")}>
          Chunks ({chunks.length})
        </button>
        <button className={`tab ${tab === "vocab" ? "tab-active" : ""}`} onClick={() => setTab("vocab")}>
          Vocabulary
        </button>
      </div>

      {tab === "chunks" ? (
        <div className="chunk-list">
          {chunks.map((c, i) => (
            <Link key={c.id} to={`/practice/${id}?chunk=${i}`} className="chunk-card">
              <div className="chunk-card-header">
                <span className="chunk-num">#{c.chunk_index + 1}</span>
                <span className="chunk-duration">{Math.round(c.end_time - c.start_time)}s</span>
                <span className="chunk-words">{c.word_count} words</span>
              </div>
              <p className="chunk-preview">{c.text.slice(0, 120)}...</p>
            </Link>
          ))}
        </div>
      ) : (
        <VocabList sessionId={id} />
      )}
    </div>
  );
}
