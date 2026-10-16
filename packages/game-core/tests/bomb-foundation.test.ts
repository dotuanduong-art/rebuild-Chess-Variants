import { expect, it } from 'vitest';
import {
  BASE_RULESET_ID,
  createBoard,
  createGame,
  createEffectRegistry,
  createEffectRuntime,
  resolveCommand,
  decodeEffectRecords,
  coordinateFromAlgebraic,
  encodeSnapshot,
  decodeSnapshot,
  BOMB_CONSUMER_CONTRACTS,
  BOMB_DEATH_REACTION_BINDINGS,
  BOMB_PAYLOAD_SCHEMA,
  planBombBlast,
  recordReplay,
  executeReplay,
  STUN_RESTRICTION_BINDINGS,
  SHIELD_CAPTURE_DEFENSE_BINDINGS,
  SHIELD_CONSUMER_CONTRACT,
} from '../src/index.js';
import type { EffectDefinition, RulesetBundle, DerivedOperation } from '../src/index.js';
import type { GameState, RootCommand, PlayerSide } from '@variant-chess/shared-types';
import { DomainEventSchema } from '@variant-chess/shared-types';
import { piece } from './fixtures.js';

// Complete fixture definitions declare test-only eligibility/removal, not approved producer profiles.
const definition = (
  mine = false,
  patch: Partial<EffectDefinition> = {},
  includeFamily = true,
): EffectDefinition => ({
  typeId: mine ? 'effect.bomb.mine' : 'effect.bomb.charge',
  schemaVersion: '1.0.0',
  targets: ['piece'],
  category: mine ? 'debuff' : 'buff',
  ...(includeFamily ? { family: { id: 'bomb', policy: 'unique-target-ignore' as const } } : {}),
  sourceAttribution: { kind: 'preserve-source', requiredRefs: ['variant', 'skill'] },
  ownership: { kind: 'source-player' },
  kingEligibility: { kind: 'allowed' },
  lifetime: { kind: 'permanent' },
  stacking: { key: 'type-target', mode: 'ignore' },
  removal: {
    expired: 'cleanup-only',
    cleansed: 'cleanup-only',
    dispelled: 'cleanup-only',
    consumed: 'cleanup-only',
    replaced: 'cleanup-only',
    target_destroyed: 'cleanup-only',
    source_invalidated: 'cleanup-only',
    link_broken: 'cleanup-only',
    match_terminal: 'cleanup-only',
  },
  relocation: { kind: 'retargetable', constraints: [] },
  visibility: { kind: 'public' },
  capabilities: [],
  triggers: [],
  repetition: { projectionId: 'fixture.bomb' },
  repetitionProjector: (e, c) => ({
    target: c.target,
    source: [e.sourcePlayer, e.sourceVariant, e.sourceSkill, e.sourcePiece],
    category: mine ? 'debuff' : 'buff',
  }),
  payloadSchema: {
    parse: (v) => {
      if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length)
        throw new Error('EMPTY_PAYLOAD');
      return {};
    },
  },
  ...patch,
});
const apply = (
  mine = false,
  patch: Partial<Extract<DerivedOperation, { kind: 'effect_apply' }>> = {},
): DerivedOperation => ({
  kind: 'effect_apply',
  definitionId: mine ? 'effect.bomb.mine' : 'effect.bomb.charge',
  definitionVersion: '1.0.0',
  target: { kind: 'piece', pieceId: 'v' as never },
  sourcePlayer: 'white',
  sourceVariant: 'fixture',
  sourceSkill: 'charge',
  sourcePiece: null,
  payload: {},
  groupId: null,
  ...patch,
});
function bundle(
  operations: readonly DerivedOperation[] = [apply()],
  definitions = [definition(), definition(true)],
): RulesetBundle {
  const registry = createEffectRegistry(definitions);
  return {
    ...BASE_RULESET_ID,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry),
    skills: { cast: { cost: 0, operations } },
  };
}
const input = (
  command: RootCommand = { kind: 'skill', skillId: 'cast' },
  side: PlayerSide = 'white',
) => ({ authority: { kind: 'player', side }, command });
const game = (
  rules: RulesetBundle,
  board = createBoard([piece('r', 'rook', 'D1'), piece('v', 'pawn', 'D4', 'black')]),
) => createGame({ matchId: 'bomb', seed: 7, board, ap: { white: 0, black: 0 } }, rules);
function run(
  state: GameState,
  rules: RulesetBundle,
  command: RootCommand = { kind: 'skill', skillId: 'cast' },
) {
  const result = resolveCommand(state, input(command, state.turn.sideToAct), rules);
  if (!result.ok) throw new Error(result.code);
  return result;
}
const effects = (state: GameState, rules: RulesetBundle) =>
  decodeEffectRecords(state.effects, rules.effectRegistry!, state);
const destroy = (state: GameState, rules: RulesetBundle, id = 'v') =>
  resolveCommand(
    state,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: id } },
    rules,
  );

