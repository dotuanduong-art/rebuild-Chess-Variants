import { expect, it } from 'vitest';
import {
  createBoard,
  coordinateFromAlgebraic,
  createGame,
  planRadialReposition,
  resolveCommand,
} from '../src/index.js';
import { piece } from './fixtures.js';
import type { RulesetBundle } from '../src/index.js';

// D-08.B2-04/05/06: trusted ordinary-board foundation, not an enabled Shockwave producer.
it('plans all eight radial pushes simultaneously while preserving the allied center', () => {
  const around = ['G7', 'H7', 'I7', 'G8', 'I8', 'G9', 'H9', 'I9'];
  const board = createBoard([
    { ...piece('center', 'rook', 'H8'), origin: 'ordinary-original' },
    ...around.map((square, i) => ({
      ...piece(`enemy-${i}`, 'pawn', square, 'black'),
      origin: 'ordinary-original' as const,
    })),
  ]);
  const state = createGame({ matchId: 'push', seed: 19, board });
  expect(planRadialReposition(state, 'white', 'center' as never)).toEqual(
    ['F6', 'H6', 'J6', 'F8', 'J8', 'F10', 'H10', 'J10'].map((square, i) => ({
      pieceId: `enemy-${i}`,
      from: coordinateFromAlgebraic(around[i]!),
      to: coordinateFromAlgebraic(square),
    })),
  );
  expect(state.board.pieces.center!.position).toEqual(coordinateFromAlgebraic('H8'));
});

it('commits a typed root-validated batch and one simultaneous cause event without normal movement or death', () => {
  const profile = { id: 'test-only.radial', version: '1.0.0' };
  const source = {
    sourcePlayer: 'white',
    sourceVariant: 'test-only',
    sourceSkill: 'test-only.push',
    sourcePiece: null,
    sourceIncarnation: null,
  } as const;
  const rules: RulesetBundle = {
    version: '1.0.0',
    hash: 'test-only.radial-v1',
    playerProfiles: { white: profile, black: null },
    forcedReposition: {
      kind: 'shockwave-v1',
      sourceVariant: 'test-only',
      sourceSkill: 'test-only.push',
      requiredProfile: profile,
    },
    skills: {
      'test-only.push': {
        requiredProfile: profile,
        plan: () => ({
          cost: 0,
          operations: [
            {
              kind: 'forced_reposition',
              schemaVersion: '1.0.0',
              centerPieceId: 'center' as never,
              cause: { kind: 'shockwave-v1', source },
              moves: [
                {
                  pieceId: 'enemy' as never,
                  from: coordinateFromAlgebraic('I8'),
                  to: coordinateFromAlgebraic('J8'),
                },
              ],
            },
          ],
        }),
      },
    },
  };
  const state = createGame(
    {
      matchId: 'push',
      seed: 19,
      board: createBoard([
        { ...piece('center', 'rook', 'H8'), origin: 'ordinary-original' },
        { ...piece('enemy', 'rook', 'I8', 'black'), origin: 'ordinary-original' },
      ]),
    },
    rules,
  );
  const result = resolveCommand(
    state,
    {
      authority: { kind: 'player', side: 'white' },
      command: {
        kind: 'skill',
        skillId: 'test-only.push',
        intent: { kind: 'piece-target-v1', pieceId: 'center' },
      },
    },
    rules,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  expect(result.state.board.pieces.enemy!.position).toEqual(coordinateFromAlgebraic('J8'));
  expect(result.state.board.pieces.center).toEqual(state.board.pieces.center);
  expect(result.state.ap).toEqual(state.ap);
  expect(result.state.turn).toMatchObject({
    sideToAct: 'white',
    mainMoveUsed: false,
    skillUsed: true,
  });
  expect(result.events.map((e) => e.kind)).toEqual(['skill_used', 'pieces_repositioned']);
  expect(result.events[1]!.payload).toMatchObject({
    cause: { kind: 'shockwave-v1', source },
    centerPieceId: 'center',
  });
});

it('exhaustively proves occupied-vacated and shared-destination ambiguity unreachable on all225 centers', () => {
  const directions = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ] as const;
  for (let rankIndex = 0; rankIndex < 15; rankIndex++)
    for (let file = 0; file < 15; file++) {
      const center = { file, rankIndex };
      const originalNeighbors = directions.map(([dx, dy]) => ({
        file: file + dx,
        rankIndex: rankIndex + dy,
      }));
      const destinations = directions.map(([dx, dy]) => ({
        file: file + 2 * dx,
        rankIndex: rankIndex + 2 * dy,
      }));
      expect(new Set(destinations.map((p) => `${p.file},${p.rankIndex}`)).size).toBe(8);
      for (const destination of destinations) {
        expect(
          Math.max(
            Math.abs(destination.file - center.file),
            Math.abs(destination.rankIndex - center.rankIndex),
          ),
        ).toBe(2);
        expect(originalNeighbors).not.toContainEqual(destination);
      }
      const eligible = originalNeighbors.filter(
        (p) => p.file >= 0 && p.file < 15 && p.rankIndex >= 0 && p.rankIndex < 15,
      );
      const state = createGame({
        matchId: 'geometry',
        seed: 19,
        board: createBoard([
          { ...piece('center', 'rook', 'A1'), position: center, origin: 'ordinary-original' },
          ...eligible.map((position, i) => ({
            ...piece(`n${i}`, 'pawn', 'A1', 'black'),
            position,
            origin: 'ordinary-original' as const,
          })),
        ]),
      });
      const moves = planRadialReposition(state, 'white', 'center' as never);
      expect(moves.map((m) => m.to)).toEqual(
        destinations.filter(
          (p) => p.file >= 0 && p.file < 15 && p.rankIndex >= 0 && p.rankIndex < 15,
        ),
      );
      expect(
        moves.every(
          (m) =>
            !Object.values(state.board.pieces).some(
              (p) => p.position.file === m.to.file && p.position.rankIndex === m.to.rankIndex,
            ),
        ),
      ).toBe(true);
    }
});

it('plans from board coordinates independently of piece enumeration/allocation identity', () => {
  const pieces = [
    { ...piece('center', 'rook', 'H8'), origin: 'ordinary-original' as const },
    { ...piece('z', 'rook', 'G7', 'black'), origin: 'ordinary-original' as const },
    { ...piece('a', 'rook', 'I9', 'black'), origin: 'ordinary-original' as const },
  ];
  const a = createGame({ matchId: 'a', seed: 19, board: createBoard(pieces) });
  const b = createGame({ matchId: 'b', seed: 19, board: createBoard([...pieces].reverse()) });
  expect(planRadialReposition(a, 'white', 'center' as never)).toEqual(
    planRadialReposition(b, 'white', 'center' as never),
  );
});

it('does not freeze or alias a caller-owned mutable snapshot when returning an immutable plan', () => {
  const state = JSON.parse(
    JSON.stringify(
      createGame({
        matchId: 'pure',
        seed: 19,
        board: createBoard([
          { ...piece('center', 'rook', 'H8'), origin: 'ordinary-original' },
          { ...piece('enemy', 'rook', 'I8', 'black'), origin: 'ordinary-original' },
        ]),
      }),
    ),
  );
  const before = JSON.stringify(state);
  const plan = planRadialReposition(state, 'white', 'center' as never);
  expect(Object.isFrozen(state.board.pieces.enemy.position)).toBe(false);
  expect(plan[0]!.from).not.toBe(state.board.pieces.enemy.position);
  expect(Object.isFrozen(plan)).toBe(true);
  expect(JSON.stringify(state)).toBe(before);
});
