import { roomWalls } from './geometry';
import type { ConstructionRules, EdgeSpec, Material, Mm, Part, Project } from './types';

/** Edge banding meters per thickness (carcass / front edge), plus rules.edgeExtra. */
export function edgeTotals(parts: Part[], rules: ConstructionRules): { edge: EdgeSpec; meters: number; metersWithExtra: number; orderMeters: number }[] {
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
    orderMeters: Math.ceil(Math.round(total * (1 + rules.edgeExtra)) / 1000), // whole meters to order
  }));
}

/** Sheet count estimate: ceil(m² × (1 + waste) / sheet m²). To be replaced by cut optimization. */
export function sheetEstimate(parts: Part[], materials: Record<string, Material>, rules: ConstructionRules) {
  const area = new Map<string, number>();
  for (const p of parts) area.set(p.materialId, (area.get(p.materialId) ?? 0) + p.length * p.width * p.qty);
  return [...area].map(([materialId, mm2]) => {
    const sheet = materials[materialId]?.sheet;
    const areaM2 = Math.round(mm2 / 1000) / 1000;
    const raw = sheet ? (mm2 * (1 + rules.wasteFactor)) / (sheet.l * sheet.w) : 0;
    const r = rules.sheetRounding ?? 'sheet';
    return { materialId, areaM2, sheets: r === 'm2' ? Math.round(raw * 100) / 100 : r === 'half' ? Math.ceil(raw * 2) / 2 : Math.ceil(raw) };
  });
}

const UNDER_WORKTOP = new Set(['base', 'sink', 'drawer', 'oven', 'corner-blind', 'appliance-front', 'filler']);
// shortcut: fixed sink / hob cutout sizes until appliances get their own data.
const SINK = { w: 780, h: 480 }, HOB = { w: 560, h: 490 };

export type WorktopCutout =
  | { kind: 'sink' | 'hob'; centerFromLeft: Mm; centerFromFront: Mm; w: Mm; h: Mm }
  | { kind: 'sink' | 'hob'; centerFromJoint: Mm; centerFromFront: Mm; w: Mm; h: Mm };
export interface Worktop { id: string; wallId: string; length: Mm; depth: Mm; thickness: Mm; note?: string; cutouts: WorktopCutout[] }

/** Contiguous runs [start, end] of the given elements per wall. */
function runs(p: Project, keep: (kind: string) => boolean) {
  return p.room.walls.flatMap(wall => {
    const out: { wallId: string; s: Mm; e: Mm }[] = [];
    for (const el of p.elements.filter(x => x.wallId === wall.id && keep(x.kind)).sort((x, y) => x.offset - y.offset)) {
      const last = out.at(-1);
      if (last && el.offset <= last.e) last.e = Math.max(last.e, el.offset + el.width);
      else out.push({ wallId: wall.id, s: el.offset, e: el.offset + el.width });
    }
    return out;
  });
}

/**
 * Worktops: one piece per contiguous run of base units, longest first (PDT1…). A run that stops one worktop depth short of
 * a corner whose other wall's run reaches that corner butts against it ("ugaoni spoj"); its cutouts are measured from the joint.
 */
export function worktops(p: Project, depth: Mm = 600, thickness: Mm = 38): Worktop[] {
  const walls = roomWalls(p.room);
  const same = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
  const all = runs(p, k => UNDER_WORKTOP.has(k)).sort((x, y) => (y.e - y.s) - (x.e - x.s));
  const ids = new Map(all.map((r, i) => [r, `PDT${i + 1}`]));
  const len = (id: string) => p.room.walls.find(w => w.id === id)!.length;
  // Does run r reach the end of its wall that touches point q?
  const reaches = (r: typeof all[number], q: { x: number; y: number }) => {
    const w = walls.find(x => x.id === r.wallId)!;
    return (same(w.a, q) && r.s === 0) || (same(w.b, q) && r.e === len(r.wallId));
  };
  return all.map(r => {
    const w = walls.find(x => x.id === r.wallId)!;
    let joint: { at: 'start' | 'end'; to: string } | undefined;
    for (const [at, q, gap] of [['start', w.a, r.s], ['end', w.b, len(r.wallId) - r.e]] as const) {
      const other = gap > 0 && gap <= depth && all.find(o => o !== r && o.wallId !== r.wallId && reaches(o, q));
      if (other) joint = { at, to: ids.get(other)! };
    }
    const cutouts = p.elements.filter(el => el.wallId === r.wallId && el.offset >= r.s && el.offset + el.width <= r.e && (el.kind === 'sink' || el.kind === 'oven' || el.hob))
      .map((el): WorktopCutout => {
        const c = el.offset + el.width / 2, size = el.kind === 'sink' ? SINK : HOB, kind = el.kind === 'sink' ? 'sink' : 'hob';
        return joint
          ? { kind, centerFromJoint: joint.at === 'end' ? r.e - c : c - r.s, centerFromFront: depth / 2, ...size }
          : { kind, centerFromLeft: c - r.s, centerFromFront: depth / 2, ...size };
      });
    return { id: ids.get(r)!, wallId: r.wallId, length: r.e - r.s, depth, thickness, ...(joint ? { note: `ugaoni spoj sa ${joint.to}` } : {}), cutouts };
  });
}

/** Plinth, wall trim, worktop connectors and silicone (docs/KONSTRUKCIJA.md counting table). */
export function accessories(p: Project, depth?: Mm, thickness?: Mm) {
  const tops = worktops(p, depth, thickness);
  // shortcut: plinth corner joints ("+ ugaoni spoj po uglu niza") are not added yet.
  const plinth = runs(p, k => k !== 'wall').reduce((s, r) => s + r.e - r.s, 0);
  return {
    plinthMeters: plinth / 1000,
    wallStripMeters: tops.reduce((s, t) => s + t.length, 0) / 1000,
    worktopConnectors: 3 * tops.filter(t => t.note).length,
    siliconeTubes: tops.length,
  };
}
