// ============================================================
// Game Service - Room and match management
// ============================================================

import { Injectable, Optional } from '@nestjs/common';
import {
  Match,
  Board,
  Color,
  createTerminalResult,
  fromAlgebraic,
  getLegalMoves,
  projectActions,
  projectMatchView,
  systemTimeProvider,
  viewerRoleForColor,
  type MatchViewDTO,
  type SkillTarget,
  type TerminalResult,
  type TimeProvider,
  type TurnDeadline,
} from 'game-core';
import {
  publicPlayerRef,
  type PublicPlayerRef,
} from '../auth/auth.contract.js';

export interface Player {
  id: string;
  publicPlayerRef: PublicPlayerRef;
  socketId: string;
  color: Color;
  connected: boolean;
  variantId?: string | null;
  variantConfirmed?: boolean;
}

interface DisconnectForfeitTimer {
  timeout: NodeJS.Timeout;
  roomCode: string;
  match: Match;
  playerId: string;
  publicPlayerRef: PublicPlayerRef;
  color: Color;
}

interface LobbyCleanupTimer {
  timeout: NodeJS.Timeout;
  roomCode: string;
  playerId: string;
  publicPlayerRef: PublicPlayerRef;
}

export interface Room {
  code: string;
  players: Player[];
  match: Match | null;
  disconnectTimers: Map<string, DisconnectForfeitTimer>;
  lobbyCleanupTimers: Map<string, LobbyCleanupTimer>;
  turnDeadline?: ArmedTurnDeadline;
  overrideDeadlineAtMs?: number;
  draftTimer?: NodeJS.Timeout;
  revealTimer?: NodeJS.Timeout;
  loadingTimer?: NodeJS.Timeout;
  pendingPhaseResume?: () => void;
  draftEndTime?: number;
  phase?: 'waiting' | 'draft' | 'reveal' | 'loading' | 'playing' | 'finished';
}

interface ArmedTurnDeadline {
  timeout: NodeJS.Timeout;
  roomCode: string;
  match: Match;
  plyIndex: number;
  atMs: number;
  kind: 'terminal' | 'override_skip';
}

export interface CommandContext {
  roomCode: string;
  playerId: string;
  publicPlayerRef: PublicPlayerRef;
  socketId: string;
  color: Color;
}

export interface CommittedRoomEvent {
  deliveries: Array<{
    socketId: string;
    event: string;
    payload: Record<string, unknown>;
  }>;
}

export type CommittedEventSink = (event: CommittedRoomEvent) => void;

type ResolvedCommand = { room: Room; player: Player; match: Match | null };

type FinishMatchResult =
  | { applied: true; result: TerminalResult; event: CommittedRoomEvent }
  | { applied: false; result: TerminalResult | null };

@Injectable()
export class GameService {
  private rooms: Map<string, Room> = new Map();

  constructor(
    @Optional() private readonly nowMs: TimeProvider = systemTimeProvider,
  ) {}

  resolveCommandContext(
    socketId: string,
    roomCode: string,
    playerRef: PublicPlayerRef,
  ): CommandContext | null {
    const player = this.rooms
      .get(roomCode)
      ?.players.find(
        (candidate) =>
          candidate.socketId === socketId &&
          candidate.publicPlayerRef === playerRef,
      );
    return player
      ? {
          roomCode,
          playerId: player.id,
          publicPlayerRef: playerRef,
          socketId,
          color: player.color,
        }
      : null;
  }

  getPublicPlayerRef(
    roomCode: string,
    playerId: string,
  ): PublicPlayerRef | undefined {
    return this.rooms
      .get(roomCode)
      ?.players.find((player) => player.id === playerId)?.publicPlayerRef;
  }

  getLegalMoves(
    context: CommandContext,
    position: { col: number; row: number },
  ): { success: true; moves: unknown[] } | { success: false; error: string } {
    const resolved = this.resolveCommand(context);
    if (!resolved?.match)
      return { success: false, error: 'Room or match not found' };
    const view = projectMatchView(
      resolved.match,
      viewerRoleForColor(context.color),
    );
    const board = Board.fromSerializable(view.board);
    if (!board.getPiece(position)) {
      return { success: false, error: 'Position is not visible' };
    }
    return { success: true, moves: getLegalMoves(board, position) };
  }

