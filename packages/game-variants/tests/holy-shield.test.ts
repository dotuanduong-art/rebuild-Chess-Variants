import { expect, it } from 'vitest';
import {
  createGame,
  resolveCommand,
  decodeEffectRecords,
  encodeSnapshot,
  decodeSnapshot,
} from '@variant-chess/game-core';
import { createHolyShieldExperimentalRuleset } from '../src/index.js';
import { game, unit, cast as targetCast, run, finish, effects } from './holy-shield.fixture.js';
import type { GameState, PieceInput } from '@variant-chess/shared-types';
import type { RulesetBundle } from '@variant-chess/game-core';
import {
  createBoard,
  coordinateFromAlgebraic,
  queryLegalMainActions,
  cloneSnapshot,
  fullStateHash,
  repetitionKey,
  recordReplay,
  executeReplay,
} from '@variant-chess/game-core';

function reject(state: GameState, rules: RulesetBundle, raw: unknown, code: string) {
  const before = encodeSnapshot(state, rules.effectRegistry);
  const result = resolveCommand(state, raw, rules);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Unexpected accepted command');
  expect(result).toEqual({ ok: false, code, events: [] });
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
}

const cast = (pieceId = 'white-H1', side = 'white') => ({
  authority: { kind: 'player', side },
  command: {
    kind: 'skill',
    skillId: 'guardian.holy_shield',
    intent: { kind: 'piece-target-v1', pieceId },
  },
});

it('counts equivalent real casts at ActionReady despite match/piece/allocation noise', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: true });
  const left = game(rules, 20, undefined, 'left');
  const rightBoard = Object.values(left.board.pieces).map((p) => ({ ...p, id: `renamed-${p.id}` }));
  const rightBase = game(rules, 20, rightBoard, 'right');
  const right = { ...rightBase, counters: { ...rightBase.counters, operation: 37 } };
  const a = run(left, rules, targetCast().command);
  const b = run(right, rules, targetCast('renamed-bearer').command);
  expect(a.state.effects[0]?.id).toBe('left:operation:2');
  expect(b.state.effects[0]?.id).toBe('right:operation:39');
  const aReady = run(a.state, rules, {
    kind: 'move',
    pieceId: 'wk' as never,
    to: coordinateFromAlgebraic('I1'),
  }).state;
  const bReady = run(b.state, rules, {
    kind: 'move',
    pieceId: 'renamed-wk' as never,
    to: coordinateFromAlgebraic('I1'),
  }).state;
  const readyKey = (s: GameState) =>
    Object.keys(s.history.repetition).find((k) => JSON.parse(k).sideToAct === 'black')!;
  expect(readyKey(aReady)).toBe(readyKey(bReady));
  expect(JSON.parse(readyKey(aReady)).effects[0]).toEqual({
    definitionId: 'effect.shield',
    definitionVersion: '1.0.0',
    data: {
      target: { kind: 'piece', position: { file: 0, rankIndex: 0 } },
      remaining: { side: 'white', boundary: 'end', remaining: 2 },
      source: {
        player: 'white',
        variant: 'guardian',
        skill: 'guardian.holy_shield',
        piece: null,
        incarnation: null,
      },
    },
  });
  expect(fullStateHash(aReady, rules.effectRegistry)).not.toEqual(
    fullStateHash(bReady, rules.effectRegistry),
  );
  const changedOrigin = {
    ...left,
    board: createBoard(
      Object.values(left.board.pieces).map((p) =>
        p.id === 'bearer' ? { ...p, origin: 'special' as const } : p,
      ),
    ) as GameState['board'],
  };
  expect(repetitionKey(changedOrigin)).not.toBe(repetitionKey(left));
});

it('rolls back test-only RNG work after a real producer plan, with no committed facts or ID/history use', () => {
  const real = createHolyShieldExperimentalRuleset({ white: true, black: false });
  // Test-only fault transport, never part of the experimental production bundle.
  const probe: RulesetBundle = {
    ...real,
    handlers: [
      {
        id: 'test.rng',
        order: 1,
        react: (e) =>
          e.kind === 'skill_used'
            ? [{ kind: 'random', side: 'actor', namespace: 'test.rng', pool: ['a', 'b'] }]
            : [],
      },
    ],
  };
  const state = game(probe);
  const before = encodeSnapshot(state, probe.effectRegistry);
  let reached = false;
  const result = resolveCommand(state, targetCast(), probe, {
    validate: (candidate) => {
      reached = true;
      expect(candidate.rng.cursor).toBe(1);
      expect(candidate.ap.white).toBe(16);
      expect(candidate.turn.skillUsed).toBe(true);
      expect(candidate.effects).toHaveLength(1);
      expect(candidate.counters.transaction).toBe(1);
      expect(candidate.history.entries).toHaveLength(2);
      throw new Error('FAULT_AFTER_RNG');
    },
  });
  expect(reached).toBe(true);
  expect(result).toEqual({ ok: false, code: 'FAULT_AFTER_RNG', events: [] });
  expect(encodeSnapshot(state, probe.effectRegistry)).toBe(before);
});

