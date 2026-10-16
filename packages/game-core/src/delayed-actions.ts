import {
  DelayedActionDefinitionMetadataSchema,
  DelayedActionSchema,
  DelayedActionRecordPayloadSchema,
  DelayedScheduleOperationSchema,
  DelayedCancelOperationSchema,
  DeadlineSchema,
  OpaqueRuleStateSchema,
  SerializableValueSchema,
} from '@variant-chess/shared-types';
import type {
  GameState,
  PlayerSide,
  DelayedActionDefinitionMetadata,
  DelayedActionData,
  DelayedScheduleOperation,
  DelayedCancelOperation,
} from '@variant-chess/shared-types';
import type { Immutable, ImmutableJson, PayloadSchema } from './effects.js';
import { validateEffectPayload } from './effects.js';
import { cloneData, canonicalEncode, deepFreeze } from './canonical.js';
import { sourceOrdinal } from './effect-runtime.js';
import type { EffectBoundary } from './effect-runtime.js';
import type { DerivedOperation } from './transaction.js';
import type { RepetitionProjection } from './repetition.js';
import { relativeDeadline } from './repetition.js';

export type DelayedAction = Immutable<DelayedActionData>;
export interface DelayedActionContext {
  readonly state: GameState;
  readonly action: DelayedAction;
}
export interface DelayedRepetitionContext {
  readonly target: ImmutableJson;
  readonly sourcePiece: ImmutableJson;
  readonly remaining: ImmutableJson;
}
export type DelayedActionDefinition = Immutable<DelayedActionDefinitionMetadata> & {
  readonly payloadSchema: PayloadSchema;
  readonly execute: (context: DelayedActionContext) => readonly DerivedOperation[];
  readonly repetitionProjector: (
    action: DelayedAction,
    context: DelayedRepetitionContext,
  ) => ImmutableJson;
};
export interface DelayedActionRegistry {
  readonly definitions: readonly DelayedActionDefinition[];
  readonly get: (id: string) => DelayedActionDefinition;
}
export function createDelayedActionRegistry(
  definitions: readonly DelayedActionDefinition[],
): DelayedActionRegistry {
  const map = new Map<string, DelayedActionDefinition>();
  for (const definition of definitions) {
    const { payloadSchema, execute, repetitionProjector, ...raw } = definition;
    const metadata = DelayedActionDefinitionMetadataSchema.parse(cloneData(raw));
    if (map.has(metadata.typeId)) throw new Error('DUPLICATE_DELAYED_DEFINITION');
    if (
      new Set(metadata.cancellationReasons).size !== metadata.cancellationReasons.length ||
      typeof execute !== 'function' ||
      typeof repetitionProjector !== 'function' ||
      typeof payloadSchema?.parse !== 'function'
    )
      throw new Error('INVALID_DELAYED_DEFINITION');
    map.set(
      metadata.typeId,
      deepFreeze({
        ...metadata,
        payloadSchema: { parse: payloadSchema.parse.bind(payloadSchema) },
        execute,
        repetitionProjector,
      }),
    );
  }
  const ordered = Object.freeze([...map.values()].sort((a, b) => compare(a.typeId, b.typeId)));
  return Object.freeze({
    definitions: ordered,
    get: (id: string) => {
      const definition = map.get(id);
      if (!definition) throw new Error('UNKNOWN_DELAYED_DEFINITION');
      return definition;
    },
  });
}
function identity(state: GameState, id: string, kind: 'operation' | 'transaction' | 'event') {
  const prefix = `${state.matchId}:${kind}:`,
    ordinal = id.slice(prefix.length);
  if (
    !id.startsWith(prefix) ||
    !/^[1-9]\d*$/.test(ordinal) ||
    !Number.isSafeInteger(Number(ordinal)) ||
    Number(ordinal) > state.counters[kind]
  )
    throw new Error('DELAYED_ID_MISMATCH');
}
export function validateDelayedAction(
  raw: unknown,
  registry: DelayedActionRegistry,
  state: GameState,
): DelayedAction {
  const action = DelayedActionSchema.parse(cloneData(raw));
  const definition = registry.get(action.definitionId);
  if (action.definitionVersion !== definition.schemaVersion)
    throw new Error('DELAYED_VERSION_MISMATCH');
  const payload = validateEffectPayload(definition, action.definitionVersion, action.payload);
  identity(state, action.id, 'operation');
  identity(
    state,
    action.causeId,
    action.causeId.startsWith(`${state.matchId}:event:`) ? 'event' : 'operation',
  );
  identity(state, action.transactionId, 'transaction');
  if (
    action.transactionId !== `${state.matchId}:transaction:${action.appliedSequence}` ||
    action.appliedSequence > state.counters.transaction
  )
    throw new Error('DELAYED_CAUSE_MISMATCH');
  if (
    action.source.policy !== definition.sourcePolicy ||
    action.missingTarget !== definition.missingTarget ||
    canonicalEncode(action.cancellationReasons) !== canonicalEncode(definition.cancellationReasons)
  )
    throw new Error('DELAYED_POLICY_MISMATCH');
  if (
    action.dueBoundary.side !== action.source.player ||
    action.scheduledAt.side !== action.source.player ||
    action.scheduledAt.boundary !== action.dueBoundary.boundary ||
    action.dueBoundary.ordinal <= action.scheduledAt.ordinal ||
    action.scheduledAt.ordinal > sourceOrdinal(state, action.source.player)
  )
    throw new Error('DELAYED_BOUNDARY_MISMATCH');
  return deepFreeze({ ...action, payload });
}
export function decodeDelayedActions(
  records: GameState['delayedActions'],
  registry: DelayedActionRegistry,
  state: GameState,
): readonly DelayedAction[] {
  const actions = records.map((record) => {
    const { action: raw } = DelayedActionRecordPayloadSchema.parse(cloneData(record.payload));
    const action = validateDelayedAction(raw, registry, state);
    if (
      record.id !== action.id ||
      record.definitionId !== action.definitionId ||
      record.source !== action.source.player ||
      canonicalEncode(record.deadline) !== canonicalEncode(action.dueBoundary)
    )
      throw new Error('DELAYED_RECORD_MISMATCH');
    return action;
  });
  if (
    new Set(actions.map((a) => a.id)).size !== actions.length ||
    actions.some((a) => state.effects.some((e) => e.id === a.id))
  )
    throw new Error('DUPLICATE_DELAYED_ID');
  return Object.freeze(actions);
}
export function validateSnapshotDelayedActions(state: GameState, registry?: DelayedActionRegistry) {
  if (registry) decodeDelayedActions(state.delayedActions, registry, state);
  else if (
    state.delayedActions.some(
      (record) =>
        record.payload !== null &&
        typeof record.payload === 'object' &&
        !Array.isArray(record.payload) &&
        record.payload.format === 'delayed-action-v1',
    )
  )
    throw new Error('DELAYED_REGISTRY_REQUIRED');
}
function encodeAction(action: DelayedAction): GameState['delayedActions'][number] {
  return OpaqueRuleStateSchema.parse(
    cloneData({
      id: action.id,
      definitionId: action.definitionId,
      source: action.source.player,
      deadline: action.dueBoundary,
      payload: { format: 'delayed-action-v1', action },
    }),
  );
}
export function planDelayedSchedule(
  state: GameState,
  raw: DelayedScheduleOperation,
  actor: PlayerSide,
  id: string,
  causeId: string,
  transactionId: string,
  registry: DelayedActionRegistry,
) {
  const input = DelayedScheduleOperationSchema.parse(cloneData(raw));
  const definition = registry.get(input.definitionId),
    player = input.sourcePlayer === 'actor' ? actor : input.sourcePlayer;
  const sourcePiece =
    input.sourcePiece && Object.hasOwn(state.board.pieces, input.sourcePiece)
      ? state.board.pieces[input.sourcePiece]
      : undefined;
  if (input.sourcePiece && !sourcePiece) throw new Error('DELAYED_SOURCE_MISSING');
  if (input.target?.kind === 'piece' && !Object.hasOwn(state.board.pieces, input.target.pieceId))
    throw new Error('DELAYED_TARGET_MISSING');
  const action = validateDelayedAction(
    {
      id,
      definitionId: input.definitionId,
      definitionVersion: input.definitionVersion,
      payload: input.payload,
      target: input.target,
      dueBoundary: input.dueBoundary,
      status: 'scheduled',
      source: {
        player,
        controller: sourcePiece?.controller ?? player,
        variant: input.sourceVariant,
        skill: input.sourceSkill,
        piece: input.sourcePiece,
        policy: definition.sourcePolicy,
      },
      causeId,
      transactionId,
      appliedSequence: state.counters.transaction,
      scheduledAt: {
        side: player,
        boundary: input.dueBoundary.boundary,
        ordinal: sourceOrdinal(state, player),
      },
      missingTarget: definition.missingTarget,
      cancellationReasons: definition.cancellationReasons,
    },
    registry,
    state,
  );
  const records = [...state.delayedActions, encodeAction(action)];
  decodeDelayedActions(records, registry, state);
  return { action, records };
}
export function planDelayedCancel(
  state: GameState,
  raw: DelayedCancelOperation,
  registry: DelayedActionRegistry,
) {
  const input = DelayedCancelOperationSchema.parse(cloneData(raw));
  identity(state, input.actionId, 'operation');
  const action = decodeDelayedActions(state.delayedActions, registry, state).find(
    (a) => a.id === input.actionId,
  );
  if (action && !action.cancellationReasons.includes(input.reason))
    throw new Error('DELAYED_CANCELLATION_DENIED');
  return {
    action,
    records: state.delayedActions.filter((a) => a.id !== input.actionId),
    reason: input.reason,
  };
}
export function collectDueDelayedActions(
  state: GameState,
  registry: DelayedActionRegistry,
  raw: EffectBoundary,
): readonly string[] {
  const boundary = DeadlineSchema.parse(cloneData(raw));
  return Object.freeze(
    decodeDelayedActions(state.delayedActions, registry, state)
      .filter(
        (a) =>
          a.dueBoundary.side === boundary.side &&
          a.dueBoundary.boundary === boundary.boundary &&
          a.dueBoundary.ordinal <= boundary.ordinal,
      )
      .sort(
        (a, b) =>
          a.dueBoundary.ordinal - b.dueBoundary.ordinal ||
          a.appliedSequence - b.appliedSequence ||
          compare(a.id, b.id),
      )
      .map((a) => a.id),
  );
}
export function delayedFact(action: DelayedAction) {
  return {
    actionId: action.id,
    definitionId: action.definitionId,
    definitionVersion: action.definitionVersion,
    sourcePlayer: action.source.player,
    dueBoundary: cloneData(action.dueBoundary),
  };
}
export function assertDelayedRuntimeState(state: GameState, registry: DelayedActionRegistry) {
  for (const action of decodeDelayedActions(state.delayedActions, registry, state)) {
    const ordinal = sourceOrdinal(state, action.source.player);
    if (
      action.dueBoundary.ordinal < ordinal ||
      (action.dueBoundary.ordinal === ordinal &&
        (action.source.player !== state.turn.sideToAct || action.dueBoundary.boundary === 'start'))
    )
      throw new Error('DELAYED_OVERDUE_STATE');
  }
}
export function delayedRepetitionProjection(
  registry: DelayedActionRegistry,
  custom?: RepetitionProjection,
): RepetitionProjection {
  return (state) => {
    if (
      !custom &&
      (state.effects.length ||
        Object.keys(state.variantState.white).length ||
        Object.keys(state.variantState.black).length)
    )
      throw new Error('REPETITION_SEMANTICS_REQUIRED');
    const prior = custom?.(state);
    const ranks = new Map<string, number>();
    const delayedActions = [...decodeDelayedActions(state.delayedActions, registry, state)]
      .sort((a, b) => a.appliedSequence - b.appliedSequence || compare(a.id, b.id))
      .map((action) => {
        const bucket = canonicalEncode(action.dueBoundary);
        const order = ranks.get(bucket) ?? 0;
        ranks.set(bucket, order + 1);
        const target =
          action.target?.kind === 'piece'
            ? {
                kind: 'piece',
                position: state.board.pieces[action.target.pieceId]?.position ?? null,
              }
            : action.target;
        const sourcePiece = action.source.piece
          ? (state.board.pieces[action.source.piece]?.position ?? null)
          : null;
        const context = deepFreeze(
          cloneData({
            target,
            sourcePiece,
            remaining: relativeDeadline(state, action.dueBoundary),
          }),
        );
        return {
          definitionId: action.definitionId,
          definitionVersion: action.definitionVersion,
          order,
          source: {
            player: action.source.player,
            controller: action.source.controller,
            variant: action.source.variant,
            skill: action.source.skill,
            piece: sourcePiece,
          },
          target,
          remaining: context.remaining,
          missingTarget: action.missingTarget,
          cancellationReasons: action.cancellationReasons,
          data: registry.get(action.definitionId).repetitionProjector(action, context),
        };
      })
      .sort((a, b) => compare(canonicalEncode(a), canonicalEncode(b)));
    return {
      effects: prior?.effects ?? [],
      variantState: prior?.variantState ?? state.variantState,
      delayedActions: SerializableValueSchema.parse(cloneData(delayedActions)),
    };
  };
}
function compare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
