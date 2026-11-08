import { defineConfig } from '@hey-api/openapi-ts';

/**
 * Generates the TypeScript client from the committed API contract (ADR 0005).
 * Output is types + a fetch-based SDK only; no framework code, so the web app,
 * the Electron app and scripts can all use it. Regenerate with `pnpm api:contract`.
 */
export default defineConfig({
  input: './openapi.json',
  output: { path: './src/generated' },
  plugins: [
    '@hey-api/client-fetch',
    '@hey-api/typescript',
    { name: '@hey-api/sdk', operations: { strategy: 'flat' } },
  ],
});
