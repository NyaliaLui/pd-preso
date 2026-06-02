// ---------------------------------------------------------------------------
// ActionApplier.ts — Maps a BarbarianDecision from the server to the React
// state setters that control Barbarian.tsx's animations and physics.
//
// Used by Barbarian.tsx inside useFrame. Called only when the incoming
// decision differs from the last applied one (action or direction changed)
// to avoid flooding React with setState calls at 60 fps.
// ---------------------------------------------------------------------------

import type { BarbarianAction } from './sharedTypes';

export interface BarbarianStateSetters {
  setIsAttacking: (v: boolean) => void;
  setIsWalking: (v: boolean) => void;
  setDirection: (v: number) => void;
  /** Sets jumpPendingRef.current = true in Barbarian's physics handler. */
  setJumpPending: () => void;
}

/**
 * Apply an AI action to the barbarian's state setters.
 *
 * Each call fully resets all boolean flags before applying the new action so
 * there is no leftover state from a previous decision.
 */
export function applyAction(
  action: BarbarianAction,
  direction: number,
  setters: BarbarianStateSetters,
): void {
  // ── Reset all flags first ────────────────────────────────────────────────
  setters.setIsAttacking(false);
  setters.setIsWalking(false);

  // ── Apply direction ──────────────────────────────────────────────────────
  setters.setDirection(direction);

  // ── Apply action-specific flag ───────────────────────────────────────────
  switch (action) {
    case 'ATTACK':
      setters.setIsAttacking(true);
      break;

    case 'CHASE':
      setters.setIsWalking(true);
      break;

    case 'JUMP':
      setters.setJumpPending();
      break;
  }
}

/**
 * Returns true when the incoming decision carries a different action or
 * direction than the last applied one.
 *
 * Used in Barbarian.tsx's useFrame to gate setState calls: we only call
 * setters when something actually changed (server ticks at 100 ms, renderer
 * at 60 fps — we'd otherwise flood React with 60 identical setState calls
 * per second).
 */
export function decisionChanged(
  prev: { action: BarbarianAction; direction: number } | null,
  next: { action: BarbarianAction; direction: number },
): boolean {
  if (prev === null) return true;
  return prev.action !== next.action || prev.direction !== next.direction;
}
