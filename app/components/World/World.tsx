/* eslint-disable react-hooks/immutability */
import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { RepeatWrapping } from 'three';
import * as THREE from 'three';

import {
  RigidBody,
  CuboidCollider,
  interactionGroups,
} from '@react-three/rapier';

import { ENVIRONMENT_DEFAULTS } from '@/app/constants';
import { GrassBlock } from '@/app/components/World/GrassBlock';
import { GrassPillar } from '@/app/components/World/GrassPillar';

export { World };

const FLOOR_GROUPS = interactionGroups([4], [4, 5]);

interface WorldProps {
  playerPositionRef: { current: THREE.Vector3 };
}

const { width, screenFillCount, extraCount } = ENVIRONMENT_DEFAULTS.groundBlock;
const INITIAL_LEFTMOST_X = -((screenFillCount - 1) / 2) * width;
const TOTAL_BLOCKS = screenFillCount + extraCount;
const INITIAL_BLOCK_POSITIONS = Array.from(
  { length: TOTAL_BLOCKS },
  (_, i) => INITIAL_LEFTMOST_X + i * width,
);

function World({ playerPositionRef }: WorldProps) {
  const grass = useTexture(ENVIRONMENT_DEFAULTS.texture.ground);
  grass.wrapS = grass.wrapT = RepeatWrapping;
  grass.repeat.set(2, 2);

  const sky = useTexture(ENVIRONMENT_DEFAULTS.texture.sky);
  const { scene, camera } = useThree();
  scene.background = sky;

  // Block positions in a ref so useFrame always reads fresh values
  const blockXPositionsRef = useRef<number[]>(INITIAL_BLOCK_POSITIONS);

  useFrame(() => {
    const playerX = playerPositionRef.current.x;
    camera.position.x = playerX;
  });

  return (
    <>
      {blockXPositionsRef.current.map((x) => (
        <GrassBlock key={x} x={x} texture={grass} />
      ))}
      <GrassPillar x={INITIAL_BLOCK_POSITIONS[0]} texture={grass} count={3} />
      <GrassPillar
        x={INITIAL_BLOCK_POSITIONS[INITIAL_BLOCK_POSITIONS.length - 1]}
        texture={grass}
        count={3}
      />
      {/* Invisible floor â€” 500-unit-wide solid collider, top surface at Y=0 */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <CuboidCollider args={[250, 0.5, 250]} collisionGroups={FLOOR_GROUPS} />
      </RigidBody>
    </>
  );
}
