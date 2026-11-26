// Konfigurator: undo / redo, parts from leftover boards, resizable side panels, 3D tab centred.
import { expect, test } from '@playwright/test';
import { drawnBox, open, orbit } from './util';

test('undo / redo with the buttons and Ctrl+Z / Ctrl+Shift+Z', async ({ page }) => {
  await open(page, '/prilagodjeni?element=D4');
  const undo = page.getByRole('button', { name: 'Poništi' }), redo = page.getByRole('button', { name: 'Vrati', exact: true });
  const summary = page.locator('h1 + span');
  await expect(undo).toBeDisabled();
  await page.getByRole('button', { name: '800', exact: true }).click(); await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Dodaj red' }).click(); await page.waitForTimeout(700);
  await expect(summary).toContainText('800 ×'); await expect(summary).toContainText('4 reda');
  await undo.click(); await expect(summary).toContainText('3 reda');
  await undo.click(); await expect(summary).toContainText('600 ×');
  await redo.click(); await expect(summary).toContainText('800 ×');
  await page.locator('body').click({ position: { x: 700, y: 140 } });
  await page.keyboard.press('Control+z'); await expect(summary).toContainText('600 ×');
  await page.keyboard.press('Control+Shift+z'); await expect(summary).toContainText('800 ×');
});

test('a cut-list line: change the count, delete it, bring it back; shown on the Element page', async ({ page }) => {
  await open(page, '/prilagodjeni?element=D4');
  const edit = () => page.getByRole('button', { name: 'Izmeni deo: Stranica' }).first().click();
  await edit();
  await page.getByLabel(/Količina/).fill('1');
  await page.getByLabel(/Napomena/).fill('jedna već postoji');
  await page.locator('[data-slot="popover-content"][data-state="open"]').getByRole('button', { name: 'Sačuvaj', exact: true }).click();
  await expect(page.getByText('bilo 2')).toBeVisible();
  await page.getByRole('button', { name: 'Izmeni deo: Vezni komad' }).click();
  await page.locator('[data-slot="popover-content"][data-state="open"]').getByRole('button', { name: 'Obriši deo', exact: true }).click();
  await expect(page.getByText('obrisan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sačuvaj izmene' }).click();
  await page.goto('/element/D4');
  await expect(page.getByText('bilo 2')).toBeVisible();
  await expect(page.getByText('obrisan', { exact: true })).toBeVisible();
  await page.goto('/prilagodjeni?element=D4');
  await edit();
  await page.locator('[data-slot="popover-content"][data-state="open"]').getByRole('button', { name: 'Vrati kako je bilo' }).click();
  await expect(page.getByText('bilo 2')).toHaveCount(0);
});

test('side panels resize and are remembered', async ({ page }) => {
  await open(page, '/prilagodjeni?element=D4');
  const drag = async (name: string, to: number) => {
    const b = (await page.getByRole('separator', { name }).boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, 500); await page.mouse.down(); await page.mouse.move(to, 500, { steps: 8 }); await page.mouse.up();
  };
  await drag('Širina podešavanja', 320);
  await drag('Širina krojne liste', 880);
  await expect(page.getByRole('separator', { name: 'Širina podešavanja' })).toHaveAttribute('aria-valuenow', '320');
  await expect(page.getByRole('separator', { name: 'Širina krojne liste' })).toHaveAttribute('aria-valuenow', '560');
  await page.reload();
  await expect(page.getByRole('separator', { name: 'Širina krojne liste' })).toHaveAttribute('aria-valuenow', '560');
});

test('3D tab: the unit is centred and orbits its own axis', async ({ page }) => {
  await open(page, '/prilagodjeni?element=D4');
  await page.getByRole('tab', { name: '3D', exact: true }).click(); await page.waitForTimeout(1500);
  const a = await drawnBox(page, 'main');
  expect(Math.abs(a.cx - 0.5)).toBeLessThan(0.08);
  await orbit(page, 250, 'main');
  const b = await drawnBox(page, 'main');
  expect(Math.abs(b.cx - 0.5)).toBeLessThan(0.08);
});
