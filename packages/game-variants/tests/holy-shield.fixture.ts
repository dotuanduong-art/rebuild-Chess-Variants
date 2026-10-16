import type {
  GameState,
  PieceInput,
  PieceType,
  PlayerSide,
  RootCommand,
} from '@variant-chess/shared-types';
import { PieceIdSchema } from '@variant-chess/shared-types';
import {
  createGame,
  createBoard,
  coordinateFromAlgebraic,
  resolveCommand,
  decodeEffectRecords,
} from '@variant-chess/game-core';
import type { RulesetBundle, TransactionOptions } from '@variant-chess/game-core';
import { createHolyShieldExperimentalRuleset } from '../src/index.js';

// Authoritative initial-board fixture; not a producer, summon operation or client-supplied origin.
export const unit = (
  id: string,
  currentType: PieceType,
  square: string,
  controller: PlayerSide = 'white',
  owner = controller,
): PieceInput => ({
  id,
  currentType,
  baseType: currentType,
  originalSide: owner,
  owner,
  controller,
  origin: 'ordinary-original',
  position: coordinateFromAlgebraic(square),
});
export const cast = (pieceId = 'bearer', side: PlayerSide = 'white') => ({
  authority: { kind: 'player' as const, side },
  command: {
    kind: 'skill' as const,
    skillId: 'guardian.holy_shield',
    intent: { kind: 'piece-target-v1' as const, pieceId: PieceIdSchema.parse(pieceId) },
  },
});
export function game(
  rules: RulesetBundle = createHolyShieldExperimentalRuleset({ white: true, black: true }),
  ap = 20,
  pieces: readonly PieceInput[] = [
    unit('bearer', 'rook', 'A1'),
    unit('attacker', 'rook', 'A4', 'black'),
    unit('wk', 'king', 'H1'),
    unit('bk', 'king', 'H15', 'black'),
  ],
  matchId = 'holy',
) {
  return createGame(
    { matchId, seed: 19, ap: { white: ap, black: ap }, board: createBoard(pieces) },
    rules,
  );
}
export function run(
  state: GameState,
  rules: RulesetBundle,
  command: RootCommand,
  side = state.turn.sideToAct,
  options?: TransactionOptions,
) {
  const result = resolveCommand(
    state,
    { authority: { kind: 'player', side }, command },
    rules,
    options,
  );
  if (!result.ok) throw new Error(result.code);
  return result;
}
export function finish(state: GameState, rules: RulesetBundle) {
  const side = state.turn.sideToAct;
  if (!state.turn.mainMoveUsed) {
    const king = state.board.pieces[side === 'white' ? 'wk' : 'bk']!;
    state = run(state, rules, {
      kind: 'move',
      pieceId: king.id,
      to: { file: king.position.file === 7 ? 8 : 7, rankIndex: king.position.rankIndex },
    }).state;
  }
  return state.turn.sideToAct === side ? run(state, rules, { kind: 'end' }).state : state;
}
export const effects = (state: GameState, rules: RulesetBundle) =>
  decodeEffectRecords(state.effects, rules.effectRegistry!, state);
