// Wall elevation, laid out as design/Zid.dc.html: wall tabs, elevation seen from the room (units with front divisions and
// handles, worktop, plinth, window, installations, width chain and height chain), installations table, checks, heights.
import {
  installationHost, interiorSide, layoutIssues, nextId, outletIssues, PRESETS, roomWalls, sideOf, wallGeoms, wallHeightAt,
  type Element, type Installation, type Project,
} from 'engine';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { frontLayout } from './fronts';
import { Header } from './Header';
import { PlannerHeader } from './Planner';
import { Tip } from './help';
import { fmt, INSTALLATION_MARK, INSTALLATION_NAME, OBSTACLE_NAME, parseLength } from './labels';
import { ID_PREFIX, LIBRARY } from './library';
import { markProject, useProject } from './store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { APP_FIXED, BACK } from './ui';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const INST_ITEMS = LIBRARY.flatMap(i => (i.type === 'inst' ? [i] : []));

const UNDER_WORKTOP = new Set(['base', 'sink', 'drawer', 'oven', 'corner-blind', 'appliance-front', 'filler']);
const SUFFIX: Partial<Record<Element['kind'], string>> = { sink: 'sudopera', 'appliance-front': 'MSP', oven: 'rerna', tall: 'frižider' };
const FILL: Partial<Record<Element['kind'], string>> = { filler: '#E0CCAD', oven: '#3A3936', tall: '#D6BE98' };
const RING: Record<Installation['kind'], string> = { water: '#1E50C8', drain: '#57534E', power: '#1C1B19', power400: '#1C1B19', gas: '#B4440E' };
const INK = '#1C1B19', MUTED = '#5F5A52';

