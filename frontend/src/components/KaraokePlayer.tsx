import { useEffect, useState, useMemo, useImperativeHandle, forwardRef, useRef, useCallback } from "react";
import { ChunkDetail, WordTiming, Annotations, MarkType } from "../types";
import { chunkTtsUrl, chunkAudioUrl, fetchJson, postJson } from "../api";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { WordDisplay } from "./WordDisplay";

export interface SegmentInfo {
  startWordIndex: number;
  endWordIndex: number; // exclusive
  text: string;
}

export interface KaraokePlayerHandle {
  restartAndPlay: () => void;
  playFromCurrent: () => void;
  pause: () => void;
  isTtsMode: () => boolean;
  breaksEnabled: () => boolean;
  getCurrentSegment: () => SegmentInfo | null;
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
  const [breaksActive, setBreaksActive] = useState(true);
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
  const breaksActiveRef = useRef(breaksActive);
  useEffect(() => { breaksActiveRef.current = breaksActive; }, [breaksActive]);
  const prevWordRef = useRef(-1);
  useEffect(() => {
    if (!player.isPlaying || !breaksActiveRef.current) return;
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

  const getCurrentSegment = useCallback((): SegmentInfo | null => {
    if (!breaksActive) return null;
    const breaks = (annotations.break || []).slice().sort((a, b) => a - b);
    if (breaks.length === 0) return null;

    // Find which segment the current playback position falls in
    // Segments: [0..break0], [break0+1..break1], ..., [lastBreak+1..end]
    let startIdx = 0;
    let endIdx = words.length;

    for (const b of breaks) {
      if (currentWordIndex <= b) {
        endIdx = b + 1;
        break;
      }
      startIdx = b + 1;
    }
    // If past all breaks
    if (currentWordIndex > breaks[breaks.length - 1]) {
      startIdx = breaks[breaks.length - 1] + 1;
      endIdx = words.length;
    }

    const segmentWords = words.slice(startIdx, endIdx);
    const text = segmentWords.map((w) => w.word).join(" ");
    return { startWordIndex: startIdx, endWordIndex: endIdx, text };
  }, [annotations, breaksActive, words, currentWordIndex]);

  const playFromCurrent = () => {
    setTimeout(() => player.play(), 50);
  };

  useImperativeHandle(ref, () => ({
    restartAndPlay,
    playFromCurrent,
    pause: player.pause,
    isTtsMode: () => useTts,
    breaksEnabled: () => breaksActive,
    getCurrentSegment,
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

  const jumpBreak = (direction: -1 | 1) => {
    const breaks = (annotations.break || []).slice().sort((a, b) => a - b);
    if (breaks.length === 0) return;

    // Break boundaries as word indices (the word *after* the break mark)
    const boundaries = [0, ...breaks.map((b) => b + 1)];

    if (direction === 1) {
      // Find next boundary after current position
      const next = boundaries.find((b) => b > currentWordIndex);
      if (next !== undefined && next < words.length) {
        const t = words[next].start;
        player.seek(t);
        setCurrentTime(t);
        prevWordRef.current = next;
      }
    } else {
      // Find previous boundary before current position
      let prev = 0;
      for (const b of boundaries) {
        if (b >= currentWordIndex) break;
        prev = b;
      }
      // If we're already at a boundary, go one further back
      if (prev === currentWordIndex && boundaries.indexOf(prev) > 0) {
        prev = boundaries[boundaries.indexOf(prev) - 1];
      }
      const t = words[prev]?.start ?? (useTts ? 0 : chunk.start_time);
      player.seek(t);
      setCurrentTime(t);
      prevWordRef.current = prev;
    }
  };

  const handleWordClick = (t: number) => {
    player.seek(t);
    setCurrentTime(t);
    // Set prev word to current position so break detection doesn't fire on already-passed breaks
    for (let i = 0; i < words.length; i++) {
      if (words[i].start >= t) { prevWordRef.current = i; break; }
    }
  };

  const [showPlayMenu, setShowPlayMenu] = useState(false);
  const playMenuRef = useRef<HTMLDivElement>(null);
  const hasBreaks = (annotations.break || []).length > 0;

  useEffect(() => {
    if (!showPlayMenu) return;
    const handler = (e: MouseEvent) => {
      if (playMenuRef.current && !playMenuRef.current.contains(e.target as Node)) {
        setShowPlayMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPlayMenu]);

  return (
    <div className="karaoke-player">
      <div className={`controls-row ${disabled ? "controls-disabled" : ""}`}>
        <div className="play-split-btn" ref={playMenuRef}>
          <button
            onClick={player.isPlaying ? player.pause : player.play}
            className={`btn btn-primary btn-play ${hasBreaks && !player.isPlaying ? "btn-play-split" : ""}`}
            disabled={disabled}
          >
            {player.isPlaying ? "Pause" : breaksActive && hasBreaks ? "Play /" : "Play"}
          </button>
          {hasBreaks && !player.isPlaying && (
            <button
              className="btn btn-primary btn-play-menu"
              disabled={disabled}
              onClick={() => setShowPlayMenu(!showPlayMenu)}
            >
              ▾
            </button>
          )}
          {showPlayMenu && (
            <div className="play-dropdown">
              <button
                className={`play-dropdown-item ${breaksActive ? "active" : ""}`}
                onClick={() => { setBreaksActive(true); setShowPlayMenu(false); }}
              >
                Play with breaks /
              </button>
              <button
                className={`play-dropdown-item ${!breaksActive ? "active" : ""}`}
                onClick={() => { setBreaksActive(false); setShowPlayMenu(false); }}
              >
                Play full
              </button>
            </div>
          )}
        </div>
        <span className="nav-separator" />
        <button onClick={restart} className="btn btn-sm btn-nav" disabled={disabled}>Restart</button>
        <span className="nav-divider" />
        <button onClick={() => jumpBreak(-1)} className="btn btn-sm btn-nav" disabled={disabled || !hasBreaks}>&laquo; /Break</button>
        <button onClick={() => jumpSentence(-1)} className="btn btn-sm btn-nav" disabled={disabled}>&laquo; Sentence</button>
        <button onClick={() => jumpWord(-1)} className="btn btn-sm btn-nav" disabled={disabled}>&lsaquo; Word</button>
        <button onClick={() => jumpWord(1)} className="btn btn-sm btn-nav" disabled={disabled}>Word &rsaquo;</button>
        <button onClick={() => jumpSentence(1)} className="btn btn-sm btn-nav" disabled={disabled}>Sentence &raquo;</button>
        <button onClick={() => jumpBreak(1)} className="btn btn-sm btn-nav" disabled={disabled || !hasBreaks}>/Break &raquo;</button>
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
