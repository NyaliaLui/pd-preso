import {
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
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
  BARBARIAN_DEFAULTS,
  GAME_DEFAULTS,
  DEFAULT_COLORS,
} from '@/app/constants';
import { DebugSettings } from '@/app/components/hooks/useDebugSettings';
import {
  getAnimation,
  getBoneList,
  makeBoneVertexMap,
  getBoneWorldPosition,
  BoneVertexMap,
} from '@/app/utils';
import type {
  BarbarianAction,
  ClientBarbarianState,
  BarbarianDecision,
} from '@/app/ai/sharedTypes';
import { applyAction, decisionChanged } from '@/app/ai/ActionApplier';
import { INITIAL_PLATFORM_POSITIONS } from '@/app/components/World/World';

// Collision groups:
//   0 = player body sensors    â€” only triggered by group 3
//   1 = player sword           â€” only triggers group 2
//   2 = barbarian body sensors â€” only triggered by group 1
//   3 = barbarian hand         â€” only triggers group 0
//   4 = solid character bodies â€” collide only with each other (physical push-apart)
const BARBARIAN_BODY_GROUPS = interactionGroups([2], [1]);
const BARBARIAN_HAND_GROUPS = interactionGroups([3], [0]);
const BARBARIAN_GROUND_GROUPS = interactionGroups([5], [4]);

export interface BarbarianHandle {
  takeDamage: () => void;
}

interface BarbarianProps {
  id: string;
  initialPosition?: [number, number, number];
  onDeath?: (id: string) => void;
  onRegister?: (id: string, model: THREE.Object3D) => void;
  onUnregister?: (id: string) => void;
  settings: DebugSettings;
  playerPositionRef?: { current: THREE.Vector3 | null };
  barbarianStatesRef?: { current: Record<string, ClientBarbarianState> };
  barbarianDecisionsRef?: { current: Record<string, BarbarianDecision | null> };
}

