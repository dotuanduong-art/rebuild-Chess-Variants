import { expect, it } from 'vitest';
import {
  effectSourceKey,
  BASE_RULESET_ID,
  createBoard,
  createGame,
  createEffectRegistry,
  createEffectRuntime,
  resolveCommand,
  decodeEffectRecords,
  queryLegalMainActions,
  queryCaptureThreats,
  STUN_CONSUMER_CONTRACT,
  STUN_RESTRICTION_BINDINGS,
  STUN_PAYLOAD_SCHEMA,
  effectAllowsAction,
  encodeSnapshot,
  decodeSnapshot,
  encodeEffectRecords,
  recordReplay,
  executeReplay,
} from '../src/index.js';
import type { EffectDefinition, DerivedOperation, RulesetBundle } from '../src/index.js';
import type { GameState, RootCommand, PlayerSide } from '@variant-chess/shared-types';
import { GameStateSchema } from '@variant-chess/shared-types';
import { piece } from './fixtures.js';

// Only synthetic trusted profiles: N1/N3 are numeric evidence, not approval of any producer/King/removal permissions.
const definition = (patch: Partial<EffectDefinition> = {}): EffectDefinition => ({
  typeId: 'fixture.stun',
  schemaVersion: '1.0.0',
  targets: ['piece'],
  category: 'debuff',
  sourceAttribution: { kind: 'preserve-source', requiredRefs: ['variant', 'skill'] },
  ownership: { kind: 'source-player' },
  kingEligibility: { kind: 'allowed' },
  lifetime: {
    kind: 'producer-rounds',
    schemaVersion: '1.0.0',
    boundary: 'end',
    producers: ['fixture.one', 'fixture.two'].map((skill) => ({
      id: skill,
      version: '1.0.0',
      sourceVariant: 'fixture',
      sourceSkill: skill,
      allowedRounds: [1, 3],
      requireCaster: false,
      supportsIncarnation: true,
    })),
  },
  stacking: {
    key: 'type-source-identity-target',
    mode: 'refresh',
    payload: 'preserve',
    source: 'preserve',
    deadline: 'reset',
    mergePolicyId: null,
  },
  removal: {
    expired: 'cleanup-only',
    cleansed: 'cleanup-only',
    dispelled: 'cleanup-only',
    consumed: 'cleanup-only',
    replaced: 'cleanup-only',
    target_destroyed: 'cleanup-only',
    source_invalidated: 'cleanup-only',
    link_broken: 'cleanup-only',
    match_terminal: 'cleanup-only',
  },
  relocation: { kind: 'retargetable', constraints: [] },
  visibility: { kind: 'public' },
  capabilities: [],
  triggers: [],
  repetition: { projectionId: 'fixture' },
  repetitionProjector: (e, c) => ({
    target: c.target,
    remaining: c.remainingLifetime,
    source: {
      player: e.sourcePlayer,
      variant: e.sourceVariant,
      skill: e.sourceSkill,
      piece: e.sourcePiece,
      incarnation: e.sourceIncarnation ?? null,
    },
  }),
  payloadSchema: {
    parse: (value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length)
        throw new Error('EMPTY_PAYLOAD');
      return {};
    },
  },
  ...patch,
});
const apply = (
  rounds = 1,
  patch: Partial<Extract<DerivedOperation, { kind: 'effect_apply' }>> = {},
): DerivedOperation => ({
  kind: 'effect_apply',
  definitionId: 'fixture.stun',
  definitionVersion: '1.0.0',
  target: { kind: 'piece', pieceId: 'p' as never },
  sourcePlayer: 'actor',
  sourceVariant: 'fixture',
  sourceSkill: 'fixture.one',
  sourcePiece: null,
  duration: { schemaVersion: '1.0.0', producerId: 'fixture.one', producerVersion: '1.0.0', rounds },
  payload: {},
  groupId: null,
  ...patch,
});
function bundle(
  operations: readonly DerivedOperation[] = [apply()],
  def = definition(),
): RulesetBundle {
  const registry = createEffectRegistry([def]);
  return {
    ...BASE_RULESET_ID,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, { restrictions: STUN_RESTRICTION_BINDINGS }),
    skills: { cast: { cost: 1, operations } },
  };
}
const game = (rules: RulesetBundle, board = createBoard([piece('p', 'pawn', 'A1', 'black')])) =>
  createGame({ matchId: 'm', seed: 7, board, ap: { white: 10, black: 10 } }, rules);
