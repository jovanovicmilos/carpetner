// Wall elevation, laid out as design/Zid.dc.html: wall tabs, elevation seen from the room (units with front divisions and
// handles, worktop, plinth, window, installations, width chain and height chain), installations table, checks, heights.
import {
  installationHost, interiorSide, layoutIssues, PRESETS, roomWalls, sideOf, wallGeoms,
  type Element, type Installation, type Project,
} from 'engine';
import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { frontLayout } from './fronts';
import { Header } from './Header';
import { Tip } from './help';
import { fmt, INSTALLATION_MARK, INSTALLATION_NAME, OBSTACLE_NAME } from './labels';
import { useProject } from './store';

const UNDER_WORKTOP = new Set(['base', 'sink', 'drawer', 'oven', 'corner-blind', 'appliance-front', 'filler']);
const SUFFIX: Partial<Record<Element['kind'], string>> = { sink: 'sudopera', 'appliance-front': 'MSP', oven: 'rerna', tall: 'frižider' };
const FILL: Partial<Record<Element['kind'], string>> = { filler: '#D6CDBC', oven: '#3A3936', tall: '#C9BEA9' };
const RING: Record<Installation['kind'], string> = { water: '#1E50C8', drain: '#57534E', power: '#1C1B19', power400: '#1C1B19', gas: '#B4440E' };
const INK = '#1C1B19', MUTED = '#5F5A52';

