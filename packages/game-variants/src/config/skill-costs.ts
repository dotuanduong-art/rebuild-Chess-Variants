import { canonicalEncode, fingerprint } from '@variant-chess/game-core';

/** Trusted authored configuration, not a live override or a factory parameter. */
export function pinFixedSkillCosts<T extends Readonly<Record<string, number>>>(
  costs: T,
  expectedFingerprint: string,
): Readonly<T> {
  if (Object.values(costs).some((cost) => !Number.isSafeInteger(cost) || cost < 0))
    throw new Error('INVALID_SKILL_COST');
  if (fingerprint(canonicalEncode(costs)) !== expectedFingerprint)
    throw new Error('SKILL_COST_PIN_MISMATCH');
  return Object.freeze({ ...costs });
}

/** Historical balance artifact. Never edit v1 in place: new approved balance requires v2 + new rulesets. */
export const SKILL_AP_COSTS_V1 = pinFixedSkillCosts(
  {
    'guardian.holy_shield': 4,
    'dynamite.live_charge': 3,
    'nephalem.judgment_chains': 5,
    'angel.holy_seal': 6,
    'dragon_sentinel.shockwave': 4,
  },
  '2a56da8ff953d29b',
);

/** B3 append-only composition. Existing factories continue importing the retained v1 artifact. */
export const SKILL_AP_COSTS_V2 = pinFixedSkillCosts(
  { ...SKILL_AP_COSTS_V1, 'guardian.sanctuary': 5 },
  'e268dfc077cf52ff',
);
