import { TrustedInputSchema, DomainEventSchema } from '@variant-chess/shared-types';
import type {
  GameState,
  DomainEvent,
  RootCommand,
  PlayerSide,
  PieceId,
  Piece,
  SerializableValue,
  EffectApplication,
  EffectRemovalOperation,
  EffectRelocationOperation,
  EffectSetSwapOperation,
  DelayedScheduleOperation,
  DelayedCancelOperation,
  EffectSourceIdentity,
  ForcedRepositionOperation,
  SanctuaryCastOperation,
  CommittedCaptureContext,
  TransferenceOperation,
} from '@variant-chess/shared-types';
import {
  assertGameState,
  deepFreeze,
  BASE_RULESET_ID,
  allocateGameId,
  appendGameHistory,
  assertRulesetProfiles,
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
import { getPieceAt, getPiece } from './board.js';
import type { EffectRegistry } from './effects.js';
import {
  assertEffectRuntimeState,
  planEffectApplication,
  runtimeRepetitionProjection,
  planEffectRemoval,
  planEffectExpiration,
  planEffectCleanup,
  collectDueEffects,
} from './effect-runtime.js';
import type { EffectRuntime, EffectBoundary } from './effect-runtime.js';
import { decodeEffectRecords } from './effects.js';
import { planEffectRelocation } from './effect-relocation.js';
import { queryCandidateMainActions } from './action-legality.js';
import type { RulesetLegalityPolicy } from './action-legality.js';
import { assertCandidateCaptureAllowed } from './capture-defense.js';
import { dispatchEffectTriggers } from './effect-triggers.js';
import type { EffectInstance } from './effects.js';
import {
  assertDelayedRuntimeState,
  collectDueDelayedActions,
  decodeDelayedActions,
  delayedFact,
  delayedRepetitionProjection,
  planDelayedSchedule,
  planDelayedCancel,
} from './delayed-actions.js';
import type { DelayedActionRegistry } from './delayed-actions.js';
import { deathReactionInstances, planDeathReaction } from './committed-death.js';
import type { CommittedDeathContext } from './committed-death.js';
import { sourceOf } from './effect-parameters.js';
import { applyForcedReposition } from './forced-reposition.js';
import type { ForcedRepositionPolicy } from './forced-reposition.js';
import {
  planSanctuaryCast,
  querySanctuaryRegions,
  withoutSanctuaryRegion,
  SANCTUARY_REGION_NAMESPACE,
} from './sanctuary-region.js';
import { captureSanctuaryContext, sanctuaryStunApplication } from './committed-capture.js';
import { preflightTransference } from './transference.js';

export type DerivedOperation =
  | TransferenceOperation
  | SanctuaryCastOperation
  | ForcedRepositionOperation
  | DelayedScheduleOperation
  | DelayedCancelOperation
  | EffectApplication
  | EffectRemovalOperation
  | EffectRelocationOperation
  | EffectSetSwapOperation
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
  readonly forcedReposition?: ForcedRepositionPolicy;
  /** Declared mandatory entry consumers have no approved B2 cause policy yet. */
  readonly mandatoryEntryConsumers?: readonly string[];
  readonly legalityPolicies?: readonly RulesetLegalityPolicy[];
  readonly delayedRegistry?: DelayedActionRegistry;
  readonly effectRegistry?: EffectRegistry;
  readonly effectRuntime?: EffectRuntime;
  readonly repetition?: RepetitionProjection;
  readonly skills?: Readonly<Record<string, SkillDefinition>>;
  readonly handlers?: readonly EventHandler[];
  readonly interceptors?: readonly CaptureInterceptor[];
}
export interface SkillPlan {
  readonly cost: number;
  readonly operations: readonly DerivedOperation[];
}
export interface SkillPlanningContext {
  readonly state: GameState;
  readonly actor: PlayerSide;
  readonly command: Extract<RootCommand, { kind: 'skill' }>;
  /** C1 trusted immutable bundle, not client data. Older engines retain their original context. */
  readonly ruleset?: RulesetBundle;
}
export type SkillDefinition =
  | SkillPlan
  | {
      readonly requiredProfile: Readonly<{ id: string; version: string }>;
      readonly plan: (context: SkillPlanningContext) => SkillPlan;
    };
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
  if (
    state.engineVersion !== '0.8.0' &&
    parsed.data.command.kind === 'skill' &&
    parsed.data.command.intent?.kind === 'two-piece-target-v1'
  )
    return rejected('INVALID_COMMAND');
  if (
    state.engineVersion === '0.6.0' &&
    parsed.data.command.kind === 'skill' &&
    parsed.data.command.intent?.kind === 'cell-target-v1'
  )
    return rejected('INVALID_COMMAND');
  try {
    assertGameState(state);
    assertRulesetProfiles(state, ruleset);
  } catch {
    return rejected('INVARIANT');
  }
  if (state.terminal.status !== 'ongoing') return rejected('TERMINAL');
  if (state.rulesetHash !== ruleset.hash || state.rulesetVersion !== ruleset.version)
    return rejected('RULESET_MISMATCH');
  if (state.engineVersion === '0.8.0') {
    const skill = ruleset.skills?.['turtle.transference'];
    if (
      Object.keys(ruleset.skills ?? {}).length !== 1 ||
      !skill ||
      !('plan' in skill) ||
      skill.requiredProfile.id !== 'turtle.transference-only.experimental' ||
      skill.requiredProfile.version !== '1.0.0'
    )
      return rejected('INVALID_TRANSFERENCE_RULESET');
  }
  const runtime = ruleset.effectRuntime;
  const delayedRegistry = ruleset.delayedRegistry;
  if ((state.delayedActions.length && !delayedRegistry) || (state.effects.length && !runtime))
    return rejected('UNSUPPORTED_RUNTIME');
  if (runtime && runtime.registry !== ruleset.effectRegistry) return rejected('INVALID_RULESET');
  try {
    if (runtime) assertEffectRuntimeState(state, runtime, !!ruleset.repetition);
    if (delayedRegistry) assertDelayedRuntimeState(state, delayedRegistry);
  } catch (error) {
    return rejected(error instanceof Error ? error.message : 'INVARIANT');
  }
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
    type QueueItem = {
      operation:
        | RootCommand
        | DerivedOperation
        | { kind: 'death_reaction'; death: CommittedDeathContext; instance: EffectInstance }
        | { kind: 'sanctuary_expire'; regionId: string; boundary: EffectBoundary }
        | { kind: 'sanctuary_reaction'; capture: Readonly<CommittedCaptureContext> }
        | { kind: 'delayed_fire'; actionId: string; boundary: EffectBoundary }
        | {
            kind: 'effect_expire';
            instanceId: string;
            boundary: EffectBoundary;
          };
      id: string;
      causeId: string;
      attribution?: { source: Readonly<EffectSourceIdentity>; effectId: string };
    };
    const queue: QueueItem[] = [];
    const reactions = new Set<string>();
    let started = false;
    let repositioned = false;
    let sanctuaryCast = false;
    let transferenceSwapped = false;
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
    function enqueue(
      operation: QueueItem['operation'],
      causeId: string,
      scheduled = false,
      root = false,
      attribution?: QueueItem['attribution'],
    ) {
      if (
        !root &&
        (operation.kind === 'move' || operation.kind === 'skill' || operation.kind === 'end')
      )
        throw new Error('UNSUPPORTED_RUNTIME');
      if ((operation.kind === 'effect_expire' || operation.kind === 'delayed_fire') && !scheduled)
        throw new Error('UNSUPPORTED_RUNTIME');
      if (operation.kind === 'death_reaction' && !scheduled) throw new Error('UNSUPPORTED_RUNTIME');
      if (operation.kind === 'sanctuary_expire' && !scheduled)
        throw new Error('UNSUPPORTED_RUNTIME');
      if (operation.kind === 'sanctuary_reaction' && !scheduled)
        throw new Error('UNSUPPORTED_RUNTIME');
      if (queue.length >= budget) throw new Error('RESOLUTION_LIMIT');
      queue.push({
        operation,
        causeId,
        id: allocate('operation'),
        ...(attribution ? { attribution } : {}),
      });
    }
    function emit<K extends DomainEvent['kind']>(
      kind: K,
      payload: Extract<DomainEvent, { kind: K }>['payload'],
      causeId: string,
      retired: readonly EffectInstance[] = [],
      retiredState: GameState = candidate,
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
      if (candidate.terminal.status === 'ongoing' && runtime)
        for (const operation of dispatchEffectTriggers(
          candidate,
          event,
          runtime,
          reactions,
          retired,
          retiredState,
        ))
          enqueue(operation, event.id);
      if (candidate.terminal.status === 'ongoing')
        for (const handler of handlers) {
          for (const operation of handler.react(event, deepFreeze(cloneData(candidate))))
            enqueue(operation, event.id);
        }
      return event;
    }
    function basePosition(): BasePosition {
      return {
        board: candidate.board,
        ap: candidate.ap,
        turn: candidate.turn,
        terminal: { status: 'ongoing' },
      };
    }
    enqueue(command, transactionId, false, true);
    while (cursor < queue.length || pending) {
      if (++steps > budget) throw new Error('RESOLUTION_LIMIT');
      if (candidate.terminal.status !== 'ongoing') break;
      if (cursor >= queue.length && pending) {
        const boundary = pending.boundaries[pending.phase === 'end' ? 0 : 1]!;
        const causeId = pending.causeId;
        if (pending.phase === 'start') candidate.turn = pending.turn;
        const effectBoundary: EffectBoundary = {
          side: boundary.side,
          boundary: pending.phase,
          ordinal: Math.floor(boundary.plyIndex / 2) + 1,
        };
        if (runtime) {
          for (const instanceId of collectDueEffects(
            decodeEffectRecords(candidate.effects, runtime.registry, candidate),
            effectBoundary,
          ))
            enqueue({ kind: 'effect_expire', instanceId, boundary: effectBoundary }, causeId, true);
        }
        if (delayedRegistry)
          for (const actionId of collectDueDelayedActions(
            candidate,
            delayedRegistry,
            effectBoundary,
          ))
            enqueue({ kind: 'delayed_fire', actionId, boundary: effectBoundary }, causeId, true);
        for (const region of querySanctuaryRegions(candidate))
          if (
            region.deadline.side === effectBoundary.side &&
            region.deadline.boundary === effectBoundary.boundary &&
            region.deadline.ordinal <= effectBoundary.ordinal
          )
            enqueue(
              { kind: 'sanctuary_expire', regionId: region.id, boundary: effectBoundary },
              causeId,
              true,
            );
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
      let sanctuaryReaction: Readonly<CommittedCaptureContext> | undefined;
      if (operation.kind === 'sanctuary_reaction') {
        if (ruleset.sanctuary?.kind !== 'sanctuary-v1' || !runtime)
          throw new Error('UNSUPPORTED_SANCTUARY');
        const capture = operation.capture;
        const region = capture.regions[0]!;
        const application = sanctuaryStunApplication(candidate, capture);
        if (!application) {
          emit(
            'sanctuary_reacted',
            {
              capture,
              regionId: region.id,
              source: region.source,
              outcome: 'attacker-unavailable',
            },
            item.id,
          );
          continue;
        }
        sanctuaryReaction = capture;
        operation = application;
      }
      if (operation.kind === 'move') {
        const destination = operation.to;
        const attacker = getPiece(candidate.board, operation.pieceId);
        if (attacker && candidate.turn.mainMoveUsed) throw new Error('MAIN_MOVE_USED');
        let victim = getPieceAt(candidate.board, operation.to);
        if (
          victim &&
          ruleset.sanctuary &&
          querySanctuaryRegions(candidate).length &&
          (interceptors.length ||
            (ruleset.mandatoryEntryConsumers !== undefined &&
              (!Array.isArray(ruleset.mandatoryEntryConsumers) ||
                ruleset.mandatoryEntryConsumers.length)))
        )
          throw new Error('UNSUPPORTED_SANCTUARY_INTERACTION');
        if (attacker && attacker.controller === actor && victim)
          assertCandidateCaptureAllowed(candidate, attacker, victim, ruleset);
        if (
          !attacker ||
          attacker.controller !== actor ||
          !queryCandidateMainActions(candidate, ruleset, actor).some(
            (m) =>
              m.pieceId === attacker.id &&
              m.to.file === destination.file &&
              m.to.rankIndex === destination.rankIndex,
          )
        )
          throw new Error('INVALID_MOVE');
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
              if (victim) assertCandidateCaptureAllowed(candidate, attacker, victim, ruleset);
              if (
                !victim ||
                !queryCandidateMainActions(candidate, ruleset, actor).some(
                  (m) =>
                    m.pieceId === attacker.id && m.kind === 'capture' && m.targetId === victim!.id,
                )
              )
                throw new Error('INVALID_REDIRECT');
              operation = { ...operation, to: victim.position };
            }
          }
      }
      if (operation.kind === 'fail') throw new Error(operation.code);
      if (operation.kind === 'sanctuary_expire') {
        const region = querySanctuaryRegions(candidate).find((r) => r.id === operation.regionId);
        if (
          region &&
          region.deadline.side === operation.boundary.side &&
          region.deadline.boundary === operation.boundary.boundary &&
          region.deadline.ordinal <= operation.boundary.ordinal
        ) {
          candidate.variantState = withoutSanctuaryRegion(candidate, region.source.sourcePlayer);
          emit('sanctuary_removed', { region, reason: 'expired' }, item.id);
        }
        continue;
      }
      if (operation.kind === 'sanctuary_cast') {
        if (sanctuaryCast) throw new Error('SANCTUARY_CAST_LIMIT');
        const plan = planSanctuaryCast(
          candidate,
          operation,
          actor,
          command,
          ruleset.sanctuary,
          item.id,
        );
        candidate.variantState = plan.variantState;
        sanctuaryCast = true;
        if (plan.previous)
          emit('sanctuary_removed', { region: plan.previous, reason: 'replaced' }, item.id);
        emit('sanctuary_created', { region: plan.region }, item.id);
        continue;
      }
      if (operation.kind === 'forced_reposition') {
        if (repositioned) throw new Error('FORCED_REPOSITION_LIMIT');
        const plan = applyForcedReposition(candidate, operation, actor, command, ruleset);
        candidate.board = plan.board as GameState['board'];
        repositioned = true;
        emit('pieces_repositioned', plan.payload, item.id);
        continue;
      }
      if (operation.kind === 'death_reaction') {
        if (!runtime) throw new Error('UNSUPPORTED_RUNTIME');
        const targets = planDeathReaction(candidate, operation.death, operation.instance, runtime);
        const source = sourceOf(operation.instance);
        const event = emit(
          'bomb_exploded',
          {
            effectId: operation.instance.id,
            definitionId: operation.instance.definitionId,
            center: cloneData(operation.death.victim.position),
            source,
            targets: [...targets],
          },
          item.causeId,
        );
        for (const pieceId of targets)
          enqueue({ kind: 'destroy', pieceId }, event.id, false, false, {
            source,
            effectId: operation.instance.id,
          });
        continue;
      }
      if (operation.kind === 'delayed_schedule') {
        if (!delayedRegistry) throw new Error('UNSUPPORTED_RUNTIME');
        const plan = planDelayedSchedule(
          candidate,
          operation,
          actor,
          item.id,
          item.causeId,
          transactionId,
          delayedRegistry,
        );
        candidate.delayedActions = plan.records;
        emit('delayed_action_scheduled', delayedFact(plan.action), item.id);
        continue;
      }
      if (operation.kind === 'delayed_cancel') {
        if (!delayedRegistry) throw new Error('UNSUPPORTED_RUNTIME');
        const plan = planDelayedCancel(candidate, operation, delayedRegistry);
        candidate.delayedActions = plan.records;
        if (plan.action)
          emit(
            'delayed_action_cancelled',
            { ...delayedFact(plan.action), reason: plan.reason },
            item.id,
          );
        continue;
      }
      if (operation.kind === 'delayed_fire') {
        if (!delayedRegistry) throw new Error('UNSUPPORTED_RUNTIME');
        const action = decodeDelayedActions(
          candidate.delayedActions,
          delayedRegistry,
          candidate,
        ).find((a) => a.id === operation.actionId);
        if (
          !action ||
          !collectDueDelayedActions(candidate, delayedRegistry, operation.boundary).includes(
            action.id,
          )
        )
          continue;
        const missing =
          action.target?.kind === 'piece' &&
          !Object.hasOwn(candidate.board.pieces, action.target.pieceId);
        if (missing && action.missingTarget === 'reject') throw new Error('DELAYED_TARGET_MISSING');
        candidate.delayedActions = candidate.delayedActions.filter((a) => a.id !== action.id);
        if (missing)
          emit(
            'delayed_action_cancelled',
            { ...delayedFact(action), reason: 'missing-target' },
            item.id,
          );
        else {
          const plans = cloneData(
            delayedRegistry
              .get(action.definitionId)
              .execute(deepFreeze({ state: cloneData(candidate), action })),
          );
          emit('delayed_action_fired', delayedFact(action), item.id);
          for (const plan of plans) enqueue(plan, item.id);
        }
        continue;
      }
      if (operation.kind === 'transference_swap') {
        if (transferenceSwapped) throw new Error('TRANSFERENCE_SWAP_LIMIT');
        const plan = preflightTransference(candidate, actor, command, ruleset, operation);
        transferenceSwapped = true;
        candidate.effects = plan.records;
        for (const fact of plan.facts) emit(fact.kind, fact.payload, item.id);
        emit(
          'transference_committed',
          {
            source: plan.operation.source,
            pieceA: plan.operation.pieceA,
            pieceB: plan.operation.pieceB,
          },
          item.id,
        );
        continue;
      }
      if (operation.kind === 'effect_relocate' || operation.kind === 'effect_sets_swap') {
        if (!runtime) throw new Error('UNSUPPORTED_RUNTIME');
        const plan = planEffectRelocation(candidate, operation, runtime, !!ruleset.repetition);
        candidate.effects = plan.records;
        for (const fact of plan.facts) emit(fact.kind, fact.payload, item.id);
        continue;
      }
      if (operation.kind === 'effect_apply') {
        if (!runtime) throw new Error('UNSUPPORTED_RUNTIME');
        if (
          pending?.phase === 'start' &&
          runtime.registry.get(operation.definitionId).lifetime.kind === 'current-turn-window'
        )
          throw new Error('EFFECT_WINDOW_CLOSED');
        const retired = decodeEffectRecords(candidate.effects, runtime.registry, candidate);
        const plan = planEffectApplication(candidate, operation, actor, item.id, runtime);
        candidate.effects = plan.records;
        assertEffectRuntimeState(candidate, runtime, !!ruleset.repetition, false);
        for (const fact of plan.facts) emit(fact.kind, fact.payload, item.id, retired);
        if (sanctuaryReaction) {
          const region = sanctuaryReaction.regions[0]!;
          emit(
            'sanctuary_reacted',
            {
              capture: sanctuaryReaction,
              regionId: region.id,
              source: region.source,
              outcome: 'stun-applied',
            },
            item.id,
          );
        }
        continue;
      }
      if (operation.kind === 'effect_remove' || operation.kind === 'effect_expire') {
        if (!runtime) throw new Error('UNSUPPORTED_RUNTIME');
        const retired = decodeEffectRecords(candidate.effects, runtime.registry, candidate);
        const plan =
          operation.kind === 'effect_remove'
            ? planEffectRemoval(candidate, operation, runtime)
            : planEffectExpiration(candidate, operation.instanceId, operation.boundary, runtime);
        candidate.effects = plan.records;
        for (const fact of plan.facts) emit(fact.kind, fact.payload, item.id, retired);
        continue;
      }
      if (operation.kind === 'marker') {
        emit('marker', { value: operation.value }, item.causeId);
        continue;
      }
      if (operation.kind === 'variant' || operation.kind === 'random') {
        if (
          candidate.engineVersion === '0.7.0' &&
          operation.namespace === SANCTUARY_REGION_NAMESPACE
        )
          throw new Error('INVALID_SANCTUARY_MUTATION');
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
      else if (operation.kind === 'end')
        result = endBaseTurn(
          basePosition(),
          actor,
          () => queryCandidateMainActions(candidate, ruleset, actor).length > 0,
        );
      else if (operation.kind === 'destroy')
        result = applyBaseDestruction(basePosition(), operation.pieceId as PieceId);
      else if (operation.kind === 'skill') {
        const skill = Object.hasOwn(ruleset.skills ?? {}, operation.skillId)
          ? ruleset.skills?.[operation.skillId]
          : undefined;
        if (!skill) throw new Error('NOT_AVAILABLE');
        let plan: SkillPlan;
        if ('plan' in skill) {
          const profile = candidate.playerProfiles[actor];
          if (
            !profile ||
            profile.id !== skill.requiredProfile.id ||
            profile.version !== skill.requiredProfile.version
          )
            throw new Error('UNAUTHORIZED_VARIANT');
          const context = deepFreeze({
            state: cloneData(candidate),
            actor,
            command: cloneData(operation),
          });
          plan = skill.plan(
            candidate.engineVersion === '0.8.0' ? Object.freeze({ ...context, ruleset }) : context,
          );
        } else {
          if (operation.intent) throw new Error('INVALID_SKILL_INTENT');
          plan = skill;
        }
        if (operation.skillId === 'turtle.transference') {
          if (
            plan.cost !== ruleset.transference?.cost ||
            plan.operations.length !== 1 ||
            plan.operations[0]?.kind !== 'transference_swap'
          )
            throw new Error('INVALID_TRANSFERENCE_PLAN');
          preflightTransference(candidate, actor, operation, ruleset, plan.operations[0]);
        }
        result = commitNormalSkillUsage(basePosition(), actor, plan.cost);
        if (result.ok) for (const derived of plan.operations) enqueue(derived, item.id);
      } else throw new Error('UNSUPPORTED_RUNTIME');
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
      const cleanup = runtime ? planEffectCleanup(before, candidate, runtime) : undefined;
      if (cleanup) candidate.effects = cleanup.records;
      const terminalRegions =
        candidate.terminal.status !== 'ongoing' ? querySanctuaryRegions(before) : [];
      for (const region of terminalRegions) {
        candidate.variantState = withoutSanctuaryRegion(candidate, region.source.sourcePlayer);
      }
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
        const death: CommittedDeathContext = deepFreeze(
          cloneData({
            victim: {
              id: victim.id,
              owner: victim.owner,
              controller: victim.controller,
              position: victim.position,
              currentType: victim.currentType,
            },
            reason: operation.kind === 'move' ? 'capture' : 'destruction',
            attackerId: operation.kind === 'move' ? operation.pieceId : null,
            rootActor: authority.kind === 'player' ? actor : null,
            transactionId,
            operationId: item.id,
            causeId: item.causeId,
            destructionSource: item.attribution?.source ?? null,
            retiredEffects: runtime
              ? decodeEffectRecords(before.effects, runtime.registry, before).filter(
                  (e) => e.target.kind === 'piece' && e.target.pieceId === victim.id,
                )
              : [],
          }),
        );
        const deathEvent =
          operation.kind === 'move'
            ? emit(
                'capture_committed',
                { ...payload, actor, attackerId: operation.pieceId },
                item.id,
              )
            : emit(
                'piece_destroyed',
                {
                  ...payload,
                  actor:
                    item.attribution?.source.sourcePlayer ??
                    (authority.kind === 'system' ? null : actor),
                  ...(item.attribution
                    ? {
                        source: item.attribution.source,
                        originEffectId: item.attribution.effectId,
                        rootActor: death.rootActor,
                      }
                    : {}),
                },
                item.id,
              );
        if (candidate.terminal.status === 'ongoing' && runtime)
          for (const instance of deathReactionInstances(death, runtime)) {
            const key = JSON.stringify(['committed-death', deathEvent.id, instance.id]);
            if (reactions.has(key)) continue;
            reactions.add(key);
            enqueue({ kind: 'death_reaction', death, instance }, deathEvent.id, true);
          }
        if (
          operation.kind === 'move' &&
          deathEvent.kind === 'capture_committed' &&
          candidate.terminal.status === 'ongoing' &&
          ruleset.sanctuary
        ) {
          if (ruleset.sanctuary.kind !== 'sanctuary-v1') throw new Error('UNSUPPORTED_SANCTUARY');
          const capture = captureSanctuaryContext(
            candidate,
            before.board.pieces[operation.pieceId]!,
            victim,
            deathEvent,
            item.causeId,
          );
          if (capture.regions.length) {
            const key = JSON.stringify([
              'sanctuary-capture',
              capture.eventId,
              capture.regions[0]!.id,
            ]);
            if (reactions.has(key)) throw new Error('DUPLICATE_SANCTUARY_REACTION');
            reactions.add(key);
            enqueue({ kind: 'sanctuary_reaction', capture }, deathEvent.id, true);
          }
        }
      }
      if (operation.kind === 'skill')
        emit(
          'skill_used',
          { actor, skillId: operation.skillId, actualCost: before.ap[actor] - candidate.ap[actor] },
          item.id,
        );
      for (const fact of cleanup?.facts ?? [])
        emit(
          fact.kind,
          fact.payload,
          item.id,
          runtime ? decodeEffectRecords(before.effects, runtime.registry, before) : [],
          before,
        );
      if (candidate.terminal.status !== 'ongoing') {
        for (const region of terminalRegions)
          emit('sanctuary_removed', { region, reason: 'match_terminal' }, item.id);
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
      const beforeCount = cloneData(candidate);
      const effectProjection = runtime
        ? runtimeRepetitionProjection(runtime, ruleset.repetition)
        : ruleset.repetition;
      const counted = recordActionReady(
        candidate,
        delayedRegistry
          ? delayedRepetitionProjection(delayedRegistry, effectProjection)
          : effectProjection,
      );
      candidate.history = counted.history;
      candidate.terminal = counted.terminal;
      if (candidate.terminal.status !== 'ongoing') {
        if (candidate.engineVersion === '0.7.0') {
          const cleanup = runtime ? planEffectCleanup(beforeCount, candidate, runtime) : undefined;
          if (cleanup) candidate.effects = cleanup.records;
          for (const fact of cleanup?.facts ?? []) emit(fact.kind, fact.payload, turnCauseId);
          for (const region of querySanctuaryRegions(beforeCount)) {
            candidate.variantState = withoutSanctuaryRegion(candidate, region.source.sourcePlayer);
            emit('sanctuary_removed', { region, reason: 'match_terminal' }, turnCauseId);
          }
        }
        emit('terminal_reached', { ...candidate.terminal }, turnCauseId);
      }
    }
    const recorded = appendGameHistory(candidate);
    candidate.history = recorded.history;
    candidate.counters = recorded.counters;
    assertGameState(candidate);
    if (runtime) assertEffectRuntimeState(candidate, runtime, !!ruleset.repetition);
    if (delayedRegistry) assertDelayedRuntimeState(candidate, delayedRegistry);
    options.validate?.(deepFreeze(cloneData(candidate)));
    return deepFreeze({ ok: true, state: candidate, events });
  } catch (error) {
    return rejected(error instanceof Error ? error.message : 'ENGINE_ERROR');
  }
}
