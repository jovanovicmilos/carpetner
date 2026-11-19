// Orbit 3D scene (R3F) built from engine `sceneBoxes` — the same boxes the GLB/OBJ export writes.
// Opened by the camera presets on /3d; the default /3d view stays the isometric SVG (design reference).
// shortcut: installations are not drawn here, walls are translucent instead of hidden per camera side.
import { Edges, OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { MAT_COLORS, sceneBoxes, type Box3, type Mat3, type Project } from 'engine';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import * as THREE from 'three';

export type Cam = 'front' | 'top' | 'iso';
type Layers = { walls: boolean; carcass: boolean; fronts: boolean; tops: boolean };
const LAYER: Record<Mat3, keyof Layers> = {
  zid: 'walls', pod: 'walls', korpus: 'carcass', sokla: 'carcass', fronta: 'fronts', aparat: 'fronts', rerna: 'fronts', radna: 'tops',
};
// Quads of a box by corner index (along·4 + out·2 + up).
const QUADS = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];

function geometry(b: Box3) {
  // Plan mm (x, y, z up) → three meters (x, z, y), as the GLB writer.
  const v = b.corners.map(([x, y, z]) => [x / 1000, z / 1000, y / 1000]);
  const pos = QUADS.flatMap(([a, c, d, e]) => [a, c, d, a, d, e].flatMap(i => v[i]));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function Rig({ cam, box }: { cam: Cam; box: THREE.Box3 }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls?: { target: THREE.Vector3; update(): void } };
  useEffect(() => {
    const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length();
    const off = cam === 'top' ? [0, r * 1.3, 0.001] : cam === 'front' ? [0, 0, r * 1.2] : [r * 0.75, r * 0.6, r * 0.75];
    camera.position.set(c.x + off[0], c.y + off[1], c.z + off[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(c);
    if (controls) { controls.target.copy(c); controls.update(); }
  }, [cam, box, camera, controls]);
  return null;
}

export function SceneGL({ project, cam, solid, sel, onSel, layers }: {
  project: Project; cam: Cam; solid: boolean; sel: string | null; onSel: (id: string | null) => void; layers: Layers;
}) {
  const navigate = useNavigate();
  const parts = useMemo(() => sceneBoxes(project).map(b => ({ b, g: geometry(b), el: project.elements.find(e => e.label === b.node) })), [project]);
  const bounds = useMemo(() => {
    const bb = new THREE.Box3();
    for (const p of parts) { p.g.computeBoundingBox(); bb.union(p.g.boundingBox!); }
    return bb;
  }, [parts]);
  useEffect(() => () => parts.forEach(p => p.g.dispose()), [parts]);

  return (
    <Canvas className="s3-gl" gl={{ preserveDrawingBuffer: true }} camera={{ fov: 40, near: 0.05, far: 200 }} onPointerMissed={() => onSel(null)}>
      <color attach="background" args={['#E9E6DF']} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[4, 8, 6]} intensity={1.6} />
      {parts.filter(({ b }) => layers[LAYER[b.mat]]).map(({ b, g, el }, i) => {
        const wall = b.mat === 'zid', picked = el && el.id === sel && b.mat === 'fronta';
        const opacity = wall ? 0.3 : solid ? 1 : 0.35;
        return (
          <mesh key={i} geometry={g}
            onClick={el ? ev => { ev.stopPropagation(); onSel(el.id); } : undefined}
            onDoubleClick={el ? ev => { ev.stopPropagation(); navigate(`/element/${el.id}`); } : undefined}>
            <meshStandardMaterial color={picked ? '#E9B394' : new THREE.Color(...MAT_COLORS[b.mat])} roughness={0.8}
              transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} side={THREE.DoubleSide} />
            {!wall && b.mat !== 'pod' && <Edges color={picked ? '#B4440E' : '#1C1B19'} />}
          </mesh>
        );
      })}
      <OrbitControls makeDefault />
      <Rig cam={cam} box={bounds} />
    </Canvas>
  );
}
