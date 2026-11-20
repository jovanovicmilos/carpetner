// Customer editor (design/screens/KupacEditor.html): the same project model as the workshop editor, simplified — catalog units
// only, widths from a fixed list, measures in cm, "+ Dodaj" goes to the first free spot of the chosen wall, warnings in plain words.
// The plan is the app's own plan drawing (Plan.tsx) of the real project, not the reference's stylised mock.
import {
  DEFAULT_ELEMENT_MATERIALS, DEFAULT_QUOTE, EXAMPLE_PRICES, firstFreeOffset, labelPrefix, layoutIssues, makeElement, nextId, PRESETS,
  quote, roomWalls, verticalRange, type Element, type Project,
} from 'engine';
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BRAND, BrandMark } from './brand';
import { LIBRARY, type LibItem } from './library';
import { fitView, Plan } from './Plan';
import { useSession } from './session';
import { useProject } from './store';

type Kind = 'corner' | 'sink' | 'dw' | 'drawers' | 'base' | 'oven' | 'fridge' | 'pantry' | 'upper';
/** Customer catalog (design K): name, plan colour, widths in cm, what it can be swapped with, catalog item (fixtures/katalog.json). */
const K: Record<Kind, { name: string; color: string; widths: number[]; swaps: Kind[]; key: string }> = {
  corner: { name: 'Ugaoni donji', color: '#EADBC4', widths: [90, 100, 110], swaps: ['sink', 'base'], key: 'corner1000' },
  sink: { name: 'Sudopera', color: '#C9DAF2', widths: [60, 80, 90, 100], swaps: ['base', 'drawers'], key: 'sink800' },
  dw: { name: 'Mašina za sudove', color: '#FFFFFF', widths: [45, 60], swaps: ['base', 'drawers'], key: 'dw600' },
  drawers: { name: 'Fioke (3)', color: '#EADBC4', widths: [40, 50, 60, 80], swaps: ['base', 'sink'], key: 'drawer600' },
  base: { name: 'Donji sa krilima', color: '#EADBC4', widths: [30, 40, 45, 50, 60, 80], swaps: ['drawers', 'sink'], key: 'base600' },
  oven: { name: 'Visoki sa rernom', color: '#D6BE98', widths: [60], swaps: ['fridge', 'pantry'], key: 'tallOF' },
  fridge: { name: 'Frižider ugradni', color: '#D6BE98', widths: [60], swaps: ['oven', 'pantry'], key: 'tallFr' },
  pantry: { name: 'Visoki ostava', color: '#D6BE98', widths: [40, 50, 60], swaps: ['oven', 'fridge'], key: 'tall600' },
  upper: { name: 'Gornji', color: '#E2EFE6', widths: [30, 40, 60, 80], swaps: ['base'], key: 'up600' },
};
const TABS: [string, string, Kind[]][] = [['donji', 'Donji', ['base', 'drawers', 'sink', 'dw', 'corner']], ['visoki', 'Visoki', ['oven', 'fridge', 'pantry']], ['gornji', 'Gornji', ['upper']]];

/** Customer kind of a unit (also of units made by autoLayout or the workshop, which have no customer kind). */
function kindOf(e: Element): Kind | null {
  const byKey = (Object.keys(K) as Kind[]).find(k => K[k].key === e.catalogKey);
  if (byKey) return byKey;
  switch (e.kind) {
    case 'corner-blind': return 'corner';
    case 'sink': return 'sink';
    case 'appliance-front': return 'dw';
    case 'drawer': return 'drawers';
    case 'base': return 'base';
    case 'wall': return 'upper';
    case 'tall': return e.front?.some(r => r.appliance === 'fridge') ? 'fridge' : e.front?.some(r => r.appliance?.startsWith('oven')) ? 'oven' : 'pantry';
    default: return null; // filler, oven under the hob: shown, can be removed, not changed here
  }
}
const nameOf = (e: Element) => { const k = kindOf(e); return k ? K[k].name : e.kind === 'filler' ? 'Filer' : e.kind === 'oven' ? 'Rerna ispod ploče' : e.label; };
const upper = (e: Element) => e.kind === 'wall';
const item = (k: Kind) => LIBRARY.find(i => i.key === K[k].key) as Extract<LibItem, { type: 'el' }>;
const dims = PRESETS.en1116;
const newUnit = (k: Kind, wallId: string, offset: number, width: number, id: string): Element =>
  ({ ...makeElement(item(k).kind, wallId, offset, width, id, dims, DEFAULT_ELEMENT_MATERIALS), ...item(k).template, width });

