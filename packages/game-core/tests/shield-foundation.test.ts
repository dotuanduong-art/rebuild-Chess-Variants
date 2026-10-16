import { expect, it } from 'vitest';
import {
  BASE_RULESET_ID,
  createBoard,
  createGame,
  createEffectRegistry,
  createEffectRuntime,
  coordinateFromAlgebraic,
  resolveCommand,
  decodeEffectRecords,
  queryLegalMainActions,
  generateBaseMoves,
  SHIELD_CONSUMER_CONTRACT,
  SHIELD_PAYLOAD_SCHEMA,
  SHIELD_CAPTURE_DEFENSE_BINDINGS,
  queryCaptureThreats,
  encodeSnapshot,
  decodeSnapshot,
  cloneSnapshot,
  recordReplay,
  executeReplay,
  encodeEffectRecords,
  STUN_CONSUMER_CONTRACT,
  STUN_RESTRICTION_BINDINGS,
} from '../src/index.js';
import type { EffectDefinition, RulesetBundle, DerivedOperation } from '../src/index.js';
import type { GameState, PlayerSide, RootCommand } from '@variant-chess/shared-types';
import { GameStateSchema } from '@variant-chess/shared-types';
import { piece } from './fixtures.js';

// Test-only profiles/permissions: these N values do not approve any Shield producer.
const definition = (patch: Partial<EffectDefinition> = {}): EffectDefinition => ({
  typeId: 'fixture.defense',
  schemaVersion: '1.0.0',
  category: 'buff',
  targets: ['piece'],
  sourceAttribution: { kind: 'preserve-source', requiredRefs: ['variant', 'skill'] },
  ownership: { kind: 'source-player' },
  kingEligibility: { kind: 'allowed' },
  lifetime: {
    kind: 'producer-rounds',
    schemaVersion: '1.0.0',
    boundary: 'end',
    producers: ['one', 'two'].map((id) => ({
      id,
      version: '1.0.0',
      sourceVariant: 'fixture',
      sourceSkill: id,
      allowedRounds: [1, 3],
      requireCaster: false,
      supportsIncarnation: true,
    })),
  },
  stacking: {
    key: 'type-source-identity-target',
    mode: 'refresh',
    payload: 'preserve',
    source: 'preserve',
    deadline: 'reset',
    mergePolicyId: null,
  },
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
  captureDefense: { kind: 'atomic-reject', policyId: 'fixture.defense.v1' },
  payloadSchema: {
    parse: (value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length)
        throw new Error('EMPTY_PAYLOAD');
      return {};
    },
  },
  repetition: { projectionId: 'fixture.defense' },
  repetitionProjector: (e, c) => ({
    target: c.target,
    remaining: c.remainingLifetime,
    source: [
      e.sourcePlayer,
      e.sourceVariant,
      e.sourceSkill,
      e.sourcePiece,
      e.sourceIncarnation ?? null,
    ],
  }),
  ...patch,
});

