// Room geometry for the 2D editor (docs/EDITOR_2D.md). Plan coordinates in mm, y grows downwards.
// A wall is its axis a → b with thickness th. Offsets along a wall are measured from the inner corner
// (axis start + th/2 when that end joins another wall), the way a joiner measures with a tape.
import type { Element, ElementKind, Hinge, Mm, Obstacle, Point, Project, Room, Wall } from './types';

export interface WallGeom {
  wall: Wall;
  ax: number; ay: number;   // axis start
  L: number;                // axis length
  ux: number; uy: number;   // unit direction a → b
  nx: number; ny: number;   // unit normal (side +1)
  th: Mm;
  offA: Mm; offB: Mm;       // th/2 at ends joined to another wall, else 0
  inner: Mm;                // L − offA − offB
}
export interface Box { x0: number; y0: number; x1: number; y1: number }
export type Layer = 'low' | 'up' | 'tall';

const same = (p: Point, q: Point) => Math.abs(p.x - q.x) < 1 && Math.abs(p.y - q.y) < 1;

/**
 * Walls with axis points. Rooms from Quick start / older projects have no points: A runs along the top,
 * B down from A's start, C down from A's end (inner corner at 0,0).
 * shortcut: only the A/B/C layout is derived; drawn rooms always store points.
 */
export function roomWalls(room: Room): (Wall & { a: Point; b: Point })[] {
  if (room.walls.every(w => w.a && w.b)) return room.walls as (Wall & { a: Point; b: Point })[];
  const byId = Object.fromEntries(room.walls.map(w => [w.id, w]));
  const A = byId.A, h = (A?.thickness ?? 0) / 2;
  const aLen = A?.length ?? 0;
  const endA = byId.C ? aLen + h : aLen;
  return room.walls.map(w => {
    if (w.a && w.b) return w as Wall & { a: Point; b: Point };
    const t = w.thickness / 2;
    switch (w.id) {
      case 'A': return { ...w, a: { x: byId.B ? -t : 0, y: -t }, b: { x: endA, y: -t } };
      case 'B': return { ...w, a: { x: -t, y: -t }, b: { x: -t, y: w.length } };
      case 'C': return { ...w, a: { x: aLen + t, y: -t }, b: { x: aLen + t, y: w.length } };
      default: return { ...w, a: { x: 0, y: 0 }, b: { x: w.length, y: 0 } };
    }
  });
}

export function wallGeoms(room: Room): Record<string, WallGeom> {
  const walls = roomWalls(room);
  // A corner only where the walls turn: a straight continuation (a split wall) keeps the full length on both parts.
  const dir = (w: { a: Point; b: Point }) => { const l = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y) || 1; return { x: (w.b.x - w.a.x) / l, y: (w.b.y - w.a.y) / l }; };
  const joined = (id: string, p: Point) => {
    const w = walls.find(x => x.id === id)!, d = dir(w);
    return walls.some(o => { if (o.id === id || !(same(o.a, p) || same(o.b, p))) return false; const e = dir(o); return Math.abs(d.x * e.y - d.y * e.x) > 0.01; });
  };
  return Object.fromEntries(walls.map(w => {
    const dx = w.b.x - w.a.x, dy = w.b.y - w.a.y, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, th = w.thickness;
    const offA = joined(w.id, w.a) ? th / 2 : 0, offB = joined(w.id, w.b) ? th / 2 : 0;
    return [w.id, { wall: w, ax: w.a.x, ay: w.a.y, L, ux, uy, nx: -uy, ny: ux, th, offA, offB, inner: Math.round(L - offA - offB) }];
  }));
}

/** Ceiling height over a point of the wall, `along` from the inner start (straight line between heightStart and heightEnd). */
export function wallHeightAt(room: Room, g: WallGeom, along: Mm): Mm {
  const h0 = g.wall.heightStart ?? room.height, h1 = g.wall.heightEnd ?? room.height;
  return h0 === h1 ? h0 : Math.round(h0 + ((h1 - h0) * along) / (g.inner || 1));
}
export const isSloped = (room: Room, w: Wall) => (w.heightStart ?? room.height) !== (w.heightEnd ?? room.height);

/** Point on the wall: `along` from the inner start, `out` from the axis along the normal (× side). */
export const wallPoint = (g: WallGeom, along: number, out: number, side: 1 | -1 = 1): Point =>
  ({ x: g.ax + g.ux * (g.offA + along) + g.nx * out * side, y: g.ay + g.uy * (g.offA + along) + g.ny * out * side });

