// 3D model of the project as boxes, and GLB / OBJ+MTL writers (docs/NACRTI_I_IZVOZ.md "Izvoz"): meters, Y up,
// one node per element (D1, G1…), materials by role. Pure and deterministic, like the rest of the engine.
// shortcut: boxes only (no sink bowl / hob / handles); worktops of two runs overlap in the corner.
import { frontLayout } from './fronts';
import { sideOf, wallGeoms, wallPoint, type WallGeom } from './geometry';
import type { Element, Project } from './types';

export type Mat3 = 'korpus' | 'fronta' | 'radna' | 'zid' | 'pod' | 'sokla' | 'aparat' | 'rerna';
/** A box: node name, material and 8 corners in plan mm (x, y, z up); corner index = along·4 + out·2 + up. */
export interface Box3 { node: string; mat: Mat3; corners: [number, number, number][] }

export const MAT_COLORS: Record<Mat3, [number, number, number]> = {
  korpus: [0.95, 0.95, 0.94], fronta: [0.75, 0.77, 0.78], radna: [0.72, 0.61, 0.46], zid: [0.93, 0.91, 0.88],
  pod: [0.85, 0.82, 0.77], sokla: [0.23, 0.22, 0.21], aparat: [0.62, 0.64, 0.66], rerna: [0.12, 0.12, 0.12],
};
const MATS = Object.keys(MAT_COLORS) as Mat3[];
const UNDER_WORKTOP = new Set<Element['kind']>(['base', 'sink', 'drawer', 'oven', 'corner-blind', 'appliance-front', 'filler']);
const FRONT_T = 18, PLINTH_SETBACK = 50;

/** Box on a wall: `along` from the inner wall start, `out` from the wall axis (towards side `sd`), z from the floor. */
function onWall(node: string, mat: Mat3, g: WallGeom, sd: 1 | -1, a0: number, a1: number, o0: number, o1: number, z0: number, z1: number): Box3 {
  const corners: Box3['corners'] = [];
  for (const a of [a0, a1]) for (const o of [o0, o1]) for (const z of [z0, z1]) { const p = wallPoint(g, a, o, sd); corners.push([p.x, p.y, z]); }
  return { node, mat, corners };
}

