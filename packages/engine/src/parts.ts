// Part generator per docs/KONSTRUKCIJA.md.
// shortcut: overrides are ignored.
import type { Element, FrontRow, Installation, Mm, OpeningSpec, Part, Project } from './types';
import { plinthParts } from './totals';
import { boxHeight, DEFAULT_DRAWER_DEPTH_RESERVE, drawerBox, INNER_DRAWER_HEIGHT, slideOf, type DrawerBox, type Slide } from './slides';

type Kind = 'carcass' | 'front' | 'back' | 'drawerBottom';
// bare: no edge banding; handle: width across the front of one piece that carries a handle / top profile (docs/OTVARANJE.md)
// edgeTop: one long edge banded with the carcass edge (top of a drawer box side / panel)
export type Spec = { name: string; qty: number; length: Mm; width: Mm; kind: Kind; note?: string; bare?: boolean; handle?: Mm; edgeTop?: boolean };

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

/**
 * Drawers of an element (docs/KONSTRUKCIJA.md "Fioke i klizači"): the chosen slide (push variant with push-to-open), its length
 * and the box sizes, plus one box height per drawer top → bottom (front drawers, then inner drawers behind a door).
 */
export function drawerSet(p: Project, el: Element): { slide: Slide; box: DrawerBox; heights: Mm[] } {
  const r = p.rules, t = r.carcassThickness;
  const slide = slideOf(r.drawerSlide, openingOf(p, el)?.kind === 'push');
  const heights = el.front?.length
    ? [...frontRows(el).filter(x => x.row.type === 'drawer').map(x => boxHeight(x.h - 4)), ...Array<Mm>(el.interior?.innerDrawers ?? 0).fill(INNER_DRAWER_HEIGHT)]
    : el.kind === 'drawer' || el.kind === 'oven' ? (el.drawerFronts ?? []).map(boxHeight) : [];
  const side = p.materials[el.materials.drawerBottom ?? '']?.thickness ?? 16;
  const depth = el.depth - (r.backMode === 'inset18' ? t : 0);
  return { slide, heights, box: drawerBox(slide, el.width - 2 * t, depth, r.drawerDepthReserve ?? DEFAULT_DRAWER_DEPTH_RESERVE, 0, side) };
}

/** Box parts: sides and front / back panels per box height, one bottom line for all. */
function drawerSpecs(p: Project, el: Element): Spec[] {
  const { box: b, heights } = drawerSet(p, el);
  if (!heights.length) return [];
  // b.wide (box wider than the slide is long) is only shown on the Element page: it holds for most 600 units, too noisy for the cut list.
  const note = b.fits ? undefined : `klizač ${b.nl} duži od korpusa — proveri`;
  const hs = [...new Set(heights)], n = (h: Mm) => heights.filter(x => x === h).length;
  return [
    ...hs.map((h): Spec => ({ name: 'Stranica fioke', qty: 2 * n(h), length: b.length, width: h, kind: 'drawerBottom', edgeTop: true, ...(note ? { note } : {}) })),
    ...hs.map((h): Spec => ({ name: 'Prednja / zadnja strana fioke', qty: 2 * n(h), length: b.inner, width: h - b.recess - b.s, kind: 'drawerBottom', edgeTop: true })),
    { name: 'Pod fioke', qty: heights.length, length: b.inner, width: b.length, kind: 'drawerBottom' },
  ];
}
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
    ...drawerSpecs(p, el),
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
    case 'oven': // 2 rails (user 2026-11-25): back one flat, front one upright so the hob cut-out stays free
      return [side, bottom, rails(2), ...drawers];
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
    const drawerBottoms = drawerSpecs(p, el);
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
      : [side, bottom, rails(2)];
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
  return [...p.elements.flatMap(el => elementSpecs(p, el).map((s, i): Part => {
    const c = r.carcassEdge.thickness, f = r.frontEdge.thickness;
    let edges = s.bare ? { L1: 0, L2: 0, W1: 0, W2: 0 }
      : s.kind === 'carcass' || s.edgeTop ? { L1: c, L2: 0, W1: 0, W2: 0 }
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
  })), ...plinthParts(p)];
}

/** A board in element coordinates: along the width 0..W, depth 0 = back (wall) .. D = carcass front, height from the carcass bottom. */
export type PartBox = [x0: Mm, x1: Mm, y0: Mm, y1: Mm, z0: Mm, z1: Mm];

