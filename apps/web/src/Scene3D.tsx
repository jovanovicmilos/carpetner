// 3D view (design/screens/Pogled3D.html): isometric scene drawn as SVG from the same project data as the plan and cut list.
// Projection as the design: 0.14 px/mm, x (wall A) → down-right, y (into the room) → down-left, z up; inner corner A/B at (430, 150).
// Camera presets switch the stage to the orbit R3F scene (SceneGL); "Snimak PNG" saves the shown view as PNG.
import {
  elementBox, layerOf, openingOf, sideOf, wallGeoms, wallPoint, PRESETS,
  type Element, type OpeningKind, type Point, type Project, type WallGeom,
} from 'engine';
import { lazy, Suspense, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { frontLayout } from './fronts';
import { Header } from './Header';
import { Tip } from './help';
import { INSTALLATION_MARK, ownName } from './labels';
import { APPS, FLOORS, FRONTS, glColors, HANDLE_COLORS, realPalette, TECH, WALLS, withFront, WTOPS, type Palette } from './look';
import { useOfferImage } from './offerImage';
import { SegmentedControl, sx } from './ui';
import { useProject } from './store';
import type { Cam } from './SceneGL';

const SceneGL = lazy(() => import('./SceneGL').then(m => ({ default: m.SceneGL })));

const INK = '#1C1B19';
const UNDER_WORKTOP = new Set<Element['kind']>(['base', 'sink', 'drawer', 'oven', 'corner-blind', 'appliance-front', 'filler']);
type P3 = [number, number, number];
type Layers = { walls: boolean; carcass: boolean; fronts: boolean; tops: boolean; dims: boolean };

type Shot = { cam: 'cur' | 'front' | 'corner'; q: 'std' | 'hi'; size: 'fhd' | 'big'; toOffer: boolean };
const segSt = (on: boolean) => 'font: inherit; font-size: 13px; min-height: 34px; padding: 0 14px; border: 0; border-radius: 6px; cursor: pointer; ' + (on ? 'background: #FFFFFF; color: #1C1B19; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.12)' : 'background: transparent; color: #5F5A52');
const chipSt = (on: boolean) => 'font: inherit; font-size: 12.5px; padding: 6px 10px; min-height: 34px; border-radius: 6px; cursor: pointer; ' + (on ? 'border: 1px solid #B4440E; background: #FBE3D3; color: #7C2D0A; font-weight: 600' : 'border: 1px solid #DDD8CE; background: #FFFFFF; color: #1C1B19');
const swatchSt = (bg: string, on: boolean) => `width: 38px; height: 38px; border-radius: 8px; cursor: pointer; background: ${bg}; border: ${on ? '3px solid #B4440E' : '1px solid #BDB6AA'}; box-shadow: ${on ? '0 0 0 2px #FFFFFF inset' : 'none'}`;
const OPENS: [OpeningKind, string][] = [['bar', 'Šipka'], ['knob', 'Dugme'], ['profile', 'Profil na vrhu'], ['push', 'Na pritisak']];

/** SVG element → PNG data URL at `w` × `h`, the drawing centred on the scene background. */
async function svgPng(svg: SVGSVGElement, w: number, h: number, night: boolean): Promise<string> {
  const vb = svg.viewBox.baseVal, img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  await img.decode();
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), ctx = c.getContext('2d')!;
  ctx.fillStyle = '#E9E6DF'; ctx.fillRect(0, 0, w, h);
  const k = Math.min(w / vb.width, h / vb.height);
  if (night) ctx.filter = 'brightness(0.72) saturate(0.9)';
  ctx.drawImage(img, (w - vb.width * k) / 2, (h - vb.height * k) / 2, vb.width * k, vb.height * k);
  return c.toDataURL('image/png');
}

