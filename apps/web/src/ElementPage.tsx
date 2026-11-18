// Element page (design/Element.dc.html): element form, front view + section, construction rules,
// the element's cut list with cut sizes, its hardware, summary and printable part labels.
import {
  edgeCode, edgeTotals, format, generateParts, hardware, sheetEstimate,
  type ConstructionRules, type Element, type Project,
} from 'engine';
import { Link, Navigate, useParams } from 'react-router';
import { ElementFields, LenField } from './fields';
import { frontLayout, hingePath } from './fronts';
import { Header } from './Header';
import { KIND_NAME } from './labels';
import { useProject } from './store';

const decimal = (n: number) => n.toLocaleString('sr-Latn', { maximumFractionDigits: 2 });

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
  const sorted = [...project.elements].sort((a, b) => a.label.localeCompare(b.label, 'sr', { numeric: true }));

  const patch = (p: Partial<Element>) => change(pr => ({ ...pr, elements: pr.elements.map(e => (e.id === el.id ? { ...e, ...p } : e)) }));
  const setRules = (p: Partial<ConstructionRules>) => change(pr => ({ ...pr, rules: { ...pr.rules, ...p } }));
  const r = project.rules;
  const pieces = parts.flatMap(p => Array.from({ length: p.qty }, (_, i) => ({ ...p, n: i + 1 })));

  return (
    <div className="app">
      <Header title={`Projekat: ${project.name}`} />
      <main className="page" key={el.id /* reset uncontrolled inputs per element */}>
        <nav className="chips-row" aria-label="Elementi">
          {sorted.map(e => (
            <Link key={e.id} to={`/element/${e.id}`} className="chip-btn mono" aria-current={e.id === el.id ? 'page' : undefined}>{e.label}</Link>
          ))}
        </nav>

        <div className="toolbar">
          <h1>{el.label} · {KIND_NAME[el.kind]}</h1>
          <span className="muted mono">{f(el.width)} × {f(el.height)} × {f(el.depth)} {unit} · zid {el.wallId}</span>
          <div className="toolbar-actions">
            <Link className="tool link-btn" to="/projekat">Nazad na prostor</Link>
            <Link className="tool link-btn" to="/krojna-lista">Cela krojna lista projekta</Link>
          </div>
        </div>

        <div className="el-grid">
          <section className="block">
            <h2>Konstrukcija — pogled spreda i presek</h2>
            <ElementDrawing el={el} rules={r} />
          </section>
          <section className="block panel">
            <h2>Mere</h2>
            <LenField label={`Širina (${unit})`} value={el.width} unit={unit} onCommit={w => patch({ width: Math.max(50, Math.min(1200, w)) })} />
            <ElementFields el={el} unit={unit} onChange={patch} />
            <label className="field">Napomena
              <input type="text" defaultValue={el.note} onBlur={e => patch({ note: e.target.value || undefined })} />
            </label>
          </section>
        </div>

        <section className="block">
          <div className="block-head">
            <h2>Pravila konstrukcije</h2>
            <span className="muted small">važe za ceo projekat</span>
          </div>
          <div className="rules">
            <Choice label="Spoj" value={r.joint} onChange={v => setRules({ joint: v })} options={[
              ['dowel+confirmat', 'Tipl + konfirmat'], ['minifix', 'Ekscentar (minifix)', true], ['confirmat', 'Samo konfirmat', true]]} />
            <Choice label="Dno" value={r.bottomMode} onChange={v => setRules({ bottomMode: v })} options={[
              ['between', 'Između bokova'], ['under', 'Ispod bokova']]} />
            <Choice label="Leđa" value={r.backMode} onChange={v => setRules({ backMode: v })} options={[
              ['nailed', `HDF 3 nabijena (−${r.backReduction} mm)`], ['groove', 'HDF 3 u nut', true], ['inset18', 'Iverica 18 upuštena', true]]} />
            <LenField label="Fuga fronti (mm)" value={r.frontGap} unit="mm" onCommit={v => setRules({ frontGap: Math.max(0, Math.min(10, v)) })} />
            <Choice label="Kant korpusa" value={String(r.carcassEdge.thickness)} onChange={v => setRules({ carcassEdge: { ...r.carcassEdge, thickness: Number(v) } })} options={[
              ['0.8', 'ABS 0,8 · prednja ivica'], ['2', 'ABS 2 · prednja ivica']]} />
            <Choice label="Kant fronti" value={String(r.frontEdge.thickness)} onChange={v => setRules({ frontEdge: { ...r.frontEdge, thickness: Number(v) } })} options={[
              ['2', 'ABS 2 · sve 4 ivice'], ['1', 'ABS 1 · sve 4 ivice']]} />
          </div>
          <label className="check">
            <input type="checkbox" checked={r.deductEdgeFromCutMinThickness <= 1}
              onChange={e => setRules({ deductEdgeFromCutMinThickness: e.target.checked ? 1 : 100 })} />
            Mera za sečenje = gotova mera − debljina kanta (za kant ≥ 1 mm)
          </label>
          <p className="hint">Ekscentar, samo konfirmat, leđa u nut i upuštena leđa čekaju pravilo od radionice (mere i okov).</p>
        </section>

        <section className="block">
          <div className="block-head">
            <h2>Krojna lista — {el.label}</h2>
            <span className="muted small">Kant: D = duža ivica, K = kraća ivica (1D = jedna duža, 2K = obe kraće)</span>
            <div className="toolbar-actions"><button type="button" onClick={() => window.print()}>Štampaj nalepnice</button></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Poz.</th><th scope="col">Deo</th><th scope="col">Materijal</th><th scope="col" className="num">Kom</th>
                  <th scope="col" className="num">Dužina</th><th scope="col" className="num">Širina</th><th scope="col">Kant</th>
                  <th scope="col" className="num">Za sečenje</th><th scope="col">Napomena</th>
                </tr>
              </thead>
              <tbody>
                {parts.map(p => (
                  <tr key={p.pos}>
                    <td className="mono">{p.pos}</td><td>{p.name}</td><td className="small">{matName(p.materialId)}</td>
                    <td className="num">{p.qty}</td><td className="num">{f(p.length)}</td><td className="num">{f(p.width)}</td>
                    <td className="mono">{edgeCode(p.edges)}</td><td className="num">{f(p.cutLength)} × {f(p.cutWidth)}</td>
                    <td className="small">{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="el-grid">
          <section className="block">
            <h2>Okov i repro materijal — {el.label}</h2>
            <table>
              <tbody>{hw.map(h => <tr key={h.sku}><td>{h.name}</td><td className="num">{h.qty} {h.unit}</td></tr>)}</tbody>
            </table>
            <p className="hint">Klamerice za leđa i sokla još se ne računaju.</p>
          </section>
          <section className="block">
            <h2>Sažetak {el.label}</h2>
            <table>
              <tbody>
                {areas.map(a => <tr key={a.materialId}><td>{matName(a.materialId)}</td><td className="num">{decimal(a.areaM2)} m²</td></tr>)}
                {edges.map(e => <tr key={e.edge.thickness}><td>Kant {e.edge.material} {decimal(e.edge.thickness)}</td><td className="num">{decimal(e.meters)} m</td></tr>)}
              </tbody>
            </table>
          </section>
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
      </main>
    </div>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string, boolean?][]; onChange: (v: T) => void;
}) {
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      {options.map(([v, text, soon]) => (
        <label key={v} className={soon ? 'soon' : undefined} title={soon ? 'Uskoro — čeka pravilo radionice' : undefined}>
          <input type="radio" name={label} checked={value === v} disabled={soon} onChange={() => onChange(v)} /> {text}
        </label>
      ))}
    </fieldset>
  );
}

/** Front view (fronts over the carcass outline) and side section, in mm. Visual only; sizes come from the same rules as the parts. */
export function ElementDrawing({ el, rules }: { el: Element; rules: ConstructionRules }) {
  const { width: W, height: H, depth: D } = el;
  const t = rules.carcassThickness, g = rules.frontGap;
  const legs = el.kind === 'wall' ? 0 : el.legs ?? 0;
  const { fronts, ovenTop } = frontLayout(el, rules);
  const oven = ovenTop !== null;
  const hasCarcass = el.kind !== 'appliance-front' && el.kind !== 'filler';
  const shelves = el.shelves ?? 0;
  const under = rules.bottomMode === 'under';
  const sx = W + 300; // section origin
  const pad = 160, fullW = sx + D + 40, fullH = H + legs;
  const text = { fontSize: Math.max(40, Math.round(Math.max(fullW, fullH) / 28)), fill: '#57534E', fontFamily: 'var(--mono)' };

  return (
    <svg className="el-drawing" viewBox={`${-pad} ${-pad} ${fullW + 2 * pad} ${fullH + 2 * pad}`} role="img"
      aria-label={`${el.label}: pogled spreda ${W}×${H} i presek dubine ${D}`}>
      {/* front view */}
      {legs > 0 && [60, W - 100].map(x => <rect key={x} x={x} y={H} width={40} height={legs} fill="#A8A29E" />)}
      {hasCarcass && <rect x={0} y={0} width={W} height={H} fill="#FFFFFF" stroke="#1C1B19" strokeWidth={4} />}
      {hasCarcass && <path d={`M${t} 0V${H}M${W - t} 0V${H}M${t} ${H - t}H${W - t}`} stroke="#A8A29E" strokeWidth={3} strokeDasharray="20 14" fill="none" />}
      {oven && <><rect x={g / 2} y={g / 2} width={W - g} height={ovenTop! - g} fill="#E7E5E4" stroke="#57534E" strokeWidth={3} /><text x={W / 2} y={ovenTop! / 2} textAnchor="middle" {...text}>rerna</text></>}
      {fronts.map((fr, i) => (
        <g key={i}>
          <rect x={fr.x} y={fr.y} width={fr.w} height={fr.h} fill="#D6D3D1" fillOpacity={0.55} stroke="#1C1B19" strokeWidth={4} />
          {fr.hinge && <path d={hingePath(fr)} fill="none" stroke="#57534E" strokeWidth={2} strokeDasharray="16 12" />}
          {fr.label && <text x={fr.x + fr.w / 2} y={fr.y + fr.h / 2} textAnchor="middle" {...text}>{fr.label}</text>}
        </g>
      ))}
      <text x={W / 2} y={-40} textAnchor="middle" {...text}>{W}</text>
      <text x={-40} y={H / 2} textAnchor="middle" transform={`rotate(-90 -40 ${H / 2})`} {...text}>{H}</text>

      {/* section */}
      {hasCarcass && (
        <g transform={`translate(${sx} 0)`}>
          {legs > 0 && <rect x={D - 120} y={H} width={40} height={legs} fill="#A8A29E" />}
          <rect x={0} y={0} width={D} height={H} fill="#FFFFFF" stroke="#1C1B19" strokeWidth={4} />
          {el.kind !== 'oven' && <rect x={0} y={0} width={6} height={H} fill="#B4440E" />}
          <rect x={under ? 0 : 6} y={H - t} width={under ? D : D - 6} height={t} fill="#C8B79A" />
          {(el.kind === 'wall' || el.kind === 'tall') && <rect x={6} y={0} width={D - 6} height={t} fill="#C8B79A" />}
          {el.kind === 'tall' && <rect x={6} y={Math.min(...fronts.map(fr => fr.y + fr.h))} width={D - 6} height={t} fill="#C8B79A" />}
          {['base', 'sink', 'corner-blind', 'drawer', 'oven'].includes(el.kind) && <>
            <rect x={D - 100} y={0} width={100} height={t} fill="#C8B79A" />
            {el.kind !== 'oven' && <rect x={6} y={0} width={100} height={t} fill="#C8B79A" />}
          </>}
          {Array.from({ length: shelves }, (_, i) => <rect key={i} x={6} y={((i + 1) * H) / (shelves + 1)} width={D - 26} height={t} fill="#C8B79A" />)}
          {fronts.length > 0 && <rect x={D + 2} y={2} width={t} height={H - 4} fill="#D6D3D1" stroke="#1C1B19" strokeWidth={2} />}
          <text x={D / 2} y={-40} textAnchor="middle" {...text}>{D}</text>
        </g>
      )}
    </svg>
  );
}