const input = (
  command: RootCommand = { kind: 'skill', skillId: 'cast' },
  side: PlayerSide = 'white',
) => ({ authority: { kind: 'player', side }, command });
function run(
  state: GameState,
  rules: RulesetBundle,
  command?: RootCommand,
  side = state.turn.sideToAct,
) {
  const result = resolveCommand(state, input(command, side), rules);
  if (!result.ok) throw new Error(result.code);
  return result;
}
const effects = (state: GameState, rules: RulesetBundle) =>
  decodeEffectRecords(state.effects, rules.effectRegistry!, state);
const restricted = (patch: Partial<EffectDefinition> = {}) =>
  definition({ actionRestrictions: STUN_CONSUMER_CONTRACT.actionRestrictions, ...patch });

it('captures canonical structured source identity without ambiguous optional refs or mutable target data', () => {
  const source = { sourcePlayer: 'white' as const, sourceVariant: 'fixture', sourceSkill: 'one' };
  expect(effectSourceKey('m', source)).toBe(
    effectSourceKey('m', { ...source, sourcePiece: null, sourceIncarnation: null }),
  );
  expect(effectSourceKey('m', source)).not.toBe(effectSourceKey('other', source));
  for (const patch of [
    { sourceSkill: 'two' },
    { sourceVariant: 'other' },
    { sourcePiece: 'caster' },
    { sourcePlayer: 'black' as const },
  ])
    expect(effectSourceKey('m', source)).not.toBe(effectSourceKey('m', { ...source, ...patch }));
  expect(
    effectSourceKey('m', { ...source, sourcePiece: 'caster', sourceIncarnation: 'life.1' }),
  ).not.toBe(
    effectSourceKey('m', { ...source, sourcePiece: 'caster', sourceIncarnation: 'life.2' }),
  );
});

it('refreshes one structured source at stable identity with newly validated N while other skills/casters remain independent', () => {
  const rules = bundle([
    apply(1),
    apply(3),
    apply(1, {
      sourceSkill: 'fixture.two',
      duration: {
        schemaVersion: '1.0.0',
        producerId: 'fixture.two',
        producerVersion: '1.0.0',
        rounds: 1,
      },
    }),
    apply(1, { sourcePiece: 'casterA' as never }),
    apply(1, { sourcePiece: 'casterB' as never }),
  ]);
  const result = run(game(rules), rules);
  expect(
    effects(result.state, rules).map((e) => ({
      id: e.id,
      skill: e.sourceSkill,
      caster: e.sourcePiece,
      deadline: e.deadline?.ordinal,
      rounds: e.lifetime.kind === 'rounds' ? e.lifetime.rounds : 0,
    })),
  ).toEqual([
    { id: 'm:operation:2', skill: 'fixture.one', caster: null, deadline: 4, rounds: 3 },
    { id: 'm:operation:4', skill: 'fixture.two', caster: null, deadline: 2, rounds: 1 },
    { id: 'm:operation:5', skill: 'fixture.one', caster: 'casterA', deadline: 2, rounds: 1 },
    { id: 'm:operation:6', skill: 'fixture.one', caster: 'casterB', deadline: 2, rounds: 1 },
  ]);
  expect(result.events.filter((e) => e.kind === 'effect_refreshed')).toHaveLength(1);
});

