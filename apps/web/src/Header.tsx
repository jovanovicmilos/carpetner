import { NavLink } from 'react-router';
import { useProject } from './store';

export function Header({ title }: { title: string }) {
  const hasProject = useProject(s => !!s.project);
  return (
    <header className="topbar">
      <div className="brand">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#F3F1EC" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#E2804D" strokeWidth="2" /></svg>
        <span>Kroj</span>
      </div>
      <div className="muted-light">{title}</div>
      <nav aria-label="Glavna navigacija" className="tabs">
        <NavLink to="/" end>Brzi start</NavLink>
        {hasProject && <NavLink to="/projekat">Prostor</NavLink>}
      </nav>
    </header>
  );
}
