// Customer offers (design/screens/KupacPonude.html): workshop offers for the kitchen, side by side, accept / ask for changes / decline.
// The header is the new role stepper (PlannerHeader, step 5); the reference still draws the older 5-step bar.
// Signed in as a customer: the customer's real requests (apps/api /me/requests) — a workshop's latest offer as a card (price,
// validity, advance, included / not, lead time; Prihvati with a 10-minute undo, Odbij), otherwise the request's timeline.
// Signed out: the design's placeholders (accept / undo local).
// Poruke, Traži izmene and the cards' links open that request's Saradnja (/saradnja/:id).
// shortcut: the offer PDF and picture are not attached yet; the Plus quota line is drawn.
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PlannerHeader } from './Planner';
import { newMessages } from './labels';
import { api, ApiError, apiFile, errorText, useSession } from './session';
import { downloadFiles } from './share';
import { SiteHeader } from './Site';
import { useProject } from './store';

const CARD = 'flex flex-col gap-3.5 rounded-xl bg-white p-[18px]';
// Signed out (the design's demo) every link opens the placeholder collaboration.
const TALK = '/saradnja?kao=kupac';
const OUTLINE = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-solid border-line-strong bg-white text-[14px] font-semibold text-foreground no-underline hover:text-foreground';
const INFO: [string, string][] = [
  ['Uključeno', 'elementi, radna ploča, okov Blum, prevoz, montaža'],
  ['Nije uključeno', 'aparati, sudopera i slavina, električni radovi'],
  ['Rok', '5 nedelja od merenja'],
];
const CHANGES = ['sudopera pomerena 20 cm — odvod je na 145 cm', 'fioke 60 → 2 × 30 kod ploče za kuvanje', 'dodata završna lajsna uz zid B'];
const TIMELINE: [string, string, 'done' | 'now' | 'next'][] = [['Poslato', '18. 11.', 'done'], ['Stolar preuzeo projekat', '19. 11.', 'done'], ['Merenje', '24. 11. u 17:00', 'now'], ['Ponuda', '', 'next']];

interface Offer { id: string; hasPdf?: boolean; version: number; total: number; vatPct: number; validUntil: string; advancePct: number; included: string; excluded: string; leadTime: string; note: string; status: 'sent' | 'accepted' | 'declined'; undoUntil?: string }
interface MyRequest { id: string; name: string; status: 'new' | 'taken' | 'declined'; declineReason?: string; workshop: string; createdAt: string; takenAt?: string; offer?: Offer | null; unread?: number }
const day = (iso: string) => new Date(iso).toLocaleDateString('sr-Latn', { day: 'numeric', month: 'numeric' });
const rsd = (para: number) => Math.round(para / 100).toLocaleString('sr-Latn').replace(/,/g, '.');
const n3 = (n: number) => `${n} ${n === 1 ? 'stolaru' : 'stolara'}`;

