import { expect, it } from 'vitest';
import {
  createEffectRegistry,
  createGame,
  validateEffectInstance,
  validateEffectInstances,
  validateEffectPayload,
  encodeEffectRecords,
  decodeEffectRecords,
  encodeSnapshot,
  decodeSnapshot,
  cloneSnapshot,
  resolveCommand,
  allocateGameId,
} from '../src/index.js';
import type { EffectDefinition } from '../src/index.js';

// Synthetic contracts only: EFFECT_SYSTEM_SPEC §1/3/4, P00-02/03/05/11.
const definition = (typeId = 'future.resonance') =>
  ({
    typeId,
    schemaVersion: '1.0.0',
    targets: ['piece'] as const,
    category: 'neutral' as const,
    sourceAttribution: { kind: 'preserve-source' as const, requiredRefs: ['skill'] as const },
    ownership: { kind: 'source-player' as const },
    kingEligibility: { kind: 'allowed' as const },
    lifetime: { kind: 'permanent' as const },
    stacking: { key: 'type-source-target' as const, mode: 'ignore' as const },
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
    relocation: { kind: 'retargetable' as const, constraints: [] as string[] },
    visibility: { kind: 'source-player' as const },
    capabilities: [],
    triggers: [],
    repetition: { projectionId: 'future.resonance.semantic-v1' },
    repetitionProjector: (instance, context) => ({
      payload: instance.payload,
      target: context.target,
      group: context.group,
      remaining: context.remainingLifetime,
      sourcePlayer: instance.sourcePlayer,
    }),
    payloadSchema: {
      parse(value: unknown): { nested: { values: number[] } } {
        if (!value || typeof value !== 'object' || !('nested' in value)) throw new Error('PAYLOAD');
        const nested = value.nested;
        if (
          !nested ||
          typeof nested !== 'object' ||
          !('values' in nested) ||
          !Array.isArray(nested.values) ||
          !nested.values.every((v: unknown) => Number.isSafeInteger(v))
        )
          throw new Error('PAYLOAD');
        return { nested: { values: [...nested.values] as number[] } };
      },
    },
  }) satisfies EffectDefinition;

it('explicitly registers a generic future definition without a core whitelist', () => {
  const registry = createEffectRegistry([definition()]);
  expect(registry.get('future.resonance').typeId).toBe('future.resonance');
  expect(registry.definitions.map((d) => d.typeId)).toEqual(['future.resonance']);
});

it('rejects duplicate and unknown IDs and malformed/incomplete policy contracts', () => {
  expect(() => createEffectRegistry([definition(), definition()])).toThrow(
    'DUPLICATE_EFFECT_DEFINITION',
  );
  expect(() => createEffectRegistry([]).get('missing')).toThrow('UNKNOWN_EFFECT_DEFINITION');
  expect(() => createEffectRegistry([{ ...definition(), schemaVersion: 'latest' }])).toThrow();
  expect(() =>
    createEffectRegistry([{ ...definition(), relocation: undefined } as never]),
  ).toThrow();
  expect(() =>
    createEffectRegistry([
      { ...definition(), stacking: { key: 'type-target', mode: 'refresh' } } as never,
    ]),
  ).toThrow();
  expect(() => createEffectRegistry([{ ...definition(), targets: ['piece', 'piece'] }])).toThrow();
  expect(() => createEffectRegistry([{ ...definition(), payloadSchema: {} } as never])).toThrow(
    'INVALID_PAYLOAD_SCHEMA',
  );
});

