import { expect, it } from 'vitest';
import { DomainEventSchema } from '@variant-chess/shared-types';
import {
  createGame,
  encodeSnapshot,
  decodeSnapshot,
  fullStateHash,
  canonicalEncode,
  cloneSnapshot,
  resolveCommand,
  createBoard,
} from '../src/index.js';

it('strict versioned canonical snapshots round-trip with deep isolation and full gameplay fingerprints', () => {
  const initial = createGame({ matchId: 'm', seed: 1 });
  const encoded = encodeSnapshot(initial);
  const restored = decodeSnapshot(encoded);
  expect(restored).toEqual(initial);
  expect(restored).not.toBe(initial);
  expect(restored.board.pieces['white-A1']).not.toBe(initial.board.pieces['white-A1']);
  expect(fullStateHash(restored)).toEqual(fullStateHash(initial));
  expect(encodeSnapshot({ ...initial, ap: { black: 0, white: 0 } })).toBe(encoded);
  expect(() =>
    decodeSnapshot(encoded.replace('"schemaVersion":"1.0.0"', '"schemaVersion":"9.0.0"')),
  ).toThrow();
});

it('nested effect/delayed/variant/history/RNG/counter snapshots have no aliases and are runtime immutable', () => {
  const state = structuredClone(createGame({ matchId: 'm', seed: 1 }));
  state.variantState.white['mirror'] = { nested: { values: [1] } };
  state.variantState.black['mirror'] = { nested: { values: [2] } };
  state.effects.push({
    id: 'effect1',
    definitionId: 'opaque',
    source: 'white',
    deadline: null,
    payload: { nested: [1] },
  });
  state.delayedActions.push({
    id: 'delay1',
    definitionId: 'opaque',
    source: 'black',
    deadline: null,
    payload: { nested: [2] },
  });
  const copy = cloneSnapshot(state);
  expect(copy).toEqual(state);
  for (const key of [
    'board',
    'variantState',
    'effects',
    'delayedActions',
    'history',
    'rng',
    'counters',
  ] as const)
    expect(copy[key]).not.toBe(state[key]);
  expect(copy.variantState.white['mirror']).not.toBe(state.variantState.white['mirror']);
  expect(copy.effects[0]?.payload).not.toBe(state.effects[0]?.payload);
  expect(copy.history.entries[0]?.positions).not.toBe(state.history.entries[0]?.positions);
  expect(() => {
    copy.effects.push(state.effects[0]!);
  }).toThrow();
  expect(() => {
    copy.history.entries[0]!.positions['white-A1'] = { file: 9, rankIndex: 9 };
  }).toThrow();
  state.effects[0]!.payload = { changed: true };
  expect(copy.effects[0]?.payload).toEqual({ nested: [1] });
});

it.each([undefined, NaN, Infinity, () => 1, new Date(0), new Map(), 1n])(
  'canonical codec rejects non-JSON value %s',
  (value) => {
    expect(() => canonicalEncode({ payload: value })).toThrow();
  },
);

it('history is bounded, carries stable position snapshot IDs and adds nothing on rejection', () => {
  const initial = createGame({ matchId: 'm', seed: 1, board: createBoard(), historyLimit: 2 });
  const one = resolveCommand(initial, {
    authority: { kind: 'player', side: 'white' },
    command: { kind: 'end' },
  });
  if (!one.ok) throw new Error(one.code);
  const two = resolveCommand(one.state, {
    authority: { kind: 'player', side: 'black' },
    command: { kind: 'end' },
  });
  if (!two.ok) throw new Error(two.code);
  expect(two.state.history.entries.map((e) => e.id)).toEqual(['m:snapshot:2', 'm:snapshot:3']);
  expect(two.state.history.entries.map((e) => e.sequence)).toEqual([1, 2]);
  expect(initial.history.entries).toHaveLength(1);
  const before = encodeSnapshot(two.state);
  expect(resolveCommand(two.state, null).ok).toBe(false);
  expect(encodeSnapshot(two.state)).toBe(before);
});

it('strict decode rejects extra fields, incompatible engine/ruleset/RNG versions and corrupt inverse occupancy', () => {
  const state = createGame({ matchId: 'm', seed: 1 });
  const bad = [
    { ...state, unknown: true },
    { ...state, engineVersion: '9.0.0' },
    { ...state, rulesetVersion: '9.0.0' },
    { ...state, rng: { ...state.rng, algorithm: 'unknown' } },
    { ...state, ap: { white: -1, black: 0 } },
    { ...state, board: { ...state.board, cells: Array(225).fill(null) } },
  ];
  for (const value of bad) expect(() => decodeSnapshot(JSON.stringify(value))).toThrow();
});

it('rejects forged typed facts and stale history counters that would reuse a snapshot identity', () => {
  expect(
    DomainEventSchema.safeParse({
      id: 'm:event:1',
      transactionId: 'm:transaction:1',
      causeId: 'm:operation:1',
      sequence: 1,
      visibility: 'internal',
      kind: 'capture_committed',
      payload: null,
    }).success,
  ).toBe(false);
  const state = structuredClone(createGame({ matchId: 'm', seed: 1 }));
  state.counters.snapshot = 0;
  expect(() => decodeSnapshot(JSON.stringify(state))).toThrow();
});

it('strict canonical arrays reject symbol values and sparse arrays masked by extra keys', () => {
  const symbolic = [1];
  Object.defineProperty(symbolic, Symbol('hidden'), { value: () => 1 });
  expect(() => canonicalEncode(symbolic)).toThrow('NON_SERIALIZABLE');
  const sparse: unknown[] = new Array(1);
  Object.defineProperty(sparse, 'extra', { enumerable: true, value: 42 });
  expect(() => canonicalEncode(sparse)).toThrow('NON_SERIALIZABLE');
});

it('history rejects duplicates, foreign namespaces, future sequence and invalid source boundary metadata', () => {
  const initial = createGame({ matchId: 'm', seed: 1 });
  const variants = [
    {
      ...initial,
      history: {
        ...initial.history,
        entries: [initial.history.entries[0]!, initial.history.entries[0]!],
      },
    },
    {
      ...initial,
      history: {
        ...initial.history,
        entries: [{ ...initial.history.entries[0]!, id: 'other:snapshot:1' }],
      },
    },
    {
      ...initial,
      history: { ...initial.history, entries: [{ ...initial.history.entries[0]!, sequence: 99 }] },
    },
    { ...initial, history: { ...initial.history, lastCountedPly: 99 } },
  ];
  for (const state of variants) expect(() => decodeSnapshot(JSON.stringify(state))).toThrow();
});

it('portable full fingerprint matches an independent UTF-8 byte oracle for multibyte payloads', () => {
  const state = structuredClone(createGame({ matchId: 'unicode', seed: 1 }));
  state.variantState.white['fixture'] = 'é€🎲';
  let expected = 14695981039346656037n;
  for (const byte of Buffer.from(encodeSnapshot(state), 'utf8'))
    expected = ((expected ^ BigInt(byte)) * 1099511628211n) % 18446744073709551616n;
  expect(fullStateHash(state).digest).toBe(expected.toString(16).padStart(16, '0'));
});
