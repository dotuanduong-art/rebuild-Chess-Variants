import { expect, it } from 'vitest';
import {
  createLiveChargeExperimentalRuleset,
  createHolyShieldExperimentalRuleset,
} from '../src/index.js';
import { planLiveCharge } from '../src/live-charge.js';
import {
  createBoard,
  createEffectRegistry,
  createEffectRuntime,
  resolveCommand,
  encodeSnapshot,
  decodeSnapshot,
  cloneSnapshot,
  fullStateHash,
  recordReplay,
  executeReplay,
} from '@variant-chess/game-core';
import type { DerivedOperation, EffectDefinition, RulesetBundle } from '@variant-chess/game-core';
import type { GameState } from '@variant-chess/shared-types';
import { game, unit, run, finish, effects } from './holy-shield.fixture.js';

const real = () => createLiveChargeExperimentalRuleset({ white: true, black: true });
const cast = (pieceId = 'bearer') => ({
  kind: 'skill' as const,
  skillId: 'dynamite.live_charge',
  intent: { kind: 'piece-target-v1' as const, pieceId: pieceId as never },
});
const source = (side: 'white' | 'black') => ({
  sourcePlayer: side,
  sourceVariant: 'dynamite',
  sourceSkill: 'dynamite.live_charge',
  sourcePiece: null,
  sourceIncarnation: null,
});
const input = (state: GameState, command: unknown) => ({
  authority: { kind: 'player', side: state.turn.sideToAct },
  command,
});
function reject(state: GameState, rules: RulesetBundle, raw: unknown, code: string) {
  const before = encodeSnapshot(state, rules.effectRegistry);
  expect(resolveCommand(state, raw, rules)).toEqual({ ok: false, code, events: [] });
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
}

// TRUSTED_TEST_ONLY: extra operations/definitions transport otherwise disabled cross-system cases.
// These bundles are never returned by a production factory. The real Live Charge planner is reused.
function probe(operations: readonly DerivedOperation[], extra: readonly EffectDefinition[] = []) {
  const base = real();
  const holy = createHolyShieldExperimentalRuleset({ white: true, black: true });
  const registry = createEffectRegistry([...base.effectRegistry!.definitions, ...extra]);
  return {
    ...base,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      ...base.effectRuntime,
      eligibility: { ...base.effectRuntime!.eligibility, ...holy.effectRuntime!.eligibility },
      captureDefense: holy.effectRuntime!.captureDefense!,
    }),
    skills: {
      'dynamite.live_charge': {
        requiredProfile: base.playerProfiles!.white!,
        plan: (c) => planLiveCharge(c, registry),
      },
      'test.transport': { cost: 0, operations },
    },
  } satisfies RulesetBundle;
}
const transport = { kind: 'skill' as const, skillId: 'test.transport' };
const swap = (destination: string): DerivedOperation => ({
  kind: 'effect_sets_swap',
  pieceA: 'bearer' as never,
  pieceB: destination as never,
});
const apply = (
  definitionId = 'effect.bomb.charge',
  side: 'white' | 'black' = 'white',
): Extract<DerivedOperation, { kind: 'effect_apply' }> => ({
  kind: 'effect_apply',
  definitionId,
  definitionVersion: '1.0.0',
  target: { kind: 'piece', pieceId: 'bearer' as never },
  ...source(side),
  payload: {},
  groupId: null,
});
const destruction = (pieceId = 'bearer') => ({
  authority: { kind: 'system' },
  command: { kind: 'destroy', pieceId },
});

