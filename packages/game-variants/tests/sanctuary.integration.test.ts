import { expect, it } from 'vitest';
import {
  coordinateFromAlgebraic as at,
  decodeEffectRecords,
  queryLegalMainActions,
  queryCaptureThreats,
  repetitionKey,
  querySanctuaryRegions,
  resolveCommand,
  encodeSnapshot,
} from '@variant-chess/game-core';
import type { RulesetBundle } from '@variant-chess/game-core';
import { createSanctuaryExperimentalRuleset } from '../src/index.js';
import {
  sanctuaryGame,
  sanctuaryCast,
  run,
  finishSanctuaryTurn,
  unit,
  sanctuaryComposition,
  testAttachment,
} from './sanctuary.fixture.js';

it('TriggerA uses committed victim cell/controller, stuns a living ordinary attacker arriving from outside', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = run(sanctuaryGame(rules), rules, sanctuaryCast()).state;
  state = finishSanctuaryTurn(state, rules);
  const capture = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') });
  const effects = decodeEffectRecords(capture.state.effects, rules.effectRegistry!, capture.state);
  expect(effects).toHaveLength(1);
  expect(effects[0]).toMatchObject({
    definitionId: 'effect.stun',
    payload: {},
    target: { kind: 'piece', pieceId: 'attacker' },
    sourcePlayer: 'white',
    sourceVariant: 'guardian',
    sourceSkill: 'guardian.sanctuary',
    sourcePiece: null,
    sourceIncarnation: null,
    deadline: { side: 'white', boundary: 'end', ordinal: 2 },
    duration: { producerId: 'guardian.sanctuary.stun', producerVersion: '1.0.0', rounds: 1 },
  });
  const fact = capture.events.find((e) => e.kind === 'sanctuary_reacted');
  expect(fact?.payload).toMatchObject({
    outcome: 'stun-applied',
    source: { sourcePlayer: 'white' },
    capture: {
      kind: 'ordinary-committed-capture-v1',
      attackerId: 'attacker',
      capturingPlayer: 'black',
      victimId: 'victim',
      victimController: 'white',
      destination: at('H8'),
      terminal: { status: 'ongoing' },
    },
  });
  if (fact?.kind !== 'sanctuary_reacted') throw Error('MISSING_REACTION_FACT');
  const committed = capture.events.find((e) => e.kind === 'capture_committed')!;
  expect(fact.payload.capture.eventId).toBe(committed.id);
  expect(fact.payload.capture.operationId).toBe(committed.causeId);
  expect(fact.payload.capture.causeId).toBe(committed.transactionId);
  expect(queryLegalMainActions(capture.state, rules).some((m) => m.pieceId === 'attacker')).toBe(
    false,
  );
  expect(
    queryCaptureThreats(capture.state, 'black', rules).some((m) => m.pieceId === 'attacker'),
  ).toBe(false);
  expect(state.board.pieces.victim).toBeDefined();
});

it.each(['special', 'summoned', undefined] as const)(
  'ineligible attacker provenance %s commits capture but receives no Stun',
  (origin) => {
    const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
    const attacker = { ...unit('attacker', 'rook', 'H10', 'black') };
    if (origin) attacker.origin = origin;
    else delete attacker.origin;
    let state = sanctuaryGame(rules, 20, [
      unit('victim', 'pawn', 'H8'),
      attacker,
      unit('wk', 'king', 'A1'),
      unit('bk', 'king', 'O15', 'black'),
    ]);
    state = finishSanctuaryTurn(run(state, rules, sanctuaryCast()).state, rules);
    const result = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') });
    expect(result.state.effects).toEqual([]);
    expect(result.state.board.pieces.victim).toBeUndefined();
    expect(result.events.find((e) => e.kind === 'sanctuary_reacted')?.payload.outcome).toBe(
      'attacker-unavailable',
    );
  },
);

it.each(['special', 'summoned', undefined] as const)(
  'victim provenance %s does not invent a victim-origin restriction in TriggerA',
  (origin) => {
    const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
    const victim = { ...unit('victim', 'pawn', 'H8') };
    if (origin) victim.origin = origin;
    else delete victim.origin;
    let state = sanctuaryGame(rules, 20, [
      victim,
      unit('attacker', 'rook', 'H10', 'black'),
      unit('wk', 'king', 'A1'),
      unit('bk', 'king', 'O15', 'black'),
    ]);
    state = finishSanctuaryTurn(run(state, rules, sanctuaryCast()).state, rules);
    expect(
      run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') }).state.effects,
    ).toHaveLength(1);
  },
);

