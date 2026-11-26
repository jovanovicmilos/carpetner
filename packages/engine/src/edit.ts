// Helpers for editing a project by hand (2D plan editor). Warnings are UI strings (Serbian).
import { frontLayout } from './fronts';
import { PRESETS } from './presets';
import { blindFor, boxesOverlap, elementBox, faceBox, isSloped, layerOf, layersMeet, obstacleBox, sideOf, wallGeoms, wallHeightAt, wallPoint, type Box, type WallGeom } from './geometry';
import type { Element, Installation, Mm, Obstacle, Project } from './types';

/** Vertical range [bottom, top) of an element from the floor. */
export const verticalRange = (e: Element): [Mm, Mm] => {
  const bottom = e.kind === 'wall' ? e.elevation ?? 0 : 0;
  return [bottom, (e.kind === 'wall' ? bottom : e.legs ?? 0) + e.height];
};
/**
 * Hood over a hob (user 2026-11-26): makers ask for about 650 mm from an electric / induction hob to the bottom of the hood (gas
 * about 750; the hood's manual decides). The hood sits at the bottom of its wall unit (niche row `hood`).
 */
export const HOOD_CLEARANCE = 650;
export const hasHood = (e: Element) => e.kind === 'wall' && !!e.front?.some(r => r.type === 'hood');
/** A unit with a hood: same top line as the other wall units, bottom raised so the hood clears the hob (worktop top + 650). */
export function hoodFit(e: Element, worktopTop: Mm): Element {
  if (!hasHood(e)) return e;
  const top = (e.elevation ?? 0) + e.height, elevation = Math.max(e.elevation ?? 0, worktopTop + HOOD_CLEARANCE);
  return { ...e, elevation, height: top - elevation };
}
const obstacleRange = (o: Obstacle): [Mm, Mm] => [o.elevation ?? 0, (o.elevation ?? 0) + (o.height ?? Infinity)];
const overlaps = (a0: Mm, a1: Mm, b0: Mm, b1: Mm) => a0 < b1 && b0 < a1;
const OBSTACLE_NAME: Record<Obstacle['kind'], string> = { chimney: 'Dimnjak', column: 'Stub', duct: 'Kanal', radiator: 'Radijator', other: 'Prepreka' };

/** Checks from docs/EDITOR_2D.md "Provere". Warnings only, they never block editing. */
export interface LayoutIssue { text: string; ids: string[] }

export const layoutWarnings = (p: Project): string[] => layoutIssues(p).map(i => i.text);

/** Same checks with the ids of the units/items involved (for highlighting in the plan). */
/** Element in front of an installation: same wall and side, covers its offset and height. */
export function installationHost(p: Project, i: Installation): Element | undefined {
  const geoms = wallGeoms(p.room), side = sideOf(geoms, i);
  return p.elements.find(e => e.wallId === i.wallId && sideOf(geoms, e) === side && i.offset >= e.offset && i.offset <= e.offset + e.width
    && i.height >= verticalRange(e)[0] && i.height <= verticalRange(e)[1]);
}

/**
 * Wall view only (design/screens/Zid.html; the plan's Provera in Main.html does not show it):
 * an outlet behind the dishwasher front sits in the machine zone.
 */
export function outletIssues(p: Project): LayoutIssue[] {
  return p.room.installations.flatMap(i => {
    const host = i.kind === 'power' ? installationHost(p, i) : undefined;
    if (host?.kind !== 'appliance-front') return [];
    const low = p.elements.filter(e => e.wallId === host.wallId && layerOf(e) === 'low' && e.kind !== 'filler' && e.kind !== 'appliance-front');
    const next = low.find(e => e.offset === host.offset + host.width) ?? low.find(e => e.offset + e.width === host.offset);
    return [{ text: `Utičnica za MSP (h ${i.height}) je u zoni mašine — preporuka: pomeriti u susedni ${next?.label ?? 'element'} ili ostaviti iza poleđine sa izrezom.`, ids: [host.id, i.id] }];
  });
}

