import { expect, it } from 'vitest';
import { CORE_API_VERSION } from '@variant-chess/game-core';
import { PLUGIN_API_VERSION } from '../src/index.js';
import type { VariantPlugin } from '../src/index.js';

it('consumes the Core public contract without providing a concrete variant', () => {
  const descriptor: VariantPlugin = { id: 'fixture', version: '0.0.0' };
  expect(PLUGIN_API_VERSION).toBe(CORE_API_VERSION);
  expect(descriptor.id).toBe('fixture');
});