export const Barbarian = forwardRef<BarbarianHandle, BarbarianProps>(
  function Barbarian(
    {
      id,
      initialPosition,
      onDeath,
      onRegister,
      onUnregister,
      settings,
      playerPositionRef,
      barbarianStatesRef,
      barbarianDecisionsRef,
    },
    ref,
  ) {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const modelRef = useRef<THREE.Group>(null);
    const lastRotationRef = useRef<number>(-Math.PI / 2);
    const { scene } = useThree();
    const skeletonHelperRef = useRef<SkeletonHelper | null>(null);
    const boneVertexMapRef = useRef<BoneVertexMap | null>(null);
    const [torsoPosition, setTorsoPosition] = useState<
      [number, number, number]
    >([...SHARED_DEFAULTS.COLLIDERS.TORSO.position]);
    const [headPosition, setHeadPosition] = useState<[number, number, number]>([
      ...SHARED_DEFAULTS.COLLIDERS.HEAD.position,
    ]);
    const [handPosition, setHandPosition] = useState<[number, number, number]>([
      ...BARBARIAN_DEFAULTS.COLLIDERS.HAND.position,
    ]);
    const [hp, setHp] = useState(GAME_DEFAULTS.INITIAL_BARBARIAN_HP);
    const [isWalking, setIsWalking] = useState(false);
    const [isAttacking, setIsAttacking] = useState(false);
    const [isJumping, setIsJumping] = useState(false);
    const [direction, setDirection] = useState<number>(-1); // 1 = right, -1 = left
    const wasWalkingRef = useRef(false);
    const yVelocityRef = useRef<number>(0);
    const isGroundedRef = useRef<boolean>(true);
    const jumpStartYRef = useRef<number>(0);
    const jumpPendingRef = useRef<boolean>(false);
    /** ms timestamp (performance.now()) when utility AI last entered ATTACK. */
    const utilityAttackStartRef = useRef<number>(0);
    /** True while utility AI is holding the barbarian in ATTACK mode. */
    const utilityIsAttackingRef = useRef<boolean>(false);
    /** ms timestamp when server last applied a STRATEGIC_ACTION. -Infinity means no strategic action has ever been applied. */
    const strategicActionStartRef = useRef<number>(-Infinity);
    const lastDecisionRef = useRef<{
      action: BarbarianDecision['action'];
      direction: number;
    } | null>(null);

    const handleHit = useCallback(() => {
      setHp((prevHp) => {
        const newHp = prevHp - 1;
        return newHp;
      });
    }, []);

    useImperativeHandle(ref, () => ({
      takeDamage: handleHit,
    }));

    // Notify parent when barbarian dies
    useEffect(() => {
      if (hp <= 0 && onDeath) {
        onDeath(id);
      }
    }, [hp, id, onDeath]);

    // Load the skinned model
    const modelFbx = useFBX(BARBARIAN_DEFAULTS.MODEL);

    // Load animations from separate files
    const idleAnim = getAnimation(useFBX(SHARED_DEFAULTS.ANIMATIONS.IDLE));
    const walkAnim = getAnimation(useFBX(SHARED_DEFAULTS.ANIMATIONS.WALK));
    const normalAnim = getAnimation(
      useFBX(BARBARIAN_DEFAULTS.ANIMATIONS.NORMAL),
    );
    const jumpAnim = getAnimation(useFBX(BARBARIAN_DEFAULTS.ANIMATIONS.JUMP));

    const mixer = useRef<THREE.AnimationMixer | null>(null);

    // Clone the model so it can be used independently
    const model = useMemo(() => SkeletonUtils.clone(modelFbx), [modelFbx]);

    // Tag meshes with barbarianId and register model for raycasting
    useEffect(() => {
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.barbarianId = id;
        }
      });
      onRegister?.(id, model);
      return () => {
        onUnregister?.(id);
      };
    }, [model, id, onRegister, onUnregister]);

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

    // Get the current animation clip based on state (jump > attack > walk > idle)
    const currentAnimation = useMemo(() => {
      if (isJumping) return jumpAnim;
      if (isAttacking) return normalAnim;
      if (isWalking) return walkAnim;
      return idleAnim;
    }, [
      isAttacking,
      isJumping,
      isWalking,
      normalAnim,
      jumpAnim,
      walkAnim,
      idleAnim,
    ]);

    // Simple patrol behavior: toggle walking every barbarianWalkDurationMS and change direction
    useEffect(() => {
      if (!settings.enableBarbarianWalk) return;
      const interval = setInterval(() => {
        setIsWalking((prev) => {
          if (!prev && !wasWalkingRef.current) {
            setDirection((d) => d * -1);
          }
          wasWalkingRef.current = !prev;
          return !prev;
        });
      }, settings.barbarianWalkDurationMS);
      return () => clearInterval(interval);
    }, [settings.enableBarbarianWalk, settings.barbarianWalkDurationMS]);

    // Attack behavior: toggle attacking every attackSpeed
    useEffect(() => {
      if (!settings.enableBarbarianAttack) return;
      const interval = setInterval(() => {
        setIsAttacking((prev) => !prev);
      }, settings.attackSpeed);
      return () => clearInterval(interval);
    }, [settings.enableBarbarianAttack, settings.attackSpeed]);

    // Jump behavior: trigger jump every jumpDurationMS
    useEffect(() => {
      if (!settings.enableBarbarianJump) return;
      const interval = setInterval(() => {
        jumpPendingRef.current = true;
      }, settings.jumpDurationMS);
      return () => clearInterval(interval);
    }, [settings.enableBarbarianJump, settings.jumpDurationMS]);

    useEffect(() => {
      // Clean up previous mixer
      if (mixer.current) {
        mixer.current.stopAllAction();
        mixer.current = null;
      }

      // Set up new mixer with current animation on the model
      if (model && currentAnimation) {
        mixer.current = new THREE.AnimationMixer(model);
        const action = mixer.current.clipAction(currentAnimation);
        if (currentAnimation === jumpAnim) {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        action.play();
      }

      return () => {
        if (mixer.current) {
          mixer.current.stopAllAction();
        }
      };
    }, [model, currentAnimation, jumpAnim]);

    useFrame((_state, delta) => {
      if (mixer.current) {
        mixer.current.update(delta);
      }

      // Update collider positions based on bone world positions from SkeletonHelper
      if (skeletonHelperRef.current && boneVertexMapRef.current && model) {
        // Update the model's world matrices to ensure bone positions are current
        model.updateMatrixWorld(true);
        // Update the skeleton helper's geometry (it reads from bones internally)
        skeletonHelperRef.current.updateMatrixWorld(true);

        const positions =
          skeletonHelperRef.current.geometry.attributes.position;

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

          // Update hand position (only during attack)
          if (isAttacking) {
            const leftHandPos = getBoneWorldPosition(
              'mixamorigLeftHand',
              boneVertexMapRef.current,
              positions,
            );
            if (leftHandPos) {
              leftHandPos.multiplyScalar(SHARED_DEFAULTS.SCALE);
              setHandPosition([
                leftHandPos.x,
                leftHandPos.y + BARBARIAN_DEFAULTS.COLLIDERS.HAND.offset.y,
                leftHandPos.z + BARBARIAN_DEFAULTS.COLLIDERS.HAND.offset.z,
              ]);
            }
          }
        }
      }

      // Apply AI decision if one is available and has changed
      if (barbarianDecisionsRef) {
        const decision = barbarianDecisionsRef.current[id] ?? null;
        if (decision && decisionChanged(lastDecisionRef.current, decision)) {
          applyAction(decision.action, decision.direction, {
            setIsAttacking,
            setIsWalking,
            setDirection,
            setJumpPending: () => {
              jumpPendingRef.current = true;
            },
          });
          lastDecisionRef.current = {
            action: decision.action,
            direction: decision.direction,
          };
          // Stamp strategic action so utility AI defers during the animation
          if (
            (
              BARBARIAN_DEFAULTS.UTILITY_AI
                .STRATEGIC_ACTIONS as readonly string[]
            ).includes(decision.action)
          ) {
            strategicActionStartRef.current = performance.now();
            utilityIsAttackingRef.current = false;
          }
        }
      }

      // â”€â”€ Utility AI (fast loop ~60 fps) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Runs after server-decision block so it can override stale IDLE/CHASE.
      // Inactive when playerPositionRef is null (tests, debug-only mode).
      if (playerPositionRef?.current && rigidBodyRef.current) {
        const now = performance.now();
        const t = rigidBodyRef.current.translation();
        const dx = playerPositionRef.current.x - t.x;
        const dy = playerPositionRef.current.y - t.y;
        const dz = playerPositionRef.current.z - t.z;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const inStrategicPause =
          now - strategicActionStartRef.current <
          BARBARIAN_DEFAULTS.UTILITY_AI.MIN_ATTACK_DURATION_MS;

        if (!inStrategicPause) {
          if (distToPlayer <= BARBARIAN_DEFAULTS.UTILITY_AI.ATTACK_RANGE) {
            // In range â†’ attack
            if (!utilityIsAttackingRef.current) {
              utilityIsAttackingRef.current = true;
              utilityAttackStartRef.current = now;
              setIsAttacking(true);
              setIsWalking(false);
            }
            // Face the player while attacking
            const toPlayerAngle = Math.atan2(dx, dz);
            const halfAngle = toPlayerAngle / 2;
            rigidBodyRef.current.setRotation(
              { x: 0, y: Math.sin(halfAngle), z: 0, w: Math.cos(halfAngle) },
              true,
            );
            lastRotationRef.current = toPlayerAngle;
          } else {
            // Out of range â†’ chase (after minimum attack duration expires)
            const attackHeld =
              utilityIsAttackingRef.current &&
              now - utilityAttackStartRef.current <
                BARBARIAN_DEFAULTS.UTILITY_AI.MIN_ATTACK_DURATION_MS;

            if (!attackHeld) {
              if (utilityIsAttackingRef.current) {
                utilityIsAttackingRef.current = false;
                setIsAttacking(false);
              }
              // Always chase â€” never idle while player is alive
              if (!isWalking) {
                setIsWalking(true);
              }
            }
          }
        }
      }

      // Movement and rotation logic
      if (rigidBodyRef.current) {
        const moveSpeed = SHARED_DEFAULTS.MOVE_SPEED;
        const velocity = { x: 0, y: 0, z: 0 };

        // Jump over boulders in the way
        if (
          isWalking &&
          !isAttacking &&
          isGroundedRef.current &&
          !jumpPendingRef.current
        ) {
          const t = rigidBodyRef.current.translation();
          for (const bx of INITIAL_PLATFORM_POSITIONS) {
            const dx = bx - t.x;
            if (direction > 0 ? dx > 0 && dx < 2 : dx < 0 && dx > -2) {
              jumpPendingRef.current = true;
              break;
            }
          }
        }

        // Trigger jump while grounded
        if (jumpPendingRef.current && isGroundedRef.current) {
          jumpPendingRef.current = false;
          const t = rigidBodyRef.current.translation();
          jumpStartYRef.current = t.y;
          yVelocityRef.current = SHARED_DEFAULTS.JUMP.VELOCITY;
          isGroundedRef.current = false;
          setIsJumping(true);
        }

        // Simulate vertical physics while airborne
        if (!isGroundedRef.current) {
          const clampedDelta = Math.min(delta, 1 / 30);
          yVelocityRef.current -= SHARED_DEFAULTS.JUMP.GRAVITY * clampedDelta;
          const t = rigidBodyRef.current.translation();
          if (yVelocityRef.current < 0 && t.y <= jumpStartYRef.current) {
            yVelocityRef.current = 0;
            isGroundedRef.current = true;
            setIsJumping(false);
            rigidBodyRef.current.setTranslation(
              { x: t.x, y: jumpStartYRef.current, z: t.z },
              true,
            );
          }
        }

        velocity.y = yVelocityRef.current;

        const isActionBlocking = isAttacking;
        if (isWalking && !isActionBlocking) {
          velocity.x = direction * moveSpeed;

          // Set rotation based on direction
          if (direction === -1) {
            // Face -X (left)
            rigidBodyRef.current.setRotation(
              { x: 0, y: -0.707, z: 0, w: 0.707 },
              true,
            );
            lastRotationRef.current = -Math.PI / 2;
          } else {
            // Face +X (right)
            rigidBodyRef.current.setRotation(
              { x: 0, y: 0.707, z: 0, w: 0.707 },
              true,
            );
            lastRotationRef.current = Math.PI / 2;
          }
        } else if (!isWalking || isActionBlocking) {
          // When idle or attacking, maintain last rotation
          const halfAngle = lastRotationRef.current / 2;
          rigidBodyRef.current.setRotation(
            { x: 0, y: Math.sin(halfAngle), z: 0, w: Math.cos(halfAngle) },
            true,
          );
        }

        rigidBodyRef.current.setLinvel(velocity, true);

        // Publish own state so BarbarianAIClient can send it to the server
        if (barbarianStatesRef) {
          const t = rigidBodyRef.current.translation();
          const v = rigidBodyRef.current.linvel?.() ?? { x: 0, y: 0, z: 0 };
          const currentAction: BarbarianAction = isAttacking
            ? 'ATTACK'
            : isJumping
              ? 'JUMP'
              : 'CHASE';
          barbarianStatesRef.current[id] = {
            id,
            position: { x: t.x, y: t.y, z: t.z },
            velocity: { x: v.x, y: v.y, z: v.z },
            hp,
            maxHp: GAME_DEFAULTS.INITIAL_BARBARIAN_HP,
            facingDirection: lastRotationRef.current > 0 ? 1 : -1,
            isGrounded: isGroundedRef.current,
            currentAction,
          };
        }

        // Follow player position when walking (if AI not driving direction)
        if (playerPositionRef?.current && isWalking && !isActionBlocking) {
          const t = rigidBodyRef.current.translation();
          const dx = playerPositionRef.current.x - t.x;
          const dz = playerPositionRef.current.z - t.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > 0.1) {
            const nx = dx / dist;
            const nz = dz / dist;
            rigidBodyRef.current.setLinvel(
              {
                x: nx * SHARED_DEFAULTS.MOVE_SPEED,
                y: velocity.y,
                z: nz * SHARED_DEFAULTS.MOVE_SPEED,
              },
              true,
            );
            const angle = Math.atan2(nx, nz);
            const halfAngle = angle / 2;
            rigidBodyRef.current.setRotation(
              { x: 0, y: Math.sin(halfAngle), z: 0, w: Math.cos(halfAngle) },
              true,
            );
            lastRotationRef.current = angle;
          }
        }
      }
    });

    const hpBlocks = useMemo(() => {
      const blocks = [];
      const blockSize = 0.08;
      const gap = 0.04;
      const totalWidth = hp * blockSize + (hp - 1) * gap;
      const startZ = -totalWidth / 2 + blockSize / 2;

      for (let i = 0; i < hp; i++) {
        blocks.push(
          <mesh key={i} position={[0, 0, startZ + i * (blockSize + gap)]}>
            <boxGeometry args={[blockSize, blockSize, blockSize]} />
            <meshStandardMaterial color={DEFAULT_COLORS.HP_RED} />
          </mesh>,
        );
      }
      return blocks;
    }, [hp]);

    return (
      <RigidBody
        ref={rigidBodyRef}
        type="dynamic"
        position={initialPosition ?? [1, 0.9, 0]}
        lockRotations
        enabledRotations={[false, false, false]}
        colliders={false}
      >
        {/* Ground sphere â€” group 5, only collides with environment (group 4) */}
        <BallCollider
          args={[SHARED_DEFAULTS.COLLIDERS.GROUND_SPHERE.radius]}
          position={[...SHARED_DEFAULTS.COLLIDERS.GROUND_SPHERE.position]}
          collisionGroups={BARBARIAN_GROUND_GROUPS}
        />
        {/* Torso capsule â€” group 2, only triggered by player sword (group 1) */}
        <CapsuleCollider
          args={[
            SHARED_DEFAULTS.COLLIDERS.TORSO.halfHeight,
            SHARED_DEFAULTS.COLLIDERS.TORSO.radius,
          ]}
          position={torsoPosition}
          sensor
          collisionGroups={BARBARIAN_BODY_GROUPS}
          onIntersectionEnter={handleHit}
        />
        {/* Head capsule â€” group 2, only triggered by player sword (group 1) */}
        <CapsuleCollider
          args={[
            SHARED_DEFAULTS.COLLIDERS.HEAD.halfHeight,
            SHARED_DEFAULTS.COLLIDERS.HEAD.radius,
          ]}
          position={headPosition}
          sensor
          collisionGroups={BARBARIAN_BODY_GROUPS}
          onIntersectionEnter={handleHit}
        />
        {/* Hand capsule â€” group 3, only triggers player body (group 0) */}
        {isAttacking && (
          <>
            <CapsuleCollider
              args={[
                BARBARIAN_DEFAULTS.COLLIDERS.HAND.halfHeight,
                BARBARIAN_DEFAULTS.COLLIDERS.HAND.radius,
              ]}
              position={handPosition}
              collisionGroups={BARBARIAN_HAND_GROUPS}
            />
            <mesh position={handPosition}>
              <icosahedronGeometry
                args={[BARBARIAN_DEFAULTS.COLLIDERS.HAND.radius, 1]}
              />
              <meshStandardMaterial color="#778899" />
            </mesh>
          </>
        )}
        {/* HP blocks floating above head */}
        <group
          position={[headPosition[0], headPosition[1] + 0.3, headPosition[2]]}
        >
          {hpBlocks}
        </group>
        <group ref={modelRef}>
          <primitive
            object={model}
            scale={SHARED_DEFAULTS.SCALE}
            position={[0, -0.9, 0]}
          />
        </group>
      </RigidBody>
    );
  },
);
