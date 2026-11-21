// Site workshop directory and public workshop profile (design/screens/Radionice.html, Radionica.html): filters, list or list +
// map, "Profil i radovi"; profile with cover, "Pošalji svoju kuhinju" (into the planner), published works, about, services, area.
// shortcut: workshops, works, services and map pins are the design's placeholders (every workshop shows [Radionica A]'s profile
// text with its own name); the city select does not filter and the map is a drawn grid until the directory lives in apps/api
// and a map provider is chosen ([PROVAJDER MAPA]).
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { cn } from '@/lib/utils';
import { KITCHENS, KitchenPicture, PAGE, SiteFrame, type GalleryKitchen } from './Site';

const SHOPS = [
  { id: 'a', n: '[Radionica A]', ini: 'RA', c: '#6B4A33', where: 'Novi Sad · radi Novi Sad, Sremski Karlovci, Futog', lead: '4–6 nedelja', fast: false, mount: true, extra: 'Merenje i montaža', jobs: '12 kuhinja u Kroju', f: true, g: ['#EADBC4', '#FFFFFF', '#6B4A33'], x: 52, y: 44 },
  { id: 'b', n: '[Radionica B]', ini: 'RB', c: '#2A3A31', where: 'Novi Sad · radi celu Bačku', lead: '6–8 nedelja', fast: false, mount: true, extra: 'Merenje i montaža', jobs: '5 kuhinja u Kroju', f: false, g: ['#3E5045', '#C49A6C', '#F3F1EC'], x: 46, y: 50 },
  { id: 'c', n: '[Radionica C]', ini: 'RC', c: '#C49A6C', where: 'Temerin · 15 km', lead: '3–5 nedelja', fast: true, mount: false, extra: 'Montaža uz doplatu', jobs: 'novo u Kroju', f: false, g: ['#6B4A33', '#EADBC4', '#3A2A1F'], x: 66, y: 30 },
  { id: 'd', n: '[Radionica D]', ini: 'RD', c: '#2E6B4E', where: 'Inđija · 40 km', lead: '5–7 nedelja', fast: false, mount: true, extra: 'Merenje i montaža', jobs: '8 kuhinja u Kroju', f: false, g: ['#FFFFFF', '#2E6B4E', '#EADBC4'], x: 58, y: 80 },
  { id: 'e', n: '[Radionica E]', ini: 'RE', c: '#3A2A1F', where: 'Bačka Palanka · 38 km', lead: '4–5 nedelja', fast: true, mount: true, extra: 'Merenje i montaža', jobs: '3 kuhinje u Kroju', f: false, g: ['#F6EEE2', '#6B4A33', '#FFFFFF'], x: 18, y: 46 },
];
const GRID_BG = 'bg-[#EEF2EC] bg-[linear-gradient(#DCE3D8_1px,transparent_1px),linear-gradient(90deg,#DCE3D8_1px,transparent_1px)]';
const SEG = (on: boolean) => cn('min-h-[38px] cursor-pointer rounded-md border-0 px-3.5 font-sans text-[14px]', on ? 'bg-white font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'bg-transparent font-medium text-ink-2');
const CHECK = 'inline-flex min-h-11 items-center gap-2 text-[14px]';

export function RadionicePage() {
  const [map, setMap] = useState(false);
  const [mount, setMount] = useState(true);
  const [fast, setFast] = useState(false);
  const list = SHOPS.filter(w => (!mount || w.mount) && (!fast || w.fast));
  return (
    <SiteFrame current="Radionice" minH={1180}>
      <main className={cn(PAGE, 'flex flex-col gap-5 pt-9 pb-14 max-md:pt-6')}>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <h1 className="m-0 text-[40px] max-md:text-[32px]">Radionice</h1>
            <p className="mt-1.5 mb-0 text-[17px] text-ink-2">Stolari koji primaju projekte iz Kroja. Pogledaj njihove radove, pa im pošalji svoju kuhinju iz planera.</p>
          </div>
          <Link to="/kupac" className="ml-auto inline-flex min-h-12 items-center rounded-lg bg-primary px-5 text-[15px] font-semibold text-white no-underline hover:text-white">Napravi kuhinju pa pošalji</Link>
        </div>
        <div role="toolbar" aria-label="Filteri" className="flex flex-wrap items-end gap-3 border-0 border-b border-solid border-[#E4DFD5] pb-3">
          <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">Mesto
            <select className="min-h-11 min-w-[200px] rounded-lg border border-solid border-line-strong bg-white px-2.5 font-sans text-[15px] text-foreground">
              <option>Novi Sad i okolina</option><option>Beograd</option><option>Niš</option><option>Kragujevac</option>
            </select></label>
          <label className={CHECK}><input type="checkbox" checked={mount} onChange={() => setMount(!mount)} className="size-[18px] accent-primary" />Radi montažu</label>
          <label className={CHECK}><input type="checkbox" checked={fast} onChange={() => setFast(!fast)} className="size-[18px] accent-primary" />Rok do 5 nedelja</label>
          <span role="radiogroup" aria-label="Prikaz" className="ml-auto inline-flex rounded-lg bg-[#E8E4DC] p-[3px]">
            {([[false, 'Lista'], [true, 'Lista + mapa']] as const).map(([v, t]) => (
              <button key={t} type="button" role="radio" aria-checked={map === v} onClick={() => setMap(v)} className={SEG(map === v)}>{t}</button>
            ))}
          </span>
        </div>
        <div className={cn(map && 'grid grid-cols-[minmax(0,1fr)_420px] items-start gap-[18px] max-md:grid-cols-1')}>
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {list.map(w => (
              <li key={w.id} className="grid grid-cols-[56px_minmax(0,1fr)_260px] items-start gap-4 rounded-[14px] border border-solid border-[#E4DFD5] bg-white p-4 max-md:grid-cols-[56px_minmax(0,1fr)]">
                <span aria-hidden="true" className="inline-flex size-14 items-center justify-center rounded-xl text-[17px] font-bold text-white" style={{ background: w.c }}>{w.ini}</span>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="m-0 text-[19px]">{w.n}</h2>
                    {w.f && <span className="rounded-[10px] bg-wood-birch px-2 py-0.5 text-[12px] text-wood-bark">Istaknuto</span>}
                  </div>
                  <span className="text-[14.5px] text-ink-2">{w.where}</span>
                  <span className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13.5px] text-muted-foreground">
                    <span>Rok: <strong className="font-semibold text-foreground">{w.lead}</strong></span><span>{w.extra}</span><span>{w.jobs}</span>
                  </span>
                  <Link to={`/radionice/${w.id}`} className="mt-1 inline-flex min-h-9 items-center self-start rounded-lg border border-solid border-primary px-3.5 text-[14px] font-semibold text-accent-ink no-underline">Profil i radovi</Link>
                </div>
                <div aria-hidden="true" className="grid h-20 grid-cols-3 gap-1.5 max-md:col-span-full">
                  {w.g.map((c, i) => <span key={i} className="rounded-md border border-solid border-[#E4DFD5]" style={{ background: c }} />)}
                </div>
              </li>
            ))}
          </ul>
          {map && (
            <div role="img" aria-label="Mapa radionica u okolini Novog Sada" className={cn('sticky top-20 h-[560px] rounded-[14px] border border-solid border-[#E4DFD5] bg-size-[40px_40px] max-md:relative max-md:top-0 max-md:mt-3.5 max-md:h-[360px]', GRID_BG)}>
              {list.map(w => (
                <span key={w.id} className="absolute inline-flex size-[42px] -translate-1/2 items-center justify-center rounded-full border-[3px] border-solid border-white text-[12px] font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
                  style={{ left: `${w.x}%`, top: `${w.y}%`, background: w.c }}>{w.ini}</span>
              ))}
              <span className="absolute bottom-2.5 left-3 rounded-md bg-white/92 px-2 py-1 text-[12.5px] text-ink-2">Mapa: [PROVAJDER MAPA]</span>
            </div>
          )}
        </div>
        <p className="m-0 text-[13px] text-muted-foreground">Redosled: najbliži prvo. „Istaknuto“ je plaćeno isticanje i uvek je označeno. Ocene kupaca dolaze kasnije, samo za završene poslove.</p>
      </main>
    </SiteFrame>
  );
}

