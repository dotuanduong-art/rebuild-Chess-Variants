import { expect, it } from 'vitest';
import {
  resolveCommand,
  encodeSnapshot,
  createGame,
  decodeSnapshot,
  cloneSnapshot,
} from '@variant-chess/game-core';
import type { GameState, PlayerSide } from '@variant-chess/shared-types';
import type { RulesetBundle } from '@variant-chess/game-core';
import {
  createLiveChargeExperimentalRuleset,
  createHolyShieldExperimentalRuleset,
} from '../src/index.js';
import { game, unit, run, finish, effects } from './holy-shield.fixture.js';

// TRUSTED_TEST_ONLY: reduced ordinary board and seeded AP, never a production setup bonus.
const ruleset = () => createLiveChargeExperimentalRuleset({ white: true, black: true });
const cast = (pieceId = 'bearer', side: PlayerSide = 'white') => ({
  authority: { kind: 'player' as const, side },
  command: {
    kind: 'skill' as const,
    skillId: 'dynamite.live_charge',
    intent: { kind: 'piece-target-v1' as const, pieceId: pieceId as never },
  },
});
function reject(state: GameState, rules: RulesetBundle, input: unknown, code: string) {
  const before = encodeSnapshot(state, rules.effectRegistry);
  expect(resolveCommand(state, input, rules)).toEqual({ ok: false, code, events: [] });
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
}

it('casts a real permanent Charge for exactly3 AP and one skill slot, then rejects a duplicate without debit', () => {
  const rules = ruleset();
  const initial = game(rules, 6);
  expect(initial.effects).toEqual([]);
  const result = run(initial, rules, cast().command);
  expect(result.state.ap).toEqual({ white: 3, black: 6 });
  expect(result.state.turn).toEqual({ ...initial.turn, skillUsed: true });
  expect(result.events.map((e) => e.kind)).toEqual(['skill_used', 'ap_changed', 'effect_applied']);
  const attached = effects(result.state, rules)[0]!;
  expect(attached).toMatchObject({
    definitionId: 'effect.bomb.charge',
    definitionVersion: '1.0.0',
    sourcePlayer: 'white',
    sourceVariant: 'dynamite',
    sourceSkill: 'dynamite.live_charge',
    sourcePiece: null,
    sourceIncarnation: null,
    target: { kind: 'piece', pieceId: 'bearer' },
    lifetime: { kind: 'permanent' },
    deadline: null,
    payload: {},
    groupId: null,
  });
  let state = finish(result.state, rules);
  state = finish(state, rules);
  reject(state, rules, cast(), 'TARGET_ALREADY_BOMBED');
  expect(effects(state, rules)).toEqual([attached]);
});

it.each(['white', 'black'] as const)(
  'authorizes %s independently, AP3 succeeds and main move stays mandatory',
  (side) => {
    const rules = createLiveChargeExperimentalRuleset({
      white: side === 'white',
      black: side === 'black',
    });
    let state = game(rules, 3, [
      unit('bearer', 'rook', 'D4', side),
      unit('wk', 'king', 'H1'),
      unit('bk', 'king', 'H15', 'black'),
    ]);
    if (side === 'black') state = finish(state, rules);
    const result = run(state, rules, cast('bearer', side).command);
    expect(result.state.ap[side]).toBe(0);
    expect(result.state.turn.mainMoveUsed).toBe(false);
    expect(result.state.turn.skillUsed).toBe(true);
    expect(effects(result.state, rules)[0]?.sourcePlayer).toBe(side);
    reject(
      result.state,
      rules,
      { authority: { kind: 'player', side }, command: { kind: 'end' } },
      'MAIN_MOVE_REQUIRED',
    );
  },
);

it.each(['pawn', 'knight', 'bishop', 'rook', 'queen'] as const)(
  'accepts ordinary %s, even when owner differs from controller',
  (type) => {
    const rules = ruleset();
    const state = game(rules, 3, [
      unit('bearer', type, 'D4', 'white', 'black'),
      unit('wk', 'king', 'H1'),
      unit('bk', 'king', 'H15', 'black'),
    ]);
    expect(effects(run(state, rules, cast().command).state, rules)).toHaveLength(1);
  },
);

it.each(['special', 'summoned', undefined] as const)(
  'rejects unsupported target provenance %s atomically',
  (origin) => {
    const rules = ruleset();
    const { origin: omitted, ...target } = unit('bearer', 'queen', 'D4');
    void omitted;
    const state = game(rules, 3, [origin ? { ...target, origin } : target]);
    reject(state, rules, cast(), 'UNSUPPORTED_UNIT');
  },
);

it.each([
  ['missing', 'PIECE_NOT_FOUND'],
  ['attacker', 'NOT_CONTROLLED'],
  ['wk', 'EFFECT_KING_INELIGIBLE'],
])('rejects target %s with %s', (target, code) => {
  const rules = ruleset();
  reject(game(rules, 3), rules, cast(target), code);
});

it('rejects AP2, wrong turn and second skill without any partial changes', () => {
  const rules = ruleset();
  reject(game(rules, 2), rules, cast(), 'INSUFFICIENT_AP');
  const state = game(rules, 6);
  reject(state, rules, cast('attacker', 'black'), 'WRONG_TURN');
  const used = run(state, rules, cast().command).state;
  reject(used, rules, cast(), 'SKILL_USED');
});

