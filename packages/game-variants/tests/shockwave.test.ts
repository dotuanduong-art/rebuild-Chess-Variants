import { expect, it } from 'vitest';
import {
  createShockwaveExperimentalRuleset,
  createHolyShieldExperimentalRuleset,
  createLiveChargeExperimentalRuleset,
  createJudgmentChainsExperimentalRuleset,
  createHolySealExperimentalRuleset,
} from '../src/index.js';
import {
  coordinateFromAlgebraic,
  resolveCommand,
  encodeSnapshot,
  decodeSnapshot,
  cloneSnapshot,
  createBoard,
} from '@variant-chess/game-core';
import { game, unit, run, finish } from './holy-shield.fixture.js';
import { shockwaveCast, shockwaveGame } from './shockwave.fixture.js';
import { input, reject } from './stun-producers.fixture.js';

const cast = {
  kind: 'skill',
  skillId: 'dragon_sentinel.shockwave',
  intent: { kind: 'piece-target-v1', pieceId: 'center' },
} as const;

it('casts real Shockwave for fixed4 via authoritative root and preserves the mandatory main move', () => {
  const rules = createShockwaveExperimentalRuleset({ white: true, black: false });
  const state = game(rules, 4, [
    unit('center', 'rook', 'H8'),
    unit('enemy', 'rook', 'I8', 'black'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ]);
  const result = run(state, rules, cast as never);
  expect(result.state.ap.white).toBe(0);
  expect(result.state.turn).toMatchObject({
    sideToAct: 'white',
    mainMoveUsed: false,
    skillUsed: true,
  });
  expect(result.state.board.pieces.enemy!.position).toEqual(coordinateFromAlgebraic('J8'));
  expect(result.state.board.pieces.center).toEqual(state.board.pieces.center);
  expect(result.events.map((e) => e.kind)).toEqual([
    'skill_used',
    'ap_changed',
    'pieces_repositioned',
  ]);
  expect(result.events[2]!.payload).toEqual({
    centerPieceId: 'center',
    cause: {
      kind: 'shockwave-v1',
      source: {
        sourcePlayer: 'white',
        sourceVariant: 'dragon_sentinel',
        sourceSkill: 'dragon_sentinel.shockwave',
        sourcePiece: null,
        sourceIncarnation: null,
      },
    },
    moves: [
      { pieceId: 'enemy', from: coordinateFromAlgebraic('I8'), to: coordinateFromAlgebraic('J8') },
    ],
  });
});

it.each(['white', 'black'] as const)(
  'authorizes selected %s with fixed4, exact source/profile and no board caster',
  (side) => {
    const rules = createShockwaveExperimentalRuleset({
      white: side === 'white',
      black: side === 'black',
    });
    let state = shockwaveGame(rules, 4, [
      unit('center', 'rook', 'H8', side, side === 'white' ? 'black' : 'white'),
      unit('enemy', 'rook', 'I8', side === 'white' ? 'black' : 'white', side),
      unit('wk', 'king', 'H1'),
      unit('bk', 'king', 'H15', 'black'),
    ]);
    if (side === 'black') state = finish(state, rules);
    const result = run(state, rules, shockwaveCast());
    expect(result.state.ap[side]).toBe(0);
    expect(
      result.events.filter((e) => e.kind === 'pieces_repositioned')[0]!.payload.cause.source,
    ).toEqual({
      sourcePlayer: side,
      sourceVariant: 'dragon_sentinel',
      sourceSkill: 'dragon_sentinel.shockwave',
      sourcePiece: null,
      sourceIncarnation: null,
    });
    expect(result.state.playerProfiles[side]).toEqual({
      id: 'dragon-sentinel.shockwave-only.experimental',
      version: '1.0.0',
    });
    reject(
      state,
      rules,
      input(shockwaveCast(), side === 'white' ? 'black' : 'white'),
      'WRONG_TURN',
    );
  },
);

it('rejects unselected players and all siblings/passives/cross-factory skill commands', () => {
  const disabled = createShockwaveExperimentalRuleset({ white: false, black: true });
  reject(shockwaveGame(disabled), disabled, input(shockwaveCast()), 'UNAUTHORIZED_VARIANT');
  const rules = createShockwaveExperimentalRuleset({ white: true, black: true });
  for (const skillId of [
    'dragon_sentinel.dragon_guard',
    'dragon_sentinel.subterranean_escape',
    'dragon_sentinel.escape',
    'dragon_sentinel.dragons_roar',
    'dragon_sentinel.roar',
    'guardian.holy_shield',
    'dynamite.live_charge',
    'nephalem.judgment_chains',
    'angel.holy_seal',
  ])
    reject(shockwaveGame(rules), rules, input({ ...shockwaveCast(), skillId }), 'NOT_AVAILABLE');
  for (const factory of [
    createHolyShieldExperimentalRuleset,
    createLiveChargeExperimentalRuleset,
    createJudgmentChainsExperimentalRuleset,
    createHolySealExperimentalRuleset,
  ]) {
    const other = factory({ white: true, black: true });
    reject(shockwaveGame(other), other, input(shockwaveCast()), 'NOT_AVAILABLE');
  }
  expect(Object.keys(rules.skills!)).toEqual(['dragon_sentinel.shockwave']);
  expect(rules.effectRegistry).toBeUndefined();
});

it.each([
  ['missing', 'PIECE_NOT_FOUND'],
  ['enemy', 'NOT_CONTROLLED'],
  ['wk', 'FORCED_REPOSITION_KING_INELIGIBLE'],
])('rejects invalid center %s', (center, code) => {
  const rules = createShockwaveExperimentalRuleset({ white: true, black: true });
  reject(shockwaveGame(rules), rules, input(shockwaveCast(center)), code);
});
it.each(['special', 'summoned', undefined] as const)('rejects center provenance %s', (origin) => {
  const rules = createShockwaveExperimentalRuleset({ white: true, black: true });
  const { origin: ignored, ...center } = unit('center', 'rook', 'H8');
  void ignored;
  const state = shockwaveGame(rules, 4, [
    origin ? { ...center, origin } : center,
    unit('enemy', 'rook', 'I8', 'black'),
  ]);
  reject(state, rules, input(shockwaveCast()), 'UNSUPPORTED_UNIT');
});

it.each([
  undefined,
  null,
  {},
  { kind: 'piece-target-v1', pieceId: ['center'] },
  { kind: 'piece-target-v1', pieceId: 'center', to: { file: 0, rankIndex: 0 } },
  { kind: 'cell-target-v1', pieceId: 'center' },
])('rejects malformed center intent %j', (intent) => {
  const rules = createShockwaveExperimentalRuleset({ white: true, black: true });
  reject(
    shockwaveGame(rules),
    rules,
    input({
      kind: 'skill',
      skillId: 'dragon_sentinel.shockwave',
      ...(intent === undefined ? {} : { intent }),
    }),
    intent === undefined ? 'INVALID_SKILL_INTENT' : 'INVALID_COMMAND',
  );
});

it.each([
  { cost: 0 },
  { ap: 100 },
  { sourcePlayer: 'black' },
  { sourcePiece: 'center' },
  { source: {} },
  { cause: {} },
  { moves: [] },
  { operations: [] },
  { direction: { dx: 1, dy: 0 } },
  { events: [] },
  { effectApplication: {} },
])('rejects forged client trust fields %j', (patch) => {
  const rules = createShockwaveExperimentalRuleset({ white: true, black: true });
  reject(shockwaveGame(rules), rules, input({ ...shockwaveCast(), ...patch }), 'INVALID_COMMAND');
});

it('rejects AP3 and second skill, preserves mandatory main and supports either action order', () => {
  const rules = createShockwaveExperimentalRuleset({ white: true, black: true });
  reject(shockwaveGame(rules, 3), rules, input(shockwaveCast()), 'INSUFFICIENT_AP');
  const initial = shockwaveGame(rules, 8);
  const first = run(initial, rules, shockwaveCast()).state;
  expect(first.ap).toEqual({ white: 4, black: 8 });
  reject(first, rules, input(shockwaveCast()), 'SKILL_USED');
  reject(first, rules, input({ kind: 'end' }), 'MAIN_MOVE_REQUIRED');
  expect(finish(first, rules).turn.sideToAct).toBe('black');
  const moved = run(initial, rules, {
    kind: 'move',
    pieceId: 'wk' as never,
    to: coordinateFromAlgebraic('I1'),
  }).state;
  const after = run(moved, rules, shockwaveCast()).state;
  expect(after.turn).toMatchObject({ sideToAct: 'black', mainMoveUsed: false, skillUsed: false });
  expect(after.board.pieces.enemy!.position).toEqual(coordinateFromAlgebraic('J8'));
  expect(after.ap).toEqual({ white: 4, black: 8 });
});

it.each(['none', 'all-blocked'] as const)(
  'rejects zero displacement %s atomically under the explicit owner answer',
  (mode) => {
    const rules = createShockwaveExperimentalRuleset({ white: true, black: true });
    const state = shockwaveGame(rules, 4, [
      unit('center', 'rook', 'H8'),
      unit('wk', 'king', 'H1'),
      ...(mode === 'all-blocked'
        ? [unit('enemy', 'rook', 'I8', 'black'), unit('obstacle', 'pawn', 'J8')]
        : []),
    ]);
    reject(state, rules, input(shockwaveCast()), 'NO_DISPLACEMENT');
    expect(state.ap.white).toBe(4);
    expect(state.turn.skillUsed).toBe(false);
  },
);

it('validates the center at current controller, independent of owner/original side', () => {
  const rules = createShockwaveExperimentalRuleset({ white: true, black: true });
  const initial = shockwaveGame(rules);
  const changed = {
    ...initial,
    board: createBoard(
      Object.values(initial.board.pieces).map((p) =>
        p.id === 'center' ? { ...p, controller: 'black' as const } : p,
      ),
    ) as typeof initial.board,
  };
  reject(changed, rules, input(shockwaveCast()), 'NOT_CONTROLLED');
});

it('freezes/copied selections, isolates matches and pins restore compatibility', () => {
  const selection = { white: true, black: false };
  const rules = createShockwaveExperimentalRuleset(selection);
  selection.white = false;
  expect(rules.playerProfiles?.white?.id).toBe('dragon-sentinel.shockwave-only.experimental');
  expect(rules.hash).toBe('experimental-dragon-sentinel-shockwave-v1-w1-b0');
  const state = run(shockwaveGame(rules), rules, shockwaveCast()).state;
  expect(shockwaveGame(rules).board.pieces.enemy!.position).toEqual(coordinateFromAlgebraic('I8'));
  expect(cloneSnapshot(state, rules)).toEqual(state);
  const encoded = encodeSnapshot(state);
  for (const patch of [
    { engineVersion: '0.5.0' },
    { schemaVersion: '1.0.0' },
    { rulesetVersion: '2.0.0' },
    { rulesetHash: 'experimental-old' },
    {
      playerProfiles: {
        white: { id: 'dragon-sentinel.shockwave-only.experimental', version: '2.0.0' },
        black: null,
      },
    },
  ])
    expect(() => decodeSnapshot(JSON.stringify({ ...state, ...patch }), rules)).toThrow();
  expect(() =>
    decodeSnapshot(encoded, createShockwaveExperimentalRuleset({ white: true, black: true })),
  ).toThrow('RULESET_MISMATCH');
  expect(() => Object.assign(rules.skills!, { sibling: {} })).toThrow();
  expect(() => Object.assign(rules.forcedReposition!, { sourceSkill: 'other' })).toThrow();
  for (const bad of [
    { white: true },
    { white: true, black: false, extra: true },
    { white: 'true', black: false },
  ])
    expect(() => createShockwaveExperimentalRuleset(bad as never)).toThrow(
      'INVALID_PROFILE_SELECTION',
    );
});

it('calls a pure planner on frozen input without AP/slot/state mutation', () => {
  const rules = createShockwaveExperimentalRuleset({ white: true, black: true });
  const state = shockwaveGame(rules);
  const skill = rules.skills!['dragon_sentinel.shockwave']!;
  if (!('plan' in skill)) throw Error('Expected planner');
  const before = encodeSnapshot(state);
  const command = Object.freeze(shockwaveCast());
  const plan = skill.plan(Object.freeze({ state, actor: 'white', command }));
  expect(plan.cost).toBe(4);
  expect(plan.operations).toHaveLength(1);
  expect(plan.operations[0]!.kind).toBe('forced_reposition');
  expect(encodeSnapshot(state)).toBe(before);
  expect(() => skill.plan({ state, actor: 'black', command })).toThrow('WRONG_TURN');
  expect(() =>
    skill.plan({ state, actor: 'white', command: { ...command, skillId: 'other' } }),
  ).toThrow('NOT_AVAILABLE');
  expect(() =>
    skill.plan({
      state: { ...state, playerProfiles: { white: null, black: null } },
      actor: 'white',
      command,
    }),
  ).toThrow('UNAUTHORIZED_VARIANT');
  expect(skill.plan({ state, actor: 'white', command })).toEqual(plan);
  expect(resolveCommand(state, input(shockwaveCast()), rules)).toEqual(
    resolveCommand(state, input(shockwaveCast()), rules),
  );
});
