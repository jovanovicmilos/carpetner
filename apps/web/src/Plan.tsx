// SVG plan renderer (viewBox in mm). Used read-only by Quick start and interactively by the editor,
// which passes the view box, selection and pointer handlers.
import {
  hingeOf, interiorSide, roomWalls, sideOf, wallGeoms, wallPoint, type Element, type Placement, type Point, type Project, type Unit, type WallGeom,
} from 'engine';
import { forwardRef, type SVGProps } from 'react';
import type { Underlay } from './underlay';
import { fmt, INSTALLATION_MARK, KIND_NAME, OBSTACLE_NAME } from './labels';

export type SelKind = 'wall' | 'el' | 'obs' | 'opening' | 'inst';
export interface Selection { kind: SelKind; id: string }
export interface ViewBox { x: number; y: number; w: number; h: number }

const KIND_FILL: Record<string, string> = {
  'corner-blind': '#E7E1D5', base: '#E7E1D5', drawer: '#E7E1D5', sink: '#C9DAF2', 'appliance-front': '#E7E1D5',
  oven: '#3A3936', filler: '#D6CDBC', tall: '#C9BEA9', wall: 'rgba(180,68,14,0.10)',
};
const ACCENT = '#B4440E', BAD = '#C0262D', INK = '#1C1B19';
const GRID_EXTENT = 200_000; // mm; more than the max zoom-out (40 m view)

/** View box that fits all walls (or a default 4.8 × 3.6 m area) with a margin. */
export function fitView(project: Project, pad = 700): ViewBox {
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
  /** Pointer enters (sel) or leaves (null) an item; for the help card. */
  onItemHover?: (sel: Selection | null) => void;
  interactive?: boolean;
  /** Millimetres per screen pixel, so labels and strokes get the reference's pixel sizes (design/screens/Main.html). */
  px?: number;
  /** Imported apartment plan drawn under everything (underlay.ts). */
  underlay?: Underlay | null;
}