it('uses one effect-aware main query, submit validation and forced End while capture threats ignore main slots', () => {
  const rules = bundle(
    [apply()],
    definition({
      actionRestrictions: [
        { actionKind: 'main-action', policyId: 'stun.main.v1' },
        { actionKind: 'capture-threat', policyId: 'stun.threat.v1' },
      ],
    }),
  );
  const initial = game(
    rules,
    createBoard([piece('p', 'rook', 'A1'), piece('enemy', 'pawn', 'A3', 'black')]),
  );
  expect(queryLegalMainActions(initial, rules).some((m) => m.kind === 'capture')).toBe(true);
  expect(queryCaptureThreats(initial, 'white', rules).map((m) => m.targetId)).toEqual(['enemy']);
  const stunned = run(initial, rules).state;
  expect(queryLegalMainActions(stunned, rules)).toEqual([]);
  expect(queryCaptureThreats(stunned, 'white', rules)).toEqual([]);
  expect(
    resolveCommand(
      stunned,
      input({ kind: 'move', pieceId: 'p' as never, to: { file: 0, rankIndex: 1 } }),
      rules,
    ),
  ).toEqual({ ok: false, code: 'INVALID_MOVE', events: [] });
  expect(run(stunned, rules, { kind: 'end' }).state.turn.sideToAct).toBe('black');
  expect(STUN_CONSUMER_CONTRACT.enabled).toBe(false);
});

it('preserves legacy synthetic player-only matching unless structured source mode is declared', () => {
  const rules = bundle(
    [
      apply(1),
      apply(3, {
        sourceSkill: 'fixture.two',
        duration: {
          schemaVersion: '1.0.0',
          producerId: 'fixture.two',
          producerVersion: '1.0.0',
          rounds: 3,
        },
      }),
    ],
    definition({
      stacking: {
        key: 'type-source-target',
        mode: 'refresh',
        payload: 'preserve',
        source: 'replace',
        deadline: 'reset',
        mergePolicyId: null,
      },
    }),
  );
  const result = run(game(rules), rules);
  expect(effects(result.state, rules)).toHaveLength(1);
  expect(effects(result.state, rules)[0]).toMatchObject({
    id: 'm:operation:2',
    sourceSkill: 'fixture.two',
  });
});

it('rejects invalid/unauthorized producer parameters atomically and never accepts client EffectApplication', () => {
  for (const operation of [
    apply(0),
    apply(-1),
    apply(2),
    apply(1.5),
    apply(Number.MAX_SAFE_INTEGER + 1),
    apply(1, { duration: undefined }),
    apply(1, {
      duration: {
        schemaVersion: '1.0.0',
        producerId: 'absent',
        producerVersion: '1.0.0',
        rounds: 1,
      },
    }),
    apply(1, { sourceSkill: 'other' }),
    apply(1, {
      duration: {
        schemaVersion: '1.0.0',
        producerId: 'fixture.one',
        producerVersion: '9.0.0',
        rounds: 1,
      },
    }),
  ]) {
    const rules = bundle([operation]),
      state = game(rules),
      before = JSON.stringify(state);
    expect(resolveCommand(state, input(), rules)).toMatchObject({ ok: false, events: [] });
    expect(JSON.stringify(state)).toBe(before);
  }
  const rules = bundle();
  expect(
    resolveCommand(
      game(rules),
      { authority: { kind: 'player', side: 'white' }, command: apply() },
      rules,
    ),
  ).toEqual({ ok: false, code: 'INVALID_COMMAND', events: [] });
});

it('validates stored source incarnation support without inventing an incarnation', () => {
  const rules = bundle([
    apply(1, { sourcePiece: 'caster' as never }),
    apply(1, { sourcePiece: 'caster' as never, sourceIncarnation: 'life.1' }),
    apply(1, { sourcePiece: 'caster' as never, sourceIncarnation: 'life.2' }),
  ]);
  const result = run(game(rules), rules);
  expect(effects(result.state, rules).map((e) => e.sourceIncarnation)).toEqual([
    null,
    'life.1',
    'life.2',
  ]);
  const policy = definition().lifetime;
  if (policy.kind !== 'producer-rounds') throw new Error('FIXTURE');
  const denied = bundle(
    [apply(1, { sourcePiece: 'caster' as never, sourceIncarnation: 'life.1' })],
    definition({
      lifetime: {
        ...policy,
        producers: policy.producers.map((p) => ({ ...p, supportsIncarnation: false })),
      },
    }),
  );
  expect(resolveCommand(game(denied), input(), denied)).toEqual({
    ok: false,
    code: 'EFFECT_PRODUCER_PARAMETERS',
    events: [],
  });
  expect(() => effectSourceKey('m', { sourcePlayer: 'white', sourceIncarnation: 'fake' })).toThrow(
    'EFFECT_INCARNATION_WITHOUT_CASTER',
  );
});

