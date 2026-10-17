import { expect, it } from 'vitest';
import * as variants from '../src/index.js';
import {
  decodeEffectRecords,
  resolveCommand,
  coordinateFromAlgebraic as at,
  encodeSnapshot,
  canonicalEncode,
  fingerprint,
} from '@variant-chess/game-core';
import {
  transferenceGame,
  transfer,
  attachment,
  unit,
  run,
  finish,
} from './transference.fixture.js';
import type { RulesetBundle } from '@variant-chess/game-core';

it('fails closed on a fabricated mixed producer in the C1 runtime', () => {
  const base = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
  const rules: RulesetBundle = {
    ...base,
    skills: { ...base.skills, 'fake.skill': { cost: 0, operations: [] } },
  };
  const state = transferenceGame(rules);
  const result = resolveCommand(
    state,
    {
      authority: { kind: 'player', side: 'white' },
      command: { kind: 'skill', skillId: 'fake.skill' },
    },
    rules,
  );
  expect(result).toEqual({ ok: false, code: 'INVALID_TRANSFERENCE_RULESET', events: [] });
});

it.each([
  ['same', transfer('ally', 'ally'), 'INVALID_TRANSFERENCE_TARGETS'],
  ['two-own', transfer('ally', 'wk'), 'INVALID_TRANSFERENCE_TARGETS'],
  ['two-enemy', transfer('enemy', 'bk'), 'INVALID_TRANSFERENCE_TARGETS'],
  ['allied-King', transfer('wk', 'enemy'), 'TRANSFERENCE_KING_INELIGIBLE'],
  ['enemy-King', transfer('ally', 'bk'), 'TRANSFERENCE_KING_INELIGIBLE'],
  ['dead-ally', transfer('retired', 'enemy'), 'PIECE_NOT_FOUND'],
  ['dead-enemy', transfer('ally', 'retired'), 'PIECE_NOT_FOUND'],
] as const)('rejects %s without any state or fact change', (_, command, code) => {
  const rules = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
  const state = transferenceGame(rules),
    before = encodeSnapshot(state, rules.effectRegistry);
  expect(
    resolveCommand(state, { authority: { kind: 'player', side: 'white' }, command }, rules),
  ).toEqual({ ok: false, code, events: [] });
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
});

it.each(['effectIds', 'payload', 'source', 'operations', 'cost', 'deadline', 'trigger', 'caster'])(
  'strict two-piece intent rejects forged %s',
  (field) => {
    const rules = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
    const state = transferenceGame(rules),
      command = transfer();
    if (command.kind !== 'skill') throw Error('FIXTURE');
    expect(
      resolveCommand(
        state,
        {
          authority: { kind: 'player', side: 'white' },
          command: { ...command, intent: { ...command.intent, [field]: 'forged' } },
        },
        rules,
      ),
    ).toEqual({ ok: false, code: 'INVALID_COMMAND', events: [] });
  },
);

it.each([
  undefined,
  {},
  { kind: 'two-piece-target-v1', alliedPieceId: 'ally' },
  { kind: 'piece-target-v1', pieceId: 'ally' },
  { kind: 'cell-target-v1', cell: at('A1') },
])('rejects wrong/malformed intent %#', (intent) => {
  const rules = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
  const result = resolveCommand(
    transferenceGame(rules),
    {
      authority: { kind: 'player', side: 'white' },
      command: { kind: 'skill', skillId: 'turtle.transference', intent },
    },
    rules,
  );
  expect(result.ok).toBe(false);
  expect(result.events).toEqual([]);
});

it.each([0, 3])('rejects insufficient AP%s and preserves the source sets', (ap) => {
  const rules = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
  const state = transferenceGame(rules, undefined, ap);
  expect(
    resolveCommand(
      state,
      { authority: { kind: 'player', side: 'white' }, command: transfer() },
      rules,
    ),
  ).toEqual({ ok: false, code: 'INSUFFICIENT_AP', events: [] });
});

it('rejects both empty sets before debit but permits either orientation of a single empty set', () => {
  const rules = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
  expect(
    resolveCommand(
      transferenceGame(rules, []),
      { authority: { kind: 'player', side: 'white' }, command: transfer() },
      rules,
    ),
  ).toEqual({ ok: false, code: 'EMPTY_EFFECT_SETS', events: [] });
  for (const target of ['ally', 'enemy']) {
    const state = transferenceGame(rules, [attachment('shield', target)]);
    const result = run(state, rules, transfer());
    expect(result.state.effects).toHaveLength(1);
    expect(
      decodeEffectRecords(result.state.effects, rules.effectRegistry!, result.state)[0]!.target,
    ).toEqual({ kind: 'piece', pieceId: target === 'ally' ? 'enemy' : 'ally' });
  }
});

it.each(['white', 'black'] as const)(
  'authorizes selected %s independently and keeps one normal skill slot',
  (side) => {
    const rules = variants.createTransferenceExperimentalRuleset({
      white: side === 'white',
      black: side === 'black',
    });
    let state = transferenceGame(rules);
    if (side === 'black') state = finish(state, rules);
    const command = side === 'white' ? transfer() : transfer('enemy', 'ally');
    const result = run(state, rules, command);
    expect(result.state.ap[side]).toBe(0);
    expect(result.state.turn.skillUsed).toBe(true);
    expect(
      resolveCommand(
        result.state,
        { authority: { kind: 'player', side }, command: { kind: 'end' } },
        rules,
      ).ok,
    ).toBe(false);
    expect(
      resolveCommand(result.state, { authority: { kind: 'player', side }, command }, rules).ok,
    ).toBe(false);
  },
);

