import {
  EffectRelocationOperationSchema,
  EffectSetSwapOperationSchema,
} from '@variant-chess/shared-types';
import type {
  EffectRelocationOperation,
  EffectSetSwapOperation,
  GameState,
} from '@variant-chess/shared-types';
import { decodeEffectRecords, encodeEffectRecords } from './effects.js';
import type { EffectInstance } from './effects.js';
import {
  assertEffectRuntimeState,
  effectFact,
  effectOrder,
  validateEligibility,
} from './effect-runtime.js';
import type { EffectRuntime, EffectLifecycleFact, EffectRelocationMove } from './effect-runtime.js';
import { canonicalEncode, cloneData, deepFreeze } from './canonical.js';

/** Construct the complete assignment before validating any destination or policy. */
export function planEffectRelocation(
  state: GameState,
  raw: EffectRelocationOperation | EffectSetSwapOperation,
  runtime: EffectRuntime,
  customProjection: boolean,
) {
  const instances = decodeEffectRecords(state.effects, runtime.registry, state);
  const input =
    raw.kind === 'effect_relocate'
      ? EffectRelocationOperationSchema.parse(cloneData(raw))
      : EffectSetSwapOperationSchema.parse(cloneData(raw));
  const destinations = new Map<string, EffectInstance['target']>();
  if (input.kind === 'effect_relocate') {
    if (!instances.some((instance) => instance.id === input.instanceId))
      throw new Error('EFFECT_INSTANCE_MISSING');
    destinations.set(input.instanceId, input.target);
  } else {
    if (input.pieceA === input.pieceB) throw new Error('INVALID_EFFECT_SWAP');
    for (const pieceId of [input.pieceA, input.pieceB])
      if (!Object.hasOwn(state.board.pieces, pieceId)) throw new Error('EFFECT_TARGET_MISSING');
    for (const instance of instances) {
      if (instance.target.kind !== 'piece') continue;
      if (instance.target.pieceId === input.pieceA)
        destinations.set(instance.id, { kind: 'piece', pieceId: input.pieceB });
      if (instance.target.pieceId === input.pieceB)
        destinations.set(instance.id, { kind: 'piece', pieceId: input.pieceA });
    }
  }
  const proposed = instances.map((instance) =>
    destinations.has(instance.id)
      ? { ...instance, target: destinations.get(instance.id)! }
      : instance,
  );
  const records = encodeEffectRecords(proposed, runtime.registry, state);
  const after = deepFreeze({ ...cloneData(state), effects: records });
  assertEffectRuntimeState(after, runtime, customProjection);
  const final = decodeEffectRecords(records, runtime.registry, after);
  const moved = instances.filter((instance) => destinations.has(instance.id)).sort(effectOrder);
  const moves: readonly EffectRelocationMove[] = deepFreeze(
    moved.map((original) => ({
      effectId: original.id,
      from: cloneData(original.target),
      to: cloneData(destinations.get(original.id)!),
    })),
  );
  const facts: EffectLifecycleFact[] = [];
  for (const original of moved) {
    const instance = final.find((effect) => effect.id === original.id)!;
    const definition = runtime.registry.get(original.definitionId);
    const policy = definition.relocation;
    if (policy.kind === 'prohibited-with-reason') throw new Error('EFFECT_RELOCATION_PROHIBITED');
    if (
      (policy.kind === 'group-aware' ||
        instance.groupId !== null ||
        (instance.references?.length ?? 0)) &&
      !definition.links
    )
      throw new Error('UNSUPPORTED_RUNTIME');
    validateEligibility(instance, after, runtime);
    for (const policyId of [
      ...policy.constraints,
      ...(policy.kind === 'group-aware' ? [policy.policyId] : []),
    ]) {
      const binding = Object.hasOwn(runtime.relocation ?? {}, policyId)
        ? runtime.relocation?.[policyId]
        : undefined;
      if (typeof binding !== 'function') throw new Error('UNSUPPORTED_RUNTIME');
      const context = deepFreeze({ before: cloneData(state), after, moves, original, instance });
      if (binding(context) !== true) throw new Error('EFFECT_RELOCATION_INELIGIBLE');
    }
    if (canonicalEncode(original.target) !== canonicalEncode(instance.target))
      facts.push({
        kind: 'effect_relocated',
        payload: {
          ...effectFact(instance, runtime),
          from: cloneData(original.target),
          to: cloneData(instance.target),
        },
      });
  }
  if (input.kind === 'effect_sets_swap')
    facts.push({
      kind: 'effect_sets_swapped',
      payload: {
        pieceA: input.pieceA,
        pieceB: input.pieceB,
        effectIds: moves.map((move) => move.effectId),
      },
    });
  return { records, facts };
}