function reacting(operations: readonly DerivedOperation[] = [apply()]): RulesetBundle {
  const defs = [false, true].map((mine) =>
    definition(mine, {
      deathReaction: BOMB_CONSUMER_CONTRACTS[mine ? 'mine' : 'charge'].deathReaction,
      capabilities: ['react:committed-death-v1'],
      payloadSchema: BOMB_PAYLOAD_SCHEMA,
    }),
  );
  const rules = bundle(operations, defs);
  return {
    ...rules,
    effectRuntime: createEffectRuntime(rules.effectRegistry!, {
      deathReactions: BOMB_DEATH_REACTION_BINDINGS,
    }),
  };
}

it.each([
  [false, false],
  [true, true],
  [false, true],
  [true, false],
])(
  'ignores family duplicate %s → %s across sources without a second ID or Applied fact',
  (firstMine, secondMine) => {
    const rules = bundle([
      apply(firstMine),
      apply(secondMine, { sourcePlayer: 'black', sourceSkill: 'other', sourcePiece: 'r' as never }),
    ]);
    const result = run(game(rules), rules);
    expect(effects(result.state, rules)).toHaveLength(1);
    expect(effects(result.state, rules)[0]).toMatchObject({
      id: 'bomb:operation:2',
      definitionId: firstMine ? 'effect.bomb.mine' : 'effect.bomb.charge',
      sourcePlayer: 'white',
      sourceSkill: 'charge',
      sourcePiece: null,
      deadline: null,
      payload: {},
    });
    expect(result.events.filter((e) => e.kind.startsWith('effect_')).map((e) => e.kind)).toEqual([
      'effect_applied',
    ]);
  },
);

it('reacts to committed capture at the death center, destroys capturer/allies/enemies but no King, accounting once', () => {
  const rules = reacting();
  const state = run(
    game(
      rules,
      createBoard([
        piece('r', 'rook', 'D1'),
        piece('v', 'pawn', 'D4', 'black'),
        piece('ally', 'knight', 'C4'),
        piece('enemy', 'bishop', 'E5', 'black'),
        piece('king', 'king', 'D5', 'black'),
        piece('far', 'queen', 'F4'),
      ]),
    ),
    rules,
  ).state;
  const result = run(state, rules, {
    kind: 'move',
    pieceId: 'r' as never,
    to: coordinateFromAlgebraic('D4'),
  });
  expect(Object.keys(result.state.board.pieces).sort()).toEqual(['far', 'king']);
  expect(result.state.ap).toEqual({ white: 7, black: 3 }); // capture Pawn2 + own Knight loss2 + Rook loss3; enemy Pawn loss1+Bishop loss2.
  expect(
    result.events.filter((e) => e.kind === 'piece_destroyed').map((e) => e.payload.pieceId),
  ).toEqual(['ally', 'r', 'enemy']);
  expect(
    result.events.filter((e) => e.kind === 'bomb_exploded').map((e) => e.payload.center),
  ).toEqual([{ file: 3, rankIndex: 3 }]);
});

it('rejects a missing concrete binding even for a cross-definition family duplicate', () => {
  const base = reacting();
  const defs = [
    definition(false, {
      deathReaction: BOMB_CONSUMER_CONTRACTS.charge.deathReaction,
      capabilities: ['react:committed-death-v1'],
    }),
    definition(true, {
      deathReaction: { mode: 'bomb-blast-v1', handlerId: 'missing' },
      capabilities: ['react:committed-death-v1'],
    }),
  ];
  const registry = createEffectRegistry(defs);
  const rules = {
    ...base,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, { deathReactions: BOMB_DEATH_REACTION_BINDINGS }),
    skills: { cast: { cost: 0, operations: [apply(), apply(true)] } },
  };
  const state = game(rules),
    before = JSON.stringify(state);
  expect(resolveCommand(state, input(), rules)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  expect(JSON.stringify(state)).toBe(before);
});

it('rejects duplicate-family snapshot import and relocation final assignment', () => {
  const rules = reacting([
    apply(),
    apply(true, { target: { kind: 'piece', pieceId: 'w' as never } }),
  ]);
  const initial = game(
    rules,
    createBoard([piece('v', 'pawn', 'A1', 'black'), piece('w', 'pawn', 'B1', 'black')]),
  );
  const state = run(initial, rules).state;
  const raw = JSON.parse(encodeSnapshot(state, rules.effectRegistry));
  raw.effects[1].payload.instance.target = { kind: 'piece', pieceId: 'v' };
  expect(() => decodeSnapshot(JSON.stringify(raw), rules)).toThrow('EFFECT_FAMILY_DUPLICATE');
  const bad = {
    ...rules,
    skills: {
      cast: {
        cost: 0,
        operations: [
          apply(),
          apply(true, { target: { kind: 'piece', pieceId: 'w' as never } }),
          {
            kind: 'effect_relocate' as const,
            instanceId: 'bomb:operation:3',
            target: { kind: 'piece' as const, pieceId: 'v' as never },
          },
        ],
      },
    },
  };
  expect(resolveCommand(initial, input(), bad)).toEqual({
    ok: false,
    code: 'EFFECT_FAMILY_DUPLICATE',
    events: [],
  });
});

