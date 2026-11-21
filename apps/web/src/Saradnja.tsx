// Collaboration on one project (design/screens/Saradnja.html): what is agreed, timeline, documents; the workshop's change
// proposals on the plan, which the customer accepts / declines and then approves the layout; messages.
// `/saradnja` is the workshop's view (with "Prikaz kao Stolar / Kupac" to preview the customer's side); `/saradnja?kao=kupac`
// is the customer's own view (site header, no role switch), opened from Ponude.
// shortcut: proposals, timeline, documents and messages are the design's placeholders and decisions / sent messages are
// local state; the plan is the reference's stylised drawing, not Plan.tsx with a real version diff. Real proposals and
// messages come with apps/api (docs/AI.md "Proposal" is the planned shape). Fotografija, Predloži termin and comments by
// clicking a unit on the plan are drawn, not wired.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SiteHeader } from './Site';
import { WorkshopHeader } from './WorkshopHeader';

type Role = 'shop' | 'cust';
type Decision = 'acc' | 'rej';
const PROPS = [
  { n: '1', title: 'Sudopera pomerena 20 cm udesno', why: 'odvod je na 145 cm od ugla, a ne na 125 cm kako je ucrtano.', price: 'Cena se ne menja.', x: 349, y: 175 },
  { n: '2', title: 'Fioke 60 → dve fioke po 30 cm pored ploče za kuvanje', why: 'sa strane ploče treba bar 30 cm radne površine; uske fioke za začine.', price: '+4.200 RSD', x: 596, y: 175 },
  { n: '3', title: 'Dodata završna lajsna uz zid B', why: 'zid B nije ravan (do 15 mm) — lajsna pokriva razmak.', price: '+1.900 RSD', x: 170, y: 331 },
];
const TIMELINE: [string, string][] = [['Kupac poslao projekat', '18. 11. · Plus'], ['Preuzet projekat', '19. 11.'], ['Ponuda v1', '19. 11. · bez merenja'], ['Merenje na licu mesta', '22. 11. u 17:00'], ['Ponuda v2 + 3 predloga', '22. 11.'], ['Kupac komentarisao', 'danas, 09:14']];
type Msg = { by: Role; when: string; text: string; pin?: string };
const MESSAGES: Msg[] = [
  { by: 'cust', when: '18. 11.', text: 'Dobar dan! Zid B nije baš ravan, da li je to problem?' },
  { by: 'shop', when: '19. 11.', text: 'Nije problem — dodaćemo završnu lajsnu (predlog 3). Merenje može u ponedeljak u 17h?' },
  { by: 'cust', when: '19. 11.', text: 'Može, potvrđujem termin.' },
  { by: 'shop', when: '22. 11.', text: 'Izmerili smo — odvod je na 145 cm, pomerili smo sudoperu. Poslali smo ponudu v2.' },
  { by: 'cust', when: 'danas, 09:14', text: 'Može li ostava umesto visokog sa rernom?', pin: 'Komentar na: Visoki 60 (zid B)' },
];
const NAME: Record<Role, string> = { shop: '[Radionica A]', cust: 'Ana P.' };
const DOCS: [string, string][] = [['Ponuda v2 (PDF)', '/ponuda'], ['Ponuda v1 (PDF)', '/ponuda'], ['Projekat kupca, verzija od 18. 11.', '/nacrti']];
const LEGEND = [['dodato', 'h-2.5 w-3.5 border-[1.5px] border-solid border-ok-strong bg-ok-soft'], ['promenjeno', 'h-2.5 w-3.5 border-[1.5px] border-solid border-[#1E50C8]'],
  ['bilo ranije', 'h-2.5 w-3.5 border-[1.5px] border-dashed border-[#8A8378]'], ['komentar', 'size-3.5 rounded-full bg-dark']] as const;
const TXT = { fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 600, fill: '#1C1B19', textAnchor: 'middle' } as const;
const PILL = 'flex-none rounded-[10px] px-[9px] py-[3px] text-[12.5px]';

