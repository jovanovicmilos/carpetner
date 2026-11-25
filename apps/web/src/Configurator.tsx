// Prilagođeni element (design/Konfigurator.dc.html, docs/KATALOG.md): base, front rows, interior, handles, materials;
// the element's cut list and hardware live, from the engine with the workshop rules (user 2026-11-19, not the design's formulas).
// The draft is a normal Element; "Dodaj u prostor" puts it on the first free spot (engine firstFreeOffset) and opens Prostor.
// ?element=ID edits that element instead: the draft starts from it and "Sačuvaj izmene" replaces it in place. Any unit with rows
// (engine asRows: classic Brzi start units too, user 2026-11-25) — saving stores the rows on it.
// Sizes show in the project's unit (customer kitchens: cm). The customer sees no construction: no template, cut list, hardware,
// back / edge rules or hole spacing (docs/SITE_AND_FLOW.md, progressive disclosure).
import {
  asRows, cornerMask, DEFAULT_ELEMENT_MATERIALS, firstFreeOffset, frontRows, generateParts, hardware, isNiche, labelPrefix, makeElement, nextId, PRESETS, verticalRange,
  type ConstructionRules, type Element, type FrontRow, type FrontRowType, type Layer, type OpeningKind, type OpeningSpec, type Project, type Unit,
} from 'engine';
import { lazy, Suspense, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Header } from './Header';
import { parseLength } from './labels';
import { PlannerHeader } from './Planner';
import { Tip } from './help';
import { useProject } from './store';
import { useTemplates } from './templates';
import { APP_FIXED, Choice, IconBtn, SegmentedControl } from './ui';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { ArrowLeft, ChevronDown, ChevronUp, DoorClosed, DoorOpen, Expand, Minus, Plus, Shrink, X } from 'lucide-react';
import { FIELD } from './fields';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { openingUsable, useWorkshop } from './workshop';
import { realPalette } from './look';

const SceneGL = lazy(() => import('./SceneGL').then(m => ({ default: m.SceneGL })));

const RTYPES: [FrontRowType, string][] = [['door', 'Krilo'], ['doorBlind', 'Ugaono krilo (slepi deo + maska)'], ['door2', '2 krila'], ['drawer', 'Fioka'], ['app', 'Aparat (otvor)'], ['glass', 'Staklo (vitrina)'], ['open', 'Otvoreno']];
const OPEN: [OpeningKind | 'project', string, string][] = [['project', 'Kao projekat', 'M6 7h32'], ['bar', 'Ručka – šipka', 'M32 11v12'], ['knob', 'Ručka – dugme', 'M33 17h.01'], ['profile', 'Profil na vrhu fronte', 'M3 4.5h38'], ['push', 'Na pritisak (bez ručke)', 'M22 17h.01']];
const OPEN_SHORT: Record<OpeningKind, string> = { bar: 'šipka', knob: 'dugme', profile: 'profil', push: 'na pritisak' };
const HCOL: [NonNullable<OpeningSpec['color']>, string, string][] = [['inox', 'Inox', '#9AA0A6'], ['black', 'Crna mat', '#1C1B19'], ['brass', 'Mesing', '#B08D57'], ['front', 'U boji fronte', '']];
const LAYERS: Record<Layer, { t: string; H: number; D: number }> = { low: { t: 'Donji', H: 720, D: 560 }, up: { t: 'Gornji', H: 720, D: 320 }, tall: { t: 'Visoki', H: 2100, D: 560 } };
type R = [FrontRowType, number | null, string?];
const PRESET_ROWS: Record<Layer, [string, R[]][]> = {
  low: [['1 krilo', [['door', null]]], ['2 krila', [['door2', null]]], ['Fioka + krilo', [['drawer', 150], ['door', null]]], ['2 fioke', [['drawer', null], ['drawer', null]]], ['3 fioke', [['drawer', 180], ['drawer', null], ['drawer', null]]], ['4 fioke', [['drawer', null], ['drawer', null], ['drawer', null], ['drawer', null]]], ['Rerna + fioka', [['app', 560, 'oven60'], ['drawer', null]]], ['Otvoreno', [['open', null]]]],
  up: [['1 krilo', [['door', null]]], ['2 krila', [['door2', null]]], ['Vitrina', [['glass', null]]], ['Staklo + krilo', [['glass', 360], ['door', null]]], ['Otvoreno', [['open', null]]]],
  tall: [['2 krila (ostava)', [['door', 800], ['door', null]]], ['Frižider', [['door', 460], ['door', null, 'fridge']]], ['Rerna + mikro', [['door', 520], ['app', 380, 'micro38'], ['app', 590, 'oven60'], ['drawer', null], ['drawer', null]]], ['Rerna + fioke', [['door', 640], ['app', 590, 'oven60'], ['drawer', null], ['drawer', null]]]],
};
const mk = (rows: R[]): FrontRow[] => rows.map(([type, height, appliance]) => ({ type, height, ...(appliance ? { appliance } : {}) }));
// Swatch colours by decor code (design MATS); other materials get the neutral stripe.
const DECOR: Record<string, string> = { W980: '#F4F4F2', U708: '#BFC3C7', H1180: '#B08A62', U999: '#2E2D2B' };
const swatch = (name = '') => DECOR[name.split(/\s+/).find(w => DECOR[w]) ?? ''] ?? '';
const layerOf = (k: Element['kind']): Layer => (k === 'wall' ? 'up' : k === 'tall' ? 'tall' : 'low');
const kindOf = (layer: Layer, rows: FrontRow[]): Element['kind'] =>
  layer === 'tall' ? 'tall' : layer === 'up' ? 'wall' : rows.some(isNiche) ? 'oven' : rows.every(r => r.type === 'drawer') ? 'drawer' : 'base';
