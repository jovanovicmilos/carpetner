// Part generator per docs/KONSTRUKCIJA.md.
// shortcut: overrides are ignored.
import type { Element, FrontRow, Installation, Mm, OpeningSpec, Part, Project } from './types';

type Kind = 'carcass' | 'front' | 'back' | 'drawerBottom';
// bare: no edge banding; handle: width across the front of one piece that carries a handle / top profile (docs/OTVARANJE.md)
export type Spec = { name: string; qty: number; length: Mm; width: Mm; kind: Kind; note?: string; bare?: boolean; handle?: Mm };

/** Handles of an element: its own choice, else the project's; undefined = the plain 128 mm handle (fixture). */
export const openingOf = (p: Project, el: Element): OpeningSpec | undefined => el.opening ?? p.opening;

/** Front rows with resolved heights (top → bottom); null rows split the rest, the first one takes the odd mm. */
export function frontRows(el: Element): { row: FrontRow; h: Mm }[] {
  const rows = el.front ?? [];
  const auto = rows.filter(r => r.height === null).length;
  const rest = Math.max(0, el.height - rows.reduce((s, r) => s + (r.height ?? 0), 0));
  const each = auto ? Math.floor(rest / auto) : 0;
  let odd = rest - each * auto;
  return rows.map(row => { if (row.height !== null) return { row, h: row.height }; const h = each + odd; odd = 0; return { row, h }; });
}
/** Appliance niche: no front, no back behind it, a fixed panel under it (user, 2026-11-19). */
export const isNiche = (r: FrontRow) => r.type === 'app' || r.type === 'hood' || !!r.appliance;

// shortcut: a tall unit is always a fridge housing with a 1700 niche; add variants (oven column, pantry) once they are specified.
const FRIDGE_NICHE = 1700;
// shortcut: fixed drawer system (500 slides, bottom W−74 × 476); replace with a hardware catalog rule.
export const DRAWER_SLIDE = 500;
const DRAWER_BOTTOM_DEDUCT = 74, DRAWER_BOTTOM_DEPTH = 476;
const LETTER: Record<Installation['kind'], string> = { water: 'V', drain: 'O', power: 'S', power400: 'T', gas: 'G' };
// shortcut: only base-layer carcasses get a cutout, like tools/make_fixture.py (the spec says every unit with a back, which would
// also cut V1 for the fridge outlet S4); revisit when the design settles it.
const CUTOUT_KINDS = new Set<Element['kind']>(['base', 'sink', 'drawer', 'corner-blind']);

export interface BackCutout { w: Mm; h: Mm; cx: Mm; cy: Mm; names: string }

/** Back cutout per docs/KONSTRUKCIJA.md: box around installation centres behind the carcass + margin, rounded up, minimum size, centred. */
export function backCutout(p: Project, el: Element): BackCutout | undefined {
  if (!CUTOUT_KINDS.has(el.kind)) return;
  const c = p.rules.backCutout;
  const base = el.kind === 'wall' ? el.elevation ?? 0 : el.legs ?? 0;
  const hits = p.room.installations.filter(i => i.wallId === el.wallId && (i.side ?? 1) === (el.side ?? 1)
    && i.offset >= el.offset && i.offset <= el.offset + el.width && i.height >= base && i.height <= base + el.height);
  if (!hits.length) return;
  const xs = hits.map(i => i.offset - el.offset), ys = hits.map(i => i.height - base);
  const up = (v: number) => Math.ceil(v / c.round) * c.round;
  const span = (v: number[]) => Math.max(...v) - Math.min(...v);
  const w = Math.max(c.minWidth, up(span(xs) + 2 * c.margin)), h = Math.max(c.minHeight, up(span(ys) + 2 * c.margin));
  const clamp = (v: number, size: number, total: number) =>
    Math.min(Math.max(v, size / 2 + c.edgeClearance), total - size / 2 - c.edgeClearance);
  const mid = (v: number[]) => Math.round((Math.max(...v) + Math.min(...v)) / 2);
  return { w, h, cx: clamp(mid(xs), w, el.width), cy: clamp(mid(ys), h, el.height), names: hits.map(i => LETTER[i.kind]).join('+') };
}

