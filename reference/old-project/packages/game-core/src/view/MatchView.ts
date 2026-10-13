import type { Action } from "../action/Action";
import type { HistoryEntry } from "../action/ActionHistory";
import type { SerializedBoard } from "../board/Board";
import type { Effect } from "../effect/Effect";
import type { Match } from "../match/Match";
import type { MatchStatus } from "../match/Match";
import type { TerminalResult } from "../match/terminal";
import { Color, PieceType, type Piece } from "../pieces/Piece";
import type { GraveyardEntry } from "../state/Graveyard";
import type {
  GameState,
  PositionSnapshot,
  TurnPhase,
} from "../state/GameState";
import type { Position } from "../board/Position";
import type { SkillTargetRequirement } from "../variant/Skill";

export enum ViewerRole {
  WHITE = "WHITE",
  BLACK = "BLACK",
  LIVE_SPECTATOR = "LIVE_SPECTATOR",
  POSTGAME_REPLAY = "POSTGAME_REPLAY",
  SERVER_LOG = "SERVER_LOG",
}

export interface PublicActionDTO {
  type: Action["type"];
  player?: Color;
  skillId?: string;
  targets?: unknown[];
  effect?: Effect;
}

export interface PublicHistoryEntryDTO {
  turnNumber: number;
  action: PublicActionDTO;
}

export interface AvailableSkillTargetDTO {
  requirements: SkillTargetRequirement[];
  validPositions: Position[][];
  currentCost: number;
}

export interface MatchViewDTO {
  board: SerializedBoard;
  currentTurn: Color;
  turnNumber: number;
  status: MatchStatus;
  winner: Color | null;
  terminalResult: TerminalResult | null;
  turnPhase: TurnPhase;
  hasMoved: boolean;
  skillsUsedThisTurn: number;
  skillsUsedThisTurnIds: string[];
  passSkillSubmitted: boolean;
  whiteAP: number;
  blackAP: number;
  whiteTimeLeft: number;
  blackTimeLeft: number;
  lastMoveTimestamp: number;
  plyIndex: number;
  turnStartedAtMs: number;
  clockActiveColor: Color | null;
  actionHistory: Array<HistoryEntry | PublicHistoryEntryDTO>;
  graveyard: GraveyardEntry[];
  whiteVariantId: string | null;
  blackVariantId: string | null;
  variantState: Record<string, unknown>;
  whitePlayerEffects: Effect[];
  blackPlayerEffects: Effect[];
  moveHistory: Array<{
    from: string;
    to: string;
    isStealth?: boolean;
    moverColor?: Color;
  }>;
  availableSkillTargets: Record<string, AvailableSkillTargetDTO>;
  opponentSkillCosts: Record<string, number>;
  rngSeed?: number;
  rngCounter?: number;
  pendingDeadKings?: Color[];
  positionSnapshots?: PositionSnapshot[];
}

const HIDDEN_EFFECT_TYPES = new Set([
  "thunder_trap",
  "landmine",
  "outworld",
  "repel",
  "soulless_cell",
  "puppet_trap",
  "prediction",
]);

const PUBLIC_VARIANT_KEYS = [
  "bombCount",
  "cooldowns",
  "devilTollActive",
  "devilTollRemainingTurns",
  "domainActive",
  "domainCount",
  "domainRemainingRounds",
  "dragonCounter",
  "judgmentWindowActive_Black",
  "judgmentWindowActive_White",
  "judgmentWindowRemainingTurns_Black",
  "judgmentWindowRemainingTurns_White",
  "lawActive",
  "lawRemainingRounds",
  "currentLaw",
  "shieldCount",
  "storm",
  "ultimateUseCount",
  "windSigils",
  "zombieCount",
] as const;

const PUBLIC_EFFECT_METADATA_KEYS = [
  "blockUltimate",
  "captureCountdown",
  "completed",
  "controlledBy",
  "count",
  "hasMoved",
  "roundsWithEvolution",
] as const;

export function viewerRoleForColor(color: Color): ViewerRole {
  return color === Color.White ? ViewerRole.WHITE : ViewerRole.BLACK;
}

