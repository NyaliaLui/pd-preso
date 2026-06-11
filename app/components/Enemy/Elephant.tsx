import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useTexture } from '@react-three/drei';
import {
  RigidBody,
  RapierRigidBody,
  BallCollider,
  interactionGroups,
} from '@react-three/rapier';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

import { ELEPHANT_DEFAULTS, SHARED_DEFAULTS } from '@/app/constants';

const ELEPHANT_GROUND_GROUPS = interactionGroups([5], [4]);

interface ElephantProps {
  initialPosition?: [number, number, number];
  playerPositionRef?: { current: THREE.Vector3 };
  isStationary?: boolean;
  bodyRef?: { current: RapierRigidBody | null };
  shake?: boolean;
}

export function Elephant({
  initialPosition = [5, 0.9, 0],
  playerPositionRef,
  isStationary = false,
  bodyRef,
  shake,
}: ElephantProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const shakeTimeRef = useRef(0);

  const directionRef = useRef(1);
  const lastSideRef = useRef<'left' | 'right'>('right');
  const initializedRef = useRef(false);
  const isTurningRef = useRef(false);
  const turnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const modelFbx = useFBX(ELEPHANT_DEFAULTS.MODEL);
  const model = useMemo(() => SkeletonUtils.clone(modelFbx), [modelFbx]);

  const [colorMap, metallicMap, normalMap, roughnessMap, emissionMap] =
    useTexture([
      ELEPHANT_DEFAULTS.TEXTURES.COLOR,
      ELEPHANT_DEFAULTS.TEXTURES.METALLIC,
      ELEPHANT_DEFAULTS.TEXTURES.NORMAL,
      ELEPHANT_DEFAULTS.TEXTURES.ROUGHNESS,
      ELEPHANT_DEFAULTS.TEXTURES.EMISSION,
    ]);

  useEffect(() => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: colorMap,
          metalnessMap: metallicMap,
          normalMap: normalMap,
          roughnessMap: roughnessMap,
          emissiveMap: emissionMap,
          emissive: new THREE.Color(1, 1, 1),
        });
      }
    });
  }, [model, colorMap, metallicMap, normalMap, roughnessMap, emissionMap]);

  const mixer = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    const clip = modelFbx.animations[0];
    if (!clip) return;
    const m = new THREE.AnimationMixer(model);
    mixer.current = m;
    const action = m.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
    return () => {
      m.stopAllAction();
      mixer.current = null;
    };
  }, [model, modelFbx]);

  useEffect(() => {
    return () => {
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
    };
  }, []);

  useFrame((_state, delta) => {
    if (!rigidBodyRef.current) return;

    if (isStationary) {
      const rapierVel = rigidBodyRef.current.linvel?.() ?? { x: 0, y: 0, z: 0 };
      rigidBodyRef.current.setLinvel({ x: 0, y: rapierVel.y, z: 0 }, true);
      const half = Math.PI / 4;
      rigidBodyRef.current.setRotation(
        { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) },
        true,
      );
      if (shake) {
        shakeTimeRef.current += delta;
        if (modelGroupRef.current)
          modelGroupRef.current.position.x =
            Math.sin(shakeTimeRef.current * 40) * 0.08;
      } else {
        shakeTimeRef.current = 0;
        if (modelGroupRef.current) modelGroupRef.current.position.x = 0;
      }
      if (mixer.current) mixer.current.update(delta);
      return;
    }

    const elephantX = rigidBodyRef.current.translation().x;
    const playerX = playerPositionRef?.current?.x ?? 0;

    if (!initializedRef.current) {
      directionRef.current = playerX >= elephantX ? 1 : -1;
      lastSideRef.current = elephantX > playerX ? 'right' : 'left';
      initializedRef.current = true;
    }

    const currentSide = elephantX > playerX ? 'right' : 'left';
    if (currentSide !== lastSideRef.current && !isTurningRef.current) {
      isTurningRef.current = true;
      turnTimerRef.current = setTimeout(() => {
        directionRef.current *= -1;
        isTurningRef.current = false;
        turnTimerRef.current = null;
      }, 300);
    }
    lastSideRef.current = currentSide;

    const rapierVel = rigidBodyRef.current.linvel?.() ?? { x: 0, y: 0, z: 0 };
    rigidBodyRef.current.setLinvel(
      {
        x: directionRef.current * SHARED_DEFAULTS.MOVE_SPEED,
        y: rapierVel.y,
        z: 0,
      },
      true,
    );

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
      ref={(body) => {
        rigidBodyRef.current = body;
        if (bodyRef) bodyRef.current = body;
      }}
      type="dynamic"
      position={initialPosition}
      lockRotations
      enabledRotations={[false, false, false]}
      colliders={false}
    >
      <BallCollider
        args={[SHARED_DEFAULTS.COLLIDERS.GROUND_SPHERE.radius]}
        position={[...SHARED_DEFAULTS.COLLIDERS.GROUND_SPHERE.position]}
        collisionGroups={ELEPHANT_GROUND_GROUPS}
      />
      <group ref={modelGroupRef}>
        <primitive
          object={model}
          scale={SHARED_DEFAULTS.SCALE}
          position={[0, -0.9, 0]}
        />
      </group>
    </RigidBody>
  );
}
