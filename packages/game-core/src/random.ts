export const RNG_VERSION = 'xorshift32-v1' as const;
export interface RngState {
  readonly algorithm: typeof RNG_VERSION;
  readonly seed: number;
  readonly value: number;
  readonly cursor: number;
}
export function createRng(seed: number): RngState {
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff)
    throw new RangeError('Seed must be uint32 nonzero');
  return Object.freeze({ algorithm: RNG_VERSION, seed, value: seed, cursor: 0 });
}
export function nextRandom(state: RngState): { readonly value: number; readonly state: RngState } {
  if (state.algorithm !== RNG_VERSION || !Number.isSafeInteger(state.cursor + 1))
    throw new RangeError('Invalid RNG state/version');
  let value = state.value;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  value >>>= 0;
  return { value, state: Object.freeze({ ...state, value, cursor: state.cursor + 1 }) };
}
export function chooseCanonical(state: RngState, candidates: readonly string[]) {
  const sorted = [...candidates].sort();
  if (!sorted.length || new Set(sorted).size !== sorted.length || sorted.length > 0xffffffff)
    throw new RangeError('Pool must be nonempty and unique');
  // Rejection sampling avoids modulo bias. Zero is excluded by this generator.
  const limit = Math.floor(0xffffffff / sorted.length) * sorted.length;
  let next = nextRandom(state);
  while (next.value - 1 >= limit) next = nextRandom(next.state);
  return { value: sorted[(next.value - 1) % sorted.length]!, state: next.state };
}
