// Planner (design/screens/Planer.html, PlanerStolar.html): one editor, two roles over the same project model (docs/SITE_AND_FLOW.md).
// The role only switches tools: customer = cm, catalog widths, 5 steps; workshop = mm, free sizes, custom unit, Konstrukcija,
// confirm (lock), 7 steps. The plan is the app's own Plan.tsx of the real project, not the reference's stylised mock.
// The shared session exists only once a workshop took the customer's request (usePartner: the real other side's name).
// shortcut: the live session itself is UI only (their cursor, "Prati me" are mock; the change list is this tab's own
// edits and is lost on leaving the screen); real sync comes with apps/api.
import {
  DEFAULT_ELEMENT_MATERIALS, firstFreeOffset, labelPrefix, layoutIssues, makeElement, nextId, PRESETS,
  roomWalls, verticalRange, type Element, type Project,
} from 'engine';
import { useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BRAND, BrandMark } from './brand';
import { LIBRARY, type LibItem } from './library';
import { FrontThumb, thumbOf } from './Editor';
import { fitView, Plan } from './Plan';
import { usePartner } from './partner';
import { useProject } from './store';

export type Role = 'kupac' | 'stolar';
const CUST = '#2E6B4E', SHOP = '#6B4A33';
const PEOPLE = {
  kupac: { i: 'A', name: 'Ana (kupac)', short: 'Ana', with: 'Anom (kupac)', c: CUST },
  stolar: { i: 'M', name: '[Radionica A] · Marko', short: 'Marko · stolar', with: 'Markom (stolar)', c: SHOP },
};
const other = (r: Role): Role => (r === 'kupac' ? 'stolar' : 'kupac');

type Kind = 'corner' | 'sink' | 'dw' | 'drawers' | 'base' | 'filler' | 'oven' | 'fridge' | 'pantry' | 'upper' | 'upperCorner' | 'hood' | (string & {});
/** Planner catalog (design CAT): name, plan colour, customer widths in cm, swaps, catalog item (fixtures/katalog.json). */
const DESIGN: Record<string, { name: string; color: string; widths: number[]; swaps: Kind[]; key: string }> = {
  base: { name: 'Donji sa krilima', color: '#EADBC4', widths: [30, 40, 45, 50, 60, 80], swaps: ['drawers', 'sink'], key: 'base600' },
  drawers: { name: 'Fioke (3)', color: '#EADBC4', widths: [40, 50, 60, 80], swaps: ['base', 'sink'], key: 'drawer600' },
  sink: { name: 'Sudopera', color: '#C9DAF2', widths: [60, 80, 90, 100], swaps: ['base', 'drawers'], key: 'sink800' },
  dw: { name: 'Mašina za sudove', color: '#FFFFFF', widths: [45, 60], swaps: ['base', 'drawers'], key: 'dw600' },
  corner: { name: 'Ugaoni', color: '#EADBC4', widths: [90, 100, 110], swaps: ['sink', 'base'], key: 'corner1000' },
  filler: { name: 'Filer', color: '#E0CCAD', widths: [5, 10, 15], swaps: [], key: 'filler' },
  oven: { name: 'Visoki sa rernom', color: '#D6BE98', widths: [60], swaps: ['fridge', 'pantry'], key: 'tallOF' },
  fridge: { name: 'Frižider ugradni', color: '#D6BE98', widths: [60], swaps: ['oven', 'pantry'], key: 'tallFr' },
  pantry: { name: 'Ostava', color: '#D6BE98', widths: [40, 50, 60], swaps: ['oven', 'fridge'], key: 'tall600' },
  upper: { name: 'Gornji', color: '#E2EFE6', widths: [30, 40, 60, 80], swaps: ['upperCorner'], key: 'up600' },
  upperCorner: { name: 'Gornji ugaoni', color: '#E2EFE6', widths: [60], swaps: ['upper'], key: 'upCorner' },
  hood: { name: 'Napa', color: '#FFFFFF', widths: [60], swaps: ['upper'], key: 'upHood' },
};
// The rest of the catalog (user 2026-11-21: the customer adds every ready unit like the workshop, only no custom unit), after the
// design's tiles; widths in cm that a joiner makes for that unit. The side mask (19 mm) stays a workshop detail.
const MORE: [string, number[]][] = [
  ['base800d', [60, 80, 90, 100]], ['baseFD', [40, 45, 50, 60]], ['drawer2', [40, 50, 60, 80, 90]], ['drawer4', [40, 50, 60]], ['oven600', [60]],
  ['cornerMech', [90, 100, 110]], ['bottle200', [15, 20, 30]], ['openEnd', [20, 30]],
  ['tallOM', [60]], ['tallIF', [40, 50, 60]], ['tallCargo', [20, 30, 40]], ['tallBroom', [40, 45, 50]], ['tallNiche', [60, 70]], ['tallHalf', [40, 50, 60]],
  ['up800', [60, 80, 90, 100]], ['upLift', [60, 80, 90, 100]], ['upGlass', [40, 50, 60]], ['upOpen', [30, 40, 60, 80]],
];
const TAB_OF = { Donji: 'donji', Visoki: 'visoki', Gornji: 'gornji' } as Record<string, string>;
const COLOR: Record<string, string> = { donji: '#EADBC4', visoki: '#D6BE98', gornji: '#E2EFE6' };
const TABS: [string, string, Kind[]][] = [
  ['donji', 'Donji', ['base', 'drawers', 'sink', 'dw', 'corner', 'filler']], ['visoki', 'Visoki', ['oven', 'fridge', 'pantry']], ['gornji', 'Gornji', ['upper', 'upperCorner', 'hood']],
];
const K = { ...DESIGN } as Record<Kind, (typeof DESIGN)[string]>;
for (const [key, widths] of MORE) {
  const it = LIBRARY.find(i => i.key === key)!, tab = TABS.find(t => t[0] === TAB_OF[it.group])!;
  K[key] = { name: it.name, color: COLOR[tab[0]], widths, swaps: tab[2].filter(k => k !== key && DESIGN[k]).slice(0, 4), key };
  tab[2].push(key);
}