it('King attacker remains exempt from Sanctuary-generated Stun without introducing global immunity', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = sanctuaryGame(rules, 20, [
    unit('victim', 'pawn', 'H8'),
    unit('attacker', 'king', 'H9', 'black'),
    unit('wk', 'king', 'A1'),
  ]);
  state = finishSanctuaryTurn(run(state, rules, sanctuaryCast()).state, rules);
  const result = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') });
  expect(result.state.effects).toEqual([]);
  expect(result.state.terminal.status).toBe('ongoing');
});

it('victim controller immediately before capture is authoritative despite opposite ownership; attacker owner is irrelevant', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = sanctuaryGame(rules, 20, [
    unit('victim', 'pawn', 'H8', 'white', 'black'),
    unit('attacker', 'rook', 'H10', 'black', 'white'),
    unit('wk', 'king', 'A1'),
    unit('bk', 'king', 'O15', 'black'),
  ]);
  state = finishSanctuaryTurn(run(state, rules, sanctuaryCast()).state, rules);
  const result = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') });
  expect(result.state.effects).toHaveLength(1);
  expect(result.events.find((e) => e.kind === 'sanctuary_reacted')?.payload.capture).toMatchObject({
    capturingPlayer: 'black',
    victimController: 'white',
  });
  expect(result.state.ap).toEqual({ white: 15, black: 23 });
});

it.each(['outside-destination', 'source-captures-opponent'] as const)(
  'does not trigger for %s',
  (scenario) => {
    const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
    const sourceCaptures = scenario === 'source-captures-opponent';
    let state = sanctuaryGame(rules, 20, [
      unit(
        'victim',
        'pawn',
        sourceCaptures ? 'H8' : 'H11',
        sourceCaptures ? 'black' : 'white',
        'white',
      ),
      unit('attacker', 'rook', 'H10', sourceCaptures ? 'white' : 'black'),
      unit('wk', 'king', 'A1'),
      unit('bk', 'king', 'O15', 'black'),
    ]);
    state = run(state, rules, sanctuaryCast()).state;
    if (!sourceCaptures) state = finishSanctuaryTurn(state, rules);
    const result = run(state, rules, {
      kind: 'move',
      pieceId: 'attacker' as never,
      to: at(sourceCaptures ? 'H8' : 'H11'),
    });
    expect(result.events.some((e) => e.kind === 'sanctuary_reacted')).toBe(false);
    expect(result.state.effects).toEqual([]);
  },
);

it.each(['white', 'black'] as const)(
  'two overlapping opposite sources can produce at most one reaction to %s capture',
  (capturing) => {
    const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
    const source = capturing === 'white' ? 'black' : 'white';
    let state = sanctuaryGame(rules, 20, [
      unit('victim', 'pawn', 'H8', source),
      unit('attacker', 'rook', 'H10', capturing),
      unit('wk', 'king', 'A1'),
      unit('bk', 'king', 'O15', 'black'),
    ]);
    state = finishSanctuaryTurn(run(state, rules, sanctuaryCast()).state, rules);
    state = finishSanctuaryTurn(run(state, rules, sanctuaryCast()).state, rules);
    if (capturing === 'black') state = finishSanctuaryTurn(state, rules);
    expect(querySanctuaryRegions(state)).toHaveLength(2);
    const result = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') });
    const facts = result.events.filter((e) => e.kind === 'sanctuary_reacted');
    expect(facts).toHaveLength(1);
    expect(facts[0]!.payload.source.sourcePlayer).toBe(source);
    expect(facts[0]!.payload.capture.regions).toHaveLength(1);
    expect(result.state.effects).toHaveLength(1);
  },
);

function composedReady(rules: RulesetBundle, pieces?: Parameters<typeof sanctuaryGame>[2]) {
  let state = run(sanctuaryGame(rules, 20, pieces), rules, {
    kind: 'skill',
    skillId: 'test-only.attach',
  }).state;
  state = finishSanctuaryTurn(finishSanctuaryTurn(state, rules), rules);
  return finishSanctuaryTurn(run(state, rules, sanctuaryCast()).state, rules);
}

