// Admin shell (design/screens/Cenovnik.html, Standardi.html, AIPodesavanja.html): dark side navigation + page.
import { NavLink } from 'react-router';
import { BRAND, BrandMark } from './brand';

// One menu on every admin screen. The references draw three variants (Cenovnik: full; Standardi: short; AI: ai) — a design
// slip: the menu changed when moving between them (user 2026-11-20). This is Cenovnik's menu plus AI asistent.
const NAV: [string, [string, string | null][]][] = [
  ['Radionica', [['Projekti i ponude', '/ponuda'], ['Cenovnik', '/admin/cenovnik'], ['Materijali, ručke, aparati', '/admin/biblioteka'], ['Podrazumevane mere', '/admin/standardi'],
    ['Katalog elemenata', null], ['AI asistent', '/admin/ai'], ['Dobavljači i pilane', '/poredjenje'], ['Zaposleni i uloge', null]]],
  ['Platforma', [['Pretplate i računi', null], ['Radionice (korisnici)', null], ['Globalni katalog okova', null]]],
];

const LINK = 'flex min-h-10 items-center rounded-md px-2.5 text-[14px] text-background no-underline [&.active]:bg-background [&.active]:font-semibold [&.active]:text-foreground';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-background font-sans text-foreground">
      <nav aria-label="Administracija" className="box-content flex max-w-full flex-[1_1_240px] flex-col gap-1 bg-dark px-3.5 py-5 text-background">
        <div className="flex items-center gap-2.5 px-2 pb-[18px]">
          <BrandMark />
          <span className="text-[18px] font-bold">{BRAND.name}</span><span className="rounded-sm bg-accent-on-dark px-1.5 py-0.5 text-[11px] font-semibold text-foreground">ADMIN</span>
        </div>
        {NAV.map(([group, items], gi) => (
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
