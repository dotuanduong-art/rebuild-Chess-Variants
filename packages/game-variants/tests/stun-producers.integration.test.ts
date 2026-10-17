import { describe, expect, it } from 'vitest';
import {
  createBoard,
  createEffectRegistry,
  createEffectRuntime,
  resolveCommand,
  queryLegalMainActions,
  queryCaptureThreats,
  effectAllowsAction,
  encodeSnapshot,
  decodeSnapshot,
  fullStateHash,
  recordReplay,
  executeReplay,
} from '@variant-chess/game-core';
import type { DerivedOperation, RulesetBundle, EffectDefinition } from '@variant-chess/game-core';
import type { GameState } from '@variant-chess/shared-types';
import { game, unit, run, finish, effects } from './holy-shield.fixture.js';
import { profiles, cast, input, reject } from './stun-producers.fixture.js';
import {
  createHolyShieldExperimentalRuleset,
  createLiveChargeExperimentalRuleset,
} from '../src/index.js';

const transport = { kind: 'skill' as const, skillId: 'test-only.transport' };

// TRUSTED_TEST_ONLY operation transport; never exported by a production factory.
function probe(p: (typeof profiles)[number], operations: readonly DerivedOperation[]) {
  const base = p.factory({ white: true, black: true });
  return {
    ...base,
    hash: `test-only-transport-${base.hash}`,
    skills: {
      ...base.skills,
      [transport.skillId]: { cost: 0, operations },
    },
  } satisfies RulesetBundle;
}
function application(p: (typeof profiles)[number], state: GameState, rules: RulesetBundle) {
  const skill = rules.skills![p.skill]!;
  if (!('plan' in skill)) throw new Error('Expected planner');
  const op = skill.plan({ state, actor: 'white', command: cast(p.skill) }).operations[0]!;
  if (op.kind !== 'effect_apply') throw new Error('Expected effect');
  return op;
}
const swap = (destination: string): DerivedOperation => ({
  kind: 'effect_sets_swap',
  pieceA: 'attacker' as never,
  pieceB: destination as never,
});
const key = (state: GameState) =>
  Object.keys(state.history.repetition).find((k) => JSON.parse(k).effects.length)!;

