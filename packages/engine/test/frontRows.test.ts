// Front rows + handles (docs/KATALOG.md, docs/OTVARANJE.md) with the workshop rules (user 2026-11-19: own rules, not the
// design's Konfigurator formulas; drawer box per slide, docs/KONSTRUKCIJA.md "Fioke i klizači"; fixed panel under each appliance; no back behind appliances).
// Cases = fixtures/konfigurator-primer.json inputs, numbers per docs/KONSTRUKCIJA.md.
import { describe, expect, it } from 'vitest';
import { EXAMPLE_PRICES, DEFAULT_QUOTE, generateParts, hardware, quote, type Element, type FrontRow, type OpeningSpec, type Project } from '../src';
import { project as fixture } from './fixtureProject';

const row = (type: FrontRow['type'], height: number | null, appliance?: string): FrontRow => ({ type, height, ...(appliance ? { appliance } : {}) });
function one(kind: Element['kind'], W: number, H: number, front: FrontRow[], opening: OpeningSpec, extra: Partial<Element> = {}): Project {
  const el: Element = {
    id: 'X', label: 'X', kind, wallId: 'A', offset: 0, width: W, height: H, depth: 560, legs: 100, front, opening,
    materials: { carcass: 'iv18-w980', front: 'iv18-u708', back: 'hdf3', drawerBottom: 'iv16-w980' }, ...extra,
  };
  return { ...fixture, rules: { ...fixture.rules, backMode: 'groove' }, elements: [el] };
}
const rows = (p: Project) => generateParts(p, false).filter(x => x.name !== 'Sokla').map(x => `${x.name} ${x.qty} ${x.length}×${x.width}${x.note ? ' ' + x.note : ''}`);
const hw = (p: Project) => Object.fromEntries(hardware(p).map(h => [h.sku, h.qty]));

describe('front rows', () => {
  const drawers = [row('drawer', 180), row('drawer', null), row('drawer', null)];

  it('fiokar 3 fioke, profile on top: fronts row − 4 − 20, profile = Σ front widths', () => {
    const p = one('drawer', 600, 720, drawers, { kind: 'profile' });
    expect(rows(p)).toEqual([
      'Stranica 2 720×560', 'Pod 1 564×560', 'Vezni komad 2 564×100', 'Poleđina 1 578×709',
      'Fronta fioke 1 597×156 −20 za profil', 'Fronta fioke 1 597×246 −20 za profil', 'Fronta fioke 1 597×246 −20 za profil',
      // GTV Versalite H45 500 (560 − 60): box 539 outside / 507 inside, 500 long; sides front − 50 → 120, 210; panels − 16 (bottom flush)
      'Stranica fioke 2 500×120', 'Stranica fioke 4 500×210', 'Prednja / zadnja strana fioke 2 507×104', 'Prednja / zadnja strana fioke 4 507×194',
      'Pod fioke 3 507×500',
    ]);
    expect(hw(p)).toMatchObject({ 'klizac-gtv-versalite-h45-500': 3, 'sraf-4x40': 36, 'profil-vrh': 1.79, 'nogica-100': 4 });
    expect(hw(p).rucka).toBeUndefined();
  });

  it('push to open: full fronts, push-to-open slides, no handles', () => {
    const p = one('drawer', 600, 720, drawers, { kind: 'push' });
    expect(rows(p).filter(r => r.startsWith('Fronta'))).toEqual(['Fronta fioke 1 597×176', 'Fronta fioke 1 597×266', 'Fronta fioke 1 597×266']);
    expect(hw(p)).toMatchObject({ 'klizac-gtv-h45-p2o-500': 3 });
    expect(Object.keys(hw(p)).filter(k => k.startsWith('rucka') || k === 'profil-vrh')).toEqual([]);
  });

  it('donji 2 krila 800, bar 160, 1 shelf', () => {
    const p = one('base', 800, 720, [row('door2', null)], { kind: 'bar', spacing: 160 }, { interior: { shelves: 1, innerDrawers: 0 } });
    expect(rows(p)).toEqual(['Stranica 2 720×560', 'Pod 1 764×560', 'Vezni komad 2 764×100', 'Fah 1 764×540', 'Poleđina 1 778×709', 'Krilo 2 716×397']);
    expect(hw(p)).toMatchObject({ sarka: 4, 'rucka-sipka-160': 2, 'nosac-police': 4 });
  });

  it('tall oven + microwave: fixed panel under each appliance, back only away from the appliances', () => {
    const p = one('tall', 600, 2100,
      [row('door', 520), row('app', 380, 'micro38'), row('app', 590, 'oven60'), row('drawer', null), row('drawer', null)], { kind: 'knob' });
    expect(rows(p)).toEqual([
      'Stranica 2 2100×560', 'Pod / plafon 2 564×560', 'Srednja stranica 3 564×560',
      'Poleđina (deo) 1 578×498', 'Poleđina (deo) 1 578×588',
      'Krilo 1 516×597', 'Fronta fioke 1 597×301', 'Fronta fioke 1 597×301',
      'Stranica fioke 4 500×250', 'Prednja / zadnja strana fioke 4 507×234', 'Pod fioke 2 507×500',
    ]);
    expect(hw(p)).toMatchObject({ sarka: 2, 'rucka-dugme': 3, 'klizac-gtv-versalite-h45-500': 2 });
  });

  it('built-in fridge (catalog tallFr): door on the fridge, divider, back only above it', () => {
    const p = one('tall', 600, 2100, [row('door', 460), row('door', null, 'fridgeBuiltIn178')], { kind: 'bar' });
    expect(rows(p)).toEqual([
      'Stranica 2 2100×560', 'Pod / plafon 2 564×560', 'Srednja stranica 1 564×560', 'Poleđina (deo) 1 578×438',
      'Krilo 1 456×597', 'Krilo 1 1636×597',
    ]);
    expect(hw(p)).toMatchObject({ sarka: 2 + 4, 'rucka-sipka-128': 2 });
  });
});

