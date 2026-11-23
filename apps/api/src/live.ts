// Shared session log (user 2026-11-23, design SesijaKupac / SesijaStolar): every save of a shared kitchen writes what
// changed into the request's thread as 'edit' entries, so both sides see "Petar pomerio D2" next to the messages and can
// undo their own. One entry per unit; edits of the same unit by the same person within 2 minutes are merged into one.
import { isDeepStrictEqual } from 'node:util';
import type mongoose from 'mongoose';
import { MessageModel, RequestModel, type UserDoc } from './models';

type El = { id: string } & Record<string, unknown>;
export type Edit = { id: string; before: El | null; after: El | null } | { id: 'room' };
const MERGE_MS = 2 * 60_000;

/** What changed between two versions of a kitchen: units added, removed or changed, and the room as one entry. */
export function edits(before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined): Edit[] {
  const els = (d?: Record<string, unknown>) => new Map((Array.isArray(d?.elements) ? d.elements as El[] : []).filter(e => e && typeof e.id === 'string').map(e => [e.id, e]));
  const a = els(before), b = els(after), out: Edit[] = [];
  for (const [id, e] of b) if (!isDeepStrictEqual(a.get(id), e)) out.push({ id, before: a.get(id) ?? null, after: e });
  for (const [id, e] of a) if (!b.has(id)) out.push({ id, before: e, after: null });
  if (!isDeepStrictEqual(before?.room, after?.room)) out.push({ id: 'room' });
  return out;
}

/** Writes the edits of one save into every taken request sharing this kitchen. */
export async function logEdits(projectId: mongoose.Types.ObjectId, side: 'shop' | 'cust', user: UserDoc, list: Edit[]) {
  if (!list.length) return;
  const requests = await RequestModel.distinct('_id', { workshopProjectId: projectId, status: 'taken' }) as mongoose.Types.ObjectId[];
  for (const requestId of requests) for (const e of list) {
    const last = await MessageModel.findOne({ requestId, kind: 'edit' }).where('edit.id').equals(e.id).sort({ createdAt: -1 });
    if (last && String(last.authorUserId) === String(user._id) && Date.now() - last.get('createdAt').getTime() < MERGE_MS) {
      const merged = 'after' in e ? { ...e, before: last.edit.before } : e;
      if ('after' in merged && isDeepStrictEqual(merged.before, merged.after)) await last.deleteOne(); // changed back
      else { last.edit = merged; last.markModified('edit'); await last.save(); }
    } else await MessageModel.create({ requestId, side, authorUserId: user._id, kind: 'edit', edit: e });
  }
}
