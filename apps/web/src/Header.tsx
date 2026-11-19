// App header per design/*.dc.html: logo, project name, step navigation, mm/cm, Pomoć.
import { projectProgress, type StepProgress, type Unit } from 'engine';
import { Fragment, useMemo } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { Link, NavLink, useLocation, useMatch } from 'react-router';
import { useHelp } from './help';
import { SegmentedControl } from './ui';
import { useProject } from './store';

// Sub-screens keep their parent step active (DESIGN_SPEC §6): Zid → 1 Prostor, Poređenje → 5 Krojna lista, Element → 4 Elementi.
const UNITS = [['mm', 'mm'], ['cm', 'cm']] as const satisfies readonly (readonly [Unit, string])[];
const PARENT: [string, string][] = [['/zid/', '1 Prostor'], ['/element/', '4 Elementi'], ['/prilagodjeni', '4 Elementi'], ['/poredjenje', '5 Krojna lista']];
const STATUS_TEXT = (s: StepProgress) => (s.status === 'done' ? 'završeno' : s.status === 'partial' ? `u toku · ${Math.round(s.part * 100)} %` : 'nije započeto');
const STATUS_COLOR = { done: '#1F5A2A', partial: '#7C2D0A', todo: '#5F5A52' } as const;

const DOT = 'inline-flex size-[22px] flex-none items-center justify-center rounded-full';
/** Step circle (docs/TOK_PROJEKTA.md): done = filled with a tick, partial = progress ring with the number, todo = outline. */
function StepDot({ n, s }: { n: number; s: StepProgress }) {
  if (s.status === 'done') return <span aria-hidden="true" className={cn(DOT, 'bg-accent-on-dark')}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#1C1B19" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
  if (s.status === 'partial') {
    const p = Math.round(s.part * 100);
    return <span aria-hidden="true" className={DOT} style={{ background: `conic-gradient(#E2804D 0 ${p}%, #6B665E ${p}% 100%)` }}>
      <span className="inline-flex size-4 items-center justify-center rounded-full bg-background font-mono text-[11px] font-semibold text-foreground">{n}</span></span>;
  }
  // 22 px with the border like the other dots, so the steps never move when a status changes
  return <span aria-hidden="true" className={cn(DOT, 'box-border border-[1.5px] border-solid border-muted-2 font-mono text-[11px] font-semibold text-[#BDB6AA]')}>{n}</span>;
}

/** Step card on hover / focus (shadcn HoverCard, docs/UI_KOMPONENTE.md): checks of the step and its share. */
function StepCard({ n, name, s }: { n: number; name: string; s: StepProgress }) {
  return (
    <HoverCardContent side="bottom" sideOffset={10} aria-hidden="true"
      className="z-80 w-[230px] rounded-lg border border-solid border-border bg-white px-3 py-2.5 font-sans text-[12.5px] leading-[1.45] text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <span className="mb-1.5 flex justify-between gap-2"><strong>{n} · {name}</strong><span style={{ color: STATUS_COLOR[s.status] }}>{STATUS_TEXT(s)}</span></span>
      {s.checks.map(c => <span key={c.text} className="flex items-baseline gap-1.5"><span aria-hidden="true" className={cn('w-2.5 font-bold', c.ok ? 'text-ok-strong' : 'text-muted-2')}>{c.ok ? '✓' : '○'}</span><span>{c.text}</span></span>)}
      <span className="mt-1.5 block border-0 border-t border-solid border-line-soft pt-1.5 text-muted-foreground">Udeo u projektu: {s.weight} %</span>
    </HoverCardContent>
  );
}

// Step link: 13 px pill; current = light; under 900 px the whole nav goes to a second row (DESIGN_SPEC §6).
const STEP = 'k-step relative inline-flex items-center gap-[7px] whitespace-nowrap rounded-2xl py-[5px] pr-[11px] pl-[5px] text-[13px] font-medium text-on-dark no-underline hover:not-aria-[current=step]:bg-[#2E2C29] aria-[current=step]:bg-background aria-[current=step]:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-on-dark';
const NEW_STEP = 'rounded-md px-3.5 py-2 text-sm font-medium text-background no-underline [&.active]:bg-background [&.active]:text-foreground'; // no bold: it would widen the link

/**
 * ProjectHeader (DESIGN_SPEC §6): one header for all project screens; grid 1fr | auto | 1fr so the steps sit in the middle and never
 * move between screens; mm/cm and Pomoć always on the right. `kind: 'new'` = Quick start header (no project yet).
 * Editor (`.app-fixed`) under 900 px: tighter padding, no project name.
 */