/** Planner kind of a unit (also of units made by autoLayout or the full editor, which have no planner kind). */
export function kindOf(e: Element): Kind | null {
  const byKey = (Object.keys(K) as Kind[]).find(k => K[k].key === e.catalogKey);
  if (byKey) return byKey;
  switch (e.kind) {
    case 'corner-blind': return 'corner';
    case 'sink': return 'sink';
    case 'appliance-front': return 'dw';
    case 'drawer': return 'drawers';
    case 'base': return 'base';
    case 'filler': return 'filler';
    case 'wall': return 'upper';
    case 'tall': return e.front?.some(r => r.appliance === 'fridge') ? 'fridge' : e.front?.some(r => r.appliance?.startsWith('oven')) ? 'oven' : 'pantry';
    default: return null; // oven under the hob: shown, can be removed, not changed here
  }
}
export const nameOf = (e: Element) => { const k = kindOf(e); return k ? K[k].name : e.kind === 'oven' ? 'Rerna ispod ploče' : e.label; };
export const upper = (e: Element) => e.kind === 'wall';
const item = (k: Kind) => LIBRARY.find(i => i.key === K[k].key) as Extract<LibItem, { type: 'el' }>;
const dims = PRESETS.en1116;
const newUnit = (k: Kind, wallId: string, offset: number, width: number, id: string): Element =>
  ({ ...makeElement(item(k).kind, wallId, offset, width, id, dims, DEFAULT_ELEMENT_MATERIALS), ...item(k).template, width });
const range = (w: number[]) => (w.length === 1 ? `${w[0]}` : w.length === 2 ? w.join(' / ') : `${w[0]}–${w[w.length - 1]}`);

/** Units after `e` on the same wall and layer move by `delta` (people think in a row of units, not free positions). */
const shiftAfter = (els: Element[], e: Element, delta: number) =>
  els.map(x => x.id !== e.id && x.wallId === e.wallId && upper(x) === upper(e) && x.offset > e.offset ? { ...x, offset: x.offset + delta } : x);

/** "zid A" / "ostrvo" (the island line O). */
export const wallName = (id: string) => (id === 'O' ? 'ostrvo' : `zid ${id}`);
const id0 = (id: string) => (id === 'O' ? 'ostrvu' : `zidu ${id}`); // locative: "na zidu A" / "na ostrvu"

/** Walls with units, A first ("Zid A, zid B"); O = the island line. */
export const kitchenWalls = (p: Project) => roomWalls(p.room)
  .filter(w => w.id === 'A' || (['B', 'C', 'O'].includes(w.id) && p.elements.some(e => e.wallId === w.id))).sort((a, b) => a.id.localeCompare(b.id));

/** Steps per role (design STEPS) and where each one lives. */
const STEPS: Record<Role, (p: Project) => [string, string][]> = {
  kupac: () => [['Prostor', '/kupac/prostor'], ['Raspored', '/kupac/kuhinja'], ['Izgled', '/kupac/izgled'], ['Pregled', '/kupac/pregled'], ['Stolar', '/kupac/posalji']],
  stolar: p => [['Prostor', '/projekat'], ['Raspored', '/planer'], ['Izgled', '/3d'], ['Konstrukcija', `/element/${p.elements[0]?.id ?? ''}`], ['Krojna lista', '/krojna-lista'], ['Nacrti', '/nacrti'], ['Ponuda', '/ponuda']],
};

