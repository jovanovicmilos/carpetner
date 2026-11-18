// Helpers for editing a project by hand (2D plan editor). Warnings are UI strings (Serbian).
import type { Element, Mm, Obstacle, Project } from './types';

/** Vertical range [bottom, top) of an element from the floor. */
export const verticalRange = (e: Element): [Mm, Mm] => {
  const bottom = e.kind === 'wall' ? e.elevation ?? 0 : 0;
  return [bottom, (e.kind === 'wall' ? bottom : e.legs ?? 0) + e.height];
};
const obstacleRange = (o: Obstacle): [Mm, Mm] => [o.elevation ?? 0, (o.elevation ?? 0) + (o.height ?? Infinity)];
const overlaps = (a0: Mm, a1: Mm, b0: Mm, b1: Mm) => a0 < b1 && b0 < a1;
const OBSTACLE_NAME = { chimney: 'dimnjak', column: 'stub', other: 'prepreka' };

/** Overlaps and units sticking out of their wall. Never blocks editing. */
export function layoutWarnings(p: Project): string[] {
  const out: string[] = [];
  const lengths = Object.fromEntries(p.room.walls.map(w => [w.id, w.length]));
  const els = p.elements;
  els.forEach((e, i) => {
    if (!(e.wallId in lengths)) out.push(`${e.label} je na zidu ${e.wallId} koji ne postoji.`);
    else if (e.offset < 0 || e.offset + e.width > lengths[e.wallId]) out.push(`${e.label} izlazi van zida ${e.wallId}.`);
    const [b0, b1] = verticalRange(e);
    for (const o of els.slice(i + 1)) {
      const [c0, c1] = verticalRange(o);
      if (o.wallId === e.wallId && overlaps(e.offset, e.offset + e.width, o.offset, o.offset + o.width) && overlaps(b0, b1, c0, c1))
        out.push(`${e.label} se preklapa sa ${o.label}.`);
    }
    for (const o of p.room.obstacles ?? []) {
      const [c0, c1] = obstacleRange(o);
      if (o.wallId === e.wallId && overlaps(e.offset, e.offset + e.width, o.offset, o.offset + o.width) && overlaps(b0, b1, c0, c1))
        out.push(`${e.label} se preklapa sa: ${OBSTACLE_NAME[o.kind]} ${o.id}.`);
    }
  });
  return out;
}

/** First offset on the wall where `width` fits next to units of the same height zone and obstacles; 0 if none. */
export function firstFreeOffset(p: Project, wallId: string, width: Mm, range: [Mm, Mm]): Mm {
  const wall = p.room.walls.find(w => w.id === wallId);
  if (!wall) return 0;
  const taken = [
    ...p.elements.filter(e => e.wallId === wallId && overlaps(...verticalRange(e), ...range)).map(e => [e.offset, e.offset + e.width]),
    ...(p.room.obstacles ?? []).filter(o => o.wallId === wallId && overlaps(...obstacleRange(o), ...range)).map(o => [o.offset, o.offset + o.width]),
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
