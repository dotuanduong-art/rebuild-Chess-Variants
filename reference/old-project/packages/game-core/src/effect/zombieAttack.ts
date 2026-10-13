import { getPieceOwner, type Piece } from '../pieces/Piece';

export function isZombieBite(
  attacker: Piece | null | undefined,
  target: Piece | null | undefined,
): boolean {
  return !!(
    attacker &&
    target &&
    attacker.effects?.some(effect => effect.type === 'zombie') &&
    getPieceOwner(target) !== getPieceOwner(attacker) &&
    !target.effects?.some(effect => effect.type === 'walker')
  );
}