describe('quote', () => {
  it('lists board materials without a sheet price instead of hiding them', () => {
    expect(quote(fixture, EXAMPLE_PRICES, DEFAULT_QUOTE, 600).unpriced).toEqual([]);
    const p = { ...fixture, materials: { ...fixture.materials, x: { id: 'x', name: 'Iverica 18 orah H3734', thickness: 18, kind: 'chipboard' as const, grain: true } },
      elements: fixture.elements.map(e => ({ ...e, materials: { ...e.materials, front: 'x' } })) };
    expect(quote(p, EXAMPLE_PRICES, DEFAULT_QUOTE, 600).unpriced).toEqual(['Iverica 18 orah H3734']);
  });

  it('charges the top profile (0.1 m up), pushers, lift kits and glass frames', () => {
    const line = (p: Project, name: string) => quote(p, EXAMPLE_PRICES, DEFAULT_QUOTE, 600).sections[1].lines.find(l => l.name.startsWith(name));
    // 1.79 m of profile → 1,8 m ordered.
    expect(line(one('drawer', 600, 720, [row('drawer', 180), row('drawer', null), row('drawer', null)], { kind: 'profile' }), 'Alu profil'))
      .toMatchObject({ qty: '1,8', amount: 1.8 * EXAMPLE_PRICES.profilePerM });
    expect(line(one('base', 800, 720, [row('door2', null)], { kind: 'push' }), 'Potiskivač')).toMatchObject({ qty: '2', amount: 2 * EXAMPLE_PRICES.pusher });
    const up = one('wall', 600, 720, [row('glass', 360), row('lift', null)], { kind: 'bar' });
    expect(line(up, 'Mehanizam za kip')).toMatchObject({ qty: '1', amount: EXAMPLE_PRICES.liftKit });
    expect(line(up, 'Alu ram')).toMatchObject({ qty: '1', amount: EXAMPLE_PRICES.glassFrame });
  });
});
