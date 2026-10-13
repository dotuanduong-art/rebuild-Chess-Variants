import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// Tooling policy is tested directly; runtime packages never import scripts.
import {
  checkBoundaries,
  inspectSource,
  root,
  workspaces,
} from '../scripts/workspace-boundaries.mjs';

interface Workspace {
  path: string;
  manifest: { name: string };
}
const list = workspaces as Workspace[];
function workspace(name: string): Workspace {
  const item = list.find((value) => value.manifest.name === `@variant-chess/${name}`);
  if (!item) throw new Error(`Missing workspace ${name}`);
  return item;
}

describe('enforced architecture boundaries', () => {
  it('checks the actual source and manifests', () => {
    expect(checkBoundaries()).toEqual([]);
  });

  it.each([
    ['shared-types', "import type { VariantPluginDescriptor } from '@variant-chess/game-core'"],
    ['game-core', "import { Controller } from '@nestjs/common'"],
    ['game-core', "import React from 'react'"],
    ['game-core', "import * as THREE from 'three'"],
    ['game-core', "import { readFile } from 'node:fs'"],
    ['game-variants', "export * from '@variant-chess/backend'"],
    ['frontend', "import type { State } from '@variant-chess/game-core/src/state.js'"],
    ['backend', "const kit = require('@variant-chess/game-testkit')"],
    ['game-core', "import { Board } from '../../../reference/old-project/board.js'"],
    ['game-variants', "import type { Internal } from '../../game-core/src/index.js'"],
    ['game-core', 'const external = import(packageName)'],
  ])('rejects forbidden imports in %s: %s', (name, source) => {
    const target = workspace(name);
    expect(
      inspectSource(target, resolve(target.path, 'src', 'violation.ts'), source).length,
    ).toBeGreaterThan(0);
  });

  it('rejects a TypeScript path alias that resolves into a different workspace', () => {
    const target = workspace('frontend');
    expect(
      inspectSource(
        target,
        resolve(target.path, 'src', 'alias.ts'),
        "import type { VariantPluginDescriptor } from 'internal-core'",
        {
          baseUrl: root,
          paths: { 'internal-core': ['packages/game-core/src/index.ts'] },
        },
      ).length,
    ).toBeGreaterThan(0);
  });

  it('keeps framework imports forbidden even when someone adds them to a Core manifest', () => {
    const original = workspace('game-core');
    const target = {
      ...original,
      manifest: { ...original.manifest, dependencies: { react: '19.3.0' } },
    };
    expect(
      inspectSource(
        target,
        resolve(target.path, 'src', 'violation.ts'),
        "import React from 'react'",
      ).length,
    ).toBeGreaterThan(0);
  });

  it('allows public Core contracts in variants and testkit only in backend tests', () => {
    const variant = workspace('game-variants');
    expect(
      inspectSource(
        variant,
        resolve(variant.path, 'src', 'allowed.ts'),
        "import type { VariantPluginDescriptor } from '@variant-chess/game-core'",
      ),
    ).toEqual([]);
    const backend = workspace('backend');
    expect(
      inspectSource(
        backend,
        resolve(backend.path, 'tests', 'allowed.test.ts'),
        "import { createCommandFixture } from '@variant-chess/game-testkit'",
      ),
    ).toEqual([]);
  });
});
