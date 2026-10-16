import type { EffectApplication, GameState, PlayerSide } from '@variant-chess/shared-types';
import {
  createEffectRegistry,
  createEffectRuntime,
  createGame,
  createBoard,
  resolveCommand,
  decodeEffectRecords,
  SHIELD_CAPTURE_DEFENSE_BINDINGS,
} from '../src/index.js';
import type { DerivedOperation, EffectDefinition, RulesetBundle } from '../src/index.js';
import { batchDefinitions } from './batch-a-fixture.js';
import { piece } from './fixtures.js';

// SYNTHETIC_TEST_ONLY consumer operations: no actual Holy Shield skill, target planner or AP cost.
export function sourceDefinition(variant = 'guardian', skill = 'guardian.holy_shield') {
  const base = batchDefinitions().find((d) => d.typeId === 'effect.shield')!;
  return {
    ...base,
    sourceAttribution: {
      ...base.sourceAttribution,
      profile: {
        kind: 'player-originated-v1' as const,
        sourceVariant: variant,
        sourceSkill: skill,
      },
    },
    lifetime: {
      kind: 'producer-rounds' as const,
      schemaVersion: '1.0.0' as const,
      boundary: 'end' as const,
      producers: [
        {
          id: 'synthetic.null-source',
          version: '1.0.0',
          sourceVariant: variant,
          sourceSkill: skill,
          allowedRounds: [2],
          requireCaster: false,
          supportsIncarnation: false,
        },
      ],
    },
  };
}

export function shield(
  target: string,
  sourcePlayer: PlayerSide = 'white',
  patch: Partial<EffectApplication> = {},
): EffectApplication {
  return {
    kind: 'effect_apply',
    definitionId: 'effect.shield',
    definitionVersion: '1.0.0',
    target: { kind: 'piece', pieceId: target as never },
    sourcePlayer,
    sourceVariant: 'guardian',
    sourceSkill: 'guardian.holy_shield',
    sourcePiece: null,
    sourceIncarnation: null,
    duration: {
      schemaVersion: '1.0.0',
      producerId: 'synthetic.null-source',
      producerVersion: '1.0.0',
      rounds: 2,
    },
    payload: {},
    groupId: null,
    ...patch,
  };
}

export function sourceRules(
  operations: readonly DerivedOperation[],
  definition: EffectDefinition = sourceDefinition(),
  more: Readonly<Record<string, readonly DerivedOperation[]>> = {},
  scope = 'base',
): RulesetBundle {
  const registry = createEffectRegistry([definition]);
  return Object.freeze({
    hash: `SYNTHETIC_TEST_ONLY-5b-${scope}-${definition.typeId}-${definition.sourceAttribution.profile?.sourceVariant}-${definition.sourceAttribution.profile?.sourceSkill}-v1`,
    version: '0.1.0',
    effectRegistry: registry,
    effectRuntime: createEffectRuntime(registry, {
      captureDefense: SHIELD_CAPTURE_DEFENSE_BINDINGS,
      eligibility: { 'synthetic.destination': () => true },
    }),
    skills: Object.freeze(
      Object.fromEntries(
        Object.entries({ 'synthetic.setup': operations, ...more }).map(([id, ops]) => [
          id,
          Object.freeze({ cost: 0, operations: Object.freeze([...ops]) }),
        ]),
      ),
    ),
  });
}

export const input = (skillId = 'synthetic.setup', side: PlayerSide = 'white') => ({
  authority: { kind: 'player', side },
  command: { kind: 'skill', skillId },
});
export function game(
  rules: RulesetBundle,
  matchId = 'source',
  bearer = 'bearer',
  attacker = 'attacker',
) {
  return createGame(
    {
      matchId,
      seed: 37,
      ap: { white: 20, black: 20 },
      board: createBoard([
        piece(bearer, 'pawn', 'A15'),
        piece(attacker, 'rook', 'A12', 'black'),
        piece('spare', 'pawn', 'B15'),
      ]),
    },
    rules,
  );
}
export function setup(state: GameState, rules: RulesetBundle) {
  const result = resolveCommand(state, input(), rules);
  if (!result.ok) throw new Error(result.code);
  return result;
}
export const effects = (s: GameState, r: RulesetBundle) =>
  decodeEffectRecords(s.effects, r.effectRegistry!, s);
