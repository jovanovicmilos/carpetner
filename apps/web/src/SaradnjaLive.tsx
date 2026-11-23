// Saradnja for one real request (`/saradnja/:id`, apps/api /requests/:id/thread), same layout as the reference screen
// (Saradnja.tsx keeps the design's placeholder version at `/saradnja`). Left: what is agreed + timeline; middle: the kitchen
// both sides edit together (shared session, user 2026-11-23: no proposals); right: messages.
// shortcut: no photos / appointment / plan-click comments yet; the thread is polled every 5 s (partner.ts usePoll), no websocket.
import type { Project } from 'engine';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { fitView, Plan } from './Plan';
import { kitchenSummary } from './Pregled';
import { usePoll } from './partner';
import { useProjects } from './projects';
import { api, ApiError, errorText } from './session';
import { SiteHeader } from './Site';
import { useProject } from './store';
import { pull } from './sync';
import { WorkshopHeader } from './WorkshopHeader';

type Side = 'shop' | 'cust';
interface Thread {
  id: string; side: Side; name: string; status: string; createdAt: string; takenAt?: string; workshop: string; customer: string;
  workshopProjectId?: string; kitchenId?: string; sent: Project;
  offers: { version: number; status: string; createdAt: string; decidedAt?: string; total: number }[];
  messages: { id: string; side: Side; text: string; pin?: string; createdAt: string }[];
}
const when = (iso: string) => new Date(iso).toLocaleString('sr-Latn', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

export function SaradnjaLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setProject = useProject(s => s.setProject);
  const list = useProjects(s => s.list);
  const [t, setT] = useState<Thread | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    const th = await api<Thread>('GET', `/requests/${id}/thread`);
    setT(th);
  }, [id]);
  useEffect(() => {
    load().then(() => pull()).catch(e => setError(errorText(e instanceof ApiError ? e.code : 'server')));
  }, [load]);
  usePoll(load, !!t && !busy);
  const act = async (job: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await job(); await load(); } catch (e) { setError(errorText(e instanceof ApiError ? e.code : 'server')); } finally { setBusy(false); }
  };

  if (!t) return <div className="flex min-h-dvh flex-col bg-background"><SiteHeader />{error && <p role="alert" className="m-6 text-[15px] text-[#8A1C22]">{error}</p>}</div>;

  const shop = t.side === 'shop';
  // the shared kitchen as this browser has it (sync.ts keeps it live); before it loads, the kitchen as sent
  const kitchen = Object.values(list).find(e => e.serverId === t.kitchenId)?.project;
  const plan = kitchen ?? t.sent;
  const accepted = t.offers.some(o => o.status === 'accepted');
  const { shape, size } = kitchenSummary(t.sent);
  const state = accepted ? 'Ponuda prihvaćena' : t.status === 'taken' ? 'Zajednička sesija' : 'Upit poslat';

  const checks = [
    { name: 'Ponuda prihvaćena', sub: accepted ? 'kupac je prihvatio ponudu' : t.offers.length ? `v${t.offers[t.offers.length - 1].version} · čeka odgovor` : 'ponuda još nije poslata', done: accepted, cur: !accepted },
  ];
  const timeline = ([
    ['Kupac poslao projekat', t.createdAt], t.takenAt && ['Preuzet projekat', t.takenAt],
    ...t.offers.map(o => [`Ponuda v${o.version}`, o.createdAt]), ...t.offers.filter(o => o.status === 'accepted' && o.decidedAt).map(o => [`Kupac prihvatio ponudu v${o.version}`, o.decidedAt!]),
  ].filter(Boolean) as [string, string][]).sort((a, b) => a[1].localeCompare(b[1]));

  const send = () => draft.trim() && act(async () => { await api('POST', `/requests/${t.id}/messages`, { text: draft.trim() }); setDraft(''); });
  const openKitchen = () => { if (kitchen) { setProject(kitchen); navigate(shop ? '/projekat' : '/kupac/prostor'); } };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background font-sans text-foreground max-md:h-auto max-md:overflow-visible">
      {shop ? <WorkshopHeader current="Upiti" /> : <SiteHeader user={t.customer} />}
      <div className="flex flex-wrap items-center gap-3 border-0 border-b border-solid border-border bg-white px-5 py-3">
        <Link to={shop ? '/upiti' : '/kupac/ponude'} className="inline-flex min-h-9 items-center text-[14px]">← {shop ? 'Upiti' : 'Ponude'}</Link>
        <h1 className="m-0 text-[20px]">Saradnja · {shape} {size} — {shop ? t.customer : t.workshop}</h1>
        <span className="rounded-[10px] bg-wood-birch px-[9px] py-[3px] text-[13px] font-semibold text-wood-bark">{state}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="none" disabled={!kitchen} onClick={openKitchen} className="min-h-10 rounded-md px-3.5 text-[14px] font-semibold">Otvori kuhinju</Button>
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

        <main aria-label="Kuhinja" className="flex min-h-0 min-w-0 flex-col gap-3.5 overflow-y-auto p-4 max-md:order-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="m-0 text-[18px]">Kuhinja</h2>
            <span className="text-[14px] text-muted-foreground">{t.status === 'taken' ? `${t.workshop} i ${t.customer} menjaju je zajedno, izmene se vide za nekoliko sekundi` : 'kako je poslata stolaru'}</span>
          </div>
          <div className="rounded-[10px] border border-solid border-border bg-[#FAF8F4] p-2.5">
            <Plan project={plan} view={fitView(plan)} unit="cm" role="img" aria-label="Raspored kuhinje" className="aspect-[760/360] h-auto w-full" />
          </div>
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
