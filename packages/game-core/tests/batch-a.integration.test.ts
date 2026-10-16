import { expect, it } from 'vitest';
import {
  resolveCommand,
  queryLegalMainActions,
  queryCaptureThreats,
  createBoard,
  createGame,
  cloneSnapshot,
  encodeSnapshot,
  decodeSnapshot,
  fullStateHash,
  recordReplay,
  executeReplay,
  encodeEffectRecords,
  createEffectRegistry,
  createEffectRuntime,
} from '../src/index.js';
import { GameStateSchema } from '@variant-chess/shared-types';
import type { RulesetBundle, DerivedOperation } from '../src/index.js';
import { piece } from './fixtures.js';
import {
  application as a,
  batchRuleset,
  batchGame,
  cast,
  records,
  move,
  end,
  playerInput,
  duration,
  systemDestroy,
  play,
  SYNTHETIC_TEST_ONLY,
  IDS,
} from './batch-a-fixture.js';

it.each(['white', 'black'] as const)(
  'composes Stun×Shield×Bomb legality for %s while preserving protection and an un-Stunned main move',
  (actor) => {
    const enemy = actor === 'white' ? 'black' : 'white';
    const target = actor === 'white' ? 'D4' : 'D12';
    const rules = batchRuleset(`legality-${actor}`, {
      setup: [
        a('stun', 'attacker', { sourcePlayer: enemy }),
        a('stun', 'bearer', { sourcePlayer: actor }),
        a('shield', 'bearer', { sourcePlayer: enemy }),
        a('charge', 'bearer', { sourcePlayer: actor }),
      ],
    });
    const state = cast(
      batchGame(
        rules,
        [
          piece('attacker', 'rook', actor === 'white' ? 'D1' : 'D15', actor),
          piece('spare', 'rook', actor === 'white' ? 'D10' : 'D6', actor),
          piece('bearer', 'knight', target, enemy),
        ],
        actor,
      ),
      rules,
    ).state;
    const before = JSON.stringify(state);
    expect(rules.hash).toContain(SYNTHETIC_TEST_ONLY);
    expect(queryLegalMainActions(state, rules).map((m) => m.pieceId)).not.toContain('attacker');
    expect(
      queryLegalMainActions(state, rules).some((m) => m.pieceId === 'spare' && m.kind === 'move'),
    ).toBe(true);
    expect(queryCaptureThreats(state, actor, rules).map((m) => m.pieceId)).not.toContain(
      'attacker',
    );
    expect(
      resolveCommand(
        state,
        playerInput(move('attacker', actor === 'white' ? 'D2' : 'D14'), actor),
        rules,
      ),
    ).toEqual({ ok: false, code: 'INVALID_MOVE', events: [] });
    expect(resolveCommand(state, playerInput(move('spare', target), actor), rules)).toEqual({
      ok: false,
      code: 'CAPTURE_DEFENDED',
      events: [],
    });
    expect(resolveCommand(state, playerInput(end, actor), rules)).toEqual({
      ok: false,
      code: 'MAIN_MOVE_REQUIRED',
      events: [],
    });
    expect(JSON.stringify(state)).toBe(before);
    expect(records(state, rules).map((e) => e.definitionId)).toEqual([
      IDS.stun,
      IDS.stun,
      IDS.shield,
      IDS.charge,
    ]);
    expect(state.ap[actor]).toBe(19);
  },
);

it('destroys Shielded/Stunned Bomb bearers through two-source FIFO while preserving effects on surviving pieces', () => {
  const rules = batchRuleset('four-way-chain', {
    setup: [
      a('stun', 'v'),
      a('shield', 'v'),
      a('charge', 'v', { sourcePlayer: 'black', sourceSkill: 'synthetic.alpha' }),
      a('stun', 'w'),
      a('shield', 'w'),
      a('mine', 'w', { sourcePlayer: 'white', sourceSkill: 'synthetic.beta' }),
      a('stun', 'survivor', {
        duration: duration(3),
        sourcePiece: 'w' as never,
        sourceIncarnation: 'synthetic.life.1',
      }),
      a('shield', 'survivor', {
        duration: duration(3),
        sourcePiece: 'v' as never,
        sourceIncarnation: 'synthetic.life.2',
      }),
    ],
  });
  const state = cast(
    batchGame(rules, [
      piece('attacker', 'rook', 'D1'),
      piece('v', 'pawn', 'D4', 'black', 'white'),
      piece('w', 'pawn', 'E4', 'black'),
      piece('overlap', 'knight', 'E5', 'white', 'black'),
      piece('outer', 'bishop', 'F4', 'black', 'white'),
      piece('king', 'king', 'F5'),
      piece('survivor', 'rook', 'H8'),
    ]),
    rules,
  ).state;
  const kept = records(state, rules).filter(
    (e) => e.target.kind === 'piece' && e.target.pieceId === 'survivor',
  );
  const before = JSON.stringify(state);
  expect(resolveCommand(state, playerInput(move('attacker', 'D4')), rules)).toEqual({
    ok: false,
    code: 'CAPTURE_DEFENDED',
    events: [],
  });
  expect(JSON.stringify(state)).toBe(before);
  const result = systemDestroy(state, rules, 'v');
  if (!result.ok) throw new Error(result.code);
  expect(Object.keys(result.state.board.pieces).sort()).toEqual(['attacker', 'king', 'survivor']);
  expect(result.state.ap).toEqual({ white: 22, black: 23 });
  expect(
    result.events
      .filter((e) => e.kind === 'piece_destroyed')
      .map((e) => [e.payload.pieceId, e.payload.actor, e.payload.source?.sourcePlayer]),
  ).toEqual([
    ['v', null, undefined],
    ['w', 'black', 'black'],
    ['overlap', 'black', 'black'],
    ['outer', 'white', 'white'],
  ]);
  expect(
    result.events
      .filter((e) => e.kind === 'bomb_exploded')
      .map((e) => [e.payload.definitionId, e.payload.targets]),
  ).toEqual([
    [IDS.charge, ['w', 'overlap']],
    [IDS.mine, ['outer']],
  ]);
  expect(records(result.state, rules)).toEqual(kept);
  expect(queryLegalMainActions(result.state, rules).map((m) => m.pieceId)).not.toContain(
    'survivor',
  );
  expect(queryCaptureThreats(result.state, 'white', rules).map((m) => m.pieceId)).not.toContain(
    'survivor',
  );
  expect(cloneSnapshot(result.state, rules)).toEqual(result.state);
});

