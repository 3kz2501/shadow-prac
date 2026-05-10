import { WordTiming, Annotations, MarkType } from "../types";
import { useMemo, useState, useRef, useEffect } from "react";
import { WordTooltip } from "./WordTooltip";

interface Props {
  words: WordTiming[];
  currentTime: number;
  annotations?: Annotations;
  onWordClick?: (time: number) => void;
  onAnnotate?: (wordIndex: number, markType: MarkType) => void;
}

const MARK_OPTIONS: { type: MarkType; label: string; icon: string }[] = [
  { type: "unclear", label: "Unclear", icon: "?" },
  { type: "stress", label: "Stress", icon: "!" },
  { type: "break", label: "Break /", icon: "/" },
];

export function WordDisplay({ words, currentTime, annotations, onWordClick, onAnnotate }: Props) {
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentIndex = useMemo(() => {
    let lo = 0;
    let hi = words.length - 1;
    let result = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (words[mid].start <= currentTime) {
        result = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return result;
  }, [words, currentTime]);

  // Close menu on outside click
  useEffect(() => {
    if (menuIndex === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuIndex(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuIndex]);

  const hasAnnotation = (index: number, type: MarkType): boolean => {
    return annotations?.[type]?.includes(index) ?? false;
  };

  const handleDoubleClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    if (!onAnnotate) return;
    setMenuIndex(menuIndex === index ? null : index);
  };

  const handleMark = (index: number, type: MarkType) => {
    onAnnotate?.(index, type);
    setMenuIndex(null);
  };

  return (
    <div className="word-display">
      {words.map((w, i) => {
        let cls = "word upcoming";
        if (i < currentIndex) cls = "word past";
        else if (i === currentIndex) cls = "word current";

        if (hasAnnotation(i, "unclear")) cls += " mark-unclear";
        if (hasAnnotation(i, "stress")) cls += " mark-stress";

        return (
          <span key={i} className="word-wrapper">
            <WordTooltip word={w.word}>
              <span
                className={cls}
                onClick={() => onWordClick?.(w.start)}
                onDoubleClick={(e) => handleDoubleClick(e, i)}
              >
                {w.word}
              </span>
            </WordTooltip>
            {hasAnnotation(i, "break") && <span className="mark-break">/</span>}
            {menuIndex === i && (
              <div className="annotation-menu" ref={menuRef}>
                {MARK_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    className={`annotation-btn ${hasAnnotation(i, opt.type) ? "annotation-active" : ""}`}
                    onClick={() => handleMark(i, opt.type)}
                  >
                    <span className="annotation-icon">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {" "}
          </span>
        );
      })}
    </div>
  );
}
