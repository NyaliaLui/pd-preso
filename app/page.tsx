import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Player } from '@/app/components/Player/Player';
import {
  Barbarian,
  BarbarianHandle,
} from '@/app/components/Barbarian/Barbarian';
import {
  World,
  INITIAL_PLATFORM_POSITIONS,
} from '@/app/components/World/World';
import { BoulderRewardPopup } from '@/app/components/BoulderRewardPopup';
import { OrientationGuard } from '@/app/components/OrientationGuard';
import { useKeyboardControls } from '@/app/components/Player/hooks/useKeyboardControls';
import { Controls } from '@/app/components/Player/Controls';
import { DebugGui } from '@/app/components/DebugGui';
import { HealthBar } from '@/app/components/Player/HealthBar';
import { GameOver } from '@/app/components/GameOver';
import { ScoreDisplay } from '@/app/components/ScoreDisplay';
import { LevelAnnouncement } from '@/app/components/LevelAnnouncement';
import { useDebugSettings } from '@/app/components/hooks/useDebugSettings';
import * as THREE from 'three';
import { ENVIRONMENT_DEFAULTS, GAME_DEFAULTS } from '@/app/constants';
import { Button } from 'flowbite-react';
import { BarbarianAIClient } from '@/app/ai/BarbarianAIClient';
import type {
  ClientPlayerState,
  ClientBarbarianState,
  BarbarianDecision,
} from '@/app/ai/sharedTypes';

const GRASS_LEFT_X =
  -((ENVIRONMENT_DEFAULTS.groundBlock.screenFillCount - 1) / 2) *
  ENVIRONMENT_DEFAULTS.groundBlock.width; // âˆ’10.8

const GRASS_TOTAL_BLOCKS =
  ENVIRONMENT_DEFAULTS.groundBlock.screenFillCount +
  ENVIRONMENT_DEFAULTS.groundBlock.extraCount; // 30

const GRASS_RIGHT_X =
  GRASS_LEFT_X +
  (GRASS_TOTAL_BLOCKS - 1) * ENVIRONMENT_DEFAULTS.groundBlock.width; // 145.8

/** Initial spawn position per barbarian â€” spread along Z so they don't overlap. */
function createInitialBarbarians(): Record<string, [number, number, number]> {
  const barbarians: Record<string, [number, number, number]> = {};
  const count = GAME_DEFAULTS.INITIAL_BARBARIAN_COUNT;
  for (let i = 0; i < count; i++) {
    const z = (i - (count - 1) / 2) * 3; // e.g. 1 barb â†’ z=0, 2 barbs â†’ z=Â±1.5
    barbarians[`barbarian-${i}`] = [3, 0.9, z];
  }
  return barbarians;
}

