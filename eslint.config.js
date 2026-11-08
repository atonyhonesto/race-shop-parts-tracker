// @ts-check
import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * One ESLint config for the whole monorepo.
 * TypeScript uses the strict, type-aware rule sets. Prettier owns formatting,
 * so the formatting rules are turned off last.
 * Accessibility is checked at runtime by axe (Storybook a11y add-on, Playwright), not by a lint plugin.
 */
export default defineConfig(
  globalIgnores([
    'api/**',
    '**/dist/**',
    '**/dist-electron/**',
    '**/release/**',
    '**/storybook-static/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
    // Generated code: Stencil type declarations, demo build output, and the API client.
    'packages/ui-wc/www/**',
    'packages/ui-wc/src/components.d.ts',
    'packages/api-client/src/generated/**',
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
      // Numbers in template strings are fine (`${percent}%`); objects and nullish values are not.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  // React code: hooks rules (including the React Compiler-aware checks).
  {
    files: ['packages/ui/**/*.{ts,tsx}', 'apps/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
  },

  // Stencil components: decorators and class-based render() are the framework's model.
  {
    files: ['packages/ui-wc/src/**/*.tsx'],
    rules: {
      '@typescript-eslint/class-methods-use-this': 'off',
      // Stencil's h.JSX namespace has no Element type, so TypeScript types every JSX expression as an
      // error `any`. render() declares VNode explicitly; this rule can't see past Stencil's typings.
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  // Stories follow Storybook's Component Story Format rules.
  {
    files: ['**/*.stories.{ts,tsx}'],
    extends: [storybook.configs['flat/recommended']],
  },

  // Plain JS files (configs, scripts) run in Node and are not part of a TS project.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  prettier,
);
