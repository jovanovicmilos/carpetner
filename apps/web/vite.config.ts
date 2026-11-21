import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // apps/api (pnpm -F api dev, port 3100 — 3000 is often taken) on the same origin, like production behind one domain.
  // API_URL points a second dev server at a second API (Claude's test runs: Vite 5174 → API 3101, database kroj_e2e).
  server: { proxy: { '/api': process.env.API_URL ?? 'http://localhost:3100' } },
});