it.each(['white', 'black'] as const)(
  'rejects an existing %s-source Mine without changing it; no Mine skill enabled',
  (side) => {
    const base = real().effectRegistry!.get('effect.bomb.charge');
    const mine: EffectDefinition = {
      ...base,
      typeId: 'effect.bomb.mine',
      category: 'debuff',
      sourceAttribution: {
        kind: 'preserve-source',
        requiredRefs: ['variant', 'skill'],
        profile: {
          kind: 'player-originated-v1',
          sourceVariant: 'test-only',
          sourceSkill: 'test.mine-fixture',
        },
      },
    };
    const rules = probe(
      [
        {
          ...apply('effect.bomb.mine', side),
          sourceVariant: 'test-only',
          sourceSkill: 'test.mine-fixture',
        },
      ],
      [mine],
    );
    let state = run(game(rules, 10), rules, transport).state;
    const original = effects(state, rules)[0]!;
    state = finish(finish(state, rules), rules);
    reject(state, rules, input(state, cast()), 'TARGET_ALREADY_BOMBED');
    expect(effects(state, rules)).toEqual([original]);
    expect(rules.skills).not.toHaveProperty('dynamite.landmine');
  },
);

it.each(['white', 'black'] as const)(
  'rejects %s-source existing Charge but generic family apply remains an ignored no-op',
  (side) => {
    const rules = probe([apply('effect.bomb.charge', side)]);
    let state = run(game(rules, 10), rules, transport).state;
    state = finish(finish(state, rules), rules);
    const original = effects(state, rules);
    reject(state, rules, input(state, cast()), 'TARGET_ALREADY_BOMBED');
    const duplicate = run(state, rules, transport);
    expect(effects(duplicate.state, rules)).toEqual(original);
    expect(duplicate.events.some((e) => e.kind === 'effect_applied')).toBe(false);
    // Only the root skill and queued application operation allocate IDs; no extra instance allocation.
    expect(duplicate.state.counters.operation - state.counters.operation).toBe(2);
  },
);

it.each(['attacker', 'other'] as const)(
  'relocates a real Charge to %s across controllers without apply/expire/explosion',
  (destination) => {
    const rules = probe([swap(destination)]);
    let state = run(
      game(rules, 10, [
        unit('bearer', 'rook', 'A1'),
        unit('attacker', 'rook', 'A4', 'black'),
        unit('other', 'knight', 'E5'),
        unit('wk', 'king', 'H1'),
        unit('bk', 'king', 'H15', 'black'),
      ]),
      rules,
      cast(),
    ).state;
    state = finish(state, rules);
    const original = effects(state, rules)[0]!;
    const moved = run(state, rules, transport);
    expect(effects(moved.state, rules)).toEqual([
      { ...original, target: { kind: 'piece', pieceId: destination } },
    ]);
    expect(moved.events.filter((e) => e.kind.startsWith('effect_')).map((e) => e.kind)).toEqual([
      'effect_relocated',
      'effect_sets_swapped',
    ]);
    expect(moved.events.some((e) => e.kind === 'bomb_exploded')).toBe(false);
    const killed = resolveCommand(moved.state, destruction(destination), rules);
    expect(killed.ok).toBe(true);
    if (!killed.ok) throw new Error(killed.code);
    expect(killed.events.find((e) => e.kind === 'bomb_exploded')?.payload).toMatchObject({
      center: moved.state.board.pieces[destination]!.position,
      source: source('white'),
    });
  },
);

it.each(['king', 'special', 'summoned', 'unknown'] as const)(
  'rejects a whole swap onto %s atomically',
  (kind) => {
    const rules = probe([swap('destination')]);
    const { origin: omitted, ...unknown } = unit('destination', 'rook', 'E5', 'black');
    void omitted;
    const destination =
      kind === 'king'
        ? unit('destination', 'king', 'E5', 'black')
        : kind === 'unknown'
          ? unknown
          : { ...unknown, origin: kind };
    let state = run(
      game(rules, 10, [
        unit('bearer', 'rook', 'A1'),
        destination,
        unit('wk', 'king', 'H1'),
        unit('bk', 'king', 'H15', 'black'),
      ]),
      rules,
      cast(),
    ).state;
    state = finish(state, rules);
    const failure = resolveCommand(state, input(state, transport), rules);
    expect(failure.ok).toBe(false);
    if (failure.ok) throw new Error('Unexpected swap');
    reject(state, rules, input(state, transport), failure.code);
    expect(failure.code).toBe(
      kind === 'king' ? 'EFFECT_KING_INELIGIBLE' : 'EFFECT_UNIT_INELIGIBLE',
    );
  },
);