it('keeps distinct timed sources and stable refresh through caster move/death, control fixture and empty-set swap', () => {
  const source1 = {
    sourcePlayer: 'white' as const,
    sourcePiece: 'c1' as never,
    sourceIncarnation: 'synthetic.life.1',
  };
  const rules = batchRuleset('source-lifecycle', {
    setup: [
      a('stun', 'p', source1),
      a('stun', 'p', { ...source1, duration: duration(3) }),
      a('stun', 'p', {
        ...source1,
        sourceSkill: 'synthetic.beta',
        duration: duration(1, 'synthetic.beta'),
      }),
      a('stun', 'p', { ...source1, sourcePiece: 'c2' as never }),
      a('stun', 'p', { ...source1, sourcePlayer: 'black' }),
      a('stun', 'p', {
        ...source1,
        sourceVariant: 'synthetic.other',
        duration: duration(1, 'synthetic.other'),
      }),
      a('stun', 'p', { ...source1, sourceIncarnation: 'synthetic.life.2' }),
      a('shield', 'p', source1),
      a('shield', 'p', {
        ...source1,
        sourceSkill: 'synthetic.beta',
        duration: duration(1, 'synthetic.beta'),
      }),
      a('charge', 'p', { sourcePiece: 'c1' as never }),
      a('mine', 'p', { sourcePlayer: 'black', sourcePiece: 'c2' as never }),
    ],
    swap: [{ kind: 'effect_sets_swap', pieceA: 'p' as never, pieceB: 'q' as never }],
  });
  let state = cast(
    batchGame(rules, [
      piece('p', 'rook', 'H8'),
      piece('q', 'pawn', 'H10', 'black'),
      piece('c1', 'rook', 'A1'),
      piece('c2', 'pawn', 'B1'),
    ]),
    rules,
  ).state;
  const original = records(state, rules);
  expect(original.filter((e) => e.definitionId === IDS.stun)).toHaveLength(6);
  expect(original.filter((e) => e.definitionId === IDS.shield)).toHaveLength(2);
  expect(
    original.filter((e) => e.definitionId === IDS.charge || e.definitionId === IDS.mine),
  ).toHaveLength(1);
  expect(original[0]).toMatchObject({
    id: 'batch:operation:2',
    duration: { rounds: 3 },
    deadline: { side: 'white', boundary: 'end', ordinal: 4 },
  });
  state = play(state, rules, move('c1', 'A2')).state;
  // SYNTHETIC_TEST_ONLY initial-state conversion/control seam; no gameplay transfer command added.
  state = GameStateSchema.parse({
    ...state,
    board: createBoard(
      Object.values(state.board.pieces).map((p) =>
        p.id === 'p' ? { ...p, owner: 'black' as const, controller: 'black' as const } : p,
      ),
    ),
  });
  const dead = systemDestroy(state, rules, 'c1');
  if (!dead.ok) throw new Error(dead.code);
  expect(records(dead.state, rules)).toEqual(original);
  const swapped = cast(dead.state, rules, 'swap');
  expect(records(swapped.state, rules)).toEqual(
    original.map((e) => ({ ...e, target: { kind: 'piece', pieceId: 'q' } })),
  );
  expect(
    swapped.events.some((e) =>
      ['effect_applied', 'effect_refreshed', 'effect_removed', 'bomb_exploded'].includes(e.kind),
    ),
  ).toBe(false);
  expect(queryLegalMainActions(swapped.state, rules).some((m) => m.pieceId === 'p')).toBe(true);
  expect(queryLegalMainActions(swapped.state, rules).some((m) => m.pieceId === 'q')).toBe(false);
  // Canonical collections use lexical IDs, not application order (ENGINE_ARCHITECTURE §6).
  const restored = cloneSnapshot(swapped.state, rules);
  expect(restored.effects.map((e) => e.id)).toEqual([
    'batch:operation:10',
    'batch:operation:11',
    'batch:operation:2',
    'batch:operation:4',
    'batch:operation:5',
    'batch:operation:6',
    'batch:operation:7',
    'batch:operation:8',
    'batch:operation:9',
  ]);
  expect(Object.fromEntries(records(restored, rules).map((e) => [e.id, e]))).toEqual(
    Object.fromEntries(records(swapped.state, rules).map((e) => [e.id, e])),
  );
  expect(encodeSnapshot(restored, rules.effectRegistry)).toBe(
    encodeSnapshot(swapped.state, rules.effectRegistry),
  );
  expect(fullStateHash(restored, rules.effectRegistry)).toEqual(
    fullStateHash(swapped.state, rules.effectRegistry),
  );
  expect(restored.effects).not.toBe(swapped.state.effects);
  for (const command of [move('p', 'H7')]) {
    const originalNext = play(swapped.state, rules, command);
    const restoredNext = play(restored, rules, command);
    expect(restoredNext.events).toEqual(originalNext.events);
    expect(fullStateHash(restoredNext.state, rules.effectRegistry)).toEqual(
      fullStateHash(originalNext.state, rules.effectRegistry),
    );
  }
});

