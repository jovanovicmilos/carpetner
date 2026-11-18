// Saw-shop comparison (design/screens/Poredjenje.html), a sub-screen of Krojna lista.
// shortcut: example suppliers (engine EXAMPLE_SUPPLIERS) until suppliers and their price lists are stored (MVP 8);
// sending inquiries and splitting the order are placeholders; "Izvezi poređenje" writes an Excel file.
import { compareSuppliers, cuttingMeters, edgeTotals, EXAMPLE_SUPPLIERS, generateParts, PRESETS, sheetEstimate, worktops } from 'engine';
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Header } from './Header';
import { Tip } from './help';
import { useProject } from './store';

const rsd = (p: number) => Math.round(p / 100).toLocaleString('sr-Latn');
const partsWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'deo' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'dela' : 'delova');

export function Compare() {
  const project = useProject(s => s.project);
  const [off, setOff] = useState<Record<string, boolean>>({});
  if (!project) return <Navigate to="/" replace />;
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  const parts = generateParts(project);
  const pieces = parts.reduce((s, p) => s + p.qty, 0);
  const edgeM = edgeTotals(parts, project.rules).reduce((s, e) => s + e.orderMeters, 0);
  const sheets = sheetEstimate(parts, project.materials, project.rules).reduce((s, x) => s + x.sheets, 0);
  const tops = worktops(project, dims.worktopDepth).length;
  const shown = EXAMPLE_SUPPLIERS.filter(s => !off[s.id]);
  const c = compareSuppliers(project, shown, dims.worktopDepth);
  const labels = [`Ploče (${sheets} kom)`, `Radne ploče (${tops} kom)`, `Sečenje (${cuttingMeters(project)} m)`, `Kantovanje (${edgeM} m)`, 'Dostava'];
  const notes = shown.flatMap(s => (s.prices ? s.substitutes ?? [] : []).filter(x => parts.some(p => p.materialId === x.materialId)).map(x => x.note));

  const exportXlsx = async () => {
    const XLSX = await import('xlsx');
    const rows = [['Stavka', ...c.quotes.map(q => q.supplier.name)],
      ...labels.map((l, i) => [l, ...c.quotes.map(q => (q.lines ? q.lines[i] / 100 : '—'))]),
      ['Rok isporuke', ...c.quotes.map(q => (q.supplier.leadDays === null ? '—' : `${q.supplier.leadDays} dana`))],
      ['Ukupno', ...c.quotes.map(q => (q.total === null ? '—' : q.total / 100))]];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Poređenje');
    XLSX.writeFile(wb, 'poredjenje-pilana.xlsx');
  };

  return (
    <div className="app">
      <Header />
      <div className="cp-page">
        <div className="cp-head">
          <div>
            <Link to="/krojna-lista" className="wv-back cp-back"><span aria-hidden="true">←</span>Krojna lista</Link>
            <h1>Gde je najbolja ponuda?<Tip k="compare.title" align="right" /></h1>
            <p>Ista krojna lista ({pieces} {partsWord(pieces)}, {edgeM} m kanta, {tops} radne ploče) obračunata po cenovniku svake firme · RSD bez PDV-a · primer cena</p>
          </div>
          <div className="cp-actions">
            <button type="button" onClick={exportXlsx}>Izvezi poređenje (Excel)</button>
            <button type="button" onClick={() => window.print()}>PDF</button>
            <button type="button" className="accent" aria-disabled="true" title="Uskoro">Pošalji upit izabranima</button>
          </div>
        </div>
        <fieldset className="cp-firms">
          <legend>Firme u poređenju<Tip k="compare.firms" align="right" /></legend>
          {EXAMPLE_SUPPLIERS.map(s => (
            <label key={s.id}><input type="checkbox" checked={!off[s.id]} onChange={() => setOff({ ...off, [s.id]: !off[s.id] })} />{s.name}</label>
          ))}
          <button type="button" aria-disabled="true" title="Uskoro">+ Dodaj firmu i cenovnik</button>
        </fieldset>
        <section aria-label="Tabela poređenja" className="cp-table">
          <table>
            <thead>
              <tr>
                <th className="first">Stavka</th>
                {c.quotes.map(q => (
                  <th key={q.supplier.id} className={q.total !== null && q.total === c.best ? 'best' : undefined}>
                    {q.supplier.name}<div>{q.supplier.prices ? `cene od ${q.supplier.updated}` : 'čeka odgovor na upit'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => {
                const vals = c.quotes.map(q => (q.lines ? q.lines[i] : null));
                const nums = vals.filter((x): x is number => x !== null), min = Math.min(...nums);
                return (
                  <tr key={l}>
                    <td className="first">{l}</td>
                    {vals.map((x, j) => <td key={j} className={x !== null && x === min && nums.length > 1 ? 'cheap' : undefined}>{x === null ? '—' : x === 0 ? 'besplatno' : rsd(x)}</td>)}
                  </tr>
                );
              })}
              <tr>
                <td className="first">Rok isporuke</td>
                {c.quotes.map(q => <td key={q.supplier.id}>{q.supplier.leadDays === null ? '—' : `${q.supplier.leadDays} dana`}</td>)}
              </tr>
              <tr className="total">
                <td className="first">Ukupno</td>
                {c.quotes.map(q => {
                  const isBest = q.total !== null && q.total === c.best;
                  return (
                    <td key={q.supplier.id} className={isBest ? 'cheap' : undefined}>
                      {q.total === null ? '—' : rsd(q.total)}
                      <div className={isBest ? 'win' : undefined}>{q.total === null ? 'nema cene' : isBest ? 'Najpovoljnije' : `+${rsd(q.total - (c.best ?? 0))}`}</div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </section>
        <div className="cp-row">
          <section className="cp-split">
            <h2>Najbolja kombinacija<Tip k="compare.split" align="right" /></h2>
            {c.split ? <>
              <p>Ploče, sečenje i kantovanje kod {c.split.sheetsAt.name}, radne ploče kod {c.split.worktopsAt.name}. Dve isporuke.</p>
              <div className="tot"><span>Ukupno</span><span>{rsd(c.split.total)} RSD</span></div>
              <div className="sub">{rsd(c.split.saving)} RSD jeftinije od najboljeg pojedinačnog dobavljača — app predlaže podelu samo kada ušteda pokrije dodatnu dostavu.</div>
              <button type="button" aria-disabled="true" title="Uskoro">Podeli narudžbinu i pošalji</button>
            </> : <p>Podela narudžbine ne donosi uštedu — naruči sve kod najpovoljnijeg dobavljača.</p>}
          </section>
          <section className="cp-src">
            <h2>Odakle dolaze cene</h2>
            <div className="ln"><span>Uvoz Excel/CSV cenovnika firme</span><span>ručno, svaki put kad stigne novi</span></div>
            <div className="ln"><span>Firma sama održava cenovnik u Kroju</span><span>partnerski nalog</span></div>
            <div className="ln last"><span>Upit sa krojnom listom → odgovor sa cenom</span><span>za firme bez cenovnika</span></div>
            {notes.map(n => <div key={n} className="warn">{n}</div>)}
          </section>
        </div>
      </div>
    </div>
  );
}
