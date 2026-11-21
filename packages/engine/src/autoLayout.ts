// Quick start auto layout (docs/BRZI_START.md), ported from design/screens/BrziStart.html.
// Pure and deterministic. Warnings/errors are UI strings, so they stay in Serbian.
// The algorithm measures every wall from its corner with wall A; wall B runs from the D corner towards A
// (docs/DATA_MODEL.md), so B offsets are flipped at the end (`offset = b − x − w`).
import { syncWalls } from './geometry';
import { wallUnitElevation, type Dimensions } from './presets';
import type { Element, ElementKind, FrontRow, Hinge, Mm, Obstacle, Room, Wall } from './types';

export type Shape = 'I' | 'L' | 'U';

export interface QuickStartInput {
  shape: Shape;
  a: Mm; b?: Mm; c?: Mm;
  water?: Mm;              // water + drain on wall A, from the corner
  power400?: Mm;           // three-phase outlet: wall B from the corner with A (wall A for shape I)
  window?: { offset: Mm; width: Mm }; // on wall A
  dishwasher: boolean;
  fridge: boolean;
  wallUnits: boolean;
  obstacles?: Obstacle[];  // offsets from the corner with wall A, like the other inputs
  island?: boolean;        // a row of base units facing wall A (island line 'O', see islandOf)
  oven?: 'under' | 'tall' | 'none';  // under the hob (default) / in a tall unit next to the fridge / none; the hob stays either way
  fridgeType?: 'built' | 'free';     // built = tall unit (default), free = free-standing fridge (an obstacle in quickStartRoom)
  dishwasherWidth?: 450 | 600;       // default 600
}

/** Tall unit with a built-in oven (catalog "Rerna + fioke", tallOF). */
const TALL_OVEN: FrontRow[] = [{ type: 'door', height: 640 }, { type: 'app', height: 590, appliance: 'oven60' }, { type: 'drawer', height: null }, { type: 'drawer', height: null }];

/** Island: half of wall A (1200–2400), centred, its line 2400 from wall A so the fronts leave a 1200 aisle. */
export const islandOf = (a: Mm) => { const len = clamp(r50(a / 2), 1200, 2400); return { x: r50((a - len) / 2), y: 2400, len }; };

export interface LayoutResult { elements: Element[]; warnings: string[]; error?: string }

type Slot = { wall: 'A' | 'B' | 'C' | 'O'; x: Mm; w: Mm; kind: ElementKind; hob?: boolean; tallOven?: boolean };
type Seg = [Mm, Mm];

/** Removes blocked intervals from segments; drops empty pieces. */
const subtract = (segs: Seg[], blocks: Seg[]): Seg[] => blocks.reduce((acc, [b0, b1]) =>
  acc.flatMap(([s0, s1]): Seg[] => b1 <= s0 || b0 >= s1 ? [[s0, s1]]
    : [...(b0 > s0 ? [[s0, b0] as Seg] : []), ...(b1 < s1 ? [[b1, s1] as Seg] : [])]), segs)
  .filter(([s0, s1]) => s1 > s0);

const r50 = (v: number) => Math.round(v / 50) * 50;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const FILL_WIDTHS = [600, 500, 400, 300];

