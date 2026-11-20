// Projekti (design/Projekti.dc.html, docs/TOK_PROJEKTA.md): the start screen after login; logo in every header.
// "Nastavi gde si stao" = the last edited project, opened on the screen it was left on; cards with progress, filters, search, order.
import { projectProgress, roomWalls, wallGeoms, type Project, type ProjectProgress } from 'engine';
import { Fragment, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router';
import { Tip, useHelp } from './help';
import { editedText, useProjects, type StoredProject } from './projects';
import { useQuotes } from './quotes';
import { useProject } from './store';
import { BRAND, BrandMark } from './brand';
import { signOut, useSession } from './session';

type Filter = 'all' | 'run' | 'offer' | 'done';
type Sort = 'edited' | 'pct' | 'name';
const SHAPE = ['', 'prava', 'ugaona', 'U oblik'];
const rsd = (p: number) => `${Math.round(p / 100).toLocaleString('sr-Latn')} RSD`;

/** "Kupac: Petrović · ugaona, 3200 × 2400": the walls that carry units, by inner length. */
function meta(p: Project) {
  const g = wallGeoms(p.room), used = roomWalls(p.room).filter(w => p.elements.some(e => e.wallId === w.id)).map(w => g[w.id].inner);
  if (used.length === 2) used.sort((a, b) => b - a); // L: the longer wall first, as the design ("3200 × 2400")
  const shape = used.length ? `${SHAPE[used.length] ?? `${used.length} zida`}, ${used.join(' × ')}` : 'prazan prostor';
  return p.customer ? `Kupac: ${p.customer} · ${shape}` : shape;
}
const isDone = (p: Project, pr: ProjectProgress) => pr.percent >= 100 || !!p.marks?.offerAccepted;
const onOffer = (pr: ProjectProgress) => pr.steps[5].status !== 'todo';

/** Step dots (design dotsFor): done = tick, partial = ring with the number, not started = outline. */
function Dots({ pr, big, dark }: { pr: ProjectProgress; big?: boolean; dark?: boolean }) {
  const cur = pr.steps.findIndex(s => s.status !== 'done');
  const sz = big ? 24 : 18;
  return <>
    {pr.steps.map((s, i) => {
      const part = s.status === 'partial', done = s.status === 'done', pct = Math.round(s.part * 100), here = i === cur && !done;
      const title = `${i + 1} ${s.name} — ${done ? 'završeno' : part ? `u toku ${pct} %` : 'nije započeto'}`;
      const mark = (
        <span className={cn('box-border inline-flex flex-none items-center justify-center rounded-full font-mono font-semibold', big ? 'size-6 text-[12px]' : 'size-[18px] text-[10px]',
          done && 'bg-accent-on-dark text-foreground', !done && !part && (dark ? 'border-[1.5px] border-solid border-[#5A6E62] text-[#BDB6AA]' : 'border-[1.5px] border-solid border-[#BDB6AA] text-muted-2'))}
          style={part ? { background: `conic-gradient(#8CC5A2 0 ${pct}%, ${dark ? '#5A6E62' : '#DDD8CE'} ${pct}% 100%)` } : undefined}>
          <span className={cn('inline-flex items-center justify-center rounded-full', part ? (dark && here ? 'bg-background text-foreground' : dark ? 'bg-dark text-white' : 'bg-white text-foreground') : 'size-full')}
            style={part ? { width: sz - 6, height: sz - 6 } : undefined}>{done
            ? <svg width={big ? 12 : 10} height={big ? 12 : 10} viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#1C1B19" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : i + 1}</span>
        </span>
      );
      const line = i < 5 && <span aria-hidden="true" className={cn('h-0.5 flex-none rounded-[1px]', big ? 'w-4' : 'w-2.5', done ? 'bg-accent-on-dark' : dark ? 'bg-dark-line' : 'bg-border')} />;
      return big
        ? <Fragment key={s.key}>
          <span title={title} className={cn('inline-flex items-center gap-1.5 rounded-[14px] py-[3px] pr-2 pl-[3px]', here && 'bg-background text-foreground')}>{mark}
            <span className={cn('text-[13px]', here ? 'font-medium text-foreground' : done ? 'text-background' : 'text-muted-2')}>{s.name}</span></span>{line}</Fragment>
        : <Fragment key={s.key}><span role="listitem" title={title} aria-label={title} className="inline-flex">{mark}</span>{line}</Fragment>;
    })}
  </>;
}

const NAV_A = 'rounded-md px-3.5 py-2 text-[14px] no-underline text-background aria-[current=page]:bg-background aria-[current=page]:text-foreground';

export function ProjectsPage() {
  const list = useProjects(s => s.list);
  const workshop = useSession(s => s.session && s.workshops[0]);
  const email = useSession(s => s.session?.user.email);
  const quotes = useQuotes(s => s.byProject);
  const current = useProject(s => s.project);
  const setProject = useProject(s => s.setProject);
  const navigate = useNavigate();
  const [help, toggleHelp] = useHelp();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('edited');

  const all = Object.values(list).map(s => ({ ...s, pr: projectProgress(s.project) }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pass = (f: Filter, x: (typeof all)[number]) => f === 'all' || (f === 'run' && !isDone(x.project, x.pr)) || (f === 'offer' && onOffer(x.pr) && !isDone(x.project, x.pr)) || (f === 'done' && isDone(x.project, x.pr));
  const needle = q.trim().toLowerCase();
  const shown = all.filter(x => pass(filter, x) && (!needle || `${x.project.name} ${x.project.customer ?? ''}`.toLowerCase().includes(needle)))
    .sort((a, b) => (sort === 'pct' ? b.pr.percent - a.pr.percent : sort === 'name' ? a.project.name.localeCompare(b.project.name, 'sr') : 0));
  const last = all[0];
  const open = (s: StoredProject) => {
    if (current?.id !== s.project.id) setProject(s.project);
    navigate(s.resume?.path ?? '/projekat');
  };
  const next = (pr: ProjectProgress) => `Sledeće: ${pr.next}`;

  return (
    <div className={cn(help ? 'k-helpon' : 'k-helpoff', 'flex min-h-screen flex-col bg-background font-sans text-foreground')}>
      <header className="flex flex-wrap items-center gap-4 bg-dark px-5 py-2.5 text-background">
        <Link to="/projekti" aria-label={`${BRAND.name} — svi projekti`} className="flex items-center gap-2.5 text-inherit no-underline">
          <BrandMark />
          <span className="text-[18px] font-bold tracking-[0.02em]">{BRAND.name}</span>
        </Link>
        <nav aria-label="Glavni meni" className="ml-2 flex gap-1">
          <Link to="/projekti" aria-current="page" className={NAV_A}>Projekti</Link>
          <Link to="/admin/cenovnik" className={NAV_A}>Cenovnik</Link>
          <Link to="/admin/biblioteka" className={NAV_A}>Materijali i katalog</Link>
          <Link to="/admin/standardi" className={NAV_A}>Podešavanja</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {workshop
            ? <>
                <span className="text-[13px] text-on-dark-muted" title={email}>{workshop.name}</span>
                <Button variant={null} size="none" className="min-h-9 cursor-pointer rounded-md px-2 text-[13px] text-on-dark-muted hover:bg-dark-hover hover:text-white" onClick={() => signOut()}>Odjavi se</Button>
              </>
            : <Link to="/prijava" className="text-[13px] text-on-dark-muted">Prijavi se</Link>}
          <Button variant={null} size="none" aria-pressed={help} onClick={toggleHelp} title="Uključi ili isključi objašnjenja (oznake i) na svim ekranima"
            className="inline-flex shrink min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-solid border-muted-foreground bg-transparent px-3 py-[7px] font-sans text-[13px] text-background aria-pressed:border-accent-on-dark aria-pressed:bg-accent-on-dark aria-pressed:font-semibold aria-pressed:text-foreground">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 7v4.5M8 4.6v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Pomoć
          </Button>
        </div>
      </header>

      <main className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-[22px] px-6 pt-7 pb-10">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="m-0 text-[30px]">Projekti</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Nastavi tamo gde si stao — svaki projekat pamti korak i ekran na kom si bio.</p>
          </div>
          <Button asChild size="none" className="ml-auto min-h-[46px] px-[18px] text-[15px]">
            <Link to="/"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Novi projekat</Link>
          </Button>
        </div>

        {last && (
          <section aria-label="Poslednji projekat" className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-7 gap-y-[18px] rounded-[14px] bg-dark px-6 py-[22px] text-background">
            <div className="flex min-w-0 flex-col gap-2.5">
              <div className="flex items-center text-[12px] font-semibold tracking-[0.08em] text-accent-on-dark uppercase">Nastavi gde si stao<Tip k="projects.resume" align="right" /></div>
              <h2 className="m-0 truncate text-[24px]">{last.project.name}</h2>
              <div className="text-[14px] text-on-dark-muted">{meta(last.project)} · menjano {editedText(last.updatedAt)}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1"><Dots pr={last.pr} big dark /></div>
            </div>
            <div className="flex flex-col items-end gap-2.5">
              <div className="flex items-baseline gap-1.5"><span className="text-[40px] font-semibold whitespace-nowrap text-white">{last.pr.percent} %</span><span className="text-[14px] text-on-dark-muted">urađeno</span></div>
              <Progress aria-label="Urađeno" value={last.pr.percent} className="w-[220px] bg-[#34463B]" />
              <Button size="none" onClick={() => open(last)} className="min-h-12 rounded-lg bg-accent-on-dark px-5 text-[15px] text-foreground">
                Nastavi: {last.resume?.label ?? 'Prostor'} <span aria-hidden="true">→</span></Button>
              <span className="text-[12px] text-[#BDB6AA]">{next(last.pr)}</span>
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <Tabs value={filter} onValueChange={v => setFilter(v as Filter)}>
            <TabsList aria-label="Filter projekata" className="flex flex-wrap gap-[3px] rounded-lg bg-[#E7E2D8] p-[3px]">
              {([['all', 'Svi'], ['run', 'U toku'], ['offer', 'Na ponudi'], ['done', 'Završeni']] as const).map(([f, t]) => (
                <TabsTrigger key={f} value={f} className="min-h-[38px] rounded-md border-0 bg-transparent px-3.5 text-[14px] text-[#3D3A35] data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
                  {t}<span className="ml-1.5 font-mono text-[12px] opacity-70">{all.filter(x => pass(f, x)).length}</span></TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <label className="ml-auto flex min-h-[42px] min-w-[260px] items-center gap-2 rounded-lg border border-solid border-border bg-white px-3">
            <SearchIcon className="size-4 text-muted-foreground" strokeWidth={1.6} aria-hidden="true" />
            <span className="sr-only">Traži projekat</span>
            <Input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Traži po kupcu ili nazivu" className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px]" />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground">Redosled
            <Select value={sort} onValueChange={v => setSort(v as Sort)}>
              <SelectTrigger aria-label="Redosled" className="min-h-[42px] rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="edited">Poslednje menjano</SelectItem><SelectItem value="pct">Najviše urađeno</SelectItem><SelectItem value="name">Po nazivu</SelectItem></SelectContent>
            </Select>
          </label>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-4">
          {shown.map(x => {
            const done = isDone(x.project, x.pr), issued = quotes[x.project.id];
            const badge = done ? 'Završen' : x.project.marks?.offerSent ? 'Poslato' : 'U toku';
            return (
              <article key={x.project.id} aria-label={x.project.name} className="flex flex-col gap-3 rounded-2xl border border-solid border-border bg-white p-[18px]">
                <div className="flex items-start gap-2.5">
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 truncate text-[17px]">{x.project.name}</h3>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">{meta(x.project)}</div>
                  </div>
                  <Badge tone={done ? 'ok' : 'none'} className={cn('rounded-[10px] px-[9px] py-[3px] text-[12px]', !done && 'bg-[#E2EFE6] text-accent-ink')}>{badge}</Badge>
                </div>
                <div className="flex items-center gap-2.5">
                  <Progress aria-label="Urađeno" value={x.pr.percent} className="flex-1" indicatorClassName={done ? 'bg-ok-strong' : undefined} />
                  <span className="min-w-11 text-right font-mono text-[14px] font-semibold">{x.pr.percent} %</span>
                </div>
                <div role="list" aria-label="Koraci" className="flex items-center gap-[3px]"><Dots pr={x.pr} /></div>
                <div className="text-[13px] text-[#3D3A35]">{next(x.pr)}<div className="mt-0.5 text-[12px] text-muted-foreground">Menjano {editedText(x.updatedAt)}</div></div>
                <div className="flex items-center gap-2 border-0 border-t border-solid border-line-soft pt-3">
                  <span className="font-mono text-[14px] font-semibold whitespace-nowrap text-foreground">{issued ? rsd(issued.total) : '—'}</span>
                  <Button size="none" variant={done ? 'dark' : 'default'} onClick={() => open(x)} className={cn('ml-auto min-h-10 gap-1.5 px-3.5 text-[14px] font-semibold', !done && 'bg-dark')}>
                    {done ? 'Otvori' : `Nastavi: ${(x.resume?.label ?? 'Prostor').split(' · ')[0]}`} <span aria-hidden="true">→</span></Button>
                </div>
              </article>
            );
          })}
        </div>
        {!shown.length && <p className="m-0 text-[14px] text-muted-foreground">Nema projekata za ovaj filter. <Link to="/">Napravi novi projekat</Link>.</p>}
      </main>
    </div>
  );
}
