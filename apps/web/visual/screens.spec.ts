// One test per screen: app route vs design/screens/<Screen>.png at the reference viewport, filled with the "Kuhinja Petrović" fixture.
import { expect, test } from '@playwright/test';
import { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('../../../fixtures/kuhinja-petrovic.json', import.meta.url), 'utf8')).project;
// Progress state of the references' header (docs/TOK_PROJEKTA.md): drawings reviewed, worktop picked, all elements confirmed
// except D5, G3, G4, V1. None of it changes anything else on the screens. (The design counts 13 elements; the fixture has 12.)
const fixture = {
  ...raw, look: { worktop: 'Hrast' }, marks: { drawingsSeen: ['front', 'top'], drawingsReviewed: true },
  elements: raw.elements.map((e: { id: string }) => (['D5', 'G3', 'G4', 'V1'].includes(e.id) ? e : { ...e, confirmedAt: '2026-11-19T10:00:00Z' })),
};
// design/screens/fonts-test.css with its fonts inlined as data: URLs (the page cannot resolve the relative font paths).
const FONT_DIR = new URL('../../../design/screens/', import.meta.url);
const fontsCss = readFileSync(new URL('fonts-test.css', FONT_DIR), 'utf8')
  .replace(/url\((fonts\/[^)]+)\)/g, (_, f: string) => `url(data:font/${f.endsWith('.ttf') ? 'ttf' : 'otf'};base64,${readFileSync(new URL(f, FONT_DIR)).toString('base64')})`);
// Reference PNGs under the names Playwright looks for (see playwright.config.ts).
const SNAPS = new URL('../.snapshots/', import.meta.url);
mkdirSync(SNAPS, { recursive: true });
for (const f of readdirSync(FONT_DIR)) if (f.endsWith('.png')) copyFileSync(new URL(f, FONT_DIR), new URL(f.replace(/_/g, '-'), SNAPS));
// Screens the user approved in the app instead of the design picture (user 2026-11-19: the WebGL realistic 3D replaces the
// SVG illustration of Pogled3D, Pogled3D_vece, Pogled3D_slika). They override the design copies.
const APPROVED = new URL('./approved/', import.meta.url);
for (const f of readdirSync(APPROVED)) if (f.endsWith('.png')) copyFileSync(new URL(f, APPROVED), new URL(f.replace(/_/g, '-'), SNAPS));

const screens: { file: string; w: number; h: number; base?: string; act?: (page: import('@playwright/test').Page) => Promise<void> }[] = JSON.parse(readFileSync(new URL('../../../design/screens/screens.json', import.meta.url), 'utf8'));

const DOCS = new Set(['KrojnaLista', 'Obracun', 'Poredjenje', 'Cenovnik', 'Standardi', 'AIPodesavanja', 'Prijava']); // scrolling pages: whole page
// Screens that exist in the app so far; the rest are added as they are built.
const ROUTES: Record<string, string> = {
  Main: '/projekat', Nacrti: '/nacrti', Pogled3D: '/3d', Obracun: '/ponuda', Poredjenje: '/poredjenje', Cenovnik: '/admin/cenovnik', Standardi: '/admin/standardi', AIPodesavanja: '/admin/ai', Prijava: '/prijava', AIPredlog: '/ai-predlog', Zid: '/zid/A', Element: '/element/D2', KrojnaLista: '/krojna-lista', BrziStart: '/brzi-start', Konfigurator: '/prilagodjeni', Projekti: '/projekti', Pretplata: '/pretplata', KupacStart: '/kupac', KupacEditor: '/kupac/kuhinja', Planer: '/kupac/kuhinja', PlanerStolar: '/planer', Pregled: '/kupac/pregled', KupacPosalji: '/kupac/posalji', Pocetna: '/', Inspiracija: '/inspiracija', Kuhinja: '/kuhinja/2', ZaStolare: '/za-stolare',
};