  getReconnectSnapshot(
    roomCode: string,
    color: Color,
  ):
    | {
        matchState?: MatchViewDTO;
        roomPhase: Room['phase'];
        draftEndTime?: number;
      }
    | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;
    return {
      matchState: room.match
        ? projectMatchView(room.match, viewerRoleForColor(color))
        : undefined,
      roomPhase: room.phase ?? 'waiting',
      draftEndTime: room.draftEndTime,
    };
  }

  private resolveCommand(context: CommandContext): ResolvedCommand | null {
    const room = this.rooms.get(context.roomCode);
    const player = room?.players.find(
      (candidate) =>
        candidate.id === context.playerId &&
        candidate.socketId === context.socketId &&
        candidate.publicPlayerRef === context.publicPlayerRef &&
        candidate.color === context.color,
    );
    return room && player ? { room, player, match: room.match } : null;
  }

  private roomEvent(
    room: Room,
    event: string,
    payload: Record<string, unknown>,
  ): CommittedRoomEvent {
    return {
      deliveries: room.players.map((player) => ({
        socketId: player.socketId,
        event,
        payload,
      })),
    };
  }

  private combineEvents(...events: CommittedRoomEvent[]): CommittedRoomEvent {
    return { deliveries: events.flatMap((event) => event.deliveries) };
  }

  private finishMatch(
    room: Room,
    requestedResult: TerminalResult,
  ): FinishMatchResult {
    const match = room.match;
    if (!match) return { applied: false, result: null };

    const transition = match.finish(requestedResult);
    const canonicalResult = transition.success
      ? transition.result
      : match.getGameState().terminalResult;
    if (!canonicalResult || room.phase === 'finished') {
      return { applied: false, result: canonicalResult };
    }

    room.phase = 'finished';
    this.clearAllRoomTimers(room);
    room.overrideDeadlineAtMs = undefined;
    return {
      applied: true,
      result: canonicalResult,
      event: this.roomEvent(room, 'match-ended', {
        winner: canonicalResult.winner,
        reason: canonicalResult.reason,
        terminalResult: canonicalResult,
      }),
    };
  }

  private stateEvent(
    room: Room,
    event: string,
    extra: Record<string, unknown> = {},
  ): CommittedRoomEvent {
    if (!room.match) return { deliveries: [] };
    return {
      deliveries: room.players.map((player) => {
        const viewer = viewerRoleForColor(player.color);
        const projectedExtra = this.projectStateEventExtra(
          event,
          extra,
          viewer,
        );
        let payload: Record<string, unknown> = {
          ...projectedExtra,
          ...projectMatchView(room.match!, viewer),
        };
        if (
          event === 'move-made' &&
          extra.isStealthMove &&
          extra.moverColor !== player.color
        ) {
          payload = { ...payload, from: null, to: null, stealthMove: true };
        }
        return { socketId: player.socketId, event, payload };
      }),
    };
  }

  private projectStateEventExtra(
    event: string,
    extra: Record<string, unknown>,
    viewer: ReturnType<typeof viewerRoleForColor>,
  ): Record<string, unknown> {
    if (event === 'skill-used') {
      return {
        skillId: extra.skillId,
        publicPlayerRef: extra.publicPlayerRef,
        actions: Array.isArray(extra.actions)
          ? projectActions(
              extra.actions as Parameters<typeof projectActions>[0],
              viewer,
            )
          : [],
      };
    }
    if (event === 'move-made') {
      return {
        ...(extra.from === undefined ? {} : { from: extra.from }),
        ...(extra.to === undefined ? {} : { to: extra.to }),
        ...(extra.capturedPiece === undefined
          ? {}
          : { capturedPiece: extra.capturedPiece }),
        ...(extra.isStealthMove === undefined
          ? {}
          : { isStealthMove: extra.isStealthMove }),
        ...(extra.moverColor === undefined
          ? {}
          : { moverColor: extra.moverColor }),
      };
    }
    return {};
  }

  /**
   * Generate a random 6-character room code
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
    let code: string;
    do {
      code = Array.from(
        { length: 6 },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join('');
    } while (this.rooms.has(code));
    return code;
  }

  /**
   * Generate a unique player ID
   */
  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generatePublicPlayerRef(): PublicPlayerRef {
    return publicPlayerRef(`public_${Math.random().toString(36).slice(2, 10)}`);
  }

  /**
   * Create a new room and add the creator as the first player
   */
  createRoom(socketId: string): {
    roomCode: string;
    playerId: string;
    publicPlayerRef: PublicPlayerRef;
  } {
    const code = this.generateRoomCode();
    const playerId = this.generatePlayerId();
    const publicPlayerRef = this.generatePublicPlayerRef();
    const player: Player = {
      id: playerId,
      publicPlayerRef,
      socketId,
      color: Color.White,
      connected: true,
    };

    const room: Room = {
      code,
      players: [player],
      match: null,
      disconnectTimers: new Map(),
      lobbyCleanupTimers: new Map(),
      phase: 'waiting',
    };

    this.rooms.set(code, room);
    return { roomCode: code, playerId, publicPlayerRef };
  }

  /**
   * Join an existing room
   */
  joinRoom(
    roomCode: string,
    socketId: string,
  ): {
    success: boolean;
    playerId?: string;
    publicPlayerRef?: PublicPlayerRef;
    error?: string;
    players?: Player[];
  } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    if (room.players.length >= 2) {
      return { success: false, error: 'Room is full' };
    }

    const playerId = this.generatePlayerId();
    const publicPlayerRef = this.generatePublicPlayerRef();
    const hostColor = room.players[0]?.color ?? Color.White;
    const guestColor = hostColor === Color.White ? Color.Black : Color.White;

    const player: Player = {
      id: playerId,
      publicPlayerRef,
      socketId,
      color: guestColor,
      connected: true,
    };

    room.players.push(player);
    return { success: true, playerId, publicPlayerRef, players: room.players };
  }

  beginDraft(
    roomCode: string,
    onTimeout: () => void,
  ):
    | {
        success: true;
        draftEndTime: number;
        players: Player[];
        event: CommittedRoomEvent;
      }
    | { success: false } {
    const room = this.rooms.get(roomCode);
    if (!room || room.players.length !== 2 || room.phase !== 'waiting') {
      return { success: false };
    }
    room.phase = 'draft';
    room.draftEndTime = Date.now() + 60_000;
    room.draftTimer = setTimeout(
      () => this.runOrDeferPhaseTransition(room, onTimeout),
      60_000,
    );
    return {
      success: true,
      draftEndTime: room.draftEndTime,
      players: room.players,
      event: this.roomEvent(room, 'draft-started', {
        roomCode,
        draftEndTime: room.draftEndTime,
        players: room.players.map((player) => ({
          publicPlayerRef: player.publicPlayerRef,
          color: player.color,
        })),
      }),
    };
  }

  beginReveal(
    roomCode: string,
    onComplete: () => void,
  ):
    | {
        success: true;
        whitePlayer?: Player;
        blackPlayer?: Player;
        event: CommittedRoomEvent;
      }
    | { success: false } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false };
    room.phase = 'reveal';
    this.clearDraftTimers(room);
    room.revealTimer = setTimeout(
      () => this.runOrDeferPhaseTransition(room, onComplete),
      3_000,
    );
    const whitePlayer = room.players.find(
      (player) => player.color === Color.White,
    );
    const blackPlayer = room.players.find(
      (player) => player.color === Color.Black,
    );
    return {
      success: true,
      whitePlayer,
      blackPlayer,
      event: this.roomEvent(room, 'draft-completed', {
        whitePublicPlayerRef: whitePlayer?.publicPlayerRef,
        whiteVariantId: whitePlayer?.variantId || 'lightning',
        blackPublicPlayerRef: blackPlayer?.publicPlayerRef,
        blackVariantId: blackPlayer?.variantId || 'lightning',
      }),
    };
  }

  beginLoading(
    roomCode: string,
    onComplete: () => void,
  ): { success: true; event: CommittedRoomEvent } | { success: false } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false };
    room.phase = 'loading';
    room.loadingTimer = setTimeout(
      () => this.runOrDeferPhaseTransition(room, onComplete),
      5_000,
    );
    return {
      success: true,
      event: this.roomEvent(room, 'loading-started', {}),
    };
  }

  /**
   * Change color of a player in a room (only allowed if match hasn't started)
   */
  changePlayerColor(
    context: CommandContext,
    color: Color,
  ): { success: boolean; error?: string; event?: CommittedRoomEvent } {
    const resolved = this.resolveCommand(context);
    if (!resolved)
      return { success: false, error: 'Command context is no longer valid' };
    const { room, player } = resolved;
    if (room.match) {
      return {
        success: false,
        error: 'Cannot change color after match starts',
      };
    }

    player.color = color;

    // If there is a second player, they must get the opposite color
    const otherPlayer = room.players.find((p) => p.id !== context.playerId);
    if (otherPlayer) {
      otherPlayer.color = color === Color.White ? Color.Black : Color.White;
    }

    return {
      success: true,
      event: this.roomEvent(room, 'player-color-changed', {
        publicPlayerRef: player.publicPlayerRef,
        color,
      }),
    };
  }

  /**
   * Start the match in a room
   */
  startMatch(
    roomCode: string,
    onAsyncEvent?: CommittedEventSink,
  ): {
    success: boolean;
    error?: string;
    event?: CommittedRoomEvent;
  } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    if (room.players.length !== 2) {
      return { success: false, error: 'Need exactly 2 players' };
    }
    if (room.players.some((player) => !player.connected)) {
      return { success: false, error: 'All players must be connected' };
    }
    if (room.match) {
      return { success: false, error: 'Match already started' };
    }

    room.match = new Match(this.nowMs);
    room.phase = 'playing';
    this.clearDraftTimers(room);

    // Load variants selected during lobby phase
    const whitePlayer = room.players.find((p) => p.color === Color.White);
    const blackPlayer = room.players.find((p) => p.color === Color.Black);
    room.match.setVariants(
      whitePlayer?.variantId || null,
      blackPlayer?.variantId || null,
    );

    room.match.start();
    this.armTurnDeadline(room, onAsyncEvent);

    return {
      success: true,
      event: this.stateEvent(room, 'match-started'),
    };
  }

  /**
   * Select a variant for a player in a room
   */
  selectVariant(
    context: CommandContext,
    variantId: string | null,
  ): { success: boolean; error?: string; event?: CommittedRoomEvent } {
    const resolved = this.resolveCommand(context);
    if (!resolved)
      return { success: false, error: 'Command context is no longer valid' };
    const { room, player } = resolved;
    if (room.match) {
      return {
        success: false,
        error: 'Cannot change variant after match starts',
      };
    }

    if (player.variantConfirmed) {
      return { success: false, error: 'Variant already confirmed' };
    }

    player.variantId = variantId;
    return {
      success: true,
      event: this.roomEvent(room, 'player-variant-selected', {
        publicPlayerRef: player.publicPlayerRef,
        variantId: null,
        confirmed: false,
      }),
    };
  }

  /**
   * Confirm variant choice for a player
   */
  confirmVariant(context: CommandContext): {
    success: boolean;
    error?: string;
    allConfirmed?: boolean;
    event?: CommittedRoomEvent;
  } {
    const resolved = this.resolveCommand(context);
    if (!resolved)
      return { success: false, error: 'Command context is no longer valid' };
    const { room, player } = resolved;
    if (room.phase !== 'draft') {
      return { success: false, error: 'Not in draft phase' };
    }

    // Default to 'lightning' if none selected
    if (!player.variantId) {
      player.variantId = 'lightning';
    }

    player.variantConfirmed = true;

    const allConfirmed =
      room.players.length === 2 &&
      room.players.every((p) => p.variantConfirmed);
    return {
      success: true,
      allConfirmed,
      event: this.roomEvent(room, 'player-variant-confirmed', {
        publicPlayerRef: player.publicPlayerRef,
        confirmed: true,
      }),
    };
  }

  confirmUnconfirmedVariants(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== 'draft') return false;
    for (const player of room.players) {
      if (!player.variantConfirmed) {
        player.variantId ??= 'lightning';
        player.variantConfirmed = true;
      }
    }
    return true;
  }

  completeDraft(
    roomCode: string,
    onComplete: () => void,
  ):
    | {
        success: true;
        whitePlayer?: Player;
        blackPlayer?: Player;
        event: CommittedRoomEvent;
      }
    | { success: false } {
    if (!this.confirmUnconfirmedVariants(roomCode)) return { success: false };
    return this.beginReveal(roomCode, onComplete);
  }

  /**
   * Clear all draft/reveal/loading timers for a room
   */
  clearDraftTimers(room: Room): void {
    if (room.draftTimer) {
      clearTimeout(room.draftTimer);
      room.draftTimer = undefined;
    }
    if (room.revealTimer) {
      clearTimeout(room.revealTimer);
      room.revealTimer = undefined;
    }
    if (room.loadingTimer) {
      clearTimeout(room.loadingTimer);
      room.loadingTimer = undefined;
    }
    room.pendingPhaseResume = undefined;
  }

  private runOrDeferPhaseTransition(room: Room, transition: () => void): void {
    if (room.players.every((player) => player.connected)) {
      transition();
      return;
    }
    room.pendingPhaseResume = transition;
  }

  /**
   * Execute a variant skill
   */
  useSkill(
    context: CommandContext,
    skillId: string,
    targets: SkillTarget[],
    onAsyncEvent?: CommittedEventSink,
  ): {
    success: boolean;
    error?: string;
    actions?: any[];
    winner?: Color;
    event?: CommittedRoomEvent;
  } {
    const resolved = this.resolveCommand(context);
    if (!resolved)
      return { success: false, error: 'Command context is no longer valid' };
    const { room, player, match } = resolved;
    if (!match) {
      return { success: false, error: 'Match not started' };
    }
    const previousPlyIndex = match.getPlyIndex();
    const hadOverride = match.getTurnTimeoutOverrideMs() !== null;
    const result = match.useSkill(player.color, skillId, targets);
    if (!result.success) {
      return { success: false, error: result.reason };
    }

    const terminal = match.getGameState().terminalResult;
    const completion = terminal ? this.finishMatch(room, terminal) : null;
    const winner = terminal?.winner ?? undefined;
    let event = this.stateEvent(room, 'skill-used', {
      skillId,
      publicPlayerRef: player.publicPlayerRef,
      actions: result.actions,
    });
    if (completion?.applied) {
      event = this.combineEvents(event, completion.event);
    }
    if (!terminal) {
      this.armAfterCommittedAction(
        room,
        previousPlyIndex,
        hadOverride,
        onAsyncEvent,
      );
    }
    return {
      success: true,
      actions: result.actions,
      winner,
      event,
    };
  }

  /**
   * Helper to check if a player can afford any variant skill
   */
  private canPlayerUseAnySkill(match: Match, color: Color): boolean {
    const state = match.getGameState();
    const variantId =
      color === Color.White ? state.whiteVariantId : state.blackVariantId;
    if (!variantId) return false;

    const variant = match.getVariantRegistry().get(variantId);
    if (!variant) return false;

    const playerAP = color === Color.White ? state.whiteAP : state.blackAP;
    for (const skill of variant.skills) {
      const cost =
        typeof skill.apCost === 'function'
          ? skill.apCost(state, color)
          : skill.apCost;
      if (playerAP >= cost) {
        return true;
      }
    }
    return false;
  }

  /**
   * Process a move from a player
   */
  makeMove(
    context: CommandContext,
    from: string,
    to: string,
    onAsyncEvent?: CommittedEventSink,
  ): {
    success: boolean;
    error?: string;
    capturedPiece?: { type: string; color: string };
    isKingCaptured?: boolean;
    winner?: Color;
    isStealthMove?: boolean;
    event?: CommittedRoomEvent;
  } {
    const resolved = this.resolveCommand(context);
    if (!resolved)
      return { success: false, error: 'Command context is no longer valid' };
    const { room, player, match } = resolved;
    if (!match) {
      return { success: false, error: 'Match not started' };
    }

    const fromPos = fromAlgebraic(from);
    const toPos = fromAlgebraic(to);

    const previousPlyIndex = match.getPlyIndex();
    const hadOverride = match.getTurnTimeoutOverrideMs() !== null;
    const result = match.makeMove(player.color, fromPos, toPos);
    if (!result.success) {
      const terminal = match.getGameState().terminalResult;
      if (terminal) {
        const completion = this.finishMatch(room, terminal);
        if (completion.applied) onAsyncEvent?.(completion.event);
      }
      return { success: false, error: result.reason };
    }

    const terminal = match.getGameState().terminalResult;
    const completion = terminal ? this.finishMatch(room, terminal) : null;
    const winner = terminal?.winner ?? undefined;
    let event = this.stateEvent(room, 'move-made', {
      from,
      to,
      capturedPiece: result.capturedPiece,
      isStealthMove: result.isStealthMove,
      moverColor: player.color,
    });
    if (completion?.applied) {
      event = this.combineEvents(event, completion.event);
    }
    if (!terminal) {
      this.armAfterCommittedAction(
        room,
        previousPlyIndex,
        hadOverride,
        onAsyncEvent,
      );
    }
    return {
      success: true,
      capturedPiece: result.capturedPiece,
      isKingCaptured: result.isKingCaptured,
      winner,
      isStealthMove: result.isStealthMove,
      event,
    };
  }

  /**
   * Process a pass skill action
   */
  passSkill(
    context: CommandContext,
    onAsyncEvent?: CommittedEventSink,
  ): {
    success: boolean;
    error?: string;
    event?: CommittedRoomEvent;
  } {
    const resolved = this.resolveCommand(context);
    if (!resolved)
      return { success: false, error: 'Command context is no longer valid' };
    const { room, player, match } = resolved;
    if (!match) {
      return { success: false, error: 'Match not started' };
    }
    const previousPlyIndex = match.getPlyIndex();
    const hadOverride = match.getTurnTimeoutOverrideMs() !== null;
    const result = match.submitAction(
      { type: 'PASS_SKILL', player: player.color },
      player.color,
    );
    if (!result.success) {
      return { success: false, error: result.reason };
    }

    const terminal = match.getGameState().terminalResult;
    const completion = terminal ? this.finishMatch(room, terminal) : null;
    let event = this.stateEvent(room, 'move-made');
    if (completion?.applied)
      event = this.combineEvents(event, completion.event);
    if (!terminal) {
      this.armAfterCommittedAction(
        room,
        previousPlyIndex,
        hadOverride,
        onAsyncEvent,
      );
    }
    return {
      success: true,
      event,
    };
  }

  /**
   * Process an explicit manual end turn action
   */
  endTurn(
    context: CommandContext,
    onAsyncEvent?: CommittedEventSink,
  ): {
    success: boolean;
    error?: string;
    event?: CommittedRoomEvent;
  } {
    const resolved = this.resolveCommand(context);
    if (!resolved)
      return { success: false, error: 'Command context is no longer valid' };
    const { room, player, match } = resolved;
    if (!match) {
      return { success: false, error: 'Match not started' };
    }
    const previousPlyIndex = match.getPlyIndex();
    const hadOverride = match.getTurnTimeoutOverrideMs() !== null;
    const result = match.submitAction(
      { type: 'END_TURN', player: player.color },
      player.color,
    );
    if (!result.success) {
      return { success: false, error: result.reason };
    }

    const terminal = match.getGameState().terminalResult;
    const completion = terminal ? this.finishMatch(room, terminal) : null;
    let event = this.stateEvent(room, 'move-made');
    if (completion?.applied)
      event = this.combineEvents(event, completion.event);
    if (!terminal) {
      this.armAfterCommittedAction(
        room,
        previousPlyIndex,
        hadOverride,
        onAsyncEvent,
      );
    }
    return {
      success: true,
      event,
    };
  }

  sacrificePiece(
    context: CommandContext,
    position: { col: number; row: number },
    pieceId: string,
    onAsyncEvent?: CommittedEventSink,
  ): { success: boolean; error?: string; event?: CommittedRoomEvent } {
    const resolved = this.resolveCommand(context);
    if (!resolved?.match)
      return {
        success: false,
        error: 'Room, match, or command context not found',
      };
    const { room, player, match } = resolved;
    const previousPlyIndex = match.getPlyIndex();
    const hadOverride = match.getTurnTimeoutOverrideMs() !== null;
    const result = match.submitAction(
      {
        type: 'SACRIFICE_PIECE',
        pieceId,
        position,
        player: player.color,
      },
      player.color,
    );
    if (!result.success) {
      return { success: false, error: result.reason ?? 'Sacrifice rejected' };
    }
    const terminal = match.getGameState().terminalResult;
    const completion = terminal ? this.finishMatch(room, terminal) : null;
    let event = this.stateEvent(room, 'move-made');
    if (completion?.applied)
      event = this.combineEvents(event, completion.event);
    if (!terminal) {
      this.armAfterCommittedAction(
        room,
        previousPlyIndex,
        hadOverride,
        onAsyncEvent,
      );
    }
    return { success: true, event };
  }

  surrender(
    context: CommandContext,
  ):
    | { success: true; winner: Color; event: CommittedRoomEvent }
    | { success: false; error: string } {
    const resolved = this.resolveCommand(context);
    if (!resolved?.match)
      return {
        success: false,
        error: 'Match or command context is no longer valid',
      };
    const completion = this.finishMatch(
      resolved.room,
      createTerminalResult('surrender', resolved.player.color),
    );
    if (!completion.applied || completion.result.outcome !== 'win') {
      return { success: false, error: 'Match is already finished' };
    }
    return {
      success: true,
      winner: completion.result.winner,
      event: completion.event,
    };
  }

  private armAfterCommittedAction(
    room: Room,
    previousPlyIndex: number,
    hadOverride: boolean,
    onAsyncEvent?: CommittedEventSink,
  ): void {
    const match = room.match;
    if (!match) return;
    const overrideMs = match.getTurnTimeoutOverrideMs();
    if (match.getPlyIndex() !== previousPlyIndex) {
      room.overrideDeadlineAtMs =
        overrideMs != null ? match.getCurrentTimeMs() + overrideMs : undefined;
      this.armTurnDeadline(room, onAsyncEvent);
    } else if (!hadOverride && overrideMs != null) {
      room.overrideDeadlineAtMs = match.getCurrentTimeMs() + overrideMs;
      this.armTurnDeadline(room, onAsyncEvent);
    }
  }

  private armTurnDeadline(room: Room, onAsyncEvent?: CommittedEventSink): void {
    this.clearTurnTimeout(room.code);
    const match = room.match;
    if (!match || match.getStatus() !== 'playing') return;

    const overrideMs = match.getTurnTimeoutOverrideMs();
    let deadline: TurnDeadline | null;
    let kind: ArmedTurnDeadline['kind'];
    if (overrideMs != null) {
      const overrideDeadlineAtMs =
        room.overrideDeadlineAtMs ?? match.getCurrentTimeMs() + overrideMs;
      room.overrideDeadlineAtMs = overrideDeadlineAtMs;
      deadline = {
        atMs: overrideDeadlineAtMs,
        loser: match.getCurrentTurn(),
        reason: 'turn_timeout',
        plyIndex: match.getPlyIndex(),
      };
      kind = 'override_skip';
    } else {
      room.overrideDeadlineAtMs = undefined;
      deadline = match.nextDeadline();
      kind = 'terminal';
    }
    if (!deadline) return;

    const token = {
      roomCode: room.code,
      match,
      plyIndex: deadline.plyIndex,
      atMs: deadline.atMs,
      kind,
    };
    const timeout = setTimeout(
      () => this.handleTurnDeadline(token, onAsyncEvent),
      Math.max(0, deadline.atMs - match.getCurrentTimeMs()),
    );
    timeout.unref?.();
    room.turnDeadline = { ...token, timeout };
  }

  private handleTurnDeadline(
    token: Omit<ArmedTurnDeadline, 'timeout'>,
    onAsyncEvent?: CommittedEventSink,
  ): void {
    const room = this.rooms.get(token.roomCode);
    const armed = room?.turnDeadline;
    if (
      !room ||
      !armed ||
      armed.match !== token.match ||
      armed.plyIndex !== token.plyIndex ||
      armed.atMs !== token.atMs ||
      armed.kind !== token.kind ||
      room.match !== token.match ||
      token.match.getStatus() !== 'playing' ||
      token.match.getPlyIndex() !== token.plyIndex
    ) {
      return;
    }
    room.turnDeadline = undefined;

    if (token.match.getCurrentTimeMs() < token.atMs) {
      this.armTurnDeadline(room, onAsyncEvent);
      return;
    }

    if (token.kind === 'override_skip') {
      if (token.match.getTurnTimeoutOverrideMs() === null) {
        this.armTurnDeadline(room, onAsyncEvent);
        return;
      }
      room.overrideDeadlineAtMs = undefined;
      const result = token.match.handleTimeoutSkip(
        token.match.getCurrentTurn(),
      );
      if (!result.success) return;
      onAsyncEvent?.(this.stateEvent(room, 'move-made'));
      this.armTurnDeadline(room, onAsyncEvent);
      return;
    }

    const expired = token.match.consumeDeadline(token.plyIndex);
    if (!expired) {
      this.armTurnDeadline(room, onAsyncEvent);
      return;
    }
    const completion = this.finishMatch(
      room,
      createTerminalResult(expired.reason, expired.loser),
    );
    if (completion.applied) onAsyncEvent?.(completion.event);
  }

  /**
   * Get the room a socket belongs to
   */
  getRoomBySocketId(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.socketId === socketId)) {
        return room;
      }
    }
    return undefined;
  }

  /**
   * Get a player by socket ID
   */
  getPlayerBySocketId(socketId: string): Player | undefined {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (player) return player;
    }
    return undefined;
  }

  /**
   * Handle player disconnect - starts a 60-second timer
   */
  handleDisconnect(
    socketId: string,
    onAsyncEvent?: CommittedEventSink,
  ): {
    roomCode: string;
    playerId: string;
    publicPlayerRef: PublicPlayerRef;
    event: CommittedRoomEvent;
  } | null {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return null;

    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) return null;

    player.connected = false;
    this.clearPlayerDisconnectTimers(room, player.id);
    const playingMatch =
      room.match?.getStatus() === 'playing' ? room.match : null;
    if (playingMatch) {
      const snapshot: Omit<DisconnectForfeitTimer, 'timeout'> = {
        roomCode: room.code,
        match: playingMatch,
        playerId: player.id,
        publicPlayerRef: player.publicPlayerRef,
        color: player.color,
      };
      const timeout = setTimeout(() => {
        const activeRoom = this.rooms.get(snapshot.roomCode);
        if (
          !activeRoom ||
          activeRoom.match !== snapshot.match ||
          snapshot.match.getStatus() !== 'playing'
        ) {
          return;
        }
        activeRoom.disconnectTimers.delete(snapshot.playerId);
        const completion = this.finishMatch(
          activeRoom,
          createTerminalResult('forfeit_disconnect', snapshot.color),
        );
        if (completion.applied) onAsyncEvent?.(completion.event);
      }, 60_000);
      room.disconnectTimers.set(player.id, { ...snapshot, timeout });
    } else if (
      !room.match ||
      room.match.getStatus() === 'waiting' ||
      room.phase === 'waiting' ||
      room.phase === 'draft' ||
      room.phase === 'reveal' ||
      room.phase === 'loading'
    ) {
      const snapshot: Omit<LobbyCleanupTimer, 'timeout'> = {
        roomCode: room.code,
        playerId: player.id,
        publicPlayerRef: player.publicPlayerRef,
      };
      const timeout = setTimeout(() => {
        const activeRoom = this.rooms.get(snapshot.roomCode);
        if (!activeRoom) return;
        activeRoom.lobbyCleanupTimers.delete(snapshot.playerId);
        onAsyncEvent?.(
          this.roomEvent(activeRoom, 'lobby-closed', {
            publicPlayerRef: snapshot.publicPlayerRef,
            reason: 'player_disconnected',
          }),
        );
        this.removeRoom(snapshot.roomCode);
      }, 60_000);
      room.lobbyCleanupTimers.set(player.id, { ...snapshot, timeout });
    }
    return {
      roomCode: room.code,
      playerId: player.id,
      publicPlayerRef: player.publicPlayerRef,
      event: this.roomEvent(room, 'player-disconnected', {
        publicPlayerRef: player.publicPlayerRef,
      }),
    };
  }

  /**
   * Clear the current turn timeout
   */
  clearTurnTimeout(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room?.turnDeadline) {
      clearTimeout(room.turnDeadline.timeout);
      room.turnDeadline = undefined;
    }
  }

  private clearDisconnectTimers(room: Room): void {
    for (const timer of room.disconnectTimers.values()) {
      clearTimeout(timer.timeout);
    }
    room.disconnectTimers.clear();
    for (const timer of room.lobbyCleanupTimers.values()) {
      clearTimeout(timer.timeout);
    }
    room.lobbyCleanupTimers.clear();
  }

  private clearPlayerDisconnectTimers(room: Room, playerId: string): void {
    const forfeitTimer = room.disconnectTimers.get(playerId);
    if (forfeitTimer) {
      clearTimeout(forfeitTimer.timeout);
      room.disconnectTimers.delete(playerId);
    }
    const cleanupTimer = room.lobbyCleanupTimers.get(playerId);
    if (cleanupTimer) {
      clearTimeout(cleanupTimer.timeout);
      room.lobbyCleanupTimers.delete(playerId);
    }
  }

  private clearAllRoomTimers(room: Room): void {
    this.clearDraftTimers(room);
    this.clearTurnTimeout(room.code);
    this.clearDisconnectTimers(room);
  }

  /**
   * Handle player reconnect
   */
  handleReconnect(
    roomCode: string,
    playerId: string,
    newSocketId: string,
  ): {
    success: boolean;
    playerColor?: Color;
    publicPlayerRef?: PublicPlayerRef;
    error?: string;
  } {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Clear disconnect timer
    this.clearPlayerDisconnectTimers(room, playerId);

    player.socketId = newSocketId;
    player.connected = true;

    if (
      room.pendingPhaseResume &&
      room.players.every((candidate) => candidate.connected)
    ) {
      const resume = room.pendingPhaseResume;
      room.pendingPhaseResume = undefined;
      resume();
    }

    return {
      success: true,
      playerColor: player.color,
      publicPlayerRef: player.publicPlayerRef,
    };
  }

  /**
   * Remove a room entirely
   */
  removeRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      this.clearAllRoomTimers(room);
      this.rooms.delete(roomCode);
    }
  }

  /**
   * Get room by code
   */
  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }
}
