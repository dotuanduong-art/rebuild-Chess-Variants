import { expect, it } from 'vitest';
import {
  createEffectRegistry,
  createEffectRuntime,
  coordinateFromAlgebraic,
  resolveCommand,
  encodeSnapshot,
  decodeSnapshot,
  fullStateHash,
  recordReplay,
  executeReplay,
  queryCaptureThreats,
  queryLegalMainActions,
} from '@variant-chess/game-core';
import type {
  RulesetBundle,
  DerivedOperation,
  SkillPlanningContext,
} from '@variant-chess/game-core';
import type { ForcedRepositionOperation, PieceInput } from '@variant-chess/shared-types';
import {
  createShockwaveExperimentalRuleset,
  createJudgmentChainsExperimentalRuleset,
  createHolyShieldExperimentalRuleset,
  createLiveChargeExperimentalRuleset,
} from '../src/index.js';
import { shockwaveCast, shockwaveGame } from './shockwave.fixture.js';
import { unit, run, finish, effects } from './holy-shield.fixture.js';
import { input, reject } from './stun-producers.fixture.js';

const real = () => createShockwaveExperimentalRuleset({ white: true, black: true });
// TRUSTED_TEST_ONLY: alter the trusted callback to exercise independent core validation/fault rollback.
function probe(
  change: (op: ForcedRepositionOperation) => readonly DerivedOperation[],
): RulesetBundle {
  const base = real();
  const skill = base.skills!['dragon_sentinel.shockwave']!;
  if (!('plan' in skill)) throw Error('Expected planner');
  return {
    ...base,
    hash: `test-only-${base.hash}`,
    skills: {
      'dragon_sentinel.shockwave': {
        ...skill,
        plan: (c: SkillPlanningContext) => {
          const plan = skill.plan(c);
          const op = plan.operations[0]!;
          if (op.kind !== 'forced_reposition') throw Error('Expected batch');
          return { ...plan, operations: change(structuredClone(op)) };
        },
      },
    },
  };
}

it.each([
  ['G7', 'F6'],
  ['H7', 'H6'],
  ['I7', 'J6'],
  ['G8', 'F8'],
  ['I8', 'J8'],
  ['G9', 'F10'],
  ['H9', 'H10'],
  ['I9', 'J10'],
])(
  'pushes the %s neighbor exactly one cell to %s without a movement profile dependency',
  (from, to) => {
    const rules = real();
    const state = shockwaveGame(rules, 4, [
      unit('center', 'knight', 'H8'),
      unit('enemy', 'bishop', from, 'black'),
      unit('wk', 'king', 'H1'),
    ]);
    const result = run(state, rules, shockwaveCast());
    expect(result.state.board.pieces.enemy).toEqual({
      ...state.board.pieces.enemy,
      position: coordinateFromAlgebraic(to),
    });
    expect(result.state.ap).toEqual({ white: 0, black: 4 });
    expect(result.state.terminal.status).toBe('ongoing');
    expect(result.events.map((e) => e.kind)).toEqual([
      'skill_used',
      'ap_changed',
      'pieces_repositioned',
    ]);
  },
);

it.each([
  ['A1', 'B2', 'C3'],
  ['A15', 'B14', 'C13'],
  ['O1', 'N2', 'M3'],
  ['O15', 'N14', 'M13'],
])(
  'pushes from corner center %s without a caster range or line of sight',
  (center, enemy, destination) => {
    const rules = real();
    const initial = shockwaveGame(rules, 4, [
      unit('center', 'rook', center),
      unit('enemy', 'pawn', enemy, 'black'),
    ]);
    const result = run(initial, rules, shockwaveCast());
    expect(result.state.board.pieces.enemy!.position).toEqual(coordinateFromAlgebraic(destination));
    expect(result.state.board.pieces.center).toEqual(initial.board.pieces.center);
  },
);

it('leaves an off-board push stationary while committing an independent valid push', () => {
  const rules = real();
  const state = shockwaveGame(rules, 4, [
    unit('center', 'rook', 'B2'),
    unit('blocked', 'pawn', 'A1', 'black'),
    unit('enemy', 'rook', 'C2', 'black'),
  ]);
  const result = run(state, rules, shockwaveCast());
  expect(result.state.board.pieces.blocked).toEqual(state.board.pieces.blocked);
  expect(result.state.board.pieces.enemy!.position).toEqual(coordinateFromAlgebraic('D2'));
  expect(
    result.events
      .filter((e) => e.kind === 'pieces_repositioned')[0]!
      .payload.moves.map((m) => m.pieceId),
  ).toEqual(['enemy']);
});