it('exposes an immutable disabled Shield consumer, not a complete approved producer definition', () => {
  expect(SHIELD_CONSUMER_CONTRACT).toMatchObject({
    definitionId: 'effect.shield',
    category: 'buff',
    enabled: false,
  });
  expect(Object.isFrozen(SHIELD_CONSUMER_CONTRACT.captureDefense)).toBe(true);
  expect(SHIELD_PAYLOAD_SCHEMA.parse({})).toEqual({});
  expect(Object.isFrozen(SHIELD_PAYLOAD_SCHEMA.parse({}))).toBe(true);
  for (const value of [{ charges: 1 }, [], null, new Date()])
    expect(() => SHIELD_PAYLOAD_SCHEMA.parse(value)).toThrow('INVALID_SHIELD_PAYLOAD');
  expect(() =>
    createEffectRegistry([SHIELD_CONSUMER_CONTRACT as unknown as EffectDefinition]),
  ).toThrow();
  const rules = bundle(
    [apply()],
    definition({
      captureDefense: SHIELD_CONSUMER_CONTRACT.captureDefense,
      payloadSchema: SHIELD_PAYLOAD_SCHEMA,
    }),
  );
  const concrete = {
    ...rules,
    effectRuntime: createEffectRuntime(rules.effectRegistry!, {
      captureDefense: SHIELD_CAPTURE_DEFENSE_BINDINGS,
    }),
  };
  const state = run(initial(concrete), concrete).state;
  expect(resolveCommand(state, capture, concrete)).toEqual({
    ok: false,
    code: 'CAPTURE_DEFENDED',
    events: [],
  });
});
const apply = (
  rounds = 1,
  patch: Partial<Extract<DerivedOperation, { kind: 'effect_apply' }>> = {},
): DerivedOperation => ({
  kind: 'effect_apply',
  definitionId: 'fixture.defense',
  definitionVersion: '1.0.0',
  target: { kind: 'piece', pieceId: 'v' as never },
  sourcePlayer: 'actor',
  sourceVariant: 'fixture',
  sourceSkill: 'one',
  sourcePiece: null,
  duration: { schemaVersion: '1.0.0', producerId: 'one', producerVersion: '1.0.0', rounds },
  payload: {},
  groupId: null,
  ...patch,
});
function bundle(
  operations: readonly DerivedOperation[] = [apply()],
  def = definition(),
): RulesetBundle {
  const registry = createEffectRegistry([def]);
  return {
    ...BASE_RULESET_ID,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      captureDefense: { 'fixture.defense.v1': () => false },
    }),
    skills: { cast: { cost: 1, operations } },
  };
}
const initial = (
  rules: RulesetBundle,
  board = createBoard([piece('r', 'rook', 'A1'), piece('v', 'knight', 'A3', 'black')]),
) => createGame({ matchId: 'shield', seed: 19, ap: { white: 10, black: 10 }, board }, rules);
const input = (command: RootCommand, side: PlayerSide = 'white') => ({
  authority: { kind: 'player', side },
  command,
});
const capture = input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('A3') });
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
function shieldBundle(
  operations: readonly DerivedOperation[] = [apply()],
  patch: Partial<EffectDefinition> = {},
): RulesetBundle {
  const rules = bundle(
    operations,
    definition({
      captureDefense: SHIELD_CONSUMER_CONTRACT.captureDefense,
      payloadSchema: SHIELD_PAYLOAD_SCHEMA,
      ...patch,
    }),
  );
  return {
    ...rules,
    effectRuntime: createEffectRuntime(rules.effectRegistry!, {
      captureDefense: SHIELD_CAPTURE_DEFENSE_BINDINGS,
    }),
  };
}
const timingBoard = () =>
  createBoard([piece('r', 'rook', 'C1'), piece('v', 'pawn', 'A1', 'black')]);
function whiteRound(state: GameState, rules: RulesetBundle, square: string) {
  let next = run(state, rules, {
    kind: 'move',
    pieceId: 'r' as never,
    to: coordinateFromAlgebraic(square),
  }).state;
  if (next.turn.sideToAct === 'white') next = run(next, rules, { kind: 'end' }).state;
  return run(next, rules, { kind: 'end' }).state; // Black pawn is off its forward board edge.
}

it('rejects Shield capture atomically without consuming slot/AP/RNG/IDs/history/events or deadline, repeatedly', () => {
  const rules = bundle();
  const state = run(initial(rules), rules).state;
  const before = JSON.stringify(state);
  expect(generateBaseMoves(state.board, 'r' as never)).toContainEqual(
    expect.objectContaining({
      kind: 'capture',
      pieceId: 'r',
      from: { file: 0, rankIndex: 0 },
      to: { file: 0, rankIndex: 2 },
      targetId: 'v',
    }),
  );
  expect(queryLegalMainActions(state, rules).some((m) => m.kind === 'capture')).toBe(false);
  for (let i = 0; i < 3; i++)
    expect(resolveCommand(state, capture, rules)).toEqual({
      ok: false,
      code: 'CAPTURE_DEFENDED',
      events: [],
    });
  expect(JSON.stringify(state)).toBe(before);
  expect(state.ap).toEqual({ white: 9, black: 10 });
  expect(state.turn.mainMoveUsed).toBe(false);
  expect(effects(state, rules)[0]?.deadline).toEqual({
    side: 'white',
    boundary: 'end',
    ordinal: 2,
  });
});

