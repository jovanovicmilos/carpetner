import { roomWalls } from './geometry';
import type { ConstructionRules, EdgeSpec, Element, Material, Mm, Part, Project } from './types';

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

/** Contiguous runs [start, end] of the given elements per wall, with the elements in order. */
function runs(p: Project, keep: (e: Element) => boolean) {
  return p.room.walls.flatMap(wall => {
    const out: { wallId: string; s: Mm; e: Mm; els: Element[] }[] = [];
    for (const el of p.elements.filter(x => x.wallId === wall.id && keep(x)).sort((x, y) => x.offset - y.offset)) {
      const last = out.at(-1);
      if (last && el.offset <= last.e) { last.e = Math.max(last.e, el.offset + el.width); last.els.push(el); }
      else out.push({ wallId: wall.id, s: el.offset, e: el.offset + el.width, els: [el] });
    }
    return out;
  });
}

/**
 * Worktops: one piece per contiguous run of base units, longest first (PDT1…). A run that stops one worktop depth short of
 * a corner whose other wall's run reaches that corner butts against it ("ugaoni spoj"); its cutouts are measured from the joint.
 * The butting piece is cut flush to the through piece's front edge (user 2026-11-24: "knap"): it starts one worktop depth from the corner.
 */
export function worktops(p: Project, depth: Mm = 600, thickness: Mm = 38): Worktop[] {
  const walls = roomWalls(p.room);
  const same = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
  const all = runs(p, x => UNDER_WORKTOP.has(x.kind)).sort((x, y) => (y.e - y.s) - (x.e - x.s));
  const ids = new Map(all.map((r, i) => [r, `PDT${i + 1}`]));
  const len = (id: string) => p.room.walls.find(w => w.id === id)!.length;
  // Does run r reach the end of its wall that touches point q?
  const reaches = (r: typeof all[number], q: { x: number; y: number }) => {
    const w = walls.find(x => x.id === r.wallId)!;
    return (same(w.a, q) && r.s === 0) || (same(w.b, q) && r.e === len(r.wallId));
  };
  return all.map(r => {
    const w = walls.find(x => x.id === r.wallId)!;
    let joint: { at: 'start' | 'end'; to: string } | undefined, s = r.s, e = r.e;
    for (const [at, q, gap] of [['start', w.a, r.s], ['end', w.b, len(r.wallId) - r.e]] as const) {
      const other = gap > 0 && gap <= depth && all.find(o => o !== r && o.wallId !== r.wallId && reaches(o, q));
      if (other) {
        joint = { at, to: ids.get(other)! };
        if (at === 'start') s = depth; else e = len(r.wallId) - depth;
      }
    }
    const cutouts = p.elements.filter(el => el.wallId === r.wallId && el.offset >= r.s && el.offset + el.width <= r.e && (el.kind === 'sink' || el.kind === 'oven' || el.hob))
      .map((el): WorktopCutout => {
        const c = el.offset + el.width / 2, size = el.kind === 'sink' ? SINK : HOB, kind = el.kind === 'sink' ? 'sink' : 'hob';
        return joint
          ? { kind, centerFromJoint: joint.at === 'end' ? e - c : c - s, centerFromFront: depth / 2, ...size }
          : { kind, centerFromLeft: c - r.s, centerFromFront: depth / 2, ...size };
      });
    return { id: ids.get(r)!, wallId: r.wallId, length: e - s, depth, thickness, ...(joint ? { note: `ugaoni spoj sa ${joint.to}` } : {}), cutouts };
  });
}

/** Plinth, wall trim, worktop connectors and silicone (docs/KONSTRUKCIJA.md counting table). */
export function accessories(p: Project, depth?: Mm, thickness?: Mm) {
  const tops = worktops(p, depth, thickness);
  return {
    plinthMeters: plinthParts(p).reduce((s, x) => s + x.length * x.qty, 0) / 1000,
    wallStripMeters: tops.reduce((s, t) => s + t.length, 0) / 1000,
    worktopConnectors: 3 * tops.filter(t => t.note).length,
    siliconeTubes: tops.length,
  };
}

/** Plinth front face from the carcass back (same as the 3D model: plinth sits 50 mm behind the carcass front). */
const PLINTH_SETBACK = 50;
const legsOf = (p: Project, e: Element) => e.legs ?? p.elements.find(x => x.wallId === e.wallId && x.legs)?.legs ?? 0;

/**
 * Plinth (sokla) cut from board (user 2026-11-24, docs/KONSTRUKCIJA.md "Sokla"): height = legs, material = the units' front.
 * `project.plinth` 'run' (default): one piece per run of units on legs, split into equal pieces when longer than the sheet;
 * 'unit': one piece under every unit. At an inside corner the two runs meet flush: the run that reaches deeper into the corner
 * runs through to the other plinth's back face, the other one butts against its front face.
 */
export function plinthParts(p: Project): Part[] {
  const all = runs(p, x => x.kind !== 'wall' && legsOf(p, x) > 0);
  if (!all.length) return [];
  const walls = roomWalls(p.room);
  const same = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
  const len = (id: string) => p.room.walls.find(w => w.id === id)!.length;
  const thick = (e: Element) => p.materials[e.materials.front]?.thickness ?? 18;
  // Gap between run r and corner point q, and the unit standing at that end; null when r's wall does not end at q.
  const end = (r: typeof all[number], q: { x: number; y: number }) => {
    const w = walls.find(x => x.id === r.wallId)!;
    return same(w.a, q) ? { at: 'start' as const, gap: r.s, el: r.els[0] }
      : same(w.b, q) ? { at: 'end' as const, gap: len(r.wallId) - r.e, el: r.els.reduce((a, b) => (b.offset + b.width > a.offset + a.width ? b : a)) } : null;
  };
  const out: Part[] = [];
  for (const r of all) {
    const w = walls.find(x => x.id === r.wallId)!;
    let s = r.s, e = r.e;
    for (const q of [w.a, w.b]) {
      const me = end(r, q)!;
      for (const o of all) {
        if (o.wallId === r.wallId) continue;
        const it = end(o, q);
        if (!it || me.gap > it.el.depth + 100 || it.gap > me.el.depth + 100) continue;
        const through = me.gap < it.gap || (me.gap === it.gap && all.indexOf(r) < all.indexOf(o));
        const pos = it.el.depth - PLINTH_SETBACK - (through ? thick(it.el) : 0);
        if (me.at === 'start') s = pos; else e = len(r.wallId) - pos;
      }
    }
    const piece = (from: Mm, to: Mm, el: Element, elementId: string) => {
      const height = legsOf(p, el), length = Math.round(to - from);
      out.push({ elementId, pos: `S${out.length + 1}`, name: 'Sokla', materialId: el.materials.front, qty: 1, length, width: height,
        edges: { L1: 0, L2: 0, W1: 0, W2: 0 }, cutLength: length, cutWidth: height });
    };
    if (p.plinth === 'unit') r.els.forEach((el, i) =>
      piece(i === 0 ? s : el.offset, i === r.els.length - 1 ? e : r.els[i + 1].offset, el, el.id));
    else {
      const max = p.materials[r.els[0].materials.front]?.sheet?.l ?? 2800, n = Math.ceil((e - s) / max), each = Math.floor((e - s) / n);
      for (let i = 0; i < n; i++) piece(s + i * each, i === n - 1 ? e : s + (i + 1) * each, r.els[0], `S${out.length + 1}`);
    }
  }
  return out;
}
