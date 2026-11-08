import { defineConfig } from 'vite';

/** Preload: a single CommonJS file, because sandboxed preloads can't load ES modules or other files. */
export default defineConfig({
  envDir: import.meta.dirname,
  build: {
    ssr: 'src/preload/preload.ts',
    outDir: 'dist/main',
    emptyOutDir: false,
    target: 'node24',
    rolldownOptions: {
      external: ['electron'],
      output: { format: 'cjs', entryFileNames: 'preload.cjs', inlineDynamicImports: true },
    },
  },
  ssr: { noExternal: true },
});
