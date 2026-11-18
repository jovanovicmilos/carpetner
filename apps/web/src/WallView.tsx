// Wall elevation (design/Zid.dc.html): units, fronts, worktop, openings, obstacles and installations seen from the room,
// with a width chain, height summary, the installations table and checks for this wall.
import {
  installationHost, interiorSide, layoutIssues, PRESETS, roomWalls, sideOf, wallGeoms,
  type Element, type Installation, type Project,
} from 'engine';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { LenField } from './fields';
import { frontLayout, hingePath } from './fronts';
import { Header } from './Header';
import { Tip } from './help';
import { fmt, INSTALLATION_MARK, INSTALLATION_NAME, OBSTACLE_NAME } from './labels';
import { useProject } from './store';

const UNDER_WORKTOP = new Set(['base', 'sink', 'drawer', 'oven', 'corner-blind', 'appliance-front', 'filler']);
const INK = '#1C1B19', MUTED = '#57534E';

export function WallView() {
  const { id } = useParams();
  const { project, change } = useProject();
  const [showFronts, setShowFronts] = useState(true);
  const [instOnTop, setInstOnTop] = useState(true);
  if (!project) return <Navigate to="/" replace />;
  const walls = roomWalls(project.room);
  const geoms = wallGeoms(project.room);
  const wall = walls.find(w => w.id === id);
  if (!wall) return walls.length ? <Navigate to={`/zid/${walls[0].id}`} replace /> : <Navigate to="/projekat" replace />;

  const unit = project.unit;
  const f = (mm: number) => fmt(mm, unit);
  const g = geoms[wall.id], inner = g.inner, side = interiorSide(geoms, wall.id);
  const H = project.room.height;
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  // Front view from the room: left = wall start when the interior is on side +1 (same rule as hinges).
  const fx = (offset: number, width = 0) => (side > 0 ? offset : inner - offset - width);
  const Y = (z: number) => H - z;
  const here = <T extends { wallId?: string; side?: 1 | -1 }>(x: T) => x.wallId === wall.id && sideOf(geoms, x) === side;

  const els = project.elements.filter(here);
  const lows = els.filter(e => UNDER_WORKTOP.has(e.kind));
  const uppers = els.filter(e => e.kind === 'wall');
  const openings = project.room.openings.filter(here);
  const obstacles = (project.room.obstacles ?? []).filter(o => o.wallId && here(o));
  const insts = project.room.installations.filter(here);
  const ids = new Set<string>([...els, ...openings, ...obstacles, ...insts].map(x => x.id));
  const issues = layoutIssues(project).filter(i => i.ids.some(x => ids.has(x)));

  const plinth = lows[0]?.legs ?? dims.plinthHeight;
  const worktopTop = lows.length ? Math.max(...lows.map(e => (e.legs ?? 0) + e.height)) + dims.worktopThickness : null;
  const upperFrom = uppers.length ? Math.min(...uppers.map(e => e.elevation ?? 0)) : null;
  const chain = [...lows, ...els.filter(e => e.kind === 'tall')].sort((a, b) => fx(a.offset, a.width) - fx(b.offset, b.width));

  const setInst = (i: Installation, p: Partial<Installation>) =>
    change(pr => ({ ...pr, room: { ...pr.room, installations: pr.room.installations.map(x => (x.id === i.id ? { ...x, ...p } : x)) } }));

  const fs = Math.max(inner, H) / 45;
  const unitSvg = (e: Element) => {
    const z0 = e.kind === 'wall' ? e.elevation ?? 0 : e.legs ?? 0;
    const x = fx(e.offset, e.width), top = Y(z0 + e.height);
    const { fronts, ovenTop } = frontLayout(e, project.rules);
    return (
      <g key={e.id}>
        {(e.legs ?? 0) > 0 && e.kind !== 'wall' && <rect x={x} y={Y(e.legs!)} width={e.width} height={e.legs} fill="#D6D3D1" stroke={MUTED} strokeWidth={2} />}
        <rect x={x} y={top} width={e.width} height={e.height} fill={e.kind === 'wall' ? '#FBF3EC' : '#FFFFFF'} stroke={INK} strokeWidth={3} />
        {e.kind === 'corner-blind' && <rect x={x} y={top} width={e.blindWidth ?? 0} height={e.height} fill="url(#hatch)" />}
        {showFronts && ovenTop !== null && <rect x={x + 2} y={top + 2} width={e.width - 4} height={ovenTop - 4} fill="#3A3936" />}
        {showFronts && fronts.map((fr, i) => (
          <g key={i}>
            <rect x={x + fr.x} y={top + fr.y} width={fr.w} height={fr.h} fill="#E7E1D5" stroke={INK} strokeWidth={2} />
            {fr.hinge && <path transform={`translate(${x} ${top})`} d={hingePath(fr)} fill="none" stroke={MUTED} strokeWidth={1.5} strokeDasharray="14 10" />}
          </g>
        ))}
        <text x={x + e.width / 2} y={top + e.height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={fs}
          fill={ovenTop !== null && showFronts ? '#FFFFFF' : INK} className="plan-label">{e.label}</text>
      </g>
    );
  };
  const instSvg = insts.map(i => {
    const [letter, bg, fg] = INSTALLATION_MARK[i.kind];
    const cx = fx(i.offset), cy = Y(i.height), r = fs * 0.55;
    return (
      <g key={i.id}>
        <circle cx={cx} cy={cy} r={r} fill={bg} stroke="#FFFFFF" strokeWidth={2} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={fs * 0.7} fill={fg} fontWeight={700}>{letter}</text>
        <text x={cx + r * 1.3} y={cy} dominantBaseline="central" fontSize={fs * 0.75} fill={MUTED} fontFamily="var(--mono)">h{f(i.height)}</text>
      </g>
    );
  });
  const pad = fs * 3;

  return (
    <div className="app app-fixed">
      <Header title={`Projekat: ${project.name}`} />
      <main className="work">
        <div className="toolbar">
          <h1>Pogled na zid</h1>
          <nav className="chips-row" aria-label="Zidovi">
            {walls.map(w => (
              <Link key={w.id} to={`/zid/${w.id}`} className="chip-btn mono" aria-current={w.id === wall.id ? 'page' : undefined}>Zid {w.id} · {f(geoms[w.id].inner)}</Link>
            ))}
          </nav>
          <div className="toolbar-actions">
            <button type="button" aria-pressed={showFronts} onClick={() => setShowFronts(!showFronts)}>Fronte: {showFronts ? 'prikazane' : 'sakrivene'}</button>
            <button type="button" aria-pressed={instOnTop} onClick={() => setInstOnTop(!instOnTop)}>Instalacije kroz korpus</button>
          </div>
        </div>

        <div className="work-body">
          <section className="block wall-draw">
            <h2 className="field-label">Zid {wall.id} spreda<Tip k="wall.view" align="right" /></h2>
            <svg className="wall-svg" viewBox={`${-pad} ${-pad} ${inner + 2 * pad} ${H + 3 * pad}`} role="img"
              aria-label={`Zid ${wall.id}, ${inner} × ${H} mm, ${els.length} elemenata, ${insts.length} instalacija`}>
              <defs>
                <pattern id="hatch" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <path d="M0 0V40" stroke="#A8A29E" strokeWidth={6} />
                </pattern>
              </defs>
              <rect x={0} y={0} width={inner} height={H} fill="#FAF8F4" stroke={INK} strokeWidth={4} />
              {openings.map(o => (
                <g key={o.id}>
                  <rect x={fx(o.offset, o.width)} y={Y(o.sill + o.height)} width={o.width} height={o.height}
                    fill={o.kind === 'window' ? '#DCE8F6' : '#FFFFFF'} stroke={INK} strokeWidth={3} />
                  <text x={fx(o.offset, o.width) + o.width / 2} y={Y(o.sill + o.height) + fs * 1.2} textAnchor="middle" fontSize={fs * 0.7} fill={MUTED}>
                    {o.kind === 'window' ? 'prozor' : 'vrata'}
                  </text>
                </g>
              ))}
              {obstacles.map(o => {
                const z0 = o.elevation ?? 0, z1 = o.height ? z0 + o.height : H;
                return <g key={o.id}><rect x={fx(o.offset ?? 0, o.width)} y={Y(z1)} width={o.width} height={z1 - z0} fill="url(#hatch)" stroke={MUTED} strokeWidth={2} />
                  <title>{OBSTACLE_NAME[o.kind]}</title></g>;
              })}
              {!instOnTop && instSvg}
              {lows.length > 0 && worktopTop !== null && lows.map(e => (
                <rect key={`wt-${e.id}`} x={fx(e.offset, e.width)} y={Y(worktopTop)} width={e.width} height={dims.worktopThickness} fill="#8B7355" />
              ))}
              {els.map(unitSvg)}
              {instOnTop && instSvg}
              {/* width chain under the floor */}
              {chain.map(e => (
                <g key={`d-${e.id}`}>
                  <path d={`M${fx(e.offset, e.width)} ${H + pad * 0.3}v${pad * 0.5}`} stroke={MUTED} strokeWidth={2} />
                  <text x={fx(e.offset, e.width) + e.width / 2} y={H + pad * 0.7} textAnchor="middle" fontSize={fs * 0.8} fill={MUTED} fontFamily="var(--mono)">{f(e.width)}</text>
                </g>
              ))}
              <text x={inner / 2} y={H + pad * 1.6} textAnchor="middle" fontSize={fs * 0.9} fill={INK} fontFamily="var(--mono)">Zid {wall.id} · {f(inner)}</text>
            </svg>
          </section>
          <div className="work-col side">
          <section className="block">
            <h2>Visine</h2>
            <table>
              <tbody>
                {upperFrom !== null && <tr><td>Gornji elementi od poda</td><td className="num">{f(upperFrom)} {unit}</td></tr>}
                {worktopTop !== null && <tr><td>Radna ploča gore</td><td className="num">{f(worktopTop)} {unit}</td></tr>}
                {upperFrom !== null && worktopTop !== null && <tr><td>Razmak radna — gornji</td><td className="num">{f(upperFrom - worktopTop)} {unit}</td></tr>}
                {lows.length > 0 && <tr><td>Sokla</td><td className="num">{f(plinth)} {unit}</td></tr>}
                <tr><td>Visina prostorije</td><td className="num">{f(H)} {unit}</td></tr>
              </tbody>
            </table>
            <h2>Provera rasporeda</h2>
            {issues.length ? <ul className="issues">{issues.map((i, k) => <li key={k}>{i.text}</li>)}</ul> : <p className="muted small">Sve je u redu.</p>}
          </section>
          <section className="block">
            <div className="block-head">
              <h2 className="field-label">Instalacije<Tip k="wall.installations" align="left" /></h2>
              <div className="toolbar-actions"><Link className="tool link-btn" to="/projekat">+ Dodaj u prostoru</Link></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th scope="col">Tip</th><th scope="col">Zid</th><th scope="col">Od ugla ({unit})</th><th scope="col">Visina ({unit})</th><th scope="col">Element</th></tr></thead>
                <tbody>
                  {project.room.installations.map(i => (
                    <tr key={i.id} className={i.wallId === wall.id ? undefined : 'dim'}>
                      <td>{INSTALLATION_NAME[i.kind]}{i.diameter ? ` Ø${i.diameter}` : ''}</td>
                      <td className="mono">{i.wallId}</td>
                      <td className="cell-input"><LenField label={`Od ugla ${i.id}`} value={i.offset} unit={unit} onCommit={v => setInst(i, { offset: Math.max(0, v) })} /></td>
                      <td className="cell-input"><LenField label={`Visina ${i.id}`} value={i.height} unit={unit} onCommit={v => setInst(i, { height: Math.max(0, v) })} /></td>
                      <td className="mono">{hostLabel(project, i)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          </div>
        </div>

      </main>
    </div>
  );
}

function hostLabel(p: Project, i: Installation) {
  const host = installationHost(p, i);
  if (host) return host.label;
  const below = p.elements.find(e => e.wallId === i.wallId && UNDER_WORKTOP.has(e.kind) && i.offset >= e.offset && i.offset <= e.offset + e.width);
  return below ? 'iznad radne' : '—';
}
