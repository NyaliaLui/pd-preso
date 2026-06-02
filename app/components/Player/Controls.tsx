import { SetKeyStateFn } from '@/app/components/Player/hooks/useKeyboardControls';
import { CONTROLS_TEST_IDS } from '@/app/test-ids';

export type { DirectionalButtonsProps, OnscreenKeysProps, ControlsProps };
export { DirectionalButtons, OnscreenKeys, Controls };

interface DirectionalButtonsProps {
  updateKey: SetKeyStateFn;
}

function DirectionalButtons({ updateKey }: DirectionalButtonsProps) {
  const buttonClass =
    'w-16 h-16 bg-gray-700 bg-opacity-80 border border-gray-500 rounded-xl flex items-center justify-center cursor-pointer select-none active:bg-gray-600 transition-colors text-white font-bold text-xl';

  return (
    <div
      className="flex gap-3"
      data-testid={CONTROLS_TEST_IDS.DIRECTIONAL_BUTTONS}
      aria-label="Move with directional buttons or WASD keys"
    >
      <button
        className={buttonClass}
        data-testid={CONTROLS_TEST_IDS.LEFT_BUTTON}
        aria-label="Move Left"
        onMouseDown={() => updateKey('a', true)}
        onMouseUp={() => updateKey('a', false)}
        onMouseLeave={() => updateKey('a', false)}
        onTouchStart={() => updateKey('a', true)}
        onTouchEnd={() => updateKey('a', false)}
      >
        â—„
      </button>
      <button
        className={buttonClass}
        data-testid={CONTROLS_TEST_IDS.RIGHT_BUTTON}
        aria-label="Move Right"
        onMouseDown={() => updateKey('d', true)}
        onMouseUp={() => updateKey('d', false)}
        onMouseLeave={() => updateKey('d', false)}
        onTouchStart={() => updateKey('d', true)}
        onTouchEnd={() => updateKey('d', false)}
      >
        â–º
      </button>
    </div>
  );
}

interface OnscreenKeysProps {
  updateKey: SetKeyStateFn;
}

function OnscreenKeys({ updateKey }: OnscreenKeysProps) {
  const buttonClass =
    'w-16 h-16 bg-gray-700 bg-opacity-80 border border-gray-500 rounded-full flex items-center justify-center cursor-pointer select-none active:bg-gray-600 transition-colors text-white font-semibold text-sm';

  return (
    <div
      className="flex flex-col items-center gap-3"
      aria-label="Action buttons"
      data-testid={CONTROLS_TEST_IDS.ONSCREEN_KEYS}
    >
      {/* Top of triangle: Crouch Attack */}
      <button
        className={buttonClass + ' text-xs'}
        data-testid={CONTROLS_TEST_IDS.CROUCH_ATTACK_BUTTON}
        aria-label="Crouch Attack"
        onMouseDown={() => {
          updateKey('q', true);
          updateKey('ctrl', true);
        }}
        onMouseUp={() => {
          updateKey('q', false);
          updateKey('ctrl', false);
        }}
        onMouseLeave={() => {
          updateKey('q', false);
          updateKey('ctrl', false);
        }}
        onTouchStart={() => {
          updateKey('q', true);
          updateKey('ctrl', true);
        }}
        onTouchEnd={() => {
          updateKey('q', false);
          updateKey('ctrl', false);
        }}
      >
        <span className="block leading-tight text-center">
          Crouch
          <br />
          Atk
        </span>
      </button>
      {/* Bottom of triangle: Attack and Jump */}
      <div className="flex gap-3">
        <button
          className={buttonClass}
          data-testid={CONTROLS_TEST_IDS.ATTACK_BUTTON}
          aria-label="Attack"
          onMouseDown={() => updateKey('q', true)}
          onMouseUp={() => updateKey('q', false)}
          onMouseLeave={() => updateKey('q', false)}
          onTouchStart={() => updateKey('q', true)}
          onTouchEnd={() => updateKey('q', false)}
        >
          Attack
        </button>
        <button
          className={buttonClass}
          data-testid={CONTROLS_TEST_IDS.JUMP_BUTTON}
          aria-label="Jump"
          onMouseDown={() => updateKey('space', true)}
          onMouseUp={() => updateKey('space', false)}
          onMouseLeave={() => updateKey('space', false)}
          onTouchStart={() => updateKey('space', true)}
          onTouchEnd={() => updateKey('space', false)}
        >
          Jump
        </button>
      </div>
    </div>
  );
}

interface ControlsProps {
  updateKey: SetKeyStateFn;
}

function Controls({ updateKey }: ControlsProps) {
  return (
    <>
      {/* Directional Buttons */}
      <div className="lg:hidden fixed bottom-1/12 left-1/12 z-50">
        <DirectionalButtons updateKey={updateKey} />
      </div>

      {/* Onscreen Keys */}
      <div className="lg:hidden fixed bottom-1/12 right-1/12 z-50">
        <OnscreenKeys updateKey={updateKey} />
      </div>
    </>
  );
}