it.each(['ally', 'enemy', 'king', 'special', 'summoned', 'unknown'] as const)(
  'counts an unaffected %s destination occupant as an obstacle without blocking other pushes',
  (kind) => {
    const rules = real();
    const { origin: ignored, ...base } = unit(
      'obstacle',
      kind === 'king' ? 'king' : 'pawn',
      'J8',
      kind === 'ally' ? 'white' : 'black',
    );
    void ignored;
    const obstacle: PieceInput =
      kind === 'unknown'
        ? base
        : {
            ...base,
            origin: kind === 'special' || kind === 'summoned' ? kind : 'ordinary-original',
          };
    const initial = shockwaveGame(rules, 4, [
      unit('center', 'rook', 'H8'),
      unit('blocked', 'rook', 'I8', 'black'),
      unit('enemy', 'rook', 'G8', 'black'),
      obstacle,
    ]);
    const result = run(initial, rules, shockwaveCast());
    expect(result.state.board.pieces.blocked).toEqual(initial.board.pieces.blocked);
    expect(result.state.board.pieces.obstacle).toEqual(initial.board.pieces.obstacle);
    expect(result.state.board.pieces.enemy!.position).toEqual(coordinateFromAlgebraic('F8'));
    expect(result.state.ap).toEqual({ white: 0, black: 4 });
  },
);

it.each(['ally', 'king', 'special', 'summoned', 'unknown'] as const)(
  'leaves adjacent %s unaffected',
  (kind) => {
    const rules = real();
    const { origin: ignored, ...base } = unit(
      'untouched',
      kind === 'king' ? 'king' : 'queen',
      'G8',
      kind === 'ally' ? 'white' : 'black',
    );
    void ignored;
    const untouched: PieceInput =
      kind === 'unknown'
        ? base
        : {
            ...base,
            origin: kind === 'special' || kind === 'summoned' ? kind : 'ordinary-original',
          };
    const initial = shockwaveGame(rules, 4, [
      unit('center', 'rook', 'H8'),
      unit('enemy', 'rook', 'I8', 'black'),
      untouched,
    ]);
    const result = run(initial, rules, shockwaveCast());
    expect(result.state.board.pieces.untouched).toEqual(initial.board.pieces.untouched);
    expect(result.state.board.pieces.enemy!.position).toEqual(coordinateFromAlgebraic('J8'));
  },
);

it('never promotes a Pawn displaced onto its normal promotion rank or awards promotion AP', () => {
  const rules = real();
  const initial = shockwaveGame(rules, 4, [
    unit('center', 'rook', 'G3'),
    unit('enemy', 'pawn', 'G2', 'black'),
    unit('wk', 'king', 'A1'),
  ]);
  const result = run(initial, rules, shockwaveCast());
  expect(result.state.board.pieces.enemy).toEqual({
    ...initial.board.pieces.enemy,
    position: coordinateFromAlgebraic('G1'),
  });
  expect(result.state.ap).toEqual({ white: 0, black: 4 });
  expect(result.events.some((e) => e.kind === 'piece_promoted')).toBe(false);
});

it.each([
  [
    'destination',
    (op: ForcedRepositionOperation) => ({
      ...op,
      moves: op.moves.map((m) => ({ ...m, to: coordinateFromAlgebraic('O15') })),
    }),
  ],
  [
    'from',
    (op: ForcedRepositionOperation) => ({
      ...op,
      moves: op.moves.map((m) => ({ ...m, from: coordinateFromAlgebraic('A1') })),
    }),
  ],
  [
    'target',
    (op: ForcedRepositionOperation) => ({
      ...op,
      moves: op.moves.map((m) => ({ ...m, pieceId: 'wk' as never })),
    }),
  ],
  [
    'center move',
    (op: ForcedRepositionOperation) => ({
      ...op,
      moves: op.moves.map((m) => ({ ...m, pieceId: 'center' as never })),
    }),
  ],
  [
    'shared destination',
    (op: ForcedRepositionOperation) => ({ ...op, moves: [...op.moves, ...op.moves] }),
  ],
] as const)(
  'independently rejects forged trusted %s assignments with exact rollback',
  (_, change) => {
    const rules = probe((op) => [change(op)]);
    const state = shockwaveGame(rules);
    reject(state, rules, input(shockwaveCast()), 'INVALID_FORCED_REPOSITION');
  },
);

