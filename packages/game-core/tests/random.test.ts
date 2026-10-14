import { expect, it } from 'vitest';
import {
  createRng,
  nextRandom,
  chooseCanonical,
  allocateGameId,
  createGame,
} from '../src/index.js';

it('xorshift32-v1 golden seed 1, unsigned 32-bit outputs and explicit cursor', () => {
  let rng = createRng(1);
  const output: number[] = [];
  for (let i = 0; i < 5; i++) {
    const next = nextRandom(rng);
    output.push(next.value);
    rng = next.state;
  }
  expect(output).toEqual([270369, 67634689, 2647435461, 307599695, 2398689233]);
  expect(rng.cursor).toBe(5);
  expect(createRng(1).cursor).toBe(0);
  expect(() => createRng(0)).toThrow();
  expect(chooseCanonical(createRng(1), ['z', 'a', 'm'])).toEqual(
    chooseCanonical(createRng(1), ['m', 'z', 'a']),
  );
});

it('IDs are match/kind-scoped monotonic values and allocation never mutates original counters', () => {
  const state = createGame({ matchId: 'm', seed: 1 });
  const one = allocateGameId(state.matchId, state.counters, 'piece');
  expect(one.id).toBe('m:piece:1');
  expect(allocateGameId(state.matchId, one.counters, 'piece').id).toBe('m:piece:2');
  expect(allocateGameId('n', state.counters, 'piece').id).toBe('n:piece:1');
  expect(state.counters.piece).toBe(0);
});
