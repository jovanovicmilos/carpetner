import { describe, expect, it } from 'vitest';
import { project as fixtureProject, expected as fixtureExpected } from './fixtureProject';
import { autoLayout, generateParts, layoutIssues, makeElement, PRESETS, quickStartRoom, sceneBoxes, worktops, type Project, type QuickStartInput } from '../src';

const materials = { carcass: 'iv18-w980', front: 'iv18-u708', back: 'hdf3', drawerBottom: 'iv16-w980' };
const input: QuickStartInput = {
  shape: 'L', a: 3200, b: 2400, water: 1500, power400: 900,
  window: { offset: 1100, width: 1000 }, dishwasher: true, fridge: true, wallUnits: true,
};
const summary = (els: { wallId: string; kind: string; width: number }[], wall: string) =>
  els.filter(e => e.wallId === wall && e.kind !== 'wall').map(e => `${e.kind} ${e.width}`);

describe('autoLayout', () => {
  const r = autoLayout(input, PRESETS.workshop, materials);

  it('default input gives exactly the fixture elements (docs/BRZI_START.md)', () => {
    expect(r.error).toBeUndefined();
    expect(r.warnings).toEqual([]);
    expect(r.elements).toEqual(fixtureProject.elements);
  });

  it('default input gives the fixture room (walls, window, water, drain, three-phase on B)', () => {
    const room = quickStartRoom(input), f = fixtureProject.room;
    expect(room.walls).toEqual(f.walls);
    expect(room.openings).toEqual(f.openings.filter(o => o.kind === 'window'));
    const pick = (i: { kind: string; wallId: string; offset: number; height: number }) => [i.kind, i.wallId, i.offset, i.height];
    expect(room.installations.map(pick)).toEqual(f.installations.filter(i => i.kind !== 'power').map(pick));
  });

  it('uses workshop preset dimensions like the fixture', () => {
    const tall = r.elements.find(e => e.kind === 'tall')!;
    const upper = r.elements.find(e => e.kind === 'wall')!;
    expect([tall.height, upper.elevation, upper.depth]).toEqual([2070, 1450, 320]);
  });

  it('labels are unique and the result feeds generateParts', () => {
    const ids = r.elements.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const project = { ...(fixtureProject), room: quickStartRoom(input), elements: r.elements };
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

  it('island: a row of base units on the island line, facing wall A, with its own worktop and no wall', () => {
    const inp = { ...input, shape: 'I' as const, a: 3600, island: true };
    const s = autoLayout(inp, PRESETS.workshop, materials), room = quickStartRoom(inp);
    expect(summary(s.elements, 'O')).toEqual(['drawer 600', 'base 600', 'base 600']);
    expect(s.elements.filter(e => e.wallId === 'O').every(e => e.side === -1)).toBe(true);
    expect(room.walls.find(w => w.id === 'O')).toMatchObject({ island: true, thickness: 0, length: 1800 });
    const p: Project = { id: 'x', name: 'x', unit: 'mm', presetId: 'workshop', room, elements: s.elements, rules: fixtureProject.rules, materials: fixtureProject.materials };
    expect(layoutIssues(p).filter(i => i.ids?.some(id => s.elements.find(e => e.id === id)?.wallId === 'O'))).toEqual([]);
    expect(worktops(p).some(t => t.wallId === 'O' && t.length === 1800)).toBe(true);
    expect(sceneBoxes(p).some(b => b.node === 'Zid_O')).toBe(false);
  });

  it('a chimney splits the run, the wall units and the worktop', () => {
    const chimney = { id: 'K1', wallId: 'A', kind: 'chimney' as const, offset: 2400, width: 400, depth: 300 };
    const withChimney = { ...input, obstacles: [chimney] };
    const c = autoLayout(withChimney, PRESETS.workshop, materials);
    expect(summary(c.elements, 'A')).toEqual(['corner-blind 1000', 'sink 800', 'appliance-front 600', 'base 400']); // not right after the MSP: no drawer
    expect(c.elements.find(e => e.wallId === 'A' && e.kind === 'base')!.offset).toBe(2800);
    expect(c.elements.filter(e => e.kind === 'wall').map(e => [e.offset, e.width])).toEqual([[0, 600], [600, 400], [2800, 400]]);
    const project = { ...(fixtureProject), room: quickStartRoom(withChimney), elements: c.elements };
    expect(worktops(project).filter(w => w.wallId === 'A').map(w => w.length)).toEqual([2400, 400]);
  });

  it('a box above the worktop only moves wall units', () => {
    const box = { id: 'K1', wallId: 'A', kind: 'other' as const, offset: 0, width: 600, depth: 200, elevation: 1400 };
    const c = autoLayout({ ...input, obstacles: [box] }, PRESETS.workshop, materials);
    expect(summary(c.elements, 'A')).toEqual(summary(autoLayout(input, PRESETS.workshop, materials).elements, 'A'));
    expect(c.elements.filter(e => e.kind === 'wall').map(e => e.offset)).toEqual([600, 2200, 2800]);
  });

  it('warns when an obstacle sits where the fridge goes', () => {
    const col = { id: 'S', wallId: 'B', kind: 'column' as const, offset: 2000, width: 300, depth: 300 };
    const c = autoLayout({ ...input, obstacles: [col] }, PRESETS.workshop, materials);
    expect(c.warnings).toContain('Nema mesta za frižider na kraju zida B (prepreka).');
    expect(c.elements.some(e => e.kind === 'tall')).toBe(false);
  });
});

describe('makeElement drawer fronts', () => {
  it('fill the carcass height of every preset (EN 1116 762 had a 46 mm gap)', () => {
    for (const d of [PRESETS.en1116, PRESETS.workshop]) {
      const el = makeElement('drawer', 'A', 0, 600, 'D1', d, materials);
      const used = el.drawerFronts!.reduce((s, h) => s + h, 0) + 2 * 4 + 4;
      expect(d.baseCarcassHeight - used).toBeGreaterThanOrEqual(0);
      expect(d.baseCarcassHeight - used).toBeLessThan(2);
    }
  });
});

describe('autoLayout follows the guide answers', () => {
  it('oven in a tall unit, free-standing fridge, 45 cm dishwasher', () => {
    const inp: QuickStartInput = { ...input, oven: 'tall', fridgeType: 'free', dishwasherWidth: 450 };
    const r = autoLayout(inp, PRESETS.en1116, materials), room = quickStartRoom(inp);
    expect(r.error).toBeUndefined();
    expect(r.elements.filter(e => e.kind === 'oven')).toEqual([]);                       // no oven under the hob
    expect(r.elements.filter(e => e.hob).length).toBe(1);                               // the hob stays, over drawers
    const tall = r.elements.filter(e => e.kind === 'tall');
    expect(tall.map(e => e.catalogKey)).toEqual(['tallOF']);                            // tall oven, no fridge carcass
    expect(tall[0].front?.some(f => f.appliance === 'oven60')).toBe(true);
    expect(r.elements.find(e => e.kind === 'appliance-front')?.width).toBe(450);
    expect(room.obstacles?.find(o => o.label?.startsWith('Frižider'))).toMatchObject({ wallId: 'B', width: 600 });
    const p: Project = { id: 'x', name: 'x', unit: 'mm', presetId: 'en1116', room, elements: r.elements, rules: fixtureProject.rules, materials: fixtureProject.materials };
    expect(layoutIssues(p)).toEqual([]);
    expect(worktops(p).flatMap(t => t.cutouts).filter(c => c.kind === 'hob').length).toBe(1);
  });
  it('no oven: hob only; no fridge: nothing at the end', () => {
    const r = autoLayout({ ...input, oven: 'none', fridge: false }, PRESETS.en1116, materials);
    expect(r.elements.some(e => e.kind === 'oven' || e.kind === 'tall')).toBe(false);
    expect(r.elements.filter(e => e.hob).length).toBe(1);
  });
});
