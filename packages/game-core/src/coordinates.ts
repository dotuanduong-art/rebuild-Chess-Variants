import { BOARD_CELL_COUNT, BOARD_SIZE } from '@variant-chess/shared-types';
import type { Coordinate } from '@variant-chess/shared-types';

export function isInBounds(position: Coordinate): boolean {
  return (
    Number.isInteger(position.file) &&
    Number.isInteger(position.rankIndex) &&
    position.file >= 0 &&
    position.file < BOARD_SIZE &&
    position.rankIndex >= 0 &&
    position.rankIndex < BOARD_SIZE
  );
}

export function coordinateToIndex(position: Coordinate): number {
  if (!isInBounds(position)) throw new RangeError('Coordinate is outside the 15×15 board');
  return position.rankIndex * BOARD_SIZE + position.file;
}

export function coordinateFromIndex(index: number): Coordinate {
  if (!Number.isInteger(index) || index < 0 || index >= BOARD_CELL_COUNT) {
    throw new RangeError('Cell index must be an integer from 0 to 224');
  }
  return Object.freeze({ file: index % BOARD_SIZE, rankIndex: Math.floor(index / BOARD_SIZE) });
}

export function coordinateFromAlgebraic(square: string): Coordinate {
  if (!/^[A-O](?:[1-9]|1[0-5])$/.test(square)) {
    throw new RangeError('Square must be canonical A1 through O15');
  }
  return Object.freeze({ file: square.charCodeAt(0) - 65, rankIndex: Number(square.slice(1)) - 1 });
}

export function coordinateToAlgebraic(position: Coordinate): string {
  coordinateToIndex(position);
  return `${String.fromCharCode(65 + position.file)}${position.rankIndex + 1}`;
}
