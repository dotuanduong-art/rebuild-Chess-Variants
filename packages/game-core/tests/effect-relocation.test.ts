import { expect, it } from 'vitest';
import { PieceIdSchema, SerializableValueSchema } from '@variant-chess/shared-types';
import type { GameState, RootCommand, PlayerSide } from '@variant-chess/shared-types';
import {
  BASE_RULESET_ID,
  createBoard,
  createGame,
  createEffectRegistry,
  createEffectRuntime,
  decodeEffectRecords,
  resolveCommand,
  encodeSnapshot,
  decodeSnapshot,
  fullStateHash,
  recordReplay,
  executeReplay,
  canonicalEncode,
  encodeEffectRecords,
} from '../src/index.js';
import type {
  EffectDefinition,
  DerivedOperation,
  RulesetBundle,
  SkillPlan,
  EffectRuntimeBindings,
} from '../src/index.js';
import type { EffectInstance, EffectLinkContext } from '../src/index.js';
import { piece } from './fixtures.js';

// P00-03/11: synthetic policies only; no Turtle or concrete-group approval.
const id = (value: string) => PieceIdSchema.parse(value);
const definition = (overrides: Partial<EffectDefinition> = {}): EffectDefinition => ({
  typeId: 'unannounced.resonance',
  schemaVersion: '1.0.0',
  targets: ['piece'],
  category: 'neutral',
  sourceAttribution: { kind: 'preserve-source', requiredRefs: ['skill'] },
  ownership: { kind: 'source-player' },
  kingEligibility: { kind: 'allowed' },
  lifetime: { kind: 'permanent' },
  stacking: { key: 'type-source-target', mode: 'independent' },
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
  visibility: { kind: 'source-player' },
  capabilities: [],
  triggers: [],
  repetition: { projectionId: 'synthetic.semantic-v1' },
  repetitionProjector: (effect, context) => ({
    payload: effect.payload,
    source: effect.sourcePlayer,
    target: context.target,
    remaining: context.remainingLifetime,
    group: context.group,
  }),
  payloadSchema: {
    parse(value: unknown) {
      const parsed = SerializableValueSchema.parse(value);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed) ||
        typeof parsed['value'] !== 'number'
      )
        throw new Error('SYNTHETIC_PAYLOAD');
      return parsed;
    },
  },
  ...overrides,
});
const apply = (
  target: string,
  patch: Partial<Extract<DerivedOperation, { kind: 'effect_apply' }>> = {},
): DerivedOperation => ({
  kind: 'effect_apply',
  definitionId: 'unannounced.resonance',
  definitionVersion: '1.0.0',
  target: { kind: 'piece', pieceId: id(target) },
  sourcePlayer: 'actor',
  sourceVariant: 'synthetic.producer',
  sourceSkill: 'seed',
  sourcePiece: id('a'),
  payload: { value: 7, nested: ['origin'] },
  groupId: null,
  ...patch,
});
const swap = (a = 'a', b = 'b'): DerivedOperation => ({
  kind: 'effect_sets_swap',
  pieceA: id(a),
  pieceB: id(b),
});
function rules(
  defs = [definition()],
  seed: readonly DerivedOperation[] = [apply('a')],
  ops: readonly DerivedOperation[] = [swap()],
  bindings: EffectRuntimeBindings = {},
): RulesetBundle & { skills: Record<string, SkillPlan> } {
  const registry = createEffectRegistry(defs);
  return {
    ...BASE_RULESET_ID,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, bindings),
    skills: { seed: { cost: 0, operations: seed }, transfer: { cost: 1, operations: ops } },
  };
}
const input = (command: RootCommand, side: PlayerSide = 'white') => ({
  authority: { kind: 'player', side },
  command,
});
const game = (bundle: RulesetBundle) =>
  createGame(
    {
      matchId: 'm',
      seed: 1,
      board: createBoard([piece('a', 'pawn', 'A1', 'black'), piece('b', 'pawn', 'B1', 'black')]),
      ap: { white: 20, black: 20 },
    },
    bundle,
  );
function run(
  state: GameState,
  bundle: RulesetBundle,
  command: RootCommand,
  side: PlayerSide = state.turn.sideToAct,
) {
  const result = resolveCommand(state, input(command, side), bundle);
  if (!result.ok) throw new Error(result.code);
  return result;
}
function seeded(bundle: RulesetBundle, initial = game(bundle)) {
  const applied = run(initial, bundle, { kind: 'skill', skillId: 'seed' }).state;
  return run(run(applied, bundle, { kind: 'end' }).state, bundle, { kind: 'end' }).state;
}
const effects = (state: GameState, bundle: RulesetBundle) =>
  decodeEffectRecords(state.effects, bundle.effectRegistry!, state);

