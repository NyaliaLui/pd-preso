import { useState, useEffect } from 'react';

const LABELS = ['A', 'B', 'C'] as const;

export interface Question {
  text: string;
  options: [string, string, string];
  correctIndex: number;
}

interface QuestionPromptProps {
  show: boolean;
  questions: Question[];
  onClose: () => void;
}

export function QuestionPrompt({
  show,
  questions,
  onClose,
}: QuestionPromptProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (show) {
      setCurrentIndex(0);
      setSelected(null);
      setFinished(false);
    }
  }, [show]);

  if (!show || questions.length === 0) return null;

  const question = questions[currentIndex];

  const handleSelect = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((c) => c + 1);
      setSelected(null);
    } else {
      setFinished(true);
    }
  };

  const handlePlayAgain = () => {
    setCurrentIndex(0);
    setSelected(null);
    setFinished(false);
  };

  const optionClass = (i: number) => {
    if (selected === null)
      return 'bg-white/10 hover:bg-white/20 cursor-pointer';
    if (i === question.correctIndex) return 'bg-green-500/50';
    if (i === selected && i !== question.correctIndex) return 'bg-red-500/50';
    return 'bg-white/10 opacity-50';
  };

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 w-1/2 bg-gray-900/40 p-8 rounded-r-2xl z-40">
      {!finished ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <span className="text-white/60 text-sm">
              {currentIndex + 1} / {questions.length}
            </span>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-sm transition"
            >
              ✕ Close
            </button>
          </div>
          <p className="text-white text-2xl font-semibold mb-6">
            {question.text}
          </p>
          <div className="flex flex-col">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`w-full text-left px-4 py-3 rounded-lg text-white text-lg mb-3 transition ${optionClass(i)}`}
              >
                {LABELS[i]}) {option}
              </button>
            ))}
          </div>
          {selected !== null && (
            <div className="flex justify-end mt-2">
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
              >
                {currentIndex < questions.length - 1 ? 'Next →' : 'Finish'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-white text-2xl font-semibold">All done!</p>
          <div className="flex gap-3">
            <button
              onClick={handlePlayAgain}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
            >
              ↺ Play Again
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