const WORKS: [string, string, GalleryKitchen['c']][] = [
  ['Hrast i bela', 'Prava · 360 cm · 2026.', ['#EADBC4', '#6B4A33', '#FFFFFF', '#C49A6C']],
  ['Orah ostrvo', 'Ostrvo · 380 cm', ['#6B4A33', '#F3F1EC', '#6B4A33', '#6B4A33']],
  ['Svetla ugaona', 'Ugaona · 320 × 240 cm', ['#FFFFFF', '#C49A6C', '#FFFFFF', '#F3F1EC']],
  ['Bela sa orahom', 'U · 260 × 300 × 220 cm', ['#FFFFFF', '#6B4A33', '#FFFFFF', '#6B4A33']],
  ['Zelena mat', 'Ugaona · 300 × 210 cm', ['#2E6B4E', '#EADBC4', '#2E6B4E', '#FFFFFF']],
  ['Kuhinja u potkrovlju', 'Prava · 280 cm · kosi plafon', ['#F6EEE2', '#C49A6C', '#F6EEE2', '#EADBC4']],
];
const SERVICES: [string, string][] = [['Merenje', 'da, bez naplate u Novom Sadu'], ['Montaža', 'da'], ['Rok izrade', '4–6 nedelja od merenja'], ['Okov', 'Blum, Hettich'], ['Ploče', '[PARTNER], Egger']];
const BOX = 'rounded-xl border border-solid border-[#E4DFD5] bg-white p-4';
/** A work that is also in the public gallery opens its kitchen page; the rest open the gallery. */
const workLink = (t: string) => { const i = KITCHENS.findIndex(k => k.t === t); return i < 0 ? '/inspiracija' : `/kuhinja/${i + 1}`; };

