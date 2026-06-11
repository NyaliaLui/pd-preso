import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

interface GameLoadingOverlayProps {
  show: boolean;
  loadId: number;
  onDismiss: () => void;
}

export function GameLoadingOverlay({
  show,
  loadId,
  onDismiss,
}: GameLoadingOverlayProps) {
  const { active, progress } = useProgress();
  const [fading, setFading] = useState(false);

  // Re-runs whenever show/active/progress/loadId changes.
  // loadId increments each time startGame() is called, forcing this effect
  // to re-evaluate even when assets are fully cached (active=false, progress=100
  // never changes between plays).
  useEffect(() => {
    if (!show) {
      setFading(false);
      return;
    }
    if (!active && progress === 100) {
      setFading(true);
      const t = setTimeout(onDismiss, 300);
      return () => clearTimeout(t);
    }
  }, [show, active, progress, onDismiss, loadId]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-zinc-900 flex flex-col items-center justify-center gap-6 transition-opacity duration-300 pointer-events-none ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <p className="text-white text-2xl font-semibold tracking-wide">
        Loading…
      </p>
      <div className="w-full max-w-sm h-2 rounded-full bg-zinc-700 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-zinc-400 text-sm tabular-nums">
        {Math.round(progress)}%
      </p>
    </div>
  );
}
