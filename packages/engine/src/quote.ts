// Quote per docs/SPEC.md: sheets + worktops + cutting + edging + hardware + labour + margin (on material and hardware) + VAT.
// Money is integer para (1 RSD = 100 para); the UI shows whole dinars.
import { generateParts } from './parts';
import { hardware } from './hardware';
import { accessories, edgeTotals, sheetEstimate, worktops } from './totals';
import type { Project } from './types';

export interface PriceList {
  currency: string;
  sheets: Record<string, number>;          // per sheet, by material id
  worktopPiece: number;                    // per worktop piece
  cuttingPerM: number;
  edgingPerM: Record<string, number>;      // by edge thickness ("0.8", "2")
  hingeSet: number; drawerKit: number; leg: number; plinthClip: number; handle: number; hanger: number; shelfPin: number;
  plinthPerM: number; wallStripPerM: number; fastenersLump: number; worktopFittingsLump: number; sinkPad: number;
  profilePerM: number; pusher: number; liftKit: number; glassFrame: number;
  perElement: number; installDay: number;
}

export interface QuoteOptions { marginPct: number; vatPct: number; discountPct: number; installDays: number }
export interface QuoteLine { name: string; qty: string; price: string; amount: number }
export interface Quote {
  sections: { title: string; lines: QuoteLine[]; total: number }[];
  material: number; hardware: number; labour: number; margin: number; discount: number; net: number; vat: number; total: number;
  /** Board materials used by the project without a sheet price (counted as 0 — the UI must warn). */
  unpriced: string[];
}

const RSD = 100;
/** Example price list of the design (design/screens/Obracun.html, Cenovnik.html), in para. */
export const EXAMPLE_PRICES: PriceList = {
  currency: 'RSD',
  sheets: { 'iv18-w980': 6500 * RSD, 'iv18-u708': 8900 * RSD, hdf3: 2400 * RSD, 'iv16-w980': 5900 * RSD },
  worktopPiece: 14500 * RSD, cuttingPerM: 90 * RSD, edgingPerM: { '0.8': 110 * RSD, '2': 190 * RSD },
  hingeSet: 420 * RSD, drawerKit: 3900 * RSD, leg: 60 * RSD, plinthClip: 25 * RSD, handle: 350 * RSD, hanger: 450 * RSD, shelfPin: 10 * RSD,
  plinthPerM: 900 * RSD, wallStripPerM: 700 * RSD, fastenersLump: 1900 * RSD, worktopFittingsLump: 1500 * RSD, sinkPad: 450 * RSD,
  // shortcut: example prices of our own (the design has none for these); the workshop sets real ones in Cenovnik.
  profilePerM: 1200 * RSD, pusher: 250 * RSD, liftKit: 4500 * RSD, glassFrame: 6000 * RSD,
  perElement: 2500 * RSD, installDay: 15000 * RSD,
};
export const DEFAULT_QUOTE: QuoteOptions = { marginPct: 25, vatPct: 20, discountPct: 0, installDays: 1 };

const dec = (n: number | string) => String(n).replace('.', ',');
const money = (p: number) => Math.round(p / RSD).toLocaleString('sr-Latn');

/**
 * Cutting length: Σ (cut length + cut width) × pieces, + 30 % for trimming sheet edges and offcuts, whole meters up.
 * shortcut: assumed rule (matches the design's 118 m for the example); replace with the optimizer's real cut length.
 */
export function cuttingMeters(project: Project) {
  const parts = generateParts(project);
  return Math.ceil((1.3 * parts.reduce((s, p) => s + (p.cutLength + p.cutWidth) * p.qty, 0)) / 1000);
}

