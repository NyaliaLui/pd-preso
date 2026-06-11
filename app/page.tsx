import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { Physics, RapierRigidBody } from '@react-three/rapier';
import { useProgress } from '@react-three/drei';
import { FBXLoader } from 'three-stdlib';
import { Player } from '@/app/components/Player/Player';
import { Elephant } from '@/app/components/Enemy/Elephant';
import { World } from '@/app/components/World/World';
import { OrientationGuard } from '@/app/components/OrientationGuard';
import { useKeyboardControls } from '@/app/components/Player/hooks/useKeyboardControls';
import { GameOver } from '@/app/components/GameOver';
import { QuestionPrompt, type Question } from '@/app/components/QuestionPrompt';
import { LoadingNotification } from '@/app/components/LoadingNotification';
import {
  DraggableIcons,
  ICON_TO_AMENITY,
  AMENITY_TO_ICON,
  type DragIconId,
} from '@/app/components/DraggableIcons';
import { MainMenu } from '@/app/components/MainMenu';
import { MiniGame } from '@/app/components/MiniGame';
import { StoryDisplay } from '@/app/components/StoryDisplay';
import { TripSuccessPopup } from '@/app/components/TripSuccessPopup';
import { AiSuccessPopup } from '@/app/components/AiSuccessPopup';
import { GameLoadingOverlay } from '@/app/components/GameLoadingOverlay';
import { STORIES, type Story } from '@/app/data/storyBank';
import * as THREE from 'three';
import {
  ENVIRONMENT_DEFAULTS,
  GAME_DEFAULTS,
  ELEPHANT_DEFAULTS,
  PLAYER_DEFAULTS,
} from '@/app/constants';

