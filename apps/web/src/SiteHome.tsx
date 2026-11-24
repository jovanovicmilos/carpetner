// Site home, one page through the product (design/Pocetna.dc.html, 2026-11-24): hero + six "drawing sheets" (Prostor, Nacrti,
// 3D, Elementi, Krojna lista, Ponuda), each with a live "Probaj" on one example kitchen (siteKitchen.ts). Drawings, parts,
// cutting sheets and prices are the app's own components and engine, live; the 3D pictures are the exported renders
// (design/assets/site/web, made by SiteAssets + scripts/site-assets.mjs) — the realistic scene is too heavy for a home page.
import { generateParts } from 'engine';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { BRAND } from './brand';
import { CarcassDrawing } from './ElementPage';
import { SheetLayout } from './CutList';
import { FrontView, TopView, WorktopView } from './Drawings';
import { fitView, Plan } from './Plan';
import { useSession } from './session';
import { kitchen, nesting, partRows, price, shapeProject, unitCutout, unitProject, type Content, type Front, type ShapeName, type Top } from './siteKitchen';

const IMG = import.meta.glob<string>('../../../design/assets/site/web/*', { eager: true, query: '?url', import: 'default' });
const img = (name: string) => IMG[`../../../design/assets/site/web/${name}`];

// ---- styles (the reference's s-* / k-* / b-* classes)
const SEC = 'relative scroll-mt-[72px] pt-[72px] pb-14';
const WRAP = 'mx-auto max-w-[1280px] pr-10 pl-[72px]';
const H2 = 'm-0 text-[54px] leading-[1.02] font-bold tracking-[-0.025em]';
const LEAD = 'm-0 text-[20px] leading-[1.5] text-[#3D3A35]';
const CTA = 'inline-flex h-12 items-center gap-2 self-start rounded-[10px] bg-[#2E6B4E] px-5 text-[16px] font-semibold text-white no-underline hover:bg-[#1D4632] hover:text-white';
const SHEET = 'flex flex-col rounded-[4px] border-[1.5px] border-solid border-[#1C1B19] bg-white shadow-[8px_8px_0_rgba(31,43,36,0.08)]';
const SHEET_TOP = 'flex items-center gap-2.5 border-0 border-b border-solid border-[#1C1B19] px-3.5 py-2.5';
const TRY = `rounded-[4px] bg-[#2E6B4E] px-2 py-[3px] font-mono text-[12px] font-bold tracking-[.12em] text-white uppercase`;
const CTRLS = 'flex flex-wrap items-end gap-x-5 gap-y-3.5 border-0 border-b border-dashed border-[#BDB5A6] bg-[#FCFBF8] px-3.5 pt-3.5 pb-3';
const LBL = 'flex flex-col gap-1.5 text-[13px] font-medium text-[#3D3A35]';
const SEG = 'inline-flex h-[38px] gap-0.5 self-start rounded-lg bg-[#F3F1EC] p-[3px]';
const SEGB = 'h-full cursor-pointer rounded-md border-0 bg-transparent px-3 font-sans text-[14px] font-medium whitespace-nowrap text-[#5F5A52] hover:text-[#1C1B19] aria-checked:bg-white aria-checked:text-[#1C1B19] aria-checked:shadow-[0_1px_3px_rgba(0,0,0,.12)]';
const SWB = 'size-[34px] cursor-pointer rounded-full border-2 border-solid border-white p-0 shadow-[0_0_0_1px_#BDB5A6] aria-checked:shadow-[0_0_0_2px_#2E6B4E]';
const DRAW = `flex min-h-[420px] items-center justify-center px-3.5 py-3 [&_svg_text]:font-mono`;
const TB_CELL = 'flex flex-col gap-0.5 border-0 border-l border-solid border-[#1C1B19] px-3 py-[9px] first:border-l-0';
const TABLE = `w-full border-collapse text-[13.5px] [&_th]:border-0 [&_th]:border-b-[1.5px] [&_th]:border-solid [&_th]:border-[#1C1B19] [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-mono [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-[.08em] [&_th]:text-[#5F5A52] [&_th]:uppercase [&_td]:border-0 [&_td]:border-b [&_td]:border-solid [&_td]:border-[#EEEAE2] [&_td]:px-2 [&_td]:py-1.5`;
const B_PRI = 'inline-flex items-center justify-center gap-2 rounded-lg border-0 bg-[#2E6B4E] font-semibold whitespace-nowrap text-white no-underline hover:bg-[#1D4632] hover:text-white';
const B_LG = 'h-14 rounded-[10px] px-7 text-[17px]';
const B_OUT = 'inline-flex h-14 items-center justify-center gap-2 rounded-[10px] border border-solid border-[#BDB5A6] bg-white px-6 text-[17px] font-semibold text-[#1C1B19] no-underline hover:bg-[#F3F1EC] hover:text-[#1C1B19]';
const NAV = 'rounded-md px-2.5 py-2 text-[14.5px] font-medium whitespace-nowrap text-[#1C1B19] no-underline hover:bg-[#EEEAE2] hover:text-[#1C1B19]';
const FOCUS = '[&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-[#2E6B4E] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#2E6B4E]';

