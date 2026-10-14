import { expect, it } from 'vitest';
import {
  createGame,
  createBoard,
  resolveCommand,
  repetitionKey,
  nextRandom,
  fullStateHash,
  relativeDeadline,
  BASE_RULESET_ID,
} from '../src/index.js';
import type { RepetitionProjection, RulesetBundle } from '../src/index.js';
import { piece } from './fixtures.js';
it('definition-owned semantic projection cannot mutate the candidate state', () => {
  const rules: RulesetBundle = {
    ...BASE_RULESET_ID,
    repetition: (s) => {
      if (s.counters.transaction) s.ap.black = 99;
      return { effects: [], delayedActions: [], variantState: s.variantState };
    },
  };
  const state = createGame({ matchId: 'm', seed: 1, board: createBoard() }, rules);
  const result = resolveCommand(
    state,
    { authority: { kind: 'player', side: 'white' }, command: { kind: 'end' } },
    rules,
  );
  expect(result.ok).toBe(false);
  expect(result.events).toEqual([]);
  expect(state.ap.black).toBe(0);
});
it('uses the same declared projection for initial actionReady as every later turnStart', () => {
  const rules: RulesetBundle = {
    ...BASE_RULESET_ID,
    repetition: () => ({ effects: null, delayedActions: null, variantState: null }),
  };
  let state = createGame({ matchId: 'm', seed: 1, board: createBoard() }, rules);
  for (let i = 0; i < 4; i++) {
    const result = resolveCommand(
      state,
      { authority: { kind: 'player', side: state.turn.sideToAct }, command: { kind: 'end' } },
      rules,
    );
    if (!result.ok) throw new Error(result.code);
    state = result.state;
  }
  expect(state.terminal).toEqual({ status: 'draw', reason: 'threefold_repetition' });
});

it('P00-10 initial position is counted; only drained turnStart counts, and third occurrence ends in draw', () => {
  let state = createGame({ matchId: 'm', seed: 1, board: createBoard() });
  const key = repetitionKey(state);
  expect(state.history.repetition[key]).toBe(1);
  for (let ply = 1; ply <= 4; ply++) {
    const result = resolveCommand(state, {
      authority: { kind: 'player', side: state.turn.sideToAct },
      command: { kind: 'end' },
    });
    if (!result.ok) throw new Error(result.code);
    state = result.state;
    expect(state.history.lastCountedPly).toBe(ply);
  }
  expect(state.history.repetition[key]).toBe(3);
  expect(state.terminal).toEqual({ status: 'draw', reason: 'threefold_repetition' });
});

it('ignores noisy piece IDs; AP/type/owner/controller and declared hidden semantics remain significant', () => {
  const first = createGame({
    matchId: 'a',
    seed: 1,
    board: createBoard([piece('x', 'pawn', 'H8')]),
  });
  const other = createGame({
    matchId: 'b',
    seed: 2,
    board: createBoard([piece('y', 'pawn', 'H8')]),
  });
  expect(repetitionKey(first)).toBe(repetitionKey(other));
  expect(repetitionKey({ ...first, ap: { white: 1, black: 0 } })).not.toBe(repetitionKey(first));
  for (const changes of [
    { owner: 'black' as const },
    { controller: 'black' as const },
    { currentType: 'queen' as const },
  ]) {
    const board = createBoard([{ ...piece('x', 'pawn', 'H8'), ...changes }]);
    expect(repetitionKey({ ...first, board: board as typeof first.board })).not.toBe(
      repetitionKey(first),
    );
  }
});

it('declared synthetic deadlines normalize relative source ordinals; opaque definitions fail closed', () => {
  const state = structuredClone(createGame({ matchId: 'm', seed: 1 }));
  state.effects.push({
    id: 'e1',
    definitionId: 'synthetic',
    source: 'white',
    deadline: { side: 'white', boundary: 'end', ordinal: 3 },
    payload: { level: 2 },
  });
  state.delayedActions.push({
    id: 'd1',
    definitionId: 'synthetic-delay',
    source: 'black',
    deadline: { side: 'black', boundary: 'start', ordinal: 2 },
    payload: { mode: 'fixture' },
  });
  const later = {
    ...state,
    turn: { ...state.turn, plyIndex: 2, roundIndex: 2 },
    effects: [
      {
        ...state.effects[0]!,
        id: 'e9',
        deadline: { side: 'white' as const, boundary: 'end' as const, ordinal: 4 },
      },
    ],
    delayedActions: [
      {
        ...state.delayedActions[0]!,
        id: 'd9',
        deadline: { side: 'black' as const, boundary: 'start' as const, ordinal: 3 },
      },
    ],
  };
  const semantic: RepetitionProjection = (s) => ({
    effects: s.effects.map((e) => ({
      definitionId: e.definitionId,
      source: e.source,
      deadline: relativeDeadline(s, e.deadline),
      payload: e.payload,
    })),
    delayedActions: s.delayedActions.map((e) => ({
      definitionId: e.definitionId,
      source: e.source,
      deadline: relativeDeadline(s, e.deadline),
      payload: e.payload,
    })),
    variantState: s.variantState,
  });
  expect(() => repetitionKey(state)).toThrow('REPETITION_SEMANTICS_REQUIRED');
  expect(repetitionKey(state, semantic)).toBe(repetitionKey(later, semantic));
  expect(relativeDeadline(state, state.effects[0]!.deadline)).toEqual({
    side: 'white',
    boundary: 'end',
    remaining: 2,
  });
});

it('does not count skill/intermediate queue facts; counts after all turnStart reactions have resolved', () => {
  const initial = createGame({ matchId: 'm', seed: 1, board: createBoard() });
  const rules: RulesetBundle = {
    ...BASE_RULESET_ID,
    repetition: (s) => ({ effects: [], delayedActions: [], variantState: s.variantState }),
    skills: {
      test: {
        cost: 0,
        operations: [
          { kind: 'marker', value: 'a' },
          { kind: 'marker', value: 'b' },
        ],
      },
    },
    handlers: [
      {
        id: 'start',
        order: 0,
        react: (e) =>
          e.kind === 'turn_started'
            ? [{ kind: 'variant', side: 'actor', namespace: 'synthetic', value: 'ready' }]
            : [],
      },
    ],
  };
  const skilled = resolveCommand(
    initial,
    { authority: { kind: 'player', side: 'white' }, command: { kind: 'skill', skillId: 'test' } },
    rules,
  );
  if (!skilled.ok) throw new Error(skilled.code);
  expect(skilled.state.history.repetition).toEqual(initial.history.repetition);
  const ended = resolveCommand(
    skilled.state,
    { authority: { kind: 'player', side: 'white' }, command: { kind: 'end' } },
    rules,
  );
  if (!ended.ok) throw new Error(ended.code);
  expect(ended.state.history.repetition[repetitionKey(ended.state, rules.repetition)]).toBe(1);
  expect(Object.values(ended.state.history.repetition)).toEqual([1, 1]);
});

it('RNG/counters/history are excluded from repetition, but included in full deterministic fingerprint', () => {
  const state = createGame({ matchId: 'm', seed: 1 });
  const other = { ...state, rng: nextRandom(state.rng).state };
  expect(repetitionKey(state)).toBe(repetitionKey(other));
  expect(fullStateHash(state)).not.toEqual(fullStateHash(other));
});
