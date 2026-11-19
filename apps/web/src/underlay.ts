// Imported apartment plan shown under the 2D editor (docs/NACRTI_I_IZVOZ.md "Uvoz"): an image placed in plan mm.
// Kept outside the project (it is a drawing aid, not model data), persisted separately as `kroj-underlay`.
// Image or PDF (page 1): placed 5 m wide, calibrated by one measure. DXF: drawn 1:1 from its units, lines kept for snapping.
// shortcut: one underlay for the browser — tie it to the project with the backend.
import { parseDxf, type Seg } from 'engine';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** `segs`: DXF lines as fractions of the image (x / w, y / h), so they follow calibration and moving. */
export interface Underlay { src: string; x: number; y: number; w: number; h: number; opacity: number; segs?: Seg[] }

export const useUnderlay = create<{ underlay: Underlay | null; set: (u: Underlay | null) => void }>()(persist(
  set => ({ underlay: null, set: underlay => set({ underlay }) }),
  // A full localStorage (large image) must not break the app: the underlay then lives only until reload.
  { name: 'kroj-underlay', storage: createJSONStorage(() => ({
    getItem: k => { try { return localStorage.getItem(k); } catch { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* quota */ } },
    removeItem: k => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  })) },
));

/** Reads an image, PDF or DXF file. Throws a Serbian message for the user when the file cannot be used. */
export async function loadUnderlay(file: File): Promise<Underlay> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.dxf')) return dxfUnderlay(await file.text());
  const canvas = name.endsWith('.pdf') || file.type === 'application/pdf' ? await pdfPage(file) : await imageCanvas(file);
  const w = 5000;
  return { src: canvas.toDataURL('image/jpeg', 0.8), x: 0, y: 0, w, h: Math.round((w * canvas.height) / canvas.width), opacity: 0.5 };
}

/** White canvas ≤ 2000 px on the long side. */
function whiteCanvas(w: number, h: number) {
  const k = Math.min(1, 2000 / Math.max(w, h));
  const c = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) });
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, c.width, c.height);
  return { c, ctx, k };
}

async function imageCanvas(file: File) {
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { throw new Error('Ovaj fajl nije slika, PDF ni DXF.'); }
  const { c, ctx } = whiteCanvas(bmp.width, bmp.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

/** First page of a PDF plan as an image (pdf.js, loaded only here). */
async function pdfPage(file: File) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: 2000 / Math.max(base.width, base.height) });
  const { c, ctx } = whiteCanvas(vp.width, vp.height);
  await page.render({ canvas: c, canvasContext: ctx, viewport: vp }).promise;
  return c;
}

/** DXF line work drawn at its real size (units from $INSUNITS); placed with its top-left corner at the plan origin. */
function dxfUnderlay(text: string): Underlay {
  const d = parseDxf(text);
  const w = d.maxX - d.minX, h = d.maxY - d.minY;
  if (!d.segments.length || w <= 0 || h <= 0) throw new Error('U DXF fajlu nema linija koje Kroj čita (LINE, POLYLINE, ARC, CIRCLE).');
  const { c, ctx } = whiteCanvas(w, h);
  const px = c.width / w; // canvas px per mm
  ctx.strokeStyle = '#1C1B19'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of d.segments) { ctx.moveTo((x1 - d.minX) * px, (y1 - d.minY) * px); ctx.lineTo((x2 - d.minX) * px, (y2 - d.minY) * px); }
  ctx.stroke();
  // shortcut: up to 20 000 lines are kept for snapping (big architectural plans have more; they still show).
  const segs = d.segments.slice(0, 20000).map(([x1, y1, x2, y2]): Seg => [(x1 - d.minX) / w, (y1 - d.minY) / h, (x2 - d.minX) / w, (y2 - d.minY) / h]);
  return { src: c.toDataURL('image/png'), x: 0, y: 0, w: Math.round(w), h: Math.round(h), opacity: 0.6, segs };
}

/** DXF lines of the underlay in plan mm (after calibration / moving). */
export const underlaySegments = (u: Underlay): Seg[] =>
  (u.segs ?? []).map(([a, b, c, d]) => [u.x + a * u.w, u.y + b * u.h, u.x + c * u.w, u.y + d * u.h]);

/** Scale so the picked segment a–b measures `mm`, keeping point a fixed. */
export function calibrate(u: Underlay, a: { x: number; y: number }, b: { x: number; y: number }, mm: number): Underlay {
  const k = mm / Math.hypot(b.x - a.x, b.y - a.y);
  return { ...u, x: Math.round(a.x - (a.x - u.x) * k), y: Math.round(a.y - (a.y - u.y) * k), w: Math.round(u.w * k), h: Math.round(u.h * k) };
}
