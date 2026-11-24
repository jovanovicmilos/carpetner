// Site assets from the real app (design/BRIEF_SITE_ASSETS.md): opens /dev/site-assets for every asset and writes
// design/assets/site/<name> + manifest.json. Run `pnpm -F web site-assets` (starts Vite on PW_PORT / 5173 unless it runs).
// Optional args: names or prefixes to make only those (e.g. `pnpm -F web site-assets 3d-hero element-`); the manifest keeps the rest.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '../../../design/assets/site');
const PORT = Number(process.env.PW_PORT ?? 5173), BASE = `http://localhost:${PORT}`;
const only = process.argv.slice(2);

const up = () => fetch(BASE).then(r => r.ok, () => false);
let vite;
if (!(await up())) {
  vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: join(here, '..'), stdio: 'ignore' });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise(r => setTimeout(r, 500));
}

mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { assets: {} };
// GPU on: the realistic view (shadows, ambient occlusion) is far too slow on the software renderer.
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] });
try {
  const page = await browser.newPage({ viewport: { width: 2600, height: 1700 } });
  page.on('pageerror', e => console.error('  page error:', e.message));
  await page.goto(`${BASE}/dev/site-assets?list=1`);
  const names = (await page.waitForFunction(() => window.__list).then(h => h.jsonValue())).filter(n => !only.length || only.some(o => n.startsWith(o)));
  for (const name of names) {
    process.stdout.write(`${name} … `);
    await page.goto(`${BASE}/dev/site-assets?a=${encodeURIComponent(name)}`);
    const a = await (await page.waitForFunction(() => window.__asset, null, { timeout: 120_000 })).jsonValue();
    const file = join(OUT, name);
    if (a.type === 'png') writeFileSync(file, Buffer.from(a.data.split(',')[1], 'base64'));
    else if (a.type === 'shot') {
      // Printed sheet: shoot the element at the scale that makes it `meta.width` px wide.
      const css = await page.locator('#shot').evaluate(e => e.getBoundingClientRect().width);
      const ctx = await browser.newContext({ deviceScaleFactor: a.meta.width / css, viewport: { width: Math.ceil(css) + 20, height: 1400 } });
      const p2 = await ctx.newPage();
      await p2.goto(page.url());
      await p2.waitForFunction(() => window.__asset);
      await p2.locator('#shot').screenshot({ path: file });
      await ctx.close();
    } else writeFileSync(file, a.data);
    manifest.assets[name] = a.meta;
    console.log('ok');
  }
} finally {
  await browser.close();
  vite?.kill();
}
manifest.note = 'Made by apps/web/scripts/site-assets.mjs from /dev/site-assets (real engine, 3D scene and drawings). Example kitchen = fixtures/kuhinja-petrovic.json. Prices: fixtures/cenovnik-demo.json (DEMO).';
manifest.assets = Object.fromEntries(Object.entries(manifest.assets).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
