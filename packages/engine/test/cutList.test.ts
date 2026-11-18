import { describe, expect, it } from 'vitest';
import fixture from '../../../fixtures/kuhinja-petrovic.json';
import { cutListRows, edgeCode, format, generateParts, mergeParts, toCsv, type Project } from '../src';

const project = fixture.project as unknown as Project;
const parts = generateParts(project);
const merged = mergeParts(parts);

describe('cut list', () => {
  it('merging keeps every piece', () => {
    expect(merged.reduce((s, m) => s + m.qty, 0)).toBe(81);
    expect(merged.length).toBeLessThan(parts.length);
  });

  it('merges identical sides across elements and joins names', () => {
    const sides = merged.find(m => m.name === 'Bok' && m.length === 720 && m.width === 560)!;
    expect(sides.qty).toBe(10);
    expect(sides.elementIds).toEqual(['D1', 'D2', 'D4', 'D5', 'D6']);
    // D4 bottom and V1 bottom/top/divider are the same 564×560 panel.
    expect(merged.find(m => m.length === 564 && m.width === 560)!.name).toBe('Dno, Dno / vrh / pregrada');
  });

  it('keeps parts with a note separate', () => {
    expect(merged.filter(m => m.note).map(m => m.positions)).toEqual([['D2-4']]);
  });

  it('formats edges and units', () => {
    expect(edgeCode({ L1: 0.8, L2: 0, W1: 0, W2: 0 })).toBe('1D 0,8');
    expect(edgeCode({ L1: 2, L2: 2, W1: 2, W2: 2 })).toBe('2D 2K 2');
    expect(edgeCode({ L1: 0, L2: 0, W1: 0, W2: 0 })).toBe('—');
    expect([format(720, 'mm'), format(720, 'cm'), format(397, 'cm')]).toEqual(['720', '72,0', '39,7']);
  });

  it('CSV uses semicolons, decimal commas and quotes when needed', () => {
    const csv = toCsv(cutListRows(merged, project.materials, 'mm'));
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(merged.length + 1);
    expect(lines[0].startsWith('Materijal;Deo;Elementi;Kom;Dužina (mm)')).toBe(true);
    expect(lines.find(l => l.includes('izrez'))).toContain(';Leđa;D2;1;796;716;—;');
    expect(toCsv([['a;b', 'x"y']])).toBe('"a;b";"x""y"\r\n');
  });
});
