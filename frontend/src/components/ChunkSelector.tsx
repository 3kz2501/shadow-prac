import { ChunkSummary } from "../types";

interface Props {
  chunks: ChunkSummary[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function ChunkSelector({ chunks, currentIndex, onSelect }: Props) {
  const current = chunks[currentIndex];

  return (
    <div className="chunk-selector">
      <button
        className="btn btn-sm"
        disabled={currentIndex <= 0}
        onClick={() => onSelect(currentIndex - 1)}
      >
        Prev
      </button>

      <select
        value={currentIndex}
        onChange={(e) => onSelect(parseInt(e.target.value))}
        className="chunk-select"
      >
        {chunks.map((c, i) => (
          <option key={c.id} value={i}>
            #{c.chunk_index + 1} — {Math.round(c.end_time - c.start_time)}s — {c.word_count} words
          </option>
        ))}
      </select>

      <button
        className="btn btn-sm"
        disabled={currentIndex >= chunks.length - 1}
        onClick={() => onSelect(currentIndex + 1)}
      >
        Next
      </button>

      {current && (
        <span className="chunk-info">
          {Math.round(current.end_time - current.start_time)}s
        </span>
      )}
    </div>
  );
}
