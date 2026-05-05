import { useEffect, useState, useRef } from "react";
import { VocabWord } from "../types";
import { fetchJson, ttsWordUrl } from "../api";
import { WordTooltip } from "./WordTooltip";

interface Props {
  sessionId: string;
}

type SortMode = "frequency" | "alpha" | "difficulty";
type LevelFilter = "all" | "A1" | "A2" | "B1" | "B2" | "C1+";

const LEVEL_COLORS: Record<string, string> = {
  "A1": "#22c55e",
  "A2": "#86efac",
  "B1": "#eab308",
  "B2": "#f97316",
  "C1+": "#ef4444",
};

export function VocabList({ sessionId }: Props) {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [sort, setSort] = useState<SortMode>("difficulty");
  const [filter, setFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchJson<VocabWord[]>(`/api/sessions/${sessionId}/vocab`).then(setWords);
  }, [sessionId]);

  const playWord = (word: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(ttsWordUrl(word));
    audioRef.current = audio;
    audio.play();
  };

  const levelCounts = words.reduce<Record<string, number>>((acc, w) => {
    acc[w.level] = (acc[w.level] || 0) + 1;
    return acc;
  }, {});

  const sorted = [...words]
    .filter((w) => !filter || w.word.includes(filter.toLowerCase()))
    .filter((w) => levelFilter === "all" || w.level === levelFilter)
    .sort((a, b) => {
      if (sort === "alpha") return a.word.localeCompare(b.word);
      if (sort === "difficulty") return b.level_rank - a.level_rank || a.word.localeCompare(b.word);
      return b.frequency - a.frequency;
    });

  return (
    <div className="vocab-list">
      <div className="vocab-controls">
        <input
          type="text"
          placeholder="Filter words..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input"
        />
        <button
          className={`btn btn-sm ${sort === "difficulty" ? "btn-active" : ""}`}
          onClick={() => setSort("difficulty")}
        >
          By difficulty
        </button>
        <button
          className={`btn btn-sm ${sort === "frequency" ? "btn-active" : ""}`}
          onClick={() => setSort("frequency")}
        >
          By frequency
        </button>
        <button
          className={`btn btn-sm ${sort === "alpha" ? "btn-active" : ""}`}
          onClick={() => setSort("alpha")}
        >
          A-Z
        </button>
      </div>

      <div className="level-filters">
        <button
          className={`btn btn-sm ${levelFilter === "all" ? "btn-active" : ""}`}
          onClick={() => setLevelFilter("all")}
        >
          All ({words.length})
        </button>
        {(["C1+", "B2", "B1", "A2", "A1"] as LevelFilter[]).map((lvl) => (
          <button
            key={lvl}
            className={`btn btn-sm level-btn`}
            style={{
              borderColor: LEVEL_COLORS[lvl],
              ...(levelFilter === lvl
                ? { background: LEVEL_COLORS[lvl], color: "#fff" }
                : { color: LEVEL_COLORS[lvl] }),
            }}
            onClick={() => setLevelFilter(levelFilter === lvl ? "all" : lvl)}
          >
            {lvl} ({levelCounts[lvl] || 0})
          </button>
        ))}
      </div>

      <div className="vocab-grid">
        {sorted.slice(0, 200).map((w) => (
          <WordTooltip key={w.word} word={w.word}>
            <div className="vocab-item" onClick={() => playWord(w.word)}>
              <span className="vocab-word">{w.word}</span>
              <span className="vocab-meta">
                <span
                  className="vocab-level"
                  style={{ color: LEVEL_COLORS[w.level] }}
                >
                  {w.level}
                </span>
                <span className="vocab-freq">{w.frequency}x</span>
              </span>
            </div>
          </WordTooltip>
        ))}
      </div>
      {sorted.length > 200 && (
        <p className="text-muted">Showing 200 of {sorted.length} words</p>
      )}
    </div>
  );
}