it('protects a synthetically eligible King without terminal/rewards and still rejects forbidden King attachment', () => {
  const rules = shieldBundle();
  const state = run(
    initial(rules, createBoard([piece('r', 'rook', 'A1'), piece('v', 'king', 'A3', 'black')])),
    rules,
  ).state;
  expect(resolveCommand(state, capture, rules)).toEqual({
    ok: false,
    code: 'CAPTURE_DEFENDED',
    events: [],
  });
  expect(state.terminal).toEqual({ status: 'ongoing' });
  expect(state.ap).toEqual({ white: 9, black: 10 });
  const denied = shieldBundle([apply()], { kingEligibility: { kind: 'denied' } });
  const before = initial(denied, state.board),
    copy = JSON.stringify(before);
  expect(resolveCommand(before, input({ kind: 'skill', skillId: 'cast' }), denied).ok).toBe(false);
  expect(JSON.stringify(before)).toBe(copy);
});

it('keeps same-source refresh ID, distinct skill/caster IDs and separate source deadlines', () => {
  const rules = shieldBundle([
    apply(1),
    apply(3),
    apply(1, {
      sourceSkill: 'two',
      duration: { schemaVersion: '1.0.0', producerId: 'two', producerVersion: '1.0.0', rounds: 1 },
    }),
    apply(3, { sourcePiece: 'r' as never }),
  ]);
  const result = run(initial(rules), rules);
  expect(
    effects(result.state, rules).map((e) => [
      e.id,
      e.sourceSkill,
      e.sourcePiece,
      e.deadline?.ordinal,
    ]),
  ).toEqual([
    ['shield:operation:2', 'one', null, 4],
    ['shield:operation:4', 'two', null, 2],
    ['shield:operation:5', 'one', 'r', 4],
  ]);
  expect(
    result.events.filter((e) => e.kind === 'effect_refreshed').map((e) => e.payload.effectId),
  ).toEqual(['shield:operation:2']);
  expect(resolveCommand(result.state, capture, rules)).toMatchObject({
    ok: false,
    code: 'CAPTURE_DEFENDED',
  });
});

it('expires independent Shields on source-end, preserves remaining protection and restores capture after all expire', () => {
  const rules = shieldBundle([
    apply(1),
    apply(3, {
      sourceSkill: 'two',
      duration: { schemaVersion: '1.0.0', producerId: 'two', producerVersion: '1.0.0', rounds: 3 },
    }),
  ]);
  let state = run(initial(rules, timingBoard()), rules).state;
  state = whiteRound(state, rules, 'D1');
  expect(effects(state, rules).map((e) => e.deadline?.ordinal)).toEqual([2, 4]); // No cast-boundary tick.
  state = whiteRound(state, rules, 'C1');
  expect(effects(state, rules).map((e) => [e.sourceSkill, e.deadline?.ordinal])).toEqual([
    ['two', 4],
  ]);
  const attempt = input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('A1') });
  expect(resolveCommand(state, attempt, rules)).toEqual({
    ok: false,
    code: 'CAPTURE_DEFENDED',
    events: [],
  });
  state = whiteRound(state, rules, 'D1');
  state = whiteRound(state, rules, 'C1');
  expect(effects(state, rules)).toEqual([]);
  expect(
    queryLegalMainActions(state, rules)
      .filter((m) => m.kind === 'capture')
      .map((m) => m.targetId),
  ).toEqual(['v']);
  const result = resolveCommand(state, attempt, rules);
  if (!result.ok) throw new Error(result.code);
  expect(result.state.board.pieces.v).toBeUndefined();
  expect(result.state.ap).toEqual({ white: 11, black: 11 });
});

