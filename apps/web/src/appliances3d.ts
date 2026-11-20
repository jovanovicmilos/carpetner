// Generic appliance models for the realistic 3D view (docs/3D.md "Generički aparati"): built-in oven, microwave, hood, glass hob,
// sink with tap. Own parametric models (user OK 2026-11-20 for free models; Poly Haven has no modern built-ins, so they are drawn
// here — no licence, always the niche's exact size). No brand. Plain three.js, so the live view and the PDF still share them.
import type { ApplianceSpot } from 'engine';
import * as THREE from 'three';

export type Finish = 'inox' | 'black' | 'white';
const FINISH: Record<Finish, [string, number, number]> = { inox: ['#C9CED3', 0.3, 0.9], black: ['#141416', 0.12, 0.4], white: ['#F2F2F0', 0.2, 0] };

/** One group per appliance, placed at its spot (mm → m). `sink` = colour of the sink and tap. */
export function applianceObject(s: ApplianceSpot, finish: Finish, sink: string): THREE.Group {
  const m = (color: string, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const [fc, fr, fm] = FINISH[finish];
  const front = m(fc, fr, fm), glass = m('#0C0D0F', 0.06, 0.3), inner = m('#24272B', 0.25, 0.4), body = m('#2A2C30', 0.6, 0.3);
  const steel = m(sink, 0.3, 0.85), bowl = m(new THREE.Color(sink).multiplyScalar(0.72).getStyle(), 0.35, 0.85), dark = m('#1A1B1D', 0.5, 0.2);
  const g = new THREE.Group();
  const box = (mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
    return mesh;
  };
  const cyl = (mat: THREE.Material, r: number, len: number, x: number, y: number, z: number, axis: 'x' | 'y' | 'z') => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), mat);
    mesh.position.set(x, y, z);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2; else if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true; g.add(mesh);
    return mesh;
  };
  const W = s.w / 1000, H = s.h / 1000, D = s.d / 1000;

  if (s.kind === 'oven' || s.kind === 'microwave') {
    box(body, W - 0.004, H - 0.004, D - 0.02, 0, H / 2, -D / 2);
    const strip = Math.min(0.1, H * 0.18);
    box(front, W, H, 0.02, 0, H / 2, 0.01);                                  // frame
    if (s.kind === 'oven') {
      box(front, W, strip, 0.004, 0, H - strip / 2, 0.022);                   // control strip
      for (const sx of [-1, 1]) cyl(front, 0.018, 0.02, sx * (W / 2 - 0.08), H - strip / 2, 0.034, 'z');
      box(glass, 0.12, 0.03, 0.002, 0, H - strip / 2, 0.025);                 // display
      const dh = H - strip - 0.02;
      box(glass, W - 0.03, dh, 0.004, 0, dh / 2 + 0.01, 0.022);               // door glass
      box(inner, W * 0.62, dh * 0.5, 0.002, 0, dh * 0.45, 0.025);             // window
      cyl(front, 0.008, W - 0.14, 0, H - strip - 0.035, 0.06, 'x');           // handle bar
      for (const sx of [-1, 1]) box(front, 0.012, 0.012, 0.036, sx * (W / 2 - 0.09), H - strip - 0.035, 0.042);
    } else {
      const dw = W * 0.7;
      box(glass, dw - 0.02, H - 0.03, 0.004, -W / 2 + dw / 2, H / 2, 0.022);  // door
      box(inner, dw * 0.7, (H - 0.03) * 0.6, 0.002, -W / 2 + dw / 2, H / 2, 0.025);
      cyl(front, 0.02, 0.02, W / 2 - (W - dw) / 2, H * 0.62, 0.03, 'z');      // knob
      box(glass, (W - dw) * 0.6, 0.025, 0.002, W / 2 - (W - dw) / 2, H * 0.8, 0.022);
    }
  } else if (s.kind === 'hood') {
    box(body, W - 0.004, H - 0.004, D - 0.02, 0, H / 2, -D / 2);
    box(glass, W, H, 0.02, 0, H / 2, 0.01);
    box(front, W, 0.012, 0.022, 0, 0.006, 0.011);                            // bottom edge
  } else if (s.kind === 'hob') {
    box(glass, W, 0.006, D, 0, 0.003, 0);
    const ring = (r: number, x: number, z: number) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0015, 6, 48), m('#5E6268', 0.4, 0.2));
      t.rotation.x = Math.PI / 2; t.position.set(x, 0.0065, z); g.add(t);
    };
    const cx = W * 0.24, cz = D * 0.22;
    ring(0.09, -cx, cz); ring(0.075, cx, cz); ring(0.075, -cx, -cz); ring(0.09, cx, -cz);
    box(m('#3A3D42', 0.3, 0.2), W * 0.4, 0.0005, 0.03, 0, 0.0063, D / 2 - 0.035); // touch strip
  } else if (s.kind === 'sink') {
    box(steel, W, 0.004, D, 0, 0.002, 0);                                    // rim
    box(bowl, W - 0.07, 0.002, D - 0.07, 0, 0.005, 0.01);                     // bowl (seen from above)
    cyl(dark, 0.035, 0.002, 0, 0.0065, 0.04, 'y');                            // drain
    const back = -D / 2 - 0.03;
    cyl(steel, 0.024, 0.04, 0, 0.02, back, 'y');                              // tap base
    cyl(steel, 0.013, 0.26, 0, 0.15, back, 'y');                              // riser
    const spout = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.011, 12, 32, Math.PI), steel);
    spout.rotation.y = -Math.PI / 2; spout.position.set(0, 0.28, back + 0.075); spout.castShadow = true; g.add(spout);
    cyl(steel, 0.011, 0.04, 0, 0.26, back + 0.15, 'y');                       // outlet
    box(steel, 0.012, 0.012, 0.08, 0.03, 0.2, back + 0.02);                   // lever
  }
  g.position.set(s.x / 1000, s.z / 1000, s.y / 1000);
  g.rotation.y = s.rot;
  return g;
}

export function disposeObject(o: THREE.Object3D) {
  o.traverse(c => { if (c instanceof THREE.Mesh) { c.geometry.dispose(); (c.material as THREE.Material).dispose(); } });
}
