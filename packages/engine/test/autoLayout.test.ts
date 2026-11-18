import { describe, expect, it } from 'vitest';
import fixture from '../../../fixtures/kuhinja-petrovic.json';
import { autoLayout, generateParts, PRESETS, quickStartRoom, type Project, type QuickStartInput } from '../src';

const materials = { carcass: 'iv18-w980', front: 'iv18-u708', back: 'hdf3', drawerBottom: 'iv16-w980' };
const input: QuickStartInput = {
  shape: 'L', a: 3200, b: 2400, water: 1500, power400: 900,
  window: { offset: 1100, width: 1000 }, dishwasher: true, fridge: true, wallUnits: true,
};
const summary = (els: { wallId: string; kind: string; width: number }[], wall: string) =>
  els.filter(e => e.wallId === wall && e.kind !== 'wall').map(e => `${e.kind} ${e.width}`);

describe('autoLayout', () => {
  const r = autoLayout(input, PRESETS.workshop, materials);

  it('L 3200 × 2400 matches docs/BRZI_START.md', () => {
    expect(r.error).toBeUndefined();
    expect(r.warnings).toEqual([]);
    expect(summary(r.elements, 'A')).toEqual(['corner-blind 1000', 'sink 800', 'appliance-front 600', 'base 500', 'base 300']);
    expect(summary(r.elements, 'B')).toEqual(['oven 600', 'base 600', 'tall 600']);
    expect(r.elements.filter(e => e.kind === 'wall').map(e => e.width)).toEqual([600, 400, 600, 400]);
  });

  it('uses workshop preset dimensions like the fixture', () => {
    const tall = r.elements.find(e => e.kind === 'tall')!;
    const upper = r.elements.find(e => e.kind === 'wall')!;
    expect([tall.height, upper.elevation, upper.depth]).toEqual([2070, 1450, 320]);
  });

  it('labels are unique and the result feeds generateParts', () => {
    const ids = r.elements.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const project = { ...(fixture.project as unknown as Project), room: quickStartRoom(input), elements: r.elements };
    const parts = generateParts(project);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.filter(p => p.note).map(p => p.elementId)).toEqual(['D2']); // sink gets the V+O cutout
  });

  it('errors on a wall that is too short and warns when water misses the sink', () => {
    expect(autoLayout({ ...input, a: 2000 }, PRESETS.workshop, materials).error).toMatch(/Zid A/);
    expect(autoLayout({ ...input, water: 3100 }, PRESETS.workshop, materials).warnings[0]).toMatch(/Voda/);
  });

  it('straight kitchen puts oven and fridge on wall A', () => {
    const s = autoLayout({ ...input, shape: 'I', a: 3600 }, PRESETS.workshop, materials);
    expect(s.error).toBeUndefined();
    expect(summary(s.elements, 'A')).toContain('oven 600');
    expect(summary(s.elements, 'A').at(-1)).toBe('tall 600');
    expect(s.elements.reduce((sum, e) => (e.kind === 'wall' ? sum : sum + e.width), 0)).toBe(3600);
  });
});
