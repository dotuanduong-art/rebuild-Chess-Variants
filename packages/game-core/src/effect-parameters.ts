import {
  EffectSourceIdentitySchema,
  EffectDurationParametersSchema,
  MatchIdSchema,
} from '@variant-chess/shared-types';
import type { EffectSourceIdentity, EffectDurationParameters } from '@variant-chess/shared-types';
import type { EffectDefinition } from './effects.js';
import { cloneData, deepFreeze, canonicalEncode } from './canonical.js';

export function captureEffectSource(raw: unknown): Readonly<EffectSourceIdentity> {
  const source = EffectSourceIdentitySchema.parse(cloneData(raw));
  if (source.sourceIncarnation !== null && source.sourcePiece === null)
    throw new Error('EFFECT_INCARNATION_WITHOUT_CASTER');
  return deepFreeze(source);
}
export function effectSourceKey(matchId: string, raw: unknown): string {
  return canonicalEncode([MatchIdSchema.parse(matchId), captureEffectSource(raw)]);
}
export function sourceOf(instance: {
  readonly sourcePlayer: EffectSourceIdentity['sourcePlayer'];
  readonly sourceVariant: string | null;
  readonly sourceSkill: string | null;
  readonly sourcePiece: EffectSourceIdentity['sourcePiece'];
  readonly sourceIncarnation?: string | null | undefined;
}): Readonly<EffectSourceIdentity> {
  return captureEffectSource({
    sourcePlayer: instance.sourcePlayer,
    sourceVariant: instance.sourceVariant,
    sourceSkill: instance.sourceSkill,
    sourcePiece: instance.sourcePiece,
    sourceIncarnation: instance.sourceIncarnation ?? null,
  });
}
/** Opt-in null-caster source contract; older synthetic source policies are unchanged. */
export function assertEffectSourceProfile(
  definition: Pick<EffectDefinition, 'sourceAttribution'>,
  source: Readonly<EffectSourceIdentity>,
): void {
  const profile = definition.sourceAttribution.profile;
  if (
    profile &&
    (source.sourceVariant !== profile.sourceVariant ||
      source.sourceSkill !== profile.sourceSkill ||
      source.sourcePiece !== null ||
      source.sourceIncarnation !== null)
  )
    throw new Error('EFFECT_SOURCE_PROFILE_MISMATCH');
}
/** Pure shared apply/codec validator; profiles belong to the immutable definition, never the client. */
export function resolveEffectLifetime(
  definition: EffectDefinition,
  source: Readonly<EffectSourceIdentity>,
  raw?: EffectDurationParameters,
) {
  const policy = definition.lifetime;
  if (policy.kind !== 'producer-rounds') {
    if (raw !== undefined || source.sourceIncarnation !== null)
      throw new Error('UNSUPPORTED_EFFECT_PARAMETERS');
    return cloneData(policy);
  }
  const parameters = EffectDurationParametersSchema.parse(cloneData(raw));
  const producer = policy.producers.find(
    (p) => p.id === parameters.producerId && p.version === parameters.producerVersion,
  );
  if (
    !producer ||
    source.sourceVariant !== producer.sourceVariant ||
    source.sourceSkill !== producer.sourceSkill ||
    !producer.allowedRounds.includes(parameters.rounds) ||
    (producer.requireCaster && source.sourcePiece === null) ||
    (source.sourceIncarnation !== null && !producer.supportsIncarnation)
  )
    throw new Error('EFFECT_PRODUCER_PARAMETERS');
  return { kind: 'rounds' as const, rounds: parameters.rounds, boundary: policy.boundary };
}
