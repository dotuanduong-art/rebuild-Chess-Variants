import { expect, it } from 'vitest';
import {
  createEffectRegistry,
  createEffectRuntime,
  resolveCommand,
  encodeSnapshot,
  decodeSnapshot,
  fullStateHash,
  cloneSnapshot,
  encodeEffectRecords,
  effectSourceKey,
  captureEffectSource,
  queryLegalMainActions,
  effectAllowsAction,
  createBoard,
  recordReplay,
  executeReplay,
} from '../src/index.js';
import { GameStateSchema } from '@variant-chess/shared-types';
import type { EffectApplication, GameState } from '@variant-chess/shared-types';
import type { EffectDefinition } from '../src/index.js';
import {
  effects,
  game,
  input,
  setup,
  shield,
  sourceDefinition,
  sourceRules,
} from './holy-shield-source.fixture.js';
import { play, move, end, batchRuleset, application } from './batch-a-fixture.js';

it('validates the versioned null-caster Guardian source without registering a playable producer', () => {
  const definition = sourceDefinition();
  const registry = createEffectRegistry([definition]);
  expect(registry.get('effect.shield').sourceAttribution).toMatchObject({
    profile: {
      kind: 'player-originated-v1',
      sourceVariant: 'guardian',
      sourceSkill: 'guardian.holy_shield',
    },
  });
  const rules = sourceRules([shield('bearer')]);
  const state = setup(game(rules), rules).state;
  expect(effects(state, rules)[0]).toMatchObject({
    sourcePlayer: 'white',
    sourceVariant: 'guardian',
    sourceSkill: 'guardian.holy_shield',
    sourcePiece: null,
    sourceIncarnation: null,
    duration: { rounds: 2 },
  });
  expect(rules.skills).not.toHaveProperty('guardian.holy_shield');
});

it('rejects a real-looking board caster using the null-only source approval atomically', () => {
  const rules = sourceRules([shield('bearer', 'white', { sourcePiece: 'attacker' as never })]);
  const state = game(rules),
    before = JSON.stringify(state);
  expect(resolveCommand(state, input(), rules)).toEqual({
    ok: false,
    code: 'EFFECT_SOURCE_PROFILE_MISMATCH',
    events: [],
  });
  expect(JSON.stringify(state)).toBe(before);
});

it('validates opted-in source data before a synthetic family duplicate can ignore the application', () => {
  const base = sourceDefinition();
  const definition: EffectDefinition = {
    ...base,
    typeId: 'fixture.future',
    family: { id: 'fixture.family', policy: 'unique-target-ignore' },
    stacking: { key: 'type-target', mode: 'ignore' },
  };
  const rules = sourceRules(
    [
      shield('bearer', 'white', { definitionId: 'fixture.future' }),
      shield('bearer', 'black', {
        definitionId: 'fixture.future',
        sourcePiece: 'attacker' as never,
      }),
    ],
    definition,
  );
  const state = game(rules),
    before = JSON.stringify(state);
  const result = resolveCommand(state, input(), rules);
  expect(result).toMatchObject({ ok: false, code: 'EFFECT_SOURCE_PROFILE_MISMATCH', events: [] });
  expect(JSON.stringify(state)).toBe(before);
});

const invalidSources: readonly [string, Partial<EffectApplication>][] = [
  ['wrong variant', { sourceVariant: 'other' }],
  ['wrong skill', { sourceSkill: 'guardian.divine_shield' }],
  ['missing variant', { sourceVariant: null }],
  ['missing skill', { sourceSkill: null }],
  ['invalid player', { sourcePlayer: 'spectator' as never }],
  ['live caster', { sourcePiece: 'attacker' as never }],
  ['dead caster', { sourcePiece: 'retired.caster' as never }],
  ['fake null token', { sourcePiece: 'null' as never }],
  ['incarnation without caster', { sourceIncarnation: 'life.1' }],
  ['caster and incarnation', { sourcePiece: 'attacker' as never, sourceIncarnation: 'life.1' }],
  [
    'unknown producer version',
    {
      duration: {
        schemaVersion: '1.0.0',
        producerId: 'synthetic.null-source',
        producerVersion: '9.0.0',
        rounds: 2,
      },
    },
  ],
  ['unknown definition version', { definitionVersion: '9.0.0' }],
];
it.each(invalidSources)(
  'rejects %s instead of treating it as the approved null source',
  (_, patch) => {
    const rules = sourceRules([shield('bearer', 'white', patch)]),
      state = game(rules);
    const before = encodeSnapshot(state, rules.effectRegistry);
    expect(resolveCommand(state, input(), rules)).toMatchObject({ ok: false, events: [] });
    expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
  },
);

