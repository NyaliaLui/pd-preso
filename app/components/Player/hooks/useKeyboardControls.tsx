import { useState, useCallback, useEffect } from 'react';

import { CONTROLS_DEFAULTS } from '@/app/constants';

export type { KeyState, KeyHandlerFn, SetKeyStateFn };
export { useKeyboardControls, isAttacking };

interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  q: boolean;
  e: boolean;
  p: boolean;
  space: boolean;
  ctrl: boolean;
}

type KeyHandlerFn = (keys: KeyState) => void;
type SetKeyStateFn = (key: keyof KeyState, value: boolean) => void;

/**
 * Returns true if any attack button (Q or E) is pressed.
 */
function isAttacking(keys: KeyState): boolean {
  return keys.q || keys.e;
}

function useKeyboardControls() {
  const [keys, setKeys] = useState<KeyState>(CONTROLS_DEFAULTS.KEYBOARD);

  const updateKey = useCallback((key: keyof KeyState, value: boolean) => {
    // Set method will update the value for the next render.
    // https://react.dev/reference/react/useState#setstate-caveats
    setKeys((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      switch (key) {
        case 'w':
          updateKey('w', true);
          break;
        case 'a':
          updateKey('a', true);
          break;
        case 's':
          updateKey('s', true);
          break;
        case 'd':
          updateKey('d', true);
          break;
        case 'q':
          updateKey('q', true);
          break;
        case 'e':
          updateKey('e', true);
          break;
        case 'p':
          updateKey('p', true);
          break;
        case ' ':
          updateKey('space', true);
          break;
        case 'control':
          updateKey('ctrl', true);
          break;
      }
    },
    [updateKey],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      switch (key) {
        case 'w':
          updateKey('w', false);
          break;
        case 'a':
          updateKey('a', false);
          break;
        case 's':
          updateKey('s', false);
          break;
        case 'd':
          updateKey('d', false);
          break;
        case 'q':
          updateKey('q', false);
          break;
        case 'e':
          updateKey('e', false);
          break;
        case 'p':
          updateKey('p', false);
          break;
        case ' ':
          updateKey('space', false);
          break;
        case 'control':
          updateKey('ctrl', false);
          break;
      }
    },
    [updateKey],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return {
    keys,
    updateKey,
  };
}
