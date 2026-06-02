import {
  useRef,
  useMemo,
  useEffect,
  useState,
  useCallback,
  RefObject,
} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import {
  CapsuleCollider,
  RigidBody,
  RapierRigidBody,
  BallCollider,
  interactionGroups,
} from '@react-three/rapier';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { SkeletonHelper } from 'three';

import {
  SHARED_DEFAULTS,
  PLAYER_DEFAULTS,
  GAME_DEFAULTS,
} from '@/app/constants';
import { KeyState } from '@/app/components/Player/hooks/useKeyboardControls';
import { DebugSettings } from '@/app/components/hooks/useDebugSettings';
import {
  getAnimationByName,
  getBoneList,
  makeBoneVertexMap,
  getBoneWorldPosition,
  BoneVertexMap,
} from '@/app/utils';
import type { ClientPlayerState } from '@/app/ai/sharedTypes';

// Collision groups (must match Barbarian.tsx):
//   0 = player body  â€” only hit by barbarian hand (group 3)
//   1 = player sword â€” only hits barbarian body (group 2)
//   4 = solid character bodies â€” collide only with each other (physical push-apart)
const PLAYER_BODY_GROUPS = interactionGroups([0], [3]);
const PLAYER_GROUND_GROUPS = interactionGroups([5], [4]);

function castSingleRay(
  raycaster: THREE.Raycaster,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDist: number,
  targets: THREE.Object3D[],
  hits: Set<string>,
  onHit?: (id: string) => void,
  onBoulderHit?: (id: string) => void,
) {
  raycaster.set(origin, direction);
  raycaster.far = maxDist;
  const intersections = raycaster.intersectObjects(targets, true);
  for (const intersection of intersections) {
    let obj: THREE.Object3D | null = intersection.object;
    while (obj) {
      if (obj.userData.barbarianId) {
        const id = obj.userData.barbarianId as string;
        if (!hits.has(id)) {
          hits.add(id);
          onHit?.(id);
        }
        break;
      }
      if (obj.userData.boulderId) {
        const id = obj.userData.boulderId as string;
        if (!hits.has(id)) {
          hits.add(id);
          onBoulderHit?.(id);
        }
        return; // boulder blocks this ray
      }
      obj = obj.parent;
    }
  }
}

// Casts center ray plus two side rays offset perpendicular to the swing direction.
// The shared hits Set deduplicates across all three rays.
function castSwordRay(
  raycaster: THREE.Raycaster,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDist: number,
  sideOffset: number,
  targets: THREE.Object3D[],
  hits: Set<string>,
  onHit?: (id: string) => void,
  onBoulderHit?: (id: string) => void,
) {
  castSingleRay(
    raycaster,
    origin,
    direction,
    maxDist,
    targets,
    hits,
    onHit,
    onBoulderHit,
  );
  if (sideOffset > 0) {
    const perp = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    castSingleRay(
      raycaster,
      origin.clone().addScaledVector(perp, sideOffset),
      direction,
      maxDist,
      targets,
      hits,
      onHit,
      onBoulderHit,
    );
    castSingleRay(
      raycaster,
      origin.clone().addScaledVector(perp, -sideOffset),
      direction,
      maxDist,
      targets,
      hits,
      onHit,
      onBoulderHit,
    );
  }
}

interface PlayerProps {
  keys: KeyState;
  onHit?: () => void;
  onSwordHit?: (barbarianId: string) => void;
  barbarianTargets?: RefObject<Map<string, THREE.Object3D> | null>;
  boulderTargets?: RefObject<Map<string, THREE.Object3D> | null>;
  onBoulderHit?: (boulderId: string) => void;
  settings: DebugSettings;
  playerPositionRef?: { current: THREE.Vector3 };
  playerStateRef?: { current: ClientPlayerState | null };
}

