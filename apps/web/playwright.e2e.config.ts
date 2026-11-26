// Functional tests of the app (e2e/): real browser, the example kitchen, assertions only (no screenshots).
// Run `pnpm -F web test:e2e` (or `pnpm test:all` from the root: engine + e2e + visual). Uses the system Chrome, like test:visual.
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PW_PORT ?? 5173);

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  use: { channel: 'chrome', baseURL: `http://localhost:${PORT}`, viewport: { width: 1440, height: 900 } },
  webServer: { command: `npx vite --port ${PORT} --strictPort`, url: `http://localhost:${PORT}`, reuseExistingServer: true },
});