export const Plan = forwardRef<SVGSVGElement, Props>(function Plan(
  { project, view, unit = 'mm', showWallUnits = true, selection, bad, ghost, draft, onItemDown, onItemHover, interactive, px, underlay, ...svgProps }, ref,
) {
  const room = project.room;
  const geoms = wallGeoms(room);
  const walls = roomWalls(room);
  const P = px ?? view.w / 822; // mm per screen pixel
  const fs = 11 * P; // reference label size: 11 px
  const isSel = (kind: SelKind, id: string) => selection?.kind === kind && selection.id === id;
  const down = (sel: Selection) => (onItemDown ? (ev: React.PointerEvent) => { ev.stopPropagation(); onItemDown(sel, ev); } : undefined);
  const cls = onItemDown ? 'plan-item' : undefined;
  const on = (sel: Selection) => ({
    onPointerDown: down(sel),
    onPointerEnter: onItemHover && (() => onItemHover(sel)),
    onPointerLeave: onItemHover && (() => onItemHover(null)),
  });
  /** Group in wall coordinates: x along the axis from `a`, y along the normal. */
  const onWall = (g: WallGeom) => `translate(${g.ax} ${g.ay}) rotate(${(Math.atan2(g.uy, g.ux) * 180) / Math.PI})`;

  const unitRect = (e: Element) => {
    const g = geoms[e.wallId];
    if (!g) return null;
    const side = sideOf(geoms, e), up = e.kind === 'wall';
    const selected = isSel('el', e.id), wrong = bad?.has(e.id);
    const x = g.offA + e.offset, y = side > 0 ? g.th / 2 : -(g.th / 2 + e.depth);
    // Label along the wall, centred; wall units put it at the wall edge (design: align-self flex-start for side +1, padding 2px).
    const ly = up ? (side > 0 ? y + 9.5 * P : y + e.depth - 9.5 * P) : y + e.depth / 2;
    return (
      <g key={e.id} {...on({ kind: 'el', id: e.id })} className={cls}>
        <title>{`${e.label} · ${KIND_NAME[e.kind]} ${e.width}`}</title>
        <g transform={onWall(g)}>
          <rect x={x} y={y} width={e.width} height={e.depth}
            fill={wrong ? (up ? 'rgba(192,38,45,0.12)' : '#F6D5D3') : selected && !up ? '#FBE3D3' : KIND_FILL[e.kind]}
            stroke={selected ? ACCENT : wrong ? BAD : up ? ACCENT : INK} strokeWidth={(selected ? 2.5 : wrong ? 2 : up ? 1.5 : 1.2) * P}
            strokeDasharray={up && !selected && !wrong ? `${4 * P} ${3 * P}` : undefined} />
          <text x={x + e.width / 2} y={ly} className="plan-label" fontSize={fs}
            fill={e.kind === 'oven' && !selected && !wrong ? '#FFFFFF' : up ? '#7C2D0A' : INK}>{e.label}{e.width >= 300 ? ` · ${fmt(e.width, unit)}` : ''}</text>
        </g>
        {swing(e, g, side, up)}
      </g>
    );
  };

  /** Door leaves opened 45° from the hinge side, in front of the unit (docs/EDITOR_2D.md). Front view: left = wall start when side is +1. */
  const swing = (e: Element, g: WallGeom, side: 1 | -1, up: boolean) => {
    const hinge = hingeOf(e);
    if (hinge === 'none' || hinge === 'down') return null; // the plan draws no swing for the dishwasher front (design)
    const x0 = e.kind === 'corner-blind' ? Math.max(0, e.width - 600) : 0; // design: corner leaf = min(600, w), blind part on the left
    const face = g.th / 2 + e.depth;
    const pt = (fx: number, out: number) => `${g.offA + e.offset + (side > 0 ? fx : e.width - fx)} ${side * (face + out)}`;
    const leaf = (hx: number, dir: 1 | -1, w: number) => { const l = w * 0.6 * Math.SQRT1_2; return `M${pt(hx, 0)}L${pt(hx + dir * l, l)}`; };
    const w = e.width - x0;
    const d = hinge === 'LR' ? leaf(x0, 1, w / 2) + leaf(e.width, -1, w / 2) : hinge === 'L' ? leaf(x0, 1, w) : leaf(e.width, -1, w);
    return <path transform={onWall(g)} d={d} fill="none" stroke={up ? ACCENT : INK} strokeWidth={(up ? 1 : 1.4) * P} pointerEvents="none" />;
  };


  return (
    <svg ref={ref} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="img" className={interactive ? 'plan-svg interactive' : 'plan-svg'}
      aria-label={`Tlocrt: ${walls.length} zidova, ${project.elements.map(e => `${e.label} ${KIND_NAME[e.kind]} ${e.width}`).join(', ')}`}
      {...svgProps}>
      <defs>
        <pattern id="grid500" width="500" height="500" patternUnits="userSpaceOnUse"><path d="M500 0H0V500" fill="none" stroke="#E4DFD5" strokeWidth={view.w / 900} /></pattern>
        <pattern id="hatch" width={8 * P} height={8 * P} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={8 * P} height={8 * P} fill="#EDE9E1" /><rect width={4 * P} height={8 * P} fill="#CFC8BB" />
        </pattern>
        <pattern id="chimney" width={8 * P} height={8 * P} patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
          <rect width={8 * P} height={8 * P} fill="#E4DED2" /><rect width={4 * P} height={8 * P} fill="#B8AFA0" />
        </pattern>
        <pattern id="radiator" width={7 * P} height={7 * P} patternUnits="userSpaceOnUse">
          <rect width={7 * P} height={7 * P} fill="#D3D6D9" /><rect width={2 * P} height={7 * P} fill="#8A8F96" />
        </pattern>
        <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy={P} stdDeviation={1.5 * P} floodOpacity="0.25" /></filter>
      </defs>
      {/* Background far beyond the view box, so the grid also fills letterboxed edges and stays while panning. */}
      <rect x={-GRID_EXTENT} y={-GRID_EXTENT} width={2 * GRID_EXTENT} height={2 * GRID_EXTENT} fill="#FAF8F4" />
      <rect x={-GRID_EXTENT} y={-GRID_EXTENT} width={2 * GRID_EXTENT} height={2 * GRID_EXTENT} fill="url(#grid500)" />
      {underlay && <image href={underlay.src} x={underlay.x} y={underlay.y} width={underlay.w} height={underlay.h} opacity={underlay.opacity} preserveAspectRatio="none" pointerEvents="none" />}

      {walls.map(w => {
        const g = geoms[w.id];
        const sel = isSel('wall', w.id);
        return (
          <g key={w.id} {...on({ kind: 'wall', id: w.id })} className={cls}>
            <title>{`Zid ${w.id} · ${fmt(g.inner, unit)}`}</title>
            <line x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y} stroke={sel ? ACCENT : INK} strokeWidth={w.thickness} strokeLinecap="square" />
          </g>
        );
      })}

      {room.openings.map(o => {
        const g = geoms[o.wallId];
        if (!g) return null;
        const sel = isSel('opening', o.id), wrong = bad?.has(o.id);
        const side = sideOf(geoms, o), x = g.offA + o.offset;
        const stroke = sel ? ACCENT : wrong ? BAD : INK;
        return (
          <g key={o.id} transform={onWall(g)} {...on({ kind: 'opening', id: o.id })} className={cls}>
            <title>{`${o.kind === 'window' ? 'Prozor' : 'Vrata'} ${o.width}`}</title>
            {o.kind === 'window'
              ? <rect x={x} y={-g.th / 2} width={o.width} height={g.th} fill="#DCE7F7" stroke={stroke} strokeWidth={(sel ? 2 : 1.5) * P} />
              : <>
                <rect x={x} y={-g.th / 2} width={o.width} height={g.th} fill="#FFFFFF" />
                <path d={`M${x} ${-g.th / 2}v${g.th}M${x + o.width} ${-g.th / 2}v${g.th}`} stroke={stroke} strokeWidth={2 * P} />
                {/* leaf (solid) and swing (dashed quarter circle) into the room */}
                <path d={`M${x} ${side * g.th / 2}L${x} ${side * (g.th / 2 + o.width)}`} stroke={INK} strokeWidth={1.5 * P} />
                <path d={`M${x} ${side * (g.th / 2 + o.width)}A${o.width} ${o.width} 0 0 ${side > 0 ? 0 : 1} ${x + o.width} ${side * g.th / 2}`}
                  fill="none" stroke="#5F5A52" strokeWidth={P} strokeDasharray={`${3 * P} ${3 * P}`} pointerEvents="none" />
              </>}
          </g>
        );
      })}

      {(room.obstacles ?? []).map(o => {
        const sel = isSel('obs', o.id), wrong = bad?.has(o.id);
        const stroke = sel ? ACCENT : wrong ? BAD : INK, sw = (sel ? 2 : o.kind === 'radiator' ? 1 : 1.5) * P;
        const fill = o.kind === 'radiator' ? 'url(#radiator)' : o.kind === 'chimney' ? 'url(#chimney)' : o.kind === 'other' ? '#F3F1EC' : 'url(#hatch)';
        const dash = o.kind === 'other' && !sel && !wrong ? `${4 * P} ${3 * P}` : undefined;
        const name = o.label || OBSTACLE_NAME[o.kind];
        const title = <title>{`${name} ${o.id} · ${o.width}×${o.depth}`}</title>;
        if (o.x !== undefined && o.y !== undefined) {
          return (
            <g key={o.id} {...on({ kind: 'obs', id: o.id })} className={cls}>
              {title}
              <rect x={o.x} y={o.y} width={o.width} height={o.depth} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
              <text x={o.x + o.width / 2} y={o.y + o.depth / 2} className="plan-obs" fontSize={10 * P} fill={INK}>{name}</text>
            </g>
          );
        }
        const g = o.wallId ? geoms[o.wallId] : undefined;
        if (!g) return null;
        const side = sideOf(geoms, o);
        return (
          <g key={o.id} transform={onWall(g)} {...on({ kind: 'obs', id: o.id })} className={cls}>
            {title}
            <rect x={g.offA + (o.offset ?? 0)} y={side > 0 ? g.th / 2 : -(g.th / 2 + o.depth)} width={o.width} height={o.depth} fill={fill} stroke={stroke} strokeWidth={sw} />
            {o.kind === 'chimney' && <text x={g.offA + (o.offset ?? 0) + o.width / 2} y={side > 0 ? g.th / 2 + o.depth / 2 : -(g.th / 2 + o.depth / 2)} className="plan-obs" fontSize={10 * P} fill={INK}>Dimnjak</text>}
          </g>
        );
      })}

      {/* design order: lower, tall, then upper units */}
      {project.elements.filter(e => e.kind !== 'wall' && e.kind !== 'tall').map(unitRect)}
      {project.elements.filter(e => e.kind === 'tall').map(unitRect)}
      {(showWallUnits ? project.elements.filter(e => e.kind === 'wall') : []).map(unitRect)}

      {room.installations.map(i => {
        const g = geoms[i.wallId];
        if (!g) return null;
        const [letter, bg, fg] = INSTALLATION_MARK[i.kind];
        const p = wallPoint(g, i.offset, g.th / 2 + 90, sideOf(geoms, i));
        const sel = isSel('inst', i.id);
        return (
          <g key={i.id} {...on({ kind: 'inst', id: i.id })} className={cls}>
            <title>{`${i.id} · ${fmt(i.offset, unit)} od početka zida · h ${fmt(i.height, unit)}`}</title>
            <circle cx={p.x} cy={p.y} r={10 * P} fill={bg} stroke={sel ? ACCENT : bad?.has(i.id) ? BAD : '#FFFFFF'} strokeWidth={2 * P} filter="url(#marker-shadow)" />
            <text x={p.x} y={p.y} className="plan-mark" fontSize={11 * P} fill={fg}>{letter}</text>
          </g>
        );
      })}

      {walls.map(w => {
        const g = geoms[w.id], sel = isSel('wall', w.id);
        const out = -interiorSide(geoms, w.id) * (g.th / 2 + 170); // outside the room, 170 mm from the wall face
        const m = { x: g.ax + g.ux * g.L / 2 + g.nx * out, y: g.ay + g.uy * g.L / 2 + g.ny * out };
        const t = fmt(g.inner, unit), tw = (t.length * 7.3 + 8) * P, th = 17 * P;
        return (
          <g key={`dim-${w.id}`} pointerEvents="none">
            <rect x={m.x - tw / 2} y={m.y - th / 2} width={tw} height={th} rx={3 * P} fill="rgba(243,241,236,0.9)" />
            <text x={m.x} y={m.y} className="plan-dim" fontSize={12 * P} fill={sel ? ACCENT : INK}>{t}</text>
          </g>
        );
      })}
      {walls.flatMap(w => [w.a, w.b]).map((p, i) => (
        <rect key={i} x={p.x - 4 * P} y={p.y - 4 * P} width={8 * P} height={8 * P} fill="#FFFFFF" stroke={INK} strokeWidth={1.5 * P} pointerEvents="none" />
      ))}

      {ghost && geoms[ghost.placement.wallId] && (() => {
        const g = geoms[ghost.placement.wallId], side = ghost.placement.side;
        return (
          <g transform={onWall(g)} pointerEvents="none">
            <rect x={g.offA + ghost.placement.offset} y={side > 0 ? g.th / 2 : -(g.th / 2 + ghost.depth)} width={ghost.width} height={ghost.depth}
              fill="rgba(226,128,77,0.25)" stroke={ACCENT} strokeWidth={2 * P} strokeDasharray={`${4 * P} ${3 * P}`} />
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
