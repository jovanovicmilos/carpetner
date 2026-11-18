// One test per screen: app route vs design/screens/<Screen>.png at the reference viewport, filled with the "Kuhinja Petrović" fixture.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(new URL('../../../fixtures/kuhinja-petrovic.json', import.meta.url), 'utf8')).project;
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
    await page.setViewportSize({ width: s.w, height: Math.min(s.h, 1000) });
    await page.goto('/');
    await page.evaluate(p => { localStorage.setItem('kroj-project', JSON.stringify({ state: { project: p }, version: 0 })); localStorage.removeItem('kroj.help'); }, fixture);
    await page.goto(route);
    // design/screens/Main.html shows its own example room (example()), which "Učitaj primer" loads.
    if (name === 'Main') await page.getByRole('button', { name: 'Učitaj primer', exact: true }).click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: DOCS.has(name) });
  });
}
