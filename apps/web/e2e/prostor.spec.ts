// Prostor (2D editor): replacing the room asks first and can be undone; Esc cancels placing; double click opens the Konfigurator
// and its back returns here; the library hover shows the unit in 3D.
import { expect, test } from '@playwright/test';
import { open } from './util';

const menu = async (page: import('@playwright/test').Page, item: string) => {
  await page.getByRole('button', { name: 'Projekat' }).click();
  await page.getByRole('menuitem', { name: item }).click();
};

test('Novi prazan prostor: dialog, Otkaži keeps the room, Da empties it, Poništi brings it back', async ({ page }) => {
  await open(page, '/projekat');
  await menu(page, 'Novi prazan prostor');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Otkaži' }).click();
  await expect(page.getByText('D5 · 600')).toBeVisible();
  await menu(page, 'Novi prazan prostor');
  await page.getByRole('button', { name: 'Da, izbriši i počni ispočetka' }).click();
  await expect(page.getByText('D5 · 600')).toHaveCount(0);
  await page.getByRole('status').getByRole('button', { name: 'Poništi' }).click();
  await expect(page.getByText('D5 · 600')).toBeVisible();
});

test('Učitaj primer asks first too', async ({ page }) => {
  await open(page, '/projekat');
  await menu(page, 'Učitaj primer');
  await expect(page.getByRole('alertdialog')).toContainText('Učitati primer?');
});

test('Esc cancels placing an obstacle from the library', async ({ page }) => {
  await open(page, '/projekat');
  await page.getByRole('tab', { name: 'Prepreke' }).click();
  const item = page.getByRole('button', { name: /^Radijator/ });
  await item.click();
  await expect(item).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(item).toHaveAttribute('aria-pressed', 'false');
});

test('double click on a unit opens it in the Konfigurator; back returns to Prostor', async ({ page }) => {
  await open(page, '/projekat');
  await page.waitForTimeout(500);
  // the label text lets clicks through; click the unit body just under it (select first, then double click)
  const b = (await page.locator('svg text', { hasText: /^D2/ }).first().boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height + 20);
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height + 20);
  await expect(page).toHaveURL(/prilagodjeni\?element=D2&iz=prostor/);
  await page.getByRole('link', { name: 'Prostor' }).first().click();
  await expect(page).toHaveURL(/\/projekat$/);
});

test('library: hover a unit → its 3D card', async ({ page }) => {
  await open(page, '/projekat');
  await page.getByRole('button', { name: /Fiokar 2 fioke/ }).first().hover();
  await expect(page.locator('[data-slot="hover-card-content"]')).toContainText('Fiokar 2 fioke');
  await expect(page.locator('[data-slot="hover-card-content"] canvas')).toHaveCount(1);
});
