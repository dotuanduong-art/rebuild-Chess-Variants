import { GameStateSchema, ENGINE_VERSION, STATE_SCHEMA_VERSION } from '@variant-chess/shared-types';
import type { GameState, PlayerProfiles } from '@variant-chess/shared-types';
import { createBasePosition } from './base-game.js';
import { createInitialBoard } from './board.js';
import type { Board } from './board.js';
import type { APState } from './ap.js';
import { createRng } from './random.js';
import { canonicalEncode, deepFreeze } from './canonical.js';
export { deepFreeze } from './canonical.js';
import { recordActionReady } from './repetition.js';
import type { RepetitionProjection } from './repetition.js';
import { querySanctuaryRegions } from './sanctuary-region.js';
import type { SanctuaryPolicy } from './sanctuary-region.js';

export function assertGameState(state: GameState): void {
  GameStateSchema.parse(state);
  querySanctuaryRegions(state);
  const seen = new Set<string>();
  state.board.cells.forEach((id, index) => {
    if (id === null) return;
    const piece = Object.hasOwn(state.board.pieces, id) ? state.board.pieces[id] : undefined;
    if (
      !piece ||
      seen.has(id) ||
      piece.id !== id ||
      piece.position.rankIndex * 15 + piece.position.file !== index
    )
      throw new Error('BOARD_INVARIANT');
    seen.add(id);
  });
  if (seen.size !== Object.keys(state.board.pieces).length) throw new Error('BOARD_INVARIANT');
  if (
    state.turn.roundIndex !== Math.floor(state.turn.plyIndex / 2) + 1 ||
    state.turn.sideToAct !== (state.turn.plyIndex % 2 ? 'black' : 'white')
  )
    throw new Error('TURN_INVARIANT');
  if (state.history.entries.length > state.history.limit) throw new Error('HISTORY_INVARIANT');
  let previousId = 0;
  let previousSequence = -1;
  let previousPly = -1;
  if (
    !state.history.entries.length ||
    state.history.lastCountedPly < 0 ||
    state.history.lastCountedPly > state.turn.plyIndex
  )
    throw new Error('HISTORY_INVARIANT');
  for (const entry of state.history.entries) {
    const prefix = `${state.matchId}:snapshot:`;
    const suffix = entry.id.slice(prefix.length);
    const id = Number(suffix);
    if (
      !entry.id.startsWith(prefix) ||
      !/^[1-9]\d*$/.test(suffix) ||
      !Number.isSafeInteger(id) ||
      id <= previousId ||
      id > state.counters.snapshot ||
      entry.sequence <= previousSequence ||
      entry.sequence > state.counters.transaction ||
      entry.plyIndex < previousPly ||
      entry.plyIndex > state.turn.plyIndex ||
      entry.side !== (entry.plyIndex % 2 ? 'black' : 'white')
    )
      throw new Error('HISTORY_INVARIANT');
    previousId = id;
    previousSequence = entry.sequence;
    previousPly = entry.plyIndex;
  }
  if (
    previousId !== state.counters.snapshot ||
    previousSequence !== state.counters.transaction ||
    previousPly !== state.turn.plyIndex
  )
    throw new Error('HISTORY_INVARIANT');
  for (const entries of [state.effects, state.delayedActions])
    if (new Set(entries.map((e) => e.id)).size !== entries.length)
      throw new Error('DUPLICATE_RULE_ID');
}
export interface GameConfig {
  readonly matchId: string;
  readonly seed: number;
  readonly board?: Board;
  readonly ap?: APState;
  readonly historyLimit?: number;
}
export interface RulesetIdentity {
  readonly engineVersion?: GameState['engineVersion'];
  readonly sanctuary?: SanctuaryPolicy;
  readonly version: string;
  readonly hash: string;
  readonly playerProfiles?: Readonly<{
    white: Readonly<PlayerProfiles['white']>;
    black: Readonly<PlayerProfiles['black']>;
  }>;
}
export function assertRulesetProfiles(state: GameState, ruleset: RulesetIdentity): void {
  if (state.engineVersion !== (ruleset.engineVersion ?? ENGINE_VERSION))
    throw new Error('ENGINE_MISMATCH');
  if (
    state.engineVersion === '0.7.0'
      ? ruleset.sanctuary?.kind !== 'sanctuary-v1' ||
        ruleset.sanctuary.requiredProfile.id !== 'guardian.sanctuary-only.experimental' ||
        ruleset.sanctuary.requiredProfile.version !== '1.0.0'
      : ruleset.sanctuary !== undefined
  )
    throw new Error('UNSUPPORTED_SANCTUARY');
  if (
    canonicalEncode(state.playerProfiles) !==
    canonicalEncode(ruleset.playerProfiles ?? { white: null, black: null })
  )
    throw new Error('PROFILE_MISMATCH');
}
export const BASE_RULESET_ID: RulesetIdentity = Object.freeze({
  version: '1.0.0',
  hash: 'base-01b-v1',
});
export function allocateGameId(
  matchId: string,
  counters: GameState['counters'],
  kind: keyof GameState['counters'],
) {
  const next = counters[kind] + 1;
  if (!Number.isSafeInteger(next)) throw new Error('NUMBER_RANGE');
  return {
    id: `${matchId}:${kind}:${next}`,
    counters: Object.freeze({ ...counters, [kind]: next }),
  };
}
export function appendGameHistory(state: GameState): GameState {
  const allocation = allocateGameId(state.matchId, state.counters, 'snapshot');
  const entry = {
    id: allocation.id,
    sequence: state.counters.transaction,
    plyIndex: state.turn.plyIndex,
    side: state.turn.sideToAct,
    positions: Object.fromEntries(
      Object.values(state.board.pieces).map((piece) => [piece.id, { ...piece.position }]),
    ),
    reference: canonicalEncode(state.board),
  };
  return {
    ...state,
    counters: allocation.counters,
    history: {
      ...state.history,
      entries: [...state.history.entries, entry].slice(-state.history.limit),
    },
  };
}
export function createGame(
  config: GameConfig,
  ruleset: RulesetIdentity & { readonly repetition?: RepetitionProjection } = BASE_RULESET_ID,
): GameState {
  const base = createBasePosition(config.board ?? createInitialBoard(), config.ap);
  const state = GameStateSchema.parse({
    ...base,
    matchId: config.matchId,
    engineVersion: ruleset.engineVersion ?? ENGINE_VERSION,
    schemaVersion: STATE_SCHEMA_VERSION,
    rulesetVersion: ruleset.version,
    rulesetHash: ruleset.hash,
    playerProfiles: ruleset.playerProfiles ?? { white: null, black: null },
    rng: createRng(config.seed),
    counters: { transaction: 0, event: 0, operation: 0, snapshot: 0, piece: 0 },
    variantState: { white: {}, black: {} },
    effects: [],
    delayedActions: [],
    history: { limit: config.historyLimit ?? 128, entries: [], repetition: {}, lastCountedPly: -1 },
  });
  const initial = appendGameHistory(recordActionReady(state, ruleset.repetition));
  assertGameState(initial);
  assertRulesetProfiles(initial, ruleset);
  return deepFreeze(initial);
}
