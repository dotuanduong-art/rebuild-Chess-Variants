import { expect, it } from 'vitest';
import type { GameState, PlayerSide, RootCommand } from '@variant-chess/shared-types';
import {
  BASE_RULESET_ID,
  createBoard,
  createGame,
  createEffectRegistry,
  createEffectRuntime,
  decodeEffectRecords,
  resolveCommand,
  collectDueEffects,
  createBoard as board,
  coordinateFromAlgebraic,
  encodeSnapshot,
  decodeSnapshot,
  recordReplay,
  executeReplay,
  encodeEffectRecords,
} from '../src/index.js';
import type { EffectDefinition, DerivedOperation, RulesetBundle } from '../src/index.js';
import { piece } from './fixtures.js';

// P00-02/08/11; all policies below are synthetic, not approval of concrete effects.
const definition = (overrides: Partial<EffectDefinition> = {}): EffectDefinition => ({
  typeId: 'synthetic.future',
  schemaVersion: '1.0.0',
  targets: ['player', 'piece', 'cell'],
  category: 'neutral',
  sourceAttribution: { kind: 'preserve-source', requiredRefs: ['skill'] },
  ownership: { kind: 'source-player' },
  kingEligibility: { kind: 'allowed' },
  lifetime: { kind: 'permanent' },
  stacking: { key: 'type-target', mode: 'independent' },
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
  visibility: { kind: 'source-player' },
  capabilities: [],
  triggers: [],
  repetition: { projectionId: 'synthetic.semantic-v1' },
  repetitionProjector: (effect, context) => ({
    payload: effect.payload,
    source: effect.sourcePlayer,
    target: context.target,
    remaining: context.remainingLifetime,
    group: context.group,
  }),
  payloadSchema: {
    parse(value: unknown) {
      if (
        !value ||
        typeof value !== 'object' ||
        !('level' in value) ||
        typeof value.level !== 'number' ||
        !Number.isSafeInteger(value.level)
      )
        throw new Error('LEVEL_PAYLOAD');
      return { level: value.level };
    },
  },
  ...overrides,
});
const apply = (
  patch: Partial<Extract<DerivedOperation, { kind: 'effect_apply' }>> = {},
): DerivedOperation => ({
  kind: 'effect_apply',
  definitionId: 'synthetic.future',
  definitionVersion: '1.0.0',
  target: { kind: 'player', side: 'white' },
  sourcePlayer: 'actor',
  sourceVariant: null,
  sourceSkill: 'cast',
  sourcePiece: null,
  payload: { level: 1 },
  groupId: null,
  ...patch,
});
const rules = (
  def = definition(),
  operations: readonly DerivedOperation[] = [apply()],
): RulesetBundle => {
  const registry = createEffectRegistry([def]);
  return {
    ...BASE_RULESET_ID,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry),
    skills: { cast: { cost: 1, operations } },
  };
};
const game = (bundle: RulesetBundle) =>
  createGame({ matchId: 'm', seed: 1, board: createBoard(), ap: { white: 10, black: 10 } }, bundle);
const command = (command: RootCommand, side: PlayerSide = 'white') => ({
  authority: { kind: 'player', side },
  command,
});
function run(
  state: GameState,
  bundle: RulesetBundle,
  input = command({ kind: 'skill', skillId: 'cast' }),
) {
  const result = resolveCommand(state, input, bundle);
  if (!result.ok) throw new Error(result.code);
  return result;
}
const effects = (state: GameState, bundle: RulesetBundle) =>
  decodeEffectRecords(state.effects, bundle.effectRegistry!, state);

it('applies a synthetic future effect through the trusted root with deterministic identity and internal facts', () => {
  const bundle = rules();
  const initial = game(bundle);
  const result = run(initial, bundle);
  expect(effects(result.state, bundle)[0]).toMatchObject({
    id: 'm:operation:2',
    appliedSequence: 1,
    sourcePlayer: 'white',
    sourceSkill: 'cast',
    target: { kind: 'player', side: 'white' },
    payload: { level: 1 },
  });
  expect(result.events.filter((event) => event.kind === 'effect_applied')).toHaveLength(1);
  expect(result.events.every((event) => event.visibility === 'internal')).toBe(true);
  expect(initial.effects).toEqual([]);
  expect(run(initial, bundle)).toEqual(result);
});

