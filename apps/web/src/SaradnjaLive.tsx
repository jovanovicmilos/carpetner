// Saradnja for one real request (`/saradnja/:id`), design Saradnja (2026-11-23, no proposals): one place for the kitchen,
// the offer and the messages. Top: back, title, stages (Poslato → Preuzeto → Ponuda → Prihvaćeno → Montaža), presence;
// middle: the shared kitchen live (recent edits, "Otvori kuhinju", 3D), the offer with its versions and this side's action,
// dates and documents; right: the same feed as Prostor (default "Poruke"). Kept live by live.ts (one 3 s poll).
// shortcut: the design's "Merenje" stage and appointment booking have no data yet — Merenje is left out, Montaža is a note.
import type { Project } from 'engine';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { clock, editText, firstName, pollLive, sendMessage, SIDE_COLOR, useLive, useLiveSession, type Thread } from './live';
import { fitView, Plan } from './Plan';
import { PresenceChip } from './Presence';
import { kitchenSummary } from './Pregled';
import { useProjects } from './projects';
import { api, apiFile, ApiError, errorText } from './session';
import { dayOf, FeedItem } from './SessionPanel';
import { SiteHeader } from './Site';
import { useProject } from './store';
import { pull } from './sync';
import { WorkshopHeader } from './WorkshopHeader';

