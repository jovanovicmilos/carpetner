// Visual check against the design references (design/DESIGN_SPEC.md §8). Uses the system Chrome; run `pnpm -F web test:visual`.
import { defineConfig } from '@playwright/test';

// PW_PORT: run against a second dev server (5174, see vite.config.ts API_URL) while 5173 is someone's own session.
const PORT = Number(process.env.PW_PORT ?? 5173);

export default defineConfig({
  testDir: 'visual',
  // visual/tmp-*.spec.ts are local helpers (git-excluded, need OUT=dir): left out of the normal run
  testIgnore: process.env.OUT ? [] : ['**/tmp-*.spec.ts'],
  // References are copied from design/screens/<Screen>.png into .snapshots by the spec (Playwright turns "_" into "-"
  // in snapshot names, e.g. Element_fiokar → Element-fiokar). Never write references: a missing one must fail.
  snapshotPathTemplate: '.snapshots/{arg}{ext}',
  updateSnapshots: 'none',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.03 } },
  use: { channel: 'chrome', baseURL: `http://localhost:${PORT}` },
  webServer: { command: `npx vite --port ${PORT} --strictPort`, url: `http://localhost:${PORT}`, reuseExistingServer: true },
});