export const backCutouts = (p: Project): Record<string, BackCutout> =>
  Object.fromEntries(p.elements.flatMap(el => { const c = backCutout(p, el); return c ? [[el.id, c]] : []; }));

const cutoutNote = (p: Project, el: Element) => { const c = backCutout(p, el); return c && `izrez ${c.w}×${c.h} za ${c.names}`; };

export function elementSpecs(p: Project, el: Element): Spec[] {
  const r = p.rules;
  const { width: W, height: H, depth: D } = el;
  const t = r.carcassThickness, inner = W - 2 * t, g = r.frontGap;
  const op = openingOf(p, el);
  const prof = op?.kind === 'profile' ? op.profileHeight ?? 20 : 0; // the top profile shortens every front with a handle
  const profNote = prof ? { note: `−${prof} za profil` } : {};
  // 'under': horizontal panels run the full width and the sides sit on them (shorter by t per panel they rest on).
  const under = r.bottomMode === 'under';
  const caps = el.kind === 'wall' || el.kind === 'tall' ? 2 : 1; // bottom (+ top) under/over the sides
  const side: Spec = { name: 'Stranica', qty: 2, length: under ? H - caps * t : H, width: D, kind: 'carcass' };
  // Back variants (docs/KONSTRUKCIJA.md "Varijante leđa"): inset18 = 18 mm carcass board between the sides, standing on the
  // bottom; bottom/top get shallower and a base unit keeps only the front rail.
  const inset = r.backMode === 'inset18';
  const bottom: Spec = { name: 'Pod', qty: 1, length: under ? W : inner, width: inset ? D - t : D, kind: 'carcass' };
  const RAIL = 100;
  const rails = (qty: number): Spec => ({ name: 'Vezni komad', qty: inset ? Math.min(qty, 1) : qty, length: inner, width: RAIL, kind: 'carcass' });
  const nShelves = el.interior?.shelves ?? el.shelves;
  const shelves: Spec[] = nShelves ? [{ name: 'Fah', qty: nShelves, length: inner, width: D - 20, kind: 'carcass' }] : [];
  const note = cutoutNote(p, el);
  const back: Spec = r.backMode === 'groove'
    ? { name: 'Poleđina', qty: 1, length: W - 22, width: caps === 2 ? H - 22 : H - 11, kind: 'back', note }
    : inset ? { name: 'Poleđina', qty: 1, length: W - 36, width: H - 18, kind: 'carcass', note, bare: true }
    : { name: 'Poleđina', qty: 1, length: W - r.backReduction, width: H - r.backReduction, kind: 'back', note };
  const doors = (w: Mm): Spec[] =>
    el.doors === 2 ? [{ name: 'Krilo', qty: 2, length: H - 4 - prof, width: Math.floor((w - 2 * g) / 2), kind: 'front', handle: Math.floor((w - 2 * g) / 2), ...profNote }]
    : el.doors === 1 ? [{ name: 'Krilo', qty: 1, length: H - 4 - prof, width: w - g, kind: 'front', handle: w - g, ...profNote }]
    : [];
  const fronts = el.drawerFronts ?? [];
  const drawers: Spec[] = [
    ...fronts.map((h): Spec => ({ name: 'Fronta fioke', qty: 1, length: W - g, width: h - prof, kind: 'front', handle: W - g, ...profNote })),
    ...(fronts.length ? [{ name: 'Pod fioke', qty: fronts.length, length: W - DRAWER_BOTTOM_DEDUCT, width: DRAWER_BOTTOM_DEPTH, kind: 'drawerBottom' as Kind }] : []),
  ];

  if (el.front?.length) return rowSpecs();

  switch (el.kind) {
    case 'base':
    case 'sink':
      return [side, bottom, rails(2), ...shelves, back, ...doors(W)];
    case 'corner-blind':
      return [side, bottom, rails(2), ...shelves,
        // 2 stubići screwed into an L profile the door closes on: floor → front rail, as wide as the rail; the blind part stays empty.
        { name: 'Stubić', qty: 2, length: H - 2 * t, width: RAIL, kind: 'carcass' },
        back, ...doors(W - (el.blindWidth ?? 0))];
    case 'drawer':
      return [side, bottom, rails(2), back, ...drawers];
    case 'oven':
      return [side, bottom, rails(1), ...drawers];
    case 'appliance-front':
      return [{ name: 'Fronta MSP', qty: 1, length: H - 4 - prof, width: W - g, kind: 'front', handle: W - g, ...profNote }];
    case 'filler':
      return [{ name: 'Filer', qty: 1, length: H - 4, width: W - 4, kind: 'front' }];
    case 'wall':
      return [side, { ...bottom, name: 'Pod / plafon', qty: 2 }, ...shelves, back, ...doors(W)];
    case 'tall': {
      const upper = H - FRIDGE_NICHE - 4;
      const panels: Spec[] = under
        ? [{ ...bottom, name: 'Pod / plafon', qty: 2 }, { ...bottom, name: 'Srednja stranica', length: inner }]
        : [{ ...bottom, name: 'Pod / plafon / srednja stranica', qty: 3 }];
      return [side, ...panels,
        // shortcut: the upper back spans divider → top; groove/inset take the same deduction from it as the nailed back, i.e. upper − (H − back height − 4).
        { ...back, name: 'Poleđina (gornji deo)', width: upper - (H - back.width - r.backReduction) },
        { name: 'Krilo frižider', qty: 1, length: FRIDGE_NICHE - 4 - prof, width: W - g, kind: 'front', handle: W - g, ...profNote },
        { name: 'Krilo gornje', qty: 1, length: upper - prof, width: W - g, kind: 'front', handle: W - g, ...profNote }];
    }
  }

  /** Element built from front rows (catalog / Prilagođeni element), with the workshop rules above. */
  function rowSpecs(): Spec[] {
    const rows = frontRows(el);
    const tall = el.kind === 'tall', wall = el.kind === 'wall';
    // Every row front is its row − 4 (2 mm at each edge), like the tall unit's 1700 + 370 → 1696 + 366.
    const fh = (h: Mm) => h - 4 - prof;
    const fr: Spec[] = rows.flatMap(({ row, h }): Spec[] => {
      const w = row.type === 'doorBlind' ? W - (row.blindWidth ?? el.blindWidth ?? 0) : W;
      switch (row.type) {
        case 'door': case 'doorBlind': return [{ name: 'Krilo', qty: 1, length: fh(h), width: w - g, kind: 'front', handle: w - g, ...profNote }];
        case 'door2': { const dw = Math.floor((W - 2 * g) / 2); return [{ name: 'Krilo', qty: 2, length: fh(h), width: dw, kind: 'front', handle: dw, ...profNote }]; }
        case 'drawer': return [{ name: 'Fronta fioke', qty: 1, length: W - g, width: fh(h), kind: 'front', handle: W - g, ...profNote }];
        case 'lift': return [{ name: 'Fronta kip', qty: 1, length: W - g, width: fh(h), kind: 'front', handle: W - g, ...profNote }];
        case 'panel': return [{ name: 'Fronta fiksna', qty: 1, length: W - g, width: h - 4, kind: 'front' }];
        default: return []; // app / hood: appliance niche; open: no front; glass: aluminium frame (hardware)
      }
    });
    const nDrawers = rows.filter(x => x.row.type === 'drawer').length + (el.interior?.innerDrawers ?? 0);
    const drawerBottoms: Spec[] = nDrawers ? [{ name: 'Pod fioke', qty: nDrawers, length: W - DRAWER_BOTTOM_DEDUCT, width: DRAWER_BOTTOM_DEPTH, kind: 'drawerBottom' }] : [];
    // Fixed panels: tall = at every row boundary except between drawers; base / wall = under each appliance niche.
    const dividers = rows.slice(0, -1).filter((x, i) => tall
      ? !(x.row.type === 'drawer' && rows[i + 1].row.type === 'drawer')
      : isNiche(x.row)).length;
    const mid: Spec[] = dividers ? [{ ...bottom, name: 'Srednja stranica', qty: dividers, length: inner }] : [];
    // Back only behind runs of rows without an appliance (ventilation); one run = the normal back.
    const runs: Mm[] = [];
    let run = 0;
    for (const x of rows) { if (isNiche(x.row)) { if (run) runs.push(run); run = 0; } else run += x.h; }
    if (run) runs.push(run);
    const backs: Spec[] = el.kind === 'oven' ? []
      : runs.length === 1 && runs[0] === H ? [back]
      : runs.map(h => ({ ...back, name: 'Poleđina (deo)', note: undefined, width: h - (H - back.width) }));
    const carcass: Spec[] = tall || wall ? [side, { ...bottom, name: 'Pod / plafon', qty: 2, length: under ? W : inner }]
      : [side, bottom, rails(el.kind === 'oven' ? 1 : 2)];
    return [...carcass, ...mid, ...shelves, ...backs, ...fr, ...drawerBottoms];
  }
}

