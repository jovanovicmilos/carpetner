// 3D view (design/screens/Pogled3D.html): isometric scene drawn as SVG from the same project data as the plan and cut list.
// Projection as the design: 0.14 px/mm, x (wall A) → down-right, y (into the room) → down-left, z up; inner corner A/B at (430, 150).
// Camera presets switch the stage to the orbit R3F scene (SceneGL); "Snimak PNG" saves the shown view as PNG.
import {
  elementBox, layerOf, openingOf, sideOf, wallGeoms, wallPoint, PRESETS,
  type Element, type OpeningKind, type Point, type Project, type WallGeom,
} from 'engine';
import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { frontLayout } from './fronts';
import { Header } from './Header';
import { useResumed } from './projects';
import { Tip } from './help';
import { INSTALLATION_MARK, ownName } from './labels';
import { APPS, FLOORS, FRONTS, HANDLE_COLORS, realPalette, TECH, WALLS, withFront, WTOPS, type Palette } from './look';
import { useOfferImage } from './offerImage';
import { APP_FIXED, SegmentedControl } from './ui';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useProject } from './store';
import type { Cam } from './SceneGL';

const SceneGL = lazy(() => import('./SceneGL').then(m => ({ default: m.SceneGL })));

const INK = '#1C1B19';
const UNDER_WORKTOP = new Set<Element['kind']>(['base', 'sink', 'drawer', 'oven', 'corner-blind', 'appliance-front', 'filler']);
type P3 = [number, number, number];
type Layers = { walls: boolean; carcass: boolean; fronts: boolean; tops: boolean; dims: boolean };

