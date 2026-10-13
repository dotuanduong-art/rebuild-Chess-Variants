import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const root = fileURLToPath(new URL('../../', import.meta.url));

const config: NextConfig = {
  outputFileTracingRoot: root,
  turbopack: { root },
  transpilePackages: ['@variant-chess/shared-types'],
  poweredByHeader: false,
};

export default config;