it('uses adjacent source-end expiry for combined legality and later Bomb capture without expiry reactions', () => {
  const rules = batchRuleset('boundary-capture', {
    setup: [
      a('stun', 'r'),
      a('stun', 'v', { duration: duration(3) }),
      a('shield', 'v', { sourcePlayer: 'black' }),
      a('charge', 'v', { sourcePlayer: 'black' }),
    ],
  });
  let state = cast(
    batchGame(rules, [piece('r', 'rook', 'C1'), piece('v', 'pawn', 'A1', 'black')]),
    rules,
  ).state;
  expect(queryLegalMainActions(state, rules)).toEqual([]);
  state = play(state, rules, end).state; // White cast boundary does not tick White Stun.
  const shieldExpiry = play(state, rules, end); // Black source-end1 expires its Shield only.
  expect(
    shieldExpiry.events
      .filter((e) => e.kind === 'effect_removed')
      .map((e) => [e.payload.definitionId, e.payload.reason]),
  ).toEqual([[IDS.shield, 'expired']]);
  state = shieldExpiry.state;
  expect(resolveCommand(state, playerInput(move('r', 'A1')), rules)).toEqual({
    ok: false,
    code: 'INVALID_MOVE',
    events: [],
  });
  const stunExpiry = play(state, rules, end);
  expect(
    stunExpiry.events
      .filter((e) => e.kind === 'effect_removed')
      .map((e) => [e.payload.definitionId, e.payload.reason]),
  ).toEqual([[IDS.stun, 'expired']]);
  expect(stunExpiry.events.some((e) => e.kind === 'bomb_exploded')).toBe(false);
  state = play(stunExpiry.state, rules, end).state;
  expect(queryCaptureThreats(state, 'white', rules).map((m) => m.targetId)).toEqual(['v']);
  const captured = play(state, rules, move('r', 'A1'));
  expect(captured.state.board.pieces).toEqual({});
  expect(captured.state.ap).toEqual({ white: 24, black: 21 });
  expect(captured.events.filter((e) => e.kind === 'bomb_exploded')).toHaveLength(1);
  expect(
    captured.events.filter((e) => e.kind === 'capture_committed').map((e) => e.payload.pieceId),
  ).toEqual(['v']);
});

it('refreshes same-source Stun and Shield before expiry while leaving the other source clock untouched', () => {
  const rules = batchRuleset('refresh-clocks', {
    setup: [
      a('stun', 'r', { duration: duration(3) }),
      a('shield', 'v'),
      a('stun', 'r', { sourcePlayer: 'black', duration: duration(3) }),
      a('mine', 'v'),
    ],
    refresh: [a('stun', 'r'), a('shield', 'v', { duration: duration(3) })],
  });
  let state = cast(
    batchGame(rules, [piece('r', 'rook', 'C1'), piece('v', 'pawn', 'A1', 'black')]),
    rules,
  ).state;
  const before = records(state, rules);
  state = play(play(state, rules, end).state, rules, end).state;
  const refreshed = cast(state, rules, 'refresh');
  const after = records(refreshed.state, rules);
  expect(after[0]).toMatchObject({
    id: before[0]!.id,
    appliedSequence: before[0]!.appliedSequence,
    timingAnchor: { side: 'white', boundary: 'end', ordinal: 2 },
    deadline: { side: 'white', boundary: 'end', ordinal: 3 },
  });
  expect(after[1]).toMatchObject({
    id: before[1]!.id,
    timingAnchor: { side: 'white', boundary: 'end', ordinal: 2 },
    deadline: { side: 'white', boundary: 'end', ordinal: 5 },
  });
  expect(after.slice(2)).toEqual(before.slice(2));
  expect(
    refreshed.events.filter((e) => e.kind === 'effect_refreshed').map((e) => e.payload.effectId),
  ).toEqual([before[0]!.id, before[1]!.id]);
  const ended = play(refreshed.state, rules, end);
  expect(ended.events.some((e) => e.kind === 'effect_removed' || e.kind === 'bomb_exploded')).toBe(
    false,
  );
  expect(records(ended.state, rules)).toEqual(after);
});