export function WallView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useProject(s => s.project);
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
  const here = <T extends { wallId?: string; side?: 1 | -1 }>(x: T) => x.wallId === wall.id && sideOf(geoms, x) === side;

  const els = project.elements.filter(here);
  const lows = els.filter(e => UNDER_WORKTOP.has(e.kind));
  const talls = els.filter(e => e.kind === 'tall');
  const uppers = els.filter(e => e.kind === 'wall');
  const openings = project.room.openings.filter(here);
  const obstacles = (project.room.obstacles ?? []).filter(o => o.wallId && here(o));
  const insts = project.room.installations.filter(here);
  const ids = new Set<string>([...els, ...openings, ...obstacles, ...insts].map(x => x.id));
  const issues = layoutIssues(project).filter(i => i.ids.some(x => ids.has(x)));
  // Positive check shown with a green tick (design): pipes that are behind the sink unit.
  const okPipes = insts.filter(i => (i.kind === 'water' || i.kind === 'drain') && installationHost(project, i)?.kind === 'sink');
  const sinkLabel = okPipes.length ? installationHost(project, okPipes[0])!.label : '';

  const plinth = lows.find(e => e.legs)?.legs ?? dims.plinthHeight;
  const carcassTop = lows.length ? Math.max(...lows.map(e => (e.legs ?? 0) + e.height)) : null;
  const worktopTop = carcassTop !== null ? carcassTop + dims.worktopThickness : null;
  const upperFrom = uppers.length ? Math.min(...uppers.map(e => e.elevation ?? 0)) : null;
  const upperTop = uppers.length ? Math.max(...uppers.map(e => (e.elevation ?? 0) + e.height)) : null;
  const chain = [...lows, ...talls];

  // Design scale: 640 px for the wall, 520 px for the room height.
  const k = Math.min(640 / inner, 520 / H);
  const x0 = 120, y0 = 60, Wp = inner * k, floorY = y0 + H * k;
  const X = (offset: number, width = 0) => x0 + (side > 0 ? offset : inner - offset - width) * k;
  const Y = (z: number) => floorY - z * k;
  const vbW = x0 + Wp + 100, vbH = floorY + 60;

  const unitSvg = (e: Element) => {
    const z0 = e.kind === 'wall' ? e.elevation ?? 0 : e.legs ?? 0;
    const x = X(e.offset, e.width), w = e.width * k, top = Y(z0 + e.height), h = e.height * k;
    const { fronts } = frontLayout(e, project.rules);
    const blind = e.kind === 'corner-blind' ? (e.blindWidth ?? 0) * k : 0;
    const label = e.kind === 'wall' ? `${e.label} ${f(e.width)}` : `${e.label}${SUFFIX[e.kind] ? ` ${SUFFIX[e.kind]}` : ''}`;
    const up = e.kind === 'wall';
    // Handle on the opening side: doors vertical near the top (base, tall) or horizontal at the bottom (wall units); drawers centred.
    const handles = showFronts ? fronts.map((fr, i) => {
      const fx = x + fr.x * k, fy = top + fr.y * k, fw = fr.w * k, fh = fr.h * k;
      if (!fr.hinge) return <line key={i} x1={fx + fw / 2 - 10} y1={fy + 8} x2={fx + fw / 2 + 10} y2={fy + 8} stroke={INK} strokeWidth={2} />;
      const openRight = fr.hinge === 'L';
      const hx = openRight ? fx + fw - 8 : fx + 8;
      return up
        ? <line key={i} x1={openRight ? hx - 24 : hx} y1={fy + fh - 10} x2={openRight ? hx : hx + 24} y2={fy + fh - 10} stroke={INK} strokeWidth={2} />
        : <line key={i} x1={hx} y1={fy + 12} x2={hx} y2={fy + 36} stroke={INK} strokeWidth={2} />;
    }) : null;
    return (
      <g key={e.id}>
        <rect x={x} y={top} width={w} height={h} fill={FILL[e.kind] ?? '#E7E1D5'} stroke={INK} strokeWidth={1.2} />
        {blind > 0 && <>
          <rect x={x} y={top} width={blind} height={h} fill="#EFEBE3" stroke={INK} strokeWidth={1.2} strokeDasharray="4 3" />
          <text x={x + blind / 2} y={top + h / 2 + 4} textAnchor="middle" fontSize={10} fill={MUTED}>slepo</text>
        </>}
        {showFronts && fronts.slice(1).map((fr, i) => (fr.y === fronts[i].y
          ? <line key={i} x1={x + fr.x * k} y1={top} x2={x + fr.x * k} y2={top + h} stroke={INK} strokeWidth={1.2} />
          : <line key={i} x1={x} y1={top + fr.y * k} x2={x + w} y2={top + fr.y * k} stroke={INK} strokeWidth={1.2} />))}
        {handles}
        <text x={x + (blind + w) / 2} y={top + h / 2 + 4} textAnchor="middle" fontSize={12} fontWeight={600} fill={e.kind === 'oven' ? '#FFFFFF' : INK}>{label}</text>
      </g>
    );
  };

  const instSvg = insts.map(i => {
    const [letter, bg, fg] = INSTALLATION_MARK[i.kind];
    const cx = X(i.offset), cy = Y(i.height);
    const behind = !!installationHost(project, i);
    return (
      <g key={i.id}>
        {behind && <circle cx={cx} cy={cy} r={13} fill="none" stroke={RING[i.kind]} strokeWidth={1.5} strokeDasharray="3 2" />}
        <circle cx={cx} cy={cy} r={9} fill={bg} stroke={i.kind === 'power' || i.kind === 'power400' ? INK : undefined} />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={fg}>{letter}</text>
        {!behind && <>
          {worktopTop !== null && i.height > worktopTop && <line x1={cx} y1={cy + 12} x2={cx} y2={Y(worktopTop) - 2} stroke={INK} strokeWidth={0.8} strokeDasharray="2 2" />}
          <text x={cx + 12} y={cy + 4} fontSize={11} fill={INK}>h {f(i.height)}</text>
        </>}
      </g>
    );
  });

  // Height chain on the right: plinth, carcass, worktop, gap, upper unit, to the ceiling.
  const levels = [...new Set([0, plinth, carcassTop, worktopTop, upperFrom, upperTop, H].filter((v): v is number => v !== null && v >= 0 && v <= H))].sort((a, b) => a - b);
  const dx = x0 + Wp + 30;
  const ticks = [x0, ...chain.flatMap(e => [X(e.offset, e.width), X(e.offset, e.width) + e.width * k]), x0 + Wp];

  return (
    <div className="app app-fixed">
      <Header units />
      <div className="wv-body">
        <main className="wv-main">
          <div className="wv-bar">
            <h1 className="wv-h">Pogled na zid<Tip k="wall.view" align="right" /></h1>
            <div role="tablist" aria-label="Zid" className="wv-tabs">
              {walls.map(w => (
                <button key={w.id} type="button" role="tab" aria-selected={w.id === wall.id} onClick={() => navigate(`/zid/${w.id}`)}>Zid {w.id} · {f(geoms[w.id].inner)}</button>
              ))}
            </div>
            <div className="wv-actions">
              <button type="button" className="tb-btn" aria-pressed={showFronts} onClick={() => setShowFronts(!showFronts)}>Fronte: {showFronts ? 'prikazane' : 'sakrivene'}</button>
              <button type="button" className="tb-btn" aria-pressed={instOnTop} onClick={() => setInstOnTop(!instOnTop)}>Instalacije kroz korpus</button>
            </div>
          </div>
          <div className="wv-draw">
            <svg viewBox={`0 0 ${vbW} ${vbH}`} role="img" className="wall-svg2"
              aria-label={`Zid ${wall.id}, ${inner} × ${H} mm, ${els.length} elemenata, ${insts.length} instalacija`}>
              <defs>
                <pattern id="wv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <path d="M0 0V6" stroke="#A8A29E" strokeWidth={2} />
                </pattern>
              </defs>
              <rect x={x0} y={y0} width={Wp} height={H * k} fill="#FAF8F4" stroke={INK} strokeWidth={1.5} />
              <line x1={x0 - 40} y1={floorY} x2={x0 + Wp + 40} y2={floorY} stroke={INK} strokeWidth={2} />
              <text x={x0 - 36} y={floorY - 6} fontSize={11} fill={MUTED}>pod</text>
              <text x={x0 - 36} y={y0 - 4} fontSize={11} fill={MUTED}>plafon</text>
              {openings.map(o => {
                const x = X(o.offset, o.width), w = o.width * k, top = Y(o.sill + o.height);
                return (
                  <g key={o.id}>
                    <rect x={x} y={top} width={w} height={o.height * k} fill={o.kind === 'window' ? '#E3EBF7' : '#FFFFFF'} stroke={INK} strokeWidth={1.2} />
                    {o.kind === 'window' && o.width >= 800 && <line x1={x + w / 2} y1={top} x2={x + w / 2} y2={top + o.height * k} stroke={INK} strokeWidth={1} />}
                    <text x={x + w / 2} y={top - 8} textAnchor="middle" fontSize={11} fill={MUTED}>
                      {o.kind === 'window' ? `prozor ${f(o.width)} × ${f(o.height)}, parapet ${f(o.sill)}` : `vrata ${f(o.width)} × ${f(o.height)}`}
                    </text>
                  </g>
                );
              })}
              {obstacles.map(o => {
                const z0 = o.elevation ?? 0, z1 = o.height ? z0 + o.height : H;
                return <g key={o.id}><rect x={X(o.offset ?? 0, o.width)} y={Y(z1)} width={o.width * k} height={(z1 - z0) * k} fill="url(#wv-hatch)" stroke={INK} strokeWidth={1.2} /><title>{OBSTACLE_NAME[o.kind]}</title></g>;
              })}
              {!instOnTop && instSvg}
              {worktopTop !== null && lows.map(e => (
                <rect key={`wt-${e.id}`} x={X(e.offset, e.width)} y={Y(worktopTop)} width={e.width * k} height={dims.worktopThickness * k} fill="#8A7A63" stroke={INK} strokeWidth={1} />
              ))}
              {chain.filter(e => (e.legs ?? 0) > 0).map(e => (
                <rect key={`pl-${e.id}`} x={X(e.offset, e.width)} y={Y(e.legs!)} width={e.width * k} height={e.legs! * k} fill="#C9BEA9" stroke={INK} strokeWidth={1} />
              ))}
              {els.map(unitSvg)}
              {instOnTop && instSvg}

              <line x1={dx} y1={y0} x2={dx} y2={floorY} stroke={INK} strokeWidth={1} />
              {levels.map(v => <line key={`t${v}`} x1={dx - 6} y1={Y(v)} x2={dx + 6} y2={Y(v)} stroke={INK} />)}
              {levels.slice(1).map((v, i) => <text key={`h${v}`} x={dx + 10} y={(Y(v) + Y(levels[i])) / 2 + 4} fontSize={11}>{f(v - levels[i])}</text>)}

              {chain.length > 0 && <>
                <line x1={x0} y1={floorY + 32} x2={x0 + Wp} y2={floorY + 32} stroke={INK} strokeWidth={1} />
                {ticks.map((x, i) => <line key={`b${i}`} x1={x} y1={floorY + 26} x2={x} y2={floorY + 38} stroke={INK} />)}
                {chain.map(e => <text key={`w${e.id}`} x={X(e.offset, e.width) + (e.width * k) / 2} y={floorY + 50} textAnchor="middle" fontSize={11}>{f(e.width)}</text>)}
              </>}
            </svg>
          </div>
        </main>

        <aside className="wv-side" aria-label="Instalacije na zidu">
          <div className="wv-side-head">
            <h2 className="panel-h">Instalacije<Tip k="wall.installations" align="left" /></h2>
            {/* shortcut: installations are added on the plan (Prostor); this button opens it. */}
            <Link className="wv-add" to="/projekat">+ Dodaj</Link>
          </div>
          <div className="wv-table">
            <table>
              <thead><tr><th>Tip</th><th>Zid</th><th className="num">Od ugla</th><th className="num">Visina</th><th>Element</th></tr></thead>
              <tbody>
                {project.room.installations.map(i => (
                  <tr key={i.id}>
                    <td className="sans"><span className="wv-dot" style={{ background: INSTALLATION_MARK[i.kind][1], border: i.kind === 'power' || i.kind === 'power400' ? `1px solid ${INK}` : undefined }} />{INSTALLATION_NAME[i.kind]}{i.diameter ? ` Ø${i.diameter}` : ''}</td>
                    <td>{i.wallId}</td><td className="num">{f(i.offset)}</td><td className="num">{f(i.height)}</td><td>{hostLabel(project, i)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="wv-checks">
            <h3 className="panel-h3">Provera rasporeda<Tip k="editor.checks" align="right" /></h3>
            {okPipes.length > 0 && <Ok>Voda i odvod su iza elementa za sudoperu ({sinkLabel}).</Ok>}
            {issues.map((i, n) => <Warn key={n}>{i.text}</Warn>)}
            {!issues.length && !okPipes.length && <Ok>Sve je u redu.</Ok>}
          </div>
          <div className="wv-heights">
            {upperFrom !== null && <div><div>Gornji elementi od poda</div><div className="v">{f(upperFrom)} {unit}</div></div>}
            {worktopTop !== null && <div><div>Radna ploča gore</div><div className="v">{f(worktopTop)} {unit}</div></div>}
            {upperFrom !== null && worktopTop !== null && <div><div>Razmak radna — gornji</div><div className="v">{f(upperFrom - worktopTop)} {unit}</div></div>}
            {lows.length > 0 && <div><div>Sokla</div><div className="v">{f(plinth)} {unit}</div></div>}
          </div>
        </aside>
      </div>
    </div>
  );
}

const Ok = ({ children }: { children: ReactNode }) => (
  <div className="wv-ok"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9.5l4 4 8-9" fill="none" stroke="#2F7A3B" strokeWidth="2.2" /></svg><span>{children}</span></div>
);
const Warn = ({ children }: { children: ReactNode }) => (
  <div className="wv-warn"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2l7.5 13h-15z M9 7v4 M9 13v.5" fill="none" stroke="#7C2D0A" strokeWidth="1.8" /></svg><span>{children}</span></div>
);

function hostLabel(p: Project, i: Installation) {
  const host = installationHost(p, i);
  if (host) return host.label;
  const below = p.elements.find(e => e.wallId === i.wallId && UNDER_WORKTOP.has(e.kind) && i.offset >= e.offset && i.offset <= e.offset + e.width);
  return below ? 'radna' : '—';
}