it.each(['attacker', 'wk', 'bk'])(
  'relocates a real Shield to ordinary destination %s preserving source, ID and deadline',
  (destination) => {
    const rules = createHolyShieldExperimentalRuleset({ white: true, black: true });
    const state = finish(run(game(rules), rules, targetCast().command).state, rules);
    const original = effects(state, rules)[0]!;
    // Transport of the already approved generic operation only; not an enabled Turtle skill.
    const probe: RulesetBundle = {
      ...rules,
      skills: {
        ...rules.skills,
        'synthetic.transfer': {
          cost: 0,
          operations: [
            { kind: 'effect_sets_swap', pieceA: 'bearer' as never, pieceB: destination as never },
          ],
        },
      },
    };
    const result = run(state, probe, { kind: 'skill', skillId: 'synthetic.transfer' });
    expect(effects(result.state, probe)).toEqual([
      { ...original, target: { kind: 'piece', pieceId: destination } },
    ]);
    expect(result.events.filter((e) => e.kind.startsWith('effect_')).map((e) => e.kind)).toEqual([
      'effect_relocated',
      'effect_sets_swapped',
    ]);
  },
);

it.each(['special', 'summoned', undefined] as const)(
  'rejects entire effect swap to unsupported provenance %s',
  (origin) => {
    const rules = createHolyShieldExperimentalRuleset({ white: true, black: true });
    const destination = unit('unsupported', 'king', 'O15', 'black');
    const { origin: omitted, ...unknown } = destination;
    void omitted;
    const board = [
      unit('bearer', 'rook', 'A1'),
      unit('wk', 'king', 'H1'),
      unit('bk', 'king', 'H15', 'black'),
      origin ? { ...destination, origin } : unknown,
    ];
    const state = finish(run(game(rules, 20, board), rules, targetCast().command).state, rules);
    const probe: RulesetBundle = {
      ...rules,
      skills: {
        ...rules.skills,
        'synthetic.transfer': {
          cost: 0,
          operations: [
            { kind: 'effect_sets_swap', pieceA: 'bearer' as never, pieceB: 'unsupported' as never },
          ],
        },
      },
    };
    reject(
      state,
      probe,
      {
        authority: { kind: 'player', side: 'black' },
        command: { kind: 'skill', skillId: 'synthetic.transfer' },
      },
      'EFFECT_UNIT_INELIGIBLE',
    );
  },
);

it('cleans remaining real Shields on terminal King capture without running further skills', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
  const state = game(rules, 20, [
    unit('bearer', 'rook', 'H14'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ]);
  const applied = run(state, rules, targetCast().command);
  const terminal = run(applied.state, rules, {
    kind: 'move',
    pieceId: 'bearer' as never,
    to: coordinateFromAlgebraic('H15'),
  });
  expect(terminal.state.terminal).toEqual({
    status: 'won',
    reason: 'king_captured',
    winner: 'white',
  });
  expect(terminal.state.ap).toEqual({ white: 16, black: 20 });
  expect(terminal.state.effects).toEqual([]);
  expect(
    terminal.events.filter((e) => e.kind === 'effect_removed').map((e) => e.payload.reason),
  ).toEqual(['match_terminal']);
});

it('preserves a Shielded King and does not commit terminal on an opposing capture attempt', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
  const state = game(rules, 20, [
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
    unit('bearer', 'pawn', 'A2'),
    unit('attacker', 'rook', 'H4', 'black'),
  ]);
  const applied = run(state, rules, targetCast('wk').command);
  const moved = run(applied.state, rules, {
    kind: 'move',
    pieceId: 'bearer' as never,
    to: coordinateFromAlgebraic('A3'),
  });
  reject(
    moved.state,
    rules,
    {
      authority: { kind: 'player', side: 'black' },
      command: { kind: 'move', pieceId: 'attacker', to: coordinateFromAlgebraic('H1') },
    },
    'CAPTURE_DEFENDED',
  );
  expect(moved.state.terminal).toEqual({ status: 'ongoing' });
});

