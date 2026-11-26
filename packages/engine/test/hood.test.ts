// Hood over a hob (docs/KONSTRUKCIJA.md "Aspirator", user 2026-11-26): niche 300 at the bottom of the wall unit, hood ≥ 650 above
// the hob, the unit keeps the wall units' top line.
import { describe, expect, it } from 'vitest';
import { HOOD_CLEARANCE, hoodFit, layoutWarnings, makeElement, PRESETS, type Element } from '../src';
import { project } from './fixtureProject';

const d = PRESETS.workshop, worktopTop = d.plinthHeight + d.baseCarcassHeight + d.worktopThickness; // 858
const hood = (el: Partial<Element> = {}): Element => ({
  ...makeElement('wall', 'B', 1200, 600, 'G9', d, project.elements[0].materials),
  front: [{ type: 'lift', height: null }, { type: 'hood', height: 300, appliance: 'hoodBuiltIn60' }], ...el,
});

describe('hood unit', () => {
  it('hoodFit raises the bottom to hob + 650 and keeps the top line', () => {
    const e = hood();
    expect([e.elevation, e.height]).toEqual([1450, 720]);
    const f = hoodFit(e, worktopTop);
    expect([f.elevation, f.height]).toEqual([worktopTop + HOOD_CLEARANCE, 1450 + 720 - worktopTop - HOOD_CLEARANCE]); // 1508, 662
    expect(hoodFit({ ...e, front: undefined }, worktopTop)).toEqual({ ...e, front: undefined }); // no hood: unchanged
  });

  it('a hood unit right over the oven / hob (D5) at the default height is warned, raised it is not', () => {
    const at = (el: Element) => layoutWarnings({ ...project, elements: [...project.elements, el] }).filter(w => w.includes('aspirator'));
    expect(at(hood())).toEqual(['G9: aspirator je 592 mm iznad ploče za kuvanje (D5) — treba najmanje 650 (plinska oko 750, vidi uputstvo aspiratora).']);
    expect(at(hoodFit(hood(), worktopTop))).toEqual([]);
  });
});