it('rejects invalid metadata/payload atomically and never exposes a direct client apply command', () => {
  for (const operation of [
    apply({ definitionId: 'missing' }),
    apply({ definitionVersion: '2.0.0' }),
    apply({ payload: { level: 'bad' } }),
    apply({ target: { kind: 'piece', pieceId: 'missing' as never } }),
  ]) {
    const bundle = rules(definition(), [operation]);
    const initial = game(bundle);
    const before = JSON.stringify(initial);
    const result = resolveCommand(initial, command({ kind: 'skill', skillId: 'cast' }), bundle);
    expect(result.ok).toBe(false);
    expect(result.events).toEqual([]);
    expect(JSON.stringify(initial)).toBe(before);
  }
  const bundle = rules();
  expect(
    resolveCommand(
      game(bundle),
      { authority: { kind: 'player', side: 'white' }, command: apply() },
      bundle,
    ),
  ).toEqual({ ok: false, code: 'INVALID_COMMAND', events: [] });
});

it('supports independent, ignore and replacement without conflating their facts or instance identities', () => {
  const operations = [apply(), apply({ payload: { level: 2 } })];
  const independent = rules(definition(), operations);
  const independentResult = run(game(independent), independent);
  expect(effects(independentResult.state, independent).map((effect) => effect.id)).toEqual([
    'm:operation:2',
    'm:operation:3',
  ]);
  const ignored = rules(
    definition({ stacking: { key: 'type-target', mode: 'ignore' } }),
    operations,
  );
  const ignoredResult = run(game(ignored), ignored);
  expect(effects(ignoredResult.state, ignored).map((effect) => effect.payload)).toEqual([
    { level: 1 },
  ]);
  expect(ignoredResult.events.filter((event) => event.kind === 'effect_applied')).toHaveLength(1);
  const replacement = rules(
    definition({ stacking: { key: 'type-target', mode: 'replace' } }),
    operations,
  );
  const result = run(game(replacement), replacement);
  expect(effects(result.state, replacement)[0]).toMatchObject({
    id: 'm:operation:3',
    payload: { level: 2 },
  });
  expect(
    result.events.filter((event) => event.kind.startsWith('effect_')).map((event) => event.kind),
  ).toEqual(['effect_applied', 'effect_removed', 'effect_applied']);
  expect(result.events.find((event) => event.kind === 'effect_removed')?.payload).toMatchObject({
    reason: 'replaced',
  });
});

it('refreshes stable identity with explicit source/payload preservation or replacement', () => {
  for (const keep of [true, false]) {
    const bundle = rules(
      definition({
        stacking: {
          key: 'type-target',
          mode: 'refresh',
          source: keep ? 'preserve' : 'replace',
          payload: keep ? 'preserve' : 'replace',
          deadline: 'replace',
          mergePolicyId: null,
        },
      }),
      [apply(), apply({ sourcePlayer: 'black', sourceSkill: 'second', payload: { level: 2 } })],
    );
    const result = run(game(bundle), bundle);
    expect(effects(result.state, bundle)).toHaveLength(1);
    expect(effects(result.state, bundle)[0]).toMatchObject({
      id: 'm:operation:2',
      sourcePlayer: keep ? 'white' : 'black',
      sourceSkill: keep ? 'cast' : 'second',
      payload: { level: keep ? 1 : 2 },
    });
    expect(
      result.events.filter((event) => event.kind.startsWith('effect_')).map((event) => event.kind),
    ).toEqual(['effect_applied', 'effect_refreshed']);
  }
});

it('resets or extends rounds without changing the old cast anchor implicitly', () => {
  for (const deadline of ['reset', 'extend'] as const) {
    const bundle = rules(
      definition({
        lifetime: { kind: 'rounds', rounds: 1, boundary: 'end' },
        stacking: {
          key: 'type-target',
          mode: 'refresh',
          source: 'preserve',
          payload: 'replace',
          deadline,
          mergePolicyId: null,
        },
      }),
      [apply(), apply({ payload: { level: 2 } })],
    );
    const result = run(game(bundle), bundle);
    expect(effects(result.state, bundle)[0]).toMatchObject({
      id: 'm:operation:2',
      timingAnchor: { side: 'white', boundary: 'end', ordinal: 1 },
      deadline: { side: 'white', boundary: 'end', ordinal: deadline === 'extend' ? 3 : 2 },
    });
  }
});

