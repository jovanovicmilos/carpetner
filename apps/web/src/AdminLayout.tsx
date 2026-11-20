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

const LINK = 'flex min-h-10 items-center rounded-md px-2.5 text-[14px] text-background no-underline [&.active]:bg-background [&.active]:font-semibold [&.active]:text-foreground';

export function AdminLayout({ children, nav = 'full' }: { children: React.ReactNode; nav?: 'full' | 'short' | 'ai' }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-background font-sans text-foreground">
      <nav aria-label="Administracija" className="box-content flex max-w-full flex-[1_1_240px] flex-col gap-1 bg-dark px-3.5 py-5 text-background">
        <div className="flex items-center gap-2.5 px-2 pb-[18px]">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#F3F1EC" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#8CC5A2" strokeWidth="2" /></svg>
          <span className="text-[18px] font-bold">Kroj</span><span className="rounded-sm bg-accent-on-dark px-1.5 py-0.5 text-[11px] font-semibold text-foreground">ADMIN</span>
        </div>
        {NAV[nav].map(([group, items], gi) => (
          <div key={group} className="contents">
            {group && <div className={`px-2 pb-1 text-[11px] tracking-[0.08em] text-[#C9C3B8] uppercase ${gi ? 'pt-4' : 'pt-2'}`}>{group}</div>}
            {items.map(([t, to]) => (to
              ? <NavLink key={t} to={to} className={LINK}>{t}</NavLink>
              // shortcut: admin sections without a screen yet
              : <span key={t} className={LINK} aria-disabled="true" title="Uskoro">{t}</span>))}
          </div>
        ))}
      </nav>
      <main className="box-border flex min-w-0 flex-[999_1_640px] flex-col gap-5 p-7">{children}</main>
    </div>
  );
}
