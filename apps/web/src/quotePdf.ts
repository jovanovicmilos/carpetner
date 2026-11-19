// PDF quote for the customer (Obračun → "Napravi PDF ponudu sa 3D slikom"): A4, 3D view of the kitchen, the elements,
// either only the total or the full breakdown, VAT and the appliances note. Numbers are the engine's `quote()`.
// shortcut: no workshop name / logo / customer data yet (they come with accounts, MVP 8); the quote is not frozen.
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Project, Quote, QuoteOptions } from 'engine';
import regularUrl from './assets/fonts/Inter-Regular.otf?url';
import semiboldUrl from './assets/fonts/Inter-SemiBold.otf?url';
import { KIND_NAME, ownName } from './labels';
import { Iso } from './Scene3D';

const rsd = (p: number) => Math.round(p / 100).toLocaleString('sr-Latn');
const INK = rgb(0.11, 0.106, 0.098), MUTED = rgb(0.373, 0.353, 0.322), LINE = rgb(0.867, 0.847, 0.808);
const W = 595.28, H = 841.89, M = 48;

/** The 3D screen's isometric view as PNG bytes (same drawing as /3d). */
async function isoPng(project: Project, worktopThickness: number): Promise<Uint8Array> {
  const svg = renderToStaticMarkup(createElement(Iso, {
    project, solid: true, inst: false, sel: null, onSel: () => {}, worktopThickness,
    layers: { walls: true, carcass: true, fronts: true, tops: true, dims: false },
  })).replace('<svg ', '<svg width="1480" height="1600" ');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = Object.assign(document.createElement('canvas'), { width: 1480, height: 1600 });
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0);
  // Crop to the drawn pixels (+ 20 px), so the image has no empty band.
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let yy = 0; yy < c.height; yy += 2) for (let xx = 0; xx < c.width; xx += 2) {
    const i = (yy * c.width + xx) * 4;
    if (px[i] < 245 || px[i + 1] < 245 || px[i + 2] < 245) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
  }
  const pad = 20, cw = Math.min(c.width, x1 + pad) - Math.max(0, x0 - pad), ch = Math.min(c.height, y1 + pad) - Math.max(0, y0 - pad);
  const out = Object.assign(document.createElement('canvas'), { width: Math.max(1, cw), height: Math.max(1, ch) });
  out.getContext('2d')!.drawImage(c, -Math.max(0, x0 - pad), -Math.max(0, y0 - pad));
  const blob = await new Promise<Blob>(r => out.toBlob(b => r(b!), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function quotePdf({ project, q, opt, onlyTotal, worktopThickness, date }: {
  project: Project; q: Quote; opt: QuoteOptions; onlyTotal: boolean; worktopThickness: number; date: Date;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [reg, bold] = await Promise.all([regularUrl, semiboldUrl].map(async u => doc.embedFont(await (await fetch(u)).arrayBuffer())));
  doc.setTitle(`Ponuda — ${project.name}`);
  doc.setCreator('Kroj');

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const text = (t: string, x: number, size = 10, font: PDFFont = reg, color = INK) => page.drawText(t, { x, y, size, font, color });
  const right = (t: string, x: number, size = 10, font: PDFFont = reg, color = INK) => text(t, x - font.widthOfTextAtSize(t, size), size, font, color);
  const rule = (color = LINE, t = 0.6) => page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: t, color });
  /** New page when fewer than `need` points are left. */
  const room = (need: number) => { if (y - need < M) { page = doc.addPage([W, H]); y = H - M; } };

  // Header
  text('Ponuda', M, 24, bold);
  right(date.toLocaleDateString('sr-Latn'), W - M, 10, reg, MUTED);
  y -= 22;
  text(project.name, M, 12, reg, MUTED);
  y -= 16;
  rule(INK, 1);
  y -= 12;

  // 3D view
  const png = await doc.embedPng(await isoPng(project, worktopThickness));
  const ih = Math.min(330, ((W - 2 * M) * png.height) / png.width), iw = (ih * png.width) / png.height;
  page.drawImage(png, { x: (W - iw) / 2, y: y - ih, width: iw, height: ih });
  y -= ih + 18;

  // Elements
  text('Elementi', M, 13, bold);
  y -= 16;
  const cols = [M, M + 50, M + 200];
  text('Oznaka', cols[0], 9, bold, MUTED); text('Vrsta', cols[1], 9, bold, MUTED); text('Širina × visina × dubina (mm)', cols[2], 9, bold, MUTED);
  y -= 6; rule(); y -= 12;
  for (const e of [...project.elements].sort((a, b) => a.label.localeCompare(b.label, 'sr', { numeric: true }))) {
    room(14);
    text(e.label, cols[0], 10, bold); text(KIND_NAME[e.kind] + ownName(e), cols[1]); text(`${e.width} × ${e.height} × ${e.depth}`, cols[2]);
    y -= 14;
  }
  y -= 8;

  // Breakdown (only when the workshop shows it)
  if (!onlyTotal) for (const [i, s] of q.sections.entries()) {
    room(60);
    text(`${i + 1} · ${s.title}`, M, 12, bold);
    y -= 16;
    text('Stavka', M, 9, bold, MUTED); right('Količina', W - M - 170, 9, bold, MUTED); right('Cena', W - M - 90, 9, bold, MUTED); right('Iznos', W - M, 9, bold, MUTED);
    y -= 6; rule(); y -= 12;
    for (const l of s.lines) {
      room(14);
      text(l.name.length > 52 ? l.name.slice(0, 51) + '…' : l.name, M); right(l.qty, W - M - 170); right(l.price, W - M - 90); right(rsd(l.amount), W - M);
      y -= 14;
    }
    rule(); y -= 13;
    text(`Ukupno ${i + 1}`, M, 10, bold); right(rsd(s.total), W - M, 10, bold);
    y -= 22;
  }

  // Totals
  room(130);
  rule(INK, 1); y -= 18;
  const row = (label: string, value: string, big = false) => {
    text(label, M + 250, big ? 13 : 10, big ? bold : reg, big ? INK : MUTED);
    right(value, W - M, big ? 13 : 10, big ? bold : reg);
    y -= big ? 22 : 15;
  };
  if (!onlyTotal) {
    row('Materijal i pilana', rsd(q.material));
    row('Okov i repro', rsd(q.hardware));
    row('Rad', rsd(q.labour));
    row(`Marža ${opt.marginPct}%`, rsd(q.margin));
  }
  if (q.discount > 0) row(`Popust ${opt.discountPct}%`, `−${rsd(q.discount)}`);
  row('Bez PDV-a', `${rsd(q.net)} RSD`);
  row(`PDV ${opt.vatPct}%`, `${rsd(q.vat)} RSD`);
  y -= 4;
  row('Ukupno', `${rsd(q.total)} RSD`, true);
  y -= 6;
  room(20);
  text('Aparati (rerna, ploča, MSP, frižider, sudopera) nisu uključeni — kupac ih nabavlja.', M, 9, reg, MUTED);

  // Page numbers
  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(`${i + 1} / ${pages.length}`, { x: W - M - reg.widthOfTextAtSize(`${i + 1} / ${pages.length}`, 8), y: 24, size: 8, font: reg, color: MUTED }));
  return doc.save();
}
