import { CONTRACT_SCHEMA_VERSION } from '@variant-chess/shared-types';

export const CORE_API_VERSION = CONTRACT_SCHEMA_VERSION;
export {
  createEffectRegistry,
  validateEffectPayload,
  validateEffectInstance,
  validateEffectInstances,
  encodeEffectRecords,
  decodeEffectRecords,
} from './effects.js';
export type {
  EffectDefinition,
  EffectInstance,
  EffectRegistry,
  PayloadSchema,
  Immutable,
  ImmutableJson,
  EffectRepetitionContext,
  EffectRepetitionProjector,
  EffectValidationContext,
} from './effects.js';
export { recordReplay, executeReplay } from './replay.js';
export type { RecordReplayResult } from './replay.js';
export { repetitionKey, relativeDeadline } from './repetition.js';
export type { RepetitionProjection } from './repetition.js';
export { canonicalEncode } from './canonical.js';
export { encodeSnapshot, decodeSnapshot, cloneSnapshot, fullStateHash } from './snapshot.js';
export type { FullStateHash } from './snapshot.js';
export { createGame, assertGameState, BASE_RULESET_ID, allocateGameId } from './state.js';
export type { GameConfig, RulesetIdentity } from './state.js';
export { resolveCommand } from './transaction.js';
export type {
  TransactionResult,
  RulesetBundle,
  DerivedOperation,
  EventHandler,
  CaptureInterceptor,
  TransactionOptions,
} from './transaction.js';
export { createRng, nextRandom, chooseCanonical, RNG_VERSION } from './random.js';
export type { RngState } from './random.js';

export { createAPState, debitAP, awardPromotionAP, getPieceAPValue, settleDeathAP } from './ap.js';
export type { APState, APRejection, APResult, DeathOutcome } from './ap.js';

export {
  createBasePosition,
  endBaseTurn,
  applyBaseMainMove,
  applyBaseDestruction,
  commitNormalSkillUsage,
  NORMAL_TURN_POLICY,
} from './base-game.js';
export type {
  BasePosition,
  BaseTerminal,
  TurnState,
  TurnBoundary,
  TurnPolicy,
  BaseOperationResult,
  BaseRejection,
} from './base-game.js';

export {
  isInBounds,
  coordinateToIndex,
  coordinateFromIndex,
  coordinateFromAlgebraic,
  coordinateToAlgebraic,
} from './coordinates.js';
export { createBoard, createInitialBoard, getPiece, getPieceAt } from './board.js';
export type { Board } from './board.js';
export { generateMovementGeometry, generateBaseMoves } from './movement.js';
export type { MovementPattern, MovementCandidate, MovementModifier } from './movement.js';

// Identity only. Gameplay planner/state interfaces belong to Phase 01B and later.
export interface VariantPluginDescriptor {
  readonly id: string;
  readonly version: string;
}
