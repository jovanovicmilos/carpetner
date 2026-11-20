import { describe, expect, it } from 'vitest';
import { project as fixtureProject, expected as fixtureExpected } from './fixtureProject';
import { cutListRows, cutSheets, edgeCode, format, generateParts, mergeParts, toCsv } from '../src';

const project = fixtureProject;
const parts = generateParts(project);
const merged = mergeParts(parts);

describe('cut list', () => {
  it('merging keeps every piece', () => {
    expect(merged.reduce((s, m) => s + m.qty, 0)).toBe(82);
    expect(merged.length).toBeLessThan(parts.length);
  });

  it('merges identical parts with the same name across elements', () => {
    const sides = merged.find(m => m.name === 'Stranica' && m.length === 720 && m.width === 560)!;
    expect(sides.qty).toBe(10);
    expect(sides.elementIds).toEqual(['D1', 'D2', 'D4', 'D5', 'D6']);
    // Same 564×560 panel but different names stay separate rows (design/screens/KrojnaLista.html).
    expect(merged.filter(m => m.length === 564 && m.width === 560).map(m => [m.name, m.qty])).toEqual([['Pod', 3], ['Pod / plafon / srednja stranica', 3]]);
  });

  it('keeps parts with a note separate', () => {
    expect(merged.filter(m => m.note).map(m => m.positions)).toEqual([['D2-4']]);
  });

  it('formats edges and units', () => {
    expect(edgeCode({ L1: 0.8, L2: 0, W1: 0, W2: 0 })).toBe('1D · 0,8');
    expect(edgeCode({ L1: 2, L2: 2, W1: 2, W2: 2 })).toBe('2D 2K · 2');
    expect(edgeCode({ L1: 0, L2: 0, W1: 0, W2: 0 })).toBe('—');
    // Band type from the rules (plain Bela 0,8 / ABS U708 2); a thickness not in the rules counts as ABS.
    const rules = { carcassEdge: { material: 'Bela', thickness: 0.8 }, frontEdge: { material: 'ABS U708', thickness: 2 } };
    expect(edgeCode({ L1: 2, L2: 2, W1: 2, W2: 2 }, rules)).toBe('2D 2K · 2 (ABS)');
    expect(edgeCode({ L1: 0.8, L2: 0, W1: 2, W2: 0 }, rules)).toBe('1D 1K · 0,8/2 (ABS)')
    expect(edgeCode({ L1: 0.8, L2: 0, W1: 0, W2: 0 }, rules)).toBe('1D · 0,8');
    expect(edgeCode({ L1: 0.8, L2: 0, W1: 2, W2: 0 }, { ...rules, carcassEdge: { material: 'PVC bela', thickness: 0.8 } })).toBe('1D 1K · 0,8 (PVC)/2 (ABS)');
    expect([format(720, 'mm'), format(720, 'cm'), format(397, 'cm')]).toEqual(['720', '72,0', '39,7']);
  });

  it('CSV uses semicolons, decimal commas and quotes when needed', () => {
    const csv = toCsv(cutListRows(merged, project.materials, 'mm'));
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(merged.length + 1);
    expect(lines[0].startsWith('Materijal;Deo;Elementi;Kom;Dužina (mm)')).toBe(true);
    expect(lines.find(l => l.includes('izrez'))).toContain(';Poleđina;D2;1;796;716;—;');
    expect(toCsv([['a;b', 'x"y']])).toBe('"a;b";"x""y"\r\n');
  });

  it('cutting layout: every piece on some sheet, inside it, no overlaps, kerf between cuts', () => {
    const sheet = { l: 2800, w: 2070 }, kerf = 4;
    const carcass = parts.filter(p => p.materialId === 'iv18-w980');
    const { sheets, tooBig } = cutSheets(carcass, sheet, { kerf });
    expect(tooBig).toEqual([]);
    expect(sheets.flatMap(s => s.pieces)).toHaveLength(carcass.reduce((n, p) => n + p.qty, 0));
    for (const { pieces, utilization } of sheets) {
      expect(utilization).toBeLessThanOrEqual(100);
      for (const a of pieces) {
        expect(a.x >= 0 && a.y >= 0 && a.x + a.l <= sheet.l && a.y + a.w <= sheet.w).toBe(true);
        for (const b of pieces) if (a !== b) expect(a.x + a.l + kerf <= b.x || b.x + b.l + kerf <= a.x || a.y + a.w + kerf <= b.y || b.y + b.w + kerf <= a.y).toBe(true);
      }
    }
    expect(sheets[0].utilization).toBeGreaterThan(60);
    expect(cutSheets(carcass, sheet, { kerf })).toEqual({ sheets, tooBig }); // deterministic
  });

  it('cutting layout: grain keeps length along the sheet; too big pieces are reported, not dropped', () => {
    const p = (l: number, w: number, qty = 1) => ({ ...parts[0], cutLength: l, cutWidth: w, qty, name: 'X' });
    const fixed = cutSheets([p(700, 1500, 4)], { l: 2800, w: 2070 }, { rotate: false }).sheets.flatMap(s => s.pieces);
    expect(fixed.every(x => !x.rotated && x.l === 700)).toBe(true);
    // 2 × (1500 × 1000) fit on one sheet only when turned
    expect(cutSheets([p(1000, 1500, 2)], { l: 3100, w: 1100 }).sheets).toHaveLength(1);
    expect(cutSheets([p(1000, 1500, 2)], { l: 3100, w: 1100 }, { rotate: false }).sheets).toHaveLength(0);
    expect(cutSheets([p(3000, 600)], { l: 2800, w: 2070 }).tooBig).toEqual(['X 3000×600']);
  });
});