it('preserves targetless synthetic contracts but never silently gives them arbitrary targets', () => {
  const real = createHolyShieldExperimentalRuleset({ white: true, black: false });
  const probe: RulesetBundle = {
    ...real,
    skills: {
      ...real.skills,
      'synthetic.marker': { cost: 0, operations: [{ kind: 'marker', value: 'targetless' }] },
    },
  };
  reject(
    game(real),
    probe,
    { ...targetCast(), command: { ...targetCast().command, skillId: 'synthetic.marker' } },
    'INVALID_SKILL_INTENT',
  );
  const result = run(game(real), probe, { kind: 'skill', skillId: 'synthetic.marker' });
  expect(result.events.find((e) => e.kind === 'marker')?.payload).toEqual({ value: 'targetless' });
  expect(result.state.effects).toEqual([]);
});

it('pins profile selection/version in state, root and restore, and includes it in repetition', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
  const initial = game(rules);
  const other = createHolyShieldExperimentalRuleset({ white: false, black: true });
  expect(other.hash).not.toBe(rules.hash);
  expect(repetitionKey(initial)).not.toBe(repetitionKey(game(other)));
  expect(initial.playerProfiles).toEqual({
    white: { id: 'guardian.holy-shield-only.experimental', version: '1.0.0' },
    black: null,
  });
  for (const profile of [
    null,
    { id: 'guardian', version: '1.0.0' },
    { id: 'guardian.holy-shield-only.experimental', version: '2.0.0' },
  ]) {
    const tampered = { ...initial, playerProfiles: { ...initial.playerProfiles, white: profile } };
    expect(resolveCommand(tampered, targetCast(), rules)).toEqual({
      ok: false,
      code: 'INVARIANT',
      events: [],
    });
    expect(() => decodeSnapshot(JSON.stringify(tampered), rules)).toThrow('PROFILE_MISMATCH');
  }
  const changedConfig = { ...rules, playerProfiles: other.playerProfiles! };
  expect(resolveCommand(initial, targetCast(), changedConfig).ok).toBe(false);
  expect(() =>
    decodeSnapshot(encodeSnapshot(initial, rules.effectRegistry), changedConfig),
  ).toThrow('PROFILE_MISMATCH');
  expect(() => decodeSnapshot(encodeSnapshot(initial, rules.effectRegistry), other)).toThrow(
    'RULESET_MISMATCH',
  );
});

it('restores and replays actual casting, source-end expiry and exact events/hashes', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: true });
  const initial = game(rules);
  const inputs: unknown[] = [targetCast()];
  let state = run(initial, rules, targetCast().command).state;
  const encoded = encodeSnapshot(state, rules.effectRegistry);
  expect(encodeSnapshot(decodeSnapshot(encoded, rules), rules.effectRegistry)).toBe(encoded);
  expect(fullStateHash(cloneSnapshot(state, rules), rules.effectRegistry)).toEqual(
    fullStateHash(state, rules.effectRegistry),
  );
  const commands = [
    ['white', 'wk', 'I1'],
    ['black', 'bk', 'I15'],
    ['black', null, null],
    ['white', 'wk', 'H1'],
    ['white', null, null],
    ['black', 'bk', 'H15'],
    ['black', null, null],
    ['white', 'wk', 'I1'],
    ['white', null, null],
  ] as const;
  for (const [side, pieceId, to] of commands) {
    const command = pieceId
      ? { kind: 'move' as const, pieceId: pieceId as never, to: coordinateFromAlgebraic(to) }
      : { kind: 'end' as const };
    const input = { authority: { kind: 'player', side }, command };
    const result = resolveCommand(state, input, rules);
    if (!result.ok) throw new Error(result.code);
    const restored = resolveCommand(cloneSnapshot(state, rules), input, rules);
    expect(restored).toEqual(result);
    inputs.push(input);
    state = result.state;
  }
  expect(state.effects).toEqual([]);
  const recorded = recordReplay(initial, inputs, rules);
  if (!recorded.ok) throw new Error(recorded.code);
  const replayed = executeReplay(recorded.archive, rules);
  expect(replayed.ok).toBe(true);
  if (!replayed.ok) throw new Error(replayed.code);
  expect(replayed.state).toEqual(state);
  expect(replayed.events).toEqual(recorded.archive.steps.flatMap((s) => s.events));
  expect(fullStateHash(replayed.state, rules.effectRegistry)).toEqual(
    fullStateHash(state, rules.effectRegistry),
  );
  expect(state.engineVersion).toBe('0.6.0');
  expect(state.schemaVersion).toBe('1.1.0');
  expect(() =>
    decodeSnapshot(JSON.stringify({ ...initial, engineVersion: '0.5.0' }), rules),
  ).toThrow();
  expect(() =>
    decodeSnapshot(JSON.stringify({ ...initial, schemaVersion: '1.0.0' }), rules),
  ).toThrow();
  expect(
    executeReplay(
      {
        ...recorded.archive,
        initialConfig: { ...recorded.archive.initialConfig, engineVersion: '0.5.0' },
      },
      rules,
    ).ok,
  ).toBe(false);
});

