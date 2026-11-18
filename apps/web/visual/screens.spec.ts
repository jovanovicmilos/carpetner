// One test per screen: app route vs design/screens/<Screen>.png at the reference viewport, filled with the "Kuhinja Petrović" fixture.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(new URL('../../../fixtures/kuhinja-petrovic.json', import.meta.url), 'utf8')).project;
// design/screens/fonts-test.css with its fonts inlined as data: URLs (the page cannot resolve the relative font paths).
const FONT_DIR = new URL('../../../design/screens/', import.meta.url);
const fontsCss = readFileSync(new URL('fonts-test.css', FONT_DIR), 'utf8')
  .replace(/url\((fonts\/[^)]+)\)/g, (_, f: string) => `url(data:font/${f.endsWith('.ttf') ? 'ttf' : 'otf'};base64,${readFileSync(new URL(f, FONT_DIR)).toString('base64')})`);
const screens: { file: string; w: number; h: number }[] = JSON.parse(readFileSync(new URL('../../../design/screens/screens.json', import.meta.url), 'utf8'));

const DOCS = new Set(['KrojnaLista', 'Obracun', 'Poredjenje', 'Cenovnik', 'Standardi', 'AIPodesavanja', 'Sajt', 'Prijava']); // scrolling pages: whole page
// Screens that exist in the app so far; the rest are added as they are built.
const ROUTES: Record<string, string> = {
  Main: '/projekat', Zid: '/zid/A', Element: '/element/D2', KrojnaLista: '/krojna-lista', BrziStart: '/',
};

for (const s of screens) {
  const name = s.file.replace('.html', '');
  const route = ROUTES[name];
  test(name, async ({ page }) => {
    test.skip(!route, 'screen not built yet');
    // DESIGN_SPEC §8: Google Fonts blocked, local test fonts injected, like the reference renders.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await page.setViewportSize({ width: s.w, height: Math.min(s.h, 1000) });
    await page.goto('/');
    await page.evaluate(p => { localStorage.setItem('kroj-project', JSON.stringify({ state: { project: p }, version: 0 })); localStorage.removeItem('kroj.help'); }, fixture);
    await page.goto(route);
    await page.addStyleTag({ content: fontsCss });
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: DOCS.has(name) });
  });
}
