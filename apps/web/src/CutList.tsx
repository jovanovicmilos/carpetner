// Project cut list, laid out as design/screens/KrojnaLista.html: sheet / worktop / edge cards, parts by material (or element),
// hardware, appliances and niches, first-sheet cutting layout, order panel (CSV + Excel + PDF: download, e-mail, Viber / WhatsApp).
import {
  accessories, edgeCode, edgeTotals, edgeType, cutSheets, format, generateParts, hardware, mergeParts, PRESETS, sheetEstimate, worktops,
  type Element, type HardwareLine, type Part,
} from 'engine';
import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { APP } from './ui';
import { Locked } from './locks';
import { Header } from './Header';
import { useResumed } from './projects';
import { Tip } from './help';
import { KIND_NAME, ownName } from './labels';
import { markProject, useProject } from './store';
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

const HBTN = 'min-h-11 px-3.5 py-2.5 text-[14px] font-normal [&[href]]:font-semibold';
const CARD = 'rounded-xl border border-solid border-border bg-white p-4';
const CARD_T = 'text-[13px] text-muted-foreground';
const CARD_V = 'mt-1 font-mono text-[26px] font-semibold';
// content-box like the design: flex sizes depend on it
const BOX = 'box-content flex min-w-0 flex-col gap-3.5 rounded-xl border border-solid border-border bg-white p-5';
const BOX_HEAD = 'flex flex-wrap items-baseline gap-3';
const BOX_SUB = 'text-[13px] text-muted-foreground';
const H2 = 'm-0 text-[18px]';
const TH = 'border-0 bg-transparent px-2.5 py-[9px] align-middle text-[14px] font-semibold text-foreground';
const TD = 'border-0 border-t border-solid border-line-soft px-2.5 py-[9px] align-middle';
const LINE = 'flex justify-between gap-3 border-0 border-b border-solid border-line-soft py-2 text-[14px]';
const NOTE = 'mt-2 mb-0 text-[13px] leading-normal text-muted-foreground';
const SEND = 'min-h-12 flex-[1_1_140px] border border-solid border-muted-foreground bg-transparent text-[15px] font-normal text-background';
const SEND_MAIN = 'border-0 bg-accent-on-dark font-semibold text-foreground';

