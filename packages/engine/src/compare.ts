// Saw-shop comparison (docs/SPEC.md "Poređenje pilana"): the same cut list priced by each supplier's price list,
// cheapest per line and in total, and the best split (sheets + cutting + edging at one shop, worktops at another).
import { generateParts } from './parts';
import { cuttingMeters } from './quote';
import { edgeTotals, sheetEstimate, worktops } from './totals';
import type { Project } from './types';

/** Prices in para. An imported list may lack worktop / cutting / delivery: then they are undefined (see `missing`). */
export interface SupplierPrices {
  sheets: Record<string, number>; worktopPiece?: number; cuttingPerM?: number; edgingPerM: Record<string, number>; delivery?: number;
}
export interface Supplier {
  id: string; name: string; updated: string; leadDays: number | null;
  email?: string;                            // for inquiries and orders
  prices: SupplierPrices | null;             // null = asked, no answer yet
  substitutes?: { materialId: string; note: string }[];
}
/** `missing`: what this project needs and the list has no price for (material ids, 'worktop', 'cutting', 'edge 0.8'…, 'delivery'). */
export interface SupplierQuote { supplier: Supplier; lines: [number, number, number, number, number] | null; total: number | null; missing: string[] }
export interface Comparison {
  quotes: SupplierQuote[]; best: number | null;
  split: { sheetsAt: Supplier; worktopsAt: Supplier; total: number; saving: number } | null;
}

const RSD = 100;
/** Example suppliers of the design (design/screens/Poredjenje.html), in para. */
export const EXAMPLE_SUPPLIERS: Supplier[] = [
  { id: 'A', name: '[PILANA A]', updated: '03.11.', leadDays: 3, prices: { sheets: { 'iv18-w980': 6500 * RSD, 'iv18-u708': 8900 * RSD, hdf3: 2400 * RSD, 'iv16-w980': 5900 * RSD }, worktopPiece: 14500 * RSD, cuttingPerM: 90 * RSD, edgingPerM: { '0.8': 110 * RSD, '2': 190 * RSD }, delivery: 2500 * RSD } },
  { id: 'B', name: '[PILANA B]', updated: '15.11.', leadDays: 5, prices: { sheets: { 'iv18-w980': 6200 * RSD, 'iv18-u708': 8400 * RSD, hdf3: 2300 * RSD, 'iv16-w980': 5500 * RSD }, worktopPiece: 15700 * RSD, cuttingPerM: 80 * RSD, edgingPerM: { '0.8': 100 * RSD, '2': 180 * RSD }, delivery: 0 },
    substitutes: [{ materialId: 'iv18-u708', note: 'Dekor U708 nije u cenovniku [PILANA B] — uzeta cena najbližeg sivog dekora. Proveri pre slanja.' }] },
  { id: 'C', name: '[PILANA C]', updated: '28.10.', leadDays: 2, prices: { sheets: { 'iv18-w980': 6900 * RSD, 'iv18-u708': 9200 * RSD, hdf3: 2600 * RSD, 'iv16-w980': 6200 * RSD }, worktopPiece: 13900 * RSD, cuttingPerM: 100 * RSD, edgingPerM: { '0.8': 100 * RSD, '2': 220 * RSD }, delivery: 3000 * RSD } },
  { id: 'D', name: '[PILANA D]', updated: '', leadDays: null, prices: null },
];

export function compareSuppliers(project: Project, suppliers: Supplier[], worktopDepth = 600): Comparison {
  const parts = generateParts(project);
  const sheets = sheetEstimate(parts, project.materials, project.rules);
  const tops = worktops(project, worktopDepth).length;
  const cut = cuttingMeters(project);
  const edges = edgeTotals(parts, project.rules);
  const quotes = suppliers.map((supplier): SupplierQuote => {
    const p = supplier.prices;
    if (!p) return { supplier, lines: null, total: null, missing: [] };
    const missing = [
      ...sheets.filter(x => p.sheets[x.materialId] === undefined).map(x => x.materialId),
      ...(tops && p.worktopPiece === undefined ? ['worktop'] : []),
      ...(p.cuttingPerM === undefined ? ['cutting'] : []),
      ...edges.filter(e => p.edgingPerM[String(e.edge.thickness)] === undefined).map(e => `edge ${e.edge.thickness}`),
      ...(p.delivery === undefined ? ['delivery'] : []),
    ];
    const lines: SupplierQuote['lines'] = [
      sheets.reduce((s, x) => s + x.sheets * (p.sheets[x.materialId] ?? 0), 0),
      tops * (p.worktopPiece ?? 0),
      cut * (p.cuttingPerM ?? 0),
      edges.reduce((s, e) => s + e.orderMeters * (p.edgingPerM[String(e.edge.thickness)] ?? 0), 0),
      p.delivery ?? 0,
    ];
    return { supplier, lines, total: lines.reduce((s, x) => s + x, 0), missing };
  });
  // Only complete offers compete (unknown delivery counts as 0 and does not exclude); a missing board would look cheapest.
  const priced = quotes.filter((q): q is SupplierQuote & { lines: NonNullable<SupplierQuote['lines']>; total: number } =>
    q.total !== null && q.missing.every(m => m === 'delivery'));
  const best = priced.length ? Math.min(...priced.map(q => q.total)) : null;
  // Best split: sheets + cutting + edging at `a`, worktops at `b`; each shop used adds its delivery.
  let split: Comparison['split'] = null;
  for (const a of priced) for (const b of priced) {
    if (a === b || !tops) continue;
    const total = a.lines[0] + a.lines[2] + a.lines[3] + a.lines[4] + b.lines[1] + b.lines[4];
    if (best !== null && total < best && (!split || total < split.total)) split = { sheetsAt: a.supplier, worktopsAt: b.supplier, total, saving: best - total };
  }
  return { quotes, best, split };
}
