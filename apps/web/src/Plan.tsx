// Top-down plan in mm: wall A along the top, B down the left side, C down the right side.
// shortcut: assumes the A/B/C wall layout from Quick start (90° corners); generalize when users draw their own walls.
import type { Element, Mm, Obstacle, Project } from 'engine';
import { useRef } from 'react';
import { KIND_NAME, OBSTACLE_NAME } from './labels';

const KIND_FILL: Record<string, string> = {
  'corner-blind': '#E7E1D5', base: '#E7E1D5', drawer: '#E7E1D5', sink: '#C9DAF2', 'appliance-front': '#E7E1D5',
  oven: '#3A3936', filler: '#D6CDBC', tall: '#C9BEA9', wall: 'rgba(255,255,255,0.55)',
};
const INSTALLATION_MARK: Record<string, [string, string, string]> = {
  water: ['V', '#1E50C8', '#FFFFFF'], drain: ['O', '#57534E', '#FFFFFF'], power: ['S', '#F2B630', '#1C1B19'],
  power400: ['S', '#F2B630', '#1C1B19'], gas: ['G', '#B4440E', '#FFFFFF'],
};
const SNAP = 50, MAGNET = 40;

type Item = { id: string; wallId: string; offset: Mm; width: Mm };

interface Props {
  project: Project;
  /** Which units can be grabbed; the other group is drawn faded. Obstacles are always editable. */
  layer?: 'lower' | 'upper';
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Called while dragging; `first` is true for the first move of a drag (record undo once). */
  onMove?: (id: string, offset: Mm, first: boolean) => void;
}

