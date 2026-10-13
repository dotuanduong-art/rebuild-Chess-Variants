import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'reference/**',
      'docs/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/next-env.d.ts',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  { files: ['apps/frontend/**/*.{js,jsx,ts,tsx}'], languageOptions: { globals: globals.browser } },
  { ...reactHooks.configs.flat.recommended, files: ['apps/frontend/**/*.{js,jsx,ts,tsx}'] },
  {
    files: ['packages/{shared-types,game-core,game-variants}/src/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'Date', 'fetch', 'WebSocket'],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Inject deterministic randomness in Phase 01B.',
        },
      ],
    },
  },
];
