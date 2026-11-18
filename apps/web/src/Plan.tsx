// SVG plan renderer (viewBox in mm). Used read-only by Quick start and interactively by the editor,
// which passes the view box, selection and pointer handlers.
import {
  elementBox, interiorSide, roomWalls, sideOf, wallGeoms, wallPoint, type Element, type Placement, type Point, type Project, type Unit, type WallGeom,
} from 'engine';
import { forwardRef, type SVGProps } from 'react';
import { fmt, INSTALLATION_MARK, KIND_NAME, OBSTACLE_NAME } from './labels';

export type SelKind = 'wall' | 'el' | 'obs' | 'opening' | 'inst';
export interface Selection { kind: SelKind; id: string }
export interface ViewBox { x: number; y: number; w: number; h: number }

const KIND_FILL: Record<string, string> = {
  'corner-blind': '#E7E1D5', base: '#E7E1D5', drawer: '#E7E1D5', sink: '#C9DAF2', 'appliance-front': '#E7E1D5',
  oven: '#3A3936', filler: '#D6CDBC', tall: '#C9BEA9', wall: 'rgba(180,68,14,0.10)',
};
const ACCENT = '#B4440E', BAD = '#C0262D', INK = '#1C1B19';
/** Wall direction in degrees, flipped so text along it is never upside down. */
const readable = (g: WallGeom) => { let a = (Math.atan2(g.uy, g.ux) * 180) / Math.PI; if (a > 90) a -= 180; if (a <= -90) a += 180; return a; };

/** View box that fits all walls (or a default 4.8 × 3.6 m area) with a margin. */
export function fitView(project: Project, pad = 600): ViewBox {
  const pts = roomWalls(project.room).flatMap(w => [w.a, w.b]);
  if (!pts.length) return { x: -700, y: -700, w: 4800, h: 3600 };
  const x0 = Math.min(...pts.map(p => p.x)) - pad, x1 = Math.max(...pts.map(p => p.x)) + pad;
  const y0 = Math.min(...pts.map(p => p.y)) - pad, y1 = Math.max(...pts.map(p => p.y)) + pad;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

interface Props extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  project: Project;
  view: ViewBox;
  unit?: Unit;
  showWallUnits?: boolean;
  selection?: Selection | null;
  bad?: Set<string>;
  ghost?: { placement: Placement; width: number; depth: number } | null;
  draft?: { from: Point; to: Point } | null;
  /** Pointer down on an item (select / start drag). Absent → read-only plan. */
  onItemDown?: (sel: Selection, ev: React.PointerEvent) => void;
  interactive?: boolean;
}

