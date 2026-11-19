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
    expect(d2['Stranica']).toEqual([2, 702, 560]);
    expect(d2['Pod']).toEqual([1, 800, 560]);
    expect(d2['Vezni komad']).toEqual([2, 764, 100]); // rails stay between the sides
  });

  it('tall unit: bottom/top full width, divider between, sides shorter by 2t; same dowel count', () => {
    const v1 = dims(under, 'V1');
    expect(v1['Stranica']).toEqual([2, 2034, 560]);
    expect(v1['Pod / plafon']).toEqual([2, 600, 560]);
    expect(v1['Srednja stranica']).toEqual([1, 564, 560]);
    const dowels = (p: Project) => hardware(p).find(h => h.sku === 'tipl-8x35')!.qty;
    expect(dowels(under)).toBe(dowels(base));
  });
});

describe('backMode (docs/KONSTRUKCIJA.md "Varijante leđa")', () => {
  const withBack = (backMode: Project['rules']['backMode']): Project => ({ ...base, rules: { ...base.rules, backMode } });
  const staples = (p: Project) => hardware(p).find(h => h.sku === 'klamerica')?.qty ?? 0;
  const confirmats = (p: Project) => hardware(p).find(h => h.sku === 'konfirmat-7x50')!.qty;

  it('groove: base (W−22)×(H−11), wall unit with top (W−22)×(H−22), no staples', () => {
    const p = withBack('groove');
    expect(dims(p, 'D2')['Poleđina']).toEqual([1, 778, 709]);
    expect(dims(p, 'G1')['Poleđina']).toEqual([1, 698, 578]);
    expect(staples(p)).toBe(0);
  });

  it('inset18: back (W−36)×(H−18) in carcass board without edge, bottom D−18, one rail, extra confirmats', () => {
    const p = withBack('inset18');
    const d2 = dims(p, 'D2');
    expect(d2['Poleđina']).toEqual([1, 764, 702]);
    expect(d2['Pod']).toEqual([1, 764, 542]);
    expect(d2['Vezni komad']).toEqual([1, 764, 100]);
    const back = generateParts(p).find(x => x.pos.startsWith('D2-') && x.name === 'Poleđina')!;
    expect(back.materialId).toBe(base.elements.find(e => e.label === 'D2')!.materials.carcass);
    expect(back.edges).toEqual({ L1: 0, L2: 0, W1: 0, W2: 0 });
    expect(dims(p, 'G1')['Pod / plafon']).toEqual([2, 564, 302]);
    expect(staples(p)).toBe(0);
    const onlyD2 = (q: Project): Project => ({ ...q, elements: q.elements.filter(e => e.label === 'D2') });
    expect(confirmats(onlyD2(base))).toBe(8); // 2 ends × (2 bottom + 2 × 1 rail)
    expect(confirmats(onlyD2(p))).toBe(14); // 2 ends × (2 bottom + 1 rail) + 3 per side + 2 through the bottom
  });
});