export function sceneBoxes(p: Project, worktopThickness = 38, worktopDepth = 600): Box3[] {
  const geoms = wallGeoms(p.room), H = p.room.height, out: Box3[] = [];
  const legsOf = (e: Element) => e.legs ?? p.elements.find(x => x.wallId === e.wallId && x.legs)?.legs ?? 0;
  const bottom = (e: Element) => (e.kind === 'wall' ? e.elevation ?? 0 : legsOf(e));

  // Walls, split around openings (below the sill and above the opening).
  for (const g of Object.values(geoms)) {
    const node = `Zid_${g.wall.id}`, t = g.th / 2, start = -g.offA, end = g.L - g.offA;
    const ops = p.room.openings.filter(o => o.wallId === g.wall.id).sort((a, b) => a.offset - b.offset);
    let from = start;
    for (const o of ops) {
      if (o.offset > from) out.push(onWall(node, 'zid', g, 1, from, o.offset, -t, t, 0, H));
      if (o.sill > 0) out.push(onWall(node, 'zid', g, 1, o.offset, o.offset + o.width, -t, t, 0, o.sill));
      if (o.sill + o.height < H) out.push(onWall(node, 'zid', g, 1, o.offset, o.offset + o.width, -t, t, o.sill + o.height, H));
      from = Math.max(from, o.offset + o.width);
    }
    if (end > from) out.push(onWall(node, 'zid', g, 1, from, end, -t, t, 0, H));
  }

  // Floor under the wall axes.
  const xs = Object.values(geoms).flatMap(g => [g.ax, g.ax + g.ux * g.L]), ys = Object.values(geoms).flatMap(g => [g.ay, g.ay + g.uy * g.L]);
  if (xs.length) {
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const corners: Box3['corners'] = [];
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [-20, 0]) corners.push([x, y, z]);
    out.push({ node: 'Pod', mat: 'pod', corners });
  }

  for (const e of p.elements) {
    const g = geoms[e.wallId];
    if (!g) continue;
    const sd = sideOf(geoms, e), face = g.th / 2, z0 = bottom(e), z1 = z0 + e.height;
    const box = (mat: Mat3, a0: number, a1: number, o0: number, o1: number, b0: number, b1: number) =>
      out.push(onWall(e.label, mat, g, sd, e.offset + a0, e.offset + a1, face + o0, face + o1, b0, b1));
    if (e.kind !== 'filler') box(e.kind === 'appliance-front' ? 'aparat' : 'korpus', 0, e.width, 0, e.depth, z0, z1);
    const { fronts, ovenTop } = frontLayout(e, p.rules);
    for (const f of fronts) box('fronta', f.x, f.x + f.w, e.depth, e.depth + FRONT_T, z1 - f.y - f.h, z1 - f.y);
    if (ovenTop !== null) box('rerna', 2, e.width - 2, e.depth, e.depth + FRONT_T, z1 - ovenTop, z1 - 2);
    if (e.kind !== 'wall' && z0 > 0) {
      const back = e.depth - PLINTH_SETBACK;
      box('sokla', 0, e.width, back - FRONT_T, back, 0, z0);
    }
  }

  // Worktops: one slab per contiguous run of base units on a wall.
  for (const g of Object.values(geoms)) {
    const run = p.elements.filter(e => e.wallId === g.wall.id && UNDER_WORKTOP.has(e.kind)).sort((a, b) => a.offset - b.offset);
    const slabs: { s: number; e: number; z: number; sd: 1 | -1 }[] = [];
    for (const e of run) {
      const last = slabs.at(-1), z = bottom(e) + e.height;
      if (last && e.offset <= last.e) { last.e = Math.max(last.e, e.offset + e.width); last.z = Math.max(last.z, z); }
      else slabs.push({ s: e.offset, e: e.offset + e.width, z, sd: sideOf(geoms, e) });
    }
    slabs.forEach((r, i) => out.push(onWall(`Radna_${g.wall.id}${slabs.length > 1 ? i + 1 : ''}`, 'radna', g, r.sd, r.s, r.e,
      g.th / 2, g.th / 2 + worktopDepth, r.z, r.z + worktopThickness)));
  }
  return out;
}

type V3 = [number, number, number];
const FACES = [[0, 2, 6, 4], [1, 5, 7, 3], [0, 4, 5, 1], [2, 3, 7, 6], [0, 1, 3, 2], [4, 6, 7, 5]]; // fixed along / out / up bit
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const avg = (v: V3[]): V3 => [0, 1, 2].map(k => v.reduce((s, x) => s + x[k], 0) / v.length) as V3;

/** Box faces in output space (meters, X = x, Y = up, Z = plan y), counter-clockwise seen from outside. */
function quads(b: Box3): { n: V3; v: V3[] }[] {
  const c = b.corners.map(([x, y, z]): V3 => [x / 1000, z / 1000, y / 1000]), mid = avg(c);
  return FACES.map(f => {
    let v = f.map(i => c[i]);
    let n = cross(sub(v[1], v[0]), sub(v[2], v[0]));
    if (dot(n, sub(avg(v), mid)) < 0) { v = [...v].reverse(); n = [-n[0], -n[1], -n[2]]; }
    return { n: unit(n), v };
  });
}

const num = (x: number) => (Math.abs(x) < 5e-5 ? 0 : x).toFixed(4);

