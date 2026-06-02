import { useEffect, useState } from 'react';
import { Leva, useControls } from 'leva';
import { DebugSettings } from '@/app/components/hooks/useDebugSettings';
import { LEVA_THEMES } from '@/app/constants';

interface DebugGuiProps {
  settings: DebugSettings;
  onSettingsChange: (newSettings: Partial<DebugSettings>) => void;
  hidden?: boolean;
}

type ScreenSize = 'mobile' | 'tablet' | 'desktop';

function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      // Breakpoints based on lg and xl tailwindcss breakpoints
      if (width >= 1024) {
        setScreenSize('tablet');
      } else if (width >= 1280) {
        setScreenSize('desktop');
      } else {
        setScreenSize('mobile');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return screenSize;
}

export function DebugGui({
  settings,
  onSettingsChange,
  hidden = true,
}: DebugGuiProps) {
  const screenSize = useScreenSize();
  const theme = LEVA_THEMES[screenSize];

  const controls = useControls('Debug Settings', {
    debugMode: {
      value: settings.debugMode,
      label: 'Show Hit & Hurt Boxes',
    },
    enableBarbarianWalk: {
      value: settings.enableBarbarianWalk,
      label: 'Enable Barbarian Walk',
    },
    barbarianWalkDurationMS: {
      value: settings.barbarianWalkDurationMS,
      label: 'Barbarian Walk Duration (ms)',
    },
    enableBarbarianAttack: {
      value: settings.enableBarbarianAttack,
      label: 'Enable Barbarian Attack',
    },
    attackSpeed: {
      value: settings.attackSpeed,
      label: 'Attack Speed (ms)',
    },
    enableBarbarianJump: {
      value: settings.enableBarbarianJump,
      label: 'Enable Barbarian Jump',
    },
    jumpDurationMS: {
      value: settings.jumpDurationMS,
      label: 'Jump Duration (ms)',
    },
    enableBarbarianLeftBlock: {
      value: settings.enableBarbarianLeftBlock,
      label: 'Enable Barbarian Left Block',
    },
    blockDurationMS: {
      value: settings.blockDurationMS,
      label: 'Block Duration (ms)',
    },
    enableBarbarianRightBlock: {
      value: settings.enableBarbarianRightBlock,
      label: 'Enable Barbarian Right Block',
    },
    rightBlockDurationMS: {
      value: settings.rightBlockDurationMS,
      label: 'Right Block Duration (ms)',
    },
    enableBarbarianKick: {
      value: settings.enableBarbarianKick,
      label: 'Enable Barbarian Kick',
    },
    kickSpeed: {
      value: settings.kickSpeed,
      label: 'Kick Speed (ms)',
    },
    enableBarbarianDuck: {
      value: settings.enableBarbarianDuck,
      label: 'Enable Barbarian Duck',
    },
    duckDurationMS: {
      value: settings.duckDurationMS,
      label: 'Duck Duration (ms)',
    },
  });

  useEffect(() => {
    onSettingsChange({
      debugMode: controls.debugMode,
      enableBarbarianWalk: controls.enableBarbarianWalk,
      barbarianWalkDurationMS: controls.barbarianWalkDurationMS,
      enableBarbarianAttack: controls.enableBarbarianAttack,
      attackSpeed: controls.attackSpeed,
      enableBarbarianJump: controls.enableBarbarianJump,
      jumpDurationMS: controls.jumpDurationMS,
      enableBarbarianLeftBlock: controls.enableBarbarianLeftBlock,
      blockDurationMS: controls.blockDurationMS,
      enableBarbarianRightBlock: controls.enableBarbarianRightBlock,
      rightBlockDurationMS: controls.rightBlockDurationMS,
      enableBarbarianKick: controls.enableBarbarianKick,
      kickSpeed: controls.kickSpeed,
      enableBarbarianDuck: controls.enableBarbarianDuck,
      duckDurationMS: controls.duckDurationMS,
    });
  }, [
    controls.debugMode,
    controls.enableBarbarianWalk,
    controls.barbarianWalkDurationMS,
    controls.enableBarbarianAttack,
    controls.attackSpeed,
    controls.enableBarbarianJump,
    controls.jumpDurationMS,
    controls.enableBarbarianLeftBlock,
    controls.blockDurationMS,
    controls.enableBarbarianRightBlock,
    controls.rightBlockDurationMS,
    controls.enableBarbarianKick,
    controls.kickSpeed,
    controls.enableBarbarianDuck,
    controls.duckDurationMS,
    onSettingsChange,
  ]);

  return (
    <Leva
      hidden={hidden}
      titleBar={{ title: 'Debug Settings' }}
      theme={theme}
    />
  );
}
