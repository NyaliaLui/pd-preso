import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { Player } from '@/app/components/Player/Player';
import { Elephant } from '@/app/components/Enemy/Elephant';
import { World } from '@/app/components/World/World';
import { GameLoadingOverlay } from '@/app/components/GameLoadingOverlay';
import { useKeyboardControls } from '@/app/components/Player/hooks/useKeyboardControls';
import type { KeyState } from '@/app/components/Player/hooks/useKeyboardControls';
import * as THREE from 'three';
import { ENVIRONMENT_DEFAULTS, SHARED_DEFAULTS } from '@/app/constants';

// Max elephants alive at once (safety cap)
const MAX_ELEPHANTS = 10;

interface ElephantEntry {
  id: number;
  spawnX: number;
  bodyRef: React.MutableRefObject<RapierRigidBody | null>;
}

// Runs inside Canvas — checks player↔elephant distances each frame.
// `key` is set by parent to force a clean remount on retry.
function CollisionChecker({
  active,
  playerBodyRef,
  elephantBodyRefsRef,
  onHit,
  onStomp,
}: {
  active: boolean;
  playerBodyRef: React.MutableRefObject<RapierRigidBody | null>;
  elephantBodyRefsRef: React.MutableRefObject<
    Map<number, React.MutableRefObject<RapierRigidBody | null>>
  >;
  onHit: () => void;
  onStomp: (id: number) => void;
}) {
  // Keep callback refs so the useFrame closure is never stale
  const onHitRef = useRef(onHit);
  onHitRef.current = onHit;
  const onStompRef = useRef(onStomp);
  onStompRef.current = onStomp;

  const lastHitRef = useRef(0);
  const stompedRef = useRef(new Set<number>());

  useFrame(({ clock }) => {
    if (!active || !playerBodyRef.current) return;
    const pTr = playerBodyRef.current.translation();
    const pVel = playerBodyRef.current.linvel?.() ?? { x: 0, y: 0, z: 0 };

    elephantBodyRefsRef.current.forEach((bodyRef, id) => {
      if (!bodyRef.current || stompedRef.current.has(id)) return;
      const eTr = bodyRef.current.translation();
      const dx = Math.abs(pTr.x - eTr.x);
      const dy = pTr.y - eTr.y; // positive = player above elephant

      if (dx > 1.3) return;

      if (dy > 0.8 && pVel.y < -0.3) {
        // Player falling onto top of elephant = stomp
        stompedRef.current.add(id);
        onStompRef.current(id);
      } else if (
        Math.abs(dy) <= 0.8 &&
        clock.elapsedTime - lastHitRef.current > 0.8
      ) {
        // Side / same-height collision = hit (0.8 s cooldown)
        lastHitRef.current = clock.elapsedTime;
        onHitRef.current();
      }
    });
  });

  return null;
}

interface MiniGameProps {
  onBack: () => void;
}

