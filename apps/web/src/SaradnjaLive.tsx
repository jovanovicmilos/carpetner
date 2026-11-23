// Saradnja for one real request (`/saradnja/:id`), design Saradnja (redesign 2026-11-23 22:50): an overview of one job —
// breadcrumb, title, presence, 3D / Otvori kuhinju; Tok posla (steps with dates + "Sledeće: …" with this side's main action);
// Kuhinja (live plan, summary, last edits) + Dokumenti; Ponuda (amount, versions table, actions) + Termini. No messages
// column: the same bottom-right chat dock as in Prostor. Kept live by live.ts (one 3 s poll). Stock shadcn components.
// shortcut: the design's "Merenje" step / date and appointment booking have no data yet — Merenje is left out, "Predloži termin" is disabled.
import type { Project } from 'engine';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowRight, Box, Calendar, Check, CircleCheck, Download, FileText, Image } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { clock, editText, firstName, openChat, pollLive, revert, SIDE_COLOR, useLive, useLiveSession, type Thread } from './live';
import { fitView, Plan } from './Plan';
import { Avatar, PresenceChip } from './Presence';
import { kitchenSummary } from './Pregled';
import { useProjects } from './projects';
import { api, apiFile, ApiError, errorText } from './session';
import { ChatDock, ChatHead, dayOf } from './SessionPanel';
import { SiteHeader } from './Site';
import { useProject } from './store';
import { pull } from './sync';
import { WorkshopHeader } from './WorkshopHeader';

export type Target = 'plan' | '3d' | 'offer' | 'cut';
const ROUTES: Record<'shop' | 'cust', Record<Target, string>> = { shop: { plan: '/projekat', '3d': '/3d', offer: '/ponuda', cut: '/krojna-lista' }, cust: { plan: '/kupac/prostor', '3d': '/kupac/izgled', offer: '/kupac/ponude', cut: '/kupac/prostor' } };
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

