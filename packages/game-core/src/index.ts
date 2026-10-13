import { CONTRACT_SCHEMA_VERSION } from '@variant-chess/shared-types';

export const CORE_API_VERSION = CONTRACT_SCHEMA_VERSION;

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
