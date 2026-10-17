import {
  CoordinateSchema,
  SanctuaryRegionSchema,
  SanctuaryCastOperationSchema,
  SANCTUARY_ENGINE_VERSION,
} from '@variant-chess/shared-types';
import type {
  Coordinate,
  GameState,
  PlayerSide,
  SanctuaryRegion,
  SanctuaryCastOperation,
  RootCommand,
  SerializableValue,
} from '@variant-chess/shared-types';
import { deepFreeze, cloneData, canonicalEncode } from './canonical.js';
import { isInBounds } from './coordinates.js';
import { sourceOrdinal } from './effect-runtime.js';
import { relativeDeadline } from './repetition.js';

export const SANCTUARY_REGION_NAMESPACE = 'guardian.sanctuary';
export interface SanctuaryPolicy {
  readonly kind: 'sanctuary-v1';
  readonly requiredProfile: Readonly<{ id: string; version: string }>;
}

/** Strict codec query; one reserved record per source, independent of piece attachments. */
export function querySanctuaryRegions(state: GameState): readonly SanctuaryRegion[] {
  // Before B3 this namespace was opaque JSON. Never reinterpret historical0.6 state.
  if (state.engineVersion !== SANCTUARY_ENGINE_VERSION) return Object.freeze([]);
  const regions: SanctuaryRegion[] = [];
  for (const side of ['white', 'black'] as const) {
    const raw = state.variantState[side][SANCTUARY_REGION_NAMESPACE];
    if (raw === undefined) continue;
    const region = SanctuaryRegionSchema.parse(cloneData(raw));
    const suffix = region.id.slice(`${state.matchId}:operation:`.length);
    if (
      state.terminal.status !== 'ongoing' ||
      region.source.sourcePlayer !== side ||
      state.playerProfiles[side]?.id !== 'guardian.sanctuary-only.experimental' ||
      state.playerProfiles[side]?.version !== '1.0.0' ||
      !region.id.startsWith(`${state.matchId}:operation:`) ||
      !/^[1-9]\d*$/.test(suffix) ||
      !Number.isSafeInteger(Number(suffix)) ||
      Number(suffix) > state.counters.operation ||
      region.anchor.side !== side ||
      region.anchor.boundary !== 'end' ||
      region.anchor.ordinal < 1 ||
      region.anchor.ordinal > sourceOrdinal(state, side) ||
      region.deadline.side !== side ||
      region.deadline.boundary !== 'end' ||
      region.deadline.ordinal !== region.anchor.ordinal + 3 ||
      region.deadline.ordinal < sourceOrdinal(state, side)
    )
      throw new Error('INVALID_SANCTUARY_REGION');
    regions.push(region);
  }
  if (new Set(regions.map((r) => r.id)).size !== regions.length)
    throw new Error('INVALID_SANCTUARY_REGION');
  return deepFreeze(regions);
}

export function sanctuaryRepetitionProjection(state: GameState) {
  const regions = querySanctuaryRegions(state);
  const variantState = Object.fromEntries(
    (['white', 'black'] as const).map((side) => [
      side,
      Object.fromEntries(
        Object.entries(state.variantState[side]).map(([key, value]) => {
          if (
            key !== SANCTUARY_REGION_NAMESPACE ||
            state.engineVersion !== SANCTUARY_ENGINE_VERSION
          )
            return [key, value];
          const region = regions.find((r) => r.source.sourcePlayer === side)!;
          return [
            key,
            {
              definitionId: region.definitionId,
              definitionVersion: region.definitionVersion,
              source: region.source,
              center: region.center,
              visibility: region.visibility,
              remaining: relativeDeadline(state, region.deadline),
            },
          ];
        }),
      ),
    ]),
  );
  return { effects: [], delayedActions: [], variantState };
}

export function withoutSanctuaryRegion(
  state: GameState,
  side: PlayerSide,
): GameState['variantState'] {
  const owned = { ...state.variantState[side] };
  delete owned[SANCTUARY_REGION_NAMESPACE];
  return { ...state.variantState, [side]: owned };
}

export function planSanctuaryCast(
  state: GameState,
  raw: SanctuaryCastOperation,
  actor: PlayerSide,
  command: RootCommand,
  policy: SanctuaryPolicy | undefined,
  id: string,
) {
  const parsed = SanctuaryCastOperationSchema.safeParse(raw);
  if (!parsed.success) throw new Error('INVALID_SANCTUARY_OPERATION');
  const operation = parsed.data;
  const profile = state.playerProfiles[actor];
  if (state.engineVersion !== SANCTUARY_ENGINE_VERSION || policy?.kind !== 'sanctuary-v1')
    throw new Error('UNSUPPORTED_SANCTUARY');
  if (
    actor !== state.turn.sideToAct ||
    profile?.id !== policy.requiredProfile.id ||
    profile?.version !== policy.requiredProfile.version ||
    profile?.id !== 'guardian.sanctuary-only.experimental' ||
    profile.version !== '1.0.0' ||
    command.kind !== 'skill' ||
    command.skillId !== SANCTUARY_REGION_NAMESPACE ||
    command.intent?.kind !== 'cell-target-v1' ||
    canonicalEncode(command.intent.cell) !== canonicalEncode(operation.center)
  )
    throw new Error('UNAUTHORIZED_SANCTUARY');
  const ordinal = sourceOrdinal(state, actor);
  const region: SanctuaryRegion = {
    format: 'sanctuary-region-v1',
    definitionId: 'region.guardian.sanctuary',
    definitionVersion: '1.0.0',
    id,
    source: {
      sourcePlayer: actor,
      sourceVariant: 'guardian',
      sourceSkill: 'guardian.sanctuary',
      sourcePiece: null,
      sourceIncarnation: null,
    },
    center: { ...operation.center },
    visibility: 'public',
    anchor: { side: actor, boundary: 'end', ordinal },
    deadline: { side: actor, boundary: 'end', ordinal: ordinal + 3 },
  };
  if (!Number.isSafeInteger(region.deadline.ordinal)) throw new Error('NUMBER_RANGE');
  return {
    region,
    previous: querySanctuaryRegions(state).find((r) => r.source.sourcePlayer === actor),
    variantState: {
      ...state.variantState,
      [actor]: {
        ...state.variantState[actor],
        [SANCTUARY_REGION_NAMESPACE]: region as unknown as SerializableValue,
      },
    },
  };
}

/** B3 fixed public square, clipped to the board. No spatial rules language. */
export function sanctuaryCells(center: Coordinate): readonly Coordinate[] {
  CoordinateSchema.parse(center);
  const cells: Coordinate[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cell = { file: center.file + dx, rankIndex: center.rankIndex + dy };
      if (isInBounds(cell)) cells.push(cell);
    }
  return deepFreeze(cells);
}
