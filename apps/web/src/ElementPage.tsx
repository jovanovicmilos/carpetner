// Element page, laid out as design/Element.dc.html: element chips, carcass drawing (front without fronts + section),
// construction rules, the element's cut list, hardware, dark summary; printable part labels.
import {
  backCutout, edgeCode, edgeTotals, format, frontRows, generateParts, hardware, makeElement, PRESETS, sheetEstimate,
  type ConstructionRules, type Element, type ElementKind, type Part, type Project, type Unit,
} from 'engine';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { LenField, NameField } from './fields';
import { Header } from './Header';
import { Tip } from './help';
import { KIND_NAME, num, ownName } from './labels';
import { useProject } from './store';
import { usePrices, workshopMaterials } from './prices';
import { SegmentedControl } from './ui';
import { useTemplates } from './templates';

const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
const decimal = (n: number, d = 2) => n.toLocaleString('sr-Latn', { maximumFractionDigits: d });
const TITLE: Record<Element['kind'], string> = {
  sink: 'Element za sudoperu', base: 'Donji element', drawer: 'Fiokar', oven: 'Element za rernu', 'corner-blind': 'Ugaoni element',
  'appliance-front': 'Fronta MSP', filler: 'Filer', tall: 'Visoki element', wall: 'Gornji element',
};
const LAYER: Record<Element['kind'], string> = {
  sink: 'donji', base: 'donji', drawer: 'donji', oven: 'donji', 'corner-blind': 'donji', 'appliance-front': 'donji', filler: 'donji', tall: 'visoki', wall: 'gornji',
};
const PIPES = new Set(['water', 'drain', 'gas']);