export function quote(project: Project, prices: PriceList = EXAMPLE_PRICES, opt: QuoteOptions = DEFAULT_QUOTE, worktopDepth = 600): Quote {
  const parts = generateParts(project);
  const line = (name: string, qty: string, price: string, amount: number): QuoteLine => ({ name, qty, price, amount: Math.round(amount) });

  // 1 · sheets, worktops, saw shop services. Front material gets " — fronte" like the design.
  const front = project.elements[0]?.materials.front;
  const sheets = sheetEstimate(parts, project.materials, project.rules);
  const tops = worktops(project, worktopDepth);
  const cut = cuttingMeters(project);
  const edges = edgeTotals(parts, project.rules);
  const s1: QuoteLine[] = [
    ...sheets.map(s => {
      const p = prices.sheets[s.materialId] ?? 0, m = project.materials[s.materialId];
      return line(`${m?.name ?? s.materialId}${s.materialId === front ? ' — fronte' : ''} (ploča)`, s.sheets.toLocaleString('sr-Latn'), money(p), s.sheets * p);
    }),
    ...(tops.length ? [line(`Radna ploča ${tops[0].thickness} · ${tops.reduce((s, t) => s + t.length, 0)} × ${worktopDepth}`, String(tops.length), money(prices.worktopPiece), tops.length * prices.worktopPiece)] : []),
    line('Sečenje (dužina reza)', `${cut} m`, money(prices.cuttingPerM), cut * prices.cuttingPerM),
    ...edges.map(e => {
      const p = prices.edgingPerM[String(e.edge.thickness)] ?? 0;
      return line(`Kantovanje ABS ${dec(e.edge.thickness)} (sa kantom)`, `${e.orderMeters} m`, money(p), e.orderMeters * p);
    }),
  ];

  // 2 · hardware and consumables.
  const hw = hardware(project), acc = accessories(project, worktopDepth);
  const q = (pre: string) => hw.filter(h => h.sku.startsWith(pre)).reduce((s, h) => s + h.qty, 0);
  const hinges = q('sarka'), drawers = q('fioka-komplet'), legs = q('nogica-'), clips = q('klipsa'), handles = q('rucka'), hangers = q('vesaljka'), pins = q('nosac-police'), pads = q('alu-podloga');
  const profileM = Math.ceil(q('profil-vrh') * 10 - 1e-9) / 10, pushers = q('potiskivac'), lifts = q('kip-mehanizam'), frames = q('alu-ram-staklo');
  const s2: QuoteLine[] = [
    line('Šarka sa usporivačem + pločica', String(hinges), money(prices.hingeSet), hinges * prices.hingeSet),
    line(`Fioka komplet ${hw.find(h => h.sku.startsWith('fioka-komplet'))?.sku.split('-').at(-1) ?? ''} mm`, String(drawers), money(prices.drawerKit), drawers * prices.drawerKit),
    line('Nogice + klipse', `${legs} + ${clips}`, `${money(prices.leg)} / ${money(prices.plinthClip)}`, legs * prices.leg + clips * prices.plinthClip),
    line(hw.find(h => h.sku.startsWith('rucka'))?.name.replace(/^Ručka/, 'Ručke') ?? 'Ručke', String(handles), money(prices.handle), handles * prices.handle),
    // Top profile is ordered in 0.1 m steps (docs/OTVARANJE.md).
    line('Alu profil na vrhu fronte (m)', dec(profileM), money(prices.profilePerM), profileM * prices.profilePerM),
    line('Potiskivač za krilo', String(pushers), money(prices.pusher), pushers * prices.pusher),
    line('Mehanizam za kip krilo', String(lifts), money(prices.liftKit), lifts * prices.liftKit),
    line('Alu ram sa staklom', String(frames), money(prices.glassFrame), frames * prices.glassFrame),
    line('Vešaljke, nosači fahova', `${hangers} + ${pins}`, `${money(prices.hanger)} / ${money(prices.shelfPin)}`, hangers * prices.hanger + pins * prices.shelfPin),
    line('Sokla, zidna lajsna (m)', `${dec(acc.plinthMeters.toFixed(1))} + ${dec(acc.wallStripMeters.toFixed(1))}`, `${money(prices.plinthPerM)} / ${money(prices.wallStripPerM)}`,
      acc.plinthMeters * prices.plinthPerM + acc.wallStripMeters * prices.wallStripPerM),
    line('Tiplovi, konfirmati, šrafovi, klamerice (paušal)', '1', money(prices.fastenersLump), prices.fastenersLump),
    ...(acc.worktopConnectors || acc.siliconeTubes ? [line('Spojnice radne ploče, silikon', '1', money(prices.worktopFittingsLump), prices.worktopFittingsLump)] : []),
    ...(pads ? [line('Aluminijumska podloga za sudoperu', String(pads), money(prices.sinkPad), pads * prices.sinkPad)] : []),
  ].filter(l => l.amount > 0);

  // 3 · labour.
  const n = project.elements.length;
  const s3: QuoteLine[] = [
    line('Izrada po elementu', String(n), money(prices.perElement), n * prices.perElement),
    line('Montaža kod kupca (dan)', String(opt.installDays), money(prices.installDay), opt.installDays * prices.installDay),
  ];

  const sum = (ls: QuoteLine[]) => ls.reduce((s, l) => s + l.amount, 0);
  const material = sum(s1), hwTotal = sum(s2), labour = sum(s3);
  const margin = Math.round(((material + hwTotal) * opt.marginPct) / 100 / RSD) * RSD;
  const gross = material + hwTotal + labour + margin;
  const discount = Math.round((gross * opt.discountPct) / 100 / RSD) * RSD;
  const net = gross - discount;
  const vat = Math.round((net * opt.vatPct) / 100 / RSD) * RSD;
  return {
    sections: [
      { title: 'Ploče, radne ploče i usluge pilane', lines: s1, total: material },
      { title: 'Okov i repro materijal', lines: s2, total: hwTotal },
      { title: 'Rad', lines: s3, total: labour },
    ],
    material, hardware: hwTotal, labour, margin, discount, net, vat, total: net + vat,
    unpriced: sheets.filter(s => prices.sheets[s.materialId] === undefined).map(s => project.materials[s.materialId]?.name ?? s.materialId),
  };
}
