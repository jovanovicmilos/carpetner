// Workshop pages outside a project (Upiti, Saradnja, Profil radionice): the shell's main menu (design AppShell, 2026-11-21).
// `current` keeps the old section names: Upiti (Saradnja belongs to it), Projekti, anything else = a Radionica page.
import { MainMenu, ProjectBar } from './AppShell';

export function WorkshopHeader({ current }: { current: string }) {
  return <><MainMenu current={current === 'Upiti' ? 'upiti' : current === 'Projekti' ? 'projekti' : 'radionica'} /><ProjectBar /></>;
}