/**
 * Parts per element. Without grain (or with followGrain off) `length` is the longer side and the edges swap with it
 * (docs/KONSTRUKCIJA.md "Dužina i širina dela"); `orient: false` keeps the construction orientation (door height = length).
 */
export function generateParts(p: Project, orient = true): Part[] {
  const r = p.rules;
  const cut = (e: number) => (e >= r.deductEdgeFromCutMinThickness ? e : 0);
  return p.elements.flatMap(el => elementSpecs(p, el).map((s, i): Part => {
    const c = r.carcassEdge.thickness, f = r.frontEdge.thickness;
    let edges = s.bare ? { L1: 0, L2: 0, W1: 0, W2: 0 }
      : s.kind === 'carcass' ? { L1: c, L2: 0, W1: 0, W2: 0 }
      : s.kind === 'front' ? { L1: f, L2: f, W1: f, W2: f }
      : { L1: 0, L2: 0, W1: 0, W2: 0 };
    const materialId = el.materials[s.kind];
    if (!materialId) throw new Error(`${el.label}: missing material "${s.kind}"`);
    if (orient && s.width > s.length && !(r.followGrain && p.materials[materialId]?.grain)) {
      s = { ...s, length: s.width, width: s.length };
      edges = { L1: edges.W1, L2: edges.W2, W1: edges.L1, W2: edges.L2 };
    }
    return {
      elementId: el.id, pos: `${el.label}-${i + 1}`, name: s.name, materialId,
      qty: s.qty, length: s.length, width: s.width, edges,
      cutLength: Math.round(s.length - cut(edges.W1) - cut(edges.W2)),
      cutWidth: Math.round(s.width - cut(edges.L1) - cut(edges.L2)),
      ...(s.note ? { note: s.note } : {}),
    };
  }));
}