const Lock = ({ size = 12, title }: { size?: number; title?: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-label={title} aria-hidden={title ? undefined : true} className="flex-none">
    <rect x="4" y="9" width="12" height="9" rx="2" fill="none" stroke={SHOP} strokeWidth="2" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke={SHOP} strokeWidth="2" />
  </svg>
);

/** Phone header under md (design PlanerTelefon): "Korak n od N", step name, avatars, progress bar. */
export function PhoneHeader({ role, n, total, title, live = false, partner }: { role: Role; n: number; total: number; title: string; live?: boolean; partner?: string }) {
  const me = PEOPLE[role], them = { ...PEOPLE[other(role)], ...(partner && { name: partner }) };
  return (
    <div className="md:hidden">
      <header className="flex items-center gap-2.5 bg-dark px-3.5 py-3 text-background">
        <Link to="/" aria-label={`${BRAND.name} — početna`} className="inline-flex text-inherit"><BrandMark size={24} /></Link>
        <span className="flex flex-col leading-[1.2]"><span className="text-[12px] text-[#D8D3C9]">Korak {n} od {total}</span><strong className="text-[15px]">{title}</strong></span>
        <span aria-label={live ? `U sesiji: ${me.name} i ${them.name}` : me.name} className="ml-auto inline-flex">
          {(live ? [me, them] : [me]).map((p, i) => (
            <span key={p.i} title={p.name} style={{ background: p.c }}
              className={cn('inline-flex size-[26px] items-center justify-center rounded-full border-2 border-solid border-dark text-[11px] font-bold text-white', i && '-ml-2')}>{p.i}</span>
          ))}
        </span>
      </header>
      <div aria-hidden="true" className="h-1 bg-dark-line"><div className="h-full bg-accent-on-dark" style={{ width: `${(n / total) * 100}%` }} /></div>
    </div>
  );
}

/** Planner header: logo + project, role-based stepper, live presence + "Podeli". Under md: PhoneHeader. */
export function PlannerHeader({ project, role, step, live, right, partner }: { project: Project; role: Role; step: number; live: boolean; right?: ReactNode; partner?: string }) {
  const steps = STEPS[role](project);
  const size = kitchenWalls(project).filter(w => !w.island).map(w => Math.round(w.length / 10)).join(' × ');
  const me = PEOPLE[role], them = { ...PEOPLE[other(role)], ...(partner && { name: partner }) };
  return (<>
    <PhoneHeader role={role} n={step} total={steps.length} title={steps[step - 1][0]} live={live} partner={partner} />
    <header className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 bg-dark px-5 py-2.5 text-background max-md:hidden">
      <div className="flex min-w-0 items-center gap-3.5">
        <Link to={role === 'kupac' ? '/' : '/projekti'} aria-label={`${BRAND.name} — početna`} className="flex items-center gap-2.5 text-inherit no-underline hover:text-inherit">
          <BrandMark /><span className="text-[18px] font-bold tracking-[0.02em]">{BRAND.name}</span>
        </Link>
        <span className="truncate text-[14px] text-[#D8D3C9]">
          {role === 'kupac' ? 'Moja kuhinja' : 'Projekat'} · <strong className="font-semibold text-white">{role === 'kupac' ? `${project.name.replace(/^Moja kuhinja — /, '')} ${size}` : project.name}</strong>
        </span>
      </div>
      <nav aria-label="Koraci" className="flex items-center gap-0.5">
        {steps.map(([t, to], i) => {
          const n = i + 1, done = n < step, cur = n === step;
          return (
            <span key={t} className="contents">
              {i > 0 && <span aria-hidden="true" className={cn('h-0.5 w-2.5', n <= step ? 'bg-accent-on-dark' : 'bg-dark-line')} />}
              <Link to={to} aria-current={cur ? 'step' : undefined} aria-label={`Korak ${n} od ${steps.length}: ${t}${done ? ' — završeno' : cur ? ' — u toku' : ''}`}
                className={cn('inline-flex items-center gap-[7px] rounded-2xl py-[5px] pr-[11px] pl-[5px] text-[13px] font-medium whitespace-nowrap text-background no-underline hover:bg-dark-hover hover:text-white',
                  cur && 'bg-background text-foreground hover:bg-background hover:text-foreground')}>
                {done
                  ? <span aria-hidden="true" className="inline-flex size-[22px] items-center justify-center rounded-full bg-accent-on-dark"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#1C1B19" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  : <span aria-hidden="true" className={cn('box-border inline-flex size-[22px] items-center justify-center rounded-full border-[1.5px] border-solid font-mono text-[11px] font-semibold', cur ? 'border-primary' : 'border-muted-2 text-[#BDB6AA]')}>{n}</span>}
                {t}
              </Link>
            </span>
          );
        })}
      </nav>
      {right ?? <div className="flex items-center gap-2.5 justify-self-end">
        {live && <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent-on-dark"><span aria-hidden="true" className="size-2 rounded-full bg-accent-on-dark" />Uživo</span>}
        <span aria-label={live ? `U sesiji: ${me.name} i ${them.name}` : me.name} className="inline-flex">
          {(live ? [me, them] : [me]).map((p, i) => (
            <span key={p.i} title={p.name} style={{ background: p.c }}
              className={cn('inline-flex size-[30px] items-center justify-center rounded-full border-2 border-solid border-dark text-[13px] font-bold text-white', i && '-ml-2', i && !live && 'opacity-45')}>{p.i}</span>
          ))}
        </span>
        {/* shortcut: sharing comes with the live session on apps/api; the button is drawn, not wired yet. */}
        <Button variant={null} size="none" className="min-h-9 rounded-md border border-solid border-dark-line bg-transparent px-3 text-[13px] font-medium text-background">Podeli</Button>
      </div>}
    </header>
  </>);
}

type Change = { by: Role; text: string; undo: boolean };

export function Planner({ role }: { role: Role }) {
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const undo = useProject(s => s.undo);
  const navigate = useNavigate();
  const [tab, setTab] = useState('donji');
  const [query, setQuery] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [liveOn, setLive] = useState(true);
  const partner = usePartner(project?.id);
  const live = !!partner && liveOn; // no session before a workshop took the request
  const [follow, setFollow] = useState(false);
  const [log, setLog] = useState<Change[]>([]);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false); // phone: library over the plan
  const [commenting, setCommenting] = useState(false);
  const hit = useRef<{ id: string; t: number } | null>(null); // workshop: double click on a unit opens its construction // phone: message field in the sheet
  if (!project) return <Navigate to={role === 'kupac' ? '/kupac' : '/brzi-start'} replace />;

  const shop = role === 'stolar';
  const them = partner ? { ...PEOPLE[other(role)], name: partner, short: partner, with: partner } : PEOPLE[other(role)];
  const walls = kitchenWalls(project);
  const sel = project.elements.find(e => e.id === selId) ?? project.elements.find(e => !upper(e)) ?? null;
  const selKind = sel && kindOf(sel);
  const locked = !!sel?.confirmedAt && !shop;
  const wallLen = (id: string) => roomWalls(project.room).find(w => w.id === id)?.length ?? 0;
  const used = (id: string) => project.elements.filter(e => e.wallId === id && !upper(e)).reduce((m, e) => Math.max(m, e.offset + e.width), 0);
  const size = (mm: number) => (shop ? `${mm} mm` : `${Math.round(mm / 10)} cm`);

  /** Every planner edit is one undo step and one line in the change list. */
  const edit = (text: string, recipe: (p: Project) => Project) => { setMsg(''); change(recipe); setLog(l => [...l, { by: role, text, undo: true }]); };
  const undoLast = () => { undo(); setLog(l => { const i = l.map(c => c.undo).lastIndexOf(true); return i < 0 ? l : l.filter((_, j) => j !== i); }); };

  function add(k: Kind) {
    setAdding(false); // phone: back to the plan, where the sheet shows the result or the "no room" message
    const wall = sel?.wallId ?? 'A';
    const w0 = K[k].widths[K[k].widths.length > 2 ? K[k].widths.length - 2 : 0] * 10;
    const id = nextId(project!.elements.map(e => e.id), labelPrefix(item(k).kind));
    const probe = newUnit(k, wall, 0, w0, id);
    const offset = firstFreeOffset(project!, wall, w0, verticalRange(probe));
    if (offset === null) { setMsg(`Na ${id0(wall)} nema mesta za ${size(w0)}. Suzi ili obriši jedan element.`); return; }
    edit(`Dodat ${K[k].name} ${size(w0)} na ${wallName(wall)}`, p => ({ ...p, elements: [...p.elements, { ...probe, offset }] }));
    setSelId(id);
  }
  const setWidth = (w: number) => sel && w !== sel.width && edit(`${nameOf(sel)}: širina ${size(sel.width)} → ${size(w)}`,
    p => ({ ...p, elements: shiftAfter(p.elements, sel, w - sel.width).map(x => x.id === sel.id ? { ...x, width: w } : x) }));
  const setDim = (f: 'height' | 'depth', v: number) => sel && v !== sel[f] && edit(`${nameOf(sel)}: ${f === 'height' ? 'visina' : 'dubina'} ${sel[f]} → ${v} mm`,
    p => ({ ...p, elements: p.elements.map(x => x.id === sel.id ? { ...x, [f]: v } : x) }));
  const swap = (k: Kind) => sel && edit(`${K[k].name} umesto ${nameOf(sel)}`, p => {
    const ws = K[k].widths.map(w => w * 10), w = shop || ws.includes(sel.width) ? sel.width : ws[0];
    const fresh = { ...newUnit(k, sel.wallId, sel.offset, w, sel.id), label: sel.label, side: sel.side };
    return { ...p, elements: shiftAfter(p.elements, sel, w - sel.width).map(x => x.id === sel.id ? fresh : x) };
  });
  const remove = () => { if (!sel) return; edit(`Obrisan ${nameOf(sel)} ${size(sel.width)}`, p => ({ ...p, elements: shiftAfter(p.elements.filter(x => x.id !== sel.id), sel, -sel.width) })); setSelId(null); };
  const toggleLock = () => sel && edit(`${nameOf(sel)} ${sel.confirmedAt ? 'otključan' : 'potvrđen'}`,
    p => ({ ...p, elements: p.elements.map(x => x.id === sel.id ? { ...x, confirmedAt: sel.confirmedAt ? undefined : new Date().toISOString() } : x) }));
  const send = () => { if (note.trim()) { setLog(l => [...l, { by: role, text: `${sel ? nameOf(sel) + ': ' : ''}${note.trim()}`, undo: false }]); setNote(''); } };

  // Plain-words warning: a wall run longer than the wall first, then the editor's own checks.
  const over = walls.find(w => used(w.id) > wallLen(w.id));
  const warn = msg || (over ? `Elementi na ${id0(over.id)} su duži od zida (${size(used(over.id))} od ${size(wallLen(over.id))}). Suzi ili obriši jedan element.` : layoutIssues(project)[0]?.text ?? '');

  const q = query.trim().toLowerCase();
  const tiles = q ? (Object.keys(K) as Kind[]).filter(k => K[k].name.toLowerCase().includes(q) || K[k].widths.some(w => String(w).startsWith(q))) : TABS.find(t => t[0] === tab)![2];
  const widths = selKind ? K[selKind].widths : [];
  const wi = sel ? widths.indexOf(Math.round(sel.width / 10)) : -1;
  const narrower = () => sel && setWidth((wi < 0 ? [...widths].reverse().find(w => w * 10 < sel.width) ?? widths[0] : widths[wi - 1]) * 10);
  const wider = () => sel && setWidth((wi < 0 ? widths.find(w => w * 10 > sel.width) ?? widths[widths.length - 1] : widths[wi + 1]) * 10);
  const lastMine = log.map(c => c.undo).lastIndexOf(true);
  const SEG = (on: boolean) => cn('cursor-pointer rounded-md border-0 font-sans text-[13px] font-medium', on ? 'bg-white font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'bg-transparent');
  const PM = 'size-11 cursor-pointer rounded-lg border border-solid border-line-strong bg-white font-sans text-[20px] font-semibold text-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-muted-2';
  const SIDE_BTN = 'min-h-10 flex-1 rounded-md border-line-strong text-[13.5px] font-semibold';
  const SHEET_BTN = 'min-h-11 flex-1 rounded-lg border-line-strong text-[14px] font-semibold';
  const FLOAT = 'inline-flex size-11 items-center justify-center rounded-[10px] border border-solid border-border bg-white';

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <PlannerHeader project={project} role={role} step={2} live={live} partner={partner ?? undefined} />
      {!partner ? null : live
        ? <div role="region" aria-label="Zajednička sesija" className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-0 border-b border-solid border-[#A9D6BA] bg-accent-soft px-5 py-2 text-[14px] text-accent-ink max-md:hidden">
            <strong className="font-semibold">Zajednička sesija</strong>
            <span>sa {them.name} · {follow ? `${them.short} prati tvoj pogled` : 'svako gleda svoj pogled'}</span>
            <span className="ml-auto flex gap-2">
              <Button variant={null} size="none" aria-pressed={follow} onClick={() => setFollow(!follow)}
                className={cn('min-h-[34px] rounded-md border border-solid border-primary px-3 text-[13px] font-semibold', follow ? 'bg-primary text-white' : 'bg-white text-accent-ink')}>Prati me</Button>
              <Button size="none" className="min-h-[34px] rounded-md px-3 text-[13px]" onClick={() => setLive(false)}>Završi sesiju</Button>
            </span>
          </div>
        : <div className="flex items-center gap-3 border-0 border-b border-solid border-border bg-white px-5 py-2 text-[14px] text-ink-2 max-md:hidden">
            <span>Sesija je završena · {log.filter(c => c.undo).length} izmena čeka potvrdu druge strane.</span>
            <Button variant={null} size="none" onClick={() => setLive(true)} className="ml-auto min-h-[34px] rounded-md border border-solid border-primary bg-white px-3 text-[13px] font-semibold text-accent-ink">Započni sesiju</Button>
          </div>}
      {live && (
        <div role="region" aria-label="Zajednička sesija" className="flex items-center gap-2 bg-accent-soft px-3.5 py-[7px] text-[13px] text-accent-ink md:hidden">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />Uživo sa {them.with}
          <button type="button" aria-pressed={follow} onClick={() => setFollow(!follow)} className="ml-auto min-h-8 cursor-pointer border-0 bg-transparent p-0 font-sans text-[13px] font-semibold text-accent-ink">{follow ? 'Pratiš' : 'Prati'}</button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_330px] max-md:grid-cols-1">
        <aside aria-label="Elementi" className={cn('flex min-h-0 flex-col border-0 border-r border-solid border-border bg-white', adding ? 'max-md:fixed max-md:inset-0 max-md:z-30' : 'max-md:hidden')}>
          <div className="flex flex-col gap-2.5 px-3.5 pt-3.5 pb-2.5">
            <div className="flex items-center gap-2">
              <h2 className="m-0 text-[16px]">Dodaj element</h2>
              <span className="ml-auto text-[12px] text-muted-foreground">{shop ? 'pun katalog' : 'iz kataloga'}</span>
              <Button variant="outline" size="none" onClick={() => setAdding(false)} className="min-h-11 rounded-lg border-line-strong px-3 text-[14px] font-semibold md:hidden">Zatvori</Button>
            </div>
            <Input type="search" aria-label="Pretraga elemenata" placeholder="Pretraži: sudopera, fioke, 60…" value={query} onChange={e => setQuery(e.target.value)} className="h-auto min-h-10 px-2.5" />
            <div role="radiogroup" aria-label="Vrsta" className="flex gap-[3px] rounded-lg bg-background p-[3px]">
              {TABS.map(([id, t]) => (
                <button key={id} type="button" role="radio" aria-checked={!q && tab === id} onClick={() => { setTab(id); setQuery(''); }}
                  className={cn('min-h-[34px] flex-1 text-muted-foreground', SEG(!q && tab === id))}>{t}</button>
              ))}
            </div>
          </div>
          <ul className="m-0 grid min-h-0 flex-1 list-none grid-cols-2 content-start gap-2 overflow-y-auto px-3.5 pt-0 pb-3.5">
            {tiles.map(k => (
              <li key={k}>
                <button type="button" onClick={() => add(k)} aria-label={`Dodaj ${K[k].name}`}
                  className="flex min-h-[104px] w-full cursor-pointer flex-col items-center gap-[5px] rounded-lg border border-solid border-border bg-white p-2 font-sans text-foreground hover:brightness-[0.97]">
                  <span aria-hidden="true" className="inline-flex h-[42px] items-end"><FrontThumb el={thumbOf(item(k))} opening={project.opening?.kind} /></span>
                  <span className="text-[13px] leading-[1.2] font-semibold">{K[k].name}</span>
                  <span className="text-[11.5px] text-muted-foreground">{range(K[k].widths)} cm{shop && ' · slobodno'}</span>
                </button>
              </li>
            ))}
            {(
              <li className="col-span-full">
                <Link to={shop ? '/prilagodjeni' : '/kupac/prilagodjeni'} className="flex min-h-11 items-center justify-center rounded-lg border border-dashed border-primary text-[14px] font-semibold no-underline">+ Prilagođeni element</Link>
              </li>
            )}
          </ul>
        </aside>

        <main aria-label="Plan" className="relative flex min-h-0 min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 max-md:hidden">
            <span role="radiogroup" aria-label="Pogled" className="inline-flex rounded-lg bg-[#E8E4DC] p-[3px]">
              {([['Plan', ''], ['Zid', `${shop ? '' : '/kupac'}/zid/${sel?.wallId ?? 'A'}`], ['3D', shop ? '/3d' : '/kupac/izgled']] as const).map(([t, to]) => (
                <button key={t} type="button" role="radio" aria-checked={!to} onClick={() => to && navigate(to)} className={cn('min-h-8 px-3.5 text-ink-2', SEG(!to))}>{t}</button>
              ))}
            </span>
            <Button variant={null} size="none" aria-label="Poništi" onClick={undoLast} className="size-9 rounded-md border border-solid border-line-strong bg-white">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3L2 6l3 3M2 6h7a4 4 0 0 1 0 8H6" fill="none" stroke="#1C1B19" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Button>
            <span className="ml-auto text-[13px] text-muted-foreground">{shop ? `mere u mm · zid A ${wallLen('A')}` : 'mere u cm'}</span>
          </div>
          <div className="relative mx-3.5 min-h-0 flex-1 overflow-hidden rounded-lg border border-solid border-border bg-[#FAF8F4] max-md:m-0 max-md:rounded-none max-md:border-0">
            <Plan project={project} view={fitView(project)} unit={shop ? 'mm' : 'cm'} className="size-full"
              selection={sel ? { kind: 'el', id: sel.id } : undefined} onItemDown={s => { if (s.kind === 'el') { setSelId(s.id); hit.current = { id: s.id, t: Date.now() }; } }}
              onDoubleClick={() => { const h = hit.current; if (shop && h && Date.now() - h.t < 700) navigate(`/element/${h.id}`); }} />
            {live && (
              <div aria-hidden="true" className="pointer-events-none absolute flex items-start gap-0.5" style={shop ? { left: '55%', top: '25%' } : { left: '40%', top: '45%' }}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 2l12 5-5 2-2 5z" fill={them.c} stroke="#FFFFFF" strokeWidth="1.2" /></svg>
                <span className="mt-3 rounded-md px-[7px] py-0.5 text-[11.5px] font-semibold whitespace-nowrap text-white" style={{ background: them.c }}>{them.short}</span>
              </div>
            )}
            <span className="absolute top-3 right-3 flex flex-col gap-1.5 md:hidden">
              <Link to={shop ? '/3d' : '/kupac/izgled'} aria-label="3D prikaz" className={cn(FLOAT, 'text-[13px] font-semibold text-foreground no-underline')}>3D</Link>
              <button type="button" aria-label="Poništi" onClick={undoLast} className={cn(FLOAT, 'cursor-pointer')}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3L2 6l3 3M2 6h7a4 4 0 0 1 0 8H6" fill="none" stroke="#1C1B19" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </span>
          </div>
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 max-md:hidden">
            {warn
              ? <div role="status" className="flex flex-1 items-center gap-2 rounded-lg bg-warn-soft px-3 py-[9px] text-[13.5px] text-warn-ink">
                  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="flex-none"><path d="M9 2l7.5 13h-15z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 7v4M9 13v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  <span>{warn}</span>
                </div>
              : <div role="status" className="flex-1 rounded-lg bg-ok-soft px-3 py-[9px] text-[13.5px] text-ok">{shop ? 'Raspored je bez upozorenja.' : 'Raspored izgleda dobro. Stolar će ga proveriti pre ponude.'}</div>}
            <Link to={shop ? '/3d' : '/kupac/izgled'} className="ml-auto inline-flex min-h-11 items-center rounded-lg bg-primary px-[18px] text-[15px] font-semibold text-white no-underline hover:text-white">Dalje: izgled</Link>
          </div>

          <section aria-label="Izabrani element" className="flex flex-col gap-2.5 rounded-t-2xl border-0 border-t border-solid border-border bg-white px-4 pt-2.5 pb-3.5 shadow-[0_-6px_20px_rgba(28,27,25,0.08)] md:hidden">
            <span aria-hidden="true" className="h-1 w-10 self-center rounded-sm bg-border" />
            {sel && <>
              <div className="flex items-center gap-2.5">
                <strong className="min-w-0 truncate text-[17px]">{nameOf(sel)}</strong><span className="flex-none text-[13px] text-muted-foreground">{wallName(sel.wallId)}</span>
                {selKind && <span className="ml-auto flex items-center gap-1.5">
                  <button type="button" className={PM} aria-label="Uže" disabled={locked || wi === 0} onClick={narrower}>−</button>
                  <output className="min-w-[62px] text-center font-mono text-[17px] font-semibold">{size(sel.width)}</output>
                  <button type="button" className={PM} aria-label="Šire" disabled={locked || wi === widths.length - 1} onClick={wider}>+</button>
                </span>}
              </div>
              <div className="flex gap-2">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="none" className={SHEET_BTN} disabled={locked || !selKind || !K[selKind].swaps.length}>Zameni</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" aria-label="Zameni sa">
                    {selKind && K[selKind].swaps.map(k => <DropdownMenuItem key={k} onSelect={() => swap(k)}>{K[k].name}</DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="none" className={SHEET_BTN} disabled={locked} onClick={remove}>Obriši</Button>
                {partner && <Button variant="outline" size="none" className={SHEET_BTN} aria-expanded={commenting} onClick={() => setCommenting(!commenting)}>Komentar</Button>}
              </div>
              {partner && commenting && (
                <div className="flex gap-1.5">
                  <Input aria-label={`Poruka za ${them.name}`} placeholder="Komentar na izabrani element…" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} className="h-auto min-h-11 flex-1 px-2.5" />
                  <Button size="none" className="min-h-11 rounded-lg px-3 text-[14px]" onClick={send}>Pošalji</Button>
                </div>
              )}
            </>}
            {warn && <div role="status" className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{warn}</div>}
            <div className="flex gap-2">
              <Button variant={null} size="none" onClick={() => setAdding(true)} className="min-h-[50px] rounded-[10px] border border-solid border-primary bg-white px-4 text-[15px] font-semibold text-accent-ink">+ Dodaj</Button>
              <Link to={shop ? '/3d' : '/kupac/izgled'} className="inline-flex min-h-[50px] flex-1 items-center justify-center rounded-[10px] bg-primary text-[15px] font-semibold text-white no-underline hover:text-white">Dalje: izgled</Link>
            </div>
          </section>
        </main>

        <aside aria-label="Svojstva i izmene" className="flex flex-col overflow-y-auto border-0 border-l border-solid border-border bg-white max-md:hidden">
          {sel && (
            <section className="flex flex-col gap-3 border-0 border-b border-solid border-line-soft px-4 py-3.5">
              <div>
                <div className="text-[12px] font-semibold tracking-[0.06em] text-primary uppercase">Izabrano · {wallName(sel.wallId)}</div>
                <h2 className="mt-0.5 mb-0 text-[19px]">{nameOf(sel)}</h2>
              </div>
              {locked && (
                <div className="flex items-start gap-2 rounded-lg border border-solid border-[#E0CCAD] bg-[#F6EEE2] px-[11px] py-[9px] text-[13.5px] leading-[1.4] text-wood-bark">
                  <Lock size={16} /><span>Stolar je potvrdio ovaj element posle merenja. Možeš da predložiš izmenu — on je prihvata ili ne.</span>
                </div>
              )}
              {!shop && (
                <div className="flex flex-col gap-1.5">
                  {selKind && <>
                    <span className="text-[13.5px] text-muted-foreground">Širina</span>
                    <div className="flex items-center gap-2">
                      <button type="button" className={PM} aria-label="Uže" disabled={locked || wi === 0} onClick={narrower}>−</button>
                      <output className="min-w-[90px] text-center font-mono text-[20px] font-semibold">{Math.round(sel.width / 10)} cm</output>
                      <button type="button" className={PM} aria-label="Šire" disabled={locked || wi === widths.length - 1} onClick={wider}>+</button>
                    </div>
                    <span className="text-[12.5px] text-muted-foreground">Širine iz kataloga: {widths.join(', ')} cm</span>
                  </>}
                  <div className="mt-1 flex gap-1.5">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="none" className={SIDE_BTN} disabled={locked || !selKind || !K[selKind].swaps.length}>Zameni</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" aria-label="Zameni sa">
                        {selKind && K[selKind].swaps.map(k => <DropdownMenuItem key={k} onSelect={() => swap(k)}>{K[k].name}</DropdownMenuItem>)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {/* shortcut: proposals on a confirmed unit come with Saradnja (accept / reject); until then the button only shows the rule. */}
                    <Button variant="outline" size="none" className={SIDE_BTN} disabled={locked} title={locked ? 'Predlozi stižu sa saradnjom sa stolarom' : undefined} onClick={remove}>{locked ? 'Predloži izmenu' : 'Obriši'}</Button>
                  </div>
                </div>
              )}
              {shop && <>
                <div className="grid grid-cols-3 gap-2" key={`${sel.id}-${sel.width}-${sel.height}-${sel.depth}`}>
                  {([['Širina', 'width'], ['Visina', 'height'], ['Dubina', 'depth']] as const).map(([t, f]) => (
                    <label key={f} className="flex flex-col gap-1 text-[12.5px] text-muted-foreground">{t}
                      <Input type="number" defaultValue={sel[f]} className="h-auto min-h-[38px] px-2 font-mono text-[14px] font-medium"
                        onBlur={e => { const v = parseInt(e.target.value, 10); if (v > 0) (f === 'width' ? setWidth(v) : setDim(f, v)); }}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                    </label>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Button asChild variant="outline" size="none" className={cn(SIDE_BTN, 'text-foreground')}><Link to={`/element/${sel.id}`}>Konstrukcija</Link></Button>
                  <Button variant="outline" size="none" aria-pressed={!!sel.confirmedAt} onClick={toggleLock}
                    className={cn(SIDE_BTN, 'border-wood-walnut text-wood-bark', sel.confirmedAt ? 'bg-[#F6EEE2]' : 'bg-white')}>{sel.confirmedAt ? 'Otključaj' : 'Potvrdi (zaključaj)'}</Button>
                </div>
              </>}
            </section>
          )}

          <section aria-labelledby="ch-h" className="flex flex-1 flex-col gap-2.5 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <h2 id="ch-h" className="m-0 text-[15px]">{!partner ? 'Tvoje izmene' : live ? 'Izmene u ovoj sesiji' : 'Predlozi koji čekaju'}</h2>
              <span className="ml-auto text-[12px] text-muted-foreground">{!partner ? '' : live ? 'uživo' : 'druga strana potvrđuje'}</span>
            </div>
            {log.length
              ? <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {log.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-lg border border-solid border-line-soft px-2.5 py-2 text-[13.5px]">
                      <span aria-hidden="true" className="inline-flex size-[26px] flex-none items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: PEOPLE[c.by].c }}>{PEOPLE[c.by].i}</span>
                      <span className="min-w-0 flex-1 leading-[1.35]">{c.text}</span>
                      {c.undo && <Button variant={null} size="none" aria-label={`Poništi: ${c.text}`} disabled={i !== lastMine} onClick={undoLast}
                        title={i !== lastMine ? 'Poništava se redom, od poslednje izmene' : undefined}
                        className="min-h-[30px] rounded-md border border-solid border-line-strong bg-white px-2 text-[12px] font-medium text-foreground disabled:border-line-soft disabled:bg-[#FAF8F4] disabled:text-[#A39C90] disabled:opacity-100">Poništi</Button>}
                    </li>
                  ))}
                </ul>
              : <p className="m-0 text-[13.5px] text-muted-foreground">Još nema izmena.</p>}
            {!partner && <p className="m-0 text-[12.5px] leading-[1.45] text-muted-foreground">{shop ? 'Zajednička sesija sa kupcem se otvara kad preuzmeš njegov upit.' : 'Zajednička sesija sa stolarom se otvara kad pošalješ kuhinju stolaru i on prihvati projekat.'}</p>}
            {live && <p className="m-0 text-[12.5px] leading-[1.45] text-muted-foreground">Svako poništava samo svoje izmene. Na kraju sesije obe strane potvrde spisak i nastaje nova verzija.</p>}
            {partner && <div className="mt-auto flex flex-col gap-1.5 border-0 border-t border-solid border-line-soft pt-2.5">
              <label htmlFor="msg" className="text-[12.5px] text-muted-foreground">Poruka za {them.name}</label>
              <div className="flex gap-1.5">
                <Input id="msg" placeholder="Komentar na izabrani element…" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} className="h-auto min-h-[38px] flex-1 px-2.5" />
                <Button size="none" className="min-h-[38px] rounded-md px-3 text-[13px]" onClick={send}>Pošalji</Button>
              </div>
            </div>}
          </section>
        </aside>
      </div>
    </div>
  );
}