/** Side of the wall that faces the room (towards the centre of all walls). */
export function interiorSide(geoms: Record<string, WallGeom>, wallId: string): 1 | -1 {
  const all = Object.values(geoms).filter(w => !w.wall.island), g = geoms[wallId];
  if (!g || all.length < 2) return 1;
  const cx = all.reduce((s, w) => s + w.ax + w.ux * w.L / 2, 0) / all.length;
  const cy = all.reduce((s, w) => s + w.ay + w.uy * w.L / 2, 0) / all.length;
  const mx = g.ax + g.ux * g.L / 2, my = g.ay + g.uy * g.L / 2;
  return (cx - mx) * g.nx + (cy - my) * g.ny >= 0 ? 1 : -1;
}

export const sideOf = (geoms: Record<string, WallGeom>, item: { wallId?: string; side?: 1 | -1 }) =>
  item.side ?? interiorSide(geoms, item.wallId ?? '');

export const layerOf = (e: Pick<Element, 'kind'>): Layer => (e.kind === 'wall' ? 'up' : e.kind === 'tall' ? 'tall' : 'low');
export const layersMeet = (a: Layer, b: Layer) => a === 'tall' || b === 'tall' || a === b;

/** Rectangle on a wall face: `along` + `width` along the wall, `depth` out from the face. */
export function faceBox(g: WallGeom, along: Mm, width: Mm, depth: Mm, side: 1 | -1): Box {
  const pts = [along, along + width].flatMap(t => [g.th / 2, g.th / 2 + depth].map(o => wallPoint(g, t, o, side)));
  return {
    x0: Math.min(...pts.map(p => p.x)), x1: Math.max(...pts.map(p => p.x)),
    y0: Math.min(...pts.map(p => p.y)), y1: Math.max(...pts.map(p => p.y)),
  };
}

export const elementBox = (geoms: Record<string, WallGeom>, e: Element): Box | null =>
  geoms[e.wallId] ? faceBox(geoms[e.wallId], e.offset, e.width, e.depth, sideOf(geoms, e)) : null;

export function obstacleBox(geoms: Record<string, WallGeom>, o: Obstacle): Box | null {
  if (o.x !== undefined && o.y !== undefined) return { x0: o.x, y0: o.y, x1: o.x + o.width, y1: o.y + o.depth };
  const g = o.wallId ? geoms[o.wallId] : undefined;
  return g ? faceBox(g, o.offset ?? 0, o.width, o.depth, sideOf(geoms, o)) : null;
}

/** Overlap larger than 2 mm on both axes. */
export const boxesOverlap = (a: Box, b: Box) =>
  Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 2 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 2;

export function nearestWall(geoms: Record<string, WallGeom>, p: Point, maxDist: Mm) {
  let best: { g: WallGeom; along: number; dist: number; side: 1 | -1 } | null = null;
  for (const g of Object.values(geoms)) {
    const rx = p.x - g.ax, ry = p.y - g.ay;
    const tp = rx * g.ux + ry * g.uy, dp = rx * g.nx + ry * g.ny;
    const tc = Math.max(0, Math.min(g.L, tp));
    const dist = Math.hypot(p.x - (g.ax + g.ux * tc), p.y - (g.ay + g.uy * tc));
    if (dist <= maxDist && (!best || dist < best.dist)) best = { g, along: tp - g.offA, dist, side: dp >= 0 ? 1 : -1 };
  }
  return best;
}

export interface Placement { wallId: string; offset: Mm; side: 1 | -1 }

/**
 * Where a unit of `width` lands when dropped at `p`: nearest wall (< 1500 mm), the side the cursor is on,
 * centred on the cursor, snapped to `snap`, stuck to neighbours of a meeting layer (< 150 mm), kept inside the inner length.
 */
export function placeUnit(room: Room, elements: Element[], p: Point, width: Mm, layer: Layer, excludeId: string | null, snap = 50): Placement | null {
  const geoms = wallGeoms(room);
  const nw = nearestWall(geoms, p, 1500);
  if (!nw) return null;
  const hi = Math.max(0, nw.g.inner - width);
  const round = (v: number) => (snap > 1 ? Math.round(v / snap) * snap : Math.round(v));
  let t = Math.max(0, Math.min(hi, round(nw.along - width / 2)));
  for (const o of elements) {
    if (o.id === excludeId || o.wallId !== nw.g.wall.id || sideOf(geoms, o) !== nw.side || !layersMeet(layer, layerOf(o))) continue;
    if (Math.abs(t - (o.offset + o.width)) < 150) t = o.offset + o.width;
    else if (Math.abs(t + width - o.offset) < 150) t = o.offset - width;
  }
  return { wallId: nw.g.wall.id, offset: Math.max(0, Math.min(hi, t)), side: nw.side };
}