/** A board in element coordinates: along the width 0..W, depth 0 = back (wall) .. D = carcass front, height from the carcass bottom. */
export type PartBox = [x0: Mm, x1: Mm, y0: Mm, y1: Mm, z0: Mm, z1: Mm];

/**
 * Where every carcass, back and drawer-bottom piece of the cut list sits in its element (docs/3D.md "3D se gradi iz delova
 * krojne liste"): one box per piece (qty), same index as the part (`pos` = label-i). Fronts are left out — the 3D view draws
 * them from frontLayout, which uses the same sizes.
 * shortcut: drawer bottoms and inner drawers are placed at the bottom of their row, without drawer sides (no drawer box parts yet).
 */
export function partBoxes(p: Project, el: Element): { pos: string; name: string; kind: Kind; boxes: PartBox[] }[] {
  const r = p.rules, t = r.carcassThickness, { width: W, height: H, depth: D } = el;
  const under = r.bottomMode === 'under', caps = el.kind === 'wall' || el.kind === 'tall' ? 2 : 1, inset = r.backMode === 'inset18';
  const backT = inset ? t : 3;
  // Fixed panels (Srednja stranica): row boundaries by the cut-list rule, or the classic fridge divider. Heights from the bottom.
  const rows = frontRows(el);
  const fixed: Mm[] = [];
  let top = 0;
  rows.forEach((x, i) => {
    top += x.h;
    const next = rows[i + 1];
    if (next && (el.kind === 'tall' ? !(x.row.type === 'drawer' && next.row.type === 'drawer') : isNiche(x.row))) fixed.push(H - top);
  });
  if (!rows.length && el.kind === 'tall') fixed.push(FRIDGE_NICHE);
  // Back spans (bottom, top) behind rows without an appliance; the upper tall back sits over the divider.
  const spans: [Mm, Mm][] = [];
  top = 0;
  for (const x of rows.length ? rows : [{ row: { type: 'door' as const, height: null }, h: H }]) {
    if (!isNiche(x.row)) spans.push([H - top - x.h, H - top]);
    top += x.h;
  }
  // Drawer rows (bottom, top) for the drawer bottoms.
  const drawerRows: [Mm, Mm][] = [];
  top = 0;
  if (rows.length) for (const x of rows) { if (x.row.type === 'drawer') drawerRows.push([H - top - x.h, H - top]); top += x.h; }
  else for (const h of el.drawerFronts ?? []) { drawerRows.push([H - top - h, H - top]); top += h; }

  const across = (s: Spec, y0: Mm, y1: Mm, z0: Mm, z1: Mm): PartBox => [(W - s.length) / 2, (W + s.length) / 2, y0, y1, z0, z1];
  const flat = (s: Spec, z: Mm, back = false): PartBox => across(s, back ? 0 : D - s.width, back ? s.width : D, z, z + t);
  const backBox = (s: Spec, [b0, b1]: [Mm, Mm]): PartBox => { const m = (b0 + b1) / 2; return across(s, 0, backT, m - s.width / 2, m + s.width / 2); };
  let backRun = 0, drawer = 0, shelf = 0, divider = 0;
  const nShelves = el.interior?.shelves ?? el.shelves ?? 0;

  return elementSpecs(p, el).map((s, i) => {
    const boxes: PartBox[] = [];
    const add = (b: PartBox) => boxes.push(b);
    if (s.kind === 'front') { /* drawn from frontLayout */ }
    else if (s.name === 'Stranica') {
      const z0 = under ? t : 0, z1 = under && caps === 2 ? H - t : H;
      add([0, t, 0, D, z0, z1]); add([W - t, W, 0, D, z0, z1]);
    } else if (s.name === 'Pod') add(flat(s, 0));
    else if (s.name.startsWith('Pod / plafon')) {
      add(flat(s, 0)); add(flat(s, H - t));
      if (s.qty === 3) add(flat(s, (fixed[0] ?? FRIDGE_NICHE) - t / 2));
    } else if (s.name === 'Srednja stranica') for (let k = 0; k < s.qty; k++) add(flat(s, (fixed[divider++] ?? H / 2) - t / 2));
    else if (s.name === 'Vezni komad') {
      add(across(s, D - s.width, D, H - t, H));
      if (s.qty > 1) add(across(s, inset ? t : 0, (inset ? t : 0) + s.width, H - t, H));
    } else if (s.name === 'Fah') for (let k = 0; k < s.qty; k++) { const z = (H * ++shelf) / (nShelves + 1); add(across(s, backT, backT + s.width, z - t / 2, z + t / 2)); }
    else if (s.name === 'Stubić') {
      const b = el.blindWidth ?? 0;
      add([b - s.width, b, D - t, D, t, t + s.length]); add([b - t, b, D - t - s.width, D - t, t, t + s.length]);
    } else if (s.name === 'Poleđina (gornji deo)') add(backBox(s, [fixed[0] ?? FRIDGE_NICHE, H]));
    else if (s.name.startsWith('Poleđina')) add(backBox(s, s.name === 'Poleđina' ? [0, H] : spans[backRun++] ?? [0, H]));
    else if (s.kind === 'drawerBottom') {
      const th = p.materials[el.materials.drawerBottom ?? '']?.thickness ?? 16;
      for (let k = 0; k < s.qty; k++, drawer++) {
        // Inner drawers (behind a door) stack from the carcass bottom, 160 mm apart.
        const b0 = drawerRows[drawer]?.[0] ?? t + 160 * (drawer - drawerRows.length);
        add(across(s, D - 20 - s.width, D - 20, b0 + 20, b0 + 20 + th));
      }
    }
    return { pos: `${el.label}-${i + 1}`, name: s.name, kind: s.kind, boxes };
  });
}