describe.each(profiles)('$name lifecycle/consumer/transaction', (p) => {
  it('rejects source impersonation and incompatible effect records on snapshot restore', () => {
    const rules = p.factory({ white: true, black: true });
    const state = run(game(rules), rules, cast(p.skill)).state;
    const encoded = encodeSnapshot(state, rules.effectRegistry);
    for (const patch of [
      { sourceVariant: p.variant === 'angel' ? 'nephalem' : 'angel' },
      { sourceSkill: p.variant === 'angel' ? 'nephalem.judgment_chains' : 'angel.holy_seal' },
      { sourcePiece: 'wk' },
      { sourceIncarnation: 'fake-life' },
      { definitionVersion: '2.0.0' },
      { payload: { immunity: true } },
      {
        duration: {
          schemaVersion: '1.0.0',
          producerId: p.producer,
          producerVersion: '2.0.0',
          rounds: 3,
        },
      },
      {
        duration: {
          schemaVersion: '1.0.0',
          producerId: p.producer,
          producerVersion: '1.0.0',
          rounds: 2,
        },
      },
    ]) {
      const tampered = JSON.parse(encoded);
      Object.assign(tampered.effects[0].payload.instance, patch);
      expect(() => decodeSnapshot(JSON.stringify(tampered), rules)).toThrow();
    }
  });
  it('refreshes an already Stunned enemy with stable ID/source/payload/applied sequence and reset N3', () => {
    const rules = p.factory({ white: true, black: true });
    let state = run(game(rules), rules, cast(p.skill)).state;
    const original = effects(state, rules)[0]!;
    state = finish(state, rules);
    expect(effects(state, rules)).toEqual([original]); // cast end1 is skipped
    state = finish(state, rules);
    const refreshed = run(state, rules, cast(p.skill));
    const effect = effects(refreshed.state, rules)[0]!;
    expect(effects(refreshed.state, rules)).toHaveLength(1);
    expect(effect).toEqual({
      ...original,
      timingAnchor: { side: 'white', boundary: 'end', ordinal: 2 },
      deadline: { side: 'white', boundary: 'end', ordinal: 5 },
    });
    expect(refreshed.events.map((e) => e.kind)).toEqual([
      'skill_used',
      'ap_changed',
      'effect_refreshed',
    ]);
  });
  it('suppresses normal move/capture/threat; other pieces still move and destruction remains legal', () => {
    const rules = p.factory({ white: true, black: true });
    const initial = game(rules);
    expect(queryCaptureThreats(initial, 'black', rules).some((m) => m.pieceId === 'attacker')).toBe(
      true,
    );
    let state = run(initial, rules, cast(p.skill)).state;
    expect(queryCaptureThreats(state, 'black', rules).some((m) => m.pieceId === 'attacker')).toBe(
      false,
    );
    expect(effectAllowsAction(state, 'attacker' as never, 'forced-reposition', rules)).toBe(true);
    expect(effectAllowsAction(state, 'attacker' as never, 'skill-target', rules)).toBe(true);
    state = finish(state, rules);
    for (const to of [
      { file: 0, rankIndex: 2 },
      { file: 0, rankIndex: 0 },
    ])
      reject(
        state,
        rules,
        input({ kind: 'move', pieceId: 'attacker', to }, 'black'),
        'INVALID_MOVE',
      );
    expect(queryLegalMainActions(state, rules).every((m) => m.pieceId !== 'attacker')).toBe(true);
    expect(queryLegalMainActions(state, rules).some((m) => m.pieceId === 'bk')).toBe(true);
    reject(state, rules, input({ kind: 'end' }, 'black'), 'MAIN_MOVE_REQUIRED');
    // Skill is player-originated: its own Stunned Rook is not a caster or a global skill blocker.
    const counter = run(state, rules, cast(p.skill, 'bearer'));
    expect(effects(counter.state, rules)).toHaveLength(2);
    const destroyed = resolveCommand(
      state,
      { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'attacker' } },
      rules,
    );
    expect(destroyed.ok).toBe(true);
    if (!destroyed.ok) throw new Error(destroyed.code);
    expect(destroyed.state.effects).toEqual([]);
    expect(destroyed.state.ap.black).toBe(23); // Rook owner loss3, no capture/passive reward
    expect(
      destroyed.events.filter((e) => e.kind === 'effect_removed').map((e) => e.payload.reason),
    ).toEqual(['target_destroyed']);
  });
  it('permits forced End with only a Stunned bearer; expiry restores legal moves/capture threats', () => {
    const rules = p.factory({ white: true, black: true });
    let state = run(
      game(rules, 20, [
        unit('wk', 'king', 'H1'),
        unit('attacker', 'rook', 'A4', 'black'),
        unit('bait', 'pawn', 'A1'),
      ]),
      rules,
      cast(p.skill),
    ).state;
    for (let sourceEnd = 1; sourceEnd <= 4; sourceEnd++) {
      state = finish(state, rules);
      if (sourceEnd < 4) {
        expect(effects(state, rules)).toHaveLength(1);
        expect(queryLegalMainActions(state, rules)).toEqual([]);
        expect(queryCaptureThreats(state, 'black', rules)).toEqual([]);
        state = run(state, rules, { kind: 'end' }).state;
      }
    }
    expect(effects(state, rules)).toEqual([]);
    expect(queryCaptureThreats(state, 'black', rules).some((m) => m.targetId === 'bait')).toBe(
      true,
    );
    expect(queryLegalMainActions(state, rules).some((m) => m.pieceId === 'attacker')).toBe(true);
    expect(
      run(state, rules, {
        kind: 'move',
        pieceId: 'attacker' as never,
        to: { file: 0, rankIndex: 2 },
      }).state.turn.mainMoveUsed,
    ).toBe(true);
  });
  it.each(['bearer', 'other'] as const)(
    'relocates real Stun to %s under either controller with exact metadata preserved',
    (destination) => {
      const rules = probe(p, [swap(destination)]);
      let state = run(
        game(rules, 20, [
          unit('attacker', 'rook', 'A4', 'black'),
          unit('bearer', 'rook', 'A1'),
          unit('other', 'knight', 'E5', 'black'),
          unit('wk', 'king', 'H1'),
          unit('bk', 'king', 'H15', 'black'),
        ]),
        rules,
        cast(p.skill),
      ).state;
      const original = effects(state, rules)[0]!;
      state = finish(state, rules);
      const relocated = run(state, rules, transport);
      expect(effects(relocated.state, rules)).toEqual([
        { ...original, target: { kind: 'piece', pieceId: destination } },
      ]);
      expect(relocated.events.map((e) => e.kind)).toEqual([
        'skill_used',
        'effect_relocated',
        'effect_sets_swapped',
      ]);
    },
  );
  it.each(['king', 'special', 'summoned', 'unknown'] as const)(
    'rejects relocation onto %s atomically',
    (kind) => {
      const rules = probe(p, [swap('destination')]);
      const { origin: ignored, ...base } = unit(
        'destination',
        kind === 'king' ? 'king' : 'rook',
        'O15',
      );
      void ignored;
      const destination =
        kind === 'unknown'
          ? base
          : {
              ...base,
              origin:
                kind === 'special' || kind === 'summoned' ? kind : ('ordinary-original' as const),
            };
      let state = run(
        game(rules, 20, [
          unit('attacker', 'rook', 'A4', 'black'),
          unit('wk', 'king', 'H1'),
          unit('bk', 'king', 'H15', 'black'),
          destination,
        ]),
        rules,
        cast(p.skill),
      ).state;
      state = finish(state, rules);
      reject(
        state,
        rules,
        input(transport, 'black'),
        kind === 'king' ? 'EFFECT_KING_INELIGIBLE' : 'EFFECT_UNIT_INELIGIBLE',
      );
    },
  );
  it('keeps source and deadline after trusted controller/owner change, including a friendly bearer', () => {
    const rules = p.factory({ white: true, black: true });
    const state = run(game(rules), rules, cast(p.skill)).state;
    const original = effects(state, rules);
    // TRUSTED_TEST_ONLY transition fixture, no control skill implemented.
    const changed = {
      ...state,
      board: createBoard(
        Object.values(state.board.pieces).map((piece) =>
          piece.id === 'attacker'
            ? { ...piece, owner: 'white' as const, controller: 'white' as const }
            : piece,
        ),
      ) as GameState['board'],
    };
    expect(effects(changed, rules)).toEqual(original);
    expect(decodeSnapshot(encodeSnapshot(changed, rules.effectRegistry), rules)).toEqual(changed);
    expect(effects(finish(changed, rules), rules)).toEqual(original);
  });
  it.each([
    'cleansed',
    'dispelled',
    'consumed',
    'replaced',
    'source_invalidated',
    'link_broken',
  ] as const)('forbids explicit %s removal without debit or reward', (reason) => {
    const base = p.factory({ white: true, black: true });
    const first = run(game(base), base, cast(p.skill)).state;
    const id = effects(first, base)[0]!.id;
    const rules = probe(p, [{ kind: 'effect_remove', instanceId: id, reason }]);
    let state = run(game(rules), rules, cast(p.skill)).state;
    state = finish(state, rules);
    reject(state, rules, input(transport, 'black'), 'EFFECT_REMOVAL_FORBIDDEN');
  });
  it('terminal capture cleans real Stun without reward, and Stun grants no King immunity', () => {
    const rules = p.factory({ white: true, black: true });
    let state = run(
      game(rules, 20, [
        unit('attacker', 'rook', 'A4', 'black'),
        unit('wk', 'king', 'H1'),
        unit('bk', 'king', 'H15', 'black'),
        unit('killer', 'rook', 'H14'),
      ]),
      rules,
      cast(p.skill),
    ).state;
    const result = run(state, rules, {
      kind: 'move',
      pieceId: 'killer' as never,
      to: { file: 7, rankIndex: 14 },
    });
    state = result.state;
    expect(state.terminal.status).toBe('won');
    expect(state.effects).toEqual([]);
    expect(state.ap).toEqual({ white: 20 - p.cost, black: 20 });
    expect(
      result.events.filter((e) => e.kind === 'effect_removed').map((e) => e.payload.reason),
    ).toEqual(['match_terminal']);
  });
  it('keeps two source-player instances independent with literal source-end expiry', () => {
    const base = p.factory({ white: true, black: true });
    const op = application(p, game(base), base);
    // TRUSTED_TEST_ONLY source composition. Opposite source may target this bearer only through this transport.
    const rules = probe(p, [{ ...op, sourcePlayer: 'black' }]);
    let state = run(game(rules), rules, cast(p.skill)).state;
    state = finish(state, rules);
    state = run(state, rules, transport).state;
    expect(effects(state, rules).map((e) => e.sourcePlayer)).toEqual(['white', 'black']);
    expect(effects(state, rules).map((e) => e.deadline)).toEqual([
      { side: 'white', boundary: 'end', ordinal: 4 },
      { side: 'black', boundary: 'end', ordinal: 4 },
    ]);
    state = finish(state, rules); // black cast end1
    for (let i = 0; i < 2; i++) state = finish(finish(state, rules), rules);
    expect(effects(state, rules)).toHaveLength(2);
    state = finish(state, rules); // white end4
    expect(effects(state, rules).map((e) => e.sourcePlayer)).toEqual(['black']);
    expect(queryCaptureThreats(state, 'black', rules)).toEqual([]);
    state = finish(state, rules); // black end4
    expect(effects(state, rules)).toEqual([]);
  });
  it.each([
    { sourceVariant: 'foreign' },
    { sourceSkill: 'foreign.skill' },
    { sourcePiece: 'wk' },
    { sourceIncarnation: 'fake' },
    {
      duration: {
        schemaVersion: '1.0.0',
        producerId: 'foreign',
        producerVersion: '1.0.0',
        rounds: 3,
      },
    },
  ])('generic validation rejects forged trusted source/parameters %j', (patch) => {
    const base = p.factory({ white: true, black: true });
    const rules = probe(p, [{ ...application(p, game(base), base), ...patch } as DerivedOperation]);
    const state = game(rules);
    const result = resolveCommand(state, input(transport), rules);
    expect(result.ok).toBe(false);
    expect(result.events).toEqual([]);
    expect(encodeSnapshot(state, rules.effectRegistry)).toBe(
      encodeSnapshot(game(rules), rules.effectRegistry),
    );
  });
  it('generic validator still checks N3, payload, bindings and post-plan eligibility', () => {
    const base = p.factory({ white: true, black: true });
    const op = application(p, game(base), base);
    for (const patch of [
      { duration: { ...op.duration!, rounds: 2 } },
      { payload: { unsupported: true } },
      { definitionVersion: '2.0.0' },
    ]) {
      const rules = probe(p, [{ ...op, ...patch }]);
      expect(resolveCommand(game(rules), input(transport), rules).ok).toBe(false);
    }
    for (const runtime of [
      createEffectRuntime(base.effectRegistry!, { ...base.effectRuntime, restrictions: {} }),
      createEffectRuntime(base.effectRegistry!, {
        ...base.effectRuntime,
        eligibility: {
          [`${p.producer}.ordinary-v1`]: () => false,
        },
      }),
    ]) {
      const rules = { ...base, effectRuntime: runtime };
      const state = game(rules);
      expect(resolveCommand(state, input(cast(p.skill)), rules).ok).toBe(false);
      expect(state.ap.white).toBe(20);
      expect(state.effects).toEqual([]);
      expect(state.turn.skillUsed).toBe(false);
    }
  });
  it('rolls back after planning/application/RNG/IDs/history and permits an identical retry', () => {
    const base = p.factory({ white: true, black: true });
    const rules: RulesetBundle = {
      ...base,
      hash: `test-only-fault-${base.hash}`,
      handlers: [
        {
          id: 'test-only.rng',
          order: 1,
          react: (e) =>
            e.kind === 'effect_applied'
              ? [{ kind: 'random', side: 'actor', namespace: 'test', pool: ['a', 'b'] }]
              : [],
        },
      ],
    };
    const state = game(rules);
    const before = encodeSnapshot(state, rules.effectRegistry);
    for (const options of [
      { operationBudget: 1 },
      {
        validate: () => {
          throw new Error('AFTER_APPLICATION');
        },
      },
    ]) {
      const result = resolveCommand(state, input(cast(p.skill)), rules, options);
      expect(result.ok).toBe(false);
      expect(result.events).toEqual([]);
      expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
    }
    const a = resolveCommand(state, input(cast(p.skill)), rules);
    const b = resolveCommand(decodeSnapshot(before, rules), input(cast(p.skill)), rules);
    expect(a.ok).toBe(true);
    expect(a).toEqual(b);
    if (!a.ok) throw new Error(a.code);
    expect(a.state.rng).not.toEqual(state.rng);
    expect(a.state.effects).toHaveLength(1);
  });
  it('preserves source-aware repetition under alpha-renaming and rejects non-equivalent source player', () => {
    const rules = p.factory({ white: true, black: true });
    const left = game(rules, 20, undefined, 'left');
    const right = {
      ...game(
        rules,
        20,
        Object.values(left.board.pieces).map((piece) => ({ ...piece, id: `renamed-${piece.id}` })),
        'right',
      ),
      counters: { ...left.counters, operation: 37 },
    };
    const a = finish(run(left, rules, cast(p.skill)).state, rules);
    const b = run(run(right, rules, cast(p.skill, 'renamed-attacker')).state, rules, {
      kind: 'move',
      pieceId: 'renamed-wk' as never,
      to: { file: 8, rankIndex: 0 },
    }).state;
    expect(key(a)).toBe(key(b));
    expect(fullStateHash(a, rules.effectRegistry)).not.toEqual(
      fullStateHash(b, rules.effectRegistry),
    );
    expect(JSON.parse(key(a)).effects[0].data).toEqual({
      target: { kind: 'piece', position: { file: 0, rankIndex: 3 } },
      remaining: { side: 'white', boundary: 'end', remaining: 3 },
      source: {
        player: 'white',
        variant: p.variant,
        skill: p.skill,
        piece: null,
        incarnation: null,
      },
    });
    const op = application(p, left, rules);
    const fixture = probe(p, [{ ...op, sourcePlayer: 'black' }]);
    const black = finish(run(game(fixture), fixture, transport).state, fixture);
    // Compare effect projections only: fixture ruleset/profile/AP/slot differences are deliberately excluded.
    expect(JSON.parse(key(black)).effects).not.toEqual(JSON.parse(key(a)).effects);
  });
  it('replays committed root casts with exact events/hash and rejects older archives', () => {
    const rules = p.factory({ white: true, black: true });
    const initial = game(rules);
    const inputs = [
      input(cast(p.skill)),
      input({ kind: 'move', pieceId: 'wk', to: { file: 8, rankIndex: 0 } }),
    ];
    const recorded = recordReplay(initial, inputs, rules);
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) throw new Error(recorded.code);
    const replay = executeReplay(recorded.archive, rules);
    expect(replay.ok).toBe(true);
    if (!replay.ok) throw new Error(replay.code);
    expect(replay.events).toEqual(recorded.archive.steps.flatMap((s) => s.events));
    expect(fullStateHash(replay.state, rules.effectRegistry)).toEqual(
      fullStateHash(recorded.state, rules.effectRegistry),
    );
    expect(
      executeReplay(
        {
          ...recorded.archive,
          initialConfig: { ...recorded.archive.initialConfig, engineVersion: '0.5.0' },
        },
        rules,
      ).ok,
    ).toBe(false);
    expect(executeReplay(recorded.archive, p.factory({ white: false, black: true })).ok).toBe(
      false,
    );
  });
});

