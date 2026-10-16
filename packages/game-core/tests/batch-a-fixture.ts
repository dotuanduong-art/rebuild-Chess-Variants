import type {
  EffectApplication,
  GameState,
  PieceInput,
  PlayerSide,
  RootCommand,
} from '@variant-chess/shared-types';
import {
  createBoard,
  createGame,
  createEffectRegistry,
  createEffectRuntime,
  resolveCommand,
  decodeEffectRecords,
  coordinateFromAlgebraic,
  BOMB_CONSUMER_CONTRACTS,
  BOMB_PAYLOAD_SCHEMA,
  BOMB_DEATH_REACTION_BINDINGS,
  STUN_CONSUMER_CONTRACT,
  STUN_PAYLOAD_SCHEMA,
  STUN_RESTRICTION_BINDINGS,
  SHIELD_CONSUMER_CONTRACT,
  SHIELD_PAYLOAD_SCHEMA,
  SHIELD_CAPTURE_DEFENSE_BINDINGS,
} from '../src/index.js';
import type { DerivedOperation, EffectDefinition, RulesetBundle } from '../src/index.js';
import { piece } from './fixtures.js';

export const SYNTHETIC_TEST_ONLY = 'SYNTHETIC_TEST_ONLY' as const;
export const IDS = {
  stun: 'effect.stun',
  shield: 'effect.shield',
  charge: 'effect.bomb.charge',
  mine: 'effect.bomb.mine',
} as const;
type Kind = keyof typeof IDS;
const profiles = [
  { id: 'synthetic.alpha', sourceVariant: 'synthetic.batch-a', sourceSkill: 'synthetic.alpha' },
  { id: 'synthetic.beta', sourceVariant: 'synthetic.batch-a', sourceSkill: 'synthetic.beta' },
  { id: 'synthetic.other', sourceVariant: 'synthetic.other', sourceSkill: 'synthetic.alpha' },
] as const;

