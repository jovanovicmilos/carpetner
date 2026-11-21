// Saradnja for one real request (`/saradnja/:id`, apps/api /requests/:id/thread), same layout as the reference screen
// (Saradnja.tsx keeps the design's placeholder version at `/saradnja`). Left: what is agreed + timeline; middle: the plan
// and the proposals; right: messages. The workshop proposes the differences between its working copy and the kitchen as
// sent (engine diffElements), one reason per unit; the customer accepts / declines each and approves the layout, which puts
// the accepted changes into the customer's kitchen (API, engine applyChanges).
// shortcut: changed units are not highlighted on the plan; no photos / appointment / plan-click comments yet; only units are
// compared (room, materials and look are not proposals); no live updates — the page reloads the thread after each action.
import { diffElements, type ElementChange, type Project } from 'engine';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { fitView, Plan } from './Plan';
import { nameOf, wallName } from './Planner';
import { kitchenSummary } from './Pregled';
import { useProjects } from './projects';
import { api, ApiError, errorText } from './session';
import { SiteHeader } from './Site';
import { useProject } from './store';
import { pull } from './sync';
import { WorkshopHeader } from './WorkshopHeader';

type Side = 'shop' | 'cust';
type Decision = 'acc' | 'rej';
interface Item { id: string; title: string; why: string; price?: string }
interface Thread {
  id: string; side: Side; name: string; status: string; createdAt: string; takenAt?: string; workshop: string; customer: string;
  workshopProjectId?: string; sent: Project;
  offers: { version: number; status: string; createdAt: string; decidedAt?: string; total: number }[];
  messages: { id: string; side: Side; text: string; pin?: string; createdAt: string }[];
  proposal: { id: string; version: number; data: Project; items: Item[]; decisions: Record<string, Decision>; status: 'open' | 'approved'; approvedAt?: string; createdAt: string } | null;
}
const cm = (mm: number) => Math.round(mm / 10);
const when = (iso: string) => new Date(iso).toLocaleString('sr-Latn', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

/** A unit change in plain words: "Fioke (3): širina 60 → 30 cm". */
export function changeTitle(c: ElementChange): string {
  if (c.kind === 'added') return `Dodat ${nameOf(c.after!)} ${cm(c.after!.width)} cm (${wallName(c.after!.wallId)})`;
  if (c.kind === 'removed') return `Uklonjen ${nameOf(c.before!)} ${cm(c.before!.width)} cm (${wallName(c.before!.wallId)})`;
  const parts = [
    c.swapped && `umesto: ${nameOf(c.before!)}`,
    c.width && `širina ${cm(c.width[0])} → ${cm(c.width[1])} cm`,
    c.wall && `premešten sa zida ${c.wall[0]} na zid ${c.wall[1]}`,
    c.moved && `pomeren ${Math.abs(cm(c.moved))} cm duž zida ${c.after!.wallId}`,
  ].filter(Boolean);
  return `${nameOf(c.after!)}: ${parts.length ? parts.join(', ') : 'izmenjen'}`;
}

const PILL = 'flex-none rounded-[10px] px-[9px] py-[3px] text-[12.5px]';
const decided = (d?: Decision) => (d === 'acc' ? ['Kupac prihvatio', 'bg-ok-soft text-ok'] : d === 'rej' ? ['Kupac odbio', 'bg-[#F6D5D3] text-[#8A1C22]'] : ['Čeka kupca', 'bg-background text-ink-2']);

export function SaradnjaLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setProject = useProject(s => s.setProject);
  const list = useProjects(s => s.list);
  const [t, setT] = useState<Thread | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [why, setWhy] = useState<Record<string, string>>({});
  const [dec, setDec] = useState<Record<string, Decision | undefined>>({});

  const load = useCallback(async () => {
    const th = await api<Thread>('GET', `/requests/${id}/thread`);
    setT(th);
    if (th.proposal) setWhy(w => ({ ...Object.fromEntries(th.proposal!.items.map(i => [i.id, i.why])), ...w }));
  }, [id]);
  useEffect(() => {
    load().then(() => pull()).catch(e => setError(errorText(e instanceof ApiError ? e.code : 'server')));
  }, [load]);
  const act = async (job: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await job(); await load(); } catch (e) { setError(errorText(e instanceof ApiError ? e.code : 'server')); } finally { setBusy(false); }
  };

  if (!t) return <div className="flex min-h-dvh flex-col bg-background"><SiteHeader />{error && <p role="alert" className="m-6 text-[15px] text-[#8A1C22]">{error}</p>}</div>;

  const shop = t.side === 'shop';
  const work = shop ? Object.values(list).find(e => e.serverId === t.workshopProjectId)?.project : undefined;
  const changes = shop && work ? diffElements(t.sent, work) : [];
  const p = t.proposal;
  const open = p?.status === 'open';
  const plan = shop ? work ?? t.sent : p?.data ?? t.sent;
  const items: Item[] = shop ? changes.map(c => ({ id: c.id, title: changeTitle(c), why: why[c.id] ?? '' })) : p?.items ?? [];
  const nDecided = items.filter(i => dec[i.id]).length;
  const all = items.length > 0 && nDecided === items.length;
  const accepted = t.offers.some(o => o.status === 'accepted');
  const { shape, size } = kitchenSummary(t.sent);
  const state = p?.status === 'approved' ? 'Raspored odobren' : open ? (shop ? `Predlozi v${p!.version} · kupac pregleda izmene` : `Predlozi v${p!.version} · čekaju tvoju odluku`) : t.status === 'taken' ? 'Projekat preuzet' : 'Upit poslat';

  const checks = [
    { name: 'Raspored odobren', sub: p?.status === 'approved' ? `kupac potvrdio ${when(p.approvedAt!)}` : open ? (shop ? `čeka kupca (${p!.items.length} predloga)` : `odluči o ${p!.items.length} predloga`) : 'bez predloga za sada', done: p?.status === 'approved', cur: p?.status !== 'approved' },
    { name: 'Ponuda prihvaćena', sub: accepted ? 'kupac je prihvatio ponudu' : t.offers.length ? `v${t.offers[t.offers.length - 1].version} · čeka odgovor` : 'ponuda još nije poslata', done: accepted, cur: p?.status === 'approved' && !accepted },
  ];
  const timeline = ([
    ['Kupac poslao projekat', t.createdAt], t.takenAt && ['Preuzet projekat', t.takenAt],
    ...t.offers.map(o => [`Ponuda v${o.version}`, o.createdAt]), ...t.offers.filter(o => o.status === 'accepted' && o.decidedAt).map(o => [`Kupac prihvatio ponudu v${o.version}`, o.decidedAt!]),
    p && [`Predlozi v${p.version} (${p.items.length})`, p.createdAt], p?.approvedAt && ['Kupac odobrio raspored', p.approvedAt],
  ].filter(Boolean) as [string, string][]).sort((a, b) => a[1].localeCompare(b[1]));

  const send = () => draft.trim() && act(async () => { await api('POST', `/requests/${t.id}/messages`, { text: draft.trim() }); setDraft(''); });
  const propose = () => act(async () => { await api('POST', `/requests/${t.id}/proposals`, { data: work, items }); });
  const approve = () => act(async () => { await api('POST', `/proposals/${p!.id}/decide`, { decisions: dec }); await pull(); });
  const openWork = () => { if (work) { setProject(work); navigate('/planer'); } };
  const decBtn = (on: boolean, good: boolean) => cn('min-h-10 rounded-md border border-solid px-3 text-[13px] font-semibold',
    on ? (good ? 'border-primary bg-primary text-white' : 'border-[#A3261F] bg-[#F6D5D3] text-[#8A1C22]') : 'border-line-strong bg-white text-foreground');

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background font-sans text-foreground max-md:h-auto max-md:overflow-visible">
      {shop ? <WorkshopHeader current="Upiti" /> : <SiteHeader user={t.customer} />}
      <div className="flex flex-wrap items-center gap-3 border-0 border-b border-solid border-border bg-white px-5 py-3">
        <Link to={shop ? '/upiti' : '/kupac/ponude'} className="inline-flex min-h-9 items-center text-[14px]">← {shop ? 'Upiti' : 'Ponude'}</Link>
        <h1 className="m-0 text-[20px]">Saradnja · {shape} {size} — {shop ? t.customer : t.workshop}</h1>
        <span className="rounded-[10px] bg-wood-birch px-[9px] py-[3px] text-[13px] font-semibold text-wood-bark">{state}</span>
        <div className="ml-auto flex items-center gap-2">
          {shop
            ? <Button size="none" disabled={!work} onClick={openWork} className="min-h-10 rounded-md px-3.5 text-[14px] font-semibold">Otvori radnu verziju</Button>
            : <Link to="/moje-kuhinje" className="inline-flex min-h-10 items-center rounded-md bg-primary px-3.5 text-[14px] font-semibold text-white no-underline hover:text-white">Moje kuhinje</Link>}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[290px_minmax(0,1fr)_360px] max-lg:grid-cols-[240px_minmax(0,1fr)_300px] max-md:grid-cols-1">
        <aside aria-label="Tok saradnje" className="flex flex-col gap-[18px] overflow-y-auto border-0 border-r border-solid border-border bg-white p-4 max-md:order-2 max-md:border-r-0 max-md:border-t">
          <section>
            <h2 className="mt-0 mb-2.5 text-[15px]">Dogovoreno</h2>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {checks.map(c => (
                <li key={c.name} aria-current={c.cur ? 'step' : undefined} className={cn('flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-[14px]', c.cur && 'bg-accent-lightest')}>
                  <span aria-hidden="true" className={cn('box-border inline-flex size-[22px] flex-none items-center justify-center rounded-full', c.done ? 'bg-ok-strong' : c.cur ? 'border-2 border-solid border-primary' : 'border-[1.5px] border-solid border-[#BDB6AA]')}>
                    {c.done && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  <span className="flex flex-col gap-0.5"><span className="font-semibold">{c.name}</span><span className="text-[12.5px] text-muted-foreground">{c.sub}</span></span>
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h2 className="mt-0 mb-2.5 text-[15px]">Tok</h2>
            <ol className="m-0 flex list-none flex-col gap-3 border-0 border-l-2 border-solid border-border p-0 pl-1">
              {timeline.map(([txt, at], i) => (
                <li key={txt + at} className="relative pl-3.5 text-[13.5px]">
                  <span aria-hidden="true" className={cn('absolute top-[3px] -left-2.5 box-border size-3 rounded-full', i === timeline.length - 1 ? 'border-2 border-solid border-primary bg-white' : 'bg-accent-on-dark')} />
                  <span className="font-medium">{txt}</span><br /><span className="text-[12.5px] text-muted-foreground">{when(at)}</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>

        <main aria-label="Izmene na planu" className="flex min-h-0 min-w-0 flex-col gap-3.5 overflow-y-auto p-4 max-md:order-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="m-0 text-[18px]">Predlozi stolara</h2>
            <span className="text-[14px] text-muted-foreground">verzija kupca {when(t.createdAt)} → {shop ? 'tvoja radna verzija' : 'radna verzija stolara'}</span>
          </div>
          <div className="rounded-[10px] border border-solid border-border bg-[#FAF8F4] p-2.5">
            <Plan project={plan} view={fitView(plan)} unit="cm" role="img" aria-label={shop ? 'Tvoja radna verzija' : 'Raspored sa predloženim izmenama'} className="aspect-[760/360] h-auto w-full" />
          </div>
          {!items.length && <p className="m-0 text-[14px] text-ink-2">{shop
            ? (work ? 'Radna verzija je ista kao kuhinja koju je kupac poslao. Izmeni je u planeru (Otvori radnu verziju), pa ovde pošalji predloge.' : 'Radna verzija se učitava…')
            : 'Stolar još nije predložio izmene. Ovde ih vidiš i odlučuješ o svakoj.'}</p>}
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {items.map((it, n) => {
              const status = p?.decisions?.[it.id];
              const inProposal = p?.items.some(x => x.id === it.id);
              return (
                <li key={it.id} className="flex items-center gap-3 rounded-[10px] border border-solid border-border bg-white px-3.5 py-3 max-md:flex-wrap">
                  <span aria-hidden="true" className="inline-flex size-[26px] flex-none items-center justify-center rounded-full bg-[#1E50C8] text-[12px] font-bold text-white">{n + 1}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px] max-md:basis-[calc(100%-38px)]">
                    <span className="text-[15px] font-semibold">{it.title}</span>
                    {shop
                      ? <label className="flex items-center gap-2 text-[13.5px] text-ink-2">Razlog:
                          <Input value={why[it.id] ?? ''} onChange={e => setWhy({ ...why, [it.id]: e.target.value })} placeholder="npr. odvod je na 145 cm" className="h-auto min-h-9 flex-1 px-2 text-[13.5px]" /></label>
                      : <span className="text-[13.5px] text-ink-2">Razlog: {it.why || '—'}</span>}
                    {it.price && <span className="text-[13px] text-muted-foreground">{it.price}</span>}
                  </div>
                  {!shop && open
                    ? <span className="flex flex-none gap-1.5 max-md:ml-[38px]">
                        <Button variant={null} size="none" aria-pressed={dec[it.id] === 'acc'} onClick={() => setDec({ ...dec, [it.id]: dec[it.id] === 'acc' ? undefined : 'acc' })} className={decBtn(dec[it.id] === 'acc', true)}>Prihvati</Button>
                        <Button variant={null} size="none" aria-pressed={dec[it.id] === 'rej'} onClick={() => setDec({ ...dec, [it.id]: dec[it.id] === 'rej' ? undefined : 'rej' })} className={decBtn(dec[it.id] === 'rej', false)}>Odbij</Button>
                      </span>
                    : (inProposal || !shop) && <span className={cn(PILL, 'max-md:ml-[38px]', decided(status)[1])}>{p?.status === 'approved' ? decided(status)[0] : 'Čeka kupca'}</span>}
                </li>
              );
            })}
          </ol>
          {shop && items.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              <Button size="none" disabled={busy || !work} onClick={() => void propose()} className="min-h-11 rounded-lg px-[18px] text-[14px] font-semibold">
                {open ? `Pošalji nove predloge (zamenjuju v${p!.version})` : `Pošalji predloge kupcu (${items.length})`}</Button>
              <span className="text-[13px] text-muted-foreground">Kupac prihvata ili odbija svaki predlog; prihvaćeni ulaze u njegovu kuhinju.</span>
            </div>
          )}
          {!shop && open && (
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant={null} size="none" onClick={() => setDec(Object.fromEntries(items.map(i => [i.id, 'acc' as const])))} className="min-h-11 rounded-lg border border-solid border-primary bg-white px-4 text-[14px] font-semibold text-accent-ink">Prihvati sve</Button>
              <Button variant={null} size="none" disabled={!all || busy} onClick={() => void approve()}
                className={cn('min-h-11 rounded-lg px-[18px] text-[14px] font-semibold disabled:opacity-100', all ? 'bg-primary text-white' : 'cursor-not-allowed bg-border text-muted-foreground')}>Odobri raspored</Button>
              <span className="text-[13px] text-muted-foreground">{all ? 'Prihvaćene izmene ulaze u tvoju kuhinju; odbijene se vraćaju stolaru.' : `Odluči o svakom predlogu (${nDecided} od ${items.length}).`}</span>
            </div>
          )}
          {error && <p role="alert" className="m-0 text-[14px] text-[#8A1C22]">{error}</p>}
        </main>

        <aside aria-label="Poruke" className="flex min-h-0 flex-col border-0 border-l border-solid border-border bg-white max-md:order-3 max-md:border-l-0 max-md:border-t">
          <h2 className="m-0 border-0 border-b border-solid border-[#EEEAE2] px-4 py-3.5 text-[16px]">Poruke</h2>
          <ol className="m-0 flex min-h-0 flex-1 list-none flex-col gap-3 overflow-y-auto px-4 py-3.5">
            {!t.messages.length && <li className="text-[14px] text-muted-foreground">Još nema poruka.</li>}
            {t.messages.map(m => {
              const me = m.side === t.side;
              return (
                <li key={m.id} className={cn('flex max-w-[86%] flex-col gap-[3px]', me ? 'items-end self-end' : 'self-start')}>
                  <span className="text-[12px] text-muted-foreground">{m.side === 'shop' ? t.workshop : t.customer} · {when(m.createdAt)}</span>
                  <span className={cn('rounded-[10px] px-3 py-2 text-[14px] leading-[1.45] whitespace-pre-wrap', me ? 'bg-accent-soft' : 'bg-background')}>{m.text}</span>
                  {m.pin && <span className="text-[12px] text-accent-ink">Komentar na: {m.pin}</span>}
                </li>
              );
            })}
          </ol>
          <form onSubmit={e => { e.preventDefault(); void send(); }} className="flex flex-col gap-2 border-0 border-t border-solid border-[#EEEAE2] px-4 py-3">
            <label htmlFor="msg" className="text-[13px] text-muted-foreground">Poruka za {shop ? t.customer : t.workshop}</label>
            <Textarea id="msg" rows={2} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder="Napiši poruku" className="min-h-0 resize-none rounded-lg border-line-strong p-2.5 text-[14px] leading-[1.45]" />
            <div className="flex gap-2">
              <Button type="submit" size="none" disabled={busy || !draft.trim()} className="ml-auto min-h-10 rounded-md px-4 text-[14px] font-semibold">Pošalji</Button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
