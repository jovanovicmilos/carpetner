// The order package for a saw shop (Krojna lista "Šta šaljem", Poređenje inquiries / split orders):
// CSV for the saw shop program, an Excel workbook and the cut-list PDF, from the same project data.
import { cutListRows, generateParts, hardware, mergeParts, PRESETS, toCsv, worktops, type Project } from 'engine';

export interface PackageParts { parts: boolean; tops: boolean; hw: boolean }

export const fileSlug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');

export async function orderFiles(project: Project, what: PackageParts, base = `krojna-lista-${fileSlug(project.name) || 'projekat'}`): Promise<File[]> {
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  const rows = cutListRows(mergeParts(generateParts(project)), project.materials, project.unit);
  const tops = worktops(project, dims.worktopDepth, dims.worktopThickness), hw = hardware(project);
  const files: File[] = [];
  if (what.parts) files.push(new File(['﻿' + toCsv(rows)], `${base}.csv`, { type: 'text/csv;charset=utf-8' }));
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  if (what.parts) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Krojna lista');
  if (what.tops && tops.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Ploča', 'Zid', 'Dužina', 'Dubina', 'Debljina', 'Napomena'],
    ...tops.map(t => [t.id, t.wallId, t.length, t.depth, t.thickness, t.note ?? ''])]), 'Radne ploče');
  if (what.hw) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Šifra', 'Naziv', 'Količina', 'Jedinica', 'Elementi'],
    ...hw.map(h => [h.sku, h.name, h.qty, h.unit, h.elementIds.join(', ')])]), 'Okov');
  if (wb.SheetNames.length) files.push(new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer], `${base}.xlsx`,
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  if (what.parts || what.tops || what.hw) {
    const { cutListPdf } = await import('./cutListPdf');
    const bytes = await cutListPdf(project, { ...what, worktopDepth: dims.worktopDepth, worktopThickness: dims.worktopThickness, date: new Date() });
    files.push(new File([bytes as Uint8Array<ArrayBuffer>], `${base}.pdf`, { type: 'application/pdf' }));
  }
  return files;
}