type Target = 'plan' | '3d' | 'offer';
const ROUTES: Record<'shop' | 'cust', Record<Target, string>> = { shop: { plan: '/projekat', '3d': '/3d', offer: '/ponuda' }, cust: { plan: '/kupac/prostor', '3d': '/kupac/izgled', offer: '/kupac/ponude' } };
const rsd = (para: number) => Math.round(para / 100).toLocaleString('sr-Latn').replace(/,/g, '.');
const date = (iso: string) => { const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const countOf = (n: number, one: string, few: string, many: string) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many}`;

export function SaradnjaLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setProject = useProject(s => s.setProject);
  const list = useProjects(s => s.list);
  const [error, setError] = useState('');
  useEffect(() => { // the first load tells a missing request apart; then live.ts keeps the thread fresh
    api<Thread>('GET', `/requests/${id}/thread`).then(() => pull()).catch(e => setError(errorText(e instanceof ApiError ? e.code : 'server')));
  }, [id]);
  useLiveSession(id);
  useEffect(() => { useLive.setState({ reading: true }); return () => useLive.setState({ reading: false }); }, []);
  const t = useLive(s => (s.requestId === id ? s.thread : undefined));
  if (!t) return <div className="flex min-h-dvh flex-col bg-background"><SiteHeader />{error && <p role="alert" className="m-6 text-[15px] text-[#8A1C22]">{error}</p>}</div>;
  return <Screen t={t} kitchen={Object.values(list).find(e => e.serverId === t.kitchenId)?.project}
    open={to => { const k = Object.values(useProjects.getState().list).find(e => e.serverId === t.kitchenId)?.project; if (!k) return;
      setProject(k); navigate(ROUTES[t.side][to]); }} />;
}

function Screen({ t, kitchen, open }: { t: Thread; kitchen?: Project; open: (to: Target) => void }) {
  const shop = t.side === 'shop', other = shop ? t.customer : t.workshop;
  const plan = kitchen ?? t.sent; // the shared kitchen as this browser has it (sync.ts keeps it live); before that, as sent
  const { shape, size, floor, uppers, look } = kitchenSummary(plan);
  const offers = t.offers, last = offers.at(-1), accepted = offers.some(o => o.status === 'accepted');
  const edits = t.messages.filter(m => m.kind === 'edit' && m.edit);
  const lastEdit = edits.at(-1);
  const unit = shop ? 'mm' : 'cm';
  const stages: [string, boolean][] = [['Poslato', true], ['Preuzeto', t.status === 'taken'], ['Ponuda', !!last], ['Prihvaćeno', accepted], ['Montaža', false]];
  const cur = stages.findIndex(s => !s[1]) - 1;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const act = async (job: () => Promise<unknown>) => { setBusy(true); setErr(''); try { await job(); } catch (e) { setErr(errorText(e instanceof ApiError ? e.code : 'server')); } finally { setBusy(false); } };
  const pdf = (oid: string) => act(async () => window.open(URL.createObjectURL(await apiFile(`/offers/${oid}/pdf`)), '_blank'));
  const badge = !last ? null : last.status === 'accepted' ? ['prihvaćena', 'bg-accent-soft text-accent-ink'] : last.status === 'declined' ? ['odbijena', 'bg-[#F6D5D3] text-[#8A1C22]']
    : [shop ? 'čeka odgovor kupca' : 'čeka tvoj odgovor', 'bg-wood-birch text-wood-bark'];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background font-sans text-foreground max-lg:h-auto max-lg:overflow-visible">
      {shop ? <WorkshopHeader current="Upiti" /> : <SiteHeader user={t.customer} />}
      <div className="flex flex-none flex-wrap items-center gap-x-3.5 gap-y-2 border-0 border-b border-solid border-border bg-white px-5 py-3">
        <Link to={shop ? '/upiti' : '/moje-kuhinje'} className="inline-flex min-h-8 items-center text-[14px]">← {shop ? 'Upiti' : 'Moje kuhinje'}</Link>
        <div className="flex flex-col leading-[1.25]">
          <h1 className="m-0 text-[19px]">{shape} {size} — {other}</h1>
          <span className="text-[13px] text-muted-foreground">upit od {date(t.createdAt)}{t.takenAt ? ` · preuzet ${date(t.takenAt)}` : ''}</span>
        </div>
        <ol aria-label="Tok posla" className="m-0 ml-auto flex list-none flex-wrap items-center gap-1 p-0">
          {stages.map(([name, done], i) => (
            <Fragment key={name}>
              {i > 0 && <li aria-hidden="true" className={cn('h-0.5 w-3.5', done || i <= cur ? 'bg-accent-on-dark' : 'bg-border')} />}
              <li aria-current={i === cur ? 'step' : undefined} className={cn('inline-flex items-center gap-1.5 text-[13.5px]', i === cur ? 'font-semibold' : done ? 'text-ink-2' : 'text-muted-2')}>
                <span aria-hidden="true" className={cn('box-border size-[9px] rounded-full', i === cur ? 'border-2 border-solid border-primary bg-white' : done ? 'bg-accent-on-dark' : 'border-[1.5px] border-solid border-muted-2')} />
                {name}{done && i !== cur && <span className="sr-only"> — urađeno</span>}
              </li>
            </Fragment>
          ))}
        </ol>
        {t.status === 'taken' && <PresenceChip partner={{ name: other, requestId: t.id }} customer={!shop} />}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] max-lg:grid-cols-1">
        <main className="grid min-w-0 grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] content-start gap-4 overflow-y-auto px-5 py-[18px] max-md:grid-cols-1">
          <section aria-labelledby="k-h" className="col-span-full grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] overflow-hidden rounded-xl border border-solid border-border bg-white max-md:grid-cols-1">
            <div className="relative min-h-[290px] border-0 border-r border-solid border-[#EEEAE2] bg-[#FAF8F4] p-2.5">
              <Plan project={plan} view={fitView(plan)} unit={unit} role="img" aria-label={`Kuhinja uživo: ${shape} ${size}`} className="h-full w-full"
                remote={lastEdit?.edit?.after && Date.now() - Date.parse(lastEdit.at) < 10 * 60_000 ? { ids: [lastEdit.edit.id], color: SIDE_COLOR[lastEdit.side], was: [] } : null} />
              {t.status === 'taken' && <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-[10px] border border-solid border-border bg-white px-[9px] py-[3px] text-[12px] font-semibold">
                <span aria-hidden="true" className="size-[7px] rounded-full bg-[#3FB06A]" />uživo</span>}
            </div>
            <div className="flex flex-col gap-3 px-[18px] py-4">
              <div><h2 id="k-h" className="m-0 text-[18px]">Kuhinja</h2>
                <span className="text-[13.5px] text-muted-foreground">{t.status === 'taken' ? 'Jedna kuhinja — menjate je oboje, u Prostoru.' : 'Kako je poslata stolaru.'}</span></div>
              <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14px]">
                <dt className="text-muted-foreground">Elementi</dt><dd className="m-0">{countOf(floor.length, 'donji i visoki', 'donja i visoka', 'donjih i visokih')} · {countOf(uppers.length, 'gornji', 'gornja', 'gornjih')}</dd>
                <dt className="text-muted-foreground">Izgled</dt><dd className="m-0 first-letter:uppercase">{look.filter(Boolean).join(' · ')}</dd>
                <dt className="text-muted-foreground">Poslednja izmena</dt><dd className="m-0">{lastEdit ? `${lastEdit.side === t.side ? 'Ti' : firstName(lastEdit.by)} · ${dayOf(lastEdit.at).toLowerCase()} u ${clock(lastEdit.at)}` : 'još nema izmena'}</dd>
              </dl>
              {!!edits.length && <ul aria-label="Poslednje izmene" className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px] text-ink-2">
                {edits.slice(-3).reverse().map(m => { const e = editText(m.edit!, unit); return (
                  <li key={m.id} className="flex items-center gap-2"><span aria-hidden="true" className="size-2 flex-none rounded-[2px]" style={{ background: SIDE_COLOR[m.side] }} />
                    <span className="min-w-0 truncate"><strong className="font-semibold">{m.side === t.side ? 'Ti' : firstName(m.by)}</strong> · {e.unit ? `${e.unit} — ` : ''}{e.what}</span>
                    <span className="ml-auto flex-none text-muted-2">{dayOf(m.at) === 'Danas' ? clock(m.at) : dayOf(m.at).toLowerCase()}</span></li>); })}
              </ul>}
              <div className="mt-auto flex gap-2">
                <Button size="none" disabled={!kitchen} onClick={() => open('plan')} className="min-h-11 flex-1 rounded-lg text-[15px] font-semibold">Otvori kuhinju</Button>
                <Button variant="outline" size="none" disabled={!kitchen} onClick={() => open('3d')} className="min-h-11 rounded-lg px-3.5 text-[14px] font-semibold">3D</Button>
              </div>
            </div>
          </section>

          <section aria-labelledby="o-h" className="flex flex-col gap-2.5 rounded-xl border border-solid border-border bg-white px-[18px] py-4">
            <div className="flex items-center gap-2"><h2 id="o-h" className="m-0 text-[18px]">Ponuda</h2>
              {badge && <span className={cn('rounded-[10px] px-2 py-0.5 text-[12px] font-semibold', badge[1])}>{badge[0]}</span>}</div>
            {last ? <>
              <div className="flex items-baseline gap-2.5"><span className="font-mono text-[26px] font-bold">{rsd(last.total)} RSD</span>
                <span className="text-[13px] text-muted-foreground">v{last.version} · važi do {date(last.validUntil)}</span></div>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13.5px] text-ink-2">
                {[...offers].reverse().map((o, i) => (
                  <li key={o.id} className={cn('flex gap-2', i > 0 && 'text-muted-2')}><span className="flex-none">v{o.version} · {date(o.createdAt)}</span>
                    <span className="min-w-0 truncate text-muted-foreground">{o.note}</span><span className="ml-auto font-mono">{rsd(o.total)}</span></li>
                ))}
              </ul>
            </> : <p className="m-0 text-[14px] text-muted-foreground">{shop ? 'Ponuda još nije poslata kupcu.' : 'Stolar još nije poslao ponudu.'}</p>}
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              {shop ? !accepted && <Button variant="outline" size="none" disabled={!kitchen} onClick={() => open('offer')}
                className="min-h-10 rounded-lg border-primary px-3.5 text-[14px] font-semibold text-accent-ink">{last ? 'Nova verzija ponude' : 'Napravi ponudu'}</Button>
                : last?.status === 'sent' && <Button size="none" disabled={busy} onClick={() => act(() => api('POST', `/offers/${last.id}/accept`).then(pollLive))}
                  className="min-h-10 rounded-lg px-4 text-[14px] font-semibold">Prihvati ponudu</Button>}
              {last?.hasPdf && <Button variant="outline" size="none" disabled={busy} onClick={() => pdf(last.id)} className="min-h-10 rounded-lg px-3.5 text-[14px] font-semibold">PDF</Button>}
              {!shop && last && <Link to="/kupac/ponude" className="inline-flex min-h-10 items-center text-[14px]">Sve ponude</Link>}
            </div>
            {err && <p role="alert" className="m-0 text-[13.5px] text-[#8A1C22]">{err}</p>}
          </section>

          <section aria-labelledby="m-h" className="flex flex-col gap-2.5 rounded-xl border border-solid border-border bg-white px-[18px] py-4">
            <h2 id="m-h" className="m-0 text-[18px]">Termini i dokumenti</h2>
            <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-line-strong px-3 py-2.5 text-[14px] text-muted-foreground">
              <span className="flex-1"><strong className="text-foreground">Montaža</strong> · {accepted ? 'dogovarate termin u porukama' : 'dogovara se posle prihvaćene ponude'}</span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[14px]">
              {offers.filter(o => o.hasPdf).reverse().map(o => <li key={o.id}><button type="button" onClick={() => pdf(o.id)} className="inline-flex min-h-[30px] cursor-pointer items-center border-0 bg-transparent p-0 font-sans text-[14px] text-primary underline">Ponuda v{o.version} (PDF)</button></li>)}
              <li><span className="inline-flex min-h-[30px] items-center text-muted-foreground">{t.photos ? countOf(t.photos, 'fotografija prostorije', 'fotografije prostorije', 'fotografija prostorije') : 'Bez fotografija prostorije'}</span></li>
            </ul>
          </section>
        </main>
        <Messages t={t} unit={unit} />
      </div>
    </div>
  );
}

/** Right column: messages (and with "Sve" the kitchen's edits), offer events as pills, the composer. */
function Messages({ t, unit }: { t: Thread; unit: 'mm' | 'cm' }) {
  const [all, setAll] = useState(false);
  const [draft, setDraft] = useState('');
  const box = useRef<HTMLOListElement>(null);
  type Row = { at: string; key: string; node: (day: string | null) => React.ReactNode };
  const rows: Row[] = [
    ...t.messages.filter(m => all || m.kind !== 'edit').map(m => ({ at: m.createdAt, key: m.id, node: (day: string | null) => <FeedItem m={m} mine={m.side === t.side} unit={unit} day={day} /> })),
    ...t.offers.flatMap(o => [
      { at: o.createdAt, key: `o${o.id}`, node: (day: string | null) => <Pill day={day} text={`Ponuda v${o.version} poslata · ${rsd(o.total)} RSD`} /> },
      ...(o.status === 'accepted' && o.decidedAt ? [{ at: o.decidedAt, key: `a${o.id}`, node: (day: string | null) => <Pill day={day} text={`Ponuda v${o.version} prihvaćena`} /> }] : []),
    ]),
  ].sort((a, b) => a.at.localeCompare(b.at));
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [rows.length]);
  useEffect(() => { useLive.setState({ typing: !!draft.trim() }); }, [draft]);
  const send = () => { const text = draft.trim(); if (!text) return; setDraft(''); void sendMessage(text).catch(() => setDraft(text)); };
  return (
    <aside aria-label="Poruke" className="flex min-h-0 flex-col border-0 border-l border-solid border-border bg-white max-lg:min-h-[480px] max-lg:border-t max-lg:border-l-0">
      <div className="flex flex-none items-center gap-2 border-0 border-b border-solid border-[#EEEAE2] px-4 py-3">
        <h2 className="m-0 text-[16px]">Poruke</h2>
        <span role="radiogroup" aria-label="Prikaži" className="ml-auto inline-flex rounded-md bg-background p-0.5">
          {([[false, 'Poruke'], [true, 'Sve']] as const).map(([v, l]) => (
            <button key={l} type="button" role="radio" aria-checked={all === v} onClick={() => setAll(v)}
              className="min-h-[30px] cursor-pointer rounded-[5px] border-0 bg-transparent px-2.5 font-sans text-[13px] font-medium text-ink-2 aria-checked:bg-white aria-checked:font-semibold aria-checked:text-foreground aria-checked:shadow-[0_1px_3px_rgba(0,0,0,0.12)]">{l}</button>
          ))}
        </span>
      </div>
      <ol ref={box} aria-label="Poruke i izmene" className="m-0 flex min-h-0 flex-1 list-none flex-col gap-2.5 overflow-y-auto px-4 py-3">
        {!rows.length && <li className="text-[14px] text-muted-foreground">Još nema poruka.</li>}
        {rows.map((r, i) => <Fragment key={r.key}>{r.node(i === 0 || dayOf(rows[i - 1].at) !== dayOf(r.at) ? dayOf(r.at) : null)}</Fragment>)}
      </ol>
      <form onSubmit={e => { e.preventDefault(); send(); }} className="flex flex-none items-end gap-1.5 border-0 border-t border-solid border-[#EEEAE2] px-4 pt-2.5 pb-3">
        <Textarea rows={2} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          aria-label={`Poruka za ${t.side === 'shop' ? t.customer : t.workshop}`} placeholder="Napiši poruku…" className="min-h-0 flex-1 resize-none rounded-lg px-2.5 py-2 text-[14px] leading-[1.4]" />
        <Button type="submit" size="none" disabled={!draft.trim()} className="min-h-10 rounded-lg px-3.5 text-[13.5px] font-semibold">Pošalji</Button>
      </form>
    </aside>
  );
}

function Pill({ day, text }: { day: string | null; text: string }) {
  return <>{day && <li className="self-center text-[12px] text-muted-foreground">{day}</li>}
    <li className="self-center rounded-xl bg-[#F6EEE2] px-2.5 py-1 text-[12.5px] text-ink-2">{text}</li></>;
}
