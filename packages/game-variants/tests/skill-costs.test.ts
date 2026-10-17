import { expect, it } from 'vitest';
import { SKILL_AP_COSTS_V1 } from '../src/index.js';
import { pinFixedSkillCosts } from '../src/config/skill-costs.js';
import { executeReplay, decodeSnapshot, fullStateHash } from '@variant-chess/game-core';
import {
  createHolyShieldExperimentalRuleset,
  createLiveChargeExperimentalRuleset,
  createJudgmentChainsExperimentalRuleset,
  createHolySealExperimentalRuleset,
} from '../src/index.js';
import archives from './fixtures/pre-b2-producer-replays.json' with { type: 'json' };

it('centralizes exactly the five owner-approved fixed AP costs in an immutable v1 artifact', () => {
  expect(SKILL_AP_COSTS_V1).toEqual({
    'guardian.holy_shield': 4,
    'dynamite.live_charge': 3,
    'nephalem.judgment_chains': 5,
    'angel.holy_seal': 6,
    'dragon_sentinel.shockwave': 4,
  });
  expect(Object.isFrozen(SKILL_AP_COSTS_V1)).toBe(true);
});

it.each([
  ['guardian.holy_shield', createHolyShieldExperimentalRuleset, 4],
  ['dynamite.live_charge', createLiveChargeExperimentalRuleset, 3],
  ['nephalem.judgment_chains', createJudgmentChainsExperimentalRuleset, 5],
  ['angel.holy_seal', createHolySealExperimentalRuleset, 6],
] as const)(
  'preserves the exact pre-B2 %s snapshot/replay and original ruleset pins',
  (skill, factory, cost) => {
    const rules = factory({ white: true, black: false });
    const archive = archives.archives[skill];
    const initial = decodeSnapshot(archive.initialSnapshot, rules);
    expect(initial.engineVersion).toBe('0.6.0');
    expect(initial.schemaVersion).toBe('1.1.0');
    expect(initial.rulesetHash).toBe(archive.initialConfig.rulesetHash);
    expect(initial.ap.white).toBe(cost);
    const replay = executeReplay(archive, rules);
    expect(replay.ok).toBe(true);
    if (!replay.ok) throw new Error(replay.code);
    expect(replay.events).toEqual(archive.steps[0]!.events);
    expect(replay.state.ap.white).toBe(0);
    expect(fullStateHash(replay.state, rules.effectRegistry).digest).toBe(
      archive.steps[0]!.stateHash,
    );
  },
);

it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN])(
  'rejects invalid authored cost %s before pin validation',
  (cost) => {
    expect(() => pinFixedSkillCosts({ 'guardian.holy_shield': cost }, 'unused')).toThrow(
      'INVALID_SKILL_COST',
    );
  },
);

it('fails closed when balance values are edited under the existing v1 identity', () => {
  expect(() =>
    pinFixedSkillCosts({ ...SKILL_AP_COSTS_V1, 'guardian.holy_shield': 5 }, '2a56da8ff953d29b'),
  ).toThrow('SKILL_COST_PIN_MISMATCH');
  expect(() => Object.assign(SKILL_AP_COSTS_V1, { 'guardian.holy_shield': 5 })).toThrow();
});
