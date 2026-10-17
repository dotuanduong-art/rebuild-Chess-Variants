import { TransferenceOperationSchema } from '@variant-chess/shared-types';
import type {
  GameState,
  PlayerSide,
  RootCommand,
  TransferenceOperation,
} from '@variant-chess/shared-types';
import type { RulesetBundle } from './transaction.js';
import { planEffectRelocation } from './effect-relocation.js';
import { canonicalEncode, deepFreeze } from './canonical.js';
import { decodeEffectRecords } from './effects.js';

export interface TransferencePolicy {
  readonly kind: 'transference-v1';
  readonly requiredProfile: Readonly<{ id: string; version: string }>;
  readonly cost: number;
}

/** Same complete preflight at the trusted planner and independent root boundaries. No effect allowlist. */
export function preflightTransference(
  state: GameState,
  actor: PlayerSide,
  command: RootCommand,
  ruleset: RulesetBundle,
  supplied?: unknown,
) {
  const policy = ruleset.transference,
    profile = state.playerProfiles[actor];
  if (
    state.engineVersion !== '0.8.0' ||
    policy?.kind !== 'transference-v1' ||
    !ruleset.effectRuntime
  )
    throw new Error('UNSUPPORTED_TRANSFERENCE');
  if (
    actor !== state.turn.sideToAct ||
    profile?.id !== policy.requiredProfile.id ||
    profile.version !== policy.requiredProfile.version ||
    command.kind !== 'skill' ||
    command.skillId !== 'turtle.transference'
  )
    throw new Error('UNAUTHORIZED_TRANSFERENCE');
  if (command.intent?.kind !== 'two-piece-target-v1') throw new Error('INVALID_SKILL_INTENT');
  const { alliedPieceId, enemyPieceId } = command.intent;
  if (alliedPieceId === enemyPieceId) throw new Error('INVALID_TRANSFERENCE_TARGETS');
  const ally = Object.hasOwn(state.board.pieces, alliedPieceId)
    ? state.board.pieces[alliedPieceId]
    : undefined;
  const enemy = Object.hasOwn(state.board.pieces, enemyPieceId)
    ? state.board.pieces[enemyPieceId]
    : undefined;
  if (!ally || !enemy) throw new Error('PIECE_NOT_FOUND');
  if (ally.controller !== actor || enemy.controller === actor)
    throw new Error('INVALID_TRANSFERENCE_TARGETS');
  if (ally.currentType === 'king' || enemy.currentType === 'king')
    throw new Error('TRANSFERENCE_KING_INELIGIBLE');
  if (ally.origin === undefined || enemy.origin === undefined) throw new Error('UNSUPPORTED_UNIT');
  const operation: TransferenceOperation = {
    kind: 'transference_swap',
    schemaVersion: '1.0.0',
    source: {
      sourcePlayer: actor,
      sourceVariant: 'turtle',
      sourceSkill: 'turtle.transference',
      sourcePiece: null,
      sourceIncarnation: null,
    },
    pieceA: alliedPieceId,
    pieceB: enemyPieceId,
  };
  if (supplied !== undefined) {
    const parsed = TransferenceOperationSchema.safeParse(supplied);
    if (!parsed.success || canonicalEncode(parsed.data) !== canonicalEncode(operation))
      throw new Error('INVALID_TRANSFERENCE_OPERATION');
  }
  if (
    !decodeEffectRecords(state.effects, ruleset.effectRuntime.registry, state).some(
      (e) =>
        e.target.kind === 'piece' &&
        (e.target.pieceId === alliedPieceId || e.target.pieceId === enemyPieceId),
    )
  )
    throw new Error('EMPTY_EFFECT_SETS');
  const plan = planEffectRelocation(
    state,
    { kind: 'effect_sets_swap', pieceA: alliedPieceId, pieceB: enemyPieceId },
    ruleset.effectRuntime,
    !!ruleset.repetition,
  );
  return deepFreeze({ ...plan, operation });
}