export function layoutIssues(p: Project): LayoutIssue[] {
  const out: LayoutIssue[] = [];
  const add = (text: string, ...ids: string[]) => out.push({ text, ids });
  const geoms = wallGeoms(p.room);
  const els = p.elements;
  const label = (id: string) => els.find(e => e.id === id)?.label ?? id;
  const boxes = els.map(e => ({ e, box: elementBox(geoms, e), layer: layerOf(e) }));

  for (const { e } of boxes) {
    const g = geoms[e.wallId];
    if (!g) add(`${e.label} je na zidu ${e.wallId} koji ne postoji.`, e.id);
    else if (e.offset < 0 || e.offset + e.width > g.inner) add(`${e.label} izlazi van zida ${e.wallId}.`, e.id);
    const c = ceilingOver(p, e), top = verticalRange(e)[1];
    if (g && c !== null && top > c)
      add(`${e.label} ne staje ${isSloped(p.room, g.wall) ? 'ispod kosine' : 'ispod plafona'} (zid ${e.wallId}): vrh ${top}, plafon ${c} — fali ${top - c} mm.`, e.id);
  }
  boxes.forEach((A, i) => boxes.slice(i + 1).forEach(B => {
    if (A.box && B.box && layersMeet(A.layer, B.layer) && boxesOverlap(A.box, B.box)) add(`${A.e.label} i ${B.e.label} se preklapaju.`, A.e.id, B.e.id);
  }));

  // Hood too close to the hob under it (user 2026-11-26): base units with a hob on the same wall, overlapping along the wall.
  const wtT = PRESETS[p.presetId === 'none' ? 'workshop' : p.presetId].worktopThickness;
  for (const h of els.filter(hasHood)) {
    for (const b of els.filter(b => b.wallId === h.wallId && (b.kind === 'oven' || b.hob) && b.offset < h.offset + h.width && h.offset < b.offset + b.width)) {
      const gap = (h.elevation ?? 0) - (verticalRange(b)[1] + wtT);
      if (gap < HOOD_CLEARANCE) add(`${h.label}: aspirator je ${gap} mm iznad ploče za kuvanje (${b.label}) — treba najmanje ${HOOD_CLEARANCE} (plinska oko 750, vidi uputstvo aspiratora).`, h.id, b.id);
    }
  }

  // Inside corners (user 2026-11-25): a door / drawer front must clear the front of the unit standing in front of it on the other
  // wall — zone = the front's span, from the carcass front out by front thickness + 30 (handle); the other unit = carcass + its front.
  const ft = (e: Element) => p.materials[e.materials.front]?.thickness ?? 18;
  const band = (g: WallGeom, along: Mm, width: Mm, d0: Mm, d1: Mm, side: 1 | -1): Box => {
    const pts = [along, along + width].flatMap(t => [g.th / 2 + d0, g.th / 2 + d1].map(o => wallPoint(g, t, o, side)));
    return { x0: Math.min(...pts.map(q => q.x)), x1: Math.max(...pts.map(q => q.x)), y0: Math.min(...pts.map(q => q.y)), y1: Math.max(...pts.map(q => q.y)) };
  };
  for (const X of boxes) {
    const g = geoms[X.e.wallId];
    if (!g || !X.box) continue;
    const top = verticalRange(X.e)[1];
    const hit = new Set<string>();
    for (const f of frontLayout(X.e, p.rules).fronts) {
      if (f.label && f.label !== 'frižider' && f.label !== 'MSP') continue; // masks, niches, open rows do not open
      const zone = band(g, X.e.offset + f.x, f.w, X.e.depth, X.e.depth + ft(X.e) + 30, sideOf(geoms, X.e));
      for (const Y of boxes) {
        const gy = geoms[Y.e.wallId];
        if (Y === X || hit.has(Y.e.id) || Y.e.wallId === X.e.wallId || !gy || !Y.box || !layersMeet(X.layer, Y.layer) || boxesOverlap(X.box, Y.box)) continue;
        if (!overlaps(top - f.y - f.h, top - f.y, ...verticalRange(Y.e))) continue;
        if (!boxesOverlap(zone, faceBox(gy, Y.e.offset, Y.e.width, Y.e.depth + ft(Y.e), sideOf(geoms, Y.e)))) continue;
        hit.add(Y.e.id);
        const need = blindFor(Y.e.depth, ft(Y.e));
        add(`${X.e.label}: ${f.hinge ? 'krilo' : 'fronta'} udara u ${Y.e.label} u uglu${X.e.kind === 'corner-blind' || X.e.blindWidth
          ? ` — slepi deo treba najmanje ${need} mm (sada ${X.e.blindWidth ?? 0})` : ` — pomeri ${X.e.label} bar ${need} mm od ugla ili stavi ugaoni element`}.`, X.e.id, Y.e.id);
      }
    }
  }

  for (const o of p.room.obstacles ?? []) {
    const box = obstacleBox(geoms, o);
    const [o0, o1] = obstacleRange(o);
    if (!box) continue;
    for (const B of boxes) {
      if (!B.box || !boxesOverlap(box, B.box) || !overlaps(o0, o1, ...verticalRange(B.e))) continue;
      add(o.kind === 'radiator' ? `${B.e.label} je ispred radijatora.` : `${OBSTACLE_NAME[o.kind]} ${o.id} se preklapa sa ${B.e.label}.`, B.e.id, o.id);
    }
  }

  const along = (e: Element, x0: Mm, x1: Mm) => overlaps(e.offset, e.offset + e.width, x0, x1);
  for (const o of p.room.openings) {
    const onWall = els.filter(e => e.wallId === o.wallId);
    if (o.kind === 'door') onWall.filter(e => along(e, o.offset, o.offset + o.width)).forEach(e => add(`${e.label} zaklanja vrata.`, e.id, o.id));
    if (o.kind === 'window') onWall.filter(e => layerOf(e) !== 'low' && along(e, o.offset, o.offset + o.width)).forEach(e => add(`${e.label} ide preko prozora.`, e.id, o.id));
  }

  for (const i of p.room.installations) {
    if (i.kind !== 'water' && i.kind !== 'drain') continue;
    const name = i.kind === 'water' ? 'Voda' : 'Odvod';
    const side = sideOf(geoms, i);
    const cover = els.find(e => e.wallId === i.wallId && layerOf(e) === 'low' && sideOf(geoms, e) === side && i.offset >= e.offset && i.offset <= e.offset + e.width);
    if (!cover) add(`${name} (${i.offset} od početka zida ${i.wallId}) nema element ispred.`, i.id);
    else if (cover.kind !== 'sink') add(`${name} je iza ${label(cover.id)}, a ne iza sudopere.`, cover.id, i.id);
  }
  return out;
}

