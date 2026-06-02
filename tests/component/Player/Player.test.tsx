import '@testing-library/jest-dom';
import { expect } from '@jest/globals';
import { create } from '@react-three/test-renderer';
import { Group } from 'three';
import { Player } from '@/app/components/Player/Player';
import {
  CONTROLS_DEFAULTS,
  SHARED_DEFAULTS,
  BARBARIAN_DEFAULTS,
} from '@/app/constants';
import { DebugSettings } from '@/app/components/hooks/useDebugSettings';

const testScene = new Group();

// Mock velocity tracking - must be defined before jest.mock
const mockSetLinvel = jest.fn();
const mockSetRotation = jest.fn();
const mockSetTranslation = jest.fn();

// Store captured onIntersectionEnter callbacks for testing
const capturedColliderCallbacks: { [key: string]: (() => void) | undefined } =
  {};

// Store mocks in a module-level object that can be accessed inside jest.mock
const mocks = {
  mockSetLinvel,
  mockSetRotation,
  mockSetTranslation,
  capturedColliderCallbacks,
};

// Create a mock animation clip
const mockAnimationClip = {
  name: 'TestAnimation',
  duration: 1,
  tracks: [],
  blendMode: 0,
};

jest.mock('@react-three/drei', () => {
  const original = jest.requireActual('@react-three/drei');
  return {
    ...original,
    useFBX: jest.fn(() => ({
      scene: testScene,
      animations: [mockAnimationClip],
    })),
  };
});

jest.mock('../../../app/utils', () => ({
  getAnimationByName: jest.fn(() => mockAnimationClip),
  getBoneList: jest.fn(() => []),
  makeBoneVertexMap: jest.fn(() => ({})),
  getBoneWorldPosition: jest.fn(() => null),
}));

jest.mock('three-stdlib', () => {
  const { Group } = jest.requireActual('three');
  return {
    SkeletonUtils: {
      clone: jest.fn(() => new Group()),
    },
  };
});

jest.mock('three', () => {
  const originalThree = jest.requireActual('three');

  // Create a mock SkeletonHelper that extends Object3D
  class MockSkeletonHelper extends originalThree.Object3D {
    geometry = {
      attributes: {
        position: {
          getX: jest.fn(() => 0),
          getY: jest.fn(() => 0),
          getZ: jest.fn(() => 0),
        },
      },
    };

    constructor() {
      super();
      this.visible = true;
    }
  }

  return {
    ...originalThree,
    SkeletonHelper: MockSkeletonHelper,
  };
});

jest.mock('@react-three/rapier', () => {
  const React = jest.requireActual('react');
  let colliderIndex = 0;
  let sensorColliderIndex = 0;
  return {
    interactionGroups: jest.fn(() => 0),
    RigidBody: React.forwardRef(function MockRigidBody(
      {
        children,
        position,
      }: {
        children: React.ReactNode;
        position?: [number, number, number];
      },
      ref: React.Ref<unknown>,
    ) {
      React.useImperativeHandle(ref, () => ({
        setLinvel: mocks.mockSetLinvel,
        setRotation: mocks.mockSetRotation,
        setTranslation: mocks.mockSetTranslation,
        translation: () => ({ x: 0, y: 0, z: 0 }),
      }));
      // Reset collider indices when RigidBody renders
      colliderIndex = 0;
      sensorColliderIndex = 0;
      return <group position={position}>{children}</group>;
    }),
    BallCollider: () => null,
    CapsuleCollider: ({
      onIntersectionEnter,
      sensor,
    }: {
      onIntersectionEnter?: () => void;
      sensor?: boolean;
    }) => {
      // Capture onIntersectionEnter callbacks for torso (first sensor) and head (second sensor).
      // Use a separate sensorColliderIndex so non-sensor colliders don't shift the count.
      if (sensor && onIntersectionEnter) {
        const colliderName = sensorColliderIndex === 0 ? 'torso' : 'head';
        mocks.capturedColliderCallbacks[colliderName] = onIntersectionEnter;
        sensorColliderIndex++;
      }
      colliderIndex++;
      return null;
    },
  };
});

