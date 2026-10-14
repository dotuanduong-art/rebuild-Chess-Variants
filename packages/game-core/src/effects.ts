import {
  EffectDefinitionMetadataSchema,
  EffectInstanceSchema,
  EffectRecordPayloadSchema,
  OpaqueRuleStateSchema,
} from '@variant-chess/shared-types';
import type {
  EffectDefinitionMetadata,
  EffectInstanceData,
  GameState,
  SerializableValue,
} from '@variant-chess/shared-types';
import { canonicalEncode, cloneData, deepFreeze } from './canonical.js';

export type ImmutableJson =
  | null
  | boolean
  | number
  | string
  | readonly ImmutableJson[]
  | { readonly [key: string]: ImmutableJson };
export type Immutable<T> = SerializableValue extends T
  ? ImmutableJson
  : T extends object
    ? { readonly [K in keyof T]: Immutable<T[K]> }
    : T;
/** Reviewed pure schemas belong to a pinned bundle, never to GameState. */
export interface PayloadSchema<T extends SerializableValue = SerializableValue> {
  readonly parse: (value: unknown) => T;
}
/** The future repetition adapter supplies normalized targets, links and relative lifetime. */
export interface EffectRepetitionContext {
  readonly target: ImmutableJson;
  readonly group: ImmutableJson;
  readonly remainingLifetime: ImmutableJson;
}
export type EffectRepetitionProjector = (
  instance: EffectInstance,
  context: EffectRepetitionContext,
) => ImmutableJson;
export type EffectDefinition<T extends SerializableValue = SerializableValue> =
  Immutable<EffectDefinitionMetadata> & {
    readonly payloadSchema: PayloadSchema<T>;
    readonly repetitionProjector: EffectRepetitionProjector;
  };
export type EffectInstance<T extends SerializableValue = SerializableValue> = Immutable<
  Omit<EffectInstanceData, 'payload'>
> & { readonly payload: Immutable<T> };
export type EffectValidationContext = Pick<GameState, 'matchId' | 'board' | 'counters' | 'turn'>;
export interface EffectRegistry {
  readonly definitions: readonly EffectDefinition[];
  readonly get: (typeId: string) => EffectDefinition;
}

/** Validation must not coerce, drop fields, or rewrite serialized payloads. */
export function validateEffectPayload<T extends SerializableValue>(
  definition: EffectDefinition<T>,
  version: string,
  payload: unknown,
): Immutable<T> {
  if (version !== definition.schemaVersion) throw new Error('EFFECT_VERSION_MISMATCH');
  const encoded = canonicalEncode(payload);
  const result = definition.payloadSchema.parse(deepFreeze(cloneData(payload)));
  if (canonicalEncode(result) !== encoded) throw new Error('EFFECT_PAYLOAD_REWRITE');
  return deepFreeze(cloneData(result)) as Immutable<T>;
}

export function validateEffectInstance(
  raw: unknown,
  registry: EffectRegistry,
  state: EffectValidationContext,
): EffectInstance {
  const instance = EffectInstanceSchema.parse(cloneData(raw));
  const definition = registry.get(instance.definitionId);
  const payload = validateEffectPayload(definition, instance.definitionVersion, instance.payload);
  const prefix = `${state.matchId}:operation:`;
  const ordinal = instance.id.slice(prefix.length);
  if (
    !instance.id.startsWith(prefix) ||
    !/^[1-9]\d*$/.test(ordinal) ||
    !Number.isSafeInteger(Number(ordinal)) ||
    Number(ordinal) > state.counters.operation
  )
    throw new Error('EFFECT_ID_MISMATCH');
  if (instance.appliedSequence > state.counters.transaction)
    throw new Error('EFFECT_SEQUENCE_MISMATCH');
  if (!definition.targets.includes(instance.target.kind)) throw new Error('EFFECT_TARGET_MISMATCH');
  if (instance.target.kind === 'piece') {
    const piece = Object.hasOwn(state.board.pieces, instance.target.pieceId)
      ? state.board.pieces[instance.target.pieceId]
      : undefined;
    if (!piece) throw new Error('EFFECT_TARGET_MISSING');
    if (piece.currentType === 'king' && definition.kingEligibility.kind === 'denied')
      throw new Error('EFFECT_KING_INELIGIBLE');
  }
  const refs = {
    variant: instance.sourceVariant,
    skill: instance.sourceSkill,
    piece: instance.sourcePiece,
  };
  if (definition.sourceAttribution.requiredRefs.some((ref) => refs[ref] === null))
    throw new Error('EFFECT_SOURCE_MISSING');
  if (instance.timingAnchor.side !== instance.sourcePlayer)
    throw new Error('EFFECT_ANCHOR_MISMATCH');
  if (canonicalEncode(instance.lifetime) !== canonicalEncode(definition.lifetime))
    throw new Error('EFFECT_LIFETIME_MISMATCH');
  const { lifetime, deadline, timingAnchor } = instance;
  if (lifetime.kind === 'rounds') {
    const expiry = timingAnchor.ordinal + lifetime.rounds;
    if (
      !Number.isSafeInteger(expiry) ||
      !deadline ||
      deadline.side !== instance.sourcePlayer ||
      deadline.boundary !== lifetime.boundary ||
      timingAnchor.boundary !== lifetime.boundary ||
      deadline.ordinal !== expiry
    )
      throw new Error('EFFECT_LIFETIME_MISMATCH');
  } else if (lifetime.kind === 'current-turn-window') {
    const side = state.turn.sideToAct;
    const ordinal = Math.floor((state.turn.plyIndex + (side === 'white' ? 2 : 1)) / 2);
    if (
      !deadline ||
      deadline.boundary !== lifetime.boundary ||
      deadline.side !== side ||
      deadline.ordinal !== ordinal
    )
      throw new Error('EFFECT_LIFETIME_MISMATCH');
  } else if (deadline !== null) throw new Error('EFFECT_LIFETIME_MISMATCH');
  // Group references are match/source namespaces, never global partner lookups.
  if (
    instance.groupId !== null &&
    !instance.groupId.startsWith(`${state.matchId}:${instance.sourcePlayer}:`)
  )
    throw new Error('EFFECT_GROUP_MISMATCH');
  if (
    (definition.stacking.key === 'explicit-group' ||
      definition.relocation.kind === 'group-aware') &&
    instance.groupId === null
  )
    throw new Error('EFFECT_GROUP_REQUIRED');
  return deepFreeze({ ...instance, payload });
}

