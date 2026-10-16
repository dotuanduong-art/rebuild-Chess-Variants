import { expect, it } from 'vitest';
import type { GameState, PlayerSide, RootCommand } from '@variant-chess/shared-types';
import {
  BASE_RULESET_ID,
  createGame,
  createBoard,
  createEffectRegistry,
  createEffectRuntime,
  resolveCommand,
  createDelayedActionRegistry,
  decodeDelayedActions,
  recordReplay,
  executeReplay,
  encodeSnapshot,
  decodeSnapshot,
  encodeEffectRecords,
  decodeEffectRecords,
} from '../src/index.js';
import type { EffectDefinition, DerivedOperation, RulesetBundle, SkillPlan } from '../src/index.js';
import type { EffectTriggerHandler } from '../src/index.js';
import { piece } from './fixtures.js';

// Synthetic infrastructure policies only; no concrete gameplay priority/rewards.
const definition = (patch: Partial<EffectDefinition> = {}): EffectDefinition => ({
  typeId: 'test.observer',
  schemaVersion: '1.0.0',
  targets: ['player', 'piece'],
  category: 'neutral',
  sourceAttribution: { kind: 'preserve-source', requiredRefs: [] },
  ownership: { kind: 'target-owner' },
  kingEligibility: { kind: 'allowed' },
  lifetime: { kind: 'permanent' },
  stacking: { key: 'type-source-target', mode: 'independent' },
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
  visibility: { kind: 'internal' },
  capabilities: ['observe:marker'],
  triggers: [{ id: 'listen', event: 'marker', stage: 'committed', handlerId: 'observe' }],
  repetition: { projectionId: 'test.v1' },
  repetitionProjector: (e, c) => ({
    target: c.target,
    payload: e.payload,
    source: e.sourcePlayer,
    remaining: c.remainingLifetime,
  }),
  payloadSchema: { parse: (value) => value as null },
  ...patch,
});
const apply = (
  patch: Partial<Extract<DerivedOperation, { kind: 'effect_apply' }>> = {},
): DerivedOperation => ({
  kind: 'effect_apply',
  definitionId: 'test.observer',
  definitionVersion: '1.0.0',
  target: { kind: 'player', side: 'white' },
  sourcePlayer: 'actor',
  sourceVariant: null,
  sourceSkill: null,
  sourcePiece: null,
  payload: null,
  groupId: null,
  ...patch,
});
const input = (command: RootCommand, side: PlayerSide = 'white') => ({
  authority: { kind: 'player', side },
  command,
});
function run(
  state: GameState,
  rules: RulesetBundle,
  command: RootCommand = { kind: 'skill', skillId: 'cast' },
  side: PlayerSide = 'white',
) {
  const result = resolveCommand(state, input(command, side), rules);
  if (!result.ok) throw new Error(result.code);
  return result;
}
it('dispatches a declared observer once in a deterministic frozen source/owner context through root FIFO', () => {
  const registry = createEffectRegistry([definition()]);
  const rules: RulesetBundle = {
    ...BASE_RULESET_ID,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      triggers: {
        observe: {
          mode: 'synthetic-v1',
          order: 1,
          react: (context) => {
            expect(Object.isFrozen(context.state.board)).toBe(true);
            expect(context).toMatchObject({
              stage: 'committed',
              source: { player: 'white' },
              owner: 'white',
              controller: 'white',
            });
            expect(context.event.transactionId).toBe('m:transaction:1');
            return context.event.kind === 'marker' && context.event.payload.value === 'input'
              ? [{ kind: 'marker', value: 'observed' }]
              : [];
          },
        },
      },
    }),
    skills: { cast: { cost: 0, operations: [apply(), { kind: 'marker', value: 'input' }] } },
  };
  const state = createGame({ matchId: 'm', seed: 1, board: createBoard() }, rules);
  const result = run(state, rules);
  expect(result.events.filter((e) => e.kind === 'marker').map((e) => e.payload.value)).toEqual([
    'input',
    'observed',
  ]);
  expect(run(state, rules)).toEqual(result);
});

