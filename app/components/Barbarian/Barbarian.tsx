import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import {
  RigidBody,
  RapierRigidBody,
  BallCollider,
  interactionGroups,
} from '@react-three/rapier';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

import { SHARED_DEFAULTS, BARBARIAN_DEFAULTS } from '@/app/constants';

const BARBARIAN_GROUND_GROUPS = interactionGroups([5], [4]);

interface BarbarianProps {
  id: string;
  initialPosition?: [number, number, number];
  playerPositionRef?: { current: THREE.Vector3 };
}

export function Barbarian({
  initialPosition = [3, 0.9, 0],
  playerPositionRef,
}: BarbarianProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);

  // Direction: 1 = +X (right), -1 = -X (left)
  const directionRef = useRef(1);
  const lastSideRef = useRef<'left' | 'right'>('right');
  const initializedRef = useRef(false);
  const isTurningRef = useRef(false);
  const turnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const modelFbx = useFBX(BARBARIAN_DEFAULTS.MODEL);
  const walkFbx = useFBX(SHARED_DEFAULTS.ANIMATIONS.WALK);
  const walkClip = walkFbx.animations[0];

  const model = useMemo(() => SkeletonUtils.clone(modelFbx), [modelFbx]);

  const mixer = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    const m = new THREE.AnimationMixer(model);
    mixer.current = m;
    const action = m.clipAction(walkClip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
    return () => {
      m.stopAllAction();
      mixer.current = null;
    };
  }, [model, walkClip]);

  useEffect(() => {
    return () => {
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
    };
  }, []);

  useFrame((_state, delta) => {
    if (!rigidBodyRef.current) return;

    const barbarianX = rigidBodyRef.current.translation().x;
    const playerX = playerPositionRef?.current?.x ?? 0;

    // First frame: walk toward the player
    if (!initializedRef.current) {
      directionRef.current = playerX >= barbarianX ? 1 : -1;
      lastSideRef.current = barbarianX > playerX ? 'right' : 'left';
      initializedRef.current = true;
    }

    // Detect crossing — barbarian has switched sides relative to the player
    const currentSide = barbarianX > playerX ? 'right' : 'left';
    if (currentSide !== lastSideRef.current && !isTurningRef.current) {
      isTurningRef.current = true;
      turnTimerRef.current = setTimeout(() => {
        directionRef.current *= -1;
        isTurningRef.current = false;
        turnTimerRef.current = null;
      }, 300);
    }
    lastSideRef.current = currentSide;

    // Walk velocity — preserve Y from physics (gravity)
    const rapierVel = rigidBodyRef.current.linvel?.() ?? { x: 0, y: 0, z: 0 };
    rigidBodyRef.current.setLinvel(
      {
        x: directionRef.current * SHARED_DEFAULTS.MOVE_SPEED,
        y: rapierVel.y,
        z: 0,
      },
      true,
    );

    // Face direction of travel
    const angle = directionRef.current > 0 ? Math.PI / 2 : -Math.PI / 2;
    const half = angle / 2;
    rigidBodyRef.current.setRotation(
      { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) },
      true,
    );

    if (mixer.current) mixer.current.update(delta);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      position={initialPosition}
      lockRotations
      enabledRotations={[false, false, false]}
      colliders={false}
    >
      <BallCollider
        args={[SHARED_DEFAULTS.COLLIDERS.GROUND_SPHERE.radius]}
        position={[...SHARED_DEFAULTS.COLLIDERS.GROUND_SPHERE.position]}
        collisionGroups={BARBARIAN_GROUND_GROUPS}
      />
      <primitive
        object={model}
        scale={SHARED_DEFAULTS.SCALE}
        position={[0, -0.9, 0]}
      />
    </RigidBody>
  );
}
