interface AiSuccessPopupProps {
  show: boolean;
  onMainMenu: () => void;
}

export function AiSuccessPopup({ show, onMainMenu }: AiSuccessPopupProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
      <div className="bg-zinc-800 rounded-xl p-10 max-w-md mx-4 flex flex-col items-center gap-8 shadow-2xl text-center">
        <p className="text-white text-2xl font-semibold leading-snug">
          Wow! What a great suggestion, let&apos;s book my next trip now. Here
          is a gift from me
        </p>
        <div className="bg-zinc-700 rounded-xl px-8 py-5 flex flex-col items-center gap-2">
          <p className="text-zinc-400 text-sm font-semibold uppercase tracking-widest">
            Cheat Code
          </p>
          <p className="text-amber-300 text-4xl font-bold tracking-widest">
            FIRE EAGLE
          </p>
        </div>
        <button
          onClick={onMainMenu}
          className="bg-zinc-600 hover:bg-zinc-500 active:bg-zinc-700 text-white font-bold py-3 px-10 rounded-lg text-lg transition-colors"
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}
