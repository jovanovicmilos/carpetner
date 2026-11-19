// Project cut list, laid out as design/screens/KrojnaLista.html: sheet / worktop / edge cards, parts by material (or element),
// hardware, appliances and niches, first-sheet cutting layout, order panel (CSV + Excel + PDF: download, e-mail, Viber / WhatsApp).
import {
  accessories, edgeCode, edgeTotals, firstSheet, format, generateParts, hardware, mergeParts, PRESETS, sheetEstimate, worktops,
  type Element, type HardwareLine, type Part,
} from 'engine';
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Header } from './Header';
import { Tip } from './help';
import { KIND_NAME, ownName } from './labels';
import { useProject } from './store';
import { downloadFiles, useShare } from './share';
import { fileSlug, orderFiles } from './orderPackage';

type Row = { key: string; name: string; who: string; qty: number; length: number; width: number; edges: Part['edges'] };
type Slot = keyof Element['materials'];

const decimal = (n: number, d = 2) => n.toLocaleString('sr-Latn', { maximumFractionDigits: d, minimumFractionDigits: d === 1 ? 1 : 0 });
const ROLE: Record<Slot, string> = { carcass: 'korpus', front: 'fronte', back: 'poleđina', drawerBottom: 'podovi fioka' };
const sheetsWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'ploča' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'ploče' : 'ploča');
const partsWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'deo' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'dela' : 'delova');
// shortcut: niche and cutout sizes are typical catalogue values until appliances have their own data (design: "iz kataloga aparata").
const APPLIANCES: [Element['kind'], (e: Element) => [string, string][]][] = [
  ['oven', e => [[`Ugradna rerna · ${e.label}`, 'niša 560 × 595'], [`Ugradna ploča 60 · ${e.label}`, 'izrez [PO MODELU]']]],
  ['appliance-front', e => [[`Ugradna MSP 60 · ${e.label}`, 'niša 600 × 820']]],
  ['tall', e => [[`Ugradni frižider · ${e.label}`, 'niša 560 × 1780']]],
  ['sink', e => [[`Sudopera 1 korito · ${e.label}`, 'izrez [PO MODELU]']]],
];

/** Hardware lines as the design lists them (hinge + plate, legs + clips…). */
function hardwareRows(hw: HardwareLine[]): [string, string][] {
  const q = (sku: string) => hw.filter(h => h.sku === sku || h.sku.startsWith(sku + '-')).reduce((s, h) => s + h.qty, 0);
  const legs = hw.find(h => h.sku.startsWith('nogica-'));
  const drawers = hw.find(h => h.sku.startsWith('fioka-komplet-'));
  const rows: [string, string, number][] = [
    [`${hw.find(h => h.sku.startsWith('sarka'))?.name ?? 'Šarka'} + pločica`, `${q('sarka')} kpl`, q('sarka')],
    [`Fioka komplet, vodilice ${drawers?.sku.split('-').at(-1)} mm`, `${drawers?.qty} kpl`, drawers?.qty ?? 0],
    [`${legs?.name.replace(', podesiva', '')} + klipsa za soklu`, `${legs?.qty} + ${q('klipsa-sokla')}`, legs?.qty ?? 0],
    ['Nosač faha', `${q('nosac-police')} kom`, q('nosac-police')],
    ['Vešaljka za gornji element (par)', `${q('vesaljka-par')} para`, q('vesaljka-par')],
    ...hw.filter(h => /^(rucka|profil-vrh|potiskivac|kip-|alu-ram)/.test(h.sku)).map((h): [string, string, number] => [h.name, `${String(h.qty).replace('.', ',')} ${h.unit}`, h.qty]),
    ['Tipl 8 × 35', `${q('tipl-8x35')} kom`, q('tipl-8x35')],
    ['Konfirmat 7 × 50', `${q('konfirmat-7x50')} kom`, q('konfirmat-7x50')],
    ['Ekscentar 15 mm (kućište + klin)', `${q('ekscentar-15')} kom`, q('ekscentar-15')],
    ['Šraf 3,5 × 16', `${q('sraf-3.5x16')} kom`, q('sraf-3.5x16')],
    ['Klamerica za poleđinu', `${q('klamerica')} kom`, q('klamerica')],
    ['Aluminijumska podloga za sudoperu', `${q('alu-podloga-sudopera')} kom`, q('alu-podloga-sudopera')],
  ];
  return rows.filter(r => r[2] > 0).map(([a, b]) => [a, b]);
}

