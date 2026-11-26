// 3D view (design/screens/Pogled3D.html): isometric scene drawn as SVG from the same project data as the plan and cut list.
// Projection as the design: 0.14 px/mm, x (wall A) → down-right, y (into the room) → down-left, z up; inner corner A/B at (430, 150).
// Camera presets switch the stage to the orbit R3F scene (SceneGL); "Snimak PNG" saves the shown view as PNG.
import {
  elementBox, layerOf, openingOf, sideOf, wallGeoms, wallHeightAt, wallPoint, PRESETS,
  type Element, type OpeningKind, type Point, type Project, type WallGeom,
} from 'engine';
import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { frontLayout } from './fronts';
import { Header } from './Header';
import { useResumed } from './projects';
import { Tip } from './help';
import { INSTALLATION_MARK, installationCard, ownName } from './labels';
import { APPS, FLOORS, FRONTS, HANDLE_COLORS, realPalette, TECH, WALLS, withFront, withFrontMaterial, WTOPS, type Palette } from './look';
import { DECORS, decorMaterial, decorOf, MAKER_NOTE, WORKTOP_DECORS, worktopDecor, worktopKey, type Decor } from './decors';
import { Input } from '@/components/ui/input';
import { PlannerHeader } from './Planner';
import { useOfferImage } from './offerImage';
import { APP_FIXED } from './ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShareLink } from './ShareLink';
import { usePartner } from './partner';
import { Box, Camera, Columns3, DoorOpen, Expand, Grid2x2, ImageIcon, Info, Moon, MousePointerClick, Move, Plus, Rotate3d, Sun, ZoomIn } from 'lucide-react';
import { Kbd } from '@/components/ui/kbd';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LockedButton } from './locks';
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
// Under md the 3D and the panel stack and the page scrolls (customer Izgled on a phone).
const SIDE = 'box-content flex min-h-0 flex-[0_0_320px] flex-col gap-[18px] overflow-y-auto border-0 border-l border-solid border-border bg-white p-5 max-md:flex-none max-md:overflow-visible max-md:border-l-0 max-md:border-t';
const H2 = 'm-0 flex items-center text-lg font-semibold';
const SWITCH = 'cursor-pointer font-normal'; // Label + Switch row (on/off options use Switch, user 2026-11-24)
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

