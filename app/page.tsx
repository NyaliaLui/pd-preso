import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Player } from '@/app/components/Player/Player';
import { Barbarian } from '@/app/components/Barbarian/Barbarian';
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
import type { ClientPlayerState } from '@/app/ai/sharedTypes';

/** Initial spawn positions — spread along Z so barbarians don't overlap. */
function createInitialBarbarians(): Record<string, [number, number, number]> {
  const barbarians: Record<string, [number, number, number]> = {};
  const count = GAME_DEFAULTS.INITIAL_BARBARIAN_COUNT;
  for (let i = 0; i < count; i++) {
    const z = (i - (count - 1) / 2) * 3;
    barbarians[`barbarian-${i}`] = [3, 0.9, z];
  }
  return barbarians;
}

export default function Home() {
  const { settings, updateSettings } = useDebugSettings();
  const { keys, updateKey } = useKeyboardControls();
  const [barbarians] = useState<Record<string, [number, number, number]>>(
    createInitialBarbarians,
  );
  const [playerHP, setPlayerHP] = useState(GAME_DEFAULTS.PLAYER_MAX_HP);
  const [score] = useState(0);
  const [debugGuiHidden, setDebugGuiHidden] = useState(true);
  const level = Math.floor(score / 10) + 1;
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

  const playerPositionRef = useRef(new THREE.Vector3());
  const playerStateRef = useRef<ClientPlayerState | null>(null);

  const handlePlayerHit = useCallback(() => {
    setPlayerHP((prevHP) => Math.max(0, prevHP - 10));
  }, []);

  const handleBoulderRegister = useCallback(
    (id: string, mesh: THREE.Object3D) => {
      void id;
      void mesh;
    },
    [],
  );

  const handleBoulderUnregister = useCallback((id: string) => {
    void id;
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
        id={id}
        initialPosition={initialPosition}
        playerPositionRef={playerPositionRef}
      />
    ));
  }, [barbarians]);

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
