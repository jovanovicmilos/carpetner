// 3D view (design/screens/Pogled3D.html): isometric scene drawn as SVG from the same project data as the plan and cut list.
// Projection as the design: 0.14 px/mm, x (wall A) → down-right, y (into the room) → down-left, z up; inner corner A/B at (430, 150).
// shortcut: fixed isometric camera (no orbit, front/top presets) until the R3F scene (MVP step 6); "Snimak PNG" saves this SVG as PNG.
import {
  elementBox, layerOf, sideOf, wallGeoms, wallPoint, PRESETS,
  type Element, type Point, type Project, type WallGeom,
} from 'engine';
import { useRef, useState } from 'react';
import { Navigate } from 'react-router';
import { frontLayout } from './fronts';
import { Header } from './Header';
import { Tip } from './help';
import { INSTALLATION_MARK } from './labels';
import { SegmentedControl } from './ui';
import { useProject } from './store';

const INK = '#1C1B19';
const UNDER_WORKTOP = new Set<Element['kind']>(['base', 'sink', 'drawer', 'oven', 'corner-blind', 'appliance-front', 'filler']);
type P3 = [number, number, number];
type Layers = { walls: boolean; carcass: boolean; fronts: boolean; tops: boolean; dims: boolean };

export function Scene3D() {
  const project = useProject(s => s.project);
  const [solid, setSolid] = useState(true);
  const [inst, setInst] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layers>({ walls: true, carcass: true, fronts: true, tops: true, dims: true });
  const svgRef = useRef<SVGSVGElement>(null);
  if (!project) return <Navigate to="/" replace />;

  const savePng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const vb = svg.viewBox.baseVal, scale = 2;
    const img = new Image();
    img.onload = () => {
      const c = Object.assign(document.createElement('canvas'), { width: vb.width * scale, height: vb.height * scale });
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#E9E6DF'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      Object.assign(document.createElement('a'), { href: c.toDataURL('image/png'), download: '3d-prikaz.png' }).click();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  };
  const mats = project.elements[0]?.materials;
  const matName = (id?: string) => (id ? project.materials[id]?.name ?? id : '—');
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];

  return (
    <div className="app app-fixed">
      <Header units />
      <div className="s3-body">
        <main className="s3-main">
          <div className="s3-bar">
            <h1>3D prikaz<Tip k="scene.title" align="right" /></h1>
            <SegmentedControl label="Način prikaza" className="s3-group" itemClass="s3-btn" value={solid ? 's' : 'c'} onChange={v => setSolid(v === 's')}
              options={[['s', 'Puno'], ['c', 'Providno']] as const} />
            <button type="button" className="s3-btn" aria-pressed={inst} onClick={() => setInst(!inst)}>Instalacije</button>
            <Tip k="scene.modes" />
            <div className="s3-views">
              <button type="button" className="s3-btn" aria-disabled="true" title="Uskoro">Pogled spreda</button>
              <button type="button" className="s3-btn" aria-disabled="true" title="Uskoro">Odozgo</button>
              <button type="button" className="s3-btn" aria-disabled="true" title="Uskoro">Izometrija</button>
              <button type="button" className="s3-btn" onClick={savePng}>Snimak PNG</button>
            </div>
          </div>
          <div className="s3-stage" onClick={() => setSel(null)}>
            <Iso ref={svgRef} project={project} solid={solid} inst={inst} sel={sel} onSel={setSel} layers={layers} worktopThickness={dims.worktopThickness} />
            <div className="s3-hint">Levi klik + povlačenje: rotacija · Desni: pomeranje · Točkić: zum<br />Dvoklik na element: otvara parametre</div>
          </div>
        </main>
        <aside aria-label="Slojevi i materijali" className="s3-side">
          <h2>Slojevi<Tip k="scene.layers" align="left" /></h2>
          <div className="s3-layers">
            {([['walls', 'Zidovi i otvori'], ['carcass', 'Korpusi'], ['fronts', 'Fronte'], ['tops', 'Radne ploče'], ['dims', 'Kote']] as const).map(([k, t]) => (
              <label key={k}><input type="checkbox" checked={layers[k]} onChange={e => setLayers({ ...layers, [k]: e.target.checked })} />{t}</label>
            ))}
          </div>
          <h2>Materijali na sceni<Tip k="scene.materials" align="left" /></h2>
          <div className="s3-mats">
            {/* shortcut: the worktop has no material in the data model yet ("hrast dekor" as in the design). */}
            {([['#F4F4F2', 'Korpus', matName(mats?.carcass)], ['#BFC3C7', 'Fronte', matName(mats?.front)], ['#B79C76', 'Radna ploča', `${dims.worktopThickness} mm · hrast dekor`]] as const).map(([c, t, n]) => (
              <div key={t}><span style={{ background: c }} /><div><div>{t}</div><div className="n">{n}</div></div></div>
            ))}
          </div>
          <div className="s3-note">Scena se generiše iz istih podataka kao krojna lista — svaka promena mere u 2D odmah menja 3D i spisak delova.</div>
        </aside>
      </div>
    </div>
  );
}

