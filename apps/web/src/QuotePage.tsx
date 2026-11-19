// Quote screen (design/screens/Obracun.html): sheets + saw shop, hardware, labour, margin, VAT, from the cut list × price list.
// Prices come from Admin → Cenovnik (prices.ts). shortcut: margin/discount live in this screen only and the quote is not frozen yet; "Napravi PDF" prints the page, e-mail is a placeholder.
import { DEFAULT_QUOTE, PRESETS, quote } from 'engine';
import { pricedProject, usePrices } from './prices';
import { useState } from 'react';
import { Navigate } from 'react-router';
import { Header } from './Header';
import { Tip } from './help';
import { num } from './labels';
import { useProject } from './store';

const rsd = (p: number) => Math.round(p / 100).toLocaleString('sr-Latn');

export function QuotePage() {
  const project = useProject(s => s.project);
  const settings = usePrices();
  const { prices, marginPct, vatPct } = settings;
  const [margin, setMargin] = useState(String(marginPct));
  const [discount, setDiscount] = useState(String(DEFAULT_QUOTE.discountPct));
  const [onlyTotal, setOnlyTotal] = useState(true);
  if (!project) return <Navigate to="/" replace />;
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  const opt = { ...DEFAULT_QUOTE, vatPct, marginPct: Math.min(200, num(margin)), discountPct: Math.min(100, num(discount)) };
  const q = quote(pricedProject(project, settings), prices, opt, dims.worktopDepth);
  const tips = ['quote.sheets', null, null] as const;

  return (
    <div className="app">
      <Header />
      <div className="qt-page">
        <div className="qt-main">
          <div>
            <h1>Obračun kuhinje</h1>
            <p>Izračunato automatski iz krojne liste × cenovnik radionice · cene u RSD bez PDV-a</p>
          </div>
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
            <button type="button" className="primary" onClick={() => window.print()}>Napravi PDF ponudu sa 3D slikom</button>
            <button type="button" aria-disabled="true" title="Uskoro">Pošalji kupcu na e-poštu</button>
          </section>
        </aside>
      </div>
    </div>
  );
}