export function ElementPage() {
  const { id } = useParams();
  const { project, change } = useProject();
  const prices = usePrices();
  const addTemplate = useTemplates(s => s.add);
  const [tpl, setTpl] = useState<{ name: string; dims: boolean; mats: boolean; rules: boolean } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  if (!project) return <Navigate to="/" replace />;
  const el = project.elements.find(e => e.id === id);
  if (!el) return <Navigate to="/projekat" replace />;

  const unit = project.unit;
  const f = (mm: number) => format(mm, unit);
  const single: Project = { ...project, elements: [el] };
  const parts = generateParts(single);
  const hw = hardware(single);
  const areas = sheetEstimate(parts, project.materials, project.rules);
  const edges = edgeTotals(parts, project.rules);
  const matName = (m: string) => project.materials[m]?.name ?? m;
  const r = project.rules;

  const patch = (p: Partial<Element>) => change(pr => ({ ...pr, elements: pr.elements.map(e => (e.id === el.id ? { ...e, ...p } : e)) }));
  const setRules = (p: Partial<ConstructionRules>) => change(pr => ({ ...pr, rules: { ...pr.rules, ...p } }));
  const setKind = (kind: ElementKind) => change(pr => ({ ...pr, elements: pr.elements.map(e => (e.id !== el.id ? e
    : { ...makeElement(kind, e.wallId, e.offset, e.width, e.id, PRESETS[pr.presetId === 'none' ? 'workshop' : pr.presetId], e.materials), label: e.label, ...(e.side && { side: e.side }), ...(e.name && { name: e.name }), ...(e.note && { note: e.note }) })) }));
  const pieces = parts.flatMap(p => Array.from({ length: p.qty }, (_, i) => ({ ...p, n: i + 1 })));
  // Pipes behind the carcass: vertical band of the back cutout in the section.
  const bottom = el.kind === 'wall' ? el.elevation ?? 0 : el.legs ?? 0;
  const pipes = project.room.installations.filter(i => PIPES.has(i.kind) && i.wallId === el.wallId
    && i.offset >= el.offset && i.offset <= el.offset + el.width && i.height >= bottom && i.height <= bottom + el.height);
  const bc = backCutout(project, el);
  const cutout = bc ? { label: `${bc.w}×${bc.h}`, mid: bc.cy, h: bc.h } : null;
  const rank = (m: string) => (m === el.materials.carcass ? 0 : m === el.materials.front ? 1 : 2);
  const edgeLabel = edges.map(e => decimal(e.edge.thickness)).join(' / ');
  const edgeMeters = edges.map(e => decimal(e.meters, 1)).join(' / ');

  return (
    <div className="app app-fixed">
      <Header units />
      <div className="el-chips">
        <span className="el-chips-l">Elementi:</span>
        {project.elements.map(e => (
          <Link key={e.id} to={`/element/${e.id}`} className="el-chip" aria-current={e.id === el.id ? 'page' : undefined}>{e.label}</Link>
        ))}
        {/* Step Elementi (docs/TOK_PROJEKTA.md): the construction of each element is confirmed; any later change takes it back. */}
        <button type="button" className="tb-btn el-chips-r" aria-pressed={!!el.confirmedAt} title={el.confirmedAt ? 'Konstrukcija je potvrđena — klik poništava' : 'Potvrdi konstrukciju ovog elementa (korak 4 · Elementi)'}
          onClick={() => patch({ confirmedAt: el.confirmedAt ? undefined : new Date().toISOString() })}>{el.confirmedAt ? '✓ Potvrđeno' : 'Potvrdi konstrukciju'}</button>
        <button type="button" className="tb-btn" onClick={() => { setSaved(null); setTpl({ name: `${cap(KIND_NAME[el.kind])} ${el.width}${backCutout(project, el) ? ' sa izrezom' : ''}`, dims: true, mats: true, rules: false }); }}>Sačuvaj kao šablon</button>
      </div>

      <div className="el-body" key={el.id /* reset uncontrolled inputs per element */}>
        <div className="el-col">
          <div className="el-title">
            <h1>{el.label} · {TITLE[el.kind]}{ownName(el)}</h1>
            <span>{f(el.width)} × {f(el.height)} × {f(el.depth)} {unit} · {LAYER[el.kind]} · zid {el.wallId}</span>
          </div>

          <section className="card-w" aria-label="Crtež elementa">
            <h2 className="card-h">Konstrukcija — pogled spreda i presek<Tip k="element.drawing" align="right" /></h2>
            <CarcassDrawing el={el} rules={r} parts={parts} cutout={cutout} />
          </section>

          <section className="card-w" aria-label="Parametri konstrukcije">
            <h2 className="card-h">Pravila konstrukcije<Tip k="element.rules" align="left" /></h2>
            <div className="rule-grid">
              <Select label="Spoj" value={r.joint} onChange={v => setRules({ joint: v })} options={[
                ['dowel+confirmat', 'Tipl + konfirmat'], ['minifix', 'Ekscentar (minifix)', true], ['confirmat', 'Samo konfirmat', true]]} />
              <Select label="Pod" value={r.bottomMode} onChange={v => setRules({ bottomMode: v })} options={[
                ['between', 'Između stranica'], ['under', 'Ispod stranica']]} />
              <Select label="Poleđina" value={r.backMode} onChange={v => setRules({ backMode: v })} options={[
                ['nailed', `HDF 3 nabijena (−${r.backReduction} mm)`], ['groove', 'HDF 3 u nut', true], ['inset18', 'Iverica 18 upuštena', true]]} />
              <LenField label="Fuga fronti (mm)" value={r.frontGap} unit="mm" onCommit={v => setRules({ frontGap: Math.max(0, Math.min(10, v)) })} />
              <Select label="Kant korpusa" value={String(r.carcassEdge.thickness)} onChange={v => setRules({ carcassEdge: { ...r.carcassEdge, thickness: Number(v) } })} options={[
                ['0.8', 'ABS 0,8 · samo prednja ivica'], ['2', 'ABS 2 · prednja ivica']]} />
              <Select label="Kant fronti" value={String(r.frontEdge.thickness)} onChange={v => setRules({ frontEdge: { ...r.frontEdge, thickness: Number(v) } })} options={[
                ['2', 'ABS 2 · sve 4 ivice'], ['1', 'ABS 1 · sve 4 ivice']]} />
            </div>
            <label className="rule-check">
              <input type="checkbox" checked={r.deductEdgeFromCutMinThickness <= 1} onChange={e => setRules({ deductEdgeFromCutMinThickness: e.target.checked ? 1 : 100 })} />
              Mera za sečenje = gotova mera − debljina kanta (za kant ≥ 1 mm)
            </label>
            <label className="rule-check">
              <input type="checkbox" checked={r.followGrain} onChange={e => setRules({ followGrain: e.target.checked })} />
              Prati smer šare (godova) na frontama
            </label>
          </section>

          <MeasureCard el={el} unit={unit} materials={{ ...workshopMaterials(prices), ...project.materials }} onKind={setKind}
            onChange={p => {
              // A workshop material picked for the first time is copied into the project (the project keeps its own catalogue).
              const own = workshopMaterials(prices);
              const add = Object.values(p.materials ?? {}).filter((id): id is string => !!id && !project.materials[id] && !!own[id]);
              if (!add.length) { patch(p); return; }
              change(pr => ({ ...pr, materials: { ...pr.materials, ...Object.fromEntries(add.map(id => [id, own[id]])) },
                elements: pr.elements.map(e => (e.id === el.id ? { ...e, ...p } : e)) }));
            }} />
        </div>

        <div className="el-col side">
          <section className="card-w" aria-label="Krojna lista elementa">
            <div className="card-head">
              <h2 className="card-h">Krojna lista — {el.label}</h2>
              <span className="card-sub">Kant: D = duža ivica, K = kraća ivica (1D = jedna duža, 2K = obe kraće)</span>
              <button type="button" className="tb-btn push" onClick={() => window.print()}>Štampaj nalepnice</button>
            </div>
            <div className="table-wrap">
              <table className="el-table">
                <thead>
                  <tr>
                    <th>Poz.</th><th>Deo</th><th>Materijal</th><th className="num">Kom</th>
                    <th className="num"><span className="field-label">Dužina<Tip k="element.length" align="up" /></span></th>
                    <th className="num">Širina</th>
                    <th><span className="field-label">Kant<Tip k="element.cutList" align="up" /></span></th>
                    <th className="num">Za sečenje</th><th>Napomena</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.pos} className={p.note ? 'hl' : undefined}>
                      <td className="mono">{p.pos}</td><td>{p.name}</td><td>{matName(p.materialId)}</td>
                      <td className="num">{p.qty}</td><td className="num">{f(p.length)}</td><td className="num">{f(p.width)}</td>
                      <td className="mono">{edgeCode(p.edges)}</td>
                      <td className="num">{f(p.cutLength)} × {f(p.cutWidth)}</td>
                      <td className="note">{p.note ?? (r.followGrain && project.materials[p.materialId]?.grain ? 'šara ↑' : '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card-w" aria-label="Okov i repro materijal za element">
            <h2 className="card-h">Okov i repro materijal — {el.label}<Tip k="element.hardware" align="left" /></h2>
            <div className="hw-grid">
              {hw.map(h => <div key={h.sku}><span>{h.name}</span><span className="mono">{h.qty} {h.unit}</span></div>)}
            </div>
          </section>

          <section className="summary-dark" aria-label="Sažetak elementa">
            <h2 className="card-h">Sažetak {el.label}</h2>
            <div className="sum-grid">
              {[...areas].sort((a, b) => rank(a.materialId) - rank(b.materialId)).map(a => (
                <div key={a.materialId}><div className="sum-l">{a.materialId === el.materials.front ? 'Fronte' : matName(a.materialId)}</div><div className="sum-v">{decimal(a.areaM2)} m²</div></div>
              ))}
              {edges.length > 0 && <div><div className="sum-l">Kant {edgeLabel}</div><div className="sum-v">{edgeMeters} m</div></div>}
            </div>
            <Link to="/krojna-lista" className="sum-cta">Cela krojna lista projekta</Link>
          </section>
        </div>
      </div>

      <div className="labels" aria-hidden="true">
        {pieces.map(p => (
          <div key={`${p.pos}-${p.n}`} className="label">
            <strong>{p.pos}</strong> {p.qty > 1 && <span>({p.n}/{p.qty})</span>}
            <div>{p.name} · {matName(p.materialId)}</div>
            <div className="mono">{f(p.length)} × {f(p.width)} · {edgeCode(p.edges)}</div>
            <div className="small">{project.name}{p.note ? ` · ${p.note}` : ''}</div>
          </div>
        ))}
      </div>
      {tpl && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setTpl(null); }}>
          <div role="dialog" aria-modal="true" aria-label="Sačuvaj kao šablon" className="modal">
            <h2>Sačuvaj kao šablon</h2>
            <p>Šablon se pojavljuje u biblioteci 2D editora, u grupi „Moji šabloni”, za sve u radionici. Prevlačenjem ga dodaješ kao novi element sa istim merama.</p>
            <label className="field">Naziv šablona
              <input type="text" autoFocus value={tpl.name} onChange={e => setTpl({ ...tpl, name: e.target.value })} />
            </label>
            <fieldset>
              <legend>Šta se čuva</legend>
              {([['dims', 'Mere, vrsta, fronte i otvaranje'], ['mats', 'Materijali i kant'], ['rules', 'Pravila konstrukcije ovog elementa (umesto pravila radionice)']] as const).map(([k, t]) => (
                <label key={k} className="modal-check"><input type="checkbox" checked={tpl[k]} onChange={e => setTpl({ ...tpl, [k]: e.target.checked })} />{t}</label>
              ))}
            </fieldset>
            <div className="modal-actions">
              <button type="button" className="line-btn big" onClick={() => setTpl(null)}>Otkaži</button>
              <button type="button" className="accent-btn" disabled={!tpl.name.trim()} onClick={() => {
                const { id: _i, label: _l, wallId: _w, offset: _o, side: _s, materials, ...shape } = el;
                // shortcut: unchecking "Mere…" still keeps kind and width (a template needs them to be placed).
                const element = tpl.dims ? shape : { kind: el.kind, width: el.width, height: el.height, depth: el.depth };
                addTemplate({ name: tpl.name.trim(), element: { ...element, ...(tpl.mats && { materials }) }, ...(tpl.rules && { rules: project.rules }) });
                setSaved(tpl.name.trim()); setTpl(null);
              }}>Sačuvaj šablon</button>
            </div>
          </div>
        </div>
      )}
      {saved && (
        <div role="status" className="toast">
          <span>Šablon „{saved}” je u biblioteci › Moji šabloni.</span>
          <Link to="/projekat">Otvori Prostor</Link>
          <button type="button" aria-label="Zatvori" onClick={() => setSaved(null)}>×</button>
        </div>
      )}
    </div>
  );
}