it.each([
  'player-originated-v2',
  'live-caster-v1',
  'historical-caster-v1',
  'incarnation-v1',
  'linked-source-graph-v1',
  'unreviewed-binding',
])('rejects unreviewed source declaration %s at registry construction', (kind) => {
  const definition = sourceDefinition();
  const unsupported = {
    ...definition,
    sourceAttribution: {
      ...definition.sourceAttribution,
      profile: { ...definition.sourceAttribution.profile, kind },
    },
  };
  expect(() => createEffectRegistry([unsupported as unknown as EffectDefinition])).toThrow();
});

function pairedReadyStates(sourcePlayer: 'white' | 'black' = 'white') {
  return ['left', 'right'].map((matchId) => {
    const bearer = `${matchId}.bearer`,
      attacker = `${matchId}.attacker`;
    const noise =
      matchId === 'right'
        ? Array.from({ length: 12 }, (): { kind: 'marker'; value: string } => ({
            kind: 'marker',
            value: 'allocation-only',
          }))
        : [];
    const rules = sourceRules(
      [...noise, shield(bearer, sourcePlayer)],
      sourceDefinition(),
      {
        'synthetic.recast': [shield(bearer), shield(bearer, 'black')],
        'synthetic.transfer': [
          { kind: 'effect_sets_swap', pieceA: bearer as never, pieceB: attacker as never },
        ],
      },
      matchId,
    );
    const initial = game(rules, matchId, bearer, attacker);
    const applied = setup(initial, rules);
    return {
      initial,
      applied,
      rules,
      bearer,
      attacker,
      state: play(applied.state, rules, end).state,
    };
  });
}
const key = (state: GameState) => Object.keys(state.history.repetition).at(-1)!;

it('proves EQ-1 across coherent match/piece/effect/operation renaming while full hashes remain different', () => {
  const [left, right] = pairedReadyStates();
  expect(effects(left!.state, left!.rules)[0]!.id).toBe('left:operation:2');
  expect(effects(right!.state, right!.rules)[0]!.id).toBe('right:operation:14');
  expect(key(left!.state)).toBe(key(right!.state));
  expect(fullStateHash(left!.state, left!.rules.effectRegistry)).not.toEqual(
    fullStateHash(right!.state, right!.rules.effectRegistry),
  );
  expect(JSON.parse(key(left!.state)).effects).toEqual([
    {
      definitionId: 'effect.shield',
      definitionVersion: '1.0.0',
      data: {
        target: { kind: 'piece', position: { file: 0, rankIndex: 14 } },
        remaining: { side: 'white', boundary: 'end', remaining: 2 },
        source: {
          player: 'white',
          variant: 'guardian',
          skill: 'guardian.holy_shield',
          piece: null,
          incarnation: null,
        },
      },
    },
  ]);
  for (const fixture of [left!, right!]) {
    expect(
      fixture.applied.events
        .filter((e) => e.kind === 'effect_applied')
        .map((e) => [
          e.payload.sourcePlayer,
          e.payload.sourceVariant,
          e.payload.sourceSkill,
          e.payload.sourcePiece,
        ]),
    ).toEqual([['white', 'guardian', 'guardian.holy_shield', null]]);
    expect(
      resolveCommand(fixture.state, input('guardian.holy_shield', 'black'), fixture.rules),
    ).toEqual({ ok: false, code: 'NOT_AVAILABLE', events: [] });
  }
});