export function projectMatchView(
  match: Match,
  viewer: ViewerRole,
): MatchViewDTO {
  const state = match.getGameState();
  const color = viewerColor(viewer);
  const capabilities = color
    ? match.getPlayerViewCapabilities(color)
    : { availableSkillTargets: {}, opponentSkillCosts: {} };

  return {
    ...projectGameStateView(state, viewer),
    moveHistory: projectMoveHistory(match.getMoveHistory(), viewer),
    availableSkillTargets: capabilities.availableSkillTargets,
    opponentSkillCosts: capabilities.opponentSkillCosts,
  };
}

export function projectGameStateView(
  state: GameState,
  viewer: ViewerRole,
): Omit<
  MatchViewDTO,
  "moveHistory" | "availableSkillTargets" | "opponentSkillCosts"
> {
  const full = isFullViewer(viewer);
  const projected = {
    board: projectBoard(state, viewer),
    currentTurn: state.currentTurn,
    turnNumber: state.turnNumber,
    status: state.status,
    winner: state.winner,
    terminalResult: state.terminalResult
      ? cloneValue(state.terminalResult)
      : null,
    turnPhase: state.turnPhase,
    hasMoved: state.hasMoved,
    skillsUsedThisTurn: state.skillsUsedThisTurn,
    skillsUsedThisTurnIds: [...state.skillsUsedThisTurnIds],
    passSkillSubmitted: state.passSkillSubmitted,
    whiteAP: state.whiteAP,
    blackAP: state.blackAP,
    whiteTimeLeft: state.whiteTimeLeft,
    blackTimeLeft: state.blackTimeLeft,
    lastMoveTimestamp: state.lastMoveTimestamp,
    plyIndex: state.plyIndex,
    turnStartedAtMs: state.turnStartedAtMs,
    clockActiveColor: state.clockActiveColor,
    actionHistory: projectActionHistory(state.actionHistory.getAll(), viewer),
    graveyard: projectGraveyard(state.graveyard, viewer),
    whiteVariantId: state.whiteVariantId,
    blackVariantId: state.blackVariantId,
    variantState: projectVariantState(state, viewer),
    whitePlayerEffects: projectEffects(state.whitePlayerEffects, viewer),
    blackPlayerEffects: projectEffects(state.blackPlayerEffects, viewer),
  };

  if (!full) return projected;
  return {
    ...projected,
    rngSeed: state.rngSeed,
    rngCounter: state.rngCounter,
    pendingDeadKings: [...state.pendingDeadKings],
    positionSnapshots: cloneValue(state.positionSnapshots),
  };
}

export function projectActions(
  actions: readonly Action[],
  viewer: ViewerRole,
): PublicActionDTO[] {
  return actions.map((action) => projectAction(action, viewer));
}

function projectBoard(state: GameState, viewer: ViewerRole): SerializedBoard {
  const color = viewerColor(viewer);
  const full = isFullViewer(viewer);
  const source = state.board.toSerializable();
  const cellEffects: Record<string, Effect[]> = {};

  for (const [position, effects] of Object.entries(source.cellEffects ?? {})) {
    const projected = projectEffects(effects, viewer);
    if (projected.length > 0) cellEffects[position] = projected;
  }

  return {
    grid: source.grid.map((row) =>
      row.map((piece) => {
        if (!piece) return null;
        if (!full && piece.color !== color && isInvisiblePiece(state, piece)) {
          return null;
        }
        return projectPiece(piece, viewer);
      }),
    ),
    cellEffects,
  };
}

function isInvisiblePiece(state: GameState, piece: Piece): boolean {
  if (
    piece.effects.some((effect) => {
      const effectType = effect.type as string;
      return (
        effect.isHidden === true ||
        effectType === "invisible" ||
        effectType === "stealth" ||
        (effect.type === "ghost" && effect.metadata?.stealth === true)
      );
    })
  ) {
    return true;
  }

  const camouflage = state
    .getPlayerEffects(piece.color)
    .some((effect) => effect.type === "apex_camouflage");
  return (
    camouflage &&
    piece.type !== PieceType.King &&
    !(state.variantState.revealedPieceIds ?? []).includes(piece.id)
  );
}