it.each(['different-size', 'empty', 'same-clock', 'cross-clock'] as const)(
  'swaps %s sets atomically, then explodes using the new bearer coordinate/source',
  (shape) => {
    const initial: DerivedOperation[] = [
      a('stun', 'p', { duration: duration(3) }),
      a('shield', 'p', { sourcePlayer: shape === 'cross-clock' ? 'black' : 'white' }),
      a('charge', 'p'),
      ...(shape === 'empty'
        ? []
        : [
            a('mine', 'q', { sourcePlayer: 'black' }),
            a('stun', 'q', {
              sourcePlayer: shape === 'same-clock' ? 'white' : 'black',
              duration: duration(3),
            }),
          ]),
    ];
    const rules = batchRuleset(`swap-${shape}`, {
      setup: initial,
      swap: [{ kind: 'effect_sets_swap', pieceA: 'p' as never, pieceB: 'q' as never }],
    });
    let state = cast(
      batchGame(rules, [
        piece('p', 'pawn', 'A1'),
        piece('q', 'pawn', 'D4', 'black'),
        piece('spare', 'rook', 'O1'),
        piece('neighbor', 'knight', 'E4'),
      ]),
      rules,
    ).state;
    state = play(state, rules, move('spare', 'O2')).state;
    const before = records(state, rules);
    const swapped = cast(state, rules, 'swap');
    expect(records(swapped.state, rules)).toEqual(
      before.map((e) => ({
        ...e,
        target: {
          kind: 'piece',
          pieceId: e.target.kind === 'piece' && e.target.pieceId === 'p' ? 'q' : 'p',
        },
      })),
    );
    expect(
      swapped.events.filter((e) =>
        ['effect_applied', 'effect_refreshed', 'effect_removed', 'bomb_exploded'].includes(e.kind),
      ),
    ).toEqual([]);
    expect(swapped.events.filter((e) => e.kind === 'effect_sets_swapped')).toHaveLength(1);
    const death = systemDestroy(swapped.state, rules, 'q');
    if (!death.ok) throw new Error(death.code);
    expect(
      death.events
        .filter((e) => e.kind === 'bomb_exploded')
        .map((e) => [e.payload.definitionId, e.payload.source.sourcePlayer, e.payload.center]),
    ).toEqual([[IDS.charge, 'white', { file: 3, rankIndex: 3 }]]);
    expect(death.state.ap).toEqual({ white: 21, black: 20 });
    expect(death.state.board.pieces.neighbor).toBeUndefined();
    expect(
      records(death.state, rules).every(
        (e) => e.target.kind === 'piece' && e.target.pieceId === 'p',
      ),
    ).toBe(true);
  },
);

it('rejects a mixed-set destination after candidate RNG/AP changes without partial commit', () => {
  const rules = batchRuleset('invalid-destination', {
    setup: [a('stun', 'p'), a('shield', 'p'), a('charge', 'p')],
    bad: [
      { kind: 'random', side: 'actor', namespace: 'synthetic', pool: ['a', 'b'] },
      { kind: 'effect_sets_swap', pieceA: 'p' as never, pieceB: 'blocked-destination' as never },
    ],
  });
  let state = cast(
    batchGame(rules, [
      piece('p', 'pawn', 'A1'),
      piece('blocked-destination', 'pawn', 'D4', 'black'),
      piece('spare', 'rook', 'O1'),
    ]),
    rules,
  ).state;
  state = play(state, rules, move('spare', 'O2')).state;
  const before = JSON.stringify(state);
  expect(
    resolveCommand(state, playerInput({ kind: 'skill', skillId: 'bad' }, 'black'), rules),
  ).toEqual({ ok: false, code: 'EFFECT_INELIGIBLE', events: [] });
  expect(JSON.stringify(state)).toBe(before);
});

it('rejects a final Bomb family collision across definitions while retaining both complete effect sets', () => {
  const base = batchRuleset('family-collision', {
    setup: [a('stun', 'p'), a('shield', 'p'), a('charge', 'p'), a('mine', 'q')],
    bad: [
      { kind: 'random', side: 'actor', namespace: 'synthetic', pool: ['a', 'b'] },
      { kind: 'marker', value: 'SYNTHETIC_COLLIDE' },
    ],
  });
  const rules: RulesetBundle = {
    ...base,
    handlers: [
      {
        id: 'synthetic.collide',
        order: 0,
        react: (e, state) => {
          if (e.kind !== 'marker' || e.payload.value !== 'SYNTHETIC_COLLIDE') return [];
          const mine = records(state, base).find((v) => v.definitionId === IDS.mine)!;
          return [
            {
              kind: 'effect_relocate',
              instanceId: mine.id,
              target: { kind: 'piece', pieceId: 'p' as never },
            },
          ];
        },
      },
    ],
  };
  let state = cast(
    batchGame(rules, [
      piece('p', 'pawn', 'A1'),
      piece('q', 'pawn', 'D4', 'black'),
      piece('spare', 'rook', 'O1'),
    ]),
    rules,
  ).state;
  state = play(state, rules, move('spare', 'O2')).state;
  const before = JSON.stringify(state);
  expect(
    resolveCommand(state, playerInput({ kind: 'skill', skillId: 'bad' }, 'black'), rules),
  ).toEqual({ ok: false, code: 'EFFECT_FAMILY_DUPLICATE', events: [] });
  expect(JSON.stringify(state)).toBe(before);
});

it.each(['mid-chain', 'budget'] as const)(
  'rolls back the complete four-consumer candidate on %s FIFO failure',
  (fault) => {
    const base = batchRuleset(`rollback-${fault}`, {
      setup: [
        a('stun', 'v'),
        a('shield', 'v'),
        a('charge', 'v'),
        a('stun', 'w'),
        a('shield', 'w'),
        a('mine', 'w', { sourcePlayer: 'black' }),
      ],
    });
    const rules: RulesetBundle = {
      ...base,
      handlers:
        fault === 'mid-chain'
          ? [
              {
                id: 'synthetic.fault',
                order: 0,
                react: (e) =>
                  e.kind === 'piece_destroyed' && e.payload.pieceId === 'w'
                    ? [
                        {
                          kind: 'random',
                          side: 'actor',
                          namespace: 'synthetic.fault',
                          pool: ['a', 'b'],
                        },
                        { kind: 'fail', code: 'SYNTHETIC_MID_CHAIN' },
                      ]
                    : [],
              },
            ]
          : [],
    };
    const state = cast(
      batchGame(rules, [
        piece('v', 'pawn', 'D4', 'black'),
        piece('w', 'pawn', 'E4'),
        piece('outer', 'rook', 'F4', 'black'),
      ]),
      rules,
    ).state;
    const before = encodeSnapshot(state, rules.effectRegistry);
    const result = resolveCommand(
      state,
      { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'v' } },
      rules,
      fault === 'budget' ? { operationBudget: 3 } : {},
    );
    expect(result).toEqual({
      ok: false,
      code: fault === 'budget' ? 'RESOLUTION_LIMIT' : 'SYNTHETIC_MID_CHAIN',
      events: [],
    });
    expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
    const success = systemDestroy(state, base, 'v');
    if (!success.ok) throw new Error(success.code);
    expect(success.state.ap).toEqual({ white: 20, black: 24 });
    expect(
      success.events.filter((e) => e.kind === 'piece_destroyed').map((e) => e.payload.pieceId),
    ).toEqual(['v', 'w', 'outer']);
    expect(
      success.events
        .filter((e) => e.kind === 'bomb_exploded')
        .map((e) => e.payload.source.sourcePlayer),
    ).toEqual(['white', 'black']);
  },
);

