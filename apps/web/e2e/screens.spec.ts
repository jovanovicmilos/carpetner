// Other screens: wall view installation pick, Poređenje warnings, 3D Izgled decors (3D obstacles: engine model3d.test).
import { expect, test } from '@playwright/test';
import { example, open } from './util';

test('wall view: an installation picked on the drawing marks its row, and back', async ({ page }) => {
  await open(page, '/zid/A');
  await page.locator('svg g[role="button"]').first().click();
  await expect(page.locator('tr[aria-selected="true"]')).toHaveCount(1);
  await page.locator('tbody tr').nth(2).locator('td').first().click();
  await expect(page.locator('svg g[aria-pressed="true"]')).toHaveCount(1);
});

test('Poređenje: a missing price is a warning at the top', async ({ page }) => {
  const p = example();
  p.materials['mdf19-lak-bela'] = { id: 'mdf19-lak-bela', name: 'MDF 19 lak mat bela', thickness: 19, kind: 'mdf', grain: false };
  p.elements = p.elements.map((e: { materials: Record<string, string> }) => ({ ...e, materials: { ...e.materials, front: 'mdf19-lak-bela' } }));
  await open(page, '/poredjenje', p);
  const warn = page.getByRole('alert').filter({ hasText: 'nema cene za MDF 19 lak mat bela' });
  await expect(warn.first()).toBeVisible();
  const w = (await warn.first().boundingBox())!, firms = (await page.getByText('Firme u poređenju').boundingBox())!;
  expect(w.y).toBeLessThan(firms.y); // above the firms, right under the title
});

test('3D Izgled: a decor added with + becomes a swatch, + stays', async ({ page }) => {
  await open(page, '/3d', example(), { 'kroj.3dview': 'real' });
  const plus = page.getByRole('button', { name: 'Više dekora (EGGER, Kronospan) — Radna ploča' });
  await plus.click();
  await page.getByRole('dialog').getByText('Perl Siva').click();
  await expect(page.getByRole('button', { name: /U763 Perl Siva/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(plus).toBeVisible();
});

