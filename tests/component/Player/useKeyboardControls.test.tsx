import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import { expect, describe, it } from '@jest/globals';
import {
  useKeyboardControls,
  isAttacking,
} from '@/app/components/Player/hooks/useKeyboardControls';
import { CONTROLS_DEFAULTS } from '@/app/constants';

describe('useKeyboardControls Hook', () => {
  describe('Initialization', () => {
    it('should initialize with default keyboard state', () => {
      const { result } = renderHook(() => useKeyboardControls());
      expect(result.current.keys).toEqual(CONTROLS_DEFAULTS.KEYBOARD);
    });

    it('should have all keys set to false initially', () => {
      const { result } = renderHook(() => useKeyboardControls());
      const keys = result.current.keys;

      expect(keys.w).toBe(false);
      expect(keys.a).toBe(false);
      expect(keys.s).toBe(false);
      expect(keys.d).toBe(false);
      expect(keys.q).toBe(false);
      expect(keys.e).toBe(false);
      expect(keys.p).toBe(false);
      expect(keys.space).toBe(false);
      expect(keys.ctrl).toBe(false);
    });
  });

  describe('updateKey Function', () => {
    it('should update a specific key to true', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        result.current.updateKey('w', true);
      });

      expect(result.current.keys.w).toBe(true);
    });

    it('should update a specific key to false', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        result.current.updateKey('w', true);
      });
      expect(result.current.keys.w).toBe(true);

      act(() => {
        result.current.updateKey('w', false);
      });
      expect(result.current.keys.w).toBe(false);
    });

    it('should update multiple keys independently', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        result.current.updateKey('w', true);
        result.current.updateKey('d', true);
      });

      expect(result.current.keys.w).toBe(true);
      expect(result.current.keys.d).toBe(true);
      expect(result.current.keys.a).toBe(false);
      expect(result.current.keys.s).toBe(false);
    });
  });

  describe('Keyboard Event Handlers', () => {
    it('should set w key to true on W keydown', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'w' });
        window.dispatchEvent(event);
      });

      expect(result.current.keys.w).toBe(true);
    });

    it('should set w key to false on W keyup', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      });
      expect(result.current.keys.w).toBe(true);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
      });
      expect(result.current.keys.w).toBe(false);
    });

    it('should handle uppercase W key', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'W' }));
      });

      expect(result.current.keys.w).toBe(true);
    });

    it('should handle A key', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      });

      expect(result.current.keys.a).toBe(true);
    });

    it('should handle S key', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      });

      expect(result.current.keys.s).toBe(true);
    });

    it('should handle D key', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
      });

      expect(result.current.keys.d).toBe(true);
    });

    it('should handle Q key', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
      });

      expect(result.current.keys.q).toBe(true);
    });

    it('should handle E key', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
      });

      expect(result.current.keys.e).toBe(true);
    });

    it('should handle P key', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
      });

      expect(result.current.keys.p).toBe(true);
    });

    it('should handle Space key', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      });

      expect(result.current.keys.space).toBe(true);
    });

    it('should handle Control key', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
      });

      expect(result.current.keys.ctrl).toBe(true);
    });

    it('should set ctrl key to false on Control keyup immediately', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
      });
      expect(result.current.keys.ctrl).toBe(true);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
      });
      expect(result.current.keys.ctrl).toBe(false);
    });

    it('should handle multiple simultaneous keys', () => {
      const { result } = renderHook(() => useKeyboardControls());

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
      });

      expect(result.current.keys.w).toBe(true);
      expect(result.current.keys.d).toBe(true);
    });
  });

  describe('Event Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useKeyboardControls());
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keyup',
        expect.any(Function),
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});

describe('isAttacking utility function', () => {
  const defaultKeys = { ...CONTROLS_DEFAULTS.KEYBOARD };

  it('should return false when no attack keys are pressed', () => {
    expect(isAttacking(defaultKeys)).toBe(false);
  });

  it('should return true when Q key is pressed', () => {
    const keys = { ...defaultKeys, q: true };
    expect(isAttacking(keys)).toBe(true);
  });

  it('should return true when E key is pressed', () => {
    const keys = { ...defaultKeys, e: true };
    expect(isAttacking(keys)).toBe(true);
  });

  it('should return true when both Q and E keys are pressed', () => {
    const keys = { ...defaultKeys, q: true, e: true };
    expect(isAttacking(keys)).toBe(true);
  });

  it('should return false when only movement keys are pressed', () => {
    const keys = { ...defaultKeys, w: true, a: true, s: true, d: true };
    expect(isAttacking(keys)).toBe(false);
  });

  it('should return true when attack key is pressed along with movement keys', () => {
    const keys = { ...defaultKeys, w: true, q: true };
    expect(isAttacking(keys)).toBe(true);
  });
});