it('blocks Shielded King capture, then terminates after expiry without reacting to the captured King Bomb', () => {
  const rules = batchRuleset('king-terminal', {
    setup: [
      a('stun', 'king', { duration: duration(3) }),
      a('shield', 'king', { sourcePlayer: 'black' }),
      a('charge', 'king'),
      a('stun', 'near', { duration: duration(3) }),
      a('mine', 'near', { sourcePlayer: 'black' }),
    ],
  });
  const state = cast(
    batchGame(rules, [
      piece('r', 'rook', 'C1'),
      piece('king', 'king', 'A1', 'black'),
      piece('near', 'pawn', 'A2', 'black'),
    ]),
    rules,
  ).state;
  expect(resolveCommand(state, playerInput(move('r', 'A1')), rules)).toEqual({
    ok: false,
    code: 'CAPTURE_DEFENDED',
    events: [],
  });
  expect(state.terminal).toEqual({ status: 'ongoing' });
  const next = play(play(state, rules, move('r', 'D1')).state, rules, end);
  expect(
    next.events.filter((e) => e.kind === 'effect_removed').map((e) => e.payload.definitionId),
  ).toEqual([IDS.shield]);
  const captured = play(next.state, rules, move('r', 'A1'));
  expect(captured.state.terminal).toMatchObject({ status: 'won', winner: 'white' });
  expect(Object.keys(captured.state.board.pieces).sort()).toEqual(['near', 'r']);
  expect(
    captured.events.filter((e) => e.kind === 'bomb_exploded' || e.kind === 'piece_destroyed'),
  ).toEqual([]);
  expect(captured.events.filter((e) => e.kind === 'terminal_reached')).toHaveLength(1);
});

