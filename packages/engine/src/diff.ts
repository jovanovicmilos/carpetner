// Changes between two versions of a kitchen, per element (Saradnja: the workshop's working copy against the kitchen the
// customer sent). Elements are matched by id. Applying keeps the old version and takes the new state only of the accepted
// elements, so the customer can accept some proposals and decline others.
// shortcut: only elements are compared (room walls, openings, installations, materials and look are not proposals yet).
// groupChanges puts the units a change only pushed along the wall into that change, so they are accepted / declined together.
import type { Element, Mm, Project } from './types';

export interface ElementChange {
  /** Element id (also the change's id). */
  id: string;
  kind: 'added' | 'removed' | 'changed';
  before?: Element;
  after?: Element;
  /** Same wall, moved along it (mm, + = towards the wall's end). */
  moved?: Mm;
  /** Moved to another wall: [from, to]. */
  wall?: [string, string];
  width?: [Mm, Mm];
  /** Another unit type in the same place (kind or catalog item changed). */
  swapped?: boolean;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Changes from `before` to `after`, in the order of `after`'s elements, removed ones last. */
export function diffElements(before: Project, after: Project): ElementChange[] {
  const old = new Map(before.elements.map(e => [e.id, e]));
  const out: ElementChange[] = [];
  for (const a of after.elements) {
    const b = old.get(a.id);
    if (!b) { out.push({ id: a.id, kind: 'added', after: a }); continue; }
    if (same(a, b)) continue;
    const c: ElementChange = { id: a.id, kind: 'changed', before: b, after: a };
    if (a.wallId !== b.wallId) c.wall = [b.wallId, a.wallId];
    else if (a.offset !== b.offset) c.moved = a.offset - b.offset;
    if (a.width !== b.width) c.width = [b.width, a.width];
    if (a.kind !== b.kind || a.catalogKey !== b.catalogKey) c.swapped = true;
    out.push(c);
  }
  const now = new Set(after.elements.map(e => e.id));
  for (const b of before.elements) if (!now.has(b.id)) out.push({ id: b.id, kind: 'removed', before: b });
  return out;
}

/** `before` with the accepted changes of `after` applied (by element id); everything else stays as in `before`. */
export function applyChanges(before: Project, after: Project, acceptedIds: string[]): Project {
  const accept = new Set(acceptedIds);
  const next = new Map(after.elements.map(e => [e.id, e]));
  const elements = before.elements.flatMap(e => (!accept.has(e.id) ? [e] : next.has(e.id) ? [next.get(e.id)!] : []));
  for (const a of after.elements) if (accept.has(a.id) && !before.elements.some(e => e.id === a.id)) elements.push(a);
  return { ...before, elements };
}

/** A change and the units it only pushed along the wall (`ids` = every element id it carries, its own first). */
export interface ChangeGroup { change: ElementChange; ids: string[]; shifted: ElementChange[] }

const onlyMoved = (c: ElementChange) => {
  if (c.kind !== 'changed' || c.moved === undefined || c.width || c.wall || c.swapped) return false;
  const { offset: _a, ...b } = c.before!, { offset: _b, ...a } = c.after!;
  return same(a, b);
};
const wallOf = (c: ElementChange) => (c.after ?? c.before)!.wallId;
const upper = (c: ElementChange) => (c.after ?? c.before)!.kind === 'wall'; // wall units shift only wall units
const at = (c: ElementChange) => Math.min(c.before?.offset ?? Infinity, c.after?.offset ?? Infinity);

/**
 * Changes as decisions: a unit that only moved along its wall belongs to the nearest change before it on that wall that changes
 * the room it takes (added, removed, wider / narrower, swapped) — accepting one without the other would overlap units or leave
 * a gap. A move with no such change before it stays its own item (the workshop really moved it).
 */
export function groupChanges(changes: ElementChange[]): ChangeGroup[] {
  const causes = changes.filter(c => !onlyMoved(c) && !c.wall);
  const groups = new Map<string, ChangeGroup>(changes.filter(c => !onlyMoved(c)).map(c => [c.id, { change: c, ids: [c.id], shifted: [] }]));
  for (const m of changes.filter(onlyMoved)) {
    const cause = causes.filter(c => wallOf(c) === wallOf(m) && upper(c) === upper(m) && at(c) < at(m))
      .sort((x, y) => at(y) - at(x))[0];
    if (cause) { const g = groups.get(cause.id)!; g.ids.push(m.id); g.shifted.push(m); }
    else groups.set(m.id, { change: m, ids: [m.id], shifted: [] });
  }
  return changes.flatMap(c => groups.get(c.id) ?? []);
}