it('relocates a future synthetic effect preserving every field except target', () => {
  const bundle = rules(undefined, undefined, [
    {
      kind: 'effect_relocate',
      instanceId: 'm:operation:2',
      target: { kind: 'piece', pieceId: id('b') },
    },
  ]);
  const before = seeded(bundle);
  const original = effects(before, bundle)[0]!;
  const result = run(before, bundle, { kind: 'skill', skillId: 'transfer' });
  expect(effects(result.state, bundle)).toEqual([
    { ...original, target: { kind: 'piece', pieceId: 'b' } },
  ]);
  expect(result.state.board).toEqual(before.board);
  expect(before.effects).not.toEqual(result.state.effects);
  expect(
    result.events.filter((event) => event.kind.startsWith('effect_')).map((event) => event.kind),
  ).toEqual(['effect_relocated']);
});

it('atomically swaps unequal sets without reapply, expire or rewards', () => {
  const bundle = rules(undefined, [
    apply('a'),
    apply('a', { payload: { value: 9 } }),
    apply('b', { sourcePlayer: 'black' }),
  ]);
  const before = seeded(bundle);
  const original = effects(before, bundle);
  const result = run(before, bundle, { kind: 'skill', skillId: 'transfer' });
  expect(effects(result.state, bundle)).toEqual(
    original.map((effect) => ({
      ...effect,
      target: {
        kind: 'piece',
        pieceId: effect.target.kind === 'piece' && effect.target.pieceId === 'a' ? 'b' : 'a',
      },
    })),
  );
  expect(result.state.ap).toEqual({ white: 19, black: 20 });
  expect(result.state.board).toEqual(before.board);
  expect(
    result.events.filter((event) => event.kind.startsWith('effect_')).map((event) => event.kind),
  ).toEqual(['effect_relocated', 'effect_relocated', 'effect_relocated', 'effect_sets_swapped']);
  expect(result.events.every((event) => event.visibility === 'internal')).toBe(true);
});

it.each([0, 1])(
  'supports generic swaps with %i occupied attachment sets, including both empty',
  (occupied) => {
    const bundle = rules(undefined, occupied ? [apply('a')] : []);
    const before = seeded(bundle);
    const result = run(before, bundle, { kind: 'skill', skillId: 'transfer' });
    expect(effects(result.state, bundle).map((effect) => effect.target)).toEqual(
      occupied ? [{ kind: 'piece', pieceId: 'b' }] : [],
    );
    expect(result.events.filter((event) => event.kind === 'effect_sets_swapped')).toHaveLength(1);
  },
);

it('rejects missing targets, same-piece swaps and missing instances atomically', () => {
  for (const [operation, code] of [
    [swap('a', 'missing'), 'EFFECT_TARGET_MISSING'],
    [swap('a', 'a'), 'INVALID_EFFECT_SWAP'],
    [
      {
        kind: 'effect_relocate',
        instanceId: 'm:operation:999',
        target: { kind: 'piece', pieceId: id('b') },
      },
      'EFFECT_INSTANCE_MISSING',
    ],
    [
      {
        kind: 'effect_relocate',
        instanceId: 'm:operation:2',
        target: { kind: 'player', side: 'white' },
      },
      'EFFECT_TARGET_MISMATCH',
    ],
  ] as const) {
    const bundle = rules(undefined, undefined, [operation]);
    const before = seeded(bundle);
    const encoded = encodeSnapshot(before, bundle.effectRegistry);
    const result = resolveCommand(before, input({ kind: 'skill', skillId: 'transfer' }), bundle);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(code);
    expect(result.events).toEqual([]);
    expect(encodeSnapshot(before, bundle.effectRegistry)).toBe(encoded);
  }
});

it('honors King denial and prohibited/absent relocation bindings instead of partially swapping', () => {
  const king = rules([definition({ kingEligibility: { kind: 'denied' } })]);
  const initial = createGame(
    {
      matchId: 'm',
      seed: 1,
      board: createBoard([piece('a', 'pawn', 'A1', 'black'), piece('b', 'king', 'B1', 'black')]),
      ap: { white: 20, black: 20 },
    },
    king,
  );
  const before = run(run(initial, king, { kind: 'skill', skillId: 'seed' }).state, king, {
    kind: 'end',
  }).state;
  const denied = resolveCommand(
    before,
    input({ kind: 'skill', skillId: 'transfer' }, 'black'),
    king,
  );
  expect(denied).toEqual({ ok: false, code: 'EFFECT_KING_INELIGIBLE', events: [] });
  for (const [relocation, code] of [
    [{ kind: 'prohibited-with-reason', reason: 'synthetic.fixed' }, 'EFFECT_RELOCATION_PROHIBITED'],
    [{ kind: 'retargetable', constraints: ['missing.validator'] }, 'UNSUPPORTED_RUNTIME'],
  ] as const) {
    const bundle = rules([definition({ relocation })]);
    expect(
      resolveCommand(seeded(bundle), input({ kind: 'skill', skillId: 'transfer' }), bundle),
    ).toEqual({ ok: false, code, events: [] });
  }
});