it('fails closed for unapproved Shield/interceptor priority and for derived capture during a Bomb cascade', () => {
  const base = batchRuleset('unsupported-pairs', {
    setup: [
      a('shield', 'v'),
      a('stun', 'v'),
      a('charge', 'v'),
      a('mine', 'near', { sourcePlayer: 'black' }),
    ],
  });
  const priority: RulesetBundle = {
    ...base,
    interceptors: [
      { id: 'synthetic.unknown-priority', order: 0, intercept: () => ({ kind: 'allow' }) },
    ],
  };
  const state = cast(
    batchGame(priority, [
      piece('r', 'rook', 'D1'),
      piece('v', 'pawn', 'D4', 'black'),
      piece('near', 'pawn', 'E4'),
    ]),
    priority,
  ).state;
  const before = encodeSnapshot(state, priority.effectRegistry);
  expect(resolveCommand(state, playerInput(move('r', 'D4')), priority)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  const derivedCapture: RulesetBundle = {
    ...base,
    handlers: [
      {
        id: 'synthetic.derived-capture',
        order: 0,
        react: (e) =>
          e.kind === 'bomb_exploded' ? [move('r', 'E4') as unknown as DerivedOperation] : [],
      },
    ],
  };
  expect(systemDestroy(state, derivedCapture, 'v')).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  expect(encodeSnapshot(state, priority.effectRegistry)).toBe(before);
});

it('rechecks forced End after a test-only cleanse skill restores movement without touching Shield/Bomb', () => {
  const base = batchRuleset('cleanse-legality', {
    setup: [a('stun', 'r', { duration: duration(3) }), a('shield', 'v'), a('mine', 'v')],
    cleanse: [{ kind: 'marker', value: 'SYNTHETIC_CLEANSE' }],
  });
  const rules: RulesetBundle = {
    ...base,
    handlers: [
      {
        id: 'synthetic.cleanse',
        order: 0,
        react: (e, s) =>
          e.kind === 'marker' && e.payload.value === 'SYNTHETIC_CLEANSE'
            ? records(s, base)
                .filter((v) => v.definitionId === IDS.stun)
                .map((v) => ({ kind: 'effect_remove', instanceId: v.id, reason: 'cleansed' }))
            : [],
      },
    ],
  };
  let state = cast(
    batchGame(rules, [piece('r', 'rook', 'C1'), piece('v', 'pawn', 'A1', 'black')]),
    rules,
  ).state;
  state = play(play(state, rules, end).state, rules, end).state;
  expect(queryLegalMainActions(state, rules)).toEqual([]);
  expect(state.turn.sideToAct).toBe('white');
  const kept = records(state, rules).filter((e) => e.definitionId !== IDS.stun);
  const cleared = cast(state, rules, 'cleanse');
  expect(records(cleared.state, rules)).toEqual(kept);
  expect(cleared.events.some((e) => e.kind === 'bomb_exploded')).toBe(false);
  expect(queryLegalMainActions(cleared.state, rules).some((m) => m.kind === 'move')).toBe(true);
  expect(cleared.state.turn.sideToAct).toBe('white');
  expect(resolveCommand(cleared.state, playerInput(end), rules)).toEqual({
    ok: false,
    code: 'MAIN_MOVE_REQUIRED',
    events: [],
  });
  expect(resolveCommand(cleared.state, playerInput(move('r', 'A1')), rules)).toEqual({
    ok: false,
    code: 'CAPTURE_DEFENDED',
    events: [],
  });
});

it('restores a mixed-set swap checkpoint and exactly replays FIFO chains, sources, expiry, events and hashes', () => {
  const rules = batchRuleset('replay-checkpoint', {
    setup: [
      a('stun', 'p', { duration: duration(3) }),
      a('shield', 'p'),
      a('charge', 'p'),
      a('mine', 'q', { sourcePlayer: 'black' }),
      a('stun', 'q', { sourcePlayer: 'black' }),
      a('mine', 'chain', { sourcePlayer: 'black', sourceSkill: 'synthetic.beta' }),
    ],
    swap: [{ kind: 'effect_sets_swap', pieceA: 'p' as never, pieceB: 'q' as never }],
  });
  const initial = batchGame(rules, [
    piece('p', 'pawn', 'A1'),
    piece('q', 'pawn', 'D4', 'black'),
    piece('spare', 'rook', 'O1'),
    piece('chain', 'pawn', 'E4', 'black'),
    piece('outer', 'bishop', 'F4'),
  ]);
  const inputs = [
    playerInput({ kind: 'skill', skillId: 'setup' }),
    playerInput(move('spare', 'O2')),
    playerInput({ kind: 'skill', skillId: 'swap' }, 'black'),
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'q' } },
    playerInput(end, 'black'),
  ];
  let uninterrupted = initial;
  for (const input of inputs.slice(0, 3)) {
    const result = resolveCommand(uninterrupted, input, rules);
    if (!result.ok) throw new Error(result.code);
    uninterrupted = result.state;
  }
  const encoded = encodeSnapshot(uninterrupted, rules.effectRegistry);
  let restored = decodeSnapshot(encoded, rules);
  expect(encodeSnapshot(cloneSnapshot(restored, rules), rules.effectRegistry)).toBe(encoded);
  expect(restored.effects).not.toBe(uninterrupted.effects);
  for (const input of inputs.slice(3)) {
    const direct = resolveCommand(uninterrupted, input, rules),
      fromSnapshot = resolveCommand(restored, input, rules);
    if (!direct.ok || !fromSnapshot.ok) throw new Error('FIXTURE_CONTINUATION');
    expect(fromSnapshot.events).toEqual(direct.events);
    expect(fullStateHash(fromSnapshot.state, rules.effectRegistry)).toEqual(
      fullStateHash(direct.state, rules.effectRegistry),
    );
    uninterrupted = direct.state;
    restored = fromSnapshot.state;
  }
  const replay = recordReplay(initial, inputs, rules);
  if (!replay.ok) throw new Error(replay.code);
  const executed = executeReplay(replay.archive, rules);
  if (!executed.ok) throw new Error(executed.code);
  expect(fullStateHash(executed.state, rules.effectRegistry)).toEqual(
    fullStateHash(uninterrupted, rules.effectRegistry),
  );
  expect(executed.events).toEqual(replay.archive.steps.flatMap((s) => s.events));
  expect(
    executed.events
      .filter((e) => e.kind === 'bomb_exploded')
      .map((e) => [e.payload.definitionId, e.payload.source.sourcePlayer, e.payload.targets]),
  ).toEqual([
    [IDS.charge, 'white', ['chain']],
    [IDS.mine, 'black', ['outer']],
  ]);
  expect(
    executed.events
      .filter((e) => e.kind === 'effect_removed')
      .filter((e) => e.payload.reason === 'expired')
      .map((e) => e.payload.definitionId),
  ).toEqual([IDS.stun]);
  const tampered = structuredClone(replay.archive);
  const explosion = tampered.steps[3]!.events.find((e) => e.kind === 'bomb_exploded')!;
  if (explosion.kind !== 'bomb_exploded') throw new Error('FIXTURE_EXPLOSION');
  Reflect.set(explosion.payload.source, 'sourcePlayer', 'black');
  expect(executeReplay(tampered, rules)).toEqual({
    ok: false,
    code: 'REPLAY_DIVERGENCE',
    events: [],
  });
});

it.each([
  'rounds',
  'producer-version',
  'duration-schema',
  'source-profile',
  'missing-incarnation',
  'incarnation-without-caster',
  'definition-version',
  'family-collision',
  'old-engine',
] as const)('rejects %s snapshot tampering across the integrated registry', (fault) => {
  const rules = batchRuleset(`snapshot-${fault}`, {
    setup: [
      a('stun', 'r', {
        sourcePiece: 'r' as never,
        sourceIncarnation: 'synthetic.life.1',
        duration: duration(3),
      }),
      a('shield', 'v'),
      a('charge', 'v'),
    ],
  });
  const state = cast(
    batchGame(rules, [piece('r', 'rook', 'C1'), piece('v', 'pawn', 'A1', 'black')]),
    rules,
  ).state;
  const encoded = encodeSnapshot(state, rules.effectRegistry);
  const raw = JSON.parse(encoded);
  const stun = raw.effects[0].payload.instance;
  switch (fault) {
    case 'rounds':
      stun.duration.rounds = 2;
      break;
    case 'producer-version':
      stun.duration.producerVersion = '9.0.0';
      break;
    case 'duration-schema':
      stun.duration.schemaVersion = '2.0.0';
      break;
    case 'source-profile':
      stun.sourceSkill = 'synthetic.unapproved';
      break;
    case 'missing-incarnation':
      delete stun.sourceIncarnation;
      break;
    case 'incarnation-without-caster':
      stun.sourcePiece = null;
      break;
    case 'definition-version':
      stun.definitionVersion = '9.0.0';
      break;
    case 'family-collision': {
      const duplicate = structuredClone(raw.effects[2]);
      duplicate.id = 'batch:operation:1';
      duplicate.payload.instance.id = duplicate.id;
      duplicate.definitionId = IDS.mine;
      duplicate.payload.instance.definitionId = IDS.mine;
      raw.effects.push(duplicate);
      break;
    }
    case 'old-engine':
      raw.engineVersion = '0.4.0';
      break;
  }
  expect(() => decodeSnapshot(JSON.stringify(raw), rules)).toThrow(
    fault === 'family-collision' ? 'EFFECT_FAMILY_DUPLICATE' : undefined,
  );
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(encoded);
});

