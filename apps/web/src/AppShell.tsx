// Workshop navigation (design/screens/AppShell.html, AdminShell.html; user 2026-11-21): row 1 = main menu, always visible when
// signed in (Projekti · the open project · Upiti; plan chip, "Radionica" menu where "Pomoć" was, avatar); row 2 = project bar,
// whenever a project is open, on every workshop screen (user 2026-11-21: also on Cenovnik, Materijali…; a step takes you back). Workshop pages (Cenovnik, Materijali…) sit in AdminLayout under row 1.
// The old "Pomoć" button is gone: "Pomoć na ekranu" is a switch in the Radionica menu and in the admin side menu.
import { projectProgress, type StepProgress, type Unit } from 'engine';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useMatch, useNavigate } from 'react-router';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { BRAND, BrandMark } from './brand';
import { useHelp } from './help';
import { usePlan } from './locks';
import { usePartner } from './partner';
import { ProjectChat } from './SessionPanel';
import { api, signOut, useSession } from './session';
import { markProject, useProject } from './store';
import { STEP_DONE, STEP_TODO } from './ui';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, ChevronRight, Copy, Link2, Link2Off } from 'lucide-react';
import { useProjects } from './projects';
import { currentPlan, planChip } from './SubscriptionPage';

/** Radionica menu and admin side menu: [group, [label, route, note]]. */
const GROUPS: [string, [string, string, string?][]][] = [
  ['Cene i materijali', [['Cenovnik', '/admin/cenovnik'], ['Materijali i katalog', '/admin/biblioteka', 'ploče, ručke, aparati'], ['Dobavljači', '/poredjenje']]],
  ['Podešavanja', [['Podrazumevane mere', '/admin/standardi'], ['Profil radionice', '/podesavanja/profil'], ['Korisnici i uloge', '/podesavanja/korisnici'], ['Paket i dodaci', '/pretplata'], ['AI asistent', '/admin/ai']]],
];
const TOP = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-[7px] text-[14px] font-medium text-background no-underline hover:bg-[#2A3A31] hover:text-white aria-[current=page]:bg-background aria-[current=page]:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-on-dark';
const MI = 'flex min-h-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-[14px] text-foreground no-underline hover:bg-[#F2F8F4] hover:text-foreground';
const GROUP_T = 'px-2.5 pt-2 pb-1 text-[11.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase';

/** "Pomoć na ekranu" switch (oznake i on every screen). */
function HelpSwitch({ note }: { note: string }) {
  const [help, toggle] = useHelp();
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex flex-1 flex-col"><span className="text-[14px] font-medium">Pomoć na ekranu</span><span className="text-[12px] text-muted-foreground">{note}</span></span>
      <button type="button" role="switch" aria-checked={help} aria-label="Pomoć na ekranu" onClick={toggle}
        className={cn('box-border inline-flex h-[26px] w-11 flex-none cursor-pointer rounded-[13px] border-0 p-[3px]', help ? 'justify-end bg-primary' : 'justify-start bg-line-strong')}>
        <span className="size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
      </button>
    </div>
  );
}

/** New requests plus unread customer messages in Upiti (signed-in workshop); signed out the design's example count. */
export function useNewRequests() {
  const shopId = useSession(s => (s.session ? s.workshops[0]?.id : undefined));
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    if (!shopId) return;
    api<{ status: string; unread?: number }[]>('GET', `/organizations/${shopId}/requests`).then(l => setN(l.reduce((a, r) => a + (r.status === 'new' ? 1 : 0) + (r.unread ?? 0), 0))).catch(() => {});
  }, [shopId]);
  return shopId ? n ?? 0 : 3;
}