// Under 900 px the columns stack.
const SIDE_SM = 'max-[900px]:flex-[0_0_auto] max-[900px]:border-0 max-[900px]:border-b max-[900px]:border-border';
const H2 = 'm-0 text-[13px] tracking-[0.06em] uppercase text-[#2E6B4E] flex items-center';
const HINT = 'text-xs text-muted-foreground';
const dec = (n: number) => String(n).replace('.', ',');

interface Draft { layer: Layer; W: number; H: number; D: number; rows: FrontRow[]; shelves: number; inDr: number; opening?: OpeningSpec; hinge: 'L' | 'R'; carcass: string; front: string }

/** `customer`: from the customer's Prostor / Raspored (/kupac/prilagodjeni) — customer header, back to where it was opened. */
export function Configurator({ customer = false }: { customer?: boolean }) {
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const addTemplate = useTemplates(s => s.add);
  const openingOff = useWorkshop(s => s.openingOff);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orig = project?.elements.find(e => e.id === params.get('element') && asRows(e));
  // New unit: lower / wall sizes from the project's preset (an EN 1116 carcass is 762, not the workshop's 720); tall as before.
  const pd = PRESETS[!project || project.presetId === 'none' ? 'workshop' : project.presetId];
  const size: Record<Layer, { H: number; D: number }> = { low: { H: pd.baseCarcassHeight, D: pd.baseCarcassDepth }, up: { H: pd.wallUnitHeight, D: pd.wallUnitDepth }, tall: LAYERS.tall };
  const [d, setD] = useState<Draft>(() => orig
    ? { layer: layerOf(orig.kind), W: orig.width, H: orig.height, D: orig.depth, rows: asRows(orig)!, shelves: orig.interior?.shelves ?? orig.shelves ?? 0,
      inDr: orig.interior?.innerDrawers ?? 0, opening: orig.opening, hinge: orig.hinge === 'R' ? 'R' : 'L', carcass: orig.materials.carcass, front: orig.materials.front }
    : { layer: 'low', W: 600, H: size.low.H, D: size.low.D, rows: mk(PRESET_ROWS.low[4][1]), shelves: 0, inDr: 0, hinge: 'L', carcass: DEFAULT_ELEMENT_MATERIALS.carcass, front: DEFAULT_ELEMENT_MATERIALS.front });
  const [save, setSave] = useState<string | null>(null);
  const [opened, setOpened] = useState(false); // 3D tab: Otvori swings the doors, pulls the drawers (user 2026-11-25)
  const [apart, setApart] = useState(false); // 3D tab: assembled, Rasklopi animates it apart (user 2026-11-25)
  const [view, setView] = useState<'draw' | '3d'>('draw'); // "Rasklopljen 3D" like the Element page (user 2026-11-25)
  const [selPart, setSelPart] = useState<string | null>(null); // board picked in 3D ↔ cut-list line
  const [toast, setToast] = useState('');
  const [notice, setNotice] = useState('');
  if (!project) return <Navigate to="/brzi-start" replace />;
  // Back (and after Sačuvaj izmene) to where it was opened: Prostor (?iz=prostor, user 2026-11-25) or the Element page.
  const fromRoom = params.get('iz') === 'prostor', back = orig && !fromRoom ? `/element/${orig.id}` : '/projekat';
  const set = (p: Partial<Draft>) => setD(s => ({ ...s, ...p }));
  const u = project.unit;
  const v = (mm: number) => (u === 'mm' ? String(mm) : String(mm / 10).replace('.', ','));
  const num = (t: string, lo: number, hi: number) => { const n = parseLength(t, u); return n === null ? null : Math.max(lo, Math.min(hi, n)); };

  // ---------- the element (engine input)
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  // Editing keeps the element's own base (legs / elevation, back material…) and special kinds (sink, corner) while the layer stays.
  const same = orig && layerOf(orig.kind) === d.layer ? orig : undefined;
  const kind = same && (same.kind === 'sink' || same.kind === 'corner-blind') ? same.kind : kindOf(d.layer, d.rows);
  const doors = d.rows.some(r => r.type === 'door2') ? 2 : d.rows.some(r => r.type === 'door' || r.type === 'glass' || r.type === 'doorBlind') ? 1 : 0;
  const el: Element = {
    ...(same ?? makeElement(kind, '', 0, d.W, 'X', dims, DEFAULT_ELEMENT_MATERIALS)), kind,
    width: d.W, height: d.H, depth: d.D, front: d.rows, interior: { shelves: d.shelves, innerDrawers: d.inDr }, shelves: d.shelves,
    doors, hinge: doors === 2 ? 'LR' : doors ? d.hinge : 'none', drawerFronts: undefined,
    materials: { ...(same?.materials ?? DEFAULT_ELEMENT_MATERIALS), carcass: d.carcass, front: d.front }, opening: d.opening,
  };
  if (!d.opening) delete el.opening;
  const solo: Project = { ...project, elements: [el] };
  const op = d.opening ?? project.opening, eff = op?.kind;
  const prof = eff === 'profile' ? op?.profileHeight ?? 20 : 0;
  const rules = project.rules;
  const matName = (id: string) => project.materials[id]?.name ?? id;

  const L = LAYERS[d.layer], W = d.W, H = d.H, D = d.D;
  const rows = frontRows(el), P = d.layer === 'up' ? 0 : el.legs ?? 0, spacing = op?.spacing ?? 128;
  const frontFill = swatch(matName(d.front)) || '#EADBC4';

  // ---------- cut list and hardware (engine)
  const parts = generateParts(solo).filter(x => x.elementId === el.id).map(p => { // no run-length sokla (user 2026-11-25)
    const e = p.edges, all = e.L1 && e.L2 && e.W1 && e.W2, n = [e.L1, e.L2, e.W1, e.W2].filter(Boolean).length;
    const edge = all ? `kant ${dec(e.L1)} mm sve 4` : n ? `kant ${n} ${n === 1 ? 'duža' : 'ivice'}` : '';
    return { pos: p.pos, n: p.name, m: [matName(p.materialId), edge, p.note].filter(Boolean).join(' · '), q: p.qty, s: `${p.length} × ${p.width}` };
  });
  const DEP = /^(rucka|profil-vrh|potiskivac|sarka-push|klizac-.*-p2o-)/;
  const hw = hardware(solo).map(h => ({ n: h.name, q: `${dec(h.qty)} ${h.unit}`, dep: !!op && DEP.test(h.sku) }));

  // ---------- warnings
  const warns = frontWarnings(el, v, u);

  const projectWord = project.opening ? OPEN_SHORT[project.opening.kind] : 'ručka 128';
  const openText = (k: OpeningKind | 'project', t: string) => (k === 'project' ? `${t} (${projectWord})` : t);
  const summary = `${L.t} ${v(W)} × ${v(H)} × ${v(D)} · ${d.rows.length} ${d.rows.length === 1 ? 'red' : 'reda'} · ${d.opening ? OPEN.find(o => o[0] === d.opening!.kind)![1] : openText('project', 'Kao projekat')}`;
  const setOpening = (k: OpeningKind | 'project') => set({ opening: k === 'project' ? undefined : { ...(d.opening ?? project.opening ?? {}), kind: k } });
  const setOp = (p: Partial<OpeningSpec>) => set({ opening: { ...(op ?? { kind: 'bar' }), ...p } });
  const boards = Object.values(project.materials).filter(m => (m.kind === 'chipboard' || m.kind === 'mdf') && m.thickness >= 16);

  function addToRoom() {
    const placed = (params.get('zid') ? [params.get('zid')!] : []).concat(project!.room.walls.map(w => w.id))
      .map(wallId => ({ wallId, at: firstFreeOffset(project!, wallId, W, verticalRange(el)) })).find(x => x.at !== null);
    if (!placed) { setNotice(`Nema ${v(W)} ${u} slobodno ni na jednom zidu — smanji širinu ili oslobodi mesto u Prostoru.`); return; }
    const id = nextId(project!.elements.map(e => e.id), labelPrefix(kind));
    change(p => ({ ...p, elements: [...p.elements, { ...el, id, label: id, wallId: placed.wallId, offset: placed.at! }] }));
    if (customer) navigate(-1); else navigate('/projekat');
  }
  function saveEdit() {
    const { id, label, wallId, offset, side, name, note } = orig!;
    change(p => ({ ...p, elements: p.elements.map(e => (e.id === id ? { ...el, id, label, wallId, offset, ...(side && { side }), ...(name && { name }), ...(note && { note }) } : e)) }));
    if (customer) navigate(-1); else navigate(back);
  }
  function doSave() {
    const { id: _i, label: _l, wallId: _w, offset: _o, side: _s, ...element } = el;
    addTemplate({ name: save || 'Moj element', element });
    setSave(null); setToast(`„${save}" je sačuvan u Moji šabloni`); setTimeout(() => setToast(''), 2600);
  }

  return (
    <div className={APP_FIXED}>
      {customer ? <PlannerHeader project={project} role="kupac" step={1} /> : <Header units />}
      <div className="flex flex-wrap items-center gap-3 border-b bg-white px-5 py-2.5">
        <Link to={back} onClick={e => { if (customer) { e.preventDefault(); navigate(-1); } }} className={cn(buttonVariants({ variant: 'outline' }), 'no-underline')}><ArrowLeft aria-hidden="true" />{fromRoom || !orig ? 'Prostor' : orig.label}</Link>
        <h1 className="m-0 text-[18px] font-semibold flex items-center">Prilagođeni element{orig && ` · ${orig.label}`}<Tip k="config.title" align="right" /></h1>
        <span className="font-mono text-sm text-muted-foreground">{summary}</span>
        <div className="ml-auto flex gap-[8px] flex-wrap">
          {!customer && <Button variant="outline" onClick={() => setSave(`${L.t} ${W} – ${d.rows.length} ${d.rows.length === 1 ? 'red' : 'reda'}`)}>Sačuvaj kao šablon</Button>}
          <Button onClick={orig ? saveEdit : addToRoom}>{orig ? 'Sačuvaj izmene' : 'Dodaj u prostor'}</Button>
        </div>
        {notice && <div role="alert" className="basis-full text-sm text-warn-ink">{notice}</div>}
      </div>

      <div className="flex min-h-0 flex-1 max-[900px]:flex-col max-[900px]:overflow-y-auto">
        <aside aria-label="Podešavanja elementa" className={cn("flex-[0_0_380px] min-h-[0] overflow-y-auto bg-white border-r border-r-[#DDD8CE] p-[16px_18px_24px] flex flex-col gap-6 box-border", SIDE_SM)}>
          <section className="flex flex-col gap-3">
            <h2 className={cn(H2)}>1 · Osnova</h2>
            <Tabs value={d.layer} onValueChange={s => { const k = s as Layer; set({ layer: k, H: size[k].H, D: size[k].D, rows: mk(PRESET_ROWS[k][0][1]) }); }}>
              <TabsList aria-label="Vrsta" className="w-full">{(['low', 'up', 'tall'] as Layer[]).map(k => <TabsTrigger key={k} value={k}>{LAYERS[k].t}</TabsTrigger>)}</TabsList>
            </Tabs>
            <div className="grid grid-cols-3 gap-2">
              {([['Širina', 'W', 150, 1200], ['Visina', 'H', 200, 2600], ['Dubina', 'D', 200, 700]] as const).map(([t, k, lo, hi]) => (
                <label key={k} className={FIELD}>{t}
                  <Input key={d[k]} type="text" inputMode="numeric" defaultValue={v(d[k])}
                    onBlur={e => { const n = num(e.target.value, lo, hi); if (n) set({ [k]: n }); }}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="min-w-0 font-mono font-normal" />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Širina">
              {[300, 400, 450, 500, 600, 800, 900].map(w => <Toggle key={w} variant="outline" size="sm" pressed={W === w} onPressedChange={() => set({ W: w })} className="font-mono font-normal">{v(w)}</Toggle>)}
            </div>
            <div className={HINT}>{P ? `Sokla ${v(P)} ${u} · ukupno od poda ${v(H + P)} ${u}` : `Visi na zidu · donja ivica na ${v(el.elevation ?? 1450)} ${u} od poda`}</div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className={cn(H2)}>2 · Fronta<Tip k="config.front" align="right" /></h2>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ROWS[d.layer].map(([t, r]) => <Button key={t} variant="outline" size="sm" onClick={() => set({ rows: mk(r) })} className="font-normal">{t}</Button>)}
            </div>
            <div className="flex flex-col gap-1.5">
              {d.rows.map((r, i) => {
                const mv = (dd: number) => () => { const a = d.rows.slice(); [a[i], a[i + dd]] = [a[i + dd], a[i]]; set({ rows: a }); };
                const put = (p: Partial<FrontRow>) => { const a = d.rows.slice(); a[i] = { ...r, ...p }; set({ rows: a }); };
                return (
                  <div key={i} className="grid grid-cols-[14px_minmax(0,_1fr)_88px_repeat(3,_36px)] gap-1 items-center">
                    <span className="font-semibold text-[12px] leading-[normal] font-mono text-[#5F5A52]">{i + 1}</span>
                    <Choice label={`Vrsta reda ${i + 1}`} value={r.type} options={RTYPES} className="w-full min-w-0"
                      onChange={t => put({ type: t, appliance: t === 'app' ? r.appliance ?? (r.height && r.height < 500 ? 'micro38' : 'oven60') : undefined })} />
                    <Input key={`${i}-${r.height}`} type="text" inputMode="numeric" aria-label={`Visina reda ${i + 1} u ${u} (prazno = ostatak)`}
                      defaultValue={r.height ? v(r.height) : ''} placeholder={`auto ${rows[i] ? v(rows[i].h) : ''}`}
                      onBlur={e => put({ height: num(e.target.value, 60, 2400) })} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      className="min-w-0 px-2 font-mono placeholder:text-[13px]" />
                    <IconBtn tip="Gore" aria-label="Pomeri red gore" disabled={i === 0} onClick={mv(-1)} ><ChevronUp /></IconBtn>
                    <IconBtn tip="Dole" aria-label="Pomeri red dole" disabled={i === d.rows.length - 1} onClick={mv(1)} ><ChevronDown /></IconBtn>
                    <IconBtn tip="Ukloni" aria-label="Ukloni red" disabled={d.rows.length === 1} onClick={() => set({ rows: d.rows.filter((_, k) => k !== i) })} className="text-destructive hover:text-destructive"><X /></IconBtn>
                  </div>
                );
              })}
              <Button variant="outline" onClick={() => set({ rows: [...d.rows, { type: 'drawer', height: null }] })} className="border-dashed"><Plus />Dodaj red</Button>
            </div>
            {d.rows.some(r => r.type === 'door' || r.type === 'glass') && (
              <div className="flex items-center gap-2 text-sm font-medium">Šarke (1 krilo):
                <SegmentedControl label="Strana šarki" variant="outline" size="sm" itemClass="px-3 font-normal" value={d.hinge} onChange={h => set({ hinge: h })} options={[['L', 'Levo'], ['R', 'Desno']] as const} />
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className={cn(H2)}>3 · Unutrašnjost</h2>
            <div className="grid grid-cols-2 gap-2">
              {([['shelves', 'Fahovi', 6], ['inDr', 'Unutrašnje fioke', 4]] as const).map(([k, t, hi]) => (
                <div key={k} className={FIELD}>{t}
                  <ButtonGroup className="w-full">
                    <Button variant="outline" size="icon" aria-label={`${t} manje`} disabled={d[k] === 0} onClick={() => set({ [k]: Math.max(0, d[k] - 1) })}><Minus /></Button>
                    <ButtonGroupText className="flex-1 justify-center bg-white font-mono" aria-live="polite">{d[k]}</ButtonGroupText>
                    <Button variant="outline" size="icon" aria-label={`${t} više`} disabled={d[k] === hi} onClick={() => set({ [k]: Math.min(hi, d[k] + 1) })}><Plus /></Button>
                  </ButtonGroup>
                </div>
              ))}
            </div>
            {!customer && <label className={FIELD}>Leđa (pravilo projekta)
              <Choice label="Leđa" value={rules.backMode} className="w-full font-normal" onChange={v => change(p => ({ ...p, rules: { ...p.rules, backMode: v } }))}
                options={[['groove', 'HDF u žlebu (8 mm od ivice)'], ['nailed', 'HDF na preklop (ekserčići)'], ['inset18', 'Iverica 18 upuštena']] as const} />
            </label>}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className={cn(H2)}>4 · Ručke i otvaranje<Tip k="config.opening" align="right" /></h2>
            <div className="grid grid-cols-2 gap-1.5">
              {OPEN.filter(([k]) => k === 'project' || openingUsable(openingOff, k, d.opening?.kind)).map(([k, t, path]) => {
                const on = (d.opening?.kind ?? 'project') === k;
                return (
                  // Card-like toggle tile (design rule: rounded-lg border shadow-xs, pressed = primary border + ring).
                  <Toggle key={k} variant="outline" pressed={on} onPressedChange={() => setOpening(k)}
                    className={cn('h-auto min-h-[52px] justify-start gap-2 rounded-lg bg-white px-2 py-1.5 text-left font-normal whitespace-normal [&_svg]:shrink data-[state=on]:border-primary data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:ring-[3px] data-[state=on]:ring-primary/25', k === 'project' && 'col-span-full')}>
                    <svg width="44" height="34" viewBox="0 0 44 34" className="size-auto" aria-hidden="true"><rect x="3" y="3" width="38" height="28" rx="1.5" fill="#EADBC4" stroke="#1C1B19" strokeWidth="1.2" /><path d={path} fill="none" stroke="#1C1B19" strokeWidth={k === 'knob' ? 5 : k === 'push' ? 0 : k === 'profile' || k === 'project' ? 3 : 2.4} strokeLinecap="round" /></svg>
                    <span className="text-xs leading-tight">{openText(k, t)}</span>
                  </Toggle>
                );
              })}
            </div>
            {eff === 'bar' && !customer && (
              <label className={FIELD}>Razmak rupa šipke
                <Choice label="Razmak rupa šipke" value={spacing} className="w-full font-normal" onChange={v => setOp({ spacing: v as OpeningSpec['spacing'] })}
                  options={[96, 128, 160, 192, 320].map(v => [v, `${v} mm (dužina ~${v + 32})`] as const)} />
              </label>
            )}
            {eff === 'profile' && !customer && <div className="rounded-md bg-muted px-2.5 py-2 text-xs leading-normal text-muted-foreground">Alu profil se navlači na gornju ivicu fronte (kod gornjih elemenata na donju). Fronta je kraća za <strong>{prof} mm</strong>; profil ide u okov u metrima.</div>}
            {eff === 'push' && !customer && <div className="rounded-md bg-muted px-2.5 py-2 text-xs leading-normal text-muted-foreground">Bez ručke: krilo i fioka se otvaraju pritiskom. Šarke su bez opruge + potiskivač po krilu, fioke na vođicama sa potiskivanjem. Zazor fronti ostaje {rules.frontGap} mm.</div>}
            {eff && eff !== 'push' && (
              <div role="group" aria-label="Boja ručke" className="flex flex-wrap items-center gap-1.5 text-sm font-medium">Boja:
                {HCOL.map(([k, t, c]) => {
                  const on = (op?.color ?? 'black') === k;
                  return <Toggle key={k} variant="outline" size="sm" pressed={on} onPressedChange={() => setOp({ color: k })} className="px-2.5 font-normal"><span className="size-3 rounded-full border border-[#8A8378]" style={{ background: c || frontFill }} />{t}</Toggle>;
                })}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className={cn(H2)}>5 · Materijali</h2>
            {([['carcass', 'Korpus'], ['front', 'Fronta']] as const).map(([k, t]) => (
              <label key={k} className="grid grid-cols-[30px_1fr] items-end gap-x-2.5 text-sm font-medium">
                <span className="mb-[3px] w-[30px] h-[30px] rounded-[4px] border border-[#DDD8CE]" style={{ background: swatch(matName(d[k])) || 'repeating-linear-gradient(90deg, #EADBC4 0 3px, #FFFFFF 3px 6px)' }} />
                <span className="flex flex-col gap-2">{t}
                  <Choice label={t} value={d[k]} className="w-full font-normal" onChange={v => set({ [k]: v })} options={boards.map(m => [m.id, m.name] as const)} />
                </span>
              </label>
            ))}
            {!customer && <label className="grid grid-cols-[30px_1fr] items-end gap-x-2.5 text-sm font-medium">
              <span className="mb-[3px] w-[30px] h-[30px] rounded-[4px] border border-[#DDD8CE] bg-[repeating-linear-gradient(90deg,_#E7E1D5_0_3px,_#FFFFFF_3px_6px)]" />
              <span className="flex flex-col gap-2">Kant fronte (pravilo projekta)
                <Choice label="Kant fronte" value={rules.frontEdge.thickness} className="w-full font-normal" onChange={v => change(p => ({ ...p, rules: { ...p.rules, frontEdge: { ...p.rules.frontEdge, thickness: v } } }))}
                  options={[[2, 'ABS 2 mm u boji fronte'], [1, 'ABS 1 mm u boji fronte'], [0.4, 'ABS 0,4 mm']] as const} />
              </span>
            </label>}
          </section>
        </aside>

        <main className="flex-[1_1_auto] min-w-[0] min-h-[0] flex flex-col bg-[#FAF8F4]">
          <div className="flex items-center gap-[10px] py-[10px] px-[16px] border-b border-b-[#E4DFD5] text-[13px] text-[#5F5A52]">
            <Tabs value={view} onValueChange={x => setView(x as 'draw' | '3d')}>
              <TabsList aria-label="Prikaz elementa"><TabsTrigger value="draw" className="px-3">Spreda</TabsTrigger><TabsTrigger value="3d" className="px-3">3D</TabsTrigger></TabsList>
            </Tabs>
            {view === 'draw' ? <span>mere u {u} · isprekidani trougao = strana šarki</span> : <span>kako se sklapa · okreni mišem</span>}
            <span className="ml-auto flex gap-[6px] flex-wrap">
              {warns.map(w => <Badge key={w.text} variant={w.bad ? 'warn' : 'ok'}>{w.text}</Badge>)}
            </span>
          </div>
          <div className="flex-1 min-h-[0] p-[16px] flex items-center justify-center">
            {view === 'draw' ? <FrontDrawing el={el} rules={rules} opening={op} hinge={d.hinge} unit={u} frontFill={frontFill} className="w-full h-full max-w-[900px]"
              label={`Izgled spreda: ${L.t} ${W} × ${H}, ${rows.map(({ row, h }) => `${RTYPES.find(t => t[0] === row.type)?.[1].toLowerCase() ?? row.type} ${h}`).join(', ')}`} />
              : <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg">
                  {/* the draft alone on a wall of the room (a new unit has none yet), walls / worktop hidden, assembled until Rasklopi, like the Element page */}
                  {/* assembled and closed first; "Otvori" swings the doors / pulls the drawers, "Rasklopi" takes it apart (user 2026-11-25) */}
                  <div className="absolute bottom-3 right-3 z-10 flex gap-2">
                    <Button variant="outline" size="sm" aria-pressed={opened} onClick={() => setOpened(a => !a)}>{opened ? <DoorClosed /> : <DoorOpen />}{opened ? 'Zatvori' : 'Otvori'}</Button>
                    <Button variant="outline" size="sm" aria-pressed={apart} onClick={() => setApart(a => !a)}>{apart ? <Shrink /> : <Expand />}{apart ? 'Sklopi' : 'Rasklopi'}</Button>
                  </div>
                  <Suspense fallback={null}>
                    <SceneGL project={{ ...solo, room: { ...project.room, openings: [] }, elements: [{ ...el, wallId: el.wallId || params.get('zid') || project.room.walls[0]?.id || 'A', offset: el.wallId ? el.offset : 0 }] }}
                      cam="iso" solid sel={null} onSel={() => {}} noOpen explode={apart ? 80 : 0} explodable open={opened} selPart={selPart} onPart={setSelPart} layers={{ walls: false, carcass: true, fronts: true, tops: false }} real={realPalette(solo)} />
                  </Suspense>
                </div>}
          </div>
        </main>

        {!customer && <aside aria-label="Delovi i okov" className={cn("flex-[0_0_360px] min-h-[0] overflow-y-auto bg-white border-l border-l-[#DDD8CE] p-[16px_18px_24px] flex flex-col gap-[16px] box-border", SIDE_SM)}>
          <div>
            <h2 className="m-[0_0_8px] text-[16px] flex items-center">Krojna lista elementa<Tip k="config.cutList" align="left" /></h2>
            <Table>
              <TableHeader><TableRow><TableHead>Deo</TableHead><TableHead className="text-right">Kom</TableHead><TableHead className="text-right">Mera</TableHead></TableRow></TableHeader>
              <TableBody>
                {parts.map((p, i) => (
                  <TableRow key={i} aria-selected={selPart === p.pos} onClick={() => setSelPart(selPart === p.pos ? null : p.pos)}
                    className={cn('cursor-pointer', selPart === p.pos && '[&>td]:bg-ok-soft [&>td]:font-semibold')}><TableCell className="whitespace-normal">{p.n}<div className="text-xs text-muted-foreground">{p.m}</div></TableCell><TableCell className="text-right font-mono">{p.q}</TableCell><TableCell className="text-right font-mono">{p.s}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <h2 className="m-[0_0_8px] text-[16px]">Okov</h2>
            {hw.map(h => (
              <div key={h.n} className={cn('flex justify-between gap-[10px] text-[13px] py-[6px] px-[8px] rounded-[6px]', (h.dep ? 'bg-[#E2EFE6] text-[#1D4632]' : 'bg-[#F3F1EC] text-[#1C1B19]'))}><span>{h.n}</span><span className="font-mono whitespace-nowrap">{h.q}</span></div>
            ))}
          </div>
          <div className="text-[12px] text-[#5F5A52] leading-[1.5] border-t border-t-[#DDD8CE] pt-[12px]">Narandžasto označene stavke zavise od izabranog načina otvaranja.</div>
        </aside>}
      </div>

      <Dialog open={save !== null} onOpenChange={o => { if (!o) setSave(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sačuvaj kao šablon</DialogTitle>
            <DialogDescription>Šablon čuva mere, raspored fronti, unutrašnjost, otvaranje i materijale. Pojaviće se u grupi „Moji šabloni" u biblioteci Prostora i dodaje se jednim klikom.</DialogDescription>
          </DialogHeader>
          <Label className="flex-col items-stretch">Naziv u biblioteci<Input type="text" value={save ?? ''} onChange={e => setSave(e.target.value)} className="font-normal" /></Label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSave(null)}>Otkaži</Button>
            <Button onClick={doSave}>Sačuvaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {toast && <div role="status" className="fixed left-[50%] bottom-[24px] [transform:translateX(-50%)] bg-dark text-white py-[12px] px-[16px] rounded-[8px] text-[14px] z-[110] shadow-[0_8px_24px_rgba(0,0,0,0.25)]">{toast}</div>}
    </div>
  );
}

/** Front view of a custom unit (rows, door swings, handles, dimensions in `unit`): the Konfigurator's drawing, also the site's "Po meri". */
export function FrontDrawing({ el, rules, opening, hinge, unit, frontFill, label, className }: {
  el: Element; rules: ConstructionRules; opening?: OpeningSpec; hinge: 'L' | 'R'; unit: Unit; frontFill: string; label: string; className?: string;
}) {
  const layer = layerOf(el.kind), W = el.width, H = el.height, P = layer === 'up' ? 0 : el.legs ?? 0, up = layer === 'up';
  const v = (mm: number) => (unit === 'mm' ? String(mm) : String(mm / 10).replace('.', ','));
  const eff = opening?.kind, op = opening, prof = eff === 'profile' ? op?.profileHeight ?? 20 : 0;
  const rows = frontRows(el);
  const pad = Math.max(W, H + P) * 0.2 + 60, vb = `${-pad} ${-pad * 0.7} ${W + pad * 2} ${H + P + pad * 1.5}`;
  const Rr = (x: number, y: number, w: number, h: number) => `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}Z`;
  let dFront = '', dApp = '', dGlass = '', dOpen = '', dSwing = '', dHand = '';
  const spacing = op?.spacing ?? 128;
  const handleAt = (x: number, y: number, w: number, h: number, horiz: boolean, side?: 'L' | 'R') => {
    if (eff === 'push') return;
    if (eff === 'profile') { const py = up && !horiz ? y + h - 4 : y + 4; dHand += `M${x} ${py}h${w}`; return; }
    const len = eff === 'knob' ? 0 : spacing + 32;
    if (horiz) { const cx = x + w / 2, cy = y + Math.min(50, h * 0.3); dHand += eff === 'knob' ? `M${cx} ${cy}h0.01` : `M${cx - len / 2} ${cy}h${len}`; }
    else { const hx = side === 'R' ? x + 40 : x + w - 40, cy = layer === 'tall' ? y + h / 2 : up ? y + h - 40 - len / 2 : y + 40 + len / 2; dHand += eff === 'knob' ? `M${hx} ${cy}h0.01` : `M${hx} ${cy - len / 2}v${len}`; }
  };
  const swing = (x: number, y: number, w: number, h: number, side: 'L' | 'R') => {
    dSwing += side === 'L' ? `M${x + w} ${y}L${x} ${y + h / 2}L${x + w} ${y + h}` : `M${x} ${y}L${x + w} ${y + h / 2}L${x} ${y + h}`;
  };
  let yTop = 0;
  for (const { row, h: rh } of rows) {
    const g = rules.frontGap, x = g / 2, y = yTop + 2, w = W - g, h = rh - 4 - prof, yy = up ? y : y + prof;
    yTop += rh;
    if (h < 20) continue;
    if (row.type === 'app' || row.type === 'hood') { dApp += Rr(x, y, w, rh - 4); continue; } // appliance niche: no front (workshop rule)
    if (row.type === 'open') { dOpen += Rr(x, y, w, rh - 4) + `M${x} ${y + (rh - 4) / 2}h${w}`; continue; }
    if (row.type === 'door2') {
      const hw = Math.floor((W - 2 * g) / 2);
      dFront += Rr(x, yy, hw, h) + Rr(x + hw + g, yy, hw, h); swing(x, yy, hw, h, 'L'); swing(x + hw + g, yy, hw, h, 'R');
      handleAt(x, yy, hw, h, false, 'L'); handleAt(x + hw + g, yy, hw, h, false, 'R');
      continue;
    }
    const b = row.type === 'doorBlind' ? row.blindWidth ?? el.blindWidth ?? 0 : 0;
    if (b) { // corner door (engine frontLayout / blindSpan): blind part outlined on the corner side, mask (cornerMask) if any, door on the open part
      const m = cornerMask(el, b), left = hinge !== 'L', bx = left ? 0 : W - b;
      dOpen += Rr(bx + g / 2, y, b - m - g, rh - 4);
      const mx = left ? b - m - g / 2 : W - b + g / 2, dx = left ? b + g / 2 : g / 2, dw = W - b - g;
      dFront += (m ? Rr(mx, yy, m, h) : '') + Rr(dx, yy, dw, h); swing(dx, yy, dw, h, hinge); handleAt(dx, yy, dw, h, false, hinge);
      continue;
    }
    dFront += Rr(x, yy, w, h);
    if (row.type === 'glass') dGlass += Rr(x + 60, yy + 60, w - 120, h - 120);
    if (row.type === 'drawer' || row.type === 'lift') { handleAt(x, yy, w, h, true); continue; }
    if (row.type === 'panel') continue;
    swing(x, yy, w, h, hinge); handleAt(x, yy, w, h, false, hinge);
  }
  const fs = Math.round(Math.max(W, H + P) * 0.032);
  const oy = H + P + pad * 0.35, ox = W + pad * 0.3, lx = -pad * 0.35;
  let dDim = `M0 ${oy}h${W}M0 ${oy - 25}v50M${W} ${oy - 25}v50M${ox} 0v${H}M${ox - 25} 0h50M${ox - 25} ${H}h50`;
  const dimTexts: { x: number; y: number; fs: number; tr: string; t: string }[] = [
    { x: W / 2, y: oy - 18, fs, tr: '', t: v(W) },
    { x: ox + 30, y: H / 2, fs, tr: `rotate(90 ${ox + 30} ${H / 2})`, t: v(H) },
  ];
  if (P) { dDim += `M${ox} ${H}v${P}M${ox - 25} ${H + P}h50`; dimTexts.push({ x: ox + 30, y: H + P / 2, fs: Math.round(fs * 0.8), tr: `rotate(90 ${ox + 30} ${H + P / 2})`, t: v(P) }); }
  let ry = 0;
  for (const { h } of rows) { dDim += `M${lx - 20} ${ry}h40`; dimTexts.push({ x: lx - 30, y: ry + h / 2, fs: Math.round(fs * 0.85), tr: `rotate(-90 ${lx - 30} ${ry + h / 2})`, t: v(h) }); ry += h; }
  dDim += `M${lx} 0v${H}M${lx - 20} ${H}h40`;
  const hc = HCOL.find(c => c[0] === (op?.color ?? 'black'))!;
  return (
    <svg viewBox={vb} preserveAspectRatio="xMidYMid meet" role="img" className={cn('font-mono', className)} aria-label={label}>
      <path d={Rr(0, 0, W, H)} fill="#FFFFFF" stroke="#1C1B19" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      <path d={P ? Rr(40, H, W - 40, P) : 'M0 0'} fill="#D9D3C7" stroke="#1C1B19" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={dFront || 'M0 0'} fill={frontFill} stroke="#1C1B19" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      <path d={dApp || 'M0 0'} fill="#2B2A28" />
      <path d={dGlass || 'M0 0'} fill="#D6E3F5" stroke="#8A97AA" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={dOpen || 'M0 0'} fill="none" stroke="#8A8378" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={dSwing || 'M0 0'} fill="none" stroke="#5F5A52" strokeWidth="1" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
      <path d={dHand || 'M0 0'} fill="none" stroke={op?.color === 'front' ? '#5F5A52' : hc[2]} strokeWidth={eff === 'knob' ? 26 : eff === 'profile' ? 9 : 12} strokeLinecap="round" />
      <path d={dDim} fill="none" stroke="#2E6B4E" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {dimTexts.map((t, i) => <text key={i} x={t.x} y={t.y} fontSize={t.fs} textAnchor="middle" fill="#1D4632" transform={t.tr || undefined}>{t.t}</text>)}
    </svg>
  );
}

/** Construction warnings of a custom unit (row heights, low drawers, wide doors); "Konstrukcija je u redu" when none. */
export function frontWarnings(el: Element, v: (mm: number) => string, u: string): { text: string; bad: boolean }[] {
  const W = el.width, H = el.height, input = el.front ?? [], rows = frontRows(el);
  const fixed = input.reduce((a, r) => a + (r.height ?? 0), 0);
  const warns: { text: string; bad: boolean }[] = [];
  if (fixed > H) warns.push({ text: `Zbir visina redova (${v(fixed)}) je veći od visine ${v(H)}`, bad: true });
  rows.forEach(({ row, h }, i) => { if (row.type === 'drawer' && h < 110) warns.push({ text: `Fioka ${i + 1} niža od ${v(110)} ${u}`, bad: true }); });
  if (W > 600 && input.some(r => r.type === 'door')) warns.push({ text: `Krilo šire od ${v(600)} — razmisli o 2 krila`, bad: true });
  if (!warns.length) warns.push({ text: 'Konstrukcija je u redu', bad: false });
  return warns;
}
