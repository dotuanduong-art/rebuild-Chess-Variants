import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
for (const name of ['shared-types', 'game-core', 'game-variants', 'game-testkit']) {
  const specifier = `@variant-chess/${name}`;
  const esm = await import(specifier);
  const cjs = require(specifier);
  assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort(), specifier);
  assert.throws(() => require(`${specifier}/src/index.js`), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  });
  console.log(`${specifier}: ESM/CJS resolve; internal paths blocked`);
}
