// Drawings screen (design/screens/Nacrti.html): front view per wall, plan from above with door swings, worktops.
// Everything is drawn from the project at the design's scale (0.2 px/mm for the example room).
// Exports (docs/NACRTI_I_IZVOZ.md): DXF and SVG of the shown drawing, PDF = print of all sheets (A3, vector via the browser's
// "Sačuvaj kao PDF"), GLB / OBJ+MTL from the engine's 3D model, CSV cut list.
// shortcut: per-part CNC DXF is not built yet (it says so).
import {
  backCutout, cutListRows, generateParts, hingeOf, installationHost, mergeParts, roomWalls, sceneBoxes, sideOf, toCsv, toDae, toGlb, toObj, wallGeoms, worktops, PRESETS,
  type Element, type Installation, type Project, type WallGeom,
} from 'engine';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { loadUnderlay, useUnderlay } from './underlay';
import { frontLayout } from './fronts';
import { Header } from './Header';
import { useResumed } from './projects';
import { Tip } from './help';
import { INSTALLATION_MARK } from './labels';
import { svgToDxf } from './dxf';
import { APP_FIXED, download, SegmentedControl } from './ui';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { markProject, useProject } from './store';

type View = 'front' | 'top' | 'pdt';
type Style = 'present' | 'combo' | 'tech';
type Show = { num: boolean; dim: boolean; open: boolean; inst: boolean };

const INK = '#1C1B19', ACC = '#B4440E', MUTED = '#5F5A52';
// Tailwind classes of design/screens/Nacrti.html (docs/UI_KOMPONENTE.md).
const SEG = 'flex gap-1 rounded-lg bg-background p-[3px]';
const BTN = 'min-h-10 rounded-md px-3 py-2 text-[13px] font-normal';
const K = 'text-muted-foreground';
const TITLES: Record<View, [string, string]> = {
  front: ['Pogled spreda · Zid ', 'Fronte, smer otvaranja (linije se sastaju na strani šarki), visine instalacija, kote'],
  top: ['Tlocrt · odozgo', 'Brojevi elemenata, krila otvorena prema strani šarki, gornji elementi isprekidano, vrata prostorije'],
  pdt: ['Radne ploče (PDT)', 'Krojevi radnih ploča, spoj, izrezi sa merama do centra, kant'],
};
const sw = (css: React.CSSProperties): React.CSSProperties => ({ flex: 'none', width: 26, height: 14, marginTop: 2, boxSizing: 'border-box', ...css });
const LEGEND: Record<View, [React.CSSProperties, string][]> = {
  front: [
    [sw({ borderTop: `1.5px dashed ${ACC}` }), 'Smer otvaranja: isprekidane linije se sastaju na strani šarki. Kod fronte MSP sastaju se dole (otvara se nadole).'],
    [sw({ background: 'repeating-linear-gradient(45deg, #8A8378 0 1px, #FFFFFF 1px 5px)', border: `1px solid ${INK}` }), 'Šrafirano: slepi deo ugaonog elementa i filer.'],
    [sw({ border: `1.5px dashed ${ACC}` }), 'Izrez u poleđini zbog instalacija (automatski).'],
    [sw({ background: INK }), 'Broj elementa, isti u krojnoj listi i na nalepnicama.'],
  ],
  top: [
    [sw({ borderTop: `1.5px solid ${INK}` }), 'Puna linija ispred elementa: otvoreno krilo, počinje od šarki.'],
    [sw({ borderTop: `1.5px dashed ${ACC}` }), 'Gornji elementi i njihova krila (isprekidano).'],
    [sw({ background: `repeating-linear-gradient(45deg, ${INK} 0 1px, #FFFFFF 1px 5px)`, border: `1px solid ${INK}` }), 'Zidovi i kanal.'],
    [sw({ borderTop: `1px dashed ${MUTED}` }), 'Krug otvaranja vrata prostorije, fioke i fronta MSP.'],
  ],
  pdt: [
    [sw({ background: ACC }), 'Kantovana ivica (prednja).'],
    [sw({ borderTop: `1.5px dashed ${INK}` }), 'Spoj dve radne ploče.'],
    [sw({ borderTop: '1px solid #1E50C8' }), 'Mera do centra izreza (od leve i od prednje ivice).'],
  ],
};
const EXPORTS: [string, [string, string, string][]][] = [
  ['2D — CAD i štampa', [['DXF', 'Nacrt sa slojevima', 'AutoCAD, BricsCAD, DraftSight, LibreCAD, QCAD'], ['PDF', 'Vektorski PDF', 'štampa A3/A4, slanje kupcu'], ['SVG', 'Vektorska slika', 'Inkscape, Illustrator, web']]],
  ['3D — model kuhinje', [['GLB', 'glTF 2.0', 'Blender, three.js, SketchUp (dodatak), web'], ['OBJ', 'OBJ + MTL', 'Blender, 3ds Max, Cinema 4D, SketchUp'], ['DAE', 'Collada', 'SketchUp, starije verzije programa']]],
  ['Proizvodnja', [['CSV', 'Krojna lista za pilanu', 'Excel, programi za optimizaciju'], ['DXF', 'Delovi pojedinačno (CNC)', 'kasnije: CNC, BXF']]],
];
const SIDE_NAME = { L: 'levo', R: 'desno', LR: 'levo + desno', down: 'dole', none: '—' } as const;

