import {
  EffectApplicationSchema,
  EffectRemovalOperationSchema,
  DeadlineSchema,
} from '@variant-chess/shared-types';
import type {
  EffectApplication,
  EffectRemovalOperation,
  GameState,
  PlayerSide,
  DomainEvent,
  SerializableValue,
  EffectRemovalReason,
} from '@variant-chess/shared-types';
import {
  decodeEffectRecords,
  encodeEffectRecords,
  validateEffectInstance,
  validateEffectPayload,
} from './effects.js';
import type { EffectRegistry, EffectInstance, ImmutableJson } from './effects.js';
import { cloneData, deepFreeze, canonicalEncode } from './canonical.js';
import type { RepetitionProjection } from './repetition.js';
import { relativeDeadline } from './repetition.js';
import { effectLinkContext, validateEffectLinks, normalizeEffectLinks } from './effect-links.js';
import { assertEffectTriggers } from './effect-triggers.js';
import type { EffectTriggerHandler } from './effect-triggers.js';
import {
  sourceOf,
  effectSourceKey,
  resolveEffectLifetime,
  assertEffectSourceProfile,
} from './effect-parameters.js';
import type { EffectSourceIdentity, EffectDurationParameters } from '@variant-chess/shared-types';
import type { ActionRestriction } from './action-legality.js';
import type { CaptureDefense } from './capture-defense.js';
import { assertDeathReaction } from './committed-death.js';
import type { CommittedDeathReactionBinding } from './committed-death.js';

export interface EffectRuntimeBindings {
  readonly deathReactions?: Readonly<Record<string, CommittedDeathReactionBinding>>;
  readonly captureDefense?: Readonly<Record<string, CaptureDefense>>;
  readonly restrictions?: Readonly<Record<string, ActionRestriction>>;
  readonly triggers?: Readonly<Record<string, EffectTriggerHandler>>;
  readonly linkValidation?: Readonly<
    Record<string, (instance: EffectInstance, context: EffectLinkContext) => boolean>
  >;
  readonly linkNormalization?: Readonly<
    Record<string, (instance: EffectInstance, context: EffectLinkContext) => EffectLinkSemantics>
  >;
  readonly relocation?: Readonly<Record<string, (context: EffectRelocationContext) => boolean>>;
  readonly eligibility?: Readonly<
    Record<string, (instance: EffectInstance, state: GameState) => boolean>
  >;
  readonly mergePayload?: Readonly<
    Record<string, (existing: readonly EffectInstance[], incoming: EffectInstance) => ImmutableJson>
  >;
}
export interface EffectLinkContext {
  readonly state: GameState;
  readonly instances: readonly EffectInstance[];
}
export interface EffectLinkSemantics {
  readonly group: ImmutableJson;
  readonly references: readonly ImmutableJson[];
}
export interface EffectRelocationMove {
  readonly effectId: string;
  readonly from: EffectInstance['target'];
  readonly to: EffectInstance['target'];
}
export interface EffectRelocationContext {
  readonly before: GameState;
  readonly after: GameState;
  readonly moves: readonly EffectRelocationMove[];
  readonly original: EffectInstance;
  readonly instance: EffectInstance;
}
export interface EffectRuntime extends EffectRuntimeBindings {
  readonly registry: EffectRegistry;
}
type LifecycleKind =
  | 'effect_applied'
  | 'effect_removed'
  | 'effect_refreshed'
  | 'effect_stacked'
  | 'effect_relocated'
  | 'effect_sets_swapped';