// Extra states from tools/screenshot_screens.py: [screen file, base screen, action].
const STATES: [string, string, (page: import('@playwright/test').Page) => Promise<void>][] = [
  ['Main_prazan', 'Main', async page => { await page.getByRole('button', { name: 'Projekat' }).click(); await page.getByRole('menuitem', { name: 'Novi prazan prostor' }).click(); }],
  // D2 as tools/screenshot_screens.py: click on its label; right-click 30/40 px past the label's corner (reference: label at 743,290).
  ['Main_izabrano', 'Main', page => page.mouse.click(770, 296)],
  ['Main_desni_klik', 'Main', async page => { await page.mouse.click(770, 296); await page.mouse.click(775, 330, { button: 'right' }); }],
  ['Main_provera', 'Main', page => page.getByRole('button', { name: 'Sve je u redu' }).click()],
  ['Main_bez_pomoci', 'Main', page => page.getByRole('button', { name: 'Pomoć' }).click()],
  ['Nacrti_odozgo', 'Nacrti', page => page.getByRole('tab', { name: 'Odozgo · otvaranje' }).click()],
  ['Nacrti_radne_ploce', 'Nacrti', page => page.getByRole('tab', { name: 'Radne ploče' }).click()],
  ['Nacrti_tehnicki', 'Nacrti', page => page.getByRole('radio', { name: 'Tehnički', exact: true }).click()],
  ['Element_korak_hover', 'Element', async page => { await page.locator('nav[aria-label="Koraci projekta"] .k-step').nth(3).hover(); }],
  ['Element_sablon', 'Element', page => page.getByRole('button', { name: 'Sačuvaj kao šablon' }).click()],
  ['Pogled3D_tehnicki', 'Pogled3D', page => page.getByRole('button', { name: 'Tehnički', exact: true }).first().click()],
  ['Pogled3D_vece', 'Pogled3D', page => page.getByRole('radio', { name: 'Veče' }).click()],
  ['Pogled3D_slika', 'Pogled3D', page => page.getByRole('button', { name: 'Slika za ponudu' }).click()],
  ['Konfigurator_pritisak', 'Konfigurator', page => page.getByRole('button', { name: /^Na pritisak/ }).click()],
  ['Konfigurator_visoki', 'Konfigurator', async page => { await page.getByRole('radio', { name: 'Visoki', exact: true }).click(); await page.getByRole('button', { name: 'Rerna + mikro' }).click(); }],
  // Element_fiokar.png is not compared: after picking "Fiokar" the reference keeps D2's sink cut list on the right (a mock
  // state), while the app recalculates it as the design text says. The left card is checked by eye against it.
];
// Reference data that differs from the fixture, set through the UI before every state of that screen:
// Pogled3D shows white MDF fronts and the top profile (design "Izgled za kupca" state).
const projectHandles = async (page: import('@playwright/test').Page) => {
  await page.getByRole('combobox', { name: 'Ručke u projektu' }).click();
  await page.getByRole('option', { name: 'Profil na vrhu fronte' }).click();
};
const PREP: Record<string, (page: import('@playwright/test').Page) => Promise<void>> = {
  // Reference state: Pro trial on day 18 of 30 (12 days left). The page shows the top 1000 px; the lock-pattern section
  // below it in the reference documents locks.tsx and is not part of the screen.
  Pretplata: async page => {
    await page.evaluate(() => {
      const d = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
      localStorage.setItem('kroj-plan', JSON.stringify({ state: { grants: [{ product: 'start', from: d(-18) }, { product: 'pro', from: d(-18), to: d(12), trial: true }] }, version: 0 }));
    });
    await page.reload();
    await page.addStyleTag({ content: fontsCss });
    await page.evaluate(() => document.fonts.ready);
  },
  // Main shows "Profil na vrhu fronte" as the project's handles (library select, right-click menu).
  Main: projectHandles,
  // Konfigurator's references show the same project handles ("Kao projekat (profil)"): set on Prostor, then back.
  Konfigurator: async page => {
    await page.goto('/projekat'); await projectHandles(page);
    await page.goto('/prilagodjeni'); await page.addStyleTag({ content: fontsCss }); await page.evaluate(() => document.fonts.ready);
  },
  Pogled3D: async page => { await page.getByRole('button', { name: 'Bela mat' }).click(); await page.getByRole('button', { name: 'Profil na vrhu' }).click(); },
};
// A state's viewport is its reference size (PNG header: width at byte 16, height at byte 20).
const pngSize = (f: string) => { const b = readFileSync(new URL(f, FONT_DIR)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
for (const [file, base, act] of STATES) screens.push({ ...pngSize(`${file}.png`), file: `${file}.html`, act, base });

for (const s of screens) {
  const name = s.file.replace('.html', '');
  const route = ROUTES[s.base ?? name];
  test(name, async ({ page }) => {
    test.skip(!route, 'screen not built yet');
    test.skip(['KupacEditor', 'Planer', 'PlanerStolar', 'Pregled', 'KupacPosalji'].includes(name), 'reference draws a mock row of units (its own model), the app draws the real project with Plan.tsx; checked by eye');
    test.skip(name === 'PlanerTelefon', 'reference is a board of three 390 px phones (/kupac, /kupac/kuhinja, /kupac/pregled), not one page; checked by eye with visual/tmp-phone.spec.ts');
    test.skip(name === 'Projekti', 'reference lists six example projects that are not real data; checked by eye (one real project here)');
    // DESIGN_SPEC §8: Google Fonts blocked, local test fonts injected, like the reference renders.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    // Document screens were captured with the full reference height as viewport (shells use min-height: 100vh).
    await page.setViewportSize({ width: s.w, height: DOCS.has(name) ? pngSize(`${name}.png`).h : Math.min(s.h, 1000) });
    await page.goto('/');
    await page.evaluate(p => { localStorage.setItem('kroj-project', JSON.stringify({ state: { project: p }, version: 0 })); localStorage.removeItem('kroj.help'); }, fixture);
    await page.goto(route);
    await page.addStyleTag({ content: fontsCss });
    await page.evaluate(() => document.fonts.ready);
    await PREP[s.base ?? name]?.(page);
    if (s.act) await s.act(page);
    if (!name.endsWith('_hover')) await page.mouse.move(0, 0); // hover states keep the pointer where the action left it
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: DOCS.has(name) });
  });
}

// DESIGN_SPEC §6: the project steps never move — same x for every step link on all project screens (1440 px).
test('ProjectHeader steps stay in place', async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.evaluate(p => localStorage.setItem('kroj-project', JSON.stringify({ state: { project: p }, version: 0 })), fixture);
  const xs: Record<string, number[]> = {};
  for (const route of ['/projekat', '/zid/A', '/nacrti', '/3d', '/element/D2', '/prilagodjeni', '/krojna-lista', '/poredjenje', '/ponuda']) {
    await page.goto(route);
    await page.addStyleTag({ content: fontsCss });
    await page.evaluate(() => document.fonts.ready);
    xs[route] = await page.locator('nav[aria-label="Koraci projekta"] .k-step').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().x)));
  }
  const first = Object.values(xs)[0];
  expect(first).toHaveLength(6);
  for (const [route, x] of Object.entries(xs)) expect(x, route).toEqual(first);
});