it.each([
  undefined,
  { kind: 'piece-target-v1', pieceId: ['bearer'] },
  { kind: 'piece-target-v1', pieceId: 'bearer', sourcePlayer: 'black' },
  { kind: 'arbitrary', pieceId: 'bearer' },
])('rejects missing/malformed intent %j', (intent) => {
  const rules = ruleset();
  const input = cast();
  reject(
    game(rules),
    rules,
    {
      ...input,
      command: {
        kind: 'skill',
        skillId: 'dynamite.live_charge',
        ...(intent === undefined ? {} : { intent }),
      },
    },
    intent === undefined ? 'INVALID_SKILL_INTENT' : 'INVALID_COMMAND',
  );
});

it.each([
  { sourcePlayer: 'black' },
  { sourceVariant: 'guardian' },
  { cost: 0 },
  { duration: { rounds: 5 } },
  { operations: [] },
  { effectApplication: {} },
])('rejects client trusted-data injection %j', (patch) => {
  const rules = ruleset();
  const input = cast();
  reject(
    game(rules),
    rules,
    { ...input, command: { ...input.command, ...patch } },
    'INVALID_COMMAND',
  );
});

it('keeps unrelated skills unavailable and both producer factories isolated', () => {
  const dynamite = ruleset();
  const holy = createHolyShieldExperimentalRuleset({ white: true, black: false });
  for (const skillId of [
    'dynamite.landmine',
    'dynamite.detonation',
    'guardian.holy_shield',
    'guardian.holy_aura',
    'guardian.sanctuary',
    'guardian.divine_shield',
  ]) {
    reject(
      game(dynamite),
      dynamite,
      { ...cast(), command: { ...cast().command, skillId } },
      'NOT_AVAILABLE',
    );
  }
  reject(game(holy), holy, cast(), 'NOT_AVAILABLE');
  const disabled = createLiveChargeExperimentalRuleset({ white: false, black: true });
  reject(game(disabled), disabled, cast(), 'UNAUTHORIZED_VARIANT');
  expect(Object.keys(dynamite.skills!)).toEqual(['dynamite.live_charge']);
  expect(dynamite.effectRegistry!.definitions.map((d) => d.typeId)).toEqual(['effect.bomb.charge']);
  expect(createGame({ matchId: 'standard', seed: 19 }, dynamite).effects).toEqual([]);
  expect(createGame({ matchId: 'standard', seed: 19 }, dynamite).ap).toEqual({
    white: 0,
    black: 0,
  });
});

it('allows skill after main move and auto-ends only when both slots are used', () => {
  const rules = ruleset();
  const initial = game(rules, 3);
  const moved = run(initial, rules, {
    kind: 'move',
    pieceId: 'wk' as never,
    to: { file: 8, rankIndex: 0 },
  }).state;
  expect(moved.turn).toMatchObject({ sideToAct: 'white', mainMoveUsed: true, skillUsed: false });
  const castAfter = run(moved, rules, cast().command).state;
  expect(castAfter.turn).toMatchObject({
    sideToAct: 'black',
    mainMoveUsed: false,
    skillUsed: false,
  });
  expect(castAfter.ap.white).toBe(0);
  const castBefore = run(initial, rules, cast().command).state;
  expect(finish(castBefore, rules).turn.sideToAct).toBe('black');
});

it('pins profile selections across clone/decode and rejects incompatible archives', () => {
  const rules = ruleset();
  const state = run(game(rules), rules, cast().command).state;
  const encoded = encodeSnapshot(state, rules.effectRegistry);
  expect(cloneSnapshot(state, rules)).toEqual(state);
  expect(decodeSnapshot(encoded, rules)).toEqual(state);
  const changed = createLiveChargeExperimentalRuleset({ white: true, black: false });
  expect(() => decodeSnapshot(encoded, changed)).toThrow('RULESET_MISMATCH');
  for (const patch of [
    { engineVersion: '0.5.0' },
    { schemaVersion: '1.0.0' },
    { rulesetVersion: '2.0.0' },
    {
      playerProfiles: {
        white: { id: 'dynamite.live-charge-only.experimental', version: '2.0.0' },
        black: state.playerProfiles.black,
      },
    },
  ])
    expect(() => decodeSnapshot(JSON.stringify({ ...state, ...patch }), rules)).toThrow();
  expect(state.engineVersion).toBe('0.6.0');
  expect(state.schemaVersion).toBe('1.1.0');
});

it('does not alias mutable selections, state payloads or registries across matches', () => {
  const selection = { white: true, black: false };
  const rules = createLiveChargeExperimentalRuleset(selection);
  selection.white = false;
  expect(rules.playerProfiles?.white?.id).toBe('dynamite.live-charge-only.experimental');
  const a = run(game(rules), rules, cast().command).state;
  const b = game(rules);
  expect(b.effects).toEqual([]);
  expect(Object.isFrozen(effects(a, rules)[0]!.payload)).toBe(true);
  expect(() =>
    Object.assign(effects(a, rules)[0]!.payload as object, { injected: true }),
  ).toThrow();
  expect(
    createLiveChargeExperimentalRuleset({ white: true, black: false }).effectRegistry,
  ).not.toBe(rules.effectRegistry);
  expect(() =>
    createLiveChargeExperimentalRuleset({ white: true, black: false, extra: true } as never),
  ).toThrow('INVALID_PROFILE_SELECTION');
  expect(() =>
    createLiveChargeExperimentalRuleset({ white: 'true', black: false } as never),
  ).toThrow('INVALID_PROFILE_SELECTION');
  expect(() => Object.assign(rules.skills!, { 'dynamite.landmine': {} })).toThrow();
});
