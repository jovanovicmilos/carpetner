// Element page, laid out as design/Element.dc.html: element chips, carcass drawing (front without fronts + section),
// construction rules, the element's cut list, hardware, dark summary; printable part labels.
import {
  backCutout, DEFAULT_DRAWER_DEPTH_RESERVE, DEFAULT_SLIDE, drawerSet, edgeCode, edgeTotals, format, SLIDES, frontRows, generateParts, hardware, heightToCeiling, makeElement, PRESETS, sheetEstimate,
  type ConstructionRules, type Element, type ElementKind, type Part, type Project, type Unit,
} from 'engine';
import { lazy, Suspense, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { FIELD, LenField, NameField } from './fields';
import { Header } from './Header';
import { Tip } from './help';
import { fmt, KIND_NAME, num, ownName } from './labels';
import { useProject } from './store';
import { usePrices, workshopMaterials } from './prices';
import { APP_FIXED, Choice, SegmentedControl, STEP_DONE } from './ui';
import { Locked } from './locks';
import { useTemplates } from './templates';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Plus, Printer, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { realPalette } from './look';
import { Textarea } from '@/components/ui/textarea';

const SceneGL = lazy(() => import('./SceneGL').then(m => ({ default: m.SceneGL })));
const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
const decimal = (n: number, d = 2) => n.toLocaleString('sr-Latn', { maximumFractionDigits: d });
const TITLE: Record<Element['kind'], string> = {
  sink: 'Element za sudoperu', base: 'Donji element', drawer: 'Fiokar', oven: 'Element za rernu', 'corner-blind': 'Ugaoni element',
  'appliance-front': 'Fronta MSP', filler: 'Filer', tall: 'Visoki element', wall: 'Gornji element',
};
const LAYER: Record<Element['kind'], string> = {
  sink: 'donji', base: 'donji', drawer: 'donji', oven: 'donji', 'corner-blind': 'donji', 'appliance-front': 'donji', filler: 'donji', tall: 'visoki', wall: 'gornji',
};
const PIPES = new Set(['water', 'drain', 'gas']);

// Layout classes; controls are stock shadcn (docs/SHADCN_EVERYWHERE.md). Sections use the Card look.
const COL = 'box-border flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto px-6 py-5 *:flex-none print:h-auto print:overflow-visible';
const CARD = 'flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm';
const CARD_H = 'm-0 flex items-center text-base leading-none font-semibold';
const CHECK = 'cursor-pointer font-normal';
const MONO = 'font-mono';
const NUM = 'font-mono text-right';
const SUM_L = 'text-[12px] text-[#C9C3B8]';
const SUM_V = 'font-mono text-[20px]';
const GROUP = 'flex flex-col gap-2 text-sm font-medium';

export function ElementPage() {
  const { id } = useParams();
  const { project, change } = useProject();
  const prices = usePrices();
  const addTemplate = useTemplates(s => s.add);
  const [tpl, setTpl] = useState<{ name: string; dims: boolean; mats: boolean; rules: boolean } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [view, setView] = useState<'draw' | '3d'>('draw');
  if (!project) return <Navigate to="/brzi-start" replace />;
  const el = project.elements.find(e => e.id === id);
  if (!el) return <Navigate to="/projekat" replace />;

  const unit = project.unit;
  const f = (mm: number) => format(mm, unit);
  const single: Project = { ...project, elements: [el] };
  const parts = generateParts(single);
  const hw = hardware(single);
  const areas = sheetEstimate(parts, project.materials, project.rules);
  const edges = edgeTotals(parts, project.rules);
  const matName = (m: string) => project.materials[m]?.name ?? m;
  const r = project.rules;
  const drawer = drawerSet(project, el);

  const patch = (p: Partial<Element>) => change(pr => ({ ...pr, elements: pr.elements.map(e => (e.id === el.id ? { ...e, ...p } : e)) }));
  const setRules = (p: Partial<ConstructionRules>) => change(pr => ({ ...pr, rules: { ...pr.rules, ...p } }));
  const setKind = (kind: ElementKind) => change(pr => ({ ...pr, elements: pr.elements.map(e => (e.id !== el.id ? e
    : { ...makeElement(kind, e.wallId, e.offset, e.width, e.id, PRESETS[pr.presetId === 'none' ? 'workshop' : pr.presetId], e.materials), label: e.label, ...(e.side && { side: e.side }), ...(e.name && { name: e.name }), ...(e.note && { note: e.note }) })) }));
  const pieces = parts.flatMap(p => Array.from({ length: p.qty }, (_, i) => ({ ...p, n: i + 1 })));
  // Pipes behind the carcass: vertical band of the back cutout in the section.
  const bottom = el.kind === 'wall' ? el.elevation ?? 0 : el.legs ?? 0;
  const pipes = project.room.installations.filter(i => PIPES.has(i.kind) && i.wallId === el.wallId
    && i.offset >= el.offset && i.offset <= el.offset + el.width && i.height >= bottom && i.height <= bottom + el.height);
  const bc = backCutout(project, el);
  const cutout = bc ? { label: `${bc.w}×${bc.h}`, mid: bc.cy, h: bc.h } : null;
  const rank = (m: string) => (m === el.materials.carcass ? 0 : m === el.materials.front ? 1 : 2);
  const edgeLabel = edges.map(e => `${decimal(e.edge.thickness)} (${e.edge.material.split(' ')[0]})`).join(' / ');
  const edgeMeters = edges.map(e => decimal(e.meters, 1)).join(' / ');

  return (
    <div className={APP_FIXED}>
      <Header units />
      <div className="flex flex-wrap items-center gap-2 border-0 border-b border-solid border-border bg-white px-6 py-3">
        <span className="mr-1.5 text-[13px] text-muted-foreground">Elementi:</span>
        {project.elements.map(e => (
          // Confirmed: light green with ✓ (user 2026-11-22), so the open ones stand out.
          <Tooltip key={e.id}><TooltipTrigger asChild>
            <Link to={`/element/${e.id}`} aria-current={e.id === el.id ? 'page' : undefined}
              className={cn(buttonVariants({ variant: e.id === el.id ? 'default' : 'outline', size: 'sm' }), 'font-mono no-underline', e.id !== el.id && (e.confirmedAt ? STEP_DONE : 'text-foreground'))}>
              {e.confirmedAt && <Check aria-label="potvrđeno" />}{e.label}</Link>
          </TooltipTrigger><TooltipContent>{e.confirmedAt ? 'Konstrukcija potvrđena' : 'Čeka potvrdu konstrukcije'}</TooltipContent></Tooltip>
        ))}
        {/* Step Elementi (docs/TOK_PROJEKTA.md): the construction of each element is confirmed; any later change takes it back. */}
        {/* Potvrdi konstrukciju lives in the project bar (StepMark), the same place on every step. */}
        <Button variant="outline" className="ml-auto" onClick={() => { setSaved(null); setTpl({ name: `${cap(KIND_NAME[el.kind])} ${el.width}${backCutout(project, el) ? ' sa izrezom' : ''}`, dims: true, mats: true, rules: false }); }}>Sačuvaj kao šablon</Button>
      </div>

      <div className="flex min-h-0 flex-1 max-[900px]:flex-col print:h-auto print:overflow-visible" key={el.id /* reset uncontrolled inputs per element */}>
        <div className={cn(COL, 'flex-[1_1_55%]')}>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="m-0 text-2xl font-semibold">{el.label} · {TITLE[el.kind]}{ownName(el)}</h1>
            <span className="font-mono text-sm text-muted-foreground">{f(el.width)} × {f(el.height)} × {f(el.depth)} {unit} · {LAYER[el.kind]} · zid {el.wallId}</span>
          </div>

          <section className={CARD} aria-label="Crtež elementa">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={CARD_H}>{view === 'draw' ? 'Konstrukcija — pogled spreda i presek' : 'Konstrukcija — rasklopljen 3D'}<Tip k="element.drawing" align="right" /></h2>
              {/* exploded 3D of this unit alone, as the site's element pictures (user 2026-11-25) */}
              <Tabs value={view} onValueChange={v => setView(v as 'draw' | '3d')}>
                <TabsList aria-label="Prikaz elementa"><TabsTrigger value="draw" className="px-3">Crtež</TabsTrigger><TabsTrigger value="3d" className="px-3">Rasklopljen 3D</TabsTrigger></TabsList>
              </Tabs>
            </div>
            {view === 'draw'
              ? <CarcassDrawing el={el} rules={r} parts={parts} cutout={cutout} />
              : <div className="relative h-[460px] overflow-hidden rounded-lg print:hidden">
                  <Suspense fallback={null}>
                    <SceneGL project={{ ...project, room: { ...project.room, openings: [] }, elements: [el] }} cam="iso" solid sel={null} onSel={() => {}} noOpen explode={40}
                      layers={{ walls: false, carcass: true, fronts: true, tops: false }} real={realPalette(project)} />
                  </Suspense>
                </div>}
          </section>

          <section className={CARD} aria-label="Parametri konstrukcije">
            <h2 className={CARD_H}>Pravila konstrukcije<Tip k="element.rules" align="left" /></h2>
            <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
              <RuleSelect label="Spoj" value={r.joint} onChange={v => setRules({ joint: v })} options={[
                ['dowel+confirmat', 'Tipl + konfirmat'], ['minifix', 'Ekscentar (minifix)', true], ['confirmat', 'Samo konfirmat', true]]} />
              <RuleSelect label="Pod" value={r.bottomMode} onChange={v => setRules({ bottomMode: v })} options={[
                ['between', 'Između stranica'], ['under', 'Ispod stranica']]} />
              <RuleSelect label="Poleđina" value={r.backMode} onChange={v => setRules({ backMode: v })} options={[
                ['nailed', `HDF 3 nabijena (−${r.backReduction} mm)`], ['groove', 'HDF 3 u nut', true], ['inset18', 'Iverica 18 upuštena', true]]} />
              <LenField label="Fuga fronti (mm)" value={r.frontGap} unit="mm" onCommit={v => setRules({ frontGap: Math.max(0, Math.min(10, v)) })} />
              <RuleSelect label="Kant korpusa" value={String(r.carcassEdge.thickness)} onChange={v => setRules({ carcassEdge: { ...r.carcassEdge, thickness: Number(v) } })} options={[
                ['0.8', '0,8 · samo prednja ivica'], ['2', 'ABS 2 · prednja ivica']]} />
              <RuleSelect label="Kant fronti" value={String(r.frontEdge.thickness)} onChange={v => setRules({ frontEdge: { ...r.frontEdge, thickness: Number(v) } })} options={[
                ['2', 'ABS 2 · sve 4 ivice'], ['1', 'ABS 1 · sve 4 ivice']]} />
              {drawer.heights.length > 0 && <>
                {/* drawer slide (docs/KONSTRUKCIJA.md "Fioke i klizači"): sets the box sizes; push-to-open takes the slide's push variant */}
                <RuleSelect label="Klizač fioke (cela kuhinja)" value={r.drawerSlide ?? DEFAULT_SLIDE} onChange={v => setRules({ drawerSlide: v })}
                  options={SLIDES.filter(x => !SLIDES.some(y => y.push === x.id)).map(x => [x.id, `${x.brand} · ${x.name}`] as [string, string])} />
                <LenField label="Rezerva dubine iza klizača (mm)" value={r.drawerDepthReserve ?? DEFAULT_DRAWER_DEPTH_RESERVE} unit="mm"
                  onCommit={v => setRules({ drawerDepthReserve: Math.max(0, Math.min(300, v)) })} />
                <p className="col-span-full m-0 text-sm text-muted-foreground">
                  {drawer.slide.brand} {drawer.slide.name} {drawer.box.nl} mm · sanduk {drawer.box.outer} × {drawer.box.length} spolja, {drawer.box.inner} unutra
                  {!drawer.box.fits && ' · klizač je duži od korpusa — proveri'}
                  {!drawer.slide.verified && ' · odbijanja po vrsti klizača, proveri u tehničkom listu proizvođača'}
                </p>
              </>}
            </div>
            <Label className={CHECK}>
              <Checkbox checked={r.deductEdgeFromCutMinThickness <= 1} onCheckedChange={v => setRules({ deductEdgeFromCutMinThickness: v === true ? 1 : 100 })} />
              Mera za sečenje = gotova mera − debljina kanta (za kant ≥ 1 mm)
            </Label>
            <Label className={CHECK}>
              <Checkbox checked={r.followGrain} onCheckedChange={v => setRules({ followGrain: v === true })} />
              Prati smer šare (godova) na frontama
            </Label>
          </section>

          <MeasureCard el={el} unit={unit} materials={{ ...workshopMaterials(prices), ...project.materials }} onKind={setKind} toCeiling={heightToCeiling(project, el)}
            onChange={p => {
              // A workshop material picked for the first time is copied into the project (the project keeps its own catalogue).
              const own = workshopMaterials(prices);
              const add = Object.values(p.materials ?? {}).filter((id): id is string => !!id && !project.materials[id] && !!own[id]);
              if (!add.length) { patch(p); return; }
              change(pr => ({ ...pr, materials: { ...pr.materials, ...Object.fromEntries(add.map(id => [id, own[id]])) },
                elements: pr.elements.map(e => (e.id === el.id ? { ...e, ...p } : e)) }));
            }} />
        </div>

        <div className={cn(COL, 'flex-[1_1_45%] border-0 border-l border-solid border-border max-[900px]:max-h-[42vh] max-[900px]:flex-[0_0_auto] max-[900px]:border-l-0 max-[900px]:border-t')}>
          <Locked feature="cutlist" className="flex flex-col gap-4">
          <section className={CARD} aria-label="Krojna lista elementa">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className={CARD_H}>Krojna lista — {el.label}</h2>
              <span className="text-sm text-muted-foreground">Kant: D = duža ivica, K = kraća ivica (1D = jedna duža, 2K = obe kraće)</span>
              <Button variant="outline" className="ml-auto" onClick={() => window.print()}><Printer />Štampaj nalepnice</Button>
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Poz.</TableHead><TableHead>Deo</TableHead><TableHead>Materijal</TableHead><TableHead className="text-right">Kom</TableHead>
                    <TableHead className="text-right"><span className="inline-flex items-center">Dužina<Tip k="element.length" align="up" /></span></TableHead>
                    <TableHead className="text-right">Širina</TableHead>
                    <TableHead><span className="inline-flex items-center">Kant<Tip k="element.cutList" align="up" /></span></TableHead>
                    <TableHead className="text-right">Za sečenje</TableHead><TableHead>Napomena</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map(p => (
                    <TableRow key={p.pos} className={p.note ? '[&>td]:bg-[#FBF3EC]' : undefined}>
                      <TableCell className={MONO}>{p.pos}</TableCell><TableCell>{p.name}</TableCell><TableCell>{matName(p.materialId)}</TableCell>
                      <TableCell className={NUM}>{p.qty}</TableCell><TableCell className={NUM}>{f(p.length)}</TableCell><TableCell className={NUM}>{f(p.width)}</TableCell>
                      <TableCell className={MONO}>{edgeCode(p.edges, r)}</TableCell>
                      <TableCell className={NUM}>{f(p.cutLength)} × {f(p.cutWidth)}</TableCell>
                      <TableCell className="text-muted-foreground">{p.note ?? (r.followGrain && project.materials[p.materialId]?.grain ? 'šara ↑' : '')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className={CARD} aria-label="Okov i repro materijal za element">
            <h2 className={CARD_H}>Okov i repro materijal — {el.label}<Tip k="element.hardware" align="left" /></h2>
            <div className="grid grid-cols-2 gap-x-7 text-sm">
              {hw.map(h => <div key={h.sku} className="flex justify-between gap-3 border-0 border-b border-solid border-line-soft py-[9px]"><span>{h.name}</span><span className="font-mono">{h.qty} {h.unit}</span></div>)}
            </div>
          </section>
          </Locked>

          <section className="flex flex-col gap-4 rounded-xl bg-dark p-6 text-background shadow-sm" aria-label="Sažetak elementa">
            <h2 className={CARD_H}>Sažetak {el.label}</h2>
            <div className="grid grid-cols-2 gap-3.5">
              {[...areas].sort((a, b) => rank(a.materialId) - rank(b.materialId)).map(a => (
                <div key={a.materialId}><div className={SUM_L}>{a.materialId === el.materials.front ? 'Fronte' : matName(a.materialId)}</div><div className={SUM_V}>{decimal(a.areaM2)} m²</div></div>
              ))}
              {edges.length > 0 && <div><div className={SUM_L}>Kant {edgeLabel}</div><div className={SUM_V}>{edgeMeters} m</div></div>}
            </div>
            <Link to="/krojna-lista" className={cn(buttonVariants({ size: 'lg' }), 'bg-accent-on-dark text-foreground no-underline hover:bg-accent-on-dark/90')}>Cela krojna lista projekta</Link>
          </section>
        </div>
      </div>

      {/* Part labels: hidden on screen; the print rule in index.css hides everything else. */}
      <div className="hidden w-full grid-cols-3 gap-[4mm] print:visible print:absolute print:top-0 print:left-0 print:grid print:**:visible" aria-hidden="true">
        {pieces.map(p => (
          <div key={`${p.pos}-${p.n}`} className="break-inside-avoid border border-solid border-black p-[3mm] text-[10pt]">
            <strong>{p.pos}</strong> {p.qty > 1 && <span>({p.n}/{p.qty})</span>}
            <div>{p.name} · {matName(p.materialId)}</div>
            <div className="font-mono">{f(p.length)} × {f(p.width)} · {edgeCode(p.edges, r)}</div>
            <div className="text-[12px]">{project.name}{p.note ? ` · ${p.note}` : ''}</div>
          </div>
        ))}
      </div>
      <Dialog open={tpl !== null} onOpenChange={o => { if (!o) setTpl(null); }}>
        {tpl && (
          <DialogContent>
            <DialogHeader>
            <DialogTitle>Sačuvaj kao šablon</DialogTitle>
            <DialogDescription>Šablon se pojavljuje u biblioteci 2D editora, u grupi „Moji šabloni”, za sve u radionici. Prevlačenjem ga dodaješ kao novi element sa istim merama.</DialogDescription>
            </DialogHeader>
            <label className={FIELD}>Naziv šablona
              <Input type="text" value={tpl.name} onChange={e => setTpl({ ...tpl, name: e.target.value })} className="font-normal" />
            </label>
            <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
              <legend className="mb-3 p-0 text-sm font-medium">Šta se čuva</legend>
              {([['dims', 'Mere, vrsta, fronte i otvaranje'], ['mats', 'Materijali i kant'], ['rules', 'Pravila konstrukcije ovog elementa (umesto pravila radionice)']] as const).map(([k, t]) => (
                <Label key={k} className={CHECK}><Checkbox checked={tpl[k]} onCheckedChange={v => setTpl({ ...tpl, [k]: v === true })} />{t}</Label>
              ))}
            </fieldset>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTpl(null)}>Otkaži</Button>
              <Button disabled={!tpl.name.trim()} onClick={() => {
                const { id: _i, label: _l, wallId: _w, offset: _o, side: _s, materials, ...shape } = el;
                // shortcut: unchecking "Mere…" still keeps kind and width (a template needs them to be placed).
                const element = tpl.dims ? shape : { kind: el.kind, width: el.width, height: el.height, depth: el.depth };
                addTemplate({ name: tpl.name.trim(), element: { ...element, ...(tpl.mats && { materials }) }, ...(tpl.rules && { rules: project.rules }) });
                setSaved(tpl.name.trim()); setTpl(null);
              }}>Sačuvaj šablon</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
      {saved && (
        <div role="status" className="fixed right-5 bottom-5 z-[70] flex items-center gap-3 rounded-lg bg-dark px-4 py-3 text-sm text-background shadow-lg">
          <span>Šablon „{saved}” je u biblioteci › Moji šabloni.</span>
          <Link to="/projekat" className="font-semibold text-[#A9D6BA]">Otvori Prostor</Link>
          <Button variant="ghost" size="icon-sm" aria-label="Zatvori" className="text-background hover:bg-dark-2 hover:text-background" onClick={() => setSaved(null)}><X /></Button>
        </div>
      )}
    </div>
  );
}

function RuleSelect<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string, boolean?][]; onChange: (v: T) => void;
}) {
  return (
    <label className={FIELD}>{label}
      <Choice label={label} value={value} onChange={onChange} className="w-full font-normal" options={options.map(([v, t, soon]) => [v, soon ? `${t} (uskoro)` : t, soon] as const)} />
    </label>
  );
}

/**
 * design/Element.dc.html drawing, parametric: front view without fronts (sides, bottom, rails/top, shelves, legs, position numbers)
 * and a side section (side panel, rails, front strip, back with the pipe cutout), with dimension lines. Scale fits the design's boxes.
 */
export function CarcassDrawing({ el, rules, parts, cutout }: {
  el: Element; rules: ConstructionRules; parts: Part[]; cutout: { label: string; mid: number; h: number } | null;
}) {
  const { width: W, height: H, depth: D } = el;
  const k = Math.min(240 / W, 216 / H, 168 / D);
  const x0 = 60, y0 = 40, w = W * k, h = H * k, tk = rules.carcassThickness * k * 2; // panels drawn 2× thick, as in the design
  const legs = el.kind === 'wall' ? 0 : (el.legs ?? 0) * k;
  const posOf = (p?: Part) => p?.pos.split('-').pop();
  const find = (prefix: string) => parts.find(p => p.name.startsWith(prefix));
  const hasCarcass = !['appliance-front', 'filler'].includes(el.kind);
  const rails = ['base', 'sink', 'corner-blind', 'drawer', 'oven'].includes(el.kind);
  const shelves = el.shelves ?? 0;
  const under = rules.bottomMode === 'under';
  const sx = 400, d = D * k;
  const front = parts.find(p => /^(Krilo|Fronta)/.test(p.name));
  const back = find('Poleđina');
  const scale = Math.round(3 / k); // the design draws 0.3 px/mm and labels it 1:10
  const INK = '#1C1B19', MUTED = '#5F5A52';
  const sideH = under ? h - tk : h;
  return (
    <svg viewBox="0 0 640 380" role="img" className="h-auto w-full font-mono"
      aria-label={`${el.label}: pogled spreda na korpus ${W}×${H} sa označenim delovima i bočni presek dubine ${D}`}>
      {hasCarcass ? (
        <g>
          <rect x={x0} y={y0} width={tk} height={sideH} fill="#EADBC4" stroke={INK} />
          <rect x={x0 + w - tk} y={y0} width={tk} height={sideH} fill="#EADBC4" stroke={INK} />
          <rect x={under ? x0 : x0 + tk} y={y0 + h - tk} width={under ? w : w - 2 * tk} height={tk} fill="#E0CCAD" stroke={INK} />
          {(rails || el.kind === 'wall' || el.kind === 'tall') && <rect x={x0 + tk} y={y0} width={w - 2 * tk} height={tk} fill="#E0CCAD" stroke={INK} />}
          {Array.from({ length: shelves }, (_, i) => (
            <rect key={i} x={x0 + tk} y={y0 + ((i + 1) * h) / (shelves + 1) - tk / 2} width={w - 2 * tk} height={tk} fill="#E0CCAD" stroke={INK} />
          ))}
          {legs > 0 && <><rect x={x0 + 20} y={y0 + h} width={8} height={legs} fill={MUTED} /><rect x={x0 + w - 28} y={y0 + h} width={8} height={legs} fill={MUTED} /></>}
          <text x={x0 + w / 2} y={y0 + h / 2} textAnchor="middle" fontSize={12} fill={MUTED}>otvoreno — {KIND_NAME[el.kind]}</text>
          {find('Stranica') && <text x={x0 - 20} y={y0 + h / 2} textAnchor="end" fontSize={11} fill={INK}>{posOf(find('Stranica'))}</text>}
          {find('Pod') && <text x={x0 + w / 2} y={y0 + h + 14} textAnchor="middle" fontSize={11} fill={INK}>{posOf(find('Pod'))} pod</text>}
          {rails && find('Vezni') && <text x={x0 + w / 2} y={y0 - 6} textAnchor="middle" fontSize={11} fill={INK}>{posOf(find('Vezni'))} · vezni komad ×{find('Vezni')!.qty}</text>}
        </g>
      ) : (
        <rect x={x0} y={y0} width={w} height={h} fill="#EADBC4" stroke={INK} />
      )}
      <line x1={x0} y1={310} x2={x0 + w} y2={310} stroke={INK} />
      <line x1={x0} y1={304} x2={x0} y2={316} stroke={INK} /><line x1={x0 + w} y1={304} x2={x0 + w} y2={316} stroke={INK} />
      <text x={x0 + w / 2} y={330} textAnchor="middle" fontSize={12} fontWeight={600}>{W}</text>
      <line x1={20} y1={y0} x2={20} y2={y0 + h} stroke={INK} />
      <line x1={14} y1={y0} x2={26} y2={y0} stroke={INK} /><line x1={14} y1={y0 + h} x2={26} y2={y0 + h} stroke={INK} />
      <text x={12} y={y0 + h / 2} fontSize={12} fontWeight={600} transform={`rotate(-90 12 ${y0 + h / 2})`} textAnchor="middle">{H}</text>

      {hasCarcass && (
        <g>
          <rect x={sx} y={y0} width={d} height={h} fill="#EADBC4" stroke={INK} />
          {back && <rect x={sx + d} y={y0} width={1.5} height={h} fill={INK} />}
          {rails && <>
            <rect x={sx} y={y0} width={100 * k} height={tk} fill="#E0CCAD" stroke={INK} />
            <rect x={sx + d - 100 * k} y={y0} width={100 * k} height={tk} fill="#E0CCAD" stroke={INK} />
          </>}
          {front && <rect x={sx - tk / 2} y={y0} width={tk / 2} height={h} fill="#BFC3C7" stroke={INK} />}
          {cutout && (() => {
            const ch = cutout.h * k, cy = y0 + h - cutout.mid * k - ch / 2;
            return <>
              <rect x={sx + d + 1.5} y={cy} width={2} height={ch} fill="#2E6B4E" />
              <rect x={sx + d + 6} y={cy} width={54} height={ch} fill="none" stroke="#2E6B4E" strokeDasharray="4 3" />
              <text x={sx + d + 33} y={cy + ch / 2 - 4} textAnchor="middle" fontSize={10} fill="#2E6B4E">izrez</text>
              <text x={sx + d + 33} y={cy + ch / 2 + 10} textAnchor="middle" fontSize={10} fill="#2E6B4E">{cutout.label}</text>
            </>;
          })()}
          <text x={sx + d / 2} y={y0 + h / 2} textAnchor="middle" fontSize={11} fill={MUTED}>stranica (presek)</text>
          {front && <text x={sx - 16} y={y0 + h / 2} textAnchor="end" fontSize={11} fill={INK}>{posOf(front)}</text>}
          {/* under the section, right-aligned: starting right of it ran past the 640 viewBox for deep units */}
          {back && <text x={sx + d} y={y0 + h + 14} textAnchor="end" fontSize={11} fill={INK}>{posOf(back)} poleđina</text>}
          <line x1={sx} y1={310} x2={sx + d} y2={310} stroke={INK} />
          <line x1={sx} y1={304} x2={sx} y2={316} stroke={INK} /><line x1={sx + d} y1={304} x2={sx + d} y2={316} stroke={INK} />
          <text x={sx + d / 2} y={330} textAnchor="middle" fontSize={12} fontWeight={600}>{D}</text>
        </g>
      )}
      <text x={60} y={366} fontSize={11} fill={MUTED}>Razmera 1:{scale} · fronte nisu prikazane u preseku</text>
    </svg>
  );
}

// "Mere i vrsta" (design/screens/Element.html, DESIGN_SPEC §10).
const KINDS: [ElementKind, string][] = [
  ['base', 'Donji'], ['sink', 'Sudopera'], ['drawer', 'Fiokar'], ['oven', 'Rerna'], ['corner-blind', 'Ugaoni (slepi)'],
  ['appliance-front', 'Fronta aparata'], ['filler', 'Filer'], ['wall', 'Gornji'], ['tall', 'Visoki'],
];
const NO_SHELVES = new Set<ElementKind>(['sink', 'filler', 'appliance-front']); // as the design
const DOOR_KINDS = new Set<ElementKind>(['base', 'sink', 'corner-blind', 'wall', 'tall']);
const GAP = 3; // between drawer fronts
const ROW_NAME: Record<string, string> = { door: 'krilo', door2: '2 krila', drawer: 'fioka', app: 'aparat', hood: 'aspirator', glass: 'staklo', open: 'otvoreno', lift: 'kip', panel: 'panel' };

function MeasureCard({ el, unit, materials, onChange, onKind, toCeiling }: {
  el: Element; unit: Unit; materials: Project['materials']; onChange: (p: Partial<Element>) => void; onKind: (k: ElementKind) => void;
  /** Carcass height up to the ceiling / slope (wall and tall units). */ toCeiling: number | null;
}) {
  const up = el.kind === 'wall';
  const fronts = el.drawerFronts ?? [];
  const space = el.height - 4, used = fronts.reduce((s, h) => s + h, 0) + Math.max(0, fronts.length - 1) * GAP;
  // First drawer 176, the rest share what is left.
  const spread = (n: number) => { const rest = n > 1 ? Math.floor((space - 176 - (n - 1) * GAP) / (n - 1)) : space; return n > 1 ? [176, ...Array(n - 1).fill(rest)] : [space]; };
  const mats = (pred: (k: string) => boolean) => Object.values(materials).filter(m => pred(m.kind));
  const matSelect = (label: string, key: 'carcass' | 'front' | 'back', list: typeof materials[string][]) => (
    <label className={FIELD}>{label}
      <Choice label={label} value={el.materials[key] ?? ''} className="w-full font-normal" onChange={v => onChange({ materials: { ...el.materials, [key]: v } })}
        options={list.map(m => [m.id, m.name] as const)} />
    </label>
  );
  return (
    <section className={CARD} aria-label="Mere i vrsta elementa">
      <h2 className={CARD_H}>Mere i vrsta<Tip k="element.measures" /></h2>
      <div role="group" aria-label="Vrsta elementa" className={GROUP}>
        <span className="inline-flex items-center">Vrsta</span>
        <SegmentedControl className="flex-wrap" variant="outline" size="sm" spacing={1} itemClass="font-normal" options={KINDS} value={el.kind} onChange={onKind} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <LenField label="Širina" value={el.width} unit={unit} onCommit={w => onChange({ width: Math.max(50, Math.min(1200, w)) })} />
        <LenField label="Visina korpusa" value={el.height} unit={unit} onCommit={v => onChange({ height: v })} />
        <LenField label="Dubina" value={el.depth} unit={unit} onCommit={v => onChange({ depth: v })} />
        {up ? <LenField label="Od poda (donja ivica)" value={el.elevation} unit={unit} onCommit={v => onChange({ elevation: v })} />
          : <LenField label="Nogice (od poda)" value={el.legs} unit={unit} onCommit={v => onChange({ legs: v || undefined })} />}
        <label className={FIELD}>{NO_SHELVES.has(el.kind) ? 'Fahovi (ne koristi se)' : 'Fahovi'}
          <Input type="text" className="font-mono font-normal read-only:bg-muted read-only:text-muted-foreground" inputMode="numeric" value={NO_SHELVES.has(el.kind) ? 0 : el.shelves ?? 0} readOnly={NO_SHELVES.has(el.kind)}
            onChange={e => onChange({ shelves: Math.min(6, num(e.target.value)) })} />
        </label>
      </div>
      {toCeiling !== null && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2" role="status">
          <span>{toCeiling > el.height ? 'Do plafona može' : 'Ne staje ispod plafona — najviše'}: visina <strong className="font-mono">{fmt(toCeiling, unit)} {unit}</strong></span>
          <Button variant="outline" size="sm" onClick={() => onChange({ height: toCeiling })}>{toCeiling > el.height ? 'Podigni do plafona' : 'Smanji do plafona'}</Button>
        </div>
      )}
      {el.front ? (
        // Elements with front rows (Konfigurator, catalog) are edited where the rows are: doors / drawerFronts below do not apply.
        <div className={GROUP}>
          <span className="inline-flex items-center">Fronta, odozgo</span>
          <div className="flex flex-wrap gap-1">
            <span className="font-mono font-normal">{frontRows(el).map(({ row, h }) => `${ROW_NAME[row.type] ?? row.type} ${h}`).join(' · ')}</span>
            <Button asChild variant="outline" size="sm" className="ml-auto no-underline"><Link to={`/prilagodjeni?element=${el.id}`}>Uredi u konfiguratoru</Link></Button>
          </div>
        </div>
      ) : <>
      {DOOR_KINDS.has(el.kind) && (
        <div className="grid grid-cols-2 gap-2.5 max-[520px]:grid-cols-1">
          {/* shortcut: a tall unit is always fridge + upper door (2 doors on one side), so only the side is offered. */}
          {el.kind !== 'tall' && (
            <div role="group" aria-label="Broj krila" className={GROUP}>
              <span className="inline-flex items-center">Krila</span>
              <SegmentedControl variant="outline" size="sm" spacing={1} itemClass="min-w-10 font-normal" options={[[1, '1'], [2, '2']] as const} value={el.doors}
                onChange={n => onChange({ doors: n, hinge: n === 2 ? 'LR' : 'L' })} />
            </div>
          )}
          <div role="group" aria-label="Otvaranje" className={GROUP}>
            <span className="inline-flex items-center">Otvaranje (gledano spreda)</span>
            <SegmentedControl variant="outline" size="sm" spacing={1} itemClass="font-normal" value={el.hinge ?? 'L'} onChange={h => onChange({ hinge: h })}
              options={el.doors === 2 && el.kind !== 'tall' ? [['LR', '2 krila']] as const : [['L', 'Levo'], ['R', 'Desno']] as const} />
          </div>
        </div>
      )}
      {(el.kind === 'drawer' || el.kind === 'oven') && (
        <div className={GROUP}>
          <span className="inline-flex items-center">Fronte fioka, odozgo (mm)<Tip k="element.drawers" /></span>
          <div className="flex flex-wrap gap-1">
            {fronts.map((h, i) => (
              <Input key={`${i}-${h}`} type="text" inputMode="numeric" aria-label={`Fioka ${i + 1}`} defaultValue={h} className="w-[72px] font-mono font-normal"
                onBlur={e => onChange({ drawerFronts: fronts.map((x, j) => (j === i ? num(e.target.value) : x)) })} />
            ))}
            <Button variant="outline" className="border-dashed" onClick={() => onChange({ drawerFronts: spread(fronts.length + 1) })}><Plus />Fioka</Button>
            <Button variant="outline" onClick={() => onChange({ drawerFronts: spread(Math.max(1, fronts.length)) })}>Raspodeli</Button>
          </div>
          {/* Within 4 mm below the front height is fine (design: 714 of 716 ✓). */}
          <span className={cn('text-xs font-normal', used <= space && space - used <= 4 ? 'text-ok' : 'text-accent-ink')}>
            Zbir {fronts.reduce((s, h) => s + h, 0)} + {Math.max(0, fronts.length - 1)} fuge × {GAP} = {used} · visina fronti {space} {used <= space && space - used <= 4 ? '✓' : '✗'}
          </span>
        </div>
      )}
      </>}
      <div className="grid grid-cols-3 gap-3">
        {matSelect('Korpus', 'carcass', mats(k => k !== 'hdf'))}
        {matSelect('Fronte', 'front', mats(k => k !== 'hdf'))}
        {matSelect('Poleđina', 'back', mats(k => k === 'hdf'))}
      </div>
      <NameField el={el} onChange={onChange} />
      <label className={FIELD}>Napomena (ide u krojnu listu i na nalepnice)
        <Textarea rows={2} className="font-normal" defaultValue={el.note} onBlur={e => onChange({ note: e.target.value.trim() || undefined })} />
      </label>
    </section>
  );
}
