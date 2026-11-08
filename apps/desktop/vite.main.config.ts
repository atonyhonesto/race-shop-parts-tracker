import { builtinModules } from 'node:module';

import { defineConfig } from 'vite';

/**
 * Main process: one ESM file with every dependency (including @azure/msal-node) bundled in, so the
 * packaged app ships no node_modules and no native modules.
 */
export default defineConfig({
  envDir: import.meta.dirname,
  build: {
    ssr: 'src/main/main.ts',
    outDir: 'dist/main',
    emptyOutDir: false,
    target: 'node24',
    sourcemap: true,
    rolldownOptions: {
      external: ['electron', ...builtinModules, ...builtinModules.map((name) => `node:${name}`)],
      output: { format: 'es', entryFileNames: 'main.mjs' },
    },
  },
  ssr: { noExternal: true },
});
