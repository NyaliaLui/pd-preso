import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, describe, it } from '@jest/globals';
import {
  Controls,
  DirectionalButtons,
  OnscreenKeys,
} from '@/app/components/Player/Controls';
import { CONTROLS_TEST_IDS } from '@/app/test-ids';

describe('Controls Component', () => {
  const mockUpdateKey = jest.fn();

  beforeEach(() => {
    mockUpdateKey.mockClear();
  });

  describe('Controls', () => {
    it('renders DirectionalButtons and OnscreenKeys', () => {
      render(<Controls updateKey={mockUpdateKey} />);

      const directionalButtons = screen.getByTestId(
        CONTROLS_TEST_IDS.DIRECTIONAL_BUTTONS,
      );
      const onscreenKeys = screen.getByTestId(CONTROLS_TEST_IDS.ONSCREEN_KEYS);

      expect(directionalButtons).toBeInTheDocument();
      expect(onscreenKeys).toBeInTheDocument();
    });
  });

  describe('DirectionalButtons', () => {
    it('renders with data-testid directional-buttons', () => {
      render(<DirectionalButtons updateKey={mockUpdateKey} />);
      const container = screen.getByTestId(
        CONTROLS_TEST_IDS.DIRECTIONAL_BUTTONS,
      );
      expect(container).toBeInTheDocument();
    });

    it('has aria-label "Move with directional buttons or WASD keys"', () => {
      render(<DirectionalButtons updateKey={mockUpdateKey} />);
      const container = screen.getByLabelText(
        'Move with directional buttons or WASD keys',
      );
      expect(container).toBeInTheDocument();
    });

    it("left button calls updateKey('a', true) on mouseDown", () => {
      render(<DirectionalButtons updateKey={mockUpdateKey} />);
      const leftButton = screen.getByTestId(CONTROLS_TEST_IDS.LEFT_BUTTON);
      fireEvent.mouseDown(leftButton);
      expect(mockUpdateKey).toHaveBeenCalledWith('a', true);
    });

    it("left button calls updateKey('a', false) on mouseUp", () => {
      render(<DirectionalButtons updateKey={mockUpdateKey} />);
      const leftButton = screen.getByTestId(CONTROLS_TEST_IDS.LEFT_BUTTON);
      fireEvent.mouseUp(leftButton);
      expect(mockUpdateKey).toHaveBeenCalledWith('a', false);
    });

    it("left button calls updateKey('a', false) on mouseLeave", () => {
      render(<DirectionalButtons updateKey={mockUpdateKey} />);
      const leftButton = screen.getByTestId(CONTROLS_TEST_IDS.LEFT_BUTTON);
      fireEvent.mouseLeave(leftButton);
      expect(mockUpdateKey).toHaveBeenCalledWith('a', false);
    });

    it("right button calls updateKey('d', true) on mouseDown", () => {
      render(<DirectionalButtons updateKey={mockUpdateKey} />);
      const rightButton = screen.getByTestId(CONTROLS_TEST_IDS.RIGHT_BUTTON);
      fireEvent.mouseDown(rightButton);
      expect(mockUpdateKey).toHaveBeenCalledWith('d', true);
    });

    it("right button calls updateKey('d', false) on mouseUp", () => {
      render(<DirectionalButtons updateKey={mockUpdateKey} />);
      const rightButton = screen.getByTestId(CONTROLS_TEST_IDS.RIGHT_BUTTON);
      fireEvent.mouseUp(rightButton);
      expect(mockUpdateKey).toHaveBeenCalledWith('d', false);
    });

    it("right button calls updateKey('d', false) on mouseLeave", () => {
      render(<DirectionalButtons updateKey={mockUpdateKey} />);
      const rightButton = screen.getByTestId(CONTROLS_TEST_IDS.RIGHT_BUTTON);
      fireEvent.mouseLeave(rightButton);
      expect(mockUpdateKey).toHaveBeenCalledWith('d', false);
    });
  });

  describe('OnscreenKeys', () => {
    it('renders Jump, Attack, and Crouch Attack buttons (no Special, Normal, Item)', () => {
      render(<OnscreenKeys updateKey={mockUpdateKey} />);

      expect(
        screen.getByTestId(CONTROLS_TEST_IDS.JUMP_BUTTON),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(CONTROLS_TEST_IDS.ATTACK_BUTTON),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(CONTROLS_TEST_IDS.CROUCH_ATTACK_BUTTON),
      ).toBeInTheDocument();

      expect(screen.queryByLabelText('Special')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Normal')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Item')).not.toBeInTheDocument();
    });

    it("Jump button calls updateKey('space', true) on mouseDown", () => {
      render(<OnscreenKeys updateKey={mockUpdateKey} />);
      const jumpButton = screen.getByTestId(CONTROLS_TEST_IDS.JUMP_BUTTON);
      fireEvent.mouseDown(jumpButton);
      expect(mockUpdateKey).toHaveBeenCalledWith('space', true);
    });

    it("Jump button calls updateKey('space', false) on mouseUp", () => {
      render(<OnscreenKeys updateKey={mockUpdateKey} />);
      const jumpButton = screen.getByTestId(CONTROLS_TEST_IDS.JUMP_BUTTON);
      fireEvent.mouseUp(jumpButton);
      expect(mockUpdateKey).toHaveBeenCalledWith('space', false);
    });

    it("Attack button calls updateKey('q', true) on mouseDown", () => {
      render(<OnscreenKeys updateKey={mockUpdateKey} />);
      const attackButton = screen.getByTestId(CONTROLS_TEST_IDS.ATTACK_BUTTON);
      fireEvent.mouseDown(attackButton);
      expect(mockUpdateKey).toHaveBeenCalledWith('q', true);
    });

    it("Attack button calls updateKey('q', false) on mouseUp", () => {
      render(<OnscreenKeys updateKey={mockUpdateKey} />);
      const attackButton = screen.getByTestId(CONTROLS_TEST_IDS.ATTACK_BUTTON);
      fireEvent.mouseUp(attackButton);
      expect(mockUpdateKey).toHaveBeenCalledWith('q', false);
    });

    it('has aria-labels for Jump, Attack, and Crouch Attack', () => {
      render(<OnscreenKeys updateKey={mockUpdateKey} />);
      expect(screen.getByLabelText('Jump')).toBeInTheDocument();
      expect(screen.getByLabelText('Attack')).toBeInTheDocument();
      expect(screen.getByLabelText('Crouch Attack')).toBeInTheDocument();
    });

    it('Crouch Attack button calls updateKey for both q and ctrl on mouseDown', () => {
      render(<OnscreenKeys updateKey={mockUpdateKey} />);
      fireEvent.mouseDown(
        screen.getByTestId(CONTROLS_TEST_IDS.CROUCH_ATTACK_BUTTON),
      );
      expect(mockUpdateKey).toHaveBeenCalledWith('q', true);
      expect(mockUpdateKey).toHaveBeenCalledWith('ctrl', true);
    });

    it('Crouch Attack button calls updateKey for both q and ctrl on mouseUp', () => {
      render(<OnscreenKeys updateKey={mockUpdateKey} />);
      fireEvent.mouseUp(
        screen.getByTestId(CONTROLS_TEST_IDS.CROUCH_ATTACK_BUTTON),
      );
      expect(mockUpdateKey).toHaveBeenCalledWith('q', false);
      expect(mockUpdateKey).toHaveBeenCalledWith('ctrl', false);
    });
  });
});
