import { describe, expect, it } from 'vitest';
import { checkLimit, PRESETS, STANDARD_LIMITS } from '../src';

describe('standard limits (docs/STANDARDI.md)', () => {
  it('EN 1116 defaults are inside the limits; the workshop overhang (40) is not', () => {
    expect(STANDARD_LIMITS.map(l => checkLimit(l.key, PRESETS.en1116[l.key])).filter(x => x === 'out')).toEqual([]);
    expect(checkLimit('worktopOverhang', PRESETS.workshop.worktopOverhang)).toBe('out');
    expect([checkLimit('worktopThickness', 38), checkLimit('plinthHeight', null)]).toEqual([null, null]);
  });
});
