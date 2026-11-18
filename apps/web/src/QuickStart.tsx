// Quick start screen (design/BrziStart.dc.html): four questions → auto-laid-out kitchen.
import {
  autoLayout, DEFAULT_ELEMENT_MATERIALS, DEFAULT_MATERIALS, DEFAULT_RULES, generateParts, PRESETS,
  quickStartRoom, worktops, type Element, type Project, type QuickStartInput, type Shape,
} from 'engine';
import { useState } from 'react';

const KIND_NAME: Record<string, string> = {
  'corner-blind': 'ugaoni', base: 'donji', sink: 'sudopera', 'appliance-front': 'MSP',
  oven: 'rerna', filler: 'filer', tall: 'frižider', wall: 'gornji',
};
const KIND_FILL: Record<string, string> = {
  'corner-blind': '#E7E1D5', base: '#E7E1D5', sink: '#C9DAF2', 'appliance-front': '#E7E1D5',
  oven: '#3A3936', filler: '#D6CDBC', tall: '#C9BEA9',
};
const SHAPES: { id: Shape; label: string }[] = [
  { id: 'I', label: 'Ravna' }, { id: 'L', label: 'Ugaona (L)' }, { id: 'U', label: 'U oblik' },
];
const PRESET_OPTIONS = [
  { id: 'workshop', label: 'Šablon radionice: Standard' },
  { id: 'en1116', label: 'EN 1116 podrazumevano' },
] as const;
const DEPTH = 600; // drawn depth of base units in the plan

const num = (v: string) => { const n = parseInt(v.replace(/\D/g, ''), 10); return isNaN(n) ? 0 : n; };

