import { expect, it } from 'vitest';
import { CONTRACT_SCHEMA_VERSION } from '@variant-chess/shared-types';
import { CORE_API_VERSION } from '../src/index.js';
import type { VariantPluginDescriptor } from '../src/index.js';

it('exposes only the foundation version and plugin identity contract', () => {
  const descriptor: VariantPluginDescriptor = { id: 'fixture', version: '0.0.0' };
  expect(CORE_API_VERSION).toBe(CONTRACT_SCHEMA_VERSION);
  expect(descriptor).toEqual({ id: 'fixture', version: '0.0.0' });
});