it('keeps distinct Variant/skill sources in separately labeled test-only Stun composition, never a mixed factory', () => {
  const bases = profiles.map((p) => p.factory({ white: true, black: true }));
  const definitions: EffectDefinition[] = bases.map((b, i) => ({
    ...b.effectRegistry!.get('effect.stun'),
    typeId: `test-only.stun.${i}`,
  }));
  const registry = createEffectRegistry(definitions);
  const rules: RulesetBundle = {
    version: '1.0.0',
    hash: 'test-only-two-profile-composition-v1',
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      restrictions: bases[0]!.effectRuntime!.restrictions!,
      eligibility: Object.assign({}, ...bases.map((b) => b.effectRuntime!.eligibility)),
    }),
    skills: {
      [transport.skillId]: {
        cost: 0,
        operations: profiles.map((p, i) => ({
          ...application(p, game(bases[i]!), bases[i]!),
          definitionId: `test-only.stun.${i}`,
        })),
      },
    },
  };
  const state = run(game(rules), rules, transport).state;
  expect(effects(state, rules).map((e) => [e.sourceVariant, e.sourceSkill])).toEqual([
    ['nephalem', 'nephalem.judgment_chains'],
    ['angel', 'angel.holy_seal'],
  ]);
  expect(queryCaptureThreats(state, 'black', rules)).toEqual([]);
  const projector = definitions[0]!.repetitionProjector;
  const original = effects(state, rules)[0]!;
  const context = { target: null, group: null, remainingLifetime: null };
  for (const patch of [
    { sourcePlayer: 'black' as const },
    { sourceVariant: 'angel' },
    { sourceSkill: 'angel.holy_seal' },
  ])
    expect(projector({ ...original, ...patch }, context)).not.toEqual(projector(original, context));
  expect(() =>
    createEffectRegistry(bases.map((b) => b.effectRegistry!.get('effect.stun'))),
  ).toThrow('DUPLICATE_EFFECT_DEFINITION');
});

