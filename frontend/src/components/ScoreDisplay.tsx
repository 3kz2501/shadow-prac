import { ScoreResult } from "../types";

interface Props {
  score: ScoreResult;
  referenceText: string;
}

export function ScoreDisplay({ score, referenceText }: Props) {
  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "#22c55e";
    if (pct >= 60) return "#eab308";
    if (pct >= 40) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="score-display">
      <div className="score-circle" style={{ borderColor: getScoreColor(score.score_pct) }}>
        <span className="score-pct">{score.score_pct}%</span>
      </div>

      <div className="score-details">
        <div className="score-stat correct">Correct: {score.hits}</div>
        <div className="score-stat sub">Substituted: {score.substitutions}</div>
        <div className="score-stat del">Deleted: {score.deletions}</div>
        <div className="score-stat ins">Inserted: {score.insertions}</div>
      </div>

      <div className="transcript-comparison">
        <div>
          <h4>Reference</h4>
          <p className="ref-text">{referenceText}</p>
        </div>
        <div>
          <h4>Your speech</h4>
          <p className="hyp-text">{score.transcript || "(no speech detected)"}</p>
        </div>
      </div>
    </div>
  );
}
