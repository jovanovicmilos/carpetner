// Public site (design/screens/Sajt.html). The demo card is computed from the shared example project, like every screen.
// shortcut: plan prices are placeholders ([CENA]) until billing is chosen (CLAUDE.md: Paddle / Lemon Squeezy).
import { edgeTotals, fromDataModel, generateParts, quote, sheetEstimate, type DataModelProject } from 'engine';
import { useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SegmentedControl } from './ui';
import fixture from '../../../fixtures/kuhinja-petrovic.json';

const demo = fromDataModel(fixture.project as unknown as DataModelProject);
const parts = generateParts(demo);
const DEMO = {
  name: demo.name.replace(' (L)', ''),
  size: `${demo.room.walls.find(w => w.id === 'A')?.length} × ${demo.room.walls.find(w => w.id === 'B')?.length}`,
  pieces: parts.reduce((s, p) => s + p.qty, 0),
  sheets: sheetEstimate(parts, demo.materials, demo.rules).reduce((s, x) => s + x.sheets, 0),
  edge: edgeTotals(parts, demo.rules).reduce((s, e) => s + e.orderMeters, 0),
  total: Math.round(quote(demo).total / 100).toLocaleString('sr-Latn'),
};
const PLANS: { name: string; sub: string; items: string[]; cta: string; dark?: boolean }[] = [
  { name: 'Start', sub: 'Stolar koji radi sam', items: ['1 korisnik', '[BROJ] projekata mesečno', '2D, 3D, krojna lista, kantovanje', 'PDF i Excel izvoz'], cta: 'Izaberi Start' },
  { name: 'Radionica', sub: 'Mala i srednja radionica', items: ['Do 3 korisnika', 'Neograničeno projekata', 'Cenovnik i automatske ponude', 'Slanje pilani i okovaru', 'Optimizacija krojenja i nalepnice'], cta: 'Izaberi Radionicu', dark: true },
  { name: 'Pogon', sub: 'Veće firme i proizvodnja', items: ['Neograničeno korisnika i uloge', 'Izvoz za CNC i mašine za kantovanje', 'Magacin ostataka ploča', 'Više lokacija, API'], cta: 'Kontaktiraj nas' },
];
const FEATURES: [string, string][] = [
  ['Prostor i instalacije', 'Zidovi, ugao, prozori, voda, odvod i struja — sa merama od ugla i od poda.'],
  ['Parametarski elementi', 'Promeniš širinu — menjaju se pod, vezni komadi, poleđina, fronte i okov. Tvoja pravila konstrukcije.'],
  ['Krojna lista i kantovanje', 'Po elementu i za ceo projekat, u mm ili cm, sa oznakama kanta i optimizacijom ploča.'],
  ['Cena i ponuda odmah', 'Tvoj cenovnik × krojna lista = ponuda u PDF-u sa 3D slikom, za par minuta.'],
];

const WRAP = 'mx-auto max-w-[1200px]';
const BTN = 'inline-flex min-h-11 items-center rounded-md px-4 text-[15px] no-underline';
const BIG = 'inline-flex min-h-[52px] items-center rounded-md px-[22px] text-[17px] no-underline';
const LINE = 'border border-solid border-foreground text-foreground';
const ACCENT = 'bg-primary font-semibold text-white';
const TILE = 'rounded-lg bg-dark-2 p-3';

