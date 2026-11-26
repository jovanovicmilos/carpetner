// Parts from leftover boards (Element.overrides, user 2026-11-26): fewer pieces cut, the rest from stock, with a note.
import { describe, expect, it } from 'vitest';
import { generateParts, hardware, sheetEstimate, type Project } from '../src';
import { project } from './fixtureProject';

const withOverride = (o: object): Project => ({ ...project, elements: project.elements.map(e => (e.id === 'D4' ? { ...e, overrides: [o as never] } : e)) });
const line = (p: Project, pos: string, stock = false) => generateParts(p, true, stock).find(x => x.pos === pos);

describe('parts from stock', () => {
  it('one of the two sides from stock: 1 cut, 1 stock, note', () => {
    const p = withOverride({ pos: '1', name: 'Stranica', qty: 1, note: 'iz ostatka' });
    expect(line(p, 'D4-1')).toMatchObject({ name: 'Stranica', qty: 1, stock: 1, note: 'iz ostatka' });
  });
  it('a whole line from stock leaves the saw list, stays in the unit view; hardware unchanged; less board', () => {
    const p = withOverride({ pos: 'D4-5', name: 'Fronta fioke', qty: 0, note: 'tehnički otpad' });
    expect(line(p, 'D4-5')).toBeUndefined();
    expect(line(p, 'D4-5', true)).toMatchObject({ qty: 0, stock: 1, note: 'tehnički otpad' });
    expect(hardware(p)).toEqual(hardware(project));
    const area = (q: Project) => sheetEstimate(generateParts(q), q.materials, q.rules).reduce((s, a) => s + a.areaM2, 0);
    expect(area(p)).toBeLessThan(area(project));
  });
  it('ignored when the line at that number is another part now', () => {
    const p = withOverride({ pos: '5', name: 'Pod', qty: 0 });
    expect(line(p, 'D4-5')?.qty).toBe(1);
  });
});