function Select<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string, boolean?][]; onChange: (v: T) => void;
}) {
  return (
    <label className="field rule-select">{label}
      <select value={value} onChange={e => onChange(e.target.value as T)}>
        {options.map(([v, text, soon]) => <option key={v} value={v} disabled={soon}>{text}{soon ? ' (uskoro)' : ''}</option>)}
      </select>
    </label>
  );
}

/**
 * design/Element.dc.html drawing, parametric: front view without fronts (sides, bottom, rails/top, shelves, legs, position numbers)
 * and a side section (side panel, rails, front strip, back with the pipe cutout), with dimension lines. Scale fits the design's boxes.
 */
export function CarcassDrawing({ el, rules, parts, cutout }: {
  el: Element; rules: ConstructionRules; parts: Part[]; cutout: { label: string; mid: number; h: number } | null;
}) {
  const { width: W, height: H, depth: D } = el;
  const k = Math.min(240 / W, 216 / H, 168 / D);
  const x0 = 60, y0 = 40, w = W * k, h = H * k, tk = rules.carcassThickness * k * 2; // panels drawn 2× thick, as in the design
  const legs = el.kind === 'wall' ? 0 : (el.legs ?? 0) * k;
  const posOf = (p?: Part) => p?.pos.split('-').pop();
  const find = (prefix: string) => parts.find(p => p.name.startsWith(prefix));
  const hasCarcass = !['appliance-front', 'filler'].includes(el.kind);
  const rails = ['base', 'sink', 'corner-blind', 'drawer', 'oven'].includes(el.kind);
  const shelves = el.shelves ?? 0;
  const under = rules.bottomMode === 'under';
  const sx = 400, d = D * k;
  const front = parts.find(p => /^(Krilo|Fronta)/.test(p.name));
  const back = find('Poleđina');
  const scale = Math.round(3 / k); // the design draws 0.3 px/mm and labels it 1:10
  const INK = '#1C1B19', MUTED = '#5F5A52';
  const sideH = under ? h - tk : h;
  return (
    <svg viewBox="0 0 640 380" role="img" className="el-svg"
      aria-label={`${el.label}: pogled spreda na korpus ${W}×${H} sa označenim delovima i bočni presek dubine ${D}`}>
      {hasCarcass ? (
        <g>
          <rect x={x0} y={y0} width={tk} height={sideH} fill="#E7E1D5" stroke={INK} />
          <rect x={x0 + w - tk} y={y0} width={tk} height={sideH} fill="#E7E1D5" stroke={INK} />
          <rect x={under ? x0 : x0 + tk} y={y0 + h - tk} width={under ? w : w - 2 * tk} height={tk} fill="#D6CDBC" stroke={INK} />
          {(rails || el.kind === 'wall' || el.kind === 'tall') && <rect x={x0 + tk} y={y0} width={w - 2 * tk} height={tk} fill="#D6CDBC" stroke={INK} />}
          {Array.from({ length: shelves }, (_, i) => (
            <rect key={i} x={x0 + tk} y={y0 + ((i + 1) * h) / (shelves + 1) - tk / 2} width={w - 2 * tk} height={tk} fill="#D6CDBC" stroke={INK} />
          ))}
          {legs > 0 && <><rect x={x0 + 20} y={y0 + h} width={8} height={legs} fill={MUTED} /><rect x={x0 + w - 28} y={y0 + h} width={8} height={legs} fill={MUTED} /></>}
          <text x={x0 + w / 2} y={y0 + h / 2} textAnchor="middle" fontSize={12} fill={MUTED}>otvoreno — {KIND_NAME[el.kind]}</text>
          {find('Stranica') && <text x={x0 - 20} y={y0 + h / 2} textAnchor="end" fontSize={11} fill={INK}>{posOf(find('Stranica'))}</text>}
          {find('Pod') && <text x={x0 + w / 2} y={y0 + h + 14} textAnchor="middle" fontSize={11} fill={INK}>{posOf(find('Pod'))} pod</text>}
          {rails && find('Vezni') && <text x={x0 + w / 2} y={y0 - 6} textAnchor="middle" fontSize={11} fill={INK}>{posOf(find('Vezni'))} vezni komadi</text>}
        </g>
      ) : (
        <rect x={x0} y={y0} width={w} height={h} fill="#E7E1D5" stroke={INK} />
      )}
      <line x1={x0} y1={310} x2={x0 + w} y2={310} stroke={INK} />
      <line x1={x0} y1={304} x2={x0} y2={316} stroke={INK} /><line x1={x0 + w} y1={304} x2={x0 + w} y2={316} stroke={INK} />
      <text x={x0 + w / 2} y={330} textAnchor="middle" fontSize={12} fontWeight={600}>{W}</text>
      <line x1={20} y1={y0} x2={20} y2={y0 + h} stroke={INK} />
      <line x1={14} y1={y0} x2={26} y2={y0} stroke={INK} /><line x1={14} y1={y0 + h} x2={26} y2={y0 + h} stroke={INK} />
      <text x={12} y={y0 + h / 2} fontSize={12} fontWeight={600} transform={`rotate(-90 12 ${y0 + h / 2})`} textAnchor="middle">{H}</text>

      {hasCarcass && (
        <g>
          <rect x={sx} y={y0} width={d} height={h} fill="#E7E1D5" stroke={INK} />
          {back && <rect x={sx + d} y={y0} width={1.5} height={h} fill={INK} />}
          {rails && <>
            <rect x={sx} y={y0} width={100 * k} height={tk} fill="#D6CDBC" stroke={INK} />
            <rect x={sx + d - 100 * k} y={y0} width={100 * k} height={tk} fill="#D6CDBC" stroke={INK} />
          </>}
          {front && <rect x={sx - tk / 2} y={y0} width={tk / 2} height={h} fill="#BFC3C7" stroke={INK} />}
          {cutout && (() => {
            const ch = cutout.h * k, cy = y0 + h - cutout.mid * k - ch / 2;
            return <>
              <rect x={sx + d + 1.5} y={cy} width={2} height={ch} fill="#B4440E" />
              <rect x={sx + d + 6} y={cy} width={54} height={ch} fill="none" stroke="#B4440E" strokeDasharray="4 3" />
              <text x={sx + d + 33} y={cy + ch / 2 - 4} textAnchor="middle" fontSize={10} fill="#B4440E">izrez</text>
              <text x={sx + d + 33} y={cy + ch / 2 + 10} textAnchor="middle" fontSize={10} fill="#B4440E">{cutout.label}</text>
            </>;
          })()}
          <text x={sx + d / 2} y={y0 + h / 2} textAnchor="middle" fontSize={11} fill={MUTED}>stranica (presek)</text>
          {front && <text x={sx - 16} y={y0 + h / 2} textAnchor="end" fontSize={11} fill={INK}>{posOf(front)}</text>}
          {back && <text x={sx + d + 16} y={y0 + h + 14} fontSize={11} fill={INK}>{posOf(back)} poleđina</text>}
          <line x1={sx} y1={310} x2={sx + d} y2={310} stroke={INK} />
          <line x1={sx} y1={304} x2={sx} y2={316} stroke={INK} /><line x1={sx + d} y1={304} x2={sx + d} y2={316} stroke={INK} />
          <text x={sx + d / 2} y={330} textAnchor="middle" fontSize={12} fontWeight={600}>{D}</text>
        </g>
      )}
      <text x={60} y={366} fontSize={11} fill={MUTED}>Razmera 1:{scale} · fronte nisu prikazane u preseku</text>
    </svg>
  );
}