it.each([
  ['A1', ['p0', 'p1', 'p15', 'p16']],
  ['A2', ['p0', 'p1', 'p15', 'p16', 'p30', 'p31']],
  ['B2', ['p0', 'p1', 'p2', 'p15', 'p16', 'p17', 'p30', 'p31', 'p32']],
  ['O15', ['p208', 'p209', 'p223', 'p224']],
] as const)('clips the pure 3×3 blast at %s in deterministic board order', (square, expected) => {
  const board = createBoard(
    Array.from({ length: 225 }, (_, index) =>
      piece(
        `p${index}`,
        'pawn',
        `${String.fromCharCode(65 + (index % 15))}${Math.floor(index / 15) + 1}`,
        index % 2 ? 'black' : 'white',
      ),
    ),
  );
  const before = JSON.stringify(board);
  expect(planBombBlast(board, coordinateFromAlgebraic(square))).toEqual(expected);
  expect(JSON.stringify(board)).toBe(before);
  expect(Object.isFrozen(planBombBlast(board, coordinateFromAlgebraic(square)))).toBe(true);
});

it('preserves each original source across an overlapping two-Bomb FIFO chain and settles owner loss once', () => {
  const rules = reacting([
    apply(false, { sourcePlayer: 'black', sourceSkill: 'first', sourcePiece: 'r' as never }),
    apply(true, {
      target: { kind: 'piece', pieceId: 'second' as never },
      sourcePlayer: 'white',
      sourceSkill: 'second',
      sourcePiece: 'second' as never,
    }),
  ]);
  const state = run(
    game(
      rules,
      createBoard([
        piece('r', 'rook', 'D1'),
        piece('v', 'pawn', 'D4', 'black', 'white'),
        piece('second', 'pawn', 'E4', 'black', 'white'),
        piece('overlap', 'knight', 'E5', 'white', 'black'),
        piece('outer', 'bishop', 'F4', 'black'),
        piece('king', 'king', 'F5'),
      ]),
    ),
    rules,
  ).state;
  const result = run(state, rules, {
    kind: 'move',
    pieceId: 'r' as never,
    to: coordinateFromAlgebraic('D4'),
  });
  expect(Object.keys(result.state.board.pieces)).toEqual(['king']);
  expect(result.state.ap).toEqual({ white: 7, black: 4 }); // capture2; owner-white Pawn1+Pawn1+Rook3; owner-black Knight2+Bishop2.
  expect(
    result.events
      .filter((e) => e.kind === 'piece_destroyed')
      .map((e) => [
        e.payload.pieceId,
        e.payload.actor,
        e.payload.source?.sourceSkill,
        e.payload.rootActor,
      ]),
  ).toEqual([
    ['r', 'black', 'first', 'white'],
    ['second', 'black', 'first', 'white'],
    ['overlap', 'black', 'first', 'white'],
    ['outer', 'white', 'second', 'white'],
  ]);
  expect(
    result.events
      .filter((e) => e.kind === 'bomb_exploded')
      .map((e) => [
        e.payload.effectId,
        e.payload.source.sourcePlayer,
        e.payload.source.sourcePiece,
        e.payload.targets,
      ]),
  ).toEqual([
    ['bomb:operation:2', 'black', 'r', ['r', 'second', 'overlap']],
    ['bomb:operation:3', 'white', 'second', ['outer']],
  ]);
});

it('uses the bearer position after movement when committed destruction retires its Bomb', () => {
  const rules = reacting([
    apply(false, { target: { kind: 'piece', pieceId: 'r' as never }, sourcePlayer: 'black' }),
  ]);
  let state = run(
    game(
      rules,
      createBoard([
        piece('r', 'rook', 'D1'),
        piece('near-old', 'pawn', 'C1', 'black'),
        piece('near-new', 'pawn', 'E4', 'black'),
      ]),
    ),
    rules,
  ).state;
  state = run(state, rules, {
    kind: 'move',
    pieceId: 'r' as never,
    to: coordinateFromAlgebraic('D4'),
  }).state;
  const result = destroy(state, rules, 'r');
  if (!result.ok) throw new Error(result.code);
  expect(Object.keys(result.state.board.pieces)).toEqual(['near-old']);
  expect(
    result.events.filter((e) => e.kind === 'bomb_exploded').map((e) => e.payload.center),
  ).toEqual([{ file: 3, rankIndex: 3 }]);
  expect(result.state.ap).toEqual({ white: 3, black: 1 });
  expect(
    result.events
      .filter((e) => e.kind === 'piece_destroyed')
      .map((e) => [e.payload.actor, e.payload.rootActor]),
  ).toEqual([
    [null, undefined],
    ['black', null],
  ]);
});

it('builds frozen post-commit death context with pre-cleanup attachments and actual owner/controller/cause', () => {
  const base = reacting();
  const binding = BOMB_DEATH_REACTION_BINDINGS['bomb.death.v1']!;
  const rules = {
    ...base,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      deathReactions: {
        'bomb.death.v1': {
          ...binding,
          plan: (c) => {
            expect(c.death).toMatchObject({
              reason: 'destruction',
              victim: {
                id: 'v',
                owner: 'white',
                controller: 'black',
                position: { file: 3, rankIndex: 3 },
              },
              attackerId: null,
              rootActor: null,
              transactionId: 'bomb:transaction:2',
              operationId: 'bomb:operation:3',
              causeId: 'bomb:transaction:2',
            });
            expect(c.state.board.pieces.v).toBeUndefined();
            expect(c.state.ap.white).toBe(1);
            expect(c.death.retiredEffects).toHaveLength(1);
            expect(c.state.effects).toEqual([]);
            expect(Object.isFrozen(c.death.retiredEffects[0]?.payload)).toBe(true);
            expect(Object.isFrozen(c.death.victim.position)).toBe(true);
            return binding.plan(c);
          },
        },
      },
    }),
  };
  const state = run(
    game(rules, createBoard([piece('v', 'pawn', 'D4', 'black', 'white')])),
    rules,
  ).state;
  expect(destroy(state, rules).ok).toBe(true);
});