it.each(['white', 'black'] as const)(
  'expires N1/N3 only at the next approved source-end boundaries for %s',
  (side) => {
    for (const rounds of [1, 3]) {
      const rules = bundle([apply(rounds)]);
      let state = game(rules);
      if (side === 'black') state = run(state, rules, { kind: 'end' }).state;
      state = run(state, rules).state;
      expect(effects(state, rules)[0]?.deadline?.side).toBe(side);
      for (let step = 1; step <= 2 * rounds + 1; step++) {
        state = run(state, rules, { kind: 'end' }).state;
        expect(state.effects.length).toBe(step === 2 * rounds + 1 ? 0 : 1);
      }
    }
  },
);

it('refreshes after a source round using new N and anchor while preserving original instance/application identity', () => {
  const rules = bundle();
  let state = run(game(rules), rules).state;
  state = run(run(state, rules, { kind: 'end' }).state, rules, { kind: 'end' }).state;
  const again = { ...rules, skills: { cast: { cost: 1, operations: [apply(3)] } } };
  const result = run(state, again);
  expect(effects(result.state, again)[0]).toMatchObject({
    id: 'm:operation:2',
    appliedSequence: 1,
    timingAnchor: { side: 'white', boundary: 'end', ordinal: 2 },
    deadline: { side: 'white', boundary: 'end', ordinal: 5 },
    duration: { rounds: 3 },
  });
});

it('keeps independent source deadlines and removing one source leaves Stun active', () => {
  const two = apply(3, {
    sourceSkill: 'fixture.two',
    duration: {
      schemaVersion: '1.0.0',
      producerId: 'fixture.two',
      producerVersion: '1.0.0',
      rounds: 3,
    },
  });
  const rules = bundle([apply(1), two], restricted());
  let state = run(game(rules, createBoard([piece('p', 'rook', 'A1')])), rules).state;
  state = run(run(state, rules, { kind: 'end' }).state, rules, { kind: 'end' }).state;
  state = run(state, rules, { kind: 'end' }).state; // White next end: first source expires, second remains.
  expect(effects(state, rules).map((e) => e.sourceSkill)).toEqual(['fixture.two']);
  expect(effectAllowsAction(state, 'p' as never, 'main-action', rules)).toBe(false);
});

it.each(['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'] as const)(
  'blocks %s main actions without changing geometry or owner/controller/AP',
  (type) => {
    const rules = bundle([apply()], restricted());
    const initial = game(
      rules,
      createBoard([
        piece('p', type, 'E5', 'white', 'black'),
        piece('enemy', 'pawn', 'F6', 'black'),
      ]),
    );
    const normal = queryLegalMainActions(initial, rules)[0]!;
    expect(normal).toBeDefined();
    const stunned = run(initial, rules).state;
    expect(stunned.board).toEqual(initial.board);
    expect(stunned.ap).toEqual({ white: 9, black: 10 }); // only trusted fixture skill cost
    const before = JSON.stringify(stunned);
    expect(
      resolveCommand(stunned, input({ kind: 'move', pieceId: 'p' as never, to: normal.to }), rules),
    ).toEqual({ ok: false, code: 'INVALID_MOVE', events: [] });
    expect(JSON.stringify(stunned)).toBe(before);
    expect(effectAllowsAction(stunned, 'p' as never, 'forced-reposition', rules)).toBe(true);
    expect(effectAllowsAction(stunned, 'p' as never, 'skill-target', rules)).toBe(true);
  },
);

