import { ReplaySchema, TrustedInputSchema } from '@variant-chess/shared-types';
import type { GameState, ReplayArchive, DomainEvent } from '@variant-chess/shared-types';
import { BASE_RULESET_ID, deepFreeze } from './state.js';
import { resolveCommand } from './transaction.js';
import type { RulesetBundle, TransactionResult } from './transaction.js';
import { encodeSnapshot, decodeSnapshot, fullStateHash } from './snapshot.js';
import { canonicalEncode } from './canonical.js';

export type RecordReplayResult =
  | { readonly ok: true; readonly archive: ReplayArchive; readonly state: GameState }
  | { readonly ok: false; readonly code: string };
export function recordReplay(
  initial: GameState,
  inputs: readonly unknown[],
  ruleset: RulesetBundle = BASE_RULESET_ID,
): RecordReplayResult {
  try {
    const initialSnapshot = encodeSnapshot(
      initial,
      ruleset.effectRegistry,
      ruleset.delayedRegistry,
    );
    let state = decodeSnapshot(initialSnapshot, ruleset);
    const steps: ReplayArchive['steps'] = [];
    for (const raw of inputs) {
      const result = resolveCommand(state, raw, ruleset);
      if (!result.ok) return { ok: false, code: result.code };
      state = result.state;
      steps.push({
        input: TrustedInputSchema.parse(raw),
        stateHash: fullStateHash(state, ruleset.effectRegistry, ruleset.delayedRegistry).digest,
        events: [...result.events],
      });
    }
    const archive = ReplaySchema.parse({
      format: 'variant-chess-replay-v1',
      initialSnapshot,
      initialConfig: {
        matchId: initial.matchId,
        seed: initial.rng.seed,
        engineVersion: initial.engineVersion,
        schemaVersion: initial.schemaVersion,
        rulesetVersion: initial.rulesetVersion,
        rulesetHash: initial.rulesetHash,
        rngVersion: initial.rng.algorithm,
      },
      steps,
    });
    return deepFreeze({ ok: true, archive, state });
  } catch {
    return { ok: false, code: 'INVALID_REPLAY' };
  }
}
export function executeReplay(
  raw: unknown,
  ruleset: RulesetBundle = BASE_RULESET_ID,
  validate?: (state: GameState, step: number) => void,
): TransactionResult {
  try {
    canonicalEncode(raw);
    const archive = ReplaySchema.parse(raw);
    let state = decodeSnapshot(archive.initialSnapshot, ruleset);
    const header = archive.initialConfig;
    if (
      header.matchId !== state.matchId ||
      header.seed !== state.rng.seed ||
      header.engineVersion !== state.engineVersion ||
      header.schemaVersion !== state.schemaVersion ||
      header.rulesetVersion !== state.rulesetVersion ||
      header.rulesetHash !== state.rulesetHash ||
      header.rngVersion !== state.rng.algorithm
    )
      throw new Error('HEADER_MISMATCH');
    const events: DomainEvent[] = [];
    validate?.(state, 0);
    for (const [index, step] of archive.steps.entries()) {
      const result = resolveCommand(state, step.input, ruleset);
      if (
        !result.ok ||
        fullStateHash(result.state, ruleset.effectRegistry, ruleset.delayedRegistry).digest !==
          step.stateHash ||
        canonicalEncode(result.events) !== canonicalEncode(step.events)
      )
        throw new Error('REPLAY_DIVERGENCE');
      state = result.state;
      events.push(...result.events);
      validate?.(state, index + 1);
    }
    return deepFreeze({ ok: true, state, events });
  } catch (error) {
    return {
      ok: false,
      code: error instanceof Error ? error.message : 'INVALID_REPLAY',
      events: [],
    };
  }
}
