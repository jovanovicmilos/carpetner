// Orbit 3D scene (R3F) built from engine `sceneBoxes`.
// Technical (default): one box per carcass, plan colours, edges — the same boxes the GLB/OBJ export writes.
// Realistic (`real`, branch realistic-3d): detailed boards, handles, sink / hob (sceneBoxes detail), PBR materials with
// procedural wood, environment light, soft shadows, ambient occlusion. In both views walls facing the camera are hidden (doll house).
// Textures: the material's look (Admin → Biblioteka → Materijali, materialLooks.ts) when it has a file, else a generated wood /
// flat colour. shortcut: colour maps only (no normal / roughness maps); no appliance models yet.
import { ContactShadows, Edges, Environment, Html, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import { applianceSpots, ceilingOver, interiorSide, MAT_COLORS, sceneBoxes, verticalRange, sideOf, wallGeoms, wallPoint, worktops, type Box3, type Mat3, type Project, type Worktop } from 'engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { applianceObject, disposeObject } from './appliances3d';
import { fmt, installationCard, INSTALLATION_MARK, KIND_NAME, ownName } from './labels';
import type { Palette } from './look';
import { lookOf, ROUGHNESS, textureUrl, useLooks } from './materialLooks';
import { useWorkshop } from './workshop';

export type Cam = 'front' | 'top' | 'iso';
type Layers = { walls: boolean; carcass: boolean; fronts: boolean; tops: boolean };
const LAYER: Record<Mat3, keyof Layers> = {
  zid: 'walls', pod: 'walls', staklo: 'walls', korpus: 'carcass', sokla: 'carcass', fronta: 'fronts', aparat: 'fronts', rerna: 'fronts', radna: 'tops', rucka: 'fronts',
};
// Quads of a box by corner index (along·4 + out·2 + up).
const QUADS = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];

