// Quick start screen (design/screens/BrziStart.html, redesign 2026-11-22): accordion of inputs → autoLayout (docs/BRZI_START.md),
// live plan with draggable installation markers, result with the estimate from the workshop's price list and one-click fixes.
import {
  autoLayout, DEFAULT_ELEMENT_MATERIALS, DEFAULT_MATERIALS, DEFAULT_QUOTE, DEFAULT_RULES, heightToCeiling, islandOf, PRESETS,
  quickStartRoom, quote, type Element, type Project, type QuickStartInput, type Shape, type Unit,
} from 'engine';
import { Suspense, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { APP_FIXED } from './ui';
import { MainMenu, useNewRequests } from './AppShell';
import { SceneGL } from './SceneGL';
import { useProject } from './store';
import { useWorkshop } from './workshop';
import { newProjectId } from './projects';
import { pricedProject, usePrices } from './prices';

type Want = { dw: boolean; fridge: boolean; up: boolean; ceil: boolean; ovenTall: boolean; isl: boolean };
type Sec = 'proj' | 'shape' | 'walls' | 'inst' | 'want' | 'mat';

const SHAPES: [Shape | 'O', string, string][] = [['I', 'Ravna', 'M4 6H40'], ['L', 'Ugaona', 'M4 32V6H40'], ['U', 'U oblik', 'M4 32V6H40V32'], ['O', 'Ostrvo', 'M4 6H40']];
const WANTS: [keyof Want, string][] = [['dw', 'Mašina za sudove'], ['fridge', 'Ugradni frižider'], ['up', 'Gornji elementi'], ['ceil', 'Gornji do plafona'], ['ovenTall', 'Rerna u visokom'], ['isl', 'Ostrvo']];
// shortcut: "Kao prošli put" uses the workshop preset until workshop settings remember the last project's materials.
const MATS = [
  { id: 'last', preset: 'workshop', t: 'Kao prošli put', d: 'bela W980 + siva U708, kant 2 mm, Blum', sum: 'kao prošli put (bela + U708)', s: ['#FFFFFF', '#8A8D8F'] },
  { id: 'tpl', preset: 'workshop', t: 'Šablon radionice', d: '„Standard 2026“ — hrast + bela', sum: 'šablon radionice', s: ['#C49A6C', '#FFFFFF'] },
  { id: 'en', preset: 'en1116', t: 'Standard EN 1116', d: 'podrazumevane mere, materijale biraš posle', sum: 'EN 1116', s: ['#EEEAE2', '#DDD8CE'] },
] as const;
const FILL: Partial<Record<Element['kind'], string>> = { sink: '#C9DAF2', oven: '#3A3936', filler: '#E0CCAD', tall: '#D6BE98', 'appliance-front': '#FFFFFF' };
const isOvenTall = (e: Element) => e.kind === 'tall' && !!e.front?.some(r => r.appliance?.startsWith('oven'));
const NAME = (e: Element) => isOvenTall(e) ? 'rerna' : ({ 'corner-blind': 'ugaoni', base: 'donji', drawer: 'fiokar', sink: 'sudopera', 'appliance-front': 'MSP', oven: 'rerna', filler: 'filer', tall: 'frižider', wall: 'gornji' } as const)[e.kind];
const CHECK = <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const SEG_ON = 'bg-white font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]';
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const NUM_IN = 'box-border border-solid font-mono font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary';
// Plan in SVG units (viewBox 700 × 560), corner of walls A and B at (X0, Y0).
const X0 = 70, Y0 = 70;

export function QuickStart() {
  const navigate = useNavigate();
  const setProject = useProject(s => s.setProject);
  const settings = usePrices();
  const requests = useNewRequests();
  const [shape, setShape] = useState<Shape>('L');
  const [m, setM] = useState({ a: 3200, b: 2400, c: 2000, h: 2600, water: 1500, power: 900, win: 1100, winW: 1000 });
  const [want, setWant] = useState<Want>({ dw: true, fridge: true, up: true, ceil: false, ovenTall: false, isl: false });
  const [mat, setMat] = useState<(typeof MATS)[number]['id']>('last');
  const [info, setInfo] = useState({ name: '', customer: '', city: '' });
  const [unit, setUnit] = useState<Unit>('mm');
  const [open, setOpen] = useState<Partial<Record<Sec, boolean>>>({ shape: true, walls: true });
  const [view, setView] = useState<'plan' | '3d'>('plan');
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<'water' | 'power' | null>(null);

  const cm = unit === 'cm', step = cm ? 10 : 50;
  const fmt = (mm: number) => (cm ? String(mm / 10).replace('.', ',') : String(mm));
  const parse = (s: string) => { const v = parseFloat(s.replace(',', '.')); return Number.isNaN(v) ? null : Math.round(cm ? v * 10 : v); };
  const L = shape !== 'I', U = shape === 'U';
  const preset = MATS.find(x => x.id === mat)!.preset;

  const input: QuickStartInput = {
    shape, a: m.a, b: m.b, c: m.c, water: m.water, power400: m.power, window: m.winW > 0 ? { offset: m.win, width: m.winW } : undefined,
    dishwasher: want.dw, fridge: want.fridge, wallUnits: want.up, island: want.isl, oven: want.ovenTall ? 'tall' : 'under',
  };
  const layout = autoLayout(input, PRESETS[preset], DEFAULT_ELEMENT_MATERIALS);
  const base: Project = {
    id: 'quick-start', name: 'Brzi start', unit, presetId: preset, customer: [info.customer, info.city].filter(Boolean).join(', ') || undefined,
    room: { ...quickStartRoom(input), height: m.h }, elements: layout.elements, rules: DEFAULT_RULES, materials: DEFAULT_MATERIALS,
    opening: { kind: useWorkshop.getState().opening },
  };
  // "Gornji do plafona": wall units take their height up to the ceiling (same as the editor's "Do plafona").
  const project = want.ceil && want.up ? { ...base, elements: base.elements.map(e => (e.kind === 'wall' ? { ...e, height: heightToCeiling(base, e) ?? e.height } : e)) } : base;
  const q = layout.error ? null : quote(pricedProject(project, settings), settings.prices, { ...DEFAULT_QUOTE, vatPct: settings.vatPct, marginPct: settings.marginPct }, PRESETS[preset].worktopDepth);
  const price = q ? (Math.round(q.total / 100 / 1000) * 1000).toLocaleString('de-DE') : '—';

  const floor = project.elements.filter(e => e.kind !== 'wall'), uppers = project.elements.filter(e => e.kind === 'wall');
  const lowers = floor.filter(e => e.kind !== 'filler').length, fillers = floor.length - lowers, talls = floor.filter(e => e.kind === 'tall').length;
  const isl = want.isl ? islandOf(m.a) : null;
  const top = m.a + (L ? Math.max(0, m.b - 600 - (want.fridge ? 600 : 0)) : 0) + (U ? m.c - 600 : 0) + (isl?.len ?? 0);
  const sink = floor.find(e => e.kind === 'sink');
  const warns = [
    ...(layout.error ? [{ t: layout.error }] : []),
    ...layout.warnings.map(t => ({ t, fix: t.startsWith('Voda') && sink ? { text: 'Poravnaj', run: () => setM({ ...m, water: sink.offset + 400 }) } : undefined })),
  ];

  const create = (path: string) => {
    const name = info.name.trim() || `Kuhinja ${shape === 'I' ? 'ravna' : shape === 'L' ? 'ugaona (L)' : 'U'}`;
    setProject({ ...project, id: newProjectId(), name });
    navigate(path);
  };

  // ---- plan ----
  const H = Math.max(m.b, U ? m.c : 0);
  const sc = Math.min(560 / Math.max(m.a, 1), L ? 420 / Math.max(H, 1) : 1);
  const rectOf = (e: Element) => {
    const d = e.depth * sc, w = e.width * sc;
    if (e.wallId === 'B') return { x: X0, y: Y0 + (H - e.offset - e.width) * sc, w: d, h: w };
    if (e.wallId === 'C') return { x: X0 + (m.a - e.depth) * sc, y: Y0 + e.offset * sc, w: d, h: w };
    if (e.wallId === 'O' && isl) return { x: X0 + (isl.x + e.offset) * sc, y: Y0 + (isl.y - e.depth) * sc, w, h: d };
    return { x: X0 + e.offset * sc, y: Y0 + (e.kind === 'wall' ? 2 : 0), w, h: d };
  };
  const wallPath = (L ? `M${X0} ${Y0 + m.b * sc}V${Y0}` : `M${X0} ${Y0}`) + `H${X0 + m.a * sc}` + (U ? `V${Y0 + m.c * sc}` : '');
  const wx = X0 + m.water * sc;
  // Three-phase outlet: wall B from the corner with A; on wall A for the straight kitchen (engine input power400).
  const pp = L ? { x: X0 - 24, y: Y0 + m.power * sc } : { x: X0 + m.power * sc, y: Y0 + 30 };
  const toPlan = (ev: React.PointerEvent) => {
    const ctm = svg.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    return { x: (p.x - X0) / sc, y: (p.y - Y0) / sc };
  };
  const snap = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v / step) * step));
  const move = (ev: React.PointerEvent) => {
    const p = drag && toPlan(ev);
    if (!p) return;
    if (drag === 'water') setM({ ...m, water: snap(p.x, m.a) });
    else setM({ ...m, power: L ? snap(p.y, m.b) : snap(p.x, m.a) });
  };
  const marker = (k: 'water' | 'power', l: string, x: number, y: number, fill: string, ink: string, aria: string, horiz: boolean) => (
    <g key={k} className="cursor-grab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" tabIndex={0} role="slider" aria-label={aria}
      aria-valuenow={m[k]} aria-valuemin={0} aria-valuemax={horiz ? m.a : m.b}
      onPointerDown={ev => { (ev.currentTarget as Element & SVGGElement).setPointerCapture(ev.pointerId); setDrag(k); }}
      onPointerUp={() => setDrag(null)}
      onKeyDown={ev => {
        const d = { ArrowLeft: -step, ArrowDown: horiz ? -step : step, ArrowRight: step, ArrowUp: horiz ? step : -step }[ev.key];
        if (d) { ev.preventDefault(); setM({ ...m, [k]: snap(m[k] + d, horiz ? m.a : m.b) }); }
      }}>
      <circle cx={x} cy={y} r="12" fill={fill} stroke="#FFFFFF" strokeWidth="2.5" />
      <text x={x} y={y + 4} textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fontWeight="700" fill={ink}>{l}</text>
      <path d={horiz ? `M${x - 22} ${y}h-8M${x + 22} ${y}h8` : `M${x} ${y - 22}v-8M${x} ${y + 22}v8`} fill="none" stroke="#5F5A52" strokeWidth="1.2" />
    </g>
  );

  // ---- accordion ----
  const shapeName = SHAPES.find(s => s[0] === shape)![1];
  const secs: [Sec, string, string, ReactNode][] = [
    ['proj', 'Projekat', [info.name, info.customer].filter(Boolean).join(' · ') || 'naziv, kupac, mesto', (
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
        {([['name', 'Naziv projekta', 'Kuhinja Petrović'], ['customer', 'Kupac (nije obavezno)', 'Petrović'], ['city', 'Mesto', 'Novi Sad']] as const).map(([k, t, ph]) => (
          <label key={k} className={cn('flex flex-col gap-1 text-[13px] text-muted-foreground', k === 'name' && 'col-span-full')}>{t}
            <input type="text" value={info[k]} placeholder={ph} onChange={ev => setInfo({ ...info, [k]: ev.target.value })}
              className="box-border min-h-10 rounded-md border border-solid border-line-strong px-2.5 font-sans text-[15px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary" />
          </label>
        ))}
      </div>
    )],
    ['shape', 'Oblik', shapeName + (want.isl ? ' + ostrvo' : ''), (
      <div role="radiogroup" aria-label="Oblik" className="grid grid-cols-4 gap-2 px-4 pb-4">
        {SHAPES.map(([id, name, d]) => {
          const on = id === 'O' ? want.isl : shape === id && !(id === 'L' && want.isl);
          return (
            <button key={id} type="button" role="radio" aria-checked={on} className={cn('flex cursor-pointer flex-col items-center gap-1 rounded-lg border-solid px-1 py-2 font-sans text-foreground', FOCUS, on ? 'border-2 border-primary bg-accent-soft' : 'border border-border bg-white')}
              onClick={() => { if (id === 'O') { setWant({ ...want, isl: !want.isl }); if (shape === 'I') setShape('L'); } else setShape(id); }}>
              <svg width="44" height="34" viewBox="0 0 44 34" aria-hidden="true"><path d={d} fill="none" stroke="#1C1B19" strokeWidth="4" />{id === 'O' && <rect x="14" y="20" width="16" height="8" fill="#EADBC4" stroke="#1C1B19" strokeWidth="1.4" />}</svg>
              <span className="text-[12.5px] font-semibold">{name}</span>
            </button>
          );
        })}
      </div>
    )],
    ['walls', 'Mere prostorije', `A ${fmt(m.a)}${L ? ` · B ${fmt(m.b)}` : ''}${U ? ` · C ${fmt(m.c)}` : ''} · visina ${fmt(m.h)} ${unit}`, (
      <div className="flex flex-col gap-2.5 px-4 pb-4">
        {([['a', 'Zid A (sa vodom)', true], ['b', 'Zid B (levo od ugla)', L], ['c', 'Zid C (desno)', U], ['h', 'Visina plafona', true]] as const).filter(w => w[2]).map(([k, t]) => (
          <label key={k} className="grid grid-cols-[1fr_auto] items-center gap-2.5 text-[14px]">{t}
            <span className="inline-flex items-center overflow-hidden rounded-md border border-solid border-line-strong">
              <button type="button" aria-label={`${t} kraće`} onClick={() => setM({ ...m, [k]: Math.max(0, m[k] - step) })} className={cn('h-10 w-9 cursor-pointer border-0 border-r border-solid border-border bg-white font-sans text-[17px] font-semibold text-foreground', FOCUS)}>−</button>
              {/* Typed value is taken on Enter or leaving the field; the key resets it when the value changes elsewhere. */}
              <input key={`${m[k]}${unit}`} type="text" inputMode="numeric" defaultValue={fmt(m[k])} aria-label={`${t} u ${unit}`}
                onBlur={ev => { const v = parse(ev.target.value); if (v !== null) setM({ ...m, [k]: v }); }}
                onKeyDown={ev => { if (ev.key === 'Enter') ev.currentTarget.blur(); else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') { ev.preventDefault(); setM({ ...m, [k]: Math.max(0, m[k] + (ev.key === 'ArrowUp' ? step : -step)) }); } }}
                className={cn(NUM_IN, 'h-10 w-[78px] border-0 text-center text-[15px]')} />
              <button type="button" aria-label={`${t} duže`} onClick={() => setM({ ...m, [k]: m[k] + step })} className={cn('h-10 w-9 cursor-pointer border-0 border-l border-solid border-border bg-white font-sans text-[17px] font-semibold text-foreground', FOCUS)}>+</button>
            </span>
          </label>
        ))}
        <span className="text-[12.5px] text-muted-foreground">Unos u {cm ? 'cm (72,0 = 720 mm)' : 'mm'}; Enter potvrđuje, strelice ±{cm ? '1 cm' : '50 mm'}.</span>
      </div>
    )],
    ['inst', 'Instalacije i prozor', `voda ${fmt(m.water)} · struja ${fmt(m.power)} · ${m.winW > 0 ? `prozor ${fmt(m.win)}–${fmt(m.win + m.winW)}` : 'bez prozora'}`, (
      <div className="flex flex-col gap-2.5 px-4 pb-4">
        <div className="flex items-start gap-2 rounded-lg bg-accent-lightest px-[11px] py-[9px] text-[13px] leading-[1.4] text-accent-ink">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-px flex-none"><path d="M8 1v14M1 8h14M8 1l-2 2M8 1l2 2M8 15l-2-2M8 15l2-2M1 8l2-2M1 8l2 2M15 8l-2-2M15 8l-2 2" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
          Prevuci oznake na planu ili upiši mere od ugla.
        </div>
        {([
          ['V', `Voda i odvod · zid A`, fmt(m.water), '#1E50C8', '#FFFFFF', (v: string) => { const x = parse(v); if (x !== null) setM({ ...m, water: x }); }],
          ['S', `Trofazna · zid ${L ? 'B' : 'A'}`, fmt(m.power), '#F2B630', '#1C1B19', (v: string) => { const x = parse(v); if (x !== null) setM({ ...m, power: x }); }],
          ['P', 'Prozor · zid A, od – širina', m.winW > 0 ? `${fmt(m.win)} / ${fmt(m.winW)}` : '', '#DCE7F7', '#1C1B19', (v: string) => {
            const [o, w] = v.split('/').map(s => parse(s.trim()));
            setM({ ...m, win: o ?? 0, winW: w ?? 0 }); // empty = no window
          }],
        ] as const).map(([l, t, v, bg, fg, commit]) => (
          <div key={l} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2.5 text-[14px]">
            <span aria-hidden="true" className="box-border inline-flex size-[22px] items-center justify-center rounded-full border border-solid border-line-strong font-sans text-[10.5px] font-bold" style={{ background: bg, color: fg }}>{l}</span>
            <span>{t}</span>
            <input key={`${v}${unit}`} type="text" inputMode="numeric" defaultValue={v} placeholder={l === 'P' ? 'nema' : undefined} aria-label={`${t} u ${unit}`}
              onBlur={ev => commit(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') ev.currentTarget.blur(); }}
              className={cn(NUM_IN, 'h-[38px] rounded-md border border-line-strong px-2 text-right text-[14px]', l === 'P' ? 'w-[124px]' : 'w-[84px]')} />
          </div>
        ))}
      </div>
    )],
    ['want', 'Šta ide u kuhinju', [want.dw && 'MSP', want.fridge && 'frižider', want.up && 'gornji', want.ceil && 'do plafona', want.ovenTall && 'rerna u visokom', want.isl && 'ostrvo'].filter(Boolean).join(' · ') || 'samo donji elementi', (
      <div className="flex flex-wrap gap-2 px-4 pb-4">
        {WANTS.map(([k, t]) => (
          <button key={k} type="button" aria-pressed={want[k]} onClick={() => { setWant({ ...want, [k]: !want[k] }); if (k === 'isl' && shape === 'I' && !want.isl) setShape('L'); }}
            className={cn('box-border inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-[19px] border border-solid px-3 font-sans text-[13.5px] font-medium', FOCUS,
              want[k] ? 'border-primary bg-accent-soft text-accent-ink' : 'border-line-strong bg-white text-foreground')}>
            {want[k] && CHECK}{t}
          </button>
        ))}
      </div>
    )],
    ['mat', 'Materijali i mere', MATS.find(x => x.id === mat)!.sum, (
      <div role="radiogroup" aria-label="Materijali i mere" className="flex flex-col gap-2 px-4 pb-4">
        {MATS.map(x => (
          <button key={x.id} type="button" role="radio" aria-checked={mat === x.id} onClick={() => setMat(x.id)}
            className={cn('flex cursor-pointer items-center gap-3 rounded-lg border-solid px-3 py-2.5 font-sans text-foreground', FOCUS, mat === x.id ? 'border-2 border-primary bg-accent-lightest' : 'border border-border bg-white')}>
            <span aria-hidden="true" className="flex gap-[3px]">{x.s.map((c, i) => <span key={i} className="box-border h-7 w-4 rounded-[3px] border border-solid border-[#CFC7B8]" style={{ background: c }} />)}</span>
            <span className="flex flex-col text-left"><span className="text-[14px] font-semibold">{x.t}</span><span className="text-[12.5px] text-muted-foreground">{x.d}</span></span>
          </button>
        ))}
      </div>
    )],
  ];

  const TAB = 'box-border inline-flex min-h-[34px] items-center rounded-md px-3 text-[13.5px] font-medium no-underline';
  return (
    <div className={cn(APP_FIXED, 'bg-background')}>
      <MainMenu current="projekti" />
      <div className="flex h-[54px] flex-none items-center gap-3.5 border-0 border-b border-solid border-border bg-white px-4">
        <Link to="/projekti" className="inline-flex min-h-9 items-center text-[14px]">← Projekti</Link>
        <h1 className="m-0 text-[18px]">Novi projekat</h1>
        <div role="tablist" aria-label="Kako počinješ" className="ml-2 inline-flex rounded-lg bg-background p-[3px]">
          <Link to="/brzi-start" role="tab" aria-selected="true" className={cn(TAB, SEG_ON, 'hover:text-foreground')}>Brzi start</Link>
          <Link to="/ai-predlog" role="tab" aria-selected="false" className={cn(TAB, 'text-ink-2 hover:text-foreground')}>Iz fotografije (AI)</Link>
          <Link to="/projekat" role="tab" aria-selected="false" className={cn(TAB, 'text-ink-2 hover:text-foreground')}>Prazan plan</Link>
          <Link to="/upiti" role="tab" aria-selected="false" className={cn(TAB, 'text-ink-2 hover:text-foreground')}>Iz upita kupca
            {requests > 0 && <span className="ml-1.5 box-border inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-accent-on-dark px-[5px] text-[11px] font-semibold text-foreground">{requests}</span>}
          </Link>
        </div>
        <div role="group" aria-label="Jedinice mere" className="ml-auto flex overflow-hidden rounded-md border border-solid border-line-strong">
          {(['mm', 'cm'] as const).map(u => <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}
            className={cn('min-h-8 cursor-pointer border-0 px-2.5 font-mono text-[12.5px] font-semibold', unit === u ? 'bg-dark text-white' : 'bg-white text-ink-2')}>{u}</button>)}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[380px_minmax(0,1fr)_320px]">
        <aside aria-label="Podaci za raspored" className="overflow-y-auto border-0 border-r border-solid border-border bg-white">
          <div className="px-4 pt-3.5 pb-1.5"><p className="m-0 text-[14px] leading-[1.45] text-ink-2">Popuni šta znaš — plan desno se slaže odmah. Sve kasnije menjaš u editoru.</p></div>
          {secs.map(([k, t, sum, body], i) => {
            const on = !!open[k];
            return (
              <section key={k} className="border-0 border-t border-solid border-line-soft">
                <button type="button" aria-expanded={on} onClick={() => setOpen({ ...open, [k]: !on })}
                  className={cn('flex w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-4 py-3 text-left font-sans text-foreground hover:bg-plan', FOCUS)}>
                  <span aria-hidden="true" className={cn('box-border inline-flex size-6 flex-none items-center justify-center rounded-full font-mono text-[12px] font-semibold',
                    on ? 'border-[1.5px] border-solid border-primary text-accent-ink' : 'bg-accent-on-dark text-foreground')}>{on ? i + 1 : CHECK}</span>
                  <span className="flex min-w-0 flex-1 flex-col"><span className="text-[15px] font-semibold">{t}</span>{!on && <span className="truncate text-[12.5px] text-muted-foreground">{sum}</span>}</span>
                  <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true" className={cn(on && 'rotate-180')}><path d="M2 3.5l3 3 3-3" fill="none" stroke="#5F5A52" strokeWidth="1.5" /></svg>
                </button>
                {on && body}
              </section>
            );
          })}
        </aside>

        <main aria-label="Pregled rasporeda" className="flex min-h-0 min-w-0 flex-col">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <h2 className="m-0 text-[17px]">Složeno automatski</h2>
            <span className="text-[13.5px] text-muted-foreground">{lowers} donjih i visokih · {uppers.length} gornjih{fillers ? ` · ${fillers} filer` : ''}</span>
            <span role="radiogroup" aria-label="Pogled" className="ml-auto inline-flex rounded-lg bg-[#E8E4DC] p-[3px]">
              {([['plan', 'Osnova'], ['3d', '3D']] as const).map(([v, t]) => <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}
                className={cn('min-h-8 cursor-pointer rounded-md border-0 px-3.5 font-sans text-[13px] font-medium', view === v ? SEG_ON : 'bg-transparent text-ink-2')}>{t}</button>)}
            </span>
          </div>
          <div className="relative mx-4 mb-4 min-h-0 flex-1 overflow-hidden rounded-[10px] border border-solid border-border bg-plan bg-[size:40px_40px] [background-image:linear-gradient(var(--grid)_1px,transparent_1px),linear-gradient(90deg,var(--grid)_1px,transparent_1px)]">
            {view === 'plan' ? (
              <svg ref={svg} viewBox="0 0 700 560" role="img" aria-label={`Osnova: ${shapeName}, A ${fmt(m.a)}${L ? `, B ${fmt(m.b)}` : ''} ${unit}`} className="absolute inset-0 size-full" onPointerMove={move}>
                <path d={wallPath} fill="none" stroke="#1C1B19" strokeWidth="10" strokeLinecap="square" />
                {m.winW > 0 && <rect x={X0 + m.win * sc} y={Y0 - 5} width={m.winW * sc} height="10" fill="#DCE7F7" stroke="#1C1B19" strokeWidth="1" />}
                {[...floor, ...uppers].map(e => {
                  const r = rectOf(e), up = e.kind === 'wall', name = NAME(e), vertical = r.h > r.w;
                  const label = up ? '' : r.w > 34 || vertical ? (name.length > 8 && r.w < 70 && !vertical ? name.slice(0, 6) : name) : '';
                  return <g key={e.id}>
                    <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={up ? 'rgba(46,107,78,0.10)' : FILL[e.kind] ?? '#EADBC4'} stroke="#1C1B19" strokeWidth="1.1" strokeDasharray={up ? '5 3' : undefined}><title>{`${e.label} · ${name} ${fmt(e.width)}`}</title></rect>
                    {label && <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 4} textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fontWeight="600" fill={e.kind === 'oven' ? '#FFFFFF' : '#1C1B19'} pointerEvents="none">{label}</text>}
                  </g>;
                })}
                <text x={X0 + m.a * sc / 2} y={Y0 - 40} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" fill="#5F5A52">A {fmt(m.a)}</text>
                {L && <text x={X0 - 50} y={Y0 + m.b * sc / 2} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" fill="#5F5A52" transform={`rotate(-90 ${X0 - 50} ${Y0 + m.b * sc / 2})`}>B {fmt(m.b)}</text>}
                {marker('water', 'V', wx, Y0 - 22, '#1E50C8', '#FFFFFF', `Voda i odvod, ${fmt(m.water)} ${unit} od ugla, prevuci levo-desno`, true)}
                {marker('power', 'S', pp.x, pp.y, '#F2B630', '#1C1B19', `Trofazna struja, ${fmt(m.power)} ${unit} od ugla, prevuci ${L ? 'gore-dole' : 'levo-desno'}`, !L)}
              </svg>
            ) : (
              <Suspense fallback={null}>
                <SceneGL project={project} cam="iso" solid sel={null} onSel={() => {}} layers={{ walls: true, carcass: true, fronts: true, tops: true }} noOpen />
              </Suspense>
            )}
            <div className="absolute bottom-2.5 left-3 flex flex-wrap gap-3 rounded-lg border border-solid border-border bg-[rgba(255,255,255,0.92)] px-2.5 py-1.5 text-[12px] text-ink-2">
              <span className="inline-flex items-center gap-[5px]"><span aria-hidden="true" className="size-3 rounded-full bg-water" />voda i odvod</span>
              <span className="inline-flex items-center gap-[5px]"><span aria-hidden="true" className="size-3 rounded-full bg-power" />trofazna struja</span>
              <span className="inline-flex items-center gap-[5px]"><span aria-hidden="true" className="box-border h-2 w-3.5 border-[1.2px] border-dashed border-foreground" />gornji</span>
            </div>
          </div>
        </main>

        <aside aria-label="Rezultat" className="flex min-h-0 flex-col border-0 border-l border-solid border-border bg-white">
          <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-2">
              {([['Donji i visoki', lowers], ['Gornji', uppers.length], ['Radna ploča', fmt(top)], ['Visoki', talls]] as const).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-solid border-line-soft bg-plan px-2.5 py-[9px]"><div className="text-[12px] text-muted-foreground">{k}</div><div className="font-mono text-[17px] font-semibold">{v}</div></div>
              ))}
            </div>
            <div className="rounded-lg border border-solid border-accent-light bg-accent-lightest px-3 py-2.5">
              <div className="text-[12.5px] text-accent-ink">Procena po tvom cenovniku</div>
              <div className="font-mono text-[20px] font-bold text-foreground">≈ {price} RSD</div>
              <div className="text-[12px] text-ink-2">materijal, kant, okov, rad · bez montaže</div>
            </div>
            <section aria-labelledby="qs-warn" className="flex flex-col gap-1.5">
              <h3 id="qs-warn" className="m-0 text-[14px]">{warns.length ? `Za proveru (${warns.length})` : 'Provera'}</h3>
              {warns.map(w => (
                <div key={w.t} className="flex items-start gap-2 rounded-lg bg-warn-soft px-2.5 py-[9px] text-[13px] leading-[1.4] text-warn-ink">
                  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="mt-px flex-none"><path d="M9 2l7.5 13h-15z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 7v4M9 13v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  <span className="flex-1">{w.t}</span>
                  {'fix' in w && w.fix && <button type="button" onClick={w.fix.run} className={cn('min-h-7 flex-none cursor-pointer rounded-md border border-solid border-warn-line bg-white px-2 font-sans text-[12px] font-semibold text-warn-ink', FOCUS)}>{w.fix.text}</button>}
                </div>
              ))}
              {!warns.length && <div className="rounded-lg bg-ok-soft px-2.5 py-[9px] text-[13px] text-ok">Sve po pravilima radionice.</div>}
            </section>
            <section aria-labelledby="qs-list" className="flex flex-col gap-1.5">
              <h3 id="qs-list" className="m-0 text-[14px]">Elementi</h3>
              <div className="flex flex-wrap gap-[5px]">
                {floor.map(e => <span key={e.id} title={e.label} className={cn('rounded-md border border-solid border-border px-2 py-1 font-mono text-[12px] font-medium', e.kind === 'sink' ? 'bg-[#E5EEF9]' : e.kind === 'oven' ? 'bg-[#3A3936] text-white' : 'bg-plan')}>{NAME(e)} {fmt(e.width)}</span>)}
              </div>
            </section>
          </div>
          <div className="flex flex-col gap-2 border-0 border-t border-solid border-border px-4 py-3">
            <Button size="none" className="min-h-12 rounded-lg text-[16px]" disabled={!!layout.error} onClick={() => create('/projekat')}>Napravi projekat i doteraj</Button>
            <div className="grid grid-cols-2 gap-2">
              {([['Odmah krojna lista', '/krojna-lista'], ['Odmah ponuda', '/ponuda']] as const).map(([t, to]) => (
                <button key={to} type="button" disabled={!!layout.error} onClick={() => create(to)}
                  className={cn('min-h-10 cursor-pointer rounded-lg border border-solid border-line-strong bg-white font-sans text-[13.5px] font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50', FOCUS)}>{t}</button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