export function MiniGame({ onBack }: MiniGameProps) {
  const playerPositionRef = useRef(new THREE.Vector3());
  const playerBodyRef = useRef<RapierRigidBody | null>(null);
  const elephantBodyRefsRef = useRef(
    new Map<number, React.MutableRefObject<RapierRigidBody | null>>(),
  );
  const nextElephantId = useRef(0);

  const { keys: kbKeys } = useKeyboardControls();

  const [hp, setHp] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [elephants, setElephants] = useState<ElephantEntry[]>([]);
  const [gameLoading, setGameLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [autoWalking, setAutoWalking] = useState(false);
  // Persisted walk direction — last direction the player moved in
  const [walkDir, setWalkDir] = useState<'left' | 'right'>('right');
  const [gameOver, setGameOver] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  const [pointerLeft, setPointerLeft] = useState(false);
  const [pointerRight, setPointerRight] = useState(false);
  const [jumpPressed, setJumpPressed] = useState(false);

  const scoreRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const leftPtrsRef = useRef(new Set<number>());
  const rightPtrsRef = useRef(new Set<number>());
  const jumpPtrsRef = useRef(new Set<number>());

  // Track the last intentional direction so it persists after input release
  useEffect(() => {
    if (kbKeys.a || pointerLeft) setWalkDir('left');
    else if (kbKeys.d || pointerRight) setWalkDir('right');
  }, [kbKeys.a, kbKeys.d, pointerLeft, pointerRight]);

  const mergedKeys = useMemo<KeyState>(() => {
    const userLeft = kbKeys.a || pointerLeft;
    const userRight = kbKeys.d || pointerRight;
    return {
      ...kbKeys,
      a: userLeft || (autoWalking && walkDir === 'left' && !userRight),
      d: userRight || (autoWalking && walkDir === 'right' && !userLeft),
      space: kbKeys.space || jumpPressed,
    };
  }, [kbKeys, pointerLeft, pointerRight, jumpPressed, autoWalking, walkDir]);

  const clearIntervals = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startIntervals = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
  }, []);

  const spawnElephant = useCallback(() => {
    setElephants((prev) => {
      if (prev.length >= MAX_ELEPHANTS) return prev;
      const id = nextElephantId.current++;
      const bodyRef = { current: null } as { current: RapierRigidBody | null };
      const side = Math.random() > 0.5 ? 1 : -1;
      const spawnX = playerPositionRef.current.x + side * 14;
      elephantBodyRefsRef.current.set(id, bodyRef);
      return [...prev, { id, spawnX, bodyRef }];
    });
  }, []);

  // Maintain target elephant count: 1 until score >= 5, then 2
  useEffect(() => {
    if (!autoWalking || gameOver) return;
    const target = score >= 10 ? 3 : 1;
    const needed = target - elephants.length;
    for (let i = 0; i < needed; i++) {
      spawnElephant();
    }
  }, [elephants.length, score, autoWalking, gameOver, spawnElephant]);

  // Trigger game over when time or HP reaches zero
  useEffect(() => {
    if (!autoWalking || gameOver) return;
    if (timeLeft === 0 || hp === 0) {
      setGameOver(true);
      clearIntervals();
    }
  }, [timeLeft, hp, autoWalking, gameOver, clearIntervals]);

  useEffect(() => {
    return () => clearIntervals();
  }, [clearIntervals]);

  const handleLoadingDismiss = useCallback(() => {
    setGameLoading(false);
    setShowInstructions(true);
  }, []);

  const startGame = useCallback(() => {
    setShowInstructions(false);
    setAutoWalking(true);
    startIntervals();
  }, [startIntervals]);

  const handleRetry = useCallback(() => {
    clearIntervals();
    elephantBodyRefsRef.current.clear();
    nextElephantId.current = 0;

    // Reset player to start position
    if (playerBodyRef.current) {
      playerBodyRef.current.setTranslation({ x: 0, y: 0.9, z: 0 }, true);
      playerBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    scoreRef.current = 0;
    setHp(3);
    setScore(0);
    setTimeLeft(30);
    setElephants([]);
    setGameOver(false);
    setWalkDir('right');
    setAutoWalking(true);
    setGameKey((k) => k + 1);
    startIntervals();
  }, [clearIntervals, startIntervals]);

  const handleHit = useCallback(() => {
    setHp((prev) => Math.max(0, prev - 1));
  }, []);

  const handleStomp = useCallback((id: number) => {
    elephantBodyRefsRef.current.delete(id);
    setElephants((prev) => prev.filter((e) => e.id !== id));
    scoreRef.current += 1;
    setScore(scoreRef.current);
  }, []);

  const handleMoveDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.clientX < window.innerWidth / 2)
        leftPtrsRef.current.add(e.pointerId);
      else rightPtrsRef.current.add(e.pointerId);
      setPointerLeft(leftPtrsRef.current.size > 0);
      setPointerRight(rightPtrsRef.current.size > 0);
    },
    [],
  );

  const handleMoveUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    leftPtrsRef.current.delete(e.pointerId);
    rightPtrsRef.current.delete(e.pointerId);
    setPointerLeft(leftPtrsRef.current.size > 0);
    setPointerRight(rightPtrsRef.current.size > 0);
  }, []);

  const handleJumpDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      jumpPtrsRef.current.add(e.pointerId);
      setJumpPressed(true);
    },
    [],
  );

  const handleJumpUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      jumpPtrsRef.current.delete(e.pointerId);
      setJumpPressed(jumpPtrsRef.current.size > 0);
    },
    [],
  );

  const gameReady = !gameLoading && !showInstructions;

  return (
    <div className="fixed inset-0 bg-zinc-900">
      {/* 3D scene — same world setup as SME Live */}
      <Canvas
        shadows={ENVIRONMENT_DEFAULTS.enableShadows}
        camera={{
          position: ENVIRONMENT_DEFAULTS.camera.position,
          fov: ENVIRONMENT_DEFAULTS.camera.fov,
        }}
      >
        <ambientLight intensity={ENVIRONMENT_DEFAULTS.ambientLight.intensity} />
        <directionalLight
          position={ENVIRONMENT_DEFAULTS.directionalLight.position}
          intensity={ENVIRONMENT_DEFAULTS.directionalLight.intensity}
        />
        {/* 1.5× gravity (faster fall) + custom jump velocity that clears elephant height */}
        <Physics gravity={[0, -14.715, 0]}>
          <Player
            keys={mergedKeys}
            playerPositionRef={playerPositionRef}
            bodyRef={playerBodyRef}
            jumpVelocity={7.7}
          />
          {elephants.map((entry) => (
            <Elephant
              key={entry.id}
              initialPosition={[entry.spawnX, 0.9, 0]}
              playerPositionRef={playerPositionRef}
              isStationary={false}
              bodyRef={entry.bodyRef}
              animationIndex={1}
              modelScale={SHARED_DEFAULTS.SCALE * 0.8}
            />
          ))}
          <World playerPositionRef={playerPositionRef} />
        </Physics>
        <CollisionChecker
          key={gameKey}
          active={autoWalking && !gameOver}
          playerBodyRef={playerBodyRef}
          elephantBodyRefsRef={elephantBodyRefsRef}
          onHit={handleHit}
          onStomp={handleStomp}
        />
      </Canvas>

      {/* HP bar — top left: 3 red blocks */}
      <div className="fixed top-4 left-4 flex gap-2 z-20 pointer-events-none">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded ${i < hp ? 'bg-red-500' : 'bg-zinc-600'}`}
          />
        ))}
      </div>

      {/* Scoreboard — top right */}
      <div className="fixed top-4 right-4 bg-zinc-800/90 rounded-xl px-6 py-4 flex flex-col items-end gap-1 shadow-xl z-20 pointer-events-none">
        <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">
          Score
        </p>
        <p className="text-white text-4xl font-bold tabular-nums">{score}</p>
        <div className="w-full h-px bg-zinc-600 my-1" />
        <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">
          Time
        </p>
        <p
          className={`text-4xl font-bold tabular-nums ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}
        >
          {timeLeft}s
        </p>
      </div>

      {/* Transparent overlay — captures left/right screen taps for movement */}
      {gameReady && !gameOver && (
        <div
          className="fixed inset-0 z-10 select-none touch-none"
          onPointerDown={handleMoveDown}
          onPointerUp={handleMoveUp}
          onPointerCancel={handleMoveUp}
        />
      )}

      {/* Jump button — bottom right.
          Shown during instructions too (z-50, no pointer events) so users see
          the real button instead of a mock in the instructions layout. */}
      {!gameLoading && !gameOver && (
        <button
          className={`fixed bottom-16 right-8 w-20 h-20 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center text-white text-3xl font-bold select-none transition-colors touch-none ${showInstructions ? 'z-50 pointer-events-none' : 'z-30 active:bg-white/30'}`}
          onPointerDown={showInstructions ? undefined : handleJumpDown}
          onPointerUp={showInstructions ? undefined : handleJumpUp}
          onPointerCancel={showInstructions ? undefined : handleJumpUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          ↑
        </button>
      )}

      {/* Back to Menu — bottom left */}
      {!gameOver && (
        <button
          onClick={onBack}
          className="fixed bottom-6 left-6 z-20 bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors"
        >
          ← Menu
        </button>
      )}

      {/* Instructions overlay — full screen, shown after loading */}
      {showInstructions && (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/95 flex flex-col items-center justify-center gap-10 cursor-pointer select-none"
          onClick={startGame}
        >
          <h2 className="text-white text-4xl font-bold tracking-wide">
            How to Play
          </h2>
          <div className="flex gap-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-zinc-700 border-2 border-zinc-500 flex items-center justify-center text-4xl">
                ←
              </div>
              <p className="text-white text-base font-semibold">
                Touch Left Side
              </p>
              <p className="text-zinc-400 text-sm">Move Left</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-zinc-700 border-2 border-zinc-500 flex items-center justify-center text-4xl">
                →
              </div>
              <p className="text-white text-base font-semibold">
                Touch Right Side
              </p>
              <p className="text-zinc-400 text-sm">Move Right</p>
            </div>
          </div>
          <p className="text-zinc-400 text-base">
            Tap the{' '}
            <span className="text-white font-semibold">↑ jump button</span> in
            the bottom-right corner to jump
          </p>
          <p className="text-zinc-300 text-xl mt-2 animate-pulse">
            Click on the screen to get started
          </p>
        </div>
      )}

      {/* Game Over overlay */}
      {gameOver && (
        <div className="fixed inset-0 z-40 bg-zinc-900/95 flex flex-col items-center justify-center gap-8">
          <h2 className="text-white text-6xl font-bold tracking-wide">
            Game Over
          </h2>
          <p className="text-zinc-300 text-2xl">
            Score:{' '}
            <span className="text-amber-300 font-bold text-4xl">{score}</span>
          </p>
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleRetry}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-3 px-10 rounded-lg text-lg transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onBack}
              className="bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 text-white font-bold py-3 px-10 rounded-lg text-lg transition-colors"
            >
              Main Menu
            </button>
          </div>
        </div>
      )}

      <GameLoadingOverlay
        show={gameLoading}
        loadId={1}
        onDismiss={handleLoadingDismiss}
      />
    </div>
  );
}
