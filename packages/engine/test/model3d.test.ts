import { describe, expect, it } from 'vitest';
import { project } from './fixtureProject';
import { applianceSpots, sceneBoxes, toDae, toGlb, toObj } from '../src';

const boxes = sceneBoxes(project);
const extent = (node: string, mat: string) => {
  const c = boxes.filter(b => b.node === node && b.mat === mat).flatMap(b => b.corners);
  return [0, 1, 2].map(k => [Math.min(...c.map(p => p[k])), Math.max(...c.map(p => p[k]))]);
};

describe('3D model (docs/NACRTI_I_IZVOZ.md)', () => {
  it('D2 carcass: 800 wide, 560 deep, on 100 legs, 720 high', () => {
    const [x, y, z] = extent('D2', 'korpus');
    expect([x[1] - x[0], y[1] - y[0], z]).toEqual([800, 560, [100, 820]]);
  });

  it('appliance models: oven + hob over D5, sink over D2; niches only have models in the detailed view', () => {
    const spots = applianceSpots(project).map(s => `${s.node} ${s.kind} ${s.w}`);
    expect(spots).toEqual(['D2 sink 500', 'D5 oven 596', 'D5 hob 580']);
    expect(sceneBoxes(project, 38, 600, true).some(b => b.node === 'D5' && b.mat === 'rerna')).toBe(false);
    expect(boxes.some(b => b.node === 'D5' && b.mat === 'rerna')).toBe(true);
  });

  it('vitrina (glass row): glass pane in an aluminium frame instead of a solid front', () => {
    const g = { ...project, elements: project.elements.map(e => (e.label === 'G1' ? { ...e, front: [{ type: 'glass' as const, height: null }] } : e)) };
    const b = sceneBoxes(g).filter(x => x.node === 'G1');
    expect(b.filter(x => x.mat === 'staklo')).toHaveLength(1);
    expect(b.filter(x => x.mat === 'aparat')).toHaveLength(4);
    expect(b.some(x => x.mat === 'fronta')).toBe(false);
  });

  it('every element, wall, worktop and the floor is a node', () => {
    const nodes = new Set(boxes.map(b => b.node));
    for (const e of project.elements) expect(nodes.has(e.label)).toBe(true);
    expect([...nodes].filter(n => n.startsWith('Zid_')).length).toBe(project.room.walls.length);
    expect([...nodes].filter(n => n.startsWith('Radna_')).length).toBeGreaterThan(0);
    expect(nodes.has('Pod')).toBe(true);
  });

  it('GLB: valid header, JSON chunk with element nodes, deterministic', () => {
    const glb = toGlb(boxes, 'Kuhinja');
    const dv = new DataView(glb.buffer);
    expect(dv.getUint32(0, true)).toBe(0x46546c67);
    expect(dv.getUint32(8, true)).toBe(glb.length);
    const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + dv.getUint32(12, true))));
    expect(json.meshes.length).toBe(boxes.length);
    expect(json.scenes[0].nodes.map((i: number) => json.nodes[i].name)).toContain('V1');
    expect(toGlb(boxes, 'Kuhinja')).toEqual(glb);
  });

  it('OBJ: 6 faces per box, normals point out of each box', () => {
    const { obj, mtl } = toObj(boxes, 'kuhinja');
    expect(obj.split('\n').filter(l => l.startsWith('f ')).length).toBe(6 * boxes.length);
    expect(mtl).toContain('newmtl fronta');
    // first box: each face normal · (face centre − box centre) > 0
    const lines = obj.split('\n');
    const v = lines.filter(l => l.startsWith('v ')).slice(0, 24).map(l => l.split(' ').slice(1).map(Number));
    const n = lines.filter(l => l.startsWith('vn ')).slice(0, 6).map(l => l.split(' ').slice(1).map(Number));
    const mid = [0, 1, 2].map(k => v.reduce((s, p) => s + p[k], 0) / 24);
    n.forEach((nv, f) => {
      const c = [0, 1, 2].map(k => v.slice(4 * f, 4 * f + 4).reduce((s, p) => s + p[k], 0) / 4);
      expect(nv.reduce((s, x, k) => s + x * (c[k] - mid[k]), 0)).toBeGreaterThan(0);
    });
  });

  it('DAE: a geometry per box, a node per element, materials bound, deterministic', () => {
    const dae = toDae(boxes, 'Kuhinja <Petrović>');
    expect(dae.match(/<geometry /g)?.length).toBe(boxes.length);
    expect(dae).toContain('<node name="D2">');
    expect(dae).toContain('target="#fronta"');
    expect(dae).toContain('name="Kuhinja &lt;Petrović>"');
    expect(dae.match(/<float_array [^>]*count="72">([^<]*)</)![1].split(' ').length).toBe(72);
    expect(toDae(boxes, 'x')).toBe(toDae(boxes, 'x'));
  });
});

describe('detailed scene (realistic 3D)', () => {
  it('builds boards, handles and worktop fittings without changing the export boxes', () => {
    const d = sceneBoxes(project, 38, 600, true);
    expect(d.length).toBeGreaterThan(boxes.length * 2);
    expect(d.filter(b => b.mat === 'rucka').length).toBeGreaterThan(0);
    // Legs on screen only: 4 per unit on legs, never in the export boxes.
    expect(sceneBoxes(project, 38, 600, false, true).length - boxes.length).toBe(4 * boxes.filter(b => b.mat === 'sokla').length); // one plinth per unit on legs
    expect(sceneBoxes(project)).toEqual(boxes);
  });
});

describe('3D boards carry their cut-list line', () => {
  it('every carcass board and front of D4 has a part pos of D4, and the fronts match the front lines', async () => {
    const { sceneBoxes, generateParts } = await import('../src');
    const { project } = await import('./fixtureProject');
    const boxes = sceneBoxes(project, 38, 600, true).filter(b => b.node === 'D4');
    const pos = new Set(generateParts(project, false).filter(x => x.elementId === 'D4').map(x => x.pos));
    expect(boxes.filter(b => b.mat === 'korpus').every(b => b.part && pos.has(b.part))).toBe(true);
    expect(boxes.filter(b => b.mat === 'fronta').map(b => b.part)).toEqual(['D4-5', 'D4-6', 'D4-7']);
  });
});