it('resets refresh N at the current source anchor while keeping identity', () => {
  const rules = shieldBundle([apply(3)]);
  let state = run(initial(rules, timingBoard()), rules).state;
  const original = effects(state, rules)[0]!;
  state = whiteRound(state, rules, 'D1');
  const refresh: RulesetBundle = {
    ...rules,
    skills: { cast: { cost: 1, operations: [apply(1)] } },
  };
  const refreshed = effects(run(state, refresh).state, refresh)[0]!;
  expect(refreshed).toMatchObject({
    id: original.id,
    appliedSequence: original.appliedSequence,
    timingAnchor: { side: 'white', boundary: 'end', ordinal: 2 },
    deadline: { side: 'white', boundary: 'end', ordinal: 3 },
    duration: { rounds: 1 },
  });
});

it('removes one source without deleting or consuming the remaining Shield', () => {
  const rules = shieldBundle([
    apply(),
    apply(3, {
      sourceSkill: 'two',
      duration: { schemaVersion: '1.0.0', producerId: 'two', producerVersion: '1.0.0', rounds: 3 },
    }),
  ]);
  let state = run(initial(rules, timingBoard()), rules).state;
  const [first, second] = effects(state, rules);
  state = whiteRound(state, rules, 'D1');
  const release: RulesetBundle = {
    ...rules,
    skills: {
      release: {
        cost: 0,
        operations: [{ kind: 'effect_remove', instanceId: first!.id, reason: 'cleansed' }],
      },
    },
  };
  state = run(state, release, { kind: 'skill', skillId: 'release' }).state;
  expect(effects(state, release)).toEqual([second]);
  expect(
    resolveCommand(
      state,
      input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('A1') }),
      release,
    ),
  ).toMatchObject({ ok: false, code: 'CAPTURE_DEFENDED' });
});

it('allows committed non-King destruction, normal owner loss AP and cleanup despite Shield', () => {
  const rules = shieldBundle();
  const state = run(initial(rules), rules).state;
  const result = resolveCommand(
    state,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'v' } },
    rules,
  );
  if (!result.ok) throw new Error(result.code);
  expect(result.state.board.pieces.v).toBeUndefined();
  expect(result.state.ap).toEqual({ white: 9, black: 12 });
  expect(result.state.effects).toEqual([]);
  expect(result.events.some((e) => e.kind === 'piece_destroyed')).toBe(true);
  expect(result.events.some((e) => e.kind === 'capture_committed')).toBe(false);
  expect(
    result.events.filter((e) => e.kind === 'effect_removed').map((e) => e.payload.reason),
  ).toEqual(['target_destroyed']);
});

it('emits no committed death facts or synthetic Bomb-like reaction on a blocked capture', () => {
  const base = shieldBundle();
  const rules: RulesetBundle = {
    ...base,
    handlers: [
      {
        id: 'synthetic-death',
        order: 0,
        react: (e) =>
          e.kind === 'capture_committed' || e.kind === 'piece_destroyed'
            ? [{ kind: 'marker', value: 'synthetic.death' }]
            : [],
      },
    ],
  };
  const before = initial(rules);
  const allowed = resolveCommand(before, capture, rules);
  if (!allowed.ok) throw new Error(allowed.code);
  expect(allowed.events.filter((e) => e.kind === 'marker').map((e) => e.payload)).toEqual([
    { value: 'synthetic.death' },
  ]);
  const protectedState = run(before, rules).state;
  expect(resolveCommand(protectedState, capture, rules)).toEqual({
    ok: false,
    code: 'CAPTURE_DEFENDED',
    events: [],
  });
});

it('keeps capture geometry/threats distinct from executable defense and permits quiet moves', () => {
  const rules = shieldBundle();
  const state = run(initial(rules), rules).state;
  expect(queryCaptureThreats(state, 'white', rules).map((m) => m.targetId)).toEqual(['v']);
  expect(queryLegalMainActions(state, rules).some((m) => m.kind === 'capture')).toBe(false);
  expect(
    run(state, rules, { kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('B1') })
      .state.board.pieces.r?.position,
  ).toEqual({ file: 1, rankIndex: 0 });
});

