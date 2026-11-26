// Part lines changed by hand (Element.overrides, user 2026-11-26): another count, deleted, with a note.
import { describe, expect, it } from 'vitest';
import { generateParts, hardware, sheetEstimate, type Project } from '../src';
import { project } from './fixtureProject';

const withOverride = (o: object): Project => ({ ...project, elements: project.elements.map(e => (e.id === 'D4' ? { ...e, overrides: [o as never] } : e)) });
const line = (p: Project, pos: string, all = false) => generateParts(p, true, all).find(x => x.pos === pos);
const area = (q: Project) => sheetEstimate(generateParts(q), q.materials, q.rules).reduce((s, a) => s + a.areaM2, 0);

describe('part lines changed by hand', () => {
  it('fewer pieces: qty 1 of 2, planned 2, note', () => {
    const p = withOverride({ pos: '1', name: 'Stranica', qty: 1, note: 'jedna već postoji' });
    expect(line(p, 'D4-1')).toMatchObject({ name: 'Stranica', qty: 1, planned: 2, note: 'jedna već postoji' });
  });
  it('more pieces than the rules give', () => {
    expect(line(withOverride({ pos: '2', name: 'Pod', qty: 3 }), 'D4-2')).toMatchObject({ qty: 3, planned: 1 });
  });
  it('a deleted line leaves the saw list, stays in the unit view; hardware unchanged; less board', () => {
    const p = withOverride({ pos: 'D4-5', name: 'Fronta fioke', qty: 0 });
    expect(line(p, 'D4-5')).toBeUndefined();
    expect(line(p, 'D4-5', true)).toMatchObject({ qty: 0, planned: 1 });
    expect(hardware(p)).toEqual(hardware(project));
    expect(area(p)).toBeLessThan(area(project));
  });
  it('ignored when the line at that number is another part now', () => {
    expect(line(withOverride({ pos: '5', name: 'Pod', qty: 0 }), 'D4-5')?.qty).toBe(1);
  });
});
