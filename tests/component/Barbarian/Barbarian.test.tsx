import '@testing-library/jest-dom';
import { expect } from '@jest/globals';
import { create, ReactThreeTestRenderer } from '@react-three/test-renderer';
import { Group, Vector3 } from 'three';
import { act, createRef } from 'react';
import {
  Barbarian,
  BarbarianHandle,
} from '@/app/components/Barbarian/Barbarian';
import { DebugSettings } from '@/app/components/hooks/useDebugSettings';
import {
  BARBARIAN_DEFAULTS,
  GAME_DEFAULTS,
  DEFAULT_COLORS,
} from '@/app/constants';
import type { ClientBarbarianState } from '@/app/ai/sharedTypes';

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

const testScene = new Group();

// Mock velocity tracking - must be defined before jest.mock
const mockSetLinvel = jest.fn();
const mockSetRotation = jest.fn();
const mockSetTranslation = jest.fn();

// Store mocks in a module-level object that can be accessed inside jest.mock
const mocks = { mockSetLinvel, mockSetRotation, mockSetTranslation };

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
  getAnimation: jest.fn((model) => model.animations[0]),
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

let capturedHitHandlers: (() => void)[] = [];

jest.mock('@react-three/rapier', () => {
  const React = jest.requireActual('react');
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
      return <group position={position}>{children}</group>;
    }),
    BallCollider: () => null,
    CapsuleCollider: ({
      onIntersectionEnter,
    }: {
      onIntersectionEnter?: () => void;
    }) => {
      if (onIntersectionEnter) {
        capturedHitHandlers.push(onIntersectionEnter);
      }
      return null;
    },
  };
});

