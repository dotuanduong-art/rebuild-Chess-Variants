import { TrustedInputSchema, DomainEventSchema } from '@variant-chess/shared-types';
import type {
  GameState,
  DomainEvent,
  RootCommand,
  PlayerSide,
  PieceId,
  Piece,
  SerializableValue,
} from '@variant-chess/shared-types';
import {
  assertGameState,
  deepFreeze,
  BASE_RULESET_ID,
  allocateGameId,
  appendGameHistory,
} from './state.js';
import { recordActionReady } from './repetition.js';
import type { RepetitionProjection } from './repetition.js';
import type { RulesetIdentity } from './state.js';
import {
  applyBaseMainMove,
  endBaseTurn,
  commitNormalSkillUsage,
  applyBaseDestruction,
} from './base-game.js';
import type { BasePosition, BaseOperationResult, TurnState, TurnBoundary } from './base-game.js';
import { chooseCanonical } from './random.js';
import { cloneData } from './canonical.js';
import { generateBaseMoves } from './movement.js';
import { getPieceAt, getPiece } from './board.js';
import type { EffectRegistry } from './effects.js';

export type DerivedOperation =
  | { readonly kind: 'destroy'; readonly pieceId: string }
  | {
      readonly kind: 'random';
      readonly side: PlayerSide | 'actor';
      readonly namespace: string;
      readonly pool: readonly string[];
    }
  | {
      readonly kind: 'variant';
      readonly side: PlayerSide | 'actor';
      readonly namespace: string;
      readonly value: SerializableValue;
    }
  | { readonly kind: 'marker'; readonly value: string }
  | { readonly kind: 'fail'; readonly code: string };
export interface EventHandler {
  readonly id: string;
  readonly order: number;
  readonly react: (event: DomainEvent, state: GameState) => readonly DerivedOperation[];
}
export interface CaptureInterceptor {
  readonly id: string;
  readonly order: number;
  readonly intercept: (context: {
    readonly state: GameState;
    readonly attacker: Piece;
    readonly victim: Piece;
  }) =>
    | { readonly kind: 'allow' | 'cancel' }
    | { readonly kind: 'redirect'; readonly targetId: string };
}
export interface RulesetBundle extends RulesetIdentity {
  readonly effectRegistry?: EffectRegistry;
  readonly repetition?: RepetitionProjection;
  readonly skills?: Readonly<
    Record<string, { readonly cost: number; readonly operations: readonly DerivedOperation[] }>
  >;
  readonly handlers?: readonly EventHandler[];
  readonly interceptors?: readonly CaptureInterceptor[];
}
export interface TransactionOptions {
  readonly operationBudget?: number;
  readonly validate?: (state: GameState) => void;
}
export type TransactionResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly DomainEvent[] }
  | { readonly ok: false; readonly code: string; readonly events: readonly [] };
