// Quick start auto layout (docs/BRZI_START.md), ported from design/BrziStart.dc.html.
// Pure and deterministic. Warnings/errors are UI strings, so they stay in Serbian.
import { wallUnitElevation, type Dimensions } from './presets';
import type { Element, ElementKind, Mm, Room } from './types';

export type Shape = 'I' | 'L' | 'U';

export interface QuickStartInput {
  shape: Shape;
  a: Mm; b?: Mm; c?: Mm;
  water?: Mm;              // water + drain on wall A, from the corner
  power400?: Mm;           // three-phase outlet: wall B (wall A for shape I)
  window?: { offset: Mm; width: Mm }; // on wall A
  dishwasher: boolean;
  fridge: boolean;
  wallUnits: boolean;
}

export interface LayoutResult { elements: Element[]; warnings: string[]; error?: string }

type Slot = { wall: 'A' | 'B' | 'C'; x: Mm; w: Mm; kind: ElementKind };

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

  // Greedy fill so the remainder is 0 or >= 300; a remainder < 300 becomes a filler.
  const fill = (wall: Slot['wall'], start: Mm, end: Mm) => {
    let x = start;
    while (end - x >= 300) {
      const rem = end - x;
      const w = FILL_WIDTHS.find(w => w <= rem && (rem - w === 0 || rem - w >= 300)) ?? FILL_WIDTHS.find(w => w <= rem)!;
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

  const aStart = shape === 'I' ? 0 : 1000;
  const aEnd = shape === 'U' ? a - 1000 : a;
  if (shape !== 'I') slots.push({ wall: 'A', x: 0, w: 1000, kind: 'corner-blind' });
  const aLimit = shape === 'I' && input.fridge ? a - 600 : aEnd;
  const tail = (input.dishwasher ? 600 : 0) + (shape === 'I' ? 600 : 0);
  let sx = clamp(r50(water - 400), aStart, Math.max(aStart, aLimit - 800 - tail));
  if (sx - aStart > 0 && sx - aStart < 300) sx = aStart;
  fill('A', aStart, sx);
  slots.push({ wall: 'A', x: sx, w: 800, kind: 'sink' });
  let x = sx + 800;
  if (input.dishwasher && aLimit - x >= 600) { slots.push({ wall: 'A', x, w: 600, kind: 'appliance-front' }); x += 600; }
  if (shape === 'I') {
    if (!ovenRun('A', x, aLimit, Math.max(power400, x + 300))) warnings.push('Nema mesta za rernu na zidu A.');
    if (input.fridge) slots.push({ wall: 'A', x: a - 600, w: 600, kind: 'tall' });
  } else {
    fill('A', x, aEnd);
  }
  if (shape === 'U') slots.push({ wall: 'A', x: a - 1000, w: 1000, kind: 'corner-blind' });
  if (water && (water < sx || water > sx + 800))
    warnings.push(`Voda (${water} mm) nije iza sudopere — sudopera je na ${sx}–${sx + 800} mm. Pomeri sudoperu ili produži dovod.`);
  if (shape !== 'I') {
    const bEnd = input.fridge ? b - 600 : b;
    if (!ovenRun('B', 600, bEnd, power400)) warnings.push('Nema mesta za rernu na zidu B.');
    if (input.fridge) slots.push({ wall: 'B', x: b - 600, w: 600, kind: 'tall' });
  }
  if (shape === 'U') fill('C', 600, c);

  // Wall units on wall A: segments clear of the window (±100) and of the tall unit.
  const uppers: Slot[] = [];
  if (input.wallUnits) {
    const blocks: [Mm, Mm][] = [];
    if (input.window?.width) blocks.push([input.window.offset - 100, input.window.offset + input.window.width + 100]);
    if (shape === 'I' && input.fridge) blocks.push([a - 600, a]);
    let segs: [Mm, Mm][] = [[0, a]];
    for (const [b0, b1] of blocks)
      segs = segs.flatMap(([s0, s1]): [Mm, Mm][] => b1 <= s0 || b0 >= s1 ? [[s0, s1]]
        : [...(b0 > s0 ? [[s0, b0] as [Mm, Mm]] : []), ...(b1 < s1 ? [[b1, s1] as [Mm, Mm]] : [])]);
    for (const [s0, s1] of segs)
      for (let ux = s0; s1 - ux >= 400;) { const w = s1 - ux >= 600 ? 600 : 400; uppers.push({ wall: 'A', x: ux, w, kind: 'wall' }); ux += w; }
  }

  return { elements: toElements([...slots, ...uppers], dims, materials), warnings };
}

function toElements(slots: Slot[], d: Dimensions, materials: Element['materials']): Element[] {
  const n: Record<string, number> = {};
  const label = (prefix: string) => `${prefix}${(n[prefix] = (n[prefix] ?? 0) + 1)}`;
  const elevation = wallUnitElevation(d);
  return slots.map(({ wall, x, w, kind }): Element => {
    const base = { wallId: wall, offset: x, width: w, kind, materials };
    const lower = { height: d.baseCarcassHeight, depth: d.baseCarcassDepth, legs: d.plinthHeight };
    const id = label(kind === 'tall' ? 'V' : kind === 'filler' ? 'F' : kind === 'wall' ? 'G' : 'D');
    const el = { id, label: id, ...base };
    switch (kind) {
      case 'corner-blind': return { ...el, ...lower, shelves: 1, doors: 1, blindWidth: 400 };
      case 'sink': return { ...el, ...lower, shelves: 0, doors: 2 };
      case 'base': return { ...el, ...lower, shelves: 1, doors: w > 600 ? 2 : 1 };
      case 'oven': return { ...el, ...lower, drawerFronts: [116] };
      case 'appliance-front':
      case 'filler': return { ...el, height: d.baseCarcassHeight, depth: d.baseCarcassDepth };
      // Tall top aligns with the wall units' top.
      case 'tall': return { ...el, ...lower, height: elevation + d.wallUnitHeight - d.plinthHeight, doors: 2 };
      default: return { ...el, height: d.wallUnitHeight, depth: d.wallUnitDepth, elevation, shelves: 1, doors: 1 };
    }
  });
}

/** Room for a quick start project. shortcut: heights (water 500, drain 450, 400V 600, window 1200/1000) are fixture defaults; ask in the form when users need them. */
export function quickStartRoom(input: QuickStartInput): Room {
  const lengths = { A: input.a, B: input.b ?? 0, C: input.c ?? 0 };
  const ids = input.shape === 'I' ? ['A'] : input.shape === 'L' ? ['A', 'B'] : ['A', 'B', 'C'];
  const walls = (['A', 'B', 'C'] as const).filter(id => ids.includes(id))
    .map((id, i) => ({ id, length: lengths[id], thickness: 120, angleToPrev: i === 0 ? 0 : 90 }));
  const installations: Room['installations'] = [];
  if (input.water) installations.push(
    { id: 'V', wallId: 'A', kind: 'water', offset: input.water, height: 500 },
    { id: 'O', wallId: 'A', kind: 'drain', offset: input.water + 150, height: 450, diameter: 50 });
  if (input.power400) installations.push({ id: 'S400', wallId: input.shape === 'I' ? 'A' : 'B', kind: 'power400', offset: input.power400, height: 600 });
  const openings: Room['openings'] = input.window?.width
    ? [{ id: 'W1', wallId: 'A', kind: 'window', offset: input.window.offset, width: input.window.width, height: 1200, sill: 1000 }] : [];
  return { height: 2600, walls, openings, installations };
}
