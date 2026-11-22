import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Vite root = this folder (frontend/). The existing backend is NOT touched.
export default defineConfig(({ mode }) => {
  // BACKEND_URL (no VITE_ prefix) is only read here, it is never sent to the browser.
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.BACKEND_URL || 'http://127.0.0.1:3000';

  // Forward /api/* to the Express backend. changeOrigin stays false on purpose:
  // the backend's requireSameOrigin guard compares the browser's Origin header
  // with the Host header, so Host must remain the Vite dev host (localhost:5173).
  const apiProxy = {
    '/api': { target: backendUrl, changeOrigin: false },
  };

  return {
    plugins: [react()],
    // Reuse the existing /public folder (images, roadmaps, fonts, manifest, favicon)
    publicDir: fileURLToPath(new URL('../public', import.meta.url)),
    server: { port: 5173, proxy: apiProxy },
    preview: { port: 4173, proxy: apiProxy },
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