describe('Player Component', () => {
  const mockKeys = CONTROLS_DEFAULTS.KEYBOARD;
  const defaultSettings: DebugSettings = {
    debugMode: false,
    enableBarbarianWalk: BARBARIAN_DEFAULTS.enableBarbarianWalk,
    barbarianWalkDurationMS: BARBARIAN_DEFAULTS.barbarianWalkDurationMS,
    enableBarbarianAttack: BARBARIAN_DEFAULTS.enableBarbarianAttack,
    attackSpeed: BARBARIAN_DEFAULTS.attackSpeed,
    enableBarbarianJump: BARBARIAN_DEFAULTS.enableBarbarianJump,
    jumpDurationMS: BARBARIAN_DEFAULTS.jumpDurationMS,
    enableBarbarianLeftBlock: BARBARIAN_DEFAULTS.enableBarbarianLeftBlock,
    blockDurationMS: BARBARIAN_DEFAULTS.blockDurationMS,
    enableBarbarianRightBlock: BARBARIAN_DEFAULTS.enableBarbarianRightBlock,
    rightBlockDurationMS: BARBARIAN_DEFAULTS.rightBlockDurationMS,
    enableBarbarianKick: BARBARIAN_DEFAULTS.enableBarbarianKick,
    kickSpeed: BARBARIAN_DEFAULTS.kickSpeed,
    enableBarbarianDuck: BARBARIAN_DEFAULTS.enableBarbarianDuck,
    duckDurationMS: BARBARIAN_DEFAULTS.duckDurationMS,
  };

  describe('Rendering', () => {
    it('should render a group element', async () => {
      const renderer = await create(
        <Player keys={mockKeys} settings={defaultSettings} />,
      );
      const group = renderer.scene.children[0];
      expect(group).toBeDefined();
      expect(group?.type).toBe('Group');
    });

    it('should have correct initial position', async () => {
      const renderer = await create(
        <Player keys={mockKeys} settings={defaultSettings} />,
      );
      const rigidBody = renderer.scene.children[0];
      expect(rigidBody.instance.position.x).toBe(0);
      expect(rigidBody.instance.position.y).toBe(0.9);
      expect(rigidBody.instance.position.z).toBe(0);
    });

    it('should render with idle model', async () => {
      const renderer = await create(
        <Player keys={mockKeys} settings={defaultSettings} />,
      );
      const group = renderer.scene.children[0];
      expect(group).toBeDefined();
    });

    it('should have correct scale', async () => {
      const renderer = await create(
        <Player keys={mockKeys} settings={defaultSettings} />,
      );
      const rigidBody = renderer.scene.children[0];
      // RigidBody (group) -> inner group (modelRef) -> primitive
      const innerGroup = rigidBody.children[0];
      const primitive = innerGroup.children[0];
      // The primitive has scale prop applied directly (uniform scale)
      expect(primitive.instance.scale.x).toBe(0.01);
      expect(primitive.instance.scale.y).toBe(0.01);
      expect(primitive.instance.scale.z).toBe(0.01);
    });
  });

  describe('Movement', () => {
    beforeEach(() => {
      mockSetLinvel.mockClear();
      mockSetRotation.mockClear();
    });

    it('should set negative Z velocity when W key is pressed', async () => {
      const movingKeys = { ...mockKeys, w: true };
      const renderer = await create(
        <Player keys={movingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      expect(mockSetLinvel).toHaveBeenCalledWith(
        { x: 0, y: 0, z: -SHARED_DEFAULTS.MOVE_SPEED },
        true,
      );
    });

    it('should set positive Z velocity when S key is pressed', async () => {
      const movingKeys = { ...mockKeys, s: true };
      const renderer = await create(
        <Player keys={movingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      expect(mockSetLinvel).toHaveBeenCalledWith(
        { x: 0, y: 0, z: SHARED_DEFAULTS.MOVE_SPEED },
        true,
      );
    });

    it('should set negative X velocity when A key is pressed', async () => {
      const movingKeys = { ...mockKeys, a: true };
      const renderer = await create(
        <Player keys={movingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      expect(mockSetLinvel).toHaveBeenCalledWith(
        { x: -SHARED_DEFAULTS.MOVE_SPEED, y: 0, z: 0 },
        true,
      );
    });

    it('should set positive X velocity when D key is pressed', async () => {
      const movingKeys = { ...mockKeys, d: true };
      const renderer = await create(
        <Player keys={movingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      expect(mockSetLinvel).toHaveBeenCalledWith(
        { x: SHARED_DEFAULTS.MOVE_SPEED, y: 0, z: 0 },
        true,
      );
    });

    it('should set zero velocity when no movement keys are pressed', async () => {
      const renderer = await create(
        <Player keys={mockKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      expect(mockSetLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    });

    it('should not rotate to face -Z direction when W key is pressed', async () => {
      const movingKeys = { ...mockKeys, w: true };
      const renderer = await create(
        <Player keys={movingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // W key should NOT rotate to face -Z direction (the old behavior)
      expect(mockSetRotation).not.toHaveBeenCalledWith(
        { x: 0, y: 1, z: 0, w: 0 },
        true,
      );
    });

    it('should not rotate to face +Z direction when S key is pressed', async () => {
      const movingKeys = { ...mockKeys, s: true };
      const renderer = await create(
        <Player keys={movingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // S key should NOT rotate to face +Z direction (the old behavior)
      expect(mockSetRotation).not.toHaveBeenCalledWith(
        { x: 0, y: 0, z: 0, w: 1 },
        true,
      );
    });

    it('should maintain last horizontal rotation when W key is pressed', async () => {
      const movingKeys = { ...mockKeys, w: true };
      const renderer = await create(
        <Player keys={movingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Default lastRotationRef is Math.PI / 2 (facing +X)
      const halfAngle = Math.PI / 4;
      expect(mockSetRotation).toHaveBeenCalledWith(
        { x: 0, y: Math.sin(halfAngle), z: 0, w: Math.cos(halfAngle) },
        true,
      );
    });

    it('should maintain last horizontal rotation when S key is pressed', async () => {
      const movingKeys = { ...mockKeys, s: true };
      const renderer = await create(
        <Player keys={movingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Default lastRotationRef is Math.PI / 2 (facing +X)
      const halfAngle = Math.PI / 4;
      expect(mockSetRotation).toHaveBeenCalledWith(
        { x: 0, y: Math.sin(halfAngle), z: 0, w: Math.cos(halfAngle) },
        true,
      );
    });

    it('should rotate to face -X when A key is pressed', async () => {
      const movingKeys = { ...mockKeys, a: true };
      const renderer = await create(
        <Player keys={movingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // A key should rotate to face -X direction
      expect(mockSetRotation).toHaveBeenCalledWith(
        { x: 0, y: -0.707, z: 0, w: 0.707 },
        true,
      );
    });

    it('should rotate to face +X when D key is pressed', async () => {
      const movingKeys = { ...mockKeys, d: true };
      const renderer = await create(
        <Player keys={movingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // D key should rotate to face +X direction
      expect(mockSetRotation).toHaveBeenCalledWith(
        { x: 0, y: 0.707, z: 0, w: 0.707 },
        true,
      );
    });

    it('should set zero velocity when attacking even with W key pressed', async () => {
      const attackingWithMovementKeys = { ...mockKeys, q: true, w: true };
      const renderer = await create(
        <Player keys={attackingWithMovementKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Attack takes priority - velocity should be zero
      expect(mockSetLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    });

    it('should set zero velocity when attacking even with all movement keys pressed', async () => {
      const attackingWithAllMovement = {
        ...mockKeys,
        q: true,
        w: true,
        a: true,
        s: true,
        d: true,
      };
      const renderer = await create(
        <Player keys={attackingWithAllMovement} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Attack takes priority - velocity should be zero
      expect(mockSetLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    });

    it('should allow movement when not attacking', async () => {
      const movingKeys = { ...mockKeys, w: true, q: false };
      const renderer = await create(
        <Player keys={movingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Not attacking, so movement should work
      expect(mockSetLinvel).toHaveBeenCalledWith(
        { x: 0, y: 0, z: -SHARED_DEFAULTS.MOVE_SPEED },
        true,
      );
    });

    it('should set zero velocity when attacking with E key', async () => {
      const attackingWithE = { ...mockKeys, e: true, w: true };
      const renderer = await create(
        <Player keys={attackingWithE} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // E key attack takes priority - velocity should be zero
      expect(mockSetLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    });

    it('should set zero velocity when crouching with Ctrl key', async () => {
      const crouchingKeys = { ...mockKeys, ctrl: true, w: true };
      const renderer = await create(
        <Player keys={crouchingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Crouch takes priority - velocity should be zero
      expect(mockSetLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    });

    it('should allow horizontal movement when jumping with space key and W key pressed', async () => {
      const jumpingWithMovementKeys = { ...mockKeys, space: true, w: true };
      const renderer = await create(
        <Player keys={jumpingWithMovementKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Jump no longer blocks horizontal movement
      expect(mockSetLinvel).toHaveBeenCalledWith(
        expect.objectContaining({ z: -SHARED_DEFAULTS.MOVE_SPEED }),
        true,
      );
    });

    it('should set positive Y velocity when jumping', async () => {
      const jumpingKeys = { ...mockKeys, space: true };
      const renderer = await create(
        <Player keys={jumpingKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      const lastCall =
        mockSetLinvel.mock.calls[mockSetLinvel.mock.calls.length - 1];
      expect(lastCall[0].y).toBeGreaterThan(0);
    });

    it('should allow horizontal movement when jumping with all movement keys pressed', async () => {
      const jumpingWithAllMovement = {
        ...mockKeys,
        space: true,
        w: true,
        a: true,
        s: true,
        d: true,
      };
      const renderer = await create(
        <Player keys={jumpingWithAllMovement} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Jump no longer blocks horizontal movement; Y should be positive
      const lastCall =
        mockSetLinvel.mock.calls[mockSetLinvel.mock.calls.length - 1];
      expect(lastCall[0].y).toBeGreaterThan(0);
    });

    it('should set zero velocity when crouching even with all movement keys pressed', async () => {
      const crouchingWithAllMovement = {
        ...mockKeys,
        ctrl: true,
        w: true,
        a: true,
        s: true,
        d: true,
      };
      const renderer = await create(
        <Player keys={crouchingWithAllMovement} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Crouch takes priority - velocity should be zero
      expect(mockSetLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    });

    it('should set zero velocity when crouch attacking with Ctrl + Q keys', async () => {
      const crouchAttackKeys = { ...mockKeys, ctrl: true, q: true };
      const renderer = await create(
        <Player keys={crouchAttackKeys} settings={defaultSettings} />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Crouch attack takes priority - velocity should be zero
      expect(mockSetLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    });

    it('should set zero velocity when crouch attacking even with all movement keys pressed', async () => {
      const crouchAttackWithAllMovement = {
        ...mockKeys,
        ctrl: true,
        q: true,
        w: true,
        a: true,
        s: true,
        d: true,
      };
      const renderer = await create(
        <Player
          keys={crouchAttackWithAllMovement}
          settings={defaultSettings}
        />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Crouch attack takes priority - velocity should be zero
      expect(mockSetLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    });

    it('should set zero velocity when special attacking with E key even with W key pressed', async () => {
      const specialAttackingWithMovementKeys = {
        ...mockKeys,
        e: true,
        w: true,
      };
      const renderer = await create(
        <Player
          keys={specialAttackingWithMovementKeys}
          settings={defaultSettings}
        />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Special attack takes priority - velocity should be zero
      expect(mockSetLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    });

    it('should set zero velocity when special attacking even with all movement keys pressed', async () => {
      const specialAttackWithAllMovement = {
        ...mockKeys,
        e: true,
        w: true,
        a: true,
        s: true,
        d: true,
      };
      const renderer = await create(
        <Player
          keys={specialAttackWithAllMovement}
          settings={defaultSettings}
        />,
      );
      await renderer.advanceFrames(1, 1 / 60);

      // Special attack takes priority - velocity should be zero
      expect(mockSetLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    });
  });

  describe('Hit Detection', () => {
    beforeEach(() => {
      // Clear captured callbacks before each test
      mocks.capturedColliderCallbacks.torso = undefined;
      mocks.capturedColliderCallbacks.head = undefined;
    });

    it('should call onHit when torso collider is hit', async () => {
      const mockOnHit = jest.fn();
      await create(
        <Player keys={mockKeys} settings={defaultSettings} onHit={mockOnHit} />,
      );

      // Simulate torso hit
      if (mocks.capturedColliderCallbacks.torso) {
        mocks.capturedColliderCallbacks.torso();
      }

      expect(mockOnHit).toHaveBeenCalledTimes(1);
    });

    it('should call onHit when head collider is hit', async () => {
      const mockOnHit = jest.fn();
      await create(
        <Player keys={mockKeys} settings={defaultSettings} onHit={mockOnHit} />,
      );

      // Simulate head hit
      if (mocks.capturedColliderCallbacks.head) {
        mocks.capturedColliderCallbacks.head();
      }

      expect(mockOnHit).toHaveBeenCalledTimes(1);
    });

    it('should call onHit multiple times for multiple hits', async () => {
      const mockOnHit = jest.fn();
      await create(
        <Player keys={mockKeys} settings={defaultSettings} onHit={mockOnHit} />,
      );

      // Simulate multiple hits
      if (mocks.capturedColliderCallbacks.torso) {
        mocks.capturedColliderCallbacks.torso();
        mocks.capturedColliderCallbacks.torso();
      }
      if (mocks.capturedColliderCallbacks.head) {
        mocks.capturedColliderCallbacks.head();
      }

      expect(mockOnHit).toHaveBeenCalledTimes(3);
    });

    it('should not throw when onHit is not provided', async () => {
      await expect(
        create(<Player keys={mockKeys} settings={defaultSettings} />),
      ).resolves.not.toThrow();
    });
  });
});