export function QuickStart() {
  const [shape, setShape] = useState<Shape>('L');
  const [f, setF] = useState({ a: '3200', b: '2400', c: '2000', water: '1500', p400: '900', winFrom: '1100', winW: '1000' });
  const [opts, setOpts] = useState({ dishwasher: true, fridge: true, wallUnits: true });
  const [presetId, setPresetId] = useState<(typeof PRESET_OPTIONS)[number]['id']>('workshop');

  const input: QuickStartInput = {
    shape, a: num(f.a), b: num(f.b), c: num(f.c), water: num(f.water), power400: num(f.p400),
    window: num(f.winW) ? { offset: num(f.winFrom), width: num(f.winW) } : undefined, ...opts,
  };
  const layout = autoLayout(input, PRESETS[presetId], DEFAULT_ELEMENT_MATERIALS);
  const project: Project = {
    id: 'quick-start', name: 'Brzi start', unit: 'mm', presetId,
    room: quickStartRoom(input), elements: layout.elements, rules: DEFAULT_RULES, materials: DEFAULT_MATERIALS,
  };
  const lowers = layout.elements.filter(e => e.kind !== 'wall' && e.kind !== 'tall');
  const uppers = layout.elements.filter(e => e.kind === 'wall');
  const talls = layout.elements.filter(e => e.kind === 'tall');
  const pieces = layout.error ? 0 : generateParts(project).reduce((s, p) => s + p.qty, 0);
  const tops = worktops(project, PRESETS[presetId].worktopDepth, PRESETS[presetId].worktopThickness);

  const field = (key: keyof typeof f, label: React.ReactNode, placeholder?: string) => (
    <label className="field">
      {label}
      <input type="text" inputMode="numeric" value={f[key]} placeholder={placeholder}
        onChange={e => setF({ ...f, [key]: e.target.value })} />
    </label>
  );
  const check = (key: keyof typeof opts, label: string) => (
    <label className="check">
      <input type="checkbox" checked={opts[key]} onChange={e => setOpts({ ...opts, [key]: e.target.checked })} />
      {label}
    </label>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="3" width="22" height="22" rx="3" fill="none" stroke="#F3F1EC" strokeWidth="2" /><path d="M3 11h22M11 11v14" stroke="#E2804D" strokeWidth="2" /></svg>
          <span>Kroj</span>
        </div>
        <div className="muted-light">Novi projekat</div>
        <nav aria-label="Načini početka" className="tabs">
          <a aria-current="page">Brzi start</a>
        </nav>
      </header>

      <div className="layout">
        <main className="form">
          <div>
            <h1>Kuhinja za 2 minuta</h1>
            <p className="muted">Četiri pitanja — Kroj složi elemente po pravilima radionice. Sve posle možeš da menjaš.</p>
          </div>

          <section>
            <h2><span className="step">1</span> Oblik</h2>
            <div role="group" aria-label="Oblik kuhinje" className="grid3">
              {SHAPES.map(s => (
                <button key={s.id} type="button" aria-pressed={shape === s.id} className="shape" onClick={() => setShape(s.id)}>
                  <span className={`shape-icon shape-${s.id}`} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2><span className="step">2</span> Dužine zidova (mm)</h2>
            <div className="grid3">
              {field('a', 'Zid A')}
              {shape !== 'I' && field('b', 'Zid B')}
              {shape === 'U' && field('c', 'Zid C')}
            </div>
          </section>

          <section>
            <h2><span className="step">3</span> Gde su voda i struja (mm od ugla)</h2>
            <div className="grid2">
              {field('water', <span><span className="dot water" />Voda i odvod · zid A</span>)}
              {field('p400', <span><span className="dot power" />Trofazna (rerna/ploča) · {shape === 'I' ? 'zid A' : 'zid B'}</span>)}
              {field('winFrom', 'Prozor na zidu A · od ugla', 'nema')}
              {field('winW', 'Širina prozora', 'nema')}
            </div>
          </section>

          <section>
            <h2><span className="step">4</span> Šta ide u kuhinju</h2>
            {check('dishwasher', 'Ugradna mašina za sudove')}
            {check('fridge', 'Visoki element za ugradni frižider')}
            {check('wallUnits', 'Gornji elementi (zaobilaze prozor)')}
            <label className="field">
              Materijali i mere
              <select value={presetId} onChange={e => setPresetId(e.target.value as typeof presetId)}>
                {PRESET_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
          </section>
        </main>

        <section aria-label="Rezultat" className="result">
          <div className="result-head">
            <h2>Složeno automatski</h2>
            {!layout.error && (
              <span className="muted">
                {lowers.length} donjih · {uppers.length} gornjih · {talls.length} visoki · radna ploča {tops.map(t => t.length).join(' + ')} mm · {pieces} delova
              </span>
            )}
          </div>

          {layout.error && <div className="alert" role="alert">{layout.error}</div>}
          {!layout.error && <Plan input={input} elements={layout.elements} />}
          {layout.warnings.map(w => <div key={w} className="alert">{w}</div>)}

          {!layout.error && (
            <div className="chips">
              {[...lowers, ...talls].map(e => (
                <span key={e.id} className={`chip${e.kind === 'sink' ? ' chip-sink' : ''}`}>{e.label} {KIND_NAME[e.kind]} {e.width}</span>
              ))}
              {uppers.length > 0 && <span className="chip chip-upper">{uppers.length} gornjih ({uppers.map(u => u.width).join(', ')})</span>}
            </div>
          )}

          <div className="actions">
            {/* shortcut: actions are disabled until the editor, cut list and quote screens exist (MVP steps 3–7). */}
            <button type="button" className="primary" disabled title="Uskoro">Napravi projekat i doteraj</button>
            <button type="button" disabled title="Uskoro">Odmah krojna lista</button>
            <button type="button" disabled title="Uskoro">Odmah cena za kupca</button>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Top-down plan in mm: wall A along the top, B down the left side, C down the right side. */
function Plan({ input, elements }: { input: QuickStartInput; elements: Element[] }) {
  const { shape, a, b = 0, c = 0 } = input;
  const h = shape === 'I' ? DEPTH : Math.max(b, shape === 'U' ? c : 0);
  const pad = 160;
  const rect = (e: Element) =>
    e.wallId === 'A' ? { x: e.offset, y: 0, w: e.width, h: DEPTH }
    : e.wallId === 'B' ? { x: 0, y: e.offset, w: DEPTH, h: e.width }
    : { x: a - DEPTH, y: e.offset, w: DEPTH, h: e.width };
  const lowers = elements.filter(e => e.kind !== 'wall');
  const mark = (x: number, y: number, fill: string, text: string, color: string) => (
    <g>
      <circle cx={x} cy={y} r={55} fill={fill} stroke="#FFFFFF" strokeWidth={10} />
      <text x={x} y={y} fill={color} className="plan-mark">{text}</text>
    </g>
  );
  const p400 = input.power400 ?? 0;

  return (
    <div className="plan">
      <svg viewBox={`${-pad} ${-pad} ${a + 2 * pad} ${h + 2 * pad}`} role="img"
        aria-label={`Tlocrt: ${lowers.map(e => `${e.label} ${KIND_NAME[e.kind]} ${e.width}`).join(', ')}`}>
        <path d={`${shape !== 'I' ? `M0 ${b}` : 'M0 0'} L0 0 L${a} 0 ${shape === 'U' ? `L${a} ${c}` : ''}`}
          fill="none" stroke="#1C1B19" strokeWidth={60} strokeLinejoin="miter" transform="translate(0 -30)" />
        {lowers.map(e => {
          const r = rect(e);
          return (
            <g key={e.id}>
              <title>{`${e.label} · ${KIND_NAME[e.kind]} ${e.width}`}</title>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={KIND_FILL[e.kind]} stroke="#1C1B19" strokeWidth={8} />
              {Math.min(r.w, r.h) >= 250 && (
                <text x={r.x + r.w / 2} y={r.y + r.h / 2} className="plan-label" fill={e.kind === 'oven' ? '#FFFFFF' : '#1C1B19'}>{e.label}</text>
              )}
            </g>
          );
        })}
        {input.window?.width ? <rect x={input.window.offset} y={-110} width={input.window.width} height={50} fill="#C9DAF2" stroke="#1C1B19" strokeWidth={8} /> : null}
        {input.water ? mark(input.water, -90, '#1E50C8', 'V', '#FFFFFF') : null}
        {p400 ? (shape === 'I' ? mark(p400, -90, '#F2B630', 'S', '#1C1B19') : mark(-90, p400, '#F2B630', 'S', '#1C1B19')) : null}
      </svg>
    </div>
  );
}
