// @ts-check
import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * One ESLint config for the whole monorepo.
 * TypeScript uses the strict, type-aware rule sets. Prettier owns formatting,
 * so the formatting rules are turned off last.
 * Framework rules (React, Storybook) are added in the phase that brings in that framework.
 */
export default defineConfig(
  globalIgnores([
    'api/**',
    '**/dist/**',
    '**/dist-electron/**',
    '**/release/**',
    '**/storybook-static/**',
    '**/coverage/**',
  ]),

  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },

  // Plain JS files (configs, scripts) run in Node and are not part of a TS project.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  prettier,
);