it('validates final assignment caps and never merges stacked payloads during swap', () => {
  let merges = 0;
  const bundle = rules(
    [
      definition({
        stacking: {
          key: 'type-target',
          mode: 'stack',
          representation: 'instances',
          cap: 2,
          mergePolicyId: 'synthetic.keep',
        },
      }),
    ],
    [apply('a'), apply('a', { payload: { value: 9 } }), apply('b')],
    [swap()],
    {
      mergePayload: {
        'synthetic.keep': (_old, incoming) => {
          merges++;
          return incoming.payload;
        },
      },
    },
  );
  const before = seeded(bundle);
  expect(merges).toBe(1);
  const result = run(before, bundle, { kind: 'skill', skillId: 'transfer' });
  expect(merges).toBe(1);
  expect(effects(result.state, bundle).map((effect) => effect.target)).toEqual([
    { kind: 'piece', pieceId: 'b' },
    { kind: 'piece', pieceId: 'b' },
    { kind: 'piece', pieceId: 'a' },
  ]);
  const single = {
    ...bundle,
    skills: {
      ...bundle.skills,
      transfer: {
        cost: 1,
        operations: [
          {
            kind: 'effect_relocate' as const,
            instanceId: 'm:operation:4',
            target: { kind: 'piece' as const, pieceId: id('a') },
          },
        ],
      },
    },
  };
  expect(resolveCommand(before, input({ kind: 'skill', skillId: 'transfer' }), single)).toEqual({
    ok: false,
    code: 'EFFECT_STACK_LIMIT',
    events: [],
  });
});

it('runs destination/controller restrictions against the frozen complete assignment', () => {
  let validations = 0;
  const bundle = rules(
    [definition({ relocation: { kind: 'retargetable', constraints: ['synthetic.final-sets'] } })],
    [apply('a'), apply('b')],
    [swap()],
    {
      relocation: {
        'synthetic.final-sets': (context) => {
          validations++;
          expect(Object.isFrozen(context.after.effects)).toBe(true);
          const after = decodeEffectRecords(
            context.after.effects,
            bundle.effectRegistry!,
            context.after,
          );
          expect(after.map((effect) => effect.target)).toEqual([
            { kind: 'piece', pieceId: 'b' },
            { kind: 'piece', pieceId: 'a' },
          ]);
          return (
            context.instance.target.kind === 'piece' &&
            context.after.board.pieces[context.instance.target.pieceId]?.controller === 'black'
          );
        },
      },
    },
  );
  expect(
    run(seeded(bundle), bundle, { kind: 'skill', skillId: 'transfer' }).state.effects,
  ).toHaveLength(2);
  expect(validations).toBe(2);
  const refusing = {
    ...bundle,
    effectRuntime: createEffectRuntime(bundle.effectRegistry!, {
      relocation: { 'synthetic.final-sets': () => false },
    }),
  };
  expect(
    resolveCommand(seeded(refusing), input({ kind: 'skill', skillId: 'transfer' }), refusing),
  ).toEqual({ ok: false, code: 'EFFECT_RELOCATION_INELIGIBLE', events: [] });
});

const linkedDefinition = () =>
  definition({
    relocation: { kind: 'group-aware', policyId: 'synthetic.move-pair', constraints: [] },
    links: { validationId: 'synthetic.pair', normalizationId: 'synthetic.graph' },
  });
function targetLabel(effect: EffectInstance, context: EffectLinkContext) {
  return effect.target.kind === 'piece'
    ? { kind: 'piece', position: context.state.board.pieces[effect.target.pieceId]!.position }
    : effect.target;
}
const linkBindings = (): EffectRuntimeBindings => ({
  relocation: {
    'synthetic.move-pair': (context) =>
      (context.original.references ?? []).every(
        (ref) =>
          ref.kind !== 'effect' || context.moves.some((move) => move.effectId === ref.instanceId),
      ),
  },
  linkValidation: {
    'synthetic.pair': (effect, context) => {
      const members = context.instances.filter((other) => other.groupId === effect.groupId);
      const nodes = context.instances.filter(
        (other) =>
          other.definitionId === effect.definitionId && other.sourcePlayer === effect.sourcePlayer,
      );
      const uniqueTargets = new Set(
        nodes.map((node) => canonicalEncode(targetLabel(node, context))),
      );
      const partner = effect.references?.find(
        (ref) => ref.role === 'partner' && ref.kind === 'effect',
      );
      return (
        members.length === 2 &&
        uniqueTargets.size === nodes.length &&
        members.every(
          (member) =>
            member.definitionId === effect.definitionId &&
            member.definitionVersion === effect.definitionVersion,
        ) &&
        partner?.kind === 'effect' &&
        partner.instanceId !== effect.id &&
        members.some(
          (other) => other.id === partner.instanceId && other.sourcePlayer === effect.sourcePlayer,
        ) &&
        (effect.references ?? []).every(
          (ref) =>
            ref.kind !== 'group' ||
            (ref.groupId === effect.groupId && ref.owner === effect.sourcePlayer),
        )
      );
    },
  },
  linkNormalization: {
    'synthetic.graph': (effect, context) => ({
      group: {
        owner: effect.sourcePlayer,
        members: context.instances
          .filter((other) => other.groupId === effect.groupId)
          .map((other) => targetLabel(other, context))
          .sort((a, b) =>
            JSON.stringify(a) < JSON.stringify(b)
              ? -1
              : JSON.stringify(a) > JSON.stringify(b)
                ? 1
                : 0,
          ),
      },
      references: (effect.references ?? []).map((ref) => {
        if (ref.kind === 'effect')
          return {
            role: ref.role,
            kind: ref.kind,
            target: targetLabel(
              context.instances.find((other) => other.id === ref.instanceId)!,
              context,
            ),
          };
        if (ref.kind === 'piece')
          return {
            role: ref.role,
            kind: ref.kind,
            position: context.state.board.pieces[ref.pieceId]!.position,
          };
        return { role: ref.role, kind: ref.kind, owner: ref.owner };
      }),
    }),
  },
});
function linkedRules(partner = 'm:operation:3', ops: readonly DerivedOperation[] = [swap()]) {
  const refs = (peer: string) => [
    { role: 'partner', kind: 'effect' as const, instanceId: peer },
    { role: 'source', kind: 'piece' as const, pieceId: id('a'), presence: 'live' as const },
    { role: 'owner', kind: 'group' as const, groupId: 'm:white:pair', owner: 'white' as const },
  ];
  return rules(
    [linkedDefinition()],
    [
      apply('a', { groupId: 'm:white:pair', references: refs(partner) }),
      apply('b', { groupId: 'm:white:pair', references: refs('m:operation:2') }),
    ],
    ops,
    linkBindings(),
  );
}