/** Where a wall-mounted item (window, door, radiator, installation) lands: nearest wall < 1000 mm. */
export function placeOnWall(room: Room, p: Point, width: Mm, snap = 50): Placement | null {
  const nw = nearestWall(wallGeoms(room), p, 1000);
  if (!nw) return null;
  const round = (v: number) => (snap > 1 ? Math.round(v / snap) * snap : Math.round(v));
  return { wallId: nw.g.wall.id, offset: Math.max(0, Math.min(Math.max(0, nw.g.inner - width), round(nw.along - width / 2))), side: nw.side };
}

/** Stores axis points on every wall and refreshes `length` (inner) and `angleToPrev`. Call after every wall edit. */
export function syncWalls(room: Room): Room {
  const walls = roomWalls(room);
  const geoms = wallGeoms({ ...room, walls });
  return {
    ...room,
    walls: walls.map((w, i) => {
      const g = geoms[w.id], prev = i > 0 ? geoms[walls[i - 1].id] : undefined;
      const angle = prev ? Math.round((Math.atan2(g.uy, g.ux) - Math.atan2(prev.uy, prev.ux)) * 180 / Math.PI) : 0;
      return { ...w, length: g.inner, angleToPrev: ((angle % 360) + 360) % 360 };
    }),
  };
}

/** Sets a wall's inner length; the wall joined at its end moves parallel so corners stay square. */
export function setWallLength(room: Room, id: string, inner: Mm): Room {
  const walls = roomWalls(room).map(w => ({ ...w, a: { ...w.a }, b: { ...w.b } }));
  const g = wallGeoms({ ...room, walls })[id];
  const w = walls.find(x => x.id === id);
  if (!w || !g || inner < 100) return room;
  const L = inner + g.offA + g.offB, oldB = { ...w.b };
  const nb = { x: Math.round(g.ax + g.ux * L), y: Math.round(g.ay + g.uy * L) };
  const dx = nb.x - oldB.x, dy = nb.y - oldB.y;
  const next = walls.find(x => x.id !== id && same(x.a, oldB));
  w.b = nb;
  if (next) {
    const oldNb = { ...next.b };
    next.a = { x: next.a.x + dx, y: next.a.y + dy };
    next.b = { x: next.b.x + dx, y: next.b.y + dy };
    const after = walls.find(x => x.id !== next.id && x.id !== id && same(x.a, oldNb));
    if (after) after.a = { x: after.a.x + dx, y: after.a.y + dy };
  }
  return syncWalls({ ...room, walls });
}

/** Next free wall letter: A, B, … Z, then W27… */
export function nextWallId(room: Room) {
  const taken = new Set(room.walls.map(w => w.id));
  for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') if (!taken.has(c)) return c;
  let n = 27;
  while (taken.has(`W${n}`)) n++;
  return `W${n}`;
}


export const DOOR_KINDS: ElementKind[] = ['base', 'sink', 'corner-blind', 'wall', 'tall'];

/** Effective hinge side. Tall units have stacked single doors, so only L/R; other door kinds follow `doors` when no hinge is set. */
export function hingeOf(e: Element): Hinge {
  if (e.kind === 'appliance-front') return 'down'; // dishwasher front opens downwards
  if (!DOOR_KINDS.includes(e.kind)) return 'none';
  if (e.kind === 'tall') return e.hinge === 'R' ? 'R' : 'L';
  if (e.hinge) return e.hinge;
  return e.doors === 2 ? 'LR' : e.doors === 1 ? (e.kind === 'corner-blind' ? 'R' : 'L') : 'none';
}

/** Element patch for a hinge choice; keeps `doors` in sync (L/R = 1 door, LR = 2, none = 0), except tall units. */
export const hingePatch = (e: Element, hinge: Hinge): Partial<Element> =>
  e.kind === 'tall' ? { hinge } : { hinge, doors: hinge === 'LR' ? 2 : hinge === 'none' ? 0 : 1 };

/**
 * Splits a wall at `along` (inner mm from its start; default the middle) into two straight parts. The new part gets the next
 * free id; windows, doors, installations, wall obstacles and units that start past the split move onto it.
 */
