import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import {
  RigidBody,
  CuboidCollider,
  interactionGroups,
} from '@react-three/rapier';
import { SHARED_DEFAULTS } from '@/app/constants';

export { Boulder };

// Group 4 = solid physical collision only.
// Does NOT intersect groups 0/1/2/3 (damage sensors), so boulders never deal damage.
const BOULDER_GROUPS = interactionGroups([4], [4, 5]);

interface BoulderProps {
  x: number;
  id: string;
  onRegister?: (id: string, mesh: THREE.Object3D) => void;
  onUnregister?: (id: string) => void;
}

function Boulder({ x, id, onRegister, onUnregister }: BoulderProps) {
  const { halfHeight, radius } = SHARED_DEFAULTS.COLLIDERS.BODY;
  const boulderHalfHeight = halfHeight + radius; // 0.9 â€” same total height as Paladin
  const boulderHalfWidth = radius * 2; // 1.0 â€” twice the Paladin's diameter

  // Invisible box mesh used as the sword-raycast target.
  // BoxGeometry gives gap-free coverage; the low-poly icosahedron has gaps the ray slips through.
  // THREE.js raycaster intersects visible=false meshes â€” this does not affect rendering.
  const raycastBoxRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!raycastBoxRef.current) return;
    raycastBoxRef.current.userData.boulderId = id;
    onRegister?.(id, raycastBoxRef.current);
    return () => onUnregister?.(id);
  }, [id, onRegister, onUnregister]);

  return (
    <RigidBody type="fixed" position={[x, boulderHalfHeight * 0.4, 0]}>
      <mesh
        castShadow
        receiveShadow
        scale={[1, boulderHalfHeight / boulderHalfWidth, 1]}
      >
        <icosahedronGeometry args={[boulderHalfWidth, 1]} />
        <meshStandardMaterial color="#778899" flatShading />
      </mesh>
      {/* Invisible box â€” exact collider dimensions â€” used only for sword raycast */}
      <mesh ref={raycastBoxRef} visible={false}>
        <boxGeometry
          args={[
            boulderHalfWidth * 2,
            boulderHalfHeight * 2,
            boulderHalfWidth * 2,
          ]}
        />
        <meshBasicMaterial />
      </mesh>
      <CuboidCollider
        args={[boulderHalfWidth, boulderHalfHeight, boulderHalfWidth]}
        collisionGroups={BOULDER_GROUPS}
      />
    </RigidBody>
  );
}