export function autoLayout(input: QuickStartInput, dims: Dimensions, materials: Element['materials']): LayoutResult {
  const { shape, a, b = 0, c = 0, water = 0, power400 = 0 } = input;
  const slots: Slot[] = [];
  const warnings: string[] = [];

  const minA = shape === 'U' ? 3400 : 2400;
  const error = a < minA ? `Zid A je prekratak za ovaj oblik (najmanje ${minA} mm).`
    : shape !== 'I' && b < 1200 ? 'Zid B je prekratak (najmanje 1200 mm).'
    : shape === 'U' && c < 1200 ? 'Zid C je prekratak (najmanje 1200 mm).'
    : undefined;
  if (error) return { elements: [], warnings, error };

  // Largest standard width that fits, repeated; a remainder < 300 becomes a filler.
  const fill = (wall: Slot['wall'], start: Mm, end: Mm) => {
    let x = start;
    while (end - x >= 300) {
      const w = FILL_WIDTHS.find(w => w <= end - x)!;
      slots.push({ wall, x, w, kind: 'base' });
      x += w;
    }
    if (end - x > 0) slots.push({ wall, x, w: end - x, kind: 'filler' });
  };
  const ovenRun = (wall: Slot['wall'], start: Mm, end: Mm, target: Mm) => {
    if (end - start < 600) { fill(wall, start, end); return false; }
    let ox = clamp(r50(target - 300), start, end - 600);
    if (ox - start > 0 && ox - start < 300) ox = start;
    if (end - (ox + 600) > 0 && end - (ox + 600) < 300) ox = end - 600;
    fill(wall, start, ox);
    slots.push({ wall, x: ox, w: 600, kind: 'oven' });
    fill(wall, ox + 600, end);
    return true;
  };

  // Obstacles (chimney, column…) split each wall into free segments, per height zone.
  const elev = wallUnitElevation(dims);
  const blocks = (wall: Slot['wall'], lo: Mm, hi: Mm): Seg[] => (input.obstacles ?? [])
    .filter(o => o.wallId === wall && (o.elevation ?? 0) < hi && (o.elevation ?? 0) + (o.height ?? Infinity) > lo)
    .map(o => [o.offset ?? 0, (o.offset ?? 0) + o.width]);
  const baseBlocks = (wall: Slot['wall']) => blocks(wall, 0, dims.worktopTopHeight);
  const isFree = (wall: Slot['wall'], x0: Mm, x1: Mm) =>
    subtract([[x0, x1]], blocks(wall, 0, elev + dims.wallUnitHeight)).some(([s0, s1]) => s0 === x0 && s1 === x1);
  // Segment that contains `target` and is long enough, else the longest one.
  const pick = (segs: Seg[], target: Mm, min: Mm) =>
    segs.find(([s0, s1]) => s1 - s0 >= min && target >= s0 && target <= s1)
    ?? [...segs].sort((x, y) => (y[1] - y[0]) - (x[1] - x[0])).find(([s0, s1]) => s1 - s0 >= min);

  // End of the run (wall A for shape I, wall B otherwise): tall oven, then the fridge — built (tall unit) or free-standing (gap).
  const dw = input.dishwasherWidth ?? 600, ovenMode = input.oven ?? 'under', tallOven = ovenMode === 'tall';
  const endReserve = (input.fridge ? 600 : 0) + (tallOven ? 600 : 0);
  const endWhat = tallOven ? (input.fridge ? 'frižider i visoki element sa rernom' : 'visoki element sa rernom') : 'frižider';
  const placeEnd = (wall: Slot['wall'], end: Mm) => {
    let x = end - endReserve;
    if (tallOven) { slots.push({ wall, x, w: 600, kind: 'tall', tallOven: true }); x += 600; }
    if (input.fridge && input.fridgeType !== 'free') slots.push({ wall, x, w: 600, kind: 'tall' });
  };
  const aStart = shape === 'I' ? 0 : 1000;
  const aEnd = shape === 'U' ? a - 1000 : a;
  if (shape !== 'I') slots.push({ wall: 'A', x: 0, w: 1000, kind: 'corner-blind' });
  let fridgeA = shape === 'I' && endReserve > 0;
  if (fridgeA && !isFree('A', a - endReserve, a)) { fridgeA = false; warnings.push(`Nema mesta za ${endWhat} na kraju zida A (prepreka).`); }
  const aLimit = fridgeA ? a - endReserve : aEnd;
  const tail = (input.dishwasher ? dw : 0) + (shape === 'I' ? 600 : 0);
  const aSegs = subtract([[aStart, aLimit]], baseBlocks('A'));
  const sinkSeg = pick(aSegs, water, 800);
  if (!sinkSeg) warnings.push('Nema mesta za sudoperu na zidu A.');
  let sx = 0;
  for (const seg of aSegs) {
    if (seg !== sinkSeg) { fill('A', seg[0], seg[1]); continue; }
    const [s0, s1] = seg;
    sx = clamp(r50(water - 400), s0, Math.max(s0, s1 - 800 - tail));
    if (sx - s0 > 0 && sx - s0 < 300) sx = s0;
    fill('A', s0, sx);
    slots.push({ wall: 'A', x: sx, w: 800, kind: 'sink' });
    let x = sx + 800;
    if (input.dishwasher && s1 - x >= dw) { slots.push({ wall: 'A', x, w: dw, kind: 'appliance-front' }); x += dw; }
    const afterMsp = slots.length;
    if (shape === 'I') {
      if (!ovenRun('A', x, s1, Math.max(power400, x + 300))) warnings.push(`Nema mesta za ${ovenMode === 'under' ? 'rernu' : 'ploču za kuvanje'} na zidu A.`);
    } else fill('A', x, s1);
    // The first base unit right after the dishwasher becomes a drawer unit.
    const next = slots[afterMsp];
    if (input.dishwasher && next?.kind === 'base' && next.x === x && next.w >= 400) next.kind = 'drawer';
  }
  if (fridgeA) placeEnd('A', a);
  if (shape === 'U') slots.push({ wall: 'A', x: a - 1000, w: 1000, kind: 'corner-blind' });
  if (sinkSeg && water && (water < sx || water > sx + 800))
    warnings.push(`Voda (${water} mm) nije iza sudopere — sudopera je na ${sx}–${sx + 800} mm. Pomeri sudoperu ili produži dovod.`);
  if (shape !== 'I') {
    let fridgeB = endReserve > 0;
    if (fridgeB && !isFree('B', b - endReserve, b)) { fridgeB = false; warnings.push(`Nema mesta za ${endWhat} na kraju zida B (prepreka).`); }
    const bSegs = subtract([[600, fridgeB ? b - endReserve : b]], baseBlocks('B'));
    const ovenSeg = pick(bSegs, power400, 600);
    if (!ovenSeg) warnings.push(`Nema mesta za ${ovenMode === 'under' ? 'rernu' : 'ploču za kuvanje'} na zidu B.`);
    for (const seg of bSegs) seg === ovenSeg ? ovenRun('B', seg[0], seg[1], power400) : fill('B', seg[0], seg[1]);
    if (fridgeB) placeEnd('B', b);
  }
  if (shape === 'U') for (const [s0, s1] of subtract([[600, c]], baseBlocks('C'))) fill('C', s0, s1);
  if (input.island) { const n = slots.length; fill('O', 0, islandOf(a).len); if (slots[n]?.kind === 'base') slots[n].kind = 'drawer'; }

  // Wall units on wall A: segments clear of the window (±100), the tall unit and obstacles.
  const uppers: Slot[] = [];
  if (input.wallUnits) {
    const wallBlocks = blocks('A', elev, elev + dims.wallUnitHeight);
    if (input.window?.width) wallBlocks.push([input.window.offset - 100, input.window.offset + input.window.width + 100]);
    if (fridgeA) wallBlocks.push([a - endReserve, a]);
    for (const [s0, s1] of subtract([[0, a]], wallBlocks))
      for (let ux = s0; s1 - ux >= 400;) { const w = s1 - ux >= 600 ? 600 : 400; uppers.push({ wall: 'A', x: ux, w, kind: 'wall' }); ux += w; }
  }

  // Oven not under the hob: that unit keeps the hob (cut-out, 3D) over drawers.
  if (ovenMode !== 'under') for (const sl of slots) if (sl.kind === 'oven') { sl.kind = 'drawer'; sl.hob = true; }
  const bLen = Math.max(b, shape === 'U' ? c : 0); // wall B length in quickStartRoom
  const flipped = [...slots, ...uppers].map(sl => (sl.wall === 'B' ? { ...sl, x: bLen - sl.x - sl.w } : sl));
  return { elements: withHinges(toElements(flipped, dims, materials)), warnings };
}

