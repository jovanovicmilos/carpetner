// Workshop inbox of customer requests (design/screens/Upiti.html): filter + list, selected request with the customer's plan,
// summary, message and photos, "Preuzmi projekat" (→ Saradnja) or decline with a reason; monthly request quota.
// Signed in as a workshop member: the workshop's real requests (apps/api /organizations/:org/requests), the kitchen as sent
// drawn with Plan.tsx, "Preuzmi projekat" makes the working copy (a workshop project) and opens it in the planner, "Odbij upit"
// sends the reason. Signed out: the design's five placeholder requests (reference plan drawing, links only).
// shortcut: the monthly quota is drawn (not counted); room photos are not uploaded yet; the "Ponuda" filter waits for offers.
import type { Project } from 'engine';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fitView, Plan } from './Plan';
import { examplePrice, kitchenSummary } from './Pregled';
import { useProjects } from './projects';
import { api, ApiError, errorText, useSession } from './session';
import { useProject } from './store';
import { pull } from './sync';
import { WorkshopHeader } from './WorkshopHeader';

type State = 'new' | 'review' | 'offer' | 'declined';
type Row = { id: string; st: State; title: string; meta: string; due: string; units: string; look: string; example: string; others: string; contact: string; note: string; demo?: boolean; projectId?: string };
const REQ: Row[] = ([
  { id: 1, st: 'new', title: 'Ugaona 320 × 240 — Ana P.', meta: 'Novi Sad, Liman · poslato danas, 18:12', due: 'Odgovori do: 25. 11. (5 radnih dana)', units: '7 donjih i visokih, 4 gornja · rerna u visokom, frižider ugradni', look: 'Svetla · ručke šipka · radna ploča hrast', example: '240.000–290.000 RSD (partner [PARTNER])', others: 'još 1 radionici', contact: 'vidljiv kad preuzmeš projekat', note: 'Stari elementi se demontiraju. Zid B nije baš ravan. Voleo bih ugradnju u martu.' },
  { id: 2, st: 'new', title: 'Prava 260 — Marko S.', meta: 'Futog · poslato juče', due: 'Odgovori do: 24. 11.', units: '5 donjih, 4 gornja', look: 'Drvo · bez ručki', example: 'nije prikazan', others: 'samo tebi', contact: 'vidljiv kad preuzmeš projekat', note: 'Mala kuhinja u stanu, bez mašine za sudove.' },
  { id: 3, st: 'new', title: 'U oblik 280 × 300 × 280 — Jelena K.', meta: 'Novi Sad, Detelinara · pre 2 dana', due: 'Odgovori do: 23. 11.', units: '11 donjih i visokih, 6 gornjih', look: 'Tamna · dugmad', example: '410.000–480.000 RSD', others: 'još 2 radionice', contact: 'vidljiv kad preuzmeš projekat', note: 'Može li ostava umesto visokog sa rernom?' },
  { id: 4, st: 'review', title: 'Sa ostrvom 410 — Nikolić', meta: 'Novi Sad · preuzeto 15. 11.', due: 'Merenje 22. 11. u 10:00', units: '9 donjih, ostrvo 240, 5 gornjih', look: 'Drvo + bela', example: 'nije prikazan', others: 'samo tebi', contact: '06x xxx xxxx · nikolic@…', note: 'Ostrvo sa šankom za 3 stolice.' },
  { id: 5, st: 'offer', title: 'Ugaona 300 × 200 — Petrović', meta: 'Sremski Karlovci · ponuda v2 poslata 19. 11.', due: 'Kupac traži izmene (2 komentara)', units: '8 donjih i visokih, 4 gornja', look: 'Svetla · šipka', example: '230.000–270.000 RSD', others: 'još 1 radionici', contact: '06x xxx xxxx', note: 'Ponuda poslata, čeka se odgovor.' },
] as const).map(r => ({ ...r, id: String(r.id), demo: true }));
interface ApiReq { id: string; name: string; message: string; status: 'new' | 'taken' | 'declined'; declineReason?: string; others: number; customer: string; contact: string | null; workshopProjectId?: string; createdAt: string }
const day = (iso: string, plus = 0) => new Date(new Date(iso).getTime() + plus * 86400000).toLocaleDateString('sr-Latn', { day: 'numeric', month: 'numeric' });
/** An API request in the inbox's words; the kitchen summary comes from the detail once it is loaded. */
function toRow(r: ApiReq, data?: Project): Row {
  const sum = data && kitchenSummary(data);
  return {
    id: r.id, st: r.status === 'taken' ? 'review' : r.status, projectId: r.workshopProjectId,
    title: `${r.name.replace(/^Moja kuhinja — /, '')} — ${r.customer}`, meta: `poslato ${day(r.createdAt)}`,
    due: r.status === 'new' ? `Odgovori do: ${day(r.createdAt, 5)}` : r.status === 'taken' ? 'Preuzeto — kontakt je otključan' : `Odbijeno${r.declineReason ? `: ${r.declineReason}` : ''}`,
    units: sum ? `${sum.floor.length} donjih i visokih, ${sum.uppers.length} gornja` : '…', look: sum ? sum.look.join(' · ') : '…', example: data ? examplePrice(data) : '…',
    others: r.others ? `još ${r.others} ${r.others === 1 ? 'radionici' : 'radionice'}` : 'samo tebi',
    contact: r.contact ?? 'vidljiv kad preuzmeš projekat', note: r.message || 'Kupac nije ostavio poruku.',
  };
}
const ST: Record<State, [string, string]> = { new: ['Novo', 'bg-accent-soft text-accent-ink'], review: ['Preuzeto', 'bg-background text-ink-2'], offer: ['Ponuda poslata', 'bg-wood-birch text-wood-bark'], declined: ['Odbijeno', 'bg-[#F6D5D3] text-[#8A1C22]'] };
const FILTERS: [State | 'all', string][] = [['all', 'Svi'], ['new', 'Novi'], ['review', 'Preuzeti'], ['offer', 'Ponuda']];
const REASONS = ['Ne radim u tom mestu', 'Zauzet sam u tom roku', 'Ne radim ovu vrstu posla', 'Drugo…'];
const UNIT = { fill: '#EADBC4', stroke: '#1C1B19', strokeWidth: 1 } as const;
const MONO = { fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fill: '#5F5A52' } as const;