it.each(['effect_relocate', 'effect_sets_swap'] as const)(
  'preserves Bomb identity/source through %s and explodes at its final bearer without application/expiry',
  (kind) => {
    const move: DerivedOperation =
      kind === 'effect_relocate'
        ? { kind, instanceId: 'bomb:operation:2', target: { kind: 'piece', pieceId: 'w' as never } }
        : { kind, pieceA: 'v' as never, pieceB: 'w' as never };
    const rules = reacting([
      apply(false, { sourcePlayer: 'black', sourceSkill: 'original' }),
      move,
    ]);
    const applied = run(
      game(
        rules,
        createBoard([
          piece('v', 'pawn', 'A1', 'black'),
          piece('w', 'pawn', 'D4', 'black'),
          piece('neighbor', 'pawn', 'E4'),
        ]),
      ),
      rules,
    );
    expect(
      applied.events.filter(
        (e) =>
          e.kind === 'bomb_exploded' ||
          e.kind === 'effect_removed' ||
          e.kind === 'effect_refreshed',
      ),
    ).toEqual([]);
    expect(applied.events.filter((e) => e.kind === 'effect_applied')).toHaveLength(1);
    expect(effects(applied.state, rules)[0]).toMatchObject({
      id: 'bomb:operation:2',
      target: { kind: 'piece', pieceId: 'w' },
      sourcePlayer: 'black',
      sourceSkill: 'original',
      deadline: null,
    });
    const result = destroy(applied.state, rules, 'w');
    if (!result.ok) throw new Error(result.code);
    expect(Object.keys(result.state.board.pieces)).toEqual(['v']);
    expect(
      result.events
        .filter((e) => e.kind === 'bomb_exploded')
        .map((e) => [e.payload.center, e.payload.source.sourceSkill]),
    ).toEqual([[{ file: 3, rankIndex: 3 }, 'original']]);
  },
);

it.each(['cleansed', 'dispelled', 'replaced'] as const)(
  'does not explode when a synthetic removal profile permits %s cleanup',
  (reason) => {
    const rules = reacting([
      apply(),
      { kind: 'effect_remove', instanceId: 'bomb:operation:2', reason },
    ]);
    const result = run(game(rules), rules);
    expect(result.state.effects).toEqual([]);
    expect(result.state.ap).toEqual({ white: 0, black: 0 });
    expect(
      result.events.filter((e) => e.kind === 'bomb_exploded' || e.kind === 'piece_destroyed'),
    ).toEqual([]);
  },
);

it('keeps King capture terminal ahead of all Bomb cascades and pending observer operations', () => {
  const base = reacting();
  const rules: RulesetBundle = {
    ...base,
    handlers: [
      {
        id: 'unreachable',
        order: 0,
        react: (e) =>
          e.kind === 'capture_committed' ? [{ kind: 'fail', code: 'AFTER_TERMINAL' }] : [],
      },
    ],
  };
  const state = run(
    game(
      rules,
      createBoard([
        piece('r', 'rook', 'D1'),
        piece('v', 'king', 'D4', 'black'),
        piece('neighbor', 'pawn', 'E4'),
      ]),
    ),
    rules,
  ).state;
  const result = run(state, rules, {
    kind: 'move',
    pieceId: 'r' as never,
    to: coordinateFromAlgebraic('D4'),
  });
  expect(result.state.terminal).toEqual({
    status: 'won',
    reason: 'king_captured',
    winner: 'white',
  });
  expect(result.state.ap).toEqual({ white: 0, black: 0 });
  expect(result.state.board.pieces.neighbor).toBeDefined();
  expect(
    result.events.filter((e) => e.kind === 'bomb_exploded' || e.kind === 'piece_destroyed'),
  ).toEqual([]);
  expect(result.events.at(-1)?.kind).toBe('terminal_reached');
});

it('rolls back a candidate death canceled before commit and never observes a Bomb reaction', () => {
  const base = reacting();
  const rules: RulesetBundle = {
    ...base,
    interceptors: [{ id: 'synthetic-cancel', order: 0, intercept: () => ({ kind: 'cancel' }) }],
  };
  const state = run(game(rules), rules).state,
    before = JSON.stringify(state);
  expect(
    resolveCommand(
      state,
      input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('D4') }),
      rules,
    ),
  ).toEqual({ ok: false, code: 'CAPTURE_CANCELED', events: [] });
  expect(JSON.stringify(state)).toBe(before);
});