it('stacks instances in deterministic order and rejects declared cap overflow atomically', () => {
  const def = definition({
    stacking: {
      key: 'type-source-target',
      mode: 'stack',
      representation: 'instances',
      cap: 2,
      mergePolicyId: 'synthetic.incoming',
    },
  });
  const base = rules(def, [apply(), apply({ payload: { level: 2 } })]);
  const bundle = {
    ...base,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      mergePayload: {
        'synthetic.incoming': (_existing, incoming) => incoming.payload,
      },
    }),
  };
  const result = run(game(bundle), bundle);
  expect(effects(result.state, bundle).map((effect) => effect.id)).toEqual([
    'm:operation:2',
    'm:operation:3',
  ]);
  expect(
    result.events
      .filter((event) => event.kind === 'effect_stacked')
      .map((event) => event.payload.count),
  ).toEqual([2]);
  const overflow = {
    ...bundle,
    skills: { cast: { cost: 1, operations: [apply(), apply(), apply()] } },
  };
  const initial = game(overflow);
  expect(resolveCommand(initial, command({ kind: 'skill', skillId: 'cast' }), overflow)).toEqual({
    ok: false,
    code: 'EFFECT_STACK_LIMIT',
    events: [],
  });
  expect(initial.effects).toEqual([]);
  expect(initial.counters.operation).toBe(0);
});

it('cleanse/dispel are cleanup-only, emit distinct reasons, and repeated removal is idempotent', () => {
  for (const reason of ['cleansed', 'dispelled'] as const) {
    const bundle = rules(definition(), [
      apply(),
      { kind: 'effect_remove', instanceId: 'm:operation:2', reason },
      { kind: 'effect_remove', instanceId: 'm:operation:2', reason },
    ]);
    const initial = game(bundle);
    const result = run(initial, bundle);
    expect(result.state.effects).toEqual([]);
    expect(result.state.ap).toEqual({ white: 9, black: 10 });
    expect(
      result.events
        .filter((event) => event.kind === 'effect_removed')
        .map((event) => event.payload.reason),
    ).toEqual([reason]);
    expect(
      result.events.some(
        (event) => event.kind === 'piece_destroyed' || event.kind === 'capture_committed',
      ),
    ).toBe(false);
  }
});

it('expires end-1 at the next source end, not the cast end or opponent end (P00-02)', () => {
  const bundle = rules(definition({ lifetime: { kind: 'rounds', rounds: 1, boundary: 'end' } }));
  let state = run(game(bundle), bundle).state;
  const castEnd = run(state, bundle, command({ kind: 'end' }));
  expect(castEnd.state.effects).toHaveLength(1);
  state = run(castEnd.state, bundle, command({ kind: 'end' }, 'black')).state;
  expect(state.effects).toHaveLength(1);
  expect(
    collectDueEffects(effects(state, bundle), { side: 'black', boundary: 'end', ordinal: 2 }),
  ).toEqual([]);
  const expired = run(state, bundle, command({ kind: 'end' }));
  expect(expired.state.effects).toEqual([]);
  expect(
    expired.events
      .filter((event) => event.kind === 'effect_removed')
      .map((event) => event.payload.reason),
  ).toEqual(['expired']);
});

it('expires current-turn end windows before switching sides and rejects casts after that boundary closed', () => {
  const bundle = rules(definition({ lifetime: { kind: 'current-turn-window', boundary: 'end' } }));
  const applied = run(game(bundle), bundle);
  expect(run(applied.state, bundle, command({ kind: 'end' })).state.effects).toEqual([]);
  const late = {
    ...bundle,
    handlers: [
      {
        id: 'late',
        order: 0,
        react: (event: { kind: string }) => (event.kind === 'turn_ended' ? [apply()] : []),
      },
    ],
  };
  expect(resolveCommand(game(late), command({ kind: 'end' }), late)).toEqual({
    ok: false,
    code: 'EFFECT_WINDOW_CLOSED',
    events: [],
  });
});