export const Plan = forwardRef<SVGSVGElement, Props>(function Plan(
  { project, view, unit = 'mm', showWallUnits = true, selection, bad, ghost, draft, onItemDown, interactive, ...svgProps }, ref,
) {
  const room = project.room;
  const geoms = wallGeoms(room);
  const walls = roomWalls(room);
  const fs = view.w / 55; // label font size in mm, readable at any zoom
  const isSel = (kind: SelKind, id: string) => selection?.kind === kind && selection.id === id;
  const down = (sel: Selection) => (onItemDown ? (ev: React.PointerEvent) => { ev.stopPropagation(); onItemDown(sel, ev); } : undefined);
  const cls = onItemDown ? 'plan-item' : undefined;
  /** Group in wall coordinates: x along the axis from `a`, y along the normal. */
  const onWall = (g: WallGeom) => `translate(${g.ax} ${g.ay}) rotate(${(Math.atan2(g.uy, g.ux) * 180) / Math.PI})`;

  const unitRect = (e: Element) => {
    const g = geoms[e.wallId];
    if (!g) return null;
    const side = sideOf(geoms, e), up = e.kind === 'wall';
    const selected = isSel('el', e.id), wrong = bad?.has(e.id);
    // Labels are horizontal: on a horizontal wall lower labels sit away from the wall (wall units are drawn over the wall side).
    const horizontal = Math.abs(g.ux) >= Math.abs(g.uy);
    const c = wallPoint(g, e.offset + e.width / 2, g.th / 2 + e.depth * (up || !horizontal ? 0.5 : 0.72), side);
    const box = elementBox(geoms, e)!, room = (box.x1 - box.x0) * 0.92;
    const full = `${e.label} · ${fmt(e.width, unit)}`;
    const text = full.length * fs * 0.62 < room ? full : e.label;
    const size = text.length * fs * 0.62 < room ? fs : Math.max(fs * 0.55, room / (text.length * 0.62));
    return (
      <g key={e.id} onPointerDown={down({ kind: 'el', id: e.id })} className={cls}>
        <title>{`${e.label} · ${KIND_NAME[e.kind]} ${e.width}`}</title>
        <rect transform={onWall(g)} x={g.offA + e.offset} y={side > 0 ? g.th / 2 : -(g.th / 2 + e.depth)} width={e.width} height={e.depth}
          fill={wrong ? (up ? 'rgba(192,38,45,0.12)' : '#F6D5D3') : selected && !up ? '#FBE3D3' : KIND_FILL[e.kind]}
          stroke={selected ? ACCENT : wrong ? BAD : up ? ACCENT : INK} strokeWidth={selected ? fs / 4 : wrong ? fs / 5 : fs / 10}
          strokeDasharray={up && !selected ? `${fs / 2} ${fs / 3}` : undefined} />
        <text x={c.x} y={c.y} className="plan-label" fontSize={size} fill={e.kind === 'oven' && !selected && !wrong ? '#FFFFFF' : up ? '#7C2D0A' : INK}>{text}</text>
      </g>
    );
  };

  const lowers = project.elements.filter(e => e.kind !== 'wall');
  const uppers = showWallUnits ? project.elements.filter(e => e.kind === 'wall') : [];

  return (
    <svg ref={ref} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="img" className={interactive ? 'plan-svg interactive' : 'plan-svg'}
      aria-label={`Tlocrt: ${walls.length} zidova, ${project.elements.map(e => `${e.label} ${KIND_NAME[e.kind]} ${e.width}`).join(', ')}`}
      {...svgProps}>
      <defs>
        <pattern id="grid50" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#ECE8E0" strokeWidth={fs / 12} /></pattern>
        <pattern id="grid500" width="500" height="500" patternUnits="userSpaceOnUse"><path d="M500 0H0V500" fill="none" stroke="#DDD8CE" strokeWidth={fs / 8} /></pattern>
        <pattern id="hatch" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="60" height="60" fill="#EDE9E1" /><line x1="0" y1="0" x2="0" y2="60" stroke="#CFC8BB" strokeWidth="30" />
        </pattern>
        <pattern id="radiator" width="70" height="70" patternUnits="userSpaceOnUse">
          <rect width="70" height="70" fill="#D3D6D9" /><line x1="10" y1="0" x2="10" y2="70" stroke="#8A8F96" strokeWidth="20" />
        </pattern>
      </defs>
      <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="#FAF8F4" />
      {view.w < 8000 && <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="url(#grid50)" />}
      <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="url(#grid500)" />

      {walls.map(w => {
        const g = geoms[w.id];
        const sel = isSel('wall', w.id);
        const out = -interiorSide(geoms, w.id) * (g.th / 2 + fs * 1.4); // dimension on the outside of the room
        const m = { x: g.ax + g.ux * g.L / 2 + g.nx * out, y: g.ay + g.uy * g.L / 2 + g.ny * out };
        return (
          <g key={w.id} onPointerDown={down({ kind: 'wall', id: w.id })} className={cls}>
            <title>{`Zid ${w.id} · ${fmt(g.inner, unit)}`}</title>
            <line x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y} stroke={sel ? ACCENT : INK} strokeWidth={w.thickness} strokeLinecap="square" />
            <text x={m.x} y={m.y} transform={`rotate(${readable(g)} ${m.x} ${m.y})`} className="plan-dim" fontSize={fs * 0.9} fill={sel ? ACCENT : INK}>{w.id} · {fmt(g.inner, unit)}</text>
          </g>
        );
      })}
      {walls.flatMap(w => [w.a, w.b]).map((p, i) => (
        <rect key={i} x={p.x - fs / 3} y={p.y - fs / 3} width={fs / 1.5} height={fs / 1.5} fill="#FFFFFF" stroke={INK} strokeWidth={fs / 10} pointerEvents="none" />
      ))}

      {room.openings.map(o => {
        const g = geoms[o.wallId];
        if (!g) return null;
        const sel = isSel('opening', o.id), wrong = bad?.has(o.id);
        const side = sideOf(geoms, o), x = g.offA + o.offset;
        const stroke = sel ? ACCENT : wrong ? BAD : INK;
        return (
          <g key={o.id} transform={onWall(g)} onPointerDown={down({ kind: 'opening', id: o.id })} className={cls}>
            <title>{`${o.kind === 'window' ? 'Prozor' : 'Vrata'} ${o.width}`}</title>
            <rect x={x} y={-g.th / 2} width={o.width} height={g.th} fill={o.kind === 'window' ? '#DCE7F7' : '#FFFFFF'} stroke={stroke} strokeWidth={sel ? fs / 4 : fs / 8} />
            {o.kind === 'door' && (
              <path d={`M${x} ${side * g.th / 2} L${x} ${side * (g.th / 2 + o.width)} A${o.width} ${o.width} 0 0 ${side > 0 ? 0 : 1} ${x + o.width} ${side * g.th / 2}`}
                fill="none" stroke="#5F5A52" strokeWidth={fs / 10} strokeDasharray={`${fs / 3} ${fs / 4}`} pointerEvents="none" />
            )}
          </g>
        );
      })}

      {lowers.map(unitRect)}

      {(room.obstacles ?? []).map(o => {
        const sel = isSel('obs', o.id), wrong = bad?.has(o.id);
        const stroke = sel ? ACCENT : wrong ? BAD : INK, sw = sel ? fs / 4 : fs / 8;
        const fill = o.kind === 'radiator' ? 'url(#radiator)' : 'url(#hatch)';
        const title = <title>{`${OBSTACLE_NAME[o.kind]} ${o.id} · ${o.width}×${o.depth}`}</title>;
        if (o.x !== undefined && o.y !== undefined) {
          return (
            <g key={o.id} onPointerDown={down({ kind: 'obs', id: o.id })} className={cls}>
              {title}
              <rect x={o.x} y={o.y} width={o.width} height={o.depth} fill={fill} stroke={stroke} strokeWidth={sw} />
              <text x={o.x + o.width / 2} y={o.y + o.depth / 2} className="plan-label" fontSize={fs * 0.7} fill={INK}>{OBSTACLE_NAME[o.kind]}</text>
            </g>
          );
        }
        const g = o.wallId ? geoms[o.wallId] : undefined;
        if (!g) return null;
        const side = sideOf(geoms, o);
        return (
          <g key={o.id} transform={onWall(g)} onPointerDown={down({ kind: 'obs', id: o.id })} className={cls}>
            {title}
            <rect x={g.offA + (o.offset ?? 0)} y={side > 0 ? g.th / 2 : -(g.th / 2 + o.depth)} width={o.width} height={o.depth} fill={fill} stroke={stroke} strokeWidth={sw} />
          </g>
        );
      })}

      {uppers.map(unitRect)}

      {room.installations.map(i => {
        const g = geoms[i.wallId];
        if (!g) return null;
        const [letter, bg, fg] = INSTALLATION_MARK[i.kind];
        const p = wallPoint(g, i.offset, g.th / 2 + fs * 1.1, sideOf(geoms, i));
        const sel = isSel('inst', i.id);
        return (
          <g key={i.id} onPointerDown={down({ kind: 'inst', id: i.id })} className={cls}>
            <title>{`${i.id} · ${fmt(i.offset, unit)} od početka zida · h ${fmt(i.height, unit)}`}</title>
            <circle cx={p.x} cy={p.y} r={fs * 0.75} fill={bg} stroke={sel ? ACCENT : bad?.has(i.id) ? BAD : '#FFFFFF'} strokeWidth={fs / 5} />
            <text x={p.x} y={p.y} className="plan-mark" fontSize={fs * 0.8} fill={fg}>{letter}</text>
          </g>
        );
      })}

      {ghost && geoms[ghost.placement.wallId] && (() => {
        const g = geoms[ghost.placement.wallId], side = ghost.placement.side;
        return (
          <g transform={onWall(g)} pointerEvents="none">
            <rect x={g.offA + ghost.placement.offset} y={side > 0 ? g.th / 2 : -(g.th / 2 + ghost.depth)} width={ghost.width} height={ghost.depth}
              fill="rgba(226,128,77,0.25)" stroke={ACCENT} strokeWidth={fs / 5} strokeDasharray={`${fs / 2} ${fs / 3}`} />
          </g>
        );
      })()}

      {draft && (
        <g pointerEvents="none">
          <line x1={draft.from.x} y1={draft.from.y} x2={draft.to.x} y2={draft.to.y} stroke="rgba(180,68,14,0.55)" strokeWidth={120} />
          <text x={(draft.from.x + draft.to.x) / 2} y={(draft.from.y + draft.to.y) / 2 - fs * 1.5} className="plan-dim" fontSize={fs} fill={ACCENT}>
            {fmt(Math.round(Math.hypot(draft.to.x - draft.from.x, draft.to.y - draft.from.y)), unit)}
          </text>
        </g>
      )}
    </svg>
  );
});
