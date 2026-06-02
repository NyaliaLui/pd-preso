import { useState, useEffect } from 'react';
import { ORIENTATION_TEST_IDS } from '@/app/test-ids';

export function OrientationGuard() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(orientation: portrait)');
    setIsPortrait(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (!isPortrait) return null;

  return (
    <div
      data-testid={ORIENTATION_TEST_IDS.OVERLAY}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
    >
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="text-6xl text-white font-thin">â†»</div>
        <h1 className="text-2xl font-bold text-white">Rotate Your Device</h1>
        <p
          data-testid={ORIENTATION_TEST_IDS.MESSAGE}
          className="text-gray-300 max-w-xs"
        >
          This game is only playable in landscape mode. Please rotate your
          device to continue.
        </p>
      </div>
    </div>
  );
}
