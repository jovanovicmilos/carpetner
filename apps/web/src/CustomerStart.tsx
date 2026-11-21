// Customer guide, 5 questions (design/screens/KupacStart.html, docs/MARKETPLACE.md → Customer experience). Measures in cm.
// "Složi moju kuhinju" runs the same autoLayout as Brzi start and opens the customer editor.
// shortcut: autoLayout takes water and window on wall A and three-phase power on wall B only (other walls are ignored), does
// not know doors yet. "Sa ostrvom" = wall A + an island of base units (engine islandOf: half of A, centred, facing A).
import {
  autoLayout, DEFAULT_ELEMENT_MATERIALS, DEFAULT_MATERIALS, DEFAULT_RULES, PRESETS, quickStartRoom, type OpeningKind, type QuickStartInput,
} from 'engine';
import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BRAND, BrandMark } from './brand';
import { PhoneHeader } from './Planner';
import { newProjectId } from './projects';
import { useProject } from './store';

type ShapeId = 'line' | 'L' | 'U' | 'island';
type Wall = 'A' | 'B' | 'C';
const SHAPES: [ShapeId, string, string, string][] = [
  ['line', 'Prava', 'uz jedan zid', 'M14 14H82'],
  ['L', 'Ugaona (L)', 'dva zida, ugao', 'M14 54V14H82'],
  ['U', 'U oblik', 'tri zida', 'M14 54V14H82V54'],
  ['island', 'Sa ostrvom', 'zid + ostrvo', 'M14 14H82'],
];
const Q = [
  ['Kakvog je oblika tvoja kuhinja?', 'Izaberi kako će elementi stajati uz zidove. Ostrvo je slobodan pult na sredini.'],
  ['Koliko su dugački zidovi?', 'Dužina zida na kom će biti elementi, u centimetrima.'],
  ['Gde su prozor, vrata, voda i struja?', 'Za svaku stavku izaberi zid i koliko je daleko od levog ugla. Sudopera ide kod vode.'],
  ['Šta treba da bude u kuhinji?', 'Izaberi aparate. Prema tome se biraju širine elemenata.'],
  ['Koji izgled ti se dopada?', 'Izaberi stil i ručke za početak.'],
];
const CRUMBS = ['Oblik', 'Zidovi', 'Prozor i instalacije', 'Aparati', 'Izgled'];
type PlaceId = 'window' | 'door' | 'water' | 'power';
const PLACES: [PlaceId, string, string, string, string][] = [['window', 'Prozor', 'P', '#DCE7F7', '#1C1B19'], ['door', 'Vrata', 'Vr', '#FFFFFF', '#1C1B19'], ['water', 'Voda i odvod', 'V', '#1E50C8', '#FFFFFF'], ['power', 'Struja za šporet', 'S', '#F2B630', '#1C1B19']];
type WantId = 'oven' | 'fridge' | 'dw' | 'upper';
const WANTS: [WantId, string, [string, string][]][] = [
  ['oven', 'Rerna', [['tall', 'U visokom elementu'], ['under', 'Ispod ploče'], ['none', 'Bez rerne']]],
  ['fridge', 'Frižider', [['built', 'Ugradni'], ['free', 'Samostojeći'], ['none', 'Bez']]],
  ['dw', 'Mašina za sudove', [['60', '60 cm'], ['45', '45 cm'], ['none', 'Bez']]],
  ['upper', 'Gornji elementi', [['yes', 'Da'], ['no', 'Ne, samo police']]],
];
const LOOKS: [string, string, string[]][] = [['light', 'Svetla', ['#FFFFFF', '#F3F1EC', '#C49A6C', '#FFFFFF']], ['wood', 'Drvo', ['#C49A6C', '#EADBC4', '#6B4A33', '#C49A6C']], ['dark', 'Tamna', ['#3A2A1F', '#2A3A31', '#C49A6C', '#3A2A1F']]];
const HANDLES: [OpeningKind, string][] = [['bar', 'Šipka'], ['knob', 'Dugme'], ['push', 'Bez ručki (na pritisak)']];
const WALL_LABEL: Record<Wall, string> = { A: 'Zid A (glavni, gde je sudopera)', B: 'Zid B (levo od ugla)', C: 'Zid C (naspram zida B)' };

