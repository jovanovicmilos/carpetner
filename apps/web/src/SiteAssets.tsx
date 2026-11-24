// Dev only (/dev/site-assets): pictures and data for the public site, made by the real engine, 3D scene and drawings
// (design/BRIEF_SITE_ASSETS.md). `?list=1` puts the asset names in window.__list, `?a=<name>` renders that one asset and puts
// { type, data?, meta } in window.__asset. apps/web/scripts/site-assets.mjs walks the list and writes design/assets/site/.
import { generateParts, type Project } from 'engine';
import { useEffect, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { CarcassDrawing } from './ElementPage';
import { SheetLayout } from './CutList';
import { FrontView, Sheet, TopView, WorktopView } from './Drawings';
import { realPalette } from './look';
import { fitView, Plan } from './Plan';
import { SceneGL } from './SceneGL';
import { CONTENT, dress, FRONT, kitchen, looks, nesting, partRows, price, SHAPES, shapeProject, TOP, unitCutout, unitProject, WIDTHS, type Content, type Front, type ShapeName, type Top } from './siteKitchen';

declare global { interface Window { __list?: string[]; __asset?: Asset } }
type Asset = { type: 'png' | 'svg' | 'json' | 'shot'; data?: string; meta: Record<string, unknown> };

const SIZE = { w: 1600, h: 1100 }, HERO = { w: 2400, h: 1500 };
const ALL = { walls: true, carcass: true, fronts: true, tops: true }, UNIT = { walls: false, carcass: true, fronts: true, tops: false };
const SHOW = { num: true, dim: true, open: true, inst: true };

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
  // Night (brief addendum 2026-11-24): the app's "Veče" look — dark room, LED strips under the wall units; same camera.
  const night = (p: Project): Project => ({ ...p, look: { ...p.look, light: 'night' } });
  for (const f of Object.keys(FRONT) as Front[]) for (const t of Object.keys(TOP) as Top[])
    out[`3d-night-${f}-${t}.png`] = () => ({ kind: '3d', project: night(dress(kitchen(), f, t)), real: true, size: SIZE, meta: { ...looks(f, t), light: 'night', background: '#2B2A30' } });
  out['3d-night-hero.png'] = () => ({ kind: '3d', project: night(dress(kitchen(), 'hrast', 'hrast')), real: true, size: HERO, meta: { ...looks('hrast', 'hrast'), light: 'night', background: '#2B2A30' } });
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
      const p = unitProject(w, c), el = p.elements[0];
      return { kind: 'svg', node: <CarcassDrawing el={el} rules={p.rules} parts={generateParts(p)} cutout={unitCutout(p)} />, meta: { kind: el.kind, width: w } };
    };
    out[`parts-${w / 10}-${c}.json`] = () => ({ kind: 'json', data: partRows(unitProject(w, c)) });
  }
  // Exploded unit for every width × content of the site's section 04 (user 2026-11-24: the unit you picked, pulled apart).
  for (const w of WIDTHS) for (const c of Object.keys(CONTENT) as Content[])
    out[`element-${w / 10}-${c}-3d.png`] = () => ({ kind: '3d', project: dress(unitProject(w, c), 'hrast', 'hrast'), real: true, size: SIZE, layers: UNIT, explode: 40, meta: { ...looks('hrast', 'hrast'), explodeMm: 40, width: w } });
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
          <SceneGL project={spec.project} cam={spec.cam ?? 'iso'} solid sel={null} onSel={() => {}} layers={spec.layers ?? ALL} real={spec.real ? realPalette(spec.project) : undefined} night={spec.real && spec.project.look?.light === 'night'} noOpen
            explode={spec.explode} still={{ bg: spec.project.look?.light === 'night' ? '#2B2A30' : null, // night: the app's dark background, or the window glass shows the page through
             far: spec.far ?? (spec.explode ? 1.6 : 1), onCamera: c => { cam.current = c; } }} />
        </div>
      ) : spec.kind !== 'json' && spec.node}
    </div>
  );
}