/** `customer`: opened from the customer planner (/kupac/zid) — the customer's stepper, back to Raspored. */
export function WallView({ customer }: { customer?: boolean }) {
  const base = customer ? '/kupac/zid' : '/zid';
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const [showFronts, setShowFronts] = useState(true);
  const [instOnTop, setInstOnTop] = useState(true);
  if (!project) return <Navigate to="/brzi-start" replace />;
  const walls = roomWalls(project.room);
  const geoms = wallGeoms(project.room);
  const wall = walls.find(w => w.id === id);
  if (!wall) return walls.length ? <Navigate to={`${base}/${walls[0].id}`} replace /> : <Navigate to={customer ? '/kupac/kuhinja' : '/projekat'} replace />;

  const unit = project.unit;
  const f = (mm: number) => fmt(mm, unit);
  const g = geoms[wall.id], inner = g.inner, side = interiorSide(geoms, wall.id);
  const edit = (id: string, patch: Partial<Installation>) =>
    change(p => ({ ...p, room: { ...p.room, installations: p.room.installations.map(x => (x.id === id ? { ...x, ...patch } : x)) } }));
  // Sloped wall (attic): the ceiling line runs from heightStart to heightEnd; the drawing scales to the higher end.
  const h0 = wallHeightAt(project.room, g, 0), h1 = wallHeightAt(project.room, g, inner), H = Math.max(h0, h1);
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
  const issues = [...layoutIssues(project), ...outletIssues(project)].filter(i => i.ids.some(x => ids.has(x)));
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
    const z0 = e.kind === 'wall' ? e.elevation ?? 0 : e.legs ?? plinth; // dishwasher front / filler stand on the run's plinth (like 3D, Nacrti)
    const x = X(e.offset, e.width), w = e.width * k, top = Y(z0 + e.height), h = e.height * k;
    const { fronts } = frontLayout(e, project.rules);
    const blind = e.kind === 'corner-blind' ? (e.blindWidth ?? 0) * k : 0;
    const label = e.kind === 'wall' ? `${e.label} ${f(e.width)}` : `${e.label}${SUFFIX[e.kind] ? ` ${SUFFIX[e.kind]}` : ''}`;
    const up = e.kind === 'wall';
    // Handle on the opening side: doors vertical near the top (base, tall) or horizontal at the bottom (wall units); drawers centred.
    const handles = showFronts && e.kind !== 'filler' ? fronts.map((fr, i) => { // a filler has no handle (KONSTRUKCIJA)
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
        <rect x={x} y={top} width={w} height={h} fill={FILL[e.kind] ?? '#EADBC4'} stroke={INK} strokeWidth={1.2} />
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
    <div className={APP_FIXED}>
      {customer ? <PlannerHeader project={project} role="kupac" step={2} live={false} /> : <Header units />}
      <div className="flex min-h-0 flex-1 max-[900px]:flex-col">
        <main className="flex min-h-0 min-w-0 flex-[1_1_auto] flex-col overflow-auto">
          <div className="flex flex-wrap items-center gap-3 border-0 border-b border-solid border-border px-5 py-3">
            <Link to={customer ? '/kupac/kuhinja' : '/projekat'} className={BACK}><span aria-hidden="true">←</span>{customer ? 'Raspored' : 'Prostor'}</Link>
            <h1 className="m-0 flex items-center text-[18px] font-semibold">Pogled na zid<Tip k="wall.view" align="right" /></h1>
            <Tabs value={wall.id} onValueChange={id => navigate(`${base}/${id}`)}><TabsList aria-label="Zid" className="flex gap-1">
              {/* design: tabs only for walls with units, by name; the opened wall always has a tab */}
              {walls.filter(w => w.id === wall.id || project.elements.some(e => e.wallId === w.id)).sort((x, y) => x.id.localeCompare(y.id)).map(w => (
                <TabsTrigger key={w.id} value={w.id} className="min-h-10 rounded-md border border-solid border-border bg-white px-3.5 py-2 text-[14px] text-foreground data-[state=active]:border-foreground data-[state=active]:bg-dark data-[state=active]:text-white">{w.island ? 'Ostrvo' : `Zid ${w.id}`} · {f(geoms[w.id].inner)}</TabsTrigger>
              ))}
            </TabsList></Tabs>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" size="none" className={TOGGLE} aria-pressed={showFronts} onClick={() => setShowFronts(!showFronts)}>Fronte: {showFronts ? 'prikazane' : 'sakrivene'}</Button>
              <Button variant="outline" size="none" className={TOGGLE} aria-pressed={instOnTop} onClick={() => setInstOnTop(!instOnTop)}>Instalacije kroz korpus</Button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-5">
            <svg viewBox={`0 0 ${vbW} ${vbH}`} role="img" className="size-full max-w-[900px] font-mono"
              aria-label={`Zid ${wall.id}, ${inner} × ${H} mm, ${els.length} elemenata, ${insts.length} instalacija`}>
              <defs>
                <pattern id="wv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <path d="M0 0V6" stroke="#A8A29E" strokeWidth={2} />
                </pattern>
              </defs>
              <polygon points={`${X(0)},${floorY} ${X(0)},${Y(h0)} ${X(inner)},${Y(h1)} ${X(inner)},${floorY}`} fill="#FAF8F4" stroke={INK} strokeWidth={1.5} />
              <line x1={x0 - 40} y1={floorY} x2={x0 + Wp + 40} y2={floorY} stroke={INK} strokeWidth={2} />
              <text x={x0 - 36} y={floorY - 6} fontSize={11} fill={MUTED}>pod</text>
              <text x={x0 - 36} y={Y(side > 0 ? h0 : h1) - 4} fontSize={11} fill={MUTED}>{h0 === h1 ? 'plafon' : `kosina ${f(side > 0 ? h0 : h1)} → ${f(side > 0 ? h1 : h0)}`}</text>
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
              {chain.filter(e => (e.legs ?? plinth) > 0).map(e => (
                <rect key={`pl-${e.id}`} x={X(e.offset, e.width)} y={Y(e.legs ?? plinth)} width={e.width * k} height={(e.legs ?? plinth) * k} fill="#D6BE98" stroke={INK} strokeWidth={1} />
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
              {h0 !== h1 && <line x1={X(0)} y1={Y(h0)} x2={X(inner)} y2={Y(h1)} stroke={INK} strokeWidth={2} strokeDasharray="8 4"><title>Kosina</title></line>}
            </svg>
          </div>
        </main>

        <aside className="box-border max-[900px]:max-h-[42vh] max-[900px]:flex-[0_0_auto] max-[900px]:border-l-0 max-[900px]:border-t flex min-h-0 flex-[0_0_400px] flex-col gap-4 overflow-y-auto border-0 border-l border-solid border-border bg-white p-5" aria-label="Instalacije na zidu">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="m-0 flex items-center text-[18px]">Instalacije<Tip k="wall.installations" align="left" /></h2>
            {/* Installations are edited here too (user 2026-11-20: Nacrti → "Uredi instalacije ovog zida" must edit): add on this wall, mm in the table, ×. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={null} size="none" className="box-border inline-flex min-h-10 items-center rounded-md border border-solid border-foreground bg-dark px-3.5 py-2 text-[14px] font-normal text-white">+ Dodaj</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {INST_ITEMS.map(it => <DropdownMenuItem key={it.key} onSelect={() => change(p => ({ ...p, room: { ...p.room, installations: [...p.room.installations,
                  { id: nextId(p.room.installations.map(o => o.id), ID_PREFIX[it.kind]), kind: it.kind, wallId: wall.id, side, offset: Math.round(inner / 2), height: it.height }] } }))}>
                  <span className="size-2.5 flex-none rounded-full" style={{ background: INSTALLATION_MARK[it.kind][1] }} />{it.name} na zid {wall.id}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="overflow-x-auto rounded-lg border border-solid border-border">
            <table className="w-full border-collapse font-mono text-[13px]">
              <thead><tr><th className={TH}>Tip</th><th className={TH}>Zid</th><th className={cn(TH, 'text-right')}>Od ugla</th><th className={cn(TH, 'text-right')}>Visina</th><th className={TH}>Element</th></tr></thead>
              <tbody>
                {project.room.installations.map(i => (
                  <tr key={i.id}>
                    <td className={cn(TD, 'font-sans')}><span className="mr-1.5 box-border inline-block size-2.5 rounded-full" style={{ background: INSTALLATION_MARK[i.kind][1], border: i.kind === 'power' || i.kind === 'power400' ? `1px solid ${INK}` : undefined }} />{INSTALLATION_NAME[i.kind]}{i.diameter ? ` Ø${i.diameter}` : ''}</td>
                    <td className={TD}>{i.wallId}</td>
                    <td className={cn(TD, 'text-right')}><Cell label={`${INSTALLATION_NAME[i.kind]} ${i.id} od početka zida`} value={i.offset} unit={unit} onCommit={v => edit(i.id, { offset: v })} /></td>
                    <td className={cn(TD, 'text-right')}><Cell label={`${INSTALLATION_NAME[i.kind]} ${i.id} visina od poda`} value={i.height} unit={unit} onCommit={v => edit(i.id, { height: v })} /></td>
                    <td className={cn(TD, 'py-1 pr-1')}><span className="flex items-center justify-between gap-1">{hostLabel(project, i)}
                      <Button variant="ghost" size="none" aria-label={`Obriši ${INSTALLATION_NAME[i.kind]} ${i.id}`} title="Obriši" className="size-6 flex-none rounded text-[16px] text-muted-foreground"
                        onClick={() => change(p => ({ ...p, room: { ...p.room, installations: p.room.installations.filter(x => x.id !== i.id) } }))}>×</Button></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* No control in the design for TOK_PROJEKTA "nema instalacija"; only shown while the room has none. */}
            {!project.room.installations.length && (
              <label className="flex items-center gap-2 px-1 py-3 text-[13px] text-foreground cursor-pointer">
                <Checkbox checked={!!project.marks?.noInstallations} onCheckedChange={v => markProject({ noInstallations: v === true })} />
                U prostoriji nema instalacija
              </label>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="m-0 flex items-center text-[15px]">Provera rasporeda<Tip k="editor.checks" align="right" /></h3>
            {okPipes.length > 0 && <Ok>Voda i odvod su iza elementa za sudoperu ({sinkLabel}).</Ok>}
            {issues.map((i, n) => <Warn key={n}>{i.text}</Warn>)}
            {!issues.length && !okPipes.length && <Ok>Sve je u redu.</Ok>}
          </div>
          <div className="grid grid-cols-2 gap-2.5 border-0 border-t border-solid border-border pt-3.5 text-[13px] text-muted-foreground">
            {upperFrom !== null && <div><div>Gornji elementi od poda</div><div className={V}>{f(upperFrom)} {unit}</div></div>}
            {worktopTop !== null && <div><div>Radna ploča gore</div><div className={V}>{f(worktopTop)} {unit}</div></div>}
            {upperFrom !== null && worktopTop !== null && <div><div>Razmak radna — gornji</div><div className={V}>{f(upperFrom - worktopTop)} {unit}</div></div>}
            {lows.length > 0 && <div><div>Sokla</div><div className={V}>{f(plinth)} {unit}</div></div>}
          </div>
        </aside>
      </div>
    </div>
  );
}

const NOTE = 'flex items-start gap-2.5 text-[14px] leading-[1.45]';
const TOGGLE = 'box-border min-h-10 px-3 py-2 text-[13px] font-normal';
/** Table cell length: reads as text, edits in place (mm/cm at the UI edge); Enter or leaving the cell saves. */
function Cell({ label, value, unit, onCommit }: { label: string; value: number; unit: Project['unit']; onCommit: (mm: number) => void }) {
  const shown = fmt(value, unit);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const commit = () => { const v = parseLength(text, unit); if (v !== null && v >= 0 && v !== value) onCommit(v); else setText(shown); };
  return <input type="text" inputMode="decimal" aria-label={label} value={text} onChange={e => setText(e.target.value)} onBlur={commit}
    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setText(shown); e.currentTarget.blur(); } }}
    className="-my-1 w-[46px] rounded border border-solid border-transparent bg-transparent px-1 py-0.5 text-right font-mono text-[13px] text-foreground outline-none hover:border-border focus:border-primary focus:bg-white" />;
}

const TH = 'border-0 bg-background px-2.5 py-2 text-left font-sans text-[13px] font-semibold text-foreground';
const TD = 'border-0 border-t border-solid border-line-soft px-2.5 py-2';
const V = 'font-mono text-[15px] text-foreground';

const Ok = ({ children }: { children: ReactNode }) => (
  <div className={NOTE}><svg className="mt-0.5 flex-none" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9.5l4 4 8-9" fill="none" stroke="#2F7A3B" strokeWidth="2.2" /></svg><span>{children}</span></div>
);
const Warn = ({ children }: { children: ReactNode }) => (
  <div className={cn(NOTE, 'rounded-md bg-warn-soft p-2.5 text-warn-ink')}><svg className="mt-0.5 flex-none" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2l7.5 13h-15z M9 7v4 M9 13v.5" fill="none" stroke="#7C2D0A" strokeWidth="1.8" /></svg><span>{children}</span></div>
);

function hostLabel(p: Project, i: Installation) {
  const host = installationHost(p, i);
  if (host) return host.label;
  const below = p.elements.find(e => e.wallId === i.wallId && UNDER_WORKTOP.has(e.kind) && i.offset >= e.offset && i.offset <= e.offset + e.width);
  return below ? 'radna' : '—';
}
