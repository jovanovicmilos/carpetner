// Shared PDF writer for Kroj documents (quote, cut list): A4 pages, Inter with Serbian letters, simple text / rule / page-break helpers.
// Inter is embedded whole: pdf-lib's OTF subsetting garbles the text (so a PDF is ~575 KB).
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import regularUrl from './assets/fonts/Inter-Regular.otf?url';
import semiboldUrl from './assets/fonts/Inter-SemiBold.otf?url';
import { BRAND } from './brand';

export const INK = rgb(0.11, 0.106, 0.098), MUTED = rgb(0.373, 0.353, 0.322), LINE = rgb(0.867, 0.847, 0.808);
export const A4 = { portrait: [595.28, 841.89], landscape: [841.89, 595.28] } as const;
export const M = 48;

export type Pdf = Awaited<ReturnType<typeof pdfWriter>>;

/** A document with a cursor `y` (top down); helpers draw at the cursor, `room()` starts a new page when space runs out. */
export async function pdfWriter(title: string, size: readonly [number, number] = A4.portrait) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [reg, bold] = await Promise.all([regularUrl, semiboldUrl].map(async u => doc.embedFont(await (await fetch(u)).arrayBuffer())));
  doc.setTitle(title);
  doc.setCreator(BRAND.name);
  const [W, H] = size;
  const w = {
    doc, reg, bold, W, H, y: H - M, page: doc.addPage([W, H]) as PDFPage,
    text(t: string, x: number, sz = 10, font: PDFFont = reg, color = INK) { w.page.drawText(t, { x, y: w.y, size: sz, font, color }); },
    right(t: string, x: number, sz = 10, font: PDFFont = reg, color = INK) { w.text(t, x - font.widthOfTextAtSize(t, sz), sz, font, color); },
    /** Text cut with "…" to `max` points wide. */
    fit(t: string, max: number, sz = 10, font: PDFFont = reg) {
      if (font.widthOfTextAtSize(t, sz) <= max) return t;
      while (t && font.widthOfTextAtSize(t + '…', sz) > max) t = t.slice(0, -1);
      return t + '…';
    },
    rule(color = LINE, t = 0.6) { w.page.drawLine({ start: { x: M, y: w.y }, end: { x: W - M, y: w.y }, thickness: t, color }); },
    /** New page when fewer than `need` points are left; returns true when it broke. */
    room(need: number) { if (w.y - need < M) { w.page = doc.addPage([W, H]); w.y = H - M; return true; } return false; },
    /** Page numbers "n / total" and the bytes. */
    async save() {
      const pages = doc.getPages();
      pages.forEach((p, i) => { const t = `${i + 1} / ${pages.length}`; p.drawText(t, { x: W - M - reg.widthOfTextAtSize(t, 8), y: 24, size: 8, font: reg, color: MUTED }); });
      return doc.save();
    },
  };
  return w;
}
