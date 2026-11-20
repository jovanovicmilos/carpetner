// Paket i dodaci (design/screens/Pretplata.html, top part; the "Zaključana opcija" section there documents the lock pattern,
// which lives in locks.tsx). Plan, trial and add-ons come from the workshop's grants (usePlan; from the server when signed in).
// shortcut: "Aktiviraj", "Izaberi", "Pređi na Start" and "Dodaj" switch locally without payment (payment provider: MVP 8);
// usage shows what this browser knows (no customer requests yet, one user); prices are [CENA] placeholders.
import { DEFAULT_PRODUCTS, addDays, entitlements, limit, type Grant } from 'engine';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BRAND, BrandMark } from './brand';
import { PRICE, today, usePlan, type PlanId } from './locks';
import { useProjects } from './projects';
import { useSession } from './session';

const PLANS: { id: PlanId; name: string; who: string; feats: [boolean, string][] }[] = [
  { id: 'start', name: 'Start', who: 'Za početak i male radionice', feats: [[true, 'Neograničeno sopstvenih projekata'], [true, 'Brzi start, 2D, 3D, katalog, prilagođeni element'], [true, 'Nacrti na ekranu'], [true, 'Jednostavna ponuda (ukupno, Kroj oznaka)'], [true, '3 upita kupaca mesečno · 1 korisnik'], [false, 'Krojna lista, kant, okov, izvoz'], [false, 'Poređenje pilana i porudžbina']] },
  { id: 'pro', name: 'Pro', who: 'Za radionicu koja radi svaki dan', feats: [[true, 'Sve iz Starta'], [true, 'Krojna lista, kant, okov + CSV / XLSX'], [true, 'Nacrti u PDF / DXF / GLB / OBJ'], [true, 'Puna ponuda sa logom i uslovima, „Slika za ponudu“'], [true, 'Neograničeno upita · 3 korisnika'], [true, 'Poređenje pilana, porudžbina pilani'], [true, 'Osnovna statistika']] },
  { id: 'premium', name: 'Premium', who: 'Za tim i sopstveni brend', feats: [[true, 'Sve iz Pro'], [true, 'Neograničeno korisnika + uloge'], [true, 'Istaknuto u imeniku radionica'], [true, 'Link za sajt sa sopstvenim brendom'], [true, 'Puna statistika (upiti → ponude → poslovi)'], [true, 'Pozivanje svojih kupaca u projekat'], [true, 'Prioritetna podrška']] },
];
/** [product id (null = not a product yet), name, description, price, who needs it]. */
const ADDONS: [string | null, string, string, string, 'pro' | 'any' | 'start'][] = [
  ['addon.user', 'Dodatni korisnik', 'po korisniku · Pro i Premium', `${PRICE} / mes.`, 'pro'],
  ['addon.cnc', 'CNC izvoz po delu', 'DXF po delu sa slojevima KONTURA / IZREZ / KANT · nije ni u jednom paketu', `${PRICE} / mes.`, 'any'],
  [null, 'AI asistent — krediti', 'predlog iz fotografije, provera projekta', `${PRICE} / 100`, 'any'],
  ['addon.requests10', '+10 upita mesečno', 'samo za Start (Pro i Premium imaju neograničeno)', `${PRICE} / mes.`, 'start'],
  ['addon.featured', 'Isticanje u imeniku', 'po gradu, mesečno · Premium ga već ima', `${PRICE} / mes.`, 'pro'],
  [null, 'Dodatni prostor', 'fotografije, PDF-ovi, sopstvene teksture · +20 GB', `${PRICE} / mes.`, 'any'],
];

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const dm = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${d}. ${m}.`; };
const active = (g: Grant, t: string) => g.from <= t && (g.to === undefined || t < g.to);

/** The plan in force today: the best active plan grant (Premium > Pro > Start), and the trial grant if that is a trial. */
export function currentPlan(grants: Grant[], t = today()) {
  const plans = grants.filter(g => active(g, t) && DEFAULT_PRODUCTS.find(p => p.id === g.product)?.kind === 'plan');
  const g = (['premium', 'pro', 'start'] as const).map(id => plans.find(x => x.product === id)).find(Boolean);
  const id: PlanId = (g?.product as PlanId) ?? 'start';
  const trial = g?.trial && g.to ? { left: days(t, g.to), total: days(g.from, g.to), last: addDays(g.to, -1), ends: g.to } : null;
  return { id, name: PLANS.find(p => p.id === id)!.name, trial };
}
export const planChip = (c: ReturnType<typeof currentPlan>) => c.trial ? `${c.name} · proba još ${c.trial.left} dana` : c.name;

/** Workshop header with the marketplace menu (design Pretplata / Upiti / Dobavljači). */
export function WorkshopHeader({ current }: { current?: string }) {
  const grants = usePlan(s => s.grants);
  const workshop = useSession(s => s.session && s.workshops[0]);
  const NAV = 'inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[14px] text-background no-underline hover:not-aria-[current=page]:bg-dark-hover hover:text-background aria-[current=page]:bg-background aria-[current=page]:text-foreground';
  return (
    <header className="box-border flex min-h-14 flex-wrap items-center gap-4 bg-dark px-5 py-2.5 text-background">
      <Link to="/projekti" aria-label={`${BRAND.name} — svi projekti`} className="flex items-center gap-2.5 text-inherit no-underline hover:text-inherit">
        <BrandMark />
        <span className="text-[18px] font-bold tracking-[0.02em]">{BRAND.name}</span>
      </Link>
      <nav aria-label="Glavni meni" className="ml-2 flex flex-wrap gap-1">
        {([['Projekti', '/projekti'], ['Upiti', '/upiti'], ['Cenovnik', '/admin/cenovnik'], ['Materijali i katalog', '/admin/biblioteka'], ['Dobavljači', '/dobavljaci'], ['Podešavanja', '/admin/standardi']] as const).map(([t, to]) => (
          <Link key={to} to={to} className={NAV} aria-current={current === to ? 'page' : undefined}>{t}</Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <Link to="/pretplata" className="rounded-xl bg-accent-on-dark px-2.5 py-1 text-[13px] font-semibold text-foreground no-underline hover:text-foreground">{planChip(currentPlan(grants))}</Link>
        <span className="text-[13px] text-[#D8D3C9]">{workshop ? workshop.name : '[Naziv radionice]'}</span>
      </div>
    </header>
  );
}

export function SubscriptionPage() {
  const { grants, setPlan, addAddon, removeAddon } = usePlan();
  const [period, setPeriod] = useState<'m' | 'y'>('m');
  const [extra, setExtra] = useState<Record<string, boolean>>({}); // AI credits / storage: not products yet
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState('');
  const t = today(), cur = currentPlan(grants, t), e = entitlements(grants, t);
  const users = limit(e, 'users'), requests = limit(e, 'requests.per_month');
  // shortcut: storage = size of this browser's project copies; files (photos, PDFs) are counted once Storage exists.
  const gb = JSON.stringify(useProjects(s => s.list)).length / 1e9;

  const usage = [
    { name: 'Upiti kupaca', value: '0', pct: 0, note: requests === null ? `neograničeno${cur.trial ? ' u probi' : ''} · Start: 3 mesečno` : `${requests} mesečno u paketu ${cur.name}` },
    { name: 'Korisnici', value: `1 / ${users ?? '∞'}`, pct: users ? 100 / users : 5, note: 'Pozovi zaposlene u Podešavanjima' },
    { name: 'Prostor', value: `${gb.toFixed(1).replace('.', ',')} / 5 GB`, pct: Math.max(gb / 5 * 100, 0), note: 'fotografije, PDF-ovi, teksture' },
    { name: 'AI krediti', value: '0', pct: 0, note: 'nisu kupljeni' },
  ];

  const heading = cur.trial ? `${cur.name} — proba, još ${cur.trial.left} dana` : cur.name;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <WorkshopHeader current="/pretplata" />
      <main className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-6 px-5 pt-7 pb-12">
        <div>
          <h1 className="m-0 text-[30px]">Paket i dodaci</h1>
          <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Plaćaš samo ono što koristiš. Projekti i podaci se nikad ne brišu i ne zaključavaju — zaključavaju se samo alati.</p>
        </div>

        <section aria-label="Trenutni paket" className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-7 gap-y-[18px] rounded-[14px] bg-dark px-6 py-[22px] text-background">
          <div className="flex flex-col gap-2">
            <div className="text-[12px] font-semibold tracking-[0.08em] text-accent-on-dark uppercase">Trenutni paket</div>
            <h2 className="m-0 text-[26px]">{heading}</h2>
            <div className="text-[14px] leading-normal text-[#D8D3C9]">
              {cur.trial
                ? `Proba traje do ${dm(cur.trial.last)} Bez kartice. Ako ne aktiviraš ${cur.name}, ${dm(cur.trial.ends)} prelaziš na Start: projekti ostaju, a krojna lista, izvoz nacrta i puna ponuda se zaključavaju.`
                : cur.id === 'start'
                  ? 'Projekti, 2D, 3D i nacrti na ekranu rade bez ograničenja. Krojna lista, izvoz nacrta i puna ponuda su u paketu Pro.'
                  : `Sve iz paketa ${cur.name} je otključano.`}
            </div>
            {cur.trial && (
              <div role="progressbar" aria-label="Proba iskorišćena" aria-valuemin={0} aria-valuemax={cur.trial.total} aria-valuenow={cur.trial.total - cur.trial.left} className="h-1.5 max-w-[520px] rounded-[3px] bg-[#34463B]">
                <div className="h-full rounded-[3px] bg-accent-on-dark" style={{ width: `${(cur.trial.total - cur.trial.left) / cur.trial.total * 100}%` }} />
              </div>
            )}
          </div>
          {(cur.trial || cur.id === 'start') && (
            <div className="flex min-w-[220px] flex-col gap-2">
              <Button size="none" className="min-h-12 rounded-lg bg-accent-on-dark text-[16px] font-semibold text-foreground hover:bg-accent-light" onClick={() => setPlan('pro')}>Aktiviraj Pro</Button>
              <span className="text-center text-[12.5px] text-[#D8D3C9]">{cur.trial ? 'plaćanje počinje posle probe' : `${PRICE} mesečno`}</span>
            </div>
          )}
        </section>

        <section aria-labelledby="use-h" className="flex flex-col gap-2.5">
          <h2 id="use-h" className="m-0 text-[20px]">Potrošnja ovog meseca</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
            {usage.map(u => (
              <div key={u.name} className="flex flex-col gap-1.5 rounded-[10px] border border-solid border-border bg-white p-3.5">
                <span className="text-[14px] text-muted-foreground">{u.name}</span>
                <span className="font-mono text-[22px] font-semibold">{u.value}</span>
                <div aria-hidden="true" className="h-1.5 rounded-[3px] bg-[#EEEAE2]"><div className="h-full rounded-[3px] bg-accent-on-dark" style={{ width: `${Math.min(u.pct, 100)}%` }} /></div>
                <span className="text-[12.5px] text-muted-foreground">{u.note}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="plans-h" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="plans-h" className="m-0 text-[20px]">Paketi</h2>
            <span role="radiogroup" aria-label="Period plaćanja" className="ml-auto inline-flex rounded-lg bg-[#E8E4DC] p-[3px]">
              {([['m', 'Mesečno'], ['y', 'Godišnje · 2 meseca gratis']] as const).map(([v, text]) => (
                <button key={v} type="button" role="radio" aria-checked={period === v} onClick={() => setPeriod(v)}
                  className={cn('min-h-9 cursor-pointer rounded-md border-0 px-3.5 font-sans text-[14px] font-medium', period === v ? 'bg-white font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'bg-transparent text-ink-2')}>{text}</button>
              ))}
            </span>
          </div>
          <div className="grid grid-cols-3 items-stretch gap-3.5 max-[900px]:grid-cols-1">
            {PLANS.map(p => {
              const isCur = p.id === cur.id, free = p.id === 'start';
              const cta = isCur ? (cur.trial ? `Aktiviraj ${p.name}` : 'Tvoj paket') : free ? 'Pređi na Start' : `Izaberi ${p.name}`;
              return (
                <article key={p.id} className={cn('flex flex-col gap-2.5 rounded-xl bg-white p-[18px]', isCur ? 'border-2 border-solid border-primary' : 'border border-solid border-border')}>
                  <div className="flex items-center gap-2">
                    <h3 className="m-0 text-[20px]">{p.name}</h3>
                    {isCur && cur.trial && <span className="rounded-[10px] bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent-ink">proba u toku</span>}
                  </div>
                  <div className="text-[14px] text-muted-foreground">{p.who}</div>
                  <div><span className="font-mono text-[24px] font-bold">{free ? '0 RSD' : PRICE}</span> <span className="text-[14px] text-muted-foreground">{free ? 'zauvek' : period === 'm' ? '/ mesečno' : '/ godišnje'}</span></div>
                  <ul className="m-0 flex list-none flex-col gap-[7px] p-0 text-[14px]">
                    {p.feats.map(([y, text]) => (
                      <li key={text} className="flex items-start gap-2">
                        <span aria-hidden="true" className={cn('mt-0.5 box-border size-4 flex-none rounded-full', y ? 'bg-[#2F7A3E]' : 'border-[1.5px] border-solid border-[#BDB6AA]')} />
                        <span className={y ? undefined : 'text-muted-2'}>{y ? text : <><span className="sr-only">Nije uključeno: </span>{text}</>}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant={isCur ? 'default' : 'outline'} size="none" disabled={isCur && !cur.trial}
                    className={cn('mt-auto min-h-[46px] rounded-lg text-[15px] font-semibold', !isCur && 'border-line-strong bg-white text-foreground')}
                    onClick={() => setPlan(p.id)}>{cta}</Button>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="add-h" className="flex flex-col gap-3">
          <h2 id="add-h" className="m-0 text-[20px]">Dodaci</h2>
          <p className="m-0 text-[14px] text-muted-foreground">Kupuju se uz bilo koji paket i otkazuju bilo kad.</p>
          <div className="overflow-hidden rounded-xl border border-solid border-border bg-white">
            {ADDONS.map(([id, name, sub, price, who]) => {
              const on = id ? grants.some(g => g.product === id && active(g, t)) : !!extra[name];
              const dis = (who === 'start' && cur.id !== 'start') || (who === 'pro' && cur.id === 'start');
              return (
                <div key={name} className="grid grid-cols-[minmax(0,1fr)_150px_120px] items-center gap-4 border-0 border-t border-solid border-[#EEEAE2] px-4 py-3.5 first:border-t-0">
                  <div className="flex flex-col gap-0.5"><span className="text-[15px] font-semibold">{name}</span><span className="text-[13px] text-muted-foreground">{sub}</span></div>
                  <span className="text-right font-mono text-[15px] font-medium">{price}</span>
                  <Button variant="outline" size="none" aria-pressed={on} disabled={dis}
                    className={cn('min-h-10 rounded-md text-[14px] font-semibold', dis ? 'border-border bg-background text-muted-2 disabled:opacity-100' : on ? 'border-primary bg-accent-soft text-accent-ink' : 'border-primary bg-white text-accent-ink')}
                    onClick={() => id ? (on ? removeAddon(id) : addAddon(id)) : setExtra({ ...extra, [name]: !on })}>{dis ? 'Ne treba' : on ? 'Dodato' : 'Dodaj'}</Button>
                </div>
              );
            })}
          </div>
          <form className="flex flex-wrap items-end gap-2.5" onSubmit={ev => { ev.preventDefault(); setCodeMsg(code.trim() ? `Kod „${code.trim()}“ nije prepoznat.` : 'Upiši kod.'); }}>
            <label className="flex flex-col gap-1 text-[14px] text-muted-foreground">Promo ili partnerski kod
              <Input className="h-auto min-h-11 w-[220px] border-line-strong px-3 font-mono text-[15px] font-medium text-foreground" placeholder="npr. PILANA3" value={code} onChange={ev => setCode(ev.target.value)} />
            </label>
            <Button type="submit" variant="outline" size="none" className="min-h-11 rounded-md border-line-strong bg-white px-4 text-[14px] font-semibold text-foreground">Primeni</Button>
            {codeMsg && <span role="status" className="self-center text-[13px] text-ink-2">{codeMsg}</span>}
            <span className="ml-auto text-[13px] text-muted-foreground">Cene u RSD, sa PDV-om · računi stižu na e-poštu · [PROVAJDER PLAĆANJA]</span>
          </form>
        </section>
      </main>
    </div>
  );
}
