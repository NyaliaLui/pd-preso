interface TripSuccessPopupProps {
  show: boolean;
  onNext: () => void;
}

export function TripSuccessPopup({ show, onNext }: TripSuccessPopupProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
      <div className="bg-zinc-800 rounded-xl p-10 max-w-md mx-4 flex flex-col items-center gap-8 shadow-2xl text-center">
        <p className="text-white text-2xl font-semibold leading-snug">
          Excellent! You got a trip from this guest.
        </p>
        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-3 px-10 rounded-lg text-lg transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