it('keeps semantic source player/Variant/skill distinctions without accepting them under Holy Shield approval', () => {
  const [white] = pairedReadyStates('white'),
    [black] = pairedReadyStates('black');
  expect(key(white!.state)).not.toBe(key(black!.state));
  const baseline = key(white!.state);
  // Other semantic IDs are independent synthetic contrast definitions, not approved producers.
  for (const [variant, skill] of [
    ['other.variant', 'guardian.holy_shield'],
    ['guardian', 'other.skill'],
  ]) {
    const rules = sourceRules(
      [shield('left.bearer', 'white', { sourceVariant: variant!, sourceSkill: skill! })],
      sourceDefinition(variant, skill),
    );
    const state = play(
      setup(game(rules, 'left', 'left.bearer', 'left.attacker'), rules).state,
      rules,
      end,
    ).state;
    expect(key(state)).not.toBe(baseline);
  }
});

it('proves EQ-5 for N2 across shifted absolute clocks, but distinguishes different remaining duration and targets', () => {
  const rules = sourceRules([shield('bearer')]);
  const original = setup(game(rules), rules).state;
  const shifted = {
    ...original,
    turn: { ...original.turn, plyIndex: 2, roundIndex: 2 },
    history: {
      ...original.history,
      entries: original.history.entries.map((e, i) =>
        i === original.history.entries.length - 1 ? { ...e, plyIndex: 2 } : e,
      ),
      lastCountedPly: 2,
    },
  };
  const instance = effects(original, rules)[0]!;
  const later = {
    ...shifted,
    effects: encodeEffectRecords(
      [
        {
          ...instance,
          timingAnchor: { side: 'white', boundary: 'end', ordinal: 2 },
          deadline: { side: 'white', boundary: 'end', ordinal: 4 },
        },
      ],
      rules.effectRegistry!,
      shifted,
    ),
  };
  const first = play(original, rules, end).state;
  expect(key(play(later, rules, end).state)).toBe(key(first));
  // Same N2, one older source anchor: valid stored contract, only one logical round remains.
  const older = {
    ...shifted,
    effects: encodeEffectRecords([instance], rules.effectRegistry!, shifted),
  };
  expect(key(play(older, rules, end).state)).not.toBe(key(first));
  const otherTarget = {
    ...original,
    effects: encodeEffectRecords(
      [{ ...instance, target: { kind: 'piece', pieceId: 'spare' } }],
      rules.effectRegistry!,
      original,
    ),
  };
  expect(key(play(otherTarget, rules, end).state)).not.toBe(key(first));
});

it('gives equivalent allocations corresponding refresh, independent sources, expiry, capture defense and legal actions', () => {
  const pair = pairedReadyStates();
  const originalIds = pair.map((p) => effects(p.state, p.rules)[0]!.id);
  for (const p of pair) {
    expect(
      queryLegalMainActions(p.state, p.rules).some(
        (m) => m.kind === 'move' && m.pieceId === p.attacker,
      ),
    ).toBe(true);
    expect(
      queryLegalMainActions(p.state, p.rules).some(
        (m) => m.kind === 'capture' && m.targetId === p.bearer,
      ),
    ).toBe(false);
    const before = encodeSnapshot(p.state, p.rules.effectRegistry);
    expect(
      resolveCommand(
        p.state,
        { authority: { kind: 'player', side: 'black' }, command: move(p.attacker, 'A15') },
        p.rules,
      ),
    ).toEqual({ ok: false, code: 'CAPTURE_DEFENDED', events: [] });
    expect(encodeSnapshot(p.state, p.rules.effectRegistry)).toBe(before);
    const recast = resolveCommand(p.state, input('synthetic.recast', 'black'), p.rules);
    if (!recast.ok) throw new Error(recast.code);
    p.state = recast.state;
    expect(effects(p.state, p.rules).map((e) => [e.sourcePlayer, e.deadline])).toEqual([
      ['white', { side: 'white', boundary: 'end', ordinal: 3 }],
      ['black', { side: 'black', boundary: 'end', ordinal: 3 }],
    ]);
    expect(recast.events.filter((e) => e.kind === 'effect_refreshed')).toHaveLength(1);
  }
  expect(pair.map((p) => effects(p.state, p.rules)[0]!.id)).toEqual(originalIds);
  // Black1 move -> White2 End -> Black2 move+End -> White3 End: only White source expires.
  for (const p of pair) {
    for (const command of [move(p.attacker, 'B12'), end, move(p.attacker, 'A12'), end, end])
      p.state = play(p.state, p.rules, command).state;
    expect(effects(p.state, p.rules).map((e) => e.sourcePlayer)).toEqual(['black']);
    expect(
      resolveCommand(
        p.state,
        { authority: { kind: 'player', side: 'black' }, command: move(p.attacker, 'A15') },
        p.rules,
      ),
    ).toEqual({ ok: false, code: 'CAPTURE_DEFENDED', events: [] });
  }
  expect(key(pair[0]!.state)).toBe(key(pair[1]!.state));
  for (const p of pair) {
    // Black3 move+End expires Black source; White4 forced End restores Black capture availability.
    for (const command of [move(p.attacker, 'A11'), end, end])
      p.state = play(p.state, p.rules, command).state;
    expect(effects(p.state, p.rules)).toEqual([]);
    expect(
      queryLegalMainActions(p.state, p.rules).some(
        (m) => m.kind === 'capture' && m.targetId === p.bearer,
      ),
    ).toBe(true);
    const captured = play(p.state, p.rules, move(p.attacker, 'A15'));
    expect(
      captured.events.filter((e) => e.kind === 'capture_committed').map((e) => e.payload.pieceId),
    ).toEqual([p.bearer]);
    expect(captured.state.ap).toEqual({ white: 21, black: 22 });
    p.state = captured.state;
  }
  expect(pair.map((p) => queryLegalMainActions(p.state, p.rules))).toEqual([[], []]);
});

