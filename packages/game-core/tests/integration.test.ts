import { expect, it } from 'vitest';
import {
  createGame,
  createBoard,
  generateBaseMoves,
  applyBaseMainMove,
  resolveCommand,
  assertGameState,
  cloneSnapshot,
  fullStateHash,
  recordReplay,
  executeReplay,
} from '../src/index.js';
import type { BasePosition, Board } from '../src/index.js';
import type { PlayerSide, PieceId } from '@variant-chess/shared-types';
import { piece } from './fixtures.js';

it('full GameState cannot bypass root resolver through a legacy BasePosition helper', () => {
  const state = createGame({
    matchId: 'm',
    seed: 1,
    board: createBoard([piece('r', 'rook', 'A1')]),
  });
  expect(
    applyBaseMainMove(state as unknown as BasePosition, 'white', 'r' as PieceId, {
      file: 0,
      rankIndex: 1,
    }),
  ).toEqual({ ok: false, code: 'USE_ROOT_TRANSACTION' });
});

it('independent perft depth1–3 on far corner Kings: 3,9,54 (no chess-standard oracle)', () => {
  const board = createBoard([piece('w', 'king', 'A1'), piece('b', 'king', 'O15', 'black')]);
  function perft(position: Board, side: PlayerSide, depth: number): number {
    if (!depth) return 1;
    let count = 0;
    for (const moving of Object.values(position.pieces).filter((p) => p.controller === side)) {
      for (const move of generateBaseMoves(position, moving.id)) {
        const next = createBoard(
          Object.values(position.pieces)
            .filter((p) => move.kind !== 'capture' || p.id !== move.targetId)
            .map((p) => (p.id === moving.id ? { ...p, position: move.to } : p)),
        );
        count += perft(next, side === 'white' ? 'black' : 'white', depth - 1);
      }
    }
    return count;
  }
  // White first has3. Black independently3: 9. White second from A2/B1/B2 has5/5/8: (5+5+8)*3=54.
  expect([1, 2, 3].map((depth) => perft(board, 'white', depth))).toEqual([3, 9, 54]);
});

it.each([1, 7, 199])(
  'seeded legal/invalid action stream preserves independent invariants and replay at seed %i',
  (seed) => {
    const initial = createGame({
      matchId: `m${seed}`,
      seed,
      historyLimit: 8,
      board: createBoard([
        piece('w', 'king', 'A1'),
        piece('wp', 'pawn', 'B2'),
        piece('wr', 'rook', 'D1'),
        piece('b', 'king', 'O15', 'black'),
        piece('bp', 'pawn', 'N14', 'black'),
        piece('br', 'rook', 'L15', 'black'),
      ]),
    });
    let state = initial;
    let random = seed;
    const inputs: unknown[] = [];
    for (let i = 0; i < 30 && state.terminal.status === 'ongoing'; i++) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      const before = JSON.stringify(state);
      expect(
        resolveCommand(state, {
          authority: { kind: 'player', side: state.turn.sideToAct },
          command: { kind: 'move', pieceId: 'w', to: { file: NaN, rankIndex: 0 } },
        }).ok,
      ).toBe(false);
      expect(JSON.stringify(state)).toBe(before);
      const moves = Object.values(state.board.pieces)
        .filter((p) => p.controller === state.turn.sideToAct)
        .flatMap((p) => generateBaseMoves(state.board, p.id));
      const move = moves[random % moves.length];
      const command =
        state.turn.mainMoveUsed || !move
          ? { kind: 'end' }
          : { kind: 'move', pieceId: move.pieceId, to: move.to };
      const input = { authority: { kind: 'player', side: state.turn.sideToAct }, command };
      const result = resolveCommand(state, input);
      if (!result.ok) throw new Error(result.code);
      inputs.push(input);
      state = result.state;
      assertGameState(state);
      const ids = Object.keys(state.board.pieces);
      expect(new Set(ids).size).toBe(ids.length);
      expect(state.board.cells.filter((id) => id !== null)).toHaveLength(ids.length);
      for (const p of Object.values(state.board.pieces))
        expect(state.board.cells[p.position.rankIndex * 15 + p.position.file]).toBe(p.id);
      expect(state.ap.white).toBeGreaterThanOrEqual(0);
      expect(state.ap.black).toBeGreaterThanOrEqual(0);
      expect(state.history.entries.length).toBeLessThanOrEqual(8);
      expect(fullStateHash(cloneSnapshot(state))).toEqual(fullStateHash(state));
    }
    const recorded = recordReplay(initial, inputs);
    if (!recorded.ok) throw new Error(recorded.code);
    const replayed = executeReplay(recorded.archive);
    if (!replayed.ok) throw new Error(replayed.code);
    expect(replayed.state).toEqual(state);
  },
);

it('invalid input fuzz rejects before IDs/RNG/history change', () => {
  const state = createGame({ matchId: 'fuzz', seed: 1 });
  const before = JSON.stringify(state);
  for (const command of [
    null,
    [],
    1,
    'move',
    { kind: 'move' },
    { kind: 'end', actualCost: -1 },
    { kind: 'skill', skillId: '__proto__' },
    { kind: 'destroy', pieceId: 'white-A1' },
  ]) {
    expect(
      resolveCommand(state, { authority: { kind: 'player', side: 'white' }, command }).ok,
    ).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  }
});
