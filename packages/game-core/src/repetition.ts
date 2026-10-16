import type { GameState, SerializableValue } from '@variant-chess/shared-types';
import { canonicalEncode, cloneData, deepFreeze } from './canonical.js';

export type RepetitionProjection = (state: GameState) => {
  readonly effects: SerializableValue;
  readonly delayedActions: SerializableValue;
  readonly variantState: SerializableValue;
};
export function relativeDeadline(
  state: GameState,
  deadline: GameState['effects'][number]['deadline'],
) {
  if (!deadline) return null;
  const ordinal = Math.floor((state.turn.plyIndex + (deadline.side === 'white' ? 2 : 1)) / 2);
  return {
    side: deadline.side,
    boundary: deadline.boundary,
    remaining: deadline.ordinal - ordinal,
  };
}
export function repetitionKey(state: GameState, project?: RepetitionProjection): string {
  const opaque =
    state.effects.length ||
    state.delayedActions.length ||
    Object.keys(state.variantState.white).length ||
    Object.keys(state.variantState.black).length;
  if (opaque && !project) throw new Error('REPETITION_SEMANTICS_REQUIRED');
  const semantic = project
    ? project(deepFreeze(cloneData(state)))
    : { effects: [], delayedActions: [], variantState: { white: {}, black: {} } };
  const pieces = Object.values(state.board.pieces)
    .sort(
      (a, b) =>
        a.position.rankIndex * 15 + a.position.file - (b.position.rankIndex * 15 + b.position.file),
    )
    .map(({ position, originalSide, owner, controller, baseType, currentType, origin }) => ({
      position,
      originalSide,
      owner,
      controller,
      baseType,
      currentType,
      origin: origin ?? null,
    }));
  return canonicalEncode({
    pieces,
    playerProfiles: state.playerProfiles,
    sideToAct: state.turn.sideToAct,
    ap: state.ap,
    ...semantic,
  });
}
export function recordActionReady(state: GameState, project?: RepetitionProjection): GameState {
  if (state.terminal.status !== 'ongoing' || state.history.lastCountedPly === state.turn.plyIndex)
    return state;
  const key = repetitionKey(state, project);
  const count = (state.history.repetition[key] ?? 0) + 1;
  return {
    ...state,
    terminal: count >= 3 ? { status: 'draw', reason: 'threefold_repetition' } : state.terminal,
    history: {
      ...state.history,
      repetition: { ...state.history.repetition, [key]: count },
      lastCountedPly: state.turn.plyIndex,
    },
  };
}