it('permits forced End when Shield removes the only executable main capture', () => {
  const rules = shieldBundle();
  const state = run(
    initial(
      rules,
      createBoard([
        piece('r', 'pawn', 'A14'),
        piece('block', 'pawn', 'A15'),
        piece('v', 'knight', 'B15', 'black'),
      ]),
    ),
    rules,
  ).state;
  expect(
    generateBaseMoves(state.board, 'r' as never)
      .filter((m) => m.kind === 'capture')
      .map((m) => m.targetId),
  ).toEqual(['v']);
  expect(queryLegalMainActions(state, rules)).toEqual([]);
  expect(run(state, rules, { kind: 'end' }).state.turn.sideToAct).toBe('black');
});

it('retargets Shield without reapplying or changing ID/source/payload/deadline', () => {
  const rules = shieldBundle();
  const state = run(
    initial(
      rules,
      createBoard([
        piece('r', 'rook', 'A1'),
        piece('v', 'knight', 'A3', 'black'),
        piece('to', 'pawn', 'B1', 'black', 'white'),
      ]),
    ),
    rules,
  ).state;
  const old = effects(state, rules)[0]!;
  const transfer: RulesetBundle = {
    ...rules,
    handlers: [
      {
        id: 'relocate',
        order: 0,
        react: (e) =>
          e.kind === 'marker'
            ? [
                {
                  kind: 'effect_relocate',
                  instanceId: old.id,
                  target: { kind: 'piece', pieceId: 'to' as never },
                },
              ]
            : [],
      },
    ],
    skills: { shift: { cost: 0, operations: [{ kind: 'marker', value: 'shift' }] } },
  };
  // Advance with a quiet main move, then the Black synthetic skill relocates the attachment.
  const next = run(state, rules, {
    kind: 'move',
    pieceId: 'r' as never,
    to: coordinateFromAlgebraic('A2'),
  }).state;
  const moved = run(next, transfer, { kind: 'skill', skillId: 'shift' });
  expect(effects(moved.state, transfer)).toEqual([
    { ...old, target: { kind: 'piece', pieceId: 'to' } },
  ]);
  expect(moved.events.filter((e) => e.kind.startsWith('effect_')).map((e) => e.kind)).toEqual([
    'effect_relocated',
  ]);
  expect(moved.state.board.pieces.to).toMatchObject({ owner: 'white', controller: 'black' });
});

it('rolls back all candidate changes if relocation violates explicit synthetic King eligibility', () => {
  const rules = shieldBundle(
    [
      apply(),
      { kind: 'random', side: 'actor', namespace: 'test', pool: ['a', 'b'] },
      {
        kind: 'effect_relocate',
        instanceId: 'shield:operation:2',
        target: { kind: 'piece', pieceId: 'king' as never },
      },
    ],
    { kingEligibility: { kind: 'denied' } },
  );
  const state = initial(
    rules,
    createBoard([piece('v', 'pawn', 'A1', 'black'), piece('king', 'king', 'B1')]),
  );
  const before = JSON.stringify(state);
  expect(resolveCommand(state, input({ kind: 'skill', skillId: 'cast' }), rules)).toMatchObject({
    ok: false,
    events: [],
  });
  expect(JSON.stringify(state)).toBe(before);
});

it('preserves captured source identity through owner/controller fixture changes and caster destruction', () => {
  const rules = shieldBundle([
    apply(3, { sourcePiece: 'r' as never, sourceIncarnation: 'fixture.life' }),
  ]);
  const state = run(initial(rules), rules).state;
  const old = effects(state, rules)[0]!;
  const changed = GameStateSchema.parse({
    ...state,
    board: createBoard(
      Object.values(state.board.pieces).map((p) => ({
        ...p,
        owner: 'white' as const,
        controller: 'black' as const,
      })),
    ),
  });
  const destroyed = resolveCommand(
    changed,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'r' } },
    rules,
  );
  if (!destroyed.ok) throw new Error(destroyed.code);
  expect(effects(destroyed.state, rules)).toEqual([old]);
  expect(old).toMatchObject({
    sourcePlayer: 'white',
    sourcePiece: 'r',
    sourceIncarnation: 'fixture.life',
    deadline: { side: 'white', boundary: 'end', ordinal: 4 },
  });
});

