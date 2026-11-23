// Merging two versions of a kitchen edited at the same time (shared session: customer + workshop, user 2026-11-23).

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const withIds = (v: unknown): v is (Obj & { id: string })[] => Array.isArray(v) && v.every(x => isObj(x) && typeof x.id === 'string');

/**
 * Three-way merge for a project edited in two places at once (shared session: customer + workshop).
 * `base` = the version both started from, `mine` = this side's, `theirs` = the server's. Objects merge key by key, lists of
 * items with an `id` (elements, walls, openings…) item by item (adds and removes from both sides kept); anything else
 * changed on both sides takes `mine` (the side saving now).
 */
export function merge3<T>(base: T, mine: T, theirs: T): T {
  if (same(mine, base)) return theirs;
  if (same(theirs, base) || same(mine, theirs)) return mine;
  if (isObj(mine) && isObj(theirs)) {
    const b: Obj = isObj(base) ? base : {};
    const out: Obj = {};
    for (const k of new Set([...Object.keys(theirs), ...Object.keys(mine)])) {
      const v = merge3(b[k], mine[k], theirs[k]);
      if (v !== undefined) out[k] = v;
    }
    return out as T;
  }
  if (withIds(mine) && withIds(theirs) && (base === undefined || withIds(base))) {
    const B = new Map((withIds(base) ? base : []).map(x => [x.id, x])), M = new Map(mine.map(x => [x.id, x])), T = new Map(theirs.map(x => [x.id, x]));
    const out: unknown[] = [];
    for (const t of theirs) {
      if (M.has(t.id)) out.push(merge3(B.get(t.id), M.get(t.id), t));
      else if (!B.has(t.id)) out.push(t); // they added it (a missing one here that was in base = removed here)
    }
    for (const m of mine) if (!T.has(m.id) && !B.has(m.id)) out.push(m); // added here (removed there = stays removed)
    return out as T;
  }
  return mine;
}