function projectPiece(piece: Piece, viewer: ViewerRole): Piece {
  return {
    id: piece.id,
    type: piece.type,
    color: piece.color,
    effects: projectEffects(piece.effects, viewer),
    ...(piece.specialType === undefined
      ? {}
      : { specialType: piece.specialType }),
  };
}

function projectEffects(
  effects: readonly Effect[],
  viewer: ViewerRole,
): Effect[] {
  return effects.flatMap((effect) => {
    const projected = projectEffect(effect, viewer);
    return projected ? [projected] : [];
  });
}

function projectEffect(effect: Effect, viewer: ViewerRole): Effect | null {
  const ownsEffect = viewerColor(viewer) === effect.sourcePlayer;
  const full = isFullViewer(viewer);
  const hidden =
    effect.isHidden === true || HIDDEN_EFFECT_TYPES.has(effect.type);
  if (hidden && !full && !ownsEffect) return null;

  return {
    id: effect.id,
    type: effect.type,
    duration: effect.duration,
    remainingDuration: effect.remainingDuration,
    tickTiming: effect.tickTiming,
    sourcePlayer: effect.sourcePlayer,
    ...(effect.sourceSkillId === undefined
      ? {}
      : { sourceSkillId: effect.sourceSkillId }),
    ...(effect.sourcePieceId === undefined
      ? {}
      : { sourcePieceId: effect.sourcePieceId }),
    targetType: effect.targetType,
    targetId: effect.targetId,
    stackingRule: effect.stackingRule,
    ...(effect.stackCount === undefined
      ? {}
      : { stackCount: effect.stackCount }),
    isDebuff: effect.isDebuff,
    ...(effect.isHidden === undefined ? {} : { isHidden: effect.isHidden }),
    metadata:
      full || ownsEffect
        ? cloneValue(effect.metadata)
        : projectPublicEffectMetadata(effect.metadata),
  };
}

function projectPublicEffectMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const projected: Record<string, unknown> = {};
  for (const key of PUBLIC_EFFECT_METADATA_KEYS) {
    if (metadata[key] !== undefined) projected[key] = cloneValue(metadata[key]);
  }
  return projected;
}

function projectActionHistory(
  history: readonly HistoryEntry[],
  viewer: ViewerRole,
): Array<HistoryEntry | PublicHistoryEntryDTO> {
  if (isFullViewer(viewer)) return cloneValue([...history]);
  return history.map((entry) => ({
    turnNumber: entry.turnNumber,
    action: projectAction(entry.action, viewer),
  }));
}

function projectAction(action: Action, viewer: ViewerRole): PublicActionDTO {
  if (isFullViewer(viewer)) return cloneValue(action);
  const color = viewerColor(viewer);
  if (action.type === "USE_SKILL") {
    return {
      type: action.type,
      player: action.player,
      skillId: action.skillId,
      ...(color === action.player
        ? { targets: cloneValue(action.targets) }
        : {}),
    };
  }
  if (action.type === "APPLY_EFFECT") {
    if (color !== action.effect.sourcePlayer) return { type: action.type };
    const effect = projectEffect(action.effect, viewer);
    return effect ? { type: action.type, effect } : { type: action.type };
  }
  if (
    "player" in action &&
    Object.values(Color).includes(action.player as Color)
  ) {
    return { type: action.type, player: action.player as Color };
  }
  return { type: action.type };
}

function projectVariantState(
  state: GameState,
  viewer: ViewerRole,
): Record<string, unknown> {
  if (isFullViewer(viewer)) return cloneValue(state.variantState);
  const projected: Record<string, unknown> = {};
  for (const key of PUBLIC_VARIANT_KEYS) {
    if (state.variantState[key] !== undefined) {
      projected[key] = cloneValue(state.variantState[key]);
    }
  }

  const color = viewerColor(viewer);
  projectVisibleDimensionPairs(state, color, projected);
  if (!color) return projected;
  projectOwnerVariantState(state, color, projected);
  return projected;
}