export function Scene3D() {
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const putImage = useOfferImage(s => s.put);
  const [real, setReal] = useState(true);
  const [solid, setSolid] = useState(true);
  const [inst, setInst] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layers>({ walls: true, carcass: true, fronts: true, tops: true, dims: true });
  const [cam, setCam] = useState<Cam | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [shotState, setShotState] = useState<'' | 'busy' | 'done' | 'error'>('');
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  if (!project) return <Navigate to="/" replace />;

  const pal = real ? realPalette(project) : TECH;
  const night = real && pal.night;
  const look = project.look ?? {};
  const setLook = (p: Partial<NonNullable<Project['look']>>) => change(pr => ({ ...pr, look: { ...pr.look, ...p } }));
  const download = (href: string, name = '3d-prikaz.png') => Object.assign(document.createElement('a'), { href, download: name }).click();
  const savePng = async () => {
    const gl = stageRef.current?.querySelector('canvas');
    if (cam && gl) return download(gl.toDataURL('image/png'));
    const svg = svgRef.current;
    if (svg) download(await svgPng(svg, svg.viewBox.baseVal.width * 2, svg.viewBox.baseVal.height * 2, night));
  };
  // shortcut: "Visoko" is a sharper raster of the same view, not path tracing (docs/3D.md phase 5); Spreda / Iz ugla use the WebGL camera.
  const makeShot = async () => {
    if (!shot) return;
    setShotState('busy');
    try {
      const [w, h] = shot.size === 'big' ? [3000, 2000] : [1920, 1080];
      let png: string;
      if (shot.cam !== 'cur' || cam) {
        if (shot.cam !== 'cur') setCam(shot.cam === 'front' ? 'front' : 'iso');
        await new Promise(r => setTimeout(r, 400)); // let the scene render with the camera
        const gl = stageRef.current?.querySelector('canvas');
        if (!gl) throw new Error('no canvas');
        const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), ctx = c.getContext('2d')!;
        ctx.fillStyle = '#E9E6DF'; ctx.fillRect(0, 0, w, h);
        const k = Math.min(w / gl.width, h / gl.height);
        ctx.drawImage(gl, (w - gl.width * k) / 2, (h - gl.height * k) / 2, gl.width * k, gl.height * k);
        png = c.toDataURL('image/png');
      } else png = await svgPng(svgRef.current!, w, h, night);
      if (shot.toOffer) putImage(project.id, png); else download(png, 'slika-za-ponudu.png');
      setShotState('done');
    } catch { setShotState('error'); }
  };
  const mats = project.elements[0]?.materials;
  const matName = (id?: string) => (id ? project.materials[id]?.name ?? id : '—');
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  const frontIdx = FRONTS.findIndex(f => f[2].id === mats?.front);
  const wt = WTOPS.find(w => w[0] === (look.worktop ?? 'Hrast'))!, app = APPS.find(a => a[0] === (look.applianceFinish ?? 'inox'))!;
  const wall = WALLS.find(w => w[0] === look.wall) ?? WALLS[0], floor = FLOORS.find(f => f[0] === look.floor) ?? FLOORS[0];
  const groups: { title: string; cur: string; opts: { name: string; bg: string; on: boolean; pick: () => void }[] }[] = [
    { title: 'Fronte', cur: matName(mats?.front), opts: FRONTS.map(([n, bg], i) => ({ name: n, bg, on: i === frontIdx, pick: () => change(p => withFront(p, i)) })) },
    { title: 'Radna ploča', cur: wt[2], opts: WTOPS.map(([n, bg]) => ({ name: n, bg, on: n === wt[0], pick: () => setLook({ worktop: n }) })) },
    { title: 'Aparati, sudopera, slavina', cur: `${app[1]} · generički`, opts: APPS.map(([k, n, bg]) => ({ name: n, bg, on: k === app[0], pick: () => setLook({ applianceFinish: k }) })) },
    { title: 'Zid', cur: wall[0], opts: WALLS.map(([n, bg]) => ({ name: n, bg, on: n === wall[0], pick: () => setLook({ wall: n }) })) },
    { title: 'Pod', cur: floor[0], opts: FLOORS.map(([n, bg]) => ({ name: n, bg, on: n === floor[0], pick: () => setLook({ floor: n }) })) },
  ];
  const op = project.opening?.kind;

  return (
    <div className="app app-fixed">
      <Header units />
      <div className="s3-body">
        <main className="s3-main">
          <div className="s3-bar">
            <h1>3D prikaz<Tip k="scene.title" align="right" /></h1>
            <div role="group" aria-label="Vrsta prikaza" style={sx('display: flex; gap: 3px; padding: 3px; background: #F3F1EC; border-radius: 8px')}>
              <button type="button" aria-pressed={!real} onClick={() => setReal(false)} style={sx(segSt(!real))}>Tehnički</button>
              <button type="button" aria-pressed={real} onClick={() => setReal(true)} style={sx(segSt(real))}>Realni</button>
            </div><Tip k="scene.real" />
            {real
              ? <SegmentedControl label="Svetlo" className="s3-group" itemClass="s3-btn" value={look.light ?? 'day'} onChange={v => setLook({ light: v })}
                  options={[['day', 'Dan'], ['night', 'Veče']] as const} />
              : <>
                <SegmentedControl label="Način prikaza" className="s3-group" itemClass="s3-btn" value={solid ? 's' : 'c'} onChange={v => setSolid(v === 's')}
                  options={[['s', 'Puno'], ['c', 'Providno']] as const} />
                <button type="button" className="s3-btn" aria-pressed={inst} onClick={() => setInst(!inst)}>Instalacije</button>
              </>}
            <div className="s3-views">
              {([['front', 'Pogled spreda'], ['top', 'Odozgo'], ['iso', 'Izometrija']] as const).map(([k, t]) => (
                <button key={k} type="button" className="s3-btn" aria-pressed={cam === k} onClick={() => setCam(k)}>{t}</button>
              ))}
              <button type="button" className="s3-btn" onClick={savePng}>Snimak PNG</button>
              <button type="button" onClick={() => { setReal(true); setShot({ cam: 'cur', q: 'std', size: 'fhd', toOffer: true }); setShotState(''); }}
                style={sx('font: inherit; font-size: 13px; font-weight: 600; padding: 8px 14px; min-height: 40px; border-radius: 6px; border: 0; background: #B4440E; color: #FFFFFF; cursor: pointer')}>Slika za ponudu</button>
            </div>
          </div>
          <div className={`s3-stage${night ? ' night' : ''}`} ref={stageRef} onClick={() => !cam && setSel(null)} onPointerDown={() => !cam && setCam('iso')}>
            {cam
              ? <Suspense fallback={null}><SceneGL project={project} cam={cam} solid={real || solid} sel={sel} onSel={setSel} layers={layers} colors={real ? glColors(pal) : undefined} night={night} /></Suspense>
              : <Iso ref={svgRef} project={project} solid={real || solid} inst={!real && inst} sel={real ? null : sel} onSel={setSel} layers={layers} worktopThickness={dims.worktopThickness} pal={pal} />}
            <div className="s3-hint">Levi klik + povlačenje: rotacija · Desni: pomeranje · Točkić: zum<br />Dvoklik na element: otvara parametre</div>
          </div>
        </main>
        {real ? (
          <aside aria-label="Izgled za kupca" className="s3-side">
            <h2 style={sx('display: flex; align-items: center')}>Izgled za kupca<Tip k="scene.look" align="left" /></h2>
            {groups.map(g => (
              <div key={g.title} style={sx('display: flex; flex-direction: column; gap: 8px')}>
                <div style={sx('display: flex; justify-content: space-between; align-items: baseline; gap: 8px')}><span style={sx('font-size: 13px; font-weight: 600')}>{g.title}</span><span style={sx('font-size: 12px; color: #5F5A52; text-align: right')}>{g.cur}</span></div>
                <div style={sx('display: flex; flex-wrap: wrap; gap: 6px')}>
                  {g.opts.map(o => <button key={o.name} type="button" aria-pressed={o.on} aria-label={o.name} title={o.name} onClick={o.pick} style={sx(swatchSt(o.bg, o.on))} />)}
                </div>
              </div>
            ))}
            <div style={sx('display: flex; flex-direction: column; gap: 8px')}>
              <span style={sx('font-size: 13px; font-weight: 600')}>Ručke i otvaranje</span>
              <div role="group" aria-label="Ručke" style={sx('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px')}>
                {OPENS.map(([k, t]) => <button key={k} type="button" aria-pressed={op === k} onClick={() => change(p => ({ ...p, opening: { ...(p.opening ?? {}), kind: k } }))} style={sx(chipSt(op === k))}>{t}</button>)}
              </div>
              {op && op !== 'push' && (
                <div role="group" aria-label="Boja ručki" style={sx('display: flex; gap: 6px')}>
                  {HANDLE_COLORS.map(([k, t, c]) => {
                    const on = (project.opening?.color ?? 'black') === k;
                    return <button key={k} type="button" aria-pressed={on} onClick={() => change(p => ({ ...p, opening: { ...p.opening!, color: k } }))}
                      style={sx('font: inherit; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; min-height: 32px; border-radius: 16px; cursor: pointer; ' + (on ? 'border: 1px solid #1C1B19; background: #1C1B19; color: #FFFFFF' : 'border: 1px solid #DDD8CE; background: #FFFFFF; color: #1C1B19'))}>
                      <span style={sx(`width: 12px; height: 12px; border-radius: 50%; border: 1px solid #8A8378; background: ${c}`)} />{t}</button>;
                  })}
                </div>
              )}
            </div>
            <div style={sx('border-top: 1px solid #DDD8CE; padding-top: 12px; font-size: 12px; color: #5F5A52; line-height: 1.5')}>Aparati, sudopera i slavina su generički modeli (bez brenda) samo za prikaz. U 2D i nacrtima ostaju simboli.</div>
          </aside>
        ) : (
          <aside aria-label="Slojevi i materijali" className="s3-side">
            <h2>Slojevi<Tip k="scene.layers" align="left" /></h2>
            <div className="s3-layers">
              {([['walls', 'Zidovi i otvori'], ['carcass', 'Korpusi'], ['fronts', 'Fronte'], ['tops', 'Radne ploče'], ['dims', 'Kote']] as const).map(([k, t]) => (
                <label key={k}><input type="checkbox" checked={layers[k]} onChange={e => setLayers({ ...layers, [k]: e.target.checked })} />{t}</label>
              ))}
            </div>
            <h2>Materijali na sceni<Tip k="scene.materials" align="left" /></h2>
            <div className="s3-mats">
              {([['#F4F4F2', 'Korpus', matName(mats?.carcass)], ['#BFC3C7', 'Fronte', matName(mats?.front)], ['#B79C76', 'Radna ploča', `${dims.worktopThickness} mm · hrast dekor`]] as const).map(([c, t, n]) => (
                <div key={t}><span style={{ background: c }} /><div><div>{t}</div><div className="n">{n}</div></div></div>
              ))}
            </div>
            <div className="s3-note">Scena se generiše iz istih podataka kao krojna lista — svaka promena mere u 2D odmah menja 3D i spisak delova.</div>
          </aside>
        )}
      </div>
      {shot && (
        <div style={sx('position: fixed; inset: 0; background: rgba(28,27,25,0.45); display: flex; align-items: center; justify-content: center; z-index: 100')}>
          <div role="dialog" aria-modal="true" aria-label="Slika za ponudu" style={sx('width: min(480px, calc(100% - 32px)); background: #FFFFFF; border-radius: 12px; padding: 22px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.25)')}>
            <h2 style={sx('margin: 0; font-size: 18px')}>Slika za ponudu</h2>
            <p style={sx('margin: 0; font-size: 13px; color: #5F5A52; line-height: 1.5')}>Foto-kvalitetan snimak trenutnog kadra u realnom prikazu (materijali, svetlo, senke). Ide na prvu stranu ponude kupcu.</p>
            {([['Kadar', 'cam', [['cur', 'Trenutni'], ['front', 'Spreda'], ['corner', 'Iz ugla']]], ['Kvalitet', 'q', [['std', 'Standardno (~5 s)'], ['hi', 'Visoko (~40 s)']]], ['Veličina', 'size', [['fhd', '1920 × 1080'], ['big', '3000 × 2000']]]] as const).map(([label, key, opts]) => (
              <div key={key} role="group" aria-label={label} style={sx('display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5F5A52')}>{label}
                <div style={sx('display: flex; flex-wrap: wrap; gap: 6px')}>
                  {opts.map(([v, t]) => <button key={v} type="button" aria-pressed={shot[key] === v} onClick={() => { setShot({ ...shot, [key]: v }); setShotState(''); }} style={sx(chipSt(shot[key] === v))}>{t}</button>)}
                </div>
              </div>
            ))}
            <label style={sx('display: flex; align-items: center; gap: 10px; font-size: 14px; min-height: 40px')}><input type="checkbox" checked={shot.toOffer} onChange={() => setShot({ ...shot, toOffer: !shot.toOffer })} style={sx('width: 18px; height: 18px; accent-color: #B4440E')} />Ubaci u ponudu (6 Ponuda)</label>
            {shotState === 'busy' && <div role="status" style={sx('font-size: 13px; color: #5F5A52')}>Renderujem…</div>}
            {shotState === 'done' && <div role="status" style={sx('font-size: 13px; background: #E4F1E6; color: #1F5A2A; border-radius: 6px; padding: 10px 12px')}>Slika je napravljena{shot.toOffer ? ' i dodata u ponudu.' : ' i preuzeta.'} <Link to="/ponuda">Otvori ponudu →</Link></div>}
            {shotState === 'error' && <div role="alert" style={sx('font-size: 13px; background: #FBE3D3; color: #7C2D0A; border-radius: 6px; padding: 10px 12px')}>Slika nije napravljena (pregledač nije dozvolio ili je memorija puna). Probaj „Snimak PNG“.</div>}
            <div style={sx('display: flex; justify-content: flex-end; gap: 8px')}>
              <button type="button" onClick={() => setShot(null)} style={sx('font: inherit; font-size: 14px; min-height: 42px; padding: 0 14px; border-radius: 6px; border: 1px solid #DDD8CE; background: #FFFFFF; cursor: pointer')}>Zatvori</button>
              <button type="button" onClick={makeShot} disabled={shotState === 'busy'} style={sx('font: inherit; font-size: 14px; font-weight: 600; min-height: 42px; padding: 0 16px; border-radius: 6px; border: 0; background: #B4440E; color: #FFFFFF; cursor: pointer')}>Napravi sliku</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Iso({ ref, project, solid, inst, sel, onSel, layers, worktopThickness, pal = TECH }: {
  ref?: React.Ref<SVGSVGElement>; project: Project; solid: boolean; inst: boolean; sel: string | null; onSel: (id: string | null) => void;
  layers: Layers; worktopThickness: number; pal?: Palette;
}) {
  const ink = pal.real ? pal.line : INK, sw = pal.real ? 0.5 : 0.8, wallLine = pal.real ? 'none' : '#BDB5A6';
  const room = project.room, geoms = wallGeoms(room), H = room.height;
  const s = 0.14, c30 = s * Math.cos(Math.PI / 6), s30 = s * 0.5;
  const P = ([x, y, z]: P3) => `${(430 + c30 * (x - y)).toFixed(1)},${(150 + s30 * (x + y) - s * z).toFixed(1)}`;
  const poly = (pts: P3[]) => pts.map(P).join(' ');
  const xs = room.walls.flatMap(w => [w.a?.x ?? 0, w.b?.x ?? 0]), ys = room.walls.flatMap(w => [w.a?.y ?? 0, w.b?.y ?? 0]);
  const W = Math.max(...xs) - 60, D = Math.max(...ys) - 60; // inner extent (shortcut: 120 mm walls, corner A/B at 0,0)

  // Room: wall A (y = 0), wall B (x = 0), floor; windows on A and B.
  const roomEls = layers.walls && <>
    <polygon points={poly([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]])} fill={pal.wallA} stroke={wallLine} />
    <polygon points={poly([[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]])} fill={pal.wallB} stroke={wallLine} />
    <polygon points={poly([[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]])} fill={pal.floor} stroke={wallLine} />
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

  // Handles per opening (docs/OTVARANJE.md), drawn on the fronts in the realistic view only.
  const handles = (e: Element, fronts: ReturnType<typeof frontLayout>['fronts'], fp: (fx: number, fy: number) => P3) => {
    const k = openingOf(project, e)?.kind ?? 'bar';
    if (k === 'push') return null;
    const up = e.kind === 'wall', segs: [P3, P3][] = [];
    for (const f of fronts) {
      if (f.label && f.label !== 'frižider' && f.label !== 'MSP') continue;
      if (k === 'profile') { const y = up ? f.y + f.h - 5 : f.y + 5; segs.push([fp(f.x, y), fp(f.x + f.w, y)]); continue; }
      const len = k === 'knob' ? 1 : 160;
      if (!f.hinge) { const cx = f.x + f.w / 2, cy = f.y + Math.min(50, f.h * 0.3); segs.push([fp(cx - len / 2, cy), fp(cx + len / 2, cy)]); continue; }
      const hx = f.hinge === 'L' ? f.x + f.w - 40 : f.x + 40;
      const cy = e.kind === 'tall' ? f.y + f.h / 2 : up ? f.y + f.h - 40 - len / 2 : f.y + 40 + len / 2;
      segs.push([fp(hx, cy - len / 2), fp(hx, cy + len / 2)]);
    }
    return <path d={segs.map(([a, b]) => `M${P(a)}L${P(b)}`).join('')} stroke={pal.handle} strokeWidth={k === 'knob' ? 5 : k === 'profile' ? 2.6 : 2.2} strokeLinecap="round" fill="none" />;
  };

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
        {layers.carcass && !touching && <polygon points={poly(side)} fill={pal.side} stroke={ink} strokeWidth={sw} />}
        {layers.carcass && !UNDER_WORKTOP.has(e.kind) && <polygon points={poly(top)} fill={pal.top} stroke={ink} strokeWidth={sw} />}
        {layers.fronts && <polygon points={poly(front)} fill={facingB ? pal.frontB : pal.front} stroke={ink} strokeWidth={sw} />}
        {layers.fronts && fronts.map((f, i) => (
          <polygon key={i} points={poly([fp(f.x, f.y + f.h), fp(f.x + f.w, f.y + f.h), fp(f.x + f.w, f.y), fp(f.x, f.y)])}
            fill={isSel ? '#E9B394' : f.label === 'rerna' || f.label === 'MT' ? (pal.real ? pal.hob : 'none') : 'none'} stroke={isSel ? '#B4440E' : ink} strokeWidth={isSel ? 2 : sw} />
        ))}
        {pal.real && layers.fronts && handles(e, fronts, fp)}
      </g>
    );
  });

  // Plinths (recessed 50 mm) under lower runs.
  const plinths = els.filter(({ e }) => UNDER_WORKTOP.has(e.kind) || e.kind === 'tall').map(({ e, g }) => {
    const sd = sideOf(geoms, e), a = wallPoint(g, e.offset, g.th / 2 + e.depth - 50, sd), b = wallPoint(g, e.offset + e.width, g.th / 2 + e.depth - 50, sd);
    return <polygon key={`pl-${e.id}`} points={poly([[a.x, a.y, 0], [b.x, b.y, 0], [b.x, b.y, bottom(e)], [a.x, a.y, bottom(e)]])} fill={pal.plinth} />;
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
    slabs.push(<polygon key={`wt-${g.wall.id}`} points={poly([[a0.x, a0.y, zTop], [a1.x, a1.y, zTop], [f1.x, f1.y, zTop], [f0.x, f0.y, zTop]])} fill={pal.worktop} stroke={ink} strokeWidth={sw} />);
    const facingB = Math.abs(g.ux) < Math.abs(g.uy);
    slabs.push(<polygon key={`we-${g.wall.id}`} points={poly([[f0.x, f0.y, zb], [f1.x, f1.y, zb], [f1.x, f1.y, zTop], [f0.x, f0.y, zTop]])} fill={facingB ? pal.edgeB : pal.edge} stroke={ink} strokeWidth="0.6" />);
    const endAtStart = g.ux + g.uy < 0, e0 = at(endAtStart ? from : to, 0), e1 = at(endAtStart ? from : to, 600);
    slabs.push(<polygon key={`wx-${g.wall.id}`} points={poly([[e0.x, e0.y, zb], [e1.x, e1.y, zb], [e1.x, e1.y, zTop], [e0.x, e0.y, zTop]])} fill={pal.edgeB} stroke={ink} strokeWidth="0.6" />);
    // Sink bowl and hob on the slab (shortcut: typical sizes, centred on their units).
    for (const e of run.filter(x => x.kind === 'sink' || x.kind === 'oven')) {
      const sink = e.kind === 'sink', mid = e.offset + e.width / 2, half = sink ? 250 : 240;
      const [b0, b1] = sink ? [100, 480] : [60, 500];
      const pts = [at(mid - half, b0), at(mid + half, b0), at(mid + half, b1), at(mid - half, b1)];
      slabs.push(<polygon key={`ap-${e.id}`} points={poly(pts.map(p => [p.x, p.y, zTop] as P3))} fill={sink ? pal.sink : pal.hob} stroke={ink} strokeWidth={sw} />);
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
    const text = `${e.label}${ownName(e)} · ${e.width}×${e.height}×${e.depth}`;
    const w = text.length * 7.3 + 14;
    return <g pointerEvents="none"><line x1={x + 30} y1={y + 40} x2={x} y2={y} stroke={INK} /><rect x={x + 30} y={y + 40} width={w} height="26" rx="4" fill={INK} /><text x={x + 30 + w / 2} y={y + 57} textAnchor="middle" fontSize="12" fill="#FFFFFF">{text}</text></g>;
  })();

  return (
    <svg ref={ref} viewBox="110 -240 740 800" role="img" xmlns="http://www.w3.org/2000/svg" className="s3-svg"
      aria-label={`Izometrijski 3D prikaz: ${project.elements.map(e => e.label).join(', ')}`}>
      {pal.real && <defs>
        <pattern id="k-oak" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#C99E6E" /><rect x="3" width="1" height="8" fill="#B98C5D" /><rect x="4" width="4" height="8" fill="#D2A979" /></pattern>
        <pattern id="k-walnut" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#6E4C34" /><rect x="3" width="1" height="8" fill="#553825" /><rect x="4" width="4" height="8" fill="#7A5639" /></pattern>
        <pattern id="k-oakwt" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="8" height="8" fill="#BF9466" /><rect y="3" width="8" height="1" fill="#A57A4D" /><rect y="4" width="8" height="4" fill="#C99E70" /></pattern>
        <pattern id="k-floor" width="20" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="20" height="10" fill="#C7A07A" /><rect y="9" width="20" height="1" fill="#8B6744" /></pattern>
        <pattern id="k-tiles" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30) skewX(-30)"><rect width="14" height="14" fill="#C8C6C1" /><path d="M0 0h14M0 0v14" stroke="#F2F0EC" strokeWidth="1" /></pattern>
      </defs>}
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
