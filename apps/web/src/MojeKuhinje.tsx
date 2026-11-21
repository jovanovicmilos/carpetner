// Customer home "Moje kuhinje" (design/screens/MojeKuhinje.html): the customer's kitchens with step and progress, a workshop's
// request to show a kitchen in its portfolio (allow / deny), "+ Nova kuhinja". Site header in the signed-in state.
// shortcut: kitchens and the portfolio request are the design's placeholders and the answer is local state; real kitchens per
// customer account (and "⋯": copy, rename, privacy, withdraw consent) come with apps/api.
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PAGE, SiteFrame } from './Site';

const MINE = [
  { t: 'Ugaona 320 × 240', m: 'Plus do 18. 2. · poslato 2 stolara', vis: 'Privatno', stage: 'Korak 5 · Ponude i saradnja', pct: 90, news: '2 nove poruke · ponuda v2', cta: 'Otvori ponude', to: '/kupac/ponude', c: ['#FFFFFF', '#C49A6C', '#FFFFFF'] },
  { t: 'Varijanta B — tamna', m: 'kopija prve, izmenjen izgled', vis: 'Javno', stage: 'Korak 3 · Izgled', pct: 55, news: '', cta: 'Nastavi: izgled', to: '/kupac/izgled', c: ['#2A3A31', '#C49A6C', '#2A3A31'] },
  { t: 'Kuhinja za vikendicu', m: 'započeto 2. 11.', vis: 'Javno', stage: 'Korak 1 · Prostor', pct: 15, news: '', cta: 'Nastavi: prostor', to: '/kupac', c: ['#F3F1EC', '#DDD8CE', '#F3F1EC'] },
];
const BTN = 'min-h-11 rounded-lg text-[14px] font-semibold';

export function MojeKuhinje() {
  const [consent, setConsent] = useState<'yes' | 'no' | null>(null);
  return (
    <SiteFrame current="Moje kuhinje" user="Ana P." minH={920}>
      <main className={cn(PAGE, 'flex flex-col gap-5 pt-8 pb-14 max-md:pt-5')}>
        <div className="flex flex-wrap items-end gap-3">
          <div><h1 className="m-0 text-[36px] max-md:text-[30px]">Moje kuhinje</h1><p className="mt-1.5 mb-0 text-[16px] text-ink-2">Zdravo, Ana. Nastavi gde si stala ili napravi novu.</p></div>
          <Link to="/kupac" className="ml-auto inline-flex min-h-12 items-center rounded-lg bg-primary px-5 text-[15px] font-semibold text-white no-underline hover:text-white">+ Nova kuhinja</Link>
        </div>

        {consent === null
          ? <section aria-labelledby="cs-h" className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 rounded-[14px] border-2 border-solid border-wood-oak bg-white px-[18px] py-4 max-md:grid-cols-[48px_minmax(0,1fr)]">
              <span aria-hidden="true" className="inline-flex size-16 items-center justify-center rounded-xl bg-wood-walnut text-[20px] font-bold text-white max-md:size-12">RA</span>
              <div className="flex flex-col gap-1">
                <h2 id="cs-h" className="m-0 text-[17px]">[Radionica A] bi da objavi tvoju kuhinju u svom portfoliju</h2>
                <span className="text-[14px] leading-[1.45] text-ink-2">Objavljuju se samo osnova, 3D i materijali — bez tvog imena, adrese i fotografija. Možeš da povučeš saglasnost bilo kad.</span>
              </div>
              <div className="flex gap-2 max-md:col-span-full">
                <Button variant="outline" size="none" onClick={() => setConsent('no')} className={cn(BTN, 'border-line-strong bg-white px-3.5 text-foreground max-md:flex-1')}>Ne, hvala</Button>
                <Button size="none" onClick={() => setConsent('yes')} className={cn(BTN, 'px-4 max-md:flex-1')}>Dozvoli objavu</Button>
              </div>
            </section>
          : <div role="status" className="rounded-[10px] bg-ok-soft px-4 py-3 text-[15px] text-ok">
              {consent === 'yes' ? 'Hvala — [Radionica A] može da objavi kuhinju u portfoliju. Saglasnost povlačiš u meniju kuhinje.' : 'U redu — kuhinja neće biti objavljena u portfoliju radionice.'}
            </div>}

        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-[18px] p-0">
          {MINE.map(k => (
            <li key={k.t} className="flex flex-col overflow-hidden rounded-[14px] border border-solid border-[#E4DFD5] bg-white">
              <span aria-hidden="true" className="block h-40 border-0 border-b border-solid border-[#E4DFD5]"
                style={{ background: `linear-gradient(180deg, ${k.c[0]} 0 40%, ${k.c[1]} 40% 46%, ${k.c[2]} 46% 100%)` }} />
              <div className="flex flex-1 flex-col gap-2.5 px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="m-0 text-[18px]">{k.t}</h2>
                  <span className={cn('ml-auto rounded-[10px] px-2 py-0.5 text-[12px] font-semibold', k.vis === 'Javno' ? 'bg-accent-soft text-accent-ink' : 'bg-wood-birch text-wood-bark')}>{k.vis}</span>
                </div>
                <span className="text-[14px] text-muted-foreground">{k.m}</span>
                <div className="flex flex-col gap-[5px]">
                  <div className="flex justify-between gap-2.5 text-[13.5px]"><span className="text-ink-2">{k.stage}</span><span className="text-muted-foreground">{k.pct} %</span></div>
                  <div role="progressbar" aria-label={`${k.t}: ${k.stage}`} aria-valuenow={k.pct} aria-valuemin={0} aria-valuemax={100} className="h-1.5 rounded-[3px] bg-[#EEEAE2]">
                    <div className="h-full rounded-[3px] bg-primary" style={{ width: `${k.pct}%` }} />
                  </div>
                </div>
                {k.news && <span className="self-start rounded-[10px] bg-accent-soft px-[9px] py-[3px] text-[13px] font-semibold text-accent-ink">{k.news}</span>}
                <div className="mt-auto flex gap-2">
                  <Link to={k.to} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary text-[14.5px] font-semibold text-white no-underline hover:text-white">{k.cta}</Link>
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