it('cleans dead targets using pre-death attachments, preserves cell/player effects when source dies, and grants no removal reward', () => {
  const bundle = rules(definition(), [
    apply({ target: { kind: 'piece', pieceId: 'victim' as never } }),
    apply({ sourcePiece: 'victim' as never }),
    apply({
      target: { kind: 'cell', position: { file: 0, rankIndex: 0 } },
      sourcePiece: 'victim' as never,
    }),
  ]);
  const initial = createGame(
    {
      matchId: 'm',
      seed: 1,
      board: board([piece('victim', 'knight', 'A1')]),
      ap: { white: 10, black: 10 },
    },
    bundle,
  );
  const applied = run(initial, bundle);
  const result = resolveCommand(
    applied.state,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'victim' } },
    bundle,
  );
  if (!result.ok) throw new Error(result.code);
  expect(result.state.board.pieces['victim']).toBeUndefined();
  expect(effects(result.state, bundle).map((effect) => effect.target.kind)).toEqual([
    'player',
    'cell',
  ]);
  expect(result.state.ap).toEqual({ white: 11, black: 10 }); // cost -1, Knight owner loss reward +2 only
  expect(
    result.events
      .filter((event) => event.kind === 'effect_removed')
      .map((event) => event.payload.reason),
  ).toEqual(['target_destroyed']);
});

it('matches sources and groups explicitly and isolates mirrored producers in one match', () => {
  const bundle = rules(definition({ stacking: { key: 'type-source-target', mode: 'ignore' } }), [
    apply(),
    apply(),
    apply({ sourcePlayer: 'black', payload: { level: 2 } }),
  ]);
  expect(
    effects(run(game(bundle), bundle).state, bundle).map((effect) => effect.sourcePlayer),
  ).toEqual(['white', 'black']);
  const groupBase = rules(definition({ stacking: { key: 'explicit-group', mode: 'ignore' } }), [
    apply({ groupId: 'm:white:a' }),
    apply({ groupId: 'm:white:a' }),
    apply({ groupId: 'm:white:b' }),
  ]);
  const grouped = {
    ...groupBase,
    repetition: (state: GameState) => ({
      effects: state.effects,
      delayedActions: [],
      variantState: state.variantState,
    }),
  };
  expect(
    effects(run(game(grouped), grouped).state, grouped).map((effect) => effect.groupId),
  ).toEqual(['m:white:a', 'm:white:b']);
});

