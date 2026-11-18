import type { ConstructionRules, EdgeSpec, Material, Mm, Part, Project } from './types';

/** Metraža kanta po debljini (kant korpusa / kant fronti), + rules.edgeExtra. */
export function edgeTotals(parts: Part[], rules: ConstructionRules): { edge: EdgeSpec; meters: number; metersWithExtra: number }[] {
  const mm = new Map<number, number>();
  for (const p of parts) {
    const { L1, L2, W1, W2 } = p.edges;
    for (const [t, len] of [[L1, p.length], [L2, p.length], [W1, p.width], [W2, p.width]])
      if (t) mm.set(t, (mm.get(t) ?? 0) + len * p.qty);
  }
  return [...mm].map(([t, total]) => ({
    edge: t === rules.frontEdge.thickness ? rules.frontEdge : t === rules.carcassEdge.thickness ? rules.carcassEdge : { material: `ABS ${t}`, thickness: t },
    meters: Math.round(total / 10) / 100,
    metersWithExtra: Math.round((total * (1 + rules.edgeExtra)) / 100) / 10,
  }));
}

/** Procena broja ploča: ceil(m² × (1 + otpad) / m² ploče). Zameniće je optimizacija krojenja. */
export function sheetEstimate(parts: Part[], materials: Record<string, Material>, rules: ConstructionRules) {
  const area = new Map<string, number>();
  for (const p of parts) area.set(p.materialId, (area.get(p.materialId) ?? 0) + p.length * p.width * p.qty);
  return [...area].map(([materialId, mm2]) => {
    const sheet = materials[materialId]?.sheet;
    const areaM2 = Math.round(mm2 / 1000) / 1000;
    return { materialId, areaM2, sheets: sheet ? Math.ceil((mm2 * (1 + rules.wasteFactor)) / (sheet.l * sheet.w)) : 0 };
  });
}

const UNDER_WORKTOP = new Set(['base', 'sink', 'drawer', 'oven', 'corner-blind', 'appliance-front', 'filler']);

/** Radne ploče po zidu: od prvog do poslednjeg donjeg elementa. */
export function worktops(p: Project, depth: Mm = 600, thickness: Mm = 38) {
  const out: { wallId: string; length: Mm; depth: Mm; thickness: Mm; note?: string }[] = [];
  p.room.walls.forEach((wall, i) => {
    const els = p.elements.filter(e => e.wallId === wall.id && UNDER_WORKTOP.has(e.kind));
    if (!els.length) return;
    const length = Math.max(...els.map(e => e.offset + e.width)) - Math.min(...els.map(e => e.offset));
    const prev = p.room.walls[i - 1];
    const corner = wall.angleToPrev !== 0 && prev && out.some(w => w.wallId === prev.id);
    out.push({ wallId: wall.id, length, depth, thickness, ...(corner ? { note: `ugaoni spoj sa ${prev.id}` } : {}) });
  });
  return out;
}
