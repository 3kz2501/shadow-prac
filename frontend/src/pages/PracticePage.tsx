import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ChunkSummary, ChunkDetail } from "../types";
import { fetchJson } from "../api";
import { KaraokePlayer, KaraokePlayerHandle } from "../components/KaraokePlayer";
import { ChunkSelector } from "../components/ChunkSelector";
import { Recorder } from "../components/Recorder";

export function PracticePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [chunks, setChunks] = useState<ChunkSummary[]>([]);
  const [currentChunk, setCurrentChunk] = useState<ChunkDetail | null>(null);
  const [chunkIdx, setChunkIdx] = useState(parseInt(searchParams.get("chunk") || "0"));
  const playerRef = useRef<KaraokePlayerHandle>(null);
  const [showFullText, setShowFullText] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    fetchJson<ChunkSummary[]>(`/api/sessions/${sessionId}/chunks`).then(setChunks);
  }, [sessionId]);

  useEffect(() => {
    if (chunks.length === 0) return;
    const chunk = chunks[chunkIdx];
    if (!chunk) return;
    fetchJson<ChunkDetail>(`/api/chunks/${chunk.id}`).then(setCurrentChunk);
  }, [chunks, chunkIdx]);

  const handleSelect = (idx: number) => {
    setChunkIdx(idx);
    setSearchParams({ chunk: idx.toString() });
  };

  const handleRecordStart = () => {
    playerRef.current?.restartAndPlay();
  };

  const handleRecordStop = () => {
    playerRef.current?.pause();
  };

  if (!sessionId) return null;

  return (
    <div className="page practice-page">
      <Link to={`/sessions/${sessionId}`} className="back-link">Back to session</Link>

      {chunks.length > 0 && (
        <ChunkSelector chunks={chunks} currentIndex={chunkIdx} onSelect={handleSelect} />
      )}

      {currentChunk ? (
        <>
          <KaraokePlayer ref={playerRef} chunk={currentChunk} />

          <div className="practice-section">
            <h3>Shadowing Practice</h3>
            <p className="text-muted">Record starts playback from the beginning. Shadow along!</p>
            <Recorder
              chunkId={currentChunk.id}
              referenceText={currentChunk.text}
              onRecordStart={handleRecordStart}
              onRecordStop={handleRecordStop}
            />
          </div>

          <button
            className="toggle-disclosure"
            onClick={() => setShowFullText(!showFullText)}
          >
            <span className={`disclosure-arrow ${showFullText ? "open" : ""}`}>&#9654;</span>
            {showFullText ? "Hide Full Text" : "Show Full Text"}
          </button>
          {showFullText && (
            <div className="chunk-text-section">
              <p className="chunk-full-text">{currentChunk.text}</p>
            </div>
          )}
        </>
      ) : (
        <p>Loading chunk...</p>
      )}
    </div>
  );
}