it('validates linked groups against simultaneous targets and preserves all references/source metadata', () => {
  const bundle = linkedRules();
  const before = seeded(bundle);
  const original = effects(before, bundle);
  const result = run(before, bundle, { kind: 'skill', skillId: 'transfer' });
  expect(effects(result.state, bundle)).toEqual(
    original.map((effect) => ({
      ...effect,
      target: {
        kind: 'piece',
        pieceId: effect.target.kind === 'piece' && effect.target.pieceId === 'a' ? 'b' : 'a',
      },
    })),
  );
});

it('rejects broken partner references and incomplete group relocation with full rollback', () => {
  const broken = linkedRules('m:operation:999');
  expect(resolveCommand(game(broken), input({ kind: 'skill', skillId: 'seed' }), broken)).toEqual({
    ok: false,
    code: 'EFFECT_LINK_REFERENCE_MISSING',
    events: [],
  });
  const single = linkedRules(undefined, [
    {
      kind: 'effect_relocate',
      instanceId: 'm:operation:2',
      target: { kind: 'piece', pieceId: id('c') },
    },
  ]);
  const before = seeded(
    single,
    createGame(
      {
        matchId: 'm',
        seed: 1,
        board: createBoard([
          piece('a', 'pawn', 'A1', 'black'),
          piece('b', 'pawn', 'B1', 'black'),
          piece('c', 'pawn', 'C1', 'black'),
        ]),
        ap: { white: 20, black: 20 },
      },
      single,
    ),
  );
  const snapshot = encodeSnapshot(before, single.effectRegistry);
  expect(resolveCommand(before, input({ kind: 'skill', skillId: 'transfer' }), single)).toEqual({
    ok: false,
    code: 'EFFECT_RELOCATION_INELIGIBLE',
    events: [],
  });
  expect(encodeSnapshot(before, single.effectRegistry)).toBe(snapshot);
});

it('fails closed if linked validation or normalization has no declared binding', () => {
  for (const bindings of [{}, { linkValidation: linkBindings().linkValidation! }]) {
    const complete = linkedRules();
    const bundle = {
      ...complete,
      effectRuntime: createEffectRuntime(complete.effectRegistry!, bindings),
    };
    expect(resolveCommand(game(bundle), input({ kind: 'skill', skillId: 'seed' }), bundle)).toEqual(
      { ok: false, code: 'UNSUPPORTED_RUNTIME', events: [] },
    );
  }
});

it('rejects a declared graph normalizer that silently drops reference semantics', () => {
  const complete = linkedRules();
  const bundle = {
    ...complete,
    effectRuntime: createEffectRuntime(complete.effectRegistry!, {
      ...linkBindings(),
      linkNormalization: { 'synthetic.graph': () => ({}) as never },
    }),
  };
  const result = resolveCommand(game(bundle), input({ kind: 'skill', skillId: 'seed' }), bundle);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('EFFECT_LINK_NORMALIZATION_INVALID');
  expect(result.events).toEqual([]);
});