function bundle(
  def = definition(),
  handlers: Record<string, EffectTriggerHandler> = {},
  operations: readonly DerivedOperation[] = [apply(), { kind: 'marker', value: 'input' }],
): RulesetBundle & { skills: Record<string, SkillPlan> } {
  const registry = createEffectRegistry([def]);
  return {
    ...BASE_RULESET_ID,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, { triggers: handlers }),
    skills: { cast: { cost: 1, operations } },
  };
}
const game = (rules: RulesetBundle, pieces = createBoard()) =>
  createGame({ matchId: 'm', seed: 7, board: pieces, ap: { white: 10, black: 10 } }, rules);
const observer = (value: string, order = 0): EffectTriggerHandler => ({
  mode: 'synthetic-v1',
  order,
  react: (c) =>
    c.event.kind === 'marker' && c.event.payload.value === 'input'
      ? [{ kind: 'marker', value }]
      : [],
});

it('sorts handlers by explicit order then stable IDs independently of registration and visits each instance once', () => {
  const def = definition({
    triggers: [
      { id: 'late', event: 'marker', stage: 'committed', handlerId: 'z' },
      { id: 'second', event: 'marker', stage: 'committed', handlerId: 'b' },
      { id: 'first', event: 'marker', stage: 'committed', handlerId: 'a' },
    ],
  });
  const rules = bundle(
    def,
    { z: observer('last', 2), b: observer('second'), a: observer('first') },
    [apply(), apply({ sourcePlayer: 'black' }), { kind: 'marker', value: 'input' }],
  );
  const result = run(game(rules), rules);
  expect(result.events.filter((e) => e.kind === 'marker').map((e) => e.payload.value)).toEqual([
    'input',
    'first',
    'first',
    'second',
    'second',
    'last',
    'last',
  ]);
  const reversed = bundle(
    { ...def, triggers: [...def.triggers].reverse() },
    { a: observer('first'), b: observer('second'), z: observer('last', 2) },
    rules.skills!.cast!.operations,
  );
  expect(run(game(reversed), reversed)).toEqual(result);
});

it('rejects unknown, mismatched, undeclared capability and proposed triggers without executing a pre-death reaction', () => {
  for (const patch of [
    {
      triggers: [
        { id: 'x', event: 'before_capture', stage: 'proposed' as const, handlerId: 'observe' },
      ],
    },
    {
      triggers: [
        { id: 'x', event: 'unknown_fact', stage: 'committed' as const, handlerId: 'observe' },
      ],
    },
    { triggers: [{ id: 'x', event: 'marker', stage: 'removal' as const, handlerId: 'observe' }] },
    { capabilities: [] },
  ]) {
    const rules = bundle(definition(patch), { observe: observer('bad') });
    const state = game(rules);
    expect(resolveCommand(state, input({ kind: 'skill', skillId: 'cast' }), rules)).toMatchObject({
      ok: false,
      events: [],
    });
    expect(state.effects).toEqual([]);
  }
  const missing = bundle();
  expect(resolveCommand(game(missing), input({ kind: 'skill', skillId: 'cast' }), missing)).toEqual(
    { ok: false, code: 'UNSUPPORTED_RUNTIME', events: [] },
  );
});

it('rolls back unauthorized observer mutation including AP, IDs, history and events', () => {
  const rules = bundle(definition(), {
    observe: {
      mode: 'synthetic-v1',
      order: 0,
      react: (c) => {
        (c.state.ap as { white: number }).white = 999;
        return [];
      },
    },
  });
  const state = game(rules),
    before = JSON.stringify(state);
  expect(resolveCommand(state, input({ kind: 'skill', skillId: 'cast' }), rules)).toMatchObject({
    ok: false,
    events: [],
  });
  expect(JSON.stringify(state)).toBe(before);
});

it('rolls back derived RNG and failure and rejects observer cycles at the root budget', () => {
  for (const cycle of [false, true]) {
    const rules = bundle(definition(), {
      observe: {
        mode: 'synthetic-v1',
        order: 0,
        react: () =>
          cycle
            ? [{ kind: 'marker', value: 'cycle' }]
            : [
                { kind: 'random', side: 'actor', namespace: 'choice', pool: ['b', 'a'] },
                { kind: 'fail', code: 'OBSERVER_FAILED' },
              ],
      },
    });
    const state = game(rules),
      before = JSON.stringify(state);
    expect(
      resolveCommand(state, input({ kind: 'skill', skillId: 'cast' }), rules, {
        operationBudget: 15,
      }),
    ).toEqual({ ok: false, code: cycle ? 'RESOLUTION_LIMIT' : 'OBSERVER_FAILED', events: [] });
    expect(JSON.stringify(state)).toBe(before);
  }
});

