import { expect, it } from 'vitest';
import { CommandEnvelopeSchema } from '@variant-chess/shared-types';
import { cloneSerializable, createCommandFixture } from '../src/index.js';

it('creates independent schema-valid transport fixtures', () => {
  const first = createCommandFixture();
  const second = createCommandFixture({ expectedRevision: 2 });
  expect(CommandEnvelopeSchema.safeParse(first).success).toBe(true);
  expect(first.expectedRevision).toBe(0);
  expect(second.expectedRevision).toBe(2);
  expect(first.command).not.toBe(second.command);
});

it('deep-clones nested serializable fixture data', () => {
  const original = { effects: [{ payload: { values: [1, 2] } }] };
  const copy = cloneSerializable(original);
  copy.effects[0]?.payload.values.push(3);
  expect(original.effects[0]?.payload.values).toEqual([1, 2]);
  expect(copy.effects[0]?.payload.values).toEqual([1, 2, 3]);
});
