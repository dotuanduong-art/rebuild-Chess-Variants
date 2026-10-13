import {
  ActionHistory,
  Color,
  Match,
  PieceType,
  ViewerRole,
  projectActions,
  projectMatchView,
  type Effect,
  type EffectType,
  type MatchViewDTO,
} from 'game-core';

describe('G1.7 role-based match views', () => {
  it('C2/C8: gives each player only their hidden information', () => {
    const match = hiddenMatch();
    const white = projectMatchView(match, ViewerRole.WHITE);
    const black = projectMatchView(match, ViewerRole.BLACK);
    const spectator = projectMatchView(match, ViewerRole.LIVE_SPECTATOR);
    const replay = projectMatchView(match, ViewerRole.POSTGAME_REPLAY);

    expect(hiddenCellIds(white)).toEqual(['white-trap']);
    expect(hiddenCellIds(black)).toEqual(['black-trap']);
    expect(hiddenCellIds(spectator)).toEqual([]);
    expect(hiddenCellIds(replay)).toEqual(['black-trap', 'white-trap']);
    expect(pieceIds(white)).toContain('white-stealth-piece');
    expect(pieceIds(white)).not.toContain('black-stealth-piece');
    expect(pieceIds(black)).toContain('black-stealth-piece');
    expect(pieceIds(black)).not.toContain('white-stealth-piece');
    expect(pieceIds(spectator)).not.toContain('white-stealth-piece');
    expect(pieceIds(spectator)).not.toContain('black-stealth-piece');
  });

  it.each([
    ['cell target', 'black-trap-square'],
    ['stealth piece', 'black-stealth-piece'],
    ['prediction', 'black-prediction-square'],
    ['portal', 'black-hidden-portal'],
    ['underground snapshot', 'black-underground-piece'],
    ['earth reservation snapshot', 'black-shadowed-piece'],
    ['sailing destination', 'black-sailing-square'],
    ['position snapshot', 'snapshot-black-stealth'],
  ])('C1/C3: redacts opponent %s', (_mechanism, secret) => {
    expect(
      JSON.stringify(projectMatchView(hiddenMatch(), ViewerRole.WHITE)),
    ).not.toContain(secret);
  });

  it.each<EffectType>([
    'thunder_trap',
    'landmine',
    'repel',
    'soulless_cell',
    'puppet_trap',
    'outworld',
  ])('C3: redacts the %s hidden-cell family', (type) => {
    const match = new Match(() => 1_000);
    const secret = `${type}-black-secret`;
    match
      .getGameState()
      .board.addCellEffect(
        { col: 4, row: 4 },
        { ...hiddenCellEffect(`${type}-id`, secret, Color.Black), type },
      );

    expect(
      JSON.stringify(projectMatchView(match, ViewerRole.WHITE)),
    ).not.toContain(secret);
    expect(JSON.stringify(projectMatchView(match, ViewerRole.BLACK))).toContain(
      secret,
    );
  });

  it('C3: redacts Phantom ghost stealth and Predator apex camouflage', () => {
    const match = new Match(() => 1_000);
    const state = match.getGameState();
    state.board.setPiece(
      { col: 4, row: 4 },
      hiddenPieceWithEffect('black-ghost-secret', Color.Black, 'ghost'),
    );
    state.board.setPiece(
      { col: 5, row: 5 },
      { id: 'black-apex-secret', type: PieceType.Pawn, color: Color.Black },
    );
    state.addPlayerEffect(Color.Black, {
      id: 'black-apex-effect',
      type: 'apex_camouflage',
      duration: 2,
      remainingDuration: 2,
      tickTiming: 'turnEnd',
      sourcePlayer: Color.Black,
      targetType: 'player',
      targetId: Color.Black,
      stackingRule: 'refresh',
      isDebuff: false,
      metadata: { revealedPieceIds: [] },
    });

    const white = JSON.stringify(projectMatchView(match, ViewerRole.WHITE));
    const black = JSON.stringify(projectMatchView(match, ViewerRole.BLACK));
    expect(white).not.toContain('black-ghost-secret');
    expect(white).not.toContain('black-apex-secret');
    expect(black).toContain('black-ghost-secret');
    expect(black).toContain('black-apex-secret');
  });

  it('C4: hides the opponent trap target from history but keeps it for its owner', () => {
    const match = hiddenMatch();

    expect(
      JSON.stringify(projectMatchView(match, ViewerRole.BLACK)),
    ).not.toContain('white-trap-square');
    expect(JSON.stringify(projectMatchView(match, ViewerRole.WHITE))).toContain(
      'white-trap-square',
    );
  });

  it('C2: gives authorized replay and server log full committed actions', () => {
    const action = hiddenSkillHistory(
      Color.Black,
      'replay-target-secret',
    ).action;

    expect(
      JSON.stringify(projectActions([action], ViewerRole.WHITE)),
    ).not.toContain('replay-target-secret');
    expect(
      JSON.stringify(projectActions([action], ViewerRole.POSTGAME_REPLAY)),
    ).toContain('replay-target-secret');
    expect(
      JSON.stringify(projectActions([action], ViewerRole.SERVER_LOG)),
    ).toContain('replay-target-secret');
  });

  it('C2: gives spectators portal state only after it becomes public', () => {
    const match = hiddenMatch();
    const pairs = match.getGameState().variantState.dimensionPairs as Array<{
      odd: { isHidden: boolean };
      even: { isHidden: boolean };
    }>;
    pairs[0].odd.isHidden = false;
    pairs[0].even.isHidden = false;

    const spectator = projectMatchView(match, ViewerRole.LIVE_SPECTATOR);

    expect(JSON.stringify(spectator.variantState)).toContain(
      'white-hidden-portal',
    );
    expect(JSON.stringify(spectator.variantState)).not.toContain(
      'black-hidden-portal',
    );
  });

  it('C5: excludes newly-added internal fields by default for every role', () => {
    const match = hiddenMatch();
    (match.getGameState() as unknown as Record<string, unknown>).futureSecret =
      'must-never-be-projected';

    for (const role of Object.values(ViewerRole)) {
      expect(JSON.stringify(projectMatchView(match, role))).not.toContain(
        'must-never-be-projected',
      );
    }
  });

  it('C10: keeps a stable golden contract for all five roles', () => {
    const match = hiddenMatch();
    const contract = Object.fromEntries(
      Object.values(ViewerRole).map((role) => [
        role,
        summarize(projectMatchView(match, role)),
      ]),
    );

    expect(contract).toMatchInlineSnapshot(`
      {
        "BLACK": {
          "actionTargets": [
            "black-trap-square",
          ],
          "cellEffects": [
            "black-trap",
          ],
          "hasSnapshots": false,
          "pieces": [
            "black-stealth-piece",
          ],
          "variantKeys": [
            "dimensionPairs",
            "dragonCounter",
            "shadowedPieces",
            "undergroundPieces",
          ],
        },
        "LIVE_SPECTATOR": {
          "actionTargets": [],
          "cellEffects": [],
          "hasSnapshots": false,
          "pieces": [],
          "variantKeys": [
            "dragonCounter",
          ],
        },
        "POSTGAME_REPLAY": {
          "actionTargets": [
            "white-trap-square",
            "black-trap-square",
          ],
          "cellEffects": [
            "black-trap",
            "white-trap",
          ],
          "hasSnapshots": true,
          "pieces": [
            "black-stealth-piece",
            "white-stealth-piece",
          ],
          "variantKeys": [
            "dimensionPairs",
            "dragonCounter",
            "shadowedPieces",
            "undergroundPieces",
          ],
        },
        "SERVER_LOG": {
          "actionTargets": [
            "white-trap-square",
            "black-trap-square",
          ],
          "cellEffects": [
            "black-trap",
            "white-trap",
          ],
          "hasSnapshots": true,
          "pieces": [
            "black-stealth-piece",
            "white-stealth-piece",
          ],
          "variantKeys": [
            "dimensionPairs",
            "dragonCounter",
            "shadowedPieces",
            "undergroundPieces",
          ],
        },
        "WHITE": {
          "actionTargets": [
            "white-trap-square",
          ],
          "cellEffects": [
            "white-trap",
          ],
          "hasSnapshots": false,
          "pieces": [
            "white-stealth-piece",
          ],
          "variantKeys": [
            "dimensionPairs",
            "dragonCounter",
            "shadowedPieces",
            "undergroundPieces",
          ],
        },
      }
    `);
  });

  it('C11: never projects credentials or principal PII, including SERVER_LOG', () => {
    const match = hiddenMatch();
    Object.assign(match.getGameState() as unknown as Record<string, unknown>, {
      accessToken: 'access-secret',
      reconnectToken: 'reconnect-secret',
      accountId: 'account-secret',
      sessionId: 'session-secret',
      email: 'person@example.test',
    });

    for (const role of Object.values(ViewerRole)) {
      const serialized = JSON.stringify(projectMatchView(match, role));
      for (const secret of [
        'access-secret',
        'reconnect-secret',
        'account-secret',
        'session-secret',
        'person@example.test',
      ]) {
        expect(serialized).not.toContain(secret);
      }
    }
  });
});