it('preserves pinned mixed definition versions and rejects tampered instance versions before swap', () => {
  const second = definition({ typeId: 'future.brand-new', schemaVersion: '2.0.0' });
  const bundle = rules(
    [definition(), second],
    [apply('a'), apply('b', { definitionId: second.typeId, definitionVersion: '2.0.0' })],
  );
  const before = seeded(bundle);
  const result = run(before, bundle, { kind: 'skill', skillId: 'transfer' });
  expect(
    effects(result.state, bundle).map((effect) => [effect.definitionId, effect.definitionVersion]),
  ).toEqual([
    ['unannounced.resonance', '1.0.0'],
    ['future.brand-new', '2.0.0'],
  ]);
  const malformed = JSON.parse(encodeSnapshot(before, bundle.effectRegistry));
  malformed.effects[0].payload.instance.definitionVersion = '9.0.0';
  expect(resolveCommand(malformed, input({ kind: 'skill', skillId: 'transfer' }), bundle)).toEqual({
    ok: false,
    code: 'EFFECT_VERSION_MISMATCH',
    events: [],
  });
});

it('preserves source deadlines through swap and expires at the original source boundary on the new target', () => {
  const bundle = rules([definition({ lifetime: { kind: 'rounds', rounds: 3, boundary: 'end' } })]);
  const before = seeded(bundle);
  const original = effects(before, bundle)[0]!;
  let state = run(before, bundle, { kind: 'skill', skillId: 'transfer' }).state;
  expect(effects(state, bundle)[0]).toEqual({
    ...original,
    target: { kind: 'piece', pieceId: 'b' },
  });
  for (let transition = 1; transition <= 5; transition++) {
    const result = run(state, bundle, { kind: 'end' });
    state = result.state;
    expect(state.effects.length).toBe(transition === 5 ? 0 : 1);
    if (transition === 5)
      expect(
        result.events
          .filter((event) => event.kind === 'effect_removed')
          .map((event) => event.payload),
      ).toMatchObject([
        { target: { kind: 'piece', pieceId: 'b' }, sourcePlayer: 'white', reason: 'expired' },
      ]);
  }
});

it('rolls back the complete swap, AP/slots/IDs/RNG/history/repetition on a later derived failure', () => {
  const bundle = rules(
    undefined,
    [apply('a'), apply('b')],
    [
      swap(),
      { kind: 'random', side: 'actor', namespace: 'draw', pool: ['a', 'b'] },
      { kind: 'fail', code: 'AFTER_SWAP' },
    ],
  );
  const before = seeded(bundle);
  const snapshot = encodeSnapshot(before, bundle.effectRegistry);
  expect(resolveCommand(before, input({ kind: 'skill', skillId: 'transfer' }), bundle)).toEqual({
    ok: false,
    code: 'AFTER_SWAP',
    events: [],
  });
  expect(encodeSnapshot(before, bundle.effectRegistry)).toBe(snapshot);
  expect(before.ap).toEqual({ white: 20, black: 20 });
  expect(before.rng.cursor).toBe(0);
});

it('rolls back an already planned swap when relocation fact dispatch exceeds queue budget', () => {
  const base = rules(undefined, [apply('a'), apply('b')]);
  const bundle: RulesetBundle = {
    ...base,
    handlers: [
      {
        id: 'swap-observer',
        order: 0,
        react: (event) =>
          event.kind === 'effect_sets_swapped' ? [{ kind: 'marker', value: 'observer' }] : [],
      },
    ],
  };
  const before = seeded(bundle);
  const hash = fullStateHash(before, bundle.effectRegistry);
  expect(
    resolveCommand(before, input({ kind: 'skill', skillId: 'transfer' }), bundle, {
      operationBudget: 2,
    }),
  ).toEqual({ ok: false, code: 'RESOLUTION_LIMIT', events: [] });
  expect(fullStateHash(before, bundle.effectRegistry)).toEqual(hash);
});

it('does not expose authoritative relocation/swap commands or open unsupported runtime capabilities', () => {
  const bundle = rules();
  const before = seeded(bundle);
  expect(
    resolveCommand(
      before,
      { authority: { kind: 'player', side: 'white' }, command: swap() },
      bundle,
    ),
  ).toEqual({ ok: false, code: 'INVALID_COMMAND', events: [] });
  const dataOnly = { ...bundle };
  delete dataOnly.effectRuntime;
  expect(resolveCommand(before, input({ kind: 'skill', skillId: 'transfer' }), dataOnly)).toEqual({
    ok: false,
    code: 'UNSUPPORTED_RUNTIME',
    events: [],
  });
});

it('round-trips relocated linked effects and reproduces exact events/state through pinned replay', () => {
  const bundle = linkedRules();
  const initial = game(bundle);
  const before = seeded(bundle);
  const result = run(before, bundle, { kind: 'skill', skillId: 'transfer' });
  const restored = decodeSnapshot(encodeSnapshot(result.state, bundle.effectRegistry), bundle);
  expect(restored).toEqual(result.state);
  expect(fullStateHash(restored, bundle.effectRegistry)).toEqual(
    fullStateHash(result.state, bundle.effectRegistry),
  );
  const replay = recordReplay(
    initial,
    [
      input({ kind: 'skill', skillId: 'seed' }),
      input({ kind: 'end' }),
      input({ kind: 'end' }, 'black'),
      input({ kind: 'skill', skillId: 'transfer' }),
    ],
    bundle,
  );
  if (!replay.ok) throw new Error(replay.code);
  const played = executeReplay(replay.archive, bundle);
  if (!played.ok) throw new Error(played.code);
  expect(played.state).toEqual(result.state);
  expect(played.events.slice(-result.events.length)).toEqual(result.events);
});

