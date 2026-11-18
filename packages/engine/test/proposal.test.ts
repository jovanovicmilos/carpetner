import { describe, expect, it } from 'vitest';
import { project } from './fixtureProject';
import { applyProposal, EXAMPLE_PROPOSAL, scaledItem } from '../src';

const accepted = EXAMPLE_PROPOSAL.items.filter(i => i.accepted).map(i => i.id);

describe('AI proposal (docs/AI.md)', () => {
  it('applies only accepted items into an L room, B offsets flipped', () => {
    const { project: p, history } = applyProposal({ ...project, elements: [] }, EXAMPLE_PROPOSAL, accepted);
    expect(p.room.walls.map(w => [w.id, w.length])).toEqual([['B', 2400], ['A', 3200], ['C', 2400], ['D', 3200]]);
    expect(p.room.openings.map(o => [o.id, o.offset, o.width])).toEqual([['W1', 1100, 1000]]);
    expect(p.room.installations.map(i => i.id)).toEqual(['V1', 'O1']);
    expect(history.applied).toEqual(accepted);
    const withB = applyProposal(project, EXAMPLE_PROPOSAL, [...accepted, 's2']).project;
    expect(withB.room.installations.find(i => i.wallId === 'B')!.offset).toBe(1500); // 2400 − 900
  });

  it('rescales estimates from the measured wall, rounded to 10 mm', () => {
    const measured = { ...EXAMPLE_PROPOSAL, referenceMeasurement: { wallId: 'A' as const, length: 3520 } }; // ×1.1
    const b = scaledItem(measured, measured.items[1]);
    expect(b.op === 'setWall' && b.length).toBe(2640);
    const v = scaledItem(measured, measured.items[3]);
    expect(v.op === 'addInstallation' && [v.installation.offset, v.installation.height]).toEqual([1650, 550]);
  });

  it('refuses to apply without a measurement', () => {
    expect(() => applyProposal(project, { ...EXAMPLE_PROPOSAL, referenceMeasurement: undefined }, accepted)).toThrow(/metrom/);
  });
});
