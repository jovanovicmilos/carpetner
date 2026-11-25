// Classic units → front rows (Konfigurator edit of any unit, user 2026-11-25): the same parts / fronts as before the conversion.
import { describe, expect, it } from 'vitest';
import { asRows, frontLayout, generateParts, type Project } from '../src';
import { project } from './fixtureProject';

const lines = (p: Project) => generateParts(p, false).filter(x => x.name !== 'Sokla').map(x => `${x.name} ${x.qty} ${x.length}×${x.width}`).sort();
const solo = (id: string, rows = false): Project => {
  const e = project.elements.find(x => x.id === id)!;
  return { ...project, elements: [rows ? { ...e, front: asRows(e)!, drawerFronts: undefined } : e] };
};

describe('asRows', () => {
  it.each(['D1', 'D2', 'D4', 'D6', 'G1'])('%s: same cut list from its rows', id => {
    expect(lines(solo(id, true))).toEqual(lines(solo(id)));
  });
  it.each(['D5', 'V1'])('%s: same fronts from its rows (rows add the fixed panel under the oven / split the fridge divider)', id => {
    const f = (p: Project) => frontLayout(p.elements[0], p.rules).fronts.filter(x => !x.label || x.label === 'frižider').map(x => [x.w, x.h]);
    expect(f(solo(id, true))).toEqual(f(solo(id)));
  });
  it('no rows for the dishwasher front and the filler', () => {
    expect(asRows(project.elements.find(e => e.id === 'D3')!)).toBeNull();
    expect(asRows(project.elements.find(e => e.id === 'F')!)).toBeNull();
  });
});
