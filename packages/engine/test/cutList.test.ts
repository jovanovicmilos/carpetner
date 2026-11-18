import { describe, expect, it } from 'vitest';
import { project as fixtureProject, expected as fixtureExpected } from './fixtureProject';
import { cutListRows, edgeCode, firstSheet, format, generateParts, mergeParts, toCsv } from '../src';

const project = fixtureProject;
const parts = generateParts(project);
const merged = mergeParts(parts);

describe('cut list', () => {
  it('merging keeps every piece', () => {
    expect(merged.reduce((s, m) => s + m.qty, 0)).toBe(81);
    expect(merged.length).toBeLessThan(parts.length);
  });

  it('merges identical parts with the same name across elements', () => {
    const sides = merged.find(m => m.name === 'Bok' && m.length === 720 && m.width === 560)!;
    expect(sides.qty).toBe(10);
    expect(sides.elementIds).toEqual(['D1', 'D2', 'D4', 'D5', 'D6']);
    // Same 564×560 panel but different names stay separate rows (design/screens/KrojnaLista.html).
    expect(merged.filter(m => m.length === 564 && m.width === 560).map(m => [m.name, m.qty])).toEqual([['Dno', 3], ['Dno / vrh / pregrada', 3]]);
  });

  it('keeps parts with a note separate', () => {
    expect(merged.filter(m => m.note).map(m => m.positions)).toEqual([['D2-4']]);
  });

  it('formats edges and units', () => {
    expect(edgeCode({ L1: 0.8, L2: 0, W1: 0, W2: 0 })).toBe('1D · 0,8');
    expect(edgeCode({ L1: 2, L2: 2, W1: 2, W2: 2 })).toBe('2D 2K · 2');
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

  it('first sheet: shelves without overlaps, inside the sheet', () => {
    const sheet = { l: 2800, w: 2070 };
    const r = firstSheet(parts.filter(p => p.materialId === 'iv18-w980'), sheet);
    expect(r.pieces.length).toBeGreaterThan(10);
    for (const a of r.pieces) {
      expect(a.x + a.l <= sheet.l && a.y + a.w <= sheet.w).toBe(true);
      for (const b of r.pieces) if (a !== b) expect(a.x + a.l <= b.x || b.x + b.l <= a.x || a.y + a.w <= b.y || b.y + b.w <= a.y).toBe(true);
    }
    expect(r.utilization).toBeGreaterThan(50);
    expect(r.utilization).toBeLessThanOrEqual(100);
  });
});
