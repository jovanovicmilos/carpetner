// Holšraf drilling (docs/KONSTRUKCIJA.md "Bušenje i spajanje — holšraf").
import { describe, expect, it } from 'vitest';
import { hardware, partHoles, spread } from '../src';
import { project } from './fixtureProject';

const el = (label: string) => project.elements.find(e => e.label === label)!;

describe('holšraf holes', () => {
  it('spreads holes 37 from the ends, at most 150 apart, at least 2', () => {
    expect(spread(560)).toEqual([37, 159, 280, 402, 523]);
    expect(spread(320)).toEqual([37, 160, 283]);
    expect(spread(100)).toEqual([25, 75]);
    expect(spread(54)).toEqual([14, 41]);
  });

  it('D2 sink: through the sides into the bottom and both rails, Ø5 countersunk Ø18, pilot Ø3 × 32', () => {
    const h = partHoles(project, el('D2'));
    const face = h.filter(x => x.face === 'lice'), pilot = h.filter(x => x.face === 'kant');
    expect(face).toHaveLength(2 * (5 + 2 + 2));
    expect(pilot).toHaveLength(face.length);
    expect(face.every(x => x.pos === 'D2-1' && x.d === 5 && x.depth === 18 && x.sink === 18)).toBe(true);
    expect(pilot.every(x => x.d === 3 && x.depth === 32)).toBe(true);
    // left side, bottom joint: 9 mm up from the side's lower end, y from the front edge
    expect(face.filter(x => x.piece === 0 && x.x === 9).map(x => x.y).sort((a, b) => a - b)).toEqual([37, 159, 280, 402, 523]);
  });

  it('D4 drawer boxes: 16 screws per drawer, all on the drawer sides', () => {
    const h = partHoles(project, el('D4')).filter(x => x.face === 'lice' && !x.pos.endsWith('-1'));
    expect(h).toHaveLength(3 * 16);
    expect(hardware({ ...project, elements: [el('D4')] }).find(x => x.sku === 'holsraf-4x50')!.qty).toBe(2 * (5 + 2 + 2) + 48);
  });
});
