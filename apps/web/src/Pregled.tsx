// Customer step 4 "Pregled" (design/screens/Pregled.html): summary of the project, example price range (moved here from
// Raspored), who sees the kitchen (Javno / Privatno), and the account offer. Everything shown is derived from the project;
// the picture is the app's own isometric view of it, not the reference's stylised mock.
// shortcut: visibility, Google and e-mail sign-in are UI only (local state, nothing is saved to an account); they get wired
// when customer accounts come to apps/api.
import { DEFAULT_QUOTE, EXAMPLE_PRICES, layoutIssues, quote } from 'engine';
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FRONTS, realPalette } from './look';
import { kitchenWalls, nameOf, PlannerHeader, upper } from './Planner';
import { Iso } from './Scene3D';
import { useProject } from './store';

const HANDLE: Record<string, string> = { bar: 'šipka', knob: 'dugme', profile: 'profil', push: 'bez ručki' };
const LAYERS = { walls: true, carcass: true, fronts: true, tops: true, dims: false };
const VIS = [
  { id: 'public', t: 'Javno', badge: 'besplatno', d: 'Kuhinja se pojavljuje u galeriji Inspiracija bez tvojih ličnih podataka. Drugi mogu da naprave sličnu.' },
  { id: 'private', t: 'Privatno', badge: 'uz Plus ili [CENA]', d: 'Vidiš samo ti i stolari kojima je pošalješ. Jednokratno „Privatno“ sada, ili ostavi javno — Plus pri slanju stolaru je sklanja iz galerije.' },
] as const;
const CARD = 'rounded-xl border border-solid border-border bg-white p-4';
const cm = (mm: number) => Math.round(mm / 10);
// Amounts are in para (integer cents); shown as a range rounded to 10.000 RSD.
const rsd = (para: number) => (Math.round(para / 100 / 10000) * 10000).toLocaleString('sr-Latn').replace(/,/g, '.');