it('rolls back the whole real cast when effect execution or final candidate validation fails', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
  const state = game(rules);
  const before = encodeSnapshot(state, rules.effectRegistry);
  const noBinding = { ...rules, effectRuntime: { ...rules.effectRuntime!, captureDefense: {} } };
  reject(state, noBinding, targetCast(), 'UNSUPPORTED_RUNTIME');
  const exhausted = resolveCommand(state, targetCast(), rules, { operationBudget: 1 });
  expect(exhausted).toEqual({ ok: false, code: 'RESOLUTION_LIMIT', events: [] });
  let observed = false;
  const fault = resolveCommand(state, targetCast(), rules, {
    validate: (candidate) => {
      observed = true;
      expect(candidate.ap.white).toBe(16);
      expect(candidate.turn.skillUsed).toBe(true);
      expect(candidate.effects).toHaveLength(1);
      expect(Object.isFrozen(candidate)).toBe(true);
      throw new Error('INJECTED_AFTER_SKILL');
    },
  });
  expect(observed).toBe(true);
  expect(fault).toEqual({ ok: false, code: 'INJECTED_AFTER_SKILL', events: [] });
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
  expect(run(state, rules, targetCast().command)).toEqual(
    run(cloneSnapshot(state, rules), rules, targetCast().command),
  );
});

it('keeps N2 through the cast boundary, refreshes the same source ID, then expires at the reset source end', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: true });
  const applied = run(game(rules), rules, targetCast().command);
  const first = effects(applied.state, rules)[0]!;
  let state = finish(applied.state, rules);
  expect(effects(state, rules)[0]).toEqual(first); // White end1 is not a tick of the N2 deadline.
  state = finish(state, rules); // White action2.
  const refreshed = run(state, rules, targetCast().command);
  expect(refreshed.events.filter((e) => e.kind === 'effect_refreshed')).toHaveLength(1);
  expect(refreshed.events.some((e) => e.kind === 'effect_applied')).toBe(false);
  expect(refreshed.state.ap.white).toBe(12);
  expect(effects(refreshed.state, rules)[0]).toMatchObject({
    id: first.id,
    appliedSequence: first.appliedSequence,
    timingAnchor: { side: 'white', boundary: 'end', ordinal: 2 },
    deadline: { side: 'white', boundary: 'end', ordinal: 4 },
  });
  state = finish(refreshed.state, rules); // White end2.
  state = finish(state, rules); // Black end2.
  state = finish(state, rules); // White end3: still active.
  expect(effects(state, rules)).toHaveLength(1);
  state = finish(state, rules); // Black end3.
  state = finish(state, rules); // White end4.
  expect(effects(state, rules)).toEqual([]);
});

it('rejects repeated capture atomically without consuming Shield; expiry restores capture', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: true });
  let state = finish(run(game(rules), rules, targetCast().command).state, rules);
  const command = {
    kind: 'move' as const,
    pieceId: 'attacker' as never,
    to: coordinateFromAlgebraic('A1'),
  };
  const attempt = { authority: { kind: 'player', side: 'black' }, command };
  expect(
    queryLegalMainActions(state, rules, 'black').some(
      (m) => m.to.file === 0 && m.to.rankIndex === 0,
    ),
  ).toBe(false);
  const shieldBefore = effects(state, rules);
  reject(state, rules, attempt, 'CAPTURE_DEFENDED');
  reject(state, rules, attempt, 'CAPTURE_DEFENDED');
  expect(effects(state, rules)).toEqual(shieldBefore);
  state = finish(state, rules); // Black end1
  state = finish(state, rules); // White end2
  state = finish(state, rules); // Black end2
  state = finish(state, rules); // White end3 expires
  expect(state.effects).toEqual([]);
  const captured = run(state, rules, command);
  expect(captured.events.some((e) => e.kind === 'capture_committed')).toBe(true);
  expect(captured.state.ap).toEqual({ white: 19, black: 24 }); // fixed4 cost, Rook loss+3 and capture+4.
});

