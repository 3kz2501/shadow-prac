import { WordTiming } from "../types";
import { useMemo } from "react";

interface Props {
  words: WordTiming[];
  currentTime: number;
}

export function WordDisplay({ words, currentTime }: Props) {
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
          <span key={i} className={cls}>
            {w.word}{" "}
          </span>
        );
      })}
    </div>
  );
}
