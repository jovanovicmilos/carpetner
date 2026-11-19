import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDxf, snapToSegments } from '../src';

const dxf = (units: number | null, ents: string[]) => [
  '0', 'SECTION', '2', 'HEADER', ...(units === null ? [] : ['9', '$INSUNITS', '70', String(units)]), '0', 'ENDSEC',
  '0', 'SECTION', '2', 'ENTITIES', ...ents, '0', 'ENDSEC', '0', 'EOF'].join('\n');

describe('DXF plan import (docs/NACRTI_I_IZVOZ.md "Uvoz")', () => {
  it('LINE in cm → mm, Y flipped to plan', () => {
    const p = parseDxf(dxf(5, ['0', 'LINE', '8', '0', '10', '0', '20', '0', '11', '320', '21', '240']));
    expect(p.segments).toEqual([[0, -0, 3200, -2400]]);
  });
  it('closed LWPOLYLINE, old POLYLINE and ARC become segments; text is skipped', () => {
    const p = parseDxf(dxf(4, [
      '0', 'LWPOLYLINE', '90', '3', '70', '1', '10', '0', '20', '0', '10', '100', '20', '0', '10', '100', '20', '100',
      '0', 'POLYLINE', '70', '0', '0', 'VERTEX', '10', '0', '20', '0', '0', 'VERTEX', '10', '0', '20', '50', '0', 'SEQEND',
      '0', 'ARC', '10', '0', '20', '0', '40', '1000', '50', '0', '51', '90',
      '0', 'TEXT', '1', 'Kuhinja',
    ]));
    expect(p.segments.slice(0, 4).length).toBe(4); // 3 polyline sides + 1 old polyline segment
    expect(p.segments.length).toBe(4 + 6); // 90° arc in 15° steps
    expect(p.skipped).toBe(1);
    const last = p.segments.at(-1)!;
    expect([Math.round(last[2]), Math.round(last[3])]).toEqual([0, -1000]);
  });
  it('reads the plan our own Nacrti DXF export writes (fixtures/export)', () => {
    const p = parseDxf(readFileSync(new URL('../../../fixtures/export/kuhinja-petrovic_tlocrt.dxf', import.meta.url), 'latin1'));
    expect(p.segments.length).toBeGreaterThan(100);
    expect(p.maxX - p.minX).toBeGreaterThan(3200);
    expect(p.maxX - p.minX).toBeLessThan(6000);
  });
  it('snaps to an end point first, else onto the line, within the tolerance', () => {
    const s: [number, number, number, number][] = [[0, 0, 1000, 0]];
    expect(snapToSegments(s, { x: 980, y: 30 }, 100)).toEqual({ x: 1000, y: 0 });
    expect(snapToSegments(s, { x: 500, y: 40 }, 100)).toEqual({ x: 500, y: 0 });
    expect(snapToSegments(s, { x: 500, y: 400 }, 100)).toBeNull();
  });
});
