import { tsPlugin, tsParser, tsRules, prettierConfig } from '../../eslint.config.base.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    // src/ — Node/CLI code with full type-aware linting
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: tsPlugin,
    rules: tsRules,
  },
  {
    // template/ — browser React code, no type-aware project linting
    files: ['template/**/*.tsx', 'template/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: tsPlugin,
    rules: tsRules,
  },
  prettierConfig,
];
