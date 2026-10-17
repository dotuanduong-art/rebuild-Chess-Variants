import { expect, it } from 'vitest';
import { SKILL_AP_COSTS_V1, SKILL_AP_COSTS_V2 } from '../src/index.js';
import {
  createSanctuaryExperimentalRuleset,
  createHolyShieldExperimentalRuleset,
  createLiveChargeExperimentalRuleset,
  createJudgmentChainsExperimentalRuleset,
  createHolySealExperimentalRuleset,
  createShockwaveExperimentalRuleset,
  SANCTUARY_EXPERIMENTAL_PROFILE,
} from '../src/index.js';
import {
  resolveCommand,
  querySanctuaryRegions,
  encodeSnapshot,
  decodeSnapshot,
  cloneSnapshot,
  sanctuaryCells,
  coordinateFromAlgebraic as at,
  canonicalEncode,
  fingerprint,
  executeReplay,
} from '@variant-chess/game-core';
import {
  sanctuaryGame,
  sanctuaryCast,
  run,
  finishSanctuaryTurn,
  unit,
} from './sanctuary.fixture.js';
import { pinFixedSkillCosts } from '../src/config/skill-costs.js';
import archive from './fixtures/pre-b3-shockwave-replay.json' with { type: 'json' };

it('extends the approved AP artifact with Sanctuary5 while preserving historical five-key v1', () => {
  expect(SKILL_AP_COSTS_V2).toEqual({
    'guardian.holy_shield': 4,
    'dynamite.live_charge': 3,
    'nephalem.judgment_chains': 5,
    'angel.holy_seal': 6,
    'dragon_sentinel.shockwave': 4,
    'guardian.sanctuary': 5,
  });
  expect(Object.keys(SKILL_AP_COSTS_V1)).toHaveLength(5);
  expect(Object.isFrozen(SKILL_AP_COSTS_V2)).toBe(true);
});

it('fails closed on missing concrete registration at root and restore instead of silently dropping a reaction', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const state = run(sanctuaryGame(rules), rules, sanctuaryCast()).state;
  const { sanctuary: omitted, ...unsupported } = rules;
  expect(omitted).toBeDefined();
  expect(() => decodeSnapshot(encodeSnapshot(state, rules.effectRegistry), unsupported)).toThrow(
    'UNSUPPORTED_SANCTUARY',
  );
  expect(
    resolveCommand(
      state,
      { authority: { kind: 'player', side: 'white' }, command: { kind: 'end' } },
      unsupported,
    ).ok,
  ).toBe(false);
});