function graphFixture(
  offset: number,
  pairs: readonly (readonly [number, number])[],
  prefix: string,
  sources: readonly PlayerSide[] = ['white', 'white'],
) {
  const names = ['a', 'b', 'c', 'd'];
  const seed = names.map((name, index) => {
    const pairIndex = pairs.findIndex((pair) => pair.includes(index));
    const pair = pairs[pairIndex]!;
    const other = pair[0] === index ? pair[1] : pair[0];
    const source = sources[pairIndex]!;
    const groupId = `m:${source}:${prefix}${pairIndex}`;
    return apply(name, {
      sourcePlayer: source,
      groupId,
      references: [
        { role: 'partner', kind: 'effect', instanceId: `m:operation:${offset + 2 + other}` },
        { role: 'owner', kind: 'group', groupId, owner: source },
        { role: 'source', kind: 'piece', pieceId: id('a'), presence: 'live' },
      ],
    });
  });
  const bundle = rules([linkedDefinition()], seed, [swap()], linkBindings());
  const base = createGame(
    {
      matchId: 'm',
      seed: 1,
      board: createBoard(
        names.map((name, index) =>
          piece(name, 'pawn', `${String.fromCharCode(65 + index)}1`, 'black'),
        ),
      ),
      ap: { white: 20, black: 20 },
    },
    bundle,
  );
  const initial = { ...base, counters: { ...base.counters, operation: offset } };
  const applied = run(initial, bundle, { kind: 'skill', skillId: 'seed' }).state;
  const ended = run(applied, bundle, { kind: 'end' }).state;
  const initialKey = Object.keys(initial.history.repetition)[0]!;
  const graphKeys = Object.keys(ended.history.repetition).filter((key) => key !== initialKey);
  expect(graphKeys).toHaveLength(1);
  return { key: graphKeys[0]!, state: ended, bundle };
}

it('normalizes allocation/group IDs canonically while distinguishing different valid pair graphs', () => {
  const first = graphFixture(
    0,
    [
      [0, 1],
      [2, 3],
    ],
    'old',
  );
  const renamed = graphFixture(
    50,
    [
      [0, 1],
      [2, 3],
    ],
    'renamed',
  );
  const rewired = graphFixture(
    0,
    [
      [0, 2],
      [1, 3],
    ],
    'old',
  );
  expect(renamed.key).toBe(first.key);
  expect(rewired.key).not.toBe(first.key);
  expect(fullStateHash(renamed.state, renamed.bundle.effectRegistry)).not.toEqual(
    fullStateHash(first.state, first.bundle.effectRegistry),
  );
  const ignored = {
    ...first.bundle,
    repetition: (state: GameState) => ({
      effects: [],
      delayedActions: [],
      variantState: state.variantState,
    }),
  };
  const refreshedKeys = run(first.state, ignored, { kind: 'end' }).state.history.repetition;
  expect(canonicalEncode(refreshedKeys)).toContain('partner');
});

it('isolates identical linked definitions by source player and rejects accidental cross-player partners', () => {
  const fixture = graphFixture(
    0,
    [
      [0, 1],
      [2, 3],
    ],
    'mirror',
    ['white', 'black'],
  );
  const originals = effects(fixture.state, fixture.bundle);
  expect(originals.map((effect) => effect.groupId)).toEqual([
    'm:white:mirror0',
    'm:white:mirror0',
    'm:black:mirror1',
    'm:black:mirror1',
  ]);
  const swapped = run(fixture.state, fixture.bundle, { kind: 'skill', skillId: 'transfer' });
  const final = effects(swapped.state, fixture.bundle);
  expect(final.slice(2)).toEqual(originals.slice(2));
  expect(final.slice(0, 2).map((effect) => effect.sourcePlayer)).toEqual(['white', 'white']);
  const first = originals[0]!;
  const invalidFirst = {
    ...first,
    references: first.references!.map((ref) =>
      ref.kind === 'effect' ? { ...ref, instanceId: originals[2]!.id } : ref,
    ),
  };
  const malformed = {
    ...fixture.state,
    effects: encodeEffectRecords(
      [invalidFirst, ...originals.slice(1)],
      fixture.bundle.effectRegistry!,
      fixture.state,
    ),
  };
  expect(resolveCommand(malformed, input({ kind: 'end' }, 'black'), fixture.bundle)).toEqual({
    ok: false,
    code: 'EFFECT_LINK_INELIGIBLE',
    events: [],
  });
});

