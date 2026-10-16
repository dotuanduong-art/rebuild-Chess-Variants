import type { DomainEvent, GameState, PlayerSide } from '@variant-chess/shared-types';
import { DomainEventSchema } from '@variant-chess/shared-types';
import type { EffectDefinition, EffectInstance } from './effects.js';
import { decodeEffectRecords } from './effects.js';
import type { EffectRuntime } from './effect-runtime.js';
import { effectOrder } from './effect-runtime.js';
import type { DerivedOperation } from './transaction.js';
import { cloneData, deepFreeze } from './canonical.js';

export interface EffectTriggerContext {
  readonly state: GameState;
  readonly instance: EffectInstance;
  readonly event: DomainEvent;
  readonly stage: 'committed' | 'boundary' | 'removal';
  readonly lifecycle:
    'fact' | 'death' | 'source-boundary' | 'application' | 'expiry' | 'cleanup' | 'relocation';
  readonly source: {
    readonly player: PlayerSide;
    readonly variant: string | null;
    readonly skill: string | null;
    readonly piece: string | null;
  };
  readonly owner: PlayerSide | null;
  readonly controller: PlayerSide | null;
}
/** Explicit isolated observers; enabling this binding does not approve concrete gameplay reactions. */
export interface EffectTriggerHandler {
  readonly mode: 'synthetic-v1';
  readonly order: number;
  readonly react: (context: EffectTriggerContext) => readonly DerivedOperation[];
}
function eventStage(kind: string): EffectTriggerContext['stage'] {
  return kind === 'effect_removed'
    ? 'removal'
    : kind === 'turn_started' || kind === 'turn_ended'
      ? 'boundary'
      : 'committed';
}
export function assertEffectTriggers(definition: EffectDefinition, runtime: EffectRuntime): void {
  const kinds: readonly string[] = DomainEventSchema.options.map(
    (option) => option.shape.kind.value,
  );
  for (const capability of definition.capabilities)
    if (
      !(capability === 'react:committed-death-v1' && definition.deathReaction) &&
      !definition.triggers.some((trigger) => capability === `observe:${trigger.event}`)
    )
      throw new Error('UNSUPPORTED_RUNTIME');
  for (const trigger of definition.triggers) {
    if (trigger.stage === 'proposed') throw new Error('UNSUPPORTED_RUNTIME');
    const handler = Object.hasOwn(runtime.triggers ?? {}, trigger.handlerId)
      ? runtime.triggers?.[trigger.handlerId]
      : undefined;
    if (
      !handler ||
      handler.mode !== 'synthetic-v1' ||
      !Number.isSafeInteger(handler.order) ||
      typeof handler.react !== 'function'
    )
      throw new Error('UNSUPPORTED_RUNTIME');
    if (
      !kinds.includes(trigger.event) ||
      trigger.stage !== eventStage(trigger.event) ||
      !definition.capabilities.includes(`observe:${trigger.event}`)
    )
      throw new Error('INVALID_EFFECT_TRIGGER');
  }
}
/** Listener snapshot at the committed fact. Retired instances observe only their own removal. */
export function dispatchEffectTriggers(
  state: GameState,
  event: DomainEvent,
  runtime: EffectRuntime,
  once: Set<string>,
  retired: readonly EffectInstance[] = [],
  retiredState: GameState = state,
): readonly DerivedOperation[] {
  const active = decodeEffectRecords(state.effects, runtime.registry, state);
  const listeners = [
    ...active,
    ...retired.filter(
      (instance) =>
        event.kind === 'effect_removed' &&
        event.payload.effectId === instance.id &&
        !active.some((e) => e.id === instance.id),
    ),
  ];
  const stage = eventStage(event.kind);
  const jobs = listeners
    .flatMap((instance) =>
      runtime.registry
        .get(instance.definitionId)
        .triggers.filter((trigger) => trigger.event === event.kind && trigger.stage === stage)
        .filter(
          () =>
            stage !== 'boundary' ||
            ((event.kind === 'turn_started' || event.kind === 'turn_ended') &&
              event.payload.side === instance.sourcePlayer),
        )
        .map((trigger) => ({ instance, trigger, handler: runtime.triggers![trigger.handlerId]! })),
    )
    .sort(
      (a, b) =>
        a.handler.order - b.handler.order ||
        compare(a.trigger.handlerId, b.trigger.handlerId) ||
        effectOrder(a.instance, b.instance) ||
        compare(a.trigger.id, b.trigger.id),
    );
  const operations: DerivedOperation[] = [];
  for (const { instance, trigger, handler } of jobs) {
    const key = JSON.stringify([event.id, instance.id, trigger.id]);
    if (once.has(key)) continue;
    once.add(key);
    const targetState = active.some((e) => e.id === instance.id) ? state : retiredState;
    const piece =
      instance.target.kind === 'piece'
        ? targetState.board.pieces[instance.target.pieceId]
        : undefined;
    const targetOwner =
      instance.target.kind === 'player' ? instance.target.side : (piece?.owner ?? null);
    const controller =
      instance.target.kind === 'player' ? instance.target.side : (piece?.controller ?? null);
    const ownership = runtime.registry.get(instance.definitionId).ownership;
    const owner =
      ownership.kind === 'source-player'
        ? instance.sourcePlayer
        : ownership.kind === 'target-controller'
          ? controller
          : targetOwner;
    const lifecycle: EffectTriggerContext['lifecycle'] =
      stage === 'boundary'
        ? 'source-boundary'
        : event.kind === 'effect_removed'
          ? event.payload.reason === 'expired'
            ? 'expiry'
            : 'cleanup'
          : event.kind === 'capture_committed' || event.kind === 'piece_destroyed'
            ? 'death'
            : event.kind === 'effect_relocated' || event.kind === 'effect_sets_swapped'
              ? 'relocation'
              : event.kind === 'effect_applied' ||
                  event.kind === 'effect_refreshed' ||
                  event.kind === 'effect_stacked'
                ? 'application'
                : 'fact';
    const context = deepFreeze(
      cloneData({
        state,
        instance,
        event,
        stage,
        lifecycle,
        owner,
        controller,
        source: {
          player: instance.sourcePlayer,
          variant: instance.sourceVariant,
          skill: instance.sourceSkill,
          piece: instance.sourcePiece,
        },
      }),
    );
    operations.push(...cloneData(handler.react(context)));
  }
  return operations;
}
function compare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