it('does not naturally expire a permanent Bomb or allow a forged expiry removal', () => {
  const rules = reacting();
  let state = run(game(rules, createBoard([piece('v', 'pawn', 'A1', 'black')])), rules).state;
  const old = effects(state, rules)[0]!;
  state = run(run(state, rules, { kind: 'end' }).state, rules, { kind: 'end' }).state;
  expect(effects(state, rules)).toEqual([old]);
  const bad = {
    ...rules,
    skills: {
      cast: {
        cost: 0,
        operations: [
          {
            kind: 'effect_remove',
            instanceId: old.id,
            reason: 'expired',
          } as unknown as DerivedOperation,
        ],
      },
    },
  };
  expect(resolveCommand(state, input(), bad)).toMatchObject({ ok: false, events: [] });
});

function withRestriction(shield: boolean): RulesetBundle {
  const base = reacting();
  const plain = definition(false, {}, false);
  const extra: EffectDefinition = {
    ...plain,
    typeId: 'fixture.restriction',
    lifetime: { kind: 'rounds', rounds: 1, boundary: 'end' },
    ...(shield
      ? { captureDefense: SHIELD_CONSUMER_CONTRACT.captureDefense }
      : { actionRestrictions: [{ actionKind: 'main-action', policyId: 'stun.main.v1' }] }),
  };
  const registry = createEffectRegistry([...base.effectRegistry!.definitions, extra]);
  return {
    ...base,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      deathReactions: BOMB_DEATH_REACTION_BINDINGS,
      captureDefense: SHIELD_CAPTURE_DEFENSE_BINDINGS,
      restrictions: STUN_RESTRICTION_BINDINGS,
    }),
    skills: {
      cast: {
        cost: 0,
        operations: [
          apply(),
          apply(false, {
            definitionId: extra.typeId,
            target: { kind: 'piece', pieceId: (shield ? 'v' : 'r') as never },
          }),
        ],
      },
    },
  };
}

it('Shield-canceled capture has no Bomb, while committed non-King destruction bypasses Shield', () => {
  const rules = withRestriction(true),
    state = run(game(rules), rules).state;
  expect(
    resolveCommand(
      state,
      input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('D4') }),
      rules,
    ),
  ).toEqual({ ok: false, code: 'CAPTURE_DEFENDED', events: [] });
  const result = destroy(state, rules);
  if (!result.ok) throw new Error(result.code);
  expect(result.events.filter((e) => e.kind === 'bomb_exploded')).toHaveLength(1);
  expect(result.state.ap).toEqual({ white: 0, black: 1 });
});

it('Stun bearer cannot initiate capture or trigger the victim Bomb', () => {
  const rules = withRestriction(false),
    state = run(game(rules), rules).state;
  expect(
    resolveCommand(
      state,
      input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('D4') }),
      rules,
    ),
  ).toEqual({ ok: false, code: 'INVALID_MOVE', events: [] });
  expect(effects(state, rules)).toHaveLength(2);
});

it.each(['budget', 'mid-chain'] as const)(
  'rolls back board/AP/RNG/IDs/effects/history/events on %s failure',
  (fault) => {
    const base = reacting([
      apply(),
      apply(true, { target: { kind: 'piece', pieceId: 'w' as never }, sourcePlayer: 'black' }),
    ]);
    const rules: RulesetBundle = {
      ...base,
      repetition: (s) => ({ effects: [], delayedActions: [], variantState: s.variantState }),
      handlers:
        fault === 'mid-chain'
          ? [
              {
                id: 'fault',
                order: 0,
                react: (e) =>
                  e.kind === 'piece_destroyed' && e.payload.pieceId === 'w'
                    ? [
                        { kind: 'random', side: 'actor', namespace: 'fault', pool: ['a', 'b'] },
                        { kind: 'fail', code: 'MID_CHAIN' },
                      ]
                    : [],
              },
            ]
          : [],
    };
    const state = run(
      game(
        rules,
        createBoard([
          piece('r', 'rook', 'D1'),
          piece('v', 'pawn', 'D4', 'black'),
          piece('w', 'pawn', 'E4', 'black'),
          piece('outer', 'rook', 'F4'),
        ]),
      ),
      rules,
    ).state;
    const before = JSON.stringify(state);
    expect(
      resolveCommand(
        state,
        input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('D4') }),
        rules,
        fault === 'budget' ? { operationBudget: 3 } : {},
      ),
    ).toEqual({
      ok: false,
      code: fault === 'budget' ? 'RESOLUTION_LIMIT' : 'MID_CHAIN',
      events: [],
    });
    expect(JSON.stringify(state)).toBe(before);
  },
);

