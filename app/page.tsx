import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RapierRigidBody } from '@react-three/rapier';
import { useProgress } from '@react-three/drei';
import { Player } from '@/app/components/Player/Player';
import { Elephant } from '@/app/components/Enemy/Elephant';
import { World } from '@/app/components/World/World';
import { OrientationGuard } from '@/app/components/OrientationGuard';
import { useKeyboardControls } from '@/app/components/Player/hooks/useKeyboardControls';
import { GameOver } from '@/app/components/GameOver';
import { LevelAnnouncement } from '@/app/components/LevelAnnouncement';
import { QuestionPrompt, type Question } from '@/app/components/QuestionPrompt';
import { LoadingNotification } from '@/app/components/LoadingNotification';
import { DraggableIcons } from '@/app/components/DraggableIcons';
import * as THREE from 'three';
import {
  ENVIRONMENT_DEFAULTS,
  GAME_DEFAULTS,
  ELEPHANT_DEFAULTS,
} from '@/app/constants';

// Fixed world positions for hit detection projection
const KNIGHT_WORLD_POS = new THREE.Vector3(
  5,
  0.9 + ELEPHANT_DEFAULTS.MOUNT_OFFSET,
  0,
);
const ELEPHANT_WORLD_POS = new THREE.Vector3(5, 0.9, 0);

// Projects world positions to canvas-pixel screen coords each frame
function PositionTracker({
  knightScreenRef,
  elephantScreenRef,
}: {
  knightScreenRef: React.MutableRefObject<{ x: number; y: number }>;
  elephantScreenRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const { camera, size } = useThree();
  const kv = useRef(KNIGHT_WORLD_POS.clone());
  const ev = useRef(ELEPHANT_WORLD_POS.clone());
  useFrame(() => {
    kv.current.copy(KNIGHT_WORLD_POS).project(camera);
    ev.current.copy(ELEPHANT_WORLD_POS).project(camera);
    knightScreenRef.current = {
      x: (kv.current.x * 0.5 + 0.5) * size.width,
      y: (-kv.current.y * 0.5 + 0.5) * size.height,
    };
    elephantScreenRef.current = {
      x: (ev.current.x * 0.5 + 0.5) * size.width,
      y: (-ev.current.y * 0.5 + 0.5) * size.height,
    };
  });
  return null;
}

const KNIGHT_QUESTIONS: Question[] = [
  {
    text: 'What does the Knight represent in professional development?',
    options: ['A growing learner', 'A team leader', 'A subject matter expert'],
    correctIndex: 2,
  },
  {
    text: 'How does the Knight best sharpen her skills?',
    options: [
      'Waiting for opportunity',
      'Continuous training and practice',
      'Attending one workshop',
    ],
    correctIndex: 1,
  },
  {
    text: "What does the Knight's armor symbolize?",
    options: [
      'Resistance to feedback',
      'Accumulated knowledge and experience',
      'A high salary',
    ],
    correctIndex: 1,
  },
];

const ELEPHANT_QUESTIONS: Question[] = [
  {
    text: 'What trait makes the Elephant a powerful team asset?',
    options: [
      'Its size and strength',
      'Its long memory and wisdom',
      'Its speed',
    ],
    correctIndex: 1,
  },
  {
    text: 'An "elephant in the room" refers to...',
    options: [
      'A large, complex project',
      'An avoided but important problem',
      'A dominating team member',
    ],
    correctIndex: 1,
  },
  {
    text: 'What does the Elephant carrying the Knight symbolize?',
    options: [
      'Burden of leadership',
      'Institutional knowledge supporting the learner',
      'A game mechanic',
    ],
    correctIndex: 1,
  },
];

export default function Home() {
  const { keys } = useKeyboardControls();
  const [playerHP, setPlayerHP] = useState(GAME_DEFAULTS.PLAYER_MAX_HP);
  const [score] = useState(0);
  const level = Math.floor(score / 10) + 1;
  const playerPositionRef = useRef(new THREE.Vector3());
  const elephantBodyRef = useRef<RapierRigidBody | null>(null);

  const [showLoading, setShowLoading] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [questionTarget, setQuestionTarget] = useState<'knight' | 'elephant'>(
    'knight',
  );
  const [shake, setShake] = useState(false);

  const knightScreenRef = useRef({ x: 0, y: 0 });
  const elephantScreenRef = useRef({ x: 0, y: 0 });
  const loadedFiredRef = useRef(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { active, progress } = useProgress();
  useEffect(() => {
    if (!active && progress === 100 && !loadedFiredRef.current) {
      loadedFiredRef.current = true;
      setTimeout(() => setShowLoading(true), 500);
    }
  }, [active, progress]);

  const handlePlayerHit = useCallback(() => {
    setPlayerHP((prev) => Math.max(0, prev - 10));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const iconId = e.dataTransfer.getData('iconId');
    if (!iconId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const dropY = e.clientY - rect.top;

    const kd = Math.hypot(
      dropX - knightScreenRef.current.x,
      dropY - knightScreenRef.current.y,
    );
    const ed = Math.hypot(
      dropX - elephantScreenRef.current.x,
      dropY - elephantScreenRef.current.y,
    );
    const HIT_RADIUS = 200;
    if (Math.min(kd, ed) > HIT_RADIUS) return;

    const target = kd <= ed ? 'knight' : 'elephant';

    if (iconId === 'speech') {
      setQuestionTarget(target);
      setShowQuestion(true);
    } else {
      navigator.vibrate?.(300);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      setShake(true);
      shakeTimerRef.current = setTimeout(() => setShake(false), 600);
    }
  }, []);

  return (
    <div
      className="flex h-screen w-full bg-zinc-900"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
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
        <Physics gravity={[0, -9.81, 0]}>
          <Elephant
            initialPosition={[5, 0.9, 0]}
            playerPositionRef={playerPositionRef}
            isStationary={true}
            bodyRef={elephantBodyRef}
            shake={shake}
          />
          <Player
            keys={keys}
            onHit={handlePlayerHit}
            playerPositionRef={playerPositionRef}
            mountRef={elephantBodyRef}
            shake={shake}
          />
          <World playerPositionRef={playerPositionRef} />
        </Physics>
        <PositionTracker
          knightScreenRef={knightScreenRef}
          elephantScreenRef={elephantScreenRef}
        />
      </Canvas>
      <LoadingNotification show={showLoading} />
      <LevelAnnouncement level={level} />
      <GameOver show={playerHP <= 0} />
      <QuestionPrompt
        show={showQuestion}
        questions={
          questionTarget === 'knight' ? KNIGHT_QUESTIONS : ELEPHANT_QUESTIONS
        }
        onClose={() => setShowQuestion(false)}
      />
      <DraggableIcons onAnyDragStart={() => setShowLoading(false)} />
      <OrientationGuard />
    </div>
  );
}