it('requires opt-in runtime and fails closed for delayed actions and unsupported effect policies/capabilities', () => {
  const supported = rules();
  const applied = run(game(supported), supported).state;
  const dataOnly = { ...supported };
  delete dataOnly.effectRuntime;
  expect(resolveCommand(applied, command({ kind: 'end' }), dataOnly)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  const delayed = {
    ...game(supported),
    delayedActions: [
      {
        id: 'delay',
        definitionId: 'future',
        source: 'white' as const,
        deadline: null,
        payload: null,
      },
    ],
  };
  expect(resolveCommand(delayed, command({ kind: 'skill', skillId: 'cast' }), supported)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  for (const overrides of [
    { capabilities: ['future.movement'] },
    {
      triggers: [
        { id: 'react', event: 'move_committed', stage: 'committed' as const, handlerId: 'future' },
      ],
    },
    { lifetime: { kind: 'progress' as const, policyId: 'future' } },
    {
      removal: {
        ...definition().removal,
        expired: { kind: 'declared-reaction' as const, policyId: 'future' },
      },
    },
  ]) {
    const bundle = rules(definition(overrides));
    expect(
      resolveCommand(game(bundle), command({ kind: 'skill', skillId: 'cast' }), bundle),
    ).toEqual({ ok: false, code: 'UNSUPPORTED_RUNTIME', events: [] });
  }
});

it('rolls back effects/AP/slots/ID/RNG/history and committed events after derived failure or queue overflow', () => {
  const base = rules(definition(), [
    apply(),
    { kind: 'random', side: 'actor', namespace: 'draw', pool: ['a', 'b'] },
    { kind: 'fail', code: 'SYNTHETIC_FAILURE' },
  ]);
  const initial = game(base);
  const before = JSON.stringify(initial);
  expect(resolveCommand(initial, command({ kind: 'skill', skillId: 'cast' }), base)).toEqual({
    ok: false,
    code: 'SYNTHETIC_FAILURE',
    events: [],
  });
  const overflow = { ...base, skills: { cast: { cost: 1, operations: [apply(), apply()] } } };
  expect(
    resolveCommand(initial, command({ kind: 'skill', skillId: 'cast' }), overflow, {
      operationBudget: 2,
    }),
  ).toEqual({ ok: false, code: 'RESOLUTION_LIMIT', events: [] });
  expect(JSON.stringify(initial)).toBe(before);
  expect(initial.counters).toEqual({
    transaction: 0,
    event: 0,
    operation: 0,
    snapshot: 1,
    piece: 0,
  });
  expect(initial.rng.cursor).toBe(0);
});

it('round-trips active runtime effects through snapshots and pinned replay', () => {
  const bundle = rules(definition({ lifetime: { kind: 'rounds', rounds: 2, boundary: 'start' } }));
  const initial = game(bundle);
  const applied = run(initial, bundle).state;
  const restored = decodeSnapshot(encodeSnapshot(applied, bundle.effectRegistry), bundle);
  expect(restored).toEqual(applied);
  expect(run(restored, bundle, command({ kind: 'end' }))).toEqual(
    run(applied, bundle, command({ kind: 'end' })),
  );
  const replay = recordReplay(
    initial,
    [command({ kind: 'skill', skillId: 'cast' }), command({ kind: 'end' })],
    bundle,
  );
  if (!replay.ok) throw new Error(replay.code);
  const result = executeReplay(replay.archive, bundle);
  if (!result.ok) throw new Error(result.code);
  expect(result.state).toEqual(replay.state);
});

it.each(['white', 'black'] as const)(
  'counts exactly N next source boundaries for %s, start/end and N=1/2/3',
  (source) => {
    for (const boundary of ['start', 'end'] as const)
      for (const rounds of [1, 2, 3]) {
        const bundle = rules(definition({ lifetime: { kind: 'rounds', rounds, boundary } }));
        let state = game(bundle);
        if (source === 'black') state = run(state, bundle, command({ kind: 'end' })).state;
        state = run(state, bundle, command({ kind: 'skill', skillId: 'cast' }, source)).state;
        const expectedTransitions = boundary === 'start' ? 2 * rounds : 2 * rounds + 1;
        for (let step = 1; step <= expectedTransitions; step++) {
          const result = run(state, bundle, command({ kind: 'end' }, state.turn.sideToAct));
          state = result.state;
          expect(state.effects.length, `${source}/${boundary}/${rounds}/transition${step}`).toBe(
            step === expectedTransitions ? 0 : 1,
          );
        }
      }
  },
);

it('snapshots a stable due order and does not tick for multiple casts or random operations', () => {
  const bundle = rules(definition({ lifetime: { kind: 'rounds', rounds: 1, boundary: 'end' } }), [
    apply(),
    apply(),
    { kind: 'random', side: 'actor', namespace: 'draw', pool: ['a', 'b'] },
  ]);
  const custom = {
    ...bundle,
    repetition: (state: GameState) => ({
      effects: [],
      delayedActions: [],
      variantState: state.variantState,
    }),
  };
  const applied = run(game(custom), custom).state;
  expect(effects(applied, custom).map((effect) => effect.deadline)).toEqual([
    { side: 'white', boundary: 'end', ordinal: 2 },
    { side: 'white', boundary: 'end', ordinal: 2 },
  ]);
  const reversed = [...effects(applied, custom)].reverse();
  expect(collectDueEffects(reversed, { side: 'white', boundary: 'end', ordinal: 2 })).toEqual([
    'm:operation:2',
    'm:operation:3',
  ]);
  expect(collectDueEffects(reversed, { side: 'white', boundary: 'end', ordinal: 1 })).toEqual([]);
});

it('validates declared eligibility through immutable bindings, with King policies applied only to Kings', () => {
  const base = rules(
    definition({ kingEligibility: { kind: 'declared', policyId: 'synthetic.king' } }),
  );
  const bundle = {
    ...base,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      eligibility: { 'synthetic.king': () => false },
    }),
  };
  expect(run(game(bundle), bundle).state.effects).toHaveLength(1); // player target is not a King
  const kingBundle = {
    ...bundle,
    skills: {
      cast: {
        cost: 1,
        operations: [apply({ target: { kind: 'piece', pieceId: 'king' as never } })],
      },
    },
  };
  const initial = createGame(
    {
      matchId: 'm',
      seed: 1,
      board: board([piece('king', 'king', 'A1')]),
      ap: { white: 10, black: 10 },
    },
    kingBundle,
  );
  expect(resolveCommand(initial, command({ kind: 'skill', skillId: 'cast' }), kingBundle)).toEqual({
    ok: false,
    code: 'EFFECT_INELIGIBLE',
    events: [],
  });
  const missing = rules(definition({ eligibility: { policyId: 'unbound' } }));
  expect(
    resolveCommand(game(missing), command({ kind: 'skill', skillId: 'cast' }), missing),
  ).toEqual({ ok: false, code: 'UNSUPPORTED_RUNTIME', events: [] });
});

