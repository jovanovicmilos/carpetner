// Workshop main menu of the redesign (design/screens/ProfilRadionice.html, Saradnja.html): dark bar, sections, plan badge.
// `current` marks the section (Saradnja belongs to Upiti, which has no route of its own yet).
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { BRAND, BrandMark } from './brand';

const MENU: [string, string | null, number?][] = [['Projekti', '/projekti'], ['Upiti', null, 3], ['Cenovnik', '/admin/cenovnik'], ['Materijali i katalog', '/admin/biblioteka'], ['Dobavljači', '/poredjenje'], ['Podešavanja', '/podesavanja/profil']];

export function WorkshopHeader({ current }: { current: string }) {
  return (
    <header className="flex flex-wrap items-center gap-4 bg-dark px-5 py-2.5 text-background">
      <Link to="/projekti" aria-label={`${BRAND.name} — svi projekti`} className="flex items-center gap-2.5 text-inherit no-underline hover:text-inherit">
        <BrandMark /><span className="text-[18px] font-bold tracking-[0.02em]">{BRAND.name}</span>
      </Link>
      <nav aria-label="Glavni meni" className="ml-2 flex flex-wrap gap-1">
        {MENU.map(([t, to, badge]) => {
          const cur = t === current;
          const cls = cn('inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[14px] no-underline', cur ? 'bg-background text-foreground hover:text-foreground' : 'text-background hover:bg-dark-hover hover:text-background');
          const b = badge && <span aria-label={`${badge} nova`} className="box-border inline-flex h-5 min-w-5 items-center justify-center rounded-[10px] bg-accent-on-dark px-[5px] text-[12px] font-semibold text-foreground">{badge}</span>;
          // shortcut: Upiti (customer inquiries) has no screen yet
          return to
            ? <Link key={t} to={to} aria-current={cur ? 'page' : undefined} className={cls}>{t}{b}</Link>
            : <span key={t} aria-current={cur ? 'page' : undefined} aria-disabled={cur ? undefined : 'true'} title={cur ? undefined : 'Uskoro'} className={cls}>{t}{b}</span>;
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <Link to="/pretplata" className="rounded-xl bg-accent-on-dark px-2.5 py-1 text-[13px] font-semibold text-foreground no-underline hover:text-foreground">Pro · proba još 12 dana</Link>
        <span className="text-[13px] text-[#D8D3C9]">[Naziv radionice]</span>
      </div>
    </header>
  );
}
