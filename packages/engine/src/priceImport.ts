// Supplier price list import (Cenovnik "Uvezi cenovnik dobavljača", Poređenje "+ Dodaj firmu i cenovnik"): rows of a CSV / Excel
// sheet → prices in para for our materials and items. Lines are recognised by words and codes, never guessed: whatever does not
// match is returned in `unknown` for the user to see. Pure: rows in, prices out.
import type { Material } from './types';

export type PriceKey = 'worktopPiece' | 'cuttingPerM' | 'delivery' | 'hingeSet' | 'drawerKit' | 'leg' | 'plinthClip' | 'handle'
  | 'hanger' | 'shelfPin' | 'plinthPerM' | 'wallStripPerM' | 'sinkPad'
  | 'profilePerM' | 'pusher' | 'liftKit' | 'glassFrame';
export interface ImportedPrices {
  sheets: Record<string, number>;          // materialId → para per sheet
  edgingPerM: Record<string, number>;      // '0.8' | '2' … → para per m
  items: Partial<Record<PriceKey, number>>;
  unknown: string[];                       // lines with a price that matched nothing
}

const lower = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'dj');

/** "6.500,00", "6500", "6,500.00", "1 250 din" → para (integer); null when there is no number. */
export function parseMoney(v: string | number): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) : null;
  let s = v.replace(/[^\d.,-]/g, '');
  if (!/\d/.test(s)) return null;
  const dot = s.lastIndexOf('.'), comma = s.lastIndexOf(',');
  if (dot >= 0 && comma >= 0) s = dot > comma ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.'); // the last one is the decimal mark
  else if (comma >= 0) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');     // 6,500 = thousands; 6,5 = decimal
  else if (dot >= 0 && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');                         // 6.500 = thousands
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

// Item words (lower case, no diacritics). Order matters: the first match wins.
const ITEMS: [PriceKey, RegExp][] = [
  ['worktopPiece', /radna ploca|radne ploce/], ['cuttingPerM', /secenje|krojenje|\brez\b/], ['delivery', /dostava|prevoz|isporuka/],
  ['pusher', /potiskivac/], ['liftKit', /\bkip|lift|podizn/], ['glassFrame', /ram .*stakl|alu ram/], ['profilePerM', /profil(?!.*sokl)/],
  ['hingeSet', /sark/], ['drawerKit', /fiok|vodilic/], ['plinthClip', /klips/], ['leg', /nogic/], ['handle', /ruck/],
  ['hanger', /vesaljk/], ['shelfPin', /nosac (faha|police)|nosaci (faha|polica)/], ['plinthPerM', /sokl/], ['wallStripPerM', /lajsn/], ['sinkPad', /podlog/],
];

/** Decor code of a material name ("Iverica 18 bela W980" → "w980"), if any. */
const decor = (m: Material) => lower(m.name).split(/\s+/).find(t => /^[a-z]{1,3}\d{3,5}[a-z]*$/.test(t));

export function importPrices(rows: (string | number | null | undefined)[][], materials: Record<string, Material>): ImportedPrices {
  const out: ImportedPrices = { sheets: {}, edgingPerM: {}, items: {}, unknown: [] };
  const cells = rows.map(r => r.map(c => (c === null || c === undefined ? '' : c)));
  // Price column: a header containing "cena" / "price", else the last column that holds numbers.
  const hi = cells.findIndex(r => r.some(c => typeof c === 'string' && /cena|price|iznos/.test(lower(c))));
  let pc = hi >= 0 ? cells[hi].findIndex(c => typeof c === 'string' && /cena|price|iznos/.test(lower(c))) : -1;
  const body = cells.slice(hi + 1);
  if (pc < 0) {
    const width = Math.max(0, ...body.map(r => r.length));
    for (let c = width - 1; c >= 0 && pc < 0; c--) if (body.some(r => parseMoney(r[c] ?? '') !== null)) pc = c;
  }
  if (pc < 0) return out;
  const mats = Object.values(materials);

  for (const r of body) {
    const price = parseMoney(r[pc] ?? '');
    const label = r.filter((_, i) => i !== pc).map(String).join(' ').trim();
    if (price === null || price < 0 || !label) continue;
    const t = lower(label), words = ` ${t.replace(/[^a-z0-9,.]+/g, ' ')} `;
    if (price === 0 && !/dostava|prevoz|isporuka/.test(t)) continue; // 0 counts only as free delivery
    const thick = (n: number) => new RegExp(`(^|[^\\d,.])${String(n).replace('.', '[.,]')}\\s*(mm)?([^\\d,.]|$)`).test(t);
    if (/\bkant/.test(t)) {
      const th = ['0.4', '0.8', '1', '2'].find(x => thick(Number(x)));
      if (th) { out.edgingPerM[th] = price; continue; }
    }
    const item = ITEMS.find(([, re]) => re.test(t));
    if (item) { out.items[item[0]] = price; continue; }
    const m = mats.find(mm => {
      const d = decor(mm);
      if (!thick(mm.thickness)) return false;
      if (d) return words.includes(` ${d} `) || t.includes(d);
      return mm.kind === 'hdf' ? /\bhdf\b/.test(t) : false;
    });
    if (m) { out.sheets[m.id] = price; continue; }
    out.unknown.push(label);
  }
  return out;
}
