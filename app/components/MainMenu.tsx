import { useState } from 'react';

interface MainMenuProps {
  onStart: () => void;
  onCheatCode: () => void;
}

export function MainMenu({ onStart, onCheatCode }: MainMenuProps) {
  const [showCheatModal, setShowCheatModal] = useState(false);
  const [cheatInput, setCheatInput] = useState('');
  const [cheatError, setCheatError] = useState(false);

  const openCheatModal = () => {
    setCheatInput('');
    setCheatError(false);
    setShowCheatModal(true);
  };

  const handleCheatSubmit = () => {
    if (cheatInput.trim().toUpperCase() === 'FIRE EAGLE') {
      setShowCheatModal(false);
      onCheatCode();
    } else {
      setCheatError(true);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-900 z-50">
      <h1 className="text-white text-7xl font-bold mb-16 drop-shadow-lg">
        PD Preso
      </h1>

      <div className="flex flex-col items-center gap-4 w-64">
        <button
          onClick={onStart}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition-colors"
        >
          Start
        </button>
        <button
          onClick={openCheatModal}
          className="w-full bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 text-white font-bold py-3 px-8 rounded-lg text-xl transition-colors"
        >
          Cheat Code
        </button>
      </div>

      {showCheatModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-[100]">
          <div className="bg-zinc-800 rounded-xl p-8 flex flex-col gap-4 w-80 shadow-2xl">
            <h2 className="text-white text-2xl font-bold">Enter Cheat Code</h2>
            <input
              type="text"
              value={cheatInput}
              onChange={(e) => {
                setCheatInput(e.target.value);
                setCheatError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCheatSubmit()}
              className="bg-zinc-700 text-white rounded-lg px-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter code..."
              autoFocus
            />
            {cheatError && (
              <p className="text-red-400 text-sm">Invalid cheat code.</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleCheatSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors"
              >
                Submit
              </button>
              <button
                onClick={() => setShowCheatModal(false)}
                className="flex-1 bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