it('allows committed destruction with owner loss AP and bearer-death cleanup', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
  const state = run(game(rules), rules, targetCast().command).state;
  const result = resolveCommand(
    state,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'bearer' } },
    rules,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  expect(result.state.board.pieces.bearer).toBeUndefined();
  expect(result.state.ap).toEqual({ white: 19, black: 20 });
  expect(result.state.effects).toEqual([]);
  expect(
    result.events.filter((e) => e.kind === 'effect_removed').map((e) => e.payload.reason),
  ).toEqual(['target_destroyed']);
});

it('keeps source and protection after a trusted controller fixture change, and supports a second real source', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: true });
  let state = finish(run(game(rules), rules, targetCast().command).state, rules);
  const whiteShield = effects(state, rules)[0]!;
  // Authoritative fixture conversion only; no conversion skill is implemented or enabled.
  state = {
    ...state,
    board: createBoard(
      Object.values(state.board.pieces).map((p) =>
        p.id === 'bearer' ? { ...p, controller: 'black' } : p,
      ),
    ) as GameState['board'],
  };
  state = cloneSnapshot(state, rules);
  expect(effects(state, rules)[0]).toEqual(whiteShield);
  const black = run(state, rules, targetCast('bearer', 'black').command);
  expect(black.state.ap).toEqual({ white: 16, black: 16 });
  expect(
    effects(black.state, rules).map((e) => ({ source: e.sourcePlayer, deadline: e.deadline })),
  ).toEqual([
    { source: 'white', deadline: { side: 'white', boundary: 'end', ordinal: 3 } },
    { source: 'black', deadline: { side: 'black', boundary: 'end', ordinal: 3 } },
  ]);
  state = finish(black.state, rules); // Black end1
  state = finish(state, rules); // White end2
  state = finish(state, rules); // Black end2
  state = finish(state, rules); // White end3 removes only White source
  expect(effects(state, rules).map((e) => e.sourcePlayer)).toEqual(['black']);
  state = finish(state, rules); // Black end3
  expect(state.effects).toEqual([]);
});

it.each(['white', 'black'] as const)(
  'casts independently for %s with the exact player-originated tuple',
  (side) => {
    const rules = createHolyShieldExperimentalRuleset({
      white: side === 'white',
      black: side === 'black',
    });
    let state = game(rules);
    if (side === 'black') state = finish(state, rules);
    const result = run(
      state,
      rules,
      targetCast(side === 'white' ? 'bearer' : 'attacker', side).command,
    );
    expect(result.state.ap[side]).toBe(16);
    expect(result.state.ap[side === 'white' ? 'black' : 'white']).toBe(20);
    expect(effects(result.state, rules)[0]).toMatchObject({
      sourcePlayer: side,
      sourceVariant: 'guardian',
      sourceSkill: 'guardian.holy_shield',
      sourcePiece: null,
      sourceIncarnation: null,
      deadline: { side, boundary: 'end', ordinal: 3 },
    });
  },
);

it('does not share state across matches or caller-owned profile selections', () => {
  const selection = { white: true, black: false };
  const rules = createHolyShieldExperimentalRuleset(selection);
  selection.white = false;
  const left = game(rules, 20, undefined, 'left');
  const right = game(rules, 20, undefined, 'right');
  const played = run(left, rules, targetCast().command);
  expect(right.effects).toEqual([]);
  expect(right.ap.white).toBe(20);
  expect(right.counters.transaction).toBe(0);
  expect(played.state.effects[0]?.id.startsWith('left:')).toBe(true);
  expect(Object.isFrozen(rules.skills)).toBe(true);
  expect(Object.isFrozen(right.playerProfiles.white)).toBe(true);
});

