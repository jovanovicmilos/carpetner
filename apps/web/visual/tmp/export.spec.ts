import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const project = JSON.parse(readFileSync(new URL('../../../../fixtures/kuhinja-petrovic.json', import.meta.url), 'utf8')).project;

test('Nacrti exports', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(p => localStorage.setItem('kroj-project', JSON.stringify({ state: { project: p }, version: 0 })), project);
  await page.goto('/nacrti');
  const grab = async (name: RegExp) => {
    const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name }).first().click()]);
    return [d.suggestedFilename(), readFileSync((await d.path())!)] as const;
  };
  const [dxfName, dxf] = await grab(/^DXF Nacrt sa slojevima/);
  const t = dxf.toString('latin1');
  console.log(dxfName, dxf.length, 'LINE', t.split('\r\nLINE\r\n').length - 1, 'TEXT', t.split('\r\nTEXT\r\n').length - 1);
  for (const l of ['FRONTE', 'KOTE', 'OTVARANJE', 'INSTALACIJE', 'RADNA_PLOCA']) expect(t).toContain(`\r\n8\r\n${l}\r\n`);
  expect(t).toMatch(/\r\n1\r\nD2\r\n/);
  // wall A inner rectangle: width 3200 mm, height 2600 mm somewhere among the lines
  const xs = [...t.matchAll(/\r\n10\r\n(-?[\d.]+)\r\n20\r\n(-?[\d.]+)\r\n30\r\n0\.0\r\n11\r\n(-?[\d.]+)\r\n21\r\n(-?[\d.]+)/g)].map(m => [m[1], m[2], m[3], m[4]].map(Number));
  const lengths = xs.map(([a, b, c, d]) => Math.round(Math.hypot(c - a, d - b)));
  console.log('has 3200:', lengths.includes(3200), 'has 2600:', lengths.includes(2600), 'has 800:', lengths.includes(800));
  const [svgName, svg] = await grab(/^SVG/);
  console.log(svgName, svg.length, svg.toString().slice(0, 60));
  const [glbName, glb] = await grab(/^GLB/);
  console.log(glbName, glb.length, glb.subarray(0, 4).toString());
  const [csvName] = await grab(/^CSV/);
  console.log(csvName);
  await page.getByRole('button', { name: /^DAE/ }).click();
  console.log(await page.getByRole('status').textContent());
  await page.evaluate(() => { window.print = () => {}; });
  await page.getByRole('button', { name: 'PDF A3 — svi nacrti' }).click();
  await page.emulateMedia({ media: 'print' });
  console.log('print sheets', await page.locator('.dr-print .dr-frame').count());
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-milosjovanovic-Projects-carpetner/73d7ed5c-dde2-4ee5-81ff-f2952506f28e/scratchpad/print.png' });
});