it('pins immutable APv2 and executes the original B2 Shockwave archive without migration', () => {
  expect(fingerprint(canonicalEncode(SKILL_AP_COSTS_V1))).toBe('2a56da8ff953d29b');
  expect(fingerprint(canonicalEncode(SKILL_AP_COSTS_V2))).toBe('e268dfc077cf52ff');
  expect(() =>
    pinFixedSkillCosts({ ...SKILL_AP_COSTS_V2, 'guardian.sanctuary': 6 }, 'e268dfc077cf52ff'),
  ).toThrow('SKILL_COST_PIN_MISMATCH');
  const result = executeReplay(
    archive.archive,
    createShockwaveExperimentalRuleset({ white: true, black: false }),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error(result.code);
  expect(result.events).toEqual(archive.archive.steps[0]!.events);
  expect(result.state.engineVersion).toBe('0.6.0');
  expect(result.state.ap.white).toBe(0);
});

it.each(['white', 'black'] as const)(
  'only independently selected %s may cast; frozen selections/profile and matches do not leak',
  (side) => {
    const enabled = { white: side === 'white', black: side === 'black' };
    const rules = createSanctuaryExperimentalRuleset(enabled);
    enabled[side] = false;
    let state = sanctuaryGame(rules);
    const fresh = sanctuaryGame(rules, 20, undefined, 'second-match');
    if (side === 'black') state = finishSanctuaryTurn(state, rules);
    const cast = run(state, rules, sanctuaryCast('A1'));
    expect(cast.state.ap[side]).toBe(15);
    expect(querySanctuaryRegions(cast.state)[0]!.source.sourcePlayer).toBe(side);
    expect(querySanctuaryRegions(fresh)).toEqual([]);
    expect(Object.isFrozen(rules)).toBe(true);
    expect(Object.isFrozen(rules.sanctuary)).toBe(true);
    expect(Object.isFrozen(rules.skills)).toBe(true);
    expect(Object.isFrozen(SANCTUARY_EXPERIMENTAL_PROFILE)).toBe(true);
    expect(state.engineVersion).toBe('0.7.0');
    expect(state.schemaVersion).toBe('1.1.0');
    expect(rules.hash).toBe(
      `experimental-guardian-sanctuary-v1-w${Number(side === 'white')}-b${Number(side === 'black')}`,
    );
    expect(SANCTUARY_EXPERIMENTAL_PROFILE).toEqual({
      id: 'guardian.sanctuary-only.experimental',
      version: '1.0.0',
    });
  },
);

it.each(['A1', 'O15', 'A8', 'H8', 'H10'])(
  'allows unrestricted empty/occupied/King center %s',
  (cell) => {
    const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
    const state = sanctuaryGame(rules);
    const result = run(state, rules, sanctuaryCast(cell));
    const region = querySanctuaryRegions(result.state)[0]!;
    expect(region.center).toEqual(at(cell));
    expect(region.visibility).toBe('public');
    expect(result.state.board).toEqual(state.board);
    expect(sanctuaryCells(region.center)).toHaveLength(
      cell === 'A1' || cell === 'O15' ? 4 : cell === 'A8' ? 6 : 9,
    );
  },
);

it.each([
  undefined,
  { kind: 'piece-target-v1', pieceId: 'victim' },
  { kind: 'cell-target-v1', cell: { file: -1, rankIndex: 0 } },
  { kind: 'cell-target-v1', cell: { file: 15, rankIndex: 0 } },
  { kind: 'cell-target-v1', cell: { file: 1.5, rankIndex: 0 } },
  { kind: 'cell-target-v1', cell: { file: 1, rankIndex: 0, source: 'white' } },
  { kind: 'cell-target-v1', cell: at('H8'), duration: 99 },
  { kind: 'cell-target-v2', cell: at('H8') },
])('rejects malformed or wrong center intent without mutating the input (%j)', (intent) => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const state = sanctuaryGame(rules),
    before = encodeSnapshot(state, rules.effectRegistry);
  const result = resolveCommand(
    state,
    {
      authority: { kind: 'player', side: 'white' },
      command: { kind: 'skill', skillId: 'guardian.sanctuary', intent },
    },
    rules,
  );
  expect(result.ok).toBe(false);
  expect(result.events).toEqual([]);
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
});

it.each(['cost', 'source', 'regionId', 'operations', 'events', 'effects'])(
  'rejects fabricated client %s',
  (field) => {
    const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
    const state = sanctuaryGame(rules);
    expect(
      resolveCommand(
        state,
        {
          authority: { kind: 'player', side: 'white' },
          command: { ...sanctuaryCast(), [field]: 0 },
        },
        rules,
      ),
    ).toEqual({ ok: false, code: 'INVALID_COMMAND', events: [] });
  },
);

it.each([
  'guardian.holy_shield',
  'guardian.holy_aura',
  'guardian.divine_shield',
  'dragon_sentinel.shockwave',
])('never enables sibling/mixed %s commands', (skillId) => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  expect(
    resolveCommand(
      sanctuaryGame(rules),
      { authority: { kind: 'player', side: 'white' }, command: { ...sanctuaryCast(), skillId } },
      rules,
    ),
  ).toEqual({ ok: false, code: 'NOT_AVAILABLE', events: [] });
});

it.each([
  createHolyShieldExperimentalRuleset,
  createLiveChargeExperimentalRuleset,
  createJudgmentChainsExperimentalRuleset,
  createHolySealExperimentalRuleset,
  createShockwaveExperimentalRuleset,
])('old factory rejects new cell intent at its original engine boundary', (factory) => {
  const rules = factory({ white: true, black: true });
  expect(
    resolveCommand(
      sanctuaryGame(rules),
      { authority: { kind: 'player', side: 'white' }, command: sanctuaryCast() },
      rules,
    ),
  ).toEqual({ ok: false, code: 'INVALID_COMMAND', events: [] });
});