it.each([
  ['sourcePlayer', 'black'],
  ['sourceVariant', 'dynamite'],
  ['sourcePiece', 'wk'],
  ['duration', { rounds: 99 }],
  ['cost', 0],
  ['ap', 999],
  ['payload', {}],
  ['operations', []],
  ['application', { definitionId: 'effect.shield' }],
] as const)('rejects forged command field %s atomically', (field, value) => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: true });
  const input = targetCast();
  reject(
    game(rules),
    rules,
    { ...input, command: { ...input.command, [field]: value } },
    'INVALID_COMMAND',
  );
});

it.each([
  undefined,
  null,
  {},
  { kind: 'piece-target-v2', pieceId: 'bearer' },
  { kind: 'piece-target-v1', pieceId: ['bearer'] },
  { kind: 'piece-target-v1', pieceId: 'bearer', source: 'guardian' },
  { kind: 'piece-target-v1', pieceIds: ['bearer', 'wk'] },
])('rejects missing or malformed target intent %j', (intent) => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
  const input = targetCast();
  const command =
    intent === undefined
      ? { kind: 'skill', skillId: 'guardian.holy_shield' }
      : { ...input.command, intent };
  reject(
    game(rules),
    rules,
    { ...input, command },
    intent === undefined ? 'INVALID_SKILL_INTENT' : 'INVALID_COMMAND',
  );
});

it.each([
  'guardian.sanctuary',
  'guardian.divine_shield',
  'guardian.holy_aura',
  'dynamite.live_charge',
  'dynamite.landmine',
])('keeps unavailable skill %s disabled', (skillId) => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: true });
  reject(
    game(rules),
    rules,
    { ...targetCast(), command: { kind: 'skill', skillId } },
    'NOT_AVAILABLE',
  );
});

it('rejects non-Guardian and wrong-turn actors independently of their requested source', () => {
  const disabled = createHolyShieldExperimentalRuleset({ white: false, black: true });
  reject(game(disabled), disabled, targetCast(), 'UNAUTHORIZED_VARIANT');
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: true });
  reject(game(rules), rules, targetCast('attacker', 'black'), 'WRONG_TURN');
  reject(game(rules), rules, targetCast('attacker'), 'NOT_CONTROLLED');
  reject(game(rules), rules, targetCast('dead-or-absent'), 'PIECE_NOT_FOUND');
});

it.each(['special', 'summoned', undefined] as const)(
  'rejects unsupported bearer provenance %s despite ordinary chess type',
  (origin) => {
    const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
    const bearer = unit('bearer', 'rook', 'A1');
    const { origin: omitted, ...unknown } = bearer;
    void omitted;
    const target: PieceInput = origin ? { ...bearer, origin } : unknown;
    reject(game(rules, 20, [target]), rules, targetCast(), 'UNSUPPORTED_UNIT');
  },
);

it('casts on a controlled ordinary piece regardless of different owner/original side', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
  const s = game(rules, 4, [unit('bearer', 'queen', 'A1', 'white', 'black')]);
  const result = run(s, rules, targetCast().command);
  expect(result.state.board.pieces.bearer).toMatchObject({
    owner: 'black',
    controller: 'white',
    originalSide: 'black',
  });
  expect(result.state.ap).toEqual({ white: 0, black: 4 });
  expect(effects(result.state, rules)[0]).toMatchObject({
    sourcePlayer: 'white',
    sourcePiece: null,
  });
});

it('rejects AP3 without spending a slot; AP4 applies one Shield and prohibits a second skill', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: true });
  reject(game(rules, 3), rules, targetCast(), 'INSUFFICIENT_AP');
  const result = run(game(rules, 4), rules, targetCast().command);
  expect(result.state.ap.white).toBe(0);
  reject(result.state, rules, targetCast(), 'SKILL_USED');
});

it('preserves mandatory move and ends only after both move and skill, in either order', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
  const first = run(game(rules), rules, targetCast().command);
  reject(
    first.state,
    rules,
    { authority: { kind: 'player', side: 'white' }, command: { kind: 'end' } },
    'MAIN_MOVE_REQUIRED',
  );
  const skillThenMove = finish(first.state, rules);
  expect(skillThenMove.turn).toMatchObject({
    sideToAct: 'black',
    plyIndex: 1,
    skillUsed: false,
    mainMoveUsed: false,
  });
  const move = run(game(rules), rules, {
    kind: 'move',
    pieceId: 'wk' as never,
    to: { file: 8, rankIndex: 0 },
  });
  expect(move.state.turn).toMatchObject({
    sideToAct: 'white',
    mainMoveUsed: true,
    skillUsed: false,
  });
  const moveThenSkill = run(move.state, rules, targetCast().command);
  expect(moveThenSkill.state.turn.sideToAct).toBe('black');
  expect(moveThenSkill.state.ap.white).toBe(16);
  expect(effects(moveThenSkill.state, rules)[0]?.deadline).toEqual({
    side: 'white',
    boundary: 'end',
    ordinal: 3,
  });
});

