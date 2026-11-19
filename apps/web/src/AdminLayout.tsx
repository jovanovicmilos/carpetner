// Admin shell (design/screens/Cenovnik.html, Standardi.html, AIPodesavanja.html): dark side navigation + page.
import { NavLink } from 'react-router';

type Nav = [string, [string, string | null][]][];
// The reference screens show three variants of this menu (Cenovnik: full; Standardi: short; AI: ai) — kept as drawn.
const NAV: Record<'full' | 'short' | 'ai', Nav> = {
  full: [
    ['Radionica', [['Projekti i ponude', '/ponuda'], ['Cenovnik', '/admin/cenovnik'], ['Materijali, ručke, aparati', '/admin/biblioteka'], ['Podrazumevane mere', '/admin/standardi'],
      ['Katalog elemenata', null], ['Dobavljači i pilane', null], ['Zaposleni i uloge', null]]],
    ['Platforma', [['Pretplate i računi', null], ['Radionice (korisnici)', null], ['Globalni katalog okova', null]]],
  ],
  short: [['Radionica', [['Projekti i ponude', '/ponuda'], ['Cenovnik', '/admin/cenovnik'], ['Podrazumevane mere', '/admin/standardi'],
    ['Šabloni elemenata', null], ['AI asistent', '/admin/ai'], ['Dobavljači i pilane', null]]]],
  ai: [['', [['Cenovnik', '/admin/cenovnik'], ['Podrazumevane mere', '/admin/standardi'], ['AI asistent', '/admin/ai'], ['Dobavljači i pilane', '/poredjenje']]]],
};

export function AdminLayout({ children, nav = 'full' }: { children: React.ReactNode; nav?: 'full' | 'short' | 'ai' }) {
  return (
    <div className="ad-shell">
      <nav aria-label="Administracija" className="ad-nav">
        <div className="ad-brand">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#F3F1EC" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#E2804D" strokeWidth="2" /></svg>
          <span className="n">Kroj</span><span className="b">ADMIN</span>
        </div>
        {NAV[nav].map(([group, items], gi) => (
          <div key={group} className="ad-group">
            {group && <div className={`ad-group-t${gi ? ' later' : ''}`}>{group}</div>}
            {items.map(([t, to]) => (to
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