it('allows explicit permanent refresh source replacement while preserving the null deadline', () => {
  const bundle = rules(
    definition({
      stacking: {
        key: 'type-target',
        mode: 'refresh',
        payload: 'replace',
        source: 'replace',
        deadline: 'preserve',
        mergePolicyId: null,
      },
    }),
    [apply(), apply({ sourcePlayer: 'black' })],
  );
  expect(effects(run(game(bundle), bundle).state, bundle)[0]).toMatchObject({
    sourcePlayer: 'black',
    deadline: null,
    timingAnchor: { side: 'black', boundary: 'start', ordinal: 0 },
  });
});

it('cleans terminal attachments without rewarding removal or dispatching post-terminal reactions', () => {
  const bundle = rules(definition(), [
    apply({ target: { kind: 'piece', pieceId: 'king' as never } }),
    apply(),
  ]);
  const initial = createGame(
    {
      matchId: 'm',
      seed: 1,
      board: board([piece('rook', 'rook', 'A1'), piece('king', 'king', 'A3', 'black')]),
      ap: { white: 10, black: 10 },
    },
    bundle,
  );
  const applied = run(initial, bundle).state;
  const result = run(
    applied,
    bundle,
    command({ kind: 'move', pieceId: 'rook' as never, to: coordinateFromAlgebraic('A3') }),
  );
  expect(result.state.effects).toEqual([]);
  expect(result.state.ap).toEqual({ white: 9, black: 10 });
  expect(
    result.events
      .filter((event) => event.kind === 'effect_removed')
      .map((event) => event.payload.reason),
  ).toEqual(['target_destroyed', 'match_terminal']);
  expect(result.state.terminal).toMatchObject({ status: 'won', winner: 'white' });
});

it('refreshes reset/extend across turns using explicit preserved-source anchors', () => {
  for (const deadline of ['reset', 'extend'] as const) {
    const bundle = rules(
      definition({
        lifetime: { kind: 'rounds', rounds: 3, boundary: 'end' },
        stacking: {
          key: 'type-target',
          mode: 'refresh',
          source: 'preserve',
          payload: 'replace',
          deadline,
          mergePolicyId: null,
        },
      }),
    );
    let state = run(game(bundle), bundle).state;
    state = run(state, bundle, command({ kind: 'end' })).state;
    state = run(state, bundle, command({ kind: 'end' }, 'black')).state;
    const refreshed = run(state, bundle).state;
    expect(effects(refreshed, bundle)[0]).toMatchObject({
      id: 'm:operation:2',
      sourcePlayer: 'white',
      deadline: { side: 'white', boundary: 'end', ordinal: deadline === 'reset' ? 5 : 7 },
      timingAnchor: { side: 'white', boundary: 'end', ordinal: deadline === 'reset' ? 2 : 1 },
    });
    expect(decodeSnapshot(encodeSnapshot(refreshed, bundle.effectRegistry), bundle)).toEqual(
      refreshed,
    );
  }
});

