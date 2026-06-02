// ---------------------------------------------------------------------------
// sharedTypes.ts — Client-side mirror of the server's core types.
//
// These are manually kept in sync with server/src/types/*.ts.
// Do NOT import from the server package — Next.js compiles client and server
// separately and the server uses CommonJS modules.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Actions / roles / strategies (mirrors server/src/types/actions.ts)
// ---------------------------------------------------------------------------

export type BarbarianAction = 'CHASE' | 'ATTACK' | 'JUMP';

export type BarbarianRole = 'ATTACKER';

// ---------------------------------------------------------------------------
// Game state types (mirrors server/src/types/gameState.ts)
// ---------------------------------------------------------------------------

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type AttackType = 'normal' | 'crouch' | 'special' | null;

/**
 * Player state as written by Player.tsx into playerStateRef.
 * The hp / maxHp fields are filled in by BarbarianAIClient from page.tsx
 * before the message is sent to the server.
 */
export interface ClientPlayerState {
  id: string;
  position: Vector3;
  velocity: Vector3;
  hp: number;
  maxHp: number;
  /** -1 = facing left (−X), 1 = facing right (+X) */
  facingDirection: number;
  isAttacking: boolean;
  attackType: AttackType;
  /** Unix ms timestamp when the current attack started. Null when not attacking. */
  attackStartedAt: number | null;
  isJumping: boolean;
  isCrouching: boolean;
}

/**
 * Barbarian state as written by Barbarian.tsx into barbarianStatesRef[id].
 * Matches the ClientBarbarianState type on the server.
 */
export interface ClientBarbarianState {
  id: string;
  position: Vector3;
  velocity: Vector3;
  hp: number;
  maxHp: number;
  /** -1 = facing left, 1 = facing right */
  facingDirection: number;
  isGrounded: boolean;
  currentAction: BarbarianAction;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface EnvironmentState {
  worldBounds: WorldBounds;
  groundY: number;
  targetBarbarianCount: number;
}

// ---------------------------------------------------------------------------
// Decision types (mirrors server/src/types/decisions.ts)
// ---------------------------------------------------------------------------

/** One action decision for a single barbarian, emitted every server tick. */
export interface BarbarianDecision {
  barbarianId: string;
  action: BarbarianAction;
  /** Movement direction: -1 = left, 1 = right */
  direction: number;
  durationMs: number;
  strategyTag: string;
  reasoning?: string;
}

/** Spawn instruction emitted when a respawn timer fires on the server. */
export interface SpawnInstruction {
  barbarianId: string;
  spawnPosition: Vector3;
  entryDirection: number;
  delayMs: number;
}

// ---------------------------------------------------------------------------
// WebSocket message types
// ---------------------------------------------------------------------------

// Server → Client
export interface DecisionsMessage {
  type: 'DECISIONS';
  tickId: number;
  decisions: BarbarianDecision[];
  roleUpdates: Record<string, BarbarianRole>;
}

export interface SpawnMessage {
  type: 'SPAWN';
  spawn: SpawnInstruction;
}

export type ServerMessage = DecisionsMessage | SpawnMessage;

// Client → Server
export interface GameStateMessage {
  type: 'GAME_STATE';
  tickId: number;
  timestamp: number;
  player: ClientPlayerState;
  barbarians: ClientBarbarianState[];
  environment: EnvironmentState;
}

export interface BarbarianDiedMessage {
  type: 'BARBARIAN_DIED';
  barbarianId: string;
  timestamp: number;
  aliveCount: number;
}

export type ClientMessage = GameStateMessage | BarbarianDiedMessage;
