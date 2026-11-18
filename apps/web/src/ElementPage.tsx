// Element page, laid out as design/Element.dc.html: element chips, carcass drawing (front without fronts + section),
// construction rules, the element's cut list, hardware, dark summary; printable part labels.
import {
  edgeCode, edgeTotals, format, generateParts, hardware, sheetEstimate,
  type ConstructionRules, type Element, type Part, type Project,
} from 'engine';
import { Link, Navigate, useParams } from 'react-router';
import { ElementFields, LenField } from './fields';
import { Header } from './Header';
import { Tip } from './help';
import { KIND_NAME } from './labels';
import { useProject } from './store';

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
  const frontMat = project.materials[el.materials.front];

  const patch = (p: Partial<Element>) => change(pr => ({ ...pr, elements: pr.elements.map(e => (e.id === el.id ? { ...e, ...p } : e)) }));
  const setRules = (p: Partial<ConstructionRules>) => change(pr => ({ ...pr, rules: { ...pr.rules, ...p } }));
  const setGrain = (grain: boolean) => frontMat && change(pr => ({ ...pr, materials: { ...pr.materials, [frontMat.id]: { ...frontMat, grain } } }));
  const pieces = parts.flatMap(p => Array.from({ length: p.qty }, (_, i) => ({ ...p, n: i + 1 })));
  // Pipes behind the carcass: vertical band of the back cutout in the section.
  const bottom = el.kind === 'wall' ? el.elevation ?? 0 : el.legs ?? 0;
  const pipes = project.room.installations.filter(i => PIPES.has(i.kind) && i.wallId === el.wallId
    && i.offset >= el.offset && i.offset <= el.offset + el.width && i.height >= bottom && i.height <= bottom + el.height);
  const back = parts.find(p => p.name.startsWith('Leđa'));
  const cut = back?.note?.match(/izrez (\d+)×(\d+)/);
  const cutout = cut && pipes.length
    ? { label: `${cut[1]}×${cut[2]}`, mid: pipes.reduce((s, i) => s + i.height, 0) / pipes.length - bottom, h: Number(cut[2]) }
    : null;
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
        <button type="button" className="tb-btn el-chips-r" disabled title="Uskoro (šabloni elemenata, MVP 8)">Sačuvaj kao šablon</button>
      </div>

      <div className="el-body" key={el.id /* reset uncontrolled inputs per element */}>
        <div className="el-col">
          <div className="el-title">
            <h1>{el.label} · {TITLE[el.kind]}</h1>
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
              <Select label="Dno" value={r.bottomMode} onChange={v => setRules({ bottomMode: v })} options={[
                ['between', 'Između bokova'], ['under', 'Ispod bokova']]} />
              <Select label="Leđa" value={r.backMode} onChange={v => setRules({ backMode: v })} options={[
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
            {/* shortcut: grain is stored on the front material but not used by the engine yet (no cut optimisation). */}
            <label className="rule-check">
              <input type="checkbox" checked={!!frontMat?.grain} onChange={e => setGrain(e.target.checked)} />
              Prati smer šare (godova) na frontama
            </label>
          </section>

          {/* Not in design/Element.dc.html: kept because height, depth, shelves and drawer fronts are edited nowhere else. */}
          <section className="card-w" aria-label="Mere elementa">
            <h2 className="card-h">Mere</h2>
            <div className="rule-grid">
              <LenField label={`Širina (${unit})`} value={el.width} unit={unit} onCommit={w => patch({ width: Math.max(50, Math.min(1200, w)) })} />
              <label className="field">Napomena
                <input type="text" defaultValue={el.note} onBlur={e => patch({ note: e.target.value || undefined })} />
              </label>
            </div>
            <ElementFields el={el} unit={unit} onChange={patch} />
          </section>
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
                      <td className="mono">{edgeCode(p.edges).replace(/ (?=[\d,]+$)/, ' · ')}</td>
                      <td className="num">{f(p.cutLength)} × {f(p.cutWidth)}</td>
                      <td className="note">{p.note ?? (frontMat?.grain && p.materialId === frontMat.id ? 'šara po dužini' : '')}</td>
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
  const front = parts.find(p => /^(Vrata|Fronta)/.test(p.name));
  const back = find('Leđa');
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
          {find('Bok') && <text x={x0 - 20} y={y0 + h / 2} textAnchor="end" fontSize={11} fill={INK}>{posOf(find('Bok'))}</text>}
          {find('Dno') && <text x={x0 + w / 2} y={y0 + h + 14} textAnchor="middle" fontSize={11} fill={INK}>{posOf(find('Dno'))} dno</text>}
          {rails && find('Vezna') && <text x={x0 + w / 2} y={y0 - 6} textAnchor="middle" fontSize={11} fill={INK}>{posOf(find('Vezna'))} vezne letve</text>}
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
          <text x={sx + d / 2} y={y0 + h / 2} textAnchor="middle" fontSize={11} fill={MUTED}>bok (presek)</text>
          {front && <text x={sx - 16} y={y0 + h / 2} textAnchor="end" fontSize={11} fill={INK}>{posOf(front)}</text>}
          {back && <text x={sx + d + 16} y={y0 + h + 14} fontSize={11} fill={INK}>{posOf(back)} leđa</text>}
          <line x1={sx} y1={310} x2={sx + d} y2={310} stroke={INK} />
          <line x1={sx} y1={304} x2={sx} y2={316} stroke={INK} /><line x1={sx + d} y1={304} x2={sx + d} y2={316} stroke={INK} />
          <text x={sx + d / 2} y={330} textAnchor="middle" fontSize={12} fontWeight={600}>{D}</text>
        </g>
      )}
      <text x={60} y={366} fontSize={11} fill={MUTED}>Razmera 1:{scale} · fronte nisu prikazane u preseku</text>
    </svg>
  );
}