it('rejects forced End if an un-Stunned controlled piece still has a legal main action', () => {
  const rules = bundle([apply()], restricted());
  const state = run(
    game(rules, createBoard([piece('p', 'rook', 'A1'), piece('other', 'knight', 'E5')])),
    rules,
  ).state;
  expect(queryLegalMainActions(state, rules).every((m) => m.pieceId === 'other')).toBe(true);
  expect(resolveCommand(state, input({ kind: 'end' }), rules)).toEqual({
    ok: false,
    code: 'MAIN_MOVE_REQUIRED',
    events: [],
  });
});

it.each(['white', 'black'] as const)(
  'allows a skill before move to remove synthetic Stun and invalidates stale forced-skip claims for %s',
  (side) => {
    const base = bundle([apply(3)], restricted());
    const rules: RulesetBundle = {
      ...base,
      skills: {
        ...base.skills,
        release: {
          cost: 0,
          operations: [
            {
              kind: 'effect_remove',
              instanceId: side === 'white' ? 'm:operation:2' : 'm:operation:3',
              reason: 'cleansed',
            },
          ],
        },
      },
    };
    const enemy = side === 'white' ? 'black' : 'white';
    let state = game(rules, createBoard([piece('p', 'rook', 'E5', side, enemy)]));
    if (side === 'black') state = run(state, rules, { kind: 'end' }).state;
    state = run(state, rules).state;
    state = run(run(state, rules, { kind: 'end' }).state, rules, { kind: 'end' }).state;
    expect(queryLegalMainActions(state, rules)).toEqual([]);
    const released = run(state, rules, { kind: 'skill', skillId: 'release' }).state;
    expect(queryLegalMainActions(released, rules).length).toBeGreaterThan(0);
    expect(resolveCommand(released, input({ kind: 'end' }, side), rules)).toEqual({
      ok: false,
      code: 'MAIN_MOVE_REQUIRED',
      events: [],
    });
  },
);

it('does not auto-end a main move merely because no skill is available and threats ignore slots/side-to-act', () => {
  const rules = bundle([], restricted());
  const state = game(
    rules,
    createBoard([piece('p', 'rook', 'A1'), piece('enemy', 'pawn', 'A3', 'black')]),
  );
  const moved = run(state, rules, {
    kind: 'move',
    pieceId: 'p' as never,
    to: { file: 0, rankIndex: 1 },
  }).state;
  expect(moved.turn).toMatchObject({ sideToAct: 'white', mainMoveUsed: true, skillUsed: false });
  expect(queryLegalMainActions(moved, rules)).toEqual([]);
  expect(queryCaptureThreats(moved, 'white', rules).map((m) => m.targetId)).toEqual(['enemy']);
});

it('keeps source identity through target/caster controller changes, caster death and eligible relocation', () => {
  const rules = bundle([apply(3, { sourcePiece: 'caster' as never })], restricted());
  const initial = game(
    rules,
    createBoard([
      piece('p', 'pawn', 'A1', 'black'),
      piece('caster', 'pawn', 'B1', 'black'),
      piece('destination', 'pawn', 'C1', 'black'),
    ]),
  );
  const applied = run(initial, rules).state;
  const changed = GameStateSchema.parse({
    ...applied,
    board: createBoard(
      Object.values(applied.board.pieces).map((p) => ({
        ...p,
        controller: p.id === 'caster' || p.id === 'p' ? ('white' as const) : p.controller,
      })),
    ),
  });
  const source = effects(changed, rules)[0]!;
  const transferred: RulesetBundle = {
    ...rules,
    handlers: [
      {
        id: 'fixture-transfer',
        order: 0,
        react: (e) =>
          e.kind === 'piece_destroyed'
            ? [
                {
                  kind: 'effect_relocate',
                  instanceId: source.id,
                  target: { kind: 'piece', pieceId: 'destination' as never },
                },
              ]
            : [],
      },
    ],
  };
  const result = resolveCommand(
    changed,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'caster' } },
    transferred,
  );
  if (!result.ok) throw new Error(result.code);
  const after = effects(result.state, transferred)[0]!;
  expect(
    effectSourceKey('m', {
      sourcePlayer: after.sourcePlayer,
      sourceVariant: after.sourceVariant,
      sourceSkill: after.sourceSkill,
      sourcePiece: after.sourcePiece,
      sourceIncarnation: after.sourceIncarnation,
    }),
  ).toBe(
    effectSourceKey('m', {
      sourcePlayer: source.sourcePlayer,
      sourceVariant: source.sourceVariant,
      sourceSkill: source.sourceSkill,
      sourcePiece: source.sourcePiece,
      sourceIncarnation: source.sourceIncarnation,
    }),
  );
  expect(after).toMatchObject({
    id: source.id,
    target: { kind: 'piece', pieceId: 'destination' },
    deadline: source.deadline,
    payload: {},
  });
});

