import { describe, expect, it } from 'vitest';
import { project as fixtureProject, expected as fixtureExpected } from './fixtureProject';
import { ceilingOver, firstFreeOffset, fitUnderCeiling, installationHost, layoutWarnings, nextId, outletIssues, splitWall, wallGeoms, wallHeightAt, type Project } from '../src';

const project = fixtureProject;
const MSP = 'Utičnica za MSP (h 300) je u zoni mašine — preporuka: pomeriti u susedni D4 ili ostaviti iza poleđine sa izrezom.';
/** Warnings except the fixture's known dishwasher outlet (tested separately). */
const others = layoutWarnings;
const move = (id: string, offset: number): Project =>
  ({ ...project, elements: project.elements.map(e => (e.id === id ? { ...e, offset } : e)) });

describe('edit helpers', () => {
  it('fixture: only the outlet behind the dishwasher (S1 h300 behind D3)', () => {
    expect(layoutWarnings(project)).toEqual([]);
    expect(outletIssues(project).map(i => i.text)).toEqual([MSP]);
  });

  it('detects overlaps only within the same height zone', () => {
    expect(others(move('D3', 1700))).toEqual(['D2 i D3 se preklapaju.']);
    // G1 (wall unit) above D1 is fine; moving G1 onto G2 is not.
    expect(others(move('G1', 300))).toEqual(['G1 i G2 se preklapaju.']);
  });

  it('detects units outside the wall and obstacle overlaps', () => {
    expect(others(move('F', 3100))).toEqual(['F izlazi van zida A.']);
    const withChimney = { ...project, room: { ...project.room, obstacles: [{ id: 'K1', wallId: 'B', kind: 'chimney' as const, offset: 700, width: 300, depth: 300 }] } };
    expect(others(withChimney)).toEqual(['Dimnjak K1 se preklapa sa D6.']);
  });

  it('sloped wall (attic): ceiling line, checks and fit', () => {
    // Wall A from 2600 at its start down to 1800 at its end.
    const sloped: Project = { ...project, room: { ...project.room, walls: project.room.walls.map(w => (w.id === 'A' ? { ...w, heightStart: 2600, heightEnd: 1800 } : w)) } };
    const g = wallGeoms(sloped.room).A;
    expect([wallHeightAt(sloped.room, g, 0), wallHeightAt(sloped.room, g, g.inner)]).toEqual([2600, 1800]);
    expect(layoutWarnings(sloped)).toEqual([
      'G3 ne staje ispod kosine (zid A): vrh 2170, plafon 1900 — fali 270 mm.',
      'G4 ne staje ispod kosine (zid A): vrh 2170, plafon 1800 — fali 370 mm.',
    ]);
    const g4 = sloped.elements.find(e => e.id === 'G4')!;
    expect(ceilingOver(sloped, g4)).toBe(1800);
    expect(fitUnderCeiling(sloped, g4)).toEqual({ height: 350 });
    expect(fitUnderCeiling(sloped, sloped.elements.find(e => e.id === 'G1')!)).toBeNull();
    // Splitting keeps the ceiling line.
    const split = splitWall(sloped, 'A');
    const [a, n] = split.room.walls.filter(w => w.id === 'A' || !project.room.walls.some(o => o.id === w.id));
    expect([a.heightStart, a.heightEnd, n.heightStart, n.heightEnd]).toEqual([2600, n.heightStart, a.heightEnd, 1800]);
    expect(layoutWarnings(split).filter(w => w.includes('kosine')).length).toBe(2);
  });

  it('finds the first free gap', () => {
    const lowerZone: [number, number] = [0, 858];
    expect(firstFreeOffset(project, 'B', 600, lowerZone)).toBe(1800); // B: V1, D6, D5 fill 0..1800
    expect(firstFreeOffset(project, 'A', 400, [1450, 2170])).toBe(1000); // between G2 and G3
    expect(firstFreeOffset(project, 'A', 99999, lowerZone)).toBeNull(); // wall full
    expect(nextId(['D1', 'D2', 'D4'], 'D')).toBe('D3');
  });

  it('installation host: element covering offset and height', () => {
    const host = (id: string) => installationHost(project, project.room.installations.find(i => i.id === id)!)?.label;
    expect(['V', 'S1', 'S2', 'S4'].map(host)).toEqual(['D2', 'D3', undefined, 'V1']);
  });
});
