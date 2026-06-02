// ---------------------------------------------------------------------------
// BarbarianAIClient.ts — Browser-side WebSocket client for the decision server.
//
// Responsibilities:
//  • Connect to the MCP decision server at ws://localhost:8765.
//  • Reconnect automatically with exponential back-off (max 10 s).
//  • Every 100 ms: read player + barbarian state from shared refs and send a
//    GAME_STATE message to the server.
//  • On receiving DECISIONS: write each decision into barbarianDecisionsRef.
//  • On receiving SPAWN: invoke the onSpawn callback so page.tsx can mount
//    a new Barbarian component at the given world position.
//  • notifyBarbarianDied(): send BARBARIAN_DIED to trigger the respawn timer.
//  • disconnect(): clean shutdown (called from page.tsx useEffect cleanup).
// ---------------------------------------------------------------------------

import type {
  BarbarianDecision,
  BarbarianRole,
  ClientBarbarianState,
  ClientPlayerState,
  EnvironmentState,
  ServerMessage,
  SpawnInstruction,
} from './sharedTypes';
import { GAME_DEFAULTS } from '@/app/constants';

const SEND_INTERVAL_MS = 50;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10_000;

export interface BarbarianAIClientOptions {
  /** WebSocket server URL, e.g. 'ws://localhost:8765' */
  serverUrl: string;

  /**
   * Ref populated by Player.tsx every frame with current player state.
   * hp / maxHp are overwritten by BarbarianAIClient from playerHPRef before sending.
   */
  playerStateRef: { current: ClientPlayerState | null };

  /** Ref populated by page.tsx whenever playerHP state changes. */
  playerHPRef: { current: number };

  /**
   * Shared map written by each Barbarian.tsx every frame.
   * Key = barbarianId.
   */
  barbarianStatesRef: { current: Record<string, ClientBarbarianState> };

  /**
   * Shared map read by each Barbarian.tsx every frame.
   * BarbarianAIClient writes here when DECISIONS arrive.
   * Key = barbarianId.
   */
  barbarianDecisionsRef: { current: Record<string, BarbarianDecision | null> };

  /**
   * Returns the current environment state (world bounds, ground Y).
   * Called once per send tick.
   */
  getEnvironment: () => EnvironmentState;

  /** Called when the server emits a SPAWN message (reinforcement). */
  onSpawn: (spawn: SpawnInstruction) => void;

  /** Called when the server sends a role update (optional — for debug UI). */
  onRoleUpdate?: (updates: Record<string, BarbarianRole>) => void;

  /** Called whenever the connection state changes (true = connected). */
  onConnectionChange?: (connected: boolean) => void;
}

export class BarbarianAIClient {
  private ws: WebSocket | null = null;
  private tickId = 0;
  private sendHandle: ReturnType<typeof setInterval> | null = null;
  private reconnectHandle: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = RECONNECT_BASE_MS;
  private stopped = false;
  /** BARBARIAN_DIED messages queued while the server was unreachable. */
  private pendingDiedMessages: object[] = [];

  constructor(private readonly opts: BarbarianAIClientOptions) {
    this.connect();
    this.startSendLoop();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Send a BARBARIAN_DIED message so the server starts the respawn countdown.
   * Call this from page.tsx's handleBarbarianDeath callback.
   */
  notifyBarbarianDied(barbarianId: string, aliveCount: number): void {
    const msg = {
      type: 'BARBARIAN_DIED',
      barbarianId,
      timestamp: Date.now(),
      aliveCount,
    };
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Server is offline — queue so it is sent once reconnected.
      this.pendingDiedMessages.push(msg);
    } else {
      this.send(msg);
    }
  }

  /**
   * Gracefully shut down the client.
   * Called from the useEffect cleanup in page.tsx.
   */
  disconnect(): void {
    this.stopped = true;
    if (this.sendHandle !== null) {
      clearInterval(this.sendHandle);
      this.sendHandle = null;
    }
    if (this.reconnectHandle !== null) {
      clearTimeout(this.reconnectHandle);
      this.reconnectHandle = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Connection management
  // ---------------------------------------------------------------------------

  private connect(): void {
    if (this.stopped) return;

    console.log(`[BarbarianAIClient] Connecting to ${this.opts.serverUrl}...`);

    try {
      this.ws = new WebSocket(this.opts.serverUrl);
    } catch (err) {
      console.warn('[BarbarianAIClient] WebSocket constructor threw:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[BarbarianAIClient] Connected to decision server.');
      this.reconnectDelay = RECONNECT_BASE_MS; // reset back-off on success
      this.opts.onConnectionChange?.(true);
      // Flush any BARBARIAN_DIED messages that were queued while offline.
      for (const msg of this.pendingDiedMessages) {
        this.send(msg);
      }
      this.pendingDiedMessages = [];
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        this.handleServerMessage(msg);
      } catch (err) {
        console.warn(
          '[BarbarianAIClient] Failed to parse server message:',
          err,
        );
      }
    };

    this.ws.onclose = (event) => {
      if (this.stopped) return;
      console.warn(
        `[BarbarianAIClient] Connection closed (code=${event.code}). Reconnecting in ${this.reconnectDelay} ms...`,
      );
      this.ws = null;
      this.opts.onConnectionChange?.(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // 'error' is always followed by 'close', so reconnect is handled there.
      console.warn('[BarbarianAIClient] WebSocket error.');
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectHandle !== null) return;
    this.reconnectHandle = setTimeout(() => {
      this.reconnectHandle = null;
      // Exponential back-off, capped at RECONNECT_MAX_MS
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
      this.connect();
    }, this.reconnectDelay);
  }

  // ---------------------------------------------------------------------------
  // Send loop (100 ms)
  // ---------------------------------------------------------------------------

  private startSendLoop(): void {
    this.sendHandle = setInterval(() => this.sendGameState(), SEND_INTERVAL_MS);
  }

  private sendGameState(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const { playerStateRef, playerHPRef, barbarianStatesRef, getEnvironment } =
      this.opts;
    const partialPlayer = playerStateRef.current;
    if (!partialPlayer) return; // Player not mounted yet

    const tickId = ++this.tickId;

    // Overwrite hp / maxHp from page.tsx's authoritative playerHP state.
    const player: ClientPlayerState = {
      ...partialPlayer,
      hp: playerHPRef.current,
      maxHp: GAME_DEFAULTS.PLAYER_MAX_HP,
    };

    const barbarians = Object.values(barbarianStatesRef.current);

    this.send({
      type: 'GAME_STATE',
      tickId,
      timestamp: Date.now(),
      player,
      barbarians,
      environment: getEnvironment(),
    });
  }

  // ---------------------------------------------------------------------------
  // Receive handler
  // ---------------------------------------------------------------------------

  private handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'DECISIONS':
        this.applyDecisions(msg.decisions);
        if (Object.keys(msg.roleUpdates).length > 0) {
          this.opts.onRoleUpdate?.(msg.roleUpdates);
        }
        break;

      case 'SPAWN':
        this.opts.onSpawn(msg.spawn);
        break;
    }
  }

  private applyDecisions(decisions: BarbarianDecision[]): void {
    const ref = this.opts.barbarianDecisionsRef.current;
    for (const decision of decisions) {
      ref[decision.barbarianId] = decision;
    }
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  private send(msg: object): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
      console.warn('[BarbarianAIClient] Send failed:', err);
    }
  }
}