it('keeps original source through trusted controller transfer, without changing owner or attachment', () => {
  const rules = real();
  const state = run(game(rules, 10), rules, cast()).state;
  // Authoritative TEST_ONLY control fixture; no conversion skill is enabled.
  const changed = {
    ...state,
    board: createBoard(
      Object.values(state.board.pieces).map((p) =>
        p.id === 'bearer' ? { ...p, controller: 'black' as const } : p,
      ),
    ) as GameState['board'],
  };
  expect(effects(cloneSnapshot(changed, rules), rules)).toEqual(effects(state, rules));
  expect(changed.board.pieces.bearer?.owner).toBe('white');
});

it('uses the moved bearer actual capture coordinate; kills capturer and both sides, excludes King and awards loss only for blast', () => {
  const rules = real();
  let state = game(rules, 10, [
    unit('bearer', 'rook', 'D1'),
    unit('attacker', 'rook', 'D7', 'black'),
    unit('ally', 'knight', 'C4'),
    unit('enemy', 'bishop', 'E5', 'black'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'C5', 'black'),
  ]);
  state = run(state, rules, cast()).state;
  state = run(state, rules, {
    kind: 'move',
    pieceId: 'bearer' as never,
    to: { file: 3, rankIndex: 3 },
  }).state;
  const result = run(state, rules, {
    kind: 'move',
    pieceId: 'attacker' as never,
    to: { file: 3, rankIndex: 3 },
  });
  expect(Object.keys(result.state.board.pieces).sort()).toEqual(['bk', 'wk']);
  expect(result.state.ap).toEqual({ white: 12, black: 19 }); // W10-3+Rook3+Knight2; B10+captureRook4+ownRook3+Bishop2.
  expect(
    result.events.filter((e) => e.kind === 'piece_destroyed').map((e) => e.payload.pieceId),
  ).toEqual(['ally', 'attacker', 'enemy']);
  expect(result.events.find((e) => e.kind === 'bomb_exploded')?.payload).toMatchObject({
    center: { file: 3, rankIndex: 3 },
    source: source('white'),
    targets: ['ally', 'attacker', 'enemy'],
  });
  expect(result.state.terminal.status).toBe('ongoing');
});

