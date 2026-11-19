// DXF plan import (docs/NACRTI_I_IZVOZ.md "Uvoz"): line work of an apartment plan as segments in plan mm (Y down), for
// the 2D editor underlay at 1:1 and for snapping walls to its lines. Pure: text in, segments out.
// shortcut: LINE, LWPOLYLINE, POLYLINE/VERTEX, CIRCLE, ARC only; blocks (INSERT), splines, bulges and text are skipped.

/** Segment [x1, y1, x2, y2] in mm, plan orientation (DXF Y up → plan Y down). */
export type Seg = [number, number, number, number];
export interface DxfPlan { segments: Seg[]; minX: number; minY: number; maxX: number; maxY: number; skipped: number }

// $INSUNITS → mm per drawing unit (0 = unitless: assume mm, the usual for Serbian plans).
const UNIT_MM: Record<number, number> = { 0: 1, 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000 };

export function parseDxf(text: string): DxfPlan {
  const lines = text.split(/\r?\n/);
  const pairs: [number, string][] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([Number(lines[i].trim()), lines[i + 1].trim()]);

  let k = 1;
  const u = pairs.findIndex(([c, v]) => c === 9 && v === '$INSUNITS');
  if (u >= 0) k = UNIT_MM[Number(pairs.find((p, i) => i > u && p[0] === 70)?.[1])] ?? 1;

  // Entities: from "ENTITIES" to its ENDSEC; each starts at a 0 code.
  const start = pairs.findIndex(([c, v], i) => c === 2 && v === 'ENTITIES' && pairs[i - 1]?.[1] === 'SECTION');
  const out: Seg[] = [];
  let skipped = 0;
  const seg = (x1: number, y1: number, x2: number, y2: number) => out.push([x1 * k, -y1 * k, x2 * k, -y2 * k]);
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
    if (a1 <= a0) a1 += 360;
    const n = Math.max(2, Math.ceil((a1 - a0) / 15));
    for (let i = 0; i < n; i++) {
      const t0 = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180, t1 = ((a0 + ((a1 - a0) * (i + 1)) / n) * Math.PI) / 180;
      seg(cx + r * Math.cos(t0), cy + r * Math.sin(t0), cx + r * Math.cos(t1), cy + r * Math.sin(t1));
    }
  };
  let poly: { pts: [number, number][]; closed: boolean } | null = null; // old-style POLYLINE … VERTEX … SEQEND
  const endPoly = () => {
    if (poly) { const p = poly.pts; for (let i = 0; i + 1 < p.length; i++) seg(...p[i], ...p[i + 1]); if (poly.closed && p.length > 2) seg(...p[p.length - 1], ...p[0]); }
    poly = null;
  };

  for (let i = start + 1; start >= 0 && i < pairs.length;) {
    const type = pairs[i][1];
    if (pairs[i][0] !== 0) { i++; continue; }
    if (type === 'ENDSEC') break;
    let j = i + 1;
    const g: [number, string][] = [];
    while (j < pairs.length && pairs[j][0] !== 0) g.push(pairs[j++]);
    const n = (c: number) => Number(g.find(p => p[0] === c)?.[1] ?? 0);
    if (type === 'LINE') seg(n(10), n(20), n(11), n(21));
    else if (type === 'CIRCLE') arc(n(10), n(20), n(40), 0, 360);
    else if (type === 'ARC') arc(n(10), n(20), n(40), n(50), n(51));
    else if (type === 'LWPOLYLINE') {
      const xs = g.filter(p => p[0] === 10).map(p => Number(p[1])), ys = g.filter(p => p[0] === 20).map(p => Number(p[1]));
      for (let m = 0; m + 1 < xs.length; m++) seg(xs[m], ys[m], xs[m + 1], ys[m + 1]);
      if ((n(70) & 1) && xs.length > 2) seg(xs[xs.length - 1], ys[ys.length - 1], xs[0], ys[0]);
    } else if (type === 'POLYLINE') poly = { pts: [], closed: (n(70) & 1) === 1 };
    else if (type === 'VERTEX' && poly) poly.pts.push([n(10), n(20)]);
    else if (type === 'SEQEND') endPoly();
    else skipped++;
    i = j;
  }
  endPoly();

  const xs = out.flatMap(s => [s[0], s[2]]), ys = out.flatMap(s => [s[1], s[3]]);
  return out.length
    ? { segments: out, minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys), skipped }
    : { segments: [], minX: 0, minY: 0, maxX: 0, maxY: 0, skipped };
}

/** Nearest snap point on the segments within `tol` mm: an end point first, else the closest point on a line. */
export function snapToSegments(segs: Seg[], p: { x: number; y: number }, tol: number): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null, bd = tol;
  for (const [x1, y1, x2, y2] of segs) for (const [x, y] of [[x1, y1], [x2, y2]]) {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  if (best) return best;
  bd = tol;
  for (const [x1, y1, x2, y2] of segs) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    if (!l2) continue;
    const t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / l2)), x = x1 + t * dx, y = y1 + t * dy;
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