/**
 * Where every carcass, back and drawer-bottom piece of the cut list sits in its element (docs/3D.md "3D se gradi iz delova
 * krojne liste"): one box per piece (qty), same index as the part (`pos` = label-i). Fronts are left out — the 3D view draws
 * them from frontLayout, which uses the same sizes.
 * Drawer boxes sit 20 mm over the bottom of their row (inner drawers: 160 mm apart from the carcass bottom), 3 mm behind the carcass front.
 */
export function partBoxes(p: Project, el: Element): { pos: string; name: string; kind: Kind; boxes: PartBox[]; drawers?: number[] }[] {
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
  else {
    // drawerFronts run top → bottom from the carcass top; the oven unit's drawer sits under the oven, i.e. at the bottom.
    const fronts = el.drawerFronts ?? [], base = el.kind === 'oven' ? fronts.reduce((a, h) => a + h, 0) : H;
    for (const h of fronts) { drawerRows.push([base - top - h, base - top]); top += h; }
  }

  const across = (s: Spec, y0: Mm, y1: Mm, z0: Mm, z1: Mm): PartBox => [(W - s.length) / 2, (W + s.length) / 2, y0, y1, z0, z1];
  const flat = (s: Spec, z: Mm, back = false): PartBox => across(s, back ? 0 : D - s.width, back ? s.width : D, z, z + t);
  const backBox = (s: Spec, [b0, b1]: [Mm, Mm]): PartBox => { const m = (b0 + b1) / 2; return across(s, 0, backT, m - s.width / 2, m + s.width / 2); };
  let backRun = 0, shelf = 0, divider = 0;
  const nShelves = el.interior?.shelves ?? el.shelves ?? 0;

  return elementSpecs(p, el).map((s, i) => {
    const boxes: PartBox[] = [], drawers: number[] = []; // drawers[i] = drawer index (top → bottom) of boxes[i], drawer box parts only
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
      // oven unit: the front rail stands upright behind the front (hob cut-out above it stays free)
      add(el.kind === 'oven' ? across(s, D - t, D, H - s.width, H) : across(s, D - s.width, D, H - t, H));
      if (s.qty > 1) add(across(s, inset ? t : 0, (inset ? t : 0) + s.width, H - t, H));
    } else if (s.name === 'Fah') for (let k = 0; k < s.qty; k++) { const z = (H * ++shelf) / (nShelves + 1); add(across(s, backT, backT + s.width, z - t / 2, z + t / 2)); }
    else if (s.name === 'Stubić') {
      const b = el.blindWidth ?? 0;
      add([b - s.width, b, D - t, D, t, t + s.length]); add([b - t, b, D - t - s.width, D - t, t, t + s.length]);
    } else if (s.name === 'Poleđina (gornji deo)') add(backBox(s, [fixed[0] ?? FRIDGE_NICHE, H]));
    else if (s.name.startsWith('Poleđina')) add(backBox(s, s.name === 'Poleđina' ? [0, H] : spans[backRun++] ?? [0, H]));
    else if (s.kind === 'drawerBottom') {
      // Drawers this line belongs to: sides / panels by box height (width + recess + side for panels), the bottom = all.
      const { box: b, heights } = drawerSet(p, el);
      const y1 = D - 3, y0 = y1 - b.length, xo = (W - b.outer) / 2;
      const z = (k: number) => (drawerRows[k]?.[0] ?? t + 160 * (k - drawerRows.length)) + 20;
      const which = heights.map((h, k) => ({ h, k })).filter(({ h }) =>
        s.name === 'Pod fioke' || h === (s.name === 'Stranica fioke' ? s.width : s.width + b.recess + b.s));
      for (const { h, k } of which) {
        const z0 = z(k);
        if (s.name === 'Stranica fioke') { add([xo, xo + b.s, y0, y1, z0, z0 + h]); add([W - xo - b.s, W - xo, y0, y1, z0, z0 + h]); }
        else if (s.name === 'Pod fioke') add(across(s, y0, y1, z0 + b.recess, z0 + b.recess + b.s));
        else { add(across(s, y1 - b.s, y1, z0 + b.recess + b.s, z0 + h)); add(across(s, y0, y0 + b.s, z0 + b.recess + b.s, z0 + h)); }
        while (drawers.length < boxes.length) drawers.push(k);
      }
      return { pos: `${el.label}-${i + 1}`, name: s.name, kind: s.kind, boxes, drawers };
    }
    return { pos: `${el.label}-${i + 1}`, name: s.name, kind: s.kind, boxes };
  });
}
