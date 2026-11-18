import { describe, expect, it } from 'vitest';
import { project } from './fixtureProject';
import { compareSuppliers, EXAMPLE_SUPPLIERS } from '../src';

describe('supplier comparison (design/screens/Poredjenje.html)', () => {
  const c = compareSuppliers(project, EXAMPLE_SUPPLIERS);
  const rsd = (p: number | null) => (p === null ? null : p / 100);

  it('lines and totals per supplier', () => {
    expect(c.quotes.map(q => rsd(q.total))).toEqual([99910, 95420, 103520, null]);
    expect(c.quotes[1].lines!.map(rsd)).toEqual([43200, 31400, 9440, 11380, 0]);
    expect(rsd(c.best)).toBe(95420);
  });

  it('suggests a split only when it beats the best single supplier', () => {
    expect([c.split?.sheetsAt.id, c.split?.worktopsAt.id, rsd(c.split!.total), rsd(c.split!.saving)]).toEqual(['B', 'C', 94820, 600]);
    const onlyAB = compareSuppliers(project, EXAMPLE_SUPPLIERS.filter(s => s.id !== 'C'));
    expect(onlyAB.split).toBeNull(); // A's worktops (29.000 + 2.500 delivery) do not beat B's 31.400
  });
});
