import { BOULDER_REWARD_TEST_IDS } from '@/app/test-ids';

interface BoulderRewardPopupProps {
  show: boolean;
  onClose: () => void;
}

export function BoulderRewardPopup({ show, onClose }: BoulderRewardPopupProps) {
  if (!show) return null;
  return (
    <div
      data-testid={BOULDER_REWARD_TEST_IDS.OVERLAY}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    >
      <div className="relative flex flex-col items-center gap-4 rounded-xl bg-gray-800/90 p-8 text-center">
        <button
          data-testid={BOULDER_REWARD_TEST_IDS.CLOSE_BUTTON}
          onClick={onClose}
          className="absolute right-3 top-3 text-gray-400 hover:text-white"
          aria-label="Close"
        >
          âœ•
        </button>
        <h1 className="text-3xl font-bold text-yellow-400">
          You destroyed a boulder!
        </h1>
        <p
          data-testid={BOULDER_REWARD_TEST_IDS.MESSAGE}
          className="max-w-sm text-white"
        >
          Congratulations! You won 20% off on Dragon Groove merch. Use code
          TSTCDE at checkout
        </p>
        <a
          data-testid={BOULDER_REWARD_TEST_IDS.STORE_LINK}
          href="https://www.amazon.com"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          Dragon Groove Store
        </a>
        <button
          data-testid={BOULDER_REWARD_TEST_IDS.RESTART_BUTTON}
          onClick={() => window.location.reload()}
          className="rounded-lg bg-red-600 px-6 py-2 text-lg font-semibold text-white transition-colors hover:bg-red-700"
        >
          Restart
        </button>
      </div>
    </div>
  );
}