// ---- site labels of the variants (swatches as the reference)
const FRONTS: Record<Front, [string, string]> = { bela: ['Bela mat', '#F4F2EE'], hrast: ['Hrast', '#CFAE84'], zelena: ['Maslinasta', '#6E7552'], orah: ['Orah', '#7A5638'] };
const TOPS: Record<Top, [string, string]> = { hrast: ['Hrast', '#9A6B43'], beton: ['Beton', '#A9A59E'], crna: ['Crni granit', '#2B2A28'] };
const SHAPES: Record<'prava' | 'L' | 'U', [string, string, ShapeName]> = { prava: ['Prava', '320 cm', 'prava-320'], L: ['Ugaona L', '320 × 240', 'L-320x240'], U: ['U oblik', '340 × 240 × 240', 'U-340x240x240'] };
const GROUPS: [string, string, string][] = [['korpusi', 'Korpusi', 'stranice, podovi, vezni komadi, poleđine'], ['fronte', 'Fronte', ''], ['radnaPloca', 'Radna ploča', ''], ['kantIOkov', 'Kant i okov', 'šarke, vođice, nogice, ručke, kant'], ['izrada', 'Izrada', 'sečenje, kantovanje, sklapanje'], ['secenje', 'Sečenje u pilani', 'sečenje i kantovanje — sklapaš sam'], ['montaza', 'Montaža', 'dovoz i montaža']];
const BAR = ['#2E6B4E', '#C49A6C', '#6B4A33', '#8CC5A2', '#3D3A35', '#BDB5A6', '#D8D3C9'];
const SEC_LIST: [string, string, string][] = [['prostor', 'Prostor', 'Upišeš zidove, Kroj složi ormariće.'], ['nacrti', 'Nacrti', 'Svaki zid sa merama.'], ['prikaz-3d', '3D', 'Vidiš je pre nego što postoji.'], ['elementi', 'Elementi', 'Šta je unutar svakog ormarića.'], ['krojna-lista', 'Krojna lista', 'Šta pilana seče, do milimetra.'], ['ponuda', 'Ponuda', 'Koliko košta, stavka po stavka.']];
const NOTES: Record<string, [string, string][]> = {
  prostor: [['Zidovi kakvi stvarno jesu.', 'Debljina, ugao koji nije 90°, greda, stub — Kroj crta tvoj zid, ne idealan.'], ['Prozor, vrata, voda, struja.', 'Upišeš gde su. Sudopera ide kod odvoda, ploča nikad ispod prozora.'], ['Pravila struke, sama od sebe.', 'Ploča 30 cm od ugla i prozora, radni trougao sudopera–ploča–frižider, radna površina između.'], ['Upozorenja, ne zabrane.', 'Vrata udaraju u frižider? Dobiješ napomenu. Odluka je i dalje tvoja.']],
  nacrti: [['Kote u lancu i ukupno.', 'Svaki ormarić i cela dužina, kao na pravom tehničkom crtežu.'], ['Visine po standardu ili po tebi.', 'Sokla 10, radna ploča na 90, gornji od 145 cm — ili koliko ti kažeš.'], ['Izrezi i priključci.', 'Sudopera i ploča na tačnom mestu; voda, odvod i utičnice ucrtani na zidu.'], ['Štampa, PDF i DXF.', 'A3 za montažera, DXF za AutoCAD. Isti crtež, bez precrtavanja.']],
  '3d': [['Isti model, ne posebna slika.', 'Ništa se ne crta dvaput: promeniš bilo šta, 3D se promeni.'], ['Pravi dekori i aparati.', 'Fronte, radne ploče, frižider, rerna i sudopera u stvarnim merama.'], ['Tehnički i realni prikaz.', 'Tehnički sa ivicama za proveru, realni da vidiš da li ti se sviđa.'], ['Otvaranje krila i fioka.', 'Vidiš da li fioka udara u ručku pored — pre nego što se napravi.']],
  el: [['Stranice od 18 mm.', 'Sve mere se računaju od debljine ploče: pod je uži od ormarića za 2 × 18 mm.'], ['Poleđina u nutu.', 'HDF od 3 mm upušten u stranice, da ormarić ne „šeta“ i ne krivi se.'], ['Fah, vođice, šarke.', 'Broj šarki po visini krila, vođice po dubini fioke — Kroj bira sam.'], ['Zazor od 3 mm.', 'Između krila i fioka, da se ne taru. Ti to ne moraš da znaš — Kroj zna.']],
  kl: [['Mera do milimetra.', 'Već umanjena za kant, pa posle kantovanja deo izađe tačno.'], ['Kant po ivici.', 'Za svaku ivicu piše da li dobija kant: vidljive ivice da, one uz zid ne.'], ['Raspored na ploči.', 'Delovi složeni na ploču 2800 × 2070 sa što manje otpada, uz pazi na smer goda.'], ['Fajl za pilanu.', 'CSV ili XLSX koji pilana uvozi odmah. Uporediš cene više pilana u jednom kliku.']],
  po: [['Sve iz istog crteža.', 'Promeniš širinu jednog ormarića ili boju fronti — cena se menja istog trenutka.'], ['Cene radionice i pilane.', 'Stolar radi sa svojim cenovnikom; ti vidiš šta plaćaš, stavku po stavku.'], ['Verzije ponude.', 'Svaka izmena posle ponude pravi novu verziju i vidi se šta se promenilo.'], ['Do 3 stolara iz tvog grada.', 'Pošalješ projekat, oni ga otvore takav kakav je i pošalju prave ponude.']],
};
const SHOW = { num: true, dim: true, open: true, inst: true };

