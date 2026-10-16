import type {
  GameState,
  Piece,
  PieceId,
  PlayerSide,
  EffectSourceIdentity,
} from '@variant-chess/shared-types';
import type { EffectInstance } from './effects.js';
import type { EffectRuntime } from './effect-runtime.js';
import { assertBombReactionDefinition, planBombBlast } from './bomb-consumer.js';
import { cloneData, deepFreeze, canonicalEncode } from './canonical.js';

/** Private root-transport data, deliberately absent from DomainEvent payloads and GameState. */
export interface CommittedDeathContext {
  readonly victim: Pick<Piece, 'id' | 'owner' | 'controller' | 'position' | 'currentType'>;
  readonly reason: 'capture' | 'destruction';
  readonly attackerId: PieceId | null;
  readonly rootActor: PlayerSide | null;
  readonly transactionId: string;
  readonly operationId: string;
  readonly causeId: string;
  readonly destructionSource: Readonly<EffectSourceIdentity> | null;
  readonly retiredEffects: readonly EffectInstance[];
}
export interface CommittedDeathReactionContext {
  readonly state: GameState;
  readonly death: CommittedDeathContext;
  readonly instance: EffectInstance;
}
export interface CommittedDeathReactionBinding {
  readonly mode: 'bomb-blast-v1';
  readonly order: number;
  readonly plan: (context: CommittedDeathReactionContext) => readonly PieceId[];
}
export function assertDeathReaction(
  instance: Pick<EffectInstance, 'definitionId' | 'groupId' | 'references' | 'payload'>,
  runtime: EffectRuntime,
): void {
  const definition = runtime.registry.get(instance.definitionId),
    declaration = definition.deathReaction;
  if (!declaration) return;
  const binding = Object.hasOwn(runtime.deathReactions ?? {}, declaration.handlerId)
    ? runtime.deathReactions?.[declaration.handlerId]
    : undefined;
  if (
    declaration.mode !== 'bomb-blast-v1' ||
    !binding ||
    binding.mode !== declaration.mode ||
    !Number.isSafeInteger(binding.order) ||
    typeof binding.plan !== 'function'
  )
    throw new Error('UNSUPPORTED_RUNTIME');
  assertBombReactionDefinition(definition, instance);
}
export function deathReactionInstances(
  death: CommittedDeathContext,
  runtime: EffectRuntime,
): readonly EffectInstance[] {
  return death.retiredEffects
    .filter((instance) => {
      if (!runtime.registry.get(instance.definitionId).deathReaction) return false;
      assertDeathReaction(instance, runtime);
      if (
        (death.reason !== 'capture' && death.reason !== 'destruction') ||
        instance.target.kind !== 'piece' ||
        instance.target.pieceId !== death.victim.id
      )
        throw new Error('INVALID_COMMITTED_DEATH');
      return true;
    })
    .sort((a, b) => {
      const ad = runtime.registry.get(a.definitionId).deathReaction!,
        bd = runtime.registry.get(b.definitionId).deathReaction!;
      return (
        runtime.deathReactions![ad.handlerId]!.order -
          runtime.deathReactions![bd.handlerId]!.order ||
        (ad.handlerId < bd.handlerId ? -1 : ad.handlerId > bd.handlerId ? 1 : 0) ||
        a.appliedSequence - b.appliedSequence ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      );
    });
}
export function planDeathReaction(
  state: GameState,
  death: CommittedDeathContext,
  instance: EffectInstance,
  runtime: EffectRuntime,
): readonly PieceId[] {
  assertDeathReaction(instance, runtime);
  const declaration = runtime.registry.get(instance.definitionId).deathReaction!;
  const context = deepFreeze(cloneData({ state, death, instance }));
  const targets = cloneData(runtime.deathReactions![declaration.handlerId]!.plan(context));
  // A reviewed concrete mode cannot expand, omit, reorder or duplicate the approved blast set.
  if (
    canonicalEncode(targets) !== canonicalEncode(planBombBlast(state.board, death.victim.position))
  )
    throw new Error('INVALID_BOMB_PLAN');
  return Object.freeze(targets);
}
