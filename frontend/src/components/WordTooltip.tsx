import { useState, useRef } from "react";
import { fetchJson } from "../api";

interface Props {
  word: string;
  children: React.ReactNode;
}

const cache = new Map<string, string | null>();

export function WordTooltip({ word, children }: Props) {
  const [definition, setDefinition] = useState<string | null | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number>(0);

  const lookup = async () => {
    const key = word.toLowerCase().replace(/[^a-z'-]/g, "");
    if (!key) return;

    if (cache.has(key)) {
      setDefinition(cache.get(key)!);
      setVisible(true);
      return;
    }

    try {
      const res = await fetchJson<{ word: string; definition: string | null }>(`/api/dict/${key}`);
      cache.set(key, res.definition);
      setDefinition(res.definition);
      setVisible(true);
    } catch {
      cache.set(key, null);
      setDefinition(null);
    }
  };

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(lookup, 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <span
      className="word-tooltip-trigger"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && definition !== undefined && (
        <span className={`word-tooltip ${definition === null ? "word-tooltip-empty" : ""}`}>
          {definition || "辞書に情報がありません"}
        </span>
      )}
    </span>
  );
}
