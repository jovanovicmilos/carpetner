// Prilagođeni element (design/Konfigurator.dc.html, docs/KATALOG.md): base, front rows, interior, handles, materials;
// the element's cut list and hardware live, from the engine with the workshop rules (user 2026-11-19, not the design's formulas).
// The draft is a normal Element; "Dodaj u prostor" puts it on the first free spot (engine firstFreeOffset) and opens Prostor.
// ?element=ID edits that element instead: the draft starts from it and "Sačuvaj izmene" replaces it in place.
import {
  DEFAULT_ELEMENT_MATERIALS, firstFreeOffset, frontRows, generateParts, hardware, isNiche, labelPrefix, makeElement, nextId, PRESETS, verticalRange,
  type Element, type FrontRow, type FrontRowType, type Layer, type OpeningKind, type OpeningSpec, type Project,
} from 'engine';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Header } from './Header';
import { Tip } from './help';
import { useProject } from './store';
import { useTemplates } from './templates';
import { sx } from './ui';
import { openingUsable, useWorkshop } from './workshop';

const RTYPES: [FrontRowType, string][] = [['door', 'Krilo'], ['door2', '2 krila'], ['drawer', 'Fioka'], ['app', 'Aparat (otvor)'], ['glass', 'Staklo (vitrina)'], ['open', 'Otvoreno']];
const OPEN: [OpeningKind | 'project', string, string][] = [['project', 'Kao projekat', 'M6 7h32'], ['bar', 'Ručka – šipka', 'M32 11v12'], ['knob', 'Ručka – dugme', 'M33 17h.01'], ['profile', 'Profil na vrhu fronte', 'M3 4.5h38'], ['push', 'Na pritisak (bez ručke)', 'M22 17h.01']];
const OPEN_SHORT: Record<OpeningKind, string> = { bar: 'šipka', knob: 'dugme', profile: 'profil', push: 'na pritisak' };
const HCOL: [NonNullable<OpeningSpec['color']>, string, string][] = [['inox', 'Inox', '#9AA0A6'], ['black', 'Crna mat', '#1C1B19'], ['brass', 'Mesing', '#B08D57'], ['front', 'U boji fronte', '']];
const LAYERS: Record<Layer, { t: string; H: number; D: number }> = { low: { t: 'Donji', H: 720, D: 560 }, up: { t: 'Gornji', H: 720, D: 320 }, tall: { t: 'Visoki', H: 2100, D: 560 } };
type R = [FrontRowType, number | null, string?];
const PRESET_ROWS: Record<Layer, [string, R[]][]> = {
  low: [['1 krilo', [['door', null]]], ['2 krila', [['door2', null]]], ['Fioka + krilo', [['drawer', 150], ['door', null]]], ['2 fioke', [['drawer', null], ['drawer', null]]], ['3 fioke', [['drawer', 180], ['drawer', null], ['drawer', null]]], ['4 fioke', [['drawer', null], ['drawer', null], ['drawer', null], ['drawer', null]]], ['Rerna + fioka', [['app', 560, 'oven60'], ['drawer', null]]], ['Otvoreno', [['open', null]]]],
  up: [['1 krilo', [['door', null]]], ['2 krila', [['door2', null]]], ['Vitrina', [['glass', null]]], ['Staklo + krilo', [['glass', 360], ['door', null]]], ['Otvoreno', [['open', null]]]],
  tall: [['2 krila (ostava)', [['door', 800], ['door', null]]], ['Frižider', [['door', 460], ['door', null, 'fridge']]], ['Rerna + mikro', [['door', 520], ['app', 380, 'micro38'], ['app', 590, 'oven60'], ['drawer', null], ['drawer', null]]], ['Rerna + fioke', [['door', 640], ['app', 590, 'oven60'], ['drawer', null], ['drawer', null]]]],
};
const mk = (rows: R[]): FrontRow[] => rows.map(([type, height, appliance]) => ({ type, height, ...(appliance ? { appliance } : {}) }));
// Swatch colours by decor code (design MATS); other materials get the neutral stripe.
const DECOR: Record<string, string> = { W980: '#F4F4F2', U708: '#BFC3C7', H1180: '#B08A62', U999: '#2E2D2B' };
const swatch = (name = '') => DECOR[name.split(/\s+/).find(w => DECOR[w]) ?? ''] ?? '';
const layerOf = (k: Element['kind']): Layer => (k === 'wall' ? 'up' : k === 'tall' ? 'tall' : 'low');
const kindOf = (layer: Layer, rows: FrontRow[]): Element['kind'] =>
  layer === 'tall' ? 'tall' : layer === 'up' ? 'wall' : rows.some(isNiche) ? 'oven' : rows.every(r => r.type === 'drawer') ? 'drawer' : 'base';