it('orders definitions deterministically and isolates frozen policy data between rulesets', () => {
  const input = definition('zeta');
  const left = createEffectRegistry([input, definition('Alpha')]);
  const right = createEffectRegistry([definition('other')]);
  expect(left.definitions.map((d) => d.typeId)).toEqual(['Alpha', 'zeta']);
  expect(
    createEffectRegistry([definition('Alpha'), input]).definitions.map((d) => d.typeId),
  ).toEqual(['Alpha', 'zeta']);
  input.relocation.constraints.push('mutated');
  expect(left.get('zeta').relocation).toEqual({ kind: 'retargetable', constraints: [] });
  expect(() => right.get('zeta')).toThrow('UNKNOWN_EFFECT_DEFINITION');
  expect(Object.isFrozen(left.get('zeta').removal)).toBe(true);
  expect(() => (left.definitions as unknown[]).push(input)).toThrow();
});

const state = () => ({
  ...createGame({ matchId: 'm', seed: 1 }),
  counters: {
    transaction: 0,
    event: 0,
    operation: 2,
    snapshot: 1,
    piece: 0,
  },
});
const instance = () => ({
  id: 'm:operation:1',
  definitionId: 'future.resonance',
  definitionVersion: '1.0.0',
  target: { kind: 'piece', pieceId: 'white-A1' },
  sourcePlayer: 'black',
  sourceVariant: null,
  sourceSkill: 'future.skill',
  sourcePiece: null,
  appliedSequence: 0,
  timingAnchor: { side: 'black', boundary: 'end', ordinal: 0 },
  lifetime: { kind: 'permanent' },
  deadline: null,
  payload: { nested: { values: [3] } },
  groupId: null,
});

it('fails closed on unknown definitions, incompatible versions and invalid payloads', () => {
  const registry = createEffectRegistry([definition()]);
  expect(() =>
    validateEffectInstance({ ...instance(), definitionId: 'missing' }, registry, state()),
  ).toThrow('UNKNOWN_EFFECT_DEFINITION');
  expect(() =>
    validateEffectInstance({ ...instance(), definitionVersion: '2.0.0' }, registry, state()),
  ).toThrow('EFFECT_VERSION_MISMATCH');
  expect(() =>
    validateEffectInstance(
      { ...instance(), payload: { nested: { values: ['bad'] } } },
      registry,
      state(),
    ),
  ).toThrow('PAYLOAD');
  expect(validateEffectPayload(definition(), '1.0.0', { nested: { values: [3] } })).toEqual({
    nested: { values: [3] },
  });
});

it('validates deterministic identity, unique IDs, target and source metadata without mutating a game', () => {
  const registry = createEffectRegistry([definition()]);
  const game = state();
  const before = JSON.stringify(game);
  expect(validateEffectInstance(instance(), registry, game).sourcePlayer).toBe('black');
  for (const patch of [
    { id: 'other:operation:1' },
    { id: 'm:operation:3' },
    { id: 'm:operation:01' },
    { appliedSequence: 1 },
    { sourcePlayer: 'red' },
    { sourceSkill: null },
    { target: { kind: 'piece', pieceId: 'missing' } },
    { target: { kind: 'cell', position: { file: 15, rankIndex: 0 } } },
    { target: { kind: 'player', side: 'white' } },
    { timingAnchor: { side: 'white', boundary: 'end', ordinal: 0 } },
    { deadline: { side: 'black', boundary: 'end', ordinal: 1 } },
    { groupId: 'other:white:pair' },
  ])
    expect(() => validateEffectInstance({ ...instance(), ...patch }, registry, game)).toThrow();
  expect(() => validateEffectInstances([instance(), instance()], registry, game)).toThrow(
    'DUPLICATE_EFFECT_INSTANCE',
  );
  expect(
    validateEffectInstances([instance(), { ...instance(), id: 'm:operation:2' }], registry, game),
  ).toHaveLength(2);
  expect(JSON.stringify(game)).toBe(before);
});

