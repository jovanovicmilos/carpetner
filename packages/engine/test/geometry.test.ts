import { describe, expect, it } from 'vitest';
import { project as fixtureProject, expected as fixtureExpected } from './fixtureProject';
import {
  elementBox, hingeOf, hingePatch, interiorSide, layoutWarnings, placeOnWall, placeUnit, roomWalls, setWallLength, syncWalls, wallGeoms,
  type Element, type Project, type Room,
} from '../src';

const project = fixtureProject;
const room = project.room;

describe('geometry', () => {
  it('derives A/B walls with inner lengths matching the fixture', () => {
    const g = wallGeoms(room);
    expect([g.A.inner, g.B.inner]).toEqual([3200, 2400]);
    expect(interiorSide(g, 'A')).toBe(1);
    expect(interiorSide(g, 'B')).toBe(1); // walls run clockwise on screen (B → A → C → D), room on the left of each
  });

  it('places fixture units on the inner faces', () => {
    const g = wallGeoms(room);
    const d1 = elementBox(g, project.elements.find(e => e.id === 'D1')!)!;
    const d5 = elementBox(g, project.elements.find(e => e.id === 'D5')!)!;
    expect(d1).toEqual({ x0: 0, x1: 1000, y0: 0, y1: 560 });
    expect(d5).toEqual({ x0: 0, x1: 560, y0: 600, y1: 1200 });
  });

  it('syncWalls stores points and keeps lengths', () => {
    const synced = syncWalls(room);
    expect(synced.walls.every(w => w.a && w.b)).toBe(true);
    expect(synced.walls.map(w => w.length)).toEqual([2400, 3200, 2400, 3200]);
    expect(roomWalls(synced)).toEqual(synced.walls);
  });

  it('setWallLength moves the joined wall in parallel', () => {
    const square: Room = { ...room, walls: [
      { id: 'A', length: 0, thickness: 100, angleToPrev: 0, a: { x: 0, y: 0 }, b: { x: 3000, y: 0 } },
      { id: 'B', length: 0, thickness: 100, angleToPrev: 0, a: { x: 3000, y: 0 }, b: { x: 3000, y: 2000 } },
      { id: 'C', length: 0, thickness: 100, angleToPrev: 0, a: { x: 3000, y: 2000 }, b: { x: 0, y: 2000 } },
      { id: 'D', length: 0, thickness: 100, angleToPrev: 0, a: { x: 0, y: 2000 }, b: { x: 0, y: 0 } },
    ] };
    const synced = syncWalls(square);
    expect(synced.walls.map(w => w.length)).toEqual([2900, 1900, 2900, 1900]);
    const longer = setWallLength(synced, 'A', 3400);
    expect(longer.walls.map(w => w.length)).toEqual([3400, 1900, 3400, 1900]);
    expect(longer.walls.find(w => w.id === 'B')!.a).toEqual({ x: 3500, y: 0 });
  });

  it('placeUnit snaps to 50, picks the side under the cursor and sticks to neighbours', () => {
    const base = project.elements.filter(e => e.id === 'D1');
    // Cursor inside the room near wall A at x≈1330 → unit 600 centred, snapped, then stuck to D1's end (1000) since |1050−1000| < 150.
    expect(placeUnit(room, base, { x: 1330, y: 200 }, 600, 'low', null)).toEqual({ wallId: 'A', offset: 1000, side: 1 });
    expect(placeUnit(room, [], { x: 2000, y: 300 }, 600, 'low', null)).toEqual({ wallId: 'A', offset: 1700, side: 1 });
    expect(placeUnit(room, [], { x: 9000, y: 9000 }, 600, 'low', null)).toBeNull();
    expect(placeOnWall(room, { x: 1500, y: 50 }, 0)).toEqual({ wallId: 'A', offset: 1500, side: 1 });
  });
});

describe('layout warnings (docs/EDITOR_2D.md)', () => {
  const withEls = (patch: (p: Project) => Project) => layoutWarnings(patch(project)).filter(w => !w.startsWith('Utičnica za MSP'));

  it('door, window, radiator and corner overlaps', () => {
    expect(withEls(p => ({ ...p, room: { ...p.room, openings: [...p.room.openings, { id: 'V1d', wallId: 'B', kind: 'door', offset: 0, width: 500, height: 2050, sill: 0 }] } })))
      .toEqual(['V1 zaklanja vrata.']);
    expect(withEls(p => ({ ...p, elements: p.elements.map(e => (e.id === 'G2' ? { ...e, offset: 1000 } : e)) })))
      .toEqual(['G2 ide preko prozora.']);
    expect(withEls(p => ({ ...p, room: { ...p.room, obstacles: [{ id: 'R1', kind: 'radiator', wallId: 'B', offset: 700, width: 400, depth: 100, height: 600 }] } })))
      .toEqual(['D6 je ispred radijatora.']);
    // D5 pushed into the corner hits D1 across walls.
    expect(withEls(p => ({ ...p, elements: p.elements.map(e => (e.id === 'D5' ? { ...e, offset: 1800 } : e)) })))
      .toEqual(['D1 i D5 se preklapaju.']);
  });

  it('water must be behind the sink', () => {
    expect(withEls(p => ({ ...p, elements: p.elements.map(e => (e.id === 'D2' ? { ...e, kind: 'base' as const } : e)) })))
      .toEqual(['Voda je iza D2, a ne iza sudopere.', 'Odvod je iza D2, a ne iza sudopere.']);
    expect(withEls(p => ({ ...p, elements: p.elements.filter(e => e.id !== 'D2' && e.id !== 'D3') })))
      .toEqual(['Voda (1500 od početka zida A) nema element ispred.', 'Odvod (1650 od početka zida A) nema element ispred.']);
  });
});

describe('hinge', () => {
  const el = (kind: Element['kind'], doors?: 0 | 1 | 2, hinge?: Element['hinge']) =>
    ({ id: 'X', label: 'X', kind, wallId: 'A', offset: 0, width: 600, height: 720, depth: 560, doors, hinge, materials: { carcass: 'c', front: 'f' } }) as Element;
  it('defaults follow doors and kind', () => {
    expect([hingeOf(el('sink', 2)), hingeOf(el('base', 1)), hingeOf(el('corner-blind', 1)), hingeOf(el('base', 0)), hingeOf(el('drawer')), hingeOf(el('tall', 2))])
      .toEqual(['LR', 'L', 'R', 'none', 'none', 'L']);
  });
  it('patch keeps doors in sync, tall only flips side', () => {
    expect(hingePatch(el('base', 1), 'LR')).toEqual({ hinge: 'LR', doors: 2 });
    expect(hingePatch(el('wall', 1), 'none')).toEqual({ hinge: 'none', doors: 0 });
    expect(hingeOf({ ...el('tall', 2), ...hingePatch(el('tall', 2), 'R') })).toBe('R');
  });
});
