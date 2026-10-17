import { expect, it } from 'vitest';
import {
  resolveCommand,
  encodeSnapshot,
  decodeSnapshot,
  cloneSnapshot,
  repetitionKey,
  fullStateHash,
  recordReplay,
  executeReplay,
  createBoard,
  coordinateFromAlgebraic as at,
  querySanctuaryRegions,
  BASE_RULESET_ID,
} from '@variant-chess/game-core';
import type { RulesetBundle, DerivedOperation } from '@variant-chess/game-core';
import type { GameState, RootCommand } from '@variant-chess/shared-types';
import { createSanctuaryExperimentalRuleset } from '../src/index.js';
import { sanctuaryGame, sanctuaryCast, run, finishSanctuaryTurn } from './sanctuary.fixture.js';

const input = (command: RootCommand, side = 'white') => ({
  authority: { kind: 'player', side },
  command,
});
const capture = { kind: 'move' as const, pieceId: 'attacker' as never, to: at('H8') };

it('retained engine0.6 keeps its original opaque variant namespace without interpreting it as a B3 region', () => {
  const rules: RulesetBundle = {
    ...BASE_RULESET_ID,
    repetition: (s) => ({ effects: [], delayedActions: [], variantState: s.variantState }),
    skills: {
      'test-only.historical-opaque': {
        cost: 0,
        operations: [
          {
            kind: 'variant',
            side: 'actor',
            namespace: 'guardian.sanctuary',
            value: { historical: 'opaque-json' },
          },
        ],
      },
    },
  };
  const initial = sanctuaryGame(rules);
  const command = { kind: 'skill' as const, skillId: 'test-only.historical-opaque' };
  const result = resolveCommand(initial, input(command), rules);
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error(result.code);
  expect(result.events.map((e) => e.kind)).toEqual(['skill_used', 'variant_state_changed']);
  expect(result.state.variantState.white['guardian.sanctuary']).toEqual({
    historical: 'opaque-json',
  });
  expect(querySanctuaryRegions(result.state)).toEqual([]);
  expect(cloneSnapshot(result.state, rules)).toEqual(result.state);
  const recorded = recordReplay(initial, [input(command)], rules);
  expect(recorded.ok).toBe(true);
  if (!recorded.ok) throw Error(recorded.code);
  expect(executeReplay(recorded.archive, rules).ok).toBe(true);
});

it.each(['source', 'duration', 'regionId', 'visibility'])(
  'root rejects forged derived Sanctuary %s and rolls back cost/slot/IDs',
  (field) => {
    const base = createSanctuaryExperimentalRuleset({ white: true, black: true });
    const skill = base.skills!['guardian.sanctuary']!;
    if (!('plan' in skill)) throw Error('FIXTURE');
    const rules: RulesetBundle = {
      ...base,
      skills: {
        'guardian.sanctuary': {
          ...skill,
          plan: (c) => {
            const plan = skill.plan(c);
            return {
              ...plan,
              operations: [{ ...plan.operations[0]!, [field]: 'forged' } as DerivedOperation],
            };
          },
        },
      },
    };
    const state = sanctuaryGame(rules),
      before = encodeSnapshot(state, rules.effectRegistry);
    const result = resolveCommand(state, input(sanctuaryCast()), rules);
    expect(result.ok).toBe(false);
    if (result.ok) throw Error('UNEXPECTED_SUCCESS');
    expect(result.code).toBe('INVALID_SANCTUARY_OPERATION');
    expect(result.events).toEqual([]);
    expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
  },
);

it.each(['wrong-center', 'reserved-namespace', 'forged-reaction'] as const)(
  'fails closed on trusted plugin %s mutations',
  (scenario) => {
    const base = createSanctuaryExperimentalRuleset({ white: true, black: true });
    const operations: readonly DerivedOperation[] =
      scenario === 'wrong-center'
        ? [{ kind: 'sanctuary_cast', schemaVersion: '1.0.0', center: at('A1') }]
        : scenario === 'reserved-namespace'
          ? [{ kind: 'variant', side: 'actor', namespace: 'guardian.sanctuary', value: {} }]
          : [{ kind: 'sanctuary_reaction', capture: {} } as never];
    const rules: RulesetBundle = {
      ...base,
      skills: { ...base.skills, 'test-only.forge': { cost: 0, operations } },
    };
    const state = sanctuaryGame(rules);
    const result = resolveCommand(
      state,
      input({ kind: 'skill', skillId: 'test-only.forge' }),
      rules,
    );
    expect(result.ok).toBe(false);
    expect(result.events).toEqual([]);
    expect(querySanctuaryRegions(state)).toEqual([]);
    expect(state.ap.white).toBe(20);
  },
);

