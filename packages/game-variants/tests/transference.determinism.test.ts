import { expect, it } from 'vitest';
import {
  cloneSnapshot,
  encodeSnapshot,
  recordReplay,
  executeReplay,
  fullStateHash,
  repetitionKey,
  resolveCommand,
  decodeSnapshot,
} from '@variant-chess/game-core';
import type { RulesetBundle, DerivedOperation } from '@variant-chess/game-core';
import * as variants from '../src/index.js';
import { transferenceGame, transfer, attachment, unit, run } from './transference.fixture.js';
import old from './fixtures/pre-b2-producer-replays.json' with { type: 'json' };
import shock from './fixtures/pre-b3-shockwave-replay.json' with { type: 'json' };
import sanctuary from './fixtures/pre-c1-sanctuary-replay.json' with { type: 'json' };

const input = (command = transfer()) => ({
  authority: { kind: 'player' as const, side: 'white' as const },
  command,
});

it.each([
  'source',
  'pieceA',
  'pieceB',
  'extra',
  'cost',
  'missing-operation',
  'extra-operation',
] as const)('root independently rejects trusted planner forgery %s', (field) => {
  const base = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
  const skill = base.skills!['turtle.transference']!;
  if (!('plan' in skill)) throw Error('FIXTURE');
  const rules: RulesetBundle = {
    ...base,
    skills: {
      'turtle.transference': {
        ...skill,
        plan: (context) => {
          const plan = skill.plan(context),
            forged = structuredClone(plan.operations[0]) as unknown as Record<string, unknown>;
          if (field === 'source')
            forged.source = { ...(forged.source as object), sourcePlayer: 'black' };
          if (field === 'pieceA' || field === 'pieceB') forged[field] = 'wk';
          if (field === 'extra') forged.effectIds = [];
          return {
            cost: field === 'cost' ? 0 : plan.cost,
            operations:
              field === 'missing-operation'
                ? []
                : field === 'extra-operation'
                  ? [...plan.operations, { kind: 'marker', value: 'forged' }]
                  : [forged as unknown as DerivedOperation],
          };
        },
      },
    },
  };
  const state = transferenceGame(rules),
    before = encodeSnapshot(state, rules.effectRegistry);
  const result = resolveCommand(state, input(), rules);
  expect(result.ok).toBe(false);
  expect(result.events).toEqual([]);
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
});

it.each(['late', 'budget', 'final'] as const)(
  'rolls back sets/AP/slots/RNG/IDs/history/events on %s failure',
  (scenario) => {
    const base = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
    const rules: RulesetBundle = {
      ...base,
      handlers: [
        {
          id: 'test-only.fault',
          order: 1,
          react: (e) =>
            scenario === 'late' && e.kind === 'transference_committed'
              ? [
                  {
                    kind: 'random',
                    side: 'actor',
                    namespace: 'test-only.random',
                    pool: ['a', 'b'],
                  },
                  { kind: 'fail', code: 'LATE_FAILURE' },
                ]
              : [],
        },
      ],
    };
    const state = transferenceGame(rules),
      before = structuredClone(state);
    const result = resolveCommand(
      state,
      input(),
      rules,
      scenario === 'budget'
        ? { operationBudget: 1 }
        : scenario === 'final'
          ? {
              validate: () => {
                throw Error('FINAL_FAILURE');
              },
            }
          : {},
    );
    expect(result).toEqual({
      ok: false,
      code:
        scenario === 'late'
          ? 'LATE_FAILURE'
          : scenario === 'budget'
            ? 'RESOLUTION_LIMIT'
            : 'FINAL_FAILURE',
      events: [],
    });
    expect(state).toEqual(before);
  },
);