export function CutList() {
  const { project } = useProject();
  const [view, setView] = useState<'material' | 'element'>('material');
  const [send, setSend] = useState({ parts: true, tops: true, hw: true, labels: false });
  const [busy, setBusy] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const { share, ready, retry } = useShare();
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
  const acc = accessories(project, dims.worktopDepth, dims.worktopThickness);
  const pieces = parts.reduce((s, p) => s + p.qty, 0);
  const matName = (id: string) => project.materials[id]?.name ?? id;

  // Materials in slot order (carcass, front, back, drawer bottoms), each with the role it plays.
  const slots: [string, Slot][] = [];
  for (const slot of ['carcass', 'front', 'back', 'drawerBottom'] as Slot[])
    for (const el of project.elements) {
      const id = el.materials[slot];
      if (id && !slots.some(([m]) => m === id) && parts.some(p => p.materialId === id)) slots.push([id, slot]);
    }
  const title = (id: string) => `${matName(id)} · ${ROLE[slots.find(([m]) => m === id)?.[1] ?? 'carcass']}`;
  const colour = (id?: string) => (id ? matName(id).split(' ')[2] ?? '' : '');

  const groups: { title: string; rows: Row[] }[] = view === 'material'
    ? slots.map(([id]) => ({
      title: title(id),
      rows: merged.filter(m => m.materialId === id).map((m, i) => ({ ...m, key: `${id}-${i}`, name: m.note ? `${m.name} (${m.note})` : m.name, who: m.elementIds.join(' ') })),
    }))
    : project.elements.map(el => ({
      title: `${el.label} · ${KIND_NAME[el.kind]} ${el.width}${ownName(el)}`,
      rows: parts.filter(p => p.elementId === el.id).map(p => ({ ...p, key: p.pos, name: p.note ? `${p.name} (${p.note})` : p.name, who: p.pos })),
    })).filter(g => g.rows.length);

  const first = project.elements[0]?.materials;
  const edgeColour = (t: number) => colour(t === project.rules.frontEdge.thickness ? first?.front : first?.carcass);

  // Cutting layout preview: first sheet of the carcass material.
  const carcassId = slots[0]?.[0];
  const carcassSheet = carcassId ? project.materials[carcassId]?.sheet : undefined;
  const layout = carcassId && carcassSheet ? firstSheet(parts.filter(p => p.materialId === carcassId), carcassSheet) : null;
  const k = carcassSheet ? 280 / carcassSheet.l : 0.1;

  const fileBase = `krojna-lista-${fileSlug(project.name) || 'projekat'}`;
  // shortcut: "Nalepnice (QR po delu)" produces no file yet (spec: labels later).
  const deliver = async (how: 'download' | 'mail' | 'chat') => {
    setBusy(true); setSendMsg(null);
    try {
      const files = await orderFiles(project, send, fileBase);
      if (!files.length) { setSendMsg('Označi bar jednu stavku u „Šta šaljem“.'); return; }
      const subject = `Narudžbina — ${project.name}`;
      const body = `Poštovani,\n\nu prilogu je krojna lista za „${project.name}“ (${pieces} delova${sheets.length ? ', ' + sheets.map(s => `${matName(s.materialId)}: ${s.sheets}`).join(', ') : ''}).\nCSV je za program pilane, PDF za pregled.\n\nHvala`;
      if (how !== 'download' && await share({ files, title: subject, text: body })) return;
      downloadFiles(files);
      if (how === 'mail') window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n(Fajlovi su preuzeti — priložite ih.)')}`;
      if (how === 'chat') setSendMsg('Fajlovi su preuzeti — priloži ih u Viber ili WhatsApp.');
    } catch (err) {
      console.error(err);
      setSendMsg('Fajlovi nisu napravljeni. Pokušaj ponovo; ako se ponovi, javi nam.');
    } finally { setBusy(false); }
  };
  const appliances = APPLIANCES.flatMap(([kind, rows]) => project.elements.filter(e => e.kind === kind).flatMap(rows));
  const hwRows: [string, string][] = [
    ...hardwareRows(hw),
    ['Sokla 100 mm + ugaoni spoj', `${decimal(acc.plinthMeters, 1)} m`],
    ['Zidna lajsna za radnu ploču + završeci', `${decimal(acc.wallStripMeters, 1)} m`],
    ['Spojnica radne ploče, silikon', `${acc.worktopConnectors} + ${acc.siliconeTubes}`],
  ];

  return (
    <div className="app">
      <Header units />
      <main className="kl-page">
        <div className="kl-head">
          <div>
            <h1>Krojna lista projekta</h1>
            <p>{project.elements.length} elemenata · {pieces} {partsWord(pieces)} · sve mere u {unit === 'mm' ? 'milimetrima' : 'centimetrima'} (gotove mere, sa kantom)</p>
          </div>
          <div className="kl-actions">
            <button type="button" onClick={() => setView(view === 'material' ? 'element' : 'material')}>Grupiši: po {view === 'material' ? 'materijalu' : 'elementu'}</button>
            <button type="button" aria-disabled="true" title="Uskoro">Optimizacija krojenja</button>
            <Link to="/poredjenje" className="accent">Uporedi cene pilana</Link>
          </div>
        </div>

        <section className="kl-cards" aria-label="Zbir">
          {slots.filter(([, slot]) => slot !== 'drawerBottom').map(([id]) => {
            const s = sheets.find(x => x.materialId === id)!;
            const sheet = project.materials[id]?.sheet;
            return (
              <div key={id} className="kl-card">
                <div className="kl-card-t">{title(id)}</div>
                <div className="kl-card-v">{s.sheets} {sheetsWord(s.sheets)}</div>
                <div className="kl-card-t">{sheet ? `${sheet.l} × ${sheet.w} · ` : ''}{decimal(s.areaM2)} m² delova</div>
              </div>
            );
          })}
          <div className="kl-card">
            <div className="kl-card-t">Radna ploča {dims.worktopThickness} mm</div>
            <div className="kl-card-v">{tops.length} kom</div>
            <div className="kl-card-t">{f(tops.reduce((s, t) => s + t.length, 0))} × {f(dims.worktopDepth)}{tops.some(t => t.note) ? ' · ugaoni spoj' : ''}</div>
          </div>
          <div className="kl-card">
            <div className="kl-card-t">Kant ukupno (+{Math.round(project.rules.edgeExtra * 100)}%)</div>
            <div className="kl-card-v">{edges.reduce((s, e) => s + e.orderMeters, 0)} m</div>
            <div className="kl-card-t">{edges.map(e => `${e.orderMeters} m · ${decimal(e.edge.thickness)} ${edgeColour(e.edge.thickness)}`).join(' + ')}</div>
          </div>
        </section>

        <section className="kl-box" aria-label="Spisak delova">
          <div className="kl-box-head">
            <h2>Delovi za sečenje i kantovanje<Tip k="cutList.parts" /></h2>
            <span>D = duža ivica, K = kraća ivica{view === 'material' ? ' · istovetni delovi su spojeni' : ''}</span>
          </div>
          {groups.map(g => (
            <div key={g.title} className="kl-group">
              <div className="kl-group-head"><h3>{g.title}</h3><span>{g.rows.reduce((s, r) => s + r.qty, 0)} kom</span></div>
              <div className="kl-table">
                <table>
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '26%' }}>Deo</th>
                      <th scope="col" style={{ width: '24%' }}>{view === 'material' ? 'Elementi' : 'Poz.'}</th>
                      <th scope="col" className="r">Kom</th>
                      <th scope="col" className="r">Dužina<Tip k="element.length" /></th>
                      <th scope="col" className="r">Širina</th>
                      <th scope="col">Kant<Tip k="cutList.edge" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map(r => (
                      <tr key={r.key}>
                        <td>{r.name}</td>
                        <td className="who">{r.who}</td>
                        <td className="r mono">{r.qty}</td>
                        <td className="r mono">{f(r.length)}</td>
                        <td className="r mono">{f(r.width)}</td>
                        <td className="mono small">{edgeCode(r.edges)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        <div className="kl-row">
          <section className="kl-box kl-list" aria-label="Okov i repro materijal" style={{ flex: '1 1 400px' }}>
            <h2>Okov i repro materijal<Tip k="cutList.hardware" /></h2>
            {hwRows.map(([a, b]) => <div key={a} className="kl-line"><span>{a}</span><span className="mono">{b}</span></div>)}
          </section>
          <section className="kl-box kl-list" aria-label="Tehnika i niše" style={{ flex: '1 1 340px' }}>
            <h2>Tehnika (aparati) i niše</h2>
            {[...appliances, ['Slavina, aspirator', 'po izboru kupca'] as [string, string]].map(([a, b]) => <div key={a} className="kl-line"><span>{a}</span><span className="mono">{b}</span></div>)}
            <p className="kl-note">Mere niša i izreza se uzimaju iz kataloga aparata; app ih proverava u odnosu na element.</p>
          </section>
        </div>

        <div className="kl-row">
          <section className="kl-box" aria-label="Raspored na ploči" style={{ flex: '1 1 420px', gap: 10 }}>
            <div className="kl-box-head">
              <h2>Raspored krojenja<Tip k="cutList.layout" /></h2>
              {carcassId && <span>{matName(carcassId)} · ploča 1 od {sheets.find(s => s.materialId === carcassId)?.sheets} · rez 4 mm</span>}
            </div>
            {layout && carcassSheet && (
              <svg viewBox="0 0 300 220" role="img" aria-label={`Raspored delova na ploči ${carcassSheet.l} × ${carcassSheet.w}`} className="kl-sheet">
                <rect x="10" y="6" width="280" height={carcassSheet.w * k} fill="#F3F1EC" stroke="#1C1B19" />
                {layout.pieces.map((p, i) => (
                  <g key={i}>
                    <rect x={10 + p.x * k} y={6 + p.y * k} width={p.l * k} height={p.w * k} strokeWidth="0.6" stroke="#1C1B19"
                      fill={p.w <= 100 ? '#C9BEA9' : p.name === 'Stranica' ? '#E7E1D5' : '#D6CDBC'} />
                    {p.l * k >= 60 && p.w * k >= 30 && <text x={10 + (p.x + p.l / 2) * k} y={6 + (p.y + p.w / 2) * k + 2.5} textAnchor="middle" fontSize="7">{p.l}×{p.w}</text>}
                  </g>
                ))}
              </svg>
            )}
            {layout && <div className="kl-foot"><span>Iskorišćenje ploče: {layout.utilization}%</span><span>Ostatak za magacin: {layout.remnants} {layout.remnants === 1 ? 'komad' : 'komada'} ≥ 300 mm</span></div>}
          </section>

          <section className="kl-send" aria-label="Slanje">
            <h2>Pošalji narudžbinu<Tip k="cutList.send" /></h2>
            {/* shortcut: suppliers and sending come with accounts (MVP 8); the select is a placeholder like in the design. */}
            <label>Pilana / stovarište
              <select><option>[NAZIV PILANE] — sečenje i kantovanje</option><option>Dodaj novog dobavljača…</option></select>
            </label>
            <fieldset>
              <legend>Šta šaljem</legend>
              {([['parts', 'Krojna lista + kantovanje (CSV za pilanu i PDF)'], ['tops', 'Radne ploče sa izrezima'], ['hw', 'Okov i repro materijal (posebno, okovaru)'], ['labels', 'Nalepnice za delove (QR po delu)']] as const).map(([key, t]) => (
                <label key={key}><input type="checkbox" checked={send[key]} onChange={e => setSend({ ...send, [key]: e.target.checked })} />{t}</label>
              ))}
            </fieldset>
            <div className="kl-send-btns">
              <button type="button" className="primary" disabled={busy} onClick={() => deliver('mail')}>Pošalji e-poštom</button>
              <button type="button" disabled={busy} onClick={() => deliver('chat')}>Viber / WhatsApp</button>
              <button type="button" disabled={busy} onClick={() => deliver('download')}>Preuzmi PDF / Excel</button>
            </div>
            {ready && <button type="button" className="primary" onClick={retry}>Fajlovi su spremni — pošalji</button>}
            {sendMsg && <p className="kl-note" role="status">{sendMsg}</p>}
          </section>
        </div>
      </main>
    </div>
  );
}