it('rejects unselected/wrong actor and preserves far unobstructed or obstructed targeting', () => {
  const rules = variants.createTransferenceExperimentalRuleset({ white: false, black: true });
  const state = transferenceGame(rules);
  expect(
    resolveCommand(
      state,
      { authority: { kind: 'player', side: 'white' }, command: transfer() },
      rules,
    ),
  ).toEqual({ ok: false, code: 'UNAUTHORIZED_VARIANT', events: [] });
  expect(
    resolveCommand(
      state,
      { authority: { kind: 'player', side: 'black' }, command: transfer('enemy', 'ally') },
      rules,
    ),
  ).toEqual({ ok: false, code: 'WRONG_TURN', events: [] });
});

it('uses current controller despite opposite ownership and works after the normal main move', () => {
  const rules = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
  const state = transferenceGame(rules, undefined, 4, [
    unit('ally', 'rook', 'A4', 'white', 'black'),
    unit('enemy', 'rook', 'O12', 'black', 'white'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
    unit('obstacle', 'pawn', 'H8'),
  ]);
  const moved = run(state, rules, { kind: 'move', pieceId: 'wk' as never, to: at('I1') }).state;
  const result = run(moved, rules, transfer());
  expect(result.state.turn.sideToAct).toBe('black');
  expect(result.state.ap.white).toBe(0);
});

it('pins V1/V2/V3 literally and exposes no sibling/cost override/default selection', () => {
  expect(fingerprint(canonicalEncode(variants.SKILL_AP_COSTS_V1))).toBe('2a56da8ff953d29b');
  expect(fingerprint(canonicalEncode(variants.SKILL_AP_COSTS_V2))).toBe('e268dfc077cf52ff');
  expect(fingerprint(canonicalEncode(variants.SKILL_AP_COSTS_V3))).toBe('5791f7f2c9a23105');
  const rules = variants.createTransferenceExperimentalRuleset({ white: true, black: false });
  expect(Object.keys(rules.skills!)).toEqual(['turtle.transference']);
  expect(Object.isFrozen(rules)).toBe(true);
  expect(Object.isFrozen(rules.skills)).toBe(true);
  expect(() =>
    variants.createTransferenceExperimentalRuleset({ white: true, black: false, cost: 0 } as never),
  ).toThrow('INVALID_PROFILE_SELECTION');
});

it('retains historical costs and exposes a frozen V3 with only Transference4 added', () => {
  expect('SKILL_AP_COSTS_V3' in variants).toBe(true);
  const costs = Reflect.get(variants, 'SKILL_AP_COSTS_V3');
  expect(costs).toEqual({
    'guardian.holy_shield': 4,
    'dynamite.live_charge': 3,
    'nephalem.judgment_chains': 5,
    'angel.holy_seal': 6,
    'dragon_sentinel.shockwave': 4,
    'guardian.sanctuary': 5,
    'turtle.transference': 4,
  });
  expect(Object.isFrozen(costs)).toBe(true);
});

it('rejects a duplicated concrete swap ticket and rolls back the first swap and debit', () => {
  const base = variants.createTransferenceExperimentalRuleset({ white: true, black: true });
  const command = transfer();
  const rules: RulesetBundle = {
    ...base,
    handlers: [
      {
        id: 'test-only.duplicate',
        order: 1,
        react: (event) =>
          event.kind === 'transference_committed'
            ? [
                {
                  kind: 'transference_swap',
                  schemaVersion: '1.0.0',
                  source: event.payload.source,
                  pieceA: event.payload.pieceA,
                  pieceB: event.payload.pieceB,
                },
              ]
            : [],
      },
    ],
  };
  const state = transferenceGame(rules);
  const before = structuredClone(state);
  const result = resolveCommand(
    state,
    { authority: { kind: 'player', side: 'white' }, command },
    rules,
  );
  expect(result).toEqual({ ok: false, code: 'TRANSFERENCE_SWAP_LIMIT', events: [] });
  expect(state).toEqual(before);
});

it('selected Turtle casts a real whole-set transfer for4 without replacing the mandatory main move', () => {
  const rules = variants.createTransferenceExperimentalRuleset({ white: true, black: false });
  const state = transferenceGame(rules);
  const result = resolveCommand(
    state,
    { authority: { kind: 'player', side: 'white' }, command: transfer() },
    rules,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error(result.code);
  expect(result.state.ap.white).toBe(0);
  expect(result.state.turn).toMatchObject({
    skillUsed: true,
    mainMoveUsed: false,
    sideToAct: 'white',
  });
  expect(
    decodeEffectRecords(result.state.effects, rules.effectRegistry!, result.state)[0]!.target,
  ).toEqual({ kind: 'piece', pieceId: 'enemy' });
  expect(result.events.map((e) => e.kind)).toEqual([
    'skill_used',
    'ap_changed',
    'effect_relocated',
    'effect_sets_swapped',
    'transference_committed',
  ]);
});
