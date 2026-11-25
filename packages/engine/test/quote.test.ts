import { describe, expect, it } from 'vitest';
import { project } from './fixtureProject';
import { cuttingMeters, generateParts, quote, sheetEstimate } from '../src';

describe('quote (design/screens/Obracun.html with the example price list)', () => {
  const q = quote(project);
  const rsd = (p: number) => p / 100;

  it('section totals and the final price', () => {
    expect(q.sections.map(s => rsd(s.total))).toEqual([100790, 44938.2, 45000]);
    expect([rsd(q.margin), rsd(q.net), rsd(q.vat), rsd(q.total)]).toEqual([36432, 227160.2, 45432, 272592.2]);
  });

  it('cut length and line details', () => {
    expect(cuttingMeters(project)).toBe(140);
    const s2 = q.sections[1].lines;
    expect(s2.find(l => l.name === 'Nogice + klipse')).toMatchObject({ qty: '24 + 12', amount: 174000 });
    expect(s2.find(l => l.name.startsWith('Sokla'))).toMatchObject({ qty: '4,6 + 4,4', amount: 721820 });
  });

  it('discount lowers the net before VAT', () => {
    const d = quote(project, undefined, { marginPct: 25, vatPct: 20, discountPct: 10, installDays: 1 });
    expect(rsd(d.discount)).toBe(22716);
    expect(d.net).toBe(q.net - d.discount);
  });
});

describe('sheetRounding (Cenovnik)', () => {
  it('whole, half and exact sheets from the same area', () => {
    const at = (sheetRounding: 'sheet' | 'half' | 'm2') =>
      sheetEstimate(generateParts(project), project.materials, { ...project.rules, sheetRounding }).map(s => s.sheets);
    const whole = at('sheet'), half = at('half'), exact = at('m2');
    expect(whole).toEqual(sheetEstimate(generateParts(project), project.materials, project.rules).map(s => s.sheets)); // default
    whole.forEach((w, i) => {
      expect(Number.isInteger(w)).toBe(true);
      expect(Number.isInteger(half[i] * 2)).toBe(true);
      expect(exact[i]).toBeLessThanOrEqual(half[i] + 0.005);
      expect(half[i] - exact[i]).toBeLessThan(0.505);
      expect(half[i]).toBeLessThanOrEqual(w);
    });
    expect(exact.some(x => !Number.isInteger(x))).toBe(true);
  });
});