export function Drawings() {
  const project = useProject(s => s.project);
  const navigate = useNavigate();
  const setUnderlay = useUnderlay(s => s.set);
  const fileRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const [view, setView] = useResumed<View>('drawings.tab', 'front');
  const [style, setStyle] = useState<Style>('combo');
  const [show, setShow] = useState<Show>({ num: true, dim: true, open: true, inst: true });
  const [toast, setToast] = useState('');
  // Progress (docs/TOK_PROJEKTA.md): opening Spreda and Odozgo counts as seen.
  const seen = project?.marks?.drawingsSeen;
  useEffect(() => { if ((view === 'front' || view === 'top') && !seen?.includes(view)) markProject({ drawingsSeen: [...(seen ?? []), view] }); }, [view, seen]);
  // Sheets to print (null = not printing) and the paper: drawings always print landscape (user 2026-11-19).
  const [sheets, setSheets] = useState<{ list: [View, string][]; paper: Paper } | null>(null);
  useEffect(() => {
    if (!sheets) return;
    // An unnamed @page rule is the one browsers honour for the print dialog's orientation; it lives only while printing.
    const page = document.createElement('style');
    page.textContent = `@page { size: ${sheets.paper} landscape; margin: 10mm; }`;
    document.head.appendChild(page);
    const done = () => setSheets(null);
    window.addEventListener('afterprint', done, { once: true });
    window.print();
    return () => { window.removeEventListener('afterprint', done); page.remove(); };
  }, [sheets]);
  if (!project) return <Navigate to="/" replace />;

  const walls = roomWalls(project.room).filter(w => project.elements.some(e => e.wallId === w.id)).map(w => w.id).sort();
  const wallId = params.get('zid') ?? walls[0] ?? 'A';
  const slug = project.name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'projekat';
  const file = { front: `zid${wallId}-spreda`, top: 'tlocrt', pdt: 'radne-ploce' }[view];
  const [title, sub] = TITLES[view];
  const fullTitle = view === 'front' ? title + wallId : title;
  const toggle = (k: keyof Show) => setShow({ ...show, [k]: !show[k] });
  const allSheets: [View, string][] = [...walls.map((w): [View, string] => ['front', w]), ['top', ''], ['pdt', '']];

  const exportAs = (fmt: string, name: string) => {
    const svg = document.querySelector<SVGSVGElement>('main svg[data-mm]');
    const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
    const boxes = () => sceneBoxes(project, dims.worktopThickness, dims.worktopDepth);
    const base = `${slug}_${file}`;
    let saved: string | null = null;
    if (fmt === 'DXF' && name.startsWith('Nacrt') && svg) download(saved = `${base}.dxf`, svgToDxf(svg), 'application/dxf');
    else if (fmt === 'SVG' && svg) {
      const copy = svg.cloneNode(true) as SVGSVGElement;
      copy.setAttribute('font-family', 'IBM Plex Mono, monospace');
      download(saved = `${base}.svg`, new XMLSerializer().serializeToString(copy), 'image/svg+xml');
    } else if (fmt === 'PDF') { setSheets({ list: allSheets, paper: 'A3' }); return; }
    else if (fmt === 'GLB') download(saved = `${slug}.glb`, toGlb(boxes(), project.name), 'model/gltf-binary');
    else if (fmt === 'DAE') download(saved = `${slug}.dae`, toDae(boxes(), project.name), 'model/vnd.collada+xml');
    else if (fmt === 'OBJ') {
      const { obj, mtl } = toObj(boxes(), slug);
      download(`${slug}.mtl`, mtl, 'text/plain');
      download(saved = `${slug}.obj`, obj, 'text/plain');
      saved += ` + ${slug}.mtl`;
    } else if (fmt === 'CSV') download(saved = `${slug}_krojna-lista.csv`, '\uFEFF' + toCsv(cutListRows(mergeParts(generateParts(project)), project.materials, project.unit)), 'text/csv;charset=utf-8');
    setToast(saved ? `Preuzeto: ${saved}` : `${fmt} (${name}) još nije gotov — dolazi u sledećoj verziji.`);
  };

  return (
    <div className={APP_FIXED}>
      <Header />
      <div className="flex flex-wrap items-center gap-2.5 border-0 border-b border-solid border-border bg-white px-4 py-2.5">
        <Tabs value={view} onValueChange={v => setView(v as View)}>
          <TabsList aria-label="Nacrt" className={SEG}>
            {(['front', 'top', 'pdt'] as View[]).map(v => (
              <TabsTrigger key={v} value={v} className="min-h-9 rounded-md border-0 bg-transparent px-3 py-[7px] text-[13px] text-foreground data-[state=active]:bg-foreground data-[state=active]:font-semibold data-[state=active]:text-white">
                {{ front: 'Spreda (po zidu)', top: 'Odozgo · otvaranje', pdt: 'Radne ploče' }[v]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SegmentedControl label="Stil nacrta" className={SEG} value={style} onChange={setStyle}
          itemClass="min-h-9 rounded-md border-0 bg-transparent px-2.5 py-[7px] font-sans text-[13px] text-foreground data-[state=on]:bg-white data-[state=on]:font-semibold data-[state=on]:shadow-[0_0_0_1px_var(--color-foreground)]"
          options={[['present', 'Prezentacija'], ['combo', 'Kombinovano'], ['tech', 'Tehnički']] as const} />
        <Tip k="drawings.style" />
        <span className="h-7 w-px bg-border" />
        {([['num', 'Brojevi', 'drawings.num'], ['dim', 'Kote', 'drawings.dim'], ['open', 'Smer otvaranja', 'drawings.open'], ['inst', 'Instalacije', 'drawings.inst']] as const).map(([k, t, tip]) => (
          <Fragment key={k}>
            <label className="flex min-h-10 cursor-pointer items-center gap-1.5 text-[13px]"><Checkbox className="size-4" checked={show[k]} onCheckedChange={() => toggle(k)} />{t}</label>
            <Tip k={tip} />
          </Fragment>
        ))}
        <div className="ml-auto flex flex-wrap gap-1.5">
          {/* Step Nacrti is done when the user marks the drawings (and the opening sides) as checked. */}
          <Button variant="outline" size="none" className={BTN} aria-pressed={!!project.marks?.drawingsReviewed} title="Nacrti i strane otvaranja su provereni (korak 2 · Nacrti)"
            onClick={() => markProject({ drawingsReviewed: !project.marks?.drawingsReviewed })}>{project.marks?.drawingsReviewed ? '✓ Pregledano' : 'Pregledano'}</Button>
          <Button variant="outline" size="none" className={BTN} onClick={() => setSheets({ list: [[view, wallId]], paper: 'A4' })}>Štampaj</Button>
          <Button size="none" className={cn(BTN, 'font-semibold')} onClick={() => setSheets({ list: allSheets, paper: 'A3' })}>PDF A3 — svi nacrti</Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 print:h-auto print:overflow-visible">
        <main className="flex min-h-0 min-w-0 flex-auto flex-col gap-2.5 overflow-auto px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="m-0 text-[20px]">{fullTitle}</h1>
            <span className="text-[13px] text-muted-foreground">{sub}</span>
            {view === 'front' && <Link className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-md bg-foreground px-3 text-[13px] font-semibold text-white no-underline" to={`/zid/${wallId}`}>Uredi instalacije ovog zida<span aria-hidden="true">→</span></Link>}
          </div>
          <Sheet project={project} view={view} wallId={wallId} show={show} style={style} />
        </main>
        <aside aria-label="Uz nacrt" className="box-border flex min-h-0 flex-[0_0_320px] flex-col gap-3.5 overflow-y-auto border-0 border-l border-solid border-border bg-white p-[18px]">
          <h2 className="m-0 flex items-center text-[17px]">Izvoz<Tip k="drawings.export" /></h2>
          {EXPORTS.map(([g, items]) => (
            <div key={g} className="flex flex-col gap-1.5">
              <div className="text-[12px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{g}</div>
              {items.map(([fmt, name, apps]) => (
                <Button key={fmt + name} variant="outline" size="none" onClick={() => exportAs(fmt, name)}
                  className="min-h-12 justify-start gap-2.5 rounded-lg px-2.5 py-2 text-left font-normal whitespace-normal">
                  <span className="box-border min-w-[38px] flex-none rounded bg-foreground px-1.5 py-1 text-center font-mono text-[11px] font-semibold text-white">{fmt}</span>
                  <span className="flex flex-col"><span className="text-[13px] font-semibold">{name}</span><span className="text-[12px] text-muted-foreground">{apps}</span></span>
                </Button>
              ))}
            </div>
          ))}
          {toast && <div role="status" className="rounded-md bg-ok-soft p-2.5 text-[13px] leading-[1.45] text-ok">{toast}</div>}
          <Button variant="outline" size="none" className="min-h-11 rounded-md border-dashed border-muted-foreground px-3 py-[5px] text-[13px] font-normal whitespace-normal" onClick={() => fileRef.current?.click()}>Uvezi plan stana (DXF / PDF) kao podlogu</Button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf,.dxf" hidden onChange={async ev => {
            const f = ev.target.files?.[0];
            ev.target.value = '';
            if (!f) return;
            try { setUnderlay(await loadUnderlay(f)); navigate('/projekat'); }
            catch (e) { setToast(e instanceof Error && /[čćšžđ]|DXF|PDF/.test(e.message) ? e.message : 'Plan nije učitan. Uvozi se slika (PNG / JPG), PDF ili DXF.'); }
          }} />
          <h2 className="m-0 border-0 border-t border-solid border-border pt-1.5 text-[17px]">Legenda</h2>
          {LEGEND[view].map(([st, t]) => <div key={t} className="flex items-start gap-2.5 text-[13px] leading-[1.45]"><span style={st} /><span>{t}</span></div>)}
          <div className="flex flex-col gap-2 border-0 border-t border-solid border-border pt-3.5">
            <h3 className="m-0 text-[15px]">Strana otvaranja</h3>
            <Table className="text-[13px]">
              <TableHeader><TableRow>{['Element', 'Fronta', 'Šarke'].map(t => <TableHead key={t} className="border-0 bg-transparent p-1.5 text-[13px] font-medium text-muted-foreground first:pl-0 last:pr-0">{t}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {project.elements.filter(e => e.kind !== 'filler').map(e => (
                  <TableRow key={e.id} className="[&>td]:border-0 [&>td]:border-t [&>td]:border-solid [&>td]:border-line-soft [&>td]:p-1.5 [&>td]:first:pl-0 [&>td]:last:pr-0">
                    <TableCell className="font-mono whitespace-nowrap">{e.label}</TableCell><TableCell>{frontText(e)}</TableCell><TableCell className="font-semibold">{SIDE_NAME[hingeOf(e)]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="m-0 text-[12px] leading-[1.45] text-muted-foreground">Levo/desno gledano spreda, kad stojiš ispred elementa. Menja se u 2D editoru (svojstva elementa).</p>
          </div>
        </aside>
      </div>
      {sheets && (
        // Print copies: hidden on screen; the print rule in index.css hides everything else.
        <div className="absolute top-0 left-0 hidden w-full print:visible print:block print:**:visible">
          {sheets.list.map(([v, w], i) => <Sheet key={v + w} project={project} view={v} wallId={w} show={show} style={style} paper={sheets.paper}
            no={[i + 1, sheets.list.length]} />)}
        </div>
      )}
    </div>
  );
}

type Paper = 'A4' | 'A3';

/**
 * One drawing sheet: the view and, except for the presentation style, the title block. Printing passes the paper and the
 * sheet's number among the printed sheets; on screen the block shows the design's A3 values.
 */
function Sheet({ project, view, wallId, show, style, paper = 'A3', no }: {
  project: Project; view: View; wallId: string; show: Show; style: Style; paper?: Paper; no?: [number, number];
}) {
  const title = view === 'front' ? TITLES.front[0] + wallId : TITLES[view][0];
  return (
    <div className={cn('flex flex-col items-center gap-2.5 bg-white p-3', style === 'present' ? 'rounded-lg border border-solid border-border' : 'border-2 border-solid border-foreground',
      style === 'tech' && 'grayscale-100 contrast-115',
      // Printed sheet: landscape, one per page; heights = paper height − 20 mm margins (the @page rule is added while printing).
      no && cn('box-border break-after-page justify-center [&_svg]:max-w-none', paper === 'A3' ? 'h-[276mm] [&_svg]:max-h-[236mm]' : 'h-[189mm] [&_svg]:max-h-[150mm]'))}>
      {view === 'front' && <FrontView project={project} wallId={wallId} show={show} />}
      {view === 'top' && <TopView project={project} show={show} />}
      {view === 'pdt' && <WorktopView project={project} show={show} />}
      {style !== 'present' && (
        <Table aria-label="Sastavnica nacrta" className="w-auto min-w-[420px] self-end border-[1.5px] border-solid border-foreground font-mono text-[11px] [&_td]:border [&_td]:border-solid [&_td]:border-foreground [&_td]:px-2 [&_td]:py-1 [&_td]:align-middle">
          <TableBody>
            <TableRow><TableCell className={K}>Projekat</TableCell><TableCell colSpan={3} className="font-semibold">{project.name}</TableCell></TableRow>
            <TableRow><TableCell className={K}>Nacrt</TableCell><TableCell>{title}</TableCell><TableCell className={K}>Razmera</TableCell><TableCell>{paper === 'A3' ? '1:20 (A3)' : '≈1:28 (A4, umanjeno)'}</TableCell></TableRow>
            <TableRow><TableCell className={K}>Radionica</TableCell><TableCell>[NAZIV RADIONICE]</TableCell><TableCell className={K}>Mere</TableCell><TableCell>{project.unit}</TableCell></TableRow>
            <TableRow><TableCell className={K}>Crtao</TableCell><TableCell>[IME]</TableCell><TableCell className={K}>List</TableCell><TableCell>{no ? `${no[0]} / ${no[1]}` : `${{ front: 1, top: 2, pdt: 3 }[view]} / 3`}</TableCell></TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function frontText(e: Element) {
  const door = (w: number) => w - 3;
  switch (e.kind) {
    case 'appliance-front': return 'fronta MSP';
    case 'drawer': return `${e.drawerFronts?.length ?? 0} fioke`;
    case 'oven': return 'fioka ispod rerne';
    case 'tall': return `krilo ${door(e.width)} + ${door(e.width)}`;
    case 'corner-blind': return `krilo ${door(e.width - (e.blindWidth ?? 0))}`;
    default: return e.doors === 2 ? `2 krila ${Math.floor((e.width - 6) / 2)}` : `krilo ${door(e.width)}`;
  }
}

/** Dimension chain: line, ticks and centred texts between consecutive ticks (texts may be blank). */
function Chain({ x0, x1, y, ticks, texts, vertical = false, bold = false, side = -4 }: {
  x0: number; x1: number; y: number; ticks: number[]; texts: (string | null)[]; vertical?: boolean; bold?: boolean; side?: number;
}) {
  const L = (a: number, b: number, c: number, d: number, k: string) => <line key={k} x1={a} y1={b} x2={c} y2={d} />;
  return vertical ? (
    <>
      {L(y, x0, y, x1, 'l')}
      {ticks.map(t => L(y - 5, t, y + 5, t, `t${t}`))}
      <g stroke="none" textAnchor={side < 0 ? 'end' : 'start'}>
        {texts.map((t, i) => t && <text key={i} x={y + (side < 0 ? -8 : 8)} y={Math.round((ticks[i] + ticks[i + 1]) / 2 + 4)} fontWeight={bold ? 600 : undefined}>{t}</text>)}
      </g>
    </>
  ) : (
    <>
      {L(x0, y, x1, y, 'l')}
      {ticks.map(t => L(t, y - 5, t, y + 5, `t${t}`))}
      <g stroke="none" textAnchor="middle">
        {texts.map((t, i) => t && <text key={i} x={(ticks[i] + ticks[i + 1]) / 2} y={y - 4} fontWeight={bold ? 600 : undefined}>{t}</text>)}
      </g>
    </>
  );
}

/** Ticks and lengths of a run of [start, end] segments between `from` and `to` (gaps get their length too). */
function chainOf(segs: [number, number][], from: number, to: number) {
  const ticks = [from], texts: string[] = [];
  let x = from;
  for (const [s, e] of [...segs].sort((a, b) => a[0] - b[0])) {
    if (s > x) { texts.push(String(s - x)); ticks.push(s); }
    texts.push(String(e - s)); ticks.push(e); x = e;
  }
  if (to > x) { texts.push(String(to - x)); ticks.push(to); }
  return { ticks, texts };
}

// data-mm: px per mm (for the DXF export), data-layer: default DXF layer of the drawing.
const svgProps = (label: string, k: number, layer: string, h = 690) => ({
  viewBox: `0 0 900 ${h}`, role: 'img', 'aria-label': label, className: 'h-auto max-h-[calc(100vh-330px)] w-full max-w-[1000px] font-mono', 'data-mm': k, 'data-layer': layer,
});

function FrontView({ project, wallId, show }: { project: Project; wallId: string; show: Show }) {
  const geoms = wallGeoms(project.room), g = geoms[wallId];
  if (!g) return null;
  const side = 1 as const;
  const here = <T extends { wallId?: string; side?: 1 | -1 }>(x: T) => x.wallId === wallId && sideOf(geoms, x) === side;
  const H = project.room.height, W = g.inner;
  const k = Math.min(640 / W, 520 / H);
  const x0 = 120, floor = 600, X = (mm: number) => x0 + mm * k, Y = (mm: number) => floor - mm * k;
  const els = project.elements.filter(here);
  const low = els.filter(e => e.kind !== 'wall'), up = els.filter(e => e.kind === 'wall');
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  // Fronts without a carcass (MSP, filler) stand on the plinth of their run.
  const bottom = (e: Element) => (e.kind === 'wall' ? e.elevation ?? 0 : e.legs ?? (low.find(x => x.legs)?.legs ?? dims.plinthHeight));
  const lowRun: [number, number] = low.length ? [Math.min(...low.map(e => e.offset)), Math.max(...low.map(e => e.offset + e.width))] : [0, 0];
  const legs = low.find(e => e.legs)?.legs ?? dims.plinthHeight;
  const carcassTop = legs + (low.find(e => e.kind !== 'tall')?.height ?? dims.baseCarcassHeight);
  const wtTop = carcassTop + dims.worktopThickness;
  const upBottom = up[0]?.elevation ?? 0, upTop = upBottom + (up[0]?.height ?? 0);
  const openings = project.room.openings.filter(here);
  const inst = project.room.installations.filter(here);

  const doors: React.ReactNode[] = [], handles: React.ReactNode[] = [], open: React.ReactNode[] = [], nums: React.ReactNode[] = [];
  for (const e of els) {
    const ex = X(e.offset), ey = Y(bottom(e) + e.height), ew = e.width * k, eh = e.height * k;
    const { fronts } = frontLayout(e, project.rules);
    const blind = e.kind === 'corner-blind' ? (e.blindWidth ?? 0) * k : 0;
    if (blind) doors.push(<rect key={`${e.id}-b`} x={ex} y={ey} width={blind} height={eh} fill="url(#hatchF)" stroke={INK} strokeWidth="0.8" />);
    if (e.kind === 'filler') { doors.push(<rect key={e.id} x={ex} y={ey} width={ew} height={eh} fill="url(#hatchF)" stroke={INK} strokeWidth="0.8" />); }
    else fronts.forEach((f, i) => {
      const fx = ex + f.x * k + 0.3, fy = ey + f.y * k + 0.2, fw = f.w * k - 0.6, fh = f.h * k - 0.4;
      doors.push(<rect key={`${e.id}-${i}`} x={fx} y={fy} width={fw} height={fh} fill="#FFFFFF" stroke={INK} strokeWidth="1.2" />);
      const isDrawer = e.kind === 'drawer' || e.kind === 'oven';
      if (f.hinge) {
        const hx = f.hinge === 'L' ? fx : fx + fw, ox = f.hinge === 'L' ? fx + fw : fx;
        open.push(<path key={`${e.id}-o${i}`} d={`M${ox} ${fy}L${hx} ${fy + fh / 2}L${ox} ${fy + fh}`} />);
        if (e.kind === 'wall') { const hxl = f.hinge === 'L' ? fx + fw - 14 : fx + 14; handles.push(<line key={`${e.id}-h${i}`} x1={hxl} y1={fy + fh - 9.4} x2={hxl} y2={fy + fh - 29.4} />); }
        else if (e.doors === 2) { const hxl = f.hinge === 'L' ? fx + fw - 10 : fx + 10; handles.push(<line key={`${e.id}-h${i}`} x1={hxl} y1={fy + 9.4} x2={hxl} y2={fy + 29.4} />); }
        else { const a = f.hinge === 'L' ? fx + fw - 24 : fx + 10; handles.push(<line key={`${e.id}-h${i}`} x1={a} y1={fy + 9.4} x2={a + 14} y2={fy + 9.4} />); }
      } else if (e.kind === 'appliance-front') {
        open.push(<path key={`${e.id}-o`} d={`M${fx} ${fy}L${fx + fw / 2} ${fy + fh}L${fx + fw} ${fy}`} />);
        handles.push(<line key={`${e.id}-h`} x1={fx + fw / 2 - 15} y1={fy + 7.4} x2={fx + fw / 2 + 15} y2={fy + 7.4} />);
      } else if (isDrawer) {
        open.push(<path key={`${e.id}-o${i}`} d={`M${fx} ${fy + fh / 2}L${fx + fw} ${fy + fh / 2}`} strokeDasharray="2 3" />);
        handles.push(<line key={`${e.id}-h${i}`} x1={fx + fw / 2 - 15} y1={fy + 7.4} x2={fx + fw / 2 + 15} y2={fy + 7.4} />);
      }
    });
    const cx = ex + blind + (ew - blind) / 2;
    if (e.kind === 'wall') nums.push(<g key={e.id}><rect x={ex + 8} y={ey + 6} width="24" height="15" fill={INK} /><text x={ex + 20} y={ey + 17} fill="#FFFFFF">{e.label}</text></g>);
    else nums.push(<g key={e.id}><rect x={cx - 12} y={Y(bottom(e)) - 20} width="24" height="15" fill={INK} /><text x={cx} y={Y(bottom(e)) - 9} fill="#FFFFFF">{e.label}</text></g>);
    if (e.kind === 'appliance-front') nums.push(<text key={`${e.id}-t`} x={cx} y={ey + eh / 2 + 2} fontWeight="500" fill={MUTED}>MSP</text>);
    if (blind) nums.push(<text key={`${e.id}-s`} x={ex + blind / 2} y={ey + eh / 2 + 4} fontWeight="500" fill={MUTED}>slepo</text>);
  }

  // Installations: pipes get a dashed line to the floor with their height; outlets clear of a carcass get "h…".
  const instMarks = inst.map((i: Installation, n) => {
    const [letter, bg, fg] = INSTALLATION_MARK[i.kind];
    const cx = X(i.offset), cy = Y(i.height), pipe = i.kind === 'water' || i.kind === 'drain';
    const host = installationHost(project, i);
    return (
      <g key={i.id}>
        <circle cx={cx} cy={cy} r="8" fill={bg} {...(fg !== '#FFFFFF' && { stroke: INK, strokeWidth: 0.8 })} />
        <text x={cx} y={cy + 3.5} textAnchor="middle" fontWeight="700" fill={fg}>{letter}</text>
        {pipe && <><line x1={cx} y1={cy + 8} x2={cx} y2={floor} stroke={bg} strokeWidth="0.8" strokeDasharray="2 2" />
          <text x={n % 2 === 0 ? cx - 14 : cx + 6} y={floor - 5} textAnchor={n % 2 === 0 ? 'end' : 'start'} fill={bg}>h{i.height}</text></>}
        {!pipe && !host && <text x={cx + 12} y={cy + 4} fill={INK}>h{i.height}</text>}
      </g>
    );
  });
  const cut = low.map(e => [e, backCutout(project, e)] as const).find(([, c]) => c);
  const lowSegs = low.map(e => [e.offset, e.offset + e.width] as [number, number]);
  const upSegs = up.map(e => [e.offset, e.offset + e.width] as [number, number]);
  const bottomChain = chainOf(lowSegs, lowRun[0], lowRun[1]);
  const topChain = chainOf(upSegs, 0, W);
  const heights = [0, legs, carcassTop, wtTop, ...(up.length ? [upBottom, upTop] : []), H];

  return (
    <svg {...svgProps(`Pogled spreda na zid ${wallId} sa brojevima elemenata, smerom otvaranja, instalacijama i kotama`, k, 'KONTURA')}>
      <defs>
        <pattern id="hatchF" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#8A8378" strokeWidth="1" /></pattern>
      </defs>
      <text x={x0 + (W * k) / 2} y="40" textAnchor="middle" fontSize="13" fontWeight="600" fill={INK} data-layer="TEKST">Zid {wallId} · pogled spreda</text>
      <rect x={x0} y={Y(H)} width={W * k} height={H * k} fill="none" stroke={INK} strokeWidth="1.2" />
      <line x1={x0 - 30} y1={floor} x2={X(W) + 30} y2={floor} stroke={INK} strokeWidth="2" />
      {openings.filter(o => o.kind === 'window').map(o => {
        const x = X(o.offset), y = Y(o.sill + o.height), w = o.width * k, h = o.height * k;
        return (
          <g key={o.id} data-layer="OTVORI">
            <rect x={x} y={y} width={w} height={h} fill="#F4F7FC" stroke={INK} strokeWidth="1.2" />
            <rect x={x + 8} y={y + 8} width={w / 2 - 12} height={h - 16} fill="none" stroke={INK} strokeWidth="0.8" />
            <rect x={x + w / 2 + 4} y={y + 8} width={w / 2 - 12} height={h - 16} fill="none" stroke={INK} strokeWidth="0.8" />
            <line x1={x + w / 2 - 4} y1={y + h / 2} x2={x + w / 2 + 4} y2={y + h / 2} stroke={INK} strokeWidth="2" />
          </g>
        );
      })}
      {low.length > 0 && <>
        <rect x={X(lowRun[0])} y={Y(legs)} width={(lowRun[1] - lowRun[0]) * k} height={legs * k} fill="#E7E1D5" stroke={INK} strokeWidth="0.8" />
        <rect x={X(lowRun[0])} y={Y(wtTop)} width={(lowRun[1] - lowRun[0]) * k} height={dims.worktopThickness * k} fill="#C9B79A" stroke={INK} strokeWidth="0.8" data-layer="RADNA_PLOCA" />
      </>}
      <g data-layer="FRONTE">{doors}</g>
      <g stroke={INK} strokeWidth="2.5" data-layer="FRONTE">{handles}</g>
      <g opacity={show.open ? 1 : 0} fill="none" stroke={ACC} strokeWidth="1" strokeDasharray="5 3" data-layer="OTVARANJE">{open}</g>
      <g opacity={show.num ? 1 : 0} fontSize="11" fontWeight="600" textAnchor="middle" data-layer="TEKST">{nums}</g>
      <g opacity={show.inst ? 1 : 0} fontSize="10" data-layer="INSTALACIJE">
        {instMarks}
        {cut && (() => {
          const [e, c] = cut as readonly [Element, NonNullable<ReturnType<typeof backCutout>>];
          const cx = X(e.offset + c.cx), cy = Y(bottom(e) + c.cy), w = c.w * k, h = c.h * k;
          const rx = cx + w / 2, ry = cy - h / 2;
          return <>
            <rect x={cx - w / 2} y={ry} width={w} height={h} fill="none" stroke={ACC} strokeWidth="1.2" strokeDasharray="4 2" />
            <line x1={rx} y1={ry} x2={rx + 52} y2={ry - 68} stroke={ACC} strokeWidth="0.8" />
            <rect x={rx + 2} y={ry - 82} width="148" height="18" fill="#FBE3D3" />
            <text x={rx + 76} y={ry - 69} textAnchor="middle" fontSize="10" fontWeight="600" fill="#7C2D0A">Pažnja: izrez poleđine {c.w}×{c.h}</text>
          </>;
        })()}
      </g>
      <g opacity={show.dim ? 1 : 0} fontSize="10" fill={INK} stroke={INK} strokeWidth="0.8" data-layer="KOTE">
        {low.length > 0 && <>
          <Chain x0={X(lowRun[0])} x1={X(lowRun[1])} y={630} ticks={bottomChain.ticks.map(X)} texts={bottomChain.texts} />
          <Chain x0={X(lowRun[0])} x1={X(lowRun[1])} y={660} ticks={[X(lowRun[0]), X(lowRun[1])]} texts={[String(lowRun[1] - lowRun[0])]} bold />
        </>}
        {up.length > 0 && <Chain x0={x0} x1={X(W)} y={130} ticks={topChain.ticks.map(X)} texts={topChain.texts} />}
        <Chain x0={Y(H)} x1={floor} y={X(W) + 40} ticks={heights.map(Y)} texts={heights.slice(1).map((h, i) => String(h - heights[i]))} vertical side={1} />
        <line x1={X(W) + 85} y1={Y(H)} x2={X(W) + 85} y2={floor} />
        <line x1={X(W) + 80} y1={Y(H)} x2={X(W) + 90} y2={Y(H)} /><line x1={X(W) + 80} y1={floor} x2={X(W) + 90} y2={floor} />
        <text x={X(W) + 98} y={(Y(H) + floor) / 2 + 4} stroke="none" fontWeight="600" transform={`rotate(-90 ${X(W) + 98} ${(Y(H) + floor) / 2 + 4})`} textAnchor="middle">{H}</text>
      </g>
    </svg>
  );
}

/** Plan from above: room walls hatched, window/door/radiator/duct, units, wall units dashed, door swings, numbers, chains. */
function TopView({ project, show }: { project: Project; show: Show }) {
  const room = project.room, geoms = wallGeoms(room);
  const walls = roomWalls(room);
  // Inner rectangle of the room (shortcut: rectangular rooms; drawn rooms of other shapes show their bounding box).
  const pts = walls.flatMap(w => [w.a, w.b]);
  const th = walls[0]?.thickness ?? 120;
  const minX = Math.min(...pts.map(p => p.x)) + th / 2, maxX = Math.max(...pts.map(p => p.x)) - th / 2;
  const minY = Math.min(...pts.map(p => p.y)) + th / 2, maxY = Math.max(...pts.map(p => p.y)) - th / 2;
  const k = Math.min(640 / (maxX - minX), 480 / (maxY - minY));
  const ox = 130, oy = 90, X = (x: number) => ox + (x - minX) * k, Y = (y: number) => oy + (y - minY) * k;
  const IW = (maxX - minX) * k, IH = (maxY - minY) * k, T = th * k;
  const pt = (g: WallGeom, along: number, out: number) => ({ x: X(g.ax + g.ux * (g.offA + along) + g.nx * out), y: Y(g.ay + g.uy * (g.offA + along) + g.ny * out) });
  const fill: Partial<Record<Element['kind'], string>> = { sink: '#EAF0F9', oven: '#5F5A52', tall: '#DCD3C2', filler: '#E2DACB' };

  const units: React.ReactNode[] = [], uppers: React.ReactNode[] = [], swings: React.ReactNode[] = [], upSwings: React.ReactNode[] = [], nums: React.ReactNode[] = [];
  for (const e of project.elements) {
    const g = geoms[e.wallId];
    if (!g) continue;
    const s = sideOf(geoms, e), face = (g.th / 2) * s, d = e.depth * s;
    const c = [pt(g, e.offset, face), pt(g, e.offset + e.width, face), pt(g, e.offset + e.width, face + d), pt(g, e.offset, face + d)];
    const x = Math.min(...c.map(p => p.x)), y = Math.min(...c.map(p => p.y)), w = Math.max(...c.map(p => p.x)) - x, h = Math.max(...c.map(p => p.y)) - y;
    const nx = g.nx * s, ny = g.ny * s, ux = g.ux, uy = g.uy;
    const front = (along: number, out = 0) => pt(g, along, face + d + out * s / k);
    if (e.kind === 'wall') {
      uppers.push(<rect key={e.id} x={x} y={y} width={w} height={h} />);
      const hinge = hingeOf(e), len = 0.4 * e.width * k / Math.SQRT2;
      const at = hinge === 'R' ? e.offset + e.width : e.offset, dir = hinge === 'R' ? -1 : 1;
      const p = front(at);
      upSwings.push(<line key={e.id} x1={p.x} y1={p.y} x2={p.x + (nx + ux * dir) * len} y2={p.y + (ny + uy * dir) * len} />);
      const lx = e.width * k >= 100 ? 20 : (e.width * k) / 2;
      const lp = pt(g, e.offset + lx / k, face + 22 * s / k);
      nums.push(<text key={e.id} x={lp.x} y={lp.y} fill={ACC}>{e.label}</text>);
      continue;
    }
    units.push(<rect key={e.id} x={x} y={y} width={w} height={h} fill={fill[e.kind] ?? '#F3F1EC'} stroke={INK} strokeWidth="1.2" />);
    if (e.kind === 'corner-blind' || e.kind === 'tall') {
      const b = e.kind === 'tall' ? e.width : e.blindWidth ?? 0;
      const from = e.kind === 'tall' || e.offset === 0 ? e.offset : e.offset + e.width - b;
      const p1 = pt(g, from, face), p2 = pt(g, from + b, face + d), p3 = pt(g, from + b, face), p4 = pt(g, from, face + d);
      units.push(<line key={`${e.id}-x1`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#8A8378" strokeWidth="0.8" />, <line key={`${e.id}-x2`} x1={p3.x} y1={p3.y} x2={p4.x} y2={p4.y} stroke="#8A8378" strokeWidth="0.8" />);
    }
    if (e.kind === 'sink') {
      const a = pt(g, e.offset + 20 / k, face + (14 / k) * s), b2 = pt(g, e.offset + e.width - 20 / k, face + ((14 + 78) / k) * s);
      units.push(<rect key={`${e.id}-bowl`} x={Math.min(a.x, b2.x)} y={Math.min(a.y, b2.y)} width={Math.abs(b2.x - a.x)} height={Math.abs(b2.y - a.y)} rx="8" fill="#FFFFFF" stroke={INK} strokeWidth="0.8" />);
    }
    // Door swings: full line from the hinge, 45° out of the front, 0.6 × leaf.
    const hinge = hingeOf(e);
    const leaf = (at: number, dir: number, width: number) => {
      const p = front(at), len = 0.6 * width * k / Math.SQRT2;
      swings.push(<line key={`${e.id}-${at}`} x1={p.x} y1={p.y} x2={p.x + (nx + ux * dir) * len} y2={p.y + (ny + uy * dir) * len} />);
    };
    const doorFrom = e.kind === 'corner-blind' && e.offset === 0 ? e.offset + (e.blindWidth ?? 0) : e.offset;
    const doorTo = e.kind === 'corner-blind' && e.offset !== 0 ? e.offset + e.width - (e.blindWidth ?? 0) : e.offset + e.width;
    if (hinge === 'LR') { leaf(e.offset, 1, e.width / 2); leaf(e.offset + e.width, -1, e.width / 2); }
    else if (hinge === 'L') leaf(doorFrom, 1, doorTo - doorFrom);
    else if (hinge === 'R') leaf(doorTo, -1, doorTo - doorFrom);
    else if (hinge === 'down') {
      const a = front(e.offset), b2 = front(e.offset + e.width), o = 36;
      swings.push(<path key={`${e.id}-d`} d={`M${a.x} ${a.y}L${a.x + nx * o} ${a.y + ny * o}L${b2.x + nx * o} ${b2.y + ny * o}L${b2.x} ${b2.y}`} strokeDasharray="3 3" strokeWidth="0.8" />);
    } else if (e.kind === 'drawer') {
      const parts = [12, 24, 36].map(o => { const a = front(e.offset + 4 / k), b2 = front(e.offset + e.width - 4 / k); return `M${a.x + nx * o} ${a.y + ny * o}L${b2.x + nx * o} ${b2.y + ny * o}`; });
      swings.push(<path key={`${e.id}-dr`} d={parts.join('')} strokeWidth="0.8" />);
    } else if (e.kind === 'oven') {
      const d2 = [4, e.width * k - 4].map(a => { const p = front(e.offset + a / k); return `M${p.x} ${p.y}L${p.x + nx * 20} ${p.y + ny * 20}`; });
      swings.push(<path key={`${e.id}-ov`} d={d2.join('')} strokeWidth="0.8" />);
    }
    // Number badge on the door area, 28.5 px back from the front (sink: 8.5 px, clear of the bowl).
    const mid = (doorFrom + doorTo) / 2, back = e.kind === 'sink' ? 8.5 : 28.5;
    const bp = pt(g, mid, face + d - back * s / k), dark = e.kind === 'oven';
    nums.push(<g key={e.id}><rect x={bp.x - 12} y={bp.y - 7.5} width="24" height="15" fill={dark ? '#FFFFFF' : INK} /><text x={bp.x} y={bp.y + 3.5} fill={dark ? INK : '#FFFFFF'}>{e.label}</text></g>);
  }

  // Openings and obstacles on walls.
  const extras: React.ReactNode[] = [];
  for (const o of room.openings) {
    const g = geoms[o.wallId];
    if (!g) continue;
    const a = pt(g, o.offset, -g.th / 2), b = pt(g, o.offset + o.width, g.th / 2);
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    if (o.kind === 'window') {
      const m1 = pt(g, o.offset, 0), m2 = pt(g, o.offset + o.width, 0);
      extras.push(<g key={o.id}><rect x={x} y={y} width={w} height={h} fill="#FFFFFF" stroke={INK} strokeWidth="1" /><line x1={m1.x} y1={m1.y} x2={m2.x} y2={m2.y} stroke={INK} strokeWidth="1" /></g>);
    } else {
      // Door leaf drawn open into the room, hinge at the opening's start for hinge R (design/screens/Nacrti.html).
      const s = sideOf(geoms, { wallId: o.wallId }), at = o.hinge === 'L' ? o.offset + o.width : o.offset, free = o.hinge === 'L' ? o.offset : o.offset + o.width;
      const hp = pt(g, at, (g.th / 2) * s), fp = pt(g, free, (g.th / 2) * s), r = o.width * k;
      const tip = { x: hp.x + g.nx * s * r, y: hp.y + g.ny * s * r };
      const label = pt(g, o.offset + o.width / 2, -(30 / k) * s);
      extras.push(<g key={o.id}>
        <rect x={x} y={y} width={w} height={h} fill="#FFFFFF" />
        <line x1={hp.x} y1={hp.y} x2={tip.x} y2={tip.y} stroke={INK} strokeWidth="1.5" />
        <path d={`M${fp.x} ${fp.y}A${r} ${r} 0 0 1 ${tip.x} ${tip.y}`} fill="none" stroke={MUTED} strokeWidth="1" strokeDasharray="5 3" />
        <text x={label.x} y={label.y} textAnchor="middle" fontSize="10" fill={MUTED}>vrata {o.width}</text>
      </g>);
    }
  }
  for (const o of room.obstacles ?? []) {
    if (o.x !== undefined && o.y !== undefined) {
      extras.push(<g key={o.id}><rect x={X(o.x)} y={Y(o.y)} width={o.width * k} height={o.depth * k} fill="url(#hatchT)" stroke={INK} strokeWidth="1" />
        <text x={X(o.x) - 6} y={Y(o.y) + (o.depth * k) / 2 + 5} textAnchor="end" fontSize="10" fill={MUTED}>{o.label ?? (o.kind === 'duct' ? 'kanal' : o.kind === 'column' ? 'stub' : 'ostalo')}</text></g>);
      continue;
    }
    const g = o.wallId ? geoms[o.wallId] : undefined;
    if (!g) continue;
    const s = sideOf(geoms, o), a = pt(g, o.offset ?? 0, (g.th / 2) * s), b = pt(g, (o.offset ?? 0) + o.width, (g.th / 2 + o.depth) * s);
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    const name = o.kind === 'radiator' ? 'radijator' : o.kind === 'chimney' ? 'dimnjak' : o.label ?? 'prepreka';
    extras.push(<g key={o.id}><rect x={x} y={y} width={w} height={h} fill={o.kind === 'radiator' ? '#D3D6D9' : 'url(#hatchT)'} stroke={INK} strokeWidth="0.8" />
      <text x={x - 8} y={y + h / 2 + 4} textAnchor="end" fontSize="10" fill={MUTED}>{name}</text></g>);
  }

  // Installations on the wall face, 8 px into the room.
  const instMarks = room.installations.map(i => {
    const g = geoms[i.wallId];
    if (!g) return null;
    const s = sideOf(geoms, i), p = pt(g, i.offset, (g.th / 2) * s + (8 / k) * s);
    const [letter, bg, fg] = INSTALLATION_MARK[i.kind];
    return <g key={i.id}><circle cx={p.x} cy={p.y} r="7" fill={bg} {...(fg !== '#FFFFFF' && { stroke: INK, strokeWidth: 0.6 })} /><text x={p.x} y={p.y + 3} fill={fg}>{letter}</text></g>;
  });

  // Chains: lower units along the top and left walls, openings along the bottom wall, totals.
  const top = walls.find(w => Math.abs(w.a.y - w.b.y) < 1 && Math.min(w.a.y, w.b.y) < minY);
  const left = walls.find(w => Math.abs(w.a.x - w.b.x) < 1 && Math.min(w.a.x, w.b.x) < minX);
  const bottomW = walls.find(w => Math.abs(w.a.y - w.b.y) < 1 && Math.max(w.a.y, w.b.y) > maxY);
  const lowOn = (id?: string) => project.elements.filter(e => e.wallId === id && e.kind !== 'wall');
  const along = (g: WallGeom, a: number) => pt(g, a, 0);
  const topSegs = top ? lowOn(top.id).map(e => [along(geoms[top.id], e.offset).x, along(geoms[top.id], e.offset + e.width).x].sort((p, q) => p - q) as [number, number]) : [];
  const leftSegs = left ? lowOn(left.id).map(e => [along(geoms[left.id], e.offset).y, along(geoms[left.id], e.offset + e.width).y].sort((p, q) => p - q) as [number, number]) : [];
  const doorSegs = bottomW ? room.openings.filter(o => o.wallId === bottomW.id).map(o => [along(geoms[bottomW.id], o.offset).x, along(geoms[bottomW.id], o.offset + o.width).x].sort((p, q) => p - q) as [number, number]) : [];
  const pxChain = (segs: [number, number][], from: number, to: number) => {
    const ticks = [from], texts: string[] = [];
    let x = from;
    for (const [s0, s1] of [...segs].sort((p, q) => p[0] - q[0])) {
      if (s0 > x + 0.5) { texts.push(String(Math.round((s0 - x) / k))); ticks.push(s0); }
      texts.push(String(Math.round((s1 - s0) / k))); ticks.push(s1); x = s1;
    }
    if (to > x + 0.5) { texts.push(String(Math.round((to - x) / k))); ticks.push(to); }
    return { ticks, texts };
  };
  const tc = topSegs.length ? pxChain(topSegs, Math.min(...topSegs.map(s => s[0])), Math.max(...topSegs.map(s => s[1]))) : null;
  const lc = leftSegs.length ? pxChain(leftSegs, oy, Math.max(...leftSegs.map(s => s[1]))) : null;
  const bc = doorSegs.length ? pxChain(doorSegs, ox, ox + IW) : null;

  return (
    <svg {...svgProps('Tlocrt kuhinje odozgo sa brojevima elemenata, smerom otvaranja krila i vratima prostorije', k, 'ZIDOVI')}>
      <defs>
        <pattern id="hatchT" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="1" /></pattern>
      </defs>
      <text x={ox + IW / 2} y="30" textAnchor="middle" fontSize="13" fontWeight="600" fill={INK} data-layer="TEKST">Tlocrt · pogled odozgo</text>
      <path d={`M${ox - T} ${oy - T} H${ox + IW + T} V${oy + IH + T} H${ox - T} Z M${ox} ${oy} V${oy + IH} H${ox + IW} V${oy} Z`} fill="url(#hatchT)" fillRule="evenodd" stroke={INK} strokeWidth="1.2" />
      <g data-layer="OTVORI">{extras}</g>
      <g data-layer="ELEMENTI_DONJI">{units}</g>
      <g fill="none" stroke={ACC} strokeWidth="1" strokeDasharray="4 3" data-layer="ELEMENTI_GORNJI">{uppers}</g>
      <g opacity={show.open ? 1 : 0} fill="none" stroke={INK} strokeWidth="1.4" data-layer="OTVARANJE">
        {swings}
        <g stroke={ACC} strokeDasharray="3 2">{upSwings}</g>
      </g>
      <g opacity={show.num ? 1 : 0} fontSize="11" fontWeight="600" textAnchor="middle" data-layer="TEKST">{nums}</g>
      <g opacity={show.inst ? 1 : 0} fontSize="9" fontWeight="700" textAnchor="middle" data-layer="INSTALACIJE">{instMarks}</g>
      <g opacity={show.dim ? 1 : 0} fontSize="10" fill={INK} stroke={INK} strokeWidth="0.8" data-layer="KOTE">
        {tc && <Chain x0={tc.ticks[0]} x1={tc.ticks.at(-1)!} y={oy - 40} ticks={tc.ticks} texts={tc.texts} />}
        {lc && <Chain x0={lc.ticks[0]} x1={lc.ticks.at(-1)!} y={ox - 50} ticks={lc.ticks} texts={lc.texts} vertical />}
        {bc && <Chain x0={ox} x1={ox + IW} y={oy + IH + 70} ticks={bc.ticks} texts={bc.texts} />}
        <Chain x0={ox} x1={ox + IW} y={oy + IH + 95} ticks={[ox, ox + IW]} texts={[String(Math.round(maxX - minX))]} bold />
        <line x1={ox + IW + 60} y1={oy} x2={ox + IW + 60} y2={oy + IH} />
        <line x1={ox + IW + 55} y1={oy} x2={ox + IW + 65} y2={oy} /><line x1={ox + IW + 55} y1={oy + IH} x2={ox + IW + 65} y2={oy + IH} />
        <text x={ox + IW + 72} y={oy + IH / 2} stroke="none" fontWeight="600" transform={`rotate(-90 ${ox + IW + 72} ${oy + IH / 2})`} textAnchor="middle">{Math.round(maxY - minY)}</text>
      </g>
    </svg>
  );
}

/** Worktops from above: pieces, front edge banding, joint, sink/hob cutouts with centre dimensions. */
function WorktopView({ project, show }: { project: Project; show: Show }) {
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  const tops = worktops(project, dims.worktopDepth, dims.worktopThickness);
  // shortcut: drawn for the L layout (first piece along the top, the jointed one down the left), as the design shows.
  const [a, b] = tops;
  if (!a) return <p>Nema radnih ploča.</p>;
  const k = Math.min(640 / a.length, 0.2), ox = 130, oy = 90, D = a.depth * k;
  const aw = a.length * k, bl = b ? b.length * k : 0, bd = b ? b.depth * k : 0;
  const sink = a.cutouts.find(c => c.kind === 'sink') ?? b?.cutouts.find(c => c.kind === 'sink');
  const hob = b?.cutouts.find(c => c.kind === 'hob');
  const sinkX = sink && 'centerFromLeft' in sink ? ox + sink.centerFromLeft * k : null;
  const sinkY = sink ? oy + D - sink.centerFromFront * k : 0;
  const hobY = hob && 'centerFromJoint' in hob ? oy + D + hob.centerFromJoint * k : null;
  const hobX = hob ? ox + bd - hob.centerFromFront * k : 0;
  return (
    <svg {...svgProps('Nacrt radnih ploča sa izrezima za sudoperu i ploču za kuvanje i kotama', k, 'RADNA_PLOCA', 520)} style={{ maxWidth: 1000 }}>
      <text x="450" y="30" textAnchor="middle" fontSize="13" fontWeight="600" fill={INK}>Radne ploče {a.thickness} mm · pogled odozgo</text>
      <rect x={ox} y={oy} width={aw} height={D} fill="#F1E9DB" stroke={INK} strokeWidth="1.4" />
      {b && <rect x={ox} y={oy + D} width={bd} height={bl} fill="#F1E9DB" stroke={INK} strokeWidth="1.4" />}
      <line x1={ox + bd} y1={oy + D} x2={ox + aw} y2={oy + D} stroke={ACC} strokeWidth="4" />
      {b && <><line x1={ox + bd} y1={oy + D} x2={ox + bd} y2={oy + D + bl} stroke={ACC} strokeWidth="4" />
        <line x1={ox} y1={oy + D} x2={ox + bd} y2={oy + D} stroke={INK} strokeWidth="1.4" strokeDasharray="6 3" /></>}
      <text x={ox + 430} y={oy + 76} fontSize="14" fontWeight="600" fill={INK}>PDT 1</text>
      {b && <text x={ox + bd / 2} y={oy + D + bl - 60} fontSize="14" fontWeight="600" fill={INK} textAnchor="middle">PDT 2</text>}
      {sink && sinkX !== null && <>
        <rect x={sinkX - (sink.w * k) / 2} y={sinkY - (sink.h * k) / 2} width={sink.w * k} height={sink.h * k} rx="6" fill="#FFFFFF" stroke={INK} strokeWidth="1.2" />
        <text x={sinkX} y={sinkY + 4} textAnchor="middle" fontSize="10" fill={MUTED}>sudopera {sink.w}×{sink.h}</text>
        <line x1={sinkX - 6} y1={sinkY} x2={sinkX + 6} y2={sinkY} stroke={INK} strokeWidth="0.8" /><line x1={sinkX} y1={sinkY - 6} x2={sinkX} y2={sinkY + 6} stroke={INK} strokeWidth="0.8" />
      </>}
      {hob && hobY !== null && <>
        <rect x={hobX - (hob.h * k) / 2} y={hobY - (hob.w * k) / 2} width={hob.h * k} height={hob.w * k} rx="4" fill="#FFFFFF" stroke={INK} strokeWidth="1.2" />
        <text x={hobX} y={hobY - 2} textAnchor="middle" fontSize="10" fill={MUTED}>ploča</text>
        <text x={hobX} y={hobY + 11} textAnchor="middle" fontSize="10" fill={MUTED}>{hob.w}×{hob.h}</text>
      </>}
      <g opacity={show.dim ? 1 : 0} fontSize="10" fill={INK} stroke={INK} strokeWidth="0.8" data-layer="KOTE">
        <Chain x0={ox} x1={ox + aw} y={oy - 30} ticks={[ox, ox + aw]} texts={[String(a.length)]} bold />
        <Chain x0={oy} x1={oy + D} y={ox + aw + 30} ticks={[oy, oy + D]} texts={[String(a.depth)]} vertical side={1} />
        {sink && sinkX !== null && 'centerFromLeft' in sink && <>
          <line x1={ox} y1={oy + 38} x2={sinkX} y2={oy + 38} stroke="#1E50C8" />
          <line x1={ox} y1={oy + 33} x2={ox} y2={oy + 43} stroke="#1E50C8" />
          <text x={(ox + sinkX) / 2} y={oy + 34} stroke="none" textAnchor="middle" fill="#1E50C8">{sink.centerFromLeft} do sredine</text>
          <line x1={sinkX} y1={sinkY} x2={sinkX} y2={oy + D} stroke="#1E50C8" strokeDasharray="3 2" />
          <text x={sinkX + 6} y={oy + D - 20} stroke="none" fill="#1E50C8">{sink.centerFromFront}</text>
        </>}
        {b && <>
          <Chain x0={oy} x1={oy + D + bl} y={ox - 30} ticks={[oy, oy + D, oy + D + bl]} texts={[String(a.depth), String(b.length)]} vertical />
          <Chain x0={ox} x1={ox + bd} y={oy + D + bl + 30} ticks={[ox, ox + bd]} texts={[String(b.depth)]} />
        </>}
        {hob && hobY !== null && <>
          <line x1={ox + bd} y1={hobY} x2={hobX} y2={hobY} stroke="#1E50C8" strokeDasharray="3 2" />
          <text x={ox + bd + 12} y={hobY + 4} stroke="none" fill="#1E50C8">{Math.round((hobY - oy) / k)} od zida A</text>
        </>}
      </g>
      <g fontSize="11" fill={INK} data-layer="TEKST">
        <line x1="520" y1="300" x2="560" y2="300" stroke={ACC} strokeWidth="4" /><text x="570" y="304">kant ABS 2 mm (prednja ivica)</text>
        {b && <><line x1="520" y1="324" x2="560" y2="324" stroke={INK} strokeWidth="1.4" strokeDasharray="6 3" /><text x="570" y="328">spoj PDT 1 / PDT 2 (3 spojnice)</text></>}
        {/* Two lines: in one line the note runs past the view box (also in the design) and is cut off in print. */}
        <text x="520" y="356" fill={MUTED}>Izrezi po šablonu proizvođača; mere centra<tspan x="520" dy="15">od leve ivice i prednje ivice.</tspan></text>
      </g>
    </svg>
  );
}
