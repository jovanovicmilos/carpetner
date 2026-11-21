// Saw-shop comparison (design/screens/Poredjenje.html), a sub-screen of Krojna lista.
// Firms come from suppliers.ts (the design's examples + firms added with their price list). Inquiries and split orders
// send the cut-list package (orderPackage.ts) through the share sheet, or download + e-mail on a computer.
import { compareSuppliers, cuttingMeters, edgeTotals, generateParts, importPrices, PRESETS, sheetEstimate, worktops, type Project, type Supplier } from 'engine';
import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BACK } from './ui';
import { Locked } from './locks';
import { AdminLayout } from './AppShell';
import { Tip } from './help';
import { pricedProject, usePrices } from './prices';
import { useProject } from './store';
import { fileSlug, orderFiles, type PackageParts } from './orderPackage';
import { readSheetRows } from './sheetFile';
import { downloadFiles, useShare } from './share';
import { supplierPrices, useSuppliers } from './suppliers';

const rsd = (p: number) => Math.round(p / 100).toLocaleString('sr-Latn');
const partsWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'deo' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'dela' : 'delova');

const HBTN = 'min-h-11 px-3.5 py-2.5 text-[14px]';
const TH = 'border-0 bg-transparent px-2 py-3.5 text-right align-middle text-[14px] font-semibold text-foreground';
const TD = 'border-0 border-t border-solid border-line-soft px-2 py-2.5 text-right align-middle font-mono';
const FIRST = 'border-0 border-t border-solid border-line-soft py-2.5 pr-2 pl-0 text-left align-middle font-sans';
const CHEAP = 'bg-ok-soft font-semibold text-ok';
const SPLIT_P = 'm-0 text-[15px] leading-normal text-on-dark-muted';
const ONDARK = 'min-h-12 justify-start bg-accent-on-dark px-4 text-[15px] text-foreground disabled:opacity-60';
const ADD_L = 'flex flex-col gap-1 text-[13px] text-muted-foreground';
const ADD_I = 'h-auto min-h-10 border-border p-2 text-[14px]';
const SMALL = 'min-h-10 px-3 text-[14px] font-normal';

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
  if (!stored) return <Navigate to="/brzi-start" replace />;
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
    <AdminLayout current="Dobavljači">
      <div className="flex w-full max-w-[1360px] flex-col gap-5">
        <Locked feature="pilana" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Link to="/krojna-lista" className={cn(BACK, 'mb-2')}><span aria-hidden="true">←</span>Krojna lista</Link>
            <h1 className="m-0 text-[28px]">Gde je najbolja ponuda?<Tip k="compare.title" align="right" /></h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">Ista krojna lista ({pieces} {partsWord(pieces)}, {edgeM} m kanta, {tops} radne ploče) obračunata po cenovniku svake firme · RSD bez PDV-a · primer cena</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="none" className={HBTN} onClick={exportXlsx}>Izvezi poređenje (Excel)</Button>
            <Button variant="outline" size="none" className={HBTN} onClick={() => window.print()}>PDF</Button>
            <Button size="none" className={HBTN} disabled={busy || !shown.length} onClick={inquiry}>Pošalji upit izabranima</Button>
          </div>
        </div>
        <fieldset className="m-0 flex flex-wrap items-center gap-[18px] rounded-xl border border-solid border-border bg-white px-[18px] py-3.5">
          <legend className="px-1.5 text-[13px] text-muted-foreground">Firme u poređenju<Tip k="compare.firms" align="right" /></legend>
          {suppliers.map(s => (
            <span key={s.id} className="inline-flex items-center">
              <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[14px]"><Checkbox checked={!off[s.id]} onCheckedChange={() => setOff({ ...off, [s.id]: !off[s.id] })} />{s.name}</label>
              <Button variant="ghost" size="none" className="min-h-7 min-w-7 text-muted-foreground hover:bg-transparent" aria-label={`Ukloni ${s.name}`} onClick={() => remove(s.id)}>×</Button>
            </span>
          ))}
          {!adding && <Button variant="outline" size="none" className="ml-auto min-h-10 border-dashed border-muted-foreground px-3 py-2 text-[14px] font-normal" onClick={() => setAdding(true)}>+ Dodaj firmu i cenovnik</Button>}
        </fieldset>
        {adding && <AddFirm project={project} taken={suppliers.map(s => s.id)} onCancel={() => setAdding(false)}
          onSave={(s, unknown) => { save(s); setAdding(false); setMsg(unknown.length ? `${s.name} je dodata. Nije prepoznato u cenovniku (${unknown.length}): ${unknown.slice(0, 6).join('; ')}${unknown.length > 6 ? '…' : ''}` : `${s.name} je dodata.`); }} />}
        {ready && <Button size="none" className="min-h-10 self-start px-3.5 text-[14px]" onClick={retry}>Fajlovi su spremni — pošalji</Button>}
        {msg && <p className="m-0 rounded-lg border border-solid border-border bg-white px-3.5 py-2.5 text-[14px]" role="status">{msg}</p>}
        <section aria-label="Tabela poređenja" className="overflow-x-auto rounded-xl border border-solid border-border bg-white px-5 pt-2 pb-5">
          <table className="w-full min-w-[760px] border-collapse text-[14px]">
            <thead>
              <tr>
                <th className={cn(TH, 'py-3.5 pr-2 pl-0 text-left text-[13px] font-medium text-muted-foreground')}>Stavka</th>
                {c.quotes.map(q => (
                  <th key={q.supplier.id} className={cn(TH, q.total !== null && q.total === c.best && 'text-ok')}>
                    {q.supplier.name}<div className="text-[12px] font-normal text-muted-foreground">{!q.supplier.prices ? 'čeka odgovor na upit' : incomplete(q) ? 'nepotpun cenovnik' : `cene od ${q.supplier.updated}`}</div>
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
                    <td className={FIRST}>{l}</td>
                    {vals.map((x, j) => <td key={j} className={cn(TD, cmp[j] !== null && cmp[j] === min && nums.length > 1 && CHEAP)}>{x === null ? '—' : x === 0 ? 'besplatno' : rsd(x)}</td>)}
                  </tr>
                );
              })}
              <tr>
                <td className={FIRST}>Rok isporuke</td>
                {c.quotes.map(q => <td key={q.supplier.id} className={TD}>{q.supplier.leadDays === null ? '—' : `${q.supplier.leadDays} dana`}</td>)}
              </tr>
              <tr className="[&>td]:border-t-2 [&>td]:border-foreground [&>td]:py-3.5">
                <td className={FIRST}>Ukupno</td>
                {c.quotes.map(q => {
                  const isBest = q.total !== null && q.total === c.best;
                  return (
                    <td key={q.supplier.id} className={cn(TD, 'text-[18px] font-semibold', isBest && CHEAP)}>
                      {q.total === null || incomplete(q) ? '—' : rsd(q.total)}
                      <div className={cn('font-sans text-[12px] font-medium', isBest ? 'text-ok' : 'text-muted-foreground')}>{q.total === null ? 'nema cene' : incomplete(q) ? 'nepotpuno' : isBest ? 'Najpovoljnije' : `+${rsd(q.total - (c.best ?? 0))}`}</div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </section>
        <div className="flex flex-wrap gap-5">
          <section className="flex min-w-0 flex-[1_1_460px] flex-col gap-2.5 rounded-xl bg-dark p-[22px] text-background">
            <h2 className="m-0 text-[17px]">Najbolja kombinacija<Tip k="compare.split" align="right" /></h2>
            {c.split ? <>
              <p className={SPLIT_P}>Ploče, sečenje i kantovanje kod {c.split.sheetsAt.name}, radne ploče kod {c.split.worktopsAt.name}. Dve isporuke.</p>
              <div className="flex items-baseline justify-between border-0 border-t border-solid border-muted-foreground pt-3"><span>Ukupno</span><span className="font-mono text-[28px] text-[#A9D6BA]">{rsd(c.split.total)} RSD</span></div>
              <div className="text-[13px] text-[#C9C3B8]">{rsd(c.split.saving)} RSD jeftinije od najboljeg pojedinačnog dobavljača — app predlaže podelu samo kada ušteda pokrije dodatnu dostavu.</div>
              {!splitOpen ? <Button size="none" className={cn(ONDARK, 'mt-1.5 justify-center')} onClick={() => setSplitOpen(true)}>Podeli narudžbinu i pošalji</Button> : <div className="flex flex-col gap-2">
                <Button size="none" className={ONDARK} disabled={busy} onClick={() => sendTo([c.split!.sheetsAt], { parts: true, tops: false, hw: false }, `Narudžbina — ${project.name}`,
                  `Poštovani,\n\nnaručujem ploče, sečenje i kantovanje po priloženoj krojnoj listi (${pieces} ${partsWord(pieces)}).\nRadne ploče naručujem posebno.\n\nHvala`, `narudzbina-ploce-${base}`)}>
                  1 · {c.split.sheetsAt.name}: ploče, sečenje, kant</Button>
                <Button size="none" className={ONDARK} disabled={busy} onClick={() => sendTo([c.split!.worktopsAt], { parts: false, tops: true, hw: false }, `Narudžbina radnih ploča — ${project.name}`,
                  `Poštovani,\n\nnaručujem radne ploče sa izrezima po prilogu (${tops} kom).\n\nHvala`, `narudzbina-radne-ploce-${base}`)}>
                  2 · {c.split.worktopsAt.name}: radne ploče</Button>
              </div>}
            </> : <p className={SPLIT_P}>Podela narudžbine ne donosi uštedu — naruči sve kod najpovoljnijeg dobavljača.</p>}
          </section>
          <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5 rounded-xl border border-solid border-border bg-white p-[22px] text-[14px] leading-normal">
            <h2 className="m-0 text-[17px]">Odakle dolaze cene</h2>
            {[['Uvoz Excel/CSV cenovnika firme', 'ručno, svaki put kad stigne novi'], ['Firma sama održava cenovnik u Kroju', 'partnerski nalog'], ['Upit sa krojnom listom → odgovor sa cenom', 'za firme bez cenovnika']].map(([a, b], i) => (
              <div key={a} className={cn('flex justify-between gap-3 py-1.5', i < 2 && 'border-0 border-b border-solid border-line-soft')}><span>{a}</span><span className="text-muted-foreground">{b}</span></div>
            ))}
            {notes.map(n => <div key={n} className="rounded-md bg-accent-soft p-2.5 text-accent-ink">{n}</div>)}
          </section>
        </div>
        </Locked>
      </div>
    </AdminLayout>
  );
}

/** "+ Dodaj firmu i cenovnik": name, e-mail, lead time and (optionally) its price list; without a list it waits for an answer. */
function AddFirm({ project, taken, onSave, onCancel }: { project: Project; taken: string[]; onSave: (s: Supplier, unknown: string[]) => void; onCancel: () => void }) {
  const [f, setF] = useState({ name: '', email: '', lead: '' });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form className="flex flex-wrap items-end gap-x-3 gap-y-2.5 rounded-xl border border-dashed border-muted-foreground bg-white p-3.5" aria-label="Nova firma" onSubmit={async e => {
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
      <label className={cn(ADD_L, 'flex-[1_1_220px]')}>Naziv firme<Input className={ADD_I} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label className={cn(ADD_L, 'flex-[1_1_220px]')}>E-pošta (za upit i narudžbinu)<Input className={ADD_I} type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
      <label className={ADD_L}>Rok isporuke (dana)<Input className={ADD_I} inputMode="numeric" value={f.lead} onChange={e => setF({ ...f, lead: e.target.value.replace(/\D/g, '') })} /></label>
      <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
        <Button variant="outline" size="none" className={SMALL} onClick={() => ref.current?.click()}>{file ? file.name : 'Cenovnik firme (Excel/CSV)…'}</Button>
        <input ref={ref} type="file" hidden accept=".csv,.xlsx,.xls" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <span>{file ? '' : 'bez cenovnika: firma čeka odgovor na upit'}</span>
      </div>
      {err && <p className="m-0 flex-[1_1_100%] text-[13px] text-[#A3261F]" role="alert">{err}</p>}
      <div className="flex gap-2"><Button type="submit" size="none" className="min-h-10 px-3.5 text-[14px]">Dodaj firmu</Button><Button variant="outline" size="none" className={SMALL} onClick={onCancel}>Otkaži</Button></div>
    </form>
  );
}