it('rejects missing live-piece/group references, wrong group owners and duplicate references', () => {
  const complete = linkedRules();
  const applied = seeded(complete);
  const original = effects(applied, complete);
  const first = original[0]!;
  for (const [ref, code] of [
    [
      { role: 'source', kind: 'piece', pieceId: id('missing'), presence: 'live' },
      'EFFECT_LINK_REFERENCE_MISSING',
    ],
    [
      { role: 'owner', kind: 'group', groupId: 'm:white:missing', owner: 'white' },
      'EFFECT_LINK_REFERENCE_MISSING',
    ],
    [
      { role: 'owner', kind: 'group', groupId: 'm:white:pair', owner: 'black' },
      'EFFECT_LINK_OWNER_MISMATCH',
    ],
  ] as const) {
    const updated = {
      ...first,
      references: first.references!.map((old) => (old.role === ref.role ? ref : old)),
    };
    const invalid = {
      ...applied,
      effects: encodeEffectRecords([updated, original[1]!], complete.effectRegistry!, applied),
    };
    expect(
      resolveCommand(invalid, input({ kind: 'skill', skillId: 'transfer' }), complete),
    ).toEqual({ ok: false, code, events: [] });
  }
  const duplicate = { ...first, references: [...first.references!, first.references![0]!] };
  const invalid = {
    ...applied,
    effects: encodeEffectRecords([duplicate, original[1]!], complete.effectRegistry!, applied),
  };
  expect(resolveCommand(invalid, input({ kind: 'skill', skillId: 'transfer' }), complete)).toEqual({
    ok: false,
    code: 'EFFECT_DUPLICATE_REFERENCE',
    events: [],
  });
});

it('retains legacy matching tags but rejects their relocation without an explicit group contract', () => {
  const base = rules(undefined, [apply('a', { groupId: 'm:white:legacy' })]);
  const bundle: RulesetBundle = {
    ...base,
    repetition: (state) => ({
      effects: state.effects,
      delayedActions: [],
      variantState: state.variantState,
    }),
  };
  expect(
    resolveCommand(seeded(bundle), input({ kind: 'skill', skillId: 'transfer' }), bundle),
  ).toEqual({ ok: false, code: 'UNSUPPORTED_RUNTIME', events: [] });
});

it('rejects incomplete mixed opaque/declared graph semantics at commit, before a later boundary can fail', () => {
  const linked = linkedRules();
  const other = definition({ typeId: 'opaque.tag' });
  const registry = createEffectRegistry([linkedDefinition(), other]);
  const seed = [
    ...linked.skills!.seed!.operations,
    apply('a', { definitionId: 'opaque.tag', groupId: 'm:white:opaque' }),
  ];
  const bundle: RulesetBundle = {
    ...linked,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, linkBindings()),
    repetition: (state) => ({ effects: [], delayedActions: [], variantState: state.variantState }),
    skills: { ...linked.skills, seed: { cost: 0, operations: seed } },
  };
  const result = resolveCommand(game(bundle), input({ kind: 'skill', skillId: 'seed' }), bundle);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('UNSUPPORTED_RUNTIME');
  expect(result.events).toEqual([]);
});

it('revalidates destination controller eligibility instead of retaining the old target eligibility', () => {
  const bundle = rules(
    [definition({ eligibility: { policyId: 'synthetic.black-controller' } })],
    [apply('a'), swap()],
    undefined,
    {
      eligibility: {
        'synthetic.black-controller': (effect, state) =>
          effect.target.kind === 'piece' &&
          state.board.pieces[effect.target.pieceId]!.controller === 'black',
      },
    },
  );
  const initial = createGame(
    {
      matchId: 'm',
      seed: 1,
      board: createBoard([piece('a', 'pawn', 'A1', 'black'), piece('b', 'pawn', 'B1', 'white')]),
      ap: { white: 20, black: 20 },
    },
    bundle,
  );
  expect(resolveCommand(initial, input({ kind: 'skill', skillId: 'seed' }), bundle)).toEqual({
    ok: false,
    code: 'EFFECT_INELIGIBLE',
    events: [],
  });
});

it('permits generic King destinations when explicitly allowed by the definition', () => {
  const bundle = rules(undefined, [apply('a'), swap()]);
  const initial = createGame(
    {
      matchId: 'm',
      seed: 1,
      board: createBoard([piece('a', 'pawn', 'A1', 'black'), piece('b', 'king', 'B1', 'black')]),
      ap: { white: 20, black: 20 },
    },
    bundle,
  );
  expect(
    effects(run(initial, bundle, { kind: 'skill', skillId: 'seed' }).state, bundle)[0]?.target,
  ).toEqual({ kind: 'piece', pieceId: 'b' });
});

