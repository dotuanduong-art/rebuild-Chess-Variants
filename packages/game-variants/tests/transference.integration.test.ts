import { expect, it } from 'vitest';
import { SerializableValueSchema } from '@variant-chess/shared-types';
import {
  createEffectRegistry,
  createEffectRuntime,
  runtimeRepetitionProjection,
  resolveCommand,
  decodeEffectRecords,
  queryLegalMainActions,
  queryCaptureThreats,
  coordinateFromAlgebraic as at,
  encodeSnapshot,
  BOMB_CONSUMER_CONTRACTS,
  cloneSnapshot,
} from '@variant-chess/game-core';
import type { EffectDefinition, EffectInstance, RulesetBundle } from '@variant-chess/game-core';
import { createTransferenceExperimentalRuleset } from '../src/index.js';
import {
  attachment,
  transferenceGame,
  transfer,
  unit,
  run,
  finish,
} from './transference.fixture.js';

it('transferred independent Shields expire at their original source boundaries without reset', () => {
  const rules = createTransferenceExperimentalRuleset({ white: true, black: true });
  let state = run(
    transferenceGame(rules, [attachment('shield'), attachment('shield', 'ally', 'black')]),
    rules,
    transfer(),
  ).state;
  state = finish(state, rules);
  state = finish(state, rules);
  state = finish(state, rules);
  expect(state.effects).toHaveLength(2);
  state = finish(state, rules);
  const remaining = decodeEffectRecords(state.effects, rules.effectRegistry!, state);
  expect(remaining).toHaveLength(1);
  expect(remaining[0]!.sourcePlayer).toBe('white');
  expect(remaining[0]!.deadline).toEqual({ side: 'white', boundary: 'end', ordinal: 3 });
  state = finish(state, rules);
  expect(state.effects).toEqual([]);
});

it('validates linked final topology instead of weakening a declared reference contract', () => {
  const base = futureRules(),
    current = base.effectRegistry!.get('test-only.future');
  const definition: EffectDefinition = {
    ...current,
    links: { validationId: 'test-only.link', normalizationId: 'test-only.normalize' },
  };
  const registry = createEffectRegistry([
    ...base.effectRegistry!.definitions.filter((d) => d.typeId !== 'test-only.future'),
    definition,
  ]);
  const runtime = createEffectRuntime(registry, {
    ...base.effectRuntime,
    linkValidation: {
      'test-only.link': (e) =>
        e.target.kind === 'piece' &&
        e.references?.[0]?.kind === 'piece' &&
        e.target.pieceId === e.references[0].pieceId,
    },
    linkNormalization: {
      'test-only.normalize': (e, c) => ({
        group: null,
        references: (e.references ?? []).map((ref) =>
          ref.kind === 'piece' ? c.state.board.pieces[ref.pieceId]!.position : null,
        ),
      }),
    },
  });
  const rules = {
    ...base,
    effectRegistry: registry,
    effectRuntime: runtime,
    repetition: runtimeRepetitionProjection(runtime),
  };
  const initial = transferenceGame(rules, [
    {
      ...attachment('shield'),
      definitionId: 'test-only.future',
      references: [
        { kind: 'piece', role: 'fixed-endpoint', pieceId: 'ally' as never, presence: 'live' },
      ],
    },
  ]);
  expect(
    resolveCommand(
      initial,
      { authority: { kind: 'player', side: 'white' }, command: transfer() },
      rules,
    ),
  ).toEqual({ ok: false, code: 'EFFECT_LINK_INELIGIBLE', events: [] });
});

/** TRUSTED_TEST_ONLY future registration. No new producer or mixed skill factory. */
export function futureRules(): RulesetBundle {
  const base = createTransferenceExperimentalRuleset({ white: true, black: true });
  const shield = base.effectRegistry!.get('effect.shield');
  const definition: EffectDefinition = {
    ...shield,
    typeId: 'test-only.future',
    eligibility: { policyId: 'test-only.any-provenance' },
    payloadSchema: SerializableValueSchema,
    repetitionProjector: (e, c) => ({
      target: c.target,
      remaining: c.remainingLifetime,
      payload: e.payload,
      source: e.sourcePlayer,
    }),
  };
  const registry = createEffectRegistry([...base.effectRegistry!.definitions, definition]);
  const runtime = createEffectRuntime(registry, {
    ...base.effectRuntime,
    eligibility: { ...base.effectRuntime!.eligibility, 'test-only.any-provenance': () => true },
  });
  return {
    ...base,
    hash: 'trusted-test-only-transference-future',
    effectRegistry: registry,
    effectRuntime: runtime,
    repetition: runtimeRepetitionProjection(runtime),
  };
}