export type EffectLifecycleFact = {
  [K in LifecycleKind]: Pick<Extract<DomainEvent, { kind: K }>, 'kind' | 'payload'>;
}[LifecycleKind];
export type EffectBoundary = NonNullable<GameState['effects'][number]['deadline']>;
/** Snapshot the due set before dispatch; no counters or wall-clock are advanced here. */
export function collectDueEffects(
  instances: readonly EffectInstance[],
  raw: EffectBoundary,
): readonly string[] {
  const boundary = DeadlineSchema.parse(cloneData(raw));
  return Object.freeze(
    instances
      .filter(
        (effect) =>
          effect.deadline &&
          effect.deadline.side === boundary.side &&
          effect.deadline.boundary === boundary.boundary &&
          effect.deadline.ordinal <= boundary.ordinal,
      )
      .sort(effectOrder)
      .map((effect) => effect.id),
  );
}
function removalFact(
  instance: EffectInstance,
  reason: EffectRemovalReason,
  runtime: EffectRuntime,
): EffectLifecycleFact {
  return { kind: 'effect_removed', payload: { ...effectFact(instance, runtime), reason } };
}
export function planEffectRemoval(
  state: GameState,
  raw: EffectRemovalOperation,
  runtime: EffectRuntime,
) {
  const input = EffectRemovalOperationSchema.parse(cloneData(raw));
  const prefix = `${state.matchId}:operation:`;
  const ordinal = input.instanceId.slice(prefix.length);
  if (
    !input.instanceId.startsWith(prefix) ||
    !/^[1-9]\d*$/.test(ordinal) ||
    !Number.isSafeInteger(Number(ordinal)) ||
    Number(ordinal) > state.counters.operation
  )
    throw new Error('EFFECT_ID_MISMATCH');
  const effect = decodeEffectRecords(state.effects, runtime.registry, state).find(
    (effect) => effect.id === input.instanceId,
  );
  if (!effect) return { records: state.effects, facts: [] as EffectLifecycleFact[] };
  if (input.reason === 'target_destroyed' || input.reason === 'match_terminal')
    throw new Error('INVALID_REMOVAL_REASON');
  const permissions = runtime.registry.get(effect.definitionId).removalPermissions;
  if (permissions && !permissions.includes(input.reason))
    throw new Error('EFFECT_REMOVAL_FORBIDDEN');
  return {
    records: state.effects.filter((record) => record.id !== effect.id),
    facts: [removalFact(effect, input.reason, runtime)],
  };
}
export function planEffectExpiration(
  state: GameState,
  id: string,
  boundary: EffectBoundary,
  runtime: EffectRuntime,
) {
  const instances = decodeEffectRecords(state.effects, runtime.registry, state);
  const due = collectDueEffects(instances, boundary);
  const effect = instances.find((effect) => effect.id === id);
  if (!effect || !due.includes(id))
    return { records: state.effects, facts: [] as EffectLifecycleFact[] };
  return {
    records: state.effects.filter((record) => record.id !== id),
    facts: [removalFact(effect, 'expired', runtime)],
  };
}
/** Use pre-death attachments; after a committed death their targets need not remain live. */
export function planEffectCleanup(before: GameState, after: GameState, runtime: EffectRuntime) {
  const removed = decodeEffectRecords(before.effects, runtime.registry, before)
    .filter(
      (effect) =>
        (effect.target.kind === 'piece' &&
          !Object.hasOwn(after.board.pieces, effect.target.pieceId)) ||
        after.terminal.status !== 'ongoing',
    )
    .sort(effectOrder);
  const ids = new Set(removed.map((effect) => effect.id));
  return {
    records: after.effects.filter((record) => !ids.has(record.id)),
    facts: removed.map((effect) =>
      removalFact(
        effect,
        effect.target.kind === 'piece' && !Object.hasOwn(after.board.pieces, effect.target.pieceId)
          ? 'target_destroyed'
          : 'match_terminal',
        runtime,
      ),
    ),
  };
}
export function createEffectRuntime(
  registry: EffectRegistry,
  bindings: EffectRuntimeBindings = {},
): EffectRuntime {
  return Object.freeze({
    registry,
    deathReactions: Object.freeze(
      Object.fromEntries(
        Object.entries(bindings.deathReactions ?? {}).map(([id, binding]) => [
          id,
          Object.freeze({ ...binding }),
        ]),
      ),
    ),
    captureDefense: Object.freeze({ ...bindings.captureDefense }),
    restrictions: Object.freeze({ ...bindings.restrictions }),
    triggers: Object.freeze(
      Object.fromEntries(
        Object.entries(bindings.triggers ?? {}).map(([id, handler]) => [
          id,
          Object.freeze({ ...handler }),
        ]),
      ),
    ),
    eligibility: Object.freeze({ ...bindings.eligibility }),
    mergePayload: Object.freeze({ ...bindings.mergePayload }),
    relocation: Object.freeze({ ...bindings.relocation }),
    linkValidation: Object.freeze({ ...bindings.linkValidation }),
    linkNormalization: Object.freeze({ ...bindings.linkNormalization }),
  });
}
export function assertSupportedEffect(
  instance: Pick<EffectInstance, 'definitionId' | 'groupId' | 'references' | 'payload'>,
  runtime: EffectRuntime,
): void {
  const definition = runtime.registry.get(instance.definitionId);
  assertDeathReaction(instance, runtime);
  if (
    definition.captureDefense &&
    (definition.targets.some((target) => target !== 'piece') ||
      definition.captureDefense.kind !== 'atomic-reject' ||
      !Object.hasOwn(runtime.captureDefense ?? {}, definition.captureDefense.policyId) ||
      typeof runtime.captureDefense?.[definition.captureDefense.policyId] !== 'function')
  )
    throw new Error('UNSUPPORTED_RUNTIME');
  for (const restriction of definition.actionRestrictions ?? [])
    if (
      definition.targets.some((target) => target !== 'piece') ||
      !Object.hasOwn(runtime.restrictions ?? {}, restriction.policyId) ||
      typeof runtime.restrictions?.[restriction.policyId] !== 'function'
    )
      throw new Error('UNSUPPORTED_RUNTIME');
  assertEffectTriggers(definition, runtime);
  if ((instance.references?.length ?? 0) && !definition.links)
    throw new Error('UNSUPPORTED_RUNTIME');
  if (
    definition.links &&
    (!Object.hasOwn(runtime.linkValidation ?? {}, definition.links.validationId) ||
      typeof runtime.linkValidation?.[definition.links.validationId] !== 'function' ||
      !Object.hasOwn(runtime.linkNormalization ?? {}, definition.links.normalizationId) ||
      typeof runtime.linkNormalization?.[definition.links.normalizationId] !== 'function')
  )
    throw new Error('UNSUPPORTED_RUNTIME');
  if (
    definition.lifetime.kind === 'event-count' ||
    definition.lifetime.kind === 'progress' ||
    (definition.lifetime.kind === 'current-turn-window' &&
      definition.lifetime.boundary !== 'end') ||
    definition.ownership.kind === 'declared' ||
    definition.visibility.kind === 'declared' ||
    Object.values(definition.removal).some((policy) => policy !== 'cleanup-only')
  )
    throw new Error('UNSUPPORTED_RUNTIME');
  const policy = definition.stacking;
  if (
    policy.mode === 'refresh' &&
    (policy.source === 'declared' ||
      policy.deadline === 'declared' ||
      (policy.deadline === 'extend' && definition.lifetime.kind !== 'rounds') ||
      (policy.payload === 'declared' &&
        !Object.hasOwn(runtime.mergePayload ?? {}, policy.mergePolicyId ?? '')))
  )
    throw new Error('UNSUPPORTED_RUNTIME');
  if (
    policy.mode === 'stack' &&
    (policy.representation !== 'instances' ||
      !Object.hasOwn(runtime.mergePayload ?? {}, policy.mergePolicyId))
  )
    throw new Error('UNSUPPORTED_RUNTIME');
  for (const policyId of [
    definition.eligibility?.policyId,
    definition.kingEligibility.kind === 'declared'
      ? definition.kingEligibility.policyId
      : undefined,
  ])
    if (policyId && !Object.hasOwn(runtime.eligibility ?? {}, policyId))
      throw new Error('UNSUPPORTED_RUNTIME');
}
export function assertEffectRuntimeState(
  state: GameState,
  runtime: EffectRuntime,
  customProjection = false,
  validateLinks = true,
): void {
  const counts = new Map<string, number>();
  const instances = decodeEffectRecords(state.effects, runtime.registry, state);
  if (
    instances.some(
      (instance) => instance.groupId !== null && !runtime.registry.get(instance.definitionId).links,
    ) &&
    instances.some((instance) => runtime.registry.get(instance.definitionId).links)
  )
    throw new Error('UNSUPPORTED_RUNTIME');
  for (const instance of instances) {
    assertSupportedEffect(instance, runtime);
    if (instance.timingAnchor.ordinal > sourceOrdinal(state, instance.sourcePlayer))
      throw new Error('EFFECT_ANCHOR_FUTURE');
    if (instance.deadline) {
      const ordinal = sourceOrdinal(state, instance.deadline.side);
      if (
        instance.deadline.ordinal < ordinal ||
        (instance.deadline.ordinal === ordinal &&
          (instance.deadline.side !== state.turn.sideToAct ||
            instance.deadline.boundary === 'start'))
      )
        throw new Error('EFFECT_EXPIRED_STATE');
    }
    if (
      instance.groupId !== null &&
      !customProjection &&
      !runtime.registry.get(instance.definitionId).links
    )
      throw new Error('UNSUPPORTED_RUNTIME');
    const policy = runtime.registry.get(instance.definitionId).stacking;
    const key = effectMatchingKey(instance, runtime.registry, state.matchId);
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (policy.mode === 'stack' && policy.cap !== null && count > policy.cap)
      throw new Error('EFFECT_STACK_LIMIT');
    if (policy.mode !== 'independent' && policy.mode !== 'stack' && count > 1)
      throw new Error('EFFECT_MATCH_INVARIANT');
  }
  if (validateLinks) validateEffectLinks(state, instances, runtime);
}
export function effectFact(
  instance: EffectInstance,
  runtime: EffectRuntime,
): Extract<DomainEvent, { kind: 'effect_applied' }>['payload'] {
  const visibility = runtime.registry.get(instance.definitionId).visibility;
  if (visibility.kind === 'declared') throw new Error('UNSUPPORTED_RUNTIME');
  return {
    effectId: instance.id,
    definitionId: instance.definitionId,
    definitionVersion: instance.definitionVersion,
    target: cloneData(instance.target),
    sourcePlayer: instance.sourcePlayer,
    sourceVariant: instance.sourceVariant,
    sourceSkill: instance.sourceSkill,
    sourcePiece: instance.sourcePiece,
    effectVisibility: visibility.kind,
  };
}
export function sourceOrdinal(state: GameState, side: PlayerSide): number {
  return Math.floor((state.turn.plyIndex + (side === 'white' ? 2 : 1)) / 2);
}
export function effectOrder(a: EffectInstance, b: EffectInstance): number {
  return a.appliedSequence - b.appliedSequence || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
function effectMatchingKey(
  instance: EffectInstance,
  registry: EffectRegistry,
  matchId: string,
): string {
  const policy = registry.get(instance.definitionId).stacking;
  return canonicalEncode([
    instance.definitionId,
    instance.target,
    policy.key === 'type-source-target'
      ? instance.sourcePlayer
      : policy.key === 'type-source-identity-target'
        ? effectSourceKey(matchId, sourceOf(instance))
        : null,
    policy.key === 'explicit-group' ? instance.groupId : null,
  ]);
}
function lifetimeData(
  state: GameState,
  runtime: EffectRuntime,
  typeId: string,
  source: Readonly<EffectSourceIdentity>,
  duration?: EffectDurationParameters,
) {
  const lifetime = resolveEffectLifetime(runtime.registry.get(typeId), source, duration);
  const boundary = 'boundary' in lifetime ? lifetime.boundary : 'start';
  const timingAnchor = {
    side: source.sourcePlayer,
    boundary,
    ordinal: sourceOrdinal(state, source.sourcePlayer),
  };
  const deadline =
    lifetime.kind === 'rounds'
      ? { ...timingAnchor, ordinal: timingAnchor.ordinal + lifetime.rounds }
      : lifetime.kind === 'current-turn-window'
        ? {
            side: state.turn.sideToAct,
            boundary: lifetime.boundary,
            ordinal: sourceOrdinal(state, state.turn.sideToAct),
          }
        : null;
  return {
    timingAnchor,
    deadline,
    lifetime: cloneData(lifetime),
    ...(duration === undefined ? {} : { duration: cloneData(duration) }),
  };
}
export function validateEligibility(
  incoming: EffectInstance,
  state: GameState,
  runtime: EffectRuntime,
): void {
  const definition = runtime.registry.get(incoming.definitionId);
  const policyIds = [
    definition.eligibility?.policyId,
    definition.kingEligibility.kind === 'declared' &&
    incoming.target.kind === 'piece' &&
    state.board.pieces[incoming.target.pieceId]?.currentType === 'king'
      ? definition.kingEligibility.policyId
      : undefined,
  ];
  for (const policyId of policyIds) {
    if (!policyId) continue;
    const handler = Object.hasOwn(runtime.eligibility ?? {}, policyId)
      ? runtime.eligibility?.[policyId]
      : undefined;
    if (!handler) throw new Error('UNSUPPORTED_RUNTIME');
    if (handler(incoming, deepFreeze(cloneData(state))) !== true)
      throw new Error('EFFECT_INELIGIBLE');
  }
}
export function planEffectApplication(
  state: GameState,
  raw: EffectApplication,
  actor: PlayerSide,
  id: string,
  runtime: EffectRuntime,
) {
  const input = EffectApplicationSchema.parse(cloneData(raw));
  const sourcePlayer = input.sourcePlayer === 'actor' ? actor : input.sourcePlayer;
  const data: Partial<EffectApplication> = { ...input };
  delete data.kind;
  const source = sourceOf({ ...input, sourcePlayer });
  const declared = runtime.registry.get(input.definitionId);
  const instances = decodeEffectRecords(state.effects, runtime.registry, state);
  // An already attached family wins without reapplying the incoming producer's eligibility.
  validateEffectPayload(declared, input.definitionVersion, input.payload);
  assertEffectSourceProfile(declared, source);
  resolveEffectLifetime(declared, source, input.duration);
  assertSupportedEffect(input, runtime);
  const refs = { variant: input.sourceVariant, skill: input.sourceSkill, piece: input.sourcePiece };
  if (declared.sourceAttribution.requiredRefs.some((ref) => refs[ref] === null))
    throw new Error('EFFECT_SOURCE_MISSING');
  if (
    declared.family &&
    instances.some(
      (existing) =>
        runtime.registry.get(existing.definitionId).family?.id === declared.family!.id &&
        canonicalEncode(existing.target) === canonicalEncode(input.target),
    )
  )
    return { records: state.effects, facts: [] as EffectLifecycleFact[] };
  const incoming = validateEffectInstance(
    {
      ...data,
      id,
      sourcePlayer,
      ...(declared.stacking.key === 'type-source-identity-target' ||
      declared.sourceAttribution.profile
        ? { sourceIncarnation: source.sourceIncarnation }
        : {}),
      appliedSequence: state.counters.transaction,
      ...lifetimeData(state, runtime, input.definitionId, source, input.duration),
    },
    runtime.registry,
    state,
  );
  assertSupportedEffect(incoming, runtime);
  validateEligibility(incoming, state, runtime);
  const definition = runtime.registry.get(incoming.definitionId);
  const policy = definition.stacking;
  const matches = instances
    .filter(
      (existing) =>
        effectMatchingKey(existing, runtime.registry, state.matchId) ===
        effectMatchingKey(incoming, runtime.registry, state.matchId),
    )
    .sort(effectOrder);
  const facts: EffectLifecycleFact[] = [];
  let remaining = [...instances];
  if (matches.length && policy.mode === 'ignore') return { records: state.effects, facts };
  if (matches.length && policy.mode === 'replace') {
    const removed = new Set(matches.map((effect) => effect.id));
    remaining = remaining.filter((effect) => !removed.has(effect.id));
    for (const effect of matches)
      facts.push({
        kind: 'effect_removed',
        payload: { ...effectFact(effect, runtime), reason: 'replaced' },
      });
  } else if (matches.length && policy.mode === 'refresh') {
    if (matches.length !== 1) throw new Error('EFFECT_AMBIGUOUS_MATCH');
    const existing = matches[0]!;
    const chosenSource = policy.source === 'replace' ? incoming : existing;
    if (
      existing.deadline &&
      (policy.deadline === 'preserve' || policy.deadline === 'extend') &&
      chosenSource.sourcePlayer !== existing.sourcePlayer
    )
      throw new Error('EFFECT_REFRESH_TIMING');
    const oldData = { ...existing };
    delete oldData.extensionRounds;
    delete oldData.duration;
    delete oldData.sourceIncarnation;
    const merged =
      policy.payload === 'declared'
        ? runtime.mergePayload![policy.mergePolicyId!]!(deepFreeze(cloneData(matches)), incoming)
        : policy.payload === 'replace'
          ? incoming.payload
          : existing.payload;
    const timing =
      (policy.deadline === 'preserve' || policy.deadline === 'extend') &&
      chosenSource.sourcePlayer === existing.sourcePlayer
        ? {
            timingAnchor: existing.timingAnchor,
            deadline: existing.deadline,
            lifetime: existing.lifetime,
            ...(existing.duration === undefined ? {} : { duration: existing.duration }),
          }
        : lifetimeData(
            state,
            runtime,
            existing.definitionId,
            sourceOf(chosenSource),
            incoming.duration,
          );
    let extension = policy.deadline === 'preserve' ? existing.extensionRounds : undefined;
    if (policy.deadline === 'extend') {
      if (existing.lifetime.kind !== 'rounds' || !existing.deadline)
        throw new Error('UNSUPPORTED_RUNTIME');
      extension = (existing.extensionRounds ?? 0) + existing.lifetime.rounds;
      timing.deadline = {
        ...existing.deadline,
        ordinal: existing.deadline.ordinal + existing.lifetime.rounds,
      };
    }
    const refreshed = validateEffectInstance(
      {
        ...oldData,
        ...timing,
        sourcePlayer: chosenSource.sourcePlayer,
        sourceVariant: chosenSource.sourceVariant,
        sourceSkill: chosenSource.sourceSkill,
        sourcePiece: chosenSource.sourcePiece,
        ...(chosenSource.sourceIncarnation === undefined
          ? {}
          : { sourceIncarnation: chosenSource.sourceIncarnation }),
        payload: merged,
        ...(extension === undefined ? {} : { extensionRounds: extension }),
      },
      runtime.registry,
      state,
    );
    validateEligibility(refreshed, state, runtime);
    facts.push({ kind: 'effect_refreshed', payload: effectFact(refreshed, runtime) });
    return {
      records: encodeEffectRecords(
        instances.map((effect) => (effect.id === refreshed.id ? refreshed : effect)),
        runtime.registry,
        state,
      ),
      facts,
    };
  }
  let added = incoming;
  if (policy.mode === 'stack' && matches.length) {
    if (policy.cap !== null && matches.length >= policy.cap) throw new Error('EFFECT_STACK_LIMIT');
    const payload = runtime.mergePayload![policy.mergePolicyId]!(
      deepFreeze(cloneData(matches)),
      incoming,
    );
    added = validateEffectInstance({ ...incoming, payload }, runtime.registry, state);
    validateEligibility(added, state, runtime);
    facts.push({
      kind: 'effect_stacked',
      payload: { ...effectFact(added, runtime), count: matches.length + 1 },
    });
  } else facts.push({ kind: 'effect_applied', payload: effectFact(added, runtime) });
  return { records: encodeEffectRecords([...remaining, added], runtime.registry, state), facts };
}

/** Compose only unlinked effect semantics; group normalization stays with explicit bundle projection. */
export function runtimeRepetitionProjection(
  runtime: EffectRuntime,
  custom?: RepetitionProjection,
): RepetitionProjection {
  return (state) => {
    if (
      !custom &&
      (Object.keys(state.variantState.white).length || Object.keys(state.variantState.black).length)
    )
      throw new Error('REPETITION_SEMANTICS_REQUIRED');
    const prior = custom?.(state);
    const instances = decodeEffectRecords(state.effects, runtime.registry, state);
    const opaqueGroups = instances.some(
      (instance) => instance.groupId !== null && !runtime.registry.get(instance.definitionId).links,
    );
    if (opaqueGroups) {
      if (instances.some((instance) => runtime.registry.get(instance.definitionId).links))
        throw new Error('UNSUPPORTED_RUNTIME');
      if (!prior) throw new Error('REPETITION_SEMANTICS_REQUIRED');
      return prior;
    }
    validateEffectLinks(state, instances, runtime);
    const linkContext = effectLinkContext(state, instances);
    const listenerOrder = new Map(
      instances
        .filter((instance) => runtime.registry.get(instance.definitionId).triggers.length)
        .sort(effectOrder)
        .map((instance, index) => [instance.id, index]),
    );
    const matchRanks = new Map<string, number>();
    const matchingOrder = new Map<string, number>();
    for (const instance of [...instances].sort(effectOrder)) {
      if (runtime.registry.get(instance.definitionId).stacking.mode !== 'stack') continue;
      const key = effectMatchingKey(instance, runtime.registry, state.matchId),
        rank = matchRanks.get(key) ?? 0;
      matchingOrder.set(instance.id, rank);
      matchRanks.set(key, rank + 1);
    }
    const semantic = instances
      .map((instance) => {
        const links = runtime.registry.get(instance.definitionId).links
          ? normalizeEffectLinks(instance, linkContext, runtime)
          : undefined;
        const target =
          instance.target.kind === 'piece'
            ? { kind: 'piece', position: state.board.pieces[instance.target.pieceId]!.position }
            : instance.target;
        const data = runtime.registry.get(instance.definitionId).repetitionProjector(
          instance,
          deepFreeze({
            target: cloneData(target),
            group: links ?? null,
            remainingLifetime: relativeDeadline(state, instance.deadline),
          }),
        );
        return {
          definitionId: instance.definitionId,
          definitionVersion: instance.definitionVersion,
          ...(runtime.registry.get(instance.definitionId).family
            ? {
                family: runtime.registry.get(instance.definitionId).family!,
                category: runtime.registry.get(instance.definitionId).category,
              }
            : {}),
          ...(listenerOrder.has(instance.id)
            ? { listenerOrder: listenerOrder.get(instance.id)! }
            : {}),
          ...(matchingOrder.has(instance.id)
            ? { matchingOrder: matchingOrder.get(instance.id)! }
            : {}),
          data,
          ...(links === undefined ? {} : { links }),
        };
      })
      .sort((a, b) =>
        canonicalEncode(a) < canonicalEncode(b)
          ? -1
          : canonicalEncode(a) > canonicalEncode(b)
            ? 1
            : 0,
      );
    return cloneData({
      effects: semantic,
      delayedActions: prior?.delayedActions ?? [],
      variantState: prior?.variantState ?? state.variantState,
    }) as {
      effects: SerializableValue;
      delayedActions: SerializableValue;
      variantState: SerializableValue;
    };
  };
}