type MutableState = { -readonly [K in keyof GameState]: GameState[K] };
export function resolveCommand(
  state: GameState,
  raw: unknown,
  ruleset: RulesetBundle = BASE_RULESET_ID,
  options: TransactionOptions = {},
): TransactionResult {
  const rejected = (code: string): TransactionResult => ({ ok: false, code, events: [] });
  const parsed = TrustedInputSchema.safeParse(raw);
  if (!parsed.success) return rejected('INVALID_COMMAND');
  try {
    assertGameState(state);
  } catch {
    return rejected('INVARIANT');
  }
  if (state.terminal.status !== 'ongoing') return rejected('TERMINAL');
  if (state.rulesetHash !== ruleset.hash || state.rulesetVersion !== ruleset.version)
    return rejected('RULESET_MISMATCH');
  if (state.effects.length || state.delayedActions.length) return rejected('UNSUPPORTED_RUNTIME');
  const { authority, command } = parsed.data;
  if (command.kind === 'destroy' ? authority.kind !== 'system' : authority.kind !== 'player')
    return rejected('UNAUTHORIZED');
  const actor = authority.kind === 'player' ? authority.side : state.turn.sideToAct;
  if (authority.kind === 'player' && actor !== state.turn.sideToAct) return rejected('WRONG_TURN');
  const budget = options.operationBudget ?? 512;
  if (!Number.isSafeInteger(budget) || budget < 1) return rejected('INVALID_BUDGET');
  const handlers = [...(ruleset.handlers ?? [])].sort(
    (a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  if (
    new Set(handlers.map((h) => h.id)).size !== handlers.length ||
    handlers.some((h) => !Number.isSafeInteger(h.order))
  )
    return rejected('INVALID_RULESET');
  const interceptors = [...(ruleset.interceptors ?? [])].sort(
    (a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  if (
    new Set(interceptors.map((h) => h.id)).size !== interceptors.length ||
    interceptors.some((h) => !Number.isSafeInteger(h.order))
  )
    return rejected('INVALID_RULESET');
  let candidate: MutableState;
  try {
    candidate = cloneData(state);
  } catch {
    return rejected('INVARIANT');
  }
  const events: DomainEvent[] = [];
  const dead = new Set<string>();
  function allocate(kind: keyof GameState['counters']): string {
    const allocation = allocateGameId(candidate.matchId, candidate.counters, kind);
    candidate.counters = allocation.counters;
    return allocation.id;
  }
  try {
    const transactionId = allocate('transaction');
    type QueueItem = { operation: RootCommand | DerivedOperation; id: string; causeId: string };
    const queue: QueueItem[] = [];
    let started = false;
    let turnCauseId = transactionId;
    let steps = 0;
    let cursor = 0;
    let pending:
      | {
          turn: TurnState;
          boundaries: readonly TurnBoundary[];
          phase: 'end' | 'start';
          causeId: string;
        }
      | undefined;
    function enqueue(operation: QueueItem['operation'], causeId: string) {
      if (queue.length >= budget) throw new Error('RESOLUTION_LIMIT');
      queue.push({ operation, causeId, id: allocate('operation') });
    }
    function emit<K extends DomainEvent['kind']>(
      kind: K,
      payload: Extract<DomainEvent, { kind: K }>['payload'],
      causeId: string,
    ) {
      const id = allocate('event');
      const event = deepFreeze(
        DomainEventSchema.parse({
          kind,
          payload,
          id,
          transactionId,
          causeId,
          sequence: candidate.counters.event,
          visibility: 'internal',
        }),
      );
      events.push(event);
      if (candidate.terminal.status === 'ongoing')
        for (const handler of handlers) {
          for (const operation of handler.react(event, deepFreeze(cloneData(candidate))))
            enqueue(operation, event.id);
        }
    }
    function basePosition(): BasePosition {
      return {
        board: candidate.board,
        ap: candidate.ap,
        turn: candidate.turn,
        terminal: { status: 'ongoing' },
      };
    }
    enqueue(command, transactionId);
    while (cursor < queue.length || pending) {
      if (++steps > budget) throw new Error('RESOLUTION_LIMIT');
      if (candidate.terminal.status !== 'ongoing') break;
      if (cursor >= queue.length && pending) {
        const boundary = pending.boundaries[pending.phase === 'end' ? 0 : 1]!;
        const causeId = pending.causeId;
        if (pending.phase === 'end') {
          pending.phase = 'start';
          emit('turn_ended', { ...boundary, kind: 'turnEnd' }, causeId);
        } else {
          candidate.turn = pending.turn;
          pending = undefined;
          started = true;
          turnCauseId = causeId;
          emit('turn_started', { ...boundary, kind: 'turnStart' }, causeId);
        }
        continue;
      }
      const item = queue[cursor++]!;
      let operation = item.operation;
      if (operation.kind === 'move') {
        const destination = operation.to;
        const attacker = getPiece(candidate.board, operation.pieceId);
        if (
          !attacker ||
          attacker.controller !== actor ||
          !generateBaseMoves(candidate.board, attacker.id).some(
            (m) => m.to.file === destination.file && m.to.rankIndex === destination.rankIndex,
          )
        )
          throw new Error('INVALID_MOVE');
        let victim = getPieceAt(candidate.board, operation.to);
        if (victim)
          for (const interceptor of interceptors) {
            const decision = interceptor.intercept(
              deepFreeze({
                state: cloneData(candidate),
                attacker: cloneData(attacker),
                victim: cloneData(victim),
              }),
            );
            if (decision.kind === 'cancel') throw new Error('CAPTURE_CANCELED');
            if (decision.kind === 'redirect') {
              victim = getPiece(candidate.board, decision.targetId as PieceId);
              if (
                !victim ||
                !generateBaseMoves(candidate.board, attacker.id).some(
                  (m) => m.kind === 'capture' && m.targetId === victim!.id,
                )
              )
                throw new Error('INVALID_REDIRECT');
              operation = { ...operation, to: victim.position };
            }
          }
      }
      if (operation.kind === 'fail') throw new Error(operation.code);
      if (operation.kind === 'marker') {
        emit('marker', { value: operation.value }, item.causeId);
        continue;
      }
      if (operation.kind === 'variant' || operation.kind === 'random') {
        const side = operation.side === 'actor' ? actor : operation.side;
        let value: SerializableValue;
        if (operation.kind === 'random') {
          const chosen = chooseCanonical(candidate.rng, operation.pool);
          candidate.rng = chosen.state;
          value = chosen.value;
          emit('random_chosen', { side, namespace: operation.namespace, value }, item.causeId);
        } else value = operation.value;
        candidate.variantState = {
          ...candidate.variantState,
          [side]: {
            ...candidate.variantState[side],
            [operation.namespace]: cloneData(value),
          },
        };
        emit('variant_state_changed', { side, namespace: operation.namespace }, item.causeId);
        continue;
      }
      if (operation.kind === 'destroy' && dead.has(operation.pieceId)) continue;
      const before = cloneData(candidate);
      let result: BaseOperationResult;
      if (operation.kind === 'move')
        result = applyBaseMainMove(basePosition(), actor, operation.pieceId, operation.to);
      else if (operation.kind === 'end') result = endBaseTurn(basePosition(), actor);
      else if (operation.kind === 'destroy')
        result = applyBaseDestruction(basePosition(), operation.pieceId as PieceId);
      else {
        const skill = Object.hasOwn(ruleset.skills ?? {}, operation.skillId)
          ? ruleset.skills?.[operation.skillId]
          : undefined;
        if (!skill) throw new Error('NOT_AVAILABLE');
        result = commitNormalSkillUsage(basePosition(), actor, skill.cost);
        if (result.ok) for (const derived of skill.operations) enqueue(derived, item.id);
      }
      if (!result.ok) throw new Error(result.code);
      candidate.board = result.value.board as GameState['board'];
      candidate.ap = { ...result.value.ap };
      candidate.terminal = result.value.terminal;
      candidate.turn = result.boundaries.length
        ? {
            ...before.turn,
            mainMoveUsed: before.turn.mainMoveUsed || operation.kind === 'move',
            skillUsed: before.turn.skillUsed || operation.kind === 'skill',
          }
        : result.value.turn;
      if (result.boundaries.length)
        pending = {
          turn: result.value.turn,
          boundaries: result.boundaries,
          phase: 'end',
          causeId: item.id,
        };
      if (operation.kind === 'move') {
        const attacker = before.board.pieces[operation.pieceId]!;
        emit(
          'move_committed',
          {
            pieceId: attacker.id,
            from: attacker.position,
            to: operation.to,
            controller: actor,
            owner: attacker.owner,
          },
          item.id,
        );
      }
      for (const victim of Object.values(before.board.pieces).filter(
        (p) => !Object.hasOwn(candidate.board.pieces, p.id),
      )) {
        dead.add(victim.id);
        const payload = {
          pieceId: victim.id,
          owner: victim.owner,
          controller: victim.controller,
          type: victim.currentType,
        };
        if (operation.kind === 'move')
          emit('capture_committed', { ...payload, actor, attackerId: operation.pieceId }, item.id);
        else
          emit(
            'piece_destroyed',
            { ...payload, actor: authority.kind === 'system' ? null : actor },
            item.id,
          );
      }
      if (operation.kind === 'skill')
        emit(
          'skill_used',
          { actor, skillId: operation.skillId, actualCost: before.ap[actor] - candidate.ap[actor] },
          item.id,
        );
      if (candidate.terminal.status !== 'ongoing') {
        emit('terminal_reached', { ...candidate.terminal }, item.id);
        break;
      }
      for (const side of ['white', 'black'] as const)
        if (candidate.ap[side] !== before.ap[side])
          emit('ap_changed', { side, before: before.ap[side], after: candidate.ap[side] }, item.id);
      for (const piece of Object.values(candidate.board.pieces))
        if (before.board.pieces[piece.id]?.currentType === 'pawn' && piece.currentType === 'queen')
          emit('piece_promoted', { pieceId: piece.id, controller: piece.controller }, item.id);
    }
    if (started && candidate.terminal.status === 'ongoing') {
      const counted = recordActionReady(candidate, ruleset.repetition);
      candidate.history = counted.history;
      candidate.terminal = counted.terminal;
      if (candidate.terminal.status !== 'ongoing')
        emit('terminal_reached', { ...candidate.terminal }, turnCauseId);
    }
    const recorded = appendGameHistory(candidate);
    candidate.history = recorded.history;
    candidate.counters = recorded.counters;
    assertGameState(candidate);
    options.validate?.(deepFreeze(cloneData(candidate)));
    return deepFreeze({ ok: true, state: candidate, events });
  } catch (error) {
    return rejected(error instanceof Error ? error.message : 'ENGINE_ERROR');
  }
}
