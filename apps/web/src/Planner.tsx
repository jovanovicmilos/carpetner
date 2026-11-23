// Customer flow header (PlannerHeader, PhoneHeader) and unit names shared by the customer screens. The separate "Raspored"
// editor is gone (user 2026-11-23: one 2D screen, Prostor, for both roles); its design references (Planer, PlanerStolar,
// PlanerTelefon) are no longer built.
import { roomWalls, type Element, type Project } from 'engine';
import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BRAND, BrandMark } from './brand';
import { LIBRARY } from './library';
import { useSession } from './session';

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
export const nameOf = (e: Element) => { if (e.hob) return 'Fioke ispod ploče za kuvanje'; const k = kindOf(e); return k ? K[k].name : e.kind === 'oven' ? 'Rerna ispod ploče' : e.label; };
export const upper = (e: Element) => e.kind === 'wall';

/** "zid A" / "ostrvo" (the island line O). */
export const wallName = (id: string) => (id === 'O' ? 'ostrvo' : `zid ${id}`);

/** Walls with units, A first ("Zid A, zid B"); O = the island line. */
export const kitchenWalls = (p: Project) => roomWalls(p.room)
  .filter(w => w.id === 'A' || (['B', 'C', 'O'].includes(w.id) && p.elements.some(e => e.wallId === w.id))).sort((a, b) => a.id.localeCompare(b.id));

/** The two people of the header: the signed-in user and the other side (real names and initials once known). */
function usePeople(role: Role, partner?: string) {
  const name = useSession(s => s.session?.user.name);
  const at = (p: (typeof PEOPLE)[Role], n?: string) => (n ? { ...p, name: n, i: n.trim()[0]?.toUpperCase() ?? p.i } : p);
  return { me: at(PEOPLE[role], name), them: at(PEOPLE[other(role)], partner) };
}

/** Steps per role (design STEPS) and where each one lives. */
const STEPS: Record<Role, (p: Project) => [string, string][]> = {
  kupac: () => [['Prostor', '/kupac/prostor'], ['Izgled', '/kupac/izgled'], ['Pregled', '/kupac/pregled'], ['Stolar', '/kupac/posalji']],
  stolar: p => [['Prostor', '/projekat'], ['Izgled', '/3d'], ['Konstrukcija', `/element/${p.elements[0]?.id ?? ''}`], ['Krojna lista', '/krojna-lista'], ['Nacrti', '/nacrti'], ['Ponuda', '/ponuda']],
};

/** Phone header under md (design PlanerTelefon): "Korak n od N", step name, avatars, progress bar. */
export function PhoneHeader({ role, n, total, title, live = false, partner }: { role: Role; n: number; total: number; title: string; live?: boolean; partner?: string }) {
  const { me, them } = usePeople(role, partner);
  return (
    <div className="md:hidden">
      <header className="flex items-center gap-2.5 bg-dark px-3.5 py-3 text-background">
        <Link to="/" aria-label={`${BRAND.name} — početna`} className="inline-flex text-inherit"><BrandMark size={24} /></Link>
        <span className="flex flex-col leading-[1.2]"><span className="text-[12px] text-[#D8D3C9]">Korak {n} od {total}</span><strong className="text-[15px]">{title}</strong></span>
        <span aria-label={live ? `U sesiji: ${me.name} i ${them.name}` : me.name} className="ml-auto inline-flex">
          {(live ? [me, them] : [me]).map((p, i) => (
            <span key={i} title={p.name} style={{ background: p.c }}
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
  const { me, them } = usePeople(role, partner);
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
            <span key={i} title={p.name} style={{ background: p.c }}
              className={cn('inline-flex size-[30px] items-center justify-center rounded-full border-2 border-solid border-dark text-[13px] font-bold text-white', i && '-ml-2', i && !live && 'opacity-45')}>{p.i}</span>
          ))}
        </span>
        {/* shortcut: sharing comes with the live session on apps/api; the button is drawn, not wired yet. */}
        <Button variant={null} size="none" className="min-h-9 rounded-md border border-solid border-dark-line bg-transparent px-3 text-[13px] font-medium text-background">Podeli</Button>
      </div>}
    </header>
  </>);
}