function Iso({ ref, project, solid, inst, sel, onSel, layers, worktopThickness }: {
  ref: React.Ref<SVGSVGElement>; project: Project; solid: boolean; inst: boolean; sel: string | null; onSel: (id: string | null) => void;
  layers: Layers; worktopThickness: number;
}) {
  const room = project.room, geoms = wallGeoms(room), H = room.height;
  const s = 0.14, c30 = s * Math.cos(Math.PI / 6), s30 = s * 0.5;
  const P = ([x, y, z]: P3) => `${(430 + c30 * (x - y)).toFixed(1)},${(150 + s30 * (x + y) - s * z).toFixed(1)}`;
  const poly = (pts: P3[]) => pts.map(P).join(' ');
  const xs = room.walls.flatMap(w => [w.a?.x ?? 0, w.b?.x ?? 0]), ys = room.walls.flatMap(w => [w.a?.y ?? 0, w.b?.y ?? 0]);
  const W = Math.max(...xs) - 60, D = Math.max(...ys) - 60; // inner extent (shortcut: 120 mm walls, corner A/B at 0,0)

  // Room: wall A (y = 0), wall B (x = 0), floor; windows on A and B.
  const roomEls = layers.walls && <>
    <polygon points={poly([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]])} fill="#F6F3EE" stroke="#BDB5A6" />
    <polygon points={poly([[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]])} fill="#ECE8E0" stroke="#BDB5A6" />
    <polygon points={poly([[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]])} fill="#D9D2C4" stroke="#BDB5A6" />
    {room.openings.filter(o => o.kind === 'window').map(o => {
      const g = geoms[o.wallId];
      if (!g) return null;
      const a = wallPoint(g, o.offset, g.th / 2, sideOf(geoms, o)), b = wallPoint(g, o.offset + o.width, g.th / 2, sideOf(geoms, o));
      const m = wallPoint(g, o.offset + o.width / 2, g.th / 2, sideOf(geoms, o));
      return <g key={o.id}>
        <polygon points={poly([[a.x, a.y, o.sill], [b.x, b.y, o.sill], [b.x, b.y, o.sill + o.height], [a.x, a.y, o.sill + o.height]])} fill="#CFDCEF" stroke="#8A97AA" />
        <polyline points={poly([[m.x, m.y, o.sill], [m.x, m.y, o.sill + o.height]])} stroke="#8A97AA" />
      </g>;
    })}
  </>;

  // Elements: lower first, then tall, then wall units; nearer (larger x + y) later.
  const els = project.elements.map(e => ({ e, box: elementBox(geoms, e), g: geoms[e.wallId] })).filter(x => x.box && x.g) as { e: Element; box: NonNullable<ReturnType<typeof elementBox>>; g: WallGeom }[];
  const rank = (e: Element) => (layerOf(e) === 'low' ? 0 : layerOf(e) === 'tall' ? 2 : 3);
  els.sort((a, b) => rank(a.e) - rank(b.e) || (a.box.x0 + a.box.y0 + a.box.x1 + a.box.y1) - (b.box.x0 + b.box.y0 + b.box.x1 + b.box.y1));
  const bottom = (e: Element) => (e.kind === 'wall' ? e.elevation ?? 0 : e.legs ?? els.find(x => x.e.wallId === e.wallId && x.e.legs)?.e.legs ?? 0);

  const faces = (part: 'low' | 'high') => els.filter(({ e }) => (part === 'low' ? rank(e) === 0 : rank(e) > 0)).map(({ e, g }) => {
    const sd = sideOf(geoms, e), face = g.th / 2;
    const at = (along: number, out: number): Point => wallPoint(g, e.offset + along, face + out, sd);
    const z0 = bottom(e), z1 = z0 + e.height;
    const p0 = at(0, e.depth), p1 = at(e.width, e.depth);
    const front: P3[] = [[p0.x, p0.y, z0], [p1.x, p1.y, z0], [p1.x, p1.y, z1], [p0.x, p0.y, z1]];
    const facingB = Math.abs(g.ux) < Math.abs(g.uy);
    // Visible end: the one towards the viewer (+x / +y), unless a neighbour of the same layer touches it.
    const endAtStart = g.ux + g.uy < 0;
    const endAlong = endAtStart ? 0 : e.width;
    const touching = project.elements.some(o => o !== e && o.wallId === e.wallId && layerOf(o) === layerOf(e)
      && (endAtStart ? o.offset + o.width === e.offset : o.offset === e.offset + e.width));
    const q0 = at(endAlong, 0), q1 = at(endAlong, e.depth);
    const side: P3[] = [[q0.x, q0.y, z0], [q1.x, q1.y, z0], [q1.x, q1.y, z1], [q0.x, q0.y, z1]];
    const t0 = at(0, 0), t1 = at(e.width, 0);
    const top: P3[] = [[t0.x, t0.y, z1], [t1.x, t1.y, z1], [p1.x, p1.y, z1], [p0.x, p0.y, z1]];
    const isSel = sel === e.id;
    // Fronts as outlines on the front face (front view: x from the wall start).
    const { fronts } = frontLayout(e, project.rules);
    const fp = (fx: number, fy: number): P3 => { const p = at(fx, e.depth); return [p.x, p.y, z1 - fy]; };
    return (
      <g key={e.id} className="s3-el" onClick={ev => { ev.stopPropagation(); onSel(e.id); }}>
        {layers.carcass && !touching && <polygon points={poly(side)} fill="#A9AEB3" stroke={INK} strokeWidth="0.8" />}
        {layers.carcass && !UNDER_WORKTOP.has(e.kind) && <polygon points={poly(top)} fill="#D3D6D9" stroke={INK} strokeWidth="0.8" />}
        {layers.fronts && <polygon points={poly(front)} fill={facingB ? '#B3B8BD' : '#BFC3C7'} stroke={INK} strokeWidth="0.8" />}
        {layers.fronts && fronts.map((f, i) => (
          <polygon key={i} points={poly([fp(f.x, f.y + f.h), fp(f.x + f.w, f.y + f.h), fp(f.x + f.w, f.y), fp(f.x, f.y)])}
            fill={isSel ? '#E9B394' : 'none'} stroke={isSel ? '#B4440E' : INK} strokeWidth={isSel ? 2 : 0.8} />
        ))}
      </g>
    );
  });

  // Plinths (recessed 50 mm) under lower runs.
  const plinths = els.filter(({ e }) => UNDER_WORKTOP.has(e.kind) || e.kind === 'tall').map(({ e, g }) => {
    const sd = sideOf(geoms, e), a = wallPoint(g, e.offset, g.th / 2 + e.depth - 50, sd), b = wallPoint(g, e.offset + e.width, g.th / 2 + e.depth - 50, sd);
    return <polygon key={`pl-${e.id}`} points={poly([[a.x, a.y, 0], [b.x, b.y, 0], [b.x, b.y, bottom(e)], [a.x, a.y, bottom(e)]])} fill="#5F5A52" />;
  });

  // Worktops: one slab per contiguous run of base units on a wall, 600 deep, with front edge and visible end.
  const slabs: React.ReactNode[] = [];
  for (const g of Object.values(geoms)) {
    const run = project.elements.filter(e => e.wallId === g.wall.id && UNDER_WORKTOP.has(e.kind)).sort((a, b) => a.offset - b.offset);
    if (!run.length) continue;
    const sd = sideOf(geoms, run[0]), from = run[0].offset, to = Math.max(...run.map(e => e.offset + e.width));
    const zTop = Math.max(...run.map(e => bottom(e) + e.height)) + worktopThickness, zb = zTop - worktopThickness;
    const at = (along: number, out: number) => wallPoint(g, along, g.th / 2 + out, sd);
    const [a0, a1, f0, f1] = [at(from, 0), at(to, 0), at(from, 600), at(to, 600)];
    slabs.push(<polygon key={`wt-${g.wall.id}`} points={poly([[a0.x, a0.y, zTop], [a1.x, a1.y, zTop], [f1.x, f1.y, zTop], [f0.x, f0.y, zTop]])} fill="#B79C76" stroke={INK} strokeWidth="0.8" />);
    const facingB = Math.abs(g.ux) < Math.abs(g.uy);
    slabs.push(<polygon key={`we-${g.wall.id}`} points={poly([[f0.x, f0.y, zb], [f1.x, f1.y, zb], [f1.x, f1.y, zTop], [f0.x, f0.y, zTop]])} fill={facingB ? '#7A6548' : '#8A7354'} stroke={INK} strokeWidth="0.6" />);
    const endAtStart = g.ux + g.uy < 0, e0 = at(endAtStart ? from : to, 0), e1 = at(endAtStart ? from : to, 600);
    slabs.push(<polygon key={`wx-${g.wall.id}`} points={poly([[e0.x, e0.y, zb], [e1.x, e1.y, zb], [e1.x, e1.y, zTop], [e0.x, e0.y, zTop]])} fill="#7A6548" stroke={INK} strokeWidth="0.6" />);
    // Sink bowl and hob on the slab (shortcut: typical sizes, centred on their units).
    for (const e of run.filter(x => x.kind === 'sink' || x.kind === 'oven')) {
      const sink = e.kind === 'sink', mid = e.offset + e.width / 2, half = sink ? 250 : 240;
      const [b0, b1] = sink ? [100, 480] : [60, 500];
      const pts = [at(mid - half, b0), at(mid + half, b0), at(mid + half, b1), at(mid - half, b1)];
      slabs.push(<polygon key={`ap-${e.id}`} points={poly(pts.map(p => [p.x, p.y, zTop] as P3))} fill={sink ? '#DADDE0' : '#2A2A2A'} stroke={INK} strokeWidth="0.8" />);
    }
  }

  const instMarks = room.installations.map(i => {
    const g = geoms[i.wallId];
    if (!g) return null;
    const p = wallPoint(g, i.offset, g.th / 2, sideOf(geoms, i));
    const [x, y] = P([p.x, p.y, i.height]).split(',').map(Number);
    const [letter, bg, fg] = INSTALLATION_MARK[i.kind];
    const pipe = fg === '#FFFFFF';
    return <g key={i.id}><circle cx={x} cy={y} r="9" fill={bg} stroke={pipe ? '#FFFFFF' : INK} strokeWidth={pipe ? 1.5 : 1} /><text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={fg}>{letter}</text></g>;
  });

  const selected = els.find(x => x.e.id === sel);
  const tag = selected && (() => {
    const { e, g } = selected;
    const p = wallPoint(g, e.offset + e.width / 2, g.th / 2 + e.depth, sideOf(geoms, e));
    const [x, y] = P([p.x, p.y, bottom(e) + e.height / 3]).split(',').map(Number);
    const text = `${e.label} · ${e.width}×${e.height}×${e.depth}`;
    const w = text.length * 7.3 + 14;
    return <g pointerEvents="none"><line x1={x + 30} y1={y + 40} x2={x} y2={y} stroke={INK} /><rect x={x + 30} y={y + 40} width={w} height="26" rx="4" fill={INK} /><text x={x + 30 + w / 2} y={y + 57} textAnchor="middle" fontSize="12" fill="#FFFFFF">{text}</text></g>;
  })();

  return (
    <svg ref={ref} viewBox="110 -240 740 800" role="img" xmlns="http://www.w3.org/2000/svg" className="s3-svg"
      aria-label={`Izometrijski 3D prikaz: ${project.elements.map(e => e.label).join(', ')}`}>
      {roomEls}
      <g fillOpacity={solid ? 1 : 0.35}>
        {layers.carcass && plinths}
        {faces('low')}
        {layers.tops && slabs}
        {faces('high')}
      </g>
      <g opacity={inst ? 1 : 0}>{instMarks}</g>
      {tag}
    </svg>
  );
}