it('preserves exact source/key/ID/deadline after transfer, bearer movement, control fixture changes and clone', () => {
  const [p] = pairedReadyStates();
  const old = effects(p!.state, p!.rules)[0]!;
  const source = {
    sourcePlayer: 'white' as const,
    sourceVariant: 'guardian',
    sourceSkill: 'guardian.holy_shield',
    sourcePiece: null,
    sourceIncarnation: null,
  };
  const exactKey = effectSourceKey(p!.state.matchId, source);
  const transferred = resolveCommand(p!.state, input('synthetic.transfer', 'black'), p!.rules);
  if (!transferred.ok) throw new Error(transferred.code);
  expect(effects(transferred.state, p!.rules)).toEqual([
    { ...old, target: { kind: 'piece', pieceId: p!.attacker } },
  ]);
  expect(
    transferred.events.some((e) =>
      ['effect_applied', 'effect_refreshed', 'effect_removed'].includes(e.kind),
    ),
  ).toBe(false);
  const moved = play(transferred.state, p!.rules, move(p!.attacker, 'B12')).state;
  // SYNTHETIC_TEST_ONLY control/conversion fixture, not a new gameplay operation.
  const changed = GameStateSchema.parse({
    ...moved,
    board: createBoard(
      Object.values(moved.board.pieces).map((piece) =>
        piece.id === p!.attacker
          ? { ...piece, controller: 'white' as const, owner: 'white' as const }
          : piece,
      ),
    ),
  });
  const restored = cloneSnapshot(changed, p!.rules),
    now = effects(restored, p!.rules)[0]!;
  expect(now).toEqual({ ...old, target: { kind: 'piece', pieceId: p!.attacker } });
  const actualSource = captureEffectSource({
    sourcePlayer: now.sourcePlayer,
    sourceVariant: now.sourceVariant,
    sourceSkill: now.sourceSkill,
    sourcePiece: now.sourcePiece,
    sourceIncarnation: now.sourceIncarnation,
  });
  expect(actualSource).toEqual(source);
  expect(effectSourceKey(restored.matchId, actualSource)).toBe(exactKey);
  expect(effectAllowsAction(restored, p!.attacker as never, 'skill-target', p!.rules)).toBe(true);
  expect(queryLegalMainActions(restored, p!.rules).some((m) => m.pieceId === p!.attacker)).toBe(
    true,
  );
  expect(effects(p!.state, p!.rules)[0]).toEqual(old);
});

