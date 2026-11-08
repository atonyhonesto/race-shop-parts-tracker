import { readFileSync } from 'node:fs';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string;
};

/** Renderer: the shared screens, served from app://bundle by the main process. */
export default defineConfig({
  root: 'src/renderer',
  envDir: import.meta.dirname,
  base: '/',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { outDir: '../../dist/renderer', emptyOutDir: true, sourcemap: true },
});