it('isolates two match registries, decoded payloads and cloned sources without registering consumers in the default ruleset', () => {
  const first = batchRuleset('isolation-a', {
    setup: [a('stun', 'p'), a('shield', 'p'), a('charge', 'p')],
  });
  const second = batchRuleset('isolation-b', {
    setup: [a('stun', 'p', { duration: duration(3) }), a('shield', 'p'), a('mine', 'p')],
  });
  const stateA = cast(
    batchGame(first, [piece('p', 'pawn', 'A1')], 'white', 'match-a'),
    first,
  ).state;
  const stateB = cast(
    batchGame(second, [piece('p', 'pawn', 'A1')], 'white', 'match-b'),
    second,
  ).state;
  const copy = cloneSnapshot(stateA, first),
    decoded = records(copy, first);
  expect(first.effectRegistry).not.toBe(second.effectRegistry);
  expect(decoded[0]!.id).toBe('match-a:operation:2');
  expect(records(stateB, second)[0]).toMatchObject({
    id: 'match-b:operation:2',
    duration: { rounds: 3 },
  });
  expect(decoded[0]!.payload).not.toBe(records(stateA, first)[0]!.payload);
  expect(Reflect.set(decoded[0]!.payload as object, 'unexpected', 1)).toBe(false);
  expect(Reflect.set(decoded[0]!, 'sourceVariant', 'tampered')).toBe(false);
  expect(() => decodeSnapshot(encodeSnapshot(stateA, first.effectRegistry), second)).toThrow(
    'RULESET_MISMATCH',
  );
  expect(records(stateA, first)[0]).toMatchObject({
    duration: { rounds: 1 },
    payload: {},
    sourceVariant: 'synthetic.batch-a',
  });
  expect(records(stateB, second)[2]!.definitionId).toBe(IDS.mine);
  const defaultState = createGame({
    matchId: 'default-match',
    seed: 37,
    board: createBoard([piece('p', 'pawn', 'A1')]),
  });
  expect(defaultState.effects).toEqual([]);
  expect(
    resolveCommand(defaultState, playerInput({ kind: 'skill', skillId: 'setup' })),
  ).toMatchObject({ ok: false, events: [] });
});

it('projects mixed source clocks by relative lifetime, independent of absolute boundaries', () => {
  const rules = batchRuleset('relative-duration', {
    setup: [
      a('stun', 'p', { duration: duration(3) }),
      a('shield', 'q', { sourcePlayer: 'black', duration: duration(3) }),
      a('charge', 'p'),
      a('mine', 'q', { sourcePlayer: 'black' }),
    ],
  });
  const state = cast(
    batchGame(rules, [piece('p', 'pawn', 'A1'), piece('q', 'pawn', 'O15', 'black')]),
    rules,
  ).state;
  const shifted = {
    ...state,
    turn: { ...state.turn, plyIndex: 2, roundIndex: 2 },
    history: {
      ...state.history,
      entries: state.history.entries.map((e, i) =>
        i === state.history.entries.length - 1 ? { ...e, plyIndex: 2 } : e,
      ),
      lastCountedPly: 2,
    },
  };
  const later = {
    ...shifted,
    effects: encodeEffectRecords(
      records(state, rules).map((e) =>
        e.deadline
          ? {
              ...e,
              timingAnchor: { ...e.timingAnchor, ordinal: e.timingAnchor.ordinal + 1 },
              deadline: { ...e.deadline, ordinal: e.deadline.ordinal + 1 },
            }
          : e,
      ),
      rules.effectRegistry!,
      shifted,
    ),
  };
  const earlierKey = Object.keys(play(state, rules, end).state.history.repetition).at(-1)!;
  const laterKey = Object.keys(play(later, rules, end).state.history.repetition).at(-1)!;
  expect(laterKey).toBe(earlierKey);
  const semantic = JSON.parse(earlierKey).effects;
  expect(
    semantic.find((e: { definitionId: string }) => e.definitionId === IDS.stun).data.remaining,
  ).toEqual({ side: 'white', boundary: 'end', remaining: 3 });
  expect(
    semantic.find((e: { definitionId: string }) => e.definitionId === IDS.shield).data.remaining,
  ).toEqual({ side: 'black', boundary: 'end', remaining: 2 });
});

