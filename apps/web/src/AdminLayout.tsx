// Admin shell (design/screens/Cenovnik.html, Standardi.html, AIPodesavanja.html): dark side navigation + page.
import { NavLink } from 'react-router';

const NAV: [string, [string, string | null][]][] = [
  ['Radionica', [['Projekti i ponude', '/ponuda'], ['Cenovnik', '/admin/cenovnik'], ['Materijali i dekori', null], ['Podrazumevane mere', '/admin/standardi'],
    ['Šabloni elemenata', null], ['Dobavljači i pilane', null], ['Zaposleni i uloge', null], ['AI asistent', '/admin/ai']]],
  ['Platforma', [['Pretplate i računi', null], ['Radionice (korisnici)', null], ['Globalni katalog okova', null]]],
];

export function AdminLayout({ children, extraNav = true }: { children: React.ReactNode; extraNav?: boolean }) {
  return (
    <div className="ad-shell">
      <nav aria-label="Administracija" className="ad-nav">
        <div className="ad-brand">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#F3F1EC" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#E2804D" strokeWidth="2" /></svg>
          <span className="n">Kroj</span><span className="b">ADMIN</span>
        </div>
        {NAV.map(([group, items], gi) => (
          <div key={group} className="ad-group">
            <div className={`ad-group-t${gi ? ' later' : ''}`}>{group}</div>
            {items.filter(([t]) => extraNav || t !== 'AI asistent').map(([t, to]) => (to
              ? <NavLink key={t} to={to} className="ad-link">{t}</NavLink>
              // shortcut: admin sections without a screen yet
              : <span key={t} className="ad-link" aria-disabled="true" title="Uskoro">{t}</span>))}
          </div>
        ))}
      </nav>
      <main className="ad-main">{children}</main>
    </div>
  );
}