it('validates snapshot duration/source parameters and replays exactly with a pinned producer contract', () => {
  const rules = bundle([apply(3)], restricted());
  const initial = game(rules);
  const applied = run(initial, rules).state;
  expect(decodeSnapshot(encodeSnapshot(applied, rules.effectRegistry), rules)).toEqual(applied);
  for (const patch of [{ rounds: 2 }, { producerVersion: '9.0.0' }, { schemaVersion: '2.0.0' }]) {
    const raw = JSON.parse(encodeSnapshot(applied, rules.effectRegistry));
    Object.assign(raw.effects[0].payload.instance.duration, patch);
    expect(() => decodeSnapshot(JSON.stringify(raw), rules)).toThrow();
  }
  const missing = JSON.parse(encodeSnapshot(applied, rules.effectRegistry));
  delete missing.effects[0].payload.instance.sourceIncarnation;
  expect(() => decodeSnapshot(JSON.stringify(missing), rules)).toThrow(
    'EFFECT_SOURCE_NOT_CANONICAL',
  );
  const recorded = recordReplay(
    initial,
    [input(), input({ kind: 'end' }), input({ kind: 'end' }, 'black')],
    rules,
  );
  if (!recorded.ok) throw new Error(recorded.code);
  const replay = executeReplay(recorded.archive, rules);
  if (!replay.ok) throw new Error(replay.code);
  expect(replay.state).toEqual(recorded.state);
  expect(replay.events).toEqual(recorded.archive.steps.flatMap((s) => s.events));
});

it('uses relative remaining duration in repetition without absolute anchor/allocation noise', () => {
  const rules = bundle([apply(3)]);
  const initial = run(game(rules), rules).state;
  const first = run(initial, rules, { kind: 'end' }).state;
  const shifted = {
    ...initial,
    turn: { ...initial.turn, plyIndex: 2, roundIndex: 2 },
    history: {
      ...initial.history,
      entries: initial.history.entries.map((e, index) =>
        index === initial.history.entries.length - 1 ? { ...e, plyIndex: 2 } : e,
      ),
      lastCountedPly: 2,
    },
  };
  const old = effects(initial, rules)[0]!;
  const later = {
    ...shifted,
    effects: encodeEffectRecords(
      [
        {
          ...old,
          timingAnchor: { side: 'white', boundary: 'end', ordinal: 2 },
          deadline: { side: 'white', boundary: 'end', ordinal: 5 },
        },
      ],
      rules.effectRegistry!,
      shifted,
    ),
  };
  const second = run(later, rules, { kind: 'end' }).state;
  expect(Object.keys(second.history.repetition).at(-1)).toBe(
    Object.keys(first.history.repetition).at(-1),
  );
});

