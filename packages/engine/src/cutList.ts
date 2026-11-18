// Cut list helpers: merging identical parts, edge notation, unit formatting, CSV for the saw shop.
import type { Material, Mm, Part, Unit } from './types';

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

const decimal = (n: number | string) => String(n).replace('.', ',');

/** Edge notation: "1D · 0,8", "2D 2K · 2", "—". D = long edge, K = short edge. */
export function edgeCode(edges: Part['edges']): string {
  const d = [edges.L1, edges.L2].filter(Boolean), k = [edges.W1, edges.W2].filter(Boolean);
  if (!d.length && !k.length) return '—';
  const thick = [...new Set([...d, ...k])].map(decimal).join('/');
  return [d.length && `${d.length}D`, k.length && `${k.length}K`].filter(Boolean).join(' ') + ` · ${thick}`;
}

/** 720 → "720" (mm) or "72,0" (cm). */
export const format = (mm: Mm, unit: Unit) => (unit === 'mm' ? String(mm) : decimal((mm / 10).toFixed(1)));

const csvCell = (v: string | number) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

/** Header and rows of the saw-shop table; shared by CSV and XLSX export. */
export function cutListRows(merged: MergedPart[], materials: Record<string, Material>, unit: Unit): (string | number)[][] {
  const u = unit;
  const header = ['Materijal', 'Deo', 'Elementi', 'Kom', `Dužina (${u})`, `Širina (${u})`, 'Kant', 'Kant D1', 'Kant D2', 'Kant K1', 'Kant K2',
    `Za sečenje dužina (${u})`, `Za sečenje širina (${u})`, 'Napomena'];
  const rows = merged.map(m => [
    materials[m.materialId]?.name ?? m.materialId, m.name, m.elementIds.join(', '), m.qty,
    format(m.length, u), format(m.width, u), edgeCode(m.edges),
    decimal(m.edges.L1), decimal(m.edges.L2), decimal(m.edges.W1), decimal(m.edges.W2),
    format(m.cutLength, u), format(m.cutWidth, u), m.note ?? '',
  ]);
  return [header, ...rows];
}

/** CSV for the saw shop: semicolon separated (Excel with Serbian locale), decimal comma. */
export const toCsv = (rows: (string | number)[][]) => rows.map(r => r.map(csvCell).join(';')).join('\r\n') + '\r\n';

export interface SheetPiece { x: Mm; y: Mm; l: Mm; w: Mm; name: string }

/**
 * First sheet of a material, filled shelf by shelf: pieces sorted by width (row height), then length, placed along the sheet
 * length with `kerf` between cuts. Used for the "Raspored krojenja" preview.
 * shortcut: simple shelf packing, no rotation and only sheet 1; replace with a real optimizer (guillotine, all sheets, remnants).
 */
export function firstSheet(parts: Part[], sheet: { l: Mm; w: Mm }, kerf = 4) {
  const pieces = parts.flatMap(p => Array.from({ length: p.qty }, () => ({ l: p.cutLength, w: p.cutWidth, name: p.name })))
    .sort((a, b) => b.w - a.w || b.l - a.l);
  const placed: SheetPiece[] = [];
  const tails: Mm[] = []; // free length at the end of each row
  let y = 0;
  for (;;) {
    // Tallest remaining piece that still fits below; it sets the row height.
    const h = pieces.find(pc => y + pc.w <= sheet.w)?.w;
    if (h === undefined) break;
    let x = 0;
    for (let i = 0; i < pieces.length;) {
      const pc = pieces[i];
      if (pc.w <= h && x + pc.l <= sheet.l) { placed.push({ x, y, ...pc }); x += pc.l + kerf; pieces.splice(i, 1); } else i++;
    }
    tails.push(sheet.l - x);
    y += h + kerf;
  }
  const used = placed.reduce((s, p) => s + p.l * p.w, 0);
  return {
    pieces: placed,
    utilization: Math.round((used / (sheet.l * sheet.w)) * 100),
    // Remnants >= 300 mm: row tails and the strip below the last row.
    remnants: tails.filter(t => t >= 300).length + (sheet.w - y >= 300 ? 1 : 0),
  };
}
