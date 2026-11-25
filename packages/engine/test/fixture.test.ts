import { describe, expect, it } from 'vitest';
import { project as fixtureProject, expected as fixtureExpected } from './fixtureProject';
import { accessories, backCutouts, edgeTotals, generateParts, hardware, plinthParts, sheetEstimate, worktops, type Part } from '../src';

const project = fixtureProject;
const expected = fixtureExpected;
const parts = generateParts(project);

describe('kuhinja-petrovic fixture', () => {
  it('parts: line count, piece count and all dimensions', () => {
    expect(parts).toHaveLength(expected.partLines);
    expect(parts.reduce((s, p) => s + p.qty, 0)).toBe(expected.pieceCount);
    expect(parts).toEqual(expected.parts as Part[]);
  });

  it('back cutouts', () => {
    expect(backCutouts(project)).toEqual(expected.backCutouts);
    expect(parts.filter(p => p.note).map(p => [p.pos, p.note])).toEqual([['D2-4', 'izrez 300×250 za V+O']]);
  });

  it('edge banding meters', () => {
    const byT = Object.fromEntries(edgeTotals(parts, project.rules).map(e => [String(e.edge.thickness), e]));
    for (const [t, m] of Object.entries(expected.edgeMeters)) expect(byT[t].meters).toBe(m);
    for (const [t, m] of Object.entries(expected.edgeMetersOrder)) expect(byT[t].orderMeters).toBe(m);
  });

  it('m² and sheet count', () => {
    const est = Object.fromEntries(sheetEstimate(parts, project.materials, project.rules).map(s => [s.materialId, s]));
    for (const [id, a] of Object.entries(expected.areaM2)) expect(est[id].areaM2).toBe(a);
    for (const [id, n] of Object.entries(expected.sheets)) expect(est[id].sheets).toBe(n);
  });

  it('hardware', () => {
    expect(Object.fromEntries(hardware(project).map(h => [h.sku, h.qty]))).toEqual(expected.hardware);
  });

  it('accessories', () => {
    const { _rules, ...exp } = expected.accessories;
    expect(accessories(project)).toEqual(exp);
  });

  it('worktops', () => {
    expect(worktops(project)).toEqual(expected.worktops);
  });
});

describe('joint variants (docs/KONSTRUKCIJA.md)', () => {
  const d2 = (joint: 'minifix' | 'confirmat') =>
    Object.fromEntries(hardware({ ...project, rules: { ...project.rules, joint }, elements: project.elements.filter(e => e.id === 'D2') }).map(h => [h.sku, h.qty]));
  it('minifix: 2 eccentrics + 2 dowels per panel end, 1 + 1 per rail end', () => {
    const h = d2('minifix'); // D2: 1 bottom, 2 rails
    expect([h['ekscentar-15'], h['tipl-8x35'], h['konfirmat-7x50']]).toEqual([8, 8, undefined]);
  });
  it('confirmat only: 3 per panel end, 2 per rail end', () => {
    const h = d2('confirmat');
    expect([h['konfirmat-7x50'], h['tipl-8x35']]).toEqual([14, undefined]);
  });

  it('plinth per unit: one piece under every unit, the corner ends follow the run', () => {
    const lens = plinthParts({ ...project, plinth: 'unit' }).map(x => `${x.elementId} ${x.length}`);
    expect(lens).toEqual(['V1 600', 'D6 600', 'D5 690', 'D1 608', 'D2 800', 'D3 600', 'D4 600', 'F 100']);
  });

  it('plinth per run: a run longer than the sheet splits into equal pieces', () => {
    const straight = { ...project, elements: project.elements.filter(e => e.wallId === 'A') }; // 3200 > sheet 2800, no corner
    expect(plinthParts(straight).map(x => x.length)).toEqual([1600, 1600]);
  });

  it('worktop at the corner joint is cut flush with the through worktop ("knap")', () => {
    const shifted = { ...project, elements: project.elements.map(e => (e.wallId === 'B' ? { ...e, offset: e.offset + 22 } : e)) }; // B run ends 578 from the corner
    const b = worktops(shifted).find(t => t.wallId === 'B')!;
    expect([b.length, b.note, b.cutouts[0]]).toEqual([1178, 'ugaoni spoj sa PDT1', { kind: 'hob', centerFromJoint: 278, centerFromFront: 300, w: 560, h: 490 }]);
  });
});