it('validates source-anchored round deadlines without ticking at cast (P00-02)', () => {
  const lifetime = { kind: 'rounds' as const, rounds: 2, boundary: 'start' as const };
  const registry = createEffectRegistry([{ ...definition(), lifetime }]);
  const input = {
    ...instance(),
    lifetime,
    timingAnchor: { side: 'black', boundary: 'start', ordinal: 3 },
    deadline: { side: 'black', boundary: 'start', ordinal: 5 },
  };
  expect(validateEffectInstance(input, registry, state()).deadline).toEqual(input.deadline);
  for (const deadline of [
    null,
    { side: 'white', boundary: 'start', ordinal: 5 },
    { side: 'black', boundary: 'end', ordinal: 5 },
    { side: 'black', boundary: 'start', ordinal: 4 },
  ])
    expect(() => validateEffectInstance({ ...input, deadline }, registry, state())).toThrow(
      'EFFECT_LIFETIME_MISMATCH',
    );
});

it('allocates IDs using the existing root counter and rejects cross-match reuse', () => {
  const game = state();
  const next = allocateGameId(game.matchId, game.counters, 'operation');
  expect(next.id).toBe('m:operation:3');
  const registry = createEffectRegistry([definition()]);
  expect(
    validateEffectInstance({ ...instance(), id: next.id }, registry, {
      ...game,
      counters: next.counters,
    }).id,
  ).toBe(next.id);
  expect(() =>
    validateEffectInstance(instance(), registry, { ...game, matchId: 'other' } as never),
  ).toThrow('EFFECT_ID_MISMATCH');
  expect(game.counters.operation).toBe(2);
});

it('isolates deeply immutable JSON payloads and rejects non-JSON data or schema rewrites', () => {
  const registry = createEffectRegistry([definition()]);
  const raw = instance();
  const parsed = validateEffectInstance(raw, registry, state());
  raw.payload.nested.values[0] = 9;
  expect(parsed.payload).toEqual({ nested: { values: [3] } });
  expect(Object.isFrozen(parsed.payload)).toBe(true);
  expect(() => (parsed.payload as typeof raw.payload).nested.values.push(4)).toThrow();
  const cyclic: Record<string, unknown> = {};
  cyclic['self'] = cyclic;
  for (const payload of [
    undefined,
    new Date(),
    new Map(),
    NaN,
    { fn: () => 1 },
    cyclic,
    { nested: { values: [3] }, extra: true },
    { nested: { values: [3] }, [Symbol('x')]: 1 },
  ])
    expect(() => validateEffectInstance({ ...instance(), payload }, registry, state())).toThrow();
  const mutating = {
    ...definition(),
    payloadSchema: {
      parse(value: unknown) {
        (value as { nested: { values: number[] } }).nested.values.push(4);
        return value as { nested: { values: number[] } };
      },
    },
  };
  expect(() => validateEffectPayload(mutating, '1.0.0', instance().payload)).toThrow();
  expect(instance().payload.nested.values).toEqual([3]);
});

it('round-trips versioned records through the Phase 01B codec without enabling runtime', () => {
  const registry = createEffectRegistry([definition()]);
  const game = state();
  const records = encodeEffectRecords([instance()], registry, game);
  const withEffects = { ...game, effects: records };
  const bundle = { version: game.rulesetVersion, hash: game.rulesetHash, effectRegistry: registry };
  const encoded = encodeSnapshot(withEffects, registry);
  const restored = decodeSnapshot(encoded, bundle);
  expect(decodeEffectRecords(restored.effects, registry, restored)).toEqual([instance()]);
  expect(cloneSnapshot(withEffects, bundle)).toEqual(restored);
  expect(restored.effects[0]?.payload).not.toBe(records[0]?.payload);
  expect(() => encodeSnapshot(withEffects)).toThrow('EFFECT_REGISTRY_REQUIRED');
  expect(() => decodeSnapshot(encoded)).toThrow('EFFECT_REGISTRY_REQUIRED');
  expect(
    resolveCommand(
      restored,
      { authority: { kind: 'player', side: 'white' }, command: { kind: 'end' } },
      bundle,
    ),
  ).toEqual({ ok: false, code: 'UNSUPPORTED_RUNTIME', events: [] });
  const before = JSON.stringify(game);
  expect(() => encodeEffectRecords([{ ...instance(), payload: false }], registry, game)).toThrow();
  expect(JSON.stringify(game)).toBe(before);
});