it('validates concrete reaction mode/definition/capability and rejects forged death queue operations', () => {
  const base = reacting();
  const wrongMode = {
    ...base,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      deathReactions: {
        'bomb.death.v1': {
          ...BOMB_DEATH_REACTION_BINDINGS['bomb.death.v1']!,
          mode: 'synthetic-v1' as never,
        },
      },
    }),
  };
  expect(resolveCommand(game(wrongMode), input(), wrongMode)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  for (const patch of [
    { capabilities: [] },
    { category: 'neutral' },
    { typeId: 'fixture.unapproved' },
  ]) {
    const registry = createEffectRegistry([
      definition(false, {
        deathReaction: BOMB_CONSUMER_CONTRACTS.charge.deathReaction,
        capabilities: ['react:committed-death-v1'],
        ...patch,
      } as Partial<EffectDefinition>),
    ]);
    const rules = {
      ...base,
      effectRegistry: registry,
      effectRuntime: createEffectRuntime(registry, {
        deathReactions: BOMB_DEATH_REACTION_BINDINGS,
      }),
      skills: {
        cast: {
          cost: 0,
          operations: [apply(false, { definitionId: registry.definitions[0]!.typeId })],
        },
      },
    };
    expect(resolveCommand(game(rules), input(), rules)).toEqual({
      ok: false,
      code: 'UNSUPPORTED_RUNTIME',
      events: [],
    });
  }
  const forged = {
    ...base,
    skills: {
      cast: {
        cost: 0,
        operations: [
          { kind: 'death_reaction', death: {}, instance: {} } as unknown as DerivedOperation,
        ],
      },
    },
  };
  expect(resolveCommand(game(forged), input(), forged)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
});

it.each(['mutate', 'wrong-target'] as const)(
  'rejects a concrete binding that attempts %s with full rollback',
  (fault) => {
    const base = reacting();
    const rules = {
      ...base,
      effectRuntime: createEffectRuntime(base.effectRegistry!, {
        deathReactions: {
          'bomb.death.v1': {
            ...BOMB_DEATH_REACTION_BINDINGS['bomb.death.v1']!,
            plan: (c) => {
              if (fault === 'mutate') (c.death.victim.position as { file: number }).file = 0;
              return [];
            },
          },
        },
      }),
    };
    const state = run(
      game(rules, createBoard([piece('v', 'pawn', 'D4', 'black'), piece('w', 'pawn', 'E4')])),
      rules,
    ).state;
    const before = JSON.stringify(state),
      result = destroy(state, rules);
    expect(result).toMatchObject({ ok: false, events: [] });
    if (fault === 'wrong-target') expect(result).toMatchObject({ code: 'INVALID_BOMB_PLAN' });
    expect(JSON.stringify(state)).toBe(before);
  },
);

it('round-trips Bomb snapshots and replays chain events/hashes exactly', () => {
  const rules = reacting([
    apply(),
    apply(true, { target: { kind: 'piece', pieceId: 'w' as never }, sourcePlayer: 'black' }),
  ]);
  const initial = game(
    rules,
    createBoard([
      piece('r', 'rook', 'D1'),
      piece('v', 'pawn', 'D4', 'black'),
      piece('w', 'pawn', 'E4', 'black'),
      piece('outer', 'bishop', 'F4'),
    ]),
  );
  const armed = run(initial, rules).state,
    encoded = encodeSnapshot(armed, rules.effectRegistry);
  expect(encodeSnapshot(decodeSnapshot(encoded, rules), rules.effectRegistry)).toBe(encoded);
  const replay = recordReplay(
    initial,
    [input(), input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('D4') })],
    rules,
  );
  if (!replay.ok) throw new Error(replay.code);
  const executed = executeReplay(replay.archive, rules);
  if (!executed.ok) throw new Error(executed.code);
  expect(executed.state).toEqual(replay.state);
  expect(executed.events).toEqual(replay.archive.steps.flatMap((s) => s.events));
  const tampered = structuredClone(replay.archive);
  const explosion = tampered.steps[1]!.events.find((e) => e.kind === 'bomb_exploded');
  if (!explosion || explosion.kind !== 'bomb_exploded') throw new Error('FIXTURE');
  (explosion.payload.center as { file: number }).file = 0;
  expect(executeReplay(tampered, rules)).toEqual({
    ok: false,
    code: 'REPLAY_DIVERGENCE',
    events: [],
  });
});

it.each(['white', 'black'] as const)(
  'preserves %s Bomb source independently from root initiator and victim controller',
  (sourcePlayer) => {
    const rules = reacting([apply(false, { sourcePlayer })]);
    const state = run(
      game(
        rules,
        createBoard([
          piece('v', 'pawn', 'D4', 'black', 'white'),
          piece('w', 'pawn', 'E4', 'white', 'black'),
        ]),
      ),
      rules,
    ).state;
    const result = destroy(state, rules);
    if (!result.ok) throw new Error(result.code);
    expect(
      result.events
        .filter((e) => e.kind === 'piece_destroyed')
        .map((e) => [e.payload.actor, e.payload.source?.sourcePlayer]),
    ).toEqual([
      [null, undefined],
      [sourcePlayer, sourcePlayer],
    ]);
    expect(result.state.ap).toEqual({ white: 1, black: 1 });
  },
);

it('keeps Bomb consumers disabled and validates empty immutable payload without enabling incomplete definitions', () => {
  for (const contract of Object.values(BOMB_CONSUMER_CONTRACTS)) {
    expect(contract.enabled).toBe(false);
    expect(Object.isFrozen(contract.family)).toBe(true);
    expect(() => createEffectRegistry([contract as unknown as EffectDefinition])).toThrow();
  }
  expect(BOMB_PAYLOAD_SCHEMA.parse({})).toEqual({});
  expect(Object.isFrozen(BOMB_PAYLOAD_SCHEMA.parse({}))).toBe(true);
  expect(() => BOMB_PAYLOAD_SCHEMA.parse({ radius: 9 })).toThrow('INVALID_BOMB_PAYLOAD');
});

