import { describe, expect, it } from 'vitest';
import { merge3 } from '../src';

describe('merge3 (shared session)', () => {
  const base = { id: 'p', name: 'K', room: { height: 2600, walls: [{ id: 'A', length: 3000 }, { id: 'B', length: 2000 }] }, elements: [{ id: 'D1', offset: 0, width: 600 }, { id: 'D2', offset: 600, width: 800 }] };
  it('keeps both sides: different elements, fields, adds and removes', () => {
    const mine = { ...base, elements: [{ id: 'D1', offset: 0, width: 450 }, { id: 'D2', offset: 600, width: 800 }, { id: 'G1', offset: 0, width: 600 }] };
    const theirs = { ...base, room: { ...base.room, height: 2700, walls: [{ id: 'A', length: 3100 }, { id: 'B', length: 2000 }] }, elements: [{ id: 'D1', offset: 0, width: 600 }] };
    expect(merge3(base, mine, theirs)).toEqual({ ...base, room: { height: 2700, walls: [{ id: 'A', length: 3100 }, { id: 'B', length: 2000 }] }, elements: [{ id: 'D1', offset: 0, width: 450 }, { id: 'G1', offset: 0, width: 600 }] });
  });
  it('same field on both sides: mine wins; unchanged here: theirs', () => {
    const mine = { ...base, name: 'Moja' }, theirs = { ...base, name: 'Njihova', elements: [] };
    expect(merge3(base, mine, theirs)).toEqual({ ...base, name: 'Moja', elements: [] });
    expect(merge3(base, base, theirs)).toBe(theirs);
  });
  it('a field removed here stays removed; one added there is kept', () => {
    const b = { a: 1, b: 2 }, mine = { a: 1 }, theirs = { a: 1, b: 2, c: 3 };
    expect(merge3<Record<string, number>>(b, mine, theirs)).toEqual({ a: 1, c: 3 });
  });
});
