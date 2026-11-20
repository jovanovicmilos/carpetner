// Orbit 3D scene (R3F) built from engine `sceneBoxes`.
// Technical (default): one box per carcass, plan colours, edges — the same boxes the GLB/OBJ export writes.
// Realistic (`real`, branch realistic-3d): detailed boards, handles, sink / hob (sceneBoxes detail), PBR materials with
// procedural wood, environment light, soft shadows, ambient occlusion; walls facing the camera are hidden (doll house).
// Textures: the material's look (Admin → Biblioteka → Materijali, materialLooks.ts) when it has a file, else a generated wood /
// flat colour. shortcut: colour maps only (no normal / roughness maps); no appliance models yet.
import { ContactShadows, Edges, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import { ceilingOver, interiorSide, MAT_COLORS, sceneBoxes, verticalRange, sideOf, wallGeoms, wallPoint, type Box3, type Mat3, type Project } from 'engine';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
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
function geometry(b: Box3) {
  const v = b.corners.map(([x, y, z]) => new THREE.Vector3(x / 1000, z / 1000, y / 1000));
  const pos: number[] = [], uv: number[] = [];
  for (const [a, c, d, e] of QUADS) {
    const e1 = v[c].clone().sub(v[a]).length(), e2 = v[e].clone().sub(v[a]).length(), swap = e2 > e1;
    const q = [[0, 0], [e1, 0], [e1, e2], [0, e2]].map(([s, t]) => (swap ? [t, s] : [s, t]));
    for (const i of [0, 1, 2, 0, 2, 3]) { const p = v[[a, c, d, e][i]]; pos.push(p.x, p.y, p.z); uv.push(...q[i]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

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
  const flat = (c: string, fb: string) => (c.startsWith('url') ? fb : c);
  return {
    korpus: m(pal.carcass, 0.75), fronta: m(flat(pal.front, '#C99E6E'), 0.55, 0, pal.front, 1.4), radna: m(flat(pal.worktop, '#BF9466'), 0.45, 0, pal.worktop, 1),
    zid: m(pal.wallA, 0.95), pod: m(flat(pal.floor, '#C8C6C1'), 0.55, 0, pal.floor, 0.4), sokla: m(pal.plinth, 0.7),
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
    const mesh = new THREE.Mesh(geometry(b), mats[b.mat]);
    mesh.castShadow = b.mat !== 'zid' && b.mat !== 'pod' && b.mat !== 'staklo'; mesh.receiveShadow = b.mat !== 'staklo';
    scene.add(mesh);
    return { b, mesh };
  });
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
  parts.forEach(p => p.mesh.geometry.dispose());
  Object.values(mats).forEach(m => { m.map?.dispose(); m.dispose(); });
  scene.environment.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
  return png;
}

/** Puts the camera at the chosen view; only when the view (or the controls) change, so clicks and edits keep the user's orbit. */
function Rig({ cam, camKey, box }: { cam: Cam; camKey: number; box: THREE.Box3 }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls?: { target: THREE.Vector3; update(): void } };
  const boxRef = useRef(box);
  boxRef.current = box;
  useEffect(() => {
    const box = boxRef.current;
    const c = box.getCenter(new THREE.Vector3()), off = camOffset(cam, box.getSize(new THREE.Vector3()).length());
    camera.position.set(c.x + off[0], c.y + off[1], c.z + off[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(c);
    if (controls) { controls.target.copy(c); controls.update(); }
  }, [cam, camKey, camera, controls]);
  return null;
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

export function SceneGL({ project, cam, camKey = 0, solid, sel, onSel, layers, real, night }: {
  project: Project; cam: Cam; camKey?: number; solid: boolean; sel: string | null; onSel: (id: string | null) => void; layers: Layers; real?: Palette; night?: boolean;
}) {
  const navigate = useNavigate();
  const parts = useMemo(() => sceneBoxes(project, 38, 600, !!real).map(b => ({ b, g: geometry(b), el: project.elements.find(e => e.label === b.node) })), [project, real]);
  const mats = useMemo(() => (real ? realMaterials(real) : null), [real]);
  // Units that stick through the ceiling / slope (attic): fronts shown red, like the check in Provera.
  const over = useMemo(() => new Set(project.elements.filter(e => verticalRange(e)[1] > (ceilingOver(project, e) ?? Infinity)).map(e => e.id)), [project]);
  const bounds = useMemo(() => {
    const bb = new THREE.Box3();
    for (const p of parts) if (p.b.mat !== 'zid' && p.b.mat !== 'pod') { p.g.computeBoundingBox(); bb.union(p.g.boundingBox!); }
    return bb;
  }, [parts]);
  useEffect(() => () => parts.forEach(p => p.g.dispose()), [parts]);
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
    <Canvas className="absolute inset-0 touch-none" shadows={!!real && !LOW} gl={{ preserveDrawingBuffer: true, antialias: true }} dpr={LOW ? [1, 1.5] : [1, 2]}
      camera={{ fov: real ? 35 : 40, near: 0.05, far: 200 }} onPointerMissed={() => onSel(null)}>
      <color attach="background" args={[night ? '#2B2A30' : '#E9E6DF']} />
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
        <DollHouse walls={walls} />
      </> : <>
        <ambientLight intensity={1.6} />
        <directionalLight position={[4, 8, 6]} intensity={1.6} />
      </>}
      {parts.filter(({ b }) => layers[LAYER[b.mat]]).map(({ b, g, el }, i) => {
        const wall = b.mat === 'zid', picked = el && el.id === sel && b.mat === 'fronta';
        const tint = picked ? '#E9B394' : el && over.has(el.id) && b.mat === 'fronta' ? OVER : null;
        const ref = wall && real ? wallRefs.current.get(parts.findIndex(p => p.g === g)) : undefined;
        if (mats) {
          return (
            <mesh key={i} ref={ref} geometry={g} castShadow={!wall && b.mat !== 'pod' && b.mat !== 'staklo'} receiveShadow={b.mat !== 'staklo'} material={tint ? undefined : mats[b.mat]}
              onClick={el ? ev => { ev.stopPropagation(); onSel(el.id); } : undefined}
              onDoubleClick={el ? ev => { ev.stopPropagation(); navigate(`/element/${el.id}`); } : undefined}>
              {tint && <meshStandardMaterial color={tint} roughness={0.6} />}
            </mesh>
          );
        }
        const opacity = wall ? 0.3 : solid ? 1 : 0.35;
        return (
          <mesh key={i} geometry={g}
            onClick={el ? ev => { ev.stopPropagation(); onSel(el.id); } : undefined}
            onDoubleClick={el ? ev => { ev.stopPropagation(); navigate(`/element/${el.id}`); } : undefined}>
            <meshStandardMaterial color={tint ?? new THREE.Color(...MAT_COLORS[b.mat])} roughness={0.8}
              transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} side={THREE.DoubleSide} />
            {!wall && b.mat !== 'pod' && <Edges color={picked ? '#B4440E' : '#1C1B19'} />}
          </mesh>
        );
      })}
      {real && !LOW && <EffectComposer multisampling={4}><N8AO aoRadius={0.35} intensity={2.2} distanceFalloff={0.6} quality="medium" /></EffectComposer>}
      <OrbitControls makeDefault />
      <Rig cam={cam} camKey={camKey} box={bounds} />
    </Canvas>
  );
}
