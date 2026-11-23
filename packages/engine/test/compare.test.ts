import { describe, expect, it } from 'vitest';
import { project } from './fixtureProject';
import { compareSuppliers, EXAMPLE_SUPPLIERS } from '../src';

describe('supplier comparison (design/screens/Poredjenje.html)', () => {
  const c = compareSuppliers(project, EXAMPLE_SUPPLIERS);
  const rsd = (p: number | null) => (p === null ? null : p / 100);

  it('lines and totals per supplier', () => {
    expect(c.quotes.map(q => rsd(q.total))).toEqual([100650, 96080, 104320, null]);
    expect(c.quotes[1].lines!.map(rsd)).toEqual([43200, 31400, 10000, 11480, 0]);
    expect(rsd(c.best)).toBe(96080);
  });

  it('suggests a split only when it beats the best single supplier', () => {
    expect([c.split?.sheetsAt.id, c.split?.worktopsAt.id, rsd(c.split!.total), rsd(c.split!.saving)]).toEqual(['B', 'C', 95480, 600]);
    const onlyAB = compareSuppliers(project, EXAMPLE_SUPPLIERS.filter(s => s.id !== 'C'));
    expect(onlyAB.split).toBeNull(); // A's worktops (29.000 + 2.500 delivery) do not beat B's 31.400
  });
});

describe('incomplete supplier price lists', () => {
  it('a supplier without a price for a used board is listed as missing and does not win', () => {
    const cheap = { id: 'X', name: 'X', updated: '', leadDays: 1, prices: { sheets: { 'iv18-w980': 100 }, edgingPerM: { '0.8': 1, '2': 1 }, cuttingPerM: 1 } };
    const c = compareSuppliers(project, [...EXAMPLE_SUPPLIERS, cheap]);
    const x = c.quotes.find(q => q.supplier.id === 'X')!;
    expect([...x.missing].sort()).toEqual(['delivery', 'hdf3', 'iv16-w980', 'iv18-u708', 'worktop']);
    expect(c.best).toBe(compareSuppliers(project, EXAMPLE_SUPPLIERS).best);
  });
});
