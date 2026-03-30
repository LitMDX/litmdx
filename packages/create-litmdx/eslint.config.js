import { tsPlugin, tsParser, tsRules, prettierConfig } from '../../eslint.config.base.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: tsPlugin,
    rules: {
      ...tsRules,
      'no-console': 'off',
    },
  },
  prettierConfig,
];