export function Ponude() {
  const project = useProject(s => s.project);
  const customer = useSession(s => s.session?.user.kind === 'customer');
  const [accepted, setAccepted] = useState(false);
  if (customer) return <MyOffers />;
  if (!project) return <Navigate to="/kupac" replace />;

  return (
    <div className="flex min-h-[1000px] flex-col bg-background text-foreground">
      <PlannerHeader project={project} role="kupac" step={5} live={false}
        right={<div className="flex items-center gap-2.5 justify-self-end"><span className="text-[13px] text-[#D8D3C9]">Sačuvano</span><Link to="/prijava" className="text-[14px] text-background hover:text-white">Ana P.</Link></div>} />
      <main className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-[18px] px-5 pt-6 pb-10 max-md:px-4 max-md:pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="m-0 text-[28px]">Ponude za tvoju kuhinju</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Plus važi do 18. 2. · poslato 2 od 3 stolara · cene su konačne za period važenja ponude</p>
          </div>
          <Link to={TALK} className={cn(OUTLINE, 'ml-auto gap-2 px-4')}>
            Poruke <span aria-label="2 nove" className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[11px] bg-primary text-[12px] text-white">2</span>
          </Link>
        </div>

        {accepted && (
          <div role="status" className="flex flex-wrap items-center gap-2.5 rounded-[10px] bg-ok-soft px-4 py-3.5 text-[15px] text-ok">
            <strong>Ponuda prihvaćena.</strong> [Radionica A] dobija potvrdu i predlaže termin za merenje. Ostalim stolarima javljamo da je posao dogovoren.
            <Button variant={null} size="none" onClick={() => setAccepted(false)} className="ml-auto min-h-10 rounded-lg border border-solid border-ok bg-white px-3.5 text-[14px] font-semibold text-ok">Poništi (još 10 min)</Button>
          </div>
        )}

        <div className="grid grid-cols-3 items-stretch gap-4 max-md:grid-cols-1">
          <article aria-labelledby="oa" className={cn(CARD, 'border-2 border-solid border-primary')}>
            <div className="flex items-center gap-2">
              <h2 id="oa" className="m-0 text-[18px]">[Radionica A]</h2>
              <span className="ml-auto rounded-[10px] bg-accent-soft px-[9px] py-[3px] text-[12px] font-semibold text-accent-ink">Ponuda v2</span>
            </div>
            <div>
              <div className="font-mono text-[28px] font-bold">268.066 RSD</div>
              <div className="text-[13px] text-muted-foreground">sa PDV-om · važi do 5. 12. · avans 40 %</div>
            </div>
            <div className="rounded-lg bg-accent-lightest px-3 py-2.5 text-[13px] leading-[1.45] text-accent-ink">U okviru primera cene (240.000–290.000 RSD). Stolar navodi: radna ploča hrast 38 mm umesto 28 mm.</div>
            <div aria-hidden="true" className="relative h-[150px] rounded-lg border border-solid border-border bg-[linear-gradient(180deg,#FAF8F4_0_55%,#C49A6C_55%_60%,#EADBC4_60%_100%)]">
              <span className="absolute bottom-2 left-2.5 rounded bg-white/85 px-1.5 py-0.5 text-[12px] text-ink-2">Slika iz ponude (3D)</span>
            </div>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14px]">
              {INFO.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="m-0">{v}</dd></div>)}
            </dl>
            <div className="flex flex-col gap-1.5 border-0 border-t border-solid border-[#EEEAE2] pt-3">
              <div className="text-[14px] font-semibold">{CHANGES.length} izmene u odnosu na tvoj projekat</div>
              <ul className="m-0 pl-[18px] text-[13px] leading-normal text-ink-2">{CHANGES.map(c => <li key={c}>{c}</li>)}</ul>
              <Link to={TALK} className="inline-flex min-h-8 items-center text-[14px]">Pogledaj izmene na planu</Link>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button variant={null} size="none" disabled={accepted} onClick={() => setAccepted(true)} className="min-h-12 flex-[1_1_100%] rounded-lg bg-primary text-[16px] font-semibold text-white">Prihvati ponudu</Button>
              <Link to={TALK} className={cn(OUTLINE, 'flex-1')}>Traži izmene</Link>
              <Button variant={null} size="none" className={cn(OUTLINE, 'flex-1')}>Odbij</Button>
              <Button variant={null} size="none" className="min-h-8 flex-[1_1_100%] bg-transparent text-[14px] font-normal text-primary underline">Ponuda u PDF-u</Button>
            </div>
          </article>

          <article aria-labelledby="ob" className={cn(CARD, 'border border-solid border-border')}>
            <div className="flex items-center gap-2">
              <h2 id="ob" className="m-0 text-[18px]">[Radionica B]</h2>
              <span className="ml-auto rounded-[10px] bg-background px-[9px] py-[3px] text-[12px] font-semibold text-ink-2">Pregleda projekat</span>
            </div>
            <div className="text-[15px] text-ink-2">Ponuda još nije stigla.</div>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0 text-[14px]">
              {TIMELINE.map(([t, d, s]) => (
                <li key={t} className={cn('flex gap-2.5', s === 'next' && 'text-[#8A8378]')}>
                  <span aria-hidden="true" className={cn('box-border size-5 flex-none rounded-full', s === 'done' ? 'bg-accent-on-dark' : s === 'now' ? 'border-2 border-solid border-primary' : 'border-[1.5px] border-solid border-[#BDB6AA]')} />
                  {s === 'done' && <span>{t} <span className="text-muted-foreground">· {d}</span></span>}
                  {s === 'now' && <span>{t} <strong>{d}</strong> <span className="text-muted-foreground">· potvrđeno</span></span>}
                  {s === 'next' && <span>{t}</span>}
                </li>
              ))}
            </ol>
            <Link to={TALK} className={cn(OUTLINE, 'mt-auto')}>Poruke sa [Radionica B]</Link>
          </article>

          <article aria-labelledby="oc" className="flex flex-col items-start justify-center gap-2.5 rounded-xl border border-dashed border-line-strong p-[18px]">
            <h2 id="oc" className="m-0 text-[17px]">Još jedan stolar</h2>
            <p className="m-0 text-[14px] leading-[1.45] text-muted-foreground">U Plus-u ti je ostalo još 1 slanje (do 18. 2.). Projekat se šalje takav kakav je sada.</p>
            <Link to="/kupac/posalji" className="inline-flex min-h-11 items-center rounded-lg border border-solid border-primary px-4 text-[14px] font-semibold text-accent-ink no-underline">Izaberi stolara</Link>
          </article>
        </div>

        <p className="m-0 text-[13px] text-muted-foreground">Cene stolara vidiš samo u njihovim ponudama. Primer cene je bio okviran i nije obavezujući.</p>
      </main>
    </div>
  );
}

