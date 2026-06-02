import {
  RigidBody,
  CuboidCollider,
  interactionGroups,
} from '@react-three/rapier';
import { ENVIRONMENT_DEFAULTS } from '@/app/constants';

export { BrownPlatform };

// Group 4 matches the player's solid-body collision group
const PLATFORM_GROUPS = interactionGroups([4], [4, 5]);

interface BrownPlatformProps {
  x: number;
}

function BrownPlatform({ x }: BrownPlatformProps) {
  const { width, height, depth, y, color } = ENVIRONMENT_DEFAULTS.platform;
  return (
    <RigidBody type="fixed" position={[x, y, 0]}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <CuboidCollider
        args={[width / 2, height / 2, depth / 2]}
        collisionGroups={PLATFORM_GROUPS}
      />
    </RigidBody>
  );
}
