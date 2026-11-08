import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');
  // The browser calls /api on its own origin; Vite forwards to the API. No CORS in dev or e2e.
  const apiTarget = env.API_PROXY_TARGET ?? 'http://localhost:5080';
  const proxy = { '/api': { target: apiTarget, changeOrigin: true } };

  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
    build: {
      sourcemap: true,
      // Budgets are enforced by scripts/check-bundle-size.mjs (gzip), not by Vite's warning.
      chunkSizeWarningLimit: 1024,
    },
  };
});
