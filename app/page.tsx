import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Player } from '@/app/components/Player/Player';
import { World } from '@/app/components/World/World';
import { OrientationGuard } from '@/app/components/OrientationGuard';
import { useKeyboardControls } from '@/app/components/Player/hooks/useKeyboardControls';
import { Controls } from '@/app/components/Player/Controls';
import { HealthBar } from '@/app/components/Player/HealthBar';
import { GameOver } from '@/app/components/GameOver';
import { ScoreDisplay } from '@/app/components/ScoreDisplay';
import { LevelAnnouncement } from '@/app/components/LevelAnnouncement';
import * as THREE from 'three';
import { ENVIRONMENT_DEFAULTS, GAME_DEFAULTS } from '@/app/constants';
import { useRef } from 'react';

export default function Home() {
  const { keys, updateKey } = useKeyboardControls();
  const [playerHP, setPlayerHP] = useState(GAME_DEFAULTS.PLAYER_MAX_HP);
  const [score] = useState(0);
  const level = Math.floor(score / 10) + 1;
  const playerPositionRef = useRef(new THREE.Vector3());

  const handlePlayerHit = useCallback(() => {
    setPlayerHP((prevHP) => Math.max(0, prevHP - 10));
  }, []);

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
          <Player
            keys={keys}
            onHit={handlePlayerHit}
            playerPositionRef={playerPositionRef}
          />
          <World playerPositionRef={playerPositionRef} />
        </Physics>
      </Canvas>
      <Controls updateKey={updateKey} />
      <HealthBar currentHP={playerHP} maxHP={GAME_DEFAULTS.PLAYER_MAX_HP} />
      <ScoreDisplay score={score} level={level} />
      <LevelAnnouncement level={level} />
      <GameOver show={playerHP <= 0} />
      <OrientationGuard />
    </div>
  );
}
