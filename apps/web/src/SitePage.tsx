// Public site (design/screens/Sajt.html). The demo card is computed from the shared example project, like every screen.
// shortcut: plan prices are placeholders ([CENA]) until billing is chosen (CLAUDE.md: Paddle / Lemon Squeezy).
import { edgeTotals, fromDataModel, generateParts, quote, sheetEstimate, type DataModelProject } from 'engine';
import { useState } from 'react';
import { Link } from 'react-router';
import { SegmentedControl } from './ui';
import fixture from '../../../fixtures/kuhinja-petrovic.json';

const demo = fromDataModel(fixture.project as unknown as DataModelProject);
const parts = generateParts(demo);
const DEMO = {
  name: demo.name.replace(' (L)', ''),
  size: `${demo.room.walls.find(w => w.id === 'A')?.length} × ${demo.room.walls.find(w => w.id === 'B')?.length}`,
  pieces: parts.reduce((s, p) => s + p.qty, 0),
  sheets: sheetEstimate(parts, demo.materials, demo.rules).reduce((s, x) => s + x.sheets, 0),
  edge: edgeTotals(parts, demo.rules).reduce((s, e) => s + e.orderMeters, 0),
  total: Math.round(quote(demo).total / 100).toLocaleString('sr-Latn'),
};
const PLANS: { name: string; sub: string; items: string[]; cta: string; dark?: boolean }[] = [
  { name: 'Start', sub: 'Stolar koji radi sam', items: ['1 korisnik', '[BROJ] projekata mesečno', '2D, 3D, krojna lista, kantovanje', 'PDF i Excel izvoz'], cta: 'Izaberi Start' },
  { name: 'Radionica', sub: 'Mala i srednja radionica', items: ['Do 3 korisnika', 'Neograničeno projekata', 'Cenovnik i automatske ponude', 'Slanje pilani i okovaru', 'Optimizacija krojenja i nalepnice'], cta: 'Izaberi Radionicu', dark: true },
  { name: 'Pogon', sub: 'Veće firme i proizvodnja', items: ['Neograničeno korisnika i uloge', 'Izvoz za CNC i mašine za kantovanje', 'Magacin ostataka ploča', 'Više lokacija, API'], cta: 'Kontaktiraj nas' },
];
const FEATURES: [string, string][] = [
  ['Prostor i instalacije', 'Zidovi, ugao, prozori, voda, odvod i struja — sa merama od ugla i od poda.'],
  ['Parametarski elementi', 'Promeniš širinu — menjaju se pod, letve, poleđina, fronte i okov. Tvoja pravila konstrukcije.'],
  ['Krojna lista i kantovanje', 'Po elementu i za ceo projekat, u mm ili cm, sa oznakama kanta i optimizacijom ploča.'],
  ['Cena i ponuda odmah', 'Tvoj cenovnik × krojna lista = ponuda u PDF-u sa 3D slikom, za par minuta.'],
];

export function SitePage() {
  const [yearly, setYearly] = useState(false);
  return (
    <div className="st-site">
      <header className="ss-header">
        <div className="ss-wrap ss-bar">
          <div className="ss-brand">
            <svg width="30" height="30" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#1C1B19" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#B4440E" strokeWidth="2" /></svg>
            <span>Kroj</span>
          </div>
          <nav aria-label="Glavni meni" className="ss-nav"><a href="#funkcije">Funkcije</a><a href="#paketi">Paketi</a><a href="#radionice">Za radionice</a></nav>
          <div className="ss-auth"><Link to="/prijava" className="ss-btn line">Prijava</Link><Link to="/prijava" className="ss-btn accent">Probaj besplatno</Link></div>
        </div>
      </header>
      <section className="ss-hero">
        <div className="ss-hero-text">
          <div className="ss-kicker">SOFTVER ZA STOLARE · U BROWSERU</div>
          <h1>Od mere prostora do krojne liste — bez prepisivanja.</h1>
          <p>Nacrtaj prostor i instalacije, složi elemente, pogledaj u 3D. Kroj sam izbacuje krojnu listu, kantovanje, okov i cenu kuhinje — i šalje je pilani.</p>
          <div className="ss-ctas"><Link to="/prijava" className="ss-big accent">Napravi nalog</Link><Link to="/projekat" className="ss-big line">Pogledaj demo projekat</Link></div>
        </div>
        <div className="ss-demo">
          <div className="top"><span>{DEMO.name}</span><span className="m">{DEMO.size}</span></div>
          <div className="stats">
            <div><div className="k">Delova</div><div className="v">{DEMO.pieces}</div></div>
            <div><div className="k">Ploča</div><div className="v">{DEMO.sheets}</div></div>
            <div><div className="k">Kant</div><div className="v">{DEMO.edge} m</div></div>
          </div>
          <div className="price"><span>Cena sa PDV-om</span><span className="m">{DEMO.total} RSD</span></div>
          <div className="note">Primer obračuna iz demo projekta</div>
        </div>
      </section>
      <section id="funkcije" className="ss-features">
        <div className="ss-wrap">
          <h2>Napravljeno za stolarsku radionicu, ne za arhitekte</h2>
          <div className="grid">
            {FEATURES.map(([t, d], i) => <div key={t}><div className="n">0{i + 1}</div><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </div>
      </section>
      <section id="paketi" className="ss-plans">
        <div className="head">
          <div><h2>Paketi</h2><p>Mesečna ili godišnja pretplata · 14 dana probe bez kartice</p></div>
          <SegmentedControl label="Period plaćanja" className="period" value={yearly ? 'y' : 'm'} onChange={v => setYearly(v === 'y')}
            options={[['m', 'Mesečno'], ['y', 'Godišnje · 2 meseca gratis']] as const} />
        </div>
        <div className="cards">
          {PLANS.map(p => (
            <div key={p.name} className={`plan${p.dark ? ' dark' : ''}`}>
              {p.dark
                ? <div className="ph"><div><h3>{p.name}</h3><p>{p.sub}</p></div><span className="badge">Najčešći izbor</span></div>
                : <div><h3>{p.name}</h3><p>{p.sub}</p></div>}
              <div className="pr">€ [CENA]<span> {yearly ? '/ godišnje' : '/ mesečno'}</span></div>
              <ul>{p.items.map(i => <li key={i}>{i}</li>)}</ul>
              <Link to="/prijava" className="cta">{p.cta}</Link>
            </div>
          ))}
        </div>
      </section>
      <footer id="radionice" className="ss-footer">
        <div className="ss-wrap"><span className="b">Kroj</span><span>[KONTAKT E-POŠTA]</span><span>[ADRESA FIRME]</span><span className="r">Uslovi korišćenja · Privatnost</span></div>
      </footer>
    </div>
  );
}