it('fails closed for missing restriction bindings and isolates registry profiles/mirror sources', () => {
  const rules = bundle([apply(1), apply(3, { sourcePlayer: 'black' })], restricted());
  const result = run(game(rules), rules);
  expect(effects(result.state, rules).map((e) => [e.sourcePlayer, e.deadline?.ordinal])).toEqual([
    ['white', 2],
    ['black', 3],
  ]);
  const missing = { ...rules, effectRuntime: createEffectRuntime(rules.effectRegistry!) };
  expect(resolveCommand(game(missing), input(), missing)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  const policy = definition().lifetime;
  if (policy.kind !== 'producer-rounds') throw new Error('FIXTURE');
  const other = bundle(
    [],
    restricted({
      lifetime: {
        ...policy,
        producers: policy.producers.map((p) => ({ ...p, allowedRounds: [1] })),
      },
    }),
  );
  expect(resolveCommand(result.state, input({ kind: 'end' }), other)).toEqual({
    ok: false,
    code: 'EFFECT_PRODUCER_PARAMETERS',
    events: [],
  });
});

it('freezes restriction contexts and rolls back later effects/RNG/IDs/AP/history on injected failure', () => {
  const rules = bundle(
    [
      apply(),
      { kind: 'random', side: 'actor', namespace: 'fixture', pool: ['a', 'b'] },
      { kind: 'fail', code: 'INJECTED' },
    ],
    restricted(),
  );
  const state = game(rules),
    before = JSON.stringify(state);
  expect(resolveCommand(state, input(), rules)).toEqual({
    ok: false,
    code: 'INJECTED',
    events: [],
  });
  expect(JSON.stringify(state)).toBe(before);
  const malicious: RulesetBundle = {
    ...rules,
    legalityPolicies: [
      {
        id: 'bad',
        actionKinds: ['main-action'],
        allows: (c) => {
          (c.state.ap as { white: number }).white = 99;
          return true;
        },
      },
    ],
  };
  const movable = game(malicious, createBoard([piece('p', 'rook', 'A1')]));
  expect(
    resolveCommand(
      movable,
      input({ kind: 'move', pieceId: 'p' as never, to: { file: 0, rankIndex: 1 } }),
      malicious,
    ),
  ).toMatchObject({ ok: false, events: [] });
  expect(movable.ap.white).toBe(10);
});

it('keeps concrete Stun disabled and validates only the empty immutable payload', () => {
  expect(STUN_CONSUMER_CONTRACT).toMatchObject({
    definitionId: 'effect.stun',
    category: 'debuff',
    enabled: false,
  });
  expect(Object.isFrozen(STUN_CONSUMER_CONTRACT.actionRestrictions)).toBe(true);
  expect(STUN_PAYLOAD_SCHEMA.parse({})).toEqual({});
  expect(() => STUN_PAYLOAD_SCHEMA.parse({ chain: 'invented' })).toThrow('INVALID_STUN_PAYLOAD');
  expect(() =>
    createEffectRegistry([STUN_CONSUMER_CONTRACT as unknown as EffectDefinition]),
  ).toThrow();
});

it('pins current executable behavior to engine0.6.0 and rejects engine0.2.0 archives', () => {
  const rules = bundle(),
    state = game(rules);
  expect(state.engineVersion).toBe('0.6.0');
  expect(() =>
    decodeSnapshot(JSON.stringify({ ...state, engineVersion: '0.2.0' }), rules),
  ).toThrow();
});

it('does not accept a stale forced-End claim after a forbidden move if another piece can move', () => {
  const rules = bundle([apply()], restricted());
  const state = run(
    game(rules, createBoard([piece('p', 'rook', 'A1'), piece('other', 'knight', 'D4')])),
    rules,
  ).state;
  const before = JSON.stringify(state);
  expect(
    resolveCommand(
      state,
      input({ kind: 'move', pieceId: 'p' as never, to: { file: 0, rankIndex: 1 } }),
      rules,
    ),
  ).toEqual({ ok: false, code: 'INVALID_MOVE', events: [] });
  expect(resolveCommand(state, input({ kind: 'end' }), rules)).toEqual({
    ok: false,
    code: 'MAIN_MOVE_REQUIRED',
    events: [],
  });
  expect(JSON.stringify(state)).toBe(before);
});

it('uses controller capture allegiance/Pawn geometry in threats, distinct from main-action turn legality', () => {
  const rules = bundle([apply()], restricted());
  const initial = game(
    rules,
    createBoard([
      piece('p', 'pawn', 'B3', 'black', 'white'),
      piece('enemy', 'queen', 'A2', 'white'),
      piece('friend', 'pawn', 'C2', 'black', 'white'),
    ]),
  );
  expect(queryCaptureThreats(initial, 'black', rules).map((m) => [m.pieceId, m.targetId])).toEqual([
    ['p', 'enemy'],
  ]);
  expect(queryLegalMainActions(initial, rules, 'black')).toEqual([]);
  expect(queryCaptureThreats(run(initial, rules).state, 'black', rules)).toEqual([]);
});

it('keeps future declared legality policies consistent across query/submit/End and redirect validation', () => {
  const base = bundle([], restricted());
  const rules: RulesetBundle = {
    ...base,
    legalityPolicies: [{ id: 'fixture.region', actionKinds: ['main-action'], allows: () => false }],
  };
  const state = game(rules, createBoard([piece('p', 'rook', 'A1')]));
  expect(queryLegalMainActions(state, rules)).toEqual([]);
  expect(
    resolveCommand(
      state,
      input({ kind: 'move', pieceId: 'p' as never, to: { file: 0, rankIndex: 1 } }),
      rules,
    ),
  ).toEqual({ ok: false, code: 'INVALID_MOVE', events: [] });
  expect(run(state, rules, { kind: 'end' }).state.turn.sideToAct).toBe('black');
  const redirect: RulesetBundle = {
    ...base,
    legalityPolicies: [
      {
        id: 'fixture.denyB',
        actionKinds: ['main-action'],
        allows: (c) => c.candidate?.to.file !== 1,
      },
    ],
    interceptors: [
      { id: 'fixture.redirect', order: 0, intercept: () => ({ kind: 'redirect', targetId: 'b' }) },
    ],
  };
  const board = createBoard([
    piece('p', 'rook', 'A1'),
    piece('a', 'pawn', 'A2', 'black'),
    piece('b', 'pawn', 'B1', 'black'),
  ]);
  expect(
    resolveCommand(
      game(redirect, board),
      input({ kind: 'move', pieceId: 'p' as never, to: { file: 0, rankIndex: 1 } }),
      redirect,
    ),
  ).toEqual({ ok: false, code: 'INVALID_REDIRECT', events: [] });
});

it('requires explicit synthetic King eligibility and rolls back invalid structured relocation', () => {
  const denied = bundle([apply()], restricted({ kingEligibility: { kind: 'denied' } }));
  const king = game(denied, createBoard([piece('p', 'king', 'E5')]));
  expect(resolveCommand(king, input(), denied)).toEqual({
    ok: false,
    code: 'EFFECT_KING_INELIGIBLE',
    events: [],
  });
  const rules = bundle(
    [
      apply(3),
      {
        kind: 'effect_relocate',
        instanceId: 'm:operation:2',
        target: { kind: 'piece', pieceId: 'missing' as never },
      },
    ],
    restricted(),
  );
  const state = game(rules),
    before = JSON.stringify(state);
  expect(resolveCommand(state, input(), rules)).toEqual({
    ok: false,
    code: 'EFFECT_TARGET_MISSING',
    events: [],
  });
  expect(JSON.stringify(state)).toBe(before);
});

it('freezes producer constraints and rejects duplicate declarations and unsupported action categories', () => {
  const def = definition(),
    rules = bundle([apply(2)], def);
  if (def.lifetime.kind !== 'producer-rounds') throw new Error('FIXTURE');
  (def.lifetime.producers[0]!.allowedRounds as number[]).push(2);
  expect(resolveCommand(game(rules), input(), rules)).toEqual({
    ok: false,
    code: 'EFFECT_PRODUCER_PARAMETERS',
    events: [],
  });
  expect(() =>
    createEffectRegistry([
      restricted({
        actionRestrictions: [
          { actionKind: 'main-action', policyId: 'same' },
          { actionKind: 'main-action', policyId: 'same' },
        ],
      }),
    ]),
  ).toThrow('DUPLICATE_EFFECT_METADATA');
  expect(() => effectAllowsAction(game(rules), 'p' as never, 'unapproved' as never, rules)).toThrow(
    'UNSUPPORTED_RUNTIME',
  );
  expect(Object.isFrozen(STUN_PAYLOAD_SCHEMA.parse({}))).toBe(true);
});
