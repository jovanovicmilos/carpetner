import { describe, expect, it } from 'vitest';
import { applyChanges, diffElements } from '../src';
import type { Element, Project } from '../src';
import { project as fixture } from './fixtureProject';

const sent = fixture;
const el = (id: string) => sent.elements.find(e => e.id === id)!;

describe('diffElements / applyChanges', () => {
  // The design's three proposals: sink moved 20 cm, drawers 60 → 2 × 30, a new filler strip; plus one removed unit.
  const sink = sent.elements.find(e => e.kind === 'sink')!;
  const drawer = sent.elements.find(e => e.kind === 'drawer' && e.width === 600) ?? sent.elements.find(e => e.kind === 'drawer')!;
  const extra: Element = { ...drawer, id: 'NEW1', offset: drawer.offset + 300, width: 300 };
  const gone = sent.elements.find(e => e.kind === 'wall')!;
  const work: Project = {
    ...sent,
    elements: [
      ...sent.elements.filter(e => e.id !== gone.id).map(e => e.id === sink.id ? { ...e, offset: e.offset + 200 } : e.id === drawer.id ? { ...e, width: 300 } : e),
      extra,
    ],
  };
  const ch = diffElements(sent, work);

  it('lists moved, resized, added and removed units by id; unchanged units are left out', () => {
    expect(ch.map(c => [c.id, c.kind])).toEqual([[sink.id, 'changed'], [drawer.id, 'changed'], ['NEW1', 'added'], [gone.id, 'removed']]);
    expect(ch[0]).toMatchObject({ moved: 200 });
    expect(ch[0].width).toBeUndefined();
    expect(ch[1]).toMatchObject({ width: [drawer.width, 300] });
    expect(diffElements(sent, sent)).toEqual([]);
  });

  it('another wall and another unit type are told apart from a move', () => {
    const b: Project = { ...sent, elements: sent.elements.map(e => e.id === sink.id ? { ...e, wallId: 'B', kind: 'base', catalogKey: 'base600' } : e) };
    expect(diffElements(sent, b)[0]).toMatchObject({ wall: [sink.wallId, 'B'], swapped: true });
    expect(diffElements(sent, b)[0].moved).toBeUndefined();
  });

  it('applies only accepted changes; all accepted = the working copy, none = the sent kitchen', () => {
    const some = applyChanges(sent, work, [sink.id, 'NEW1']);
    expect(some.elements.find(e => e.id === sink.id)!.offset).toBe(sink.offset + 200);
    expect(some.elements.find(e => e.id === drawer.id)!.width).toBe(drawer.width); // declined
    expect(some.elements.some(e => e.id === gone.id)).toBe(true); // removal declined
    expect(some.elements.some(e => e.id === 'NEW1')).toBe(true);
    expect(applyChanges(sent, work, []).elements).toEqual(sent.elements);
    const all = applyChanges(sent, work, ch.map(c => c.id));
    expect(diffElements(all, work)).toEqual([]);
    expect(el(sink.id).offset).toBe(sink.offset); // inputs untouched
  });
});
