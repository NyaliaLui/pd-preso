import React from 'react';

interface StoryDisplayProps {
  show: boolean;
  sentence: string;
  amenities: string[];
  onClose: () => void;
}

function italicizeAmenities(
  sentence: string,
  amenities: string[],
): React.ReactNode[] {
  // Sort longest first so multi-word phrases match before their substrings
  const sorted = [...amenities].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = sentence.split(regex);

  return parts.map((part, i) => {
    if (sorted.some((a) => a.toLowerCase() === part.toLowerCase())) {
      return (
        <em key={i} className="text-amber-300">
          {part}
        </em>
      );
    }
    return part;
  });
}

export function StoryDisplay({
  show,
  sentence,
  amenities,
  onClose,
}: StoryDisplayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
      <div className="bg-zinc-800 rounded-xl p-8 max-w-lg mx-4 flex flex-col gap-6 shadow-2xl">
        <p className="text-white text-xl leading-relaxed">
          {italicizeAmenities(sentence, amenities)}
        </p>
        <button
          onClick={onClose}
          className="self-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-2 px-8 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