it('runs declared payload merges on frozen inputs and validates the resulting payload', () => {
  const def = definition({
    stacking: {
      key: 'type-target',
      mode: 'refresh',
      source: 'preserve',
      payload: 'declared',
      deadline: 'preserve',
      mergePolicyId: 'synthetic.sum',
    },
  });
  const base = rules(def, [apply(), apply({ payload: { level: 2 } })]);
  const bundle = {
    ...base,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      mergePayload: {
        'synthetic.sum': (existing, incoming) => {
          expect(Object.isFrozen(existing[0]!.payload)).toBe(true);
          expect(Reflect.set(existing[0]!.payload as object, 'level', 99)).toBe(false);
          return {
            level:
              (existing[0]!.payload as { level: number }).level +
              (incoming.payload as { level: number }).level,
          };
        },
      },
    }),
  };
  expect(effects(run(game(bundle), bundle).state, bundle)[0]?.payload).toEqual({ level: 3 });
  const invalid = {
    ...bundle,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      mergePayload: {
        'synthetic.sum': () => ({ level: 'invalid' }),
      },
    }),
  };
  expect(
    resolveCommand(game(invalid), command({ kind: 'skill', skillId: 'cast' }), invalid),
  ).toEqual({ ok: false, code: 'LEVEL_PAYLOAD', events: [] });
});

it('rejects a preserved timed deadline across source replacement rather than changing source expiry silently', () => {
  const bundle = rules(
    definition({
      lifetime: { kind: 'rounds', rounds: 2, boundary: 'end' },
      stacking: {
        key: 'type-target',
        mode: 'refresh',
        source: 'replace',
        payload: 'replace',
        deadline: 'preserve',
        mergePolicyId: null,
      },
    }),
    [apply(), apply({ sourcePlayer: 'black' })],
  );
  expect(resolveCommand(game(bundle), command({ kind: 'skill', skillId: 'cast' }), bundle)).toEqual(
    { ok: false, code: 'EFFECT_REFRESH_TIMING', events: [] },
  );
});

it('rolls back expiration and its IDs/events/history when the boundary queue exceeds budget', () => {
  const bundle = rules(definition({ lifetime: { kind: 'rounds', rounds: 1, boundary: 'end' } }));
  let state = run(game(bundle), bundle).state;
  state = run(state, bundle, command({ kind: 'end' })).state;
  state = run(state, bundle, command({ kind: 'end' }, 'black')).state;
  const before = encodeSnapshot(state, bundle.effectRegistry);
  expect(resolveCommand(state, command({ kind: 'end' }), bundle, { operationBudget: 3 })).toEqual({
    ok: false,
    code: 'RESOLUTION_LIMIT',
    events: [],
  });
  expect(encodeSnapshot(state, bundle.effectRegistry)).toBe(before);
  expect(run(state, bundle, command({ kind: 'end' })).state.effects).toEqual([]);
});

it('keeps effect repetition independent of allocation noise and includes relative duration/payload', () => {
  const bundle = rules(definition({ lifetime: { kind: 'rounds', rounds: 2, boundary: 'end' } }));
  const applied = run(game(bundle), bundle).state;
  const noisy = {
    ...game(bundle),
    counters: { ...game(bundle).counters, operation: 20, event: 20 },
  };
  const other = run(noisy, bundle).state;
  const a = run(applied, bundle, command({ kind: 'end' })).state;
  const b = run(other, bundle, command({ kind: 'end' })).state;
  const keysA = Object.keys(a.history.repetition);
  expect(Object.keys(b.history.repetition)).toEqual(keysA);
  expect(effects(a, bundle)[0]?.id).not.toBe(effects(b, bundle)[0]?.id);
});

