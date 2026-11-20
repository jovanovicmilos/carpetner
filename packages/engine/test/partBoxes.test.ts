// 3D from the cut list (docs/3D.md): every carcass / back / drawer-bottom piece is one box of its own size inside its element.
import { describe, expect, it } from 'vitest';
import { generateParts, partBoxes, type Element, type FrontRow, type Project } from '../src';
import { project as fixture } from './fixtureProject';

const row = (type: FrontRow['type'], height: number | null, appliance?: string): FrontRow => ({ type, height, ...(appliance ? { appliance } : {}) });
const with1 = (p: Project, el: Partial<Element>): Project =>
  ({ ...p, elements: [{ ...p.elements[0], id: 'X', label: 'X', ...el } as Element] });

function check(p: Project) {
  for (const el of p.elements) {
    const parts = generateParts(p, false).filter(x => x.elementId === el.id);
    const placed = partBoxes(p, el);
    expect(placed.map(x => x.pos)).toEqual(parts.map(x => x.pos));
    for (const [i, part] of parts.entries()) {
      const { boxes, kind } = placed[i];
      if (kind === 'front') { expect(boxes).toEqual([]); continue; }
      expect(boxes.length, `${part.pos} ${part.name}`).toBe(part.qty);
      for (const [x0, x1, y0, y1, z0, z1] of boxes) {
        // the two largest sides are the part's length and width
        const sides = [x1 - x0, y1 - y0, z1 - z0].sort((a, b) => b - a);
        expect(sides.slice(0, 2), `${part.pos} ${part.name}`).toEqual([part.length, part.width].sort((a, b) => b - a));
        expect(x0 >= 0 && x1 <= el.width && y0 >= 0 && y1 <= el.depth && z0 >= 0 && z1 <= el.height, `${part.pos} ${part.name} inside`).toBe(true);
      }
    }
  }
}

describe('partBoxes (3D from the cut list)', () => {
  it('fixture: one box per carcass piece, own size, inside the element', () => check(fixture));
  it('bottom under the sides, back in a groove, inset back', () => {
    check({ ...fixture, rules: { ...fixture.rules, bottomMode: 'under' } });
    check({ ...fixture, rules: { ...fixture.rules, backMode: 'groove' } });
    check({ ...fixture, rules: { ...fixture.rules, backMode: 'inset18' } });
  });
  it('front rows: drawers, appliance niche, tall with dividers, inner drawers', () => {
    check(with1(fixture, { kind: 'drawer', front: [row('drawer', 180), row('drawer', null), row('drawer', null)] }));
    check(with1(fixture, { kind: 'oven', front: [row('app', 600, 'rerna'), row('drawer', null)] }));
    check(with1(fixture, { kind: 'tall', height: 2070, front: [row('door', null), row('app', 600, 'rerna'), row('drawer', 300), row('drawer', 300)], interior: { shelves: 2, innerDrawers: 2 } }));
  });
});