it('real Stun with test-only Shield/Bomb composition preserves capture defense and committed blast semantics', () => {
  const stun = profiles[0].factory({ white: true, black: true });
  const shield = createHolyShieldExperimentalRuleset({ white: true, black: true });
  const bomb = createLiveChargeExperimentalRuleset({ white: true, black: true });
  const registry = createEffectRegistry(
    [stun, shield, bomb].flatMap((b) => b.effectRegistry!.definitions),
  );
  const source = (variant: string, skill: string) => ({
    sourcePlayer: 'white' as const,
    sourceVariant: variant,
    sourceSkill: skill,
    sourcePiece: null,
    sourceIncarnation: null,
  });
  const rules: RulesetBundle = {
    ...stun,
    hash: 'test-only-stun-shield-bomb-v1',
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      ...stun.effectRuntime,
      captureDefense: shield.effectRuntime!.captureDefense!,
      deathReactions: bomb.effectRuntime!.deathReactions!,
      eligibility: {
        ...stun.effectRuntime!.eligibility,
        ...shield.effectRuntime!.eligibility,
        ...bomb.effectRuntime!.eligibility,
      },
    }),
    skills: {
      ...stun.skills,
      [transport.skillId]: {
        cost: 0,
        operations: [
          {
            kind: 'effect_apply',
            definitionId: 'effect.shield',
            definitionVersion: '1.0.0',
            target: { kind: 'piece', pieceId: 'attacker' as never },
            ...source('guardian', 'guardian.holy_shield'),
            duration: {
              schemaVersion: '1.0.0',
              producerId: 'guardian.holy-shield',
              producerVersion: '1.0.0',
              rounds: 2,
            },
            payload: {},
            groupId: null,
          },
          {
            kind: 'effect_apply',
            definitionId: 'effect.bomb.charge',
            definitionVersion: '1.0.0',
            target: { kind: 'piece', pieceId: 'attacker' as never },
            ...source('dynamite', 'dynamite.live_charge'),
            payload: {},
            groupId: null,
          },
        ],
      },
    },
  };
  let state = run(game(rules), rules, cast(profiles[0].skill)).state;
  state = finish(state, rules);
  state = run(state, rules, transport).state;
  state = finish(state, rules);
  reject(
    state,
    rules,
    input({ kind: 'move', pieceId: 'bearer', to: { file: 0, rankIndex: 3 } }),
    'CAPTURE_DEFENDED',
  );
  const destroyed = resolveCommand(
    state,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'attacker' } },
    rules,
  );
  expect(destroyed.ok).toBe(true);
  if (!destroyed.ok) throw new Error(destroyed.code);
  expect(destroyed.state.effects).toEqual([]);
  expect(destroyed.events.filter((e) => e.kind === 'bomb_exploded')).toHaveLength(1);
});