it.each([
  { schemaVersion: '2.0.0' },
  { moves: [] },
  { centerPieceId: 'missing' },
  {
    cause: {
      kind: 'normal-move-v1',
      source: {
        sourcePlayer: 'white',
        sourceVariant: 'dragon_sentinel',
        sourceSkill: 'dragon_sentinel.shockwave',
        sourcePiece: null,
        sourceIncarnation: null,
      },
    },
  },
  { extra: true },
])('rejects malformed operation fields %j', (patch) => {
  const rules = probe((op) => [{ ...op, ...patch } as ForcedRepositionOperation]);
  reject(
    shockwaveGame(rules),
    rules,
    input(shockwaveCast()),
    patch.centerPieceId ? 'UNAUTHORIZED_FORCED_REPOSITION' : 'INVALID_FORCED_REPOSITION',
  );
});
it.each([
  { sourcePlayer: 'black' },
  { sourceVariant: 'guardian' },
  { sourceSkill: 'guardian.holy_shield' },
  { sourcePiece: 'center' },
  { sourceIncarnation: 'fake' },
])('rejects forged trusted source %j even after planning', (patch) => {
  const rules = probe((op) => [
    {
      ...op,
      cause: { ...op.cause, source: { ...op.cause.source, ...patch } },
    } as ForcedRepositionOperation,
  ]);
  reject(
    shockwaveGame(rules),
    rules,
    input(shockwaveCast()),
    patch.sourcePiece || patch.sourceIncarnation
      ? 'INVALID_FORCED_REPOSITION'
      : 'UNAUTHORIZED_FORCED_REPOSITION',
  );
});

it('rejects repeated batches atomically instead of allowing a second push', () => {
  const rules = probe((op) => [op, op]);
  reject(shockwaveGame(rules), rules, input(shockwaveCast()), 'FORCED_REPOSITION_LIMIT');
});

it('requires an explicit capability and rejects callback-injected displacement on a normal Move', () => {
  const base = real();
  const { forcedReposition: omitted, ...noCapability } = base;
  void omitted;
  reject(
    shockwaveGame(noCapability),
    noCapability,
    input(shockwaveCast()),
    'UNSUPPORTED_FORCED_REPOSITION',
  );
  const skill = base.skills!['dragon_sentinel.shockwave']!;
  if (!('plan' in skill)) throw Error('planner');
  const state = shockwaveGame(base);
  const op = skill.plan({ state, actor: 'white', command: shockwaveCast() }).operations[0]!;
  const rules: RulesetBundle = {
    ...base,
    hash: 'test-only-injected-normal-move',
    handlers: [
      {
        id: 'test-only.inject',
        order: 1,
        react: (e) => (e.kind === 'move_committed' ? [op] : []),
      },
    ],
  };
  reject(
    shockwaveGame(rules),
    rules,
    input({ kind: 'move', pieceId: 'wk', to: coordinateFromAlgebraic('I1') }),
    'UNAUTHORIZED_FORCED_REPOSITION',
  );
});

it.each(['trap', 'portal', 'terrain', 'hidden-object'])(
  'fails closed for an unapproved mandatory %s entry consumer',
  (id) => {
    const rules = { ...real(), mandatoryEntryConsumers: [`test-only.${id}`] };
    reject(
      shockwaveGame(rules),
      rules,
      input(shockwaveCast()),
      'UNSUPPORTED_FORCED_REPOSITION_INTERACTION',
    );
  },
);
it('fails closed for an unapproved forced-reposition legality policy', () => {
  const rules: RulesetBundle = {
    ...real(),
    legalityPolicies: [
      { id: 'test-only.motion', actionKinds: ['forced-reposition'], allows: () => false },
    ],
  };
  reject(
    shockwaveGame(rules),
    rules,
    input(shockwaveCast()),
    'UNSUPPORTED_FORCED_REPOSITION_INTERACTION',
  );
});

it('canonicalizes trusted assignment enumeration and preserves deterministic board occupancy', () => {
  const rules = probe((op) => [{ ...op, moves: [...op.moves].reverse() }]);
  const pieces = [
    unit('center', 'rook', 'H8'),
    unit('north', 'rook', 'H9', 'black'),
    unit('south', 'rook', 'H7', 'black'),
    unit('wk', 'king', 'H1'),
  ];
  const a = shockwaveGame(rules, 20, pieces);
  const b = shockwaveGame(rules, 20, [...pieces].reverse());
  const left = run(a, rules, shockwaveCast()),
    right = run(b, rules, shockwaveCast());
  expect(left.events).toEqual(right.events);
  expect(encodeSnapshot(left.state)).toBe(encodeSnapshot(right.state));
  expect(left.state.board.cells.filter(Boolean)).toHaveLength(pieces.length);
  expect(new Set(left.state.board.cells.filter(Boolean)).size).toBe(pieces.length);
});