it('keeps family/category/source semantics but excludes meaningless allocation and cross-target order from repetition', () => {
  const operations = [
    a('stun', 'p'),
    a('shield', 'p'),
    a('charge', 'p'),
    a('mine', 'q', { sourcePlayer: 'black' }),
  ];
  function key(ops: readonly DerivedOperation[]) {
    const rules = batchRuleset('repetition-fields', { setup: ops });
    const state = cast(
      batchGame(rules, [piece('p', 'pawn', 'A1'), piece('q', 'pawn', 'O15', 'black')]),
      rules,
    ).state;
    return Object.keys(play(state, rules, end).state.history.repetition).at(-1)!;
  }
  const original = key(operations);
  expect(key([...operations].reverse())).toBe(original);
  expect(key([{ kind: 'marker', value: 'allocation-noise' }, ...operations])).toBe(original);
  expect(key([operations[0]!, operations[1]!, a('mine', 'p'), operations[3]!])).not.toBe(original);
  expect(
    key([
      operations[0]!,
      operations[1]!,
      a('charge', 'p', { sourcePlayer: 'black' }),
      operations[3]!,
    ]),
  ).not.toBe(original);
  expect(
    key([
      operations[0]!,
      operations[1]!,
      a('charge', 'p', { sourceSkill: 'synthetic.beta' }),
      operations[3]!,
    ]),
  ).not.toBe(original);
  expect(
    JSON.parse(original).effects.find(
      (e: { definitionId: string }) => e.definitionId === IDS.charge,
    ),
  ).toMatchObject({ family: { id: 'bomb', policy: 'unique-target-ignore' }, category: 'buff' });
});

it('exposes the raw caster/incarnation projection gate without dropping identity from repetition', () => {
  function key(caster: string, useRefs: boolean, incarnation: string) {
    const source = {
      sourcePiece: useRefs ? (caster as never) : null,
      ...(useRefs ? { sourceIncarnation: incarnation } : {}),
    };
    const rules = batchRuleset('source-normalization-gate', {
      setup: [
        a('stun', 'p', source),
        a('shield', 'p', source),
        a('charge', 'p', { sourcePiece: source.sourcePiece }),
        a('mine', 'q', { sourcePlayer: 'black' }),
      ],
    });
    const state = cast(
      batchGame(rules, [
        piece('p', 'pawn', 'A1'),
        piece('q', 'pawn', 'D15', 'black'),
        piece(caster, 'pawn', 'O1', 'black'),
      ]),
      rules,
    ).state;
    return JSON.parse(Object.keys(play(state, rules, end).state.history.repetition).at(-1)!);
  }
  expect(key('caster.a', false, 'life.a')).toEqual(key('caster.b', false, 'life.b'));
  const first = key('caster.a', true, 'life.a'),
    renamed = key('caster.b', true, 'life.b');
  expect(first.pieces).toEqual(renamed.pieces);
  // Known enablement blocker, not approved canonical semantics: projector lacks source-graph context.
  expect(first.effects).not.toEqual(renamed.effects);
  expect(
    first.effects.find((e: { definitionId: string }) => e.definitionId === IDS.stun).data.source,
  ).toMatchObject({ piece: 'caster.a', incarnation: 'life.a' });
  expect(key('caster.a', true, 'life.b').effects).not.toEqual(first.effects);
});

it('preserves meaningful synthetic listener order alongside all four consumer contracts', () => {
  function scenario(reverse: boolean) {
    const applications = [
      a('stun', 'p', { sourcePlayer: 'white' }),
      a('stun', 'p', { sourcePlayer: 'black' }),
    ];
    const base = batchRuleset('listener-order', {
      setup: [
        ...(reverse ? applications.reverse() : applications),
        a('shield', 'p'),
        a('charge', 'p'),
        a('mine', 'q'),
        { kind: 'marker', value: 'input' },
      ],
    });
    // SYNTHETIC_TEST_ONLY observer declaration; not a concrete Stun trigger/priority approval.
    const registry = createEffectRegistry(
      base.effectRegistry!.definitions.map((d) =>
        d.typeId === IDS.stun
          ? {
              ...d,
              capabilities: ['observe:marker'],
              triggers: [
                {
                  id: 'listen',
                  event: 'marker',
                  stage: 'committed' as const,
                  handlerId: 'synthetic.observe',
                },
              ],
            }
          : d,
      ),
    );
    const rules: RulesetBundle = {
      ...base,
      effectRegistry: registry,
      effectRuntime: createEffectRuntime(registry, {
        ...base.effectRuntime,
        triggers: {
          'synthetic.observe': {
            mode: 'synthetic-v1',
            order: 0,
            react: (c) =>
              c.event.kind === 'marker' && c.event.payload.value === 'input'
                ? [{ kind: 'marker', value: c.instance.sourcePlayer }]
                : [],
          },
        },
      }),
    };
    const initial = batchGame(rules, [
      piece('p', 'pawn', 'A1'),
      piece('q', 'pawn', 'O15', 'black'),
    ]);
    const applied = cast(initial, rules);
    const key = Object.keys(play(applied.state, rules, end).state.history.repetition).at(-1)!;
    const replay = recordReplay(
      initial,
      [playerInput({ kind: 'skill', skillId: 'setup' }), playerInput(end)],
      rules,
    );
    if (!replay.ok) throw new Error(replay.code);
    const executed = executeReplay(replay.archive, rules);
    if (!executed.ok) throw new Error(executed.code);
    expect(executed.events).toEqual(replay.archive.steps.flatMap((s) => s.events));
    return {
      key,
      markers: applied.events.filter((e) => e.kind === 'marker').map((e) => e.payload.value),
    };
  }
  const first = scenario(false),
    reversed = scenario(true);
  expect(first.markers).toEqual(['input', 'white', 'black']);
  expect(reversed.markers).toEqual(['input', 'black', 'white']);
  expect(first.key).not.toBe(reversed.key);
});