it('unchanged real producer swaps a custom registered future effect onto eligible summoned/special targets', () => {
  const rules = futureRules();
  const effect: EffectInstance = {
    ...attachment('shield'),
    definitionId: 'test-only.future',
    payload: { charge: 7, nested: ['preserved', { enabled: true }] },
  };
  const state = transferenceGame(rules, [effect], 4, [
    { ...unit('ally', 'rook', 'A4'), origin: 'summoned' },
    { ...unit('enemy', 'rook', 'O12', 'black'), origin: 'special' },
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ]);
  const result = resolveCommand(
    state,
    { authority: { kind: 'player', side: 'white' }, command: transfer() },
    rules,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error(result.code);
  expect(
    decodeEffectRecords(result.state.effects, rules.effectRegistry!, result.state)[0]!.target,
  ).toEqual({ kind: 'piece', pieceId: 'enemy' });
  expect(
    decodeEffectRecords(result.state.effects, rules.effectRegistry!, result.state)[0]!.payload,
  ).toEqual({ charge: 7, nested: ['preserved', { enabled: true }] });
});

it('swaps unequal complete sets, independent sources/deadlines and preserves every field except target', () => {
  const rules = createTransferenceExperimentalRuleset({ white: true, black: true });
  const state = transferenceGame(rules, [
    attachment('shield'),
    attachment('shield', 'ally', 'black'),
    attachment('charge'),
    attachment('stun', 'enemy', 'black'),
  ]);
  const before = decodeEffectRecords(state.effects, rules.effectRegistry!, state);
  const result = run(state, rules, transfer());
  const after = decodeEffectRecords(result.state.effects, rules.effectRegistry!, result.state);
  expect(after).toEqual(
    before.map((e) => ({
      ...e,
      target: {
        kind: 'piece',
        pieceId: e.target.kind === 'piece' && e.target.pieceId === 'ally' ? 'enemy' : 'ally',
      },
    })),
  );
  expect(result.state.board).toEqual(state.board);
  expect(
    result.events.filter((e) =>
      [
        'effect_applied',
        'effect_removed',
        'effect_refreshed',
        'bomb_exploded',
        'piece_destroyed',
        'move_committed',
        'capture_committed',
        'pieces_repositioned',
      ].includes(e.kind),
    ),
  ).toEqual([]);
  const fact = result.events.find((e) => e.kind === 'transference_committed');
  expect(fact?.payload).toEqual({
    source: {
      sourcePlayer: 'white',
      sourceVariant: 'turtle',
      sourceSkill: 'turtle.transference',
      sourcePiece: null,
      sourceIncarnation: null,
    },
    pieceA: 'ally',
    pieceB: 'enemy',
  });
});

it('new Stun bearer loses main movement and capture threat immediately', () => {
  const rules = createTransferenceExperimentalRuleset({ white: true, black: true });
  const pieces = [
    unit('ally', 'rook', 'A4'),
    unit('enemy', 'rook', 'A8', 'black'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ];
  const state = run(
    transferenceGame(rules, [attachment('stun', 'enemy', 'black')], 4, pieces),
    rules,
    transfer(),
  ).state;
  expect(queryLegalMainActions(state, rules).some((m) => m.pieceId === 'ally')).toBe(false);
  expect(queryCaptureThreats(state, 'white', rules).some((m) => m.pieceId === 'ally')).toBe(false);
  expect(
    resolveCommand(
      state,
      {
        authority: { kind: 'player', side: 'white' },
        command: { kind: 'move', pieceId: 'ally', to: at('A8') },
      },
      rules,
    ).ok,
  ).toBe(false);
});

it('new Shield bearer blocks a later capture atomically', () => {
  const rules = createTransferenceExperimentalRuleset({ white: true, black: true });
  const pieces = [
    unit('ally', 'rook', 'A4'),
    unit('enemy', 'rook', 'A8', 'black'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ];
  const state = run(transferenceGame(rules, undefined, 4, pieces), rules, transfer()).state;
  const before = encodeSnapshot(state, rules.effectRegistry);
  expect(
    resolveCommand(
      state,
      {
        authority: { kind: 'player', side: 'white' },
        command: { kind: 'move', pieceId: 'ally', to: at('A8') },
      },
      rules,
    ),
  ).toEqual({ ok: false, code: 'CAPTURE_DEFENDED', events: [] });
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
});

it('transferred Bomb explodes only on later actual committed death at new position with original attribution', () => {
  const rules = createTransferenceExperimentalRuleset({ white: true, black: true });
  const pieces = [
    unit('ally', 'rook', 'A4'),
    unit('enemy', 'rook', 'A8', 'black'),
    unit('bystander', 'pawn', 'B8'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ];
  const swap = run(
    transferenceGame(rules, [attachment('charge', 'ally', 'black')], 4, pieces),
    rules,
    transfer(),
  );
  expect(swap.events.some((e) => e.kind === 'bomb_exploded')).toBe(false);
  const destroyed = resolveCommand(
    swap.state,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'enemy' } },
    rules,
  );
  expect(destroyed.ok).toBe(true);
  if (!destroyed.ok) throw Error(destroyed.code);
  const blast = destroyed.events.find((e) => e.kind === 'bomb_exploded');
  expect(blast?.payload).toMatchObject({
    center: at('A8'),
    source: {
      sourcePlayer: 'black',
      sourceVariant: 'dynamite',
      sourceSkill: 'dynamite.live_charge',
    },
    targets: ['bystander'],
  });
  expect(destroyed.state.ap).toEqual({ white: 1, black: 7 });
});

it('real ordinary-only effect constraints reject an otherwise valid special destination before consumption', () => {
  const rules = createTransferenceExperimentalRuleset({ white: true, black: true });
  const pieces = [
    unit('ally', 'rook', 'A4'),
    { ...unit('enemy', 'rook', 'O12', 'black'), origin: 'special' as const },
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ];
  const state = transferenceGame(rules, undefined, 4, pieces),
    before = structuredClone(state);
  const result = resolveCommand(
    state,
    { authority: { kind: 'player', side: 'white' }, command: transfer() },
    rules,
  );
  expect(result.ok).toBe(false);
  expect(result.events).toEqual([]);
  expect(state).toEqual(before);
});

it.each(['missing-binding', 'dangling-reference', 'prohibited', 'origin-unknown'] as const)(
  'fails closed for %s, never filtering a difficult attachment',
  (scenario) => {
    const base = futureRules();
    const current = base.effectRegistry!.get('test-only.future');
    const definition: EffectDefinition =
      scenario === 'missing-binding'
        ? { ...current, relocation: { kind: 'retargetable', constraints: ['test-only.absent'] } }
        : scenario === 'prohibited'
          ? {
              ...current,
              relocation: { kind: 'prohibited-with-reason', reason: 'test-only.prohibited' },
            }
          : current;
    const registry = createEffectRegistry([
      ...base.effectRegistry!.definitions.filter((d) => d.typeId !== 'test-only.future'),
      definition,
    ]);
    const runtime = createEffectRuntime(registry, { ...base.effectRuntime });
    const rules = {
      ...base,
      effectRegistry: registry,
      effectRuntime: runtime,
      repetition: runtimeRepetitionProjection(runtime),
    };
    const state = structuredClone(
      transferenceGame(rules, [{ ...attachment('shield'), definitionId: 'test-only.future' }]),
    );
    if (scenario === 'dangling-reference') {
      const payload = state.effects[0]!.payload as { instance: Record<string, unknown> };
      payload.instance.references = [{ kind: 'effect', role: 'partner', instanceId: 'missing' }];
    }
    if (scenario === 'origin-unknown')
      Reflect.deleteProperty(state.board.pieces['enemy']!, 'origin');
    const before = structuredClone(state);
    const result = resolveCommand(
      state,
      { authority: { kind: 'player', side: 'white' }, command: transfer() },
      rules,
    );
    expect(result.ok).toBe(false);
    expect(result.events).toEqual([]);
    expect(state).toEqual(before);
  },
);

it('swaps a registered Mine attachment without a Landmine producer and enforces family uniqueness on import', () => {
  const base = createTransferenceExperimentalRuleset({ white: true, black: true });
  const charge = base.effectRegistry!.get('effect.bomb.charge');
  const mine: EffectDefinition = {
    ...charge,
    typeId: 'effect.bomb.mine',
    category: BOMB_CONSUMER_CONTRACTS.mine.category,
  };
  const registry = createEffectRegistry([...base.effectRegistry!.definitions, mine]);
  const runtime = createEffectRuntime(registry, { ...base.effectRuntime });
  const rules = {
    ...base,
    hash: 'trusted-test-only-mine-consumer',
    effectRegistry: registry,
    effectRuntime: runtime,
    repetition: runtimeRepetitionProjection(runtime),
  };
  const initial = transferenceGame(rules, [
    { ...attachment('charge'), definitionId: 'effect.bomb.mine' },
  ]);
  expect(run(initial, rules, transfer()).state.effects[0]!.payload).toMatchObject({
    instance: { definitionId: 'effect.bomb.mine', target: { kind: 'piece', pieceId: 'enemy' } },
  });
  const invalid = structuredClone(initial);
  invalid.effects.push({
    ...invalid.effects[0]!,
    id: 'transference:operation:2',
    definitionId: 'effect.bomb.charge',
    payload: JSON.parse(
      JSON.stringify({
        format: 'effect-instance-v1',
        instance: { ...attachment('charge'), id: 'transference:operation:2', appliedSequence: 0 },
      }),
    ),
  });
  invalid.counters.operation = 2;
  expect(() => cloneSnapshot(invalid, rules)).toThrow();
  expect(
    resolveCommand(
      invalid,
      { authority: { kind: 'player', side: 'white' }, command: transfer() },
      rules,
    ).ok,
  ).toBe(false);
});