function projectVisibleDimensionPairs(
  state: GameState,
  color: Color | null,
  projected: Record<string, unknown>,
): void {
  const pairs = (state.variantState.dimensionPairs ?? []) as Array<{
    owner: Color;
    odd?: { isHidden?: boolean };
    even?: { isHidden?: boolean };
  }>;
  const visiblePairs = pairs.filter(
    (pair) =>
      pair.owner === color ||
      (pair.odd?.isHidden === false && pair.even?.isHidden === false),
  );
  if (visiblePairs.length > 0)
    projected.dimensionPairs = cloneValue(visiblePairs);
}

function projectOwnerVariantState(
  state: GameState,
  color: Color,
  projected: Record<string, unknown>,
): void {
  const underground = (state.variantState.undergroundPieces ?? []) as Array<{
    ownerColor?: Color;
  }>;
  const ownUnderground = underground.filter(
    (entry) => entry.ownerColor === color,
  );
  if (ownUnderground.length > 0) {
    projected.undergroundPieces = cloneValue(ownUnderground);
  }

  const shadowed = (state.variantState.shadowedPieces ?? []) as Array<{
    pieceSnapshot?: { color?: Color };
  }>;
  const ownShadowed = shadowed.filter(
    (entry) =>
      entry.pieceSnapshot?.color && entry.pieceSnapshot.color !== color,
  );
  if (ownShadowed.length > 0)
    projected.shadowedPieces = cloneValue(ownShadowed);

  const variantId =
    color === Color.White ? state.whiteVariantId : state.blackVariantId;
  const ownerKeysByVariant: Record<string, readonly string[]> = {
    cannibal: [
      "kingCurrentMoveType",
      "skill2SnapshotMoveType",
      "ultimateActive",
      "ultimateCaptureCount",
      "ultimateSnapshotMoveType",
    ],
    earth: ["skill2CostThisTurn"],
  };
  for (const key of ownerKeysByVariant[variantId ?? ""] ?? []) {
    if (state.variantState[key] !== undefined) {
      projected[key] = cloneValue(state.variantState[key]);
    }
  }

  for (const key of [
    `${color}_freeSkill1Remaining`,
    `pirateDebtEnabled_${color}`,
  ]) {
    if (state.variantState[key] !== undefined) {
      projected[key] = cloneValue(state.variantState[key]);
    }
  }

  for (const key of ["phoenixRebirthed", "phoenixSkillsDisabled"]) {
    const value = state.variantState[key] as
      | Record<string, unknown>
      | undefined;
    if (value?.[color] !== undefined)
      projected[key] = { [color]: cloneValue(value[color]) };
  }
}

function projectGraveyard(
  graveyard: readonly GraveyardEntry[],
  viewer: ViewerRole,
): GraveyardEntry[] {
  return graveyard.map((entry) => ({
    piece: projectPiece(entry.piece, viewer),
    position: { col: entry.position.col, row: entry.position.row },
    turnDied: entry.turnDied,
    killedBy: entry.killedBy,
    ...(isFullViewer(viewer) && entry.killerId !== undefined
      ? { killerId: entry.killerId }
      : {}),
  }));
}

function projectMoveHistory(
  history: ReturnType<Match["getMoveHistory"]>,
  viewer: ViewerRole,
): MatchViewDTO["moveHistory"] {
  const color = viewerColor(viewer);
  return history.map((entry) => {
    if (
      !isFullViewer(viewer) &&
      entry.isStealth &&
      entry.moverColor !== color
    ) {
      return {
        from: "",
        to: "",
        isStealth: true,
        moverColor: entry.moverColor,
      };
    }
    return {
      from: entry.from,
      to: entry.to,
      ...(entry.isStealth === undefined ? {} : { isStealth: entry.isStealth }),
      ...(entry.moverColor === undefined
        ? {}
        : { moverColor: entry.moverColor }),
    };
  });
}

function viewerColor(viewer: ViewerRole): Color | null {
  if (viewer === ViewerRole.WHITE) return Color.White;
  if (viewer === ViewerRole.BLACK) return Color.Black;
  return null;
}

function isFullViewer(viewer: ViewerRole): boolean {
  return (
    viewer === ViewerRole.POSTGAME_REPLAY || viewer === ViewerRole.SERVER_LOG
  );
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}