/** Units after `e` on the same wall and layer move by `delta` (customers think in a row of units, not free positions). */
const shiftAfter = (els: Element[], e: Element, delta: number) =>
  els.map(x => x.id !== e.id && x.wallId === e.wallId && upper(x) === upper(e) && x.offset > e.offset ? { ...x, offset: x.offset + delta } : x);

/** Walls with units, A first (the customer's "Zid A, zid B"). */
const kitchenWalls = (p: Project) => roomWalls(p.room)
  .filter(w => w.id === 'A' || (['B', 'C'].includes(w.id) && p.elements.some(e => e.wallId === w.id))).sort((a, b) => a.id.localeCompare(b.id));

const STEPS: [string, string][] = [['Prostor', '/kupac'], ['Kuhinja', '/kupac/kuhinja'], ['Izgled', '/kupac/izgled'], ['Pošalji stolaru', '/kupac/posalji'], ['Ponuda', '/kupac/ponude']];

/** Customer project header: logo + project, 5 steps (same stepper as the workshop's), saved state + account. */
export function CustomerProjectHeader({ project, step }: { project: Project; step: number }) {
  const user = useSession(s => s.session?.user);
  const size = kitchenWalls(project).map(w => Math.round(w.length / 10)).join(' × ');
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 bg-dark px-5 py-2.5 text-background">
      <div className="flex min-w-0 items-center gap-3.5">
        <Link to="/kupac" aria-label={`${BRAND.name} — moje kuhinje`} className="flex items-center gap-2.5 text-inherit no-underline hover:text-inherit">
          <BrandMark /><span className="text-[18px] font-bold tracking-[0.02em]">{BRAND.name}</span>
        </Link>
        <span className="truncate text-[14px] text-[#D8D3C9]">Moja kuhinja · <strong className="font-semibold text-white">{project.name.replace(/^Moja kuhinja — /, '')} {size}</strong></span>
      </div>
      <nav aria-label="Koraci" className="flex items-center gap-1">
        {STEPS.map(([t, to], i) => {
          const n = i + 1, done = n < step, cur = n === step;
          return (
            <span key={t} className="contents">
              {i > 0 && <span aria-hidden="true" className={cn('h-0.5 w-3.5', n <= step ? 'bg-accent-on-dark' : 'bg-dark-line')} />}
              <Link to={to} aria-current={cur ? 'step' : undefined} aria-label={`Korak ${n} od 5: ${t} — ${done ? 'završeno' : cur ? 'u toku' : 'nije započeto'}`}
                className={cn('inline-flex min-h-9 items-center gap-2 rounded-[18px] px-2.5 text-[14px] text-background no-underline hover:bg-dark-hover hover:text-white', cur && 'bg-background font-semibold text-foreground hover:bg-background hover:text-foreground')}>
                {done
                  ? <span aria-hidden="true" className="inline-flex size-[22px] items-center justify-center rounded-full bg-accent-on-dark"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#1C1B19" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  : <span aria-hidden="true" className={cn('box-border inline-flex size-[22px] items-center justify-center rounded-full border-[1.5px] border-solid font-mono text-[11px] font-semibold', cur ? 'border-primary' : 'border-muted-2 text-[#BDB6AA]')}>{n}</span>}
                {t}
              </Link>
            </span>
          );
        })}
      </nav>
      <div className="flex items-center gap-2.5 justify-self-end">
        <span className="text-[13px] text-[#D8D3C9]">Sačuvano</span>
        <Link to="/prijava" className="text-[14px] text-background hover:text-white">{user ? user.name : 'Prijavi se'}</Link>
      </div>
    </header>
  );
}