/** Lowest ceiling over the element (the ceiling line is straight, so one of its two ends); null when the wall is missing. */
export function ceilingOver(p: Project, e: Element): Mm | null {
  const g = wallGeoms(p.room)[e.wallId];
  return g ? Math.min(wallHeightAt(p.room, g, e.offset), wallHeightAt(p.room, g, e.offset + e.width)) : null;
}

/**
 * Change that makes a wall or tall unit fit under the ceiling / slope: a lower carcass, same bottom. Null when it already fits, cannot be lowered (base units) or would get under 200 mm.
 * shortcut: rectangular units only; a unit with a slanted top (one side shorter) is not built yet.
 */
export function fitUnderCeiling(p: Project, e: Element): Partial<Element> | null {
  const c = ceilingOver(p, e), top = verticalRange(e)[1];
  if (c === null || top <= c) return null;
  const height = c - (top - e.height); // carcass bottom: elevation (wall) or legs (tall)
  return (e.kind === 'wall' || e.kind === 'tall') && height >= 200 ? { height } : null;
}

/** Carcass height that takes a wall or tall unit up to the ceiling / slope over it, same bottom (user 2026-11-22: "do plafona").
 *  Null for other kinds, when the unit already reaches it, or when it would be under 200 mm. */
export function heightToCeiling(p: Project, e: Element): Mm | null {
  const c = ceilingOver(p, e), top = verticalRange(e)[1];
  if (c === null || (e.kind !== 'wall' && e.kind !== 'tall')) return null;
  const height = c - (top - e.height);
  return height >= 200 && height !== e.height ? height : null;
}

/** First offset on the wall where `width` fits next to units of the same height zone and obstacles (catalog quick-add, docs/KATALOG.md); null if none. */
export function firstFreeOffset(p: Project, wallId: string, width: Mm, range: [Mm, Mm]): Mm | null {
  const wall = p.room.walls.find(w => w.id === wallId);
  if (!wall) return null;
  const taken = [
    ...p.elements.filter(e => e.wallId === wallId && overlaps(...verticalRange(e), ...range)).map(e => [e.offset, e.offset + e.width]),
    ...(p.room.obstacles ?? []).filter(o => o.wallId === wallId && overlaps(...obstacleRange(o), ...range)).map(o => [o.offset ?? 0, (o.offset ?? 0) + o.width]),
  ].sort((a, b) => a[0] - b[0]);
  let x = 0;
  for (const [t0, t1] of taken) {
    if (t0 - x >= width) return x;
    x = Math.max(x, t1);
  }
  return wall.length - x >= width ? x : null;
}

/** Next free id with a prefix: D1, D2… */
export const nextId = (taken: string[], prefix: string) => {
  let n = 1;
  while (taken.includes(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
};
