import {
  Action,
  Color,
  Match,
  PieceType,
  RootActionAuthorityValidator,
} from 'game-core';

type PlayerRootAction =
  | Extract<
      Action,
      {
        type:
          | 'MOVE_PIECE'
          | 'CAPTURE'
          | 'ZOMBIE_BITE'
          | 'USE_SKILL'
          | 'PASS_SKILL'
          | 'END_TURN'
          | 'SACRIFICE_PIECE';
      }
    >
  | {
      type: 'SURRENDER';
      player: Color;
    };

function stateHash(match: Match): string {
  const state = match.getGameState();
  return JSON.stringify({
    board: state.board.toSerializable(),
    currentTurn: state.currentTurn,
    turnPhase: state.turnPhase,
    status: state.status,
    winner: state.winner,
    whiteAP: state.whiteAP,
    blackAP: state.blackAP,
    whiteTimeLeft: state.whiteTimeLeft,
    blackTimeLeft: state.blackTimeLeft,
    lastMoveTimestamp: state.lastMoveTimestamp,
    rngCounter: state.rngCounter,
    hasMoved: state.hasMoved,
    skillsUsedThisTurn: state.skillsUsedThisTurn,
    passSkillSubmitted: state.passSkillSubmitted,
    history: state.actionHistory.getAll(),
    moveHistory: match.getMoveHistory(),
  });
}

function actionFor(
  match: Match,
  type: PlayerRootAction['type'],
  owner: Color,
): PlayerRootAction {
  const state = match.getGameState();
  const row = owner === Color.White ? 1 : 13;
  const toRow = owner === Color.White ? 2 : 12;
  const from = { col: 0, row };
  const to = { col: 0, row: toRow };
  const piece = state.board.getPiece(from)!;

  switch (type) {
    case 'MOVE_PIECE':
      return { type, pieceId: piece.id, from, to };
    case 'CAPTURE': {
      const capturedPieceSnapshot = {
        id: `authority_target_${owner}`,
        type: PieceType.Pawn,
        color: owner === Color.White ? Color.Black : Color.White,
        effects: [],
      };
      return {
        type,
        attackerId: piece.id,
        from,
        to: { col: 1, row: toRow },
        capturedPieceId: capturedPieceSnapshot.id,
        capturedPieceSnapshot,
      };
    }
    case 'ZOMBIE_BITE':
      return {
        type,
        attackerId: piece.id,
        attackerPosition: from,
        targetPosition: to,
      };
    case 'USE_SKILL':
      return { type, player: owner, skillId: 'authority_probe', targets: [] };
    case 'PASS_SKILL':
    case 'END_TURN':
      return { type, player: owner };
    case 'SACRIFICE_PIECE':
      return { type, player: owner, pieceId: piece.id, position: from };
    case 'SURRENDER':
      return { type, player: owner };
  }
}

describe('root action authority', () => {
  const actionTypes: PlayerRootAction['type'][] = [
    'MOVE_PIECE',
    'CAPTURE',
    'ZOMBIE_BITE',
    'USE_SKILL',
    'PASS_SKILL',
    'END_TURN',
    'SACRIFICE_PIECE',
    'SURRENDER',
  ];
  const turnBoundActionTypes = actionTypes.filter(
    (type) => type !== 'SURRENDER',
  );

  test.each(actionTypes)(
    '%s rejects a requester that does not own the action without mutation',
    (type) => {
      const match = new Match();
      match.start();
      const before = stateHash(match);

      const result = match.submitAction(
        actionFor(match, type, Color.White) as Action,
        Color.Black,
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          reason: 'Requester does not control this action',
          actions: [],
        }),
      );
      expect(stateHash(match)).toBe(before);
    },
  );

  it('H-01 core: an independently authenticated requester cannot impersonate the action owner', () => {
    const match = new Match();
    match.start();

    const result = match.submitAction(
      { type: 'PASS_SKILL', player: Color.White },
      Color.Black,
    );

    expect(result).toEqual({
      success: false,
      reason: 'Requester does not control this action',
      actions: [],
    });
  });

  it('requires an independent requester instead of trusting the action payload', () => {
    const match = new Match();
    match.start();

    const result = match.submitAction({
      type: 'PASS_SKILL',
      player: Color.White,
    });

    expect(result).toEqual({
      success: false,
      reason: 'Requester is required for player action',
      actions: [],
    });
  });

  it('uses the effective controller rather than the physical piece color', () => {
    const match = new Match();
    match.start();
    const state = match.getGameState();
    state.currentTurn = Color.Black;
    const from = { col: 0, row: 1 };
    const piece = state.board.getPiece(from)!;
    piece.effects.push({
      id: 'authority_control',
      type: 'puppet_control',
      duration: null,
      remainingDuration: null,
      tickTiming: 'turnEnd',
      sourcePlayer: Color.Black,
      targetType: 'piece',
      targetId: piece.id,
      stackingRule: 'refresh',
      isDebuff: true,
      metadata: { controlledBy: Color.Black },
    });
    const action: Action = {
      type: 'MOVE_PIECE',
      pieceId: piece.id,
      from,
      to: { col: 0, row: 2 },
    };
    const validator = new RootActionAuthorityValidator();

    expect(validator.validate(action, state, Color.Black)).toBeNull();
    expect(validator.validate(action, state, Color.White)).toBe(
      'Requester does not control this action',
    );
  });

  test.each(turnBoundActionTypes)(
    '%s rejects a valid owner outside their turn without mutation',
    (type) => {
      const match = new Match();
      match.start();
      const before = stateHash(match);

      const result = match.submitAction(
        actionFor(match, type, Color.Black) as Action,
        Color.Black,
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          reason: 'Requester is not the current player',
          actions: [],
        }),
      );
      expect(stateHash(match)).toBe(before);
    },
  );

  it('allows surrender outside the requester turn while preserving seat ownership checks', () => {
    const match = new Match();
    match.start();

    const result = match.submitAction(
      { type: 'SURRENDER', player: Color.Black },
      Color.Black,
    );

    expect(result.success).toBe(true);
    expect(match.getGameState().terminalResult).toEqual({
      outcome: 'win',
      winner: Color.White,
      loser: Color.Black,
      reason: 'surrender',
    });
  });

  it('rejects a wrong-turn move before clocks, board, AP, or history can mutate', () => {
    const match = new Match();
    match.start();
    const before = stateHash(match);

    const result = match.makeMove(
      Color.Black,
      { col: 0, row: 1 },
      { col: 0, row: 2 },
    );

    expect(result).toEqual(expect.objectContaining({ success: false }));
    expect(stateHash(match)).toBe(before);
  });
});