it('refreshes N2 from a later source boundary with stable identity under coherent allocation renaming', () => {
  const pair = pairedReadyStates();
  for (const p of pair) {
    const before = effects(p.state, p.rules)[0]!;
    p.state = play(play(p.state, p.rules, move(p.attacker, 'B12')).state, p.rules, end).state;
    const refreshed = resolveCommand(p.state, input('synthetic.recast'), p.rules);
    if (!refreshed.ok) throw new Error(refreshed.code);
    const current = effects(refreshed.state, p.rules)[0]!;
    expect(current).toMatchObject({
      id: before.id,
      appliedSequence: before.appliedSequence,
      timingAnchor: { side: 'white', boundary: 'end', ordinal: 2 },
      deadline: { side: 'white', boundary: 'end', ordinal: 4 },
      sourcePiece: null,
      sourceIncarnation: null,
    });
    p.state = play(refreshed.state, p.rules, end).state;
  }
  expect(key(pair[0]!.state)).toBe(key(pair[1]!.state));
});

it('keeps metadata/instances/context isolated and frozen while the definition-owned projector runs', () => {
  const definition = sourceDefinition(),
    originalProjector = definition.repetitionProjector;
  const rules = sourceRules([shield('bearer')], {
    ...definition,
    repetitionProjector: (e, c) => {
      expect(Object.isFrozen(e)).toBe(true);
      expect(Object.isFrozen(c)).toBe(true);
      expect(Object.isFrozen(c.target)).toBe(true);
      expect(Reflect.set(e, 'sourcePiece', 'attacker')).toBe(false);
      return originalProjector(e, c);
    },
  });
  definition.sourceAttribution.profile.sourceVariant = 'tampered-after-registration';
  const initial = game(rules),
    original = setup(initial, rules).state;
  const bytes = encodeSnapshot(original, rules.effectRegistry);
  const first = play(original, rules, end),
    second = play(original, rules, end);
  expect(first.events).toEqual(second.events);
  expect(fullStateHash(first.state, rules.effectRegistry)).toEqual(
    fullStateHash(second.state, rules.effectRegistry),
  );
  expect(encodeSnapshot(original, rules.effectRegistry)).toBe(bytes);
  const profile = rules.effectRegistry!.get('effect.shield').sourceAttribution.profile!;
  expect(profile.sourceVariant).toBe('guardian');
  expect(Reflect.set(profile, 'sourceSkill', 'tampered')).toBe(false);
  const restored = cloneSnapshot(first.state, rules);
  expect(effects(restored, rules)[0]!.payload).not.toBe(effects(first.state, rules)[0]!.payload);
});

it.each(['invalid-source', 'fault'] as const)(
  'rolls back root RNG/IDs/slots/effects/events after %s candidate work',
  (failure) => {
    const operations = [
      { kind: 'random' as const, side: 'actor' as const, namespace: 'synthetic', pool: ['a', 'b'] },
      shield(
        'bearer',
        'white',
        failure === 'invalid-source' ? { sourcePiece: 'attacker' as never } : {},
      ),
      ...(failure === 'fault' ? [{ kind: 'fail' as const, code: 'SYNTHETIC_PROFILE_FAULT' }] : []),
    ];
    const rules = sourceRules(operations),
      state = game(rules),
      before = encodeSnapshot(state, rules.effectRegistry);
    expect(resolveCommand(state, input(), rules)).toEqual({
      ok: false,
      code: failure === 'fault' ? 'SYNTHETIC_PROFILE_FAULT' : 'EFFECT_SOURCE_PROFILE_MISMATCH',
      events: [],
    });
    expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
  },
);

