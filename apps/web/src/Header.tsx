// App header per design/*.dc.html: logo, project name, step navigation, mm/cm, Pomoć.
import type { Unit } from 'engine';
import { Link, NavLink, useLocation } from 'react-router';
import { useHelp } from './help';
import { useProject } from './store';

// Sub-screens keep their parent step active (DESIGN_SPEC §6): Zid → 1 Prostor, Poređenje → 5 Krojna lista, Element → 4 Elementi.
const PARENT: [string, string][] = [['/zid/', '1 Prostor'], ['/element/', '4 Elementi'], ['/poredjenje', '5 Krojna lista']];

/** `kind: 'new'` = Quick start header (no project yet); `units` shows the mm/cm switch (screens that show dimensions). */
export function Header({ kind = 'project', units = false }: { kind?: 'project' | 'new'; units?: boolean }) {
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const [help, toggleHelp] = useHelp();
  const { pathname } = useLocation();
  const firstEl = project?.elements[0]?.id;
  const steps: { label: string; to: string | null }[] = [
    { label: '1 Prostor', to: '/projekat' },
    { label: '2 Nacrti', to: '/nacrti' },
    { label: '3 3D', to: null },
    { label: '4 Elementi', to: firstEl ? `/element/${firstEl}` : null },
    { label: '5 Krojna lista', to: '/krojna-lista' },
    { label: '6 Ponuda', to: null },
  ];
  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Kroj — početna">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#F3F1EC" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#E2804D" strokeWidth="2" /></svg>
        <span>Kroj</span>
      </Link>
      <div className="project-name">
        {kind === 'new' ? 'Novi projekat' : <>Projekat: <strong>{project?.name ?? '—'}</strong></>}
      </div>
      {kind === 'new' ? (
        <nav aria-label="Način pravljenja" className="steps">
          <NavLink to="/" end>Brzi start</NavLink>
          <span className="step-off" aria-disabled="true" title="Uskoro">Iz fotografije (AI)</span>
          <Link to="/projekat">Prazan projekat</Link>
        </nav>
      ) : (
        <nav aria-label="Koraci projekta" className="steps">
          {steps.map(s => s.to
            ? <NavLink key={s.label} to={s.to} className={({ isActive }) => (isActive || PARENT.some(([p, l]) => l === s.label && pathname.startsWith(p)) ? 'active' : undefined)}>{s.label}</NavLink>
            : <span key={s.label} className="step-off" aria-disabled="true" title="Uskoro">{s.label}</span>)}
        </nav>
      )}
      {units && project && (
        <div role="group" aria-label="Jedinice" className="units">
          {(['mm', 'cm'] as Unit[]).map(u => (
            <button key={u} type="button" aria-pressed={project.unit === u} onClick={() => change(p => ({ ...p, unit: u }), false)}>{u}</button>
          ))}
        </div>
      )}
      <button type="button" className="help-btn" aria-pressed={help} onClick={toggleHelp} title="Uključi ili isključi objašnjenja (oznake i) na svim ekranima">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 7v4.5M8 4.6v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Pomoć
      </button>
    </header>
  );
}
