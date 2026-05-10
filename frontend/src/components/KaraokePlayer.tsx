import { useEffect, useState, useMemo, useImperativeHandle, forwardRef, useRef, useCallback } from "react";
import { ChunkDetail, WordTiming, Annotations, MarkType } from "../types";
import { chunkTtsUrl, chunkAudioUrl, fetchJson, postJson } from "../api";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { WordDisplay } from "./WordDisplay";

export interface KaraokePlayerHandle {
  restartAndPlay: () => void;
  pause: () => void;
  isTtsMode: () => boolean;
}

interface Props {
  chunk: ChunkDetail;
  disabled?: boolean;
}

function getSentenceBoundaries(words: WordTiming[]): number[] {
  const boundaries: number[] = [0];
  for (let i = 0; i < words.length; i++) {
    const w = words[i].word.trim();
    if (/[.!?]$/.test(w) && i < words.length - 1) {
      boundaries.push(i + 1);
    }
  }
  return boundaries;
}

export const KaraokePlayer = forwardRef<KaraokePlayerHandle, Props>(({ chunk, disabled = false }, ref) => {
  const [useTts, setUseTts] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showScript, setShowScript] = useState(true);
  const [annotations, setAnnotations] = useState<Annotations>({} as Annotations);
  const annotationsRef = useRef(annotations);

  const player = useAudioPlayer({
    onTimeUpdate: setCurrentTime,
    startTime: useTts ? undefined : chunk.start_time,
    endTime: useTts ? undefined : chunk.end_time,
  });

  const hasTtsWords = chunk.tts_words && chunk.tts_words.length > 0;
  const words = useTts ? (hasTtsWords ? chunk.tts_words! : chunk.words) : chunk.words;

  const sentenceBoundaries = useMemo(() => getSentenceBoundaries(words), [words]);

  const currentWordIndex = useMemo(() => {
    let result = -1;
    for (let i = 0; i < words.length; i++) {
      if (words[i].start <= currentTime) result = i;
      else break;
    }
    return result;
  }, [words, currentTime]);

  // Keep ref in sync for use in time-check callback
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);

  // Break boundary auto-stop: check if we crossed a break mark
  const prevWordRef = useRef(-1);
  useEffect(() => {
    if (!player.isPlaying) return;
    const breaks = annotationsRef.current.break || [];
    if (breaks.length === 0) return;

    const prev = prevWordRef.current;
    const cur = currentWordIndex;

    if (cur > prev) {
      // Check if any break mark is between prev and cur (inclusive of prev, break is "after" that word)
      for (let i = prev; i < cur; i++) {
        if (breaks.includes(i)) {
          // Stop at the start of the next word after the break
          const stopTime = words[i + 1]?.start;
          if (stopTime !== undefined) {
            player.pause();
            player.seek(stopTime);
            setCurrentTime(stopTime);
          }
          break;
        }
      }
    }
    prevWordRef.current = cur;
  }, [currentWordIndex, player.isPlaying, words]);

  // Load annotations
  useEffect(() => {
    fetchJson<Annotations>(`/api/chunks/${chunk.id}/annotations`)
      .then(setAnnotations)
      .catch(() => setAnnotations({} as Annotations));
  }, [chunk.id]);

  useEffect(() => {
    const src = useTts ? chunkTtsUrl(chunk.id) : chunkAudioUrl(chunk.id);
    player.load(src);
    player.changeRate(1.0);
    player.changeVolume(1.0);
    setCurrentTime(0);
    prevWordRef.current = -1;
  }, [chunk.id, useTts]);

  const handleAnnotate = useCallback(async (wordIndex: number, markType: MarkType) => {
    try {
      const res = await postJson<{ action: string }>(`/api/chunks/${chunk.id}/annotations`, {
        word_index: wordIndex,
        mark_type: markType,
      });
      // Update local state
      setAnnotations((prev) => {
        const list = prev[markType] ? [...prev[markType]] : [];
        if (res.action === "added") {
          list.push(wordIndex);
        } else {
          const idx = list.indexOf(wordIndex);
          if (idx >= 0) list.splice(idx, 1);
        }
        return { ...prev, [markType]: list };
      });
    } catch (e) {
      console.error("Failed to toggle annotation:", e);
    }
  }, [chunk.id]);

  const restart = () => {
    const t = useTts ? 0 : chunk.start_time;
    player.seek(t);
    setCurrentTime(t);
    prevWordRef.current = -1;
  };

  const restartAndPlay = () => {
    const t = useTts ? 0 : chunk.start_time;
    player.seek(t);
    setCurrentTime(t);
    prevWordRef.current = -1;
    setTimeout(() => player.play(), 50);
  };

  // Play with break awareness: seek to current segment start first
  const playFromSegment = () => {
    const breaks = annotations.break || [];
    if (breaks.length === 0 || !player.isPlaying) {
      player.play();
      return;
    }
  };

  useImperativeHandle(ref, () => ({
    restartAndPlay,
    pause: player.pause,
    isTtsMode: () => useTts,
  }));

  const jumpSentence = (direction: -1 | 1) => {
    let currentSentence = 0;
    for (let i = sentenceBoundaries.length - 1; i >= 0; i--) {
      if (currentWordIndex >= sentenceBoundaries[i]) {
        currentSentence = i;
        break;
      }
    }

    let targetSentence = currentSentence + direction;
    targetSentence = Math.max(0, Math.min(targetSentence, sentenceBoundaries.length - 1));

    const targetWordIdx = sentenceBoundaries[targetSentence];
    const targetTime = words[targetWordIdx].start;
    player.seek(targetTime);
    setCurrentTime(targetTime);
  };

  const jumpWord = (direction: -1 | 1) => {
    let targetIdx = currentWordIndex + direction;
    targetIdx = Math.max(0, Math.min(targetIdx, words.length - 1));
    const targetTime = words[targetIdx].start;
    player.seek(targetTime);
    setCurrentTime(targetTime);
  };

  const handleWordClick = (t: number) => {
    player.seek(t);
    setCurrentTime(t);
    // Reset prev word so break detection works from new position
    for (let i = 0; i < words.length; i++) {
      if (words[i].start >= t) { prevWordRef.current = i - 1; break; }
    }
  };

  return (
    <div className="karaoke-player">
      <div className={`controls-row ${disabled ? "controls-disabled" : ""}`}>
        <button onClick={player.isPlaying ? player.pause : player.play} className="btn btn-primary btn-play" disabled={disabled}>
          {player.isPlaying ? "Pause" : "Play"}
        </button>
        <span className="nav-separator" />
        <button onClick={restart} className="btn btn-sm btn-nav" disabled={disabled}>Restart</button>
        <span className="nav-divider" />
        <button onClick={() => jumpSentence(-1)} className="btn btn-sm btn-nav" disabled={disabled}>&laquo; Sentence</button>
        <button onClick={() => jumpWord(-1)} className="btn btn-sm btn-nav" disabled={disabled}>&lsaquo; Word</button>
        <button onClick={() => jumpWord(1)} className="btn btn-sm btn-nav" disabled={disabled}>Word &rsaquo;</button>
        <button onClick={() => jumpSentence(1)} className="btn btn-sm btn-nav" disabled={disabled}>Sentence &raquo;</button>
      </div>

      <div className={`controls-row controls-secondary ${disabled ? "controls-disabled" : ""}`}>
        <span className="control-label">Voice:</span>
        <div className="audio-toggle">
          <button
            className={`btn btn-sm ${useTts ? "btn-active" : ""}`}
            onClick={() => setUseTts(true)}
            disabled={disabled}
          >
            Synth
          </button>
          <button
            className={`btn btn-sm ${!useTts ? "btn-active" : ""}`}
            onClick={() => setUseTts(false)}
            disabled={disabled}
          >
            Original
          </button>
        </div>
      </div>

      <div className={`slider-controls ${disabled ? "controls-disabled" : ""}`}>
        <div className="slider-row">
          <label>Speed: {player.playbackRate.toFixed(2)}x</label>
          <button className="btn btn-sm adj-btn" disabled={disabled} onClick={() => player.changeRate(Math.max(0.1, +(player.playbackRate - 0.05).toFixed(2)))}>-</button>
          <input
            type="range"
            min="0"
            max="2.0"
            step="0.05"
            value={player.playbackRate}
            onChange={(e) => player.changeRate(Math.max(0.1, parseFloat(e.target.value)))}
            disabled={disabled}
          />
          <button className="btn btn-sm adj-btn" disabled={disabled} onClick={() => player.changeRate(Math.min(2.0, +(player.playbackRate + 0.05).toFixed(2)))}>+</button>
        </div>
        <div className="slider-row">
          <label>Vol: {Math.round(player.volume * 100)}%</label>
          <button className="btn btn-sm adj-btn" disabled={disabled} onClick={() => player.changeVolume(Math.max(0, +(player.volume - 0.1).toFixed(1)))}>-</button>
          <input
            type="range"
            min="0"
            max="2.0"
            step="0.1"
            value={player.volume}
            onChange={(e) => player.changeVolume(parseFloat(e.target.value))}
            disabled={disabled}
          />
          <button className="btn btn-sm adj-btn" disabled={disabled} onClick={() => player.changeVolume(Math.min(2.0, +(player.volume + 0.1).toFixed(1)))}>+</button>
        </div>
      </div>

      <button
        className="toggle-disclosure"
        onClick={() => setShowScript(!showScript)}
      >
        <span className={`disclosure-arrow ${showScript ? "open" : ""}`}>&#9654;</span>
        {showScript ? "Hide Script" : "Show Script"}
      </button>

      {showScript && (
        <WordDisplay
          words={words}
          currentTime={currentTime}
          annotations={annotations}
          onWordClick={handleWordClick}
          onAnnotate={disabled ? undefined : handleAnnotate}
        />
      )}
    </div>
  );
});
