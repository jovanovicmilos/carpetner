// Project screens' header (design/screens/AppShell.html, user 2026-11-21): row 1 = main menu, row 2 = project bar (AppShell.tsx).
// `kind: 'new'` = Brzi start / AI (no project yet): row 2 offers the ways to start one. `units` is kept for the callers; the
// project bar always has mm/cm.
import { NavLink, Link } from 'react-router';
import { MainMenu, ProjectBar } from './AppShell';

const NEW_STEP = 'k-step inline-flex items-center rounded-[14px] px-3 py-1 text-[13px] font-medium text-foreground no-underline hover:bg-[#E2EFE6] hover:text-foreground [&.active]:bg-dark [&.active]:text-white';

/** Both rows stay at the top while a long page scrolls (user 2026-11-21: fixed navigation on desktop). */
const TOP = 'sticky top-0 z-40 flex flex-none flex-col';

export function Header({ kind = 'project' }: { kind?: 'project' | 'new'; units?: boolean }) {
  if (kind === 'project') return <div className={TOP}><MainMenu current="projekat" /><ProjectBar /></div>;
  return <div className={TOP}>
    <MainMenu current="projekti" />
    <ProjectBar />
    <div className="flex h-[50px] flex-none items-center gap-3 border-0 border-b border-solid border-border bg-white px-4">
      <span className="text-[14px] font-semibold">Novi projekat</span>
      <nav aria-label="Način pravljenja" className="mx-auto flex items-center gap-1">
        <NavLink to="/brzi-start" className={NEW_STEP}>Brzi start</NavLink>
        <NavLink to="/ai-predlog" className={NEW_STEP}>Iz fotografije (AI)</NavLink>
        <Link to="/projekat" className={NEW_STEP}>Prazan projekat</Link>
      </nav>
    </div>
  </div>;
}