const segSt = (on: boolean) => 'font: inherit; font-size: 13px; min-height: 34px; border: 0; border-radius: 6px; cursor: pointer; ' + (on ? 'background: #FFFFFF; color: #1C1B19; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.12)' : 'background: transparent; color: #5F5A52');
const chipSt = (on: boolean) => 'font: inherit; font-size: 12px; padding: 6px 9px; min-height: 32px; border-radius: 6px; cursor: pointer; ' + (on ? 'border: 1px solid #B4440E; background: #FBE3D3; color: #7C2D0A; font-weight: 600' : 'border: 1px solid #DDD8CE; background: #FFFFFF; color: #1C1B19');
const H2 = 'margin: 0; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: #B4440E; display: flex; align-items: center';
const dec = (n: number) => String(n).replace('.', ',');

interface Draft { layer: Layer; W: number; H: number; D: number; rows: FrontRow[]; shelves: number; inDr: number; opening?: OpeningSpec; hinge: 'L' | 'R'; carcass: string; front: string }

export function Configurator() {
  const project = useProject(s => s.project);
  const change = useProject(s => s.change);
  const addTemplate = useTemplates(s => s.add);
  const openingOff = useWorkshop(s => s.openingOff);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orig = project?.elements.find(e => e.id === params.get('element') && e.front);
  const [d, setD] = useState<Draft>(() => orig
    ? { layer: layerOf(orig.kind), W: orig.width, H: orig.height, D: orig.depth, rows: orig.front!, shelves: orig.interior?.shelves ?? orig.shelves ?? 0,
      inDr: orig.interior?.innerDrawers ?? 0, opening: orig.opening, hinge: orig.hinge === 'R' ? 'R' : 'L', carcass: orig.materials.carcass, front: orig.materials.front }
    : { layer: 'low', W: 600, H: 720, D: 560, rows: mk(PRESET_ROWS.low[4][1]), shelves: 0, inDr: 0, hinge: 'L', carcass: DEFAULT_ELEMENT_MATERIALS.carcass, front: DEFAULT_ELEMENT_MATERIALS.front });
  const [save, setSave] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [notice, setNotice] = useState('');
  if (!project) return <Navigate to="/" replace />;
  const set = (p: Partial<Draft>) => setD(s => ({ ...s, ...p }));
  const num = (v: string, lo: number, hi: number) => { const n = parseInt(v.replace(/[^0-9]/g, ''), 10); return Number.isNaN(n) ? null : Math.max(lo, Math.min(hi, n)); };

  // ---------- the element (engine input)
  const dims = PRESETS[project.presetId === 'none' ? 'workshop' : project.presetId];
  // Editing keeps the element's own base (legs / elevation, back material…) and special kinds (sink, corner) while the layer stays.
  const same = orig && layerOf(orig.kind) === d.layer ? orig : undefined;
  const kind = same && (same.kind === 'sink' || same.kind === 'corner-blind') ? same.kind : kindOf(d.layer, d.rows);
  const doors = d.rows.some(r => r.type === 'door2') ? 2 : d.rows.some(r => r.type === 'door' || r.type === 'glass') ? 1 : 0;
  const el: Element = {
    ...(same ?? makeElement(kind, '', 0, d.W, 'X', dims, DEFAULT_ELEMENT_MATERIALS)), kind,
    width: d.W, height: d.H, depth: d.D, front: d.rows, interior: { shelves: d.shelves, innerDrawers: d.inDr }, shelves: d.shelves,
    doors, hinge: doors === 2 ? 'LR' : doors ? d.hinge : 'none', drawerFronts: undefined,
    materials: { ...(same?.materials ?? DEFAULT_ELEMENT_MATERIALS), carcass: d.carcass, front: d.front }, opening: d.opening,
  };
  if (!d.opening) delete el.opening;
  const solo: Project = { ...project, elements: [el] };
  const op = d.opening ?? project.opening, eff = op?.kind;
  const prof = eff === 'profile' ? op?.profileHeight ?? 20 : 0;
  const rules = project.rules;
  const matName = (id: string) => project.materials[id]?.name ?? id;

  // ---------- drawing (mm, y down, carcass top = 0), as the reference
  const L = LAYERS[d.layer], W = d.W, H = d.H, D = d.D, P = d.layer === 'up' ? 0 : el.legs ?? 0, up = d.layer === 'up';
  const rows = frontRows(el);
  const pad = Math.max(W, H + P) * 0.2 + 60, vb = `${-pad} ${-pad * 0.7} ${W + pad * 2} ${H + P + pad * 1.5}`;
  const Rr = (x: number, y: number, w: number, h: number) => `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}Z`;
  let dFront = '', dApp = '', dGlass = '', dOpen = '', dSwing = '', dHand = '';
  const spacing = op?.spacing ?? 128;
  const handleAt = (x: number, y: number, w: number, h: number, horiz: boolean, side?: 'L' | 'R') => {
    if (eff === 'push') return;
    if (eff === 'profile') { const py = up && !horiz ? y + h - 4 : y + 4; dHand += `M${x} ${py}h${w}`; return; }
    const len = eff === 'knob' ? 0 : spacing + 32;
    if (horiz) { const cx = x + w / 2, cy = y + Math.min(50, h * 0.3); dHand += eff === 'knob' ? `M${cx} ${cy}h0.01` : `M${cx - len / 2} ${cy}h${len}`; }
    else { const hx = side === 'R' ? x + 40 : x + w - 40, cy = d.layer === 'tall' ? y + h / 2 : up ? y + h - 40 - len / 2 : y + 40 + len / 2; dHand += eff === 'knob' ? `M${hx} ${cy}h0.01` : `M${hx} ${cy - len / 2}v${len}`; }
  };
  const swing = (x: number, y: number, w: number, h: number, side: 'L' | 'R') => {
    dSwing += side === 'L' ? `M${x + w} ${y}L${x} ${y + h / 2}L${x + w} ${y + h}` : `M${x} ${y}L${x + w} ${y + h / 2}L${x} ${y + h}`;
  };
  let yTop = 0;
  for (const { row, h: rh } of rows) {
    const g = rules.frontGap, x = g / 2, y = yTop + 2, w = W - g, h = rh - 4 - prof, yy = up ? y : y + prof;
    yTop += rh;
    if (h < 20) continue;
    if (row.type === 'app' || row.type === 'hood') { dApp += Rr(x, y, w, rh - 4); continue; } // appliance niche: no front (workshop rule)
    if (row.type === 'open') { dOpen += Rr(x, y, w, rh - 4) + `M${x} ${y + (rh - 4) / 2}h${w}`; continue; }
    if (row.type === 'door2') {
      const hw = Math.floor((W - 2 * g) / 2);
      dFront += Rr(x, yy, hw, h) + Rr(x + hw + g, yy, hw, h); swing(x, yy, hw, h, 'L'); swing(x + hw + g, yy, hw, h, 'R');
      handleAt(x, yy, hw, h, false, 'L'); handleAt(x + hw + g, yy, hw, h, false, 'R');
      continue;
    }
    dFront += Rr(x, yy, w, h);
    if (row.type === 'glass') dGlass += Rr(x + 60, yy + 60, w - 120, h - 120);
    if (row.type === 'drawer' || row.type === 'lift') { handleAt(x, yy, w, h, true); continue; }
    if (row.type === 'panel') continue;
    swing(x, yy, w, h, d.hinge); handleAt(x, yy, w, h, false, d.hinge);
  }
  const fs = Math.round(Math.max(W, H + P) * 0.032);
  const oy = H + P + pad * 0.35, ox = W + pad * 0.3, lx = -pad * 0.35;
  let dDim = `M0 ${oy}h${W}M0 ${oy - 25}v50M${W} ${oy - 25}v50M${ox} 0v${H}M${ox - 25} 0h50M${ox - 25} ${H}h50`;
  const dimTexts: { x: number; y: number; fs: number; tr: string; t: string }[] = [
    { x: W / 2, y: oy - 18, fs, tr: '', t: String(W) },
    { x: ox + 30, y: H / 2, fs, tr: `rotate(90 ${ox + 30} ${H / 2})`, t: String(H) },
  ];
  if (P) { dDim += `M${ox} ${H}v${P}M${ox - 25} ${H + P}h50`; dimTexts.push({ x: ox + 30, y: H + P / 2, fs: Math.round(fs * 0.8), tr: `rotate(90 ${ox + 30} ${H + P / 2})`, t: String(P) }); }
  let ry = 0;
  for (const { h } of rows) { dDim += `M${lx - 20} ${ry}h40`; dimTexts.push({ x: lx - 30, y: ry + h / 2, fs: Math.round(fs * 0.85), tr: `rotate(-90 ${lx - 30} ${ry + h / 2})`, t: String(h) }); ry += h; }
  dDim += `M${lx} 0v${H}M${lx - 20} ${H}h40`;
  const hc = HCOL.find(c => c[0] === (op?.color ?? 'black'))!;
  const frontFill = swatch(matName(d.front)) || '#EFE9DE';

  // ---------- cut list and hardware (engine)
  const parts = generateParts(solo).map(p => {
    const e = p.edges, all = e.L1 && e.L2 && e.W1 && e.W2, n = [e.L1, e.L2, e.W1, e.W2].filter(Boolean).length;
    const edge = all ? `kant ${dec(e.L1)} mm sve 4` : n ? `kant ${n} ${n === 1 ? 'duža' : 'ivice'}` : '';
    return { n: p.name, m: [matName(p.materialId), edge, p.note].filter(Boolean).join(' · '), q: p.qty, s: `${p.length} × ${p.width}` };
  });
  const DEP = /^(rucka|profil-vrh|potiskivac|sarka-push|fioka-komplet-push)/;
  const hw = hardware(solo).map(h => ({ n: h.name, q: `${dec(h.qty)} ${h.unit}`, dep: !!op && DEP.test(h.sku) }));

  // ---------- warnings
  const fixed = d.rows.reduce((a, r) => a + (r.height ?? 0), 0);
  const warns: { text: string; bad: boolean }[] = [];
  if (fixed > H) warns.push({ text: `Zbir visina redova (${fixed}) je veći od visine ${H}`, bad: true });
  rows.forEach(({ row, h }, i) => { if (row.type === 'drawer' && h < 110) warns.push({ text: `Fioka ${i + 1} niža od 110 mm`, bad: true }); });
  if (W > 600 && d.rows.some(r => r.type === 'door')) warns.push({ text: 'Krilo šire od 600 — razmisli o 2 krila', bad: true });
  if (!warns.length) warns.push({ text: 'Konstrukcija je u redu', bad: false });
  const wst = (bad: boolean) => 'font-size: 12px; padding: 5px 9px; border-radius: 6px; ' + (bad ? 'background: #FBE3D3; color: #7C2D0A' : 'background: #E4F1E6; color: #1F5A2A');

  const projectWord = project.opening ? OPEN_SHORT[project.opening.kind] : 'ručka 128';
  const openText = (k: OpeningKind | 'project', t: string) => (k === 'project' ? `${t} (${projectWord})` : t);
  const summary = `${L.t} ${W} × ${H} × ${D} · ${d.rows.length} ${d.rows.length === 1 ? 'red' : 'reda'} · ${d.opening ? OPEN.find(o => o[0] === d.opening!.kind)![1] : openText('project', 'Kao projekat')}`;
  const setOpening = (k: OpeningKind | 'project') => set({ opening: k === 'project' ? undefined : { ...(d.opening ?? project.opening ?? {}), kind: k } });
  const setOp = (p: Partial<OpeningSpec>) => set({ opening: { ...(op ?? { kind: 'bar' }), ...p } });
  const boards = Object.values(project.materials).filter(m => (m.kind === 'chipboard' || m.kind === 'mdf') && m.thickness >= 16);

  function addToRoom() {
    const placed = (params.get('zid') ? [params.get('zid')!] : []).concat(project!.room.walls.map(w => w.id))
      .map(wallId => ({ wallId, at: firstFreeOffset(project!, wallId, W, verticalRange(el)) })).find(x => x.at !== null);
    if (!placed) { setNotice(`Nema ${W} mm slobodno ni na jednom zidu — smanji širinu ili oslobodi mesto u Prostoru.`); return; }
    const id = nextId(project!.elements.map(e => e.id), labelPrefix(kind));
    change(p => ({ ...p, elements: [...p.elements, { ...el, id, label: id, wallId: placed.wallId, offset: placed.at! }] }));
    navigate('/projekat');
  }
  function saveEdit() {
    const { id, label, wallId, offset, side, name, note } = orig!;
    change(p => ({ ...p, elements: p.elements.map(e => (e.id === id ? { ...el, id, label, wallId, offset, ...(side && { side }), ...(name && { name }), ...(note && { note }) } : e)) }));
    navigate(`/element/${id}`);
  }
  function doSave() {
    const { id: _i, label: _l, wallId: _w, offset: _o, side: _s, ...element } = el;
    addTemplate({ name: save || 'Moj element', element });
    setSave(null); setToast(`„${save}" je sačuvan u Moji šabloni`); setTimeout(() => setToast(''), 2600);
  }

  return (
    <div className="app app-fixed cfg">
      <Header units />
      <div style={sx('display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 10px 20px; background: #FFFFFF; border-bottom: 1px solid #DDD8CE')}>
        <Link to={orig ? `/element/${orig.id}` : '/projekat'} style={sx('display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 12px; border: 1px solid #DDD8CE; border-radius: 6px; color: #1C1B19; text-decoration: none; font-size: 13px')}>{orig ? `← ${orig.label}` : '← Prostor'}</Link>
        <h1 style={sx('margin: 0; font-size: 18px; display: flex; align-items: center')}>Prilagođeni element{orig && ` · ${orig.label}`}<Tip k="config.title" align="right" /></h1>
        <span style={sx("font: 13px var(--font-mono); color: #5F5A52")}>{summary}</span>
        <div style={sx('margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap')}>
          <button type="button" onClick={() => setSave(`${L.t} ${W} – ${d.rows.length} ${d.rows.length === 1 ? 'red' : 'reda'}`)} style={sx('font: inherit; font-size: 14px; min-height: 42px; padding: 0 14px; border-radius: 6px; border: 1px solid #1C1B19; background: #FFFFFF; color: #1C1B19; cursor: pointer')}>Sačuvaj kao šablon</button>
          <button type="button" onClick={orig ? saveEdit : addToRoom} style={sx('font: inherit; display: inline-flex; align-items: center; min-height: 42px; padding: 0 16px; border-radius: 6px; border: 0; background: #B4440E; color: #FFFFFF; font-weight: 600; font-size: 14px; cursor: pointer')}>{orig ? 'Sačuvaj izmene' : 'Dodaj u prostor'}</button>
        </div>
        {notice && <div role="alert" style={sx('flex-basis: 100%; font-size: 13px; color: #7C2D0A')}>{notice}</div>}
      </div>

      <div className="k-body" style={sx('display: flex; flex: 1; min-height: 0')}>
        <aside aria-label="Podešavanja elementa" className="k-side" style={sx('flex: 0 0 380px; min-height: 0; overflow-y: auto; background: #FFFFFF; border-right: 1px solid #DDD8CE; padding: 16px 18px 24px; display: flex; flex-direction: column; gap: 20px; box-sizing: border-box')}>
          <section style={sx('display: flex; flex-direction: column; gap: 10px')}>
            <h2 style={sx(H2)}>1 · Osnova</h2>
            <div role="group" aria-label="Vrsta" style={sx('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px; padding: 3px; background: #F3F1EC; border-radius: 8px')}>
              {(['low', 'up', 'tall'] as Layer[]).map(k => (
                <button key={k} type="button" aria-pressed={d.layer === k} style={sx(segSt(d.layer === k))}
                  onClick={() => set({ layer: k, H: LAYERS[k].H, D: LAYERS[k].D, rows: mk(PRESET_ROWS[k][0][1]) })}>{LAYERS[k].t}</button>
              ))}
            </div>
            <div style={sx('display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px')}>
              {([['Širina', 'W', 150, 1200], ['Visina', 'H', 200, 2600], ['Dubina', 'D', 200, 700]] as const).map(([t, k, lo, hi], i) => (
                <label key={k} style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #5F5A52')}>{t}
                  <input key={d[k]} type="text" inputMode="numeric" defaultValue={String(d[k])}
                    onBlur={e => { const n = num(e.target.value, lo, hi); if (n) set({ [k]: n }); }}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    style={sx(`font: 16px var(--font-mono); padding: 8px; border: 1px solid ${i === 0 ? '#B4440E' : '#DDD8CE'}; border-radius: 6px; min-width: 0`)} />
                </label>
              ))}
            </div>
            <div style={sx('display: flex; flex-wrap: wrap; gap: 6px')}>
              {[300, 400, 450, 500, 600, 800, 900].map(v => <button key={v} type="button" onClick={() => set({ W: v })} style={{ ...sx(chipSt(W === v)), fontFamily: 'var(--font-mono)' }}>{v}</button>)}
            </div>
            <div style={sx('font-size: 12px; color: #5F5A52')}>{P ? `Sokla ${P} mm · ukupno od poda ${H + P} mm` : `Visi na zidu · donja ivica na ${el.elevation ?? 1450} mm od poda`}</div>
          </section>

          <section style={sx('display: flex; flex-direction: column; gap: 10px')}>
            <h2 style={sx(H2)}>2 · Fronta<Tip k="config.front" align="right" /></h2>
            <div style={sx('display: flex; flex-wrap: wrap; gap: 6px')}>
              {PRESET_ROWS[d.layer].map(([t, r]) => <button key={t} type="button" onClick={() => set({ rows: mk(r) })} style={sx(chipSt(false))}>{t}</button>)}
            </div>
            <div style={sx('display: flex; flex-direction: column; gap: 6px')}>
              {d.rows.map((r, i) => {
                const mv = (dd: number) => () => { const a = d.rows.slice(); [a[i], a[i + dd]] = [a[i + dd], a[i]]; set({ rows: a }); };
                const put = (p: Partial<FrontRow>) => { const a = d.rows.slice(); a[i] = { ...r, ...p }; set({ rows: a }); };
                return (
                  <div key={i} style={sx('display: grid; grid-template-columns: 22px minmax(0, 1fr) 84px 34px 34px 34px; gap: 4px; align-items: center')}>
                    <span style={sx("font: 600 12px var(--font-mono); color: #5F5A52")}>{i + 1}</span>
                    <select aria-label={`Vrsta reda ${i + 1}`} value={r.type} onChange={e => { const t = e.target.value as FrontRowType; put({ type: t, appliance: t === 'app' ? r.appliance ?? (r.height && r.height < 500 ? 'micro38' : 'oven60') : undefined }); }}
                      style={sx('font: inherit; font-size: 13px; min-height: 36px; padding: 0 6px; border: 1px solid #DDD8CE; border-radius: 6px; background: #FFFFFF; min-width: 0')}>
                      {RTYPES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                    </select>
                    <input key={`${i}-${r.height}`} type="text" inputMode="numeric" aria-label={`Visina reda ${i + 1} u mm (prazno = ostatak)`}
                      defaultValue={r.height ? String(r.height) : ''} placeholder={`auto ${rows[i]?.h ?? ''}`}
                      onBlur={e => put({ height: num(e.target.value, 60, 2400) })} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      style={sx('font: 14px var(--font-mono); padding: 7px 6px; border: 1px solid #DDD8CE; border-radius: 6px; min-width: 0')} />
                    <button type="button" className="k-ib" aria-label="Pomeri red gore" data-tip="Gore" disabled={i === 0} onClick={mv(-1)} style={sx('width: 34px; height: 34px')}><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                    <button type="button" className="k-ib" aria-label="Pomeri red dole" data-tip="Dole" disabled={i === d.rows.length - 1} onClick={mv(1)} style={sx('width: 34px; height: 34px')}><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                    <button type="button" className="k-ib" aria-label="Ukloni red" data-tip="Ukloni" disabled={d.rows.length === 1} onClick={() => set({ rows: d.rows.filter((_, k) => k !== i) })} style={sx('width: 34px; height: 34px; color: #A3261F')}><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>
                  </div>
                );
              })}
              <button type="button" onClick={() => set({ rows: [...d.rows, { type: 'drawer', height: null }] })} style={sx('font: inherit; font-size: 13px; min-height: 38px; border-radius: 6px; border: 1px dashed #8A8378; background: #FFFFFF; color: #1C1B19; cursor: pointer')}>+ Dodaj red</button>
            </div>
            {d.rows.some(r => r.type === 'door' || r.type === 'glass') && (
              <div role="group" aria-label="Strana šarki" style={sx('display: flex; align-items: center; gap: 8px; font-size: 13px; color: #5F5A52')}>Šarke (1 krilo):
                {([['L', 'Levo'], ['R', 'Desno']] as const).map(([v, t]) => <button key={v} type="button" aria-pressed={d.hinge === v} onClick={() => set({ hinge: v })} style={sx(chipSt(d.hinge === v))}>{t}</button>)}
              </div>
            )}
          </section>

          <section style={sx('display: flex; flex-direction: column; gap: 10px')}>
            <h2 style={sx(H2)}>3 · Unutrašnjost</h2>
            <div style={sx('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px')}>
              {([['shelves', 'Police', 6], ['inDr', 'Unutrašnje fioke', 4]] as const).map(([k, t, hi]) => (
                <div key={k} style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #5F5A52')}>{t}
                  <div style={sx('display: grid; grid-template-columns: 38px 1fr 38px; align-items: center; border: 1px solid #DDD8CE; border-radius: 6px; overflow: hidden')}>
                    <button type="button" aria-label={`${t} manje`} onClick={() => set({ [k]: Math.max(0, d[k] - 1) })} style={sx("font: 600 18px var(--font-sans); height: 38px; border: 0; background: #F3F1EC; cursor: pointer")}>−</button>
                    <span style={sx("text-align: center; font: 600 15px var(--font-mono); color: #1C1B19")}>{d[k]}</span>
                    <button type="button" aria-label={`${t} više`} onClick={() => set({ [k]: Math.min(hi, d[k] + 1) })} style={sx("font: 600 18px var(--font-sans); height: 38px; border: 0; background: #F3F1EC; cursor: pointer")}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <label style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #5F5A52')}>Leđa (pravilo projekta)
              <select aria-label="Leđa" value={rules.backMode} onChange={e => change(p => ({ ...p, rules: { ...p.rules, backMode: e.target.value as Project['rules']['backMode'] } }))}
                style={sx('font: inherit; font-size: 13px; min-height: 38px; padding: 0 8px; border: 1px solid #DDD8CE; border-radius: 6px; background: #FFFFFF')}>
                <option value="groove">HDF u žlebu (8 mm od ivice)</option>
                <option value="nailed">HDF na preklop (ekserčići)</option>
                <option value="inset18">Iverica 18 upuštena</option>
              </select>
            </label>
          </section>

          <section style={sx('display: flex; flex-direction: column; gap: 10px')}>
            <h2 style={sx(H2)}>4 · Ručke i otvaranje<Tip k="config.opening" align="right" /></h2>
            <div style={sx('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px')}>
              {OPEN.filter(([k]) => k === 'project' || openingUsable(openingOff, k, d.opening?.kind)).map(([k, t, path]) => {
                const on = (d.opening?.kind ?? 'project') === k;
                return (
                  <button key={k} type="button" aria-pressed={on} onClick={() => setOpening(k)}
                    style={sx('font: inherit; display: flex; align-items: center; gap: 8px; padding: 6px 8px; min-height: 52px; border-radius: 8px; cursor: pointer; color: #1C1B19; ' + (on ? 'border: 2px solid #B4440E; background: #FFF8F3' : 'border: 1px solid #DDD8CE; background: #FFFFFF') + (k === 'project' ? '; grid-column: 1 / -1' : ''))}>
                    <svg width="44" height="34" viewBox="0 0 44 34" aria-hidden="true"><rect x="3" y="3" width="38" height="28" rx="1.5" fill="#EFE9DE" stroke="#1C1B19" strokeWidth="1.2" /><path d={path} fill="none" stroke="#1C1B19" strokeWidth={k === 'knob' ? 5 : k === 'push' ? 0 : k === 'profile' || k === 'project' ? 3 : 2.4} strokeLinecap="round" /></svg>
                    <span style={sx('font-size: 12px; line-height: 1.25; text-align: left')}>{openText(k, t)}</span>
                  </button>
                );
              })}
            </div>
            {eff === 'bar' && (
              <label style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #5F5A52')}>Razmak rupa šipke
                <select aria-label="Razmak rupa šipke" value={spacing} onChange={e => setOp({ spacing: Number(e.target.value) as OpeningSpec['spacing'] })} style={sx('font: inherit; font-size: 13px; min-height: 38px; padding: 0 8px; border: 1px solid #DDD8CE; border-radius: 6px; background: #FFFFFF')}>
                  {[96, 128, 160, 192, 320].map(v => <option key={v} value={v}>{v} mm (dužina ~{v + 32})</option>)}
                </select>
              </label>
            )}
            {eff === 'profile' && <div style={sx('font-size: 12px; color: #5F5A52; line-height: 1.45; background: #F3F1EC; border-radius: 6px; padding: 8px 10px')}>Alu profil se navlači na gornju ivicu fronte (kod gornjih elemenata na donju). Fronta je kraća za <strong>{prof} mm</strong>; profil ide u okov u metrima.</div>}
            {eff === 'push' && <div style={sx('font-size: 12px; color: #5F5A52; line-height: 1.45; background: #F3F1EC; border-radius: 6px; padding: 8px 10px')}>Bez ručke: krilo i fioka se otvaraju pritiskom. Šarke su bez opruge + potiskivač po krilu, fioke na vođicama sa potiskivanjem. Zazor fronti ostaje {rules.frontGap} mm.</div>}
            {eff && eff !== 'push' && (
              <div role="group" aria-label="Boja ručke" style={sx('display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 12px; color: #5F5A52')}>Boja:
                {HCOL.map(([k, t, c]) => {
                  const on = (op?.color ?? 'black') === k;
                  return <button key={k} type="button" aria-pressed={on} onClick={() => setOp({ color: k })} style={sx('font: inherit; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; min-height: 32px; border-radius: 16px; cursor: pointer; ' + (on ? 'border: 1px solid #1C1B19; background: #1C1B19; color: #FFFFFF' : 'border: 1px solid #DDD8CE; background: #FFFFFF; color: #1C1B19'))}><span style={sx(`width: 12px; height: 12px; border-radius: 50%; border: 1px solid #8A8378; background: ${c || frontFill}`)} />{t}</button>;
                })}
              </div>
            )}
          </section>

          <section style={sx('display: flex; flex-direction: column; gap: 10px')}>
            <h2 style={sx(H2)}>5 · Materijali</h2>
            {([['carcass', 'Korpus'], ['front', 'Fronta']] as const).map(([k, t]) => (
              <label key={k} style={sx('display: grid; grid-template-columns: 30px 1fr; gap: 4px 10px; align-items: center; font-size: 12px; color: #5F5A52')}>
                <span style={sx(`width: 30px; height: 30px; border-radius: 4px; border: 1px solid #DDD8CE; background: ${swatch(matName(d[k])) || 'repeating-linear-gradient(90deg, #E7E1D5 0 3px, #FFFFFF 3px 6px)'}`)} />
                <span style={sx('display: flex; flex-direction: column; gap: 3px')}>{t}
                  <select aria-label={t} value={d[k]} onChange={e => set({ [k]: e.target.value })} style={sx('font: inherit; font-size: 13px; min-height: 36px; padding: 0 6px; border: 1px solid #DDD8CE; border-radius: 6px; background: #FFFFFF; color: #1C1B19')}>
                    {boards.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </span>
              </label>
            ))}
            <label style={sx('display: grid; grid-template-columns: 30px 1fr; gap: 4px 10px; align-items: center; font-size: 12px; color: #5F5A52')}>
              <span style={sx('width: 30px; height: 30px; border-radius: 4px; border: 1px solid #DDD8CE; background: repeating-linear-gradient(90deg, #E7E1D5 0 3px, #FFFFFF 3px 6px)')} />
              <span style={sx('display: flex; flex-direction: column; gap: 3px')}>Kant fronte (pravilo projekta)
                <select aria-label="Kant fronte" value={rules.frontEdge.thickness} onChange={e => change(p => ({ ...p, rules: { ...p.rules, frontEdge: { ...p.rules.frontEdge, thickness: Number(e.target.value) } } }))} style={sx('font: inherit; font-size: 13px; min-height: 36px; padding: 0 6px; border: 1px solid #DDD8CE; border-radius: 6px; background: #FFFFFF; color: #1C1B19')}>
                  <option value={2}>ABS 2 mm u boji fronte</option>
                  <option value={1}>ABS 1 mm u boji fronte</option>
                  <option value={0.4}>ABS 0,4 mm</option>
                </select>
              </span>
            </label>
          </section>
        </aside>

        <main style={sx('flex: 1 1 auto; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: #FAF8F4')}>
          <div style={sx('display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid #E4DFD5; font-size: 13px; color: #5F5A52')}>
            <strong style={sx('color: #1C1B19')}>Spreda</strong> · mere u mm · isprekidani trougao = strana šarki
            <span style={sx('margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap')}>
              {warns.map(w => <span key={w.text} style={sx(wst(w.bad))}>{w.text}</span>)}
            </span>
          </div>
          <div style={sx('flex: 1; min-height: 0; padding: 16px; display: flex; align-items: center; justify-content: center')}>
            <svg viewBox={vb} preserveAspectRatio="xMidYMid meet" role="img" style={sx('width: 100%; height: 100%; max-width: 900px; font-family: var(--font-mono)')}
              aria-label={`Izgled spreda: ${L.t} ${W} × ${H}, ${rows.map(({ row, h }) => `${RTYPES.find(t => t[0] === row.type)?.[1].toLowerCase() ?? row.type} ${h}`).join(', ')}`}>
              <path d={Rr(0, 0, W, H)} fill="#FFFFFF" stroke="#1C1B19" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
              <path d={P ? Rr(40, H, W - 40, P) : 'M0 0'} fill="#D9D3C7" stroke="#1C1B19" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <path d={dFront || 'M0 0'} fill={frontFill} stroke="#1C1B19" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
              <path d={dApp || 'M0 0'} fill="#2B2A28" />
              <path d={dGlass || 'M0 0'} fill="#D6E3F5" stroke="#8A97AA" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <path d={dOpen || 'M0 0'} fill="none" stroke="#8A8378" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <path d={dSwing || 'M0 0'} fill="none" stroke="#5F5A52" strokeWidth="1" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
              <path d={dHand || 'M0 0'} fill="none" stroke={op?.color === 'front' ? '#5F5A52' : hc[2]} strokeWidth={eff === 'knob' ? 26 : eff === 'profile' ? 9 : 12} strokeLinecap="round" />
              <path d={dDim} fill="none" stroke="#B4440E" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              {dimTexts.map((t, i) => <text key={i} x={t.x} y={t.y} fontSize={t.fs} textAnchor="middle" fill="#7C2D0A" transform={t.tr || undefined}>{t.t}</text>)}
            </svg>
          </div>
        </main>

        <aside aria-label="Delovi i okov" className="k-side" style={sx('flex: 0 0 360px; min-height: 0; overflow-y: auto; background: #FFFFFF; border-left: 1px solid #DDD8CE; padding: 16px 18px 24px; display: flex; flex-direction: column; gap: 16px; box-sizing: border-box')}>
          <div>
            <h2 style={sx('margin: 0 0 8px; font-size: 16px; display: flex; align-items: center')}>Krojna lista elementa<Tip k="config.cutList" align="left" /></h2>
            <table style={sx('width: 100%; border-collapse: collapse; font-size: 12.5px')}>
              <thead><tr style={sx('text-align: left; color: #5F5A52; border-bottom: 1px solid #DDD8CE')}><th style={sx('padding: 6px 4px; font-weight: 600')}>Deo</th><th style={sx('padding: 6px 4px; font-weight: 600; text-align: right')}>Kom</th><th style={sx('padding: 6px 4px; font-weight: 600; text-align: right')}>Mera</th></tr></thead>
              <tbody>
                {parts.map((p, i) => (
                  <tr key={i} style={sx('border-bottom: 1px solid #EFEBE3')}><td style={sx('padding: 6px 4px')}>{p.n}<div style={sx('font-size: 11px; color: #5F5A52')}>{p.m}</div></td><td style={sx("padding: 6px 4px; text-align: right; font-family: var(--font-mono)")}>{p.q}</td><td style={sx("padding: 6px 4px; text-align: right; font-family: var(--font-mono); white-space: nowrap")}>{p.s}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 style={sx('margin: 0 0 8px; font-size: 16px')}>Okov</h2>
            {hw.map(h => (
              <div key={h.n} style={sx('display: flex; justify-content: space-between; gap: 10px; font-size: 13px; padding: 6px 8px; border-radius: 6px; ' + (h.dep ? 'background: #FBE3D3; color: #7C2D0A' : 'background: #F3F1EC; color: #1C1B19'))}><span>{h.n}</span><span style={sx("font-family: var(--font-mono); white-space: nowrap")}>{h.q}</span></div>
            ))}
          </div>
          <div style={sx('font-size: 12px; color: #5F5A52; line-height: 1.5; border-top: 1px solid #DDD8CE; padding-top: 12px')}>Narandžasto označene stavke zavise od izabranog načina otvaranja.</div>
        </aside>
      </div>

      {save !== null && (
        <div style={sx('position: fixed; inset: 0; background: rgba(28,27,25,0.45); display: flex; align-items: center; justify-content: center; z-index: 100')}>
          <div role="dialog" aria-modal="true" aria-label="Sačuvaj kao šablon" style={sx('width: min(440px, calc(100% - 32px)); background: #FFFFFF; border-radius: 12px; padding: 22px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.25)')}>
            <h2 style={sx('margin: 0; font-size: 18px')}>Sačuvaj kao šablon</h2>
            <label style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #5F5A52')}>Naziv u biblioteci<input type="text" value={save} onChange={e => setSave(e.target.value)} style={sx('font: inherit; font-size: 15px; padding: 10px; border: 1px solid #B4440E; border-radius: 6px; color: #1C1B19')} /></label>
            <p style={sx('margin: 0; font-size: 13px; color: #5F5A52; line-height: 1.5')}>Šablon čuva mere, raspored fronti, unutrašnjost, otvaranje i materijale. Pojaviće se u grupi „Moji šabloni" u biblioteci Prostora i dodaje se jednim klikom.</p>
            <div style={sx('display: flex; justify-content: flex-end; gap: 8px')}>
              <button type="button" onClick={() => setSave(null)} style={sx('font: inherit; font-size: 14px; min-height: 42px; padding: 0 14px; border-radius: 6px; border: 1px solid #DDD8CE; background: #FFFFFF; cursor: pointer')}>Otkaži</button>
              <button type="button" onClick={doSave} style={sx('font: inherit; font-size: 14px; font-weight: 600; min-height: 42px; padding: 0 16px; border-radius: 6px; border: 0; background: #B4440E; color: #FFFFFF; cursor: pointer')}>Sačuvaj</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div role="status" style={sx('position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: #1C1B19; color: #FFFFFF; padding: 12px 16px; border-radius: 8px; font-size: 14px; z-index: 110; box-shadow: 0 8px 24px rgba(0,0,0,0.25)')}>{toast}</div>}
    </div>
  );
}