type Shot = { cam: 'cur' | 'front' | 'corner'; q: 'std' | 'hi'; size: 'fhd' | 'big'; toOffer: boolean };
// Tailwind classes of design/screens/Pogled3D.html (docs/UI_KOMPONENTE.md). Toggles stay buttons with aria-pressed.
const SEG = 'min-h-[34px] rounded-md border-0 bg-transparent px-3.5 text-[13px] font-normal text-muted-foreground aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-[0_1px_3px_rgba(0,0,0,0.12)]';
const CHIP = 'min-h-[34px] rounded-md px-2.5 py-1.5 text-[12.5px] font-normal whitespace-normal aria-pressed:border-primary aria-pressed:bg-[#FBE3D3] aria-pressed:font-semibold aria-pressed:text-accent-ink';
const BTN = 'min-h-10 rounded-md px-3 py-2 text-[13px] font-normal aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-white data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-white';
const SIDE = 'box-content flex min-h-0 flex-[0_0_320px] flex-col gap-[18px] overflow-y-auto border-0 border-l border-solid border-border bg-white p-5';
const H2 = 'm-0 flex items-center text-[18px]';
const LAYER = 'flex items-center gap-2.5';
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
  // The last chosen view stays (a workshop mostly works in Tehnički); first visit = Realni as the design.
  const [real, setRealState] = useState(() => { try { return localStorage.getItem('kroj.3dview') !== 'tech'; } catch { return true; } });
  const setReal = (v: boolean) => { setRealState(v); try { localStorage.setItem('kroj.3dview', v ? 'real' : 'tech'); } catch { /* private mode */ } };
  const [solid, setSolid] = useState(true);
  const [inst, setInst] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layers>({ walls: true, carcass: true, fronts: true, tops: true, dims: true });
  const [cam, setCam] = useResumed<Cam | null>('scene.cam', null);
  const [camN, setCamN] = useState(0); // a view button puts the camera back even when that view is already chosen
  const [shot, setShot] = useState<Shot | null>(null);
  const [shotState, setShotState] = useState<'' | 'busy' | 'done' | 'error'>('');
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Same palette object while the project is the same: a new one rebuilds the WebGL scene (and its materials) on every click.
  const realPal = useMemo(() => (project ? realPalette(project) : null), [project]);
  if (!project) return <Navigate to="/" replace />;

  const pal = real && realPal ? realPal : TECH;
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
      if (shot.cam !== 'cur' || cam || real) {
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
    <div className={APP_FIXED}>
      <Header units />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-auto flex-col overflow-hidden bg-[#E9E6DF]">
          <div className="flex flex-wrap items-center gap-2 border-0 border-b border-solid border-border bg-white px-5 py-3">
            <h1 className="m-0 mr-2 flex items-center text-[18px] font-semibold">3D prikaz<Tip k="scene.title" align="right" /></h1>
            <div role="group" aria-label="Vrsta prikaza" className="flex gap-[3px] rounded-lg bg-[#F3F1EC] p-[3px]">
              <Button variant="ghost" size="none" aria-pressed={!real} onClick={() => setReal(false)} className={SEG}>Tehnički</Button>
              <Button variant="ghost" size="none" aria-pressed={real} onClick={() => setReal(true)} className={SEG}>Realni</Button>
            </div><Tip k="scene.real" />
            {real
              ? <SegmentedControl label="Svetlo" className="flex gap-1" itemClass={cn(buttonVariants({ variant: 'outline', size: 'none' }), BTN)} value={look.light ?? 'day'} onChange={v => setLook({ light: v })}
                  options={[['day', 'Dan'], ['night', 'Veče']] as const} />
              : <>
                <SegmentedControl label="Način prikaza" className="flex gap-1" itemClass={cn(buttonVariants({ variant: 'outline', size: 'none' }), BTN)} value={solid ? 's' : 'c'} onChange={v => setSolid(v === 's')}
                  options={[['s', 'Puno'], ['c', 'Providno']] as const} />
                <Button variant="outline" size="none" className={BTN} aria-pressed={inst} onClick={() => setInst(!inst)}>Instalacije</Button>
              </>}
            <div className="ml-auto flex flex-wrap gap-1.5">
              {([['front', 'Pogled spreda'], ['top', 'Odozgo'], ['iso', 'Izometrija']] as const).map(([k, t]) => (
                <Button key={k} variant="outline" size="none" className={BTN} aria-pressed={cam === k} onClick={() => { setCam(k); setCamN(n => n + 1); }}>{t}</Button>
              ))}
              <Button variant="outline" size="none" className={BTN} onClick={savePng}>Snimak PNG</Button>
              <Button size="none" className="min-h-10 rounded-md px-3.5 py-2 text-[13px]" onClick={() => { setReal(true); setShot({ cam: 'cur', q: 'std', size: 'fhd', toOffer: true }); setShotState(''); }}>Slika za ponudu</Button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-5" ref={stageRef} onClick={() => !cam && setSel(null)} onPointerDown={() => !cam && setCam('iso')}>
            {cam || real
              ? <Suspense fallback={null}><SceneGL project={project} cam={cam ?? 'iso'} camKey={camN} solid={real || solid} sel={sel} onSel={setSel} layers={layers} real={real ? pal : undefined} night={night} /></Suspense>
              : <Iso ref={svgRef} project={project} solid={real || solid} inst={!real && inst} sel={real ? null : sel} onSel={setSel} layers={layers} worktopThickness={dims.worktopThickness} pal={pal} />}
            <div className="absolute bottom-5 left-5 rounded-lg border border-solid border-border bg-white px-3.5 py-2.5 text-[13px] leading-normal text-muted-foreground">Levi klik + povlačenje: rotacija · Desni: pomeranje · Točkić: zum<br />Dvoklik na element: otvara parametre</div>
          </div>
        </main>
        {real ? (
          <aside aria-label="Izgled za kupca" className={SIDE}>
            <h2 className={H2}>Izgled za kupca<Tip k="scene.look" align="left" /></h2>
            {groups.map(g => (
              <div key={g.title} className="flex flex-col gap-[8px]">
                <div className="flex justify-between items-baseline gap-[8px]"><span className="text-[13px] font-semibold">{g.title}</span><span className="text-[12px] text-[#5F5A52] text-right">{g.cur}</span></div>
                <div className="flex flex-wrap gap-[6px]">
                  {g.opts.map(o => <Button key={o.name} variant="ghost" size="none" aria-pressed={o.on} aria-label={o.name} title={o.name} onClick={o.pick} style={{ background: o.bg }}
                    className="size-[38px] rounded-lg border border-solid border-[#BDB6AA] hover:bg-transparent aria-pressed:border-[3px] aria-pressed:border-primary aria-pressed:shadow-[inset_0_0_0_2px_#FFFFFF]" />)}
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-[8px]">
              <span className="text-[13px] font-semibold">Ručke i otvaranje</span>
              <div role="group" aria-label="Ručke" className="grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[4px]">
                {OPENS.map(([k, t]) => <Button key={k} variant="outline" size="none" className={CHIP} aria-pressed={op === k} onClick={() => change(p => ({ ...p, opening: { ...(p.opening ?? {}), kind: k } }))}>{t}</Button>)}
              </div>
              {op && op !== 'push' && (
                <div role="group" aria-label="Boja ručki" className="flex gap-[6px]">
                  {HANDLE_COLORS.map(([k, t, c]) => {
                    const on = (project.opening?.color ?? 'black') === k;
                    return <Button key={k} variant="outline" size="none" aria-pressed={on} onClick={() => change(p => ({ ...p, opening: { ...p.opening!, color: k } }))}
                      className="min-h-8 gap-1.5 rounded-2xl px-2.5 py-[5px] text-[12px] font-normal aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-white">
                      <span className="size-3 rounded-full border border-solid border-[#8A8378]" style={{ background: c }} />{t}</Button>;
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="text-[13px] font-semibold flex items-center">Slojevi<Tip k="scene.layers" align="left" /></span>
              <div className="flex flex-col gap-1">
                {([['walls', 'Zidovi i otvori'], ['carcass', 'Korpusi'], ['fronts', 'Fronte'], ['tops', 'Radne ploče']] as const).map(([k, t]) => (
                  <label key={k} className={cn(LAYER, 'min-h-[34px] text-[13px]')}><Checkbox checked={layers[k]} onCheckedChange={v => setLayers({ ...layers, [k]: v === true })} />{t}</label>
                ))}
              </div>
            </div>
            <div className="border-t border-t-[#DDD8CE] pt-[12px] text-[12px] text-[#5F5A52] leading-[1.5]">Aparati, sudopera i slavina su generički modeli (bez brenda) samo za prikaz. U 2D i nacrtima ostaju simboli.</div>
          </aside>
        ) : (
          <aside aria-label="Slojevi i materijali" className={SIDE}>
            <h2 className={H2}>Slojevi<Tip k="scene.layers" align="left" /></h2>
            <div className="flex flex-col gap-1">
              {([['walls', 'Zidovi i otvori'], ['carcass', 'Korpusi'], ['fronts', 'Fronte'], ['tops', 'Radne ploče'], ['dims', 'Kote']] as const).map(([k, t]) => (
                <label key={k} className={cn(LAYER, 'min-h-10 text-[14px]')}><Checkbox checked={layers[k]} onCheckedChange={v => setLayers({ ...layers, [k]: v === true })} />{t}</label>
              ))}
            </div>
            <h2 className={H2}>Materijali na sceni<Tip k="scene.materials" align="left" /></h2>
            <div className="flex flex-col gap-2.5 text-[14px]">
              {([['#F4F4F2', 'Korpus', matName(mats?.carcass)], ['#BFC3C7', 'Fronte', matName(mats?.front)], ['#B79C76', 'Radna ploča', `${dims.worktopThickness} mm · hrast dekor`]] as const).map(([c, t, n]) => (
                <div key={t} className="flex items-center gap-3"><span className="size-8 flex-none rounded border border-solid border-border" style={{ background: c }} /><div><div>{t}</div><div className="text-[12px] text-muted-foreground">{n}</div></div></div>
              ))}
            </div>
            <div className="mt-auto border-0 border-t border-solid border-border pt-3.5 text-[13px] leading-normal text-muted-foreground">Scena se generiše iz istih podataka kao krojna lista — svaka promena mere u 2D odmah menja 3D i spisak delova.</div>
          </aside>
        )}
      </div>
      <Dialog open={shot !== null} onOpenChange={o => { if (!o) setShot(null); }}>
        {shot && (
          <DialogContent className="w-[min(480px,calc(100%-32px))] rounded-xl">
            <DialogTitle>Slika za ponudu</DialogTitle>
            <DialogDescription>Foto-kvalitetan snimak trenutnog kadra u realnom prikazu (materijali, svetlo, senke). Ide na prvu stranu ponude kupcu.</DialogDescription>
            {([['Kadar', 'cam', [['cur', 'Trenutni'], ['front', 'Spreda'], ['corner', 'Iz ugla']]], ['Kvalitet', 'q', [['std', 'Standardno (~5 s)'], ['hi', 'Visoko (~40 s)']]], ['Veličina', 'size', [['fhd', '1920 × 1080'], ['big', '3000 × 2000']]]] as const).map(([label, key, opts]) => (
              <div key={key} role="group" aria-label={label} className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">{label}
                <div className="flex flex-wrap gap-1.5">
                  {opts.map(([v, t]) => <Button key={v} variant="outline" size="none" className={CHIP} aria-pressed={shot[key] === v} onClick={() => { setShot({ ...shot, [key]: v }); setShotState(''); }}>{t}</Button>)}
                </div>
              </div>
            ))}
            <label className="flex min-h-10 items-center gap-2.5 text-[14px]"><Checkbox checked={shot.toOffer} onCheckedChange={() => setShot({ ...shot, toOffer: !shot.toOffer })} />Ubaci u ponudu (6 Ponuda)</label>
            {shotState === 'busy' && <div role="status" className="text-[13px] text-[#5F5A52]">Renderujem…</div>}
            {shotState === 'done' && <div role="status" className="text-[13px] bg-[#E4F1E6] text-[#1F5A2A] rounded-[6px] py-[10px] px-[12px]">Slika je napravljena{shot.toOffer ? ' i dodata u ponudu.' : ' i preuzeta.'} <Link to="/ponuda">Otvori ponudu →</Link></div>}
            {shotState === 'error' && <div role="alert" className="text-[13px] bg-[#FBE3D3] text-[#7C2D0A] rounded-[6px] py-[10px] px-[12px]">Slika nije napravljena (pregledač nije dozvolio ili je memorija puna). Probaj „Snimak PNG“.</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="none" className="min-h-[42px] rounded-md px-3.5 text-[14px] font-normal" onClick={() => setShot(null)}>Zatvori</Button>
              <Button size="none" className="min-h-[42px] rounded-md px-4 text-[14px]" onClick={makeShot} disabled={shotState === 'busy'}>Napravi sliku</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
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
      <g key={e.id} className="cursor-pointer" onClick={ev => { ev.stopPropagation(); onSel(e.id); }}>
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
    <svg ref={ref} viewBox="110 -240 740 800" role="img" xmlns="http://www.w3.org/2000/svg" className="h-auto max-h-[calc(100vh-170px)] w-full max-w-[860px] font-mono"
      aria-label={`Izometrijski 3D prikaz: ${project.elements.map(e => e.label).join(', ')}`}>
      {pal.real && <defs>
        <pattern id="k-oak" width="14" height="8" patternUnits="userSpaceOnUse"><rect width="14" height="8" fill="#CBA273" /><rect x="6" width="1" height="8" fill="#C0956A" /></pattern>
        <pattern id="k-walnut" width="14" height="8" patternUnits="userSpaceOnUse"><rect width="14" height="8" fill="#714F37" /><rect x="6" width="1" height="8" fill="#664630" /></pattern>
        <pattern id="k-oakwt" width="14" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="14" height="10" fill="#C49A6C" /><rect y="5" width="14" height="1" fill="#B88E61" /></pattern>
        <pattern id="k-floor" width="24" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="24" height="16" fill="#CDAA85" /><rect y="15" width="24" height="1" fill="#BC9873" /></pattern>
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
