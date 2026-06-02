import type { Texture } from 'three';
import { ENVIRONMENT_DEFAULTS } from '@/app/constants';
import { CuboidCollider, interactionGroups } from '@react-three/rapier';

const GRASS_BLOCK_GROUPS = interactionGroups([4], [4, 5]);

export { GrassBlock };

interface GrassBlockProps {
  x: number;
  texture: Texture;
}

function GrassBlock({ x, texture }: GrassBlockProps) {
  const { width, height, depth } = ENVIRONMENT_DEFAULTS.groundBlock;
  return (
    <mesh position={[x, -height / 2, 0]} receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial map={texture} />
      <CuboidCollider
        args={[width / 2, height / 2, depth / 2]}
        collisionGroups={GRASS_BLOCK_GROUPS}
      />
    </mesh>
  );
}