export function SitePage() {
  const [yearly, setYearly] = useState(false);
  return (
    // The design's site is content-box throughout.
    <div className="flex flex-col bg-background font-sans text-foreground [&_*]:box-content">
      <header className="border-0 border-b border-solid border-border bg-background">
        <div className={cn(WRAP, 'flex flex-wrap items-center gap-5 px-6 py-3.5')}>
          <div className="flex items-center gap-2.5">
            <svg width="30" height="30" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#1C1B19" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#2E6B4E" strokeWidth="2" /></svg>
            <span className="text-[20px] font-bold">Kroj</span>
          </div>
          <nav aria-label="Glavni meni" className="ml-auto flex flex-wrap gap-5 text-[15px] [&_a]:text-foreground [&_a]:no-underline"><a href="#funkcije">Funkcije</a><a href="#paketi">Paketi</a><a href="#radionice">Za radionice</a></nav>
          <div className="flex gap-2"><Link to="/prijava" className={cn(BTN, LINE)}>Prijava</Link><Link to="/prijava" className={cn(BTN, ACCENT)}>Probaj besplatno</Link></div>
        </div>
      </header>
      <section className="mx-auto box-border! flex w-full max-w-[1200px] flex-wrap items-center gap-12 px-6 pt-[72px] pb-14">
        <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-[22px]">
          <div className="font-mono text-[13px] font-semibold tracking-[0.08em] text-primary">SOFTVER ZA STOLARE · U BROWSERU</div>
          <h1 className="m-0 text-[54px] leading-[1.05] tracking-[-0.01em]">Od mere prostora do krojne liste — bez prepisivanja.</h1>
          <p className="m-0 max-w-[560px] text-[19px] leading-[1.55] text-ink-2">Nacrtaj prostor i instalacije, složi elemente, pogledaj u 3D. Kroj sam izbacuje krojnu listu, kantovanje, okov i cenu kuhinje — i šalje je pilani.</p>
          <div className="flex flex-wrap gap-2.5"><Link to="/prijava" className={cn(BIG, ACCENT)}>Napravi nalog</Link><Link to="/projekat" className={cn(BIG, LINE)}>Pogledaj demo projekat</Link></div>
        </div>
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-3.5 rounded-[14px] bg-dark p-[22px] text-background">
          <div className="flex justify-between text-[13px] text-[#C9C3B8]"><span>{DEMO.name}</span><span className="font-mono">{DEMO.size}</span></div>
          <div className="grid grid-cols-3 gap-2.5">
            {([['Delova', DEMO.pieces], ['Ploča', DEMO.sheets], ['Kant', `${DEMO.edge} m`]] as const).map(([k, v]) => (
              <div key={k} className={TILE}><div className="text-[12px] text-[#C9C3B8]">{k}</div><div className="font-mono text-[24px]">{v}</div></div>
            ))}
          </div>
          <div className="flex items-baseline justify-between rounded-lg bg-dark-2 p-3.5"><span className="text-[14px]">Cena sa PDV-om</span><span className="font-mono text-[28px] text-[#A9D6BA]">{DEMO.total} RSD</span></div>
          <div className="text-[12px] text-[#C9C3B8]">Primer obračuna iz demo projekta</div>
        </div>
      </section>
      <section id="funkcije" className="border-0 border-y border-solid border-border bg-white">
        <div className={cn(WRAP, 'flex flex-col gap-7 px-6 py-14')}>
          <h2 className="m-0 text-[34px]">Napravljeno za stolarsku radionicu, ne za arhitekte</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
            {FEATURES.map(([t, d], i) => <div key={t} className="flex flex-col gap-2"><div className="font-mono font-semibold text-primary">0{i + 1}</div><h3 className="m-0 text-[19px]">{t}</h3><p className="m-0 leading-[1.55] text-ink-2">{d}</p></div>)}
          </div>
        </div>
      </section>
      <section id="paketi" className="mx-auto box-border! flex w-full max-w-[1200px] flex-col gap-7 px-6 py-16">
        <div className="flex flex-wrap items-end gap-4">
          <div><h2 className="m-0 text-[34px]">Paketi</h2><p className="mt-1.5 mb-0 text-[16px] text-ink-2">Mesečna ili godišnja pretplata · 14 dana probe bez kartice</p></div>
          <SegmentedControl label="Period plaćanja" className="ml-auto flex overflow-hidden rounded-md border border-solid border-foreground"
            itemClass="min-h-11 border-0 bg-transparent px-3.5 py-2.5 text-[14px] text-foreground data-[state=on]:bg-dark data-[state=on]:font-semibold data-[state=on]:text-white"
            value={yearly ? 'y' : 'm'} onChange={v => setYearly(v === 'y')} options={[['m', 'Mesečno'], ['y', 'Godišnje · 2 meseca gratis']] as const} />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-stretch gap-[18px]">
          {PLANS.map(p => {
            const sub = cn('mt-1 mb-0 text-[14px]', p.dark ? 'text-[#C9C3B8]' : 'text-muted-foreground');
            const title = <div><h3 className="m-0 text-[22px]">{p.name}</h3><p className={sub}>{p.sub}</p></div>;
            return (
              <div key={p.name} className={cn('flex flex-col gap-4 rounded-2xl p-[26px]', p.dark ? 'bg-dark text-background' : 'border border-solid border-border bg-white')}>
                {p.dark ? <div className="flex items-start justify-between gap-2.5">{title}<Badge tone="accent" className="rounded-sm px-2 py-1 text-[12px] font-semibold">Najčešći izbor</Badge></div> : title}
                <div className="font-mono text-[30px] font-semibold">€ [CENA]<span className={cn('text-[15px] font-normal', p.dark ? 'text-[#C9C3B8]' : 'text-muted-foreground')}> {yearly ? '/ godišnje' : '/ mesečno'}</span></div>
                <ul className="m-0 flex flex-col gap-2 pl-[18px] text-[15px] leading-[1.4]">{p.items.map(i => <li key={i}>{i}</li>)}</ul>
                <Link to="/prijava" className={cn('mt-auto inline-flex min-h-12 items-center justify-center rounded-md font-semibold no-underline', p.dark ? 'bg-accent-on-dark text-foreground' : LINE)}>{p.cta}</Link>
              </div>
            );
          })}
        </div>
      </section>
      <footer id="radionice" className="bg-dark text-[#C9C3B8]">
        <div className={cn(WRAP, 'flex flex-wrap gap-5 px-6 py-8 text-[14px]')}><span className="font-semibold text-background">Kroj</span><span>[KONTAKT E-POŠTA]</span><span>[ADRESA FIRME]</span><span className="ml-auto">Uslovi korišćenja · Privatnost</span></div>
      </footer>
    </div>
  );
}