it('selects current blast occupants after earlier queued deaths, not stale death/application occupancy', () => {
  const rules = reacting([
    apply(),
    { kind: 'destroy', pieceId: 'v' },
    { kind: 'destroy', pieceId: 'w' },
  ]);
  const result = run(
    game(
      rules,
      createBoard([
        piece('v', 'pawn', 'D4', 'black'),
        piece('w', 'pawn', 'E4'),
        piece('live', 'pawn', 'E5', 'black'),
      ]),
    ),
    rules,
  );
  expect(
    result.events.filter((e) => e.kind === 'bomb_exploded').map((e) => e.payload.targets),
  ).toEqual([['live']]);
  expect(
    result.events.filter((e) => e.kind === 'piece_destroyed').map((e) => e.payload.pieceId),
  ).toEqual(['v', 'w', 'live']);
  expect(result.state.ap).toEqual({ white: 1, black: 2 });
});

it('validates whole-set family assignment simultaneously and preserves each Bomb source/category across swap', () => {
  const rules = reacting([
    apply(),
    apply(true, { target: { kind: 'piece', pieceId: 'w' as never }, sourcePlayer: 'black' }),
    { kind: 'effect_sets_swap', pieceA: 'v' as never, pieceB: 'w' as never },
  ]);
  const result = run(
    game(
      rules,
      createBoard([piece('v', 'pawn', 'A1', 'black'), piece('w', 'pawn', 'D4', 'black')]),
    ),
    rules,
  );
  expect(
    effects(result.state, rules).map((e) => [e.id, e.definitionId, e.target, e.sourcePlayer]),
  ).toEqual([
    ['bomb:operation:2', 'effect.bomb.charge', { kind: 'piece', pieceId: 'w' }, 'white'],
    ['bomb:operation:3', 'effect.bomb.mine', { kind: 'piece', pieceId: 'v' }, 'black'],
  ]);
  expect(
    result.events.filter(
      (e) =>
        e.kind === 'effect_removed' || e.kind === 'effect_refreshed' || e.kind === 'bomb_exploded',
    ),
  ).toEqual([]);
  const dead = destroy(result.state, rules);
  if (!dead.ok) throw new Error(dead.code);
  expect(
    dead.events
      .filter((e) => e.kind === 'bomb_exploded')
      .map((e) => [e.payload.definitionId, e.payload.source.sourcePlayer]),
  ).toEqual([['effect.bomb.mine', 'black']]);
});

it('does not replace an existing Bomb because the duplicate producer has different synthetic King eligibility', () => {
  const base = reacting([apply(), apply(true)]);
  const registry = createEffectRegistry(
    base.effectRegistry!.definitions.map((d) =>
      d.typeId === 'effect.bomb.mine' ? { ...d, kingEligibility: { kind: 'denied' as const } } : d,
    ),
  );
  const rules = {
    ...base,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, { deathReactions: BOMB_DEATH_REACTION_BINDINGS }),
  };
  const result = run(game(rules, createBoard([piece('v', 'king', 'A1', 'black')])), rules);
  expect(effects(result.state, rules).map((e) => e.definitionId)).toEqual(['effect.bomb.charge']);
  expect(result.events.filter((e) => e.kind === 'effect_applied')).toHaveLength(1);
});

it('does not let family ignore bypass invalid payload/version validation', () => {
  for (const patch of [
    { definitionVersion: '9.0.0' },
    { payload: { radius: 9 } },
    { sourceSkill: null },
  ]) {
    const rules = reacting([apply(), apply(true, patch)]);
    const state = game(rules),
      before = JSON.stringify(state);
    expect(resolveCommand(state, input(), rules)).toMatchObject({ ok: false, events: [] });
    expect(JSON.stringify(state)).toBe(before);
  }
  const base = reacting([apply(), apply(true)]);
  const registry = createEffectRegistry(
    base.effectRegistry!.definitions.map((d) =>
      d.typeId === 'effect.bomb.mine'
        ? { ...d, eligibility: { policyId: 'missing-eligibility-binding' } }
        : d,
    ),
  );
  const missing = {
    ...base,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, { deathReactions: BOMB_DEATH_REACTION_BINDINGS }),
  };
  expect(resolveCommand(game(missing), input(), missing)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
});

it('reacts only once despite a duplicate destruction queued by a synthetic committed-death observer', () => {
  const base = reacting();
  const rules: RulesetBundle = {
    ...base,
    handlers: [
      {
        id: 'duplicate',
        order: 0,
        react: (e) =>
          e.kind === 'piece_destroyed' && e.payload.pieceId === 'v'
            ? [{ kind: 'destroy', pieceId: 'v' }]
            : [],
      },
    ],
  };
  const state = run(
    game(rules, createBoard([piece('v', 'pawn', 'D4', 'black'), piece('w', 'rook', 'E4')])),
    rules,
  ).state;
  const result = destroy(state, rules);
  if (!result.ok) throw new Error(result.code);
  expect(result.events.filter((e) => e.kind === 'bomb_exploded')).toHaveLength(1);
  expect(
    result.events.filter((e) => e.kind === 'piece_destroyed').map((e) => e.payload.pieceId),
  ).toEqual(['v', 'w']);
  expect(result.state.ap).toEqual({ white: 3, black: 1 });
});

