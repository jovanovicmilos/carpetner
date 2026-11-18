import { describe, expect, it } from 'vitest';
import fixture from '../../../fixtures/kuhinja-petrovic.json';
import { edgeTotals, generateParts, hardware, sheetEstimate, worktops, type Part, type Project } from '../src';

const project = fixture.project as unknown as Project;
const { expected } = fixture;
const parts = generateParts(project);
const withoutNote = ({ note, ...p }: Part) => p;

describe('kuhinja-petrovic fixture', () => {
  it('delovi: broj linija, komada i sve mere', () => {
    expect(parts).toHaveLength(expected.partLines);
    expect(parts.reduce((s, p) => s + p.qty, 0)).toBe(expected.pieceCount);
    expect(parts.map(withoutNote)).toEqual((expected.parts as Part[]).map(withoutNote));
  });

  it('izrez u leđima samo kod sudopere', () => {
    // Tekst napomene ("izrez 300×250") se ne poklapa sa formulom iz specifikacije, pa je otvoreno pitanje u docs/PROGRESS.md.
    expect(parts.filter(p => p.note).map(p => p.pos)).toEqual(['D2-4']);
  });

  it('kant metraža', () => {
    const byT = Object.fromEntries(edgeTotals(parts, project.rules).map(e => [String(e.edge.thickness), e]));
    for (const [t, m] of Object.entries(expected.edgeMeters)) expect(byT[t].meters).toBe(m);
    for (const [t, m] of Object.entries(expected.edgeMetersWithExtra)) expect(byT[t].metersWithExtra).toBe(m);
  });

  it('m² i broj ploča', () => {
    const est = Object.fromEntries(sheetEstimate(parts, project.materials, project.rules).map(s => [s.materialId, s]));
    for (const [id, a] of Object.entries(expected.areaM2)) expect(est[id].areaM2).toBe(a);
    for (const [id, n] of Object.entries(expected.sheets)) expect(est[id].sheets).toBe(n);
  });

  it('okov (bez klamerica, otvoreno pitanje)', () => {
    const { klamerica, ...rest } = expected.hardware;
    expect(Object.fromEntries(hardware(project).map(h => [h.sku, h.qty]))).toEqual(rest);
  });

  it('radne ploče', () => {
    expect(worktops(project)).toEqual(expected.worktops);
  });
});
