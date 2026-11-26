// Shared helpers for the functional tests.
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** The example kitchen (fixtures/kuhinja-petrovic.json, data-model form), fresh for every test. */
export const example = () => JSON.parse(readFileSync(new URL('../../../fixtures/kuhinja-petrovic.json', import.meta.url), 'utf8')).project;

/** Opens the app with this project stored (the store reads localStorage on load) and goes to `path`. */
export async function open(page: Page, path: string, project = example(), extra: Record<string, string> = {}) {
  await page.goto('/');
  await page.evaluate(([p, x]) => {
    localStorage.clear();
    localStorage.setItem('kroj-project', JSON.stringify({ state: { project: p }, version: 0 }));
    for (const [k, v] of Object.entries(x as Record<string, string>)) localStorage.setItem(k, v);
  }, [project, extra] as const);
  await page.goto(path);
}

/**
 * Where the drawn object sits in a WebGL canvas: bounding box of the pixels that differ from the background (corner pixel),
 * as fractions of the canvas (0..1). The scene keeps its drawing buffer (preserveDrawingBuffer), so it can be read back.
 */
export async function drawnBox(page: Page, scope = 'body') {
  return page.evaluate(sel => {
    const c = document.querySelector(`${sel} canvas`) as HTMLCanvasElement;
    const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
    const ctx = o.getContext('2d')!; ctx.drawImage(c, 0, 0);
    const { data, width: w, height: h } = ctx.getImageData(0, 0, o.width, o.height);
    const bg = [data[(5 * w + 5) * 4], data[(5 * w + 5) * 4 + 1], data[(5 * w + 5) * 4 + 2]];
    let x0 = w, x1 = 0, y0 = h, y1 = 0;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4;
      if (Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    return { cx: (x0 + x1) / 2 / w, cy: (y0 + y1) / 2 / h, w: (x1 - x0) / w, h: (y1 - y0) / h };
  }, scope);
}

/** Drags the mouse across the middle of the first canvas in `scope` (orbits the 3D view). */
export async function orbit(page: Page, dx: number, scope = 'body') {
  const b = (await page.locator(`${scope} canvas`).first().boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2, { steps: 15 }); await page.mouse.up();
  await page.waitForTimeout(600);
}