it('Shield defense rejects capture atomically: no death/AP/slot/IDs/Stun or region reaction', () => {
  const rules = sanctuaryComposition([testAttachment('shield', 'victim', 'white')]);
  const state = composedReady(rules),
    before = encodeSnapshot(state, rules.effectRegistry);
  const result = resolveCommand(
    state,
    {
      authority: { kind: 'player', side: 'black' },
      command: { kind: 'move', pieceId: 'attacker', to: at('H8') },
    },
    rules,
  );
  expect(result).toEqual({ ok: false, code: 'CAPTURE_DEFENDED', events: [] });
  expect(encodeSnapshot(state, rules.effectRegistry)).toBe(before);
});

it('ordinary capture triggers once while Bomb expansions preserve original-source FIFO and destruction never re-triggers', () => {
  const rules = sanctuaryComposition([
    testAttachment('bomb', 'victim', 'black'),
    testAttachment('bomb', 'nearby', 'white'),
  ]);
  const state = composedReady(rules, [
    unit('victim', 'pawn', 'H8'),
    unit('nearby', 'pawn', 'I8'),
    unit('attacker', 'rook', 'H10', 'black'),
    unit('wk', 'king', 'A1'),
    unit('bk', 'king', 'O15', 'black'),
  ]);
  const result = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') });
  const blasts = result.events.filter((e) => e.kind === 'bomb_exploded');
  expect(blasts.map((e) => e.payload.center)).toEqual([at('H8'), at('I8')]);
  expect(blasts.map((e) => e.payload.source.sourcePlayer)).toEqual(['black', 'white']);
  expect(result.events.filter((e) => e.kind === 'sanctuary_reacted')).toHaveLength(1);
  expect(result.events.filter((e) => e.kind === 'capture_committed')).toHaveLength(1);
  expect(result.events.filter((e) => e.kind === 'piece_destroyed')).toHaveLength(2);
  expect(result.state.effects).toEqual([]);
  expect(result.state.board.pieces.attacker).toBeUndefined();
  expect(result.state.ap).toEqual({ white: 17, black: 25 }); // two Pawn losses + Rook owner loss; capturePawn only2
  const kinds = result.events.map((e) => e.kind);
  expect(kinds.indexOf('bomb_exploded')).toBeLessThan(kinds.indexOf('sanctuary_reacted'));
  expect(kinds.indexOf('sanctuary_reacted')).toBeLessThan(kinds.indexOf('piece_destroyed'));
});

it('Bomb-bearing capturer keeps its original attachment; later destruction never becomes a capture trigger', () => {
  const rules = sanctuaryComposition([testAttachment('bomb', 'attacker', 'white')]);
  const state = composedReady(rules),
    bomb = state.effects[0]!;
  const capture = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') });
  expect(capture.state.effects.find((e) => e.id === bomb.id)).toEqual(bomb);
  expect(capture.events.some((e) => e.kind === 'bomb_exploded')).toBe(false);
  const death = resolveCommand(
    capture.state,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'attacker' } },
    rules,
  );
  expect(death.ok).toBe(true);
  if (!death.ok) throw Error(death.code);
  expect(death.events.some((e) => e.kind === 'sanctuary_reacted')).toBe(false);
  expect(death.events.find((e) => e.kind === 'bomb_exploded')?.payload).toMatchObject({
    center: at('H8'),
    source: { sourcePlayer: 'white' },
  });
});

it('earlier queued committed work may retire attacker; mandatory reaction records an explicit skip without effects on dead pieces', () => {
  const base = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const rules: RulesetBundle = {
    ...base,
    handlers: [
      {
        id: 'trusted-test-only.prior-death',
        order: 1,
        react: (e) =>
          e.kind === 'capture_committed'
            ? [{ kind: 'destroy', pieceId: e.payload.attackerId }]
            : [],
      },
    ],
  };
  const state = finishSanctuaryTurn(run(sanctuaryGame(rules), rules, sanctuaryCast()).state, rules);
  const result = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') });
  expect(result.state.board.pieces.attacker).toBeUndefined();
  expect(result.state.effects).toEqual([]);
  expect(result.events.find((e) => e.kind === 'sanctuary_reacted')?.payload.outcome).toBe(
    'attacker-unavailable',
  );
});

