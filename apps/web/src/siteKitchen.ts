// The site's example kitchen and its variants (design/Pocetna.dc.html): one source for the live home page (SiteHome.tsx) and
// the exported pictures (SiteAssets.tsx, design/BRIEF_SITE_ASSETS.md). Everything comes from the engine.
import {
  autoLayout, backCutout, cutSheets, DEFAULT_ELEMENT_MATERIALS, DEFAULT_QUOTE, DEFAULT_MATERIALS, DEFAULT_RULES, edgeCode, EXAMPLE_PRICES, fromDataModel, generateParts,
  makeElement, mergeParts, PRESETS, quickStartRoom, quote, type DataModelProject, type ElementKind, type Project, type QuickStartInput, type Shape,
} from 'engine';
import fixture from '../../../fixtures/kuhinja-petrovic.json';
import demo from '../../../fixtures/cenovnik-demo.json';
import { FRONTS, withFrontMaterial } from './look';
import { useWorkshop } from './workshop';

// U: autoLayout needs wall A ≥ 3600 for U (two 1100 corner units, 2026-11-25), so the site's U is 360 × 240 × 240 (the brief asked 320).
// The catalog has no dark green decor: "zelena" is the palette's olive U633, the closest green.
export const FRONT = { bela: 0, hrast: 4, zelena: 2, orah: 5 } as const;
export const TOP = { hrast: 'Hrast', beton: 'Beton', crna: 'Crni granit' } as const; // worktop looks with bundled CC0 textures
export type Front = keyof typeof FRONT; export type Top = keyof typeof TOP;
export const CONTENT = { krilo: 'base', fioke: 'drawer', sudopera: 'sink' } as const satisfies Record<string, ElementKind>;
export type Content = keyof typeof CONTENT;
export const WIDTHS = [400, 500, 600, 800];
export const SHAPES = { 'prava-320': 'I', 'L-320x240': 'L', 'U-360x240x240': 'U' } as const satisfies Record<string, Shape>;
export type ShapeName = keyof typeof SHAPES;

/**
 * The site's example kitchen = the shared fixture without the 200 filler at the end of wall A: the drawer unit before it takes
 * its place (user 2026-11-24: the filler made the right end look empty in the 3D pictures; 700 since the 1100 corner unit of 2026-11-25). Same for every site asset.
 */
export function kitchen(): Project {
  const p = fromDataModel(fixture.project as unknown as DataModelProject), f = p.elements.find(e => e.kind === 'filler')!;
  return { ...p, elements: p.elements.filter(e => e !== f).map(e => (e.wallId === f.wallId && e.offset + e.width === f.offset ? { ...e, width: e.width + f.width } : e)) };
}

/** I and U from the quick start's auto layout with the quick start's defaults; L = the shared fixture. */
export function shapeProject(s: ShapeName): Project {
  if (SHAPES[s] === 'L') return kitchen();
  const input: QuickStartInput = {
    shape: SHAPES[s], a: SHAPES[s] === 'U' ? 3600 : 3200, b: 2400, c: 2400, water: 1500, power400: 900, window: { offset: 1100, width: 1000 },
    dishwasher: true, fridge: true, wallUnits: true, oven: 'under',
  };
  const layout = autoLayout(input, PRESETS.workshop, DEFAULT_ELEMENT_MATERIALS);
  if (layout.error) throw new Error(`${s}: ${layout.error}`);
  return {
    id: `site-${s}`, name: `Kuhinja ${s}`, unit: 'mm', presetId: 'workshop', room: { ...quickStartRoom(input), height: 2600 }, elements: layout.elements,
    rules: DEFAULT_RULES, materials: DEFAULT_MATERIALS, opening: { kind: useWorkshop.getState().opening },
  };
}
export const dress = (p: Project, f: Front, t: Top): Project => ({ ...withFrontMaterial(p, FRONTS[FRONT[f]][2]), look: { ...p.look, worktop: TOP[t] } });
export const looks = (f: Front, t: Top) => ({ front: FRONTS[FRONT[f]][0], frontMaterial: FRONTS[FRONT[f]][2].id, top: TOP[t], topLook: `wt:${TOP[t]}` });

/** One unit alone on wall A of the fixture room (the sink over the water pipes, so its back cutout shows). */
export function unitProject(w: number, c: Content): Project {
  const p = kitchen(), sinkAt = p.elements.find(e => e.kind === 'sink')?.offset ?? 0;
  const el = { ...makeElement(CONTENT[c], 'A', c === 'sudopera' ? sinkAt : 0, w, 'D1', PRESETS.workshop, p.elements[0].materials), label: 'D1' };
  return { ...p, room: { ...p.room, openings: [] }, elements: [el] };
}

/** Back cutout of a unit for CarcassDrawing (the sink over the pipes), as the Element page passes it. */
export function unitCutout(p: Project) {
  const bc = backCutout(p, p.elements[0]);
  return bc ? { label: `${bc.w}×${bc.h}`, mid: bc.cy, h: bc.h } : null;
}

export const partRows = (p: Project) => mergeParts(generateParts(p)).map(x => ({
  name: x.name, qty: x.qty, length: x.length, width: x.width, edges: x.edges, edgeCode: edgeCode(x.edges, p.rules),
  material: p.materials[x.materialId]?.name ?? x.materialId, positions: x.positions,
}));

/** Every cutting sheet of the whole kitchen, material by material (the cut list's optimizer). */
export function nesting() {
  const p = kitchen(), parts = generateParts(p);
  return [...new Set(parts.map(x => x.materialId))].flatMap(id => {
    const m = p.materials[id];
    if (!m?.sheet) return [];
    const r = cutSheets(parts.filter(x => x.materialId === id), m.sheet, { rotate: !(p.rules.followGrain && m.grain) });
    return r.sheets.map((s, i) => ({ material: m.name, size: m.sheet!, sheet: s, of: [i + 1, r.sheets.length], tooBig: r.tooBig }));
  });
}

export function price(f: Front, t: Top, who: 'stolar' | 'sam') {
  const p = dress(kitchen(), f, t);
  // "sam": the saw shop's job only (boards, cutting, edging, hardware); no making, no fitting.
  const prices = { ...EXAMPLE_PRICES, sheets: { ...EXAMPLE_PRICES.sheets, ...demo.sheets }, worktopPiece: demo.worktopPieceByTop[t], ...(who === 'sam' && { perElement: 0, installDay: 0 }) };
  const q = quote(p, prices, { ...DEFAULT_QUOTE, ...demo.quote });
  const lines = q.sections.flatMap(s => s.lines);
  const sum = (f: (n: string) => boolean) => lines.filter(l => f(l.name)).reduce((s, l) => s + l.amount, 0);
  const groups = {
    korpusi: sum(n => n.endsWith('(ploča)') && !n.includes('— fronte')), fronte: sum(n => n.includes('— fronte')), radnaPloca: sum(n => n.startsWith('Radna ploča')),
    kantIOkov: sum(n => n.startsWith('Kantovanje')) + q.hardware, [who === 'stolar' ? 'izrada' : 'secenje']: who === 'stolar' ? sum(n => n.startsWith('Izrada')) : sum(n => n.startsWith('Sečenje')),
    ...(who === 'stolar' && { montaza: sum(n => n.startsWith('Montaža')) }),
  };
  return { demo: true, currency: 'RSD', money: 'para (1 RSD = 100 para), before margin and VAT unless named', ...looks(f, t), who, groups, margin: q.margin, net: q.net, vat: q.vat, total: q.total, sections: q.sections, unpriced: q.unpriced };
}