it('keeps retired hidden payload data inside the root and all emitted facts explicitly internal', () => {
  const base = reacting();
  const plain = definition(false, {}, false);
  const hidden: EffectDefinition = {
    ...plain,
    typeId: 'fixture.hidden',
    visibility: { kind: 'source-player' },
    payloadSchema: {
      parse: (v) => {
        if (
          !v ||
          typeof v !== 'object' ||
          Array.isArray(v) ||
          Object.keys(v).length !== 1 ||
          !('secret' in v) ||
          typeof v.secret !== 'string'
        )
          throw new Error('INVALID_HIDDEN_FIXTURE');
        return { secret: v.secret };
      },
    },
    repetitionProjector: () => null,
  };
  const registry = createEffectRegistry([...base.effectRegistry!.definitions, hidden]);
  const rules = {
    ...base,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, { deathReactions: BOMB_DEATH_REACTION_BINDINGS }),
    skills: {
      cast: {
        cost: 0,
        operations: [
          apply(),
          apply(false, {
            definitionId: hidden.typeId,
            payload: { secret: 'DO_NOT_SERIALIZE_RETIRED_PAYLOAD' },
          }),
        ],
      },
    },
  };
  const state = run(game(rules), rules).state;
  const result = destroy(state, rules);
  if (!result.ok) throw new Error(result.code);
  expect(result.events.every((e) => e.visibility === 'internal')).toBe(true);
  expect(JSON.stringify(result.events)).not.toContain('DO_NOT_SERIALIZE_RETIRED_PAYLOAD');
  expect(JSON.stringify(result.events)).not.toContain('retiredEffects');
  expect(JSON.stringify(result.events)).not.toContain('seed');
  expect(DomainEventSchema.safeParse({ ...result.events[0], visibility: 'public' }).success).toBe(
    false,
  );
});

it('projects family/category/original source while excluding allocation IDs and irrelevant cross-target application order', () => {
  function key(operations: readonly DerivedOperation[]) {
    const rules = reacting(operations);
    const state = run(
      game(
        rules,
        createBoard([piece('v', 'pawn', 'A1', 'black'), piece('w', 'pawn', 'B1', 'black')]),
      ),
      rules,
    ).state;
    return Object.keys(run(state, rules, { kind: 'end' }).state.history.repetition).at(-1)!;
  }
  const base = key([apply()]);
  expect(base).not.toBe(key([apply(true)]));
  expect(base).not.toBe(key([apply(false, { sourcePlayer: 'black' })]));
  expect(base).not.toBe(key([apply(false, { sourceSkill: 'other' })]));
  expect(base).toBe(key([{ kind: 'marker', value: 'allocation-noise' }, apply()]));
  expect(JSON.parse(base).effects[0]).toMatchObject({
    family: { id: 'bomb', policy: 'unique-target-ignore' },
    category: 'buff',
  });
  const other = apply(true, { target: { kind: 'piece', pieceId: 'w' as never } });
  expect(key([apply(), other])).toBe(key([other, apply()]));
});

it('uses the final victim death coordinate after a supported synthetic generic redirect', () => {
  const base = reacting([apply(false, { target: { kind: 'piece', pieceId: 'w' as never } })]);
  const rules: RulesetBundle = {
    ...base,
    interceptors: [
      {
        id: 'synthetic-redirect',
        order: 0,
        intercept: () => ({ kind: 'redirect', targetId: 'w' }),
      },
    ],
  };
  const state = run(
    game(
      rules,
      createBoard([
        piece('r', 'rook', 'D1'),
        piece('v', 'pawn', 'D4', 'black'),
        piece('w', 'pawn', 'E1', 'black'),
      ]),
    ),
    rules,
  ).state;
  const result = run(state, rules, {
    kind: 'move',
    pieceId: 'r' as never,
    to: coordinateFromAlgebraic('D4'),
  });
  expect(Object.keys(result.state.board.pieces)).toEqual(['v']);
  expect(
    result.events.filter((e) => e.kind === 'bomb_exploded').map((e) => e.payload.center),
  ).toEqual([{ file: 4, rankIndex: 0 }]);
});

it('pins committed concrete reaction/event semantics to engine0.6.0 and rejects engine0.4.0 snapshots/replays', () => {
  const rules = reacting(),
    state = game(rules);
  expect(state.engineVersion).toBe('0.6.0');
  expect(() =>
    decodeSnapshot(JSON.stringify({ ...state, engineVersion: '0.4.0' }), rules),
  ).toThrow();
  const recorded = recordReplay(state, [], rules);
  if (!recorded.ok) throw new Error(recorded.code);
  expect(
    executeReplay(
      {
        ...recorded.archive,
        initialConfig: { ...recorded.archive.initialConfig, engineVersion: '0.4.0' },
      },
      rules,
    ),
  ).toMatchObject({ ok: false, events: [] });
});