it('revalidates declared eligibility after payload merging rather than approving only the incoming payload', () => {
  const base = rules(
    definition({
      eligibility: { policyId: 'synthetic.max2' },
      stacking: {
        key: 'type-target',
        mode: 'refresh',
        payload: 'declared',
        source: 'preserve',
        deadline: 'preserve',
        mergePolicyId: 'synthetic.sum',
      },
    }),
    [apply(), apply({ payload: { level: 2 } })],
  );
  const bundle = {
    ...base,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      eligibility: {
        'synthetic.max2': (effect, state) => {
          expect(Object.isFrozen(state.ap)).toBe(true);
          return (effect.payload as { level: number }).level <= 2;
        },
      },
      mergePayload: {
        'synthetic.sum': (old, incoming) => ({
          level:
            (old[0]!.payload as { level: number }).level +
            (incoming.payload as { level: number }).level,
        }),
      },
    }),
  };
  expect(resolveCommand(game(bundle), command({ kind: 'skill', skillId: 'cast' }), bundle)).toEqual(
    { ok: false, code: 'EFFECT_INELIGIBLE', events: [] },
  );
});

it('rejects forged scheduler expiry intents supplied by a trusted skill planner', () => {
  const bundle = rules(definition({ lifetime: { kind: 'rounds', rounds: 3, boundary: 'end' } }), [
    apply(),
    {
      kind: 'effect_expire',
      instanceId: 'm:operation:2',
      boundary: { side: 'white', boundary: 'end', ordinal: 4 },
    } as never,
  ]);
  expect(resolveCommand(game(bundle), command({ kind: 'skill', skillId: 'cast' }), bundle)).toEqual(
    { ok: false, code: 'UNSUPPORTED_RUNTIME', events: [] },
  );
});

it('rejects imported active stacks that exceed the declared cap before executing a command', () => {
  const base = rules(
    definition({
      stacking: {
        key: 'type-target',
        mode: 'stack',
        representation: 'instances',
        cap: 1,
        mergePolicyId: 'synthetic.incoming',
      },
    }),
  );
  const bundle = {
    ...base,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      mergePayload: { 'synthetic.incoming': (_existing, incoming) => incoming.payload },
    }),
  };
  const initial = run(game(bundle), bundle).state;
  const existing = effects(initial, bundle)[0]!;
  const imported = { ...initial, counters: { ...initial.counters, operation: 100 } };
  const invalid = {
    ...imported,
    effects: encodeEffectRecords(
      [existing, { ...existing, id: 'm:operation:100' }],
      bundle.effectRegistry!,
      imported,
    ),
  };
  expect(resolveCommand(invalid, command({ kind: 'end' }), bundle)).toEqual({
    ok: false,
    code: 'EFFECT_STACK_LIMIT',
    events: [],
  });
});

it('retains fail-closed repetition for opaque variant state without a supplied semantic contract', () => {
  const bundle = rules(definition(), [
    apply(),
    { kind: 'variant', side: 'actor', namespace: 'opaque', value: { unspecifiedCounter: 2 } },
  ]);
  const applied = run(game(bundle), bundle).state;
  expect(resolveCommand(applied, command({ kind: 'end' }), bundle)).toEqual({
    ok: false,
    code: 'REPETITION_SEMANTICS_REQUIRED',
    events: [],
  });
});

it('rejects stale expiry and future cast anchors in imported executable state', () => {
  const bundle = rules(definition({ lifetime: { kind: 'rounds', rounds: 1, boundary: 'end' } }));
  let state = run(game(bundle), bundle).state;
  state = run(state, bundle, command({ kind: 'end' })).state;
  state = run(state, bundle, command({ kind: 'end' }, 'black')).state;
  const existing = effects(state, bundle)[0]!;
  for (const [anchor, expiry, code] of [
    [0, 1, 'EFFECT_EXPIRED_STATE'],
    [3, 4, 'EFFECT_ANCHOR_FUTURE'],
  ] as const) {
    const record = {
      ...existing,
      timingAnchor: { side: 'white', boundary: 'end', ordinal: anchor },
      deadline: { side: 'white', boundary: 'end', ordinal: expiry },
    };
    const imported = {
      ...state,
      effects: encodeEffectRecords([record], bundle.effectRegistry!, state),
    };
    const result = resolveCommand(imported, command({ kind: 'end' }), bundle);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(code);
    expect(result.events).toEqual([]);
  }
});
