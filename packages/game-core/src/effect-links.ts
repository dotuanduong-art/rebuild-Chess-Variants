import { EffectLinkSemanticsSchema } from '@variant-chess/shared-types';
import type { GameState } from '@variant-chess/shared-types';
import type { EffectInstance, ImmutableJson } from './effects.js';
import type { EffectRuntime, EffectLinkContext } from './effect-runtime.js';
import { canonicalEncode, cloneData, deepFreeze } from './canonical.js';

export function effectLinkContext(
  state: GameState,
  instances: readonly EffectInstance[],
): EffectLinkContext {
  return deepFreeze({ state: cloneData(state), instances: cloneData(instances) });
}
/** Structural presence is core-owned; role/topology eligibility is definition-owned. */
export function validateEffectLinks(
  state: GameState,
  instances: readonly EffectInstance[],
  runtime: EffectRuntime,
): void {
  const byId = new Map(instances.map((instance) => [instance.id, instance]));
  const context = effectLinkContext(state, instances);
  for (const instance of instances) {
    const declaration = runtime.registry.get(instance.definitionId).links;
    if ((instance.references?.length ?? 0) && !declaration) throw new Error('UNSUPPORTED_RUNTIME');
    const keys = (instance.references ?? []).map((ref) => canonicalEncode(ref));
    if (new Set(keys).size !== keys.length) throw new Error('EFFECT_DUPLICATE_REFERENCE');
    for (const ref of instance.references ?? []) {
      if (ref.kind === 'effect' && !byId.has(ref.instanceId))
        throw new Error('EFFECT_LINK_REFERENCE_MISSING');
      if (
        ref.kind === 'piece' &&
        ref.presence === 'live' &&
        !Object.hasOwn(state.board.pieces, ref.pieceId)
      )
        throw new Error('EFFECT_LINK_REFERENCE_MISSING');
      if (ref.kind === 'group') {
        if (!ref.groupId.startsWith(`${state.matchId}:${ref.owner}:`))
          throw new Error('EFFECT_LINK_OWNER_MISMATCH');
        const members = instances.filter((other) => other.groupId === ref.groupId);
        if (!members.length) throw new Error('EFFECT_LINK_REFERENCE_MISSING');
        if (members.some((member) => member.sourcePlayer !== ref.owner))
          throw new Error('EFFECT_LINK_OWNER_MISMATCH');
      }
    }
    if (!declaration) continue;
    const validate = runtime.linkValidation?.[declaration.validationId];
    if (typeof validate !== 'function') throw new Error('UNSUPPORTED_RUNTIME');
    if (validate(instance, context) !== true) throw new Error('EFFECT_LINK_INELIGIBLE');
    normalizeEffectLinks(instance, context, runtime);
  }
}
export function normalizeEffectLinks(
  instance: EffectInstance,
  context: EffectLinkContext,
  runtime: EffectRuntime,
): ImmutableJson {
  const declaration = runtime.registry.get(instance.definitionId).links;
  if (!declaration) throw new Error('UNSUPPORTED_RUNTIME');
  const normalize = Object.hasOwn(runtime.linkNormalization ?? {}, declaration.normalizationId)
    ? runtime.linkNormalization?.[declaration.normalizationId]
    : undefined;
  if (typeof normalize !== 'function') throw new Error('UNSUPPORTED_RUNTIME');
  const result = EffectLinkSemanticsSchema.safeParse(cloneData(normalize(instance, context)));
  if (
    !result.success ||
    result.data.references.length !== (instance.references?.length ?? 0) ||
    (instance.groupId !== null && result.data.group === null) ||
    result.data.references.some((value) => value === null)
  )
    throw new Error('EFFECT_LINK_NORMALIZATION_INVALID');
  const references = (instance.references ?? [])
    .map((ref, index) => ({
      role: ref.role,
      kind: ref.kind,
      ...(ref.kind === 'piece' ? { presence: ref.presence } : {}),
      ...(ref.kind === 'group' ? { owner: ref.owner } : {}),
      semantic: result.data.references[index]!,
    }))
    .sort((a, b) =>
      canonicalEncode(a) < canonicalEncode(b)
        ? -1
        : canonicalEncode(a) > canonicalEncode(b)
          ? 1
          : 0,
    );
  return deepFreeze({ owner: instance.sourcePlayer, group: result.data.group, references });
}