/** The signed-in customer's requests and offers. */
function MyOffers() {
  const project = useProject(st => st.project);
  const user = useSession(st => st.session?.user);
  const [list, setList] = useState<MyRequest[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  const load = () => api<MyRequest[]>('GET', '/me/requests').then(setList).catch(e => setError(errorText(e instanceof ApiError ? e.code : 'server')));
  useEffect(() => { void load(); }, []);
  // The undo button disappears when its 10 minutes are over.
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 15_000); return () => clearInterval(t); }, []);
  const act = async (path: string) => {
    setBusy(true); setError('');
    try { await api('POST', path); await load(); } catch (e) { setError(errorText(e instanceof ApiError ? e.code : 'server')); } finally { setBusy(false); }
  };
  const won = list?.find(r => r.offer?.status === 'accepted');
  const canUndo = won?.offer?.undoUntil && new Date(won.offer.undoUntil).getTime() > Date.now();
  const header = project
    ? <PlannerHeader project={project} role="kupac" step={5} live={false} right={<div className="flex items-center gap-2.5 justify-self-end"><span className="text-[13px] text-[#D8D3C9]">Sačuvano u nalogu</span><Link to="/moje-kuhinje" className="text-[14px] text-background hover:text-white">{user?.name}</Link></div>} />
    : <SiteHeader user={user?.name} />;

  return (
    <div className="flex min-h-[1000px] flex-col bg-background text-foreground">
      {header}
      <main className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-[18px] px-5 pt-6 pb-10 max-md:px-4 max-md:pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="m-0 text-[28px]">Ponude za tvoju kuhinju</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">{list ? `poslato ${n3(list.length)} · ` : ''}cene su konačne za period važenja ponude</p>
          </div>
          {list?.[0] && <Link to={`/saradnja/${list[0].id}`} className={cn(OUTLINE, 'ml-auto px-4')}>Poruke</Link>}
        </div>
        {won && canUndo && (
          <div role="status" className="flex flex-wrap items-center gap-2.5 rounded-[10px] bg-ok-soft px-4 py-3.5 text-[15px] text-ok">
            <strong>Ponuda prihvaćena.</strong> {won.workshop} dobija potvrdu i predlaže termin za merenje.
            <Button variant={null} size="none" disabled={busy} onClick={() => void act(`/offers/${won.offer!.id}/undo`)} className="ml-auto min-h-10 rounded-lg border border-solid border-ok bg-white px-3.5 text-[14px] font-semibold text-ok">Poništi</Button>
          </div>
        )}
        {error && <p role="alert" className="m-0 text-[14px] text-[#8A1C22]">{error}</p>}
        {list && !list.length && <p className="m-0 text-[15px] text-ink-2">Kuhinja još nije poslata nijednom stolaru. <Link to="/kupac/posalji">Izaberi stolare</Link></p>}

        <div className="grid grid-cols-3 items-stretch gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
          {list?.map(r => {
            const o = r.offer;
            if (o && o.status !== 'declined') {
              const info: [string, string][] = ([['Uključeno', o.included], ['Nije uključeno', o.excluded], ['Rok', o.leadTime]] as [string, string][]).filter(([, v]) => v);
              return (
                <article key={r.id} aria-labelledby={`o-${r.id}`} className={cn(CARD, 'border-2 border-solid border-primary')}>
                  <div className="flex items-center gap-2">
                    <h2 id={`o-${r.id}`} className="m-0 text-[18px]">{r.workshop}</h2>
                    <span className="ml-auto rounded-[10px] bg-accent-soft px-[9px] py-[3px] text-[12px] font-semibold text-accent-ink">{o.status === 'accepted' ? 'Prihvaćeno' : `Ponuda v${o.version}`}</span>
                  </div>
                  <div>
                    <div className="font-mono text-[28px] font-bold">{rsd(o.total)} RSD</div>
                    <div className="text-[13px] text-muted-foreground">sa PDV-om · važi do {new Date(o.validUntil).toLocaleDateString('sr-Latn')}{o.advancePct ? ` · avans ${o.advancePct} %` : ''}</div>
                  </div>
                  {o.note && <div className="rounded-lg bg-accent-lightest px-3 py-2.5 text-[13px] leading-[1.45] text-accent-ink">{o.note}</div>}
                  {info.length > 0 && <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14px]">
                    {info.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="m-0">{v}</dd></div>)}
                  </dl>}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {o.status === 'sent' && <>
                      <Button variant={null} size="none" disabled={busy || !!won} onClick={() => void act(`/offers/${o.id}/accept`)} className="min-h-12 flex-[1_1_100%] rounded-lg bg-primary text-[16px] font-semibold text-white">Prihvati ponudu</Button>
                      <Link to={`/saradnja/${r.id}`} className={cn(OUTLINE, 'flex-1')}>Traži izmene</Link>
                      <Button variant={null} size="none" disabled={busy} onClick={() => void act(`/offers/${o.id}/decline`)} className={cn(OUTLINE, 'flex-1')}>Odbij</Button>
                    </>}
                    {o.status === 'accepted' && <p className="m-0 text-[14px] text-ok">Prihvaćeno — stolar te zove za termin merenja.</p>}
                    {o.hasPdf && <Button variant={null} size="none" onClick={() => void apiFile(`/offers/${o.id}/pdf`).then(b => downloadFiles([new File([b], `ponuda-${r.workshop}-v${o.version}.pdf`.replace(/[^\wčćžšđ.-]+/gi, '-'), { type: 'application/pdf' })])).catch(e => setError(errorText(e instanceof ApiError ? e.code : 'server')))}
                      className={cn(OUTLINE, 'flex-[1_1_100%]')}>Preuzmi ponudu (PDF)</Button>}
                    <Link to={`/saradnja/${r.id}`} className="inline-flex min-h-8 flex-[1_1_100%] items-center justify-center text-[14px]">Poruke i kuhinja</Link>
                  </div>
                </article>
              );
            }
            const steps: [string, string, 'done' | 'now' | 'next'][] = r.status === 'declined' ? [] : [
              ['Poslato', day(r.createdAt), 'done'],
              ['Stolar preuzeo projekat', r.takenAt ? day(r.takenAt) : '', r.status === 'taken' ? 'done' : 'now'],
              ['Ponuda', o?.status === 'declined' ? 'odbijena — čeka se nova' : '', r.status === 'taken' ? 'now' : 'next'],
            ];
            return (
              <article key={r.id} aria-labelledby={`o-${r.id}`} className={cn(CARD, 'border border-solid border-border')}>
                <div className="flex items-center gap-2">
                  <h2 id={`o-${r.id}`} className="m-0 text-[18px]">{r.workshop}</h2>
                  <span className={cn('ml-auto rounded-[10px] px-[9px] py-[3px] text-[12px] font-semibold', r.status === 'declined' ? 'bg-[#F6D5D3] text-[#8A1C22]' : 'bg-background text-ink-2')}>
                    {r.status === 'declined' ? 'Ne prima posao' : r.status === 'taken' ? 'Pregleda projekat' : 'Poslato'}</span>
                </div>
                <div className="text-[15px] text-ink-2">{r.status === 'declined' ? `Radionica je odbila upit${r.declineReason ? `: ${r.declineReason.toLowerCase()}` : ''}.` : 'Ponuda još nije stigla.'}</div>
                {steps.length > 0 && <ol className="m-0 flex list-none flex-col gap-2.5 p-0 text-[14px]">
                  {steps.map(([t, d, st]) => (
                    <li key={t} className={cn('flex gap-2.5', st === 'next' && 'text-[#8A8378]')}>
                      <span aria-hidden="true" className={cn('box-border size-5 flex-none rounded-full', st === 'done' ? 'bg-accent-on-dark' : st === 'now' ? 'border-2 border-solid border-primary' : 'border-[1.5px] border-solid border-[#BDB6AA]')} />
                      <span>{t}{d && <span className="text-muted-foreground"> · {d}</span>}</span>
                    </li>
                  ))}
                </ol>}
                {r.status !== 'declined' && <Link to={`/saradnja/${r.id}`} className={cn(OUTLINE, 'mt-auto')}>Poruke sa {r.workshop}{r.unread ? ` · ${newMessages(r.unread)}` : ''}</Link>}
              </article>
            );
          })}
          {list && list.length > 0 && list.length < 3 && (
            <article aria-labelledby="oc" className="flex flex-col items-start justify-center gap-2.5 rounded-xl border border-dashed border-line-strong p-[18px]">
              <h2 id="oc" className="m-0 text-[17px]">Još jedan stolar</h2>
              <p className="m-0 text-[14px] leading-[1.45] text-muted-foreground">Možeš da pošalješ kuhinju i drugim radionicama.</p>
              <Link to="/kupac/posalji" className="inline-flex min-h-11 items-center rounded-lg border border-solid border-primary px-4 text-[14px] font-semibold text-accent-ink no-underline">Izaberi stolara</Link>
            </article>
          )}
        </div>
        <p className="m-0 text-[13px] text-muted-foreground">Cene stolara vidiš samo u njihovim ponudama. Primer cene je bio okviran i nije obavezujući.</p>
      </main>
    </div>
  );
}