/** `customer`: step 3 "Izgled" of the customer flow (/kupac/izgled) — the customer's stepper instead of the workshop header. */
export function Scene3D({ customer }: { customer?: boolean }) {
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const partner = usePartner(project?.id); // shared session: the customer edits this kitchen too, no read-only link
  const putImage = useOfferImage(s => s.put);
  const [decors, setDecors] = useState<'front' | 'top' | null>(null);
  // The last chosen view stays (a workshop mostly works in Tehnički); first visit = Realni as the design.
  const [real, setRealState] = useState(() => { try { return localStorage.getItem('kroj.3dview') !== 'tech'; } catch { return true; } });
  const setReal = (v: boolean) => { setRealState(v); try { localStorage.setItem('kroj.3dview', v ? 'real' : 'tech'); } catch { /* private mode */ } };
  const [solid, setSolid] = useState(true);
  const [inst, setInst] = useState(true);
  const [opened, setOpened] = useState(false); // "Otvori": doors swing open, drawers pull out (animated, user 2026-11-25)
  const [explode, setExplode] = useState(false); // "Rasklopi": boards pulled apart, as on the site's element pictures
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
  if (!project) return <Navigate to="/brzi-start" replace />;

  const pal = real && realPal ? realPal : TECH;
  const night = real && pal.night;
  const look = project.look ?? {};
  const setLook = (p: Partial<NonNullable<Project['look']>>) => change(pr => ({ ...pr, look: { ...pr.look, ...p } }));
  const download = (href: string, name = '3d-prikaz.png') => Object.assign(document.createElement('a'), { href, download: name }).click();
  const savePng = async () => {
    const gl = stageRef.current?.querySelector('canvas');
    if ((cam || real) && gl) return download(gl.toDataURL('image/png')); // Realni is always the WebGL scene, also before a camera preset
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
  const wt = WTOPS.find(w => w[0] === (look.worktop ?? 'Hrast')) ?? WTOPS[0], topDecor = worktopDecor(look.worktop), app = APPS.find(a => a[0] === (look.applianceFinish ?? 'inox'))!;
  const wall = WALLS.find(w => w[0] === look.wall) ?? WALLS[0], floor = FLOORS.find(f => f[0] === look.floor) ?? FLOORS[0];
  const frontDecor = frontIdx < 0 ? decorOf(project.materials[mats?.front ?? '']?.name) : undefined;
  // Decors added with "+" stay as their own swatches, newest first, at most 6 per group; "+" stays "+" (user 2026-11-26)
  const remember = (pr: Project, k: 'front' | 'top', id: string): Project => ({ ...pr, look: { ...pr.look, decors: { ...pr.look?.decors, [k]: [id, ...(pr.look?.decors?.[k] ?? []).filter(x => x !== id)].slice(0, 6) } } });
  const pickFront = (d: Decor) => change(p => remember(withFrontMaterial(p, decorMaterial(d)), 'front', d.code));
  const pickTop = (d: Decor) => change(p => remember({ ...p, look: { ...p.look, worktop: worktopKey(d) } }, 'top', worktopKey(d)));
  const addedFront = [...new Set([...(look.decors?.front ?? []), ...(frontDecor ? [frontDecor.code] : [])])].map(c => DECORS.find(d => d.code === c)).filter((d): d is Decor => !!d);
  const addedTop = [...new Set([...(look.decors?.top ?? []), ...(topDecor ? [worktopKey(topDecor)] : [])])].map(worktopDecor).filter((d): d is Decor => !!d);
  type Swatch = { name: string; bg: string; on: boolean; pick: () => void };
  const groups: { title: string; cur: string; opts: Swatch[]; added?: Swatch[]; more?: { open: () => void } }[] = [
    { title: 'Fronte', cur: matName(mats?.front), more: { open: () => setDecors('front') }, opts: FRONTS.map(([n, bg], i) => ({ name: n, bg, on: i === frontIdx, pick: () => change(p => withFront(p, i)) })),
      added: addedFront.map(d => ({ name: `${d.maker} ${d.code} ${d.name}`, bg: decorBg(d), on: frontDecor?.code === d.code, pick: () => pickFront(d) })) },
    { title: 'Radna ploča', cur: topDecor ? `38 mm ${topDecor.name} ${topDecor.code}` : wt[2], more: { open: () => setDecors('top') },
      opts: WTOPS.map(([n, bg]) => ({ name: n, bg, on: !topDecor && n === wt[0], pick: () => setLook({ worktop: n }) })),
      added: addedTop.map(d => ({ name: `${d.maker} ${d.code} ${d.name}`, bg: decorBg(d), on: !!topDecor && worktopKey(topDecor) === worktopKey(d), pick: () => pickTop(d) })) },
    { title: 'Aparati, sudopera, slavina', cur: `${app[1]} · generički`, opts: APPS.map(([k, n, bg]) => ({ name: n, bg, on: k === app[0], pick: () => setLook({ applianceFinish: k }) })) },
    { title: 'Zid', cur: wall[0], opts: WALLS.map(([n, bg]) => ({ name: n, bg, on: n === wall[0], pick: () => setLook({ wall: n }) })) },
    { title: 'Pod', cur: floor[0], opts: FLOORS.map(([n, bg]) => ({ name: n, bg, on: n === floor[0], pick: () => setLook({ floor: n }) })) },
  ];
  const op = project.opening?.kind;

  return (
    <div className={APP_FIXED}>
      {customer ? <PlannerHeader project={project} role="kupac" step={2} /> : <Header units />}
      <DecorPicker open={decors === 'front'} onOpenChange={o => setDecors(o ? 'front' : null)} current={frontDecor} list={DECORS} title="Dekori fronti"
        text="Ploče koje drže pilane u Srbiji. Izabrani dekor postaje materijal fronti svih elemenata (krojna lista i cena se menjaju)."
        onPick={d => { pickFront(d); setDecors(null); }} />
      <DecorPicker open={decors === 'top'} onOpenChange={o => setDecors(o ? 'top' : null)} current={topDecor} list={WORKTOP_DECORS} title="Dekori radnih ploča"
        text="Radne ploče 38 mm koje drže stovarišta u Srbiji. Menja se izgled u 3D i na slici za ponudu; cena radne ploče ostaje iz cenovnika."
        onPick={d => { pickTop(d); setDecors(null); }} />
      <div className="flex min-h-0 flex-1 max-md:flex-col max-md:overflow-y-auto">
        <main className="flex min-h-0 min-w-0 flex-auto flex-col overflow-hidden bg-[#E9E6DF] max-md:h-[70vh] max-md:flex-none">
          <div className="flex flex-wrap items-center gap-2 border-0 border-b border-solid border-border bg-white px-5 py-3">
            <h1 className="m-0 mr-2 flex items-center text-[18px] font-semibold">3D prikaz<Tip k="scene.title" align="right" /></h1>
            <Tabs value={real ? 'real' : 'tech'} onValueChange={v => setReal(v === 'real')}>
              <TabsList aria-label="Vrsta prikaza"><TabsTrigger value="tech" className="px-3">Tehnički</TabsTrigger><TabsTrigger value="real" className="px-3">Realni</TabsTrigger></TabsList>
            </Tabs><Tip k="scene.real" />
            {!real && <>
                {/* same component as Tehnički / Realni for every one-of-few view choice (user 2026-11-25) */}
                <Tabs value={solid ? 's' : 'c'} onValueChange={v => setSolid(v === 's')}>
                  <TabsList aria-label="Način prikaza"><TabsTrigger value="s" className="px-3">Puno</TabsTrigger><TabsTrigger value="c" className="px-3">Providno</TabsTrigger></TabsList>
                </Tabs>
                <Label className={cn(SWITCH, 'ml-1')}><Switch checked={inst} onCheckedChange={setInst} />Instalacije</Label>
              </>}
            <div className="ml-auto flex flex-wrap gap-1.5">
              {/* camera presets with icons (user 2026-11-25) */}
              <Tabs value={cam ?? ''} onValueChange={v => { setCam(v as Cam); setCamN(n => n + 1); }}>
                <TabsList aria-label="Kamera">
                  {([['front', 'Pogled spreda', Columns3], ['top', 'Odozgo', Grid2x2], ['iso', 'Izometrija', Box]] as const).map(([k, t, Icon]) => (
                    // a click on the chosen one does not change the value, so it re-frames here
                    <TabsTrigger key={k} value={k} className="px-3" onClick={() => { if (cam === k) setCamN(n => n + 1); }}><Icon />{t}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <LockedButton feature="quote.image" label="Slika za ponudu">
                <Button onClick={() => { setReal(true); setShot({ cam: 'cur', q: 'std', size: 'fhd', toOffer: true }); setShotState(''); }}><ImageIcon />Slika za ponudu</Button>
              </LockedButton>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center" ref={stageRef} onClick={() => !cam && setSel(null)} onPointerDown={() => !cam && setCam('iso')}>
            {cam || real || explode || opened
              ? <Suspense fallback={null}><SceneGL project={project} cam={cam ?? 'iso'} camKey={camN} solid={real || solid} sel={sel} onSel={setSel} layers={layers} real={real ? pal : undefined} night={night} noOpen={customer} inst={!real && inst} explode={explode ? 80 : 0} open={opened} /></Suspense>
              : <Iso ref={svgRef} project={project} solid={real || solid} inst={!real && inst} sel={real ? null : sel} onSel={setSel} layers={layers} worktopThickness={dims.worktopThickness} pal={pal} />}
            {/* view tools inside the canvas, bottom-right (user 2026-11-25): light (Realni only) + PNG snapshot;
                the chosen light is dark like the active tool in Prostor (styled by aria-checked: the Tooltip trigger overwrites data-state); clicks must not reach the stage */}
            <div className="absolute right-5 bottom-5 z-10 flex items-center gap-1 rounded-lg border bg-white p-1 shadow-sm" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
              {real && <ToggleGroup type="single" variant="outline" aria-label="Svetlo" value={look.light ?? 'day'} onValueChange={v => v && setLook({ light: v as 'day' | 'night' })}>
                {([['day', 'Dan', Sun], ['night', 'Veče', Moon]] as const).map(([v, t, Icon]) => (
                  <Tooltip key={v}><TooltipTrigger asChild><ToggleGroupItem value={v} aria-label={t} className={v === 'day'
                    ? 'aria-checked:border-[#3B82C4] aria-checked:bg-[#4A9BE0] aria-checked:text-[#FFD43B] aria-checked:hover:bg-[#4A9BE0]/90 aria-checked:hover:text-[#FFD43B] aria-checked:[&_svg]:fill-[#FFD43B]'
                    : 'aria-checked:border-dark aria-checked:bg-dark aria-checked:text-[#FFD43B] aria-checked:hover:bg-dark/90 aria-checked:hover:text-[#FFD43B] aria-checked:[&_svg]:fill-[#FFD43B]'}><Icon /></ToggleGroupItem></TooltipTrigger><TooltipContent side="top">{v === 'day' ? 'Dnevno svetlo' : 'Večernje svetlo'}</TooltipContent></Tooltip>
                ))}
              </ToggleGroup>}
              {/* exploded view (user 2026-11-25: "dodaj gde misliš da je najbolje") — a view tool, so next to the light and PNG */}
              <Tooltip><TooltipTrigger asChild><Toggle aria-label="Otvori krila i fioke" pressed={opened} onPressedChange={setOpened}
                className="aria-pressed:bg-dark aria-pressed:text-white aria-pressed:hover:bg-dark/90 aria-pressed:hover:text-white"><DoorOpen /></Toggle></TooltipTrigger>
                <TooltipContent side="top">{opened ? 'Zatvori krila i fioke' : 'Otvori krila i fioke'}</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Toggle aria-label="Rasklopi" pressed={explode} onPressedChange={setExplode}
                className="aria-pressed:bg-dark aria-pressed:text-white aria-pressed:hover:bg-dark/90 aria-pressed:hover:text-white"><Expand /></Toggle></TooltipTrigger>
                <TooltipContent side="top">{explode ? 'Sklopi' : 'Rasklopi — vidi kako se sklapa'}</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Snimak PNG" onClick={savePng}><Camera /></Button></TooltipTrigger><TooltipContent side="top">Snimak ekrana (PNG)</TooltipContent></Tooltip>
              {!customer && !partner && <ShareLink />}
              {/* mouse controls: was a card in the bottom-left, now on click (user 2026-11-25) */}
              <Popover>
                <Tooltip><TooltipTrigger asChild><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Upravljanje mišem"><Info /></Button></PopoverTrigger></TooltipTrigger>
                  <TooltipContent side="top">Upravljanje mišem</TooltipContent></Tooltip>
                <PopoverContent side="top" align="end" sideOffset={8} className="w-auto">
                  <PopoverHeader className="mb-3"><PopoverTitle>Upravljanje mišem</PopoverTitle></PopoverHeader>
                  {/* one row per action: icon · mouse input · result (user 2026-11-25: legend with icons, not plain text) */}
                  <ul className="m-0 grid list-none grid-cols-[auto_auto_1fr] items-center gap-x-3 gap-y-2.5 p-0 text-sm">
                    {([[Rotate3d, 'Levi klik + povlačenje', 'rotacija'], [Move, 'Desni klik + povlačenje', 'pomeranje'], [ZoomIn, 'Točkić', 'zum'], [MousePointerClick, 'Dvoklik na element', 'otvara parametre']] as const).map(([Icon, how, what]) => (
                      <li key={how} className="contents">
                        <span className="inline-flex size-7 items-center justify-center rounded-md bg-accent-soft text-accent-ink"><Icon className="size-4" aria-hidden="true" /></span>
                        <Kbd className="justify-self-start">{how}</Kbd>
                        <span className="text-muted-foreground">{what}</span>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </main>
        {real ? (
          <aside aria-label="Izgled za kupca" className={SIDE}>
            <h2 className={H2}>Izgled za kupca<Tip k="scene.look" align="left" /></h2>
            {groups.map(g => (
              <div key={g.title} className="flex flex-col gap-[8px]">
                <div className="flex justify-between items-baseline gap-2"><span className="text-sm font-medium">{g.title}</span><span className="text-xs text-muted-foreground text-right">{g.cur}</span></div>
                <div className="flex flex-wrap gap-[6px]">
                  {g.opts.map(o => <Tooltip key={o.name}><TooltipTrigger asChild><Button variant="ghost" size="none" aria-pressed={o.on} aria-label={o.name} onClick={o.pick} style={{ background: o.bg }}
                    className="size-9 rounded-lg border border-solid border-[#BDB6AA] shadow-xs hover:bg-transparent aria-pressed:border-primary aria-pressed:ring-[3px] aria-pressed:ring-primary/25" /></TooltipTrigger><TooltipContent>{o.name}</TooltipContent></Tooltip>)}
                  {g.added?.map(o => <Tooltip key={o.name}><TooltipTrigger asChild><Button variant="ghost" size="none" aria-pressed={o.on} aria-label={o.name} onClick={o.pick} style={{ background: o.bg }}
                    className="size-9 rounded-lg border border-solid border-[#BDB6AA] shadow-xs hover:bg-transparent aria-pressed:border-primary aria-pressed:ring-[3px] aria-pressed:ring-primary/25" /></TooltipTrigger><TooltipContent>{o.name}</TooltipContent></Tooltip>)}
                  {g.more && <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label={`Više dekora (EGGER, Kronospan) — ${g.title}`} onClick={g.more.open}
                    className="rounded-lg border-dashed text-muted-foreground"><Plus /></Button></TooltipTrigger><TooltipContent>Više dekora (EGGER, Kronospan)</TooltipContent></Tooltip>}
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-[8px]">
              <span className="text-sm font-medium">Ručke i otvaranje</span>
              <div role="group" aria-label="Ručke" className="grid grid-cols-2 gap-1.5">
                {OPENS.map(([k, t]) => <Toggle key={k} variant="outline" size="sm" className="font-normal" pressed={op === k} onPressedChange={() => change(p => ({ ...p, opening: { ...(p.opening ?? {}), kind: k } }))}>{t}</Toggle>)}
              </div>
              {op && op !== 'push' && (
                <div role="group" aria-label="Boja ručki" className="flex flex-wrap gap-1.5">
                  {HANDLE_COLORS.map(([k, t, c]) => {
                    const on = (project.opening?.color ?? 'black') === k;
                    return <Toggle key={k} variant="outline" size="sm" className="px-2.5 font-normal" pressed={on} onPressedChange={() => change(p => ({ ...p, opening: { ...p.opening!, color: k } }))}>
                      <span className="size-3 rounded-full border border-solid border-[#8A8378]" style={{ background: c }} />{t}</Toggle>;
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="text-sm font-medium flex items-center">Slojevi<Tip k="scene.layers" align="left" /></span>
              <div className="flex flex-col gap-3 pt-1">
                {([['walls', 'Zidovi i otvori'], ['carcass', 'Korpusi'], ['fronts', 'Fronte'], ['tops', 'Radne ploče']] as const).map(([k, t]) => (
                  <Label key={k} className={SWITCH}><Switch checked={layers[k]} onCheckedChange={v => setLayers({ ...layers, [k]: v })} />{t}</Label>
                ))}
              </div>
            </div>
            <div className="border-t border-t-[#DDD8CE] pt-[12px] text-[12px] text-[#5F5A52] leading-[1.5]">Aparati, sudopera i slavina su generički modeli (bez brenda) samo za prikaz. U 2D i nacrtima ostaju simboli.</div>
          </aside>
        ) : (
          <aside aria-label="Slojevi i materijali" className={SIDE}>
            <h2 className={H2}>Slojevi<Tip k="scene.layers" align="left" /></h2>
            <div className="flex flex-col gap-3">
              {([['walls', 'Zidovi i otvori'], ['carcass', 'Korpusi'], ['fronts', 'Fronte'], ['tops', 'Radne ploče'], ['dims', 'Kote']] as const).map(([k, t]) => (
                <Label key={k} className={SWITCH}><Switch checked={layers[k]} onCheckedChange={v => setLayers({ ...layers, [k]: v })} />{t}</Label>
              ))}
            </div>
            <h2 className={H2}>Materijali na sceni<Tip k="scene.materials" align="left" /></h2>
            <div className="flex flex-col gap-2.5 text-sm">
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Slika za ponudu</DialogTitle>
              <DialogDescription>Foto-kvalitetan snimak trenutnog kadra u realnom prikazu (materijali, svetlo, senke). Ide na prvu stranu ponude kupcu.</DialogDescription>
            </DialogHeader>
            {([['Kadar', 'cam', [['cur', 'Trenutni'], ['front', 'Spreda'], ['corner', 'Iz ugla']]], ['Kvalitet', 'q', [['std', 'Standardno (~5 s)'], ['hi', 'Visoko (~40 s)']]], ['Veličina', 'size', [['fhd', '1920 × 1080'], ['big', '3000 × 2000']]]] as const).map(([label, key, opts]) => (
              <div key={key} className="flex flex-col gap-2 text-sm font-medium">{label}
                <Tabs value={shot[key] as string} onValueChange={v => { setShot({ ...shot, [key]: v }); setShotState(''); }}>
                  <TabsList aria-label={label}>{opts.map(([v, t]) => <TabsTrigger key={v} value={v} className="px-3 font-normal">{t}</TabsTrigger>)}</TabsList>
                </Tabs>
              </div>
            ))}
            <Label className={SWITCH}><Checkbox checked={shot.toOffer} onCheckedChange={() => setShot({ ...shot, toOffer: !shot.toOffer })} />Ubaci u ponudu (6 Ponuda)</Label>
            {shotState === 'busy' && <div role="status" className="text-sm text-muted-foreground">Renderujem…</div>}
            {shotState === 'done' && <Alert role="status" className="border-ok-strong bg-ok-soft"><AlertDescription className="text-ok">Slika je napravljena{shot.toOffer ? ' i dodata u ponudu.' : ' i preuzeta.'} <Link to="/ponuda">Otvori ponudu →</Link></AlertDescription></Alert>}
            {shotState === 'error' && <Alert role="alert" className="border-warn-line bg-warn-soft"><AlertDescription className="text-warn-ink">Slika nije napravljena (pregledač nije dozvolio ili je memorija puna). Probaj „Snimak PNG“.</AlertDescription></Alert>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShot(null)}>Zatvori</Button>
              <Button onClick={makeShot} disabled={shotState === 'busy'}>Napravi sliku</Button>
            </DialogFooter>
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
  // Sloped walls A / B (attic): [height at the A/B corner (0, 0), height at the far end].
  const ends = (g?: WallGeom): [number, number] => {
    if (!g) return [H, H];
    const hs: [number, number] = [wallHeightAt(room, g, 0), wallHeightAt(room, g, g.inner)];
    return Math.hypot(g.ax, g.ay) <= Math.hypot(g.ax + g.ux * g.L, g.ay + g.uy * g.L) ? hs : [hs[1], hs[0]];
  };
  const hA = ends(geoms.A), hB = ends(geoms.B);
  const s = 0.14, c30 = s * Math.cos(Math.PI / 6), s30 = s * 0.5;
  const P = ([x, y, z]: P3) => `${(430 + c30 * (x - y)).toFixed(1)},${(150 + s30 * (x + y) - s * z).toFixed(1)}`;
  const poly = (pts: P3[]) => pts.map(P).join(' ');
  const xs = room.walls.flatMap(w => [w.a?.x ?? 0, w.b?.x ?? 0]), ys = room.walls.flatMap(w => [w.a?.y ?? 0, w.b?.y ?? 0]);
  const W = Math.max(...xs) - 60, D = Math.max(...ys) - 60; // inner extent (shortcut: 120 mm walls, corner A/B at 0,0)

  // Room: wall A (y = 0), wall B (x = 0), floor; windows on A and B.
  const roomEls = layers.walls && <>
    <polygon points={poly([[0, 0, 0], [W, 0, 0], [W, 0, hA[1]], [0, 0, hA[0]]])} fill={pal.wallA} stroke={wallLine} />
    {geoms.B && <polygon points={poly([[0, 0, 0], [0, D, 0], [0, D, hB[1]], [0, 0, hB[0]]])} fill={pal.wallB} stroke={wallLine} />}
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
      if (k === 'profile') { const y = up || f.hinge === 'T' ? f.y + f.h - 5 : f.y + 5; segs.push([fp(f.x, y), fp(f.x + f.w, y)]); continue; }
      const len = k === 'knob' ? 1 : 160;
      if (!f.hinge || f.hinge === 'T') { const cx = f.x + f.w / 2, cy = f.hinge === 'T' ? f.y + f.h - Math.min(50, f.h * 0.3) : f.y + Math.min(50, f.h * 0.3); segs.push([fp(cx - len / 2, cy), fp(cx + len / 2, cy)]); continue; } // kip: handle at the bottom
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
            fill={isSel ? '#E9B394' : f.label === 'rerna' || f.label === 'MT' ? (pal.real ? pal.hob : 'none') : 'none'} stroke={isSel ? '#2E6B4E' : ink} strokeWidth={isSel ? 2 : sw} />
        ))}
        {/* Vitrina: glass pane inside the 20 mm aluminium frame (as model3d). */}
        {layers.fronts && fronts.filter(f => f.label === 'staklo').map((f, i) => (
          <polygon key={`g${i}`} points={poly([fp(f.x + 20, f.y + f.h - 20), fp(f.x + f.w - 20, f.y + f.h - 20), fp(f.x + f.w - 20, f.y + 20), fp(f.x + 20, f.y + 20)])}
            fill={isSel ? '#E9B394' : '#CFE0F2'} fillOpacity={0.75} stroke={isSel ? '#2E6B4E' : ink} strokeWidth={isSel ? 2 : sw} />
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
    for (const e of run.filter(x => x.kind === 'sink' || x.kind === 'oven' || x.hob)) {
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
    const c = installationCard(i, project.unit);
    return <g key={i.id}><title>{[c.title, ...c.lines].join('\n')}</title><circle cx={x} cy={y} r="9" fill={bg} stroke={pipe ? '#FFFFFF' : INK} strokeWidth={pipe ? 1.5 : 1} /><text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={fg}>{letter}</text></g>;
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
      <g opacity={inst ? 1 : 0} pointerEvents={inst ? undefined : 'none'}>{instMarks}</g>
      {tag}
    </svg>
  );
}

const decorBg = (d: Decor) => (d.img ? `url("${d.img}") center / cover` : d.color);
const KIND_TITLE: Record<Decor['kind'], string> = { uni: 'Jednobojni', wood: 'Drvo', stone: 'Kamen i beton' };

/** Decor catalog (decors.ts): EGGER and Kronospan boards or worktops sold in Serbia. */
function DecorPicker({ open, onOpenChange, current, onPick, list: all, title, text }: { open: boolean; onOpenChange: (o: boolean) => void; current?: Decor; onPick: (d: Decor) => void; list: Decor[]; title: string; text: string }) {
  const [q, setQ] = useState('');
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = all.filter(d => words.every(w => `${d.maker} ${d.code} ${d.name} ${KIND_TITLE[d.kind]}`.toLowerCase().includes(w)));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(820px,calc(100vw-32px))] max-w-none flex-col gap-3">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{text}</DialogDescription>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Traži: hrast, siva, K003, U708…" aria-label="Traži dekor" />
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {(['EGGER', 'Kronospan'] as const).flatMap(maker => (['uni', 'wood', 'stone'] as const).map(kind => {
            const list = hits.filter(d => d.maker === maker && d.kind === kind);
            return list.length ? (
              <section key={maker + kind} className="mb-4">
                <h3 className="m-0 mb-2 text-[13px] font-semibold">{maker} · {KIND_TITLE[kind]}</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
                  {list.map(d => (
                    <Button key={d.maker + d.code} variant="outline" size="none" aria-pressed={current === d} onClick={() => onPick(d)}
                      className="flex h-auto flex-col items-stretch gap-1 rounded-lg p-1.5 text-left font-normal whitespace-normal aria-pressed:border-primary aria-pressed:ring-[3px] aria-pressed:ring-primary/25">
                      <span className="block h-14 rounded border border-solid border-[#00000014]" style={{ background: decorBg(d) }} />
                      <span className="text-[12px] leading-tight font-semibold">{d.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{d.code} {d.surface}</span>
                    </Button>
                  ))}
                </div>
              </section>
            ) : null;
          }))}
          {!hits.length && <p className="text-[14px] text-muted-foreground">Nema dekora za „{q}”.</p>}
        </div>
        <p className="m-0 text-[12px] text-muted-foreground">{MAKER_NOTE} EGGER slike posle prijave na myEGGER možeš da ubaciš u Admin → Biblioteka → Materijali.</p>
      </DialogContent>
    </Dialog>
  );
}
