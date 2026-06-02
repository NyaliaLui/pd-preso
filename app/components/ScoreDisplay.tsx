interface ScoreDisplayProps {
  score: number;
  level: number;
}

export function ScoreDisplay({ score, level }: ScoreDisplayProps) {
  return (
    <div
      data-testid="score-display"
      className="fixed top-4 right-4 z-50 flex gap-6 text-white text-sm font-semibold"
    >
      <span>
        Score: <span data-testid="score-value">{score}</span>
      </span>
      <span>
        Level: <span data-testid="level-value">{level}</span>
      </span>
    </div>
  );
}
