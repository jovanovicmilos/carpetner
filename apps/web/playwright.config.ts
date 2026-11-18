// Visual check against the design references (design/DESIGN_SPEC.md §8). Uses the system Chrome; run `pnpm -F web test:visual`.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'visual',
  // References are copied from design/screens/<Screen>.png into .snapshots by the spec (Playwright turns "_" into "-"
  // in snapshot names, e.g. Element_fiokar → Element-fiokar). Never write references: a missing one must fail.
  snapshotPathTemplate: '.snapshots/{arg}{ext}',
  updateSnapshots: 'none',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.03 } },
  use: { channel: 'chrome', baseURL: 'http://localhost:5173' },
  webServer: { command: 'pnpm dev --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true },
});
