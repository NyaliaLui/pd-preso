import type { Texture } from 'three';
import {
  RigidBody,
  CuboidCollider,
  interactionGroups,
} from '@react-three/rapier';
import { ENVIRONMENT_DEFAULTS } from '@/app/constants';

export { GrassPillar };

// Group 4 matches the player's solid-body collision group
const PILLAR_GROUPS = interactionGroups([4], [4, 5]);

interface GrassPillarProps {
  x: number;
  texture: Texture;
  count?: number;
}

function GrassPillar({ x, texture, count = 3 }: GrassPillarProps) {
  const { width, height, depth } = ENVIRONMENT_DEFAULTS.groundBlock;
  return (
    <RigidBody type="fixed" position={[x, 0, 0]}>
      {Array.from({ length: count }, (_, i) => {
        const blockY = height / 2 + i * height;
        return (
          <group key={i} position={[0, blockY, 0]}>
            <mesh receiveShadow castShadow>
              <boxGeometry args={[width, height, depth]} />
              <meshStandardMaterial map={texture} />
            </mesh>
            <CuboidCollider
              args={[width / 2, height / 2, depth / 2]}
              collisionGroups={PILLAR_GROUPS}
            />
          </group>
        );
      })}
    </RigidBody>
  );
}
