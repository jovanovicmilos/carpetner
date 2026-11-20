// PDF quote for the customer (Obračun → "Napravi PDF ponudu sa 3D slikom"): A4, 3D view of the kitchen, the elements,
// either only the total or the full breakdown, VAT and the appliances note. Numbers are the engine's `quote()`.
// shortcut: no workshop name / logo / customer data yet (they come with accounts, MVP 8).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Project, Quote, QuoteOptions } from 'engine';
import { KIND_NAME, ownName } from './labels';
import { INK, M, MUTED, pdfWriter } from './pdfKit';
import { realPalette } from './look';
import { useOfferImage } from './offerImage';
import { Iso } from './Scene3D';

const rsd = (p: number) => Math.round(p / 100).toLocaleString('sr-Latn');

/** The 3D screen's isometric view as PNG bytes (same drawing as /3d). */
async function isoPng(project: Project, worktopThickness: number): Promise<Uint8Array> {
  const svg = renderToStaticMarkup(createElement(Iso, {
    project, solid: true, inst: false, sel: null, onSel: () => {}, worktopThickness, pal: realPalette(project),
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
  const pdf = await pdfWriter(`Ponuda — ${project.name}`);
  const { doc, reg, bold, W, text, right, rule, room } = pdf; // pdf.y is the cursor

  // Header
  text('Ponuda', M, 24, bold);
  right(date.toLocaleDateString('sr-Latn'), W - M, 10, reg, MUTED);
  pdf.y -= 22;
  text(project.name, M, 12, reg, MUTED);
  pdf.y -= 16;
  rule(INK, 1);
  pdf.y -= 12;

  // 3D view (realistic look)
  // The picture from /3d "Slika za ponudu" when there is one, else a still of the realistic 3D view (WebGL); the isometric
  // drawing only when WebGL is not available.
  const shot = useOfferImage.getState().byProject[project.id] ?? await import('./SceneGL').then(m => m.renderStill(project, realPalette(project))).catch(() => null);
  const png = await doc.embedPng(shot ? new Uint8Array(await (await fetch(shot)).arrayBuffer()) : await isoPng(project, worktopThickness));
  const ih = Math.min(330, ((W - 2 * M) * png.height) / png.width), iw = (ih * png.width) / png.height;
  pdf.page.drawImage(png, { x: (W - iw) / 2, y: pdf.y - ih, width: iw, height: ih });
  pdf.y -= ih + 18;

  // Elements
  text('Elementi', M, 13, bold);
  pdf.y -= 16;
  const cols = [M, M + 50, M + 200];
  text('Oznaka', cols[0], 9, bold, MUTED); text('Vrsta', cols[1], 9, bold, MUTED); text('Širina × visina × dubina (mm)', cols[2], 9, bold, MUTED);
  pdf.y -= 6; rule(); pdf.y -= 12;
  for (const e of [...project.elements].sort((a, b) => a.label.localeCompare(b.label, 'sr', { numeric: true }))) {
    room(14);
    text(e.label, cols[0], 10, bold); text(KIND_NAME[e.kind] + ownName(e), cols[1]); text(`${e.width} × ${e.height} × ${e.depth}`, cols[2]);
    pdf.y -= 14;
  }
  pdf.y -= 8;

  // Breakdown (only when the workshop shows it)
  if (!onlyTotal) for (const [i, s] of q.sections.entries()) {
    room(60);
    text(`${i + 1} · ${s.title}`, M, 12, bold);
    pdf.y -= 16;
    text('Stavka', M, 9, bold, MUTED); right('Količina', W - M - 170, 9, bold, MUTED); right('Cena', W - M - 90, 9, bold, MUTED); right('Iznos', W - M, 9, bold, MUTED);
    pdf.y -= 6; rule(); pdf.y -= 12;
    for (const l of s.lines) {
      room(14);
      text(l.name.length > 52 ? l.name.slice(0, 51) + '…' : l.name, M); right(l.qty, W - M - 170); right(l.price, W - M - 90); right(rsd(l.amount), W - M);
      pdf.y -= 14;
    }
    rule(); pdf.y -= 13;
    text(`Ukupno ${i + 1}`, M, 10, bold); right(rsd(s.total), W - M, 10, bold);
    pdf.y -= 22;
  }

  // Totals
  room(130);
  rule(INK, 1); pdf.y -= 18;
  const row = (label: string, value: string, big = false) => {
    text(label, M + 250, big ? 13 : 10, big ? bold : reg, big ? INK : MUTED);
    right(value, W - M, big ? 13 : 10, big ? bold : reg);
    pdf.y -= big ? 22 : 15;
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
  pdf.y -= 4;
  row('Ukupno', `${rsd(q.total)} RSD`, true);
  pdf.y -= 6;
  room(20);
  text('Aparati (rerna, ploča, MSP, frižider, sudopera) nisu uključeni — kupac ih nabavlja.', M, 9, reg, MUTED);

  return pdf.save();
}
