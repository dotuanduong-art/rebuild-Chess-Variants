import { ForcedRepositionOperationSchema } from '@variant-chess/shared-types';
import type {
  GameState,
  PieceId,
  PlayerSide,
  RootCommand,
  ForcedRepositionMove,
  ForcedRepositionOperation,
} from '@variant-chess/shared-types';
import { createBoard, getPiece, getPieceAt } from './board.js';
import { isInBounds } from './coordinates.js';
import { canonicalEncode, deepFreeze } from './canonical.js';
import { assertEffectRuntimeState, validateEligibility } from './effect-runtime.js';
import { decodeEffectRecords } from './effects.js';
import type { RulesetBundle } from './transaction.js';

export type { ForcedRepositionMove } from '@variant-chess/shared-types';
export interface ForcedRepositionPolicy {
  readonly kind: 'shockwave-v1';
  readonly sourceVariant: string;
  readonly sourceSkill: string;
  readonly requiredProfile: Readonly<{ id: string; version: string }>;
}

/** Pure B2 geometry. The skill planner owns the approved zero-displacement rejection. */
export function planRadialReposition(
  state: GameState,
  actor: PlayerSide,
  centerPieceId: PieceId,
): readonly ForcedRepositionMove[] {
  const center = getPiece(state.board, centerPieceId);
  if (!center) throw new Error('PIECE_NOT_FOUND');
  if (center.controller !== actor) throw new Error('NOT_CONTROLLED');
  if (center.origin !== 'ordinary-original') throw new Error('UNSUPPORTED_UNIT');
  if (center.currentType === 'king') throw new Error('FORCED_REPOSITION_KING_INELIGIBLE');
  const moves: ForcedRepositionMove[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const from = { file: center.position.file + dx, rankIndex: center.position.rankIndex + dy };
      if (!isInBounds(from)) continue;
      const bearer = getPieceAt(state.board, from);
      if (
        !bearer ||
        bearer.controller === actor ||
        bearer.origin !== 'ordinary-original' ||
        bearer.currentType === 'king'
      )
        continue;
      const to = { file: from.file + dx, rankIndex: from.rankIndex + dy };
      if (!isInBounds(to) || getPieceAt(state.board, to)) continue;
      // Radial destinations2d are injective and cannot overlap the initial neighbor set d.
      moves.push({ pieceId: bearer.id, from: { ...bearer.position }, to });
    }
  return deepFreeze(moves);
}

/** Core independently recomputes the complete approved assignment before constructing one final board. */
export function applyForcedReposition(
  state: GameState,
  raw: ForcedRepositionOperation,
  actor: PlayerSide,
  command: RootCommand,
  ruleset: RulesetBundle,
) {
  const parsed = ForcedRepositionOperationSchema.safeParse(raw);
  if (!parsed.success) throw new Error('INVALID_FORCED_REPOSITION');
  const operation = parsed.data;
  const policy = ruleset.forcedReposition;
  const profile = state.playerProfiles[actor];
  const source = operation.cause.source;
  if (!policy || policy.kind !== operation.cause.kind)
    throw new Error('UNSUPPORTED_FORCED_REPOSITION');
  if (
    actor !== state.turn.sideToAct ||
    source.sourcePlayer !== actor ||
    source.sourceVariant !== policy.sourceVariant ||
    source.sourceSkill !== policy.sourceSkill ||
    profile?.id !== policy.requiredProfile.id ||
    profile.version !== policy.requiredProfile.version ||
    command.kind !== 'skill' ||
    command.skillId !== policy.sourceSkill ||
    command.intent?.kind !== 'piece-target-v1' ||
    command.intent.pieceId !== operation.centerPieceId
  )
    throw new Error('UNAUTHORIZED_FORCED_REPOSITION');
  if (
    (ruleset.mandatoryEntryConsumers !== undefined &&
      (!Array.isArray(ruleset.mandatoryEntryConsumers) ||
        ruleset.mandatoryEntryConsumers.length !== 0)) ||
    ruleset.legalityPolicies?.some((p) => p.actionKinds.includes('forced-reposition'))
  )
    throw new Error('UNSUPPORTED_FORCED_REPOSITION_INTERACTION');
  const expected = planRadialReposition(state, actor, operation.centerPieceId);
  if (!expected.length) throw new Error('NO_DISPLACEMENT');
  const supplied = [...operation.moves].sort(
    (a, b) => a.from.rankIndex - b.from.rankIndex || a.from.file - b.from.file,
  );
  if (canonicalEncode(supplied) !== canonicalEncode(expected))
    throw new Error('INVALID_FORCED_REPOSITION');
  const destinations = new Map(expected.map((move) => [move.pieceId, move.to]));
  const board = createBoard(
    Object.values(state.board.pieces).map((piece) =>
      destinations.has(piece.id) ? { ...piece, position: destinations.get(piece.id)! } : piece,
    ),
  );
  const after = { ...state, board } as GameState;
  const runtime = ruleset.effectRuntime;
  if (runtime) {
    assertEffectRuntimeState(after, runtime, !!ruleset.repetition);
    for (const effect of decodeEffectRecords(after.effects, runtime.registry, after)) {
      validateEligibility(effect, after, runtime);
    }
  }
  return {
    board,
    payload: {
      cause: operation.cause,
      centerPieceId: operation.centerPieceId,
      moves: [...expected],
    },
  };
}
