// Drilling for screwed joints (docs/KONSTRUKCIJA.md "Bušenje i spajanje — holšraf"). User 2026-11-25: carcass and drawers are
// assembled with a 50 mm holšraf whose 18 mm head is sunk in a countersink ("frezenk"). No standard sets hole positions (EN 1116 /
// ISO 3055 are sizes, EN 16122 / EN 14749 strength); positions follow the 32 system habit: first / last hole 37 from the edges
// (a quarter of the joint when it is short), at most 150 apart, at least 2 per joint.
// Frames, per part as generateParts(p, false) gives it: x along `length` from the W1 end, y along `width` from the L1 edge
// (carcass: the front edge; drawer box: the top edge).
import { drawerSet, partBoxes } from './parts';
import type { Element, Mm, Project, ScrewSpec } from './types';
/** Holšraf 4 × 50, head Ø 18 sunk; through hole Ø 5, pilot Ø 3 in the other board's edge. shortcut: diameter 4 assumed (user gave 50 / 18). */
export const DEFAULT_SCREW: ScrewSpec = { d: 4, length: 50, head: 18, through: 5, pilot: 3, edge: 37, pitch: 150 };

export type Hole =
  | { pos: string; piece: number; face: 'lice'; x: Mm; y: Mm; d: Mm; depth: Mm; sink: Mm }   // through the board, countersunk Ø sink
  | { pos: string; piece: number; face: 'kant'; edge: 'W1' | 'W2'; at: Mm; d: Mm; depth: Mm }; // pilot into the edge, `at` along it

/** Hole positions along a joint of length `len` (rounded to whole mm). */
export function spread(len: Mm, s: ScrewSpec = DEFAULT_SCREW): Mm[] {
  const e = Math.min(s.edge, len / 4), n = Math.max(2, Math.ceil((len - 2 * e) / s.pitch) + 1);
  return Array.from({ length: n }, (_, i) => Math.round(e + (i * (len - 2 * e)) / (n - 1)));
}

const JOINED = new Set(['Pod', 'Pod / plafon', 'Pod / plafon / srednja stranica', 'Srednja stranica', 'Vezni komad']);

/** Screw holes of one element: carcass joints when rules.joint = 'screw', drawer boxes always (they are screwed in this workshop). */
export function partHoles(p: Project, el: Element): Hole[] {
  const s = { ...DEFAULT_SCREW, ...p.rules.screw }, r = p.rules, t = r.carcassThickness, D = el.depth;
  const out: Hole[] = [], boxes = partBoxes(p, el);
  const face = (pos: string, piece: number, x: Mm, y: Mm, th: Mm) => out.push({ pos, piece, face: 'lice', x: Math.round(x), y: Math.round(y), d: s.through, depth: th, sink: s.head });
  const pilot = (pos: string, piece: number, edge: 'W1' | 'W2', at: Mm, th: Mm) => out.push({ pos, piece, face: 'kant', edge, at: Math.round(at), d: s.pilot, depth: s.length - th });

  if (r.joint === 'screw') {
    const sides = boxes.find(b => b.name === 'Stranica');
    const under = r.bottomMode === 'under';
    for (const part of boxes) {
      if (!JOINED.has(part.name) || !sides) continue;
      part.boxes.forEach(([x0, x1, y0, y1, z0, z1], k) => {
        const ys = spread(y1 - y0, s).map(v => y1 - v) /* measured from the panel's front edge */, zc = (z0 + z1) / 2;
        // 'under': bottom / top run under / over the sides → screws go through the panel into the side's end.
        const flat = under && (part.name === 'Pod' || part.name === 'Pod / plafon');
        sides.boxes.forEach(([, , , , sz0, sz1], side) => {
          for (const y of ys) {
            if (flat) {
              face(part.pos, k, side === 0 ? t / 2 : x1 - x0 - t / 2, y1 - y, t);
              pilot(sides.pos, side, zc < el.height / 2 ? 'W1' : 'W2', D - y, t);
            } else {
              face(sides.pos, side, zc - sz0, D - y, t);           // through the side, head outside (covered by the next unit / end panel)
              pilot(part.pos, k, side === 0 ? 'W1' : 'W2', y1 - y, t);
            }
          }
        });
      });
    }
  }

  // Drawer box: each side screwed into the front / back panel ends and into the bottom's end.
  const { box: b, heights } = drawerSet(p, el);
  const byHeight = (name: string, h: Mm) => boxes.find(x => x.name === name && x.boxes.length && Math.round(x.boxes[0][5] - x.boxes[0][4]) === h);
  const bottom = boxes.find(x => x.name === 'Pod fioke');
  const used = new Map<string, number>(), next = (pos: string) => { const n = used.get(pos) ?? 0; used.set(pos, n + 1); return n; };
  for (const h of heights) {
    const ph = h - b.recess - b.s, zs = spread(ph, s), xs = spread(b.length, s);
    const side = byHeight('Stranica fioke', h), panel = byHeight('Prednja / zadnja strana fioke', ph);
    if (!side || !panel || !bottom) continue;
    for (let k = 0; k < 2; k++) {
      const n = next(side.pos);
      // y from the side's top edge (L1): panels stand on the bottom, so their joint ends `recess + s` above the side's lower edge
      for (const z of zs) { face(side.pos, n, b.s / 2, h - b.recess - b.s - z, b.s); face(side.pos, n, b.length - b.s / 2, h - b.recess - b.s - z, b.s); }
      for (const x of xs) face(side.pos, n, x, h - b.recess - b.s / 2, b.s);
    }
    for (let k = 0; k < 2; k++) { const n = next(panel.pos); for (const z of zs) { pilot(panel.pos, n, 'W1', z, b.s); pilot(panel.pos, n, 'W2', z, b.s); } }
    const n = next(bottom.pos);
    for (const x of xs) { pilot(bottom.pos, n, 'W1', x, b.s); pilot(bottom.pos, n, 'W2', x, b.s); }
  }
  return out;
}

/** Number of holšraf of an element (one per countersunk through hole). */
export const screwCount = (p: Project, el: Element) => partHoles(p, el).filter(h => h.face === 'lice').length;