const CHOICE = (on: boolean) => cn('min-h-12 cursor-pointer rounded-lg px-4 font-sans text-[15px] font-medium', on ? 'border-2 border-solid border-primary bg-accent-soft font-semibold text-accent-ink' : 'border border-solid border-line-strong bg-white text-foreground');
const BIG = (on: boolean) => cn('flex min-h-[150px] cursor-pointer flex-col items-start gap-1.5 rounded-xl p-4 text-left font-sans text-foreground', on ? 'border-2 border-solid border-primary bg-accent-soft' : 'border border-solid border-border bg-white');
const STEP_BTN = 'h-[52px] w-12 flex-none cursor-pointer rounded-lg border border-solid border-line-strong bg-white font-sans text-[22px] font-semibold max-md:h-14 max-md:w-[52px] max-md:rounded-[10px]';

/** Customer header: logo, project, "Sačuvaj i prijavi se" (design KupacStart). */
export function CustomerHeader({ title }: { title: string }) {
  return (
    <header className="flex flex-wrap items-center gap-4 bg-dark px-5 py-2.5 text-background">
      <Link to="/" aria-label={`${BRAND.name} — početna`} className="flex items-center gap-2.5 text-inherit no-underline hover:text-inherit">
        <BrandMark />
        <span className="text-[18px] font-bold tracking-[0.02em]">{BRAND.name}</span>
      </Link>
      <span className="text-[14px] text-[#D8D3C9]">{title}</span>
      <Link to="/prijava" className="ml-auto text-[14px] text-background underline hover:text-background">Sačuvaj i prijavi se</Link>
    </header>
  );
}

type Answers = { shape: ShapeId; len: Record<Wall, number>; place: Record<PlaceId, [Wall, number]>; want: Record<WantId, string>; look: string; handle: OpeningKind };
const START: Answers = {
  shape: 'L', len: { A: 320, B: 240, C: 240 }, place: { window: ['A', 110], door: ['B', 160], water: ['A', 150], power: ['B', 90] },
  want: { oven: 'tall', fridge: 'built', dw: '60', upper: 'yes' }, look: 'light', handle: 'bar',
};

