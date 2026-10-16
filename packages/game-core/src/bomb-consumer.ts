import { CoordinateSchema } from '@variant-chess/shared-types';
import type { Coordinate, PieceId } from '@variant-chess/shared-types';
import type { Board } from './board.js';
import type { EffectDefinition, EffectInstance, PayloadSchema } from './effects.js';
import type {
  CommittedDeathReactionBinding,
  CommittedDeathReactionContext,
} from './committed-death.js';
import { cloneData, deepFreeze } from './canonical.js';

export const BOMB_PAYLOAD_SCHEMA: PayloadSchema<Record<string, never>> = Object.freeze({
  parse(value: unknown) {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).length ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    )
      throw new Error('INVALID_BOMB_PAYLOAD');
    return Object.freeze({});
  },
});
const common = {
  targets: ['piece'],
  family: { id: 'bomb', policy: 'unique-target-ignore' },
  ownership: { kind: 'source-player' },
  visibility: { kind: 'public' },
  unlinked: true,
  lifetime: { kind: 'permanent' },
  stacking: { key: 'type-target', mode: 'ignore' },
  capabilities: ['react:committed-death-v1'],
  deathReaction: { mode: 'bomb-blast-v1', handlerId: 'bomb.death.v1' },
  enabled: false,
  missingProducerFields: [
    'target/King eligibility',
    'required source references',
    'removal permissions',
    'producer-specific fixtures',
  ],
} as const;
export const BOMB_CONSUMER_CONTRACTS = deepFreeze({
  charge: { ...common, definitionId: 'effect.bomb.charge', category: 'buff' },
  mine: { ...common, definitionId: 'effect.bomb.mine', category: 'debuff' },
} as const);

/** Public pure planner: current occupants in row-major order, never mutation or scheduling. */
export function planBombBlast(board: Board, rawCenter: Coordinate): readonly PieceId[] {
  const center = CoordinateSchema.parse(cloneData(rawCenter));
  return Object.freeze(
    Object.values(board.pieces)
      .filter(
        (p) =>
          p.currentType !== 'king' &&
          Math.abs(p.position.file - center.file) <= 1 &&
          Math.abs(p.position.rankIndex - center.rankIndex) <= 1,
      )
      .sort(
        (a, b) => a.position.rankIndex - b.position.rankIndex || a.position.file - b.position.file,
      )
      .map((p) => p.id),
  );
}

/** Concrete authorization is bounded here, not a scattered effect-name switch in generic core. */
export function assertBombReactionDefinition(
  definition: EffectDefinition,
  instance: Pick<EffectInstance, 'groupId' | 'references' | 'payload'>,
): void {
  const approved = Object.values(BOMB_CONSUMER_CONTRACTS).find(
    (d) => d.definitionId === definition.typeId,
  );
  if (
    !approved ||
    definition.category !== approved.category ||
    definition.family?.id !== 'bomb' ||
    definition.family.policy !== 'unique-target-ignore' ||
    definition.targets.length !== 1 ||
    definition.targets[0] !== 'piece' ||
    definition.lifetime.kind !== 'permanent' ||
    definition.ownership.kind !== 'source-player' ||
    definition.visibility.kind !== 'public' ||
    definition.links ||
    definition.triggers.length ||
    definition.captureDefense ||
    definition.actionRestrictions?.length ||
    instance.groupId !== null ||
    instance.references?.length ||
    !definition.capabilities.includes('react:committed-death-v1')
  )
    throw new Error('UNSUPPORTED_RUNTIME');
  BOMB_PAYLOAD_SCHEMA.parse(instance.payload);
}
export const BOMB_DEATH_REACTION_BINDINGS: Readonly<Record<string, CommittedDeathReactionBinding>> =
  Object.freeze({
    'bomb.death.v1': Object.freeze({
      mode: 'bomb-blast-v1',
      order: 0,
      plan: (context: CommittedDeathReactionContext) =>
        planBombBlast(context.state.board, context.death.victim.position),
    }),
  });
