// Corner units (docs/KONSTRUKCIJA.md "Ugaoni elementi"): blind part + mask on the corner side, door on the open part.
import { describe, expect, it } from 'vitest';
import { blindFor, blindSpan, frontLayout, generateParts, type Element, type Project } from '../src';
import { project } from './fixtureProject';

const one = (el: Partial<Element>): Project => {
  const base = project.elements.find(e => e.id === 'D1')!;
  return { ...project, elements: [{ ...base, ...el }] };
};
const parts = (p: Project) => generateParts(p, false).filter(x => x.name !== 'Sokla').map(x => `${x.name} ${x.qty} ${x.length}×${x.width}`);

describe('corner units', () => {
  it('blind = depth in front + front + mask 50', () => {
    expect(blindFor(560)).toBe(628);
    expect(blindFor(320)).toBe(388);
  });

  it('D1 at the wall start: blind part left, mask 50, door 469 hinged away from the corner', () => {
    const p = one({});
    expect(blindSpan(p.elements[0])).toEqual([0, 628]);
    const f = frontLayout(p.elements[0], p.rules).fronts;
    expect(f.map(x => [x.label ?? 'krilo', x.x, x.w])).toEqual([['maska', 576.5, 50], ['krilo', 629.5, 469]]);
    expect(parts(p)).toContain('Maska ugla 1 716×50');
    expect(parts(p)).toContain('Krilo 1 716×469');
  });

  it('corner unit at the wall end (U shape, hinge L): blind part and mask on the right', () => {
    const p = one({ hinge: 'L' });
    expect(blindSpan(p.elements[0])).toEqual([472, 1100]);
    expect(frontLayout(p.elements[0], p.rules).fronts.map(x => [x.label ?? 'krilo', x.x, x.w])).toEqual([['krilo', 1.5, 469], ['maska', 473.5, 50]]);
  });

  it('wall corner unit: blind 388 (wall depth 320), door + mask, no stubići', () => {
    const g1 = project.elements.find(e => e.id === 'G1')!;
    const p = { ...project, elements: [{ ...g1, width: 800, blindWidth: blindFor(320), hinge: 'R' as const }] };
    expect(parts(p)).toEqual(expect.arrayContaining(['Krilo 1 716×409', 'Maska ugla 1 716×50']));
    expect(parts(p).some(x => x.startsWith('Stubić'))).toBe(false);
  });
});