it('rolls back final validation after committed candidate movement/RNG/history and permits identical retry', () => {
  const rules: RulesetBundle = {
    ...real(),
    hash: 'test-only-late-fault',
    handlers: [
      {
        id: 'test-only.random',
        order: 1,
        react: (e) =>
          e.kind === 'pieces_repositioned'
            ? [{ kind: 'random', side: 'actor', namespace: 'test', pool: ['a', 'b'] }]
            : [],
      },
    ],
  };
  const state = shockwaveGame(rules);
  const before = encodeSnapshot(state);
  for (const options of [
    { operationBudget: 1 },
    {
      validate: () => {
        throw Error('AFTER_MOVEMENT_RNG_HISTORY');
      },
    },
  ]) {
    const result = resolveCommand(state, input(shockwaveCast()), rules, options);
    expect(result.ok).toBe(false);
    expect(result.events).toEqual([]);
    expect(encodeSnapshot(state)).toBe(before);
  }
  const a = resolveCommand(state, input(shockwaveCast()), rules),
    b = resolveCommand(decodeSnapshot(before, rules), input(shockwaveCast()), rules);
  expect(a).toEqual(b);
  expect(a.ok).toBe(true);
  if (!a.ok) throw Error(a.code);
  expect(a.state.rng).not.toEqual(state.rng);
  expect(a.state.board.pieces.enemy!.position).toEqual(coordinateFromAlgebraic('J8'));
});

// TRUSTED_TEST_ONLY composition of existing complete effect definitions/attachment transport.
// Only Shockwave is executed as a real approved producer in this composed ruleset.
function effectComposition(): RulesetBundle {
  const base = real();
  const sources = [
    createJudgmentChainsExperimentalRuleset({ white: true, black: true }),
    createHolyShieldExperimentalRuleset({ white: true, black: true }),
    createLiveChargeExperimentalRuleset({ white: true, black: true }),
  ];
  const registry = createEffectRegistry(sources.flatMap((r) => r.effectRegistry!.definitions));
  const operations: DerivedOperation[] = registry.definitions.map((d) => {
    const profile = d.sourceAttribution.profile!;
    return {
      kind: 'effect_apply',
      definitionId: d.typeId,
      definitionVersion: d.schemaVersion,
      target: { kind: 'piece', pieceId: 'enemy' as never },
      sourcePlayer: 'white',
      sourceVariant: profile.sourceVariant,
      sourceSkill: profile.sourceSkill,
      sourcePiece: null,
      sourceIncarnation: null,
      payload: {},
      groupId: null,
      ...(d.lifetime.kind === 'producer-rounds'
        ? {
            duration: {
              schemaVersion: '1.0.0',
              producerId: d.lifetime.producers[0]!.id,
              producerVersion: d.lifetime.producers[0]!.version,
              rounds: d.lifetime.producers[0]!.allowedRounds[0]!,
            },
          }
        : {}),
    };
  });
  return {
    ...base,
    hash: 'test-only-shockwave-effect-composition-v1',
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      restrictions: sources[0]!.effectRuntime!.restrictions!,
      captureDefense: sources[1]!.effectRuntime!.captureDefense!,
      deathReactions: sources[2]!.effectRuntime!.deathReactions!,
      eligibility: Object.assign({}, ...sources.map((r) => r.effectRuntime!.eligibility)),
    }),
    skills: { ...base.skills, 'test-only.attach': { cost: 0, operations } },
  };
}
const attach = { kind: 'skill' as const, skillId: 'test-only.attach' };
function attached(rules: RulesetBundle) {
  let state = run(
    shockwaveGame(rules, 20, [
      unit('center', 'rook', 'H8'),
      unit('enemy', 'rook', 'I8', 'black'),
      unit('nearby', 'pawn', 'K9'),
      unit('wk', 'king', 'H1'),
      unit('bk', 'king', 'H15', 'black'),
    ]),
    rules,
    attach,
  ).state;
  state = finish(finish(state, rules), rules);
  return state;
}

