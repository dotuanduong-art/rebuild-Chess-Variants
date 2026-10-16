import { expect, it } from 'vitest';
import type { GameState, PlayerSide, RootCommand } from '@variant-chess/shared-types';
import {
  BASE_RULESET_ID,
  createGame,
  createBoard,
  createDelayedActionRegistry,
  resolveCommand,
  encodeSnapshot,
  decodeSnapshot,
  decodeDelayedActions,
  recordReplay,
  executeReplay,
  repetitionKey,
  delayedRepetitionProjection,
} from '../src/index.js';
import type { DelayedActionDefinition, DerivedOperation, RulesetBundle } from '../src/index.js';
import { piece } from './fixtures.js';

const definition = (patch: Partial<DelayedActionDefinition> = {}): DelayedActionDefinition => ({
  typeId: 'test.delayed',
  schemaVersion: '1.0.0',
  mode: 'synthetic-v1',
  sourcePolicy: 'snapshot',
  missingTarget: 'cancel',
  cancellationReasons: ['manual'],
  payloadSchema: {
    parse: (value) => {
      if (
        !value ||
        typeof value !== 'object' ||
        !('value' in value) ||
        typeof value.value !== 'string'
      )
        throw new Error('DELAY_PAYLOAD');
      return { value: value.value };
    },
  },
  execute: (context) => [
    { kind: 'marker', value: (context.action.payload as { value: string }).value },
  ],
  repetitionProjector: (action) => action.payload,
  ...patch,
});
const schedule = (
  patch: Partial<Extract<DerivedOperation, { kind: 'delayed_schedule' }>> = {},
): DerivedOperation => ({
  kind: 'delayed_schedule',
  definitionId: 'test.delayed',
  definitionVersion: '1.0.0',
  target: null,
  sourcePlayer: 'actor',
  sourceVariant: null,
  sourceSkill: 'cast',
  sourcePiece: null,
  dueBoundary: { side: 'white', boundary: 'start', ordinal: 2 },
  payload: { value: 'fired' },
  ...patch,
});
const bundle = (
  def = definition(),
  operations: readonly DerivedOperation[] = [schedule()],
): RulesetBundle => ({
  ...BASE_RULESET_ID,
  delayedRegistry: createDelayedActionRegistry([def]),
  skills: { cast: { cost: 1, operations } },
});
const input = (
  command: RootCommand = { kind: 'skill', skillId: 'cast' },
  side: PlayerSide = 'white',
) => ({ authority: { kind: 'player', side }, command });
const game = (rules: RulesetBundle) =>
  createGame({ matchId: 'm', seed: 4, board: createBoard(), ap: { white: 10, black: 10 } }, rules);
function run(state: GameState, rules: RulesetBundle, command?: RootCommand, side?: PlayerSide) {
  const result = resolveCommand(state, input(command, side), rules);
  if (!result.ok) throw new Error(result.code);
  return result;
}
it('persists a versioned deterministic action and fires once at its future source boundary via root FIFO', () => {
  const rules = bundle();
  const initial = game(rules);
  const scheduled = run(initial, rules);
  expect(scheduled.state.delayedActions[0]).toMatchObject({
    id: 'm:operation:2',
    definitionId: 'test.delayed',
    source: 'white',
    payload: {
      format: 'delayed-action-v1',
      action: {
        id: 'm:operation:2',
        definitionVersion: '1.0.0',
        status: 'scheduled',
        transactionId: 'm:transaction:1',
        causeId: 'm:operation:1',
        source: { player: 'white', controller: 'white', policy: 'snapshot' },
      },
    },
  });
  const ended = run(scheduled.state, rules, { kind: 'end' });
  expect(ended.events.some((e) => e.kind === 'delayed_action_fired')).toBe(false);
  const fired = run(ended.state, rules, { kind: 'end' }, 'black');
  expect(fired.events.filter((e) => e.kind === 'marker').map((e) => e.payload.value)).toEqual([
    'fired',
  ]);
  expect(fired.state.delayedActions).toEqual([]);
  expect(
    run(fired.state, rules, { kind: 'end' }).events.some((e) => e.kind === 'delayed_action_fired'),
  ).toBe(false);
  expect(run(initial, rules)).toEqual(scheduled);
});