it('rejects unselected/wrong actor/AP4, repeated skill and premature End atomically', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: false });
  const initial = sanctuaryGame(rules, 4);
  expect(
    resolveCommand(
      initial,
      { authority: { kind: 'player', side: 'white' }, command: sanctuaryCast() },
      rules,
    ),
  ).toEqual({ ok: false, code: 'INSUFFICIENT_AP', events: [] });
  expect(
    resolveCommand(
      initial,
      { authority: { kind: 'player', side: 'black' }, command: sanctuaryCast() },
      rules,
    ),
  ).toEqual({ ok: false, code: 'WRONG_TURN', events: [] });
  const cast = run(sanctuaryGame(rules), rules, sanctuaryCast()).state;
  expect(
    resolveCommand(
      cast,
      { authority: { kind: 'player', side: 'white' }, command: sanctuaryCast() },
      rules,
    ),
  ).toEqual({ ok: false, code: 'SKILL_USED', events: [] });
  expect(
    resolveCommand(
      cast,
      { authority: { kind: 'player', side: 'white' }, command: { kind: 'end' } },
      rules,
    ),
  ).toEqual({ ok: false, code: 'MAIN_MOVE_REQUIRED', events: [] });
  const black = finishSanctuaryTurn(cast, rules);
  expect(
    resolveCommand(
      black,
      { authority: { kind: 'player', side: 'black' }, command: sanctuaryCast() },
      rules,
    ),
  ).toEqual({ ok: false, code: 'UNAUTHORIZED_VARIANT', events: [] });
});

it('after-main cast keeps a fullN3 deadline without ticking its own end boundary', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const main = run(sanctuaryGame(rules), rules, {
    kind: 'move',
    pieceId: 'wk' as never,
    to: at('B1'),
  }).state;
  const cast = run(main, rules, sanctuaryCast());
  expect(cast.state.turn.sideToAct).toBe('black');
  expect(querySanctuaryRegions(cast.state)[0]!.deadline).toEqual({
    side: 'white',
    boundary: 'end',
    ordinal: 4,
  });
});

it('recast replaces only its source with a new deterministic ID/center/resetN3 while opposing regions overlap', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = run(sanctuaryGame(rules), rules, sanctuaryCast()).state;
  const first = querySanctuaryRegions(state)[0]!;
  state = finishSanctuaryTurn(state, rules);
  state = run(state, rules, sanctuaryCast()).state;
  const black = querySanctuaryRegions(state)[1]!;
  expect(black.center).toEqual(first.center);
  state = finishSanctuaryTurn(state, rules);
  const replacement = run(state, rules, sanctuaryCast('O15'));
  const regions = querySanctuaryRegions(replacement.state);
  expect(regions).toHaveLength(2);
  expect(regions[0]!.id).not.toBe(first.id);
  expect(regions[0]!.center).toEqual(at('O15'));
  expect(regions[0]!.source).toEqual(first.source);
  expect(regions[0]!.deadline).toEqual({ side: 'white', boundary: 'end', ordinal: 5 });
  expect(regions[1]).toEqual(black);
  expect(
    replacement.events.filter((e) => e.kind === 'sanctuary_removed').map((e) => e.payload),
  ).toEqual([{ region: first, reason: 'replaced' }]);
  expect(cloneSnapshot(replacement.state, rules)).toEqual(replacement.state);
  expect(decodeSnapshot(encodeSnapshot(replacement.state, rules.effectRegistry), rules)).toEqual(
    replacement.state,
  );
});

it('repeated recasts never accumulate stale regions or duplicate registration', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: false });
  let state = sanctuaryGame(rules);
  const ids = new Set<string>();
  for (const center of ['H8', 'A1', 'O15']) {
    state = run(state, rules, sanctuaryCast(center)).state;
    const regions = querySanctuaryRegions(state);
    expect(regions).toHaveLength(1);
    expect(regions[0]!.center).toEqual(at(center));
    expect(ids.has(regions[0]!.id)).toBe(false);
    ids.add(regions[0]!.id);
    state = finishSanctuaryTurn(finishSanctuaryTurn(state, rules), rules);
  }
  expect(state.variantState.black).toEqual({});
});

it.each(['format', 'definitionVersion', 'visibility', 'id', 'source', 'center', 'deadline'])(
  'strict region codec rejects forged %s',
  (field) => {
    const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
    const state = run(sanctuaryGame(rules), rules, sanctuaryCast()).state;
    const raw = JSON.parse(encodeSnapshot(state, rules.effectRegistry));
    raw.variantState.white['guardian.sanctuary'][field] = 'forged';
    expect(() => decodeSnapshot(JSON.stringify(raw), rules)).toThrow();
  },
);

