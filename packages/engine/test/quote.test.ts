import { describe, expect, it } from 'vitest';
import { project } from './fixtureProject';
import { cuttingMeters, quote } from '../src';

describe('quote (design/screens/Obracun.html with the example price list)', () => {
  const q = quote(project);
  const rsd = (p: number) => p / 100;

  it('section totals and the final price', () => {
    expect(q.sections.map(s => rsd(s.total))).toEqual([97410, 45300, 45000]);
    expect([rsd(q.margin), rsd(q.net), rsd(q.vat), rsd(q.total)]).toEqual([35678, 223388, 44678, 268066]);
  });

  it('cut length and line details', () => {
    expect(cuttingMeters(project)).toBe(118);
    const s2 = q.sections[1].lines;
    expect(s2.find(l => l.name === 'Nogice + klipse')).toMatchObject({ qty: '24 + 12', amount: 174000 });
    expect(s2.find(l => l.name.startsWith('Sokla'))).toMatchObject({ qty: '5,0 + 4,4', amount: 758000 });
  });

  it('discount lowers the net before VAT', () => {
    const d = quote(project, undefined, { marginPct: 25, vatPct: 20, discountPct: 10, installDays: 1 });
    expect(rsd(d.discount)).toBe(22339);
    expect(d.net).toBe(q.net - d.discount);
  });
});
