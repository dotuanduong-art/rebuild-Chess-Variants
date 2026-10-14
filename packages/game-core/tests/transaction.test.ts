import { expect, it } from 'vitest';
import {
  createGame,
  resolveCommand,
  createBoard,
  coordinateFromAlgebraic,
  BASE_RULESET_ID,
} from '../src/index.js';
import { piece } from './fixtures.js';
it('malformed JSON state returns structured rejection instead of throwing before transaction guard', () => {
  const state = structuredClone(createGame({ matchId: 'm', seed: 1, board: createBoard() }));
  Object.defineProperty(state.board.cells, Symbol('not-json'), { value: () => 1 });
  expect(
    resolveCommand(state, {
      authority: { kind: 'player', side: 'white' },
      command: { kind: 'end' },
    }),
  ).toEqual({ ok: false, code: 'INVARIANT', events: [] });
});
import type { RulesetBundle } from '../src/index.js';

const player = (command: unknown, side = 'white') => ({
  authority: { kind: 'player', side },
  command,
});
const captureState = () =>
  createGame({
    matchId: 'm',
    seed: 1,
    board: createBoard([
      piece('r', 'rook', 'A1', 'white', 'black'),
      piece('v', 'knight', 'A3', 'black', 'white'),
      piece('other', 'bishop', 'A5', 'black'),
    ]),
  });

it('successful redirect commits only the revalidated victim and supports trusted system destruction', () => {
  const state = createGame({
    matchId: 'm',
    seed: 1,
    board: createBoard([
      piece('r', 'rook', 'A1'),
      piece('v', 'knight', 'A3', 'black'),
      piece('other', 'pawn', 'B1', 'black'),
    ]),
  });
  const rules: RulesetBundle = {
    ...BASE_RULESET_ID,
    interceptors: [
      { id: 'test', order: 0, intercept: () => ({ kind: 'redirect', targetId: 'other' }) },
    ],
  };
  const result = resolveCommand(
    state,
    player({ kind: 'move', pieceId: 'r', to: coordinateFromAlgebraic('A3') }),
    rules,
  );
  if (!result.ok) throw new Error(result.code);
  expect(result.state.board.pieces['v']).toBeDefined();
  expect(result.state.board.pieces['other']).toBeUndefined();
  expect(result.state.board.pieces['r']?.position).toEqual({ file: 1, rankIndex: 0 });
  expect(result.state.ap).toEqual({ white: 2, black: 1 });
  const destroyed = resolveCommand(state, {
    authority: { kind: 'system' },
    command: { kind: 'destroy', pieceId: 'v' },
  });
  if (!destroyed.ok) throw new Error(destroyed.code);
  expect(destroyed.state.ap).toEqual({ white: 0, black: 2 });
  expect(destroyed.state.turn).toEqual(state.turn);
});

it('mirror namespaces remain isolated, and accepted random execution is reproducible', () => {
  const initial = createGame({ matchId: 'mirror', seed: 1, board: createBoard() });
  const rules: RulesetBundle = {
    ...BASE_RULESET_ID,
    repetition: (state) => ({ effects: [], delayedActions: [], variantState: state.variantState }),
    skills: {
      test: {
        cost: 0,
        operations: [{ kind: 'random', side: 'actor', namespace: 'mirror', pool: ['z', 'a', 'b'] }],
      },
    },
  };
  const first = resolveCommand(initial, player({ kind: 'skill', skillId: 'test' }), rules);
  if (!first.ok) throw new Error(first.code);
  // First draw 270369: (270369 - 1) = 90122*3 + 2, so canonical [a,b,z] selects z.
  expect(first.state.variantState.white).toEqual({ mirror: 'z' });
  expect(first.state.variantState.black).toEqual({});
  expect(first.state.rng.cursor).toBe(1);
  expect(resolveCommand(initial, player({ kind: 'skill', skillId: 'test' }), rules)).toEqual(first);
  expect(initial.variantState.white).toEqual({});
  const ended = resolveCommand(first.state, player({ kind: 'end' }), rules);
  if (!ended.ok) throw new Error(ended.code);
  const black = resolveCommand(
    ended.state,
    player({ kind: 'skill', skillId: 'test' }, 'black'),
    rules,
  );
  if (!black.ok) throw new Error(black.code);
  expect(black.state.variantState).toEqual({ white: { mirror: 'z' }, black: { mirror: 'a' } });
});

