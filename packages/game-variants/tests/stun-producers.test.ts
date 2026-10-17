import { describe, expect, it } from 'vitest';
import {
  createJudgmentChainsExperimentalRuleset,
  createHolySealExperimentalRuleset,
} from '../src/index.js';
import {
  resolveCommand,
  createBoard,
  createGame,
  encodeSnapshot,
  decodeSnapshot,
  cloneSnapshot,
} from '@variant-chess/game-core';
import { game, effects, unit, run, finish } from './holy-shield.fixture.js';
import { profiles, cast, input, reject } from './stun-producers.fixture.js';
import type { SkillPlan } from '@variant-chess/game-core';

// Oracle: owner B1 D-22.NEPHALEM.JUDGMENT_CHAINS.COST/DURATION/TARGETS.
it('casts real Judgment Chains through root for fixed5 AP without spending the main slot', () => {
  const rules = createJudgmentChainsExperimentalRuleset({ white: true, black: false });
  const result = resolveCommand(
    game(rules, 5),
    {
      authority: { kind: 'player', side: 'white' },
      command: {
        kind: 'skill',
        skillId: 'nephalem.judgment_chains',
        intent: { kind: 'piece-target-v1', pieceId: 'attacker' },
      },
    },
    rules,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  expect(result.state.ap.white).toBe(0);
  expect(result.state.turn).toMatchObject({ mainMoveUsed: false, skillUsed: true });
  expect(effects(result.state, rules)[0]).toMatchObject({
    definitionId: 'effect.stun',
    sourcePlayer: 'white',
    sourceVariant: 'nephalem',
    sourceSkill: 'nephalem.judgment_chains',
    sourcePiece: null,
    sourceIncarnation: null,
    target: { kind: 'piece', pieceId: 'attacker' },
    lifetime: { kind: 'rounds', rounds: 3, boundary: 'end' },
    deadline: { side: 'white', boundary: 'end', ordinal: 4 },
    payload: {},
  });
});

describe.each(profiles)('$name signed producer boundaries', (p) => {
  it.each(['white', 'black'] as const)(
    'authorizes selected %s with exact cost, source and N3',
    (side) => {
      const rules = p.factory({ white: side === 'white', black: side === 'black' });
      let state = game(rules, p.cost);
      if (side === 'black') state = finish(state, rules);
      const result = run(state, rules, cast(p.skill, side === 'white' ? 'attacker' : 'bearer'));
      expect(result.state.ap[side]).toBe(0);
      expect(result.state.turn).toMatchObject({
        sideToAct: side,
        skillUsed: true,
        mainMoveUsed: false,
      });
      expect(result.events.map((e) => e.kind)).toEqual([
        'skill_used',
        'ap_changed',
        'effect_applied',
      ]);
      expect(result.events[0]!.payload).toEqual({
        actor: side,
        skillId: p.skill,
        actualCost: p.cost,
      });
      expect(effects(result.state, rules)[0]).toMatchObject({
        sourcePlayer: side,
        sourceVariant: p.variant,
        sourceSkill: p.skill,
        sourcePiece: null,
        sourceIncarnation: null,
        payload: {},
        duration: { producerId: p.producer, producerVersion: '1.0.0', rounds: 3 },
        deadline: { side, boundary: 'end', ordinal: 4 },
      });
      reject(
        state,
        rules,
        input(cast(p.skill), side === 'white' ? 'black' : 'white'),
        'WRONG_TURN',
      );
    },
  );

  it('rejects unselected profiles and sibling/passive/cross-factory commands', () => {
    const disabled = p.factory({ white: false, black: true });
    reject(game(disabled), disabled, input(cast(p.skill)), 'UNAUTHORIZED_VARIANT');
    const rules = p.factory({ white: true, black: true });
    for (const skill of [
      'nephalem.fallen_grace',
      'nephalem.berserk_curse',
      'nephalem.divine_silence',
      'angel.heavenly_grace',
      'angel.blessing',
      'angel.divine_judgment',
      'guardian.holy_shield',
      'dynamite.live_charge',
      p.variant === 'angel' ? 'nephalem.judgment_chains' : 'angel.holy_seal',
    ])
      reject(game(rules), rules, input(cast(skill)), 'NOT_AVAILABLE');
    expect(Object.keys(rules.skills!)).toEqual([p.skill]);
    expect(rules.effectRegistry!.definitions.map((d) => d.typeId)).toEqual(['effect.stun']);
  });

  it.each(['pawn', 'knight', 'bishop', 'rook', 'queen'] as const)(
    'accepts enemy-controlled ordinary %s independently of owner and geometric blockers',
    (type) => {
      const rules = p.factory({ white: true, black: false });
      const state = game(rules, p.cost, [
        unit('attacker', type, 'O15', 'black', 'white'),
        unit('blocker', 'queen', 'H8'),
        unit('wk', 'king', 'A1'),
        unit('bk', 'king', 'H15', 'black'),
      ]);
      expect(effects(run(state, rules, cast(p.skill)).state, rules)).toHaveLength(1);
    },
  );
  it.each(['special', 'summoned', undefined] as const)('rejects provenance %s', (origin) => {
    const rules = p.factory({ white: true, black: false });
    const { origin: ignored, ...piece } = unit('attacker', 'queen', 'O15', 'black');
    void ignored;
    const state = game(rules, p.cost, [origin ? { ...piece, origin } : piece]);
    reject(state, rules, input(cast(p.skill)), 'UNSUPPORTED_UNIT');
  });
  it.each([
    ['missing', 'PIECE_NOT_FOUND'],
    ['bearer', 'NOT_ENEMY_CONTROLLED'],
    ['bk', 'EFFECT_KING_INELIGIBLE'],
  ])('rejects target %s atomically', (target, code) => {
    const rules = p.factory({ white: true, black: true });
    reject(game(rules), rules, input(cast(p.skill, target)), code);
  });
  it('checks current controller before each cast, independently of original side/owner', () => {
    const rules = p.factory({ white: true, black: true });
    const initial = game(rules);
    const changed = {
      ...initial,
      board: createBoard(
        Object.values(initial.board.pieces).map((piece) =>
          piece.id === 'attacker' ? { ...piece, controller: 'white' as const } : piece,
        ),
      ) as typeof initial.board,
    };
    reject(changed, rules, input(cast(p.skill)), 'NOT_ENEMY_CONTROLLED');
  });

  it('enforces AP threshold, one slot, mandatory main, and both action orders', () => {
    const rules = p.factory({ white: true, black: true });
    reject(game(rules, p.cost - 1), rules, input(cast(p.skill)), 'INSUFFICIENT_AP');
    const initial = game(rules, p.cost * 2);
    const first = run(initial, rules, cast(p.skill)).state;
    reject(first, rules, input(cast(p.skill)), 'SKILL_USED');
    reject(first, rules, input({ kind: 'end' }), 'MAIN_MOVE_REQUIRED');
    expect(finish(first, rules).turn.sideToAct).toBe('black');
    const moved = run(initial, rules, {
      kind: 'move',
      pieceId: 'wk' as never,
      to: { file: 8, rankIndex: 0 },
    }).state;
    const last = run(moved, rules, cast(p.skill)).state;
    expect(last.turn).toMatchObject({ sideToAct: 'black', mainMoveUsed: false, skillUsed: false });
    expect(last.ap.white).toBe(p.cost);
    expect(effects(last, rules)).toHaveLength(1);
  });
  it.each([
    undefined,
    { kind: 'piece-target-v1', pieceId: ['attacker'] },
    { kind: 'piece-target-v1', pieceId: 'attacker', sourcePlayer: 'black' },
    { kind: 'piece-target-v2', pieceId: 'attacker' },
    {},
    null,
  ])('rejects malformed/missing intent %j', (intent) => {
    const rules = p.factory({ white: true, black: false });
    reject(
      game(rules),
      rules,
      input({ kind: 'skill', skillId: p.skill, ...(intent === undefined ? {} : { intent }) }),
      intent === undefined ? 'INVALID_SKILL_INTENT' : 'INVALID_COMMAND',
    );
  });
  it.each([
    { sourcePlayer: 'black' },
    { sourceVariant: 'other' },
    { sourcePiece: 'wk' },
    { sourceIncarnation: '1' },
    { cost: 0 },
    { actualCost: 0 },
    { ap: 100 },
    { duration: { rounds: 30 } },
    { payload: {} },
    { operations: [] },
    { effectApplication: {} },
  ])('rejects forged client fields %j', (patch) => {
    const rules = p.factory({ white: true, black: false });
    reject(game(rules), rules, input({ ...cast(p.skill), ...patch }), 'INVALID_COMMAND');
  });
  it('provides a pure frozen-context planner; root retains debit and all mutation', () => {
    const rules = p.factory({ white: true, black: false });
    const state = game(rules, p.cost);
    const skill = rules.skills![p.skill]!;
    if (!('plan' in skill)) throw new Error('Expected authoritative planner');
    const before = encodeSnapshot(state, rules.effectRegistry);
    expect(Object.isFrozen(state)).toBe(true);
    const plan = skill.plan(
      Object.freeze({ state, actor: 'white', command: Object.freeze(cast(p.skill)) }),
    );
    expect(plan).toMatchObject({ cost: p.cost, operations: [{ kind: 'effect_apply' }] });
    expect(plan.operations).toHaveLength(1);
    expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
    expect(skill.plan({ state, actor: 'white', command: cast(p.skill) })).toEqual(plan);
    for (const [context, code] of [
      [{ state, actor: 'black', command: cast(p.skill) }, 'WRONG_TURN'],
      [{ state, actor: 'white', command: cast('sibling') }, 'NOT_AVAILABLE'],
      [
        {
          state: { ...state, playerProfiles: { white: null, black: null } },
          actor: 'white',
          command: cast(p.skill),
        },
        'UNAUTHORIZED_VARIANT',
      ],
    ] as const)
      expect(() => skill.plan(context)).toThrow(code);
    const repeated: SkillPlan = skill.plan({ state, actor: 'white', command: cast(p.skill) });
    expect(repeated.operations[0]).toMatchObject({
      sourcePlayer: 'white',
      duration: { rounds: 3 },
    });
  });
  it('copies/freezes configuration, isolates matches and rejects incompatible snapshots', () => {
    const selection = { white: true, black: false };
    const rules = p.factory(selection);
    selection.white = false;
    expect(rules.playerProfiles?.white?.id).toBe(p.profile);
    const initial = createGame({ matchId: 'normal', seed: 19 }, rules);
    expect(initial.ap).toEqual({ white: 0, black: 0 });
    expect(initial.effects).toEqual([]);
    const state = run(game(rules), rules, cast(p.skill)).state;
    expect(game(rules).effects).toEqual([]);
    expect(Object.isFrozen(effects(state, rules)[0]!.payload)).toBe(true);
    expect(() => Object.assign(rules.skills!, { sibling: {} })).toThrow();
    expect(p.factory({ white: true, black: false }).effectRegistry).not.toBe(rules.effectRegistry);
    for (const bad of [
      { white: true },
      { white: true, black: false, extra: true },
      { white: 'true', black: false },
    ])
      expect(() => p.factory(bad as never)).toThrow('INVALID_PROFILE_SELECTION');
    const encoded = encodeSnapshot(state, rules.effectRegistry);
    expect(cloneSnapshot(state, rules)).toEqual(state);
    expect(decodeSnapshot(encoded, rules)).toEqual(state);
    for (const patch of [
      { engineVersion: '0.5.0' },
      { schemaVersion: '1.0.0' },
      { rulesetVersion: '2.0.0' },
      { rulesetHash: 'old-stun-experimental' },
      { playerProfiles: { white: { id: p.profile, version: '2.0.0' }, black: null } },
    ])
      expect(() => decodeSnapshot(JSON.stringify({ ...state, ...patch }), rules)).toThrow();
    expect(() => decodeSnapshot(encoded, p.factory({ white: true, black: true }))).toThrow(
      'RULESET_MISMATCH',
    );
    expect(state.engineVersion).toBe('0.6.0');
    expect(state.schemaVersion).toBe('1.1.0');
  });
});

it('casts real Holy Seal through root for fixed6 AP and exact Angel source', () => {
  const rules = createHolySealExperimentalRuleset({ white: true, black: false });
  const result = resolveCommand(
    game(rules, 6),
    {
      authority: { kind: 'player', side: 'white' },
      command: {
        kind: 'skill',
        skillId: 'angel.holy_seal',
        intent: { kind: 'piece-target-v1', pieceId: 'attacker' },
      },
    },
    rules,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  expect(result.state.ap.white).toBe(0);
  expect(result.state.turn).toMatchObject({ mainMoveUsed: false, skillUsed: true });
  expect(effects(result.state, rules)[0]).toMatchObject({
    definitionId: 'effect.stun',
    sourcePlayer: 'white',
    sourceVariant: 'angel',
    sourceSkill: 'angel.holy_seal',
    sourcePiece: null,
    sourceIncarnation: null,
    lifetime: { kind: 'rounds', rounds: 3, boundary: 'end' },
    deadline: { side: 'white', boundary: 'end', ordinal: 4 },
    payload: {},
  });
});