/**
 * Default hinge sides (docs/KONSTRUKCIJA.md): two doors LR, dishwasher front down, blind corner away from the corner,
 * single doors towards the nearer end of their run (walls, corners, windows or gaps end a run). Front view: left = wall start.
 */
function withHinges(els: Element[]): Element[] {
  const up = (e: Element) => e.kind === 'wall';
  const runOf = (e: Element) => {
    const same = els.filter(o => o.wallId === e.wallId && up(o) === up(e)).sort((x, y) => x.offset - y.offset);
    let s0 = e.offset, s1 = e.offset + e.width;
    for (const o of same) if (o.offset + o.width === s0) s0 = o.offset;
    for (const o of [...same].reverse()) if (o.offset === s1) s1 = o.offset + o.width;
    return [s0, s1];
  };
  return els.map(e => {
    let hinge: Hinge | undefined;
    if (e.kind === 'appliance-front') hinge = 'down';
    else if (e.kind === 'corner-blind') hinge = e.offset === 0 ? 'R' : 'L';
    else if (e.doors === 2 && e.kind !== 'tall') hinge = 'LR'; // tall: fridge + upper door on one side
    else if (e.doors === 1 || e.kind === 'tall') { const [s0, s1] = runOf(e), c = e.offset + e.width / 2; hinge = c - s0 <= s1 - c ? 'L' : 'R'; }
    return hinge ? { ...e, hinge } : e;
  });
}