/** Box → geometry in meters (plan x, y, z up → three x, z, y), with per-face UVs in meters, u along the longer edge (grain). */
function geometry(b: Box3, sills: number[] = []) {
  const v = b.corners.map(([x, y, z]) => new THREE.Vector3(x / 1000, z / 1000, y / 1000));
  const mid = v.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(v.length);
  const pos: number[] = [], uv: number[] = [];
  for (const [a, c, d, e] of QUADS) {
    const e1 = v[c].clone().sub(v[a]).length(), e2 = v[e].clone().sub(v[a]).length(), swap = e2 > e1;
    const q = [[0, 0], [e1, 0], [e1, e2], [0, e2]].map(([s, t]) => (swap ? [t, s] : [s, t]));
    // The plan → three axis swap mirrors some boxes: wind every face so it faces away from the box centre, otherwise the
    // front-side materials show the inside of the box (walls looked hollow, their tops missing).
    const n = v[c].clone().sub(v[a]).cross(v[d].clone().sub(v[a]));
    const out = n.dot(v[a].clone().add(v[d]).multiplyScalar(0.5).sub(mid)) >= 0;
    for (const i of out ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) { const p = v[[a, c, d, e][i]]; pos.push(p.x, p.y, p.z); uv.push(...q[i]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  // Walls: the top (cut) faces dark like a section, so a wall reads as solid with its thickness. Not the piece under a
  // window: its top is the sill, not a cut.
  if (b.mat === 'zid') {
    const n = g.getAttribute('normal'), top = Math.max(...b.corners.map(c => c[2])), cut = !sills.some(s => Math.abs(s - top) < 1);
    const col: number[] = [];
    for (let i = 0; i < n.count; i++) col.push(...(cut && n.getY(i) > 0.5 ? WALL_CUT : [1, 1, 1]));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  }
  return g;
}
const WALL_CUT = new THREE.Color('#5A5650').toArray() as [number, number, number]; // linear already (colour management)

/** Procedural wood (stripes with noise) or floor planks; `size` = meters one texture covers. */
function woodTexture(base: string, dark: string, planks = false) {
  const c = Object.assign(document.createElement('canvas'), { width: 512, height: 512 }), x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Soft wide streaks plus a few fine lines: grain without stripes.
  for (let i = 0; i < 40; i++) { x.globalAlpha = 0.04 + rnd() * 0.06; x.fillStyle = rnd() > 0.5 ? dark : '#FFFFFF'; x.fillRect(0, rnd() * 512, 512, 6 + rnd() * 26); }
  for (let i = 0; i < 70; i++) { x.globalAlpha = 0.05 + rnd() * 0.08; x.fillStyle = dark; x.fillRect(0, rnd() * 512, 512, 0.7); }
  x.globalAlpha = 1;
  if (planks) {
    x.fillStyle = dark; x.globalAlpha = 0.5;
    for (let i = 0; i < 4; i++) { x.fillRect(0, i * 128, 512, 1.5); x.fillRect((i * 197 + 60) % 512, i * 128, 1.5, 128); }
    x.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const WOOD: Record<string, [string, string]> = { 'url(#k-oak)': ['#C99E6E', '#9C7144'], 'url(#k-walnut)': ['#6E4C34', '#43291A'], 'url(#k-oakwt)': ['#BF9466', '#8E6438'], 'url(#k-floor)': ['#BFA081', '#8A6D50'] };

// Built-in appliance bodies (oven, microwave) in the workshop's finish (Admin → Biblioteka → Aparati).
const APPLIANCE = { inox: ['#C9CED3', 0.3, 0.9], black: ['#141416', 0.12, 0.4], white: ['#F2F2F0', 0.2, 0] } as const;

function realMaterials(pal: Palette): Record<Mat3, THREE.MeshStandardMaterial> {
  const m = (color: string, roughness: number, metalness = 0, tex?: string, repeat = 1) => {
    const w = tex && WOOD[tex];
    const map = w ? woodTexture(w[0], w[1], tex === 'url(#k-floor)') : undefined;
    map?.repeat.set(repeat, repeat);
    return new THREE.MeshStandardMaterial({ color: map ? '#FFFFFF' : color, map, roughness, metalness });
  };
  const app = APPLIANCE[useWorkshop.getState().applianceFinish];
  // Catalog wood decor without an image: generated grain in the decor's colour.
  const grained = (c: string) => {
    const dark = '#' + [1, 3, 5].map(i => Math.round(parseInt(c.slice(i, i + 2), 16) * 0.7).toString(16).padStart(2, '0')).join('');
    const map = woodTexture(c, dark); map.repeat.set(1.4, 1.4);
    return new THREE.MeshStandardMaterial({ color: '#FFFFFF', map, roughness: 0.55 });
  };
  const flat = (c: string, fb: string) => (c.startsWith('url') ? fb : c);
  return {
    korpus: m(pal.carcass, 0.75), fronta: pal.frontWood ? grained(pal.frontWood) : m(flat(pal.front, '#C99E6E'), 0.55, 0, pal.front, 1.4), radna: pal.worktopWood ? grained(pal.worktopWood) : m(flat(pal.worktop, '#BF9466'), 0.45, 0, pal.worktop, 1),
    zid: Object.assign(m(pal.wallA, 0.95), { vertexColors: true }), pod: m(flat(pal.floor, '#C8C6C1'), 0.55, 0, pal.floor, 0.4), sokla: m(pal.plinth, 0.7),
    aparat: m(pal.sink, 0.3, 0.85), rerna: m(app[0], app[1], app[2]), rucka: m(pal.handle, 0.35, 0.8),
    staklo: Object.assign(new THREE.MeshStandardMaterial({ color: '#CFE0F2', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.35, emissive: '#DDEBFA', emissiveIntensity: pal.night ? 0 : 0.6 })),
  };
}

/** Looks of the project's materials (finish → roughness, texture file → map with its real size); resolves when all are loaded. */
function applyLooks(mats: Record<Mat3, THREE.MeshStandardMaterial>, project: Project, looks: ReturnType<typeof useLooks.getState>['looks'], live = () => true) {
  const e0 = project.elements[0]?.materials;
  const keys: [Mat3, string | undefined][] = [['fronta', e0?.front], ['korpus', e0?.carcass], ['radna', `wt:${project.look?.worktop ?? 'Hrast'}`], ['pod', `floor:${project.look?.floor ?? 'Hrast parket'}`]];
  return Promise.all(keys.map(([mat, key]) => {
    if (!key) return null;
    const look = lookOf(looks, key), m = mats[mat];
    m.roughness = ROUGHNESS[look.finish];
    return textureUrl(key, look).then(url => (url ? new THREE.TextureLoader().loadAsync(url) : null)).then(t => {
      if (!t || !live()) return;
      const img = t.image as { width: number; height: number }, r = look.repeat ?? { w: 1000, h: 1000 };
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      // A portrait decor image has its grain vertical: turn it so the grain runs along the part length.
      const turn = look.grain === 'length' && img.height > img.width;
      t.repeat.set(1000 / (turn ? r.h : r.w), 1000 / (turn ? r.w : r.h));
      t.rotation = turn ? Math.PI / 2 : 0;
      m.map?.dispose(); m.map = t; m.color.set('#FFFFFF'); m.needsUpdate = true;
    }).catch(() => { /* colour stays */ });
  }));
}

/** Camera offset of a preset view for a scene of size `r` (m). */
const camOffset = (cam: Cam, r: number) => (cam === 'top' ? [0, r * 1.3, 0.001] : cam === 'front' ? [0, r * 0.15, r * 1.1] : [r * 0.75, r * 0.6, r * 0.75]);

/**
 * Still picture of the realistic view (iso camera, daylight, shadows, walls facing the camera hidden), drawn off screen —
 * for the PDF quote when no "Slika za ponudu" was taken. PNG data URL.
 * shortcut: room environment instead of the on-screen Lightformers and no ambient occlusion; close to the view, not identical.
 */
export async function renderStill(project: Project, pal: Palette, width = 1600, height = 1000): Promise<string> {
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer);
  scene.background = new THREE.Color('#FFFFFF');
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  scene.add(new THREE.AmbientLight('#FFFFFF', 0.35));
  const sun = new THREE.DirectionalLight('#FFF6EA', 2.2);
  sun.position.set(3, 6, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  scene.add(sun);

  const mats = realMaterials(pal);
  await applyLooks(mats, project, useLooks.getState().looks);
  const parts = sceneBoxes(project, 38, 600, true).map(b => {
    const mesh = new THREE.Mesh(geometry(b, project.room.openings.map(o => o.sill)), mats[b.mat]);
    mesh.castShadow = b.mat !== 'zid' && b.mat !== 'pod' && b.mat !== 'staklo'; mesh.receiveShadow = b.mat !== 'staklo';
    scene.add(mesh);
    return { b, mesh };
  });
  const apps = applianceSpots(project).map(sp => applianceObject(sp, useWorkshop.getState().applianceFinish, pal.sink));
  apps.forEach(o => scene.add(o));
  const box = new THREE.Box3();
  for (const p of parts) if (p.b.mat !== 'zid' && p.b.mat !== 'pod') box.expandByObject(p.mesh);
  const c = box.getCenter(new THREE.Vector3()), off = camOffset('iso', box.getSize(new THREE.Vector3()).length() * 1.15);
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.05, 200);
  camera.position.set(c.x + off[0], c.y + off[1], c.z + off[2]); camera.lookAt(c);
  // Doll house: walls whose room side faces away from the camera are left out.
  const geoms = wallGeoms(project.room), v = new THREE.Vector3();
  for (const g of Object.values(geoms)) {
    const sd = interiorSide(geoms, g.wall.id), n = new THREE.Vector3(-g.uy * sd, 0, g.ux * sd);
    const wc = new THREE.Vector3((g.ax + (g.ux * g.L) / 2) / 1000, 1.3, (g.ay + (g.uy * g.L) / 2) / 1000);
    const show = v.copy(camera.position).sub(wc).dot(n) > 0;
    for (const p of parts) if (p.b.node === `Zid_${g.wall.id}`) p.mesh.visible = show;
  }
  renderer.render(scene, camera);
  const png = renderer.domElement.toDataURL('image/png');
  parts.forEach(p => p.mesh.geometry.dispose()); apps.forEach(disposeObject);
  Object.values(mats).forEach(m => { m.map?.dispose(); m.dispose(); });
  scene.environment.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
  return png;
}

/** Puts the camera at the chosen view; only when the view (or the controls) change, so clicks and edits keep the user's orbit. */
function Rig({ cam, camKey, box, far = 1 }: { cam: Cam; camKey: number; box: THREE.Box3; far?: number }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls?: { target: THREE.Vector3; update(): void } };
  const boxRef = useRef(box);
  boxRef.current = box;
  useEffect(() => {
    const box = boxRef.current;
    const c = box.getCenter(new THREE.Vector3()), off = camOffset(cam, box.getSize(new THREE.Vector3()).length() * far);
    camera.position.set(c.x + off[0], c.y + off[1], c.z + off[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(c);
    if (controls) { controls.target.copy(c); controls.update(); }
  }, [cam, camKey, camera, controls, far]);
  return null;
}

/** Reports the placed camera once (after Rig's effect), in meters, three axes. */
function CamReport({ bounds, on }: { bounds: THREE.Box3; on: NonNullable<Parameters<typeof SceneGL>[0]['still']>['onCamera'] }) {
  const { camera } = useThree();
  useEffect(() => {
    const r = (v: THREE.Vector3) => v.toArray().map(n => Math.round(n * 1000) / 1000);
    on!({ position: r(camera.position), target: r(bounds.getCenter(new THREE.Vector3())), fov: (camera as THREE.PerspectiveCamera).fov });
  }, [camera, bounds, on]);
  return null;
}

/** Moves each board `d` mm along its thinnest axis, away from the centre of its unit (node); walls, floor and worktops stay. */
function explodeBoxes(boxes: Box3[], d: number): Box3[] {
  if (!d) return boxes;
  const mid = (cs: Box3['corners']) => [0, 1, 2].map(i => cs.reduce((s, c) => s + c[i], 0) / cs.length);
  const centre = new Map<string, number[]>();
  for (const n of new Set(boxes.map(b => b.node))) centre.set(n, mid(boxes.filter(b => b.node === n).flatMap(b => b.corners)));
  return boxes.map(b => {
    if (b.mat === 'zid' || b.mat === 'pod' || b.mat === 'radna') return b;
    const m = mid(b.corners), c = centre.get(b.node)!;
    // Thinnest direction among the box's three edges from corner 0 (along, out, up: corner indices 4, 2, 1).
    const edges = [4, 2, 1].map(i => b.corners[i].map((v, k) => v - b.corners[0][k]));
    const e = edges.reduce((a, x) => (Math.hypot(...x) < Math.hypot(...a) ? x : a)), len = Math.hypot(...e) || 1;
    const s = Math.sign(e.reduce((acc, v, k) => acc + v * (m[k] - c[k]), 0));
    return { ...b, corners: b.corners.map(p => p.map((v, k) => v + (s * d * e[k]) / len) as [number, number, number]) };
  });
}

/** Hides walls whose room side faces away from the camera (you look into the room over them). */
function DollHouse({ walls }: { walls: { mesh: React.RefObject<THREE.Mesh | null>[]; n: THREE.Vector3; c: THREE.Vector3 }[] }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    for (const w of walls) { const show = v.copy(camera.position).sub(w.c).dot(w.n) > 0; for (const r of w.mesh) if (r.current) r.current.visible = show; }
  });
  return null;
}

RectAreaLightUniformsLib.init();

/**
 * Quality of the realistic view: touch devices (iPad, phones) get no shadows, no ambient occlusion and a lower pixel ratio,
 * so the view stays smooth there; computers keep everything. Checked once per page load.
 */
const LOW = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

/** Under-cabinet LED (Veče): a glowing strip behind the front edge of every wall unit and a light shining down on the worktop. */
function Leds({ project }: { project: Project }) {
  const geoms = wallGeoms(project.room);
  return <>
    {project.elements.filter(e => e.kind === 'wall' && geoms[e.wallId]).map(e => {
      const g = geoms[e.wallId], side = sideOf(geoms, e);
      // 50 mm behind the front, centred on the unit; plan (x, y) → three (x, z), mm → m.
      const c = wallPoint(g, e.offset + e.width / 2, g.th / 2 + e.depth - 50, side);
      const len = (e.width - 40) / 1000, y = (e.elevation ?? 1450) / 1000 - 0.006, rotY = -Math.atan2(g.uy, g.ux);
      return (
        <group key={e.id} position={[c.x / 1000, y, c.y / 1000]} rotation-y={rotY}>
          <mesh><boxGeometry args={[len, 0.008, 0.012]} /><meshStandardMaterial color="#FFF1DA" emissive="#FFD9A0" emissiveIntensity={3} /></mesh>
          <rectAreaLight width={len} height={0.06} intensity={90} color="#FFD49A" rotation-x={-Math.PI / 2} position={[0, -0.005, 0]} />
        </group>
      );
    })}
  </>;
}

const OVER = '#E5806F'; // red tint of a unit that does not fit under the ceiling

export function SceneGL({ project, cam, camKey = 0, solid, sel, onSel, layers, real, night, noOpen, inst, still, explode = 0 }: {
  project: Project; cam: Cam; camKey?: number; solid: boolean; sel: string | null; onSel: (id: string | null) => void; layers: Layers; real?: Palette; night?: boolean; noOpen?: boolean;
  /** Fixed picture (site assets, /dev/site-assets): no orbit, background colour or transparent (null), camera reported once placed. */
  still?: { bg: string | null; far?: number; onCamera?: (c: { position: number[]; target: number[]; fov: number }) => void };
  /** Exploded view: every board moved this many mm along its thickness, away from its unit's centre. */
  explode?: number;
  /** Tehnički: installation marks on the walls (letters as in the plan); drawn over the scene like the isometric view. */
  inst?: boolean;
}) {
  const navigate = useNavigate();
  const parts = useMemo(() => explodeBoxes(sceneBoxes(project, 38, 600, !!real, true), explode).map(b => ({ b, g: geometry(b, project.room.openings.map(o => o.sill)), el: project.elements.find(e => e.label === b.node) })), [project, real, explode]);
  const mats = useMemo(() => (real ? realMaterials(real) : null), [real]);
  const finish = useWorkshop(s => s.applianceFinish);
  const apps = useMemo(() => (real ? applianceSpots(project).map(sp => applianceObject(sp, finish, real.sink)) : []), [project, real, finish]);
  useEffect(() => () => apps.forEach(disposeObject), [apps]);
  // Units that stick through the ceiling / slope (attic): fronts shown red, like the check in Provera.
  const over = useMemo(() => new Set(project.elements.filter(e => verticalRange(e)[1] > (ceilingOver(project, e) ?? Infinity)).map(e => e.id)), [project]);
  const bounds = useMemo(() => {
    const bb = new THREE.Box3();
    for (const p of parts) if (p.b.mat !== 'zid' && p.b.mat !== 'pod') { p.g.computeBoundingBox(); bb.union(p.g.boundingBox!); }
    return bb;
  }, [parts]);
  useEffect(() => () => parts.forEach(p => p.g.dispose()), [parts]);
  // The picked element's card sits over the middle of its top (user 2026-11-22: which unit it is, its size, front).
  const picked = sel ? project.elements.find(e => e.id === sel) : undefined;
  // A clicked wall shows its card too (user 2026-11-22: "Zid A ili Zid B"); local to the 3D view.
  const [wallSel, setWallSel] = useState<string | null>(null);
  const wallTop = useMemo(() => {
    const bb = new THREE.Box3();
    for (const p of parts) if (wallSel && p.b.node === `Zid_${wallSel}`) { p.g.computeBoundingBox(); bb.union(p.g.boundingBox!); }
    return bb.isEmpty() ? null : bb.getCenter(new THREE.Vector3()); // middle of the wall: its top is often at the edge of the view
  }, [parts, wallSel]);
  // A clicked worktop shows which cut-list worktop it is (user 2026-11-24: "kao za ostale elemente").
  const [topSel, setTopSel] = useState<string | null>(null);
  const topCard = useMemo(() => {
    const box = parts.find(p => p.b.node === topSel && p.b.mat === 'radna');
    if (!box) return null;
    const [c0, , , , c4] = box.b.corners, len = Math.hypot(c4[0] - c0[0], c4[1] - c0[1]);
    const wall = project.room.walls.find(w => topSel === `Radna_${w.id}` || new RegExp(`^Radna_${w.id}\\d+$`).test(topSel!));
    // the slab spans its run; the cut piece may be shorter (flush at a corner): closest length on that wall
    const top = worktops(project, 600, 38).filter(t => t.wallId === wall?.id).sort((a, b) => Math.abs(a.length - len) - Math.abs(b.length - len))[0];
    box.g.computeBoundingBox();
    const bb = box.g.boundingBox!;
    return top ? { top, at: new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2) } : null;
  }, [parts, topSel, project]);
  const pickedTop = useMemo(() => {
    const bb = new THREE.Box3();
    for (const p of parts) if (sel && p.el?.id === sel) { p.g.computeBoundingBox(); bb.union(p.g.boundingBox!); }
    return bb.isEmpty() ? null : new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2);
  }, [parts, sel]);
  useEffect(() => () => { if (mats) Object.values(mats).forEach(m => { m.map?.dispose(); m.dispose(); }); }, [mats]);
  // Looks: finish → roughness, texture file → map with its real size; grain follows the part length (UV u = longer edge).
  const looks = useLooks(s => s.looks);
  useEffect(() => {
    if (!mats) return;
    let live = true;
    applyLooks(mats, project, looks, () => live);
    return () => { live = false; };
  }, [mats, looks, project]);

  // Wall nodes: room-side normal and centre, for the doll-house view.
  const geoms = useMemo(() => wallGeoms(project.room), [project.room]);
  const wallRefs = useRef(new Map<number, React.RefObject<THREE.Mesh | null>>());
  const walls = useMemo(() => Object.values(geoms).map(g => {
    const sd = interiorSide(geoms, g.wall.id);
    const n = new THREE.Vector3(-g.uy * sd, 0, g.ux * sd); // plan (x, y) → three (x, z)
    const c = new THREE.Vector3((g.ax + (g.ux * g.L) / 2) / 1000, 1.3, (g.ay + (g.uy * g.L) / 2) / 1000);
    const mesh = parts.flatMap((p, i) => (p.b.node === `Zid_${g.wall.id}` ? [i] : [])).map(i => {
      if (!wallRefs.current.has(i)) wallRefs.current.set(i, { current: null });
      return wallRefs.current.get(i)!;
    });
    return { mesh, n, c };
  }), [geoms, parts]);

  return (
    <Canvas className="absolute inset-0 touch-none" shadows={!!real && !LOW} gl={{ preserveDrawingBuffer: true, antialias: true, alpha: still?.bg === null }} dpr={LOW ? [1, 1.5] : [1, 2]}
      camera={{ fov: real || still ? 35 : 40, near: 0.05, far: 200 }} onPointerMissed={() => { onSel(null); setWallSel(null); setTopSel(null); }}>
      {still?.bg !== null && <color attach="background" args={[still?.bg ?? (night ? '#2B2A30' : '#E9E6DF')]} />}
      {real ? <>
        <ambientLight intensity={night ? 0.15 : 0.35} />
        <directionalLight position={[3, 6, 5]} intensity={night ? 0.6 : 2.2} color={night ? '#FFD6A8' : '#FFF6EA'} castShadow
          shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
          shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
        {night && <pointLight position={[bounds.getCenter(new THREE.Vector3()).x, 1.35, bounds.getCenter(new THREE.Vector3()).z]} intensity={1.2} color="#FFC98A" distance={6} />}
        <Environment resolution={256} environmentIntensity={night ? 0.25 : 0.9}>
          <Lightformer intensity={2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
          <Lightformer intensity={1.2} position={[6, 2, 4]} rotation-y={-Math.PI / 3} scale={[6, 3, 1]} color="#FFF3E0" />
          <Lightformer intensity={0.6} position={[-6, 2, 4]} rotation-y={Math.PI / 3} scale={[6, 3, 1]} color="#E6EEFF" />
        </Environment>
        {night && <Leds project={project} />}
        {!LOW && <ContactShadows position={[bounds.getCenter(new THREE.Vector3()).x, 0.001, bounds.getCenter(new THREE.Vector3()).z]} scale={10} opacity={0.35} blur={2.5} far={1.2} />}
      </> : <>
        <ambientLight intensity={1.6} />
        <directionalLight position={[4, 8, 6]} intensity={1.6} />
      </>}
      {/* Both views: walls are solid; the ones between the camera and the room hide while orbiting (doll house). */}
      <DollHouse walls={walls} />
      {parts.filter(({ b, el }) => layers[el && b.mat === 'staklo' ? 'fronts' : LAYER[b.mat]]).map(({ b, g, el }, i) => {
        // Fronts tint when picked / over the ceiling; a vitrina's frame and glass ('aparat', 'staklo') with them.
        const face = b.mat === 'fronta' || (el?.front?.some(r => r.type === 'glass') && (b.mat === 'staklo' || b.mat === 'aparat'));
        const wall = b.mat === 'zid', picked = (el && el.id === sel && face) || (b.mat === 'radna' && b.node === topSel);
        const tint = picked ? '#E9B394' : el && over.has(el.id) && face ? OVER : null;
        const ref = wall ? wallRefs.current.get(parts.findIndex(p => p.g === g)) : undefined;
        // Walls hidden by the doll-house view let the click through to what is behind them.
        const pick = el ? (ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); onSel(el.id); setWallSel(null); setTopSel(null); }
          : wall ? (ev: ThreeEvent<MouseEvent>) => { if (!ev.object.visible) return; ev.stopPropagation(); onSel(null); setWallSel(b.node.slice(4)); setTopSel(null); }
          : b.mat === 'radna' ? (ev: ThreeEvent<MouseEvent>) => { ev.stopPropagation(); onSel(null); setWallSel(null); setTopSel(b.node); } : undefined;
        if (mats) {
          return (
            <mesh key={i} ref={ref} geometry={g} castShadow={!wall && b.mat !== 'pod' && b.mat !== 'staklo'} receiveShadow={b.mat !== 'staklo'} material={tint ? undefined : mats[b.mat]}
              onClick={pick}
              onDoubleClick={el && !noOpen ? ev => { ev.stopPropagation(); navigate(`/element/${el.id}`); } : undefined}>
              {tint && <meshStandardMaterial color={tint} roughness={0.6} transparent={b.mat === 'staklo'} opacity={b.mat === 'staklo' ? 0.6 : 1} />}
            </mesh>
          );
        }
        const opacity = b.mat === 'staklo' ? 0.35 : wall || solid ? 1 : 0.25;
        return (
          <mesh key={i} ref={ref} geometry={g}
            onClick={pick}
            onDoubleClick={el && !noOpen ? ev => { ev.stopPropagation(); navigate(`/element/${el.id}`); } : undefined}>
            <meshStandardMaterial color={tint ?? new THREE.Color(...MAT_COLORS[b.mat])} roughness={0.8} vertexColors={wall}
              transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} side={THREE.DoubleSide} />
            {b.mat !== 'pod' && <Edges color={wall ? '#A8A196' : picked ? '#2E6B4E' : '#1C1B19'} />}
          </mesh>
        );
      })}
      {layers.fronts && !explode && apps.map((o, i) => <primitive key={i} object={o} />)}
      {inst && project.room.installations.map(i => {
        const g = geoms[i.wallId];
        if (!g) return null;
        const p = wallPoint(g, i.offset, g.th / 2, sideOf(geoms, i));
        const [letter, bg, fg] = INSTALLATION_MARK[i.kind], c = installationCard(i, project.unit);
        return (
          <Html key={i.id} position={[p.x / 1000, i.height / 1000, p.y / 1000]} center zIndexRange={[10, 0]}>
            {/* Hover: what it is and where (user 2026-11-22). */}
            <span className="group relative block font-sans">
              <span aria-hidden="true" className="flex size-[18px] cursor-default items-center justify-center rounded-full border-[1.5px] border-solid border-white text-[10px] font-bold" style={{ background: bg, color: fg }}>{letter}</span>
              <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 hidden w-max max-w-[260px] -translate-x-1/2 rounded-md bg-dark px-2.5 py-2 text-[12.5px] leading-[1.45] text-white shadow-[0_6px_20px_rgba(0,0,0,0.25)] group-hover:block">
                <strong className="block">{c.title}</strong>{c.lines.map(l => <span key={l} className="block">{l}</span>)}
              </span>
            </span>
          </Html>
        );
      })}
      {wallSel && wallTop && geoms[wallSel] && (
        <Html position={wallTop} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div role="status" aria-label="Izabrani zid" style={{ transform: 'translateY(calc(-50% - 12px))' }}
            className="w-max max-w-[280px] rounded-lg bg-dark px-3 py-2 font-sans text-[13px] leading-snug text-white shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
            <div className="font-semibold">Zid {wallSel}</div>
            <div className="font-mono">{fmt(geoms[wallSel].inner, project.unit)} {project.unit} · debljina {fmt(geoms[wallSel].th, project.unit)}</div>
            <div className="text-on-dark-muted">Elemenata na zidu: {project.elements.filter(e => e.wallId === wallSel).length}
              {project.room.openings.some(o => o.wallId === wallSel) && ` · ${project.room.openings.filter(o => o.wallId === wallSel).map(o => (o.kind === 'window' ? 'prozor' : 'vrata')).join(', ')}`}</div>
          </div>
        </Html>
      )}
      {topCard && <TopCard top={topCard.top} at={topCard.at} unit={project.unit} />}
      {picked && pickedTop && (
        <Html position={pickedTop} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div role="status" aria-label="Izabrani element" style={{ transform: 'translateY(calc(-50% - 12px))' }}
            className="w-max max-w-[280px] rounded-lg bg-dark px-3 py-2 font-sans text-[13px] leading-snug text-white shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
            <div className="font-semibold">{picked.label} · {KIND_NAME[picked.kind].replace(/^./, c => c.toUpperCase())}{ownName(picked)}</div>
            <div className="font-mono">{fmt(picked.width, project.unit)} × {fmt(picked.height, project.unit)} × {fmt(picked.depth, project.unit)} {project.unit}</div>
            {project.materials[picked.materials.front] && <div className="text-on-dark-muted">Fronta: {project.materials[picked.materials.front].name}</div>}
            {picked.confirmedAt && <div className="text-accent-on-dark">✓ Konstrukcija potvrđena</div>}
            {!noOpen && <div className="text-on-dark-muted">Dvoklik: parametri elementa</div>}
          </div>
        </Html>
      )}
      {real && !LOW && <EffectComposer multisampling={4}><N8AO aoRadius={0.35} intensity={2.2} distanceFalloff={0.6} quality="medium" /></EffectComposer>}
      {!still && <OrbitControls makeDefault />}
      <Rig cam={cam} camKey={camKey} box={bounds} far={still?.far} />
      {still?.onCamera && <CamReport bounds={bounds} on={still.onCamera} />}
    </Canvas>
  );
}

const CUT_NAME = { sink: 'sudopera', hob: 'ploča za kuvanje' } as const;
/** Card over a clicked worktop: its cut-list id, size, corner joint and cut-outs. */
function TopCard({ top, at, unit }: { top: Worktop; at: THREE.Vector3; unit: Project['unit'] }) {
  return (
    <Html position={at} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div role="status" aria-label="Izabrana radna ploča" style={{ transform: 'translateY(calc(-50% - 12px))' }}
        className="w-max max-w-[280px] rounded-lg bg-dark px-3 py-2 font-sans text-[13px] leading-snug text-white shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
        <div className="font-semibold">{top.id} · Radna ploča · zid {top.wallId}</div>
        <div className="font-mono">{fmt(top.length, unit)} × {fmt(top.depth, unit)} × {fmt(top.thickness, unit)} {unit}</div>
        {top.note && <div className="text-on-dark-muted">{top.note.replace(/^./, c => c.toUpperCase())} (knap)</div>}
        {top.cutouts.length > 0 && <div className="text-on-dark-muted">Izrez: {top.cutouts.map(c => CUT_NAME[c.kind]).join(', ')}</div>}
      </div>
    </Html>
  );
}