it('fails closed for Shield with an arbitrary interceptor without running competing callbacks', () => {
  const base = shieldBundle();
  const rules: RulesetBundle = {
    ...base,
    interceptors: [
      {
        id: 'unknown-pair',
        order: -100,
        intercept: () => {
          throw new Error('UNAPPROVED_CALLBACK_RAN');
        },
      },
    ],
  };
  const state = run(initial(rules), rules).state;
  expect(queryLegalMainActions(state, rules).some((m) => m.kind === 'capture')).toBe(false);
  expect(resolveCommand(state, capture, rules)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  expect(
    resolveCommand(
      state,
      input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('B1') }),
      rules,
    ).ok,
  ).toBe(true);
});

it('rejects a generic redirect into a Shielded final destination, preserving unprotected redirect support', () => {
  const base = shieldBundle([apply(1, { target: { kind: 'piece', pieceId: 'other' as never } })]);
  const rules: RulesetBundle = {
    ...base,
    interceptors: [
      {
        id: 'synthetic-redirect',
        order: 0,
        intercept: () => ({ kind: 'redirect', targetId: 'other' }),
      },
    ],
  };
  const before = initial(
    rules,
    createBoard([
      piece('r', 'rook', 'A1'),
      piece('v', 'knight', 'A3', 'black'),
      piece('other', 'pawn', 'B1', 'black'),
    ]),
  );
  expect(resolveCommand(before, capture, rules).ok).toBe(true);
  const state = run(before, rules).state,
    unchanged = JSON.stringify(state);
  expect(resolveCommand(state, capture, rules)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  expect(JSON.stringify(state)).toBe(unchanged);
});

it.each([0, -1, 2, 1.5, Number.MAX_SAFE_INTEGER + 1])(
  'rejects untrusted producer duration %s atomically',
  (rounds) => {
    const rules = shieldBundle([apply(rounds)]),
      state = initial(rules),
      before = JSON.stringify(state);
    expect(resolveCommand(state, input({ kind: 'skill', skillId: 'cast' }), rules)).toMatchObject({
      ok: false,
      events: [],
    });
    expect(JSON.stringify(state)).toBe(before);
  },
);

it('reuses declared target eligibility and rejects missing/unknown defense contracts', () => {
  const rules = shieldBundle([apply()], { eligibility: { policyId: 'fixture.target' } });
  const denied = {
    ...rules,
    effectRuntime: createEffectRuntime(rules.effectRegistry!, {
      captureDefense: SHIELD_CAPTURE_DEFENSE_BINDINGS,
      eligibility: { 'fixture.target': () => false },
    }),
  };
  expect(
    resolveCommand(initial(denied), input({ kind: 'skill', skillId: 'cast' }), denied),
  ).toMatchObject({ ok: false, events: [] });
  const missing = { ...rules, effectRuntime: createEffectRuntime(rules.effectRegistry!) };
  expect(
    resolveCommand(initial(missing), input({ kind: 'skill', skillId: 'cast' }), missing),
  ).toEqual({ ok: false, code: 'UNSUPPORTED_RUNTIME', events: [] });
  expect(() =>
    createEffectRegistry([
      definition({
        captureDefense: { kind: 'charges', policyId: 'unknown' },
      } as unknown as Partial<EffectDefinition>),
    ]),
  ).toThrow();
  const cell = shieldBundle([], { targets: ['cell'] });
  expect(
    resolveCommand(initial(cell), input({ kind: 'skill', skillId: 'cast' }), {
      ...cell,
      skills: {
        cast: {
          cost: 0,
          operations: [apply(1, { target: { kind: 'cell', position: { file: 0, rankIndex: 0 } } })],
        },
      },
    }),
  ).toEqual({ ok: false, code: 'UNSUPPORTED_RUNTIME', events: [] });
});

it('freezes defense callbacks and cannot commit mutations or callback failures', () => {
  const base = shieldBundle();
  const malicious = {
    ...base,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      captureDefense: {
        'shield.capture.v1': (c) => {
          (c.state.ap as { white: number }).white = 999;
          return true;
        },
      },
    }),
  };
  const state = run(initial(malicious), malicious).state,
    before = JSON.stringify(state);
  expect(resolveCommand(state, capture, malicious)).toMatchObject({ ok: false, events: [] });
  expect(JSON.stringify(state)).toBe(before);
  expect(() => queryLegalMainActions(state, malicious)).toThrow();
});

