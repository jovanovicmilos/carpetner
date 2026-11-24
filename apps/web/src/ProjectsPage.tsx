// Projekti (design/Projekti.dc.html, docs/TOK_PROJEKTA.md): the start screen after login; logo in every header.
// "Nastavi gde si stao" = the last edited project, opened on the screen it was left on; cards with progress, filters, search, order.
import { projectProgress, roomWalls, wallGeoms, type Project, type ProjectProgress } from 'engine';
import { Fragment, useState } from 'react';
import { ArrowRight, Plus, SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router';
import { Tip, useHelp } from './help';
import { editedText, useProjects, type StoredProject } from './projects';
import { useQuotes } from './quotes';
import { useProject } from './store';
import { WorkshopHeader } from './WorkshopHeader';

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
          <Tooltip><TooltipTrigger asChild><span className={cn('inline-flex items-center gap-1.5 rounded-[14px] py-[3px] pr-2 pl-[3px]', here && 'bg-background text-foreground')}>{mark}
            <span className={cn('text-[13px]', here ? 'font-medium text-foreground' : done ? 'text-background' : 'text-muted-2')}>{s.name}</span></span></TooltipTrigger><TooltipContent>{title}</TooltipContent></Tooltip>{line}</Fragment>
        : <Fragment key={s.key}><Tooltip><TooltipTrigger asChild><span role="listitem" aria-label={title} className="inline-flex">{mark}</span></TooltipTrigger><TooltipContent>{title}</TooltipContent></Tooltip>{line}</Fragment>;
    })}
  </>;
}


export function ProjectsPage() {
  const list = useProjects(s => s.list);
  const quotes = useQuotes(s => s.byProject);
  const current = useProject(s => s.project);
  const setProject = useProject(s => s.setProject);
  const navigate = useNavigate();
  const [help] = useHelp();
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
      <WorkshopHeader current="Projekti" />

      <main className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-[22px] px-6 pt-7 pb-10">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="m-0 text-[30px]">Projekti</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Nastavi tamo gde si stao — svaki projekat pamti korak i ekran na kom si bio.</p>
          </div>
          <Button asChild size="lg" className="ml-auto">
            <Link to="/brzi-start" className="no-underline"><Plus aria-hidden="true" />Novi projekat</Link>
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
              <Button size="lg" onClick={() => open(last)} className="bg-accent-on-dark text-foreground hover:bg-accent-on-dark/90">
                Nastavi: {last.resume?.label ?? 'Prostor'}<ArrowRight aria-hidden="true" /></Button>
              <span className="text-[12px] text-[#BDB6AA]">{next(last.pr)}</span>
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <Tabs value={filter} onValueChange={v => setFilter(v as Filter)}>
            {/* on the beige ground the muted strip vanishes (muted = ground); the old reference strip colour */}
            <TabsList aria-label="Filter projekata" className="bg-[#E7E2D8]">
              {([['all', 'Svi'], ['run', 'U toku'], ['offer', 'Na ponudi'], ['done', 'Završeni']] as const).map(([f, t]) => (
                <TabsTrigger key={f} value={f} className="px-3">
                  {t}<span className="font-mono text-xs opacity-70">{all.filter(x => pass(f, x)).length}</span></TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <InputGroup className="ml-auto w-[280px] max-w-full bg-white">
            <InputGroupAddon><SearchIcon aria-hidden="true" /></InputGroupAddon>
            <InputGroupInput type="search" aria-label="Traži projekat" value={q} onChange={e => setQ(e.target.value)} placeholder="Traži po kupcu ili nazivu" />
          </InputGroup>
          <label className="flex items-center gap-2 text-sm font-medium">Redosled
            <Select value={sort} onValueChange={v => setSort(v as Sort)}>
              <SelectTrigger aria-label="Redosled" className="bg-white font-normal"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="edited">Poslednje menjano</SelectItem><SelectItem value="pct">Najviše urađeno</SelectItem><SelectItem value="name">Po nazivu</SelectItem></SelectContent>
            </Select>
          </label>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-4">
          {shown.map(x => {
            const done = isDone(x.project, x.pr), issued = quotes[x.project.id];
            const badge = done ? 'Završen' : x.project.marks?.offerSent ? 'Poslato' : 'U toku';
            return (
              <article key={x.project.id} aria-label={x.project.name} className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 truncate text-[17px]">{x.project.name}</h3>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">{meta(x.project)}</div>
                  </div>
                  <Badge variant={done ? 'ok' : 'neutral'} className={cn(!done && 'bg-accent-soft text-accent-ink')}>{badge}</Badge>
                </div>
                <div className="flex items-center gap-2.5">
                  <Progress aria-label="Urađeno" value={x.pr.percent} className={cn('flex-1', done && '*:data-[slot=progress-indicator]:bg-ok-strong')} />
                  <span className="min-w-11 text-right font-mono text-[14px] font-semibold">{x.pr.percent} %</span>
                </div>
                <div role="list" aria-label="Koraci" className="flex items-center gap-[3px]"><Dots pr={x.pr} /></div>
                <div className="text-[13px] text-[#3D3A35]">{next(x.pr)}<div className="mt-0.5 text-[12px] text-muted-foreground">Menjano {editedText(x.updatedAt)}</div></div>
                <div className="flex items-center gap-2 border-0 border-t border-solid border-line-soft pt-3">
                  <span className="font-mono text-[14px] font-semibold whitespace-nowrap text-foreground">{issued ? rsd(issued.total) : '—'}</span>
                  <Button variant="dark" onClick={() => open(x)} className="ml-auto">
                    {done ? 'Otvori' : `Nastavi: ${(x.resume?.label ?? 'Prostor').split(' · ')[0]}`}<ArrowRight aria-hidden="true" /></Button>
                </div>
              </article>
            );
          })}
        </div>
        {!shown.length && <p className="m-0 text-[14px] text-muted-foreground">Nema projekata za ovaj filter. <Link to="/brzi-start">Napravi novi projekat</Link>.</p>}
      </main>
    </div>
  );
}