it('rejects tampered envelopes and versions in snapshots, and never invokes projection or triggers', () => {
  let projections = 0;
  const registry = createEffectRegistry([
    {
      ...definition(),
      repetitionProjector: () => {
        projections++;
        return null;
      },
      triggers: [
        { id: 'react', event: 'future.entry', stage: 'committed', handlerId: 'future.react' },
      ],
    },
  ]);
  const game = state();
  const records = encodeEffectRecords([instance()], registry, game);
  const bundle = { version: game.rulesetVersion, hash: game.rulesetHash, effectRegistry: registry };
  const encoded = encodeSnapshot({ ...game, effects: records }, registry);
  const raw = JSON.parse(encoded) as typeof game;
  raw.effects[0]!.source = 'white';
  expect(() => decodeSnapshot(JSON.stringify(raw), bundle)).toThrow('EFFECT_ENVELOPE_MISMATCH');
  expect(() =>
    decodeSnapshot(
      encoded.replace('"definitionVersion":"1.0.0"', '"definitionVersion":"9.0.0"'),
      bundle,
    ),
  ).toThrow('EFFECT_VERSION_MISMATCH');
  expect(() =>
    decodeSnapshot(encoded, { ...bundle, effectRegistry: createEffectRegistry([]) }),
  ).toThrow('UNKNOWN_EFFECT_DEFINITION');
  expect(projections).toBe(0);
});

it('supports piece/cell/player identities and explicit King eligibility without a global immunity', () => {
  const registry = createEffectRegistry([
    { ...definition(), targets: ['piece', 'cell', 'player'] },
  ]);
  for (const target of [
    { kind: 'piece', pieceId: 'white-H1' },
    { kind: 'cell', position: { file: 14, rankIndex: 14 } },
    { kind: 'player', side: 'white' },
  ])
    expect(validateEffectInstance({ ...instance(), target }, registry, state()).target).toEqual(
      target,
    );
  const denied = createEffectRegistry([{ ...definition(), kingEligibility: { kind: 'denied' } }]);
  expect(() =>
    validateEffectInstance(
      { ...instance(), target: { kind: 'piece', pieceId: 'white-H1' } },
      denied,
      state(),
    ),
  ).toThrow('EFFECT_KING_INELIGIBLE');
});

it('requires explicit source-scoped group references for group policies', () => {
  const registry = createEffectRegistry([
    {
      ...definition(),
      stacking: { key: 'explicit-group', mode: 'ignore' },
      relocation: {
        kind: 'group-aware',
        policyId: 'future.group',
        constraints: ['future.eligibility'],
      },
    },
  ]);
  expect(() => validateEffectInstance(instance(), registry, state())).toThrow(
    'EFFECT_GROUP_REQUIRED',
  );
  expect(
    validateEffectInstance({ ...instance(), groupId: 'm:black:pair' }, registry, state()).groupId,
  ).toBe('m:black:pair');
  expect(() =>
    validateEffectInstance({ ...instance(), groupId: 'm:white:pair' }, registry, state()),
  ).toThrow('EFFECT_GROUP_MISMATCH');
});

it('stores declared policies without choosing unresolved gameplay defaults (D-05/06)', () => {
  const registry = createEffectRegistry([
    {
      ...definition(),
      stacking: {
        key: 'type-target',
        mode: 'refresh',
        payload: 'declared',
        source: 'replace',
        deadline: 'preserve',
        mergePolicyId: 'future.merge',
      },
      removal: {
        ...definition().removal,
        expired: { kind: 'declared-reaction', policyId: 'future.expiry' },
      },
      relocation: { kind: 'prohibited-with-reason', reason: 'future.link-not-approved' },
    },
  ]);
  expect(registry.get('future.resonance').stacking.mode).toBe('refresh');
  expect(() =>
    createEffectRegistry([{ ...definition(), repetitionProjector: undefined } as never]),
  ).toThrow('MISSING_EFFECT_PROJECTION');
  expect(() =>
    createEffectRegistry([
      {
        ...definition(),
        stacking: {
          key: 'type-target',
          mode: 'refresh',
          payload: 'declared',
          source: 'replace',
          deadline: 'preserve',
          mergePolicyId: null,
        },
      },
    ]),
  ).toThrow('MISSING_MERGE_POLICY');
});

