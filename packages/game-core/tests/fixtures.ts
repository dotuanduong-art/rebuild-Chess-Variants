import type { PieceInput, PieceType, PlayerSide } from '@variant-chess/shared-types';
import { coordinateFromAlgebraic } from '../src/index.js';

export function piece(
  id: string,
  type: PieceType,
  square: string,
  controller: PlayerSide = 'white',
  owner: PlayerSide = controller,
): PieceInput {
  return {
    id,
    originalSide: owner,
    owner,
    controller,
    baseType: type,
    currentType: type,
    position: coordinateFromAlgebraic(square),
  };
}
