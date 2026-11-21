// Workshop pages outside a project (Upiti, Saradnja, Profil radionice): the shell's main menu (design AppShell, 2026-11-21).
// `current` keeps the old section names: Upiti (Saradnja belongs to it), Projekti, anything else = a Radionica page.
import { MainMenu, ProjectBar } from './AppShell';

export function WorkshopHeader({ current }: { current: string }) {
  return <div className="sticky top-0 z-40 flex flex-none flex-col"><MainMenu current={current === 'Upiti' ? 'upiti' : current === 'Projekti' ? 'projekti' : 'radionica'} /><ProjectBar /></div>; // fixed while the page scrolls
}