it('isolates two matches sharing a registry and ignores changes to original schema references', () => {
  const input = definition();
  const registry = createEffectRegistry([input]);
  input.payloadSchema.parse = () => {
    throw new Error('changed');
  };
  expect(validateEffectInstance(instance(), registry, state()).id).toBe('m:operation:1');
  const other = { ...state(), matchId: 'other' } as never;
  expect(
    validateEffectInstance({ ...instance(), id: 'other:operation:1' }, registry, other).id,
  ).toBe('other:operation:1');
  expect(() => validateEffectInstance(instance(), registry, other)).toThrow('EFFECT_ID_MISMATCH');
});

it('validates current-turn windows and distinct event-count/progress lifetime descriptors', () => {
  const window = { kind: 'current-turn-window' as const, boundary: 'end' as const };
  const registry = createEffectRegistry([{ ...definition(), lifetime: window }]);
  const raw = {
    ...instance(),
    lifetime: window,
    deadline: { side: 'white', boundary: 'end', ordinal: 1 },
  };
  expect(validateEffectInstance(raw, registry, state()).deadline).toEqual(raw.deadline);
  for (const deadline of [
    { side: 'white', boundary: 'end', ordinal: 2 },
    { side: 'black', boundary: 'end', ordinal: 1 },
  ])
    expect(() => validateEffectInstance({ ...raw, deadline }, registry, state())).toThrow(
      'EFFECT_LIFETIME_MISMATCH',
    );
  for (const lifetime of [
    { kind: 'event-count' as const, event: 'future.committed-entry', count: 2 },
    { kind: 'progress' as const, policyId: 'future.progress' },
  ]) {
    const registry = createEffectRegistry([{ ...definition(), lifetime }]);
    expect(
      validateEffectInstance({ ...instance(), lifetime }, registry, state()).deadline,
    ).toBeNull();
  }
});

// Regression hardening of current 02A-1 public validation/codec contracts only.
it('rejects malformed operation identities and duplicate records with different metadata', () => {
  const registry = createEffectRegistry([definition()]);
  const game = state();
  for (const id of [
    'm:operation:0',
    'm:operation:-1',
    'm:operation:1.0',
    'm:operation:1e0',
    'm:operation:9007199254740992',
    'm:event:1',
    'm:operation:',
  ])
    expect(() => validateEffectInstance({ ...instance(), id }, registry, game), id).toThrow(
      'EFFECT_ID_MISMATCH',
    );
  const other = {
    ...instance(),
    target: { kind: 'piece', pieceId: 'black-A15' },
    payload: { nested: { values: [7] } },
  };
  expect(() => encodeEffectRecords([instance(), other], registry, game)).toThrow(
    'DUPLICATE_EFFECT_INSTANCE',
  );
  const records = encodeEffectRecords(
    [instance(), { ...other, id: 'm:operation:2' }],
    registry,
    game,
  );
  expect(decodeEffectRecords(records, registry, game).map((effect) => effect.id)).toEqual([
    'm:operation:1',
    'm:operation:2',
  ]);
  expect(() => decodeEffectRecords([records[0]!, records[0]!], registry, game)).toThrow(
    'DUPLICATE_EFFECT_INSTANCE',
  );
  expect(() =>
    createEffectRegistry([definition(), { ...definition(), schemaVersion: '2.0.0' }]),
  ).toThrow('DUPLICATE_EFFECT_DEFINITION');
});