/** Row 1. `current`: which item is the page (the open project inside a project, 'radionica' on workshop pages). */
export function MainMenu({ current }: { current?: 'projekti' | 'projekat' | 'upiti' | 'radionica' }) {
  const project = useProject(s => s.project);
  const user = useSession(s => s.session?.user);
  const shop = useSession(s => (s.session ? s.workshops[0]?.name : undefined));
  const chip = planChip(currentPlan(usePlan(s => s.grants)));
  const requests = useNewRequests();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const on = open || current === 'radionica';
  return (
    <header className="flex h-[52px] flex-none items-center gap-3.5 bg-dark px-4 text-background">
      <Link to="/projekti" aria-label={`${BRAND.name} — projekti`} className="flex items-center gap-[9px] text-inherit no-underline hover:text-inherit">
        <BrandMark size={26} /><span className="text-[17px] font-bold">{BRAND.name}</span>
      </Link>
      <nav aria-label="Glavni meni" className="ml-1.5 flex items-center gap-0.5">
        <Link to="/projekti" className={TOP} aria-current={current === 'projekti' ? 'page' : undefined}>Projekti</Link>
        {project && <Link to="/projekat" className={TOP} aria-current={current === 'projekat' ? 'page' : undefined}>
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 14V2h12" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M3.5 3.5h5v3h-5zM3.5 6.5h2.5v6H3.5z" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
          {project.name.replace(/ — .*$/, '')}
        </Link>}
        <Link to="/upiti" className={TOP} aria-current={current === 'upiti' ? 'page' : undefined}>Upiti{requests > 0 && <span aria-label={`${requests} novo`}
          className="box-border inline-flex h-5 min-w-5 items-center justify-center rounded-[10px] bg-accent-on-dark px-[5px] text-[12px] font-semibold text-foreground">{requests}</span>}</Link>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <Link to="/pretplata" className="rounded-xl bg-accent-on-dark px-2.5 py-1 text-[12.5px] font-semibold text-foreground no-underline hover:text-foreground">{chip}</Link>
        <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-current={current === 'radionica' ? 'page' : undefined}
              className={cn('box-border inline-flex min-h-9 cursor-pointer items-center gap-[7px] rounded-md border border-solid px-3 font-sans text-[14px] font-semibold',
                on ? 'border-background bg-background text-foreground' : 'border-[#3E5045] bg-transparent text-background')}>
              <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="7" cy="5" r="2" fill="#1F2B24" stroke="currentColor" strokeWidth="1.6" /><circle cx="13" cy="10" r="2" fill="#1F2B24" stroke="currentColor" strokeWidth="1.6" /><circle cx="8" cy="15" r="2" fill="#1F2B24" stroke="currentColor" strokeWidth="1.6" /></svg>
              Radionica
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} aria-label="Radionica"
            className="flex w-[338px] flex-col gap-0.5 rounded-[10px] border border-solid border-border bg-white p-2 font-sans shadow-[0_12px_32px_rgba(28,27,25,0.18)]">
            {GROUPS.map(([g, items]) => <Fragment key={g}>
              <div className={GROUP_T}>{g}</div>
              {items.map(([t, to, note]) => (
                <DropdownMenuItem key={t} asChild className={cn(MI, 'focus:bg-[#F2F8F4]')}>
                  <Link to={to}><span aria-hidden="true" className="size-2 rounded-[2px] bg-wood-oak" /><span className="flex-1">{t}</span>{note && <span className="text-[12px] text-muted-foreground">{note}</span>}</Link>
                </DropdownMenuItem>
              ))}
            </Fragment>)}
            <div className="mx-1 my-1.5 h-px bg-line-soft" />
            <div className="px-2.5 py-2"><HelpSwitch note="oznake i i saveti na svim ekranima" /></div>
            <DropdownMenuItem className={cn(MI, 'cursor-pointer text-muted-foreground focus:bg-[#F2F8F4]')} onSelect={() => { signOut(); navigate('/prijava'); }}>Odjava</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span title={`${user?.name ?? 'Marko'} — ${shop ?? '[Radionica A]'}`}
          className="box-border inline-flex size-8 items-center justify-center rounded-full border-2 border-solid border-[#3E5045] bg-wood-walnut text-[13px] font-bold text-white">
          {(user?.name ?? 'Marko')[0].toUpperCase()}
        </span>
      </div>
    </header>
  );
}

const STATUS_TEXT = (s: StepProgress) => (s.status === 'done' ? 'završeno' : s.status === 'partial' ? `u toku · ${Math.round(s.part * 100)} %` : 'nije započeto');
const STATUS_COLOR = { done: '#1F5A2A', partial: '#1D4632', todo: '#5F5A52' } as const;

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