export function validateEffectInstances(
  raw: readonly unknown[],
  registry: EffectRegistry,
  state: EffectValidationContext,
): readonly EffectInstance[] {
  const instances = raw.map((value) => validateEffectInstance(value, registry, state));
  if (new Set(instances.map((instance) => instance.id)).size !== instances.length)
    throw new Error('DUPLICATE_EFFECT_INSTANCE');
  return Object.freeze(instances);
}

/** Additive adapter: the Phase 01B state envelope and schema version stay unchanged. */
export function encodeEffectRecords(
  raw: readonly unknown[],
  registry: EffectRegistry,
  state: EffectValidationContext,
): GameState['effects'] {
  return deepFreeze(
    validateEffectInstances(raw, registry, state).map((instance) =>
      OpaqueRuleStateSchema.parse({
        id: instance.id,
        definitionId: instance.definitionId,
        source: instance.sourcePlayer,
        deadline: instance.deadline,
        payload: { format: 'effect-instance-v1', instance },
      }),
    ),
  );
}

export function decodeEffectRecords(
  records: GameState['effects'],
  registry: EffectRegistry,
  state: EffectValidationContext,
): readonly EffectInstance[] {
  const instances = records.map((raw) => {
    const record = OpaqueRuleStateSchema.parse(cloneData(raw));
    const { instance } = EffectRecordPayloadSchema.parse(record.payload);
    if (
      record.id !== instance.id ||
      record.definitionId !== instance.definitionId ||
      record.source !== instance.sourcePlayer ||
      canonicalEncode(record.deadline) !== canonicalEncode(instance.deadline)
    )
      throw new Error('EFFECT_ENVELOPE_MISMATCH');
    return instance;
  });
  return validateEffectInstances(instances, registry, state);
}

export function validateSnapshotEffects(state: GameState, registry?: EffectRegistry): void {
  if (registry) {
    decodeEffectRecords(state.effects, registry, state);
    return;
  }
  if (
    state.effects.some(
      ({ payload }) =>
        payload &&
        typeof payload === 'object' &&
        'format' in payload &&
        payload.format === 'effect-instance-v1',
    )
  )
    throw new Error('EFFECT_REGISTRY_REQUIRED');
}

/** One construction per ruleset bundle; no registration API exists after construction. */
export function createEffectRegistry(definitions: readonly EffectDefinition[]): EffectRegistry {
  const entries = definitions.map(({ payloadSchema, repetitionProjector, ...metadata }) => {
    if (!payloadSchema || typeof payloadSchema.parse !== 'function')
      throw new Error('INVALID_PAYLOAD_SCHEMA');
    if (typeof repetitionProjector !== 'function') throw new Error('MISSING_EFFECT_PROJECTION');
    const data = EffectDefinitionMetadataSchema.parse(cloneData(metadata));
    for (const ids of [
      data.targets,
      data.sourceAttribution.requiredRefs,
      data.capabilities,
      data.triggers.map((trigger) => trigger.id),
    ])
      if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_EFFECT_METADATA');
    if (
      data.stacking.mode === 'refresh' &&
      [data.stacking.payload, data.stacking.source, data.stacking.deadline].includes('declared') &&
      !data.stacking.mergePolicyId
    )
      throw new Error('MISSING_MERGE_POLICY');
    return deepFreeze({
      ...data,
      payloadSchema: { parse: payloadSchema.parse.bind(payloadSchema) },
      repetitionProjector,
    });
  });
  entries.sort((a, b) => (a.typeId < b.typeId ? -1 : a.typeId > b.typeId ? 1 : 0));
  const byId = new Map(entries.map((entry) => [entry.typeId, entry]));
  if (byId.size !== entries.length) throw new Error('DUPLICATE_EFFECT_DEFINITION');
  return Object.freeze({
    definitions: Object.freeze(entries),
    get(typeId: string) {
      const entry = byId.get(typeId);
      if (!entry) throw new Error('UNKNOWN_EFFECT_DEFINITION');
      return entry;
    },
  });
}
