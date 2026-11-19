// App header per design/*.dc.html: logo, project name, step navigation, mm/cm, Pomoć.
import { projectProgress, type StepProgress, type Unit } from 'engine';
import { useMemo } from 'react';
import { Link, NavLink, useLocation, useMatch } from 'react-router';
import { useHelp } from './help';
import { SegmentedControl } from './ui';
import { useProject } from './store';

// Sub-screens keep their parent step active (DESIGN_SPEC §6): Zid → 1 Prostor, Poređenje → 5 Krojna lista, Element → 4 Elementi.
const UNITS = [['mm', 'mm'], ['cm', 'cm']] as const satisfies readonly (readonly [Unit, string])[];
const PARENT: [string, string][] = [['/zid/', '1 Prostor'], ['/element/', '4 Elementi'], ['/prilagodjeni', '4 Elementi'], ['/poredjenje', '5 Krojna lista']];
const STATUS_TEXT = (s: StepProgress) => (s.status === 'done' ? 'završeno' : s.status === 'partial' ? `u toku · ${Math.round(s.part * 100)} %` : 'nije započeto');
const STATUS_COLOR = { done: '#1F5A2A', partial: '#7C2D0A', todo: '#5F5A52' } as const;

/** Step circle (docs/TOK_PROJEKTA.md): done = filled with a tick, partial = progress ring with the number, todo = outline. */
function StepDot({ n, s }: { n: number; s: StepProgress }) {
  if (s.status === 'done') return <span aria-hidden="true" className="k-dot done"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="#1C1B19" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
  if (s.status === 'partial') {
    const p = Math.round(s.part * 100);
    return <span aria-hidden="true" className="k-dot" style={{ background: `conic-gradient(#E2804D 0 ${p}%, #6B665E ${p}% 100%)` }}><span className="k-dot-in">{n}</span></span>;
  }
  return <span aria-hidden="true" className="k-dot todo">{n}</span>;
}

/**
 * ProjectHeader (DESIGN_SPEC §6): one header for all project screens; grid 1fr | auto | 1fr so the steps sit in the middle and never
 * move between screens; mm/cm and Pomoć always on the right. `kind: 'new'` = Quick start header (no project yet).
 */
export function Header({ kind = 'project', units = false }: { kind?: 'project' | 'new'; units?: boolean }) {
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const [help, toggleHelp] = useHelp();
  const { pathname } = useLocation();
  const firstEl = project?.elements[0]?.id;
  const progress = useMemo(() => (project && kind === 'project' ? projectProgress(project) : null), [project, kind]);
  const onElement = useMatch('/element/:id');
  const steps: { label: string; to: string | null }[] = [
    { label: '1 Prostor', to: '/projekat' },
    { label: '2 Nacrti', to: '/nacrti' },
    { label: '3 3D', to: '/3d' },
    { label: '4 Elementi', to: firstEl ? `/element/${firstEl}` : null },
    { label: '5 Krojna lista', to: '/krojna-lista' },
    { label: '6 Ponuda', to: '/ponuda' },
  ];
  return (
    <header className="topbar">
      <div className="hdr-left">
        <Link to="/" className="brand" aria-label="Kroj — početna">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#F3F1EC" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#E2804D" strokeWidth="2" /></svg>
          <span>Kroj</span>
        </Link>
        <div className="hdr-proj">
          <div className="project-name">
            {kind === 'new' ? 'Novi projekat' : <>Projekat: <strong>{project?.name ?? '—'}</strong></>}
          </div>
          {progress && <div className="hdr-progress"><strong>{progress.percent} % urađeno</strong> · sledeće: {progress.next}</div>}
        </div>
      </div>
      {kind === 'new' ? (
        <nav aria-label="Način pravljenja" className="steps">
          <NavLink to="/" end>Brzi start</NavLink>
          <NavLink to="/ai-predlog">Iz fotografije (AI)</NavLink>
          <Link to="/projekat">Prazan projekat</Link>
        </nav>
      ) : (
        <nav aria-label="Koraci projekta" className="psteps">
          {steps.map((s, i) => {
            const st = progress?.steps[i], name = s.label.replace(/^\d /, '');
            const current = !!s.to && (pathname === s.to || (i === 3 && !!onElement) || PARENT.some(([p, l]) => l === s.label && pathname.startsWith(p)));
            const body = st ? <>
              <StepDot n={i + 1} s={st} /><span>{name}</span>
              <span className="k-steppop" aria-hidden="true">
                <span className="k-pop-head"><strong>{i + 1} · {name}</strong><span style={{ color: STATUS_COLOR[st.status] }}>{STATUS_TEXT(st)}</span></span>
                {st.checks.map(c => <span key={c.text} className="k-pop-row"><span aria-hidden="true" className={c.ok ? 'ok' : 'no'}>{c.ok ? '✓' : '○'}</span><span>{c.text}</span></span>)}
                <span className="k-pop-foot">Udeo u projektu: {st.weight} %</span>
              </span>
            </> : <span>{s.label}</span>;
            const label = st ? `Korak ${i + 1} od 6: ${name} — ${STATUS_TEXT(st)}` : undefined;
            return <span key={s.label} className="k-step-wrap">
              {i > 0 && <span className="k-stepline" aria-hidden="true" style={{ background: progress?.steps[i - 1].status === 'done' ? '#E2804D' : '#4A4743' }} />}
              {s.to
                ? <NavLink to={s.to} className="k-step" aria-current={current ? 'step' : undefined} aria-label={label}>{body}</NavLink>
                : <span className="k-step" aria-disabled="true" aria-label={label} title="Prvo dodaj element">{body}</span>}
            </span>;
          })}
        </nav>
      )}
      {progress && <div role="progressbar" aria-label="Projekat urađen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} className="hdr-bar"><div style={{ width: `${progress.percent}%` }} /></div>}
      <div className="hdr-right">
        {(units || kind === 'project') && project && (
          <SegmentedControl label="Jedinice mere (važi za ceo projekat)" className="units" options={UNITS} value={project.unit} onChange={u => change(p => ({ ...p, unit: u }), false)} />
        )}
        <button type="button" className="help-btn" aria-pressed={help} onClick={toggleHelp} title="Uključi ili isključi objašnjenja (oznake i) na svim ekranima">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 7v4.5M8 4.6v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Pomoć
        </button>
      </div>
    </header>
  );
}
