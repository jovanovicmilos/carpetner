// Cut list helpers: merging identical parts, edge notation, unit formatting, CSV for the saw shop.
import type { ConstructionRules, Material, Mm, Part, Unit } from './types';

export interface MergedPart {
  name: string;          // unique part names joined with ", "
  materialId: string;
  qty: number;
  length: Mm; width: Mm;
  edges: Part['edges'];
  cutLength: Mm; cutWidth: Mm;
  note?: string;
  positions: string[];   // e.g. ["D1-1", "D2-1"]
  elementIds: string[];
}

/** Merges parts with the same material, size, edges and note (docs/SPEC.md "spajanje istovetnih delova"). */
export function mergeParts(parts: Part[]): MergedPart[] {
  const out = new Map<string, MergedPart>();
  for (const p of parts) {
    const e = p.edges;
    const key = [p.materialId, p.name, p.length, p.width, e.L1, e.L2, e.W1, e.W2, p.note ?? ''].join('|');
    const m = out.get(key);
    if (!m) {
      out.set(key, { name: p.name, materialId: p.materialId, qty: p.qty, length: p.length, width: p.width, edges: p.edges,
        cutLength: p.cutLength, cutWidth: p.cutWidth, note: p.note, positions: [p.pos], elementIds: [p.elementId] });
      continue;
    }
    m.qty += p.qty;
    m.positions.push(p.pos);
    if (!m.elementIds.includes(p.elementId)) m.elementIds.push(p.elementId);
  }
  return [...out.values()];
}

/** Band type tag from the band material ("ABS U708" → "ABS"); a plain band ("Bela") has none. */
export const edgeType = (material: string) => /^(ABS|PVC)\b/.exec(material)?.[1] ?? '';

const decimal = (n: number | string) => String(n).replace('.', ',');

/** Edge notation: "1D · 0,8", "2D 2K · 2", "—". D = long edge, K = short edge. */
export function edgeCode(edges: Part['edges'], rules?: Pick<ConstructionRules, 'carcassEdge' | 'frontEdge'>): string {
  const d = [edges.L1, edges.L2].filter(Boolean), k = [edges.W1, edges.W2].filter(Boolean);
  if (!d.length && !k.length) return '—';
  const ts = [...new Set([...d, ...k])];
  // With the rules, the band type in brackets after each thickness that has one (user 2026-11-20: "2 (ABS)"; plain 0,8 band has none).
  const type = (t: number) => (rules ? edgeType((t === rules.frontEdge.thickness ? rules.frontEdge : t === rules.carcassEdge.thickness ? rules.carcassEdge : null)?.material ?? 'ABS') : '');
  const thick = ts.map(t => decimal(t) + (type(t) ? ` (${type(t)})` : '')).join('/');
  return [d.length && `${d.length}D`, k.length && `${k.length}K`].filter(Boolean).join(' ') + ` · ${thick}`;
}

/** 720 → "720" (mm) or "72,0" (cm). */
export const format = (mm: Mm, unit: Unit) => (unit === 'mm' ? String(mm) : decimal((mm / 10).toFixed(1)));

const csvCell = (v: string | number) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

/** Header and rows of the saw-shop table; shared by CSV and XLSX export. */
export function cutListRows(merged: MergedPart[], materials: Record<string, Material>, unit: Unit, rules?: Pick<ConstructionRules, 'carcassEdge' | 'frontEdge'>): (string | number)[][] {
  const u = unit;
  const header = ['Materijal', 'Deo', 'Elementi', 'Kom', `Dužina (${u})`, `Širina (${u})`, 'Kant', 'Kant D1', 'Kant D2', 'Kant K1', 'Kant K2',
    `Za sečenje dužina (${u})`, `Za sečenje širina (${u})`, 'Napomena'];
  const rows = merged.map(m => [
    materials[m.materialId]?.name ?? m.materialId, m.name, m.elementIds.join(', '), m.qty,
    format(m.length, u), format(m.width, u), edgeCode(m.edges, rules),
    decimal(m.edges.L1), decimal(m.edges.L2), decimal(m.edges.W1), decimal(m.edges.W2),
    format(m.cutLength, u), format(m.cutWidth, u), m.note ?? '',
  ]);
  return [header, ...rows];
}