export function Upiti() {
  const shopId = useSession(s => (s.session ? s.workshops[0]?.id : undefined));
  const [real, setReal] = useState<ApiReq[] | null>(null);
  const [detail, setDetail] = useState<{ id: string; data: Project } | null>(null);
  const [sel, setSel] = useState('1');
  const [filter, setFilter] = useState<State | 'all'>('all');
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setProject = useProject(s => s.setProject);
  const navigate = useNavigate();
  const load = useCallback(async () => {
    if (!shopId) return;
    const l = await api<ApiReq[]>('GET', `/organizations/${shopId}/requests`);
    setReal(l);
    setSel(cur => (l.some(r => r.id === cur) ? cur : l[0]?.id ?? ''));
  }, [shopId]);
  useEffect(() => { load().catch(e => setError(errorText(e instanceof ApiError ? e.code : 'server'))); }, [load]);
  useEffect(() => {
    if (!real || !sel || detail?.id === sel) return;
    api<{ data: Project }>('GET', `/requests/${sel}`).then(r => setDetail({ id: sel, data: r.data })).catch(() => {});
  }, [real, sel, detail]);

  const rows = real ? real.map(r => toRow(r, detail?.id === r.id ? detail.data : undefined)) : REQ;
  const list = rows.filter(r => filter === 'all' || r.st === filter);
  const d = rows.find(r => r.id === sel) ?? rows[0];
  const plan = real && detail?.id === d?.id ? detail.data : null;

  /** Runs an inbox action; errors show under the actions. */
  const act = async (job: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await job(); } catch (e) { setError(errorText(e instanceof ApiError ? e.code : 'server')); } finally { setBusy(false); }
  };
  /** The workshop's working copy comes down with the workshop's projects (sync.ts) and opens in the planner. */
  const openCopy = (projectId: string) => {
    const e = Object.values(useProjects.getState().list).find(x => x.serverId === projectId);
    if (!e) throw new ApiError(404, 'not_found');
    setProject(e.project);
    navigate('/planer');
  };
  const take = () => act(async () => {
    const r = await api<ApiReq>('POST', `/requests/${d!.id}/take`);
    await pull();
    openCopy(r.workshopProjectId!);
  });
  const decline = () => act(async () => { await api('POST', `/requests/${d!.id}/decline`, { reason }); await load(); });
  const info: [string, string][] = [['Elementi', d.units], ['Izgled', d.look], ['Primer cene', d.example], ['Poslato i drugim', d.others], ['Kontakt', d.contact]];

  return (
    <div className="flex min-h-[1000px] flex-col bg-background font-sans text-foreground">
      <WorkshopHeader current="Upiti" />
      <main className="mx-auto box-border flex w-full max-w-[1360px] flex-col gap-4 px-5 pt-6 pb-10">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="m-0 text-[30px]">Upiti kupaca</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Kupci su sami nacrtali kuhinju i platili slanje. Projekat je već otvoren — pregledaj ga i preuzmi.</p>
          </div>
          <div className="ml-auto flex min-w-[260px] flex-col gap-1">
            <div className="flex justify-between gap-3 text-[13px] text-muted-foreground"><span>Upiti ovog meseca</span><span><strong className="text-foreground">7</strong> · neograničeno u probi Pro</span></div>
            <div aria-hidden="true" className="h-1.5 rounded-[3px] bg-accent-soft"><div className="h-full w-full rounded-[3px] bg-accent-on-dark" /></div>
            <div className="text-[12px] text-muted-foreground">Posle probe, paket Start: 3 upita mesečno. <Link to="/pretplata">Paketi</Link></div>
          </div>
        </div>

        <div className="grid grid-cols-[440px_minmax(0,1fr)] items-start gap-4 max-lg:grid-cols-[340px_minmax(0,1fr)] max-md:grid-cols-1">
          <section aria-label="Lista upita" className="overflow-hidden rounded-xl border border-solid border-border bg-white">
            <div role="radiogroup" aria-label="Filter" className="flex gap-1 border-0 border-b border-solid border-[#EEEAE2] bg-[#FAF8F4] p-2.5">
              {FILTERS.map(([f, t]) => {
                const on = filter === f;
                return (
                  <button key={f} type="button" role="radio" aria-checked={on} onClick={() => setFilter(f)}
                    className={cn('min-h-9 cursor-pointer rounded-md border-0 px-3 font-sans text-[14px] text-foreground', on ? 'bg-white font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'bg-transparent font-medium')}>
                    {t}<span className="ml-[5px] font-normal text-muted-foreground">{rows.filter(r => f === 'all' || r.st === f).length}</span>
                  </button>
                );
              })}
            </div>
            <ul className="m-0 list-none p-0">
              {real && !list.length && <li className="border-0 border-t border-solid border-[#EEEAE2] px-3.5 py-4 text-[14px] text-ink-2">{real.length ? 'Nema upita u ovom filteru.' : 'Još nema upita. Kad kupac izabere tvoju radionicu, upit stiže ovde.'}</li>}
              {list.map(r => {
                const on = r.id === d.id;
                return (
                  <li key={r.id} className="border-0 border-t border-solid border-[#EEEAE2]">
                    <button type="button" aria-pressed={on} onClick={() => setSel(r.id)}
                      className={cn('flex w-full cursor-pointer flex-col items-start gap-[3px] border-0 px-3.5 py-3 text-left font-sans text-foreground', on ? 'bg-accent-soft shadow-[inset_3px_0_0_var(--primary)]' : 'bg-white')}>
                      <span className="flex w-full items-center gap-2">
                        {r.st === 'new' && <span aria-label="novo" className="size-2 flex-none rounded-full bg-primary" />}
                        <span className="text-[15px] font-semibold">{r.title}</span>
                        <span className={cn('ml-auto rounded-[10px] px-2 py-0.5 text-[12px] whitespace-nowrap', ST[r.st][1])}>{ST[r.st][0]}</span>
                      </span>
                      <span className="text-[13px] text-muted-foreground">{r.meta}</span>
                      <span className="text-[13px] text-ink-2">{r.due}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {d && <section aria-labelledby="req-h" className="flex flex-col gap-4 rounded-xl border border-solid border-border bg-white p-5">
            <div className="flex flex-wrap items-start gap-3">
              <div>
                <div className="text-[12px] font-semibold tracking-[0.06em] text-primary uppercase">{ST[d.st][0]} · {d.due}</div>
                <h2 id="req-h" className="mt-0.5 mb-0 text-[24px]">{d.title}</h2>
                <div className="mt-1 text-[14px] text-muted-foreground">{d.meta}</div>
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                {d.demo ? <>
                  <Link to="/kupac/kuhinja" className="inline-flex min-h-11 items-center rounded-md border border-solid border-line-strong px-3.5 text-[14px] font-semibold text-foreground no-underline hover:text-foreground">Otvori za pregled</Link>
                  <Link to="/saradnja" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-[14px] font-semibold text-white no-underline hover:text-white">{d.st === 'new' ? 'Preuzmi projekat' : 'Otvori saradnju'}</Link>
                </> : d.st === 'new'
                  ? <Button size="none" disabled={busy} onClick={() => void take()} className="min-h-11 rounded-md px-4 text-[14px] font-semibold">Preuzmi projekat</Button>
                  : d.st === 'review' && d.projectId && <Button size="none" disabled={busy} onClick={() => void act(async () => { await pull(); openCopy(d.projectId!); })} className="min-h-11 rounded-md px-4 text-[14px] font-semibold">Otvori projekat</Button>}
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 max-md:grid-cols-1">
              <div className="flex flex-col gap-2 rounded-[10px] border border-solid border-border bg-[#FAF8F4] p-3">
                {plan ? <Plan project={plan} view={fitView(plan)} unit="cm" role="img" aria-label={`Plan kupca: ${d.title}`} className="aspect-[420/260] h-auto w-full" />
                : real ? <div className="aspect-[420/260] w-full" aria-busy="true" />
                : <svg viewBox="0 0 420 260" role="img" aria-label={`Plan kupca: ${d.title}`} className="h-auto w-full">
                  <path d="M40 240V30H400" fill="none" stroke="#1C1B19" strokeWidth="7" />
                  <rect x="180" y="26" width="90" height="8" fill="#DCE7F7" stroke="#1C1B19" strokeWidth="1" />
                  <rect x="44" y="34" width="72" height="44" {...UNIT} />
                  <rect x="116" y="34" width="58" height="44" {...UNIT} fill="#C9DAF2" />
                  <rect x="174" y="34" width="44" height="44" {...UNIT} fill="#FFFFFF" />
                  <rect x="218" y="34" width="44" height="44" {...UNIT} />
                  <rect x="44" y="78" width="44" height="44" {...UNIT} />
                  <rect x="44" y="122" width="44" height="44" {...UNIT} />
                  <rect x="44" y="166" width="44" height="44" {...UNIT} fill="#D6BE98" />
                  <circle cx="148" cy="22" r="8" fill="#1E50C8" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="34" cy="100" r="8" fill="#F2B630" stroke="#FFFFFF" strokeWidth="2" />
                  <text x="290" y="18" textAnchor="middle" {...MONO}>A 3200 · uneo kupac</text>
                  <text x="20" y="250" {...MONO}>B 2400</text>
                </svg>}
                <div role="note" className="flex items-center gap-2 rounded-md bg-[#FBE3D3] px-2.5 py-2 text-[13px] text-[#7C2D0A]">
                  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="flex-none"><path d="M9 2l7.5 13h-15z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 7v4M9 13v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  Mere je uneo kupac — proveri ih merenjem pre ponude.
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-[14px]">
                  {info.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="m-0">{v}</dd></div>)}
                </dl>
                <div className="rounded-lg bg-background px-3 py-2.5 text-[14px] leading-[1.45]"><strong className="mr-1 font-semibold">Poruka kupca:</strong><span>{d.note}</span></div>
                {d.demo && <div className="flex gap-2">
                  <span aria-hidden="true" className="size-16 rounded-md bg-[#E0CCAD]" />
                  <span aria-hidden="true" className="size-16 rounded-md bg-[#D6BE98]" />
                  <span className="self-center text-[13px] text-muted-foreground">2 fotografije prostorije</span>
                </div>}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2.5 border-0 border-t border-solid border-[#EEEAE2] pt-3.5">
              <div className="min-w-[280px] flex-1 text-[14px] leading-[1.45] text-ink-2 max-md:min-w-0 max-md:basis-full"><strong>Preuzmi projekat</strong> pravi tvoju radnu kopiju povezanu sa kupčevom verzijom. Svaka tvoja izmena kupcu se prikazuje kao predlog sa razlogom.</div>
              {(d.demo || d.st === 'new') && <>
                <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">Ako odbijaš, razlog
                  <select value={reason} onChange={e => setReason(e.target.value)} className="min-h-11 rounded-md border border-solid border-line-strong bg-white px-2.5 font-sans text-[14px] text-foreground">
                    {REASONS.map(r => <option key={r}>{r}</option>)}
                  </select></label>
                <Button variant="outline" size="none" disabled={busy || d.demo} onClick={() => void decline()} className="min-h-11 rounded-md border-line-strong bg-white px-4 text-[14px] font-semibold text-foreground disabled:opacity-100">Odbij upit</Button>
              </>}
              {error && <p role="alert" className="m-0 basis-full text-[13px] text-[#8A1C22]">{error}</p>}
            </div>
          </section>}
        </div>
      </main>
    </div>
  );
}