/** `edit`: the guide of an existing kitchen (/kupac/vodic, from Prostor's menu) — the guide filled with its answers; rebuilding keeps the kitchen's id. */
export function CustomerStart({ edit }: { edit?: boolean }) {
  const navigate = useNavigate();
  const setProject = useProject(s => s.setProject);
  const current = useProject(s => (edit ? s.project : null));
  const a0: Answers = { ...START, ...(current?.guide as Partial<Answers> | undefined) };
  const [step, setStep] = useState(1);
  const [shape, setShape] = useState<ShapeId>(a0.shape);
  const [len, setLen] = useState<Record<Wall, number>>(a0.len);
  const [place, setPlace] = useState<Record<PlaceId, [Wall, number]>>(a0.place);
  const [want, setWant] = useState<Record<WantId, string>>(a0.want);
  const [look, setLook] = useState(a0.look);
  const [handle, setHandle] = useState<OpeningKind>(a0.handle);
  const [error, setError] = useState('');

  const walls: Wall[] = shape === 'U' ? ['A', 'B', 'C'] : shape === 'L' ? ['A', 'B'] : ['A'];
  const wallOf = (id: PlaceId): Wall => (walls.includes(place[id][0]) ? place[id][0] : 'A');
  const wantText = (k: WantId) => WANTS.find(w => w[0] === k)![2].find(o => o[0] === want[k])![1];
  const shapeName = SHAPES.find(x => x[0] === shape)![1];

  // Plan preview (same drawing as the design): 400 × 300, wall A on top, B down the left, C down the right.
  const sc = Math.min(290 / Math.max(len.A, 100), shape === 'line' || shape === 'island' ? 1 : 210 / Math.max(len.B, len.C, 100));
  const x0 = 70, y0 = 60, wA = Math.round(len.A * sc), hB = Math.round(len.B * sc), hC = Math.round(len.C * sc), d = Math.round(60 * sc);
  let wallPath = `M${x0} ${y0}H${x0 + wA}`, units = `M${x0} ${y0}h${wA}v${d}h${-wA}Z`;
  if (shape === 'L' || shape === 'U') { wallPath = `M${x0} ${y0 + hB}V${y0}H${x0 + wA}`; units += ` M${x0} ${y0 + d}h${d}v${hB - d}h${-d}Z`; }
  if (shape === 'U') { wallPath += `V${y0 + hC}`; units += ` M${x0 + wA - d} ${y0 + d}h${d}v${hC - d}h${-d}Z`; }
  const pos = (w: Wall, from: number): [number, number] => {
    const t = Math.round(from * sc);
    return w === 'A' ? [x0 + Math.min(t, wA), y0] : w === 'B' ? [x0, y0 + Math.min(t, hB)] : [x0 + wA, y0 + Math.min(t, hC)];
  };

  function build() {
    const cm = (v: number) => Math.round(v * 10);
    const input: QuickStartInput = {
      shape: shape === 'L' ? 'L' : shape === 'U' ? 'U' : 'I',
      a: cm(len.A), b: shape === 'L' || shape === 'U' ? cm(len.B) : undefined, c: shape === 'U' ? cm(len.C) : undefined,
      water: wallOf('water') === 'A' ? cm(place.water[1]) : undefined,
      power400: wallOf('power') === 'B' ? cm(place.power[1]) : undefined,
      window: wallOf('window') === 'A' ? { offset: cm(place.window[1]), width: 1000 } : undefined,
      dishwasher: want.dw !== 'none', fridge: want.fridge !== 'none', wallUnits: want.upper === 'yes', island: shape === 'island',
    };
    const layout = autoLayout(input, PRESETS.en1116, DEFAULT_ELEMENT_MATERIALS);
    if (layout.error) { setError(layout.error.replace(/(\d+)0 mm/, '$1 cm')); setStep(2); return; } // e.g. wall A too short for U
    setProject({
      id: current?.id ?? newProjectId(), name: `Moja kuhinja — ${shapeName}`, guide: { shape, len, place, want, look, handle }, unit: 'cm', presetId: 'en1116',
      room: quickStartRoom(input), elements: layout.elements, rules: DEFAULT_RULES, materials: DEFAULT_MATERIALS,
      opening: { kind: handle },
    });
    navigate('/kupac/kuhinja');
  }

  const swatch = (c: string): CSSProperties => ({ borderRadius: 4, border: '1px solid #DDD8CE', background: c });
  const plan = (
    <svg viewBox="0 0 400 300" role="img" aria-label={`Osnova: ${shapeName}, zid A ${len.A} cm`} className="h-auto w-full rounded-lg bg-[#FAF8F4] max-md:rounded-[10px] max-md:border max-md:border-solid max-md:border-border max-md:bg-white">
      <path d={wallPath} fill="none" stroke="#1C1B19" strokeWidth="8" strokeLinecap="square" />
      <path d={units} fill="#EADBC4" stroke="#1C1B19" strokeWidth="1.2" />
      {shape === 'island' && <rect x="160" y="170" width="120" height="50" fill="#EADBC4" stroke="#1C1B19" strokeWidth="1.2" />}
      {PLACES.map(([id, , letter, fill, ink]) => {
        const [x, y] = pos(wallOf(id), place[id][1]);
        return <g key={id}><circle cx={x} cy={y} r="10" fill={fill} stroke="#FFFFFF" strokeWidth="2" /><text x={x} y={y + 4} textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fontWeight="700" fill={ink}>{letter}</text></g>;
      })}
      <text x={x0 + wA / 2} y="30" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="13" fill="#5F5A52">A · {len.A} cm</text>
      {(shape === 'L' || shape === 'U') && <text x="34" y={y0 + hB / 2} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="13" fill="#5F5A52" transform={`rotate(-90 34 ${y0 + hB / 2})`}>B · {len.B} cm</text>}
    </svg>
  );
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="max-md:hidden"><CustomerHeader title={current ? 'Moja kuhinja · prostor' : 'Nova kuhinja'} /></div>
      <PhoneHeader role="kupac" n={1} total={5} title="Prostor" />
      <main className="mx-auto box-border flex w-full max-w-[1160px] flex-col gap-5 px-5 pt-7 pb-10 max-md:flex-1 max-md:px-4 max-md:pt-5 max-md:pb-4">
        {current && <div role="note" className="flex flex-wrap items-center gap-3 rounded-lg bg-warn-soft px-4 py-3 text-[14.5px] text-warn-ink">
          <span className="min-w-0 flex-1">Ovo su odgovori za tvoju kuhinju. „Složi ponovo“ pravi raspored iznova — tvoje izmene u rasporedu se gube.</span>
          <Link to="/kupac/kuhinja" className="font-semibold text-warn-ink">← Nazad na raspored bez izmena</Link>
        </div>}
        <div className="flex flex-col gap-2.5 max-md:hidden">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h1 className="m-0 text-[28px]">Tvoja kuhinja u 5 pitanja</h1>
            <span className="text-[15px] text-muted-foreground">Pitanje {step} od 5 · bez naloga, besplatno</span>
          </div>
          <div role="progressbar" aria-label="Napredak vodiča" aria-valuemin={0} aria-valuemax={5} aria-valuenow={step} className="h-1.5 overflow-hidden rounded-[3px] bg-border">
            <div className="h-full bg-primary" style={{ width: `${step * 20}%` }} />
          </div>
          <ol aria-label="Pitanja" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {CRUMBS.map((t, i) => {
              const n = i + 1, cur = n === step, done = n < step;
              return (
                <li key={t}><button type="button" onClick={() => setStep(n)} aria-current={cur ? 'step' : undefined}
                  className={cn('min-h-9 cursor-pointer rounded-[18px] px-3 font-sans text-[13px] font-medium',
                    cur ? 'border border-solid border-dark bg-dark text-white' : done ? 'border border-solid border-accent-on-dark bg-accent-soft text-accent-ink' : 'border border-solid border-border bg-white text-muted-foreground')}>{n} {t}</button></li>
              );
            })}
          </ol>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-5 max-md:flex-1 max-md:grid-cols-1">
          <section aria-labelledby="q-title" className="box-border flex min-h-[560px] flex-col gap-[18px] rounded-xl border border-solid border-border bg-white p-6 max-md:h-full max-md:min-h-0 max-md:gap-3.5 max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0">
            <div>
              <span className="text-[13px] text-muted-foreground md:hidden">Pitanje {step} od 5</span>
              <h2 id="q-title" className="m-0 text-[24px] max-md:text-[22px]">{Q[step - 1][0]}</h2>
              <p className="mt-1.5 mb-0 text-[15px] leading-[1.45] text-muted-foreground max-md:text-[14.5px]">{Q[step - 1][1]}</p>
            </div>

            {step === 1 && (
              <div role="radiogroup" aria-label="Oblik kuhinje" className="grid grid-cols-2 gap-3">
                {SHAPES.map(([id, name, hint, path]) => (
                  <button key={id} type="button" role="radio" aria-checked={shape === id} className={BIG(shape === id)} onClick={() => { setShape(id); setError(''); if (id === 'U') setLen(l => ({ ...l, A: Math.max(l.A, 340) })); }}>
                    <svg width="96" height="64" viewBox="0 0 96 64" aria-hidden="true"><path d={path} fill="none" stroke="#1C1B19" strokeWidth="7" strokeLinecap="square" />{id === 'island' && <rect x="34" y="40" width="28" height="12" fill="#EADBC4" stroke="#1C1B19" strokeWidth="2" />}</svg>
                    <span className="text-[17px] font-semibold">{name}</span>
                    <span className="text-[13px] text-muted-foreground">{hint}</span>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-3.5">
                {error && <div role="alert" className="rounded-lg bg-warn-soft px-3 py-2.5 text-[14px] text-warn-ink">{error}</div>}
                {walls.map(w => (
                  <label key={w} className="flex flex-col gap-1.5 text-[15px] font-medium">{WALL_LABEL[w]}
                    <span className="flex items-center gap-2">
                      <button type="button" className={STEP_BTN} aria-label={`Zid ${w} kraći 10 cm`} onClick={() => setLen({ ...len, [w]: Math.max(60, len[w] - 10) })}>−</button>
                      {/* Phone: value and "cm" share one wide box (design PlanerTelefon); desktop: the wrapper is display: contents. */}
                      <span className="flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-[10px] border border-solid border-line-strong bg-white md:contents">
                        <input type="number" inputMode="numeric" value={len[w]} onChange={e => setLen({ ...len, [w]: parseInt(e.target.value, 10) || len[w] })}
                          className="box-border h-[52px] w-[140px] rounded-lg border border-solid border-line-strong px-3 font-mono text-[22px] font-medium text-foreground max-md:h-auto max-md:w-[4ch] max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:text-right max-md:font-semibold" />
                        <span className="text-[16px] text-muted-foreground max-md:font-mono max-md:text-[22px] max-md:font-semibold max-md:text-foreground">cm</span>
                      </span>
                      <button type="button" className={STEP_BTN} aria-label={`Zid ${w} duži 10 cm`} onClick={() => setLen({ ...len, [w]: len[w] + 10 })}>+</button>
                    </span>
                  </label>
                ))}
                <div className="flex items-start gap-2.5 rounded-lg bg-accent-lightest px-3.5 py-3 text-[14px] leading-[1.45] text-accent-ink max-md:hidden">
                  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="mt-px flex-none"><rect x="2" y="7" width="16" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5 7v3M8 7v2M11 7v3M14 7v2" stroke="currentColor" strokeWidth="1.3" /></svg>
                  <span>Izmeri metrom od ugla do ugla, uz pod. Ne mora biti tačno do milimetra — stolar će sve izmeriti na licu mesta pre ponude.</span>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-2.5">
                {PLACES.map(([id, name, letter, bg, ink]) => (
                  <div key={id} className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-[10px] border border-solid border-border p-3">
                    <span aria-hidden="true" className="inline-flex size-9 items-center justify-center rounded-full border border-solid border-line-strong text-[14px] font-bold" style={{ background: bg, color: ink }}>{letter}</span>
                    <span className="text-[16px] font-semibold">{name}</span>
                    <span />
                    <span className="flex flex-wrap items-center gap-2">
                      <span role="radiogroup" aria-label={`${name}: zid`} className="inline-flex overflow-hidden rounded-lg border border-solid border-line-strong">
                        {walls.map(w => {
                          const on = wallOf(id) === w;
                          return <button key={w} type="button" role="radio" aria-checked={on} onClick={() => setPlace({ ...place, [id]: [w, place[id][1]] })}
                            className={cn('min-h-11 cursor-pointer border-0 px-3.5 font-sans text-[14px] font-medium', on ? 'bg-primary text-white' : 'bg-white text-foreground')}>Zid {w}</button>;
                        })}
                      </span>
                      <label className="inline-flex items-center gap-1.5 text-[14px] text-muted-foreground">od levog ugla
                        <input type="number" value={place[id][1]} onChange={e => setPlace({ ...place, [id]: [place[id][0], parseInt(e.target.value, 10) || 0] })}
                          className="box-border h-11 w-[84px] rounded-lg border border-solid border-line-strong px-2 font-mono text-[16px] font-medium" />cm</label>
                    </span>
                  </div>
                ))}
                <p className="m-0 text-[14px] text-muted-foreground">Ne znaš tačno? Ostavi kako je — kasnije možeš da pomeriš na planu.</p>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-2.5">
                {WANTS.map(([id, name, opts]) => (
                  <div key={id} className="flex flex-col gap-2 rounded-[10px] border border-solid border-border px-3.5 py-3">
                    <span className="text-[16px] font-semibold">{name}</span>
                    <span role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
                      {opts.map(([v, t]) => <button key={v} type="button" role="radio" aria-checked={want[id] === v} className={CHOICE(want[id] === v)} onClick={() => setWant({ ...want, [id]: v })}>{t}</button>)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {step === 5 && (
              <div className="flex flex-col gap-4">
                <div role="radiogroup" aria-label="Izgled" className="grid grid-cols-3 gap-2.5">
                  {LOOKS.map(([id, name, c]) => (
                    <button key={id} type="button" role="radio" aria-checked={look === id} className={cn(BIG(look === id), 'min-h-[130px]')} onClick={() => setLook(id)}>
                      <span aria-hidden="true" className="grid h-[70px] w-full grid-cols-2 gap-[3px]">{c.map((x, i) => <span key={i} style={swatch(x)} />)}</span>
                      <span className="text-[16px] font-semibold">{name}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <div className="mb-2 text-[16px] font-semibold">Ručke</div>
                  <span role="radiogroup" aria-label="Ručke" className="flex flex-wrap gap-2">
                    {HANDLES.map(([v, t]) => <button key={v} type="button" role="radio" aria-checked={handle === v} className={CHOICE(handle === v)} onClick={() => setHandle(v)}>{t}</button>)}
                  </span>
                </div>
                <p className="m-0 text-[14px] text-muted-foreground">Boje i ručke menjaš kasnije u 3D prikazu koliko god hoćeš.</p>
              </div>
            )}

            {step > 1 && <div className="md:hidden">{plan}</div>}

            <div className="mt-auto flex flex-wrap gap-2.5 max-md:gap-2">
              {step > 1 && <Button variant="outline" size="none" className="min-h-[52px] rounded-lg border-line-strong bg-white px-[22px] text-[16px] font-semibold text-foreground" onClick={() => setStep(step - 1)}>Nazad</Button>}
              <Button size="none" className="min-h-[52px] flex-1 rounded-lg px-[22px] text-[17px] font-semibold" onClick={() => (step < 5 ? setStep(step + 1) : build())}>{step < 5 ? 'Dalje' : current ? 'Složi ponovo' : 'Složi moju kuhinju'}</Button>
            </div>
          </section>

          <aside aria-label="Pregled" className="flex flex-col gap-3.5 rounded-xl border border-solid border-border bg-white p-5 max-md:hidden">
            <div className="flex items-baseline gap-2">
              <h2 className="m-0 text-[17px]">Pregled</h2>
              <span className="text-[13px] text-muted-foreground">osnova odozgo · menja se dok odgovaraš</span>
            </div>
            {plan}
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-2 text-[14px]">
              {([['Oblik', shapeName], ['Zidovi', walls.map(w => `${w} ${len[w]} cm`).join(' · ')],
                ['Aparati', `Rerna: ${wantText('oven').toLowerCase()} · frižider: ${wantText('fridge').toLowerCase()} · MSP: ${wantText('dw').toLowerCase()}`],
                ['Gornji', wantText('upper')], ['Izgled', `${LOOKS.find(l => l[0] === look)![1]} · ${HANDLES.find(h => h[0] === handle)![1].toLowerCase()}`]] as const).map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="m-0 font-medium">{v}</dd></div>
              ))}
            </dl>
            <p className="m-0 text-[13px] leading-[1.45] text-muted-foreground">Posle 5. pitanja Kroj sam složi elemente po pravilima struke. Sve možeš da promeniš — dodaš, zameniš, obrišeš.</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