it('chains two real producers in FIFO order, each retaining its own source and death dedup', () => {
  const rules = real();
  let state = game(rules, 10, [
    unit('bearer', 'rook', 'D4'),
    unit('second', 'knight', 'E4', 'black'),
    unit('victim', 'pawn', 'E5'),
    unit('remote', 'pawn', 'F4'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ]);
  state = finish(run(state, rules, cast()).state, rules);
  state = run(state, rules, cast('second')).state;
  const result = resolveCommand(state, destruction(), rules);
  if (!result.ok) throw new Error(result.code);
  expect(
    result.events
      .filter((e) => e.kind === 'bomb_exploded')
      .map((e) => ({ center: e.payload.center, source: e.payload.source.sourcePlayer })),
  ).toEqual([
    { center: { file: 3, rankIndex: 3 }, source: 'white' },
    { center: { file: 4, rankIndex: 3 }, source: 'black' },
  ]);
  const deaths = result.events.filter((e) => e.kind === 'piece_destroyed');
  expect(deaths.map((e) => e.payload.pieceId)).toEqual(['bearer', 'second', 'victim', 'remote']);
  expect(deaths.filter((e) => e.payload.source).map((e) => e.payload.source?.sourcePlayer)).toEqual(
    ['white', 'white', 'black'],
  );
  expect(result.state.ap).toEqual({ white: 12, black: 9 }); // Each paid3; W Rook3+two Pawn1, B Knight2; no blast capture rewards.
  expect(result.state.effects).toEqual([]);
});

it('Shield cancels capture before Bomb death; destruction still explodes', () => {
  const shield = createHolyShieldExperimentalRuleset({
    white: true,
    black: true,
  }).effectRegistry!.get('effect.shield');
  const rules = probe(
    [
      {
        ...apply('effect.shield'),
        sourceVariant: 'guardian',
        sourceSkill: 'guardian.holy_shield',
        duration: {
          schemaVersion: '1.0.0',
          producerId: 'guardian.holy-shield',
          producerVersion: '1.0.0',
          rounds: 2,
        },
      },
    ],
    [shield],
  );
  let state = finish(run(game(rules, 10), rules, cast()).state, rules);
  state = run(state, rules, transport).state;
  reject(
    state,
    rules,
    input(state, { kind: 'move', pieceId: 'attacker', to: { file: 0, rankIndex: 0 } }),
    'CAPTURE_DEFENDED',
  );
  const result = resolveCommand(state, destruction(), rules);
  if (!result.ok) throw new Error(result.code);
  expect(result.events.filter((e) => e.kind === 'bomb_exploded')).toHaveLength(1);
  expect(result.state.board.pieces.bearer).toBeUndefined();
});

it.each([
  'cleansed',
  'dispelled',
  'source_invalidated',
  'consumed',
  'replaced',
  'link_broken',
] as const)('does not enable explicit %s removal', (reason) => {
  const base = real();
  const state = finish(run(game(base, 10), base, cast()).state, base);
  const rules = probe([{ kind: 'effect_remove', instanceId: effects(state, base)[0]!.id, reason }]);
  reject(state, rules, input(state, transport), 'EFFECT_REMOVAL_FORBIDDEN');
});

it('King capture terminal cleans a real Charge without any remaining explosion or AP reward', () => {
  const rules = real();
  const state = run(
    game(rules, 10, [
      unit('bearer', 'rook', 'A1'),
      unit('wk', 'king', 'H1'),
      unit('bk', 'king', 'A4', 'black'),
    ]),
    rules,
    cast(),
  ).state;
  const result = run(state, rules, {
    kind: 'move',
    pieceId: 'bearer' as never,
    to: { file: 0, rankIndex: 3 },
  });
  expect(result.state.terminal).toEqual({
    status: 'won',
    winner: 'white',
    reason: 'king_captured',
  });
  expect(result.state.ap).toEqual({ white: 7, black: 10 });
  expect(result.state.effects).toEqual([]);
  expect(result.events.some((e) => e.kind === 'bomb_exploded')).toBe(false);
});

it('rolls back late producer failure including candidate AP/slots/IDs/RNG/history/events', () => {
  const base = real();
  const rules: RulesetBundle = {
    ...base,
    handlers: [
      {
        id: 'test.random',
        order: 0,
        react: (e) =>
          e.kind === 'skill_used'
            ? [{ kind: 'random', side: 'actor', namespace: 'test', pool: ['a', 'b'] }]
            : [],
      },
    ],
  };
  const state = game(rules, 3),
    before = encodeSnapshot(state, rules.effectRegistry);
  let reached = false;
  const result = resolveCommand(state, input(state, cast()), rules, {
    validate: (candidate) => {
      reached = true;
      expect(candidate.ap.white).toBe(0);
      expect(candidate.turn.skillUsed).toBe(true);
      expect(candidate.effects).toHaveLength(1);
      expect(candidate.rng.cursor).toBe(1);
      expect(candidate.history.entries.length).toBeGreaterThan(state.history.entries.length);
      throw new Error('TEST_LATE_FAILURE');
    },
  });
  expect(reached).toBe(true);
  expect(result).toEqual({ ok: false, code: 'TEST_LATE_FAILURE', events: [] });
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
});

it('retains generic final eligibility validation after the real planner, with no cost/slot leak', () => {
  const base = real();
  const rules: RulesetBundle = {
    ...base,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      ...base.effectRuntime,
      eligibility: { 'dynamite.live-charge.ordinary-v1': () => false },
    }),
  };
  const state = game(rules, 3);
  reject(state, rules, input(state, cast()), 'EFFECT_INELIGIBLE');
  expect(resolveCommand(state, input(state, cast()), base).ok).toBe(true);
});

