import type { GameState, PlayerSide, RootCommand } from '@variant-chess/shared-types';
import type { RulesetBundle } from '@variant-chess/game-core';
import { encodeSnapshot, resolveCommand } from '@variant-chess/game-core';
import { expect } from 'vitest';
import {
  createJudgmentChainsExperimentalRuleset,
  createHolySealExperimentalRuleset,
} from '../src/index.js';

// B1 signed literal oracles; no combined live factory is exposed.
export const profiles = [
  {
    name: 'Judgment Chains',
    factory: createJudgmentChainsExperimentalRuleset,
    skill: 'nephalem.judgment_chains',
    variant: 'nephalem',
    producer: 'nephalem.judgment-chains',
    profile: 'nephalem.judgment-chains-only.experimental',
    cost: 5,
  },
  {
    name: 'Holy Seal',
    factory: createHolySealExperimentalRuleset,
    skill: 'angel.holy_seal',
    variant: 'angel',
    producer: 'angel.holy-seal',
    profile: 'angel.holy-seal-only.experimental',
    cost: 6,
  },
] as const;
export const cast = (
  skill: string,
  pieceId = 'attacker',
): Extract<RootCommand, { kind: 'skill' }> => ({
  kind: 'skill',
  skillId: skill,
  intent: { kind: 'piece-target-v1', pieceId: pieceId as never },
});
export const input = (command: unknown, side: PlayerSide = 'white') => ({
  authority: { kind: 'player', side },
  command,
});
export function reject(state: GameState, rules: RulesetBundle, raw: unknown, code: string) {
  const before = encodeSnapshot(state, rules.effectRegistry);
  expect(resolveCommand(state, raw, rules)).toEqual({ ok: false, code, events: [] });
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
}