export function CutList() {
  const { project } = useProject();
  const [view, setView] = useResumed<'material' | 'element'>('cutlist.tab', 'material');
  const [send, setSend] = useState({ parts: true, tops: true, hw: true, labels: false });
  const [busy, setBusy] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const { share, ready, retry, note } = useShare();
  if (!project) return <Navigate to="/brzi-start" replace />;

  const unit = project.unit;
  const f = (mm: number) => format(mm, unit);
  const parts = generateParts(project);
  const merged = mergeParts(parts);
  const sheets = sheetEstimate(parts, project.materials, project.rules);
  const edges = edgeTotals(parts, project.rules);
  // Band type (user 2026-11-20): in the card title when all bands are the same type (one line fits), else per band.
  const bandType = (e: (typeof edges)[number]) => edgeType(e.edge.material);
  const oneType = edges.every(e => bandType(e) === bandType(edges[0]));
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
  const edgeSummary = edges.map(e => `${e.orderMeters} m · ${decimal(e.edge.thickness)}${oneType || !bandType(e) ? '' : ` ${bandType(e)}`} ${edgeColour(e.edge.thickness)}`).join(' + ');

  // Cutting layout: the carcass material over all sheets; the preview shows sheet 1, like the design.
  const carcassId = slots[0]?.[0];
  const carcassSheet = carcassId ? project.materials[carcassId]?.sheet : undefined;
  const cut = carcassId && carcassSheet ? cutSheets(parts.filter(p => p.materialId === carcassId), carcassSheet,
    { rotate: !(project.rules.followGrain && project.materials[carcassId]?.grain) }) : null;
  const layout = cut?.sheets[0];
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
      markProject({ cutListSent: true }); // downloaded or shared for the saw shop
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
    <div className={APP}>
      <Header units />
      <main className="mx-auto box-border flex w-full max-w-[1360px] flex-col gap-5 p-6">
        <Locked feature="cutlist" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <h1 className="m-0 text-[28px]">Krojna lista projekta</h1>
            <p className="mt-1 mb-0 text-[15px] text-muted-foreground">{project.elements.length} elemenata · {pieces} {partsWord(pieces)} · sve mere u {unit === 'mm' ? 'milimetrima' : 'centimetrima'} (gotove mere, sa kantom)</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {/* Step Krojna lista: checked by the user (like "Pregledano" on Nacrti, user 2026-11-22); sending marks "Poslata pilani". */}
            <Button variant="outline" size="none" className={HBTN} aria-pressed={!!project.marks?.cutListChecked} title="Krojna lista je proverena (korak 5 · Krojna lista)"
              onClick={() => markProject({ cutListChecked: !project.marks?.cutListChecked })}>{project.marks?.cutListChecked ? '✓ Proverena' : 'Proverena'}</Button>
            <Button variant="outline" size="none" className={HBTN} onClick={() => setView(view === 'material' ? 'element' : 'material')}>Grupiši: po {view === 'material' ? 'materijalu' : 'elementu'}</Button>
            <Button variant="outline" size="none" className={cn(HBTN, 'cursor-default')} aria-disabled="true" title="Uskoro">Optimizacija krojenja</Button>
            <Button asChild size="none" className={HBTN}><Link to="/poredjenje">Uporedi cene pilana</Link></Button>
          </div>
        </div>

        <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5" aria-label="Zbir">
          {slots.filter(([, slot]) => slot !== 'drawerBottom').map(([id]) => {
            const s = sheets.find(x => x.materialId === id)!;
            const sheet = project.materials[id]?.sheet;
            return (
              <div key={id} className={CARD}>
                <div className={CARD_T}>{title(id)}</div>
                <div className={CARD_V}>{s.sheets} {sheetsWord(s.sheets)}</div>
                <div className={CARD_T}>{sheet ? `${sheet.l} × ${sheet.w} · ` : ''}{decimal(s.areaM2)} m² delova</div>
              </div>
            );
          })}
          <div className={CARD}>
            <div className={CARD_T}>Radna ploča {dims.worktopThickness} mm</div>
            <div className={CARD_V}>{tops.length} kom</div>
            <div className={CARD_T}>{f(tops.reduce((s, t) => s + t.length, 0))} × {f(dims.worktopDepth)}{tops.some(t => t.note) ? ' · ugaoni spoj' : ''}</div>
          </div>
          <div className={CARD}>
            <div className={CARD_T}>Kant{oneType && edges.length && bandType(edges[0]) ? ` ${bandType(edges[0])}` : ''} ukupno (+{Math.round(project.rules.edgeExtra * 100)}%)</div>
            <div className={CARD_V}>{edges.reduce((s, e) => s + e.orderMeters, 0)} m</div>
            <div className={CARD_T}>{edgeSummary}</div>
          </div>
        </section>

        <section className={BOX} aria-label="Spisak delova">
          <div className={BOX_HEAD}>
            <h2 className={H2}>Delovi za sečenje i kantovanje<Tip k="cutList.parts" /></h2>
            <span className={BOX_SUB}>D = duža ivica, K = kraća ivica{view === 'material' ? ' · istovetni delovi su spojeni' : ''}</span>
          </div>
          {groups.map(g => (
            <div key={g.title} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-2.5 pt-2"><h3 className="m-0 text-[15px]">{g.title}</h3><span className="text-[13px] text-muted-foreground">{g.rows.reduce((s, r) => s + r.qty, 0)} kom</span></div>
              <div className="overflow-x-auto rounded-lg border border-solid border-line-soft">
                <table className="w-full min-w-[760px] border-collapse text-[14px]">
                  <thead>
                    <tr className="bg-background text-left">
                      <th scope="col" className={TH} style={{ width: '26%' }}>Deo</th>
                      <th scope="col" className={TH} style={{ width: '24%' }}>{view === 'material' ? 'Elementi' : 'Poz.'}</th>
                      <th scope="col" className={cn(TH, 'text-right')}>Kom</th>
                      <th scope="col" className={cn(TH, 'text-right')}>Dužina<Tip k="element.length" /></th>
                      <th scope="col" className={cn(TH, 'text-right')}>Širina</th>
                      <th scope="col" className={TH}>Kant<Tip k="cutList.edge" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map(r => (
                      <tr key={r.key}>
                        <td className={TD}>{r.name}</td>
                        <td className={cn(TD, 'font-mono text-[13px] text-muted-foreground')}>{r.who}</td>
                        <td className={cn(TD, 'text-right font-mono')}>{r.qty}</td>
                        <td className={cn(TD, 'text-right font-mono')}>{f(r.length)}</td>
                        <td className={cn(TD, 'text-right font-mono')}>{f(r.width)}</td>
                        <td className={cn(TD, 'font-mono text-[13px]')}>{edgeCode(r.edges, project.rules)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap gap-5">
          <section className={cn(BOX, 'flex-[1_1_400px] gap-1.5')} aria-label="Okov i repro materijal">
            <h2 className={cn(H2, 'mb-1.5')}>Okov i repro materijal<Tip k="cutList.hardware" /></h2>
            {hwRows.map(([a, b], i) => <div key={a} className={cn(LINE, i === hwRows.length - 1 && 'border-b-0')}><span>{a}</span><span className="font-mono">{b}</span></div>)}
          </section>
          <section className={cn(BOX, 'flex-[1_1_340px] gap-1.5')} aria-label="Tehnika i niše">
            <h2 className={cn(H2, 'mb-1.5')}>Tehnika (aparati) i niše</h2>
            {[...appliances, ['Slavina, aspirator', 'po izboru kupca'] as [string, string]].map(([a, b], i, all) => <div key={a} className={cn(LINE, i === all.length - 1 && 'border-b-0')}><span>{a}</span><span className="font-mono">{b}</span></div>)}
            <p className={NOTE}>Mere niša i izreza se uzimaju iz kataloga aparata; app ih proverava u odnosu na element.</p>
          </section>
        </div>

        <div className="flex flex-wrap gap-5">
          <section className={cn(BOX, 'flex-[1_1_420px] gap-2.5')} aria-label="Raspored na ploči">
            <div className={BOX_HEAD}>
              <h2 className={H2}>Raspored krojenja<Tip k="cutList.layout" /></h2>
              {carcassId && <span className={BOX_SUB}>{matName(carcassId)} · ploča 1 od {cut?.sheets.length} · rez 4 mm</span>}
            </div>
            {layout && carcassSheet && (
              <svg viewBox="0 0 300 220" role="img" aria-label={`Raspored delova na ploči ${carcassSheet.l} × ${carcassSheet.w}`} className="h-auto w-full font-mono">
                <rect x="10" y="6" width="280" height={carcassSheet.w * k} fill="#F3F1EC" stroke="#1C1B19" />
                {layout.pieces.map((p, i) => (
                  <g key={i}>
                    <rect x={10 + p.x * k} y={6 + p.y * k} width={p.l * k} height={p.w * k} strokeWidth="0.6" stroke="#1C1B19"
                      fill={p.w <= 100 ? '#D6BE98' : p.name === 'Stranica' ? '#EADBC4' : '#E0CCAD'} />
                    {p.l * k >= 60 && p.w * k >= 30 && <text x={10 + (p.x + p.l / 2) * k} y={6 + (p.y + p.w / 2) * k + 2.5} textAnchor="middle" fontSize="7">{p.l}×{p.w}</text>}
                  </g>
                ))}
              </svg>
            )}
            {layout && <div className="flex flex-wrap gap-5 text-[13px] text-muted-foreground"><span>Iskorišćenje ploče: {layout.utilization}%</span><span>Ostatak za magacin: {layout.remnants} {layout.remnants === 1 ? 'komad' : 'komada'} ≥ 300 mm</span></div>}
          </section>

          <section className="box-content flex min-w-0 flex-[1_1_420px] flex-col gap-3.5 rounded-xl bg-dark p-5 text-background" aria-label="Slanje">
            <h2 className={H2}>Pošalji narudžbinu<Tip k="cutList.send" /></h2>
            {/* shortcut: suppliers and sending come with accounts (MVP 8); the select is a placeholder like in the design. */}
            <label className="flex flex-col gap-1.5 text-[13px] text-on-dark-muted">Pilana / stovarište
              <Select defaultValue="saw">
                <SelectTrigger aria-label="Pilana / stovarište" className="h-auto w-full border-muted-foreground bg-dark-2 p-2.5 text-[15px] text-white"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="saw">[NAZIV PILANE] — sečenje i kantovanje</SelectItem><SelectItem value="new">Dodaj novog dobavljača…</SelectItem></SelectContent>
              </Select>
            </label>
            <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
              <legend className="mb-1.5 text-[13px] text-on-dark-muted">Šta šaljem</legend>
              {([['parts', 'Krojna lista + kantovanje (CSV za pilanu i PDF)'], ['tops', 'Radne ploče sa izrezima'], ['hw', 'Okov i repro materijal (posebno, okovaru)'], ['labels', 'Nalepnice za delove (QR po delu)']] as const).map(([key, t]) => (
                <label key={key} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[14px]"><Checkbox className="data-[state=checked]:border-accent-on-dark data-[state=checked]:bg-accent-on-dark data-[state=checked]:text-foreground" checked={send[key]} onCheckedChange={v => setSend({ ...send, [key]: v === true })} />{t}</label>
              ))}
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <Button size="none" className={cn(SEND, SEND_MAIN)} disabled={busy} onClick={() => deliver('mail')}>Pošalji e-poštom</Button>
              <Button size="none" className={SEND} disabled={busy} onClick={() => deliver('chat')}>Viber / WhatsApp</Button>
              <Button size="none" className={SEND} disabled={busy} onClick={() => deliver('download')}>Preuzmi PDF / Excel</Button>
            </div>
            {ready && <Button size="none" className={cn(SEND, SEND_MAIN)} onClick={() => void retry()}>Fajlovi su spremni — pošalji</Button>}
            {note && <p className={cn(NOTE, 'text-on-dark-muted')} role="status">{note}</p>}
            {sendMsg && <p className={cn(NOTE, 'text-on-dark-muted')} role="status">{sendMsg}</p>}
          </section>
        </div>
        </Locked>
      </main>
    </div>
  );
}
