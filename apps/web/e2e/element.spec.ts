// Element page (/element/:id): 3D centred and orbiting its own axis, Otvori / Rasklopi, board ↔ cut-list line,
// accordion, splitter, Otvori u konfiguratoru, shared plinth note.
import { expect, test } from '@playwright/test';
import { drawnBox, open, orbit } from './util';

const SEC = 'section[aria-label="Crtež elementa"]';
const to3d = async (page: import('@playwright/test').Page, id = 'D4') => {
  await open(page, `/element/${id}`);
  await page.getByRole('tab', { name: '3D', exact: true }).click();
  await page.waitForTimeout(1500);
};

test('3D: the unit is centred and stays centred while orbiting (own axis)', async ({ page }) => {
  await to3d(page);
  const a = await drawnBox(page, SEC);
  expect(Math.abs(a.cx - 0.5)).toBeLessThan(0.08);
  expect(Math.abs(a.cy - 0.5)).toBeLessThan(0.12);
  expect(a.h).toBeGreaterThan(0.35); // fills a good part of the view, not a speck
  await orbit(page, 250, SEC);
  const b = await drawnBox(page, SEC);
  expect(Math.abs(b.cx - 0.5)).toBeLessThan(0.08);
  expect(Math.abs(b.cy - 0.5)).toBeLessThan(0.12);
});

test('3D: Rasklopi spreads the unit, Sklopi brings it back; Otvori toggles', async ({ page }) => {
  await to3d(page);
  const a = await drawnBox(page, SEC);
  await page.getByRole('button', { name: 'Rasklopi' }).click(); await page.waitForTimeout(1200);
  const b = await drawnBox(page, SEC);
  expect(b.w * b.h).toBeGreaterThan(a.w * a.h * 0.9); // spread out (camera is framed for it, so not much bigger on screen)
  expect(Math.abs(b.cx - 0.5)).toBeLessThan(0.1);
  await page.getByRole('button', { name: 'Sklopi' }).click();
  await page.getByRole('button', { name: 'Otvori' }).click();
  await expect(page.getByRole('button', { name: 'Zatvori' })).toBeVisible();
});

test('a cut-list line marks its boards and back', async ({ page }) => {
  await to3d(page);
  await page.getByRole('row', { name: /Pod fioke/ }).click();
  await expect(page.locator('tr[aria-selected="true"]')).toHaveCount(1);
  await page.getByRole('row', { name: /Pod fioke/ }).click();
  await expect(page.locator('tr[aria-selected="true"]')).toHaveCount(0);
});

test('right column: accordion, all open, the cut list first; a card folds', async ({ page }) => {
  await open(page, '/element/D4');
  const triggers = page.locator('[data-slot="accordion-trigger"]');
  await expect(triggers.first()).toHaveText(/Krojna lista — D4/);
  for (const t of await triggers.all()) await expect(t).toHaveAttribute('aria-expanded', 'true');
  await triggers.first().click();
  await expect(triggers.first()).toHaveAttribute('aria-expanded', 'false');
});

test('splitter: drag, remembered, double click back to 55 %', async ({ page }) => {
  await open(page, '/element/D4');
  const sep = page.getByRole('separator', { name: 'Širina crteža' });
  const b = (await sep.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, 500); await page.mouse.down(); await page.mouse.move(520, 500, { steps: 8 }); await page.mouse.up();
  await expect(sep).toHaveAttribute('aria-valuenow', '36');
  await page.reload();
  await expect(page.getByRole('separator', { name: 'Širina crteža' })).toHaveAttribute('aria-valuenow', '36');
  await page.getByRole('separator', { name: 'Širina crteža' }).dblclick();
  await expect(page.getByRole('separator', { name: 'Širina crteža' })).toHaveAttribute('aria-valuenow', '55');
});

test('Otvori u konfiguratoru (not for the dishwasher front); shared plinth note', async ({ page }) => {
  await open(page, '/element/D4');
  await expect(page.getByText('Sokla je zajednička za ceo niz')).toBeVisible();
  await page.getByRole('link', { name: 'Otvori u konfiguratoru' }).click();
  await expect(page).toHaveURL(/prilagodjeni\?element=D4/);
  await page.goto('/element/D3');
  await expect(page.getByRole('link', { name: 'Otvori u konfiguratoru' })).toHaveCount(0);
});