export function RadionicaPage() {
  const w = SHOPS.find(s => s.id === useParams().id);
  if (!w) return <Navigate to="/radionice" replace />;
  return (
    <SiteFrame current="Radionice" minH={1190}>
      <main className={cn(PAGE, 'flex flex-col gap-5 pt-6 pb-14')}>
        <nav aria-label="Putanja" className="text-[14px] text-muted-foreground"><Link to="/radionice">Radionice</Link> / {w.n}</nav>
        <section aria-labelledby="ws-h" className="overflow-hidden rounded-2xl border border-solid border-[#E4DFD5] bg-white">
          <div aria-hidden="true" className="h-[140px] bg-[linear-gradient(90deg,#6B4A33,#C49A6C_55%,#EADBC4)]" />
          <div className="-mt-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-[18px] px-6 pb-[22px] max-md:grid-cols-[auto_minmax(0,1fr)] max-md:px-4">
            <span aria-hidden="true" className="inline-flex size-[104px] items-center justify-center rounded-[18px] border-4 border-solid border-white text-[30px] font-bold text-white max-md:size-20" style={{ background: w.c }}>{w.ini}</span>
            <div className="flex flex-col gap-1 pb-1">
              <h1 id="ws-h" className="m-0 text-[32px] max-md:text-[26px]">{w.n}</h1>
              <span className="text-[15.5px] text-ink-2">{w.where} · u Kroju od 2026.</span>
            </div>
            <div className="flex flex-col items-end gap-1.5 pb-1 max-md:col-span-full max-md:items-stretch">
              <Link to="/kupac" className="inline-flex min-h-[50px] items-center justify-center rounded-[10px] bg-primary px-[22px] text-[16px] font-semibold text-white no-underline hover:text-white">Pošalji svoju kuhinju</Link>
              <span className="text-[12.5px] text-muted-foreground">Napravi kuhinju u planeru, pa je pošalji ovoj radionici</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6 max-md:grid-cols-1">
          <section aria-labelledby="pf-h" className="flex min-w-0 flex-col gap-3.5">
            <div className="flex items-baseline gap-2.5"><h2 id="pf-h" className="m-0 text-[24px]">Radovi</h2><span className="text-[14px] text-muted-foreground">{WORKS.length} objavljenih kuhinja</span></div>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 p-0">
              {WORKS.map(([t, m, c]) => (
                <li key={t}>
                  <Link to={workLink(t)} className="group flex flex-col gap-2 text-foreground no-underline hover:text-foreground">
                    <span className="block h-[170px] overflow-hidden rounded-xl border border-solid border-[#E4DFD5]"><KitchenPicture c={c} /></span>
                    <span className="text-[15.5px] font-semibold">{t}</span>
                    <span className="-mt-1.5 text-[13.5px] text-muted-foreground">{m}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="m-0 text-[13px] text-muted-foreground">Radove objavljuje radionica, uz saglasnost kupca. Bez imena i adresa kupaca.</p>
          </section>
          <aside className="flex flex-col gap-3.5">
            <section aria-labelledby="ab-h" className={cn(BOX, 'flex flex-col gap-2')}>
              <h2 id="ab-h" className="m-0 text-[17px]">O radionici</h2>
              <p className="m-0 text-[14.5px] leading-[1.55] text-ink-2">[Kratak opis koji upisuje radionica: iskustvo, vrsta posla, materijali.]</p>
            </section>
            <section aria-labelledby="sv-h" className={BOX}>
              <h2 id="sv-h" className="mt-0 mb-2 text-[17px]">Usluge</h2>
              <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-2 text-[14.5px]">
                {SERVICES.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="m-0">{v}</dd></div>)}
              </dl>
            </section>
            <section aria-labelledby="ar-h" className={cn(BOX, 'flex flex-col gap-2')}>
              <h2 id="ar-h" className="m-0 text-[17px]">Gde radi</h2>
              <div role="img" aria-label="Područje rada: Novi Sad i okolina do 30 km" className={cn('relative h-40 rounded-lg bg-size-[28px_28px]', GRID_BG)}>
                <span className="absolute top-1/2 left-1/2 size-[124px] -translate-1/2 rounded-full border-2 border-solid border-primary bg-[rgba(46,107,78,0.15)]" />
                <span className="absolute top-1/2 left-1/2 size-5 -translate-1/2 rounded-full border-[3px] border-solid border-white" style={{ background: w.c }} />
              </div>
              <span className="text-[13.5px] text-ink-2">Novi Sad i okolina do 30 km</span>
            </section>
            <p className="m-0 text-[12.5px] text-muted-foreground">Kontakt radionice vidiš kad joj pošalješ projekat. Ocene kupaca — uskoro, samo za završene poslove.</p>
          </aside>
        </div>
      </main>
    </SiteFrame>
  );
}