it('observes only committed death and never pre-death; a King terminal suppresses all reactions', () => {
  const def = definition({
    capabilities: ['observe:capture_committed'],
    triggers: [{ id: 'death', event: 'capture_committed', stage: 'committed', handlerId: 'death' }],
  });
  const rules = bundle(
    def,
    {
      death: {
        mode: 'synthetic-v1',
        order: 0,
        react: (c) => {
          if (c.event.kind !== 'capture_committed') throw new Error('WRONG_STAGE');
          expect(c.state.board.pieces[c.event.payload.pieceId]).toBeUndefined();
          expect(c.lifecycle).toBe('death');
          return [{ kind: 'marker', value: 'after-death' }];
        },
      },
    },
    [apply()],
  );
  for (const king of [false, true]) {
    const state = run(
      game(
        rules,
        createBoard([piece('a', 'rook', 'A1'), piece('b', king ? 'king' : 'pawn', 'A2', 'black')]),
      ),
      rules,
    ).state;
    const result = run(state, rules, {
      kind: 'move',
      pieceId: 'a' as never,
      to: { file: 0, rankIndex: 1 },
    });
    expect(result.events.filter((e) => e.kind === 'marker').map((e) => e.payload.value)).toEqual(
      king ? [] : ['after-death'],
    );
    expect(result.state.ap).toEqual(king ? { white: 9, black: 10 } : { white: 11, black: 11 });
  }
});

it('distinguishes expiry and cleanup on the retired instance, source boundaries and application', () => {
  const declared = [
    { id: 'apply', event: 'effect_applied', stage: 'committed' as const, handlerId: 'life' },
    { id: 'remove', event: 'effect_removed', stage: 'removal' as const, handlerId: 'life' },
    { id: 'boundary', event: 'turn_started', stage: 'boundary' as const, handlerId: 'life' },
  ];
  const def = definition({
    lifetime: { kind: 'rounds', rounds: 1, boundary: 'end' },
    capabilities: declared.map((t) => `observe:${t.event}`),
    triggers: declared,
  });
  const rules = bundle(
    def,
    {
      life: {
        mode: 'synthetic-v1',
        order: 0,
        react: (c) => [{ kind: 'marker', value: c.lifecycle }],
      },
    },
    [apply()],
  );
  let state = run(game(rules), rules).state;
  state = run(state, rules, { kind: 'end' }).state;
  const start = run(state, rules, { kind: 'end' }, 'black');
  expect(start.events.filter((e) => e.kind === 'marker').map((e) => e.payload.value)).toEqual([
    'source-boundary',
  ]);
  const expired = run(start.state, rules, { kind: 'end' });
  expect(expired.events.filter((e) => e.kind === 'marker').map((e) => e.payload.value)).toEqual([
    'expiry',
  ]);
  const cleanup = bundle(def, rules.effectRuntime!.triggers!, [
    apply(),
    { kind: 'effect_remove', instanceId: 'm:operation:2', reason: 'cleansed' },
  ]);
  expect(
    run(game(cleanup), cleanup)
      .events.filter((e) => e.kind === 'marker')
      .map((e) => e.payload.value),
  ).toEqual(['application', 'cleanup']);
});

it('resolves future observer targets and owner/controller from the whole-set swap assignment', () => {
  const rules = bundle(
    definition(),
    {
      observe: {
        mode: 'synthetic-v1',
        order: 0,
        react: (c) =>
          c.event.kind === 'marker' && c.event.payload.value === 'input'
            ? [
                {
                  kind: 'marker',
                  value: `${c.instance.target.kind === 'piece' ? c.instance.target.pieceId : 'bad'}:${c.owner}:${c.controller}:${c.source.player}`,
                },
              ]
            : [],
      },
    },
    [
      apply({ target: { kind: 'piece', pieceId: 'a' as never } }),
      { kind: 'effect_sets_swap', pieceA: 'a' as never, pieceB: 'b' as never },
      { kind: 'marker', value: 'input' },
    ],
  );
  const state = game(
    rules,
    createBoard([piece('a', 'pawn', 'A1', 'black'), piece('b', 'pawn', 'B1', 'black', 'white')]),
  );
  expect(
    run(state, rules)
      .events.filter((e) => e.kind === 'marker')
      .map((e) => e.payload.value),
  ).toEqual(['input', 'b:white:black:white']);
});