it.each(['white', 'black'] as const)(
  'isolates %s mirror source clocks and protection from the opposing controller',
  (side) => {
    const enemy = side === 'white' ? 'black' : 'white';
    const rules = shieldBundle([apply(), apply(3, { sourcePlayer: enemy })]);
    const square = side === 'white' ? 'A1' : 'A15',
      rook = side === 'white' ? 'C1' : 'C15';
    let state = initial(
      rules,
      createBoard([piece('r', 'rook', rook, side, enemy), piece('v', 'pawn', square, enemy, side)]),
    );
    if (side === 'black') state = run(state, rules, { kind: 'end' }).state;
    state = run(state, rules).state;
    expect(effects(state, rules).map((e) => [e.sourcePlayer, e.deadline?.side])).toEqual([
      [side, side],
      [enemy, enemy],
    ]);
    expect(state.board.pieces.r).toMatchObject({ controller: side, owner: enemy });
    expect(state.board.pieces.v).toMatchObject({ controller: enemy, owner: side });
    expect(
      resolveCommand(
        state,
        input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic(square) }, side),
        rules,
      ),
    ).toEqual({ ok: false, code: 'CAPTURE_DEFENDED', events: [] });
    expect(state.ap[side]).toBe(9);
    expect(state.ap[enemy]).toBe(10);
  },
);

it('round-trips immutable Shield state and rejects tampered N/source/definition versions', () => {
  const rules = shieldBundle([apply(3)]),
    state = run(initial(rules), rules).state;
  const encoded = encodeSnapshot(state, rules.effectRegistry);
  expect(decodeSnapshot(encoded, rules)).toEqual(state);
  expect(cloneSnapshot(state, rules)).toEqual(state);
  const clone = cloneSnapshot(state, rules);
  expect(clone.effects[0]?.payload).not.toBe(state.effects[0]?.payload);
  expect(Object.isFrozen(effects(clone, rules)[0]?.payload)).toBe(true);
  for (const patch of [
    { definitionVersion: '9.0.0' },
    { sourceSkill: 'unknown' },
    {
      duration: { schemaVersion: '1.0.0', producerId: 'one', producerVersion: '1.0.0', rounds: 2 },
    },
  ]) {
    const raw = JSON.parse(encoded);
    Object.assign(raw.effects[0].payload.instance, patch);
    expect(() => decodeSnapshot(JSON.stringify(raw), rules)).toThrow();
  }
});

it('replays exact successful Shield refresh/events while rejecting an archive request containing blocked capture', () => {
  const rules = shieldBundle(),
    state = initial(rules, timingBoard());
  const replay = recordReplay(
    state,
    [
      input({ kind: 'skill', skillId: 'cast' }),
      input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('D1') }),
      input({ kind: 'end' }, 'black'),
      input({ kind: 'skill', skillId: 'cast' }),
      input({ kind: 'move', pieceId: 'r' as never, to: coordinateFromAlgebraic('C1') }),
      input({ kind: 'end' }, 'black'),
    ],
    rules,
  );
  if (!replay.ok) throw new Error(replay.code);
  const executed = executeReplay(replay.archive, rules);
  if (!executed.ok) throw new Error(executed.code);
  expect(executed.state).toEqual(replay.state);
  expect(executed.events).toEqual(replay.archive.steps.flatMap((step) => step.events));
  expect(
    executed.events.filter((e) => e.kind === 'effect_refreshed').map((e) => e.payload.effectId),
  ).toEqual(['shield:operation:2']);
  expect(
    recordReplay(initial(rules), [input({ kind: 'skill', skillId: 'cast' }), capture], rules),
  ).toEqual({ ok: false, code: 'CAPTURE_DEFENDED' });
});

