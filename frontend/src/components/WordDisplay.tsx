import { WordTiming } from "../types";
import { useMemo } from "react";
import { WordTooltip } from "./WordTooltip";

interface Props {
  words: WordTiming[];
  currentTime: number;
  onWordClick?: (time: number) => void;
}

export function WordDisplay({ words, currentTime, onWordClick }: Props) {
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

  return (
    <div className="word-display">
      {words.map((w, i) => {
        let cls = "word upcoming";
        if (i < currentIndex) cls = "word past";
        else if (i === currentIndex) cls = "word current";

        return (
          <WordTooltip key={i} word={w.word}>
            <span className={cls} onClick={() => onWordClick?.(w.start)}>
              {w.word}{" "}
            </span>
          </WordTooltip>
        );
      })}
    </div>
  );
}