/** CSV for the saw shop: semicolon separated (Excel with Serbian locale), decimal comma. */
export const toCsv = (rows: (string | number)[][]) => rows.map(r => r.map(csvCell).join(';')).join('\r\n') + '\r\n';

export interface SheetPiece { x: Mm; y: Mm; l: Mm; w: Mm; name: string; rotated: boolean }
export interface CutSheet { pieces: SheetPiece[]; utilization: number; remnants: number }
interface Free { x: Mm; y: Mm; l: Mm; w: Mm }

/**
 * Guillotine cutting layout over as many sheets as needed (docs/KONSTRUKCIJA.md → Ploče): pieces by area (largest first), each
 * into the free rectangle with the best short-side fit, first sheet that has room; after a cut the leftover is split along the
 * shorter leftover axis, `kerf` lost at every cut. `rotate` false (grain material with followGrain) keeps length along the sheet
 * length; pieces larger than the sheet are returned in `tooBig`. Remnant = free rectangle with both sides >= 300 mm. Deterministic.
 * shortcut: no edge trim of the raw sheet and no remnants warehouse; the price still counts sheets by area (sheetEstimate).
 */
export function cutSheets(parts: Part[], sheet: { l: Mm; w: Mm }, { kerf = 4, rotate = true } = {}): { sheets: CutSheet[]; tooBig: string[] } {
  const pieces = parts.flatMap(p => Array.from({ length: p.qty }, () => ({ l: p.cutLength, w: p.cutWidth, name: p.name })))
    .sort((a, b) => b.l * b.w - a.l * a.w || Math.max(b.l, b.w) - Math.max(a.l, a.w));
  const sheets: { pieces: SheetPiece[]; free: Free[] }[] = [];
  const tooBig: string[] = [];
  for (const pc of pieces) {
    const turns = rotate && pc.l !== pc.w ? [false, true] : [false];
    if (turns.every(t => (t ? pc.w : pc.l) > sheet.l || (t ? pc.l : pc.w) > sheet.w)) { tooBig.push(`${pc.name} ${pc.l}×${pc.w}`); continue; }
    let best: { s: number; f: number; t: boolean; score: number } | undefined;
    for (let s = 0; s < sheets.length && !best; s++) {
      sheets[s].free.forEach((f, fi) => turns.forEach(t => {
        const l = t ? pc.w : pc.l, w = t ? pc.l : pc.w;
        if (l > f.l || w > f.w) return;
        const score = Math.min(f.l - l, f.w - w);
        if (!best || score < best.score) best = { s, f: fi, t, score };
      }));
    }
    if (!best) { sheets.push({ pieces: [], free: [{ x: 0, y: 0, ...sheet }] }); best = { s: sheets.length - 1, f: 0, t: pc.l > sheet.l || pc.w > sheet.w, score: 0 }; }
    const sh = sheets[best.s], f = sh.free[best.f];
    const l = best.t ? pc.w : pc.l, w = best.t ? pc.l : pc.w;
    sh.pieces.push({ x: f.x, y: f.y, l, w, name: pc.name, rotated: best.t });
    const restL = f.l - l - kerf, restW = f.w - w - kerf;
    const split: Free[] = restL < restW
      ? [{ x: f.x + l + kerf, y: f.y, l: restL, w }, { x: f.x, y: f.y + w + kerf, l: f.l, w: restW }]
      : [{ x: f.x + l + kerf, y: f.y, l: restL, w: f.w }, { x: f.x, y: f.y + w + kerf, l, w: restW }];
    sh.free.splice(best.f, 1, ...split.filter(r => r.l > 0 && r.w > 0));
  }
  return { tooBig, sheets: sheets.map(sh => ({
    pieces: sh.pieces,
    utilization: Math.round((sh.pieces.reduce((s, p) => s + p.l * p.w, 0) / (sheet.l * sheet.w)) * 100),
    remnants: sh.free.filter(r => r.l >= 300 && r.w >= 300).length,
  })) };
}