export function Player({
  keys,
  onHit,
  onSwordHit,
  barbarianTargets,
  boulderTargets,
  onBoulderHit,
  settings,
  playerPositionRef,
  playerStateRef,
}: PlayerProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const modelRef = useRef<THREE.Group>(null);
  const lastRotationRef = useRef<number>(Math.PI / 2);
  const [torsoPosition, setTorsoPosition] = useState<[number, number, number]>([
    ...SHARED_DEFAULTS.COLLIDERS.TORSO.position,
  ]);
  const [headPosition, setHeadPosition] = useState<[number, number, number]>([
    ...SHARED_DEFAULTS.COLLIDERS.HEAD.position,
  ]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const attackHitsRef = useRef<Set<string>>(new Set());
  const { scene } = useThree();
  const skeletonHelperRef = useRef<SkeletonHelper | null>(null);
  const boneVertexMapRef = useRef<BoneVertexMap | null>(null);

  const [normalAttacking, setNormalAttacking] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [crouchAttacking, setCrouchAttacking] = useState(false);
  const [specialAttacking, setSpecialAttacking] = useState(false);
  const [specialColliderActive, setSpecialColliderActive] = useState(false);

  const crouching = keys.ctrl;

  // Determine if character is moving (not moving if normal attacking, crouching, jumping, crouch attacking, or special attacking)
  const moving = useMemo(() => {
    return (
      !normalAttacking &&
      !crouching &&
      !jumping &&
      !crouchAttacking &&
      !specialAttacking &&
      (keys.w || keys.s || keys.a || keys.d)
    );
  }, [
    keys,
    normalAttacking,
    crouching,
    jumping,
    crouchAttacking,
    specialAttacking,
  ]);

  // Load the skinned model
  const modelFbx = useFBX(PLAYER_DEFAULTS.MODEL);

  // Extract animations embedded in the model FBX
  const idleAnim = getAnimationByName(
    modelFbx.animations,
    PLAYER_DEFAULTS.ANIMATIONS.IDLE,
  );
  const walkAnim = getAnimationByName(
    modelFbx.animations,
    PLAYER_DEFAULTS.ANIMATIONS.WALK,
  );
  const normalAnim = getAnimationByName(
    modelFbx.animations,
    PLAYER_DEFAULTS.ANIMATIONS.NORMAL,
  );
  const crouchAnim = getAnimationByName(
    modelFbx.animations,
    PLAYER_DEFAULTS.ANIMATIONS.CROUCH,
  );
  const jumpAnim = getAnimationByName(
    modelFbx.animations,
    PLAYER_DEFAULTS.ANIMATIONS.JUMP,
  );
  const crouchAttackAnim = getAnimationByName(
    modelFbx.animations,
    PLAYER_DEFAULTS.ANIMATIONS.CROUCH_ATTACK,
  );
  const specialAnim = getAnimationByName(
    modelFbx.animations,
    PLAYER_DEFAULTS.ANIMATIONS.SPECIAL,
  );

  // Clone the model so it can be used independently
  const model = useMemo(() => SkeletonUtils.clone(modelFbx), [modelFbx]);

  // Create skeleton helper for visualization and build bone vertex map
  useEffect(() => {
    if (model) {
      const helper = new SkeletonHelper(model);
      helper.visible = settings.debugMode;
      const bones = getBoneList(model);
      const boneVertexMap = makeBoneVertexMap(bones);

      skeletonHelperRef.current = helper;
      boneVertexMapRef.current = boneVertexMap;
      scene.add(helper);

      return () => {
        scene.remove(helper);
        skeletonHelperRef.current = null;
        boneVertexMapRef.current = null;
      };
    }
  }, [model, scene, settings.debugMode]);

  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const normalAttackingRef = useRef(false);
  const jumpingRef = useRef(false);
  const crouchAttackingRef = useRef(false);
  const specialAttackingRef = useRef(false);
  const specialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const isGroundedRef = useRef<boolean>(true);
  const wasFallingRef = useRef(false);

  const prevQRef = useRef(false);
  const prevERef = useRef(false);
  const prevSpaceRef = useRef(false);
  const attackAudioRef = useRef<HTMLAudioElement | null>(null);
  const attackAudioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const audio = new Audio(PLAYER_DEFAULTS.ATTACK_SOUND);
    audio.preload = 'auto';
    attackAudioRef.current = audio;
  }, []);

  const playAttackSound = useCallback(() => {
    if (!attackAudioRef.current) return;
    if (attackAudioTimerRef.current) clearTimeout(attackAudioTimerRef.current);
    attackAudioRef.current.currentTime = 0;
    attackAudioRef.current.play()?.catch(() => {});
    attackAudioTimerRef.current = setTimeout(() => {
      if (attackAudioRef.current) {
        attackAudioRef.current.pause();
        attackAudioRef.current.currentTime = 0;
      }
    }, PLAYER_DEFAULTS.ATTACK_SOUND_DURATION_MS);
  }, []);

  // Initialize mixer once
  useEffect(() => {
    if (!model) return;

    const m = new THREE.AnimationMixer(model);
    mixer.current = m;

    // When one-shot animation finishes, go back to idle/walk
    const onFinished = () => {
      // After special attack, move the character forward by 1 on Z
      if (specialAttackingRef.current && rigidBodyRef.current) {
        const pos = rigidBodyRef.current.translation();
        rigidBodyRef.current.setTranslation(
          { x: pos.x + 0.4, y: pos.y, z: pos.z },
          true,
        );
      }

      normalAttackingRef.current = false;
      setNormalAttacking(false);
      jumpingRef.current = false;
      setJumping(false);
      crouchAttackingRef.current = false;
      setCrouchAttacking(false);
      specialAttackingRef.current = false;
      setSpecialAttacking(false);
      // Clear special collider and timer
      if (specialTimerRef.current) {
        clearTimeout(specialTimerRef.current);
        specialTimerRef.current = null;
      }
      setSpecialColliderActive(false);
    };
    m.addEventListener('finished', onFinished);

    // Start with idle
    const action = m.clipAction(idleAnim);
    action.play();
    currentActionRef.current = action;

    return () => {
      m.removeEventListener('finished', onFinished);
      m.stopAllAction();
      mixer.current = null;
      currentActionRef.current = null;
      if (specialTimerRef.current) {
        clearTimeout(specialTimerRef.current);
        specialTimerRef.current = null;
      }
    };
  }, [model, idleAnim]);

  useFrame((_state, delta) => {
    let jumpInitiated = false;
    if (mixer.current) {
      const m = mixer.current;

      // Detect Q/E key press edge (rising edge)
      const qPressed = keys.q && !prevQRef.current;
      const ePressed = keys.e && !prevERef.current;

      // Crouch attack: Ctrl + Q pressed together
      if (
        qPressed &&
        crouching &&
        !crouchAttackingRef.current &&
        !normalAttackingRef.current
      ) {
        crouchAttackingRef.current = true;
        setCrouchAttacking(true);
        attackHitsRef.current.clear();
        playAttackSound();

        const crouchAttackAction = m.clipAction(crouchAttackAnim);
        crouchAttackAction.reset();
        crouchAttackAction.setLoop(THREE.LoopOnce, 1);
        crouchAttackAction.clampWhenFinished = true;

        if (currentActionRef.current) {
          currentActionRef.current.fadeOut(0.1);
        }
        crouchAttackAction.fadeIn(0.1).play();
        currentActionRef.current = crouchAttackAction;
      }
      // Normal attack: Q while not crouching
      else if (
        qPressed &&
        !normalAttackingRef.current &&
        !specialAttackingRef.current &&
        !crouching
      ) {
        normalAttackingRef.current = true;
        setNormalAttacking(true);
        attackHitsRef.current.clear();
        playAttackSound();

        console.log(`d: ${delta}, normal: ${normalAttackingRef.current}`);

        const attackAction = m.clipAction(normalAnim);
        attackAction.reset();
        attackAction.setLoop(THREE.LoopOnce, 1);
        attackAction.clampWhenFinished = true;

        if (currentActionRef.current) {
          currentActionRef.current.fadeOut(0.1);
        }
        attackAction.fadeIn(0.1).play();
        currentActionRef.current = attackAction;
      }
      // Special attack: E while not crouching
      else if (
        ePressed &&
        !specialAttackingRef.current &&
        !normalAttackingRef.current &&
        !crouching
      ) {
        specialAttackingRef.current = true;
        setSpecialAttacking(true);
        attackHitsRef.current.clear();
        playAttackSound();

        // Activate the special ray after a delay
        specialTimerRef.current = setTimeout(() => {
          setSpecialColliderActive(true);
          specialTimerRef.current = null;
        }, PLAYER_DEFAULTS.RAYCAST.SPECIAL_DELAY * 1000);

        const specialAction = m.clipAction(specialAnim);
        specialAction.reset();
        specialAction.setLoop(THREE.LoopOnce, 1);
        specialAction.clampWhenFinished = true;

        if (currentActionRef.current) {
          currentActionRef.current.fadeOut(0.1);
        }
        specialAction.fadeIn(0.1).play();
        currentActionRef.current = specialAction;
      }
      prevQRef.current = keys.q;
      prevERef.current = keys.e;

      // Detect Space key press edge (rising edge) - block jump while crouching or attacking
      const spacePressed = keys.space && !prevSpaceRef.current;
      if (
        spacePressed &&
        !jumpingRef.current &&
        !normalAttackingRef.current &&
        !specialAttackingRef.current &&
        !crouching
      ) {
        jumpingRef.current = true;
        setJumping(true);

        const jumpAction = m.clipAction(jumpAnim);
        jumpAction.reset();
        jumpAction.setLoop(THREE.LoopOnce, 1);
        jumpAction.clampWhenFinished = true;

        if (currentActionRef.current) {
          currentActionRef.current.fadeOut(0.1);
        }
        jumpAction.fadeIn(0.1).play();
        currentActionRef.current = jumpAction;

        jumpInitiated = true;
        isGroundedRef.current = false;
      }
      prevSpaceRef.current = keys.space;

      // Transition to idle/walk/crouch when not normal attacking, jumping, crouch attacking, or special attacking
      if (
        !normalAttackingRef.current &&
        !jumpingRef.current &&
        !crouchAttackingRef.current &&
        !specialAttackingRef.current
      ) {
        const clip = crouching ? crouchAnim : moving ? walkAnim : idleAnim;
        const nextAction = m.clipAction(clip);

        if (currentActionRef.current !== nextAction) {
          nextAction.reset();
          nextAction.setLoop(THREE.LoopRepeat, Infinity);
          if (currentActionRef.current) {
            currentActionRef.current.fadeOut(0.1);
          }
          nextAction.fadeIn(0.1).play();
          currentActionRef.current = nextAction;
        }
      }

      m.update(delta);
    }

    // Update collider positions based on bone world positions from SkeletonHelper
    if (skeletonHelperRef.current && boneVertexMapRef.current && model) {
      // Update the model's world matrices to ensure bone positions are current
      model.updateMatrixWorld(true);
      // Update the skeleton helper's geometry (it reads from bones internally)
      skeletonHelperRef.current.updateMatrixWorld(true);

      const positions = skeletonHelperRef.current.geometry.attributes.position;

      if (rigidBodyRef.current) {
        // Update torso position based on spine bone
        const spinePos = getBoneWorldPosition(
          'mixamorigSpine',
          boneVertexMapRef.current,
          positions,
        );
        if (spinePos) {
          spinePos.multiplyScalar(SHARED_DEFAULTS.SCALE);
          setTorsoPosition([
            spinePos.x,
            spinePos.y + SHARED_DEFAULTS.COLLIDERS.TORSO.offset.y,
            spinePos.z + SHARED_DEFAULTS.COLLIDERS.TORSO.offset.z,
          ]);
        }

        // Update head position based on head bone
        const headBonePos = getBoneWorldPosition(
          'mixamorigHead',
          boneVertexMapRef.current,
          positions,
        );
        if (headBonePos) {
          headBonePos.multiplyScalar(SHARED_DEFAULTS.SCALE);
          setHeadPosition([
            headBonePos.x,
            headBonePos.y + SHARED_DEFAULTS.COLLIDERS.HEAD.offset.y,
            headBonePos.z + SHARED_DEFAULTS.COLLIDERS.HEAD.offset.z,
          ]);
        }

        // Raycast for all sword attacks
        if (normalAttacking || crouchAttacking || specialColliderActive) {
          const swordBone = model.getObjectByName('mixamorigSword_joint');

          if (swordBone) {
            const origin = new THREE.Vector3();
            swordBone.getWorldPosition(origin);

            const quat = new THREE.Quaternion();
            swordBone.getWorldQuaternion(quat);
            const direction = new THREE.Vector3(0, 0, 1)
              .applyQuaternion(quat)
              .normalize();

            // Hit detection against barbarian and boulder targets
            {
              const allTargets: THREE.Object3D[] = [
                ...Array.from(barbarianTargets?.current?.values() ?? []),
                ...Array.from(boulderTargets?.current?.values() ?? []),
              ];
              if (allTargets.length > 0) {
                castSwordRay(
                  raycasterRef.current,
                  origin,
                  direction,
                  PLAYER_DEFAULTS.RAYCAST.SWORD_LENGTH,
                  PLAYER_DEFAULTS.RAYCAST.SWORD_SIDE_OFFSET,
                  allTargets,
                  attackHitsRef.current,
                  onSwordHit,
                  onBoulderHit,
                );
              }
            }

            // Debug arrow
            if (settings.debugMode) {
              const existing = scene.getObjectByName('swordRayDebug');
              if (existing) scene.remove(existing);
              const arrow = new THREE.ArrowHelper(
                direction,
                origin,
                PLAYER_DEFAULTS.RAYCAST.SWORD_LENGTH,
                PLAYER_DEFAULTS.RAYCAST.COLOR,
              );
              arrow.name = 'swordRayDebug';
              scene.add(arrow);
            }
          }
        } else if (settings.debugMode) {
          // Clean up debug arrows when not attacking
          const swordArrow = scene.getObjectByName('swordRayDebug');
          if (swordArrow) scene.remove(swordArrow);
        }
      }
    }

    if (rigidBodyRef.current) {
      const moveSpeed = SHARED_DEFAULTS.MOVE_SPEED;
      const velocity = { x: 0, y: 0, z: 0 };

      // Block movement during attacks, crouching, crouch attacking, or special attacking
      if (
        !normalAttackingRef.current &&
        !crouching &&
        !crouchAttackingRef.current &&
        !specialAttackingRef.current
      ) {
        // WASD movement with rotation to face direction
        if (keys.w) {
          velocity.z = -moveSpeed;
        }
        if (keys.s) {
          velocity.z = moveSpeed;
        }
        if (keys.a) {
          velocity.x = -moveSpeed;
          rigidBodyRef.current.setRotation(
            { x: 0, y: -0.707, z: 0, w: 0.707 },
            true,
          ); // Face -X
          lastRotationRef.current = -Math.PI / 2;
        }
        if (keys.d) {
          velocity.x = moveSpeed;
          rigidBodyRef.current.setRotation(
            { x: 0, y: 0.707, z: 0, w: 0.707 },
            true,
          ); // Face +X
          lastRotationRef.current = Math.PI / 2;
        }

        // Apply last horizontal rotation when moving vertically without horizontal input
        if ((keys.w || keys.s) && !keys.a && !keys.d) {
          const halfAngle = lastRotationRef.current / 2;
          rigidBodyRef.current.setRotation(
            { x: 0, y: Math.sin(halfAngle), z: 0, w: Math.cos(halfAngle) },
            true,
          );
        }
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

      // When idle, maintain last rotation
      if (!moving) {
        const halfAngle = lastRotationRef.current / 2;
        rigidBodyRef.current.setRotation(
          { x: 0, y: Math.sin(halfAngle), z: 0, w: Math.cos(halfAngle) },
          true,
        );
      }

      // Publish position so Barbarian can follow
      const t = rigidBodyRef.current.translation();
      if (playerPositionRef) {
        playerPositionRef.current.set(t.x, t.y, t.z);
      }

      // Publish full player state for the AI server
      if (playerStateRef) {
        const v = rigidBodyRef.current.linvel?.() ?? { x: 0, y: 0, z: 0 };
        playerStateRef.current = {
          id: 'player-1',
          position: { x: t.x, y: t.y, z: t.z },
          velocity: { x: v.x, y: v.y, z: v.z },
          hp: 0, // filled in by BarbarianAIClient from playerHPRef
          maxHp: GAME_DEFAULTS.PLAYER_MAX_HP,
          facingDirection: lastRotationRef.current > 0 ? 1 : -1,
          isAttacking:
            normalAttackingRef.current ||
            crouchAttackingRef.current ||
            specialAttackingRef.current,
          attackType: normalAttackingRef.current
            ? 'normal'
            : crouchAttackingRef.current
              ? 'crouch'
              : specialAttackingRef.current
                ? 'special'
                : null,
          attackStartedAt: null,
          isJumping: jumpingRef.current,
          isCrouching: crouching,
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
      {/* Ground sphere â€” group 5, only collides with environment (group 4) */}
      <BallCollider
        args={[SHARED_DEFAULTS.COLLIDERS.GROUND_SPHERE.radius]}
        position={[...SHARED_DEFAULTS.COLLIDERS.GROUND_SPHERE.position]}
        collisionGroups={PLAYER_GROUND_GROUPS}
      />
      {/* Torso capsule â€” group 0, only triggered by barbarian hand (group 3) */}
      <CapsuleCollider
        args={[
          SHARED_DEFAULTS.COLLIDERS.TORSO.halfHeight,
          SHARED_DEFAULTS.COLLIDERS.TORSO.radius,
        ]}
        position={torsoPosition}
        sensor
        collisionGroups={PLAYER_BODY_GROUPS}
        onIntersectionEnter={onHit}
      />
      {/* Head capsule â€” group 0, only triggered by barbarian hand (group 3) */}
      <CapsuleCollider
        args={[
          SHARED_DEFAULTS.COLLIDERS.HEAD.halfHeight,
          SHARED_DEFAULTS.COLLIDERS.HEAD.radius,
        ]}
        position={headPosition}
        sensor
        collisionGroups={PLAYER_BODY_GROUPS}
        onIntersectionEnter={onHit}
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
