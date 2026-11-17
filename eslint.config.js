const js = require('@eslint/js');
const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'logs/**',
      'tmp/**',
      'keys/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
      'scripts/**',
      'types/**/*.d.ts',
      '.codex/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.d.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'class-methods-use-this': 'off',
      'no-console': 'off',
      'no-undef': 'off',
      'no-prototype-builtins': 'off',
      'no-underscore-dangle': 'off',
      'no-useless-constructor': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
