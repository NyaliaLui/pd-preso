import '@testing-library/jest-dom';
import { expect } from '@jest/globals';
import { create } from '@react-three/test-renderer';
import { Texture, RepeatWrapping, Vector3 } from 'three';
import { World } from '@/app/components/World/World';
import { ENVIRONMENT_DEFAULTS } from '@/app/constants';

const testTexture = new Texture();
testTexture.wrapS = testTexture.wrapT = RepeatWrapping;

jest.mock('@react-three/drei', () => {
  const original = jest.requireActual('@react-three/drei');
  return {
    ...original,
    useTexture: jest.fn(() => {
      return testTexture;
    }),
  };
});

jest.mock('@react-three/rapier', () => {
  const React = jest.requireActual('react');
  return {
    interactionGroups: jest.fn(() => 0),
    RigidBody: React.forwardRef(function MockRigidBody(
      {
        children,
        position,
      }: { children: React.ReactNode; position?: [number, number, number] },
      ref: React.Ref<unknown>,
    ) {
      React.useImperativeHandle(ref, () => ({
        setNextKinematicTranslation: jest.fn(),
      }));
      return React.createElement('group', { position }, children);
    }),
    CuboidCollider: () => null,
  };
});

describe('World Component', () => {
  it('renders the correct number of grass blocks and platforms', async () => {
    const playerPositionRef = { current: new Vector3(0, 0, 0) };
    const renderer = await create(
      <World playerPositionRef={playerPositionRef} />,
    );
    const { width, height, depth, screenFillCount, extraCount } =
      ENVIRONMENT_DEFAULTS.groundBlock;
    const totalBlocks = screenFillCount + extraCount;
    const { spawnInterval } = ENVIRONMENT_DEFAULTS.platform;
    const numPlatforms = Math.floor(totalBlocks / spawnInterval);

    // totalBlocks grass + numPlatforms platforms + 2 pillars + 1 floor collider
    const NUM_PILLARS = 2;
    const NUM_FLOOR = 1;
    expect(renderer.scene.children.length).toBe(
      totalBlocks + numPlatforms + NUM_PILLARS + NUM_FLOOR,
    );

    // Every block child is a grass-textured box
    for (let i = 0; i < totalBlocks; i++) {
      const block = renderer.scene.children[i];
      expect(block.type).toBe('Mesh');
      expect(block.props.receiveShadow).toBe(true);
      expect(block.allChildren[0].type).toBe('BoxGeometry');
      expect(block.allChildren[0].props.args).toEqual([width, height, depth]);
      expect(block.allChildren[1].type).toBe('MeshStandardMaterial');
      expect(block.allChildren[1].props.map).toEqual(testTexture);
    }

    // Platform children are mocked RigidBody instances (render as Group)
    for (let i = 0; i < numPlatforms; i++) {
      const platform = renderer.scene.children[totalBlocks + i];
      expect(platform.type).toBe('Group'); // Boulder's mocked RigidBody
    }

    // GrassPillar instances (leftmost and rightmost blocks)
    for (let i = 0; i < NUM_PILLARS; i++) {
      const pillar = renderer.scene.children[totalBlocks + numPlatforms + i];
      expect(pillar.type).toBe('Group'); // GrassPillar's mocked RigidBody
    }

    // Invisible floor collider
    const floor =
      renderer.scene.children[totalBlocks + numPlatforms + NUM_PILLARS];
    expect(floor.type).toBe('Group'); // floor RigidBody
  });
});