it('distinguishes source players and producer identities in semantic projection, and rejects source impersonation on restore', () => {
  const keys = (['white', 'black'] as const).map((side) => {
    const rules = probe([apply('effect.bomb.charge', side)]);
    const state = finish(run(game(rules, 10), rules, transport).state, rules);
    return Object.keys(state.history.repetition).find((k) => JSON.parse(k).effects.length)!;
  });
  expect(keys[0]).not.toBe(keys[1]);
  expect(JSON.parse(keys[0]!).effects[0].data.source.player).toBe('white');
  expect(JSON.parse(keys[1]!).effects[0].data.source.player).toBe('black');
  const rules = real(),
    state = run(game(rules, 3), rules, cast()).state;
  const definition = rules.effectRegistry!.get('effect.bomb.charge');
  const instance = effects(state, rules)[0]!;
  const context = {
    target: { kind: 'piece', position: { file: 0, rankIndex: 0 } },
    group: null,
    remainingLifetime: null,
  };
  for (const patch of [{ sourceVariant: 'other' }, { sourceSkill: 'other.skill' }]) {
    // Projector contract negative pair only; neither foreign producer is enabled or valid in this factory.
    expect(definition.repetitionProjector({ ...instance, ...patch }, context)).not.toEqual(
      definition.repetitionProjector(instance, context),
    );
    const tampered = JSON.parse(encodeSnapshot(state, rules.effectRegistry));
    Object.assign(tampered.effects[0].payload.instance, patch);
    expect(() => decodeSnapshot(JSON.stringify(tampered), rules)).toThrow(
      'EFFECT_SOURCE_PROFILE_MISMATCH',
    );
  }
});

it('rolls back a chain on queue budget exhaustion and a fault after deaths, preserving deterministic retry', () => {
  const rules = real();
  let state = game(rules, 10, [
    unit('bearer', 'rook', 'D4'),
    unit('second', 'knight', 'E4', 'black'),
    unit('victim', 'pawn', 'E5'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ]);
  state = finish(run(state, rules, cast()).state, rules);
  state = run(state, rules, cast('second')).state;
  const before = encodeSnapshot(state, rules.effectRegistry);
  const budget = resolveCommand(state, destruction(), rules, { operationBudget: 2 });
  expect(budget).toEqual({ ok: false, code: 'RESOLUTION_LIMIT', events: [] });
  const faulty: RulesetBundle = {
    ...rules,
    handlers: [
      {
        id: 'test.mid-chain',
        order: 0,
        react: (e) =>
          e.kind === 'piece_destroyed' && e.payload.pieceId === 'second'
            ? [{ kind: 'fail', code: 'TEST_CHAIN_FAILURE' }]
            : [],
      },
    ],
  };
  reject(state, faulty, destruction(), 'TEST_CHAIN_FAILURE');
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
  expect(resolveCommand(cloneSnapshot(state, rules), destruction(), rules)).toEqual(
    resolveCommand(state, destruction(), rules),
  );
});

it('snapshot and replay preserve real casts, source-bearing explosions and exact events/hashes', () => {
  const rules = real(),
    initial = game(rules, 3);
  const commands = [input(initial, cast()), destruction()];
  const recorded = recordReplay(initial, commands, rules);
  if (!recorded.ok) throw new Error(recorded.code);
  const replayed = executeReplay(recorded.archive, rules);
  expect(replayed.ok).toBe(true);
  if (!replayed.ok) throw new Error(replayed.code);
  expect(replayed.state).toEqual(recorded.state);
  expect(replayed.events).toEqual(recorded.archive.steps.flatMap((s) => s.events));
  expect(fullStateHash(replayed.state, rules.effectRegistry)).toEqual(
    fullStateHash(recorded.state, rules.effectRegistry),
  );
  expect(decodeSnapshot(encodeSnapshot(replayed.state, rules.effectRegistry), rules)).toEqual(
    replayed.state,
  );
});
