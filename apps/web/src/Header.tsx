import { NavLink } from 'react-router';
import { useHelp } from './help';
import { useProject } from './store';

export function Header({ title }: { title: string }) {
  const hasProject = useProject(s => !!s.project);
  const [help, toggleHelp] = useHelp();
  return (
    <header className="topbar">
      <div className="brand">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#F3F1EC" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#E2804D" strokeWidth="2" /></svg>
        <span>Kroj</span>
      </div>
      <div className="muted-light">{title}</div>
      <nav aria-label="Glavna navigacija" className="tabs">
        <NavLink to="/" end>Brzi start</NavLink>
        <NavLink to="/projekat">Prostor</NavLink>
        {hasProject && <NavLink to="/zid">Zidovi</NavLink>}
        {hasProject && <NavLink to="/krojna-lista">Krojna lista</NavLink>}
      </nav>
      <button type="button" className="help-btn" aria-pressed={help} onClick={toggleHelp} title="Uključi ili isključi objašnjenja (oznake i) na svim ekranima">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 7v4.5M8 4.6v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Pomoć
      </button>
    </header>
  );
}