export function Header({ kind = 'project', units = false }: { kind?: 'project' | 'new'; units?: boolean }) {
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const [help, toggleHelp] = useHelp();
  const { pathname } = useLocation();
  const firstEl = project?.elements[0]?.id;
  const progress = useMemo(() => (project && kind === 'project' ? projectProgress(project) : null), [project, kind]);
  const onElement = useMatch('/element/:id');
  const steps: { label: string; to: string | null }[] = [
    { label: '1 Prostor', to: '/projekat' },
    { label: '2 Nacrti', to: '/nacrti' },
    { label: '3 3D', to: '/3d' },
    { label: '4 Elementi', to: firstEl ? `/element/${firstEl}` : null },
    { label: '5 Krojna lista', to: '/krojna-lista' },
    { label: '6 Ponuda', to: '/ponuda' },
  ];
  const navCls = 'flex justify-center max-[900px]:col-span-full max-[900px]:row-start-2 max-[900px]:justify-start';
  return (
    <header className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 bg-foreground px-5 py-2.5 font-sans text-background max-[900px]:grid-cols-[minmax(0,1fr)_auto] max-[900px]:in-[.app-fixed]:gap-2 max-[900px]:in-[.app-fixed]:overflow-x-auto max-[900px]:in-[.app-fixed]:px-3 max-[900px]:in-[.app-fixed]:py-1.5">
      <div className="flex min-w-0 items-center gap-4">
        <Link to="/projekti" className="flex items-center gap-2.5 text-lg font-bold tracking-[0.02em] text-inherit no-underline" aria-label="Kroj — svi projekti">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#F3F1EC" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#E2804D" strokeWidth="2" /></svg>
          <span>Kroj</span>
        </Link>
        <div className="flex min-w-0 flex-col leading-[1.3]">
          <div className="min-w-0 truncate text-sm text-on-dark-muted max-[900px]:in-[.app-fixed]:hidden">
            {kind === 'new' ? 'Novi projekat' : <>Projekat: <strong className="font-semibold text-white">{project?.name ?? '—'}</strong></>}
          </div>
          {progress && <div className="hdr-progress truncate text-xs text-[#BDB6AA]"><strong className="font-semibold text-accent-on-dark">{progress.percent} % urađeno</strong> · sledeće: {progress.next}</div>}
        </div>
      </div>
      {kind === 'new' ? (
        <nav aria-label="Način pravljenja" className={cn(navCls, 'flex-wrap gap-1')}>
          <NavLink to="/" end className={NEW_STEP}>Brzi start</NavLink>
          <NavLink to="/ai-predlog" className={NEW_STEP}>Iz fotografije (AI)</NavLink>
          <Link to="/projekat" className={NEW_STEP}>Prazan projekat</Link>
        </nav>
      ) : (
        <nav aria-label="Koraci projekta" className={cn(navCls, 'items-center gap-0.5')}>
          {steps.map((s, i) => {
            const st = progress?.steps[i], name = s.label.replace(/^\d /, '');
            const current = !!s.to && (pathname === s.to || (i === 3 && !!onElement) || PARENT.some(([p, l]) => l === s.label && pathname.startsWith(p)));
            const body = st ? <><StepDot n={i + 1} s={st} /><span>{name}</span></> : <span>{s.label}</span>;
            const label = st ? `Korak ${i + 1} od 6: ${name} — ${STATUS_TEXT(st)}` : undefined;
            const link = s.to
              ? <NavLink to={s.to} className={STEP} aria-current={current ? 'step' : undefined} aria-label={label}>{body}</NavLink>
              : <span className={cn(STEP, 'cursor-not-allowed')} aria-disabled="true" aria-label={label} title="Prvo dodaj element">{body}</span>;
            return <Fragment key={s.label}>
              {i > 0 && <span className="h-0.5 w-3.5 flex-none rounded-[1px]" aria-hidden="true" style={{ background: progress?.steps[i - 1].status === 'done' ? '#E2804D' : '#4A4743' }} />}
              {st ? <HoverCard openDelay={0} closeDelay={0}><HoverCardTrigger asChild>{link}</HoverCardTrigger><StepCard n={i + 1} name={name} s={st} /></HoverCard> : link}
            </Fragment>;
          })}
        </nav>
      )}
      {progress && <div role="progressbar" aria-label="Projekat urađen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} className="absolute inset-x-0 bottom-0 h-[3px] bg-[#3A3835]"><div className="h-full bg-accent-on-dark" style={{ width: `${progress.percent}%` }} /></div>}
      <div className="flex items-center gap-3 justify-self-end">
        {(units || kind === 'project') && project && (
          <SegmentedControl label="Jedinice mere (važi za ceo projekat)" className="flex overflow-hidden rounded-md border border-solid border-muted-foreground"
            itemClass="border-0 bg-transparent px-3 py-[7px] font-sans text-[13px] text-background data-[state=on]:bg-accent-on-dark data-[state=on]:font-semibold data-[state=on]:text-foreground"
            options={UNITS} value={project.unit} onChange={u => change(p => ({ ...p, unit: u }), false)} />
        )}
        <button type="button" aria-pressed={help} onClick={toggleHelp} title="Uključi ili isključi objašnjenja (oznake i) na svim ekranima"
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-solid border-muted-foreground bg-transparent px-3 py-[7px] font-sans text-[13px] text-background aria-pressed:border-accent-on-dark aria-pressed:bg-accent-on-dark aria-pressed:font-semibold aria-pressed:text-foreground">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 7v4.5M8 4.6v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Pomoć
        </button>
      </div>
    </header>
  );
}
