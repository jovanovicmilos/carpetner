// docs/TOK_PROJEKTA.md: step status from the data + marks, percent = Σ weight × part.
import { describe, expect, it } from 'vitest';
import { projectProgress, type Project } from '../src';
import { project as fixture } from './fixtureProject';

const WAITING = ['D5', 'G3', 'G4', 'V1'];
// The design's example state (Element.png header): drawings reviewed, worktop picked, all but D5, G3, G4, V1 confirmed.
// The design counts 13 elements; the fixture has 12, so Elementi is 8/12 here, not 9/13.
const example: Project = {
  ...fixture, look: { worktop: 'Hrast' }, marks: { drawingsSeen: ['front', 'top'], drawingsReviewed: true },
  elements: fixture.elements.map(e => (WAITING.includes(e.id) ? e : { ...e, confirmedAt: '2026-11-19T10:00:00Z' })),
};

describe('project progress', () => {
  it('a fresh fixture: Prostor done, the rest open', () => {
    const p = projectProgress(fixture);
    expect(p.steps.map(s => [s.key, s.status])).toEqual([['space', 'done'], ['drawings', 'todo'], ['view3d', 'todo'], ['elements', 'todo'], ['cutlist', 'todo'], ['offer', 'todo']]);
    expect(p.steps[0].checks.map(c => c.text)).toEqual(['Zidovi zatvoreni (4)', 'Elementi postavljeni (12)', 'Instalacije unete (6)', 'Bez upozorenja']);
    expect([p.percent, p.next]).toEqual([25, 'pregledaj nacrte']);
  });

  it('the design example: 25 + 10 + 5 (handles not chosen) + 20 × 8/12 = 53 %', () => {
    const p = projectProgress(example);
    expect(p.steps.map(s => s.status)).toEqual(['done', 'done', 'partial', 'partial', 'todo', 'todo']);
    expect(p.steps[3].checks).toEqual([{ text: 'Potvrđeno 8 od 12 elemenata', ok: true }, { text: 'Čekaju potvrdu: D5, G3, G4, V1', ok: false }]);
    expect([p.percent, p.next]).toEqual([53, 'izaberi ručke']);
    expect(projectProgress({ ...example, opening: { kind: 'profile' } })).toMatchObject({ percent: 58, next: 'potvrdi 4 elementa' });
  });

  it('everything done = 100 %; a new unconfirmed element puts Elementi back to partial', () => {
    const done: Project = { ...example, opening: { kind: 'bar' }, elements: example.elements.map(e => ({ ...e, confirmedAt: 'x' })),
      marks: { ...example.marks, cutListChecked: true, cutListSent: true, priced: true, offerSent: true } };
    expect(projectProgress(done)).toMatchObject({ percent: 100, next: 'sačekaj odgovor kupca' });
    const added = { ...done, elements: [...done.elements, { ...done.elements[0], id: 'D9', label: 'D9', confirmedAt: undefined }] };
    expect(projectProgress(added).steps[3]).toMatchObject({ status: 'partial', part: 12 / 13 });
  });
});