it('validates source references and exact group namespace prefixes independently of target ownership', () => {
  const registry = createEffectRegistry([
    {
      ...definition(),
      sourceAttribution: {
        kind: 'preserve-source',
        requiredRefs: ['variant', 'skill', 'piece'],
      },
    },
  ]);
  const game = state();
  const raw = {
    ...instance(),
    sourceVariant: 'future.variant',
    sourcePiece: 'retired-piece',
    groupId: 'm:black:pair',
  };
  // A dead source piece is permitted; a white target does not change the black source namespace.
  expect(validateEffectInstance(raw, registry, game).sourcePlayer).toBe('black');
  for (const field of ['sourceVariant', 'sourceSkill', 'sourcePiece'])
    expect(() => validateEffectInstance({ ...raw, [field]: null }, registry, game), field).toThrow(
      'EFFECT_SOURCE_MISSING',
    );
  for (const groupId of ['other:black:pair', 'm:white:pair', 'm:blackish:pair', 'm:black-pair'])
    expect(() => validateEffectInstance({ ...raw, groupId }, registry, game), groupId).toThrow(
      'EFFECT_GROUP_MISMATCH',
    );
  expect(() =>
    validateEffectInstance(
      { ...raw, timingAnchor: { side: 'white', boundary: 'end', ordinal: 0 } },
      registry,
      game,
    ),
  ).toThrow('EFFECT_ANCHOR_MISMATCH');
});

it('rejects invalid lifetime/deadline data under the current supported instance contract', () => {
  const game = state();
  const deadline = { side: 'black', boundary: 'end', ordinal: 1 };
  const untimed: EffectDefinition['lifetime'][] = [
    { kind: 'permanent' },
    { kind: 'event-count', event: 'future.entry', count: 2 },
    { kind: 'progress', policyId: 'future.progress' },
  ];
  for (const lifetime of untimed) {
    const registry = createEffectRegistry([{ ...definition(), lifetime }]);
    expect(validateEffectInstance({ ...instance(), lifetime }, registry, game).deadline).toBeNull();
    expect(() =>
      validateEffectInstance({ ...instance(), lifetime, deadline }, registry, game),
    ).toThrow('EFFECT_LIFETIME_MISMATCH');
  }
  const lifetime = { kind: 'rounds' as const, rounds: 1, boundary: 'start' as const };
  const registry = createEffectRegistry([{ ...definition(), lifetime }]);
  for (const sourcePlayer of ['white', 'black'] as const) {
    const raw = {
      ...instance(),
      lifetime,
      sourcePlayer,
      timingAnchor: { side: sourcePlayer, boundary: 'start', ordinal: 2 },
      deadline: { side: sourcePlayer, boundary: 'start', ordinal: 3 },
    };
    expect(validateEffectInstance(raw, registry, game).deadline).toEqual({
      side: sourcePlayer,
      boundary: 'start',
      ordinal: 3,
    });
    for (const patch of [
      { lifetime: { ...lifetime, rounds: 2 } },
      { timingAnchor: { side: sourcePlayer, boundary: 'end', ordinal: 2 } },
      { timingAnchor: { side: sourcePlayer, boundary: 'start', ordinal: Number.MAX_SAFE_INTEGER } },
    ])
      expect(() => validateEffectInstance({ ...raw, ...patch }, registry, game)).toThrow(
        'EFFECT_LIFETIME_MISMATCH',
      );
  }
  const window = { kind: 'current-turn-window' as const, boundary: 'end' as const };
  const windowRegistry = createEffectRegistry([{ ...definition(), lifetime: window }]);
  const blackTurn = { ...game, turn: { ...game.turn, sideToAct: 'black' as const, plyIndex: 1 } };
  expect(
    validateEffectInstance({ ...instance(), lifetime: window, deadline }, windowRegistry, blackTurn)
      .deadline,
  ).toEqual({ side: 'black', boundary: 'end', ordinal: 1 });
  for (const invalid of [null, { ...deadline, boundary: 'start' }, { ...deadline, ordinal: 0 }])
    expect(() =>
      validateEffectInstance(
        { ...instance(), lifetime: window, deadline: invalid },
        windowRegistry,
        blackTurn,
      ),
    ).toThrow('EFFECT_LIFETIME_MISMATCH');
});

