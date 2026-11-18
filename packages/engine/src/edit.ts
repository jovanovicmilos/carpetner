// Helpers for editing a project by hand (2D plan editor). Warnings are UI strings (Serbian).
import { boxesOverlap, elementBox, layerOf, layersMeet, obstacleBox, sideOf, wallGeoms } from './geometry';
import type { Element, Mm, Obstacle, Project } from './types';

/** Vertical range [bottom, top) of an element from the floor. */
export const verticalRange = (e: Element): [Mm, Mm] => {
  const bottom = e.kind === 'wall' ? e.elevation ?? 0 : 0;
  return [bottom, (e.kind === 'wall' ? bottom : e.legs ?? 0) + e.height];
};
const obstacleRange = (o: Obstacle): [Mm, Mm] => [o.elevation ?? 0, (o.elevation ?? 0) + (o.height ?? Infinity)];
const overlaps = (a0: Mm, a1: Mm, b0: Mm, b1: Mm) => a0 < b1 && b0 < a1;
const OBSTACLE_NAME: Record<Obstacle['kind'], string> = { chimney: 'Dimnjak', column: 'Stub', duct: 'Kanal', radiator: 'Radijator', other: 'Prepreka' };

/** Checks from docs/EDITOR_2D.md "Provere". Warnings only, they never block editing. */
export function layoutWarnings(p: Project): string[] {
  const out: string[] = [];
  const geoms = wallGeoms(p.room);
  const els = p.elements;
  const label = (id: string) => els.find(e => e.id === id)?.label ?? id;
  const boxes = els.map(e => ({ e, box: elementBox(geoms, e), layer: layerOf(e) }));

  for (const { e } of boxes) {
    const g = geoms[e.wallId];
    if (!g) out.push(`${e.label} je na zidu ${e.wallId} koji ne postoji.`);
    else if (e.offset < 0 || e.offset + e.width > g.inner) out.push(`${e.label} izlazi van zida ${e.wallId}.`);
  }
  boxes.forEach((A, i) => boxes.slice(i + 1).forEach(B => {
    if (A.box && B.box && layersMeet(A.layer, B.layer) && boxesOverlap(A.box, B.box)) out.push(`${A.e.label} i ${B.e.label} se preklapaju.`);
  }));

  for (const o of p.room.obstacles ?? []) {
    const box = obstacleBox(geoms, o);
    const [o0, o1] = obstacleRange(o);
    if (!box) continue;
    for (const B of boxes) {
      if (!B.box || !boxesOverlap(box, B.box) || !overlaps(o0, o1, ...verticalRange(B.e))) continue;
      out.push(o.kind === 'radiator' ? `${B.e.label} je ispred radijatora.` : `${OBSTACLE_NAME[o.kind]} ${o.id} se preklapa sa ${B.e.label}.`);
    }
  }

  const along = (e: Element, x0: Mm, x1: Mm) => overlaps(e.offset, e.offset + e.width, x0, x1);
  for (const o of p.room.openings) {
    const onWall = els.filter(e => e.wallId === o.wallId);
    if (o.kind === 'door') onWall.filter(e => along(e, o.offset, o.offset + o.width)).forEach(e => out.push(`${e.label} zaklanja vrata.`));
    if (o.kind === 'window') onWall.filter(e => layerOf(e) !== 'low' && along(e, o.offset, o.offset + o.width)).forEach(e => out.push(`${e.label} ide preko prozora.`));
  }

  for (const i of p.room.installations) {
    if (i.kind !== 'water' && i.kind !== 'drain') continue;
    const name = i.kind === 'water' ? 'Voda' : 'Odvod';
    const side = sideOf(geoms, i);
    const cover = els.find(e => e.wallId === i.wallId && layerOf(e) === 'low' && sideOf(geoms, e) === side && i.offset >= e.offset && i.offset <= e.offset + e.width);
    if (!cover) out.push(`${name} (${i.offset} od početka zida ${i.wallId}) nema element ispred.`);
    else if (cover.kind !== 'sink') out.push(`${name} je iza ${label(cover.id)}, a ne iza sudopere.`);
  }
  return out;
}

/** First offset on the wall where `width` fits next to units of the same height zone and obstacles; 0 if none. */
export function firstFreeOffset(p: Project, wallId: string, width: Mm, range: [Mm, Mm]): Mm {
  const wall = p.room.walls.find(w => w.id === wallId);
  if (!wall) return 0;
  const taken = [
    ...p.elements.filter(e => e.wallId === wallId && overlaps(...verticalRange(e), ...range)).map(e => [e.offset, e.offset + e.width]),
    ...(p.room.obstacles ?? []).filter(o => o.wallId === wallId && overlaps(...obstacleRange(o), ...range)).map(o => [o.offset ?? 0, (o.offset ?? 0) + o.width]),
  ].sort((a, b) => a[0] - b[0]);
  let x = 0;
  for (const [t0, t1] of taken) {
    if (t0 - x >= width) return x;
    x = Math.max(x, t1);
  }
  return wall.length - x >= width ? x : 0;
}

/** Next free id with a prefix: D1, D2… */
export const nextId = (taken: string[], prefix: string) => {
  let n = 1;
  while (taken.includes(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
};
