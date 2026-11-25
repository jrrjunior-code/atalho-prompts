import pluginJs from '@eslint/js';
import pluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', '.astro/', 'node_modules/', '.cache/', 'scripts/'] },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginAstro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: require('astro-eslint-parser'),
      parserOptions: {
        extraFileExtensions: ['.astro'],
      },
    },
    rules: {
      'astro/no-unused-define-vars': 'warn',
      'astro/missing-client-only-directive-value': 'warn',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  }
);