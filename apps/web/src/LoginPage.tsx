// Sign in / new workshop (design/screens/Prijava.html).
// shortcut: there are no accounts yet (Supabase Auth, MVP 8) — submitting opens Brzi start like the design's link;
// nothing typed here is stored or sent anywhere.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useProjects } from './projects';

export function LoginPage() {
  const [reg, setReg] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="lg-shell">
      <section className="lg-side">
        <Link to="/sajt" className="lg-brand">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#F3F1EC" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#E2804D" strokeWidth="2" /></svg>
          <span>Kroj</span>
        </Link>
        <h1>Tvoja radionica, tvoje mere, tvoje cene.</h1>
        <div className="lg-points">
          <div><span className="a">→</span><span>Projekti su vezani za radionicu, ne za računar — rade na tabletu u stanu kupca i na računaru u radionici.</span></div>
          <div><span className="a">→</span><span>Vlasnik radionice postavlja cenovnik i pravila, majstori crtaju i šalju krojne liste.</span></div>
        </div>
        <div className="lg-foot">14 dana besplatno · bez kartice</div>
      </section>
      <main className="lg-main">
        <form className="lg-form" onSubmit={e => { e.preventDefault(); navigate(Object.keys(useProjects.getState().list).length ? '/projekti' : '/'); }}>
          <div role="tablist" aria-label="Nalog" className="lg-tabs">
            <button type="button" role="tab" aria-selected={!reg} onClick={() => setReg(false)}>Prijava</button>
            <button type="button" role="tab" aria-selected={reg} onClick={() => setReg(true)}>Nova radionica</button>
          </div>
          <h2>{reg ? 'Otvori nalog radionice' : 'Dobro došao nazad'}</h2>
          {reg && <label>Naziv radionice<input type="text" autoComplete="organization" /></label>}
          <label>E-pošta<input type="email" autoComplete="email" /></label>
          <label>Lozinka<input type="password" autoComplete={reg ? 'new-password' : 'current-password'} /></label>
          {!reg && <a href="#" className="lg-forgot" aria-disabled="true" onClick={e => e.preventDefault()}>Zaboravljena lozinka?</a>}
          <button type="submit" className="lg-cta">{reg ? 'Započni 14 dana probe' : 'Prijavi se'}</button>
          <div className="lg-or"><span />ili<span /></div>
          <button type="button" className="lg-google" aria-disabled="true" title="Uskoro">Nastavi sa Google nalogom</button>
          <p>Pozvan si od strane radionice? Otvori link iz pozivnice — nalog se automatski veže za tu radionicu.</p>
        </form>
      </main>
    </div>
  );
}
