import { describe, expect, it } from 'vitest';
import { project as fixtureProject, expected as fixtureExpected } from './fixtureProject';
import { generateParts, hardware, type Project } from '../src';

const base = fixtureProject;
const under: Project = { ...base, rules: { ...base.rules, bottomMode: 'under' } };
const dims = (p: Project, label: string) =>
  Object.fromEntries(generateParts(p).filter(x => x.pos.startsWith(label + '-')).map(x => [x.name, [x.qty, x.length, x.width]]));

describe('bottomMode under', () => {
  it('base unit: bottom full width, sides shorter by t', () => {
    const d2 = dims(under, 'D2');
    expect(d2['Bok']).toEqual([2, 702, 560]);
    expect(d2['Dno']).toEqual([1, 800, 560]);
    expect(d2['Vezna letva']).toEqual([2, 764, 100]); // rails stay between the sides
  });

  it('tall unit: bottom/top full width, divider between, sides shorter by 2t; same dowel count', () => {
    const v1 = dims(under, 'V1');
    expect(v1['Bok']).toEqual([2, 2034, 560]);
    expect(v1['Dno / vrh']).toEqual([2, 600, 560]);
    expect(v1['Pregrada']).toEqual([1, 564, 560]);
    const dowels = (p: Project) => hardware(p).find(h => h.sku === 'tipl-8x35')!.qty;
    expect(dowels(under)).toBe(dowels(base));
  });
});
