// Project cut list (design/KrojnaLista.dc.html): grouped by material or by element, mm/cm, totals, CSV/XLSX export.
import {
  cutListRows, edgeCode, edgeTotals, format, generateParts, hardware, mergeParts, PRESETS, sheetEstimate, toCsv, worktops,
  type Part, type Unit,
} from 'engine';
import { useState } from 'react';
import { Navigate } from 'react-router';
import { Header } from './Header';
import { Tip } from './help';
import { KIND_NAME } from './labels';
import { useProject } from './store';

type Row = { key: string; name: string; who: string; qty: number; length: number; width: number; edges: Part['edges']; cutLength: number; cutWidth: number; note?: string };

const decimal = (n: number) => n.toLocaleString('sr-Latn', { maximumFractionDigits: 2 });
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export function CutList() {
  const { project, change } = useProject();
  const [view, setView] = useState<'material' | 'element'>('material');
  if (!project) return <Navigate to="/" replace />;

  const unit = project.unit;
  const f = (mm: number) => format(mm, unit);
  const parts = generateParts(project);
  const merged = mergeParts(parts);
  const sheets = sheetEstimate(parts, project.materials, project.rules);
  const edges = edgeTotals(parts, project.rules);
  const hw = hardware(project);
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  const tops = worktops(project, dims.worktopDepth, dims.worktopThickness);
  const pieces = parts.reduce((s, p) => s + p.qty, 0);
  const matName = (id: string) => project.materials[id]?.name ?? id;

  const groups: { title: string; rows: Row[] }[] = view === 'material'
    ? [...new Set(merged.map(m => m.materialId))].map(id => ({
      title: matName(id),
      rows: merged.filter(m => m.materialId === id).map((m, i) => ({ ...m, key: `${id}-${i}`, who: m.elementIds.join(', ') })),
    }))
    : project.elements.map(el => ({
      title: `${el.label} · ${KIND_NAME[el.kind]} ${el.width}`,
      rows: parts.filter(p => p.elementId === el.id).map(p => ({ ...p, key: p.pos, who: `${p.pos} · ${matName(p.materialId)}` })),
    })).filter(g => g.rows.length);

  const exportRows = () => cutListRows(merged, project.materials, unit);
  const fileBase = `krojna-lista-${slug(project.name) || 'projekat'}`;
  const exportCsv = () => download(`${fileBase}.csv`, '﻿' + toCsv(exportRows()), 'text/csv;charset=utf-8');
  const exportXlsx = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportRows()), 'Krojna lista');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Šifra', 'Naziv', 'Količina', 'Jedinica', 'Elementi'],
      ...hw.map(h => [h.sku, h.name, h.qty, h.unit, h.elementIds.join(', ')])]), 'Okov');
    XLSX.writeFile(wb, `${fileBase}.xlsx`);
  };

  return (
    <div className="app">
      <Header units />
      <main className="page">
        <div className="toolbar">
          <h1>Krojna lista projekta</h1>
          <span className="muted">{project.elements.length} elemenata · {pieces} delova · gotove mere sa kantom, u {unit}</span>
          <div className="toolbar-actions">
            <div role="group" aria-label="Prikaz" className="segmented">
              <button type="button" aria-pressed={view === 'material'} onClick={() => setView('material')}>Po materijalu</button>
              <button type="button" aria-pressed={view === 'element'} onClick={() => setView('element')}>Po elementu</button>
            </div>
          </div>
        </div>

        <section className="cards" aria-label="Zbir">
          {sheets.map(s => {
            const sheet = project.materials[s.materialId]?.sheet;
            return (
              <div key={s.materialId} className="card">
                <div className="muted small">{matName(s.materialId)}</div>
                <div className="big">{s.sheets} {s.sheets === 1 ? 'ploča' : s.sheets < 5 ? 'ploče' : 'ploča'}</div>
                <div className="mono small">{sheet ? `${sheet.l} × ${sheet.w} · ` : ''}{decimal(s.areaM2)} m² delova</div>
              </div>
            );
          })}
          <div className="card">
            <div className="muted small">Radna ploča {dims.worktopThickness} mm</div>
            <div className="big">{tops.length} kom</div>
            <div className="mono small">{tops.map(t => `${t.wallId} ${f(t.length)}`).join(' + ')} × {f(dims.worktopDepth)}</div>
          </div>
          <div className="card">
            <div className="muted small">Kant ukupno (+{Math.round(project.rules.edgeExtra * 100)}%)</div>
            <div className="big">{decimal(edges.reduce((s, e) => s + e.metersWithExtra, 0))} m</div>
            <div className="mono small">{edges.map(e => `${decimal(e.metersWithExtra)} m · ${e.edge.material} ${decimal(e.edge.thickness)}`).join(' + ')}</div>
          </div>
        </section>

        <section className="block">
          <div className="block-head">
            <h2 className="field-label">Delovi za sečenje i kantovanje<Tip k="cutList.parts" /></h2>
            <span className="muted small">D = duža ivica, K = kraća ivica{view === 'material' ? ' · istovetni delovi su spojeni' : ''}</span>
            <div className="toolbar-actions">
              <button type="button" onClick={exportCsv}>Preuzmi CSV (pilana)</button>
              <button type="button" onClick={exportXlsx}>Preuzmi Excel</button>
            </div>
          </div>
          {groups.map(g => (
            <div key={g.title} className="table-wrap">
              <table>
                <caption>{g.title} <span className="muted small">· {g.rows.reduce((s, r) => s + r.qty, 0)} kom</span></caption>
                <thead>
                  <tr>
                    <th scope="col">Deo</th>
                    <th scope="col">{view === 'material' ? 'Elementi' : 'Poz. · materijal'}</th>
                    <th scope="col" className="num">Kom</th>
                    <th scope="col" className="num">Dužina</th>
                    <th scope="col" className="num">Širina</th>
                    <th scope="col">Kant</th>
                    <th scope="col" className="num">Za sečenje</th>
                    <th scope="col">Napomena</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map(r => (
                    <tr key={r.key}>
                      <td>{r.name}</td>
                      <td className="small">{r.who}</td>
                      <td className="num">{r.qty}</td>
                      <td className="num">{f(r.length)}</td>
                      <td className="num">{f(r.width)}</td>
                      <td className="mono">{edgeCode(r.edges)}</td>
                      <td className="num">{f(r.cutLength)} × {f(r.cutWidth)}</td>
                      <td className="small">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>

        <section className="block">
          <h2>Okov i repro materijal</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Stavka</th><th scope="col" className="num">Količina</th><th scope="col">Elementi</th></tr></thead>
              <tbody>
                {hw.map(h => (
                  <tr key={h.sku}><td>{h.name}</td><td className="num">{h.qty} {h.unit}</td><td className="small">{h.elementIds.join(', ')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">Klamerice za leđa, sokla i zidna lajsna još se ne računaju.</p>
        </section>
      </main>
    </div>
  );
}