it('supports declared cell/player destinations for single relocation without expanding piece-set swap', () => {
  const bundle = rules([definition({ targets: ['piece', 'cell', 'player'] })], undefined, [
    {
      kind: 'effect_relocate',
      instanceId: 'm:operation:2',
      target: { kind: 'cell', position: { file: 1, rankIndex: 0 } },
    },
    {
      kind: 'effect_relocate',
      instanceId: 'm:operation:2',
      target: { kind: 'player', side: 'black' },
    },
  ]);
  const before = seeded(bundle);
  const original = effects(before, bundle)[0]!;
  const result = run(before, bundle, { kind: 'skill', skillId: 'transfer' });
  expect(effects(result.state, bundle)).toEqual([
    { ...original, target: { kind: 'player', side: 'black' } },
  ]);
  expect(
    result.events
      .filter((event) => event.kind === 'effect_relocated')
      .map((event) => event.payload.to.kind),
  ).toEqual(['cell', 'player']);
});

it('keeps live/historical reference presence in graph semantics even with identical current endpoints', () => {
  const bundle = linkedRules();
  const applied = run(game(bundle), bundle, { kind: 'skill', skillId: 'seed' }).state;
  const originals = effects(applied, bundle);
  const changed = originals.map((effect) => ({
    ...effect,
    references: effect.references!.map((ref) =>
      ref.kind === 'piece' ? { ...ref, presence: 'historical' as const } : ref,
    ),
  }));
  const historical = {
    ...applied,
    effects: encodeEffectRecords(changed, bundle.effectRegistry!, applied),
  };
  const initialKey = Object.keys(game(bundle).history.repetition)[0]!;
  const liveKey = Object.keys(run(applied, bundle, { kind: 'end' }).state.history.repetition).find(
    (key) => key !== initialKey,
  );
  const historicalKey = Object.keys(
    run(historical, bundle, { kind: 'end' }).state.history.repetition,
  ).find((key) => key !== initialKey);
  expect(historicalKey).not.toBe(liveKey);
});

it('refuses ambiguous node labels outside the synthetic normalizer supported domain', () => {
  const complete = linkedRules();
  const seed = complete.skills!.seed!.operations.map((operation) =>
    operation.kind === 'effect_apply'
      ? { ...operation, target: { kind: 'piece' as const, pieceId: id('a') } }
      : operation,
  );
  const bundle = {
    ...complete,
    skills: { ...complete.skills, seed: { cost: 0, operations: seed } },
  };
  const result = resolveCommand(game(bundle), input({ kind: 'skill', skillId: 'seed' }), bundle);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('EFFECT_LINK_INELIGIBLE');
});

it('rejects partial linked removal/death but permits complete cleanup atomically without inferred partner reactions', () => {
  for (const operations of [
    [{ kind: 'effect_remove' as const, instanceId: 'm:operation:2', reason: 'cleansed' as const }],
    [{ kind: 'destroy' as const, pieceId: 'a' }],
  ]) {
    const bundle = linkedRules(undefined, operations),
      state = seeded(bundle);
    const before = encodeSnapshot(state, bundle.effectRegistry);
    expect(resolveCommand(state, input({ kind: 'skill', skillId: 'transfer' }), bundle)).toEqual({
      ok: false,
      code: 'EFFECT_LINK_REFERENCE_MISSING',
      events: [],
    });
    expect(encodeSnapshot(state, bundle.effectRegistry)).toBe(before);
  }
  const bundle = linkedRules(undefined, [
    { kind: 'effect_remove', instanceId: 'm:operation:2', reason: 'cleansed' },
    { kind: 'effect_remove', instanceId: 'm:operation:3', reason: 'cleansed' },
  ]);
  const state = seeded(bundle),
    result = run(state, bundle, { kind: 'skill', skillId: 'transfer' });
  expect(result.state.effects).toEqual([]);
  expect(
    result.events.filter((e) => e.kind === 'effect_removed').map((e) => e.payload.reason),
  ).toEqual(['cleansed', 'cleansed']);
  expect(result.state.ap).toEqual({ white: 19, black: 20 });
});

it('rolls back natural expiry that would leave a required partner dangling', () => {
  const base = linkedRules();
  const timed = {
    ...linkedDefinition(),
    lifetime: { kind: 'rounds' as const, rounds: 1, boundary: 'end' as const },
  };
  const registry = createEffectRegistry([timed]);
  const bundle: RulesetBundle = {
    ...base,
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, linkBindings()),
  };
  const state = seeded(bundle);
  const instances = effects(state, bundle);
  const later = {
    ...instances[1]!,
    timingAnchor: { side: 'white' as const, boundary: 'end' as const, ordinal: 2 },
    deadline: { side: 'white' as const, boundary: 'end' as const, ordinal: 3 },
  };
  const staggered = {
    ...state,
    effects: encodeEffectRecords([instances[0]!, later], registry, state),
  };
  const before = encodeSnapshot(staggered, registry);
  expect(resolveCommand(staggered, input({ kind: 'end' }), bundle)).toEqual({
    ok: false,
    code: 'EFFECT_LINK_REFERENCE_MISSING',
    events: [],
  });
  expect(encodeSnapshot(staggered, registry)).toBe(before);
});