export default function Home() {
  const { settings, updateSettings } = useDebugSettings();
  const { keys, updateKey } = useKeyboardControls();
  const [barbarians, setBarbarians] = useState<
    Record<string, [number, number, number]>
  >(createInitialBarbarians);
  const [playerHP, setPlayerHP] = useState(GAME_DEFAULTS.PLAYER_MAX_HP);
  const [score, setScore] = useState(0);
  const [debugGuiHidden, setDebugGuiHidden] = useState(true);
  const level = Math.floor(score / 10) + 1;
  const targetBarbarianCount = Math.floor((level - 1) / 3) + 1;
  const barbarianGroupsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const barbarianRefsRef = useRef<Map<string, BarbarianHandle>>(new Map());
  const boulderTargetsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const [boulderHps, setBoulderHps] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      INITIAL_PLATFORM_POSITIONS.map((_, i) => [
        `boulder-${i}`,
        GAME_DEFAULTS.BOULDER_HP,
      ]),
    ),
  );
  const [showBoulderReward, setShowBoulderReward] = useState(false);
  const activeBoulderIds = useMemo(
    () => new Set(Object.keys(boulderHps)),
    [boulderHps],
  );

  // â”€â”€ Shared refs for AI client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const playerPositionRef = useRef(new THREE.Vector3());
  const playerStateRef = useRef<ClientPlayerState | null>(null);
  const playerHPRef = useRef<number>(GAME_DEFAULTS.PLAYER_MAX_HP);
  const barbarianStatesRef = useRef<Record<string, ClientBarbarianState>>({});
  const barbarianDecisionsRef = useRef<
    Record<string, BarbarianDecision | null>
  >({});
  const aiClientRef = useRef<BarbarianAIClient | null>(null);
  const targetBarbarianCountRef = useRef(1);

  // Keep playerHPRef in sync with React state
  useEffect(() => {
    playerHPRef.current = playerHP;
  }, [playerHP]);

  useEffect(() => {
    targetBarbarianCountRef.current = targetBarbarianCount;
  }, [targetBarbarianCount]);

  // Start the AI client once on mount, clean up on unmount
  useEffect(() => {
    const client = new BarbarianAIClient({
      serverUrl: import.meta.env.VITE_WS_URL ?? 'ws://localhost:8765',
      playerStateRef,
      playerHPRef,
      barbarianStatesRef,
      barbarianDecisionsRef,
      getEnvironment: () => ({
        worldBounds: {
          minX: GRASS_LEFT_X,
          maxX: GRASS_RIGHT_X,
          minZ: -5,
          maxZ: 5,
        },
        groundY: 0,
        targetBarbarianCount: targetBarbarianCountRef.current,
      }),
      onSpawn: (spawn) => {
        setBarbarians((prev) => ({
          ...prev,
          [spawn.barbarianId]: [
            spawn.spawnPosition.x,
            spawn.spawnPosition.y,
            spawn.spawnPosition.z,
          ],
        }));
      },
    });
    aiClientRef.current = client;
    return () => {
      client.disconnect();
      aiClientRef.current = null;
    };
  }, []);

  const handleBarbarianDeath = useCallback((id: string) => {
    setBarbarians((prevBarbarians) => {
      const newBarbarians = { ...prevBarbarians };
      delete newBarbarians[id];
      delete barbarianStatesRef.current[id];
      delete barbarianDecisionsRef.current[id];
      aiClientRef.current?.notifyBarbarianDied(
        id,
        Object.keys(newBarbarians).length,
      );
      return newBarbarians;
    });
    setScore((prev) => prev + 2);
  }, []);

  const handlePlayerHit = useCallback(() => {
    setPlayerHP((prevHP) => Math.max(0, prevHP - 10));
  }, []);

  const handleBarbarianRegister = useCallback(
    (id: string, model: THREE.Object3D) => {
      barbarianGroupsRef.current.set(id, model);
    },
    [],
  );

  const handleBarbarianUnregister = useCallback((id: string) => {
    barbarianGroupsRef.current.delete(id);
  }, []);

  const handleSwordHit = useCallback((barbarianId: string) => {
    barbarianRefsRef.current.get(barbarianId)?.takeDamage();
  }, []);

  const handleBoulderRegister = useCallback(
    (id: string, mesh: THREE.Object3D) => {
      boulderTargetsRef.current.set(id, mesh);
    },
    [],
  );

  const handleBoulderUnregister = useCallback((id: string) => {
    boulderTargetsRef.current.delete(id);
  }, []);

  const handleBoulderHit = useCallback((boulderId: string) => {
    setBoulderHps((prev) => {
      const hp = prev[boulderId];
      if (hp === undefined || hp <= 0) return prev;
      if (hp - 1 <= 0) {
        const { [boulderId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [boulderId]: hp - 1 };
    });
  }, []);

  const prevBoulderCountRef = useRef(INITIAL_PLATFORM_POSITIONS.length);
  useEffect(() => {
    const count = Object.keys(boulderHps).length;
    if (count < prevBoulderCountRef.current) setShowBoulderReward(true);
    prevBoulderCountRef.current = count;
  }, [boulderHps]);

  const barbarianComponents = useMemo(() => {
    return Object.entries(barbarians).map(([id, initialPosition]) => (
      <Barbarian
        key={id}
        ref={(handle) => {
          if (handle) {
            barbarianRefsRef.current.set(id, handle);
          } else {
            barbarianRefsRef.current.delete(id);
          }
        }}
        id={id}
        initialPosition={initialPosition}
        onDeath={handleBarbarianDeath}
        onRegister={handleBarbarianRegister}
        onUnregister={handleBarbarianUnregister}
        settings={settings}
        playerPositionRef={playerPositionRef}
        barbarianStatesRef={barbarianStatesRef}
        barbarianDecisionsRef={barbarianDecisionsRef}
      />
    ));
  }, [
    barbarians,
    handleBarbarianDeath,
    handleBarbarianRegister,
    handleBarbarianUnregister,
    settings,
  ]);

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
        <Physics gravity={[0, -9.81, 0]} debug={settings.debugMode}>
          {barbarianComponents}
          <Player
            keys={keys}
            onHit={handlePlayerHit}
            onSwordHit={handleSwordHit}
            barbarianTargets={barbarianGroupsRef}
            boulderTargets={boulderTargetsRef}
            onBoulderHit={handleBoulderHit}
            settings={settings}
            playerPositionRef={playerPositionRef}
            playerStateRef={playerStateRef}
          />
          <World
            playerPositionRef={playerPositionRef}
            onBoulderRegister={handleBoulderRegister}
            onBoulderUnregister={handleBoulderUnregister}
            activeBoulderIds={activeBoulderIds}
          />
        </Physics>
      </Canvas>
      <Controls updateKey={updateKey} />
      <Button
        onClick={() => setDebugGuiHidden((prev) => !prev)}
        color="gray"
        size="xs"
        className="absolute top-14 right-4"
      >
        Debug Settings
      </Button>
      <DebugGui
        settings={settings}
        onSettingsChange={updateSettings}
        hidden={debugGuiHidden}
      />
      <HealthBar currentHP={playerHP} maxHP={GAME_DEFAULTS.PLAYER_MAX_HP} />
      <ScoreDisplay score={score} level={level} />
      <LevelAnnouncement level={level} />
      <GameOver show={playerHP <= 0} />
      <BoulderRewardPopup
        show={showBoulderReward}
        onClose={() => setShowBoulderReward(false)}
      />
      <OrientationGuard />
    </div>
  );
}