export function Plan({ project, layer = 'lower', selectedId, onSelect, onMove }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ item: Item; start: number; moved: boolean } | null>(null);
  const len = (id: string) => project.room.walls.find(w => w.id === id)?.length ?? 0;
  const a = len('A'), b = len('B'), c = len('C');
  const lowerDepth = project.elements.find(e => e.kind !== 'wall')?.depth ?? 560;
  const h = Math.max(b, c, lowerDepth);
  const pad = 200;

  const rect = (wallId: string, offset: Mm, width: Mm, depth: Mm) =>
    wallId === 'A' ? { x: offset, y: 0, w: width, h: depth }
    : wallId === 'B' ? { x: 0, y: offset, w: depth, h: width }
    : { x: a - depth, y: offset, w: depth, h: width };
  const along = (wallId: string, pt: DOMPoint) => (wallId === 'A' ? pt.x : pt.y);
  const toSvg = (ev: React.PointerEvent) =>
    new DOMPoint(ev.clientX, ev.clientY).matrixTransform(svgRef.current!.getScreenCTM()!.inverse());

  const all: Item[] = [...project.elements, ...(project.room.obstacles ?? [])];
  const down = (item: Item) => (ev: React.PointerEvent) => {
    ev.stopPropagation();
    onSelect?.(item.id);
    if (!onMove) return;
    (ev.currentTarget as SVGGElement).setPointerCapture(ev.pointerId);
    drag.current = { item, start: along(item.wallId, toSvg(ev)), moved: false };
  };
  const move = (ev: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !onMove) return;
    const { item } = d;
    let next = item.offset + along(item.wallId, toSvg(ev)) - d.start;
    next = ev.shiftKey ? Math.round(next) : Math.round(next / SNAP) * SNAP;
    // Stick to neighbours' edges so units line up without gaps.
    for (const o of all) {
      if (o.id === item.id || o.wallId !== item.wallId) continue;
      for (const edge of [o.offset, o.offset + o.width]) {
        if (Math.abs(next - edge) < MAGNET) next = edge;
        if (Math.abs(next + item.width - edge) < MAGNET) next = edge - item.width;
      }
    }
    next = Math.max(0, Math.min(len(item.wallId) - item.width, next));
    if (next === item.offset && !d.moved) return;
    onMove(item.id, next, !d.moved);
    d.moved = true;
  };
  const up = () => { drag.current = null; };

  const interactive = !!onSelect;
  const lowers = project.elements.filter(e => e.kind !== 'wall');
  const uppers = project.elements.filter(e => e.kind === 'wall');
  const stroke = (id: string) => (id === selectedId ? { stroke: '#B4440E', strokeWidth: 24 } : { stroke: '#1C1B19', strokeWidth: 8 });

  const unit = (e: Element, dashed: boolean) => {
    const editable = interactive && (dashed ? layer === 'upper' : layer === 'lower');
    const r = rect(e.wallId, e.offset, e.width, e.depth);
    // Lower labels sit away from the wall so wall units drawn on top don't cover them.
    const lx = e.wallId === 'A' ? r.x + r.w / 2 : e.wallId === 'B' ? r.x + r.w * (dashed ? 0.5 : 0.75) : r.x + r.w * (dashed ? 0.5 : 0.25);
    const ly = e.wallId === 'A' ? r.y + r.h * (dashed ? 0.5 : 0.75) : r.y + r.h / 2;
    return (
      <g key={e.id} onPointerDown={editable ? down(e) : undefined} className={editable ? 'plan-item' : interactive ? 'plan-ghost' : undefined}>
        <title>{`${e.label} · ${KIND_NAME[e.kind]} ${e.width}`}</title>
        <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={KIND_FILL[e.kind]} {...stroke(e.id)} strokeDasharray={dashed ? '40 25' : undefined} />
        {Math.min(r.w, r.h) >= 250 && (
          <text x={lx} y={ly} className="plan-label" fill={e.kind === 'oven' ? '#FFFFFF' : '#1C1B19'}>{e.label}</text>
        )}
      </g>
    );
  };
  const obstacle = (o: Obstacle) => {
    const r = rect(o.wallId, o.offset, o.width, o.depth);
    return (
      <g key={o.id} onPointerDown={interactive ? down(o) : undefined} className={interactive ? 'plan-item' : undefined}>
        <title>{`${OBSTACLE_NAME[o.kind]} ${o.id} · ${o.width}×${o.depth}`}</title>
        <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#hatch)" {...stroke(o.id)} />
      </g>
    );
  };
  // Marks sit just outside the wall line.
  const outside = (wallId: string, offset: Mm, dist: Mm) =>
    wallId === 'A' ? { x: offset, y: -dist } : wallId === 'B' ? { x: -dist, y: offset } : { x: a + dist, y: offset };

  return (
    <div className="plan">
      <svg ref={svgRef} viewBox={`${-pad} ${-pad} ${a + 2 * pad} ${h + 2 * pad}`} role="img"
        aria-label={`Tlocrt: ${project.elements.map(e => `${e.label} ${KIND_NAME[e.kind]} ${e.width}`).join(', ')}`}
        onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onPointerDown={interactive ? () => onSelect?.(null) : undefined}>
        <defs>
          <pattern id="hatch" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="60" height="60" fill="#8A8378" /><line x1="0" y1="0" x2="0" y2="60" stroke="#1C1B19" strokeWidth="14" />
          </pattern>
        </defs>
        <rect x={-60} y={-60} width={a + 120} height={60} fill="#1C1B19" />
        {b > 0 && <rect x={-60} y={0} width={60} height={b} fill="#1C1B19" />}
        {c > 0 && <rect x={a} y={0} width={60} height={c} fill="#1C1B19" />}
        {project.room.openings.map(o => {
          const r = o.wallId === 'A' ? { x: o.offset, y: -50, w: o.width, h: 40 }
            : o.wallId === 'B' ? { x: -50, y: o.offset, w: 40, h: o.width } : { x: a + 10, y: o.offset, w: 40, h: o.width };
          return <rect key={o.id} x={r.x} y={r.y} width={r.w} height={r.h} fill="#C9DAF2" stroke="#1C1B19" strokeWidth={6} />;
        })}
        {lowers.map(e => unit(e, false))}
        {(project.room.obstacles ?? []).map(obstacle)}
        {uppers.map(e => unit(e, true))}
        {project.room.installations.map(i => {
          const [letter, fill, color] = INSTALLATION_MARK[i.kind];
          const p = outside(i.wallId, i.offset, 120);
          return (
            <g key={i.id}>
              <title>{`${i.id} · ${i.offset} od ugla · h ${i.height}`}</title>
              <circle cx={p.x} cy={p.y} r={55} fill={fill} stroke="#FFFFFF" strokeWidth={10} />
              <text x={p.x} y={p.y} fill={color} className="plan-mark">{letter}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
