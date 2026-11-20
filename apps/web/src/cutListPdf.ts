// Cut list PDF for the saw shop (Krojna lista → "Preuzmi PDF / Excel" and sending): A4 landscape, parts merged per material
// with edges and cut sizes, edge order meters, worktops with cutouts, hardware — the parts the user ticked in "Šta šaljem".
import {
  edgeCode, edgeTotals, format, generateParts, hardware, mergeParts, sheetEstimate, worktops, type Project,
} from 'engine';
import { A4, INK, M, MUTED, pdfWriter } from './pdfKit';

export interface CutListPdfOptions { parts: boolean; tops: boolean; hw: boolean; worktopDepth: number; worktopThickness: number; date: Date }

export async function cutListPdf(project: Project, o: CutListPdfOptions): Promise<Uint8Array> {
  const pdf = await pdfWriter(`Krojna lista — ${project.name}`, A4.landscape);
  const { reg, bold, W, text, right, rule, room, fit } = pdf;
  const u = project.unit, f = (mm: number) => format(mm, u);
  const parts = generateParts(project), merged = mergeParts(parts);
  const sheets = sheetEstimate(parts, project.materials, project.rules);
  const matName = (id: string) => project.materials[id]?.name ?? id;
  const pieces = parts.reduce((s, p) => s + p.qty, 0);

  text('Krojna lista', M, 22, bold);
  right(o.date.toLocaleDateString('sr-Latn'), W - M, 10, reg, MUTED);
  pdf.y -= 20;
  text(`${project.name} · ${project.elements.length} elemenata · ${pieces} delova · mere u ${u === 'mm' ? 'milimetrima' : 'centimetrima'}, gotove mere sa kantom`, M, 11, reg, MUTED);
  pdf.y -= 12; rule(INK, 1); pdf.y -= 22;

  const head = (t: string, extra?: string) => {
    room(70);
    text(t, M, 13, bold);
    if (extra) right(extra, W - M, 10, reg, MUTED);
    pdf.y -= 16;
  };

  if (o.parts) {
    // Columns: Deo | Elementi | Kom | Dužina | Širina | Kant | Za sečenje | Napomena
    const X = { name: M, who: M + 190, qty: M + 340, len: M + 400, wid: M + 455, edge: M + 470, cut: M + 612, note: M + 627 };
    const header = () => {
      for (const [t, x, r] of [['Deo', X.name], ['Elementi', X.who], ['Kom', X.qty, 1], [`Dužina`, X.len, 1], ['Širina', X.wid, 1], ['Kant', X.edge], ['Za sečenje', X.cut, 1], ['Napomena', X.note]] as [string, number, number?][])
        (r ? right : text)(t, x, 8.5, bold, MUTED);
      pdf.y -= 6; rule(); pdf.y -= 12;
    };
    for (const s of sheets) {
      const rows = merged.filter(m => m.materialId === s.materialId);
      if (!rows.length) continue;
      head(matName(s.materialId), `${s.sheets.toLocaleString('sr-Latn')} ${s.sheets === 1 ? 'ploča' : s.sheets < 5 ? 'ploče' : 'ploča'} · ${rows.reduce((a, r) => a + r.qty, 0)} kom`);
      header();
      const grain = project.rules.followGrain && project.materials[s.materialId]?.grain;
      for (const r of rows) {
        if (room(14)) header();
        text(fit(r.name, X.who - X.name - 8), X.name); text(fit(r.elementIds.join(' '), X.qty - X.who - 34, 9), X.who, 9, reg, MUTED);
        right(String(r.qty), X.qty, 10, bold); right(f(r.length), X.len); right(f(r.width), X.wid);
        text(edgeCode(r.edges, project.rules), X.edge, 9); right(`${f(r.cutLength)} × ${f(r.cutWidth)}`, X.cut, 9, reg, MUTED);
        text(fit(r.note ?? (grain ? 'šara ↑' : ''), W - M - X.note, 9), X.note, 9);
        pdf.y -= 14;
      }
      pdf.y -= 12;
    }
    head('Kant za naručivanje');
    for (const e of edgeTotals(parts, project.rules)) {
      room(14);
      text(`${e.edge.material} · ${String(e.edge.thickness).replace('.', ',')} mm`, M); right(`${e.orderMeters} m`, M + 330, 10, bold);
      pdf.y -= 14;
    }
    pdf.y -= 12;
  }

  if (o.tops) {
    const tops = worktops(project, o.worktopDepth, o.worktopThickness);
    if (tops.length) {
      head('Radne ploče');
      for (const t of tops) {
        room(14);
        text(t.id, M, 10, bold); text(`zid ${t.wallId}`, M + 60, 10, reg, MUTED);
        text(`${f(t.length)} × ${f(t.depth)} × ${f(t.thickness)} ${u}`, M + 120);
        text(fit([t.note, ...t.cutouts.map(c => `izrez ${c.kind === 'sink' ? 'sudopera' : 'ploča'} ${f(c.w)} × ${f(c.h)}, centar ${'centerFromLeft' in c ? `${f(c.centerFromLeft)} od levog kraja` : `${f(c.centerFromJoint)} od spoja`} / ${f(c.centerFromFront)} od prednje ivice`)].filter(Boolean).join(' · '), W - M - (M + 320), 9), M + 320, 9);
        pdf.y -= 14;
      }
      pdf.y -= 12;
    }
  }

  if (o.hw) {
    head('Okov i repro materijal');
    for (const h of hardware(project)) {
      room(14);
      text(fit(h.name, 300), M); right(`${h.qty} ${h.unit}`, M + 380, 10, bold);
      text(fit(h.elementIds.join(' '), W - M - (M + 400), 9), M + 400, 9, reg, MUTED);
      pdf.y -= 14;
    }
  }
  return pdf.save();
}