const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const Arrow = () => <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** Counts of a layout for the title blocks: base units (with the tall one apart), wall units. */
function counts(p: ReturnType<typeof kitchen>) {
  const k = (f: (kind: string) => boolean) => p.elements.filter(e => f(e.kind)).length;
  return { low: k(x => !['wall', 'tall', 'filler'].includes(x)), up: k(x => x === 'wall'), tall: k(x => x === 'tall') };
}

/** Segmented radio group of the sheets' controls. */
function Seg<T extends string | number>({ label, value, opts, set }: { label: string; value: T; opts: [T, string][]; set: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className={SEG}>
      {opts.map(([v, t]) => <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => set(v)} className={SEGB}>{t}</button>)}
    </div>
  );
}

function Section({ id, n, kick, title, lead, cta, notes, children }: { id: string; n: string; kick: string; title: string; lead: string; cta: string; notes: [string, string][]; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={SEC}>
      <div className={WRAP}>
        <div className="mb-7 flex items-center gap-3.5">
          <span aria-hidden="true" className={`rounded-md bg-[#1F2B24] px-2 py-1 font-mono text-[15px] font-semibold text-white`}>{n}</span>
          <span className={`font-mono text-[14px] font-semibold tracking-[.14em] text-[#2E6B4E]`}>{kick}</span>
          <span aria-hidden="true" className="h-[11px] flex-1 border-x border-y-0 border-solid border-[#8A8378] bg-[linear-gradient(#8A8378,#8A8378)] bg-[length:100%_1px] bg-center bg-no-repeat" />
        </div>
        <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-12">
          <div className="sticky top-24 flex flex-col gap-[18px]">
            <h2 id={`${id}-h`} className={H2}>{title}</h2>
            <p className={LEAD}>{lead}</p>
            <Link to="/kupac" className={CTA}>{cta}<Arrow /></Link>
            <div className={`mt-2.5 border-0 border-t border-dashed border-[#BDB5A6] pt-4 font-mono text-[12.5px] font-semibold tracking-[.12em] text-[#5F5A52] uppercase`}>Šta Kroj radi ispod haube</div>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {notes.map(([t, d], i) => (
                <li key={t} className="flex items-start gap-3 text-[15px] leading-[1.45]">
                  <span aria-hidden="true" className={`inline-flex size-[26px] flex-none items-center justify-center rounded-full border-[1.5px] border-solid border-[#2E6B4E] bg-white font-mono text-[12.5px] font-semibold text-[#1D4632]`}>{i + 1}</span>
                  <span><strong className="block text-[15.5px] font-semibold">{t}</strong><span className="text-[#5F5A52]"> {d}</span></span>
                </li>
              ))}
            </ol>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

/** "Probaj" sheet: top line, controls, drawing, title block. */
function Sheet({ title, ctrls, tb, children }: { title: string; ctrls: React.ReactNode; tb: [string, string][]; children: React.ReactNode }) {
  return (
    <div className={SHEET}>
      <div className={SHEET_TOP}><span className={TRY}>Probaj</span><span className="text-[15px] font-semibold">{title}</span></div>
      <div className={CTRLS}>{ctrls}</div>
      <div className={DRAW}>{children}</div>
      <TitleBlock cells={tb} />
    </div>
  );
}
const TitleBlock = ({ cells }: { cells: [string, string][] }) => (
  <div className="grid grid-cols-4 border-0 border-t-[1.5px] border-solid border-[#1C1B19]">
    {cells.map(([l, v]) => <div key={l} className={TB_CELL}><span className={`font-mono text-[10.5px] font-medium tracking-[.1em] text-[#8A8378] uppercase`}>{l}</span><span className={`font-mono text-[15px] font-semibold text-[#1C1B19]`}>{v}</span></div>)}
  </div>
);
const Pic = ({ name, alt, max }: { name: string; alt: string; max: number }) => <img src={img(name)} alt={alt} className="h-auto w-full object-contain" style={{ maxHeight: max }} />;

export function HomePage() {
  const user = useSession(s => s.session?.user);
  const [sec, setSec] = useState('prostor');
  const [shape, setShape] = useState<keyof typeof SHAPES>('L');
  const [pv, setPv] = useState<'2d' | '3d'>('2d');
  const [view, setView] = useState<'A' | 'B' | 'top' | 'wt' | 'sheet'>('A');
  const [front, setFront] = useState<Front>('hrast');
  const [top, setTop] = useState<Top>('hrast');
  const [mode, setMode] = useState<'real' | 'teh'>('real');
  const [w, setW] = useState(60);
  const [c, setC] = useState<Content>('fioke');
  const [ev, setEv] = useState<'2d' | '3d'>('2d');
  const [kl, setKl] = useState<'el' | 'board'>('el');
  const [board, setBoard] = useState(1);
  const [who, setWho] = useState<'stolar' | 'sam'>('stolar');

  // Scroll spy: the step in the header follows the section on screen.
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setSec(e.target.id)), { rootMargin: '-40% 0px -55% 0px' });
    SEC_LIST.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const k = useMemo(kitchen, []);
  const shapeP = useMemo(() => shapeProject(SHAPES[shape][2]), [shape]);
  const unit = useMemo(() => unitProject(w * 10, c), [w, c]);
  const nest = useMemo(nesting, []);
  const kitchenParts = useMemo(() => partRows(k).reduce((a, p) => a + p.qty, 0), [k]);
  const fromPrice = useMemo(() => price('hrast', 'hrast', 'stolar').total, []);
  const pr = useMemo(() => price(front, top, who), [front, top, who]);
  const PL = useMemo(() => partRows(unit), [unit]);

  const sh = SHAPES[shape], pl = counts(shapeP), L = counts(k), units = L.low + L.up + L.tall;
  const groups = pr.groups as Record<string, number>;
  const lines = GROUPS.filter(g => groups[g[0]] != null).map(([key, t, d]) => ({ t, d: key === 'fronte' ? pr.front : key === 'radnaPloca' ? pr.top : d, v: fmt(groups[key] / 100) }));
  if (pr.margin) lines.push({ t: 'Marža radionice', d: 'iz cenovnika radionice', v: fmt(pr.margin / 100) });
  lines.push({ t: 'PDV 20 %', d: '', v: fmt(pr.vat / 100) });
  const total = `${fmt(pr.total / 100)} RSD`;
  let bx = 0;
  const bar = [...GROUPS.filter(g => groups[g[0]] != null).map(g => groups[g[0]]), pr.margin || 0, pr.vat].flatMap((v, i) => {
    const bw = (v / pr.total) * 640;
    if (bw <= 0) return [];
    const d = `M${bx} 6h${bw}v22h${-bw}Z`; bx += bw;
    return [<path key={i} d={d} fill={BAR[i % BAR.length]} stroke="#FFFFFF" strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" />];
  });
  const edgeOf = (p: (typeof PL)[number]) => p.qty * ((p.edges.L1 ? 1 : 0) * p.length + (p.edges.L2 ? 1 : 0) * p.length + (p.edges.W1 ? 1 : 0) * p.width + (p.edges.W2 ? 1 : 0) * p.width);
  const nParts = PL.reduce((a, p) => a + p.qty, 0), edge = PL.reduce((a, p) => a + edgeOf(p), 0), mats = new Set(PL.map(p => p.material)).size;
  const nb = nest[board - 1], yieldPct = (s: typeof nb) => Math.round(s.sheet.utilization);
  const elName = `Donji ${w} · ${{ krilo: 'krila + fah', fioke: '3 fioke', sudopera: 'sudopera' }[c]}`;
  const [fr, tp] = [FRONTS[front], TOPS[top]];

  return (
    <div className={cn('relative bg-[#FAF8F4] bg-[linear-gradient(rgba(46,107,78,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(46,107,78,0.055)_1px,transparent_1px)] bg-[size:24px_24px] font-sans text-[#1C1B19]', FOCUS)}>
      <div aria-hidden="true" className="pointer-events-none absolute top-0 bottom-0 left-7 w-3.5 border-0 border-r border-solid border-[#C9C1B2]"
        style={{ backgroundImage: 'repeating-linear-gradient(180deg,#C9C1B2 0 1px,transparent 1px 12px),repeating-linear-gradient(180deg,#8A8378 0 1px,transparent 1px 120px)', backgroundSize: '7px 100%,14px 100%', backgroundRepeat: 'repeat-y', backgroundPosition: 'right top,right top' }} />

      <header className="sticky top-0 z-10 border-0 border-b-[1.5px] border-solid border-[#1C1B19] bg-[rgba(250,248,244,0.96)] backdrop-blur-[6px]">
        <div className="mx-auto flex max-w-[1440px] items-center gap-[18px] px-7 py-2.5">
          <a href="#" aria-label={`${BRAND.name} — na vrh`} className="flex flex-none items-center gap-[9px] !text-[#1C1B19] no-underline">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="#1F2B24" /><path d="M3 11h22M11 11v14" stroke="#8CC5A2" strokeWidth="2" /></svg>
            <span className="text-[19px] font-bold">{BRAND.name}</span>
          </a>
          <nav aria-label="Koraci na stranici" className="flex flex-1 items-center justify-center">
            {SEC_LIST.map(([id, t], i) => (
              <span key={id} className="contents">
                {i > 0 && <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" className="mx-px flex-none"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="#A59D90" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                <a href={`#${id}`} aria-current={sec === id} onClick={() => setSec(id)}
                  className="group inline-flex items-center gap-1.5 rounded-full px-[9px] py-1.5 text-[14px] font-medium whitespace-nowrap !text-[#3D3A35] no-underline hover:bg-[#EEEAE2] hover:!text-[#1C1B19] aria-[current=true]:bg-[#1F2B24] aria-[current=true]:!text-white">
                  <span className={`font-mono text-[11px] font-semibold text-[#8A8378] group-aria-[current=true]:text-[#8CC5A2]`}>0{i + 1}</span>{t}
                </a>
              </span>
            ))}
          </nav>
          <div className="flex flex-none items-center gap-1">
            <Link className={NAV} to="/inspiracija">Inspiracija</Link>
            <Link className={NAV} to="/za-stolare">Za stolare</Link>
            {/* Signed in: the account's home instead of Prijava (the reference draws a visitor). */}
            {user ? <Link className={NAV} to={user.kind === 'customer' ? '/moje-kuhinje' : '/projekti'}>{user.kind === 'customer' ? 'Moje kuhinje' : 'Projekti'}</Link> : <Link className={NAV} to="/prijava">Prijava</Link>}
            <Link to="/kupac" className={cn(B_PRI, 'ml-1.5 h-10 px-4 text-[14.5px] !text-white')}>Napravi kuhinju</Link>
          </div>
        </div>
      </header>

      <section aria-labelledby="hero-h" className="pt-16 pb-10">
        <div className={cn(WRAP, 'grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-12')}>
          <div className="flex flex-col gap-[22px]">
            <span className={`font-mono text-[13px] font-semibold tracking-[0.14em] text-[#2E6B4E]`}>KROJ · KUHINJA PO MERI</span>
            <h1 id="hero-h" className="m-0 text-[76px] leading-[0.98] font-bold tracking-[-0.035em]">Upišeš zid.<br />Dobiješ kuhinju.</h1>
            <p className="m-0 text-[21px] leading-[1.5] text-[#3D3A35]">I to ne sliku — nego <strong>nacrte, 3D, svaki ormarić, listu za pilanu i cenu</strong>. Sve iz istog crteža. Promeniš jedan broj, menja se sve.</p>
            <div className="flex flex-wrap gap-3"><Link to="/kupac" className={cn(B_PRI, B_LG, '!text-white')}>Napravi svoju kuhinju</Link><a href="#prostor" className={cn(B_OUT, '!text-[#1C1B19]')}>Kako? Skroluj ↓</a></div>
            <p className="m-0 text-[14.5px] text-[#5F5A52]">Besplatno · bez naloga dok ne sačuvaš · 10 minuta</p>
          </div>
          <div className={SHEET}>
            <div className={SHEET_TOP}><span className={cn(TRY, 'bg-[#1F2B24]')}>List 0/6</span><span className="text-[15px] font-semibold">Ovo je napravljeno u Kroju. Skroluj i menjaj je.</span></div>
            <div className={cn(DRAW, 'min-h-[380px] p-0')}><Pic name="3d-hero.webp" alt="Kuhinja Petrović, ugaona L 320 × 240, hrast — realni 3D prikaz iz Kroja" max={420} /></div>
            <TitleBlock cells={[['Oblik', 'Ugaona L'], ['Mere', '320 × 240'], ['Elementi', String(units)], ['Cena od', `${fmt(Math.round(fromPrice / 100000) * 1000)} RSD`]]} />
          </div>
        </div>
        <div className={cn(WRAP, 'mt-12')}>
          <ol aria-label="Šest koraka" className="m-0 grid list-none grid-cols-6 rounded-[4px] border-[1.5px] border-solid border-[#1C1B19] bg-white p-0">
            {SEC_LIST.map(([id, t, d], i) => (
              <li key={id} className={i ? 'border-0 border-l border-solid border-[#1C1B19]' : undefined}>
                <a href={`#${id}`} className="flex h-full flex-col gap-1.5 px-4 pt-3.5 pb-4 !text-[#1C1B19] no-underline">
                  <span className="flex items-center justify-between"><span className={`font-mono text-[12px] font-semibold text-[#2E6B4E]`}>0{i + 1}</span><span aria-hidden="true" className="text-[15px] text-[#8A8378]">↓</span></span>
                  <strong className="text-[19px] tracking-[-0.01em]">{t}</strong><span className="text-[14px] leading-[1.4] text-[#5F5A52]">{d}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Section id="prostor" n="01" kick="PROSTOR" title="Upiši dva broja. Ostalo je naše." cta="Unesi svoje zidove" notes={NOTES.prostor}
        lead="Izmeriš zidove metrom i upišeš dužine. Kroj sam složi ormariće po pravilima struke — sudopera ispod prozora, ploča dalje od ugla, frižider na kraju.">
        <Sheet title="Izaberi oblik — raspored je Krojev, ne naš crtež"
          ctrls={<>
            <div className={LBL}>Oblik<Seg label="Oblik kuhinje" value={shape} set={setShape} opts={[['prava', 'Prava'], ['L', 'Ugaona L'], ['U', 'U oblik']]} /></div>
            <div className={LBL}>Prikaz<Seg label="Prikaz" value={pv} set={setPv} opts={[['2d', 'Osnova'], ['3d', '3D']]} /></div>
          </>}
          tb={[['Oblik', sh[0]], ['Zidovi', sh[1]], ['Donji', String(pl.low) + (pl.tall ? ' + visoki' : '')], ['Gornji', String(pl.up)]]}>
          {pv === '2d'
            ? <div className="w-full"><Plan project={shapeP} view={fitView(shapeP, 450)} className="h-auto max-h-[460px] w-full" /></div>
            : <Pic name={`3d-real-shape-${sh[2]}.webp`} alt={`${sh[0]} ${sh[1]} — raspored koji je Kroj sam složio`} max={460} />}
        </Sheet>
      </Section>

      <Section id="nacrti" n="02" kick="NACRTI" title="Kao kod arhitekte. Samo što ne čekaš." cta="Vidi nacrte svoje kuhinje" notes={NOTES.nacrti}
        lead="Svaki zid dobije svoj nacrt sa svim merama: spreda, odozgo i radne ploče sa izrezima. Odštampaš na A3 i daš majstoru.">
        <Sheet title="Prelistaj nacrte ove kuhinje"
          ctrls={<div className={LBL}>List<Seg label="Nacrt" value={view} set={setView} opts={[['A', 'Zid A'], ['B', 'Zid B'], ['top', 'Odozgo'], ['wt', 'Radne ploče'], ['sheet', 'List A3']]} /></div>}
          tb={[['List', { A: 'Zid A spreda', B: 'Zid B spreda', top: 'Odozgo', wt: 'Radne ploče', sheet: 'A3 · list 1/4' }[view]], ['Kuhinja', sh[0]], ['Razmera', '1 : 20'], ['Izvoz', 'PDF · DXF']]}>
          <div className="w-full [&_svg]:h-auto [&_svg]:max-h-[470px] [&_svg]:w-full [&_svg]:max-w-none">
            {view === 'A' && <FrontView project={k} wallId="A" show={SHOW} />}
            {view === 'B' && <FrontView project={k} wallId="B" show={SHOW} />}
            {view === 'top' && <TopView project={k} show={SHOW} />}
            {view === 'wt' && <WorktopView project={k} show={SHOW} />}
            {view === 'sheet' && <img src={img('nacrt-list-A3.png')} alt="List A3 za štampu: zid A spreda" className="h-auto max-h-[470px] w-full border border-solid border-[#DDD8CE] object-contain" />}
          </div>
        </Sheet>
      </Section>

      <Section id="prikaz-3d" n="03" kick="3D" title="Okreni je. Pre nego što postoji." cta="Obuci svoju kuhinju" notes={NOTES['3d']}
        lead="Isti crtež, samo u prostoru. Biraš fronte i radnu ploču i odmah vidiš da li ti se sviđa — pre nego što je iko išta isekao.">
        <Sheet title="Obuci kuhinju"
          ctrls={<>
            <div className={LBL}>Fronte<div role="radiogroup" aria-label="Boja fronti" className="flex gap-1.5">
              {(Object.keys(FRONTS) as Front[]).map(f => <button key={f} type="button" role="radio" aria-checked={front === f} aria-label={FRONTS[f][0]} title={FRONTS[f][0]} onClick={() => { setFront(f); setMode('real'); }} className={SWB} style={{ background: FRONTS[f][1] }} />)}
            </div></div>
            <div className={LBL}>Radna ploča<div role="radiogroup" aria-label="Radna ploča" className="flex gap-1.5">
              {(Object.keys(TOPS) as Top[]).map(t => <button key={t} type="button" role="radio" aria-checked={top === t} aria-label={TOPS[t][0]} title={TOPS[t][0]} onClick={() => { setTop(t); setMode('real'); }} className={SWB} style={{ background: TOPS[t][1] }} />)}
            </div></div>
            <div className={LBL}>Prikaz<Seg label="Prikaz" value={mode} set={setMode} opts={[['real', 'Realni'], ['teh', 'Tehnički']]} /></div>
          </>}
          tb={[['Fronte', fr[0]], ['Radna ploča', tp[0]], ['Prikaz', mode === 'teh' ? 'Tehnički' : 'Realni'], ['Model', 'isti']]}>
          <Pic name={mode === 'teh' ? '3d-teh.webp' : `3d-real-${front}-${top}.webp`} alt={`Kuhinja u 3D: fronte ${fr[0].toLowerCase()}, radna ploča ${tp[0].toLowerCase()}${mode === 'teh' ? ', tehnički prikaz' : ''}`} max={480} />
        </Sheet>
      </Section>

      <Section id="elementi" n="04" kick="ELEMENTI" title="Izgleda kao kutija. Nije kutija." cta="Složi svoje elemente" notes={NOTES.el}
        lead="Ormarić je mašina: stranice, pod, vezni komadi, poleđina, fah, krila, šarke, vođice, nogice. Kroj zna gde ide svaki deo i koliko je velik.">
        <Sheet title="Izaberi ormarić — i rasklopi ga"
          ctrls={<>
            <div className={LBL}>Širina<Seg label="Širina elementa" value={w} set={setW} opts={[[40, '40'], [50, '50'], [60, '60'], [80, '80 cm']]} /></div>
            <div className={LBL}>Unutra<Seg label="Sadržaj elementa" value={c} set={setC} opts={[['krilo', 'Krila + fah'], ['fioke', '3 fioke'], ['sudopera', 'Sudopera']]} /></div>
            <div className={LBL}>Prikaz<Seg label="Prikaz elementa" value={ev} set={setEv} opts={[['2d', 'Crtež'], ['3d', 'Rasklopljen 3D']]} /></div>
          </>}
          tb={[['Element', `${w} cm`], ['Delova', String(nParts)], ['Kant', `${(edge / 1000).toFixed(1).replace('.', ',')} m`], ['Materijala', String(mats)]]}>
          {ev === '2d'
            ? <div className="w-full [&_svg]:h-auto [&_svg]:max-h-[440px] [&_svg]:w-full"><CarcassDrawing el={unit.elements[0]} rules={unit.rules} parts={generateParts(unit)} cutout={unitCutout(unit)} /></div>
            : <div className="flex w-full flex-col items-center gap-1.5">
                <Pic name={`element-60-${c}-3d.webp`} alt={`Donji element 60 ${{ krilo: 'sa krilima i fahom', fioke: 'sa 3 fioke', sudopera: 'za sudoperu' }[c]}, rasklopljen na delove`} max={430} />
                <span className="text-[13px] text-[#5F5A52]">{w === 60 ? 'Delovi razmaknuti 40 mm, da se vidi od čega je.' : `Rasklopljen prikaz je za širinu 60; crtež i lista su za ${w}.`}</span>
              </div>}
        </Sheet>
      </Section>

      <Section id="krojna-lista" n="05" kick="KROJNA LISTA" title="Pilana dobije tačno šta da iseče." cta="Napravi krojnu listu" notes={NOTES.kl}
        lead="Svaki deo sa merom do milimetra, koja ivica dobija kant i od čega je. Bez prepisivanja, bez „otprilike“. Šalješ fajl i gotovo.">
        <Sheet title="Ovo ide u pilanu"
          ctrls={<>
            <div className={LBL}>Lista<Seg label="Lista" value={kl} set={setKl} opts={[['el', 'Ovaj element'], ['board', 'Raspored na pločama']]} /></div>
            <span className="max-w-[300px] pb-2.5 text-[13.5px] text-[#3D3A35]">{kl === 'el' ? `Delovi za ${elName} iz koraka 04 — promeni ga tamo, lista se preračuna.` : `Cela kuhinja: ${kitchenParts} delova na ${nest.length} ploča, po materijalu.`}</span>
          </>}
          tb={[['Delova', String(kl === 'el' ? nParts : kitchenParts)], ['Ploča', kl === 'el' ? '—' : `${nest.length} ploča`], ['Iskorišćenost', kl === 'el' ? '—' : `${yieldPct(nb)} %`], ['Fajl', 'CSV · XLSX']]}>
          <div className="flex w-full flex-col gap-3">
            {kl === 'el'
              ? <table className={TABLE}>
                  <thead><tr><th>Deo</th><th className="!text-right">Kom</th><th className="!text-right">Dužina × širina</th><th>Kant</th><th>Materijal</th></tr></thead>
                  <tbody>{PL.map((p, i) => (
                    <tr key={i}><td>{p.name}</td><td className={`font-mono text-right`}>{p.qty}</td><td className={`font-mono text-right`}>{p.length} × {p.width}</td><td className="font-mono">{p.edgeCode}</td><td className="text-[#5F5A52]">{p.material}</td></tr>
                  ))}</tbody>
                </table>
              : <div className="flex flex-col gap-2.5">
                  <Seg label="Ploča" value={board} set={setBoard} opts={nest.map((_, i): [number, string] => [i + 1, String(i + 1)])} />
                  <div className="w-full [&_svg]:h-auto [&_svg]:max-h-[400px] [&_svg]:w-full"><SheetLayout size={nb.size} sheet={nb.sheet} /></div>
                  <span className="text-[13.5px] text-[#3D3A35]">{nb.material} · ploča {nb.of[0]} od {nb.of[1]} · iskorišćeno {yieldPct(nb)} %</span>
                </div>}
          </div>
        </Sheet>
      </Section>

      <Section id="ponuda" n="06" kick="PONUDA" title="Cena. Bez pogađanja." cta="Pošalji stolarima" notes={NOTES.po}
        lead="Materijal, kant, okov, radna ploča, rad i montaža — sve se sabere samo, iz istog crteža. Pošalješ stolarima i dobiješ prave ponude za tačno tvoju kuhinju.">
        <Sheet title="Koliko košta ova kuhinja"
          ctrls={<div className={LBL}>Ko pravi<Seg label="Ko pravi" value={who} set={setWho} opts={[['stolar', 'Stolar, sve gotovo'], ['sam', 'Sam, samo materijal']]} /></div>}
          tb={[['Kuhinja', sh[0]], ['Fronte', fr[0]], ['Radna ploča', tp[0]], ['Ukupno', total]]}>
          <div className="flex w-full flex-col gap-2.5">
            <table className={TABLE}>
              <thead><tr><th>Stavka</th><th>Šta je unutra</th><th className="!text-right">RSD</th></tr></thead>
              <tbody>
                {lines.map(l => <tr key={l.t}><td className="font-medium">{l.t}</td><td className="text-[#5F5A52]">{l.d}</td><td className={`font-mono text-right`}>{l.v}</td></tr>)}
                <tr><td colSpan={2} className="!border-b-0 !pt-3 text-[16px] font-bold">Ukupno</td><td className={`font-mono !border-b-0 !pt-3 text-right text-[22px] font-bold`}>{total}</td></tr>
              </tbody>
            </table>
            <svg viewBox="0 0 640 34" role="img" aria-label="Udeo stavki u ceni" className="h-auto w-full">{bar}</svg>
          </div>
        </Sheet>
      </Section>

      <section aria-labelledby="fin-h" className="pt-10 pb-[72px]">
        <div className={WRAP}>
          <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center gap-10 rounded-[4px] border-[1.5px] border-solid border-[#1C1B19] bg-[#1F2B24] px-12 py-11 text-[#F3F1EC] shadow-[8px_8px_0_rgba(31,43,36,0.12)]">
            <div className="flex flex-col gap-4">
              <span className={`font-mono text-[13px] font-semibold tracking-[0.14em] text-[#8CC5A2]`}>LIST 6/6 · GOTOVO</span>
              <h2 id="fin-h" className="m-0 text-[56px] leading-[1.02] tracking-[-0.03em]">Upravo si napravio kuhinju.</h2>
              <p className="m-0 text-[19px] leading-[1.5] text-[#D8D3C9]">Ugaona L 320 × 240, {units} elemenata, fronte {fr[0].toLowerCase()}, radna ploča {tp[0].toLowerCase()}, {total}. Sačuvaj je, doteraj u planeru i pošalji do 3 stolara iz svog grada.</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/kupac" className={cn(B_PRI, B_LG, 'bg-[#8CC5A2] !text-[#1C1B19] hover:bg-[#8CC5A2]')}>Nastavi sa ovom kuhinjom</Link>
                <Link to="/inspiracija" className={cn(B_OUT, 'border-[#5F6F66] bg-transparent !text-white hover:bg-transparent')}>Pogledaj tuđe kuhinje</Link>
              </div>
            </div>
            <dl className={`m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 border-0 border-l border-dashed border-[#5F6F66] pl-8 font-mono text-[15px] font-medium`}>
              {([['Oblik', 'Ugaona L'], ['Mere', '320 × 240 cm'], ['Elementi', `${L.low} donjih · ${L.up} gornjih · ${L.tall} visoki`], ['Fronte', fr[0]], ['Radna ploča', tp[0]], ['Ukupno', total]] as const).map(([dk, dv]) => (
                <span key={dk} className="contents"><dt className="text-[#8CC5A2]">{dk}</dt><dd className="m-0 text-white">{dv}</dd></span>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="biz-h" className="border-0 border-t-[1.5px] border-solid border-[#1C1B19] bg-white">
        <div className={cn(WRAP, 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-8 py-12')}>
          <div className="flex flex-col gap-2.5">
            <span className={`font-mono text-[13px] font-semibold tracking-[0.14em] text-[#6B4A33]`}>ZA STOLARE</span>
            <h2 id="biz-h" className="m-0 text-[34px] tracking-[-0.02em]">Sve ovo, za tvoju radionicu. I kupci koji dolaze sa gotovim projektom.</h2>
            <p className="m-0 text-[17px] text-[#3D3A35]">Tvoj cenovnik, tvoji standardi, tvoja pilana. Krojna lista, nacrti i ponuda iz jednog crteža.</p>
          </div>
          <div className="flex flex-col items-start gap-2"><Link to="/za-stolare" className={cn(B_PRI, B_LG, 'bg-[#6B4A33] !text-white hover:bg-[#6B4A33]')}>Probaj 30 dana besplatno</Link><span className="text-[14px] text-[#5F5A52]">bez kartice</span></div>
        </div>
      </section>

      <footer className="border-0 border-t border-solid border-[#E4DFD5] bg-[#F3F1EC]">
        <div className={cn(WRAP, 'flex flex-wrap items-center gap-x-8 gap-y-4 py-7 text-[14px]')}>
          <strong>{BRAND.name}</strong><span className="text-[#5F5A52]">Kuhinje po meri, od crteža do stolara.</span>
          <span className="ml-auto flex gap-5"><Link to="/inspiracija">Inspiracija</Link><Link to="/radionice">Radionice</Link><Link to="/za-stolare#cene">Cene</Link><a href="#">Uslovi</a><a href="#">Privatnost</a><a href="#">Kontakt</a></span>
        </div>
      </footer>
    </div>
  );
}