it('recast and changed center retain the already-generated independent Stun record exactly', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = finishSanctuaryTurn(run(sanctuaryGame(rules), rules, sanctuaryCast()).state, rules);
  state = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') }).state;
  state = finishSanctuaryTurn(state, rules);
  const existing = state.effects;
  const recast = run(state, rules, sanctuaryCast('O15'));
  expect(recast.state.effects).toEqual(existing);
  expect(querySanctuaryRegions(recast.state)[0]!.center).toEqual(at('O15'));
  expect(recast.events.some((e) => e.kind === 'effect_removed')).toBe(false);
});

it('the old center stops triggering after replacement and direct destruction never triggers', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = run(sanctuaryGame(rules), rules, sanctuaryCast()).state;
  state = finishSanctuaryTurn(finishSanctuaryTurn(state, rules), rules);
  state = finishSanctuaryTurn(run(state, rules, sanctuaryCast('O15')).state, rules);
  const capture = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') });
  expect(capture.state.effects).toEqual([]);
  expect(capture.events.some((e) => e.kind === 'sanctuary_reacted')).toBe(false);
  const protectedState = finishSanctuaryTurn(
    run(sanctuaryGame(rules), rules, sanctuaryCast()).state,
    rules,
  );
  const destroy = resolveCommand(
    protectedState,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId: 'victim' } },
    rules,
  );
  expect(destroy.ok).toBe(true);
  expect(destroy.events.some((e) => e.kind === 'sanctuary_reacted')).toBe(false);
});

it('two real opposing captures create independent cross-source Stuns with separate source-end expiry', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = sanctuaryGame(rules, 20, [
    unit('white-victim', 'pawn', 'H8'),
    unit('black-victim', 'pawn', 'I8', 'black'),
    unit('black-attacker', 'rook', 'H10', 'black'),
    unit('white-attacker', 'rook', 'I10'),
    unit('wk', 'king', 'A1'),
    unit('bk', 'king', 'O15', 'black'),
  ]);
  state = finishSanctuaryTurn(run(state, rules, sanctuaryCast()).state, rules);
  state = run(state, rules, sanctuaryCast()).state;
  state = run(state, rules, {
    kind: 'move',
    pieceId: 'black-attacker' as never,
    to: at('H8'),
  }).state;
  state = run(state, rules, {
    kind: 'move',
    pieceId: 'white-attacker' as never,
    to: at('I8'),
  }).state;
  expect(state.effects.map((e) => e.source).sort()).toEqual(['black', 'white']);
  state = finishSanctuaryTurn(state, rules);
  expect(state.effects.map((e) => e.source)).toEqual(['black']);
  state = finishSanctuaryTurn(state, rules);
  expect(state.effects).toEqual([]);
});

it('unsupported capture priority combinations fail closed instead of bypassing Sanctuary', () => {
  const base = createSanctuaryExperimentalRuleset({ white: true, black: true });
  const rules: RulesetBundle = {
    ...base,
    interceptors: [{ id: 'test-only-unapproved', order: 1, intercept: () => ({ kind: 'allow' }) }],
  };
  const state = finishSanctuaryTurn(run(sanctuaryGame(rules), rules, sanctuaryCast()).state, rules);
  expect(
    resolveCommand(
      state,
      {
        authority: { kind: 'player', side: 'black' },
        command: { kind: 'move', pieceId: 'attacker', to: at('H8') },
      },
      rules,
    ),
  ).toEqual({ ok: false, code: 'UNSUPPORTED_SANCTUARY_INTERACTION', events: [] });
});

it.each(['hidden-trap', 'portal', 'terrain', 'forced-entry'])(
  'declared mandatory %s consumer fails closed at relevant committed-capture attempt',
  (consumer) => {
    const base = createSanctuaryExperimentalRuleset({ white: true, black: true });
    const rules: RulesetBundle = { ...base, mandatoryEntryConsumers: [consumer] };
    const state = finishSanctuaryTurn(
      run(sanctuaryGame(rules), rules, sanctuaryCast()).state,
      rules,
    );
    expect(
      resolveCommand(
        state,
        {
          authority: { kind: 'player', side: 'black' },
          command: { kind: 'move', pieceId: 'attacker', to: at('H8') },
        },
        rules,
      ),
    ).toEqual({ ok: false, code: 'UNSUPPORTED_SANCTUARY_INTERACTION', events: [] });
  },
);