it('rejects snapshot envelope, identity, payload and exact-version tampering without changing the input game', () => {
  const registry = createEffectRegistry([definition()]);
  const game = state();
  const records = encodeEffectRecords([instance()], registry, game);
  const encoded = encodeSnapshot({ ...game, effects: records }, registry);
  const bundle = { version: game.rulesetVersion, hash: game.rulesetHash, effectRegistry: registry };
  type WireRecord = {
    id: string;
    definitionId: string;
    source: string;
    deadline: unknown;
    payload: {
      format: string;
      instance: Omit<ReturnType<typeof instance>, 'groupId' | 'payload'> & {
        groupId: string | null;
        payload: unknown;
      };
    };
  };
  const mutations: Array<[(record: WireRecord) => void, string]> = [
    [
      (r) => {
        r.id = 'm:operation:2';
      },
      'EFFECT_ENVELOPE_MISMATCH',
    ],
    [
      (r) => {
        r.definitionId = 'missing';
      },
      'EFFECT_ENVELOPE_MISMATCH',
    ],
    [
      (r) => {
        r.deadline = { side: 'black', boundary: 'end', ordinal: 1 };
      },
      'EFFECT_ENVELOPE_MISMATCH',
    ],
    [
      (r) => {
        r.payload.instance.id = 'm:operation:2';
      },
      'EFFECT_ENVELOPE_MISMATCH',
    ],
    [
      (r) => {
        r.definitionId = r.payload.instance.definitionId = 'missing';
      },
      'UNKNOWN_EFFECT_DEFINITION',
    ],
    [
      (r) => {
        r.id = r.payload.instance.id = 'other:operation:1';
      },
      'EFFECT_ID_MISMATCH',
    ],
    [
      (r) => {
        r.payload.instance.groupId = 'other:black:pair';
      },
      'EFFECT_GROUP_MISMATCH',
    ],
  ];
  for (const [mutate, code] of mutations) {
    const raw = JSON.parse(encoded) as { effects: WireRecord[] };
    mutate(raw.effects[0]!);
    expect(() => decodeSnapshot(JSON.stringify(raw), bundle)).toThrow(code);
  }
  for (const version of ['0.9.0', '1.0.1', '1.0.0-preview']) {
    const raw = JSON.parse(encoded) as { effects: WireRecord[] };
    raw.effects[0]!.payload.instance.definitionVersion = version;
    expect(() => decodeSnapshot(JSON.stringify(raw), bundle), version).toThrow(
      'EFFECT_VERSION_MISMATCH',
    );
  }
  const malformed = JSON.parse(encoded) as { effects: WireRecord[] };
  malformed.effects[0]!.payload.instance.payload = { nested: { values: ['invalid'] } };
  expect(() => decodeSnapshot(JSON.stringify(malformed), bundle)).toThrow('PAYLOAD');
  malformed.effects[0]!.payload.format = 'effect-instance-v9';
  expect(() => decodeSnapshot(JSON.stringify(malformed), bundle)).toThrow();
  const duplicate = JSON.parse(encoded) as { effects: WireRecord[] };
  duplicate.effects.push(structuredClone(duplicate.effects[0]!));
  expect(() => decodeSnapshot(JSON.stringify(duplicate), bundle)).toThrow('DUPLICATE_RULE_ID');
  expect(game.effects).toEqual([]);
  expect(game.counters).toEqual({ transaction: 0, event: 0, operation: 2, snapshot: 1, piece: 0 });
  expect(decodeEffectRecords(records, registry, game)[0]?.payload).toEqual({
    nested: { values: [3] },
  });
});