it('immutable candidate and original records survive real snapshot continuation and exact replay', () => {
  const rules = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
  const state = transferenceGame(rules),
    copy = structuredClone(state);
  const restored = cloneSnapshot(state, rules);
  const first = resolveCommand(state, input(), rules),
    second = resolveCommand(restored, input(), rules);
  expect(first).toEqual(second);
  expect(state).toEqual(copy);
  expect(Object.isFrozen(restored)).toBe(true);
  const recorded = recordReplay(state, [input()], rules);
  expect(recorded.ok).toBe(true);
  if (!recorded.ok) throw Error(recorded.code);
  const replay = executeReplay(recorded.archive, rules);
  expect(replay.ok).toBe(true);
  if (!replay.ok || !first.ok) throw Error('FIXTURE');
  expect(replay.state).toEqual(first.state);
  expect(replay.events).toEqual(first.events);
  expect(fullStateHash(replay.state, rules.effectRegistry)).toEqual(
    fullStateHash(first.state, rules.effectRegistry),
  );
  expect(() =>
    decodeSnapshot(encodeSnapshot(state, rules.effectRegistry), {
      ...rules,
      engineVersion: '0.6.0',
    }),
  ).toThrow('ENGINE_MISMATCH');
});

it('semantic repetition ignores coherent match/piece/allocation renaming and retains changed bearer/source/duration', () => {
  const rules = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
  const a = transferenceGame(rules);
  const b = transferenceGame(
    rules,
    [attachment('shield', 'renamed-ally')],
    4,
    [
      unit('renamed-ally', 'rook', 'A4'),
      unit('renamed-enemy', 'rook', 'O12', 'black'),
      unit('king-one', 'king', 'H1'),
      unit('king-two', 'king', 'H15', 'black'),
    ],
    'renamed-match',
  );
  expect(repetitionKey(a, rules.repetition)).toBe(repetitionKey(b, rules.repetition));
  const swapped = run(a, rules, transfer()).state;
  expect(repetitionKey(a, rules.repetition)).not.toBe(repetitionKey(swapped, rules.repetition));
  const otherSource = transferenceGame(rules, [attachment('shield', 'ally', 'black')]);
  expect(repetitionKey(a, rules.repetition)).not.toBe(repetitionKey(otherSource, rules.repetition));
});

it('factory/match instances and selected colors share no mutable registry/state', () => {
  const a = variants.createTransferenceExperimentalRuleset({ white: true, black: false }),
    b = variants.createTransferenceExperimentalRuleset({ white: false, black: true });
  expect(a.effectRegistry).not.toBe(b.effectRegistry);
  const initial = transferenceGame(a),
    independent = transferenceGame(a);
  run(initial, a, transfer());
  expect(independent).toEqual(initial);
  expect(b.playerProfiles).toEqual({
    white: null,
    black: variants.TRANSFERENCE_EXPERIMENTAL_PROFILE,
  });
});

const historical = [
  [variants.createHolyShieldExperimentalRuleset, old.archives['guardian.holy_shield']],
  [variants.createLiveChargeExperimentalRuleset, old.archives['dynamite.live_charge']],
  [variants.createJudgmentChainsExperimentalRuleset, old.archives['nephalem.judgment_chains']],
  [variants.createHolySealExperimentalRuleset, old.archives['angel.holy_seal']],
  [variants.createShockwaveExperimentalRuleset, shock.archive],
  [variants.createSanctuaryExperimentalRuleset, sanctuary.archive],
] as const;
it.each(historical)(
  'retains old V1/V2 replay events/hashes and rejects the new intent %#',
  (factory, archive) => {
    const rules = factory({ white: true, black: false });
    let state = decodeSnapshot(archive.initialSnapshot, rules);
    expect(resolveCommand(state, input(), rules)).toEqual({
      ok: false,
      code: 'INVALID_COMMAND',
      events: [],
    });
    for (const step of archive.steps) {
      const result = resolveCommand(state, step.input, rules);
      expect(result.ok).toBe(true);
      if (!result.ok) throw Error(result.code);
      expect(result.events).toEqual(step.events);
      expect(fullStateHash(result.state, rules.effectRegistry).digest).toBe(step.stateHash);
      state = result.state;
    }
    const replay = executeReplay(archive, rules);
    expect(replay.ok).toBe(true);
    if (!replay.ok) throw Error(replay.code);
    expect(replay.state).toEqual(state);
    expect(replay.events).toEqual(archive.steps.flatMap<unknown>((s) => s.events));
  },
);