function hiddenMatch(): Match {
  const match = new Match(() => 1_000);
  const state = match.getGameState();
  state.variantState = {
    dragonCounter: 42,
    dimensionPairs: [
      portalPair(Color.White, 'white-hidden-portal'),
      portalPair(Color.Black, 'black-hidden-portal'),
    ],
    undergroundPieces: [
      {
        ownerColor: Color.White,
        pieceSnapshot: { id: 'white-underground-piece' },
      },
      {
        ownerColor: Color.Black,
        pieceSnapshot: { id: 'black-underground-piece' },
      },
    ],
    shadowedPieces: [
      { pieceSnapshot: { id: 'white-shadowed-piece', color: Color.Black } },
      { pieceSnapshot: { id: 'black-shadowed-piece', color: Color.White } },
    ],
  };
  state.board.addCellEffect(
    { col: 2, row: 2 },
    hiddenCellEffect('white-trap', 'white-trap-square', Color.White),
  );
  state.board.addCellEffect(
    { col: 12, row: 12 },
    hiddenCellEffect('black-trap', 'black-trap-square', Color.Black),
  );
  state.board.setPiece(
    { col: 3, row: 3 },
    hiddenPiece('white-stealth-piece', Color.White, 'white-prediction-square'),
  );
  state.board.setPiece(
    { col: 11, row: 11 },
    hiddenPiece('black-stealth-piece', Color.Black, 'black-sailing-square'),
  );
  state.board.setPiece(
    { col: 4, row: 4 },
    visiblePieceWithSecretEffect(
      'white-prediction-target',
      Color.White,
      Color.Black,
      'prediction',
      { predictedPosition: 'black-prediction-square' },
    ),
  );
  state.board.setPiece(
    { col: 10, row: 10 },
    visiblePieceWithSecretEffect(
      'black-sailing-target',
      Color.Black,
      Color.Black,
      'sailing',
      { destCol: 'black-sailing-square' },
    ),
  );
  state.actionHistory = ActionHistory.fromSerializable([
    hiddenSkillHistory(Color.White, 'white-trap-square'),
    hiddenSkillHistory(Color.Black, 'black-trap-square'),
  ]);
  state.positionSnapshots = [
    {
      turnNumber: 1,
      player: Color.White,
      positions: [
        { pieceId: 'snapshot-white-stealth', position: { col: 3, row: 3 } },
        { pieceId: 'snapshot-black-stealth', position: { col: 11, row: 11 } },
      ],
    },
  ];
  return match;
}