function toElements(slots: Slot[], d: Dimensions, materials: Element['materials']): Element[] {
  const n: Record<string, number> = {};
  return slots.map(({ wall, x, w, kind, hob, tallOven }) => {
    const prefix = labelPrefix(kind);
    n[prefix] = (n[prefix] ?? 0) + 1;
    // A single filler is just "F" (fixture); further ones F2, F3…
    const id = prefix === 'F' && n.F === 1 ? 'F' : `${prefix}${n[prefix]}`;
    const el: Element = { ...makeElement(kind, wall, x, w, id, d, materials), side: wall === 'O' ? -1 as const : 1 as const }; // island units face wall A
    if (hob) return { ...el, hob: true };
    if (tallOven) { const { note: _, ...rest } = el; return { ...rest, front: TALL_OVEN, interior: { shelves: 0, innerDrawers: 0 }, shelves: 0, doors: 1, drawerFronts: undefined, catalogKey: 'tallOF' }; }
    return el;
  });
}

export const labelPrefix = (kind: ElementKind) => (kind === 'tall' ? 'V' : kind === 'filler' ? 'F' : kind === 'wall' ? 'G' : 'D');

/** One element with preset defaults for its kind. */
export function makeElement(kind: ElementKind, wallId: string, offset: Mm, width: Mm, id: string, d: Dimensions, materials: Element['materials']): Element {
  const el = { id, label: id, kind, wallId, offset, width, materials };
  const lower = { height: d.baseCarcassHeight, depth: d.baseCarcassDepth, legs: d.plinthHeight };
  const elevation = wallUnitElevation(d);
  switch (kind) {
    case 'corner-blind': return { ...el, ...lower, shelves: 1, doors: 1, blindWidth: 400 };
    case 'sink': return { ...el, ...lower, shelves: 0, doors: 2 };
    case 'base': return { ...el, ...lower, shelves: 1, doors: width > 600 ? 2 : 1 };
    case 'drawer': { // 176 on top, the other two share the rest (720 → 176 / 266 / 266); 4 mm off the top and between fronts
      const rest = Math.floor((d.baseCarcassHeight - 4 - 176 - 2 * 4) / 2);
      return { ...el, ...lower, drawerFronts: [176, rest, rest] };
    }
    case 'oven': return { ...el, ...lower, drawerFronts: [116] };
    case 'appliance-front': return { ...el, height: d.baseCarcassHeight, depth: d.baseCarcassDepth, note: 'ugradna MSP' };
    case 'filler': return { ...el, height: d.baseCarcassHeight, depth: d.baseCarcassDepth };
    // Tall top aligns with the wall units' top. shortcut: fridge niche fixed at 1700 like parts.ts.
    case 'tall': {
      const height = elevation + d.wallUnitHeight - d.plinthHeight;
      return { ...el, ...lower, height, doors: 2, note: `frižider: krilo 1696 + ${height - 1700 - 4}` };
    }
    case 'wall': return { ...el, height: d.wallUnitHeight, depth: d.wallUnitDepth, elevation, shelves: 1, doors: 1 };
  }
}

