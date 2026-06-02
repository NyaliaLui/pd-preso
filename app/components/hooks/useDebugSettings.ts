import { useState, useCallback } from 'react';
import { BARBARIAN_DEFAULTS } from '@/app/constants';

export interface DebugSettings {
  debugMode: boolean;
  enableBarbarianWalk: boolean;
  barbarianWalkDurationMS: number;
  enableBarbarianAttack: boolean;
  attackSpeed: number;
  enableBarbarianJump: boolean;
  jumpDurationMS: number;
  enableBarbarianLeftBlock: boolean;
  blockDurationMS: number;
  enableBarbarianRightBlock: boolean;
  rightBlockDurationMS: number;
  enableBarbarianKick: boolean;
  kickSpeed: number;
  enableBarbarianDuck: boolean;
  duckDurationMS: number;
}

export const DEFAULT_DEBUG_SETTINGS: DebugSettings = {
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

export function useDebugSettings() {
  const [settings, setSettings] = useState<DebugSettings>(
    DEFAULT_DEBUG_SETTINGS,
  );

  const updateSettings = useCallback((newSettings: Partial<DebugSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  return {
    settings,
    updateSettings,
  };
}