// Pre-warm the loader cache as early as possible so assets start downloading
// before the user even reaches the Start button.
useLoader.preload(FBXLoader, PLAYER_DEFAULTS.MODELS.IDLE);
useLoader.preload(FBXLoader, PLAYER_DEFAULTS.MODELS.WALK);
useLoader.preload(FBXLoader, PLAYER_DEFAULTS.MODELS.SWAY);
useLoader.preload(FBXLoader, PLAYER_DEFAULTS.MODELS.JUMP);
useLoader.preload(FBXLoader, PLAYER_DEFAULTS.MODELS.SIT);
useLoader.preload(FBXLoader, ELEPHANT_DEFAULTS.MODEL);
useLoader.preload(THREE.TextureLoader, PLAYER_DEFAULTS.TEXTURES.COLOR);
useLoader.preload(THREE.TextureLoader, PLAYER_DEFAULTS.TEXTURES.METALLIC);
useLoader.preload(THREE.TextureLoader, PLAYER_DEFAULTS.TEXTURES.NORMAL);
useLoader.preload(THREE.TextureLoader, PLAYER_DEFAULTS.TEXTURES.ROUGHNESS);
useLoader.preload(THREE.TextureLoader, ELEPHANT_DEFAULTS.TEXTURES.COLOR);
useLoader.preload(THREE.TextureLoader, ELEPHANT_DEFAULTS.TEXTURES.METALLIC);
useLoader.preload(THREE.TextureLoader, ELEPHANT_DEFAULTS.TEXTURES.NORMAL);
useLoader.preload(THREE.TextureLoader, ELEPHANT_DEFAULTS.TEXTURES.ROUGHNESS);
useLoader.preload(THREE.TextureLoader, ELEPHANT_DEFAULTS.TEXTURES.EMISSION);
useLoader.preload(THREE.TextureLoader, ENVIRONMENT_DEFAULTS.texture.ground);
useLoader.preload(THREE.TextureLoader, ENVIRONMENT_DEFAULTS.texture.sky);

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
  const [screen, setScreen] = useState<
    'menu' | 'sme-live' | 'ai' | 'mini-game'
  >('menu');
  const [playerHP, setPlayerHP] = useState(GAME_DEFAULTS.PLAYER_MAX_HP);
  const playerPositionRef = useRef(new THREE.Vector3());
  const elephantBodyRef = useRef<RapierRigidBody | null>(null);

  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showStory, setShowStory] = useState(false);
  const [collectedAmenities, setCollectedAmenities] = useState<Set<string>>(
    new Set(),
  );
  const [showTripSuccess, setShowTripSuccess] = useState(false);
  const [aiSuggestedAmenities, setAiSuggestedAmenities] = useState<string[]>(
    [],
  );
  const [aiCollected, setAiCollected] = useState<Set<string>>(new Set());
  const [showAiSuccess, setShowAiSuccess] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [gameLoading, setGameLoading] = useState(false);
  const [loadId, setLoadId] = useState(0);
  // 'none' | 'trip' | 'ai' — which popup to show after the walk-off completes
  const [walkOff, setWalkOff] = useState<'none' | 'trip' | 'ai'>('none');
  const [showQuestion, setShowQuestion] = useState(false);
  const [questionTarget, setQuestionTarget] = useState<'knight' | 'elephant'>(
    'knight',
  );
  const [shake, setShake] = useState(false);

  const knightScreenRef = useRef({ x: 0, y: 0 });
  const elephantScreenRef = useRef({ x: 0, y: 0 });
  const loadedFiredRef = useRef(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { active, progress } = useProgress();
  useEffect(() => {
    if (!active && progress === 100 && !loadedFiredRef.current) {
      loadedFiredRef.current = true;
      setTimeout(() => setShowLoading(true), 500);
    }
    // loadId in deps forces this effect to re-evaluate on each new play even
    // when active/progress haven't changed (cached assets scenario).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, progress, loadId]);

  const handlePlayerHit = useCallback(() => {
    setPlayerHP((prev) => Math.max(0, prev - 10));
  }, []);

  const startGame = useCallback(() => {
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }
    setSelectedStory(STORIES[Math.floor(Math.random() * STORIES.length)]);
    setCollectedAmenities(new Set());
    setShowTripSuccess(false);
    setAiSuggestedAmenities([]);
    setAiCollected(new Set());
    setShowAiSuccess(false);
    setShowStory(false);
    setWalkOff('none');
    loadedFiredRef.current = false;
    setGameLoading(true);
    setLoadId((id) => id + 1);
    setScreen('sme-live');
  }, []);

  const enterAiState = useCallback(() => {
    if (!selectedStory) return;
    // Reset elephant and camera to initial position for the AI round
    if (elephantBodyRef.current) {
      elephantBodyRef.current.setTranslation({ x: 5, y: 0.9, z: 0 }, true);
      elephantBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    playerPositionRef.current.set(5, 0.9, 0);
    // Show AI state instructions
    setShowLoading(true);
    const ALL_AMENITIES = [
      'steakhouse',
      'buffet',
      'show tickets',
      'hotel rooms',
      'golf',
      'spa',
      'slot machine',
      'cards',
    ];
    const available = ALL_AMENITIES.filter(
      (a) => !selectedStory.amenities.includes(a),
    );
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    setAiSuggestedAmenities(available.slice(0, 2));
    setAiCollected(new Set());
    setShowTripSuccess(false);
    setScreen('ai');
  }, [selectedStory]);

  const handleGameLoadingDismiss = useCallback(() => setGameLoading(false), []);

  const handleMainMenu = useCallback(() => {
    setScreen('menu');
    setSelectedStory(null);
    setCollectedAmenities(new Set());
    setShowTripSuccess(false);
    setAiSuggestedAmenities([]);
    setAiCollected(new Set());
    setShowAiSuccess(false);
    setShowStory(false);
  }, []);

  const handleIconDrop = useCallback(
    (iconId: string, clientX: number, clientY: number) => {
      // Telephone always shows the story regardless of drop position
      if (iconId === 'telephone') setShowStory(true);

      const kd = Math.hypot(
        clientX - knightScreenRef.current.x,
        clientY - knightScreenRef.current.y,
      );
      const ed = Math.hypot(
        clientX - elephantScreenRef.current.x,
        clientY - elephantScreenRef.current.y,
      );
      const HIT_RADIUS = 200;
      if (Math.min(kd, ed) > HIT_RADIUS) return;

      const amenityName = ICON_TO_AMENITY[iconId as DragIconId];
      if (!amenityName || !selectedStory) return;

      if (screen === 'sme-live') {
        if (selectedStory.amenities.includes(amenityName)) {
          // Cancel any ongoing shake so correct drops never vibrate the models
          if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
          setShake(false);
          setCollectedAmenities((prev) => {
            const next = new Set(prev);
            next.add(amenityName);
            return next;
          });
        } else {
          if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
          setShake(true);
          shakeTimerRef.current = setTimeout(() => setShake(false), 600);
        }
      } else if (screen === 'ai') {
        if (
          selectedStory.amenities.includes(amenityName) ||
          aiSuggestedAmenities.includes(amenityName)
        ) {
          setAiCollected((prev) => {
            const next = new Set(prev);
            next.add(amenityName);
            return next;
          });
        } else {
          if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
          setShake(true);
          shakeTimerRef.current = setTimeout(() => setShake(false), 600);
        }
      }
    },
    [screen, selectedStory, aiSuggestedAmenities],
  );

  // SME Live win → elephant walks off, then show TripSuccessPopup after 1s
  useEffect(() => {
    if (
      screen !== 'sme-live' ||
      !selectedStory ||
      walkOff !== 'none' ||
      showTripSuccess ||
      popupTimeoutRef.current
    )
      return;
    if (
      collectedAmenities.size > 0 &&
      selectedStory.amenities.every((a) => collectedAmenities.has(a))
    ) {
      setWalkOff('trip');
      // Store in ref so React's cleanup on re-render does NOT cancel it
      popupTimeoutRef.current = setTimeout(() => {
        popupTimeoutRef.current = null;
        setShowTripSuccess(true);
        setWalkOff('none');
      }, 1000);
    }
  }, [collectedAmenities, screen, selectedStory, walkOff, showTripSuccess]);

  // AI win → elephant walks off, then show AiSuccessPopup after 1s
  useEffect(() => {
    if (
      screen !== 'ai' ||
      !selectedStory ||
      walkOff !== 'none' ||
      showAiSuccess ||
      popupTimeoutRef.current
    )
      return;
    if (aiCollected.size > 0) {
      const hasAllStory = selectedStory.amenities.every((a) =>
        aiCollected.has(a),
      );
      const hasSuggested = aiSuggestedAmenities.some((a) => aiCollected.has(a));
      if (hasAllStory && hasSuggested) {
        setWalkOff('ai');
        popupTimeoutRef.current = setTimeout(() => {
          popupTimeoutRef.current = null;
          setShowAiSuccess(true);
          setWalkOff('none');
        }, 1000);
      }
    }
  }, [
    aiCollected,
    screen,
    selectedStory,
    aiSuggestedAmenities,
    walkOff,
    showAiSuccess,
  ]);

  const iconHighlights = useMemo((): Partial<
    Record<DragIconId, 'green' | 'purple'>
  > => {
    if (screen !== 'ai' || !selectedStory) return {};
    const result: Partial<Record<DragIconId, 'green' | 'purple'>> = {};
    selectedStory.amenities.forEach((a) => {
      const id = AMENITY_TO_ICON[a];
      if (id) result[id] = 'green';
    });
    aiSuggestedAmenities.forEach((a) => {
      const id = AMENITY_TO_ICON[a];
      if (id) result[id] = 'purple';
    });
    return result;
  }, [screen, selectedStory, aiSuggestedAmenities]);

  if (screen === 'menu') {
    return (
      <div className="flex h-screen w-full bg-zinc-900">
        <MainMenu
          onStart={startGame}
          onCheatCode={() => setScreen('mini-game')}
        />
        <OrientationGuard />
      </div>
    );
  }

  if (screen === 'mini-game') {
    return (
      <div className="flex h-screen w-full bg-zinc-900">
        <MiniGame onBack={() => setScreen('menu')} />
        <OrientationGuard />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-900">
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
            isStationary={walkOff === 'none'}
            bodyRef={elephantBodyRef}
            shake={shake}
            walkingOff={walkOff !== 'none'}
            animationIndex={walkOff !== 'none' ? 1 : 0}
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
      <GameLoadingOverlay
        show={gameLoading}
        loadId={loadId}
        onDismiss={handleGameLoadingDismiss}
      />
      <LoadingNotification
        show={showLoading}
        text={
          screen === 'ai'
            ? 'With AI, the winning combination is in green and suggestions are in purple.'
            : undefined
        }
      />
      <GameOver show={playerHP <= 0} />
      <QuestionPrompt
        show={showQuestion}
        questions={
          questionTarget === 'knight' ? KNIGHT_QUESTIONS : ELEPHANT_QUESTIONS
        }
        onClose={() => setShowQuestion(false)}
      />
      {selectedStory && (
        <StoryDisplay
          show={showStory}
          sentence={selectedStory.sentence}
          amenities={selectedStory.amenities}
          onClose={() => setShowStory(false)}
        />
      )}
      <TripSuccessPopup show={showTripSuccess} onNext={enterAiState} />
      <AiSuccessPopup show={showAiSuccess} onMainMenu={handleMainMenu} />
      <DraggableIcons
        onAnyDragStart={() => setShowLoading(false)}
        onDrop={handleIconDrop}
        highlights={iconHighlights}
      />
      <OrientationGuard />
    </div>
  );
}