it('isolates shared caller payloads, parser output and restored snapshots at every nested level', () => {
  const schema = definition().payloadSchema;
  const shared = { nested: { values: [3] } };
  const registry = createEffectRegistry([
    {
      ...definition(),
      payloadSchema: {
        parse(value: unknown) {
          schema.parse(value);
          return shared;
        },
      },
    },
  ]);
  const game = state();
  const raw = { ...instance(), payload: shared };
  const records = encodeEffectRecords([raw, { ...raw, id: 'm:operation:2' }], registry, game);
  const encoded = encodeSnapshot({ ...game, effects: records }, registry);
  const bundle = { version: game.rulesetVersion, hash: game.rulesetHash, effectRegistry: registry };
  const restored = decodeSnapshot(encoded, bundle);
  const parsed = decodeEffectRecords(restored.effects, registry, restored);
  const first = parsed[0]!.payload as { nested: { values: number[] } };
  const second = parsed[1]!.payload as { nested: { values: number[] } };
  expect(first.nested).not.toBe(second.nested);
  expect(first.nested.values).not.toBe(shared.nested.values);
  expect(Object.isFrozen(first.nested.values)).toBe(true);
  expect(Reflect.set(first.nested.values, '0', 99)).toBe(false);
  shared.nested.values[0] = 8;
  expect(first).toEqual({ nested: { values: [3] } });
  expect(second).toEqual({ nested: { values: [3] } });
  expect(restored.effects).toEqual(records);
  const persisted = restored.effects[0]!.payload as {
    instance: { payload: { nested: { values: number[] } } };
  };
  expect(Object.isFrozen(persisted.instance.payload.nested.values)).toBe(true);
  expect(Reflect.set(persisted.instance.payload.nested.values, '0', 99)).toBe(false);
  expect(persisted.instance.payload).toEqual({ nested: { values: [3] } });
});

it('isolates registries using the same definition ID with different schemas and pinned versions', () => {
  const permissive = createEffectRegistry([definition()]);
  const positiveOnly = createEffectRegistry([
    {
      ...definition(),
      payloadSchema: {
        parse(value: unknown) {
          const parsed = definition().payloadSchema.parse(value);
          if (parsed.nested.values.some((value) => value < 0)) throw new Error('NEGATIVE_PAYLOAD');
          return parsed;
        },
      },
    },
  ]);
  const nextVersion = createEffectRegistry([{ ...definition(), schemaVersion: '2.0.0' }]);
  const game = state();
  const raw = { ...instance(), payload: { nested: { values: [-2] } } };
  expect(validateEffectInstance(raw, permissive, game).payload).toEqual({
    nested: { values: [-2] },
  });
  expect(() => validateEffectInstance(raw, positiveOnly, game)).toThrow('NEGATIVE_PAYLOAD');
  expect(() => validateEffectInstance(raw, nextVersion, game)).toThrow('EFFECT_VERSION_MISMATCH');
  expect(
    validateEffectInstance({ ...raw, definitionVersion: '2.0.0' }, nextVersion, game)
      .definitionVersion,
  ).toBe('2.0.0');
  const encoded = encodeSnapshot(
    { ...game, effects: encodeEffectRecords([raw], permissive, game) },
    permissive,
  );
  expect(() =>
    decodeSnapshot(encoded, {
      version: game.rulesetVersion,
      hash: game.rulesetHash,
      effectRegistry: positiveOnly,
    }),
  ).toThrow('NEGATIVE_PAYLOAD');
  expect(() =>
    decodeSnapshot(encoded, {
      version: game.rulesetVersion,
      hash: game.rulesetHash,
      effectRegistry: nextVersion,
    }),
  ).toThrow('EFFECT_VERSION_MISMATCH');
  expect(validateEffectInstance(raw, permissive, game).payload).toEqual({
    nested: { values: [-2] },
  });
  expect(permissive.get('future.resonance')).not.toBe(positiveOnly.get('future.resonance'));
});
