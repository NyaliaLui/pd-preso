import { useRef, useMemo, useEffect, useState } from 'react';
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

import {
  SHARED_DEFAULTS,
  PLAYER_DEFAULTS,
  GAME_DEFAULTS,
} from '@/app/constants';
import { KeyState } from '@/app/components/Player/hooks/useKeyboardControls';
import type { ClientPlayerState } from '@/app/ai/sharedTypes';

const PLAYER_GROUND_GROUPS = interactionGroups([5], [4]);

interface PlayerProps {
  keys: KeyState;
  onHit?: () => void;
  playerPositionRef?: { current: THREE.Vector3 };
  playerStateRef?: { current: ClientPlayerState | null };
}

export function Player({
  keys,
  playerPositionRef,
  playerStateRef,
}: PlayerProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const modelRef = useRef<THREE.Group>(null);
  const lastRotationRef = useRef<number>(Math.PI / 2);

  const [jumping, setJumping] = useState(false);

  // Load one FBX per animation; mesh comes from the idle FBX
  const idleFbx = useFBX(PLAYER_DEFAULTS.MODELS.IDLE);
  const walkFbx = useFBX(PLAYER_DEFAULTS.MODELS.WALK);
  const swayFbx = useFBX(PLAYER_DEFAULTS.MODELS.SWAY);
  const jumpFbx = useFBX(PLAYER_DEFAULTS.MODELS.JUMP);

  const idleClip = idleFbx.animations[0];
  const walkClip = walkFbx.animations[0];
  const swayClip = swayFbx.animations[0];
  const jumpClip = jumpFbx.animations[0];

  const model = useMemo(() => SkeletonUtils.clone(idleFbx), [idleFbx]);

  // Apply PBR textures to the cloned model
  const [colorMap, metallicMap, normalMap, roughnessMap] = useTexture([
    PLAYER_DEFAULTS.TEXTURES.COLOR,
    PLAYER_DEFAULTS.TEXTURES.METALLIC,
    PLAYER_DEFAULTS.TEXTURES.NORMAL,
    PLAYER_DEFAULTS.TEXTURES.ROUGHNESS,
  ]);

  useEffect(() => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: colorMap,
          metalnessMap: metallicMap,
          normalMap: normalMap,
          roughnessMap: roughnessMap,
        });
      }
    });
  }, [model, colorMap, metallicMap, normalMap, roughnessMap]);

  const moving = useMemo(
    () => !jumping && (keys.w || keys.s || keys.a || keys.d),
    [keys, jumping],
  );

  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const jumpingRef = useRef(false);
  const idleTimeRef = useRef(0);
  const isSwayingRef = useRef(false);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const isGroundedRef = useRef<boolean>(true);
  const wasFallingRef = useRef(false);
  const prevSpaceRef = useRef(false);

  useEffect(() => {
    if (!model) return;

    const m = new THREE.AnimationMixer(model);
    mixer.current = m;

    m.addEventListener('finished', () => {
      jumpingRef.current = false;
      setJumping(false);
    });

    const action = m.clipAction(idleClip);
    action.play();
    currentActionRef.current = action;

    return () => {
      m.stopAllAction();
      mixer.current = null;
      currentActionRef.current = null;
    };
  }, [model, idleClip]);

  useFrame((_state, delta) => {
    let jumpInitiated = false;

    if (mixer.current) {
      const m = mixer.current;

      // Jump (rising edge on Space)
      const spacePressed = keys.space && !prevSpaceRef.current;
      if (spacePressed && !jumpingRef.current) {
        jumpingRef.current = true;
        setJumping(true);

        const jumpAction = m.clipAction(jumpClip);
        jumpAction.reset();
        jumpAction.setLoop(THREE.LoopOnce, 1);
        jumpAction.clampWhenFinished = true;
        currentActionRef.current?.fadeOut(0.1);
        jumpAction.fadeIn(0.1).play();
        currentActionRef.current = jumpAction;

        jumpInitiated = true;
        isGroundedRef.current = false;
      }
      prevSpaceRef.current = keys.space;

      // Idle / Walk / Sway (only when not in the air)
      if (!jumpingRef.current) {
        if (!moving) {
          idleTimeRef.current += delta;
          isSwayingRef.current =
            idleTimeRef.current >= PLAYER_DEFAULTS.IDLE_SWAY_DELAY;
        } else {
          idleTimeRef.current = 0;
          isSwayingRef.current = false;
        }

        const clip = moving
          ? walkClip
          : isSwayingRef.current
            ? swayClip
            : idleClip;
        const nextAction = m.clipAction(clip);

        if (currentActionRef.current !== nextAction) {
          nextAction.reset();
          nextAction.setLoop(THREE.LoopRepeat, Infinity);
          currentActionRef.current?.fadeOut(0.1);
          nextAction.fadeIn(0.1).play();
          currentActionRef.current = nextAction;
        }
      }

      m.update(delta);
    }

    if (rigidBodyRef.current) {
      const moveSpeed = SHARED_DEFAULTS.MOVE_SPEED;
      const velocity = { x: 0, y: 0, z: 0 };

      if (keys.w) velocity.z = -moveSpeed;
      if (keys.s) velocity.z = moveSpeed;
      if (keys.a) {
        velocity.x = -moveSpeed;
        rigidBodyRef.current.setRotation(
          { x: 0, y: -0.707, z: 0, w: 0.707 },
          true,
        );
        lastRotationRef.current = -Math.PI / 2;
      }
      if (keys.d) {
        velocity.x = moveSpeed;
        rigidBodyRef.current.setRotation(
          { x: 0, y: 0.707, z: 0, w: 0.707 },
          true,
        );
        lastRotationRef.current = Math.PI / 2;
      }

      if ((keys.w || keys.s) && !keys.a && !keys.d) {
        const halfAngle = lastRotationRef.current / 2;
        rigidBodyRef.current.setRotation(
          { x: 0, y: Math.sin(halfAngle), z: 0, w: Math.cos(halfAngle) },
          true,
        );
      }

      const rapierVel = rigidBodyRef.current.linvel?.() ?? { x: 0, y: 0, z: 0 };
      if (!isGroundedRef.current) {
        if (rapierVel.y < -0.5) wasFallingRef.current = true;
        if (wasFallingRef.current && Math.abs(rapierVel.y) < 0.1) {
          isGroundedRef.current = true;
          wasFallingRef.current = false;
        }
      }
      velocity.y = jumpInitiated ? SHARED_DEFAULTS.JUMP.VELOCITY : rapierVel.y;

      rigidBodyRef.current.setLinvel(velocity, true);

      if (!moving) {
        const halfAngle = lastRotationRef.current / 2;
        rigidBodyRef.current.setRotation(
          { x: 0, y: Math.sin(halfAngle), z: 0, w: Math.cos(halfAngle) },
          true,
        );
      }

      const t = rigidBodyRef.current.translation();
      if (playerPositionRef) {
        playerPositionRef.current.set(t.x, t.y, t.z);
      }

      if (playerStateRef) {
        const v = rigidBodyRef.current.linvel?.() ?? { x: 0, y: 0, z: 0 };
        playerStateRef.current = {
          id: 'player-1',
          position: { x: t.x, y: t.y, z: t.z },
          velocity: { x: v.x, y: v.y, z: v.z },
          hp: 0,
          maxHp: GAME_DEFAULTS.PLAYER_MAX_HP,
          facingDirection: lastRotationRef.current > 0 ? 1 : -1,
          isAttacking: false,
          attackType: null,
          attackStartedAt: null,
          isJumping: jumpingRef.current,
          isCrouching: false,
        };
      }
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      position={[0, 0.9, 0]}
      lockRotations
      enabledRotations={[false, false, false]}
      colliders={false}
    >
      <BallCollider
        args={[SHARED_DEFAULTS.COLLIDERS.GROUND_SPHERE.radius]}
        position={[...SHARED_DEFAULTS.COLLIDERS.GROUND_SPHERE.position]}
        collisionGroups={PLAYER_GROUND_GROUPS}
      />
      <group ref={modelRef}>
        <primitive
          object={model}
          scale={SHARED_DEFAULTS.SCALE}
          position={[0, -0.9, 0]}
        />
      </group>
    </RigidBody>
  );
}
