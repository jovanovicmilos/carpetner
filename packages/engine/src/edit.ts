// Helpers for editing a project by hand (2D plan editor). Warnings are UI strings (Serbian).
import { boxesOverlap, elementBox, isSloped, layerOf, layersMeet, obstacleBox, sideOf, wallGeoms, wallHeightAt } from './geometry';
import type { Element, Installation, Mm, Obstacle, Project } from './types';

/** Vertical range [bottom, top) of an element from the floor. */
export const verticalRange = (e: Element): [Mm, Mm] => {
  const bottom = e.kind === 'wall' ? e.elevation ?? 0 : 0;
  return [bottom, (e.kind === 'wall' ? bottom : e.legs ?? 0) + e.height];
};
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
  const c = ceilingOver(p, e), [bottom, top] = verticalRange(e);
  if (c === null || top <= c) return null;
  const height = c - bottom;
  return (e.kind === 'wall' || e.kind === 'tall') && height >= 200 ? { height } : null;
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
