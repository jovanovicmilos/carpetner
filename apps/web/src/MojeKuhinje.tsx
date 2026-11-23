// Customer home "Moje kuhinje" (design/screens/MojeKuhinje.html, 2026-11-23): the customer's kitchens, each with its state
// (live with a workshop, sent and waiting, not sent), news (messages, offers), "Otvori kuhinju" → Prostor and "Saradnja";
// a workshop's request to show a kitchen in its portfolio (allow / deny), "+ Nova kuhinja".
// Signed in: the customer's own kitchens (projects.ts list, synced with /me/projects by sync.ts) and their requests.
// shortcut: signed out the page shows the design's three placeholder kitchens and the portfolio request (a demo of the page);
// the request, visibility badge ("Javno" until visibility is stored) and "⋯" (copy, rename, privacy, consent) are not wired.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Project } from 'engine';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { materialColor } from './look';
import { kitchenSummary } from './Pregled';
import { useMyRequests, type MyRequest } from './partner';
import { Avatar } from './Presence';
import { useProjects, type StoredProject } from './projects';
import { useSession } from './session';
import { PAGE, SiteFrame } from './Site';
import { useProject } from './store';

type State = { st: 'live' | 'wait' | 'draft'; text: string; av?: string };
type Card = { key: string; t: string; m: string; vis: string; state: State; news: string; cta: string; to: string; sec?: [string, string]; open?: Project; c: string[] };
const MINE: Card[] = ([
  { t: 'Ugaona 320 × 240', m: 'Plus do 18. 2. · poslato 2 radionice', vis: 'Privatno', state: { st: 'live', text: 'Uživo sa Radionica Hrast', av: 'Petar Stanić' }, news: '2 nove poruke · ponuda v2 stigla', cta: 'Otvori kuhinju', to: '/kupac/prostor', sec: ['Saradnja', '/saradnja'], c: ['#FFFFFF', '#C49A6C', '#FFFFFF'] },
  { t: 'Varijanta B — tamna', m: 'kopija prve, izmenjen izgled', vis: 'Javno', state: { st: 'wait', text: 'Poslato — čeka radionicu (1 dan)' }, news: '', cta: 'Otvori kuhinju', to: '/kupac/prostor', c: ['#2A3A31', '#C49A6C', '#2A3A31'] },
  { t: 'Kuhinja za vikendicu', m: 'započeto 2. 11.', vis: 'Javno', state: { st: 'draft', text: 'Nije poslato · korak Prostor' }, news: '', cta: 'Nastavi', to: '/kupac/prostor', c: ['#F3F1EC', '#DDD8CE', '#F3F1EC'] },
] as Omit<Card, 'key'>[]).map(k => ({ ...k, key: k.t }));
const date = (iso: string) => { const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const BTN = 'min-h-11 rounded-lg text-[14px] font-semibold';
const STEP: [RegExp, string][] = [[/izgled/, 'Izgled'], [/pregled/, 'Pregled'], [/posalji|ponude/, 'Stolar']];
const STATE_CLS = { live: 'bg-accent-lightest text-accent-ink', wait: 'bg-[#F6EEE2] text-wood-bark', draft: 'bg-background text-ink-2' };
const DOT_CLS = { live: 'bg-[#3FB06A] shadow-[0_0_0_3px_rgba(63,176,106,0.25)]', wait: 'bg-wood-oak', draft: 'bg-line-strong' };

/** A kitchen card from the stored project and its requests: live with a workshop, sent and waiting, or not sent yet. */
function cardOf(e: StoredProject, reqs: MyRequest[]): Card {
  const { shape, size } = kitchenSummary(e.project);
  const front = materialColor(e.project.materials[e.project.elements[0]?.materials.front ?? '']);
  const rs = e.serverId ? reqs.filter(r => r.projectId === e.serverId) : [];
  const taken = rs.find(r => r.status === 'taken'), waiting = rs.filter(r => r.status === 'new');
  const days = waiting.length ? Math.max(1, Math.round((Date.now() - Date.parse(waiting[0].createdAt)) / 86400000)) : 0;
  const state: State = taken ? { st: 'live', text: `Uživo sa ${taken.workshop}`, av: taken.workshop }
    : waiting.length ? { st: 'wait', text: `Poslato — čeka radionicu (${days} ${days === 1 ? 'dan' : 'dana'})` }
    : { st: 'draft', text: `Nije poslato · korak ${STEP.find(([re]) => re.test(e.resume?.path ?? ''))?.[1] ?? 'Prostor'}` };
  const unread = rs.reduce((a, r) => a + (r.unread ?? 0), 0), offers = rs.filter(r => r.offer?.status === 'sent');
  const news = [unread && `${unread} ${unread === 1 ? 'nova poruka' : unread < 5 ? 'nove poruke' : 'novih poruka'}`, ...offers.map(r => `ponuda v${r.offer!.version} stigla`)].filter(Boolean).join(' · ');
  return { key: e.project.id, t: `${shape} ${size}`, vis: 'Javno', state, news, open: e.project, c: [front, '#C49A6C', front],
    m: rs.length ? `poslato ${rs.length} ${rs.length === 1 ? 'radionici' : 'radionice'} · ${date(rs[0].createdAt)}` : `izmenjeno ${date(e.updatedAt)}`,
    cta: rs.length ? 'Otvori kuhinju' : 'Nastavi', to: rs.length ? '/kupac/prostor' : e.resume?.path ?? '/kupac/prostor',
    ...(taken && { sec: ['Saradnja', `/saradnja/${taken.id}`] as [string, string] }) };
}

export function MojeKuhinje() {
  const [consent, setConsent] = useState<'yes' | 'no' | null>(null);
  const user = useSession(s => (s.session?.user.kind === 'customer' ? s.session.user : undefined)); // workshop members have Projekti
  const stored = useProjects(s => s.list);
  const setProject = useProject(s => s.setProject);
  const navigate = useNavigate();
  const reqs = useMyRequests();
  const cards: Card[] = !user ? MINE : Object.values(stored).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(e => cardOf(e, reqs ?? []));
  const first = user?.name.split(/[\s.]/)[0].replace(/^./, c => c.toUpperCase());
  return (
    <SiteFrame current="Moje kuhinje" user={user?.name ?? 'Ana P.'} minH={920}>
      <main className={cn(PAGE, 'flex flex-col gap-5 pt-8 pb-14 max-md:pt-5')}>
        <div className="flex flex-wrap items-end gap-3">
          <div><h1 className="m-0 text-[36px] max-md:text-[30px]">Moje kuhinje</h1><p className="mt-1.5 mb-0 text-[16px] text-ink-2">{user ? `Zdravo${first ? `, ${first}` : ''}. Nastavi rad na kuhinji ili napravi novu.` : 'Zdravo, Ana. Nastavi gde si stala ili napravi novu.'}</p></div>
          <Link to="/kupac" className="ml-auto inline-flex min-h-12 items-center rounded-lg bg-primary px-5 text-[15px] font-semibold text-white no-underline hover:text-white">+ Nova kuhinja</Link>
        </div>

        {user ? null : consent === null
          ? <section aria-labelledby="cs-h" className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 rounded-[14px] border-2 border-solid border-wood-oak bg-white px-[18px] py-4 max-md:grid-cols-[48px_minmax(0,1fr)]">
              <span aria-hidden="true" className="inline-flex size-16 items-center justify-center rounded-xl bg-wood-walnut text-[20px] font-bold text-white max-md:size-12">RH</span>
              <div className="flex flex-col gap-1">
                <h2 id="cs-h" className="m-0 text-[17px]">Radionica Hrast bi da objavi tvoju kuhinju u svom portfoliju</h2>
                <span className="text-[14px] leading-[1.45] text-ink-2">Objavljuju se samo osnova, 3D i materijali — bez tvog imena, adrese i fotografija. Možeš da povučeš saglasnost bilo kad.</span>
              </div>
              <div className="flex gap-2 max-md:col-span-full">
                <Button variant="outline" size="none" onClick={() => setConsent('no')} className={cn(BTN, 'border-line-strong bg-white px-3.5 text-foreground max-md:flex-1')}>Ne, hvala</Button>
                <Button size="none" onClick={() => setConsent('yes')} className={cn(BTN, 'px-4 max-md:flex-1')}>Dozvoli objavu</Button>
              </div>
            </section>
          : <div role="status" className="rounded-[10px] bg-ok-soft px-4 py-3 text-[15px] text-ok">
              {consent === 'yes' ? 'Hvala — Radionica Hrast može da objavi kuhinju u portfoliju. Saglasnost povlačiš u meniju kuhinje.' : 'U redu — kuhinja neće biti objavljena u portfoliju radionice.'}
            </div>}

        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-[18px] p-0">
          {user && !cards.length && <li className="text-[15px] text-ink-2">Još nemaš sačuvanih kuhinja. Napravi prvu — traje par minuta.</li>}
          {cards.map(k => (
            <li key={k.key} className="flex flex-col overflow-hidden rounded-[14px] border border-solid border-[#E4DFD5] bg-white">
              <span aria-hidden="true" className="block h-40 border-0 border-b border-solid border-[#E4DFD5]"
                style={{ background: `linear-gradient(180deg, ${k.c[0]} 0 40%, ${k.c[1]} 40% 46%, ${k.c[2]} 46% 100%)` }} />
              <div className="flex flex-1 flex-col gap-2.5 px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="m-0 text-[18px]">{k.t}</h2>
                  <span className={cn('ml-auto rounded-[10px] px-2 py-0.5 text-[12px] font-semibold', k.vis === 'Javno' ? 'bg-accent-soft text-accent-ink' : 'bg-wood-birch text-wood-bark')}>{k.vis}</span>
                </div>
                <span className="text-[14px] text-muted-foreground">{k.m}</span>
                <div className={cn('flex items-center gap-2 rounded-lg px-2.5 py-2 text-[14px] font-medium', STATE_CLS[k.state.st])}>
                  <span aria-hidden="true" className={cn('size-[9px] flex-none rounded-full', DOT_CLS[k.state.st])} /><span className="flex-1">{k.state.text}</span>
                  {k.state.av && <Avatar name={k.state.av} side="shop" size={24} />}
                </div>
                {k.news && <span className="self-start rounded-[10px] bg-accent-soft px-[9px] py-[3px] text-[13px] font-semibold text-accent-ink">{k.news}</span>}
                <div className="mt-auto flex gap-2">
                  <Link to={k.to} onClick={e => { if (k.open) { e.preventDefault(); setProject(k.open); navigate(k.to); } }}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary text-[14.5px] font-semibold text-white no-underline hover:text-white">{k.cta}</Link>
                  {k.sec && <Link to={k.sec[1]} className="inline-flex min-h-11 items-center rounded-lg border border-solid border-line-strong px-3 text-[14px] font-semibold text-foreground no-underline hover:text-foreground">{k.sec[0]}</Link>}
                  <Button variant="outline" size="none" aria-label={`Još opcija: ${k.t}`} className="min-h-11 w-11 rounded-lg border-line-strong bg-white text-[18px] font-bold text-foreground">⋯</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </SiteFrame>
  );
}
