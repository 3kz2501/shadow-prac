import { WordTiming } from "../types";
import { useMemo } from "react";

interface Props {
  words: WordTiming[];
  currentTime: number;
  /** Offset to subtract from word timings (e.g. chunk startTime for original audio) */
  timeOffset?: number;
}

export function WordDisplay({ words, currentTime, timeOffset = 0 }: Props) {
  const currentIndex = useMemo(() => {
    const t = currentTime;
    // Binary search for current word
    let lo = 0;
    let hi = words.length - 1;
    let result = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const ws = words[mid].start - timeOffset;
      if (ws <= t) {
        result = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    // Check if we're past the end of the current word
    if (result >= 0 && currentTime > words[result].end - timeOffset + 0.3) {
      // We're in a gap - still highlight the last word
    }

    return result;
  }, [words, currentTime, timeOffset]);

  return (
    <div className="word-display">
      {words.map((w, i) => {
        let cls = "word upcoming";
        if (i < currentIndex) cls = "word past";
        else if (i === currentIndex) cls = "word current";

        return (
          <span key={i} className={cls}>
            {w.word}{" "}
          </span>
        );
      })}
    </div>
  );
}
