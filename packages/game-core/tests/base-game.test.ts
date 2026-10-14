import { describe, expect, it } from 'vitest';
import {
  createBasePosition,
  createBoard,
  endBaseTurn,
  applyBaseMainMove,
  coordinateFromAlgebraic,
  getPieceAt,
  commitNormalSkillUsage,
  NORMAL_TURN_POLICY,
  applyBaseDestruction,
  generateBaseMoves,
} from '../src/index.js';
import { piece } from './fixtures.js';

const square = coordinateFromAlgebraic;

describe('P00-07/09 normal turn', () => {
  it('Black controlled Pawn uses Black direction and receives capture AP while the victim owner receives loss AP', () => {
    const initial = createBasePosition(
      createBoard([
        piece('whitePawn', 'pawn', 'A2'),
        piece('pawn', 'pawn', 'H14', 'black', 'white'),
        piece('target', 'knight', 'G13', 'white', 'black'),
      ]),
    );
    const whiteMove = applyBaseMainMove(initial, 'white', initial.board.cells[15]!, square('A3'));
    if (!whiteMove.ok) throw new Error(whiteMove.code);
    const black = endBaseTurn(whiteMove.value, 'white');
    if (!black.ok) throw new Error(black.code);
    const result = applyBaseMainMove(
      black.value,
      'black',
      initial.board.cells[202]!,
      square('G13'),
    );
    if (!result.ok) throw new Error(result.code);
    expect(result.value.ap).toEqual({ white: 0, black: 5 });
    expect(getPieceAt(result.value.board, square('G13'))).toMatchObject({
      id: 'pawn',
      controller: 'black',
      owner: 'white',
    });
  });
  it('rolls back the whole local operation when reward arithmetic or auto-end index cannot be represented', () => {
    const initial = createBasePosition(
      createBoard([piece('rook', 'rook', 'A1'), piece('victim', 'queen', 'A2', 'black')]),
      { white: Number.MAX_SAFE_INTEGER, black: 0 },
    );
    const before = JSON.stringify(initial);
    expect(applyBaseMainMove(initial, 'white', initial.board.cells[0]!, square('A2'))).toEqual({
      ok: false,
      code: 'NUMBER_RANGE',
    });
    expect(JSON.stringify(initial)).toBe(before);
    const turnLimit = {
      ...initial,
      turn: { ...initial.turn, mainMoveUsed: true, plyIndex: Number.MAX_SAFE_INTEGER },
    };
    const limitBefore = JSON.stringify(turnLimit);
    expect(commitNormalSkillUsage(turnLimit, 'white', 1)).toEqual({
      ok: false,
      code: 'NUMBER_RANGE',
    });
    expect(JSON.stringify(turnLimit)).toBe(limitBefore);
  });
  it('Q-14/O-6b/B2-01: only a committed eligible destruction removes a piece and credits its owner once', () => {
    const initial = createBasePosition(
      createBoard([piece('victim', 'queen', 'A1', 'black', 'white'), piece('king', 'king', 'H1')]),
    );
    const before = JSON.stringify(initial);
    const kingId = initial.board.cells[7]!;
    expect(applyBaseDestruction(initial, kingId)).toEqual({ ok: false, code: 'PROTECTED_KING' });
    expect(JSON.stringify(initial)).toBe(before);
    const victimId = initial.board.cells[0]!;
    const destroyed = applyBaseDestruction(initial, victimId);
    if (!destroyed.ok) throw new Error(destroyed.code);
    expect(destroyed.value.ap).toEqual({ white: 4, black: 0 });
    expect(destroyed.value.turn).toEqual(initial.turn);
    expect(destroyed.value.terminal).toEqual({ status: 'ongoing' });
    expect(getPieceAt(destroyed.value.board, square('A1'))).toBeUndefined();
    expect(applyBaseDestruction(destroyed.value, victimId)).toEqual({
      ok: false,
      code: 'PIECE_NOT_FOUND',
    });
    expect(destroyed.value.ap).toEqual({ white: 4, black: 0 });
    expect(JSON.stringify(initial)).toBe(before);
  });
  it('B1-01/Q-17/B2-01: controlled Pawn captures by controller allegiance; both rewards can belong to the same player', () => {
    const initial = createBasePosition(
      createBoard([
        piece('pawn', 'pawn', 'H2', 'white', 'black'),
        piece('target', 'rook', 'I3', 'black', 'white'),
      ]),
    );
    const id = initial.board.cells[22]!;
    // A generated candidate is still only a query; no committed death or AP gain yet.
    const before = JSON.stringify(initial);
    expect(
      generateBaseMoves(initial.board, id).filter((move) => move.kind === 'capture'),
    ).toHaveLength(1);
    expect(JSON.stringify(initial)).toBe(before);
    const result = applyBaseMainMove(initial, 'white', id, square('I3'));
    if (!result.ok) throw new Error(result.code);
    expect(result.value.ap).toEqual({ white: 7, black: 0 });
    expect(getPieceAt(result.value.board, square('H2'))).toBeUndefined();
    expect(getPieceAt(result.value.board, square('I3'))).toMatchObject({
      id,
      owner: 'black',
      controller: 'white',
      currentType: 'pawn',
    });
    expect(result.value.board.pieces['target']).toBeUndefined();
    expect(JSON.stringify(initial)).toBe(before);
    expect(applyBaseMainMove(result.value, 'white', id, square('I4'))).toEqual({
      ok: false,
      code: 'MAIN_MOVE_USED',
    });
  });
  it('adds capture, owner loss reward and promotion reward together after a valid non-King capture', () => {
    const initial = createBasePosition(
      createBoard([
        piece('pawn', 'pawn', 'H14', 'white', 'black'),
        piece('victim', 'queen', 'I15', 'black'),
      ]),
    );
    const result = applyBaseMainMove(initial, 'white', initial.board.cells[202]!, square('I15'));
    if (!result.ok) throw new Error(result.code);
    expect(result.value.ap).toEqual({ white: 8, black: 4 });
    expect(getPieceAt(result.value.board, square('I15'))).toMatchObject({
      id: 'pawn',
      currentType: 'queen',
      baseType: 'pawn',
      owner: 'black',
      controller: 'white',
    });
  });
  it('P00-12: King capture preserves existing AP even when both pools are nonzero', () => {
    const initial = createBasePosition(
      createBoard([piece('rook', 'rook', 'H14'), piece('king', 'king', 'H15', 'black')]),
      { white: 17, black: 29 },
    );
    const result = applyBaseMainMove(initial, 'white', initial.board.cells[202]!, square('H15'));
    if (!result.ok) throw new Error(result.code);
    expect(result.value.ap).toEqual({ white: 17, black: 29 });
    expect(result.value.turn.mainMoveUsed).toBe(true);
    expect(result.boundaries).toEqual([]);
  });

  it('keeps a zero-AP skill window after Move and ends only on explicit End if skill is unaffordable', () => {
    const initial = createBasePosition(createBoard([piece('rook', 'rook', 'A1')]));
    const moved = applyBaseMainMove(initial, 'white', initial.board.cells[0]!, square('A2'));
    if (!moved.ok) throw new Error(moved.code);
    const before = JSON.stringify(moved.value);
    expect(commitNormalSkillUsage(moved.value, 'white', 1)).toEqual({
      ok: false,
      code: 'INSUFFICIENT_AP',
    });
    expect(JSON.stringify(moved.value)).toBe(before);
    const ended = endBaseTurn(moved.value, 'white');
    expect(ended.ok && ended.value.turn.sideToAct).toBe('black');
  });
  it('exposes normal TurnPolicy decisions without enabling unapproved Variant exceptions', () => {
    const turn = createBasePosition(createBoard()).turn;
    expect(NORMAL_TURN_POLICY.canUseMainMove(turn)).toBe(true);
    expect(NORMAL_TURN_POLICY.canUseSkill(turn)).toBe(true);
    expect(NORMAL_TURN_POLICY.shouldAutoEnd({ ...turn, mainMoveUsed: true })).toBe(false);
    expect(NORMAL_TURN_POLICY.shouldAutoEnd({ ...turn, mainMoveUsed: true, skillUsed: true })).toBe(
      true,
    );
  });
  it('rejects unrepresentable turn indices rather than advancing a partial snapshot', () => {
    const initial = createBasePosition(createBoard());
    const limit = { ...initial, turn: { ...initial.turn, plyIndex: Number.MAX_SAFE_INTEGER } };
    expect(endBaseTurn(limit, 'white')).toEqual({ ok: false, code: 'NUMBER_RANGE' });
    expect(limit.turn.plyIndex).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('keeps AP unchanged across White/Black boundaries and increments round only after Black', () => {
    const initial = createBasePosition(createBoard(), { white: 25, black: 9 });
    const black = endBaseTurn(initial, 'white');
    if (!black.ok) throw new Error(black.code);
    const white = endBaseTurn(black.value, 'black');
    if (!white.ok) throw new Error(white.code);
    expect(white.value.turn).toEqual({
      sideToAct: 'white',
      plyIndex: 2,
      roundIndex: 2,
      mainMoveUsed: false,
      skillUsed: false,
    });
    expect(white.value.ap).toEqual({ white: 25, black: 9 });
    expect(white.boundaries).toEqual([
      { kind: 'turnEnd', side: 'black', plyIndex: 1, roundIndex: 1 },
      { kind: 'turnStart', side: 'white', plyIndex: 2, roundIndex: 2 },
    ]);
  });

  it('recomputes forced-skip eligibility from the current board after a synthetic skill opens a move', () => {
    const initial = createBasePosition(createBoard([piece('stuck', 'pawn', 'A15')]));
    const skilled = commitNormalSkillUsage(initial, 'white', 0);
    if (!skilled.ok) throw new Error(skilled.code);
    expect(skilled.value.turn.sideToAct).toBe('white');
    expect(endBaseTurn(skilled.value, 'white').ok).toBe(true);
    // Synthetic already-resolved skill outcome; no concrete Variant or cached client no-move claim.
    const opened = { ...skilled.value, board: createBoard([piece('stuck', 'pawn', 'A14')]) };
    expect(endBaseTurn(opened, 'white')).toEqual({ ok: false, code: 'MAIN_MOVE_REQUIRED' });
  });

  it('rejects wrong turn, wrong controller, blocked/out-of-bounds moves and unpaid skills without changing any input', () => {
    const initial = createBasePosition(
      createBoard([
        piece('rook', 'rook', 'A1'),
        piece('ally', 'pawn', 'A2'),
        piece('enemy', 'knight', 'B3', 'black'),
      ]),
      { white: 2, black: 5 },
    );
    const before = JSON.stringify(initial);
    const id = initial.board.cells[0]!;
    expect(applyBaseMainMove(initial, 'black', id, square('B1'))).toEqual({
      ok: false,
      code: 'WRONG_TURN',
    });
    expect(applyBaseMainMove(initial, 'white', initial.board.cells[31]!, square('C5'))).toEqual({
      ok: false,
      code: 'NOT_CONTROLLED',
    });
    for (const to of [
      square('A2'),
      square('A3'),
      { file: -1, rankIndex: 0 },
      { file: NaN, rankIndex: 1 },
    ]) {
      expect(applyBaseMainMove(initial, 'white', id, to)).toEqual({
        ok: false,
        code: 'INVALID_MOVE',
      });
    }
    expect(commitNormalSkillUsage(initial, 'white', 3)).toEqual({
      ok: false,
      code: 'INSUFFICIENT_AP',
    });
    expect(commitNormalSkillUsage(initial, 'white', -1)).toEqual({
      ok: false,
      code: 'INVALID_COST',
    });
    expect(commitNormalSkillUsage(initial, 'black', 0)).toEqual({ ok: false, code: 'WRONG_TURN' });
    expect(endBaseTurn(initial, 'black')).toEqual({ ok: false, code: 'WRONG_TURN' });
    expect(JSON.stringify(initial)).toBe(before);
  });

  it('promotes Black controlled Pawn on rank 1, once, and never promotes a non-Pawn', () => {
    const initial = createBasePosition(
      createBoard([piece('blackPawn', 'pawn', 'H2', 'black', 'white')]),
    );
    const passed = endBaseTurn(initial, 'white');
    if (!passed.ok) throw new Error(passed.code);
    const result = applyBaseMainMove(passed.value, 'black', initial.board.cells[22]!, square('H1'));
    if (!result.ok) throw new Error(result.code);
    expect(getPieceAt(result.value.board, square('H1'))).toMatchObject({
      id: 'blackPawn',
      currentType: 'queen',
      baseType: 'pawn',
      controller: 'black',
      owner: 'white',
      originalSide: 'white',
    });
    expect(result.value.ap).toEqual({ white: 0, black: 3 });
    const queen = createBasePosition(createBoard([piece('q', 'queen', 'A14')]));
    const moved = applyBaseMainMove(queen, 'white', queen.board.cells[195]!, square('A15'));
    expect(moved.ok && moved.value.ap).toEqual({ white: 0, black: 0 });
  });

  it('returns frozen isolated serializable snapshots with inverse cells/position intact', () => {
    const initial = createBasePosition(createBoard([piece('r', 'rook', 'A1')]));
    const result = applyBaseMainMove(initial, 'white', initial.board.cells[0]!, square('A15'));
    if (!result.ok) throw new Error(result.code);
    const next = result.value;
    expect(Object.isFrozen(next)).toBe(true);
    expect(Object.isFrozen(next.turn)).toBe(true);
    expect(Object.isFrozen(next.ap)).toBe(true);
    expect(JSON.parse(JSON.stringify(next))).toEqual(next);
    for (const entry of Object.values(next.board.pieces)) {
      expect(next.board.cells[entry.position.rankIndex * 15 + entry.position.file]).toBe(entry.id);
    }
    expect(initial.board.pieces['r']?.position).toEqual({ file: 0, rankIndex: 0 });
  });
  it('P00-08/12: Pawn capture of King ends immediately before promotion rewards or further resolution', () => {
    const initial = createBasePosition(
      createBoard([piece('pawn', 'pawn', 'H14'), piece('king', 'king', 'I15', 'black')]),
    );
    const result = applyBaseMainMove(
      initial,
      'white',
      initial.board.cells[202]!,
      coordinateFromAlgebraic('I15'),
    );
    if (!result.ok) throw new Error(result.code);
    expect(result.value.ap).toEqual({ white: 0, black: 0 });
    expect(getPieceAt(result.value.board, coordinateFromAlgebraic('I15'))?.currentType).toBe(
      'pawn',
    );
    expect(result.value.terminal).toEqual({
      status: 'won',
      winner: 'white',
      reason: 'king_captured',
    });
  });
  it('promotes a controlled Pawn by controller direction, retaining identity/ownership/base type and awarding +3', () => {
    const initial = createBasePosition(
      createBoard([piece('pawn', 'pawn', 'H14', 'white', 'black')]),
    );
    const id = initial.board.cells[202]!;
    const result = applyBaseMainMove(initial, 'white', id, coordinateFromAlgebraic('H15'));
    if (!result.ok) throw new Error(result.code);
    expect(getPieceAt(result.value.board, coordinateFromAlgebraic('H15'))).toEqual({
      ...initial.board.pieces[id],
      position: coordinateFromAlgebraic('H15'),
      currentType: 'queen',
    });
    expect(result.value.ap).toEqual({ white: 3, black: 0 });
    const paid = commitNormalSkillUsage(result.value, 'white', 3);
    if (!paid.ok) throw new Error(paid.code);
    expect(paid.value.ap).toEqual({ white: 0, black: 0 });
    expect(paid.value.turn.sideToAct).toBe('black');
    expect(initial.ap).toEqual({ white: 0, black: 0 });
  });
  it('commits King capture once, preserves winner controller and stops turn advancement and all later gameplay', () => {
    const initial = createBasePosition(
      createBoard([
        piece('attacker', 'rook', 'H14', 'white', 'black'),
        piece('king', 'king', 'H15', 'black', 'white'),
      ]),
    );
    const skilled = commitNormalSkillUsage(initial, 'white', 0);
    if (!skilled.ok) throw new Error(skilled.code);
    const id = initial.board.cells[202]!;
    const won = applyBaseMainMove(skilled.value, 'white', id, coordinateFromAlgebraic('H15'));
    if (!won.ok) throw new Error(won.code);
    expect(won.value.terminal).toEqual({ status: 'won', reason: 'king_captured', winner: 'white' });
    expect(won.value.turn.sideToAct).toBe('white');
    expect(won.boundaries).toEqual([]);
    expect(getPieceAt(won.value.board, coordinateFromAlgebraic('H15'))?.id).toBe(id);
    expect(Object.keys(won.value.board.pieces)).toEqual(['attacker']);
    expect(endBaseTurn(won.value, 'white')).toEqual({ ok: false, code: 'TERMINAL' });
    expect(commitNormalSkillUsage(won.value, 'white', 0)).toEqual({ ok: false, code: 'TERMINAL' });
    expect(applyBaseDestruction(won.value, id)).toEqual({ ok: false, code: 'TERMINAL' });
    expect(applyBaseMainMove(won.value, 'black', id, coordinateFromAlgebraic('H14'))).toEqual({
      ok: false,
      code: 'TERMINAL',
    });
    expect(initial.terminal).toEqual({ status: 'ongoing' });
  });
  it('uses one synthetic skill slot before or after Move and auto-ends only after both slots', () => {
    for (const order of ['skill-first', 'move-first']) {
      const initial = createBasePosition(createBoard([piece('rook', 'rook', 'A1')]));
      const id = initial.board.cells[0]!;
      const first =
        order === 'skill-first'
          ? commitNormalSkillUsage(initial, 'white', 0)
          : applyBaseMainMove(initial, 'white', id, coordinateFromAlgebraic('A2'));
      if (!first.ok) throw new Error(first.code);
      expect(first.value.turn.sideToAct).toBe('white');
      expect(first.boundaries).toEqual([]);
      if (order === 'skill-first') {
        expect(commitNormalSkillUsage(first.value, 'white', 0)).toEqual({
          ok: false,
          code: 'SKILL_USED',
        });
      }
      const last =
        order === 'skill-first'
          ? applyBaseMainMove(first.value, 'white', id, coordinateFromAlgebraic('A2'))
          : commitNormalSkillUsage(first.value, 'white', 0);
      if (!last.ok) throw new Error(last.code);
      expect(last.value.turn).toEqual({
        sideToAct: 'black',
        plyIndex: 1,
        roundIndex: 1,
        mainMoveUsed: false,
        skillUsed: false,
      });
      expect(last.boundaries.map((b) => b.kind)).toEqual(['turnEnd', 'turnStart']);
    }
  });
  it('keeps the optional skill/End window after a quiet move and rejects a second move', () => {
    const initial = createBasePosition(createBoard([piece('rook', 'rook', 'A1')]));
    const rookId = initial.board.cells[0]!;
    const moved = applyBaseMainMove(initial, 'white', rookId, coordinateFromAlgebraic('A3'));
    expect(moved.ok).toBe(true);
    if (!moved.ok) throw new Error(moved.code);
    expect(moved.value.turn).toEqual({
      sideToAct: 'white',
      plyIndex: 0,
      roundIndex: 1,
      mainMoveUsed: true,
      skillUsed: false,
    });
    expect(getPieceAt(moved.value.board, coordinateFromAlgebraic('A1'))).toBeUndefined();
    expect(getPieceAt(moved.value.board, coordinateFromAlgebraic('A3'))?.id).toBe(rookId);
    expect(applyBaseMainMove(moved.value, 'white', rookId, coordinateFromAlgebraic('A4'))).toEqual({
      ok: false,
      code: 'MAIN_MOVE_USED',
    });
    expect(endBaseTurn(initial, 'white')).toEqual({ ok: false, code: 'MAIN_MOVE_REQUIRED' });
    const ended = endBaseTurn(moved.value, 'white');
    expect(ended.ok && ended.value.turn.sideToAct).toBe('black');
    expect(getPieceAt(initial.board, coordinateFromAlgebraic('A1'))?.id).toBe(rookId);
  });
  it('starts White round 1 and permits a core-confirmed forced skip without a main move', () => {
    const initial = createBasePosition(createBoard());
    expect(initial.turn).toEqual({
      sideToAct: 'white',
      plyIndex: 0,
      roundIndex: 1,
      mainMoveUsed: false,
      skillUsed: false,
    });
    const result = endBaseTurn(initial, 'white');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.code);
    expect(result.value.turn).toEqual({
      sideToAct: 'black',
      plyIndex: 1,
      roundIndex: 1,
      mainMoveUsed: false,
      skillUsed: false,
    });
    expect(result.boundaries).toEqual([
      { kind: 'turnEnd', side: 'white', plyIndex: 0, roundIndex: 1 },
      { kind: 'turnStart', side: 'black', plyIndex: 1, roundIndex: 1 },
    ]);
    expect(initial.turn.sideToAct).toBe('white');
  });
});
