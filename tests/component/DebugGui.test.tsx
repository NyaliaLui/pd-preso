import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import {
  expect,
  describe,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { DebugGui } from '@/app/components/DebugGui';
import { DEFAULT_DEBUG_SETTINGS } from '@/app/components/hooks/useDebugSettings';

describe('DebugGui Component', () => {
  const mockOnSettingsChange = jest.fn();

  beforeEach(() => {
    mockOnSettingsChange.mockClear();
  });

  afterEach(() => {
    // Clean up Leva's store between tests
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <DebugGui
          settings={DEFAULT_DEBUG_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      // Leva is hidden by default, so the container should be in the document
      expect(container).toBeInTheDocument();
    });

    it('should be hidden by default', () => {
      render(
        <DebugGui
          settings={DEFAULT_DEBUG_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      // When hidden, Leva panel should not be visible
      const levaPanel = document.querySelector('.leva-c-kWgxhW');
      expect(levaPanel).toBeNull();
    });

    it('should show panel when hidden is false', () => {
      render(
        <DebugGui
          settings={DEFAULT_DEBUG_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
          hidden={false}
        />,
      );

      // When not hidden, Leva panel should be visible with Debug Settings
      expect(screen.getByText('Show Hit & Hurt Boxes')).toBeInTheDocument();
    });

    it('should hide panel when hidden is true', () => {
      render(
        <DebugGui
          settings={DEFAULT_DEBUG_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
          hidden={true}
        />,
      );

      // When hidden, control labels should not be in the document
      expect(screen.queryByText('Show Hit & Hurt Boxes')).toBeNull();
    });
  });

  describe('Settings Change', () => {
    it('should call onSettingsChange on initial render', () => {
      render(
        <DebugGui
          settings={DEFAULT_DEBUG_SETTINGS}
          onSettingsChange={mockOnSettingsChange}
        />,
      );

      expect(mockOnSettingsChange).toHaveBeenCalledWith({
        debugMode: DEFAULT_DEBUG_SETTINGS.debugMode,
        enableBarbarianWalk: DEFAULT_DEBUG_SETTINGS.enableBarbarianWalk,
        barbarianWalkDurationMS: DEFAULT_DEBUG_SETTINGS.barbarianWalkDurationMS,
        enableBarbarianAttack: DEFAULT_DEBUG_SETTINGS.enableBarbarianAttack,
        attackSpeed: DEFAULT_DEBUG_SETTINGS.attackSpeed,
        enableBarbarianJump: DEFAULT_DEBUG_SETTINGS.enableBarbarianJump,
        jumpDurationMS: DEFAULT_DEBUG_SETTINGS.jumpDurationMS,
        enableBarbarianLeftBlock:
          DEFAULT_DEBUG_SETTINGS.enableBarbarianLeftBlock,
        blockDurationMS: DEFAULT_DEBUG_SETTINGS.blockDurationMS,
        enableBarbarianRightBlock:
          DEFAULT_DEBUG_SETTINGS.enableBarbarianRightBlock,
        rightBlockDurationMS: DEFAULT_DEBUG_SETTINGS.rightBlockDurationMS,
        enableBarbarianKick: DEFAULT_DEBUG_SETTINGS.enableBarbarianKick,
        kickSpeed: DEFAULT_DEBUG_SETTINGS.kickSpeed,
        enableBarbarianDuck: DEFAULT_DEBUG_SETTINGS.enableBarbarianDuck,
        duckDurationMS: DEFAULT_DEBUG_SETTINGS.duckDurationMS,
      });
    });
  });
});
