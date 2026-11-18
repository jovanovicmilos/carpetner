// Visual check against the design references (design/DESIGN_SPEC.md §8). Uses the system Chrome; run `pnpm -F web test:visual`.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'visual',
  // Reference PNGs live in design/screens/<Screen>.png.
  snapshotPathTemplate: '../../design/screens/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.03 } },
  use: { channel: 'chrome', baseURL: 'http://localhost:5173' },
  webServer: { command: 'pnpm dev --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true },
});