function hiddenCellEffect(
  id: string,
  targetId: string,
  sourcePlayer: Color,
): Effect {
  return {
    id,
    type: 'thunder_trap',
    duration: null,
    remainingDuration: null,
    tickTiming: 'turnEnd',
    sourcePlayer,
    targetType: 'cell',
    targetId,
    stackingRule: 'ignore',
    isDebuff: false,
    isHidden: true,
    metadata: { internalTarget: targetId },
  };
}

function hiddenPiece(id: string, color: Color, metadataSecret: string) {
  const effect: Effect = {
    id: `${id}-effect`,
    type: color === Color.White ? 'prediction' : 'sailing',
    duration: 2,
    remainingDuration: 2,
    tickTiming: 'turnEnd',
    sourcePlayer: color,
    targetType: 'piece',
    targetId: id,
    stackingRule: 'refresh',
    isDebuff: false,
    isHidden: true,
    metadata:
      color === Color.White
        ? { stealth: true, predictedPosition: metadataSecret }
        : { stealth: true, destCol: metadataSecret },
  };
  return { id, type: PieceType.Pawn, color, effects: [effect] };
}

function hiddenPieceWithEffect(id: string, color: Color, type: EffectType) {
  const piece = hiddenPiece(id, color, 'hidden-metadata');
  piece.effects[0].type = type;
  piece.effects[0].metadata = { stealth: true };
  return piece;
}

function visiblePieceWithSecretEffect(
  id: string,
  color: Color,
  sourcePlayer: Color,
  type: 'prediction' | 'sailing',
  metadata: Record<string, unknown>,
) {
  const effect: Effect = {
    id: `${id}-effect`,
    type,
    duration: 2,
    remainingDuration: 2,
    tickTiming: 'turnEnd',
    sourcePlayer,
    targetType: 'piece',
    targetId: id,
    stackingRule: 'refresh',
    isDebuff: false,
    metadata,
  };
  return { id, type: PieceType.Pawn, color, effects: [effect] };
}

function hiddenSkillHistory(player: Color, target: string) {
  return {
    turnNumber: 1,
    timestamp: 100,
    action: {
      type: 'USE_SKILL' as const,
      player,
      skillId: 'lightning_thunder_trap',
      targets: [{ type: 'cell', position: target }],
    },
  };
}

function portalPair(owner: Color, id: string) {
  return {
    owner,
    odd: {
      id,
      position: { col: 1, row: 1 },
      type: 'odd',
      owner,
      occupantId: null,
      isHidden: true,
    },
    even: {
      id: `${id}-even`,
      position: { col: 13, row: 13 },
      type: 'even',
      owner,
      occupantId: null,
      isHidden: true,
    },
    createdAtRound: 1,
  };
}

function hiddenCellIds(view: MatchViewDTO): string[] {
  return Object.values(view.board.cellEffects ?? {})
    .flat()
    .map((effect) => effect.id)
    .sort();
}

function pieceIds(view: MatchViewDTO): string[] {
  return view.board.grid
    .flat()
    .flatMap((piece) => (piece ? [piece.id] : []))
    .sort();
}

function summarize(view: MatchViewDTO) {
  const history = JSON.stringify(view.actionHistory);
  return {
    cellEffects: hiddenCellIds(view),
    pieces: pieceIds(view).filter((id) => id.includes('stealth')),
    actionTargets: ['white-trap-square', 'black-trap-square'].filter((target) =>
      history.includes(target),
    ),
    variantKeys: Object.keys(view.variantState).sort(),
    hasSnapshots: Array.isArray(view.positionSnapshots),
  };
}