// "Mere i vrsta" (design/screens/Element.html, DESIGN_SPEC §10).
const KINDS: [ElementKind, string][] = [
  ['base', 'Donji'], ['sink', 'Sudopera'], ['drawer', 'Fiokar'], ['oven', 'Rerna'], ['corner-blind', 'Ugaoni (slepi)'],
  ['appliance-front', 'Fronta aparata'], ['filler', 'Filer'], ['wall', 'Gornji'], ['tall', 'Visoki'],
];
const NO_SHELVES = new Set<ElementKind>(['sink', 'filler', 'appliance-front']); // as the design
const DOOR_KINDS = new Set<ElementKind>(['base', 'sink', 'corner-blind', 'wall', 'tall']);
const GAP = 3; // between drawer fronts
const ROW_NAME: Record<string, string> = { door: 'krilo', door2: '2 krila', drawer: 'fioka', app: 'aparat', hood: 'aspirator', glass: 'staklo', open: 'otvoreno', lift: 'kip', panel: 'panel' };

function MeasureCard({ el, unit, materials, onChange, onKind }: {
  el: Element; unit: Unit; materials: Project['materials']; onChange: (p: Partial<Element>) => void; onKind: (k: ElementKind) => void;
}) {
  const up = el.kind === 'wall';
  const fronts = el.drawerFronts ?? [];
  const space = el.height - 4, used = fronts.reduce((s, h) => s + h, 0) + Math.max(0, fronts.length - 1) * GAP;
  // First drawer 176, the rest share what is left.
  const spread = (n: number) => { const rest = n > 1 ? Math.floor((space - 176 - (n - 1) * GAP) / (n - 1)) : space; return n > 1 ? [176, ...Array(n - 1).fill(rest)] : [space]; };
  const mats = (pred: (k: string) => boolean) => Object.values(materials).filter(m => pred(m.kind));
  const matSelect = (label: string, key: 'carcass' | 'front' | 'back', list: typeof materials[string][]) => (
    <label className="field">{label}
      <select value={el.materials[key]} onChange={e => onChange({ materials: { ...el.materials, [key]: e.target.value } })}>
        {list.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </label>
  );
  return (
    <section className="card-w measure" aria-label="Mere i vrsta elementa">
      <h2 className="card-h">Mere i vrsta<Tip k="element.measures" /></h2>
      <div role="group" aria-label="Vrsta elementa" className="kind-group">
        <span className="field-label">Vrsta</span>
        <SegmentedControl className="chips-row" itemClass="kind-btn big" options={KINDS} value={el.kind} onChange={onKind} />
      </div>
      <div className="grid3">
        <LenField label="Širina" value={el.width} unit={unit} onCommit={w => onChange({ width: Math.max(50, Math.min(1200, w)) })} />
        <LenField label="Visina korpusa" value={el.height} unit={unit} onCommit={v => onChange({ height: v })} />
        <LenField label="Dubina" value={el.depth} unit={unit} onCommit={v => onChange({ depth: v })} />
        {up ? <LenField label="Od poda (donja ivica)" value={el.elevation} unit={unit} onCommit={v => onChange({ elevation: v })} />
          : <LenField label="Nogice (od poda)" value={el.legs} unit={unit} onCommit={v => onChange({ legs: v || undefined })} />}
        <label className="field">{NO_SHELVES.has(el.kind) ? 'Fahovi (ne koristi se)' : 'Fahovi'}
          <input type="text" inputMode="numeric" value={NO_SHELVES.has(el.kind) ? 0 : el.shelves ?? 0} readOnly={NO_SHELVES.has(el.kind)}
            onChange={e => onChange({ shelves: Math.min(6, num(e.target.value)) })} />
        </label>
      </div>
      {el.front ? (
        // Elements with front rows (Konfigurator, catalog) are edited where the rows are: doors / drawerFronts below do not apply.
        <div className="kind-group">
          <span className="field-label">Fronta, odozgo</span>
          <div className="chips-row">
            <span className="mono">{frontRows(el).map(({ row, h }) => `${ROW_NAME[row.type] ?? row.type} ${h}`).join(' · ')}</span>
            <Link to={`/prilagodjeni?element=${el.id}`} className="line-btn push">Uredi u konfiguratoru</Link>
          </div>
        </div>
      ) : <>
      {DOOR_KINDS.has(el.kind) && (
        <div className="grid2">
          {/* shortcut: a tall unit is always fridge + upper door (2 doors on one side), so only the side is offered. */}
          {el.kind !== 'tall' && (
            <div role="group" aria-label="Broj krila" className="kind-group">
              <span className="field-label">Krila</span>
              <SegmentedControl className="chips-row" itemClass="kind-btn big" options={[[1, '1'], [2, '2']] as const} value={el.doors}
                onChange={n => onChange({ doors: n, hinge: n === 2 ? 'LR' : 'L' })} />
            </div>
          )}
          <div role="group" aria-label="Otvaranje" className="kind-group">
            <span className="field-label">Otvaranje (gledano spreda)</span>
            <SegmentedControl className="chips-row" itemClass="kind-btn big" value={el.hinge ?? 'L'} onChange={h => onChange({ hinge: h })}
              options={el.doors === 2 && el.kind !== 'tall' ? [['LR', '2 krila']] as const : [['L', 'Levo'], ['R', 'Desno']] as const} />
          </div>
        </div>
      )}
      {(el.kind === 'drawer' || el.kind === 'oven') && (
        <div className="kind-group">
          <span className="field-label">Fronte fioka, odozgo (mm)<Tip k="element.drawers" /></span>
          <div className="chips-row drawers">
            {fronts.map((h, i) => (
              <input key={`${i}-${h}`} type="text" inputMode="numeric" aria-label={`Fioka ${i + 1}`} defaultValue={h}
                onBlur={e => onChange({ drawerFronts: fronts.map((x, j) => (j === i ? num(e.target.value) : x)) })} />
            ))}
            <button type="button" className="dashed-btn" onClick={() => onChange({ drawerFronts: spread(fronts.length + 1) })}>+ Fioka</button>
            <button type="button" className="line-btn" onClick={() => onChange({ drawerFronts: spread(Math.max(1, fronts.length)) })}>Raspodeli</button>
          </div>
          {/* Within 4 mm below the front height is fine (design: 714 of 716 ✓). */}
          <span className={used <= space && space - used <= 4 ? 'sum-ok' : 'sum-bad'}>
            Zbir {fronts.reduce((s, h) => s + h, 0)} + {Math.max(0, fronts.length - 1)} fuge × {GAP} = {used} · visina fronti {space} {used <= space && space - used <= 4 ? '✓' : '✗'}
          </span>
        </div>
      )}
      </>}
      <div className="grid3">
        {matSelect('Korpus', 'carcass', mats(k => k !== 'hdf'))}
        {matSelect('Fronte', 'front', mats(k => k !== 'hdf'))}
        {matSelect('Poleđina', 'back', mats(k => k === 'hdf'))}
      </div>
      <NameField el={el} onChange={onChange} />
      <label className="field">Napomena (ide u krojnu listu i na nalepnice)
        <textarea rows={2} defaultValue={el.note} onBlur={e => onChange({ note: e.target.value.trim() || undefined })} />
      </label>
    </section>
  );
}