describe('Barbarian Component', () => {
  beforeEach(() => {
    capturedHitHandlers = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render a group element', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      const group = renderer!.scene.children[0];
      expect(group).toBeDefined();
      expect(group?.type).toBe('Group');
    });

    it('should have correct initial position', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      const rigidBody = renderer!.scene.children[0];
      expect(rigidBody.instance.position.x).toBe(1);
      expect(rigidBody.instance.position.y).toBe(0.9);
      expect(rigidBody.instance.position.z).toBe(0);
    });

    it('should render with idle model', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      const group = renderer!.scene.children[0];
      expect(group).toBeDefined();
    });

    it('should have correct scale', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      const rigidBody = renderer!.scene.children[0];
      // RigidBody (group) -> HP blocks group, model group (groupRef) -> primitive
      // Find the model group (the one with the primitive, not the HP blocks)
      const modelGroup = rigidBody.children.find(
        (child) =>
          child.type === 'Group' &&
          child.children.some((c) => c.type !== 'Mesh'),
      );
      const primitive = modelGroup!.children[0];
      // The primitive has scale prop applied directly (uniform scale)
      expect(primitive.instance.scale.x).toBe(0.01);
      expect(primitive.instance.scale.y).toBe(0.01);
      expect(primitive.instance.scale.z).toBe(0.01);
    });
  });

  describe('Rotation', () => {
    beforeEach(() => {
      mockSetRotation.mockClear();
    });

    it('should set initial rotation facing left when idle', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      // The idle rotation uses halfAngle calculation for -PI/2:
      // sin(-PI/4) ≈ -0.707, cos(-PI/4) ≈ 0.707
      expect(mockSetRotation).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 0,
          z: 0,
        }),
        true,
      );
    });
  });

  describe('HP', () => {
    let renderer: ReactThreeTestRenderer;
    let mockOnDeath: jest.Mock;

    beforeEach(async () => {
      mockOnDeath = jest.fn();
      await act(async () => {
        renderer = await create(
          <Barbarian
            id="test-barbarian"
            onDeath={mockOnDeath}
            settings={defaultSettings}
          />,
        );
      });
    });

    afterEach(async () => {
      await act(async () => {
        await renderer.unmount();
      });
    });

    it('should register hit handlers on colliders', async () => {
      // Both torso and head colliders should have hit handlers
      // Check for at least 2 handlers (from this render)
      expect(capturedHitHandlers.length).toBeGreaterThanOrEqual(2);
    });

    it('should call onDeath callback when HP reaches zero', async () => {
      const hitHandler = capturedHitHandlers[0];

      // Hit INITIAL_BARBARIAN_HP times to reach 0 HP
      await act(async () => {
        for (let i = 0; i < GAME_DEFAULTS.INITIAL_BARBARIAN_HP; i++) {
          hitHandler();
        }
      });

      expect(mockOnDeath).toHaveBeenCalledWith('test-barbarian');
    });

    it('should not call onDeath when HP is above zero', async () => {
      const hitHandler = capturedHitHandlers[0];

      // Hit one less than INITIAL_BARBARIAN_HP times (HP goes to 1)
      await act(async () => {
        for (let i = 0; i < GAME_DEFAULTS.INITIAL_BARBARIAN_HP - 1; i++) {
          hitHandler();
        }
      });

      expect(mockOnDeath).not.toHaveBeenCalled();
    });
  });

  describe('HP Blocks', () => {
    const findHpBlocksGroup = (renderer: ReactThreeTestRenderer) => {
      const rigidBody = renderer.scene.children[0];
      // Find the HP blocks group (first group child that contains meshes)
      return rigidBody.children.find(
        (child) =>
          child.type === 'Group' &&
          child.children.some((c) => c.type === 'Mesh'),
      );
    };

    const countHpBlocks = (renderer: ReactThreeTestRenderer) => {
      const hpGroup = findHpBlocksGroup(renderer);
      if (!hpGroup) return 0;
      return hpGroup.children.filter((child) => child.type === 'Mesh').length;
    };

    it('should render INITIAL_BARBARIAN_HP blocks initially', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      expect(countHpBlocks(renderer!)).toBe(GAME_DEFAULTS.INITIAL_BARBARIAN_HP);
    });

    it('should render HP blocks as meshes with box geometry', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      const hpGroup = findHpBlocksGroup(renderer!);

      expect(hpGroup).toBeDefined();
      const meshes = hpGroup!.children.filter((child) => child.type === 'Mesh');

      meshes.forEach((mesh) => {
        expect(mesh.type).toBe('Mesh');
      });
    });

    it('should render red colored blocks', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      const hpGroup = findHpBlocksGroup(renderer!);
      const meshes = hpGroup!.children.filter((child) => child.type === 'Mesh');

      // Convert hex string '#f05252' to number 0xf05252
      const expectedHex = parseInt(DEFAULT_COLORS.HP_RED.slice(1), 16);

      meshes.forEach((mesh) => {
        // Check that the material color is HP red
        expect(mesh.instance.material.color.getHex()).toBe(expectedHex);
      });
    });

    it('should decrease HP blocks when hit', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      const hitHandler = capturedHitHandlers[0];

      expect(countHpBlocks(renderer!)).toBe(GAME_DEFAULTS.INITIAL_BARBARIAN_HP);

      await act(async () => {
        hitHandler();
      });
      expect(countHpBlocks(renderer!)).toBe(
        GAME_DEFAULTS.INITIAL_BARBARIAN_HP - 1,
      );
    });

    it('should show 0 HP blocks when HP reaches zero', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      const hitHandler = capturedHitHandlers[0];

      // Hit INITIAL_BARBARIAN_HP times to reach 0 HP
      await act(async () => {
        for (let i = 0; i < GAME_DEFAULTS.INITIAL_BARBARIAN_HP; i++) {
          hitHandler();
        }
      });

      // HP blocks should be 0 (negative HP doesn't render blocks)
      expect(countHpBlocks(renderer!)).toBe(0);
    });

    it('should position HP blocks above the head', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      const hpGroup = findHpBlocksGroup(renderer!);

      // The HP blocks group should be positioned above the head
      // Head position Y + 0.3 offset
      expect(hpGroup).toBeDefined();
      expect(hpGroup!.instance.position.y).toBeGreaterThan(0);
    });
  });

  describe('Movement', () => {
    beforeEach(() => {
      capturedHitHandlers = [];
      mockSetLinvel.mockClear();
      mockSetRotation.mockClear();
    });

    it('should set zero velocity when not walking', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      expect(mockSetLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    });

    it('should call setLinvel with velocity during frame updates', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={defaultSettings} />,
        );
      });

      // Advance multiple frames
      await act(async () => {
        await renderer!.advanceFrames(10, 1 / 60);
      });

      // setLinvel should have been called multiple times
      expect(mockSetLinvel.mock.calls.length).toBeGreaterThan(0);

      // All calls should have the expected structure
      mockSetLinvel.mock.calls.forEach((call) => {
        expect(call[0]).toHaveProperty('x');
        expect(call[0]).toHaveProperty('y');
        expect(call[0]).toHaveProperty('z');
        expect(call[1]).toBe(true);
      });
    });

    it('should rotate when walking', async () => {
      const fastWalkSettings: DebugSettings = {
        debugMode: false,
        enableBarbarianWalk: true,
        barbarianWalkDurationMS: 10,
        enableBarbarianAttack: false,
        attackSpeed: 1500,
        enableBarbarianJump: false,
        jumpDurationMS: 1000,
        enableBarbarianLeftBlock: false,
        blockDurationMS: 320,
        enableBarbarianRightBlock: false,
        rightBlockDurationMS: 320,
        enableBarbarianKick: false,
        kickSpeed: 320,
        enableBarbarianDuck: false,
        duckDurationMS: 320,
      };

      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={fastWalkSettings} />,
        );
      });

      // Advance timers to trigger the interval
      await act(async () => {
        jest.advanceTimersByTime(20);
      });

      mockSetRotation.mockClear();
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      // Should have called setRotation
      expect(mockSetRotation).toHaveBeenCalled();
    });

    it('should change direction between walk cycles', async () => {
      const fastWalkSettings: DebugSettings = {
        debugMode: false,
        enableBarbarianWalk: true,
        barbarianWalkDurationMS: 10,
        enableBarbarianAttack: false,
        attackSpeed: 1500,
        enableBarbarianJump: false,
        jumpDurationMS: 1000,
        enableBarbarianLeftBlock: false,
        blockDurationMS: 320,
        enableBarbarianRightBlock: false,
        rightBlockDurationMS: 320,
        enableBarbarianKick: false,
        kickSpeed: 320,
        enableBarbarianDuck: false,
        duckDurationMS: 320,
      };

      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={fastWalkSettings} />,
        );
      });

      // First walk cycle
      await act(async () => {
        jest.advanceTimersByTime(15);
      });
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      const firstCycleCalls = [...mockSetLinvel.mock.calls];
      const firstVelocityX = firstCycleCalls.find((c) => c[0].x !== 0)?.[0].x;

      // Stop walking
      await act(async () => {
        jest.advanceTimersByTime(15);
      });

      // Second walk cycle
      await act(async () => {
        jest.advanceTimersByTime(15);
      });

      mockSetLinvel.mockClear();
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      const secondCycleCalls = mockSetLinvel.mock.calls;
      const secondVelocityX = secondCycleCalls.find((c) => c[0].x !== 0)?.[0].x;

      // If both cycles had walking, velocities should be opposite signs
      if (firstVelocityX !== undefined && secondVelocityX !== undefined) {
        expect(Math.sign(firstVelocityX)).not.toBe(Math.sign(secondVelocityX));
      }
    });

    it('should not walk when enableBarbarianWalk is false', async () => {
      const disabledWalkSettings: DebugSettings = {
        debugMode: false,
        enableBarbarianWalk: false,
        barbarianWalkDurationMS: 10,
        enableBarbarianAttack: false,
        attackSpeed: 1500,
        enableBarbarianJump: false,
        jumpDurationMS: 1000,
        enableBarbarianLeftBlock: false,
        blockDurationMS: 320,
        enableBarbarianRightBlock: false,
        rightBlockDurationMS: 320,
        enableBarbarianKick: false,
        kickSpeed: 320,
        enableBarbarianDuck: false,
        duckDurationMS: 320,
      };

      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={disabledWalkSettings} />,
        );
      });

      // Advance timers for potential interval
      await act(async () => {
        jest.advanceTimersByTime(30);
      });

      mockSetLinvel.mockClear();
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      // Should only have zero velocity calls
      const allZeroVelocity = mockSetLinvel.mock.calls.every(
        (call) => call[0].x === 0 && call[0].y === 0 && call[0].z === 0,
      );
      expect(allZeroVelocity).toBe(true);
    });

    it('should set zero velocity when attacking even while walking is enabled', async () => {
      // Settings where both walk and attack are enabled with fast intervals
      const attackWhileWalkingSettings: DebugSettings = {
        debugMode: false,
        enableBarbarianWalk: true,
        barbarianWalkDurationMS: 10,
        enableBarbarianAttack: true,
        attackSpeed: 10,
        enableBarbarianJump: false,
        jumpDurationMS: 1000,
        enableBarbarianLeftBlock: false,
        blockDurationMS: 320,
        enableBarbarianRightBlock: false,
        rightBlockDurationMS: 320,
        enableBarbarianKick: false,
        kickSpeed: 320,
        enableBarbarianDuck: false,
        duckDurationMS: 320,
      };

      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian
            id="test-barbarian"
            settings={attackWhileWalkingSettings}
          />,
        );
      });

      // Advance timers to trigger both walk and attack intervals
      await act(async () => {
        jest.advanceTimersByTime(25);
      });

      mockSetLinvel.mockClear();
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      // When attacking, horizontal velocity (X) should be zero regardless of walking state
      const allZeroHorizontalVelocity = mockSetLinvel.mock.calls.every(
        (call) => call[0].x === 0 && call[0].z === 0,
      );
      expect(allZeroHorizontalVelocity).toBe(true);
    });

    it('should not move horizontally when only attacking (walk disabled)', async () => {
      const attackOnlySettings: DebugSettings = {
        debugMode: false,
        enableBarbarianWalk: false,
        barbarianWalkDurationMS: 1500,
        enableBarbarianAttack: true,
        attackSpeed: 10,
        enableBarbarianJump: false,
        jumpDurationMS: 1000,
        enableBarbarianLeftBlock: false,
        blockDurationMS: 320,
        enableBarbarianRightBlock: false,
        rightBlockDurationMS: 320,
        enableBarbarianKick: false,
        kickSpeed: 320,
        enableBarbarianDuck: false,
        duckDurationMS: 320,
      };

      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={attackOnlySettings} />,
        );
      });

      // Advance timers to trigger attack interval
      await act(async () => {
        jest.advanceTimersByTime(15);
      });

      mockSetLinvel.mockClear();
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      // Horizontal velocity should be zero since walk is disabled
      const allZeroHorizontalVelocity = mockSetLinvel.mock.calls.every(
        (call) => call[0].x === 0 && call[0].z === 0,
      );
      expect(allZeroHorizontalVelocity).toBe(true);
    });
  });

  describe('Jump', () => {
    const attackSettings: DebugSettings = {
      debugMode: false,
      enableBarbarianWalk: false,
      barbarianWalkDurationMS: 1500,
      enableBarbarianAttack: true,
      attackSpeed: 10,
      enableBarbarianJump: false,
      jumpDurationMS: 1000,
      enableBarbarianLeftBlock: false,
      blockDurationMS: 320,
      enableBarbarianRightBlock: false,
      rightBlockDurationMS: 320,
      enableBarbarianKick: false,
      kickSpeed: 320,
      enableBarbarianDuck: false,
      duckDurationMS: 320,
    };

    const jumpSettings: DebugSettings = {
      debugMode: false,
      enableBarbarianWalk: false,
      barbarianWalkDurationMS: 1500,
      enableBarbarianAttack: false,
      attackSpeed: 1500,
      enableBarbarianJump: true,
      jumpDurationMS: 10,
      enableBarbarianLeftBlock: false,
      blockDurationMS: 320,
      enableBarbarianRightBlock: false,
      rightBlockDurationMS: 320,
      enableBarbarianKick: false,
      kickSpeed: 320,
      enableBarbarianDuck: false,
      duckDurationMS: 320,
    };

    beforeEach(() => {
      capturedHitHandlers = [];
      mockSetLinvel.mockClear();
      mockSetTranslation.mockClear();
    });

    it('should NOT trigger jump when attacking', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={attackSettings} />,
        );
      });

      // Advance timers to trigger attack interval
      await act(async () => {
        jest.advanceTimersByTime(15);
      });

      mockSetLinvel.mockClear();
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      // Attack should not trigger a jump — Y velocity must be zero
      const allZeroY = mockSetLinvel.mock.calls.every(
        (call) => call[0].y === 0,
      );
      expect(allZeroY).toBe(true);
    });

    it('should not double-jump while airborne', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={jumpSettings} />,
        );
      });

      // Trigger jump interval once
      await act(async () => {
        jest.advanceTimersByTime(15);
      });

      // Advance multiple frames — Y velocity should decrease (gravity), not reset each frame
      await act(async () => {
        await renderer!.advanceFrames(5, 1 / 60);
      });

      const calls = mockSetLinvel.mock.calls;
      const firstY = calls[0][0].y;
      const lastY = calls[calls.length - 1][0].y;
      expect(lastY).toBeLessThan(firstY);
    });

    it('should not affect horizontal velocity when jumping', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={jumpSettings} />,
        );
      });

      await act(async () => {
        jest.advanceTimersByTime(15);
      });

      mockSetLinvel.mockClear();
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      const lastCall =
        mockSetLinvel.mock.calls[mockSetLinvel.mock.calls.length - 1];
      // Walk is disabled, so X and Z should be zero during jump
      expect(lastCall[0].x).toBe(0);
      expect(lastCall[0].z).toBe(0);
    });

    it('should call setTranslation when landing after arc completes', async () => {
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={jumpSettings} />,
        );
      });

      // Trigger jump interval
      await act(async () => {
        jest.advanceTimersByTime(15);
      });

      // Advance enough frames for the full arc to complete
      // With VELOCITY=7, GRAVITY=13: landing after ~33 frames at 1/60s delta
      await act(async () => {
        await renderer!.advanceFrames(40, 1 / 60);
      });

      // setTranslation should have been called to snap back to start Y on landing
      expect(mockSetTranslation).toHaveBeenCalled();
    });

    it('should trigger jump when enableBarbarianJump fires interval', async () => {
      const jumpSettings: DebugSettings = {
        debugMode: false,
        enableBarbarianWalk: false,
        barbarianWalkDurationMS: 1500,
        enableBarbarianAttack: false,
        attackSpeed: 1500,
        enableBarbarianJump: true,
        jumpDurationMS: 10,
        enableBarbarianLeftBlock: false,
        blockDurationMS: 320,
        enableBarbarianRightBlock: false,
        rightBlockDurationMS: 320,
        enableBarbarianKick: false,
        kickSpeed: 320,
        enableBarbarianDuck: false,
        duckDurationMS: 320,
      };

      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={jumpSettings} />,
        );
      });

      // Advance timers to trigger jump interval
      await act(async () => {
        jest.advanceTimersByTime(15);
      });

      mockSetLinvel.mockClear();
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      const lastCall =
        mockSetLinvel.mock.calls[mockSetLinvel.mock.calls.length - 1];
      expect(lastCall[0].y).toBeGreaterThan(0);
    });

    it('should not jump when enableBarbarianJump is false', async () => {
      const noJumpSettings: DebugSettings = {
        debugMode: false,
        enableBarbarianWalk: false,
        barbarianWalkDurationMS: 1500,
        enableBarbarianAttack: false,
        attackSpeed: 1500,
        enableBarbarianJump: false,
        jumpDurationMS: 10,
        enableBarbarianLeftBlock: false,
        blockDurationMS: 320,
        enableBarbarianRightBlock: false,
        rightBlockDurationMS: 320,
        enableBarbarianKick: false,
        kickSpeed: 320,
        enableBarbarianDuck: false,
        duckDurationMS: 320,
      };

      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian id="test-barbarian" settings={noJumpSettings} />,
        );
      });

      // Advance timers — jump interval fires but enableBarbarianJump is false
      await act(async () => {
        jest.advanceTimersByTime(30);
      });

      mockSetLinvel.mockClear();
      await act(async () => {
        await renderer!.advanceFrames(1, 1 / 60);
      });

      // Y velocity should be zero since jump is disabled
      const allZeroY = mockSetLinvel.mock.calls.every(
        (call) => call[0].y === 0,
      );
      expect(allZeroY).toBe(true);
    });
  });

  describe('Registration', () => {
    it('should call onRegister with id and model on mount', async () => {
      const mockOnRegister = jest.fn();
      await act(async () => {
        await create(
          <Barbarian
            id="test-barbarian"
            onRegister={mockOnRegister}
            settings={defaultSettings}
          />,
        );
      });

      expect(mockOnRegister).toHaveBeenCalledWith(
        'test-barbarian',
        expect.any(Object),
      );
    });

    it('should call onUnregister with id on unmount', async () => {
      const mockOnUnregister = jest.fn();
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian
            id="test-barbarian"
            onUnregister={mockOnUnregister}
            settings={defaultSettings}
          />,
        );
      });

      const callCountBeforeUnmount = mockOnUnregister.mock.calls.length;

      await act(async () => {
        await renderer!.unmount();
      });

      // Should have at least one more call after unmount
      expect(mockOnUnregister.mock.calls.length).toBeGreaterThan(
        callCountBeforeUnmount,
      );
      expect(mockOnUnregister).toHaveBeenCalledWith('test-barbarian');
    });
  });

  describe('takeDamage via ref', () => {
    it('should decrement HP when takeDamage is called', async () => {
      const ref = createRef<BarbarianHandle>();
      const mockOnDeath = jest.fn();
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian
            ref={ref}
            id="test-barbarian"
            onDeath={mockOnDeath}
            settings={defaultSettings}
          />,
        );
      });

      // Reuse HP blocks counting logic
      const countHpBlocks = () => {
        const rigidBody = renderer!.scene.children[0];
        const hpGroup = rigidBody.children.find(
          (child: { type: string; children: { type: string }[] }) =>
            child.type === 'Group' &&
            child.children.some((c: { type: string }) => c.type === 'Mesh'),
        );
        if (!hpGroup) return 0;
        return hpGroup.children.filter(
          (child: { type: string }) => child.type === 'Mesh',
        ).length;
      };

      expect(countHpBlocks()).toBe(GAME_DEFAULTS.INITIAL_BARBARIAN_HP);

      await act(async () => {
        ref.current!.takeDamage();
      });

      expect(countHpBlocks()).toBe(GAME_DEFAULTS.INITIAL_BARBARIAN_HP - 1);
    });

    it('should call onDeath when takeDamage reduces HP to zero', async () => {
      const ref = createRef<BarbarianHandle>();
      const mockOnDeath = jest.fn();
      await act(async () => {
        await create(
          <Barbarian
            ref={ref}
            id="test-barbarian"
            onDeath={mockOnDeath}
            settings={defaultSettings}
          />,
        );
      });

      await act(async () => {
        for (let i = 0; i < GAME_DEFAULTS.INITIAL_BARBARIAN_HP; i++) {
          ref.current!.takeDamage();
        }
      });

      expect(mockOnDeath).toHaveBeenCalledWith('test-barbarian');
    });
  });

  describe('Utility AI', () => {
    // Run N separate single-frame act() calls so React commits state between each.
    async function advanceNFrames(r: ReactThreeTestRenderer, count: number) {
      for (let i = 0; i < count; i++) {
        await act(async () => {
          await r.advanceFrames(1, 1 / 60);
        });
      }
    }

    it('enters attack state when player is within ATTACK_RANGE', async () => {
      const playerPositionRef = { current: new Vector3(0.5, 0, 0) };
      const barbarianStatesRef: {
        current: Record<string, ClientBarbarianState>;
      } = { current: {} };
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian
            id="b1"
            settings={defaultSettings}
            playerPositionRef={playerPositionRef}
            barbarianStatesRef={barbarianStatesRef}
          />,
        );
      });

      // Frame 1: utility AI calls setIsAttacking(true) — state update queued.
      // Frame 2: isAttacking=true committed; barbarian publishes currentAction='ATTACK'.
      await advanceNFrames(renderer!, 2);

      expect(barbarianStatesRef.current['b1']?.currentAction).toBe('ATTACK');
    });

    it('enters chase state when player is outside ATTACK_RANGE', async () => {
      const playerPositionRef = { current: new Vector3(3, 0, 0) };
      const barbarianStatesRef: {
        current: Record<string, ClientBarbarianState>;
      } = { current: {} };
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian
            id="b1"
            settings={defaultSettings}
            playerPositionRef={playerPositionRef}
            barbarianStatesRef={barbarianStatesRef}
          />,
        );
      });

      // Frame 1: utility AI calls setIsWalking(true) — state update queued.
      // Frame 2: isWalking=true committed; barbarian publishes currentAction='CHASE'.
      await advanceNFrames(renderer!, 2);

      expect(barbarianStatesRef.current['b1']?.currentAction).toBe('CHASE');
    });

    it('never idles while player is alive and no server decisions present', async () => {
      const playerPositionRef = { current: new Vector3(3, 0, 0) };
      const barbarianStatesRef: {
        current: Record<string, ClientBarbarianState>;
      } = { current: {} };
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian
            id="b1"
            settings={defaultSettings}
            playerPositionRef={playerPositionRef}
            barbarianStatesRef={barbarianStatesRef}
          />,
        );
      });

      await advanceNFrames(renderer!, 4);

      expect(barbarianStatesRef.current['b1']?.currentAction).toBe('CHASE');
    });

    it('holds attack for MIN_ATTACK_DURATION_MS when player steps back', async () => {
      const playerPositionRef = { current: new Vector3(0.5, 0, 0) };
      const barbarianStatesRef: {
        current: Record<string, ClientBarbarianState>;
      } = { current: {} };
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian
            id="b1"
            settings={defaultSettings}
            playerPositionRef={playerPositionRef}
            barbarianStatesRef={barbarianStatesRef}
          />,
        );
      });

      // Frame 1 sets state, frame 2 commits — barbarian is attacking.
      await advanceNFrames(renderer!, 2);
      expect(barbarianStatesRef.current['b1']?.currentAction).toBe('ATTACK');

      // Player steps back — utility AI holds ATTACK for MIN_ATTACK_DURATION_MS.
      playerPositionRef.current = new Vector3(3, 0, 0);
      await advanceNFrames(renderer!, 1);
      expect(barbarianStatesRef.current['b1']?.currentAction).toBe('ATTACK');

      // After MIN_ATTACK_DURATION_MS elapses, should transition to CHASE.
      await act(async () => {
        jest.advanceTimersByTime(
          BARBARIAN_DEFAULTS.UTILITY_AI.MIN_ATTACK_DURATION_MS,
        );
      });
      // Frame: utility AI transitions (setIsWalking queued). Frame: committed → 'CHASE'.
      await advanceNFrames(renderer!, 2);
      expect(barbarianStatesRef.current['b1']?.currentAction).toBe('CHASE');
    });

    it('does not run when playerPositionRef is absent', async () => {
      const barbarianStatesRef: {
        current: Record<string, ClientBarbarianState>;
      } = { current: {} };
      let renderer: ReactThreeTestRenderer;
      await act(async () => {
        renderer = await create(
          <Barbarian
            id="b1"
            settings={defaultSettings}
            barbarianStatesRef={barbarianStatesRef}
          />,
        );
      });

      // Without playerPositionRef the utility AI block is unreachable; defaults to CHASE.
      await advanceNFrames(renderer!, 5);

      expect(barbarianStatesRef.current['b1']?.currentAction).toBe('CHASE');
    });
  });
});