it('rejects a restored Shield attachment on a tampered summoned bearer', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
  const result = resolveCommand(
    createGame({ matchId: 'origin', seed: 3, ap: { white: 4, black: 0 } }, rules),
    cast(),
    rules,
  );
  if (!result.ok) throw new Error(result.code);
  const tampered = JSON.parse(encodeSnapshot(result.state, rules.effectRegistry));
  tampered.board.pieces['white-H1'].origin = 'summoned';
  expect(() => decodeSnapshot(JSON.stringify(tampered), rules)).toThrow('EFFECT_UNIT_INELIGIBLE');
});

it.each([
  'cleansed',
  'dispelled',
  'consumed',
  'replaced',
  'source_invalidated',
  'link_broken',
] as const)(
  'rejects explicit %s of real Holy Shield even through a trusted test-only removal plan',
  (reason) => {
    const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
    const initial = createGame({ matchId: 'remove', seed: 19, ap: { white: 8, black: 0 } }, rules);
    const result = resolveCommand(initial, cast(), rules);
    if (!result.ok) throw new Error(result.code);
    const moved = resolveCommand(
      result.state,
      {
        authority: { kind: 'player', side: 'white' },
        command: { kind: 'move', pieceId: 'white-A2', to: { file: 0, rankIndex: 2 } },
      },
      rules,
    );
    if (!moved.ok) throw new Error(moved.code);
    const effectId = result.state.effects[0]!.id;
    // Test-only operation transport; no cleanse or other extra skill is enabled in the real bundle.
    const probe = {
      ...rules,
      skills: {
        ...rules.skills,
        'synthetic.remove': {
          cost: 0,
          operations: [{ kind: 'effect_remove' as const, instanceId: effectId, reason }],
        },
      },
    };
    const before = encodeSnapshot(moved.state, rules.effectRegistry);
    const rejected = resolveCommand(
      moved.state,
      {
        authority: { kind: 'player', side: 'black' },
        command: { kind: 'skill', skillId: 'synthetic.remove' },
      },
      probe,
    );
    expect(rejected).toEqual({ ok: false, code: 'EFFECT_REMOVAL_FORBIDDEN', events: [] });
    expect(encodeSnapshot(moved.state, rules.effectRegistry)).toBe(before);
  },
);

it('casts real Holy Shield on an ordinary King, debiting exactly4 once without using the main slot', () => {
  const rules = createHolyShieldExperimentalRuleset({ white: true, black: false });
  const state = createGame({ matchId: 'holy', seed: 19, ap: { white: 4, black: 0 } }, rules);
  const result = resolveCommand(state, cast(), rules);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  expect(result.state.ap).toEqual({ white: 0, black: 0 });
  expect(result.state.turn).toMatchObject({
    sideToAct: 'white',
    skillUsed: true,
    mainMoveUsed: false,
  });
  expect(result.events.map((e) => e.kind)).toEqual(['skill_used', 'ap_changed', 'effect_applied']);
  expect(result.events.find((e) => e.kind === 'skill_used')?.payload).toEqual({
    actor: 'white',
    skillId: 'guardian.holy_shield',
    actualCost: 4,
  });
  expect(
    decodeEffectRecords(result.state.effects, rules.effectRegistry!, result.state),
  ).toMatchObject([
    {
      definitionId: 'effect.shield',
      definitionVersion: '1.0.0',
      sourcePlayer: 'white',
      sourceVariant: 'guardian',
      sourceSkill: 'guardian.holy_shield',
      sourcePiece: null,
      sourceIncarnation: null,
      target: { kind: 'piece', pieceId: 'white-H1' },
      lifetime: { kind: 'rounds', rounds: 2, boundary: 'end' },
      timingAnchor: { side: 'white', boundary: 'end', ordinal: 1 },
      deadline: { side: 'white', boundary: 'end', ordinal: 3 },
      payload: {},
      groupId: null,
    },
  ]);
});
