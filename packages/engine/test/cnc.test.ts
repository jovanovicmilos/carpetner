import { describe, expect, it } from 'vitest';
import { generateParts, partsDxf } from '../src';
import { project } from './fixtureProject';

describe('parts DXF for CNC', () => {
  const dxf = partsDxf(project), lines = dxf.split('\r\n');
  const count = (layer: string) => lines.filter((l, i) => l === 'POLYLINE' && lines[i + 2] === layer).length;
  it('one closed contour per piece, a cutout per back with installations, deterministic', () => {
    const pieces = generateParts(project).reduce((s, x) => s + x.qty, 0);
    expect(count('KONTURA')).toBe(pieces);
    expect(count('IZREZ')).toBe(generateParts(project).filter(x => x.name.startsWith('Poleđina') && x.note?.startsWith('izrez')).reduce((s, x) => s + x.qty, 0));
    expect(count('IZREZ')).toBeGreaterThan(0);
    expect(dxf.endsWith('EOF\r\n')).toBe(true);
    expect(partsDxf(project)).toBe(dxf);
  });
});
