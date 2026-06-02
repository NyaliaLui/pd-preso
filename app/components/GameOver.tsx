interface GameOverProps {
  show: boolean;
  won?: boolean;
}

export function GameOver({ show, won = false }: GameOverProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="rounded-lg bg-gray-800/90 px-12 py-8 text-center shadow-xl">
        <h1
          className={`text-4xl font-bold ${won ? 'text-yellow-400' : 'text-red-500'}`}
        >
          {won ? 'Congrats!' : 'You died!'}
        </h1>
        <p className="mt-4 text-xl text-white">
          {won ? 'You won!' : 'Game over!'}
        </p>
        <p className="mt-2 text-lg text-white">
          Show your support by following the Comic Book artist, Dane Shobe, on
          Social Media
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <a
            href="https://www.facebook.com/people/Dan%C3%A9-Shobe/pfbid08A75aqRy5XnxXLKy961P4bZiN3vAUbJXJTBoQFcKdkqKeDfVGu2hzrh6PS1YD6CEl/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-600 px-6 py-2 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Facebook
          </a>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-600 px-6 py-2 text-lg font-semibold text-white transition-colors hover:bg-red-700"
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}