it('projects equivalent relative Shield duration independently of absolute boundary counters', () => {
  const rules = shieldBundle([apply(3)]);
  const state = run(initial(rules, createBoard([piece('v', 'pawn', 'A1', 'black')])), rules).state;
  const first = run(state, rules, { kind: 'end' }).state;
  const shifted = GameStateSchema.parse({
    ...state,
    turn: { ...state.turn, plyIndex: 2, roundIndex: 2 },
    history: {
      ...state.history,
      lastCountedPly: 2,
      entries: state.history.entries.map((e, index) =>
        index === state.history.entries.length - 1 ? { ...e, plyIndex: 2 } : e,
      ),
    },
  });
  const old = effects(state, rules)[0]!;
  const later = {
    ...shifted,
    effects: encodeEffectRecords(
      [
        {
          ...old,
          timingAnchor: { side: 'white', boundary: 'end', ordinal: 2 },
          deadline: { side: 'white', boundary: 'end', ordinal: 5 },
        },
      ],
      rules.effectRegistry!,
      shifted,
    ),
  };
  const second = run(later, rules, { kind: 'end' }).state;
  expect(Object.keys(second.history.repetition).at(-1)).toBe(
    Object.keys(first.history.repetition).at(-1),
  );
});

it('does not admit a trusted derived move as an alternate capture route', () => {
  const rules = shieldBundle([
    apply(),
    {
      kind: 'move',
      pieceId: 'r',
      to: coordinateFromAlgebraic('A3'),
    } as unknown as DerivedOperation,
  ]);
  const state = initial(rules),
    before = JSON.stringify(state);
  expect(resolveCommand(state, input({ kind: 'skill', skillId: 'cast' }), rules)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
  expect(JSON.stringify(state)).toBe(before);
});

it('composes Shield defense with existing Stun restrictions without making Shield a main-action modifier', () => {
  const base = shieldBundle([apply(1, { target: { kind: 'piece', pieceId: 'r' as never } })], {
    actionRestrictions: STUN_CONSUMER_CONTRACT.actionRestrictions,
  });
  const rules = {
    ...base,
    effectRuntime: createEffectRuntime(base.effectRegistry!, {
      captureDefense: SHIELD_CAPTURE_DEFENSE_BINDINGS,
      restrictions: STUN_RESTRICTION_BINDINGS,
    }),
  };
  const state = run(initial(rules), rules).state;
  expect(queryLegalMainActions(state, rules)).toEqual([]);
  expect(queryCaptureThreats(state, 'white', rules)).toEqual([]);
  expect(resolveCommand(state, capture, rules)).toEqual({
    ok: false,
    code: 'INVALID_MOVE',
    events: [],
  });
});

it('pins current executable semantics to engine0.6.0 and rejects engine0.3.0 snapshots/archives', () => {
  const rules = shieldBundle(),
    state = initial(rules);
  expect(state.engineVersion).toBe('0.6.0');
  expect(() =>
    decodeSnapshot(JSON.stringify({ ...state, engineVersion: '0.3.0' }), rules),
  ).toThrow();
  const recorded = recordReplay(state, [], rules);
  if (!recorded.ok) throw new Error(recorded.code);
  const old = {
    ...recorded.archive,
    initialConfig: { ...recorded.archive.initialConfig, engineVersion: '0.3.0' },
  };
  expect(executeReplay(old, rules)).toMatchObject({ ok: false, events: [] });
});