export function CustomerEditor() {
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const [tab, setTab] = useState('donji');
  const [wall, setWall] = useState('A');
  const [selId, setSelId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  if (!project) return <Navigate to="/kupac" replace />;

  const walls = kitchenWalls(project);
  const sel = project.elements.find(e => e.id === selId) ?? project.elements.find(e => !upper(e)) ?? null;
  const selKind = sel && kindOf(sel);
  const wallLen = (id: string) => roomWalls(project.room).find(w => w.id === id)?.length ?? 0;
  const used = (id: string) => project.elements.filter(e => e.wallId === id && !upper(e)).reduce((m, e) => Math.max(m, e.offset + e.width), 0);
  const cm = (mm: number) => Math.round(mm / 10);

  function add(k: Kind) {
    const w0 = K[k].widths[K[k].widths.length > 2 ? K[k].widths.length - 2 : 0] * 10;
    const id = nextId(project!.elements.map(e => e.id), labelPrefix(item(k).kind));
    const probe = newUnit(k, wall, 0, w0, id);
    const offset = firstFreeOffset(project!, wall, w0, verticalRange(probe));
    if (offset === null) { setMsg(`Na zidu ${wall} nema mesta za ${w0 / 10} cm. Suzi ili obriši jedan element.`); return; }
    change(p => ({ ...p, elements: [...p.elements, { ...probe, offset }] }));
    setSelId(id); setMsg('');
  }
  const setWidth = (w: number) => sel && (setMsg(''), change(p => ({ ...p, elements: shiftAfter(p.elements, sel, w - sel.width).map(x => x.id === sel.id ? { ...x, width: w } : x) })));
  const swap = (k: Kind) => sel && (setMsg(''), change(p => {
    const ws = K[k].widths.map(w => w * 10), w = ws.includes(sel.width) ? sel.width : ws[0];
    const fresh = { ...newUnit(k, sel.wallId, sel.offset, w, sel.id), label: sel.label, side: sel.side };
    return { ...p, elements: shiftAfter(p.elements, sel, w - sel.width).map(x => x.id === sel.id ? fresh : x) };
  }));
  const remove = () => { if (!sel) return; setMsg(''); change(p => ({ ...p, elements: shiftAfter(p.elements.filter(x => x.id !== sel.id), sel, -sel.width) })); setSelId(null); };

  // Plain-words warning: a wall run longer than the wall first, then the editor's own checks.
  const over = walls.find(w => used(w.id) > wallLen(w.id));
  const warn = msg || (over ? `Elementi na zidu ${over.id} su duži od zida (${cm(used(over.id))} od ${cm(wallLen(over.id))} cm). Suzi ili obriši jedan element.` : layoutIssues(project)[0]?.text ?? '');

  const q = quote(project, EXAMPLE_PRICES, DEFAULT_QUOTE);
  // Amounts are in para (integer cents); shown as a range rounded to 10.000 RSD.
  const round = (para: number) => (Math.round(para / 100 / 10000) * 10000).toLocaleString('sr-Latn').replace(/,/g, '.');
  const floor = project.elements.filter(e => !upper(e) && e.kind !== 'filler'), uppers = project.elements.filter(upper);
  const worktop = walls.reduce((s, w) => s + project.elements.filter(e => e.wallId === w.id && !upper(e) && e.kind !== 'tall').reduce((a, e) => a + e.width, 0), 0);
  const oven = project.elements.some(e => kindOf(e) === 'oven') ? 'rerna u visokom' : project.elements.some(e => e.kind === 'oven') ? 'rerna ispod ploče' : 'bez rerne';
  const fridge = project.elements.some(e => kindOf(e) === 'fridge') ? 'frižider ugradni' : 'frižider samostojeći ili bez';
  const widths = selKind ? K[selKind].widths : [];
  const wi = sel ? widths.indexOf(cm(sel.width)) : -1;
  const STEP_BTN = 'size-12 cursor-pointer rounded-lg border border-solid border-line-strong bg-white font-sans text-[22px] font-semibold disabled:cursor-default disabled:text-[#BDB6AA]';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <CustomerProjectHeader project={project} step={2} />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside aria-label="Dodaj element" className="flex min-h-0 flex-col border-0 border-r border-solid border-border bg-white">
          <div className="px-4 pt-4 pb-2.5">
            <h2 className="m-0 text-[17px]">Dodaj element</h2>
            <p className="mt-1 mb-0 text-[13px] text-muted-foreground">Klikni „Dodaj“ — ide na prvo slobodno mesto na izabranom zidu.</p>
            <div role="radiogroup" aria-label="Vrsta" className="mt-3 flex gap-1 rounded-lg bg-background p-[3px]">
              {TABS.map(([id, t]) => (
                <button key={id} type="button" role="radio" aria-checked={tab === id} onClick={() => setTab(id)}
                  className={cn('min-h-9 flex-1 cursor-pointer rounded-md border-0 font-sans text-[14px] font-medium', tab === id ? 'bg-white font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'bg-transparent text-muted-foreground')}>{t}</button>
              ))}
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto px-4 pt-1 pb-4">
            {TABS.find(t => t[0] === tab)![2].map(k => (
              <div key={k} className="flex flex-col items-center gap-1.5 rounded-[10px] border border-solid border-border p-2.5 text-center">
                <span aria-hidden="true" className="box-border flex h-14 w-16 items-center justify-center rounded-[3px] border-[1.2px] border-solid border-foreground" style={{ background: K[k].color }}>
                  <span className={k === 'drawers' ? 'h-0.5 w-[52px] bg-foreground shadow-[0_-14px_0_#1C1B19,0_14px_0_#1C1B19]' : k === 'sink' ? 'h-3.5 w-[34px] rounded-md border-[1.5px] border-solid border-foreground' : 'h-11 w-0.5 bg-foreground'} />
                </span>
                <span className="text-[14px] leading-tight font-semibold">{K[k].name}</span>
                <span className="text-[12px] text-muted-foreground">{K[k].widths.join(' / ')} cm</span>
                <button type="button" onClick={() => add(k)} aria-label={`Dodaj ${K[k].name} na zid ${wall}`}
                  className="min-h-9 w-full cursor-pointer rounded-md border border-solid border-primary bg-white font-sans text-[13px] font-semibold text-accent-ink">+ Dodaj</button>
              </div>
            ))}
          </div>
        </aside>

        <main aria-label="Plan kuhinje" className="relative flex min-h-0 min-w-0 flex-col bg-[#FAF8F4]">
          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
            <span role="radiogroup" aria-label="Zid na koji se dodaje" className="inline-flex overflow-hidden rounded-lg border border-solid border-line-strong bg-white">
              {walls.map(w => (
                <button key={w.id} type="button" role="radio" aria-checked={wall === w.id} onClick={() => setWall(w.id)}
                  className={cn('min-h-10 cursor-pointer border-0 px-3.5 font-sans text-[14px] font-medium', wall === w.id ? 'bg-primary text-white' : 'bg-white text-foreground')}>Dodaj na zid {w.id}</button>
              ))}
            </span>
            <span className="text-[13px] text-muted-foreground">mere u cm</span>
            <span className="ml-auto text-[13px] text-muted-foreground">{walls.map(w => `${w === walls[0] ? 'Zid' : 'zid'} ${w.id}: ${cm(used(w.id))} / ${cm(wallLen(w.id))} cm`).join(' · ')}</span>
          </div>
          <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-solid border-border bg-[#FAF8F4]">
            <Plan project={project} view={fitView(project)} unit="cm" showWallUnits={false} className="size-full"
              selection={sel ? { kind: 'el', id: sel.id } : undefined} onItemDown={s => { if (s.kind === 'el') setSelId(s.id); }} />
            <div className="absolute right-3.5 bottom-3.5 flex max-w-[260px] flex-col gap-1.5 rounded-lg border border-solid border-border bg-white px-3 py-2.5 text-[12px] text-ink-2">
              <span className="flex items-center gap-2"><span aria-hidden="true" className="size-3.5 rounded-full bg-water" />Voda i odvod</span>
              <span className="flex items-center gap-2"><span aria-hidden="true" className="size-3.5 rounded-full bg-[#F2B630]" />Struja za šporet</span>
              <span>Gornji elementi se vide u 3D (korak Izgled).</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
            {warn
              ? <div role="status" className="flex min-w-[260px] flex-1 items-start gap-2 rounded-lg bg-warn-soft px-3 py-2.5 text-[14px] leading-[1.4] text-warn-ink">
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="flex-none"><path d="M9 2l7.5 13h-15z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 7v4M9 13v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  <span>{warn}</span>
                </div>
              : <div role="status" className="flex-1 rounded-lg bg-ok-soft px-3 py-2.5 text-[14px] text-ok">Raspored izgleda dobro. Stolar će ga proveriti pre ponude.</div>}
            <Link to="/kupac/izgled" className="inline-flex min-h-[46px] items-center rounded-lg bg-primary px-5 text-[15px] font-semibold text-white no-underline hover:text-white">Dalje: izgled u 3D</Link>
          </div>
        </main>

        <aside aria-label="Izabrani element" className="flex flex-col gap-4 overflow-y-auto border-0 border-l border-solid border-border bg-white p-4">
          {sel && (
            <section className="flex flex-col gap-3">
              <div>
                <div className="text-[12px] font-semibold tracking-[0.06em] text-primary uppercase">Izabrano · zid {sel.wallId}</div>
                <h2 className="mt-0.5 mb-0 text-[20px]">{nameOf(sel)}</h2>
              </div>
              {selKind && <div>
                <div className="mb-1.5 text-[14px] text-muted-foreground">Širina</div>
                <div className="flex items-center gap-2">
                  <button type="button" className={STEP_BTN} aria-label="Uže" disabled={wi <= 0} onClick={() => setWidth(widths[wi - 1] * 10)}>−</button>
                  <output className="min-w-24 text-center font-mono text-[22px] font-semibold">{cm(sel.width)} cm</output>
                  <button type="button" className={STEP_BTN} aria-label="Šire" disabled={wi < 0 ? false : wi >= widths.length - 1} onClick={() => setWidth((wi < 0 ? widths.find(w => w * 10 > sel.width) ?? widths[0] : widths[wi + 1]) * 10)}>+</button>
                </div>
                <div className="mt-1.5 text-[13px] text-muted-foreground">Moguće širine: {widths.join(', ')} cm</div>
              </div>}
              {selKind && <div>
                <div className="mb-1.5 text-[14px] text-muted-foreground">Zameni sa</div>
                <div className="flex flex-wrap gap-1.5">
                  {K[selKind].swaps.map(k => <Button key={k} variant="outline" size="none" className="min-h-10 rounded-lg border-line-strong bg-white px-3 text-[14px] font-medium text-foreground" onClick={() => swap(k)}>{K[k].name}</Button>)}
                </div>
              </div>}
              <div className="flex gap-2">
                <Button variant="outline" size="none" className="min-h-11 flex-1 rounded-lg border-error bg-white text-[14px] font-semibold text-error" onClick={remove}>Obriši</Button>
                <Button variant="outline" size="none" disabled title="Posle slanja stolaru možeš da ostaviš pitanje na svakom elementu"
                  className="min-h-11 flex-1 rounded-lg border-border bg-background text-[14px] font-semibold text-muted-2 disabled:opacity-100">Pitaj stolara</Button>
              </div>
            </section>
          )}

          <section aria-labelledby="price-h" className="flex flex-col gap-2 rounded-[10px] border border-solid border-border p-3.5">
            <h2 id="price-h" className="m-0 text-[16px]">Primer cene</h2>
            <div className="font-mono text-[18px] font-semibold">oko {round(q.total * 0.9)} – {round(q.total * 1.08)} RSD</div>
            <p className="m-0 text-[13px] leading-[1.45] text-ink-2">Primer cene sa materijalom [PARTNER]. <strong>Nije ponuda</strong> — konačnu cenu daje stolar koga izabereš, posle pregleda projekta i merenja.</p>
            <details className="text-[13px] text-ink-2">
              <summary className="flex min-h-8 cursor-pointer items-center font-medium text-accent-ink">Šta može da promeni cenu</summary>
              <ul className="mt-1.5 mb-0 pl-[18px] leading-normal">
                <li>stvarne mere posle merenja</li><li>instalacije i zidovi koji nisu pod pravim uglom</li><li>materijal i rad izabranog stolara</li><li>prevoz i montaža</li>
              </ul>
            </details>
          </section>

          <section className="text-[13px] leading-[1.45] text-muted-foreground">
            <h2 className="mt-0 mb-1 text-[14px] text-foreground">Ukupno</h2>
            {floor.length} donjih i visokih elemenata, {uppers.length} gornja · radna ploča {cm(worktop)} cm · {oven}, {fridge}.
          </section>
        </aside>
      </div>
    </div>
  );
}
