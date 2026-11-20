// Public site (docs/SITE_AND_FLOW.md): shared header / footer of design/screens/Pocetna, Inspiracija, Kuhinja, ZaStolare,
// and the home page. Gallery pictures are the references' colour blocks per style.
// shortcut: gallery kitchens are the design's placeholder list until public kitchens are stored in apps/api; then the cards
// become the app's own 3D picture of each project.
import { useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { cn } from '@/lib/utils';
import { BRAND } from './brand';

export const PAGE = 'mx-auto box-content max-w-[1240px] px-6';
const NAV = 'rounded-md px-2.5 py-2 text-[15px] font-medium text-foreground no-underline hover:bg-line-soft hover:text-foreground';
const LINKS: [string, string][] = [['Inspiracija', '/inspiracija'], ['Kako radi', '/#kako'], ['Za stolare', '/za-stolare'], ['Cene', '/za-stolare#cene'], ['Radionice', '/radionice']];

export function SiteHeader({ current, cta = ['Napravi svoju kuhinju', '/kupac'] }: { current?: string; cta?: [string, string] }) {
  return (
    <header className="sticky top-0 z-[5] border-0 border-b border-solid border-[#E4DFD5] bg-[rgba(250,248,244,0.95)]">
      <div className={cn(PAGE, 'flex flex-wrap items-center gap-x-5 gap-y-2 py-3')}>
        <Link to="/" aria-label={`${BRAND.name} — početna`} className="flex items-center gap-2.5 text-foreground no-underline hover:text-foreground">
          <svg width="30" height="30" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="#1F2B24" /><path d="M3 11h22M11 11v14" stroke="#8CC5A2" strokeWidth="2" /></svg>
          <span className="text-[20px] font-bold">{BRAND.name}</span>
        </Link>
        <nav aria-label="Sajt" className="flex flex-wrap gap-0.5">
          {LINKS.map(([t, to]) => (
            <Link key={t} to={to} aria-current={current === t ? 'page' : undefined}
              className={cn(NAV, current === t && 'bg-accent-soft text-accent-ink hover:bg-accent-soft hover:text-accent-ink')}>{t}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <Link to="/prijava" className={NAV}>Prijava</Link>
          <Link to={cta[1]} className="inline-flex min-h-[42px] items-center rounded-lg bg-primary px-4 text-[15px] font-semibold text-white no-underline hover:text-white">{cta[0]}</Link>
        </div>
      </div>
    </header>
  );
}

const FOOT: [string, [string, string][]][] = [
  ['Za kuću', [['Napravi kuhinju', '/kupac'], ['Inspiracija', '/inspiracija'], ['Radionice', '/radionice']]],
  ['Za stolare', [['Kako radi', '/za-stolare'], ['Cene', '/za-stolare#cene'], ['Prijava', '/prijava']]],
  [BRAND.name, [['Uslovi', '#'], ['Privatnost', '#'], ['Kontakt', '#']]],
];

export function SiteFooter() {
  return (
    <footer className="border-0 border-t border-solid border-[#E4DFD5] bg-background">
      <div className={cn(PAGE, 'grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 py-8 text-[14px]')}>
        <div className="flex flex-col gap-1.5"><strong>{BRAND.name}</strong><span className="text-muted-foreground">Kuhinje po meri, od crteža do stolara.</span></div>
        {FOOT.map(([h, ls]) => (
          <div key={h} className="flex flex-col gap-1.5"><strong>{h}</strong>{ls.map(([t, to]) => <Link key={t} to={to}>{t}</Link>)}</div>
        ))}
      </div>
    </footer>
  );
}

/** Site page frame: header, content, footer on the site background. */
export const SiteFrame = ({ current, cta, minH, children }: { current?: string; cta?: [string, string]; minH: number; children: ReactNode }) => (
  <div className="bg-[#FAF8F4] font-sans text-foreground" style={{ minHeight: minH }}>
    <SiteHeader current={current} cta={cta} />
    {children}
    <SiteFooter />
  </div>
);

/** Gallery kitchen (design placeholder): name, shape, style, shape and size, colours [upper, worktop, lower, tall], "izradila" credit. */
export type GalleryKitchen = { t: string; shape: string; style: string; m: string; c: [string, string, string, string]; by: string };
export const KITCHENS: GalleryKitchen[] = ([
  ['Svetla ugaona', 'L', 'light', 'Ugaona · 320 × 240 cm · Novi Sad', ['#FFFFFF', '#C49A6C', '#FFFFFF', '#F3F1EC'], ''],
  ['Hrast i bela', 'line', 'wood', 'Prava · 360 cm', ['#EADBC4', '#6B4A33', '#FFFFFF', '#C49A6C'], 'izradila [Radionica A]'],
  ['Tamno zelena sa ostrvom', 'island', 'dark', 'Ostrvo · 410 cm', ['#2A3A31', '#C49A6C', '#2A3A31', '#EADBC4'], ''],
  ['Orah, U oblik', 'U', 'wood', 'U · 280 × 300 × 280 cm', ['#6B4A33', '#EADBC4', '#6B4A33', '#3A2A1F'], 'izradila [Radionica C]'],
  ['Mala kuhinja u stanu', 'line', 'light', 'Prava · 260 cm', ['#F3F1EC', '#C49A6C', '#F3F1EC', '#FFFFFF'], ''],
  ['Bela bez ručki', 'L', 'light', 'Ugaona · 300 × 200 cm', ['#FFFFFF', '#3A2A1F', '#FFFFFF', '#FFFFFF'], ''],
  ['Grafit i hrast', 'L', 'dark', 'Ugaona · 340 × 260 cm', ['#3E5045', '#C49A6C', '#3E5045', '#C49A6C'], 'izradila [Radionica B]'],
  ['Breza, prava sa ostavom', 'line', 'wood', 'Prava · 300 cm', ['#EADBC4', '#FFFFFF', '#EADBC4', '#D6BE98'], ''],
  ['Krem U sa šankom', 'U', 'light', 'U · 260 × 320 × 200 cm', ['#F6EEE2', '#6B4A33', '#F6EEE2', '#FFFFFF'], ''],
  ['Orah ostrvo', 'island', 'wood', 'Ostrvo · 380 cm', ['#6B4A33', '#F3F1EC', '#6B4A33', '#6B4A33'], 'izradila [Radionica A]'],
  ['Zelena ugaona', 'L', 'dark', 'Ugaona · 290 × 210 cm', ['#2E6B4E', '#EADBC4', '#2E6B4E', '#FFFFFF'], ''],
  ['Siva prava', 'line', 'light', 'Prava · 240 cm', ['#DDD8CE', '#C49A6C', '#DDD8CE', '#F3F1EC'], ''],
] as const).map(([t, shape, style, m, c, by]) => ({ t, shape, style, m, c: [...c] as GalleryKitchen['c'], by }));

/** Colour-block kitchen picture of the gallery cards. */
export const KitchenPicture = ({ c }: { c: GalleryKitchen['c'] }) => (
  <span aria-hidden="true" className="relative block size-full bg-[linear-gradient(180deg,#F3EEE6_0_52%,#E6DED1_52%_100%)] transition-transform duration-200 group-hover:scale-[1.02]">
    <span className="absolute top-[12%] right-[28%] left-[8%] h-[24%] border border-solid border-black/12" style={{ background: c[0] }} />
    <span className="absolute top-[52%] right-[28%] left-[8%] h-[4%]" style={{ background: c[1] }} />
    <span className="absolute top-[56%] right-[28%] left-[8%] h-[30%] border border-solid border-black/12" style={{ background: c[2] }} />
    <span className="absolute top-[8%] right-[8%] bottom-[14%] w-[16%] border border-solid border-black/12" style={{ background: c[3] }} />
  </span>
);

const HOW = [
  ['1', 'Unesi prostor', 'Odgovori na 5 pitanja ili nacrtaj zidove. Kroj sam predloži raspored po pravilima struke.'],
  ['2', 'Složi i obuci kuhinju', 'Menjaj elemente, širine, fronte i radnu ploču. Sve vidiš odmah u 3D.'],
  ['3', 'Pošalji stolarima', 'Izaberi do 3 radionice. Dobijaju projekat otvoren i šalju ponude za tačno tvoju kuhinju.'],
];
const BIZ = [
  ['Krojna lista i kant', 'Delovi, kant i okov iz crteža — bez prepisivanja.'],
  ['Nacrti i izvoz', 'Spreda, odozgo, radne ploče; PDF i DXF.'],
  ['Ponuda za minut', 'Iz tvog cenovnika i cena pilane.'],
  ['Upiti kupaca', 'Kupci šalju gotov projekat; ti preuzimaš i radite zajedno.'],
];
const BTN = 'inline-flex min-h-[54px] items-center rounded-[10px] text-[17px] font-semibold no-underline';

export function HomePage() {
  return (
    <SiteFrame minH={2300}>
      <section aria-labelledby="hero-h" className={cn(PAGE, 'grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] items-center gap-10 pt-14 pb-10')}>
        <div className="flex flex-col gap-5">
          <h1 id="hero-h" className="m-0 text-[52px] leading-[1.08] tracking-[-0.01em]">Nacrtaj svoju kuhinju. Stolar je napravi.</h1>
          <p className="m-0 max-w-[560px] text-[19px] leading-normal text-ink-2">Za 10 minuta složiš kuhinju po svojim merama i vidiš je u 3D. Kad ti se dopadne, pošalješ je stolarima iz svog grada — dobiješ prave ponude za tačno taj projekat.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/kupac" className={cn(BTN, 'bg-primary px-[26px] text-white hover:text-white')}>Napravi svoju kuhinju</Link>
            <Link to="/inspiracija" className={cn(BTN, 'border border-solid border-line-strong bg-white px-[22px] text-foreground hover:text-foreground')}>Pogledaj kuhinje</Link>
          </div>
          <p className="m-0 text-[14px] text-muted-foreground">Besplatno, bez naloga dok ne sačuvaš.</p>
        </div>
        <div aria-hidden="true" className="relative h-[440px]">
          <div className="absolute inset-[0_0_40px_40px] overflow-hidden rounded-2xl border border-solid border-border bg-[linear-gradient(180deg,#F3EEE6_0_50%,#E6DED1_50%_100%)]">
            <div className="absolute top-[12%] right-[30%] left-[8%] h-[24%] border border-solid border-[#C9B796] bg-wood-birch" />
            <div className="absolute top-1/2 right-[30%] left-[8%] h-[3%] bg-wood-walnut" />
            <div className="absolute top-[53%] right-[30%] left-[8%] h-[32%] border border-solid border-[#C9B796] bg-wood-birch" />
            <div className="absolute top-[8%] right-[10%] bottom-[15%] w-[16%] border border-solid border-[#9C7650] bg-wood-oak" />
          </div>
          <div className="absolute bottom-0 left-0 flex w-[280px] flex-col gap-2 rounded-xl border border-solid border-border bg-white p-3.5 shadow-[0_10px_30px_rgba(28,27,25,0.12)]">
            <span className="text-[12px] font-semibold tracking-[0.06em] text-primary uppercase">Planer</span>
            <svg viewBox="0 0 250 120" className="h-auto w-full"><path d="M10 112V10H240" fill="none" stroke="#1C1B19" strokeWidth="5" /><path d="M12 12h70v30H12zM82 12h50v30H82zM132 12h40v30h-40zM172 12h40v30h-40zM12 42h30v40H12zM12 82h30v28H12z" fill="#EADBC4" stroke="#1C1B19" strokeWidth="1" /></svg>
            <span className="text-[13px] text-ink-2">Ugaona 320 × 240 · 7 elemenata</span>
          </div>
        </div>
      </section>

      <section id="kako" aria-labelledby="how-h" className={cn(PAGE, 'pt-8 pb-12')}>
        <h2 id="how-h" className="mt-0 mb-5 text-[32px]">Kako radi</h2>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px] p-0">
          {HOW.map(([n, t, d]) => (
            <li key={n} className="flex flex-col gap-2.5 rounded-[14px] border border-solid border-[#E4DFD5] bg-white p-[22px]">
              <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-full bg-accent-soft font-mono text-[17px] font-bold text-accent-ink">{n}</span>
              <h3 className="m-0 text-[20px]">{t}</h3>
              <p className="m-0 text-[15.5px] leading-normal text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="gal-h" className={cn(PAGE, 'pt-4 pb-14')}>
        <div className="mb-[18px] flex flex-wrap items-baseline gap-3">
          <h2 id="gal-h" className="m-0 text-[32px]">Kuhinje koje su ljudi napravili</h2>
          <Link to="/inspiracija" className="ml-auto text-[16px] font-semibold">Sve kuhinje →</Link>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-[18px] p-0">
          {KITCHENS.slice(0, 6).map((k, i) => (
            <li key={k.t}><Link to={`/kuhinja/${i + 1}`} className="group flex flex-col gap-2.5 text-foreground no-underline hover:text-foreground">
              <span className="block h-[200px] overflow-hidden rounded-xl border border-solid border-[#E4DFD5]"><KitchenPicture c={k.c} /></span>
              <span className="flex flex-col gap-0.5"><span className="text-[17px] font-semibold">{k.t}</span><span className="text-[14px] text-muted-foreground">{k.m}</span></span>
              {k.by && <span className="self-start rounded-[10px] bg-[#F6EEE2] px-2 py-0.5 text-[12.5px] text-wood-bark">{k.by}</span>}
            </Link></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="biz-h" className="bg-dark text-background">
        <div className={cn(PAGE, 'grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] items-center gap-8 py-14')}>
          <div className="flex flex-col gap-4">
            <span className="text-[13px] font-semibold tracking-[0.08em] text-accent-on-dark uppercase">Za stolare</span>
            <h2 id="biz-h" className="m-0 text-[36px] leading-[1.15]">Od crteža do krojne liste u istom alatu. I kupci koji dolaze sa gotovim projektom.</h2>
            <p className="m-0 text-[17px] leading-normal text-[#D8D3C9]">Krojna lista, kant, okov, nacrti i ponuda iz jednog modela. Upiti kupaca stižu sa otvorenim projektom.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/za-stolare" className="inline-flex min-h-[52px] items-center rounded-[10px] bg-accent-on-dark px-6 text-[17px] font-semibold text-foreground no-underline hover:text-foreground">Probaj 30 dana besplatno</Link>
              <span className="text-[14px] text-[#D8D3C9]">bez kartice</span>
            </div>
          </div>
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
            {BIZ.map(([t, d]) => (
              <li key={t} className="flex flex-col gap-1.5 rounded-xl border border-solid border-dark-line bg-[#26352C] p-4"><strong className="text-[16px] text-white">{t}</strong><span className="text-[14px] leading-[1.45] text-[#D8D3C9]">{d}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-label="Partneri" className={cn(PAGE, 'flex flex-wrap items-center gap-x-10 gap-y-4 py-9')}>
        <span className="text-[15px] text-muted-foreground">Materijali i dekori partnera:</span>
        {[1, 2, 3].map(n => <span key={n} className="text-[18px] font-semibold text-muted-2">[PARTNER {n}]</span>)}
      </section>
    </SiteFrame>
  );
}

const SHAPES = [['all', 'Svi oblici'], ['line', 'Prava'], ['L', 'Ugaona'], ['U', 'U oblik'], ['island', 'Ostrvo']];
const STYLES = [['all', 'Svi stilovi'], ['light', 'Svetle'], ['wood', 'Drvo'], ['dark', 'Tamne']];
const CHIP = (on: boolean) => cn('min-h-10 cursor-pointer rounded-[20px] border border-solid px-3.5 font-sans text-[14px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  on ? 'border-dark bg-dark text-white' : 'border-line-strong bg-white text-foreground');

/** Gallery of public kitchens (design/screens/Inspiracija.html). */
export function GalleryPage() {
  const [shape, setShape] = useState('all');
  const [style, setStyle] = useState('all');
  const [built, setBuilt] = useState(false);
  const list = KITCHENS.map((k, i) => ({ ...k, id: i + 1 })).filter(k => (shape === 'all' || k.shape === shape) && (style === 'all' || k.style === style) && (!built || k.by));
  const chips = (label: string, opts: string[][], val: string, set: (v: string) => void) => (
    <span role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {opts.map(([v, t]) => <button key={v} type="button" role="radio" aria-checked={val === v} onClick={() => set(v)} className={CHIP(val === v)}>{t}</button>)}
    </span>
  );
  return (
    <SiteFrame current="Inspiracija" minH={1480}>
      <main className={cn(PAGE, 'flex flex-col gap-5 pt-9 pb-14')}>
        <div>
          <h1 className="m-0 text-[40px]">Inspiracija</h1>
          <p className="mt-1.5 mb-0 text-[17px] text-ink-2">Prave kuhinje iz planera — napravili su ih ljudi i radionice. Otvori bilo koju u 3D ili napravi sličnu za svoj prostor.</p>
        </div>
        <div role="toolbar" aria-label="Filteri" className="sticky top-[66px] z-[3] flex flex-wrap items-center gap-x-[18px] gap-y-2.5 border-0 border-b border-solid border-[#E4DFD5] bg-[#FAF8F4] py-2">
          {chips('Oblik', SHAPES, shape, setShape)}
          {chips('Stil', STYLES, style, setStyle)}
          <label className="inline-flex min-h-10 items-center gap-2 text-[14px]"><input type="checkbox" checked={built} onChange={() => setBuilt(!built)} className="size-[18px] accent-primary" />Samo izrađene</label>
          <span className="ml-auto text-[14px] text-muted-foreground">{list.length} kuhinja</span>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5 p-0">
          {list.map(k => (
            <li key={k.id} className="flex flex-col gap-2.5">
              <Link to={`/kuhinja/${k.id}`} className="group flex flex-col gap-2.5 text-foreground no-underline hover:text-foreground">
                <span className="block h-[190px] overflow-hidden rounded-xl border border-solid border-[#E4DFD5]"><KitchenPicture c={k.c} /></span>
                <span className="flex flex-col gap-0.5"><span className="text-[16px] font-semibold">{k.t}</span><span className="text-[13.5px] text-muted-foreground">{k.m}</span></span>
              </Link>
              <span className="flex flex-wrap items-center gap-2">
                {k.by && <span className="rounded-[10px] bg-[#F6EEE2] px-2 py-0.5 text-[12.5px] text-wood-bark">{k.by}</span>}
                <Link to="/kupac" className="ml-auto inline-flex min-h-8 items-center text-[14px] font-semibold">Napravi ovakvu</Link>
              </span>
            </li>
          ))}
        </ul>
        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-line-strong bg-white p-10 text-center text-[16px] text-ink-2">Nema kuhinja za ove filtere.{' '}
            <button type="button" onClick={() => { setShape('all'); setStyle('all'); setBuilt(false); }} className="min-h-8 cursor-pointer border-0 bg-transparent font-sans text-[16px] font-semibold text-primary underline">Poništi filtere</button></div>
        )}
        {/* shortcut: "Učitaj još" is drawn only; paging comes with the public kitchens API. */}
        <div className="flex justify-center"><button type="button" className="min-h-12 cursor-pointer rounded-lg border border-solid border-line-strong bg-white px-6 font-sans text-[15px] font-semibold text-foreground">Učitaj još</button></div>
        <p className="m-0 text-center text-[13px] text-muted-foreground">Javne kuhinje ne prikazuju lične podatke. Vidiš nešto neprikladno? Prijavi sa stranice kuhinje.</p>
      </main>
    </SiteFrame>
  );
}

const KITCHEN_DETAIL = {
  sub: 'Prava kuhinja · 360 cm · gornji do plafona',
  chips: ['Prava · 360 cm', '7 donjih · 5 gornjih', 'Ručke: šipka', 'Rerna u visokom'],
  mats: [['Fronte donje', 'bela mat', '#FFFFFF'], ['Fronte gornje', 'hrast natur', '#EADBC4'], ['Radna ploča', 'orah 38 mm · [PARTNER]', '#6B4A33'], ['Visoki element', 'hrast', '#C49A6C']],
  price: '280.000 – 340.000 RSD',
  items: [['Sudopera', '80 cm'], ['Mašina za sudove', '60 cm'], ['Fioke (3)', '60 cm'], ['Donji sa krilima', '50 cm'], ['Fioke (2)', '40 cm'], ['Donji sa krilima', '30 cm'], ['Visoki sa rernom', '60 cm'], ['Gornji (5)', '80 + 60 + 60 + 60 + 40 cm']],
};
const CARD = 'rounded-xl border border-solid border-[#E4DFD5] bg-white p-3.5';
const TEXT_BTN = 'min-h-8 cursor-pointer border-0 bg-transparent p-0 font-sans text-[14px] font-medium underline';

/** Public kitchen page (design/screens/Kuhinja.html): 3D / plan, "Napravi ovakvu", workshop credit, materials, example price. */
// shortcut: every gallery kitchen shows the design's "Hrast i bela" details and colour-block picture until public kitchens
// are stored in apps/api; then this page draws the project itself (Iso / Plan) and its own list, materials and price.
export function KitchenPage() {
  const { id } = useParams();
  const [tab, setTab] = useState<'3d' | 'plan'>('3d');
  const k = KITCHENS[Number(id) - 1];
  if (!k) return <Navigate to="/inspiracija" replace />;
  const d = KITCHEN_DETAIL;
  return (
    <SiteFrame current="Inspiracija" minH={1180}>
      <main className={cn(PAGE, 'flex flex-col gap-5 pt-6 pb-14')}>
        <nav aria-label="Putanja" className="text-[14px] text-muted-foreground"><Link to="/inspiracija">Inspiracija</Link> / {k.t}</nav>
        <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-7">
          <section aria-label="Prikaz kuhinje" className="flex min-w-0 flex-col gap-3">
            <div role="tablist" aria-label="Prikaz" className="inline-flex self-start rounded-lg bg-[#E8E4DC] p-[3px]">
              {([['3d', '3D'], ['plan', 'Osnova']] as const).map(([v, t]) => (
                <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
                  className={cn('min-h-9 cursor-pointer rounded-md border-0 px-4 font-sans text-[14px] font-medium', tab === v ? 'bg-white font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'bg-transparent text-ink-2')}>{t}</button>
              ))}
            </div>
            {tab === '3d' ? (
              <div role="img" aria-label="3D prikaz kuhinje (okreni mišem)" className="relative h-[470px] overflow-hidden rounded-[14px] border border-solid border-[#E4DFD5] bg-[linear-gradient(180deg,#F3EEE6_0_52%,#E6DED1_52%_100%)]">
                <div className="absolute top-[11%] right-[27%] left-[7%] grid h-[25%] grid-cols-5 gap-0.5 border border-solid border-[#C9B796] bg-wood-birch p-0.5">{[0, 1, 2, 3, 4].map(i => <span key={i} className="bg-[#EFE3D0]" />)}</div>
                <div className="absolute top-[52%] right-[27%] left-[7%] h-[3.5%] bg-wood-walnut" />
                <div className="absolute top-[55.5%] right-[27%] left-[7%] grid h-[30%] grid-cols-[2fr_1.6fr_1.2fr_1.2fr_1.2fr] gap-0.5 border border-solid border-[#CFC7B8] bg-white p-0.5">{[0, 1, 2, 3, 4].map(i => <span key={i} className="bg-[#FAF8F4]" />)}</div>
                <div className="absolute top-[7%] right-[9%] bottom-[14%] w-[15%] border border-solid border-[#9C7650] bg-wood-oak" />
                <span className="absolute bottom-2.5 left-3 rounded-md bg-white/92 px-2 py-1 text-[12.5px] text-ink-2">Okreni mišem ili prstom · uvećaj točkićem</span>
              </div>
            ) : (
              <div className="flex h-[470px] items-center justify-center rounded-[14px] border border-solid border-[#E4DFD5] bg-white">
                <svg viewBox="0 0 420 200" role="img" aria-label="Osnova: prava kuhinja 360 cm" className="h-auto w-4/5"><path d="M10 30H410" stroke="#1C1B19" strokeWidth="6" /><path d="M12 33h60v40H12zM72 33h66v40H72zM138 33h50v40h-50zM188 33h50v40h-50zM238 33h50v40h-50zM288 33h60v40h-60zM348 33h60v40h-60z" fill="#EADBC4" stroke="#1C1B19" strokeWidth="1" /><text x="210" y="18" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#5F5A52">360 cm</text></svg>
              </div>
            )}
            <div className="flex flex-wrap gap-2.5">{d.chips.map(c => <span key={c} className="rounded-2xl border border-solid border-[#E4DFD5] bg-white px-3 py-1.5 text-[14px]">{c}</span>)}</div>
          </section>
          <aside className="flex flex-col gap-4">
            <div>
              <h1 className="m-0 text-[34px] leading-[1.15]">{k.t}</h1>
              <p className="mt-1.5 mb-0 text-[16px] text-ink-2">{d.sub}</p>
            </div>
            <Link to="/kupac" className="inline-flex min-h-[54px] items-center justify-center rounded-[10px] bg-primary text-[17px] font-semibold text-white no-underline hover:text-white">Napravi ovakvu</Link>
            <p className="-mt-1.5 mb-0 text-[13.5px] text-muted-foreground">Kopija se otvara u planeru; uneseš mere svog prostora, a Kroj prilagodi raspored.</p>
            <section aria-labelledby="by-h" className={cn(CARD, 'flex items-center gap-3')}>
              <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-[10px] bg-wood-walnut font-bold text-white">RA</span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span id="by-h" className="text-[13px] text-muted-foreground">Izradila</span>
                <strong className="text-[16px]">[Radionica A]</strong>
                <span className="text-[13px] text-muted-foreground">Novi Sad · 12 kuhinja u Kroju</span>
              </span>
              <Link to="/radionice" className="text-[14px] font-semibold">Profil</Link>
            </section>
            <section aria-labelledby="mat-h" className={cn(CARD, 'flex flex-col gap-2')}>
              <h2 id="mat-h" className="m-0 text-[16px]">Materijali</h2>
              {d.mats.map(([n, v, c]) => (
                <div key={n} className="flex items-center gap-2.5 text-[14px]"><span aria-hidden="true" className="size-7 flex-none rounded-md border border-solid border-border" style={{ background: c }} /><span className="flex-1">{n}</span><span className="text-muted-foreground">{v}</span></div>
              ))}
            </section>
            <section aria-labelledby="price-h" className={cn(CARD, 'flex flex-col gap-1')}>
              <h2 id="price-h" className="m-0 text-[16px]">Primer cene za ove mere</h2>
              <div className="font-mono text-[20px] font-bold">{d.price}</div>
              <p className="m-0 text-[13px] text-ink-2">Sa materijalom [PARTNER]. Nije ponuda; zavisi od tvog prostora i stolara.</p>
            </section>
            {/* shortcut: Podeli and reporting are drawn only; they come with public kitchens and moderation on apps/api. */}
            <div className="flex gap-3.5 text-[14px]"><button type="button" className={cn(TEXT_BTN, 'text-primary')}>Podeli</button><button type="button" className={cn(TEXT_BTN, 'text-muted-foreground')}>Prijavi neprikladan sadržaj</button></div>
          </aside>
        </div>
        <section aria-labelledby="el-h" className="rounded-[14px] border border-solid border-[#E4DFD5] bg-white p-5">
          <h2 id="el-h" className="mt-0 mb-3 text-[20px]">Šta je u kuhinji</h2>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-7 gap-y-2 p-0 text-[15px]">
            {d.items.map(([n, w], i) => <li key={i} className="flex border-0 border-b border-solid border-[#F0ECE4] py-1.5"><span>{n}</span><span className="ml-auto text-muted-foreground">{w}</span></li>)}
          </ul>
        </section>
      </main>
    </SiteFrame>
  );
}

const FEATS = [
  ['Krojna lista bez prepisivanja', 'Delovi, kant i okov iz crteža, grupisano po materijalu; CSV / XLSX za pilanu.'],
  ['Raspored krojenja', 'Delovi raspoređeni po pločama, sa rezom testere i smerom šare.'],
  ['Nacrti i izvoz', 'Spreda, odozgo, radne ploče; PDF, DXF, GLB, OBJ.'],
  ['Ponuda iz tvog cenovnika', 'Cene materijala od tvojih dobavljača i partnera, rad, montaža, PDF ponuda.'],
  ['Upiti sa gotovim projektom', 'Kupac plati slanje; ti dobiješ otvoren projekat, bez prvog sastanka za opis.'],
  ['Zajedno sa kupcem', 'Isti editor: zajednička sesija uživo, predlozi izmena sa razlogom, dogovor beležen.'],
];
type Plan = { name: string; who: string; price: string; per: string; feats: string[]; cta: string; tag: string };
// shortcut: plan prices are placeholders ([CENA]) until billing is chosen (CLAUDE.md: Paddle / Lemon Squeezy).
const PLANS: Record<'shop' | 'home', Plan[]> = {
  shop: [
    { name: 'Start', who: 'Za početak i male radionice', price: '0 RSD', per: 'zauvek', feats: ['Neograničeno projekata', 'Planer, 2D, 3D, katalog', 'Nacrti na ekranu, jednostavna ponuda', '3 upita kupaca mesečno'], cta: 'Napravi nalog', tag: '' },
    { name: 'Pro', who: 'Za radionicu koja radi svaki dan', price: '[CENA]', per: '/ mesečno', feats: ['Sve iz Starta', 'Krojna lista, kant, okov + izvoz', 'Nacrti PDF / DXF, puna ponuda', 'Neograničeno upita · 3 korisnika', 'Poređenje pilana, porudžbina'], cta: 'Probaj 30 dana besplatno', tag: '30 dana bez kartice' },
    { name: 'Premium', who: 'Za tim i sopstveni brend', price: '[CENA]', per: '/ mesečno', feats: ['Sve iz Pro', 'Neograničeno korisnika, uloge', 'Istaknuto u imeniku i portfolio', 'Link za sajt sa tvojim brendom', 'Puna statistika'], cta: 'Izaberi Premium', tag: '' },
  ],
  home: [
    { name: 'Besplatno', who: 'Crtaj i igraj se koliko hoćeš', price: '0 RSD', per: '', feats: ['Vodič i planer', 'Neograničeno kuhinja', '3D i primer cene (uz partnera)', 'Kuhinja je javna u galeriji'], cta: 'Napravi svoju kuhinju', tag: '' },
    { name: 'Plus', who: 'Kad želiš pravu ponudu', price: '[CENA]', per: 'jednom, po projektu', feats: ['Slanje do 3 stolara, projekat otvoren', 'Saradnja i zajednička sesija · 90 dana', 'Poređenje ponuda, PDF projekta', 'Privatnost uključena'], cta: 'Napravi kuhinju', tag: 'najčešće' },
    { name: 'Privatno', who: 'Samo da kuhinja ne bude javna', price: '[CENA]', per: 'jednom, po projektu', feats: ['Kuhinja nije u galeriji', 'Vidiš je samo ti i koga pozoveš', 'Kasnije Plus ne naplaćuje privatnost ponovo'], cta: 'Napravi kuhinju', tag: '' },
  ],
};
const FAQ = [
  ['Da li mi treba kartica za probu?', 'Ne. Proba Pro traje 30 dana i ne traži karticu. Posle probe sam prelaziš na besplatni Start; ništa se ne naplaćuje bez tvog pristanka. Podsetimo te 7 dana i 1 dan pre kraja.'],
  ['Šta se dešava sa mojim projektima posle probe?', 'Ostaju — ništa se ne briše i ne zaključava se projekat. Zaključavaju se samo Pro alati (krojna lista, izvoz, puna ponuda) dok ne aktiviraš paket.'],
  ['Da li su moji projekti javni?', 'Ne. Projekti radionica su uvek privatni. U portfolio i galeriju ide samo ono što sam objaviš, uz saglasnost kupca ako je projekat od njega.'],
  ['Kako stižu upiti kupaca?', 'Kupac nacrta kuhinju i plati slanje do 3 radionice. Ti dobiješ upit sa otvorenim projektom, preuzmeš ga i radite zajedno u istom editoru.'],
  ['Mogu li da unesem svoje dobavljače i cene?', 'Da — svoje pilane i stovarišta sa cenovnicima (uvoz iz CSV / XLSX). Partneri platforme su posebno označeni.'],
];
const TILE = 'rounded-lg bg-[#FAF8F4]';
const BAR = 'h-2.5 rounded-[2px]';

/** For workshops + prices (design/screens/ZaStolare.html). */
export function WorkshopsPage() {
  const [aud, setAud] = useState<'shop' | 'home'>('shop');
  const shop = aud === 'shop';
  return (
    <SiteFrame current="Za stolare" cta={['Probaj 30 dana besplatno', '/prijava']} minH={2120}>
      <section aria-labelledby="zs-h" className={cn(PAGE, 'grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] items-center gap-10 pt-14 pb-8')}>
        <div className="flex flex-col gap-[18px]">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-primary uppercase">Za stolarske radionice</span>
          <h1 id="zs-h" className="m-0 text-[48px] leading-[1.1]">Od crteža do krojne liste — i kupci koji dolaze sa gotovim projektom.</h1>
          <p className="m-0 text-[18px] leading-normal text-ink-2">Nacrtaš prostor, složiš elemente, a Kroj iz istog modela izbaci krojnu listu, kant, okov, nacrte i ponudu. Kupci ti šalju projekat koji su sami nacrtali — vi ga dorađujete zajedno, u istom editoru.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/prijava" className={cn(BTN, 'bg-primary px-[26px] text-white hover:text-white')}>Probaj 30 dana besplatno</Link>
            <a href="#cene" className={cn(BTN, 'border border-solid border-line-strong bg-white px-5 text-foreground hover:text-foreground')}>Cene</a>
          </div>
          <p className="m-0 text-[14.5px] text-ink-2"><strong>Bez kartice.</strong> Posle 30 dana sam prelaziš na besplatni Start — ništa se ne naplaćuje bez tvog pristanka.</p>
        </div>
        <div aria-hidden="true" className="box-border grid h-[380px] grid-cols-2 gap-2.5 rounded-2xl bg-dark p-[18px]">
          <div className={cn(TILE, 'relative')}>
            <span className="absolute top-[12%] left-[10%] h-[76%] w-[6%] bg-foreground" /><span className="absolute top-[12%] left-[10%] h-[5%] w-[80%] bg-foreground" />
            <span className="absolute top-[17%] left-[16%] h-[22%] w-[60%] border border-solid border-foreground bg-wood-birch" /><span className="absolute top-[39%] left-[16%] h-[44%] w-[18%] border border-solid border-foreground bg-wood-birch" />
          </div>
          <div className={cn(TILE, 'flex flex-col gap-1.5 p-2.5')}>
            <span className={cn(BAR, 'bg-border')} />{[0, 1, 2, 3].map(i => <span key={i} className={cn(BAR, 'border border-solid border-[#E4DFD5] bg-white')} />)}
            <span className="mt-auto h-[22px] w-1/2 self-end rounded bg-primary" />
          </div>
          <div className={cn(TILE, 'flex items-end gap-1.5 p-3')}>
            {['h-[60%] bg-wood-birch', 'h-[60%] bg-wood-birch', 'h-[90%] bg-[#D6BE98]'].map((c, i) => <span key={i} className={cn('flex-1 border border-solid border-foreground', c)} />)}
          </div>
          <div className={cn(TILE, 'flex flex-col gap-1.5 p-3')}>
            <span className="font-mono text-[18px] font-bold text-foreground">268.066 RSD</span>
            <span className="h-2 w-4/5 bg-border" /><span className="h-2 w-3/5 bg-border" /><span className="mt-auto h-[22px] w-3/5 rounded bg-primary" />
          </div>
        </div>
      </section>

      <section aria-labelledby="feat-h" className={cn(PAGE, 'pt-6 pb-12')}>
        <h2 id="feat-h" className="mt-0 mb-[18px] text-[30px]">Šta dobija radionica</h2>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-4 p-0">
          {FEATS.map(([t, d]) => <li key={t} className="flex flex-col gap-2 rounded-[14px] border border-solid border-[#E4DFD5] bg-white p-5"><strong className="text-[18px]">{t}</strong><span className="text-[15px] leading-normal text-ink-2">{d}</span></li>)}
        </ul>
      </section>

      <section id="cene" aria-labelledby="price-h" className="border-0 border-y border-solid border-[#E4DFD5] bg-background">
        <div className={cn(PAGE, 'flex flex-col gap-5 py-12')}>
          <div className="flex flex-wrap items-center gap-3.5">
            <h2 id="price-h" className="m-0 text-[32px]">Cene</h2>
            <div role="tablist" aria-label="Za koga" className="inline-flex rounded-[10px] bg-[#E8E4DC] p-1">
              {([['shop', 'Za stolare'], ['home', 'Za kuću']] as const).map(([v, t]) => (
                <button key={v} type="button" role="tab" aria-selected={aud === v} onClick={() => setAud(v)}
                  className={cn('min-h-10 cursor-pointer rounded-lg border-0 px-[18px] font-sans text-[15px] font-medium', aud === v ? 'bg-white font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'bg-transparent text-ink-2')}>{t}</button>
              ))}
            </div>
            <span className="ml-auto text-[14px] text-muted-foreground">{shop ? 'Cene sa PDV-om · godišnje 2 meseca gratis · dodaci uz svaki paket' : 'Plaća se samo kad zatreba — crtanje je uvek besplatno'}</span>
          </div>
          <div className="grid grid-cols-3 items-stretch gap-4">
            {PLANS[aud].map((p, i) => (
              <article key={p.name} className={cn('flex flex-col gap-3 rounded-[14px] bg-white p-[22px]', i === 1 ? 'border-2 border-solid border-primary' : 'border border-solid border-[#E4DFD5]')}>
                <div className="flex items-center gap-2"><h3 className="m-0 text-[22px]">{p.name}</h3>{p.tag && <span className="rounded-[10px] bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent-ink">{p.tag}</span>}</div>
                <span className="text-[14.5px] text-muted-foreground">{p.who}</span>
                <div><span className="font-mono text-[26px] font-bold">{p.price}</span> <span className="text-[14px] text-muted-foreground">{p.per}</span></div>
                <ul className="m-0 flex list-none flex-col gap-[7px] p-0 text-[14.5px]">
                  {p.feats.map(f => <li key={f} className="flex gap-2"><svg width="16" height="16" viewBox="0 0 12 12" aria-hidden="true" className="mt-0.5 flex-none"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#2F7A3E" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{f}</span></li>)}
                </ul>
                <Link to={shop ? '/prijava' : '/kupac'} className={cn('mt-auto inline-flex min-h-12 items-center justify-center rounded-lg text-[15px] font-semibold no-underline',
                  i === 1 ? 'bg-primary text-white hover:text-white' : 'border border-solid border-line-strong bg-white text-foreground hover:text-foreground')}>{p.cta}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="faq-h" className="mx-auto box-content flex max-w-[900px] flex-col gap-2.5 px-6 py-12">
        <h2 id="faq-h" className="mt-0 mb-2 text-[28px]">Česta pitanja</h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className="rounded-[10px] border border-solid border-[#E4DFD5] bg-white px-4">
            <summary className="flex min-h-[52px] cursor-pointer items-center text-[16px] font-semibold">{q}</summary>
            <p className="mt-0 mb-3.5 text-[15px] leading-[1.55] text-ink-2">{a}</p>
          </details>
        ))}
      </section>
    </SiteFrame>
  );
}