/**
 * Room for a quick start project, like fixtures/kuhinja-petrovic.json: 120 mm walls B → A → C → D clockwise (inner corner A/B at 0,0),
 * shape I = wall A only. Inputs measured from the corner with A are flipped for wall B.
 * shortcut: heights (water 500, drain 450, 400V 600, window 1200/1000) are fixture defaults; ask in the form when users need them.
 */
export function quickStartRoom(input: QuickStartInput): Room {
  const { a, shape } = input, b = input.b ?? 0, h = Math.max(b, shape === 'U' ? input.c ?? 0 : 0), t = 60;
  const P = (x: number, y: number) => ({ x, y });
  const wall = (id: string, from: { x: number; y: number }, to: { x: number; y: number }) => ({ id, length: 0, thickness: 120, angleToPrev: 0, a: from, b: to });
  const walls: Wall[] = shape === 'I' ? [wall('A', P(0, -t), P(a, -t))] : [
    wall('B', P(-t, h + t), P(-t, -t)), wall('A', P(-t, -t), P(a + t, -t)),
    wall('C', P(a + t, -t), P(a + t, h + t)), wall('D', P(a + t, h + t), P(-t, h + t)),
  ];
  if (input.island) { const i = islandOf(a); walls.push({ ...wall('O', P(i.x, i.y), P(i.x + i.len, i.y)), thickness: 0, island: true }); }
  const onB = shape !== 'I';
  const installations: Room['installations'] = [];
  if (input.water) installations.push(
    { id: 'V', wallId: 'A', kind: 'water', offset: input.water, height: 500, side: 1 },
    { id: 'O', wallId: 'A', kind: 'drain', offset: input.water + 150, height: 450, diameter: 50, side: 1 });
  if (input.power400) installations.push({ id: 'T', wallId: onB ? 'B' : 'A', kind: 'power400', offset: onB ? h - input.power400 : input.power400, height: 600, side: 1 });
  const openings: Room['openings'] = input.window?.width
    ? [{ id: 'W1', wallId: 'A', kind: 'window', offset: input.window.offset, width: input.window.width, height: 1200, sill: 1000 }] : [];
  // Free-standing fridge (vodič "Samostojeći"): its floor spot at the end of the run, measured from the corner like the inputs.
  const free = input.fridge && input.fridgeType === 'free' ? [{ id: 'FR', kind: 'other' as const, label: 'Frižider (samostojeći)', wallId: onB ? 'B' : 'A', offset: (onB ? b : a) - 600, width: 600, depth: 650, height: 1850, side: 1 as const }] : [];
  const obstacles = [...(input.obstacles ?? []), ...free].map(o => (o.wallId === 'B' && o.offset !== undefined ? { ...o, offset: h - o.offset - o.width } : o));
  return syncWalls({ height: 2600, walls, openings, installations, obstacles });
}
