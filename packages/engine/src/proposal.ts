// AI proposals (docs/AI.md): the AI never edits a project — it proposes items the joiner accepts, edits or skips.
// Room measures from a photo are estimates: one measured length rescales all of them (rounded to 10 mm).
import { quickStartRoom } from './autoLayout';
import type { Installation, Mm, Opening, Project } from './types';

export type Confidence = 'high' | 'medium' | 'low';
export type ProposalPayload =
  | { op: 'setWall'; wallId: 'A' | 'B'; length: Mm; angle?: number }
  | { op: 'addOpening'; opening: Omit<Opening, 'id'> }
  | { op: 'addInstallation'; installation: Omit<Installation, 'id'> };
// edited: the joiner typed the measures ("Izmeni"), so they are final and not rescaled.
export type ProposalItem = ProposalPayload & { id: string; confidence: Confidence; note?: string; accepted: boolean; edited?: boolean };
export interface Proposal {
  id: string; task: 'detect-room'; status: 'pending' | 'applied' | 'discarded';
  referenceMeasurement?: { wallId: 'A' | 'B'; length: Mm };
  items: ProposalItem[];
}
export interface HistoryEntry { kind: 'ai-proposal'; proposalId: string; task: Proposal['task']; applied: string[] }

const r10 = (v: number) => Math.round(v / 10) * 10;

/** Scale factor from the measured wall over its estimate (1 without a measurement). */
export function proposalScale(p: Proposal): number {
  const ref = p.referenceMeasurement;
  const est = ref && p.items.find(i => i.op === 'setWall' && i.wallId === ref.wallId);
  return ref && est && est.op === 'setWall' && est.length ? ref.length / est.length : 1;
}

/** Item with its measures rescaled to the reference measurement. */
export function scaledItem(p: Proposal, item: ProposalItem): ProposalItem {
  if (item.edited) return item;
  const k = proposalScale(p), s = (v: Mm) => r10(v * k);
  switch (item.op) {
    case 'setWall': return { ...item, length: p.referenceMeasurement?.wallId === item.wallId ? p.referenceMeasurement.length : s(item.length) };
    case 'addOpening': { const o = item.opening; return { ...item, opening: { ...o, offset: s(o.offset), width: s(o.width), height: s(o.height), sill: s(o.sill) } }; }
    case 'addInstallation': { const i = item.installation; return { ...item, installation: { ...i, offset: s(i.offset), height: s(i.height) } }; }
  }
}

/**
 * Applies the accepted items: an L room (walls A, B) with the accepted openings and installations; elements are kept.
 * Offsets on wall B are given from the corner with A, like Brzi start, and flipped to the wall direction.
 */
export function applyProposal(project: Project, p: Proposal, acceptedIds: string[]): { project: Project; history: HistoryEntry } {
  if (!p.referenceMeasurement) throw new Error('Jedna mera metrom je obavezna pre prenosa.');
  const items = p.items.filter(i => acceptedIds.includes(i.id)).map(i => scaledItem(p, i));
  const wall = (id: 'A' | 'B') => items.find((i): i is Extract<ProposalItem, { op: 'setWall' }> => i.op === 'setWall' && i.wallId === id)?.length;
  const a = wall('A'), b = wall('B');
  if (!a) throw new Error('Zid A nije prihvaćen.');
  const room = quickStartRoom({ shape: b ? 'L' : 'I', a, b, dishwasher: false, fridge: false, wallUnits: false });
  const bLen = room.walls.find(w => w.id === 'B')?.length ?? 0;
  const flip = <T extends { wallId: string; offset: Mm; width?: Mm }>(x: T): T => (x.wallId === 'B' ? { ...x, offset: bLen - x.offset - (x.width ?? 0) } : x);
  const n: Record<string, number> = {};
  const id = (prefix: string) => `${prefix}${(n[prefix] = (n[prefix] ?? 0) + 1)}`;
  const LETTER: Record<Installation['kind'], string> = { water: 'V', drain: 'O', power: 'S', power400: 'T', gas: 'G' };
  room.openings = items.flatMap(i => (i.op === 'addOpening' ? [{ ...flip(i.opening), id: id(i.opening.kind === 'window' ? 'W' : 'Vr'), side: 1 as const }] : []));
  room.installations = items.flatMap(i => (i.op === 'addInstallation' ? [{ ...flip(i.installation), id: id(LETTER[i.installation.kind]), side: 1 as const }] : []));
  return {
    project: { ...project, room: { ...room, height: project.room.height || room.height } },
    history: { kind: 'ai-proposal', proposalId: p.id, task: p.task, applied: items.map(i => i.id) },
  };
}

/** The design's example (design/screens/AIPredlog.html): what "Prepoznaj zidove i instalacije" returns for the demo photo. */
export const EXAMPLE_PROPOSAL: Proposal = {
  id: 'demo', task: 'detect-room', status: 'pending', referenceMeasurement: { wallId: 'A', length: 3200 },
  items: [
    { id: 'w1', op: 'setWall', wallId: 'A', length: 3200, confidence: 'high', accepted: true },
    { id: 'w2', op: 'setWall', wallId: 'B', length: 2400, angle: 90, confidence: 'medium', accepted: true },
    { id: 'win', op: 'addOpening', opening: { wallId: 'A', kind: 'window', offset: 1100, width: 1000, height: 1200, sill: 1000 }, confidence: 'medium', accepted: true },
    { id: 'v', op: 'addInstallation', installation: { wallId: 'A', kind: 'water', offset: 1500, height: 500 }, confidence: 'high', accepted: true },
    { id: 'o', op: 'addInstallation', installation: { wallId: 'A', kind: 'drain', offset: 1650, height: 450, diameter: 50 }, confidence: 'high', accepted: true },
    { id: 's1', op: 'addInstallation', installation: { wallId: 'A', kind: 'power', offset: 2700, height: 1100 }, confidence: 'medium', accepted: false },
    { id: 's2', op: 'addInstallation', installation: { wallId: 'B', kind: 'power', offset: 900, height: 600 }, confidence: 'low', accepted: false },
  ],
};
