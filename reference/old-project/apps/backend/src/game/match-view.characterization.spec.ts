import { Color, GameState, Match, PieceType } from 'game-core';

describe('G1.7 hidden-information characterization', () => {
  it('C1: redacts internal fields from the player serializer', () => {
    const state = hiddenState();
    const payload = state.serializeForPlayer(Color.Black);
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain('prediction-secret-square');
    expect(serialized).not.toContain('hidden-portal-pair');
    expect(serialized).not.toContain('underground-secret-piece');
    expect(serialized).not.toContain('shadowed-secret-piece');
    expect(serialized).not.toContain('stealth-secret-piece');
    expect(payload.positionSnapshots).toBeUndefined();
  });

  test('H-02/C4: opponent payload contains no hidden action target or internal state', () => {
    const match = new Match(() => 1_000);
    match.setVariants('lightning', null);
    match.start();
    match.getGameState().whiteAP = 3;

    expect(
      match.useSkill(Color.White, 'lightning_thunder_trap', [
        { type: 'cell', position: { col: 4, row: 4 } },
      ]).success,
    ).toBe(true);

    const opponentPayload = match.serializeForPlayer(Color.Black);
    expect(opponentPayload.board.cellEffects?.['4,4']).toBeUndefined();
    expect(JSON.stringify(opponentPayload)).not.toContain('4,4');
  });

  test.each([
    ['prediction metadata', 'prediction-secret-square'],
    ['dimension portal state', 'hidden-portal-pair'],
    ['underground piece snapshot', 'underground-secret-piece'],
    ['earth reservation snapshot', 'shadowed-secret-piece'],
    ['position snapshot', 'stealth-secret-piece'],
  ])('C3: redacts %s from an opponent payload', (_mechanism, secret) => {
    const payload = hiddenState().serializeForPlayer(Color.Black);

    expect(JSON.stringify(payload)).not.toContain(secret);
  });
});

function hiddenState(): GameState {
  const state = new GameState(7);
  state.board.setPiece(
    { col: 0, row: 1 },
    {
      id: 'stealth-secret-piece',
      type: PieceType.Pawn,
      color: Color.White,
      effects: [
        {
          id: 'stealth-effect',
          type: 'ghost',
          duration: 1,
          remainingDuration: 1,
          tickTiming: 'turnEnd',
          sourcePlayer: Color.White,
          targetType: 'piece',
          targetId: 'stealth-secret-piece',
          stackingRule: 'refresh',
          isDebuff: false,
          metadata: { stealth: true },
        },
      ],
    },
  );
  state.board.setPiece(
    { col: 1, row: 13 },
    {
      id: 'prediction-target-piece',
      type: PieceType.Pawn,
      color: Color.Black,
      effects: [
        {
          id: 'prediction-effect',
          type: 'prediction',
          duration: 1,
          remainingDuration: 1,
          tickTiming: 'turnEnd',
          sourcePlayer: Color.White,
          targetType: 'piece',
          targetId: 'prediction-target-piece',
          stackingRule: 'refresh',
          isDebuff: false,
          metadata: { predictedPosition: 'prediction-secret-square' },
        },
      ],
    },
  );
  state.variantState = {
    dimensionPairs: [{ id: 'hidden-portal-pair', owner: Color.White }],
    undergroundPieces: [{ pieceSnapshot: { id: 'underground-secret-piece' } }],
    shadowedPieces: [{ pieceSnapshot: { id: 'shadowed-secret-piece' } }],
  };
  state.positionSnapshots = [
    {
      turnNumber: 1,
      player: Color.White,
      positions: [
        {
          pieceId: 'stealth-secret-piece',
          position: { col: 0, row: 1 },
        },
      ],
    },
  ];
  return state;
}