it('synthetic pre-death cancel rolls back and redirect revalidates movement before committed rewards', () => {
  const state = captureState();
  const input = player({ kind: 'move', pieceId: 'r', to: coordinateFromAlgebraic('A3') });
  const cancel: RulesetBundle = {
    ...BASE_RULESET_ID,
    interceptors: [{ id: 'cancel', order: 0, intercept: () => ({ kind: 'cancel' }) }],
  };
  expect(resolveCommand(state, input, cancel)).toEqual({
    ok: false,
    code: 'CAPTURE_CANCELED',
    events: [],
  });
  const redirect: RulesetBundle = {
    ...BASE_RULESET_ID,
    interceptors: [
      { id: 'redirect', order: 0, intercept: () => ({ kind: 'redirect', targetId: 'other' }) },
    ],
  };
  // A3 blocks redirect to A5, so the whole operation fails rather than silently teleporting.
  expect(resolveCommand(state, input, redirect).ok).toBe(false);
  const near = {
    ...BASE_RULESET_ID,
    interceptors: [
      { id: 'same', order: 0, intercept: () => ({ kind: 'redirect' as const, targetId: 'v' }) },
    ],
  };
  const result = resolveCommand(state, input, near);
  if (!result.ok) throw new Error(result.code);
  expect(result.state.ap).toEqual({ white: 5, black: 0 });
  expect(result.events.map((e) => e.kind)).toEqual([
    'move_committed',
    'capture_committed',
    'ap_changed',
  ]);
});

it('FIFO handlers use explicit stable ordering and deduplicate committed death before accounting', () => {
  const state = captureState();
  const handlers: NonNullable<RulesetBundle['handlers']> = [
    {
      id: 'z',
      order: 1,
      react: (event) =>
        event.kind === 'capture_committed'
          ? [
              { kind: 'marker', value: 'z' },
              { kind: 'destroy', pieceId: 'v' },
            ]
          : [],
    },
    {
      id: 'a',
      order: 1,
      react: (event) =>
        event.kind === 'capture_committed'
          ? [
              { kind: 'marker', value: 'a' },
              { kind: 'destroy', pieceId: 'v' },
            ]
          : [],
    },
  ];
  const input = player({ kind: 'move', pieceId: 'r', to: coordinateFromAlgebraic('A3') });
  const result = resolveCommand(state, input, { ...BASE_RULESET_ID, handlers });
  if (!result.ok) throw new Error(result.code);
  expect(result.state.ap).toEqual({ white: 5, black: 0 });
  expect(result.events.filter((e) => e.kind === 'marker').map((e) => e.payload)).toEqual([
    { value: 'a' },
    { value: 'z' },
  ]);
  expect(
    resolveCommand(state, input, { ...BASE_RULESET_ID, handlers: [...handlers].reverse() }),
  ).toEqual(result);
});

it('queue budget/invariant failure return no candidate events and never change input', () => {
  const state = createGame({ matchId: 'm', seed: 1, board: createBoard() });
  const before = JSON.stringify(state);
  const rules: RulesetBundle = {
    ...BASE_RULESET_ID,
    skills: {
      test: {
        cost: 0,
        operations: [
          { kind: 'marker', value: '1' },
          { kind: 'marker', value: '2' },
        ],
      },
    },
  };
  expect(
    resolveCommand(state, player({ kind: 'skill', skillId: 'test' }), rules, {
      operationBudget: 2,
    }),
  ).toEqual({ ok: false, code: 'RESOLUTION_LIMIT', events: [] });
  expect(
    resolveCommand(state, player({ kind: 'end' }), BASE_RULESET_ID, {
      validate: () => {
        throw new Error('INVARIANT');
      },
    }),
  ).toEqual({ ok: false, code: 'INVARIANT', events: [] });
  expect(JSON.stringify(state)).toBe(before);
});