it('retains missing-runtime-binding and undeclared source-reference graph guards', () => {
  const base = sourceRules([shield('bearer')]);
  const missing = { ...base, effectRuntime: createEffectRuntime(base.effectRegistry!) };
  expect(resolveCommand(game(missing), input(), missing)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  const graph = sourceRules([
    shield('bearer', 'white', {
      references: [
        {
          role: 'unreviewed-caster',
          kind: 'piece',
          pieceId: 'retired' as never,
          presence: 'historical',
        },
      ],
    }),
  ]);
  expect(resolveCommand(game(graph), input(), graph)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
});

it('restores and replays matching/independent-source/expiry continuations with exact events and hashes', () => {
  for (const p of pairedReadyStates()) {
    const inputs = [
      input(),
      { authority: { kind: 'player', side: 'white' }, command: end },
      input('synthetic.recast', 'black'),
      { authority: { kind: 'player', side: 'black' }, command: move(p.attacker, 'B12') },
      { authority: { kind: 'player', side: 'white' }, command: end },
      { authority: { kind: 'player', side: 'black' }, command: move(p.attacker, 'A12') },
      { authority: { kind: 'player', side: 'black' }, command: end },
      { authority: { kind: 'player', side: 'white' }, command: end },
    ];
    let direct = p.state,
      restored = cloneSnapshot(p.state, p.rules);
    for (const raw of inputs.slice(2)) {
      const a = resolveCommand(direct, raw, p.rules),
        b = resolveCommand(restored, raw, p.rules);
      if (!a.ok || !b.ok) throw new Error('FIXTURE_CONTINUATION');
      expect(b.events).toEqual(a.events);
      expect(fullStateHash(b.state, p.rules.effectRegistry)).toEqual(
        fullStateHash(a.state, p.rules.effectRegistry),
      );
      direct = a.state;
      restored = b.state;
    }
    const replay = recordReplay(p.initial, inputs, p.rules);
    if (!replay.ok) throw new Error(replay.code);
    const executed = executeReplay(replay.archive, p.rules);
    if (!executed.ok) throw new Error(executed.code);
    expect(fullStateHash(executed.state, p.rules.effectRegistry)).toEqual(
      fullStateHash(direct, p.rules.effectRegistry),
    );
    expect(executed.events).toEqual(replay.archive.steps.flatMap((step) => step.events));
    expect(effects(executed.state, p.rules).map((e) => e.sourcePlayer)).toEqual(['black']);
    expect(() =>
      decodeSnapshot(encodeSnapshot(p.state, p.rules.effectRegistry), {
        ...p.rules,
        hash: 'different-ruleset',
      }),
    ).toThrow('RULESET_MISMATCH');
    expect(() =>
      decodeSnapshot(JSON.stringify({ ...p.state, engineVersion: '0.4.0' }), p.rules),
    ).toThrow();
    expect(p.state.engineVersion).toBe('0.6.0');
  }
});

it('keeps the pre-existing null-source effect projection unchanged under the current engine pin', () => {
  const definition = sourceDefinition();
  const { profile, ...priorSourceAttribution } = definition.sourceAttribution;
  expect(profile.kind).toBe('player-originated-v1');
  const guarded = sourceRules([shield('bearer')], definition, {}, 'guarded');
  const prior = sourceRules(
    [shield('bearer')],
    { ...definition, sourceAttribution: priorSourceAttribution },
    {},
    'prior-null-projection',
  );
  const newState = play(setup(game(guarded), guarded).state, guarded, end).state;
  const oldState = play(setup(game(prior), prior).state, prior, end).state;
  expect(key(newState)).toBe(key(oldState));
  expect(effects(newState, guarded)).toEqual(effects(oldState, prior));
  expect(newState.engineVersion).toBe('0.6.0');
});

it('canonicalizes omitted optional application refs while requiring explicit null in stored profile records', () => {
  const { sourceIncarnation, ...withoutIncarnation } = shield('bearer');
  expect(sourceIncarnation).toBe(null);
  const definition: EffectDefinition = {
    ...sourceDefinition(),
    typeId: 'fixture.null-source',
    stacking: { mode: 'independent', key: 'type-target' },
  };
  const rules = sourceRules(
    [{ ...withoutIncarnation, definitionId: definition.typeId }],
    definition,
  );
  const state = setup(game(rules), rules).state;
  expect(effects(state, rules)[0]!.sourceIncarnation).toBe(null);
  const raw = JSON.parse(encodeSnapshot(state, rules.effectRegistry));
  delete raw.effects[0].payload.instance.sourceIncarnation;
  expect(() => decodeSnapshot(JSON.stringify(raw), rules)).toThrow('EFFECT_SOURCE_NOT_CANONICAL');
});

it('preserves generic family/category distinctions under the opt-in source contract without an effect whitelist', () => {
  function familyKey(category: 'buff' | 'debuff') {
    // SYNTHETIC_TEST_ONLY family; not an alternative Holy Shield category/producer.
    const definition: EffectDefinition = {
      ...sourceDefinition('future.variant', 'future.skill'),
      typeId: 'fixture.future-family',
      category,
      family: { id: 'fixture.future-family', policy: 'unique-target-ignore' },
      stacking: { key: 'type-target', mode: 'ignore' },
    };
    const rules = sourceRules(
      [
        shield('bearer', 'white', {
          definitionId: definition.typeId,
          sourceVariant: 'future.variant',
          sourceSkill: 'future.skill',
        }),
      ],
      definition,
      {},
      category,
    );
    return key(play(setup(game(rules), rules).state, rules, end).state);
  }
  const buff = familyKey('buff'),
    debuff = familyKey('debuff');
  expect(buff).not.toBe(debuff);
  expect(JSON.parse(buff).effects[0]).toMatchObject({
    definitionId: 'fixture.future-family',
    family: { id: 'fixture.future-family', policy: 'unique-target-ignore' },
    category: 'buff',
  });
});

it('retains meaningful test-only listener ordering rather than erasing source order during projection', () => {
  function observed(reverse: boolean) {
    // Explicit synthetic observer only; actual Holy Shield has no newly approved trigger.
    const definition: EffectDefinition = {
      ...sourceDefinition(),
      capabilities: ['observe:marker'],
      triggers: [
        { id: 'listen', event: 'marker', stage: 'committed', handlerId: 'synthetic.observe' },
      ],
    };
    const sources = [shield('bearer'), shield('bearer', 'black')];
    const base = sourceRules(
      [...(reverse ? sources.reverse() : sources), { kind: 'marker', value: 'input' }],
      definition,
      {},
      reverse ? 'listener-reverse' : 'listener-forward',
    );
    const rules = {
      ...base,
      effectRuntime: createEffectRuntime(base.effectRegistry!, {
        ...base.effectRuntime,
        triggers: {
          'synthetic.observe': {
            mode: 'synthetic-v1',
            order: 0,
            react: (c) =>
              c.event.kind === 'marker' && c.event.payload.value === 'input'
                ? [{ kind: 'marker', value: c.instance.sourcePlayer }]
                : [],
          },
        },
      }),
    };
    const result = setup(game(rules), rules);
    return {
      markers: result.events.filter((e) => e.kind === 'marker').map((e) => e.payload.value),
      key: key(play(result.state, rules, end).state),
    };
  }
  const first = observed(false),
    reverse = observed(true);
  expect(first.markers).toEqual(['input', 'white', 'black']);
  expect(reverse.markers).toEqual(['input', 'black', 'white']);
  expect(first.key).not.toBe(reverse.key);
});

it.each([
  'variant',
  'skill',
  'caster',
  'incarnation',
  'missing-null',
  'definition-version',
  'cross-match-effect',
  'cross-match-group',
] as const)('rejects %s snapshot tampering under the pinned source declaration', (fault) => {
  const rules = sourceRules([shield('bearer')]),
    state = setup(game(rules), rules).state;
  const encoded = encodeSnapshot(state, rules.effectRegistry),
    raw = JSON.parse(encoded);
  const instance = raw.effects[0].payload.instance;
  switch (fault) {
    case 'variant':
      instance.sourceVariant = 'other';
      break;
    case 'skill':
      instance.sourceSkill = 'guardian.divine_shield';
      break;
    case 'caster':
      instance.sourcePiece = 'attacker';
      break;
    case 'incarnation':
      instance.sourcePiece = 'attacker';
      instance.sourceIncarnation = 'life.1';
      break;
    case 'missing-null':
      delete instance.sourceIncarnation;
      break;
    case 'definition-version':
      instance.definitionVersion = '9.0.0';
      break;
    case 'cross-match-effect':
      instance.id = 'another-match:operation:2';
      raw.effects[0].id = instance.id;
      break;
    case 'cross-match-group':
      instance.groupId = 'another-match:white:source-group';
      break;
  }
  expect(() => decodeSnapshot(JSON.stringify(raw), rules)).toThrow();
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(encoded);
});

it('retains the permanent Bomb incarnation gate without treating timed null-source proof as approval', () => {
  const rules = batchRuleset('5b-permanent-incarnation', {
    'synthetic.setup': [
      application('charge', 'bearer', {
        sourcePiece: 'attacker' as never,
        sourceIncarnation: 'life.1',
      }),
    ],
  });
  const state = game(rules),
    before = JSON.stringify(state);
  expect(resolveCommand(state, input(), rules)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_EFFECT_PARAMETERS',
    events: [],
  });
  expect(JSON.stringify(state)).toBe(before);
});