export function Pregled() {
  const project = useProject(s => s.project);
  const [vis, setVis] = useState<'public' | 'private'>('public');
  const [saved, setSaved] = useState(false);
  const [pal] = useState(() => project && realPalette(project));
  if (!project || !pal) return <Navigate to="/kupac" replace />;

  const pub = vis === 'public';
  const shape = project.name.replace(/^Moja kuhinja — /, '');
  const size = kitchenWalls(project).map(w => cm(w.length)).join(' × ');
  const floor = project.elements.filter(e => !upper(e) && e.kind !== 'filler'), uppers = project.elements.filter(upper);
  const front = FRONTS.find(f => f[2].id === project.elements[0]?.materials.front)?.[0] ?? 'Bela mat';
  const look = [front, HANDLE[project.opening?.kind ?? 'bar'], (project.look?.worktop ?? 'Hrast').toLowerCase()];
  const stats = [['Oblik i mere', `${shape} · ${size} cm`], ['Elementi', `${floor.length} donjih i visokih · ${uppers.length} gornja`], ['Izgled', look.join(' · ')]];
  const items: [string, string][] = [
    ...floor.map(e => [nameOf(e), `${cm(e.width)} cm`] as [string, string]),
    ...(uppers.length ? [[`Gornji (${uppers.length})`, `${uppers.map(e => cm(e.width)).join(' + ')} cm`] as [string, string]] : []),
  ];
  const issues = layoutIssues(project);
  const q = quote(project, EXAMPLE_PRICES, DEFAULT_QUOTE);

  return (
    <div className="flex min-h-[900px] flex-col bg-background text-foreground">
      <PlannerHeader project={project} role="kupac" step={4} live={false}
        right={<div className="justify-self-end text-[13px] text-[#D8D3C9]">{saved ? 'Sačuvano u nalogu' : 'Sačuvano u ovom pregledaču'}</div>} />
      <main className="mx-auto box-border grid w-full max-w-[1280px] grid-cols-[minmax(0,1fr)_420px] items-start gap-6 px-5 pt-6 pb-10">
        <section aria-labelledby="sum-h" className="flex min-w-0 flex-col gap-4">
          <div>
            <h1 id="sum-h" className="m-0 text-[28px]">Pregled tvoje kuhinje</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Proveri da li je sve kako treba. Posle ovoga biraš stolara — ili samo sačuvaš i vratiš se kasnije.</p>
          </div>
          <div className="relative h-[340px] overflow-hidden rounded-xl border border-solid border-border bg-[linear-gradient(180deg,#F7F4EE_0_48%,#E9E3D8_48%_100%)] [&>svg]:!h-full [&>svg]:!max-h-none [&>svg]:!max-w-none">
            <Iso project={project} solid inst={false} sel={null} onSel={() => {}} layers={LAYERS} worktopThickness={38} pal={pal} />
            <span className="absolute bottom-2.5 left-3 rounded bg-white/90 px-2 py-[3px] text-[12px] text-ink-2">3D · {look[0]}, ručke {look[1]}, radna ploča {look[2]}</span>
            <Link to="/kupac/izgled" className="absolute right-3 bottom-2.5 rounded-md bg-white px-2.5 py-1.5 text-[13px] font-semibold no-underline">Otvori u 3D</Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {stats.map(([k, v]) => (
              <div key={k} className="rounded-[10px] border border-solid border-border bg-white px-3.5 py-3"><div className="text-[13px] text-muted-foreground">{k}</div><div className="mt-0.5 text-[18px] font-semibold">{v}</div></div>
            ))}
          </div>
          <div className={cn(CARD, 'flex flex-col gap-2.5')}>
            <div className="flex items-center gap-2"><h2 className="m-0 text-[17px]">Šta je u kuhinji</h2><Link to="/kupac/kuhinja" className="ml-auto text-[14px]">Izmeni raspored</Link></div>
            <ul className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-1.5 p-0 text-[14px]">
              {items.map(([n, w], i) => <li key={i} className="flex gap-2 border-0 border-b border-solid border-[#F0ECE4] py-[5px]"><span>{n}</span><span className="ml-auto text-muted-foreground">{w}</span></li>)}
            </ul>
            {issues.length > 0 && (
              <div role="status" className="flex items-center gap-2 rounded-lg bg-[#FBE3D3] px-3 py-[9px] text-[13.5px] text-[#7C2D0A]">
                <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="flex-none"><path d="M9 2l7.5 13h-15z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 7v4M9 13v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                {issues.length} {issues.length === 1 ? 'napomena' : 'napomene'}: {issues[0].text} Stolar će to proveriti — ne smeta za slanje.
              </div>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-3.5">
          <section aria-labelledby="pr-h" className={cn(CARD, 'flex flex-col gap-1.5')}>
            <h2 id="pr-h" className="m-0 text-[16px]">Primer cene</h2>
            <div className="font-mono text-[22px] font-bold">{rsd(q.total * 0.9)} – {rsd(q.total * 1.08)} RSD</div>
            <p className="m-0 text-[13px] leading-[1.45] text-ink-2">Sa materijalom [PARTNER], montaža uključena. <strong>Nije ponuda</strong> — konačnu cenu daje stolar posle merenja.</p>
          </section>

          <section aria-labelledby="vis-h" className={cn(CARD, 'flex flex-col gap-2.5')}>
            <h2 id="vis-h" className="m-0 text-[16px]">Ko vidi ovu kuhinju</h2>
            <div role="radiogroup" aria-labelledby="vis-h" className="flex flex-col gap-2">
              {VIS.map(v => {
                const on = vis === v.id;
                return (
                  <button key={v.id} type="button" role="radio" aria-checked={on} onClick={() => setVis(v.id)}
                    className={cn('flex cursor-pointer items-start gap-3 rounded-[10px] p-3 font-sans text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                      on ? 'border-2 border-solid border-primary bg-accent-lightest' : 'border border-solid border-border bg-white')}>
                    <span aria-hidden="true" className={cn('mt-px box-border inline-flex size-5 flex-none items-center justify-center rounded-full border-2 border-solid', on ? 'border-primary' : 'border-muted-2')}>
                      {on && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                    <span className="flex flex-col gap-[3px] text-left">
                      <span className="flex items-center gap-2"><strong className="text-[15px]">{v.t}</strong>
                        <span className={cn('rounded-lg px-[7px] py-0.5 text-[11.5px] font-semibold', v.id === 'public' ? 'bg-accent-soft text-accent-ink' : 'bg-wood-birch text-wood-bark')}>{v.badge}</span></span>
                      <span className="text-[13px] leading-[1.45] text-ink-2">{v.d}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <details className="text-[13px] text-ink-2">
              <summary className="flex min-h-[30px] cursor-pointer items-center font-medium text-accent-ink">Šta se tačno objavljuje</summary>
              <div className="mt-1.5 grid grid-cols-2 gap-2.5 leading-normal">
                <div><strong>Vidi se:</strong> osnova, 3D, elementi, dekori, približne mere, grad (ako uključiš)</div>
                <div><strong>Nikad:</strong> ime, adresa, kontakt, fotografije prostorije, ponude i poruke</div>
              </div>
            </details>
          </section>

          <section aria-labelledby="acc-h" className={cn(CARD, 'flex flex-col gap-2.5')}>
            {!saved ? (
              <>
                <h2 id="acc-h" className="m-0 text-[16px]">Sačuvaj da se ne izgubi</h2>
                <p className="m-0 text-[13px] text-muted-foreground">Do sada je sve sačuvano samo u ovom pregledaču. Nalog je besplatan.</p>
                <Button variant={null} size="none" className="min-h-[46px] gap-2.5 rounded-lg border border-solid border-line-strong bg-white text-[15px] font-semibold text-foreground">
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="#3D3A35" strokeWidth="1.5" /><path d="M9 9h5" stroke="#3D3A35" strokeWidth="1.5" /></svg>Nastavi sa Google nalogom
                </Button>
                <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">ili e-pošta
                  <Input type="email" placeholder="ana@primer.rs" className="min-h-11 rounded-lg border-line-strong px-3 text-[15px] text-foreground" /></label>
                <Button variant={null} size="none" onClick={() => setSaved(true)} className="min-h-12 rounded-lg bg-primary text-[16px] font-semibold text-white">
                  {pub ? 'Sačuvaj kuhinju' : 'Sačuvaj i plati „Privatno“ — [CENA]'}
                </Button>
                <p className="m-0 text-[12px] text-muted-foreground">Šaljemo link za prijavu, bez lozinke.</p>
              </>
            ) : (
              <>
                <h2 id="acc-h" className="m-0 text-[16px]">Sačuvano</h2>
                <p className="m-0 text-[14px] leading-[1.45] text-ink-2">{pub
                  ? 'Kuhinja je sačuvana i biće javna u galeriji. Privatnost možeš da uključiš i kasnije (Plus ili „Privatno“).'
                  : 'Kuhinja je sačuvana kao privatna. Kad je šalješ stolaru, Plus ti ne naplaćuje privatnost ponovo.'}</p>
                <Link to="/kupac/posalji" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary text-[16px] font-semibold text-white no-underline hover:text-white">Dalje: izaberi stolara</Link>
                <Link to="/inspiracija" className="inline-flex min-h-[30px] items-center justify-center text-center text-[14px]">Samo sačuvaj, vratiću se kasnije</Link>
              </>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}
