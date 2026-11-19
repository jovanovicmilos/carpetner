// Saw-shop comparison (design/screens/Poredjenje.html), a sub-screen of Krojna lista.
// Firms come from suppliers.ts (the design's examples + firms added with their price list). Inquiries and split orders
// send the cut-list package (orderPackage.ts) through the share sheet, or download + e-mail on a computer.
import { compareSuppliers, cuttingMeters, edgeTotals, generateParts, importPrices, PRESETS, sheetEstimate, worktops, type Project, type Supplier } from 'engine';
import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Header } from './Header';
import { Tip } from './help';
import { pricedProject, usePrices } from './prices';
import { useProject } from './store';
import { fileSlug, orderFiles, type PackageParts } from './orderPackage';
import { readSheetRows } from './sheetFile';
import { downloadFiles, useShare } from './share';
import { supplierPrices, useSuppliers } from './suppliers';

const rsd = (p: number) => Math.round(p / 100).toLocaleString('sr-Latn');
const partsWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'deo' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'dela' : 'delova');

export function Compare() {
  const stored = useProject(s => s.project);
  const settings = usePrices();
  const [off, setOff] = useState<Record<string, boolean>>({});
  const { list: suppliers, save, remove } = useSuppliers();
  const [adding, setAdding] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { share, ready, retry } = useShare();
  if (!stored) return <Navigate to="/" replace />;
  const project = pricedProject(stored, settings);
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  const parts = generateParts(project);
  const pieces = parts.reduce((s, p) => s + p.qty, 0);
  const edgeM = edgeTotals(parts, project.rules).reduce((s, e) => s + e.orderMeters, 0);
  const sheets = sheetEstimate(parts, project.materials, project.rules).reduce((s, x) => s + x.sheets, 0);
  const tops = worktops(project, dims.worktopDepth).length;
  const shown = suppliers.filter(s => !off[s.id]);
  const c = compareSuppliers(project, shown, dims.worktopDepth);
  const labels = [`Ploče (${sheets} kom)`, `Radne ploče (${tops} kom)`, `Sečenje (${cuttingMeters(project)} m)`, `Kantovanje (${edgeM} m)`, 'Dostava'];
  const missingName = (m: string) => (m === 'worktop' ? 'radna ploča' : m === 'cutting' ? 'sečenje' : m === 'delivery' ? 'dostava (računa se 0)'
    : m.startsWith('edge ') ? `kant ${m.slice(5).replace('.', ',')}` : project.materials[m]?.name ?? m);
  const incomplete = (q: (typeof c.quotes)[number]) => q.missing.some(m => m !== 'delivery');
  /** Table row i (ploče, radne ploče, sečenje, kantovanje, dostava) has no price at this firm. */
  const lacks = (q: (typeof c.quotes)[number], i: number) => q.missing.some(m =>
    i === 0 ? !!project.materials[m] : i === 1 ? m === 'worktop' : i === 2 ? m === 'cutting' : i === 3 ? m.startsWith('edge ') : false);
  const notes = [
    ...shown.flatMap(s => (s.prices ? s.substitutes ?? [] : []).filter(x => parts.some(p => p.materialId === x.materialId)).map(x => x.note)),
    ...c.quotes.filter(q => q.missing.length).map(q => `${q.supplier.name}: nema cene za ${q.missing.map(missingName).join(', ')}${incomplete(q) ? ' — ne ulazi u poređenje dok se ne dopuni.' : '.'}`),
  ];

  /** Sends a package to firms: share sheet with the files, else download + e-mail with the firms' addresses. */
  const sendTo = async (to: Supplier[], what: PackageParts, subject: string, body: string, base: string) => {
    setBusy(true); setMsg(null);
    try {
      const files = await orderFiles(project, what, base);
      if (await share({ files, title: subject, text: body })) return;
      downloadFiles(files);
      const mails = to.map(s => s.email).filter(Boolean).join(',');
      window.location.href = `mailto:${mails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n(Fajlovi su preuzeti — priložite ih.)')}`;
    } catch (e) {
      console.error(e);
      setMsg('Fajlovi nisu napravljeni. Pokušaj ponovo; ako se ponovi, javi nam.');
    } finally { setBusy(false); }
  };
  const base = fileSlug(project.name) || 'projekat';
  const inquiry = () => sendTo(shown, { parts: true, tops: true, hw: false }, `Upit za cenu — ${project.name}`,
    `Poštovani,\n\nmolim ponudu za sečenje i kantovanje po priloženoj krojnoj listi (${pieces} ${partsWord(pieces)}, ${sheets} ploča, ${edgeM} m kanta${tops ? `, ${tops} radne ploče` : ''}) i rok isporuke.\nCSV je za vaš program, PDF za pregled.\n\nHvala`, `upit-${base}`);

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
            <button type="button" className="accent" disabled={busy || !shown.length} onClick={inquiry}>Pošalji upit izabranima</button>
          </div>
        </div>
        <fieldset className="cp-firms">
          <legend>Firme u poređenju<Tip k="compare.firms" align="right" /></legend>
          {suppliers.map(s => (
            <span key={s.id} className="cp-firm">
              <label><input type="checkbox" checked={!off[s.id]} onChange={() => setOff({ ...off, [s.id]: !off[s.id] })} />{s.name}</label>
              <button type="button" className="cp-x" aria-label={`Ukloni ${s.name}`} onClick={() => remove(s.id)}>×</button>
            </span>
          ))}
          {!adding && <button type="button" onClick={() => setAdding(true)}>+ Dodaj firmu i cenovnik</button>}
        </fieldset>
        {adding && <AddFirm project={project} taken={suppliers.map(s => s.id)} onCancel={() => setAdding(false)}
          onSave={(s, unknown) => { save(s); setAdding(false); setMsg(unknown.length ? `${s.name} je dodata. Nije prepoznato u cenovniku (${unknown.length}): ${unknown.slice(0, 6).join('; ')}${unknown.length > 6 ? '…' : ''}` : `${s.name} je dodata.`); }} />}
        {ready && <button type="button" className="cp-ready" onClick={retry}>Fajlovi su spremni — pošalji</button>}
        {msg && <p className="cp-msg" role="status">{msg}</p>}
        <section aria-label="Tabela poređenja" className="cp-table">
          <table>
            <thead>
              <tr>
                <th className="first">Stavka</th>
                {c.quotes.map(q => (
                  <th key={q.supplier.id} className={q.total !== null && q.total === c.best ? 'best' : undefined}>
                    {q.supplier.name}<div>{!q.supplier.prices ? 'čeka odgovor na upit' : incomplete(q) ? 'nepotpun cenovnik' : `cene od ${q.supplier.updated}`}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => {
                const vals = c.quotes.map(q => (q.lines && !lacks(q, i) ? q.lines[i] : null));
                const cmp = c.quotes.map((q, j) => (incomplete(q) ? null : vals[j])); // only complete offers compete for "cheapest"
                const nums = cmp.filter((x): x is number => x !== null), min = Math.min(...nums);
                return (
                  <tr key={l}>
                    <td className="first">{l}</td>
                    {vals.map((x, j) => <td key={j} className={cmp[j] !== null && cmp[j] === min && nums.length > 1 ? 'cheap' : undefined}>{x === null ? '—' : x === 0 ? 'besplatno' : rsd(x)}</td>)}
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
                      {q.total === null || incomplete(q) ? '—' : rsd(q.total)}
                      <div className={isBest ? 'win' : undefined}>{q.total === null ? 'nema cene' : incomplete(q) ? 'nepotpuno' : isBest ? 'Najpovoljnije' : `+${rsd(q.total - (c.best ?? 0))}`}</div>
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
              {!splitOpen ? <button type="button" onClick={() => setSplitOpen(true)}>Podeli narudžbinu i pošalji</button> : <div className="cp-steps">
                <button type="button" disabled={busy} onClick={() => sendTo([c.split!.sheetsAt], { parts: true, tops: false, hw: false }, `Narudžbina — ${project.name}`,
                  `Poštovani,\n\nnaručujem ploče, sečenje i kantovanje po priloženoj krojnoj listi (${pieces} ${partsWord(pieces)}).\nRadne ploče naručujem posebno.\n\nHvala`, `narudzbina-ploce-${base}`)}>
                  1 · {c.split.sheetsAt.name}: ploče, sečenje, kant</button>
                <button type="button" disabled={busy} onClick={() => sendTo([c.split!.worktopsAt], { parts: false, tops: true, hw: false }, `Narudžbina radnih ploča — ${project.name}`,
                  `Poštovani,\n\nnaručujem radne ploče sa izrezima po prilogu (${tops} kom).\n\nHvala`, `narudzbina-radne-ploce-${base}`)}>
                  2 · {c.split.worktopsAt.name}: radne ploče</button>
              </div>}
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

/** "+ Dodaj firmu i cenovnik": name, e-mail, lead time and (optionally) its price list; without a list it waits for an answer. */
function AddFirm({ project, taken, onSave, onCancel }: { project: Project; taken: string[]; onSave: (s: Supplier, unknown: string[]) => void; onCancel: () => void }) {
  const [f, setF] = useState({ name: '', email: '', lead: '' });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form className="cp-add" aria-label="Nova firma" onSubmit={async e => {
      e.preventDefault();
      if (!f.name.trim()) { setErr('Upiši naziv firme.'); return; }
      let id = fileSlug(f.name) || 'firma';
      while (taken.includes(id)) id += '-2';
      let prices: Supplier['prices'] = null, unknown: string[] = [];
      if (file) {
        try { const r = importPrices(await readSheetRows(file), project.materials); prices = supplierPrices(r); unknown = r.unknown; }
        catch { setErr(`„${file.name}“ nije moguće pročitati. Uvozi se Excel (.xlsx, .xls) ili CSV.`); return; }
      }
      const d = new Date();
      onSave({ id, name: f.name.trim(), updated: prices ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.` : '',
        leadDays: f.lead ? Number(f.lead) || null : null, prices, ...(f.email.trim() && { email: f.email.trim() }) }, unknown);
    }}>
      <label className="wide">Naziv firme<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label className="wide">E-pošta (za upit i narudžbinu)<input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
      <label>Rok isporuke (dana)<input inputMode="numeric" value={f.lead} onChange={e => setF({ ...f, lead: e.target.value.replace(/\D/g, '') })} /></label>
      <div className="cp-file">
        <button type="button" onClick={() => ref.current?.click()}>{file ? file.name : 'Cenovnik firme (Excel/CSV)…'}</button>
        <input ref={ref} type="file" hidden accept=".csv,.xlsx,.xls" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <span>{file ? '' : 'bez cenovnika: firma čeka odgovor na upit'}</span>
      </div>
      {err && <p className="cp-err" role="alert">{err}</p>}
      <div className="cp-btns"><button type="submit" className="accent">Dodaj firmu</button><button type="button" onClick={onCancel}>Otkaži</button></div>
    </form>
  );
}