/** `demo`: the signed-out preview (`/saradnja`, the reference's data) — no chat dock, actions do nothing. */
export function Screen({ t, kitchen, open, demo = false }: { t: Thread; kitchen?: Project; open: (to: Target) => void; demo?: boolean }) {
  const shop = t.side === 'shop', other = shop ? t.customer : t.workshop, otherFirst = firstName(other);
  const plan = kitchen ?? t.sent; // the shared kitchen as this browser has it (sync.ts keeps it live); before that, as sent
  const { shape, size, floor, uppers, look } = kitchenSummary(plan);
  const offers = t.offers, last = offers.at(-1), accepted = offers.find(o => o.status === 'accepted');
  const edits = t.messages.filter(m => m.kind === 'edit' && m.edit);
  const lastEdit = edits.at(-1);
  const unit = shop ? 'mm' : 'cm';
  const who = (m: { side: string; by: string }) => (m.side === t.side ? 'Ti' : firstName(m.by));
  const setProject = useProject(s => s.setProject), change = useProject(s => s.change);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const act = async (job: () => Promise<unknown>) => { setBusy(true); setErr(''); try { await job(); } catch (e) { setErr(errorText(e instanceof ApiError ? e.code : 'server')); } finally { setBusy(false); } };
  const pdf = (oid: string) => act(async () => window.open(URL.createObjectURL(await apiFile(`/offers/${oid}/pdf`)), '_blank'));
  const accept = () => last && act(() => api('POST', `/offers/${last.id}/accept`).then(pollLive));

  // Tok posla (Merenje has no data yet): done = filled check, current = ring, next = grey number.
  const steps: [string, string | null][] = [['Poslato', date(t.createdAt)], ['Preuzeto', t.takenAt ? date(t.takenAt) : null],
    ['Ponuda', last ? `v${last.version} · ${date(last.createdAt)}` : null], ['Prihvaćeno', accepted?.decidedAt ? date(accepted.decidedAt) : null], ['Montaža', null]];
  const cur = Math.max(0, steps.findIndex(([, when]) => !when));
  // The edit that makes the last offer out of date (the kitchen changed after it was sent).
  const stale = last && last.status !== 'accepted' ? edits.filter(m => m.at > last.createdAt).at(-1) : undefined;
  const staleText = stale ? (() => { const e = editText(stale.edit!, unit); return `${e.unit ? `${e.unit}: ` : ''}${e.what}`; })() : '';
  type Next = { title: string; text: string; action?: [string, () => void]; second?: [string, () => void] };
  const next: Next = shop
    ? t.status !== 'taken' ? { title: 'Sledeće: preuzmi upit', text: 'Kad preuzmeš upit, kuhinju menjate zajedno i praviš ponudu iz nje.', action: ['Upiti', () => { location.href = '/upiti'; }] }
      : !last ? { title: 'Sledeće: napravi ponudu', text: 'Ponuda se pravi iz iste kuhinje koju vidite oboje.', action: ['Napravi ponudu', () => open('offer')] }
      : accepted ? { title: 'Sledeće: dogovor o montaži', text: `${otherFirst} je prihvatio ponudu v${accepted.version}. Termin montaže dogovarate u porukama.`, action: ['Poruke', () => openChat()] }
      : last.status === 'declined' ? { title: 'Sledeće: nova verzija ponude', text: `${otherFirst} je odbio ponudu v${last.version}.`, action: ['Nova verzija ponude', () => open('offer')] }
      : stale ? { title: 'Sledeće: nova verzija ponude', text: `${who(stale)} je posle v${last.version} promenio ${staleText}. Ponuda v${last.version} više ne odgovara kuhinji.`, action: ['Nova verzija ponude', () => open('offer')] }
      : { title: 'Sledeće: čeka se odgovor kupca', text: `Ponuda v${last.version} je poslata ${date(last.createdAt)} i važi do ${date(last.validUntil)}.` }
    : t.status !== 'taken' ? { title: 'Sledeće: stolar preuzima upit', text: `${other} još nije preuzeo upit. Kuhinju možeš i dalje da menjaš.` }
      : !last ? { title: 'Sledeće: stolar pravi ponudu', text: `${other} pravi ponudu iz ove kuhinje; izmene vidite oboje.`, action: ['Poruke', () => openChat()] }
      : accepted ? { title: 'Sledeće: dogovor o montaži', text: `Prihvatio si ponudu v${accepted.version}. Termin montaže dogovarate u porukama.`, action: ['Poruke', () => openChat()] }
      : last.status === 'declined' ? { title: 'Sledeće: stolar šalje novu verziju', text: `Odbio si ponudu v${last.version}. Napiši stolaru šta da promeni.`, action: ['Poruke', () => openChat()] }
      : { title: `Sledeće: odgovori na ponudu v${last.version}`, text: `Ponuda važi do ${date(last.validUntil)}.${stale ? ` Izmena posle v${last.version} (${staleText}) nije u ceni — ${otherFirst} šalje novu verziju.` : ''}`,
        action: ['Prihvati ponudu', accept], second: ['Traži izmene', () => openChat()] };
  const badge = !last ? null : last.status === 'accepted' ? <Badge variant="ok">prihvaćena</Badge> : last.status === 'declined' ? <Badge variant="destructive">odbijena</Badge>
    : <Badge className="bg-wood-birch text-wood-bark">{shop ? 'čeka odgovor kupca' : 'čeka tvoj odgovor'}</Badge>;
  const docs: { name: string; meta: string; icon: typeof FileText; on?: () => void }[] = [
    ...offers.filter(o => o.hasPdf).reverse().map(o => ({ name: `Ponuda v${o.version}.pdf`, meta: date(o.createdAt), icon: FileText, on: () => pdf(o.id) })),
    ...(t.photos ? [{ name: 'Fotografije prostorije', meta: String(t.photos), icon: Image }] : []),
    ...(shop ? [{ name: 'Krojna lista (samo radionica)', meta: 'CSV · XLSX', icon: FileText, on: kitchen ? () => open('cut') : undefined }] : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-background font-sans text-foreground">
      {shop ? <WorkshopHeader current="Upiti" /> : <SiteHeader user={t.customer} />}
      <main className="flex-1 px-7 pt-5 pb-24 max-md:px-4">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList className="m-0 list-none p-0">
              <BreadcrumbItem><BreadcrumbLink asChild><Link to={shop ? '/upiti' : '/moje-kuhinje'}>{shop ? 'Upiti' : 'Moje kuhinje'}</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>{shape} {size}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[320px] flex-1">
              <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">{shop ? `${shape} ${size} — ${other}` : `Moja kuhinja — ${other}`}</h1>
              <p className="mt-1.5 mb-0 text-sm text-muted-foreground">{shop ? 'Upit od' : 'Poslato'} {date(t.createdAt)}{t.takenAt ? ` · preuzet ${date(t.takenAt)}` : ''}</p>
            </div>
            {t.status === 'taken' && !demo && <PresenceChip partner={{ name: other, requestId: t.id }} customer={!shop} />}
            <Button variant="outline" disabled={!kitchen} onClick={() => open('3d')}><Box />3D</Button>
            <Button disabled={!kitchen} onClick={() => open('plan')}>Otvori kuhinju<ArrowRight /></Button>
          </div>

          <Card aria-label="Tok posla" className="gap-4 px-5 py-[18px]">
            <ol className="m-0 flex list-none gap-2 p-0">
              {steps.map(([name, when], i) => {
                const done = i < cur, now = i === cur;
                return (
                  <li key={name} aria-current={now ? 'step' : undefined} className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn('inline-flex size-6 flex-none items-center justify-center rounded-full text-xs font-semibold',
                        done ? 'bg-primary text-primary-foreground' : now ? 'border-2 border-primary bg-white text-accent-ink ring-[3px] ring-primary/20' : 'border border-line-strong bg-white text-muted-foreground')}>
                        {done ? <Check className="size-3.5" /> : i + 1}</span>
                      {i < steps.length - 1 && <span aria-hidden="true" className={cn('h-0.5 flex-1 rounded-full', done ? 'bg-primary' : 'bg-border')} />}
                    </div>
                    <strong className={cn('text-sm', now ? 'font-semibold' : 'font-medium', !done && !now && 'text-muted-2')}>{name}{done && <span className="sr-only"> — urađeno</span>}</strong>
                    <span className="text-[12.5px] text-muted-2">{when ?? '—'}</span>
                  </li>
                );
              })}
            </ol>
            <Alert className="flex items-center gap-3.5 border-[#B9D8BF] border-l-[3px] border-l-primary bg-accent-lightest [&>svg]:translate-y-0 [&>svg]:text-primary">
              <CircleCheck />
              <div className="min-w-0 flex-1">
                <AlertTitle className="text-[14.5px] font-semibold">{next.title}</AlertTitle>
                <AlertDescription className="text-foreground/80">{next.text}</AlertDescription>
              </div>
              {next.second && <Button variant="outline" disabled={busy} onClick={next.second[1]}>{next.second[0]}</Button>}
              {next.action && <Button disabled={busy || (next.action[0] !== 'Poruke' && next.action[0] !== 'Upiti' && !kitchen && shop)} onClick={next.action[1]}>{next.action[0]}</Button>}
            </Alert>
            {err && <p role="alert" className="m-0 text-sm text-destructive">{err}</p>}
          </Card>

          <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] items-start gap-4 max-lg:grid-cols-1">
            <div className="flex flex-col gap-4">
              <Card aria-labelledby="k-h" className="gap-0 overflow-hidden py-0">
                <CardHeader className="px-5 pt-4">
                  <CardTitle id="k-h" className="text-base">Kuhinja</CardTitle>
                  <CardDescription>{t.status === 'taken' ? 'Jedna kuhinja — menjate je oboje u Prostoru, izmene se vide odmah.' : 'Kako je poslata stolaru.'}</CardDescription>
                  {t.status === 'taken' && <CardAction><Badge variant="ok"><span aria-hidden="true" className="size-[7px] rounded-full bg-[#3FB06A]" />uživo</Badge></CardAction>}
                </CardHeader>
                <div className="mt-3.5 grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] border-0 border-t border-solid border-[#EEEAE2] max-md:grid-cols-1">
                  <div className="relative h-[340px] border-0 border-r border-solid border-[#EEEAE2] bg-[#FAF8F4] p-2.5">
                    <Plan project={plan} view={fitView(plan)} unit={unit} role="img" aria-label={`Kuhinja uživo: ${shape} ${size}`} className="h-full w-full"
                      remote={lastEdit?.edit?.after && Date.now() - Date.parse(lastEdit.at) < 10 * 60_000 ? { ids: [lastEdit.edit.id], color: SIDE_COLOR[lastEdit.side], was: [] } : null} />
                    <span className="absolute bottom-3 left-3 flex gap-3 rounded-md border border-[#EEEAE2] bg-white/90 px-2 py-1 text-xs text-ink-2">
                      {([['shop', t.workshop], ['cust', t.customer]] as const).map(([side, name]) => <span key={side} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-[2px]" style={{ background: SIDE_COLOR[side] }} />{firstName(name)}</span>)}
                    </span>
                  </div>
                  <CardContent className="flex flex-col gap-3.5 px-5 pt-4 pb-[18px]">
                    <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Oblik</dt><dd className="m-0">{shape} · {size}</dd>
                      <dt className="text-muted-foreground">Elementi</dt><dd className="m-0">{countOf(floor.length, 'donji i visoki', 'donja i visoka', 'donjih i visokih')} · {countOf(uppers.length, 'gornji', 'gornja', 'gornjih')}</dd>
                      <dt className="text-muted-foreground">Izgled</dt><dd className="m-0 first-letter:uppercase">{look.slice(0, 2).filter(Boolean).join(' · ')}</dd>
                      {look[2] && <><dt className="text-muted-foreground">Radna ploča</dt><dd className="m-0 first-letter:uppercase">{look[2]}</dd></>}
                    </dl>
                    <div role="separator" className="h-px bg-[#EEEAE2]" />
                    <div className="flex flex-col gap-2">
                      <div className="text-[13px] font-medium text-muted-foreground">Poslednje izmene</div>
                      {!edits.length && <p className="m-0 text-[13.5px] text-muted-foreground">Još nema izmena.</p>}
                      {edits.slice(-3).reverse().map(m => { const e = editText(m.edit!, unit); return (
                        <div key={m.id} className="flex items-center gap-2.5 text-[13.5px]"><Avatar name={m.by} side={m.side} />
                          <span className="min-w-0 flex-1 truncate"><strong className="font-semibold">{who(m)}</strong> · {e.unit ? `${e.unit} — ` : ''}{e.what}</span>
                          <span className="flex-none text-xs text-muted-2">{dayOf(m.at) === 'Danas' ? clock(m.at) : dayOf(m.at).toLowerCase()}</span></div>); })}
                      <Button variant="link" className="-ml-2.5 self-start px-2.5 text-accent-ink" onClick={() => openChat()}>Sve izmene i poruke</Button>
                    </div>
                  </CardContent>
                </div>
              </Card>

              <Card aria-labelledby="d-h" className="gap-2 px-5 pt-4 pb-[18px]">
                <h2 id="d-h" className="m-0 text-base font-semibold">Dokumenti</h2>
                {!docs.length && <p className="m-0 text-sm text-muted-foreground">Još nema dokumenata. Ponuda u PDF-u stiže ovde.</p>}
                {docs.map(d => {
                  const body = <><ItemMedia><d.icon className="size-[18px] text-muted-foreground" /></ItemMedia>
                    <ItemContent><ItemTitle className="font-normal">{d.name}</ItemTitle></ItemContent>
                    <ItemActions className="text-[13px] text-muted-2">{d.meta}</ItemActions></>;
                  return d.on ? <Item key={d.name} variant="outline" size="sm" asChild><button type="button" className="w-full cursor-pointer bg-white text-left font-sans" onClick={d.on}>{body}</button></Item>
                    : <Item key={d.name} variant="outline" size="sm" className="bg-white">{body}</Item>;
                })}
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Card aria-labelledby="o-h" className="gap-3.5 px-5 pt-4 pb-[18px]">
                <div className="flex items-center gap-2"><h2 id="o-h" className="m-0 flex-1 text-base font-semibold">Ponuda</h2>{badge}</div>
                {last ? <>
                  <div className="flex items-baseline gap-2.5"><span className="font-mono text-[28px] font-semibold tracking-[-0.02em]">{rsd(last.total)} RSD</span>
                    <span className="text-[13px] text-muted-foreground">v{last.version} · važi do {date(last.validUntil)}</span></div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Verzija</TableHead><TableHead>Šta se promenilo</TableHead><TableHead className="text-right">Iznos</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {[...offers].reverse().map((o, i) => (
                        <TableRow key={o.id} className={cn(i > 0 && 'text-muted-2')}>
                          <TableCell>v{o.version} · {date(o.createdAt)}</TableCell>
                          <TableCell className="max-w-0 truncate">{o.note || '—'}</TableCell>
                          <TableCell className="text-right font-mono">{rsd(o.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </> : <p className="m-0 text-sm text-muted-foreground">{shop ? 'Ponuda još nije poslata kupcu.' : 'Stolar još nije poslao ponudu.'}</p>}
                <div className="flex gap-2">
                  {shop ? !accepted && <Button className="flex-1" disabled={!kitchen} onClick={() => open('offer')}>{last ? 'Nova verzija ponude' : 'Napravi ponudu'}</Button>
                    : last?.status === 'sent' && <><Button className="flex-1" disabled={busy} onClick={accept}>Prihvati ponudu</Button><Button variant="outline" onClick={() => openChat()}>Traži izmene</Button></>}
                  {last?.hasPdf && <Button variant="outline" disabled={busy} onClick={() => pdf(last.id)}><Download />PDF</Button>}
                </div>
              </Card>

              <Card aria-labelledby="t-h" className="gap-2.5 px-5 pt-4 pb-[18px]">
                <h2 id="t-h" className="m-0 text-base font-semibold">Termini</h2>
                <Item variant="outline" className="border-dashed bg-white">
                  <ItemMedia className="size-9 rounded-lg bg-muted text-muted-foreground"><Calendar className="size-[18px]" /></ItemMedia>
                  <ItemContent><ItemTitle>Montaža</ItemTitle><span className="text-[13.5px] text-muted-foreground">{accepted ? 'dogovarate termin u porukama' : 'posle prihvaćene ponude'}</span></ItemContent>
                  <ItemActions>
                    <Tooltip><TooltipTrigger asChild><span tabIndex={0}><Button variant="outline" size="sm" disabled>Predloži termin</Button></span></TooltipTrigger>
                      <TooltipContent>{accepted ? 'Uskoro — do tada termin dogovarate u porukama' : 'Posle prihvaćene ponude'}</TooltipContent></Tooltip>
                  </ItemActions>
                </Item>
              </Card>
            </div>
          </div>
        </div>
      </main>
      {t.status === 'taken' && !demo && <>
        <ChatDock partner={{ name: other, requestId: t.id }} customer={!shop} unit={unit} onShow={() => open('plan')}
          onUndo={e => { if (!kitchen) return; setProject(kitchen); change(p => revert(p, e)); }} />
        <ChatHead partner={{ name: other, requestId: t.id }} unit={unit} onShow={() => open('plan')}
          onUndo={e => { if (!kitchen) return; setProject(kitchen); change(p => revert(p, e)); }} />
      </>}
    </div>
  );
}