// All N, eligibility and cleanup permissions below are SYNTHETIC_TEST_ONLY, never producer approval.
export function batchDefinitions(): readonly EffectDefinition[] {
  const common = {
    schemaVersion: '1.0.0',
    targets: ['piece'],
    sourceAttribution: { kind: 'preserve-source', requiredRefs: ['variant', 'skill'] },
    ownership: { kind: 'source-player' },
    kingEligibility: { kind: 'allowed' },
    eligibility: { policyId: 'synthetic.destination' },
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
    repetition: { projectionId: 'synthetic.batch-a.raw-source-v1' },
    // Deliberately preserves raw source refs: caster/incarnation semantic normalization remains an enablement gate.
    repetitionProjector: (e, c) => ({
      target: c.target,
      remaining: c.remainingLifetime,
      source: {
        player: e.sourcePlayer,
        variant: e.sourceVariant,
        skill: e.sourceSkill,
        piece: e.sourcePiece,
        incarnation: e.sourceIncarnation ?? null,
      },
    }),
  } satisfies Partial<EffectDefinition>;
  return (Object.keys(IDS) as Kind[]).map((kind): EffectDefinition => {
    if (kind === 'charge' || kind === 'mine') {
      const consumer = BOMB_CONSUMER_CONTRACTS[kind];
      return {
        ...common,
        typeId: IDS[kind],
        category: consumer.category,
        family: consumer.family,
        lifetime: consumer.lifetime,
        stacking: consumer.stacking,
        capabilities: consumer.capabilities,
        deathReaction: consumer.deathReaction,
        payloadSchema: BOMB_PAYLOAD_SCHEMA,
      };
    }
    return {
      ...common,
      typeId: IDS[kind],
      category: kind === 'stun' ? 'debuff' : 'buff',
      lifetime: {
        kind: 'producer-rounds',
        schemaVersion: '1.0.0',
        boundary: 'end',
        producers: profiles.map((p) => ({
          ...p,
          version: '1.0.0',
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
      ...(kind === 'stun'
        ? { actionRestrictions: STUN_CONSUMER_CONTRACT.actionRestrictions }
        : { captureDefense: SHIELD_CONSUMER_CONTRACT.captureDefense }),
      payloadSchema: kind === 'stun' ? STUN_PAYLOAD_SCHEMA : SHIELD_PAYLOAD_SCHEMA,
    };
  });
}

export function batchRuleset(
  name: string,
  skills: Readonly<Record<string, readonly DerivedOperation[]>>,
): RulesetBundle {
  const registry = createEffectRegistry(batchDefinitions());
  return Object.freeze({
    hash: `SYNTHETIC_TEST_ONLY-batch-a-02b4-${name}`,
    version: '0.1.0',
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      restrictions: STUN_RESTRICTION_BINDINGS,
      captureDefense: SHIELD_CAPTURE_DEFENSE_BINDINGS,
      deathReactions: BOMB_DEATH_REACTION_BINDINGS,
      eligibility: {
        'synthetic.destination': (instance) =>
          instance.target.kind === 'piece' && instance.target.pieceId !== 'blocked-destination',
      },
    }),
    skills: Object.freeze(
      Object.fromEntries(
        Object.entries(skills).map(([id, operations]) => [
          id,
          Object.freeze({ cost: 1, operations: Object.freeze([...operations]) }),
        ]),
      ),
    ),
  });
}

export function application(
  kind: Kind,
  target: string,
  patch: Partial<EffectApplication> = {},
): EffectApplication {
  return {
    kind: 'effect_apply',
    definitionId: IDS[kind],
    definitionVersion: '1.0.0',
    target: { kind: 'piece', pieceId: target as never },
    sourcePlayer: 'actor',
    sourceVariant: 'synthetic.batch-a',
    sourceSkill: 'synthetic.alpha',
    sourcePiece: null,
    ...(kind === 'stun' || kind === 'shield'
      ? {
          duration: {
            schemaVersion: '1.0.0',
            producerId: 'synthetic.alpha',
            producerVersion: '1.0.0',
            rounds: 1,
          },
        }
      : {}),
    payload: {},
    groupId: null,
    ...patch,
  };
}
export const duration = (
  rounds: number,
  producerId = 'synthetic.alpha',
): NonNullable<EffectApplication['duration']> => ({
  schemaVersion: '1.0.0',
  producerId,
  producerVersion: '1.0.0',
  rounds,
});
export const playerInput = (command: RootCommand, side: PlayerSide = 'white') => ({
  authority: { kind: 'player', side },
  command,
});
export function play(state: GameState, rules: RulesetBundle, command: RootCommand) {
  const result = resolveCommand(state, playerInput(command, state.turn.sideToAct), rules);
  if (!result.ok) throw new Error(result.code);
  return result;
}
export const cast = (state: GameState, rules: RulesetBundle, skillId = 'setup') =>
  play(state, rules, { kind: 'skill', skillId });
export const records = (state: GameState, rules: RulesetBundle) =>
  decodeEffectRecords(state.effects, rules.effectRegistry!, state);
export const move = (pieceId: string, square: string): RootCommand => ({
  kind: 'move',
  pieceId: pieceId as never,
  to: coordinateFromAlgebraic(square),
});
export const end: RootCommand = { kind: 'end' };
export const systemDestroy = (state: GameState, rules: RulesetBundle, pieceId: string) =>
  resolveCommand(
    state,
    { authority: { kind: 'system' }, command: { kind: 'destroy', pieceId } },
    rules,
  );
export function batchGame(
  rules: RulesetBundle,
  pieces: readonly PieceInput[],
  actor: PlayerSide = 'white',
  matchId = 'batch',
) {
  let state = createGame(
    {
      matchId,
      seed: 37,
      ap: { white: 20, black: 20 },
      board: createBoard([...pieces, ...(actor === 'black' ? [piece('tempo', 'pawn', 'O1')] : [])]),
    },
    rules,
  );
  if (actor === 'black') {
    state = play(state, rules, move('tempo', 'O2')).state;
    state = play(state, rules, end).state;
  }
  return state;
}
