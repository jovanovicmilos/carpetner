// Dev only (/dev/site-assets): pictures and data for the public site, made by the real engine, 3D scene and drawings
// (design/BRIEF_SITE_ASSETS.md). `?list=1` puts the asset names in window.__list, `?a=<name>` renders that one asset and puts
// { type, data?, meta } in window.__asset. apps/web/scripts/site-assets.mjs walks the list and writes design/assets/site/.
import {
  autoLayout, backCutout, cutSheets, DEFAULT_ELEMENT_MATERIALS, DEFAULT_QUOTE, DEFAULT_MATERIALS, DEFAULT_RULES, edgeCode, EXAMPLE_PRICES, fromDataModel, generateParts,
  makeElement, mergeParts, PRESETS, quickStartRoom, quote, type DataModelProject, type ElementKind, type Project, type QuickStartInput, type Shape,
} from 'engine';
import { useEffect, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import fixture from '../../../fixtures/kuhinja-petrovic.json';
import demo from '../../../fixtures/cenovnik-demo.json';
import { CarcassDrawing } from './ElementPage';
import { SheetLayout } from './CutList';
import { FrontView, Sheet, TopView, WorktopView } from './Drawings';
import { FRONTS, realPalette, withFrontMaterial } from './look';
import { fitView, Plan } from './Plan';
import { SceneGL } from './SceneGL';
import { useWorkshop } from './workshop';

declare global { interface Window { __list?: string[]; __asset?: Asset } }
type Asset = { type: 'png' | 'svg' | 'json' | 'shot'; data?: string; meta: Record<string, unknown> };

// Site names → app looks. Fronts = the 3D view's own palette (look.ts FRONTS): our materials, no maker image on the public site.
// U: autoLayout needs wall A ≥ 3400 for U, so the site's U is 340 × 240 × 240 (the brief asked 320).
// The catalog has no dark green decor: "zelena" is the palette's olive U633, the closest green.
const FRONT = { bela: 0, hrast: 4, zelena: 2, orah: 5 } as const;
const TOP = { hrast: 'Hrast', beton: 'Beton', crna: 'Crni granit' } as const; // worktop looks with bundled CC0 textures
type Front = keyof typeof FRONT; type Top = keyof typeof TOP;
const CONTENT = { krilo: 'base', fioke: 'drawer', sudopera: 'sink' } as const satisfies Record<string, ElementKind>;
type Content = keyof typeof CONTENT;
const WIDTHS = [400, 500, 600, 800];
const SHAPES = { 'prava-320': 'I', 'L-320x240': 'L', 'U-340x240x240': 'U' } as const satisfies Record<string, Shape>;
type ShapeName = keyof typeof SHAPES;
const SIZE = { w: 1600, h: 1100 }, HERO = { w: 2400, h: 1500 };
const ALL = { walls: true, carcass: true, fronts: true, tops: true }, UNIT = { walls: false, carcass: true, fronts: true, tops: false };
const SHOW = { num: true, dim: true, open: true, inst: true };

const kitchen = (): Project => fromDataModel(fixture.project as unknown as DataModelProject);

/** I and U from the quick start's auto layout with the quick start's defaults; L = the shared fixture. */
function shapeProject(s: ShapeName): Project {
  if (SHAPES[s] === 'L') return kitchen();
  const input: QuickStartInput = {
    shape: SHAPES[s], a: SHAPES[s] === 'U' ? 3400 : 3200, b: 2400, c: 2400, water: 1500, power400: 900, window: { offset: 1100, width: 1000 },
    dishwasher: true, fridge: true, wallUnits: true, oven: 'under',
  };
  const layout = autoLayout(input, PRESETS.workshop, DEFAULT_ELEMENT_MATERIALS);
  if (layout.error) throw new Error(`${s}: ${layout.error}`);
  return {
    id: `site-${s}`, name: `Kuhinja ${s}`, unit: 'mm', presetId: 'workshop', room: { ...quickStartRoom(input), height: 2600 }, elements: layout.elements,
    rules: DEFAULT_RULES, materials: DEFAULT_MATERIALS, opening: { kind: useWorkshop.getState().opening },
  };
}
const dress = (p: Project, f: Front, t: Top): Project => ({ ...withFrontMaterial(p, FRONTS[FRONT[f]][2]), look: { ...p.look, worktop: TOP[t] } });
const looks = (f: Front, t: Top) => ({ front: FRONTS[FRONT[f]][0], frontMaterial: FRONTS[FRONT[f]][2].id, top: TOP[t], topLook: `wt:${TOP[t]}` });

/** One unit alone on wall A of the fixture room (the sink over the water pipes, so its back cutout shows). */
function unitProject(w: number, c: Content): Project {
  const p = kitchen(), sinkAt = p.elements.find(e => e.kind === 'sink')?.offset ?? 0;
  const el = { ...makeElement(CONTENT[c], 'A', c === 'sudopera' ? sinkAt : 0, w, 'D1', PRESETS.workshop, p.elements[0].materials), label: 'D1' };
  return { ...p, room: { ...p.room, openings: [] }, elements: [el] };
}

const partRows = (p: Project) => mergeParts(generateParts(p)).map(x => ({
  name: x.name, qty: x.qty, length: x.length, width: x.width, edges: x.edges, edgeCode: edgeCode(x.edges, p.rules),
  material: p.materials[x.materialId]?.name ?? x.materialId, positions: x.positions,
}));

/** Every cutting sheet of the whole kitchen, material by material (the cut list's optimizer). */
function nesting() {
  const p = kitchen(), parts = generateParts(p);
  return [...new Set(parts.map(x => x.materialId))].flatMap(id => {
    const m = p.materials[id];
    if (!m?.sheet) return [];
    const r = cutSheets(parts.filter(x => x.materialId === id), m.sheet, { rotate: !(p.rules.followGrain && m.grain) });
    return r.sheets.map((s, i) => ({ material: m.name, size: m.sheet!, sheet: s, of: [i + 1, r.sheets.length], tooBig: r.tooBig }));
  });
}

function price(f: Front, t: Top, who: 'stolar' | 'sam') {
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

type Spec = { kind: '3d'; project: Project; real: boolean; size: { w: number; h: number }; layers?: typeof ALL; explode?: number; cam?: 'iso' | 'front'; far?: number; meta: Record<string, unknown> }
  | { kind: 'svg' | 'shot'; node: ReactNode; meta?: Record<string, unknown> } | { kind: 'json'; data: unknown; meta?: Record<string, unknown> };

function specs(): Record<string, () => Spec> {
  const out: Record<string, () => Spec> = {};
  for (const f of Object.keys(FRONT) as Front[]) for (const t of Object.keys(TOP) as Top[]) {
    out[`3d-real-${f}-${t}.png`] = () => ({ kind: '3d', project: dress(kitchen(), f, t), real: true, size: SIZE, meta: looks(f, t) });
    for (const who of ['stolar', 'sam'] as const) out[`price-${f}-${t}-${who}.json`] = () => ({ kind: 'json', data: price(f, t, who) });
  }
  out['3d-teh.png'] = () => ({ kind: '3d', project: kitchen(), real: false, size: SIZE, meta: { mode: 'Tehnički' } });
  out['3d-hero.png'] = () => ({ kind: '3d', project: dress(kitchen(), 'hrast', 'hrast'), real: true, size: HERO, meta: looks('hrast', 'hrast') });
  for (const s of Object.keys(SHAPES) as ShapeName[]) {
    out[`3d-real-shape-${s}.png`] = () => ({ kind: '3d', project: dress(shapeProject(s), 'hrast', 'hrast'), real: true, size: SIZE,
      // U: the corner view sees the backs of wall C, so the app's front preset; I: long and thin, camera further back.
      cam: SHAPES[s] === 'U' ? 'front' : 'iso', far: SHAPES[s] === 'I' ? 1.3 : 1, meta: { ...looks('hrast', 'hrast'), shape: SHAPES[s], source: SHAPES[s] === 'L' ? 'fixture' : 'autoLayout' } });
    out[`plan-${s}.svg`] = () => { const p = shapeProject(s); return { kind: 'svg', node: <Plan project={p} view={fitView(p, 450)} style={{ width: 1000 }} />, meta: { shape: SHAPES[s] } }; };
  }
  const k = kitchen();
  out['nacrt-zid-A.svg'] = () => ({ kind: 'svg', node: <FrontView project={k} wallId="A" show={SHOW} /> });
  out['nacrt-zid-B.svg'] = () => ({ kind: 'svg', node: <FrontView project={k} wallId="B" show={SHOW} /> });
  out['nacrt-odozgo.svg'] = () => ({ kind: 'svg', node: <TopView project={k} show={SHOW} /> });
  out['nacrt-radne-ploce.svg'] = () => ({ kind: 'svg', node: <WorktopView project={k} show={SHOW} /> });
  // As printed (Štampaj → A3 landscape, 10 mm margins): 400 mm wide sheet; the script shoots it 2480 px wide.
  out['nacrt-list-A3.png'] = () => ({ kind: 'shot', node: <div style={{ width: '400mm' }}><Sheet project={k} view="front" wallId="A" show={SHOW} style="combo" paper="A3" no={[1, 4]} /></div>, meta: { width: 2480, sheet: 'Spreda — zid A, list 1 / 4' } });
  for (const w of WIDTHS) for (const c of Object.keys(CONTENT) as Content[]) {
    out[`element-${w / 10}-${c}.svg`] = () => {
      const p = unitProject(w, c), el = p.elements[0], bc = backCutout(p, el);
      return { kind: 'svg', node: <CarcassDrawing el={el} rules={p.rules} parts={generateParts(p)} cutout={bc ? { label: `${bc.w}×${bc.h}`, mid: bc.cy, h: bc.h } : null} />, meta: { kind: el.kind, width: w } };
    };
    out[`parts-${w / 10}-${c}.json`] = () => ({ kind: 'json', data: partRows(unitProject(w, c)) });
  }
  for (const c of Object.keys(CONTENT) as Content[])
    out[`element-60-${c}-3d.png`] = () => ({ kind: '3d', project: dress(unitProject(600, c), 'hrast', 'hrast'), real: true, size: SIZE, layers: UNIT, explode: 40, meta: { ...looks('hrast', 'hrast'), explodeMm: 40 } });
  out['parts-kitchen.json'] = () => ({ kind: 'json', data: partRows(k) });
  nesting().forEach((n, i) => {
    out[`nesting-${i + 1}.svg`] = () => ({ kind: 'svg', node: <div style={{ width: 900 }}><SheetLayout size={n.size} sheet={n.sheet} /></div>, meta: { material: n.material, sheet: n.size, of: n.of, utilization: n.sheet.utilization, remnants: n.sheet.remnants, tooBig: n.tooBig } });
  });
  return out;
}

/** Serialized SVG that stands alone: the text styles that come from CSS classes are inlined, classes dropped, size from the screen. */
function svgFile(svg: SVGSVGElement) {
  const copy = svg.cloneNode(true) as SVGSVGElement, src = [svg, ...svg.querySelectorAll('*')], dst = [copy, ...copy.querySelectorAll('*')];
  src.forEach((el, i) => {
    const d = dst[i] as SVGElement, cs = getComputedStyle(el);
    if (el === svg || el.tagName === 'text' || el.tagName === 'tspan')
      for (const k of ['font-family', 'font-weight', 'text-anchor', 'dominant-baseline']) d.style.setProperty(k, cs.getPropertyValue(k));
    d.removeAttribute('class');
  });
  const r = svg.getBoundingClientRect();
  copy.setAttribute('width', String(Math.round(r.width))); copy.setAttribute('height', String(Math.round(r.height)));
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(copy);
}

export default function SiteAssets() {
  const [params] = useSearchParams();
  const all = specs(), name = params.get('a'), spec = name ? all[name]?.() : undefined;
  const box = useRef<HTMLDivElement>(null), cam = useRef<Record<string, unknown>>({});
  useEffect(() => {
    if (params.get('list')) window.__list = Object.keys(all);
    if (!spec) return;
    const meta = spec.meta ?? {};
    if (spec.kind === 'json') { window.__asset = { type: 'json', data: JSON.stringify(spec.data, null, 2) + '\n', meta }; return; }
    if (spec.kind === 'svg') { window.__asset = { type: 'svg', data: svgFile(box.current!.querySelector('svg')!), meta }; return; }
    if (spec.kind === 'shot') { document.fonts.ready.then(() => { window.__asset = { type: 'shot', meta }; }); return; }
    // 3D: textures load asynchronously; the scene is static, so wait, then take the canvas.
    const t = setTimeout(() => {
      const c = box.current!.querySelector('canvas')!;
      window.__asset = { type: 'png', data: c.toDataURL('image/png'), meta: { ...meta, mode: spec.kind === '3d' && spec.real ? 'Realni' : 'Tehnički', view: spec.kind === '3d' ? spec.cam ?? 'iso' : undefined, size: [c.width, c.height], camera: cam.current } };
    }, 4000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one asset per page load
  if (!spec) return <pre>{name ? `Nepoznato: ${name}` : Object.keys(all).join('\n')}</pre>;
  return (
    <div ref={box} id="shot" className="inline-block bg-white">
      {spec.kind === '3d' ? (
        <div style={{ position: 'relative', width: spec.size.w, height: spec.size.h }}>
          <SceneGL project={spec.project} cam={spec.cam ?? 'iso'} solid sel={null} onSel={() => {}} layers={spec.layers ?? ALL} real={spec.real ? realPalette(spec.project) : undefined} noOpen
            explode={spec.explode} still={{ bg: null, far: spec.far ?? (spec.explode ? 1.6 : 1), onCamera: c => { cam.current = c; } }} />
        </div>
      ) : spec.kind !== 'json' && spec.node}
    </div>
  );
}