it('region does not follow a moving piece or enter its piece-effect swap/attachment state', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const initial = sanctuaryGame(rules, 20, [
    unit('victim', 'rook', 'H8'),
    unit('wk', 'king', 'A1'),
    unit('bk', 'king', 'O15', 'black'),
  ]);
  const cast = run(initial, rules, sanctuaryCast()).state;
  const moved = run(cast, rules, { kind: 'move', pieceId: 'victim' as never, to: at('L8') }).state;
  expect(querySanctuaryRegions(moved)[0]!.center).toEqual(at('H8'));
  expect(moved.effects).toEqual([]);
});

it('independent root rejects a trusted planner returning duplicate region operations, rolling back debit/slot/IDs', () => {
  const base = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const skill = base.skills!['guardian.sanctuary']!;
  if (!('plan' in skill)) throw Error('FIXTURE');
  const rules = {
    ...base,
    skills: {
      'guardian.sanctuary': {
        ...skill,
        plan: (context: Parameters<typeof skill.plan>[0]) => {
          const plan = skill.plan(context);
          return { ...plan, operations: [...plan.operations, ...plan.operations] };
        },
      },
    },
  };
  const state = sanctuaryGame(rules),
    before = encodeSnapshot(state, rules.effectRegistry);
  expect(
    resolveCommand(
      state,
      { authority: { kind: 'player', side: 'white' }, command: sanctuaryCast() },
      rules,
    ),
  ).toEqual({ ok: false, code: 'SANCTUARY_CAST_LIMIT', events: [] });
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
});

it('rejects a forged zero-ordinal region anchor in snapshot restore', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const state = run(sanctuaryGame(rules), rules, sanctuaryCast()).state;
  const raw = JSON.parse(encodeSnapshot(state, rules.effectRegistry));
  raw.variantState.white['guardian.sanctuary'].anchor.ordinal = 0;
  raw.variantState.white['guardian.sanctuary'].deadline.ordinal = 3;
  expect(() => decodeSnapshot(JSON.stringify(raw), rules)).toThrow('INVALID_SANCTUARY_REGION');
});

it('B3-08 region survives cast end and two further source ends, expiring only at source ordinal+3', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = run(sanctuaryGame(rules), rules, sanctuaryCast()).state;
  state = finishSanctuaryTurn(state, rules); // cast White end1
  expect(querySanctuaryRegions(state)).toHaveLength(1);
  for (let end = 2; end <= 3; end++) {
    state = finishSanctuaryTurn(state, rules); // Black boundary never ticks White region
    expect(querySanctuaryRegions(state)).toHaveLength(1);
    state = finishSanctuaryTurn(state, rules);
    expect(querySanctuaryRegions(state)).toHaveLength(1);
  }
  state = finishSanctuaryTurn(state, rules);
  state = finishSanctuaryTurn(state, rules); // White end4
  expect(querySanctuaryRegions(state)).toEqual([]);
});

it('selected White casts the real AP5 cell-target producer with occupied center and pinned regionN3', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: false });
  const initial = sanctuaryGame(rules, 5);
  const result = resolveCommand(
    initial,
    { authority: { kind: 'player', side: 'white' }, command: sanctuaryCast() },
    rules,
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error(result.code);
  expect(result.state.ap.white).toBe(0);
  expect(result.state.turn).toMatchObject({ mainMoveUsed: false, skillUsed: true });
  expect(result.state.engineVersion).toBe('0.7.0');
  expect(querySanctuaryRegions(result.state)).toEqual([
    {
      format: 'sanctuary-region-v1',
      definitionId: 'region.guardian.sanctuary',
      definitionVersion: '1.0.0',
      id: 'sanctuary:operation:2',
      visibility: 'public',
      center: { file: 7, rankIndex: 7 },
      source: {
        sourcePlayer: 'white',
        sourceVariant: 'guardian',
        sourceSkill: 'guardian.sanctuary',
        sourcePiece: null,
        sourceIncarnation: null,
      },
      anchor: { side: 'white', boundary: 'end', ordinal: 1 },
      deadline: { side: 'white', boundary: 'end', ordinal: 4 },
    },
  ]);
  expect(result.state.board).toEqual(initial.board);
  expect(initial.variantState).toEqual({ white: {}, black: {} });
});