export function splitWall(p: Project, id: string, along?: Mm): Project {
  const room = syncWalls(p.room), g = wallGeoms(room)[id];
  if (!g) return p;
  const cut = Math.round(along ?? g.inner / 2);
  if (cut < 100 || cut > g.inner - 100) return p;
  const axis = g.offA + cut, at = { x: Math.round(g.ax + g.ux * axis), y: Math.round(g.ay + g.uy * axis) };
  const nid = nextWallId(room), i = room.walls.findIndex(w => w.id === id), w = room.walls[i];
  // A sloped wall keeps its ceiling line: the cut point gets the height there.
  const h = isSloped(room, w) ? wallHeightAt(room, g, cut) : undefined;
  const walls = [...room.walls.slice(0, i), { ...w, b: at, ...(h && { heightEnd: h }) }, { ...w, id: nid, a: at, ...(h && { heightStart: h }) }, ...room.walls.slice(i + 1)];
  // The first part keeps its start offset, the new part starts straight (no corner deduction): axis position − cut point.
  const move = <T extends { wallId?: string; offset?: Mm }>(x: T): T =>
    x.wallId === id && x.offset !== undefined && g.offA + x.offset >= axis ? { ...x, wallId: nid, offset: g.offA + x.offset - axis } : x;
  return {
    ...p,
    room: syncWalls({ ...room, walls, openings: room.openings.map(move), installations: room.installations.map(move), obstacles: (room.obstacles ?? []).map(move) }),
    elements: p.elements.map(move),
  };
}

/** Moves a corner: every wall end at `from` goes to `to` (walls stay joined). */
export function moveCorner(room: Room, from: Point, to: Point): Room {
  const t = { x: Math.round(to.x), y: Math.round(to.y) };
  return syncWalls({ ...room, walls: roomWalls(room).map(w => ({ ...w, a: same(w.a, from) ? t : w.a, b: same(w.b, from) ? t : w.b })) });
}

const prevWall = (walls: (Wall & { a: Point; b: Point })[], id: string) => { const w = walls.find(x => x.id === id); return w && walls.find(x => x.id !== id && same(x.b, w.a)); };
const heading = (w: { a: Point; b: Point }) => Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x);

/** Angle in the corner at the wall's start, between it and the wall before it (90 = square, 180 = straight); null without a joined wall. */
export function cornerAngle(room: Room, id: string): number | null {
  const walls = roomWalls(room), w = walls.find(x => x.id === id), prev = prevWall(walls, id);
  if (!w || !prev) return null;
  let turn = (heading(w) - heading(prev)) * 180 / Math.PI;
  turn = ((turn + 540) % 360) - 180;
  return Math.round((180 - Math.abs(turn)) * 10) / 10;
}

/**
 * Sets the corner angle at the wall's start (degrees, 30…180): the wall turns around its start keeping its length,
 * and the wall joined at its end moves along with it (as setWallLength), so the rest of the room keeps its shape.
 */
export function setCornerAngle(room: Room, id: string, deg: number): Room {
  const walls = roomWalls(room).map(w => ({ ...w, a: { ...w.a }, b: { ...w.b } }));
  const w = walls.find(x => x.id === id), prev = prevWall(walls, id);
  if (!w || !prev || !(deg >= 30 && deg <= 180)) return room;
  let turn = (heading(w) - heading(prev)) * 180 / Math.PI;
  turn = ((turn + 540) % 360) - 180;
  const sign = turn < 0 ? -1 : 1, h = heading(prev) + sign * (180 - deg) * Math.PI / 180;
  const L = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y), oldB = { ...w.b };
  const nb = { x: Math.round(w.a.x + Math.cos(h) * L), y: Math.round(w.a.y + Math.sin(h) * L) };
  const dx = nb.x - oldB.x, dy = nb.y - oldB.y;
  const next = walls.find(x => x.id !== id && same(x.a, oldB));
  w.b = nb;
  if (next && next.id !== prev.id) {
    const oldNb = { ...next.b };
    next.a = { x: next.a.x + dx, y: next.a.y + dy };
    next.b = { x: next.b.x + dx, y: next.b.y + dy };
    const after = walls.find(x => x.id !== next.id && x.id !== id && same(x.a, oldNb));
    if (after) after.a = { x: after.a.x + dx, y: after.a.y + dy };
  }
  return syncWalls({ ...room, walls });
}
