import { useCallback, useEffect, useState, RefObject } from 'react';
import { SetKeyStateFn } from '@/app/components/Player/hooks/useKeyboardControls';
import { CONTROLS_DEFAULTS } from '@/app/constants';

export { useAnalogControls };

interface AnalogControlsProps {
  updateKey: SetKeyStateFn;
  stickRef: RefObject<HTMLDivElement | null>;
}

function useAnalogControls({ updateKey, stickRef }: AnalogControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [knobPosition, setKnobPosition] = useState(
    CONTROLS_DEFAULTS.ANALOG_STICK.INIT_POS,
  );

  const stickRadius = CONTROLS_DEFAULTS.ANALOG_STICK.STICK_RADIUS;
  const knobRadius = CONTROLS_DEFAULTS.ANALOG_STICK.KNOB_RADIUS;
  const deadZone = CONTROLS_DEFAULTS.ANALOG_STICK.DEAD_ZONE;

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!stickRef.current) return;

      const stickRect = stickRef.current.getBoundingClientRect();
      const stickCenterX = stickRect.left + stickRect.width / 2;
      const stickCenterY = stickRect.top + stickRect.height / 2;

      const deltaX = clientX - stickCenterX;
      const deltaY = clientY - stickCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Limit knob to stick boundary
      const maxDistance = stickRadius - knobRadius;
      const clampedDistance = Math.min(distance, maxDistance);

      let x = 0,
        y = 0;
      if (distance > 0) {
        x = (deltaX / distance) * clampedDistance;
        y = (deltaY / distance) * clampedDistance;
      }

      setKnobPosition({ x, y });

      // Convert to key states
      const normalizedX = x / maxDistance;
      const normalizedY = y / maxDistance;

      updateKey('w', normalizedY < -deadZone);
      updateKey('s', normalizedY > deadZone);
      updateKey('a', normalizedX < -deadZone);
      updateKey('d', normalizedX > deadZone);
    },
    [updateKey, stickRef, stickRadius, knobRadius, deadZone],
  );

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      setIsDragging(true);
      updatePosition(clientX, clientY);
    },
    [updatePosition],
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      updatePosition(clientX, clientY);
    },
    [isDragging, updatePosition],
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setKnobPosition({ x: 0, y: 0 });

    // Reset all movement keys
    updateKey('w', false);
    updateKey('a', false);
    updateKey('s', false);
    updateKey('d', false);
  }, [updateKey]);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    },
    [handleStart],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    },
    [handleMove],
  );

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    },
    [handleStart],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    [handleMove],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    },
    [handleEnd],
  );

  // Event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  return {
    handlers: { mouseDown: handleMouseDown, touchStart: handleTouchStart },
    knobPosition: knobPosition,
    isDragging: isDragging,
  };
}