it.each([
  ['A1', 'B2', 'B4'],
  ['O15', 'N14', 'N12'],
] as const)('clipped %s Sanctuary reacts at its included boundary %s', (center, victim, from) => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = sanctuaryGame(rules, 20, [
    unit('victim', 'pawn', victim),
    unit('attacker', 'rook', from, 'black'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ]);
  state = finishSanctuaryTurn(run(state, rules, sanctuaryCast(center)).state, rules);
  const result = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at(victim) });
  expect(result.state.effects).toHaveLength(1);
});

it('ordinary friendly capture remains invalid despite protection/owner facts', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = sanctuaryGame(rules, 20, [
    unit('victim', 'pawn', 'H8', 'black', 'white'),
    unit('attacker', 'rook', 'H10', 'black'),
    unit('wk', 'king', 'A1'),
    unit('bk', 'king', 'O15', 'black'),
  ]);
  state = finishSanctuaryTurn(run(state, rules, sanctuaryCast()).state, rules);
  expect(
    resolveCommand(
      state,
      {
        authority: { kind: 'player', side: 'black' },
        command: { kind: 'move', pieceId: 'attacker', to: at('H8') },
      },
      rules,
    ),
  ).toEqual({ ok: false, code: 'INVALID_MOVE', events: [] });
});

it('King terminal removes a capturer Bomb without explosion or any Sanctuary reaction', () => {
  const rules = sanctuaryComposition([testAttachment('bomb', 'attacker', 'white')]);
  let state = sanctuaryGame(rules, 20, [
    unit('wk', 'king', 'H8'),
    unit('main', 'rook', 'A1'),
    unit('attacker', 'rook', 'H10', 'black'),
    unit('bk', 'king', 'O15', 'black'),
  ]);
  state = run(state, rules, { kind: 'skill', skillId: 'test-only.attach' }).state;
  state = run(state, rules, { kind: 'move', pieceId: 'main' as never, to: at('A2') }).state;
  state = finishSanctuaryTurn(state, rules);
  state = run(state, rules, sanctuaryCast()).state;
  state = run(state, rules, { kind: 'move', pieceId: 'main' as never, to: at('A3') }).state;
  const result = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') });
  expect(result.state.terminal.status).toBe('won');
  expect(result.state.effects).toEqual([]);
  expect(
    result.events.some((e) => e.kind === 'bomb_exploded' || e.kind === 'sanctuary_reacted'),
  ).toBe(false);
});

it('region and late generated Stun expire independently at the same source boundary without parent cleanup', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = finishSanctuaryTurn(run(sanctuaryGame(rules), rules, sanctuaryCast()).state, rules);
  for (let n = 0; n < 4; n++) state = finishSanctuaryTurn(state, rules); // Black1, White2, Black2, White3
  state = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') }).state;
  state = finishSanctuaryTurn(state, rules); // Black3 end, White4 starts
  const effect = decodeEffectRecords(state.effects, rules.effectRegistry!, state)[0]!;
  expect(effect.groupId).toBe(null);
  expect(effect.references ?? []).toEqual([]);
  expect(effect.deadline).toEqual(querySanctuaryRegions(state)[0]!.deadline);
  const main = queryLegalMainActions(state, rules).find(
    (m) => state.board.pieces[m.pieceId]!.currentType === 'king' && m.kind !== 'capture',
  )!;
  state = run(state, rules, { kind: 'move', pieceId: main.pieceId, to: main.to }).state;
  const end = run(state, rules, { kind: 'end' });
  expect(end.state.effects).toEqual([]);
  expect(querySanctuaryRegions(end.state)).toEqual([]);
  expect(
    end.events.filter((e) => e.kind === 'effect_removed').map((e) => e.payload.reason),
  ).toEqual(['expired']);
  expect(
    end.events.filter((e) => e.kind === 'sanctuary_removed').map((e) => e.payload.reason),
  ).toEqual(['expired']);
});

