// Project flow (docs/TOK_PROJEKTA.md): six steps with weights, each done / partial / todo from the project data and the
// user's marks; percent = Σ weight × part, rounded. Pure: the same project gives the same progress.
import { layoutIssues } from './edit';
import { roomWalls } from './geometry';
import type { Project } from './types';

export type StepKey = 'space' | 'drawings' | 'view3d' | 'elements' | 'cutlist' | 'offer';
export interface StepProgress { key: StepKey; name: string; weight: number; status: 'done' | 'partial' | 'todo'; part: number; checks: { text: string; ok: boolean }[] }
export interface ProjectProgress { percent: number; steps: StepProgress[]; next: string }

const same = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
const elementWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'element' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'elementa' : 'elemenata');

export function projectProgress(p: Project): ProjectProgress {
  const m = p.marks ?? {};
  const walls = roomWalls(p.room).filter(w => !w.island);
  // Closed: every wall end meets another wall's end.
  const closed = walls.length >= 3 && walls.every(w => [w.a, w.b].every(pt => walls.some(o => o.id !== w.id && (same(o.a, pt) || same(o.b, pt)))));
  const nInst = p.room.installations.length, warnings = layoutIssues(p).length;
  const confirmed = p.elements.filter(e => e.confirmedAt), waiting = p.elements.filter(e => !e.confirmedAt);
  const seen = m.drawingsSeen ?? [];

  const step = (key: StepKey, name: string, weight: number, checks: { text: string; ok: boolean }[], part?: number): StepProgress => {
    const ok = checks.filter(c => c.ok).length;
    const pt = part ?? ok / checks.length;
    return { key, name, weight, checks, part: pt, status: pt >= 1 ? 'done' : pt > 0 ? 'partial' : 'todo' };
  };
  const steps = [
    step('space', 'Prostor', 25, [
      { text: closed ? `Zidovi zatvoreni (${walls.length})` : 'Zidovi zatvoreni', ok: closed },
      { text: p.elements.length ? `Elementi postavljeni (${p.elements.length})` : 'Elementi postavljeni', ok: p.elements.length > 0 },
      { text: nInst ? `Instalacije unete (${nInst})` : m.noInstallations ? 'Bez instalacija' : 'Instalacije unete', ok: nInst > 0 || !!m.noInstallations },
      { text: warnings ? `Upozorenja u Proveri: ${warnings}` : 'Bez upozorenja', ok: walls.length > 0 && warnings === 0 },
    ]),
    step('drawings', 'Nacrti', 10, [
      { text: 'Pregledani spreda i odozgo', ok: seen.includes('front') && seen.includes('top') },
      { text: 'Strane otvaranja proverene', ok: !!m.drawingsReviewed },
    ]),
    step('view3d', '3D', 10, [
      { text: 'Fronte i radna ploča izabrane', ok: !!p.look?.worktop },
      { text: 'Ručke izabrane', ok: !!p.opening },
    ]),
    step('elements', 'Elementi', 20, waiting.length && confirmed.length
      ? [{ text: `Potvrđeno ${confirmed.length} od ${p.elements.length} ${elementWord(p.elements.length)}`, ok: true }, { text: `Čekaju potvrdu: ${waiting.map(e => e.label).sort((a, b) => a.localeCompare(b, 'sr', { numeric: true })).join(', ')}`, ok: false }]
      : [{ text: p.elements.length && !waiting.length ? `Potvrđeni svi elementi (${p.elements.length})` : 'Konstrukcija elemenata potvrđena', ok: p.elements.length > 0 && !waiting.length }],
    p.elements.length ? confirmed.length / p.elements.length : 0),
    step('cutlist', 'Krojna lista', 20, [{ text: 'Krojna lista proverena', ok: !!m.cutListChecked }, { text: 'Poslata pilani', ok: !!m.cutListSent }]),
    step('offer', 'Ponuda', 15, [{ text: 'Cene obračunate', ok: !!m.priced }, { text: 'Ponuda poslata kupcu', ok: !!m.offerSent }]),
  ];
  const percent = Math.round(steps.reduce((s, x) => s + x.weight * x.part, 0));
  // Next: the first unfinished step, in the words of its first open check.
  const first = steps.find(s => s.status !== 'done');
  const NEXT: Record<StepKey, string> = {
    space: !closed ? 'zatvori zidove' : !p.elements.length ? 'postavi elemente' : !(nInst || m.noInstallations) ? 'unesi instalacije' : 'reši upozorenja u Proveri',
    drawings: 'pregledaj nacrte', view3d: !p.look?.worktop ? 'izaberi fronte i radnu ploču' : 'izaberi ručke',
    elements: `potvrdi ${waiting.length} ${elementWord(waiting.length)}`,
    cutlist: !m.cutListChecked ? 'proveri krojnu listu' : 'pošalji krojnu listu pilani',
    offer: !m.priced ? 'obračunaj cenu' : 'pošalji ponudu kupcu',
  };
  return { percent, steps, next: first ? NEXT[first.key] : m.offerAccepted ? 'projekat je završen' : 'sačekaj odgovor kupca' };
}

/**
 * After an edit: an element whose construction changed loses its confirmation; a change of the construction rules or materials
 * unconfirms all. When parts can have changed, the cut list and offer marks are cleared too (what was checked / sent is stale).
 */
export function keepConfirmations(prev: Project, next: Project): Project {
  const strip = ({ confirmedAt: _c, ...e }: Project['elements'][number]) => JSON.stringify(e);
  const before = new Map(prev.elements.map(e => [e.id, strip(e)]));
  const all = JSON.stringify(prev.rules) !== JSON.stringify(next.rules) || JSON.stringify(prev.materials) !== JSON.stringify(next.materials);
  let changed = all || prev.elements.length !== next.elements.length;
  const elements = next.elements.map(e => {
    const same = before.get(e.id) === strip(e);
    if (!same) changed = true;
    if (!e.confirmedAt || (same && !all)) return e;
    const { confirmedAt: _c, ...rest } = e;
    return rest;
  });
  if (!changed) return next;
  const { cutListChecked: _a, cutListSent: _b, priced: _p, offerSent: _o, ...marks } = next.marks ?? {};
  return { ...next, elements, ...(next.marks ? { marks } : {}) };
}