it('late queue failure after generated Stun/RNG and final-validator/budget failures roll back the complete capture root', () => {
  const base = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const rules: RulesetBundle = {
    ...base,
    handlers: [
      {
        id: 'test-only-late-rng',
        order: 1,
        react: (e) =>
          e.kind === 'sanctuary_reacted'
            ? [{ kind: 'random', side: 'actor', namespace: 'test-only-noise', pool: ['a', 'b'] }]
            : [],
      },
    ],
  };
  const state = finishSanctuaryTurn(run(sanctuaryGame(rules), rules, sanctuaryCast()).state, rules);
  const before = encodeSnapshot(state, rules.effectRegistry);
  for (const options of [
    { operationBudget: 1 },
    { operationBudget: 2 },
    {
      validate: () => {
        throw Error('AFTER_CAPTURE_STUN_RNG_HISTORY');
      },
    },
  ]) {
    const result = resolveCommand(state, input(capture, 'black'), rules, options);
    expect(result.ok).toBe(false);
    expect(result.events).toEqual([]);
    expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
  }
  const failing: RulesetBundle = {
    ...rules,
    handlers: [
      ...rules.handlers!,
      {
        id: 'test-only-late-fail',
        order: 2,
        react: (e) => (e.kind === 'random_chosen' ? [{ kind: 'fail', code: 'AFTER_RNG' }] : []),
      },
    ],
  };
  expect(resolveCommand(state, input(capture, 'black'), failing)).toEqual({
    ok: false,
    code: 'AFTER_RNG',
    events: [],
  });
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
  const retry = resolveCommand(state, input(capture, 'black'), rules);
  expect(retry).toEqual(
    resolveCommand(decodeSnapshot(before, rules), input(capture, 'black'), rules),
  );
  expect(retry.ok).toBe(true);
  if (!retry.ok) throw Error(retry.code);
  expect(retry.state.rng.cursor).toBe(1);
});

it('region replacement is atomic under a late failure and budget exhaustion', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = run(sanctuaryGame(rules), rules, sanctuaryCast()).state;
  state = finishSanctuaryTurn(finishSanctuaryTurn(state, rules), rules);
  const old = querySanctuaryRegions(state),
    before = encodeSnapshot(state, rules.effectRegistry);
  for (const options of [
    { operationBudget: 1 },
    {
      validate: () => {
        throw Error('AFTER_REPLACEMENT');
      },
    },
  ]) {
    const result = resolveCommand(state, input(sanctuaryCast('O15')), rules, options);
    expect(result.ok).toBe(false);
    expect(result.events).toEqual([]);
    expect(querySanctuaryRegions(state)).toEqual(old);
    expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
  }
});

it('candidate board/regions/context snapshots are immutable and independent through restore and real continuation', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const state = finishSanctuaryTurn(run(sanctuaryGame(rules), rules, sanctuaryCast()).state, rules);
  const snapshot = encodeSnapshot(state, rules.effectRegistry),
    restored = decodeSnapshot(snapshot, rules);
  expect(cloneSnapshot(state, rules)).toEqual(state);
  expect(restored).not.toBe(state);
  const a = run(state, rules, capture),
    b = run(restored, rules, capture);
  expect(a).toEqual(b);
  expect(a.state).not.toBe(b.state);
  const fact = a.events.find((e) => e.kind === 'sanctuary_reacted')!;
  expect(Object.isFrozen(fact.payload.capture)).toBe(true);
  expect(Object.isFrozen(fact.payload.capture.regions[0]!.source)).toBe(true);
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(snapshot);
  expect(fullStateHash(a.state, rules.effectRegistry)).toEqual(
    fullStateHash(b.state, rules.effectRegistry),
  );
});

it('coherent ID/allocation/enumeration renaming preserves active-region and generated-Stun semantic positions', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const original = sanctuaryGame(rules, 20, undefined, 'rename-a');
  const other = sanctuaryGame(
    rules,
    20,
    Object.values(original.board.pieces)
      .reverse()
      .map((p) => ({ ...p, id: `renamed-${p.id}` })),
    'rename-b',
  );
  const noisy: GameState = { ...other, counters: { ...other.counters, operation: 37 } };
  const a = run(original, rules, sanctuaryCast()).state,
    b = run(noisy, rules, sanctuaryCast()).state;
  expect(repetitionKey(a, rules.repetition)).toBe(repetitionKey(b, rules.repetition));
  const nextA = run(a, rules, { kind: 'move', pieceId: 'wk' as never, to: at('B1') }).state;
  const nextB = run(b, rules, { kind: 'move', pieceId: 'renamed-wk' as never, to: at('B1') }).state;
  const capturedA = run(nextA, rules, capture).state;
  const capturedB = run(nextB, rules, { ...capture, pieceId: 'renamed-attacker' as never }).state;
  expect(repetitionKey(capturedA, rules.repetition)).toBe(
    repetitionKey(capturedB, rules.repetition),
  );
  expect(fullStateHash(capturedA, rules.effectRegistry)).not.toEqual(
    fullStateHash(capturedB, rules.effectRegistry),
  );
});