it('existing exact-source Stun contract refreshes a stable ID and cross-source records coexist on one bearer', () => {
  // TRUSTED_TEST_ONLY effect transport exercises matching, not a fabricated ordinary capture.
  const base = sanctuaryComposition([testAttachment('stun', 'attacker', 'white')]);
  const rules: RulesetBundle = {
    ...base,
    skills: {
      ...base.skills,
      'test-only.black-source': {
        cost: 0,
        operations: [testAttachment('stun', 'attacker', 'black')],
      },
    },
  };
  let state = finishSanctuaryTurn(run(sanctuaryGame(rules), rules, sanctuaryCast()).state, rules);
  state = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') }).state;
  const original = decodeEffectRecords(state.effects, rules.effectRegistry!, state)[0]!;
  const refreshed = run(state, rules, { kind: 'skill', skillId: 'test-only.attach' });
  const kept = decodeEffectRecords(
    refreshed.state.effects,
    rules.effectRegistry!,
    refreshed.state,
  )[0]!;
  expect(kept.id).toBe(original.id);
  expect(kept.appliedSequence).toBe(original.appliedSequence);
  expect(refreshed.events.filter((e) => e.kind === 'effect_refreshed')).toHaveLength(1);
  state = run(refreshed.state, rules, { kind: 'skill', skillId: 'test-only.black-source' }).state;
  expect(state.effects).toHaveLength(2);
  state = finishSanctuaryTurn(state, rules);
  expect(state.effects.map((e) => e.source)).toEqual(['black']);
  state = finishSanctuaryTurn(state, rules);
  expect(state.effects).toEqual([]);
});

it.each([
  'cleansed',
  'dispelled',
  'replaced',
  'consumed',
  'source_invalidated',
  'link_broken',
] as const)('generated Stun does not gain unauthorized %s removal', (reason) => {
  const base = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = finishSanctuaryTurn(run(sanctuaryGame(base), base, sanctuaryCast()).state, base);
  state = run(state, base, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') }).state;
  const rules: RulesetBundle = {
    ...base,
    skills: {
      ...base.skills,
      'test-only.remove': {
        cost: 0,
        operations: [{ kind: 'effect_remove', instanceId: state.effects[0]!.id, reason }],
      },
    },
  };
  expect(
    resolveCommand(
      state,
      {
        authority: { kind: 'player', side: 'black' },
        command: { kind: 'skill', skillId: 'test-only.remove' },
      },
      rules,
    ),
  ).toEqual({ ok: false, code: 'EFFECT_REMOVAL_FORBIDDEN', events: [] });
});

it('B3 terminal draw cleans the public region and generated Stun without dispatching further reactions', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = run(sanctuaryGame(rules), rules, sanctuaryCast()).state;
  state = finishSanctuaryTurn(state, rules);
  state = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') }).state;
  const next = run(state, rules, { kind: 'end' }).state;
  // TRUSTED_TEST_ONLY prior repetition history; real producer/committed capture generated all live records.
  const key = repetitionKey(next, rules.repetition);
  const prior = {
    ...state,
    history: { ...state.history, repetition: { ...state.history.repetition, [key]: 2 } },
  };
  const draw = run(prior, rules, { kind: 'end' });
  expect(draw.state.terminal).toEqual({ status: 'draw', reason: 'threefold_repetition' });
  expect(querySanctuaryRegions(draw.state)).toEqual([]);
  expect(draw.state.effects).toEqual([]);
  expect(
    draw.events.filter((e) => e.kind === 'effect_removed').map((e) => e.payload.reason),
  ).toEqual(['match_terminal']);
  expect(draw.events.at(-1)?.kind).toBe('terminal_reached');
});

it('B3-07 committed King capture terminates before reactions and cleans the region after committed facts', () => {
  const rules = createSanctuaryExperimentalRuleset({ white: true, black: true });
  let state = sanctuaryGame(rules, 20, [
    unit('wk', 'king', 'H8'),
    unit('main', 'rook', 'A1'),
    unit('attacker', 'rook', 'H10', 'black'),
    unit('bk', 'king', 'O15', 'black'),
  ]);
  state = run(state, rules, sanctuaryCast()).state;
  state = run(state, rules, { kind: 'move', pieceId: 'main' as never, to: at('A2') }).state;
  const result = run(state, rules, { kind: 'move', pieceId: 'attacker' as never, to: at('H8') });
  expect(result.state.terminal).toEqual({
    status: 'won',
    reason: 'king_captured',
    winner: 'black',
  });
  expect(result.state.effects).toEqual([]);
  expect(result.events.map((e) => e.kind)).toEqual([
    'move_committed',
    'capture_committed',
    'sanctuary_removed',
    'terminal_reached',
  ]);
  expect(result.state.ap).toEqual(state.ap);
});