it('preserves the triggering event as a delayed action cause within the same root transaction', () => {
  const rules: RulesetBundle = {
    ...bundle(definition(), {
      observe: {
        mode: 'synthetic-v1',
        order: 0,
        react: (c) =>
          c.event.kind === 'marker' && c.event.payload.value === 'input'
            ? [
                {
                  kind: 'delayed_schedule',
                  definitionId: 'later',
                  definitionVersion: '1.0.0',
                  target: null,
                  sourcePlayer: c.source.player,
                  sourceVariant: null,
                  sourceSkill: null,
                  sourcePiece: null,
                  dueBoundary: { side: c.source.player, boundary: 'end', ordinal: 2 },
                  payload: null,
                },
              ]
            : [],
      },
    }),
    delayedRegistry: createDelayedActionRegistry([
      {
        typeId: 'later',
        schemaVersion: '1.0.0',
        mode: 'synthetic-v1',
        sourcePolicy: 'snapshot',
        missingTarget: 'reject',
        cancellationReasons: [],
        payloadSchema: { parse: (value) => value as null },
        execute: () => [{ kind: 'marker', value: 'later' }],
        repetitionProjector: (action) => action.payload,
      },
    ]),
  };
  const result = run(game(rules), rules);
  const cause = result.events.find((e) => e.kind === 'marker' && e.payload.value === 'input')!;
  expect(
    decodeDelayedActions(result.state.delayedActions, rules.delayedRegistry!, result.state)[0],
  ).toMatchObject({ causeId: cause.id, transactionId: cause.transactionId });
});

it('rejects root-only intents returned as observer plans', () => {
  const rules = bundle(definition(), {
    observe: { mode: 'synthetic-v1', order: 0, react: () => [{ kind: 'end' } as never] },
  });
  expect(resolveCommand(game(rules), input({ kind: 'skill', skillId: 'cast' }), rules)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
});

it('restores and replays observer cascades with exact internal facts and no payload disclosure', () => {
  const rules = bundle(definition(), { observe: observer('observed') });
  const archive = recordReplay(
    game(rules),
    [input({ kind: 'skill', skillId: 'cast' }), input({ kind: 'end' })],
    rules,
  );
  if (!archive.ok) throw new Error(archive.code);
  const replay = executeReplay(archive.archive, rules);
  if (!replay.ok) throw new Error(replay.code);
  expect(replay.state).toEqual(archive.state);
  expect(replay.events).toEqual(archive.archive.steps.flatMap((step) => step.events));
  expect(replay.events.every((e) => e.visibility === 'internal')).toBe(true);
  expect(
    replay.events.filter((e) => e.kind === 'effect_applied').some((e) => 'payload' in e.payload),
  ).toBe(false);
  expect(decodeSnapshot(encodeSnapshot(archive.state, rules.effectRegistry), rules)).toEqual(
    archive.state,
  );
});

it('keeps relative listener order in action-ready repetition while ignoring consistent allocation renaming', () => {
  const rules = bundle(definition(), { observe: observer('observed') }, [
    apply({ payload: { value: 'A' } }),
    apply({ payload: { value: 'B' } }),
  ]);
  const seeded = run(game(rules), rules).state;
  const instances = decodeEffectRecords(seeded.effects, rules.effectRegistry!, seeded);
  const swapped = {
    ...seeded,
    effects: encodeEffectRecords(
      [
        { ...instances[0]!, payload: { value: 'B' } },
        { ...instances[1]!, payload: { value: 'A' } },
      ],
      rules.effectRegistry!,
      seeded,
    ),
  };
  const readyA = run(seeded, rules, { kind: 'end' }).state.history.repetition;
  const readyB = run(swapped, rules, { kind: 'end' }).state.history.repetition;
  expect(Object.keys(readyA).at(-1)).not.toBe(Object.keys(readyB).at(-1));
  const renamed = { ...seeded, counters: { ...seeded.counters, operation: 100 } };
  const renamedState = {
    ...renamed,
    effects: encodeEffectRecords(
      instances.map((e, index) => ({ ...e, id: `m:operation:${index + 90}` })),
      rules.effectRegistry!,
      renamed,
    ),
  };
  expect(
    Object.keys(run(renamedState, rules, { kind: 'end' }).state.history.repetition).at(-1),
  ).toBe(Object.keys(readyA).at(-1));
});