it('semantic keys distinguish meaningful region center/source/remaining duration and generated Stun', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const initial = sanctuaryGame(rules);
  const a = run(initial, rules, sanctuaryCast()).state,
    b = run(initial, rules, sanctuaryCast('O15')).state;
  expect(repetitionKey(a, rules.repetition)).not.toBe(repetitionKey(b, rules.repetition));
  const copied = JSON.parse(encodeSnapshot(a, rules.effectRegistry));
  copied.variantState.white['guardian.sanctuary'].anchor.ordinal = 0; // rejected, never normalized as valid live record
  expect(() => decodeSnapshot(JSON.stringify(copied), rules)).toThrow();
  const black = finishSanctuaryTurn(a, rules);
  const stunned = run(black, rules, capture).state;
  const without = { ...stunned, effects: [] };
  expect(repetitionKey(stunned, rules.repetition)).not.toBe(
    repetitionKey(without, rules.repetition),
  );
  const region = querySanctuaryRegions(stunned)[0]!;
  const later: GameState = {
    ...stunned,
    variantState: {
      ...stunned.variantState,
      white: {
        'guardian.sanctuary': {
          ...region,
          anchor: { ...region.anchor, ordinal: 0 },
          deadline: { ...region.deadline, ordinal: 3 },
        },
      },
    },
  };
  expect(() => repetitionKey(later, rules.repetition)).toThrow();
});

it('valid same-center source and remaining-round differences survive semantic normalization', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = run(sanctuaryGame(rules), rules, sanctuaryCast()).state;
  state = finishSanctuaryTurn(finishSanctuaryTurn(state, rules), rules); // White2
  const reset = run(state, rules, sanctuaryCast()).state;
  expect(querySanctuaryRegions(state)[0]!.deadline.ordinal).toBe(4);
  expect(querySanctuaryRegions(reset)[0]!.deadline.ordinal).toBe(5);
  expect(repetitionKey(state, rules.repetition)).not.toBe(
    repetitionKey({ ...reset, ap: state.ap }, rules.repetition),
  );
  state = finishSanctuaryTurn(state, rules); // Black2, both source ordinals2
  const region = querySanctuaryRegions(state)[0]!;
  const opposite: GameState = {
    ...state,
    variantState: {
      white: {},
      black: {
        'guardian.sanctuary': {
          ...region,
          source: { ...region.source, sourcePlayer: 'black' },
          anchor: { ...region.anchor, side: 'black' },
          deadline: { ...region.deadline, side: 'black' },
        },
      },
    },
  };
  expect(querySanctuaryRegions(opposite)[0]!.source.sourcePlayer).toBe('black');
  expect(repetitionKey(state, rules.repetition)).not.toBe(
    repetitionKey(opposite, rules.repetition),
  );
});

it('exact replay preserves all region/capture/effect events and refuses mismatched engine/profile/record pins', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const initial = sanctuaryGame(rules);
  const recorded = recordReplay(
    initial,
    [
      input(sanctuaryCast()),
      input({ kind: 'move', pieceId: 'wk' as never, to: at('B1') }),
      input(capture, 'black'),
    ],
    rules,
  );
  expect(recorded.ok).toBe(true);
  if (!recorded.ok) throw Error(recorded.code);
  const replay = executeReplay(recorded.archive, rules);
  expect(replay.ok).toBe(true);
  if (!replay.ok) throw Error(replay.code);
  expect(replay.state).toEqual(recorded.state);
  const old = { ...rules, engineVersion: '0.6.0' as const };
  expect(executeReplay(recorded.archive, old).ok).toBe(false);
  const bad = structuredClone(recorded.archive);
  bad.initialConfig.engineVersion = '0.6.0';
  expect(executeReplay(bad, rules).ok).toBe(false);
  const encoded = encodeSnapshot(recorded.state, rules.effectRegistry);
  const raw = JSON.parse(encoded);
  raw.playerProfiles.white.version = '2.0.0';
  expect(() => decodeSnapshot(JSON.stringify(raw), rules)).toThrow();
  raw.playerProfiles.white.version = '1.0.0';
  raw.engineVersion = '0.6.0';
  expect(() => decodeSnapshot(JSON.stringify(raw), old)).toThrow();
  const permuted = {
    ...recorded.state,
    board: createBoard(Object.values(recorded.state.board.pieces).reverse()) as GameState['board'],
  };
  expect(encodeSnapshot(permuted, rules.effectRegistry)).toBe(encoded);
});
