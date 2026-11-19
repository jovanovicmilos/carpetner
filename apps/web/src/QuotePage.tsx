// Quote screen (design/screens/Obracun.html): sheets + saw shop, hardware, labour, margin, VAT, from the cut list × price list.
// Prices come from Admin → Cenovnik (prices.ts); once a PDF is made they are frozen for the project (quotes.ts) until "Preračunaj".
// "Pošalji kupcu": system share sheet with the PDF (tablet/phone), else PDF download + mailto. shortcut: no server e-mail until the backend.
// "Napravi PDF" downloads quotePdf.ts (loaded on demand: pdf-lib + font).
import { DEFAULT_QUOTE, PRESETS, quote } from 'engine';
import { pricedProject, usePrices } from './prices';
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Header } from './Header';
import { Tip } from './help';
import { num } from './labels';
import { useProject } from './store';
import { downloadFiles, useShare } from './share';
import { sameCenovnik, useQuotes } from './quotes';

const rsd = (p: number) => Math.round(p / 100).toLocaleString('sr-Latn');

export function QuotePage() {
  const project = useProject(s => s.project);
  const current = usePrices();
  const issued = useQuotes(s => (project ? s.byProject[project.id] : undefined));
  const { issue, drop } = useQuotes();
  // A made quote keeps its prices; the current Cenovnik applies again only after "Preračunaj".
  const settings = issued ? { ...issued.frozen, marginPct: issued.marginPct } : current;
  const { prices, vatPct } = settings;
  const [margin, setMargin] = useState(String(issued?.marginPct ?? current.marginPct));
  const [discount, setDiscount] = useState(String(issued?.discountPct ?? DEFAULT_QUOTE.discountPct));
  const [onlyTotal, setOnlyTotal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { share, ready, retry } = useShare();
  if (!project) return <Navigate to="/" replace />;
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  const opt = { ...DEFAULT_QUOTE, vatPct, marginPct: Math.min(200, num(margin)), discountPct: Math.min(100, num(discount)) };
  const q = quote(pricedProject(project, settings), prices, opt, dims.worktopDepth);
  const tips = ['quote.sheets', null, null] as const;

  /** Makes the PDF (and freezes the prices: the quote is issued), then downloads or shares it. */
  async function run(how: 'download' | 'send') {
    setBusy(true); setPdfError(null);
    try {
      const { quotePdf } = await import('./quotePdf');
      const bytes = await quotePdf({ project: project!, q, opt, onlyTotal, worktopThickness: dims.worktopThickness, date: new Date() });
      const slug = project!.name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'kuhinja'; // as Nacrti exports
      const file = new File([bytes as Uint8Array<ArrayBuffer>], `ponuda-${slug}.pdf`, { type: 'application/pdf' });
      const { prices: fp, vatPct: fv, wastePct, rounding } = settings;
      issue(project!.id, { frozen: { prices: fp, vatPct: fv, wastePct, rounding }, marginPct: opt.marginPct, discountPct: opt.discountPct, total: q.total, createdAt: new Date().toISOString() });
      const subject = `Ponuda — ${project!.name}`;
      const body = `Poštovani,\n\nu prilogu je ponuda za kuhinju „${project!.name}“: ukupno ${rsd(q.total)} RSD sa PDV-om.\nAparati (rerna, ploča, MSP, frižider, sudopera) nisu uključeni.\n\nSrdačan pozdrav`;
      // Tablet / phone: the system share sheet sends the PDF itself (Mail, Viber, WhatsApp…).
      if (how === 'send' && await share({ files: [file], title: subject, text: body })) return;
      downloadFiles([file]);
      // Computer: the PDF is downloaded; a new e-mail opens with the text, the PDF is attached by hand (mailto cannot attach).
      if (how === 'send') window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n(PDF ponude je preuzet — priložite ga.)')}`;
    } catch (err) {
      console.error(err);
      setPdfError('PDF nije napravljen. Pokušaj ponovo; ako se ponovi, javi nam.');
    } finally { setBusy(false); }
  }

  return (
    <div className="app">
      <Header />
      <div className="qt-page">
        <div className="qt-main">
          <div>
            <h1>Obračun kuhinje</h1>
            <p>Izračunato automatski iz krojne liste × cenovnik radionice · cene u RSD bez PDV-a</p>
          </div>
          {q.unpriced.length > 0 && (
            <div className="alert" role="alert">Nema cene u cenovniku za: {q.unpriced.join(', ')} — ove ploče su računate 0 RSD. Dodaj cenu u <Link to="/admin/cenovnik">Cenovnik</Link>.</div>
          )}
          {issued && (
            <div className={sameCenovnik(issued.frozen, current) ? 'qt-frozen' : 'qt-frozen changed'} role="status">
              <span>{sameCenovnik(issued.frozen, current)
                ? `Cene su zamrznute u ponudi od ${new Date(issued.createdAt).toLocaleDateString('sr-Latn')} (ukupno ${rsd(issued.total)} RSD).`
                : `Cenovnik je promenjen posle ponude od ${new Date(issued.createdAt).toLocaleDateString('sr-Latn')}. Obračun i dalje koristi cene iz ponude.`}</span>
              {!sameCenovnik(issued.frozen, current) && (
                <button type="button" onClick={() => { drop(project.id); setMargin(String(current.marginPct)); }}>Preračunaj po novom cenovniku</button>
              )}
            </div>
          )}
          {q.sections.map((s, i) => (
            <section key={s.title} className="qt-box" aria-label={s.title}>
              <h2>{i + 1} · {s.title}{tips[i] && <Tip k={tips[i]!} align="right" />}</h2>
              <div className={i < 2 ? 'qt-scroll' : undefined}>
                <table className={i < 2 ? 'wide' : undefined}>
                  {i === 0 && <thead><tr><th>Stavka</th><th className="r">Količina</th><th className="r">Cena</th><th className="r last">Iznos</th></tr></thead>}
                  <tbody>
                    {s.lines.map(l => <tr key={l.name}><td className="name">{l.name}</td><td className="r">{l.qty}</td><td className="r">{l.price}</td><td className="r last">{rsd(l.amount)}</td></tr>)}
                    <tr className="sum"><td className="name">Ukupno {i + 1}</td><td /><td /><td className="r last">{rsd(s.total)}</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
        <aside aria-label="Ukupna cena" className="qt-side">
          <section className="qt-total">
            <h2>Cena kuhinje<Tip k="quote.total" align="left" /></h2>
            <div className="row"><span>Materijal i pilana</span><span className="m">{rsd(q.material)}</span></div>
            <div className="row"><span>Okov i repro</span><span className="m">{rsd(q.hardware)}</span></div>
            <div className="row"><span>Rad</span><span className="m">{rsd(q.labour)}</span></div>
            <div className="row"><span>Marža {opt.marginPct}% na materijal i okov</span><span className="m">{rsd(q.margin)}</span></div>
            {q.discount > 0 && <div className="row"><span>Popust {opt.discountPct}%</span><span className="m">−{rsd(q.discount)}</span></div>}
            <div className="row net"><span>Bez PDV-a</span><span className="m">{rsd(q.net)}</span></div>
            <div className="row"><span>PDV {opt.vatPct}%</span><span className="m">{rsd(q.vat)}</span></div>
            <div className="row big"><span>Ukupno</span><span className="m">{rsd(q.total)} RSD</span></div>
            <p>Aparati (rerna, ploča, MSP, frižider, sudopera) nisu uključeni — kupac ih nabavlja.</p>
          </section>
          <section className="qt-adjust">
            <h2>Prilagodi ponudu<Tip k="quote.adjust" align="left" /></h2>
            <label>Marža (%)<input type="text" inputMode="numeric" value={margin} onChange={e => setMargin(e.target.value)} /></label>
            <label>Popust kupcu (%)<input type="text" inputMode="numeric" value={discount} onChange={e => setDiscount(e.target.value)} /></label>
            <label className="chk"><input type="checkbox" checked={onlyTotal} onChange={e => setOnlyTotal(e.target.checked)} />Prikaži kupcu samo ukupnu cenu</label>
            <button type="button" className="primary" disabled={busy} onClick={() => run('download')}>{busy ? 'Pravim PDF…' : 'Napravi PDF ponudu sa 3D slikom'}</button>
            {pdfError && <div className="alert" role="alert">{pdfError}</div>}
            {ready && <button type="button" className="primary" onClick={retry}>PDF je spreman — pošalji</button>}
            <button type="button" disabled={busy} onClick={() => run('send')}>Pošalji kupcu na e-poštu</button>
          </section>
        </aside>
      </div>
    </div>
  );
}