it('displaces real Stun/Shield/Bomb attachments unchanged; no explosion/reward or new immunity', () => {
  const rules = effectComposition();
  const initial = attached(rules);
  const original = effects(initial, rules);
  expect(original).toHaveLength(3);
  expect(queryCaptureThreats(initial, 'black', rules)).toEqual([]);
  const result = run(initial, rules, shockwaveCast());
  expect(result.state.effects).toEqual(initial.effects);
  expect(effects(result.state, rules)).toEqual(original);
  expect(result.state.ap).toEqual({ white: 16, black: 20 });
  expect(result.events.map((e) => e.kind)).toEqual([
    'skill_used',
    'ap_changed',
    'pieces_repositioned',
  ]);
  expect(queryCaptureThreats(result.state, 'black', rules)).toEqual([]);
  reject(
    result.state,
    rules,
    input({ kind: 'move', pieceId: 'center', to: coordinateFromAlgebraic('J8') }),
    'CAPTURE_DEFENDED',
  );
  const death = resolveCommand(
    result.state,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'enemy' } },
    rules,
  );
  expect(death.ok).toBe(true);
  if (!death.ok) throw Error(death.code);
  expect(death.events.filter((e) => e.kind === 'bomb_exploded')).toHaveLength(1);
  expect(death.events.filter((e) => e.kind === 'bomb_exploded')[0]!.payload.center).toEqual(
    coordinateFromAlgebraic('J8'),
  );
  expect(death.state.board.pieces.nearby).toBeUndefined();
  expect(death.state.ap).toEqual({ white: 17, black: 23 });
});

it('revalidates existing position-bound effect eligibility and rejects the whole root when invalid', () => {
  const base = effectComposition();
  const rules = {
    ...base,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      ...base.effectRuntime,
      eligibility: {
        ...base.effectRuntime!.eligibility,
        'guardian.holy-shield.ordinary-v1': (e) => e.target.kind === 'piece',
      },
    }),
  };
  const state = attached(rules);
  const constrained = {
    ...rules,
    effectRuntime: createEffectRuntime(rules.effectRegistry!, {
      ...rules.effectRuntime,
      eligibility: {
        ...rules.effectRuntime.eligibility,
        'guardian.holy-shield.ordinary-v1': (e, s) =>
          e.target.kind === 'piece' && s.board.pieces[e.target.pieceId]?.position.file !== 9,
      },
    }),
  };
  reject(state, constrained, input(shockwaveCast()), 'EFFECT_INELIGIBLE');
});

it('a Stunned center is a valid skill target without inventing a board caster restriction', () => {
  const base = effectComposition();
  const attachSkill = base.skills!['test-only.attach']!;
  if (!('operations' in attachSkill)) throw Error('fixture');
  const op = attachSkill.operations.find(
    (o) => o.kind === 'effect_apply' && o.definitionId === 'effect.stun',
  );
  if (!op || op.kind !== 'effect_apply') throw Error('fixture stun');
  const rules = {
    ...base,
    skills: {
      ...base.skills,
      'test-only.attach': {
        cost: 0,
        operations: [{ ...op, target: { kind: 'piece' as const, pieceId: 'center' as never } }],
      },
    },
  };
  const state = attached(rules);
  expect(queryLegalMainActions(state, rules).every((m) => m.pieceId !== 'center')).toBe(true);
  expect(run(state, rules, shockwaveCast()).state.board.pieces.enemy!.position).toEqual(
    coordinateFromAlgebraic('J8'),
  );
});

it('preserves semantic ActionReady positions across coherent match/piece/allocation renaming and exact replay', () => {
  const rules = real();
  const initial = shockwaveGame(rules, 20, undefined, 'alpha-a');
  const renamed = shockwaveGame(
    rules,
    20,
    Object.values(initial.board.pieces).map((p) => ({ ...p, id: `renamed-${p.id}` })),
    'alpha-b',
  );
  const noisy = { ...renamed, counters: { ...renamed.counters, operation: 37 } };
  const a = run(initial, rules, shockwaveCast()).state,
    b = run(noisy, rules, shockwaveCast('renamed-center')).state;
  const readyA = run(a, rules, {
    kind: 'move',
    pieceId: 'wk' as never,
    to: coordinateFromAlgebraic('I1'),
  }).state;
  const readyB = run(b, rules, {
    kind: 'move',
    pieceId: 'renamed-wk' as never,
    to: coordinateFromAlgebraic('I1'),
  }).state;
  const key = (s: typeof initial) =>
    Object.keys(s.history.repetition).find((k) => JSON.parse(k).sideToAct === 'black');
  expect(key(readyA)).toBe(key(readyB));
  expect(fullStateHash(readyA)).not.toEqual(fullStateHash(readyB));
  const inputs = [
    input(shockwaveCast()),
    input({ kind: 'move', pieceId: 'wk', to: coordinateFromAlgebraic('I1') }),
  ];
  const replay = recordReplay(initial, inputs, rules);
  expect(replay.ok).toBe(true);
  if (!replay.ok) throw Error(replay.code);
  const executed = executeReplay(replay.archive, rules);
  expect(executed.ok).toBe(true);
  if (!executed.ok) throw Error(executed.code);
  expect(executed.events).toEqual(replay.archive.steps.flatMap((s) => s.events));
  expect(executed.state).toEqual(readyA);
});