it('King terminal bypasses all remaining cascade and no AP/turn advancement follows', () => {
  const state = createGame({
    matchId: 'm',
    seed: 1,
    board: createBoard([piece('r', 'rook', 'A1'), piece('k', 'king', 'A3', 'black')]),
  });
  const rules: RulesetBundle = {
    ...BASE_RULESET_ID,
    handlers: [{ id: 'bomb', order: 1, react: () => [{ kind: 'fail', code: 'SHOULD_NOT_RUN' }] }],
  };
  const result = resolveCommand(
    state,
    player({ kind: 'move', pieceId: 'r', to: coordinateFromAlgebraic('A3') }),
    rules,
  );
  if (!result.ok) throw new Error(result.code);
  expect(result.events.map((e) => e.kind)).toEqual([
    'move_committed',
    'capture_committed',
    'terminal_reached',
  ]);
  expect(result.state.ap).toEqual({ white: 0, black: 0 });
  expect(resolveCommand(result.state, player({ kind: 'end' })).ok).toBe(false);
});

it('rejects malformed roots, wrong authority, stale board invariant and player-requested destruction before random draws', () => {
  const state = captureState();
  for (const input of [
    null,
    {},
    player({ kind: 'destroy', pieceId: 'v' }),
    player({ kind: 'skill', skillId: 'x', actualCost: 0 }),
    player({ kind: 'move', pieceId: 'r', to: coordinateFromAlgebraic('A2') }, 'black'),
  ]) {
    const result = resolveCommand(state, input);
    expect(result.ok).toBe(false);
    expect(result.events).toEqual([]);
  }
  expect(state.rng.cursor).toBe(0);
  expect(state.counters.transaction).toBe(0);
  const broken = structuredClone(state);
  broken.board.cells[0] = null;
  expect(resolveCommand(broken, player({ kind: 'end' })).ok).toBe(false);
});

it('root move commits a new full state and deterministic fact metadata without touching input', () => {
  const state = createGame({
    matchId: 'm',
    seed: 1,
    board: createBoard([piece('r', 'rook', 'A1')]),
  });
  const before = JSON.stringify(state);
  const input = {
    authority: { kind: 'player', side: 'white' },
    command: { kind: 'move', pieceId: 'r', to: coordinateFromAlgebraic('A2') },
  };
  const result = resolveCommand(state, input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  expect(result.events.map((e) => e.kind)).toEqual(['move_committed']);
  expect(result.events[0]).toMatchObject({
    id: 'm:event:1',
    transactionId: 'm:transaction:1',
    causeId: 'm:operation:1',
    sequence: 1,
    visibility: 'internal',
  });
  expect(result.state.turn.mainMoveUsed).toBe(true);
  expect(JSON.stringify(state)).toBe(before);
  expect(resolveCommand(state, input)).toEqual(result);
});

it('failed derived operation discards RNG, IDs, AP, turn, board, namespace and all candidate events', () => {
  const state = createGame({
    matchId: 'm',
    seed: 1,
    board: createBoard([piece('victim', 'queen', 'A1')]),
  });
  const before = JSON.stringify(state);
  const rules = {
    ...BASE_RULESET_ID,
    skills: {
      test: {
        cost: 0,
        operations: [
          { kind: 'random', side: 'white', namespace: 'synthetic', pool: ['c', 'a', 'b'] },
          { kind: 'destroy', pieceId: 'victim' },
          { kind: 'fail', code: 'INJECTED_FAILURE' },
        ],
      },
    },
  } as const;
  const result = resolveCommand(
    state,
    { authority: { kind: 'player', side: 'white' }, command: { kind: 'skill', skillId: 'test' } },
    rules,
  );
  expect(result).toEqual({ ok: false, code: 'INJECTED_FAILURE', events: [] });
  expect(JSON.stringify(state)).toBe(before);
});
