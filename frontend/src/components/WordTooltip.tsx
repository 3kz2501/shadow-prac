import { useState, useRef } from "react";
import { fetchJson } from "../api";

interface Props {
  word: string;
  children: React.ReactNode;
}

interface DictEntry {
  definition: string | null;
  ipa: string | null;
}

const cache = new Map<string, DictEntry>();

export function WordTooltip({ word, children }: Props) {
  const [entry, setEntry] = useState<DictEntry | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number>(0);

  const lookup = async () => {
    const key = word.toLowerCase().replace(/[^a-z'-]/g, "");
    if (!key) return;

    if (cache.has(key)) {
      setEntry(cache.get(key)!);
      setVisible(true);
      return;
    }

    try {
      const res = await fetchJson<{ word: string; definition: string | null; ipa: string | null }>(`/api/dict/${key}`);
      const e = { definition: res.definition, ipa: res.ipa };
      cache.set(key, e);
      setEntry(e);
      setVisible(true);
    } catch {
      const e = { definition: null, ipa: null };
      cache.set(key, e);
      setEntry(e);
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
      {visible && entry !== undefined && (
        <span className={`word-tooltip ${!entry.definition && !entry.ipa ? "word-tooltip-empty" : ""}`}>
          {entry.ipa && <span className="word-ipa">/{entry.ipa}/</span>}
          {entry.definition || (!entry.ipa && "辞書に情報がありません")}
        </span>
      )}
    </span>
  );
}