/** OBJ + MTL text (the OBJ references `<name>.mtl`). */
export function toObj(boxes: Box3[], name: string): { obj: string; mtl: string } {
  const mtl = MATS.map(m => `newmtl ${m}\nKd ${MAT_COLORS[m].map(x => x.toFixed(3)).join(' ')}\nKa 0 0 0\nd 1\nillum 1\n`).join('\n');
  const lines = [`# Kroj - ${name}. Jedinice: metri, Y gore.`, `mtllib ${name}.mtl`];
  let vi = 1, ni = 1;
  boxes.forEach((b, i) => {
    lines.push(`o ${b.node}_${i + 1}`, `usemtl ${b.mat}`);
    for (const q of quads(b)) {
      for (const v of q.v) lines.push(`v ${v.map(num).join(' ')}`);
      lines.push(`vn ${q.n.map(num).join(' ')}`, `f ${[0, 1, 2, 3].map(k => `${vi + k}//${ni}`).join(' ')}`);
      vi += 4; ni += 1;
    }
  });
  return { obj: lines.join('\n') + '\n', mtl };
}

/** Binary glTF 2.0: a mesh per box, a parent node per element / wall, a material per role. */
export function toGlb(boxes: Box3[], sceneName: string): Uint8Array<ArrayBuffer> {
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  const accessors: object[] = [], meshes: object[] = [], nodes: { name: string; mesh?: number; children?: number[] }[] = [];
  const groups = new Map<string, number[]>();
  boxes.forEach((b, i) => {
    const p0 = pos.length * 4, n0 = nor.length * 4, i0 = idx.length * 2, mn: V3 = [Infinity, Infinity, Infinity], mx: V3 = [-Infinity, -Infinity, -Infinity];
    quads(b).forEach((q, k) => {
      for (const v of q.v) { pos.push(...v); nor.push(...q.n); v.forEach((x, j) => { mn[j] = Math.min(mn[j], x); mx[j] = Math.max(mx[j], x); }); }
      idx.push(4 * k, 4 * k + 1, 4 * k + 2, 4 * k, 4 * k + 2, 4 * k + 3);
    });
    const a = accessors.length;
    accessors.push({ bufferView: 0, byteOffset: p0, componentType: 5126, count: 24, type: 'VEC3', min: mn, max: mx },
      { bufferView: 1, byteOffset: n0, componentType: 5126, count: 24, type: 'VEC3' },
      { bufferView: 2, byteOffset: i0, componentType: 5123, count: 36, type: 'SCALAR' });
    meshes.push({ name: `${b.node}_${i + 1}`, primitives: [{ attributes: { POSITION: a, NORMAL: a + 1 }, indices: a + 2, material: MATS.indexOf(b.mat) }] });
    groups.set(b.node, [...(groups.get(b.node) ?? []), nodes.length]);
    nodes.push({ name: `${b.node}_${b.mat}_${i + 1}`, mesh: meshes.length - 1 });
  });
  const roots = [...groups].map(([name, children]) => (nodes.push({ name, children }), nodes.length - 1));
  const posB = new Float32Array(pos), norB = new Float32Array(nor), idxB = new Uint16Array(idx);
  const idxLen = Math.ceil(idxB.byteLength / 4) * 4;
  const bin = new Uint8Array(posB.byteLength + norB.byteLength + idxLen);
  bin.set(new Uint8Array(posB.buffer), 0); bin.set(new Uint8Array(norB.buffer), posB.byteLength); bin.set(new Uint8Array(idxB.buffer), posB.byteLength + norB.byteLength);
  const gltf = {
    asset: { version: '2.0', generator: 'Kroj' }, scene: 0, scenes: [{ name: sceneName, nodes: roots }], nodes, meshes, accessors,
    materials: MATS.map(m => ({ name: m, pbrMetallicRoughness: { baseColorFactor: [...MAT_COLORS[m], 1], metallicFactor: 0, roughnessFactor: 0.6 } })),
    buffers: [{ byteLength: bin.byteLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posB.byteLength, target: 34962 },
      { buffer: 0, byteOffset: posB.byteLength, byteLength: norB.byteLength, target: 34962 },
      { buffer: 0, byteOffset: posB.byteLength + norB.byteLength, byteLength: idxB.byteLength, target: 34963 },
    ],
  };
  let json = new TextEncoder().encode(JSON.stringify(gltf));
  const pad = (4 - (json.length % 4)) % 4;
  if (pad) { const j = new Uint8Array(json.length + pad).fill(0x20); j.set(json); json = j; }
  const glb = new Uint8Array(12 + 8 + json.length + 8 + bin.length), dv = new DataView(glb.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, glb.length, true);
  dv.setUint32(12, json.length, true); dv.setUint32(16, 0x4e4f534a, true); glb.set(json, 20);
  dv.setUint32(20 + json.length, bin.length, true); dv.setUint32(24 + json.length, 0x004e4942, true); glb.set(bin, 28 + json.length);
  return glb;
}