export function Saradnja() {
  const asCustomer = useSearchParams()[0].get('kao') === 'kupac';
  const [role, setRole] = useState<Role>(asCustomer ? 'cust' : 'shop');
  const [dec, setDec] = useState<Record<string, Decision | undefined>>({});
  const [approved, setApproved] = useState(false);
  const [msgs, setMsgs] = useState(MESSAGES);
  const [draft, setDraft] = useState('');
  const cust = role === 'cust';
  const decided = PROPS.filter(p => dec[p.n]).length;
  const all = decided === PROPS.length;
  const toggle = (n: string, v: Decision) => setDec(d => ({ ...d, [n]: d[n] === v ? undefined : v }));
  const send = () => { if (draft.trim()) { setMsgs(m => [...m, { by: role, when: 'sada', text: draft.trim() }]); setDraft(''); } };

  const checks = [
    { name: 'Raspored odobren', sub: approved ? 'kupac potvrdio danas' : cust ? 'odluči o 3 predloga' : 'čeka kupca (3 predloga)', done: approved, cur: !approved },
    { name: 'Izgled odobren', sub: 'fronte, ručke, radna ploča', done: false, cur: approved },
    { name: 'Ponuda prihvaćena', sub: 'v2 · 268.066 RSD', done: false, cur: false },
  ];
  const pins = [...PROPS.map(p => ({ x: p.x, y: p.y, t: p.n, fill: '#1E50C8' })), { x: 172, y: 286, t: 'K', fill: '#1F2B24' }];
  const decBtn = (on: boolean, good: boolean) => cn('min-h-10 rounded-md border border-solid px-3 text-[13px] font-semibold',
    on ? (good ? 'border-primary bg-primary text-white' : 'border-[#A3261F] bg-[#F6D5D3] text-[#8A1C22]') : 'border-line-strong bg-white text-foreground');

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background font-sans text-foreground max-md:h-auto max-md:overflow-visible">
      {asCustomer ? <SiteHeader user="Ana P." /> : <WorkshopHeader current="Upiti" />}

      <div className="flex flex-wrap items-center gap-3 border-0 border-b border-solid border-border bg-white px-5 py-3">
        {asCustomer
          ? <Link to="/kupac/ponude" className="inline-flex min-h-9 items-center text-[14px]">← Ponude</Link>
          // shortcut: Upiti has no screen yet; the workshop goes back to its projects
          : <Link to="/projekti" className="inline-flex min-h-9 items-center text-[14px]">← Upiti</Link>}
        <h1 className="m-0 text-[20px]">Saradnja · Ugaona 320 × 240 — {asCustomer ? NAME.shop : NAME.cust}</h1>
        <span className="rounded-[10px] bg-wood-birch px-[9px] py-[3px] text-[13px] font-semibold text-wood-bark">{approved ? 'Raspored odobren · čeka se ponuda' : 'Ponuda v2 · kupac pregleda izmene'}</span>
        <div className="ml-auto flex items-center gap-2">
          {!asCustomer && <>
            <span className="text-[13px] text-muted-foreground">Prikaz kao</span>
            <span role="radiogroup" aria-label="Prikaz kao" className="inline-flex overflow-hidden rounded-lg border border-solid border-line-strong">
              {([['shop', 'Stolar'], ['cust', 'Kupac']] as const).map(([r, t]) => (
                <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                  className={cn('min-h-9 cursor-pointer border-0 px-3.5 font-sans text-[14px] font-medium', role === r ? 'bg-dark text-white' : 'bg-white text-foreground')}>{t}</button>
              ))}
            </span>
          </>}
          <Link to={cust ? '/kupac/izgled' : '/planer'} className="inline-flex min-h-10 items-center rounded-md bg-primary px-3.5 text-[14px] font-semibold text-white no-underline hover:text-white">{cust ? 'Otvori u 3D' : 'Otvori radnu verziju'}</Link>
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
              {TIMELINE.map(([t, when], i) => (
                <li key={t} className="relative pl-3.5 text-[13.5px]">
                  <span aria-hidden="true" className={cn('absolute top-[3px] -left-2.5 box-border size-3 rounded-full', i === TIMELINE.length - 1 ? 'border-2 border-solid border-primary bg-white' : 'bg-accent-on-dark')} />
                  <span className="font-medium">{t}</span><br /><span className="text-[12.5px] text-muted-foreground">{when}</span>
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h2 className="mt-0 mb-2 text-[15px]">Dokumenti</h2>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[14px]">
              {DOCS.map(([t, to]) => <li key={t}><Link to={to} className="inline-flex min-h-[30px] items-center">{t}</Link></li>)}
            </ul>
          </section>
        </aside>

        <main aria-label="Izmene na planu" className="flex min-h-0 min-w-0 flex-col gap-3.5 overflow-y-auto p-4 max-md:order-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="m-0 text-[18px]">Predlozi stolara</h2>
            <span className="text-[14px] text-muted-foreground">verzija kupca 18. 11. → radna verzija stolara</span>
            <span className="ml-auto flex flex-wrap gap-3 text-[12.5px] text-ink-2">
              {LEGEND.map(([t, cls]) => <span key={t} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={cls} />{t}</span>)}
            </span>
          </div>
          <div className="rounded-[10px] border border-solid border-border bg-[#FAF8F4] p-2.5">
            <svg viewBox="0 0 760 360" role="img" aria-label="Plan sa označenim izmenama: sudopera pomerena, fioke podeljene, dodata završna lajsna, komentar kupca na visokom elementu" className="h-auto w-full">
              <path d="M40 340V40H720" fill="none" stroke="#1C1B19" strokeWidth="9" />
              <rect x="290" y="35" width="160" height="10" fill="#DCE7F7" stroke="#1C1B19" strokeWidth="1" />
              <rect x="45" y="45" width="190" height="110" fill="#EADBC4" stroke="#1C1B19" strokeWidth="1.2" />
              <rect x="235" y="45" width="152" height="110" fill="none" stroke="#8A8378" strokeWidth="1.5" strokeDasharray="6 4" />
              <rect x="273" y="45" width="152" height="110" fill="#C9DAF2" stroke="#1E50C8" strokeWidth="2.5" />
              <rect x="425" y="45" width="114" height="110" fill="#FFFFFF" stroke="#1C1B19" strokeWidth="1.2" />
              <rect x="539" y="45" width="57" height="110" fill="#EADBC4" stroke="#1E50C8" strokeWidth="2.5" />
              <rect x="596" y="45" width="57" height="110" fill="#EADBC4" stroke="#1E50C8" strokeWidth="2.5" />
              <rect x="45" y="155" width="110" height="57" fill="#EADBC4" stroke="#1C1B19" strokeWidth="1.2" />
              <rect x="45" y="212" width="110" height="57" fill="#EADBC4" stroke="#1C1B19" strokeWidth="1.2" />
              <rect x="45" y="269" width="110" height="57" fill="#D6BE98" stroke="#1C1B19" strokeWidth="1.2" />
              <rect x="45" y="326" width="110" height="10" fill="#E4F1E6" stroke="#2F7A3E" strokeWidth="1.8" />
              <circle cx="349" cy="26" r="9" fill="#1E50C8" stroke="#FFFFFF" strokeWidth="2" />
              <text x="140" y="104" {...TXT}>Ugaoni 100</text>
              <text x="349" y="104" {...TXT}>Sudopera 80</text>
              <text x="482" y="104" {...TXT}>MSP 60</text>
              <text x="596" y="104" {...TXT}>2 × 30</text>
              <text x="100" y="303" {...TXT}>Visoki</text>
              {pins.map(p => (
                <g key={p.t}><circle cx={p.x} cy={p.y} r="13" fill={p.fill} stroke="#FFFFFF" strokeWidth="2.5" />
                  <text x={p.x} y={p.y + 4} {...TXT} fontSize="12" fontWeight="700" fill="#FFFFFF">{p.t}</text></g>
              ))}
            </svg>
          </div>
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {PROPS.map(p => {
              const d = dec[p.n];
              return (
                <li key={p.n} className="flex items-center gap-3 rounded-[10px] border border-solid border-border bg-white px-3.5 py-3 max-md:flex-wrap">
                  <span aria-hidden="true" className="inline-flex size-[26px] flex-none items-center justify-center rounded-full bg-[#1E50C8] text-[12px] font-bold text-white">{p.n}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px] max-md:basis-[calc(100%-38px)]">
                    <span className="text-[15px] font-semibold">{p.title}</span>
                    <span className="text-[13.5px] text-ink-2">Razlog: {p.why}</span>
                    <span className="text-[13px] text-muted-foreground">{p.price}</span>
                  </div>
                  {cust && !approved
                    ? <span className="flex flex-none gap-1.5 max-md:ml-[38px]">
                        <Button variant={null} size="none" aria-pressed={d === 'acc'} onClick={() => toggle(p.n, 'acc')} className={decBtn(d === 'acc', true)}>Prihvati</Button>
                        <Button variant={null} size="none" aria-pressed={d === 'rej'} onClick={() => toggle(p.n, 'rej')} className={decBtn(d === 'rej', false)}>Odbij</Button>
                      </span>
                    : <span className={cn(PILL, 'max-md:ml-[38px]', d === 'acc' ? 'bg-ok-soft text-ok' : d === 'rej' ? 'bg-[#F6D5D3] text-[#8A1C22]' : 'bg-background text-ink-2')}>
                        {d === 'acc' ? 'Kupac prihvatio' : d === 'rej' ? 'Kupac odbio' : 'Čeka kupca'}</span>}
                </li>
              );
            })}
          </ol>
          {cust && !approved && (
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant={null} size="none" onClick={() => setDec({ 1: 'acc', 2: 'acc', 3: 'acc' })} className="min-h-11 rounded-lg border border-solid border-primary bg-white px-4 text-[14px] font-semibold text-accent-ink">Prihvati sve</Button>
              <Button variant={null} size="none" disabled={!all} onClick={() => setApproved(true)}
                className={cn('min-h-11 rounded-lg px-[18px] text-[14px] font-semibold disabled:opacity-100', all ? 'bg-primary text-white' : 'cursor-not-allowed bg-border text-muted-foreground')}>Odobri raspored</Button>
              <span className="text-[13px] text-muted-foreground">{all ? 'Odbijeni predlozi se vraćaju stolaru sa tvojim komentarom.' : `Odluči o svakom predlogu (${decided} od ${PROPS.length}).`}</span>
            </div>
          )}
        </main>

        <aside aria-label="Poruke" className="flex min-h-0 flex-col border-0 border-l border-solid border-border bg-white max-md:order-3 max-md:border-l-0 max-md:border-t">
          <h2 className="m-0 border-0 border-b border-solid border-[#EEEAE2] px-4 py-3.5 text-[16px]">Poruke</h2>
          <ol className="m-0 flex min-h-0 flex-1 list-none flex-col gap-3 overflow-y-auto px-4 py-3.5">
            {msgs.map((m, i) => {
              const me = m.by === role;
              return (
                <li key={i} className={cn('flex max-w-[86%] flex-col gap-[3px]', me ? 'items-end self-end' : 'self-start')}>
                  <span className="text-[12px] text-muted-foreground">{NAME[m.by]} · {m.when}</span>
                  <span className={cn('rounded-[10px] px-3 py-2 text-[14px] leading-[1.45]', me ? 'bg-accent-soft' : 'bg-background')}>{m.text}</span>
                  {m.pin && <span className="text-[12px] text-accent-ink">{m.pin}</span>}
                </li>
              );
            })}
          </ol>
          <form onSubmit={e => { e.preventDefault(); send(); }} className="flex flex-col gap-2 border-0 border-t border-solid border-[#EEEAE2] px-4 py-3">
            <label htmlFor="msg" className="text-[13px] text-muted-foreground">Poruka za {cust ? NAME.shop : NAME.cust}</label>
            <Textarea id="msg" rows={2} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Napiši poruku ili klikni na element na planu da ostaviš komentar tamo"
              className="min-h-0 resize-none rounded-lg border-line-strong p-2.5 text-[14px] leading-[1.45]" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="none" className="min-h-10 rounded-md border-line-strong bg-white px-3 text-[14px] font-medium text-foreground">Fotografija</Button>
              <Button type="button" variant="outline" size="none" className="min-h-10 rounded-md border-line-strong bg-white px-3 text-[14px] font-medium text-foreground">Predloži termin</Button>
              <Button type="submit" size="none" className="ml-auto min-h-10 rounded-md px-4 text-[14px] font-semibold">Pošalji</Button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
