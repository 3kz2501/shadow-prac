import { useRef, useState, useEffect } from "react";
import { ScoreResult, AlignmentItem } from "../types";
import { scoreRecordingUrl } from "../api";

interface Props {
  score: ScoreResult;
  referenceText: string;
}

function AlignmentView({ alignment }: { alignment: AlignmentItem[] }) {
  return (
    <div className="alignment-view">
      <h4>Word Alignment</h4>
      <div className="alignment-words">
        {alignment.map((item, i) => {
          if (item.type === "equal") {
            return (
              <span key={i} className="align-word align-equal">
                {item.ref}
              </span>
            );
          }
          if (item.type === "substitute") {
            return (
              <span key={i} className="align-word align-substitute" title={`You said: "${item.hyp}"`}>
                <span className="align-ref">{item.ref}</span>
                <span className="align-arrow">&rarr;</span>
                <span className="align-hyp">{item.hyp}</span>
              </span>
            );
          }
          if (item.type === "delete") {
            return (
              <span key={i} className="align-word align-delete" title="Missing word">
                {item.ref}
              </span>
            );
          }
          if (item.type === "insert") {
            return (
              <span key={i} className="align-word align-insert" title="Extra word">
                +{item.hyp}
              </span>
            );
          }
          return null;
        })}
      </div>
      <div className="alignment-legend">
        <span className="legend-item"><span className="legend-dot align-equal-bg" /> Correct</span>
        <span className="legend-item"><span className="legend-dot align-substitute-bg" /> Substituted</span>
        <span className="legend-item"><span className="legend-dot align-delete-bg" /> Deleted</span>
        <span className="legend-item"><span className="legend-dot align-insert-bg" /> Inserted</span>
      </div>
    </div>
  );
}

export function ScoreDisplay({ score, referenceText }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [score.id]);

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "#22c55e";
    if (pct >= 60) return "#eab308";
    if (pct >= 40) return "#f97316";
    return "#ef4444";
  };

  const togglePlayback = () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(scoreRecordingUrl(score.id));
    audioRef.current = audio;
    audio.onended = () => {
      audioRef.current = null;
      setPlaying(false);
    };
    audio.play();
    setPlaying(true);
  };

  return (
    <div className="score-display">
      <div className="score-header">
        <div className="score-circle" style={{ borderColor: getScoreColor(score.score_pct) }}>
          <span className="score-pct">{score.score_pct}%</span>
        </div>
        <div className="score-summary">
          <div className="score-details">
            <span className="score-stat correct">Correct: {score.hits}</span>
            <span className="score-stat sub">Substituted: {score.substitutions}</span>
            <span className="score-stat del">Deleted: {score.deletions}</span>
            <span className="score-stat ins">Inserted: {score.insertions}</span>
          </div>
          <button className="btn btn-primary btn-play" onClick={togglePlayback}>
            {playing ? "Stop" : "Play"}
          </button>
        </div>
      </div>

      {score.alignment && score.alignment.length > 0 && (
        <AlignmentView alignment={score.alignment} />
      )}
    </div>
  );
}
