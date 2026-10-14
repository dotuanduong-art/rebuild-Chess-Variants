import { expect, it } from 'vitest';
import {
  createGame,
  createBoard,
  recordReplay,
  executeReplay,
  BASE_RULESET_ID,
  fullStateHash,
  cloneSnapshot,
} from '../src/index.js';
import type { RulesetBundle } from '../src/index.js';

it('replay pins initial layout/seed/versions and reproduces ordered committed inputs, state and events', () => {
  const initial = createGame({ matchId: 'm', seed: 1, board: createBoard() });
  const inputs = [
    { authority: { kind: 'player', side: 'white' }, command: { kind: 'skill', skillId: 'random' } },
    { authority: { kind: 'player', side: 'white' }, command: { kind: 'end' } },
  ];
  const rules: RulesetBundle = {
    ...BASE_RULESET_ID,
    repetition: (s) => ({ effects: [], delayedActions: [], variantState: s.variantState }),
    skills: {
      random: {
        cost: 0,
        operations: [
          { kind: 'random', side: 'actor', namespace: 'fixture', pool: ['a', 'b', 'c'] },
        ],
      },
    },
  };
  const recorded = recordReplay(initial, inputs, rules);
  if (!recorded.ok) throw new Error(recorded.code);
  const played = executeReplay(JSON.parse(JSON.stringify(recorded.archive)), rules);
  if (!played.ok) throw new Error(played.code);
  expect(played.state).toEqual(recorded.state);
  expect(fullStateHash(played.state)).toEqual(fullStateHash(recorded.state));
  expect(executeReplay(recorded.archive, { ...rules, hash: 'other' }).ok).toBe(false);
  const corrupted = structuredClone(recorded.archive);
  corrupted.steps[0]!.stateHash = '0000000000000000';
  expect(executeReplay(corrupted, rules).ok).toBe(false);
});

it('snapshot checkpoint continuation equals uninterrupted replay; rejected inputs are not recorded', () => {
  const initial = createGame({ matchId: 'm', seed: 7, board: createBoard() });
  const end = (side: string) => ({ authority: { kind: 'player', side }, command: { kind: 'end' } });
  const full = recordReplay(initial, [end('white'), end('black')]);
  const partial = recordReplay(initial, [end('white')]);
  if (!full.ok || !partial.ok) throw new Error('fixture');
  const resumed = recordReplay(cloneSnapshot(partial.state), [end('black')]);
  if (!resumed.ok) throw new Error(resumed.code);
  expect(resumed.state).toEqual(full.state);
  const invalid = recordReplay(initial, [end('black')]);
  expect(invalid.ok).toBe(false);
  const corrupt = structuredClone(full.archive);
  corrupt.initialConfig.seed = 99;
  expect(executeReplay(corrupt).ok).toBe(false);
  expect(executeReplay({ ...full.archive, format: 'future' }).ok).toBe(false);
});