it('rejects duplicate/unknown definitions and captures immutable registry bindings per ruleset', () => {
  const def = definition();
  expect(() => createDelayedActionRegistry([def, def])).toThrow('DUPLICATE_DELAYED_DEFINITION');
  const a = createDelayedActionRegistry([definition({ typeId: 'z' }), definition({ typeId: 'a' })]);
  expect(a.definitions.map((d) => d.typeId)).toEqual(['a', 'z']);
  expect(() => a.get('test.delayed')).toThrow('UNKNOWN_DELAYED_DEFINITION');
  const first = definition(),
    registry = createDelayedActionRegistry([first]);
  (first as { execute: DelayedActionDefinition['execute'] }).execute = () => [
    { kind: 'fail', code: 'BAD' },
  ];
  expect(registry.get('test.delayed').execute).not.toBe(first.execute);
  expect(Object.isFrozen(registry.get('test.delayed').cancellationReasons)).toBe(true);
  expect(() => createDelayedActionRegistry([definition({ execute: undefined as never })])).toThrow(
    'INVALID_DELAYED_DEFINITION',
  );
  expect(() =>
    createDelayedActionRegistry([definition({ missingTarget: 'guess' as never })]),
  ).toThrow();
});

it('requires explicit executor/version/policy and validates payload without coercion', () => {
  for (const op of [
    schedule({ definitionId: 'absent' }),
    schedule({ definitionVersion: '9.0.0' }),
    schedule({ payload: { value: 1 } }),
    schedule({ payload: { value: 'ok', extra: true } }),
  ]) {
    const rules = bundle(definition(), [op]),
      state = game(rules),
      before = JSON.stringify(state);
    expect(resolveCommand(state, input(), rules)).toMatchObject({ ok: false, events: [] });
    expect(JSON.stringify(state)).toBe(before);
  }
  const rules: RulesetBundle = { ...BASE_RULESET_ID, skills: bundle().skills! };
  expect(resolveCommand(game(rules), input(), rules)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  expect(
    resolveCommand(
      game(bundle()),
      { authority: { kind: 'player', side: 'white' }, command: schedule() },
      bundle(),
    ),
  ).toEqual({ ok: false, code: 'INVALID_COMMAND', events: [] });
});

it('rejects same/past deadlines, source-boundary mismatch and absent source/target references', () => {
  for (const op of [
    schedule({ dueBoundary: { side: 'white', boundary: 'end', ordinal: 1 } }),
    schedule({ dueBoundary: { side: 'white', boundary: 'start', ordinal: 0 } }),
    schedule({ dueBoundary: { side: 'black', boundary: 'start', ordinal: 2 } }),
    schedule({ sourcePiece: 'absent' as never }),
    schedule({ target: { kind: 'piece', pieceId: 'absent' as never } }),
  ]) {
    const rules = bundle(definition(), [op]);
    expect(resolveCommand(game(rules), input(), rules)).toMatchObject({ ok: false, events: [] });
  }
});

it('cancels only declared reasons idempotently without firing or invoking the executor', () => {
  const rules = bundle(
    definition({
      execute: () => {
        throw new Error('MUST_NOT_FIRE');
      },
    }),
    [
      schedule(),
      { kind: 'delayed_cancel', actionId: 'm:operation:2', reason: 'manual' },
      { kind: 'delayed_cancel', actionId: 'm:operation:2', reason: 'manual' },
    ],
  );
  const result = run(game(rules), rules);
  expect(result.state.delayedActions).toEqual([]);
  expect(result.events.filter((e) => e.kind === 'delayed_action_cancelled')).toHaveLength(1);
  const denied = bundle(definition(), [
    schedule(),
    { kind: 'delayed_cancel', actionId: 'm:operation:2', reason: 'cleanse' },
  ]);
  expect(resolveCommand(game(denied), input(), denied)).toEqual({
    ok: false,
    code: 'DELAYED_CANCELLATION_DENIED',
    events: [],
  });
});

it('applies explicit missing-target cancellation/rejection at fire without assuming caster-death cancellation', () => {
  for (const missingTarget of ['cancel', 'reject'] as const) {
    const rules = bundle(definition({ missingTarget }), [
      schedule({ target: { kind: 'piece', pieceId: 'p' as never }, sourcePiece: 'p' as never }),
      { kind: 'destroy', pieceId: 'p' },
    ]);
    const initial = createGame(
      {
        matchId: 'm',
        seed: 4,
        board: createBoard([piece('p', 'pawn', 'A1', 'black')]),
        ap: { white: 10, black: 10 },
      },
      rules,
    );
    const waiting = run(run(initial, rules).state, rules, { kind: 'end' }).state;
    const result = resolveCommand(waiting, input({ kind: 'end' }, 'black'), rules);
    if (missingTarget === 'reject')
      expect(result).toEqual({ ok: false, code: 'DELAYED_TARGET_MISSING', events: [] });
    else {
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('EXPECTED_SUCCESS');
      expect(result.state.delayedActions).toEqual([]);
      expect(result.events.find((e) => e.kind === 'delayed_action_cancelled')?.payload.reason).toBe(
        'missing-target',
      );
      expect(result.events.some((e) => e.kind === 'marker')).toBe(false);
    }
    expect(waiting.delayedActions).toHaveLength(1);
  }
});

it('keeps source controller snapshot after source death while executing a surviving target', () => {
  const rules = bundle(
    definition({
      execute: (c) => [
        {
          kind: 'marker',
          value: `${c.action.source.player}:${c.action.source.controller}:${c.state.board.pieces.p === undefined}`,
        },
      ],
    }),
    [schedule({ sourcePiece: 'p' as never }), { kind: 'destroy', pieceId: 'p' }],
  );
  const initial = createGame(
    {
      matchId: 'm',
      seed: 1,
      board: createBoard([piece('p', 'pawn', 'A1', 'black')]),
      ap: { white: 10, black: 10 },
    },
    rules,
  );
  const waiting = run(run(initial, rules).state, rules, { kind: 'end' }).state;
  expect(
    run(waiting, rules, { kind: 'end' }, 'black')
      .events.filter((e) => e.kind === 'marker')
      .map((e) => e.payload.value),
  ).toEqual(['white:black:true']);
});

it('fires tied deadlines in stable action order independent of record storage order', () => {
  const rules = bundle(definition(), [
    schedule({ payload: { value: 'first' } }),
    schedule({ payload: { value: 'second' } }),
  ]);
  const waiting = run(run(game(rules), rules).state, rules, { kind: 'end' }).state;
  const reversed = { ...waiting, delayedActions: [...waiting.delayedActions].reverse() };
  expect(
    run(reversed, rules, { kind: 'end' }, 'black')
      .events.filter((e) => e.kind === 'marker')
      .map((e) => e.payload.value),
  ).toEqual(['first', 'second']);
});

it('uses independent White/Black source boundaries and isolates mirror matches and registries', () => {
  const rules = bundle(definition(), [
    schedule({ payload: { value: 'white' } }),
    schedule({
      sourcePlayer: 'black',
      dueBoundary: { side: 'black', boundary: 'start', ordinal: 1 },
      payload: { value: 'black' },
    }),
  ]);
  const scheduled = run(game(rules), rules).state;
  const black = run(scheduled, rules, { kind: 'end' });
  expect(black.events.filter((e) => e.kind === 'marker').map((e) => e.payload.value)).toEqual([
    'black',
  ]);
  expect(black.state.delayedActions[0]?.source).toBe('white');
  expect(
    run(black.state, rules, { kind: 'end' }, 'black')
      .events.filter((e) => e.kind === 'marker')
      .map((e) => e.payload.value),
  ).toEqual(['white']);
  const other = bundle(definition({ schemaVersion: '2.0.0' }));
  expect(resolveCommand(scheduled, input({ kind: 'end' }), other)).toEqual({
    ok: false,
    code: 'DELAYED_VERSION_MISMATCH',
    events: [],
  });
  const foreign = createGame(
    { matchId: 'other', seed: 4, board: createBoard(), ap: { white: 10, black: 10 } },
    rules,
  );
  expect(run(foreign, rules).state.delayedActions[0]?.id).toBe('other:operation:2');
  expect(scheduled.delayedActions).toHaveLength(2);
});

it('round trips delayed records with a pinned registry and replays exactly once after snapshot restore', () => {
  const rules = bundle(),
    initial = game(rules),
    scheduled = run(initial, rules).state;
  const encoded = encodeSnapshot(scheduled, undefined, rules.delayedRegistry);
  expect(decodeSnapshot(encoded, rules)).toEqual(scheduled);
  expect(() => encodeSnapshot(scheduled)).toThrow('DELAYED_REGISTRY_REQUIRED');
  const archive = recordReplay(
    decodeSnapshot(encoded, rules),
    [input({ kind: 'end' }), input({ kind: 'end' }, 'black')],
    rules,
  );
  expect(archive.ok).toBe(true);
  if (!archive.ok) throw new Error(archive.code);
  const replay = executeReplay(archive.archive, rules);
  expect(replay.ok).toBe(true);
  if (!replay.ok) throw new Error(replay.code);
  expect(replay.state).toEqual(archive.state);
  expect(replay.events.filter((e) => e.kind === 'delayed_action_fired')).toHaveLength(1);
});

it('rejects duplicate identity, tampered envelopes, status, cause, policies and schema versions', () => {
  const rules = bundle(),
    scheduled = run(game(rules), rules).state;
  expect(() =>
    encodeSnapshot(
      { ...scheduled, delayedActions: [...scheduled.delayedActions, scheduled.delayedActions[0]!] },
      undefined,
      rules.delayedRegistry,
    ),
  ).toThrow('DUPLICATE_RULE_ID');
  for (const [field, value] of [
    ['definitionVersion', '2.0.0'],
    ['status', 'fired'],
    ['causeId', 'foreign:operation:2'],
    ['missingTarget', 'guess'],
    ['appliedSequence', 0],
    [
      'source',
      {
        player: 'black',
        controller: 'white',
        variant: null,
        skill: 'cast',
        piece: null,
        policy: 'snapshot',
      },
    ],
  ] as const) {
    const raw = JSON.parse(encodeSnapshot(scheduled, undefined, rules.delayedRegistry));
    raw.delayedActions[0].payload.action[field] = value;
    expect(() => decodeSnapshot(JSON.stringify(raw), rules)).toThrow();
  }
  const raw = JSON.parse(encodeSnapshot(scheduled, undefined, rules.delayedRegistry));
  raw.delayedActions[0].source = 'black';
  expect(() => decodeSnapshot(JSON.stringify(raw), rules)).toThrow('DELAYED_RECORD_MISMATCH');
});

it('isolates caller payloads, decoded payloads and frozen executor contexts', () => {
  const payload = { value: 'original' },
    rules = bundle(definition(), [schedule({ payload })]);
  const scheduled = run(game(rules), rules).state;
  payload.value = 'tampered';
  expect(
    decodeDelayedActions(scheduled.delayedActions, rules.delayedRegistry!, scheduled)[0]?.payload,
  ).toEqual({ value: 'original' });
  const mutable = bundle(
    definition({
      execute: (c) => {
        (c.action.payload as { value: string }).value = 'bad';
        return [];
      },
    }),
  );
  const waiting = run(scheduled, mutable, { kind: 'end' }).state;
  const before = JSON.stringify(waiting);
  expect(resolveCommand(waiting, input({ kind: 'end' }, 'black'), mutable)).toMatchObject({
    ok: false,
    events: [],
  });
  expect(JSON.stringify(waiting)).toBe(before);
});

it('rolls back delayed consumption, RNG/AP/turn/history/IDs and all facts on executor failure or overflow', () => {
  for (const overflow of [false, true]) {
    const rules = bundle(
      definition({
        execute: () =>
          overflow
            ? Array.from({ length: 30 }, () => ({ kind: 'marker' as const, value: 'overflow' }))
            : [
                { kind: 'random', side: 'actor', namespace: 'rng', pool: ['a', 'b'] },
                { kind: 'fail', code: 'DELAY_FAILED' },
              ],
      }),
    );
    const waiting = run(run(game(rules), rules).state, rules, { kind: 'end' }).state;
    const before = JSON.stringify(waiting);
    expect(
      resolveCommand(waiting, input({ kind: 'end' }, 'black'), rules, { operationBudget: 20 }),
    ).toEqual({ ok: false, code: overflow ? 'RESOLUTION_LIMIT' : 'DELAY_FAILED', events: [] });
    expect(JSON.stringify(waiting)).toBe(before);
  }
});

it('normalizes absolute deadlines and allocation IDs but preserves payload, source and relative delay in repetition', () => {
  const rules = bundle(definition(), [
    schedule({ dueBoundary: { side: 'white', boundary: 'end', ordinal: 3 } }),
  ]);
  const scheduled = run(game(rules), rules).state;
  const project = delayedRepetitionProjection(rules.delayedRegistry!);
  const shifted = JSON.parse(JSON.stringify(scheduled));
  shifted.turn.plyIndex = 2;
  shifted.turn.roundIndex = 2;
  shifted.counters.operation = 50;
  shifted.counters.transaction = 4;
  shifted.delayedActions[0].id = 'm:operation:50';
  shifted.delayedActions[0].deadline.ordinal = 4;
  Object.assign(shifted.delayedActions[0].payload.action, {
    id: 'm:operation:50',
    causeId: 'm:operation:50',
    transactionId: 'm:transaction:4',
    appliedSequence: 4,
    dueBoundary: { side: 'white', boundary: 'end', ordinal: 4 },
    scheduledAt: { side: 'white', boundary: 'end', ordinal: 2 },
  });
  expect(repetitionKey(shifted, project)).toBe(repetitionKey(scheduled, project));
  shifted.delayedActions[0].payload.action.payload.value = 'different';
  expect(repetitionKey(shifted, project)).not.toBe(repetitionKey(scheduled, project));
  const passed = run(
    run(scheduled, rules, { kind: 'end' }).state,
    rules,
    { kind: 'end' },
    'black',
  ).state;
  expect(repetitionKey(passed, project)).not.toBe(repetitionKey(scheduled, project));
});

it('rejects forged fire intents and imported overdue actions', () => {
  const forged = bundle(definition(), [
    {
      kind: 'delayed_fire',
      actionId: 'm:operation:2',
      boundary: { side: 'white', boundary: 'start', ordinal: 2 },
    } as never,
  ]);
  expect(resolveCommand(game(forged), input(), forged)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  const rules = bundle(),
    waiting = run(run(game(rules), rules).state, rules, { kind: 'end' }).state;
  const overdue = JSON.parse(JSON.stringify(waiting));
  overdue.delayedActions[0].payload.action.scheduledAt.ordinal = 0;
  overdue.delayedActions[0].payload.action.dueBoundary.ordinal = 1;
  overdue.delayedActions[0].deadline.ordinal = 1;
  expect(resolveCommand(overdue, input({ kind: 'end' }, 'black'), rules)).toEqual({
    ok: false,
    code: 'DELAYED_OVERDUE_STATE',
    events: [],
  });
});

it('does not fire pending delayed work or remaining plans after a King terminal', () => {
  const rules = bundle(
    definition({
      execute: () => {
        throw new Error('MUST_NOT_RUN');
      },
    }),
  );
  const initial = createGame(
    {
      matchId: 'm',
      seed: 1,
      board: createBoard([piece('a', 'rook', 'A1'), piece('king', 'king', 'A2', 'black')]),
      ap: { white: 10, black: 10 },
    },
    rules,
  );
  const scheduled = run(initial, rules).state;
  const terminal = run(scheduled, rules, {
    kind: 'move',
    pieceId: 'a' as never,
    to: { file: 0, rankIndex: 1 },
  });
  expect(terminal.state.terminal).toMatchObject({ status: 'won', reason: 'king_captured' });
  expect(terminal.events.some((e) => e.kind === 'delayed_action_fired')).toBe(false);
  expect(terminal.state.delayedActions).toHaveLength(1);
  expect(resolveCommand(terminal.state, input({ kind: 'end' }, 'black'), rules)).toEqual({
    ok: false,
    code: 'TERMINAL',
    events: [],
  });
});

it('rejects inherited source names instead of accepting a nonexistent piece', () => {
  const rules = bundle(definition(), [schedule({ sourcePiece: 'constructor' as never })]);
  expect(resolveCommand(game(rules), input(), rules)).toEqual({
    ok: false,
    code: 'DELAYED_SOURCE_MISSING',
    events: [],
  });
});

it('distinguishes tied delayed action order when it changes the eventual semantic outcome', () => {
  const rules: RulesetBundle = {
    ...bundle(
      definition({
        execute: (c) => [
          {
            kind: 'variant',
            side: 'white',
            namespace: 'choice',
            value: (c.action.payload as { value: string }).value,
          },
        ],
      }),
      [schedule({ payload: { value: 'A' } }), schedule({ payload: { value: 'B' } })],
    ),
    repetition: (state) => ({ effects: [], delayedActions: [], variantState: state.variantState }),
  };
  const first = run(game(rules), rules).state;
  const second = JSON.parse(JSON.stringify(first));
  second.delayedActions[0].payload.action.payload.value = 'B';
  second.delayedActions[1].payload.action.payload.value = 'A';
  const project = delayedRepetitionProjection(rules.delayedRegistry!, rules.repetition);
  expect(repetitionKey(first, project)).not.toBe(repetitionKey(second, project));
  const fire = (state: GameState) =>
    run(run(state, rules, { kind: 'end' }).state, rules, { kind: 'end' }, 'black').state
      .variantState.white.choice;
  expect(fire(first)).toBe('B');
  expect(fire(second)).toBe('A');
});

it('pins the integrated engine version and rejects earlier runtime archives without implicit migration', () => {
  const rules = bundle(),
    state = game(rules);
  expect(state.engineVersion).toBe('0.6.0');
  expect(() =>
    decodeSnapshot(JSON.stringify({ ...state, engineVersion: '0.1.0' }), rules),
  ).toThrow();
  const archived = recordReplay(state, [], rules);
  if (!archived.ok) throw new Error(archived.code);
  const old = JSON.parse(JSON.stringify(archived.archive));
  old.initialConfig.engineVersion = '0.1.0';
  expect(executeReplay(old, rules).ok).toBe(false);
});
