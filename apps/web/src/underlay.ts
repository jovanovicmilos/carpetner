// Imported apartment plan shown under the 2D editor (docs/NACRTI_I_IZVOZ.md "Uvoz"): an image placed in plan mm.
// Kept outside the project (it is a drawing aid, not model data), persisted separately as `kroj-underlay`.
// shortcut: one underlay for the browser, images only (PDF/DXF underlays not read yet) — tie it to the project with the backend.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Underlay { src: string; x: number; y: number; w: number; h: number; opacity: number }

export const useUnderlay = create<{ underlay: Underlay | null; set: (u: Underlay | null) => void }>()(persist(
  set => ({ underlay: null, set: underlay => set({ underlay }) }),
  // A full localStorage (large image) must not break the app: the underlay then lives only until reload.
  { name: 'kroj-underlay', storage: createJSONStorage(() => ({
    getItem: k => { try { return localStorage.getItem(k); } catch { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* quota */ } },
    removeItem: k => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  })) },
));

/** Reads an image file, scales it to ≤ 2000 px as JPEG and places it 5 m wide at the plan origin (calibrate after). */
export async function loadUnderlay(file: File): Promise<Underlay> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const w = 5000;
  return { src: c.toDataURL('image/jpeg', 0.8), x: 0, y: 0, w, h: Math.round((w * bmp.height) / bmp.width), opacity: 0.5 };
}

/** Scale so the picked segment a–b measures `mm`, keeping point a fixed. */
export function calibrate(u: Underlay, a: { x: number; y: number }, b: { x: number; y: number }, mm: number): Underlay {
  const k = mm / Math.hypot(b.x - a.x, b.y - a.y);
  return { ...u, x: Math.round(a.x - (a.x - u.x) * k), y: Math.round(a.y - (a.y - u.y) * k), w: Math.round(u.w * k), h: Math.round(u.h * k) };
}