const UNITS: [Unit, string][] = [['mm', 'mm'], ['cm', 'cm']];
// Sub-screens keep their parent step (DESIGN_SPEC §6): Zid → Prostor, Prilagođeni → Elementi, Poređenje → Krojna lista.
const PARENT: [string, number][] = [['/zid/', 0], ['/element/', 3], ['/prilagodjeni', 3], ['/poredjenje', 4]];

/** Row 2: project name and progress, the 6 steps, mm/cm, Podeli. `step` (0–5) overrides the step taken from the route. */
export function ProjectBar({ step }: { step?: number }) {
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const { pathname } = useLocation();
  const onElement = useMatch('/element/:id');
  const progress = useMemo(() => (project ? projectProgress(project) : null), [project]);
  const partner = usePartner(project?.id); // shared session: the customer edits this kitchen too
  if (!project || !progress) return null;
  const firstEl = project.elements[0]?.id;
  const steps: [string, string | null][] = [['Prostor', '/projekat'], ['Nacrti', '/nacrti'], ['3D', '/3d'], ['Elementi', firstEl ? `/element/${firstEl}` : null], ['Krojna lista', '/krojna-lista'], ['Ponuda', '/ponuda']];
  const cur = step ?? steps.findIndex(([, to], i) => to === pathname || (i === 3 && !!onElement) || PARENT.some(([p, n]) => n === i && pathname.startsWith(p)));
  return (
    <div className="relative grid h-[50px] flex-none grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-0 border-b border-solid border-border bg-white px-4">
      <div className="flex min-w-0 flex-col leading-[1.25]">
        {/* user 2026-11-24: rename the project freely and keep the customer's name with it */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="Promeni naziv projekta i ime kupca" className="min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left font-sans text-[14px] font-semibold text-foreground hover:underline">
              {project.name || 'Bez naziva'}{project.customer ? <span className="font-normal text-muted-foreground"> · {project.customer}</span> : null}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="flex w-[300px] flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-medium">Naziv projekta
              <Input value={project.name} placeholder="npr. Kuhinja Petrović" onChange={e => change(p => ({ ...p, name: e.target.value }), false)} />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium">Kupac
              <Input value={project.customer ?? ''} placeholder="Ime i prezime kupca" onChange={e => change(p => ({ ...p, customer: e.target.value }), false)} />
            </label>
          </PopoverContent>
        </Popover>
        <span className="text-[12px] whitespace-nowrap text-muted-foreground"><strong className="font-semibold text-accent-ink">{progress.percent} % urađeno</strong> · sledeće: {progress.next}</span>
      </div>
      <nav aria-label="Koraci projekta" className="flex items-center gap-0.5">
        {steps.map(([name, to], i) => {
          const done = progress.steps[i].status === 'done', now = i === cur;
          const label = `Korak ${i + 1} od 6: ${name}${done ? ' — završeno' : now ? ' — u toku' : ''}`;
          const dot = <span aria-hidden="true" className={cn('box-border inline-flex size-[22px] items-center justify-center rounded-full font-mono text-[11px] font-semibold',
            done ? 'bg-accent-on-dark text-foreground' : now ? 'border-[1.5px] border-solid border-primary bg-white text-foreground' : 'border-[1.5px] border-solid border-line-strong text-muted-foreground')}>
            {done ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#1C1B19" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg> : i + 1}</span>;
          const cls = 'k-step inline-flex items-center gap-[7px] whitespace-nowrap rounded-[14px] py-1 pr-2.5 pl-1 text-[13px] font-medium text-foreground no-underline hover:bg-[#E2EFE6] hover:text-foreground aria-[current=step]:bg-dark aria-[current=step]:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-on-dark';
          return <Fragment key={name}>
            {i > 0 && <ChevronRight aria-hidden="true" size={14} strokeWidth={1.8} className="mx-0.5 flex-none" color={done || now ? '#8CC5A2' : '#BDB5A6'} />}
            <HoverCard openDelay={0} closeDelay={0}><HoverCardTrigger asChild>
              {to ? <Link to={to} className={cls} aria-current={now ? 'step' : undefined} aria-label={label}>{dot}{name}</Link>
                : <span className={cn(cls, 'cursor-not-allowed')} aria-disabled="true" aria-label={label} title="Prvo dodaj element">{dot}{name}</span>}
            </HoverCardTrigger><StepCard n={i + 1} name={name} s={progress.steps[i]} /></HoverCard>
          </Fragment>;
        })}
      </nav>
      <div className="flex items-center gap-2.5 justify-self-end">
        {/* presence ("Petar nije tu · pre 20 h") is shown in the chat dock, not here (user 2026-11-24) */}
        <ProjectChat partner={partner} customer={false} />
        <div role="group" aria-label="Jedinice mere (važi za ceo projekat)" className="flex overflow-hidden rounded-md border border-solid border-line-strong">
          {UNITS.map(([u, t]) => <button key={u} type="button" aria-pressed={project.unit === u} onClick={() => change(p => ({ ...p, unit: u }), false)}
            className={cn('min-h-8 cursor-pointer border-0 px-2.5 font-mono text-[12.5px] font-semibold', project.unit === u ? 'bg-dark text-white' : 'bg-white text-ink-2')}>{t}</button>)}
        </div>
        {!partner && <ShareLink />}
        <StepMark />
      </div>
      <div role="progressbar" aria-label="Projekat urađen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} className="absolute inset-x-0 -bottom-px h-[3px] bg-[#EEEAE2]">
        <div className="h-full bg-primary" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}

/**
 * "Link za kupca" (user 2026-11-25, where the unwired "Podeli" was): a read-only link to the kitchen (/k/:token, SharedKitchen.tsx).
 * Needs the project on the server (signed in, synced); the owner makes, copies and removes it.
 */
function ShareLink() {
  const project = useProject(s => s.project);
  const serverId = useProjects(s => (project ? s.list[project.id]?.serverId : undefined));
  const [token, setToken] = useState<string | null | undefined>(undefined); // undefined = not loaded
  const [busy, setBusy] = useState(false), [copied, setCopied] = useState(false), [error, setError] = useState('');
  const url = token ? `${location.origin}/k/${token}` : '';
  const run = async (f: () => Promise<void>) => { setBusy(true); setError(''); try { await f(); } catch { setError('Nije uspelo. Proveri vezu i pokušaj ponovo.'); } finally { setBusy(false); } };
  const load = () => serverId && run(async () => setToken((await api<{ token: string | null }>('GET', `/projects/${serverId}/share`)).token));
  return (
    <Popover onOpenChange={o => { if (o) { setCopied(false); void load(); } }}>
      <PopoverTrigger asChild><Button variant="outline" size="sm"><Link2 />Link za kupca</Button></PopoverTrigger>
      <PopoverContent align="end" className="flex w-[340px] flex-col gap-3">
        <div className="flex flex-col gap-1"><strong className="text-sm font-semibold">Link za kupca</strong>
          <span className="text-sm text-muted-foreground">Kupac otvara kuhinju u pregledaču, u 3D, bez naloga i bez izmena.</span></div>
        {!serverId ? <span className="text-sm text-warn-ink">Kuhinja još nije sačuvana na nalogu — prijavi se (ili sačekaj par sekundi) pa probaj ponovo.</span>
          : token === undefined ? <span className="text-sm text-muted-foreground">Učitavam…</span>
          : !token ? <Button disabled={busy} onClick={() => void run(async () => setToken((await api<{ token: string }>('POST', `/projects/${serverId}/share`)).token))}><Link2 />Napravi link</Button>
          : <>
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label="Link za kupca" className="font-mono text-xs" onFocus={e => e.currentTarget.select()} />
              <Button variant="outline" size="icon" aria-label="Kopiraj link" onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true))}>{copied ? <Check /> : <Copy />}</Button>
            </div>
            {copied && <span className="text-xs text-ok">Link je kopiran — pošalji ga kupcu porukom ili e-poštom.</span>}
            <Button variant="ghost" size="sm" className="self-start text-destructive hover:text-destructive" disabled={busy}
              onClick={() => void run(async () => { await api('DELETE', `/projects/${serverId}/share`); setToken(null); })}><Link2Off />Isključi link</Button>
          </>}
        {error && <span role="alert" className="text-sm text-destructive">{error}</span>}
      </PopoverContent>
    </Popover>
  );
}

/**
 * The step's own "done" mark, always at the far right of the project bar (user 2026-11-24: one place for Pregledano,
 * Potvrdi konstrukciju, Proverena… instead of a button somewhere on each page). Nothing on steps that finish by themselves.
 */
function StepMark() {
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const { pathname } = useLocation();
  const elId = useMatch('/element/:id')?.params.id;
  if (!project) return null;
  const m = project.marks ?? {};
  const el = elId ? project.elements.find(e => e.id === elId) : undefined;
  const mark: { on: boolean; todo: string; done: string; tip: string; flip: () => void } | null =
    pathname === '/nacrti' ? { on: !!m.drawingsReviewed, todo: 'Pregledano', done: 'Pregledano', tip: 'Nacrti i strane otvaranja su provereni (korak 2 · Nacrti)', flip: () => markProject({ drawingsReviewed: !m.drawingsReviewed }) }
    : el ? { on: !!el.confirmedAt, todo: `Potvrdi konstrukciju ${el.label}`, done: `${el.label} potvrđen`, tip: el.confirmedAt ? 'Konstrukcija je potvrđena — klik poništava' : 'Potvrdi konstrukciju ovog elementa (korak 4 · Elementi)',
      flip: () => change(p => ({ ...p, elements: p.elements.map(e => (e.id === el.id ? { ...e, confirmedAt: e.confirmedAt ? undefined : new Date().toISOString() } : e)) })) }
    : pathname === '/krojna-lista' ? { on: !!m.cutListChecked, todo: 'Proverena', done: 'Proverena', tip: 'Krojna lista je proverena (korak 5 · Krojna lista)', flip: () => markProject({ cutListChecked: !m.cutListChecked }) }
    : pathname === '/ponuda' ? { on: !!m.offerSent, todo: 'Označi kao poslatu', done: 'Poslata kupcu', tip: 'Ako si ponudu poslao drugačije (telefonom, lično), označi je ovde', flip: () => markProject({ offerSent: !m.offerSent }) }
    : null;
  if (!mark) return null;
  return (
    <Tooltip><TooltipTrigger asChild>
      <Button variant="outline" size="sm" aria-pressed={mark.on} className={mark.on ? STEP_DONE : STEP_TODO} onClick={mark.flip}>{mark.on && <Check />}{mark.on ? mark.done : mark.todo}</Button>
    </TooltipTrigger><TooltipContent side="bottom">{mark.tip}</TooltipContent></Tooltip>
  );
}

/** Workshop pages under row 1: side menu with the Radionica groups and the help switch, "← Nazad na <projekat>". */
export function AdminLayout({ title, text, current, children }: { title?: string; text?: string; current?: string; children: ReactNode }) {
  const project = useProject(s => s.project);
  const { pathname } = useLocation();
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <MainMenu current="radionica" />
      <ProjectBar /> {/* the open project's steps stay one click away (user 2026-11-21) */}
      <div className="grid min-h-0 flex-1 grid-cols-[250px_minmax(0,1fr)]">
        <nav aria-label="Radionica" className="flex flex-col gap-0.5 overflow-y-auto border-0 border-r border-solid border-border bg-white px-3 py-4">
          {GROUPS.map(([g, items]) => <Fragment key={g}>
            <div className={cn(GROUP_T, 'pt-2.5')}>{g}</div>
            {items.map(([t, to]) => {
              const cur = current ? t === current : to === pathname;
              return <Link key={t} to={to} aria-current={cur ? 'page' : undefined} className={cn(MI, cur && 'bg-[#E2EFE6] font-semibold text-accent-ink hover:bg-[#E2EFE6] hover:text-accent-ink')}>{t}</Link>;
            })}
          </Fragment>)}
          <div className="mt-3 border-0 border-t border-solid border-line-soft p-2.5"><HelpSwitch note="oznake i i saveti" /></div>
        </nav>
        <main className="flex min-w-0 flex-col gap-4 overflow-y-auto px-7 py-6">
          {title && <div className="flex flex-wrap items-end gap-3">
            <div><h1 className="m-0 text-[28px]">{title}</h1>{text && <p className="mt-1 mb-0 text-[15px] text-muted-foreground">{text}</p>}</div>
            {project && <Link to="/projekat" className="ml-auto inline-flex min-h-9 items-center text-[14px] font-semibold">← Nazad na {project.name.replace(/ — .*$/, '')}</Link>}
          </div>}
          {children}
        </main>
      </div>
    </div>
  );
}
