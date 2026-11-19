// Quick start screen (design/screens/BrziStart.html): four questions → auto-laid-out kitchen (docs/BRZI_START.md).
import {
  autoLayout, DEFAULT_ELEMENT_MATERIALS, DEFAULT_MATERIALS, DEFAULT_RULES, PRESETS,
  quickStartRoom, type Element, type Project, type QuickStartInput, type Shape,
} from 'engine';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Header } from './Header';
import { Tip } from './help';
import { num } from './labels';
import { useProject } from './store';
import { useWorkshop } from './workshop';
import { newProjectId } from './projects';

const SHAPES: { id: Shape; label: string }[] = [
  { id: 'I', label: 'Ravna' }, { id: 'L', label: 'Ugaona (L)' }, { id: 'U', label: 'U oblik' },
];
// shortcut: "last project" uses the workshop preset until projects and workshop settings are stored (Supabase step).
const PRESET_OPTIONS = [
  { id: 'last', preset: 'workshop', label: 'Kao u poslednjem projektu (bela + siva U708)' },
  { id: 'workshop', preset: 'workshop', label: 'Šablon radionice: Standard' },
  { id: 'en1116', preset: 'en1116', label: 'EN 1116 podrazumevano' },
] as const;
// Preview per the design: names and colours of the boxes and chips.
const NAME: Record<Element['kind'], string> = {
  'corner-blind': 'ugaoni', base: 'donji', drawer: 'fiokar', sink: 'sudopera', 'appliance-front': 'MSP', oven: 'rerna', filler: 'filer', tall: 'frižider', wall: 'gornji',
};
const FILL: Partial<Record<Element['kind'], string>> = { sink: '#C9DAF2', oven: '#3A3936', filler: '#D6CDBC', tall: '#C9BEA9' };


export function QuickStart() {
  const navigate = useNavigate();
  const setProject = useProject(s => s.setProject);
  const [shape, setShape] = useState<Shape>('L');
  const [f, setF] = useState({ a: '3200', b: '2400', c: '2000', water: '1500', p400: '900', winFrom: '1100', winW: '1000' });
  const [opts, setOpts] = useState({ dishwasher: true, fridge: true, wallUnits: true });
  const walls = shape === 'I' ? ['A'] : shape === 'L' ? ['A', 'B'] : ['A', 'B', 'C'];
  const [source, setSource] = useState<(typeof PRESET_OPTIONS)[number]['id']>('last');
  const presetId = PRESET_OPTIONS.find(o => o.id === source)!.preset;

  const input: QuickStartInput = {
    shape, a: num(f.a), b: num(f.b), c: num(f.c), water: num(f.water), power400: num(f.p400),
    window: num(f.winW) ? { offset: num(f.winFrom), width: num(f.winW) } : undefined, ...opts,
  };
  const layout = autoLayout(input, PRESETS[presetId], DEFAULT_ELEMENT_MATERIALS);
  const project: Project = {
    id: 'quick-start', name: 'Brzi start', unit: 'mm', presetId,
    room: quickStartRoom(input), elements: layout.elements, rules: DEFAULT_RULES, materials: DEFAULT_MATERIALS,
    opening: { kind: useWorkshop.getState().opening },
  };
  const open = (path: string) => {
    setProject({ ...project, id: newProjectId(), name: `Kuhinja ${shape === 'I' ? 'ravna' : shape === 'L' ? 'ugaona (L)' : 'U'}` });
    navigate(path);
  };
  const floor = layout.elements.filter(e => e.kind !== 'wall');
  const uppers = layout.elements.filter(e => e.kind === 'wall');
  const talls = floor.filter(e => e.kind === 'tall');
  const lowers = floor.filter(e => e.kind !== 'tall' && e.kind !== 'filler');
  const { a, b, c } = input as Required<Pick<QuickStartInput, 'a' | 'b' | 'c'>>;
  const bRun = Math.max(0, (opts.fridge ? b - 600 : b) - 600);
  const worktop = shape === 'I' ? `${a}` : shape === 'L' ? `${a} + ${bRun}` : `${a} + ${bRun} + ${c - 600}`;

  // Preview room per the design: plan in pixels, walls measured from the corner with A (wall B is stored flipped).
  const H = shape === 'I' ? 600 : Math.max(b, shape === 'U' ? c : 0);
  const k = a > 0 ? Math.min(560 / a, 340 / Math.max(H, 600)) : 0.1;
  const px = (v: number) => Math.round(v * k), D = px(600);
  const box = (e: Element) => {
    const x = e.wallId === 'B' ? H - e.offset - e.width : e.offset;
    return e.wallId === 'A' ? { left: px(x), top: 0, width: px(e.width), height: D }
      : { left: e.wallId === 'B' ? 0 : px(a) - D, top: px(x), width: D, height: px(e.width) };
  };
  const mark = (left: number, top: number, bg: string, fg: string, t: string) => (
    <div key={t} className="qs-mark" style={{ left: left - 9, top: top - 9, background: bg, color: fg }}>{t}</div>
  );

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
    <div className="app app-fixed">
      <Header kind="new" />

      <div className="layout">
        <main className="form">
          <div>
            <h1>Kuhinja za 2 minuta</h1>
            <p className="muted">Četiri pitanja — Kroj složi elemente po pravilima radionice. Sve posle možeš da menjaš.</p>
          </div>

          <section>
            <h2><span className="step">1</span> Oblik<Tip k="quick.shape" /></h2>
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
            <h2><span className="step">2</span> Dužine zidova (mm)<Tip k="quick.walls" /></h2>
            <div className="grid3">
              {field('a', 'Zid A')}
              {shape !== 'I' && field('b', 'Zid B')}
              {shape === 'U' && field('c', 'Zid C')}
            </div>
          </section>

          <section>
            <h2><span className="step">3</span> Gde su voda i struja (mm od ugla)<Tip k="quick.install" /></h2>
            <div className="grid2">
              {field('water', <span><span className="dot water" />Voda i odvod · zid A</span>)}
              {field('p400', <span><span className="dot power" />Trofazna (rerna/ploča) · {shape === 'I' ? 'zid A' : 'zid B'}</span>)}
              {field('winFrom', 'Prozor na zidu A · od ugla', 'nema')}
              {field('winW', 'Širina prozora', 'nema')}
            </div>
          </section>

          <section>
            <h2><span className="step">4</span> Šta ide u kuhinju<Tip k="quick.options" /></h2>
            {check('dishwasher', 'Ugradna mašina za sudove')}
            {check('fridge', 'Visoki element za ugradni frižider')}
            {check('wallUnits', 'Gornji elementi (zaobilaze prozor)')}
            <label className="field">
              Materijali i mere
              <select value={source} onChange={e => setSource(e.target.value as typeof source)}>
                {PRESET_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
          </section>

        </main>

        <section aria-label="Rezultat" className="result">
          <div className="result-head">
            <h2>Složeno automatski<Tip k="quick.preview" /></h2>
            {!layout.error && <span className="muted">{lowers.length} donjih · {uppers.length} gornjih · {talls.length} visoki · radna ploča {worktop} mm</span>}
          </div>

          {layout.error && <div className="alert" role="alert">{layout.error}</div>}
          <div className="qs-preview">
            {!layout.error && (
              <div className={`qs-room qs-${shape}`} style={{ width: px(a), height: shape === 'I' ? D + 20 : px(H) }}>
                {floor.map(e => {
                  const st = box(e);
                  return (
                    <div key={e.id} title={`${e.label} · ${NAME[e.kind]} ${e.width}`} className="qs-box"
                      style={{ ...st, background: FILL[e.kind] ?? '#E7E1D5', color: e.kind === 'oven' ? '#FFFFFF' : '#1C1B19' }}>
                      {st.width >= 26 && st.height >= 18 ? e.label : ''}
                    </div>
                  );
                })}
                {/* shortcut: the design marks the three-phase outlet with a yellow S here (T in the plan). */}
                {!!input.water && mark(px(input.water), -6, '#1E50C8', '#FFFFFF', 'V')}
                {!!input.power400 && (shape === 'I' ? mark(px(input.power400), -6, '#F2B630', '#1C1B19', 'S') : mark(-6, px(input.power400), '#F2B630', '#1C1B19', 'S'))}
                {input.window && <div className="qs-window" style={{ left: px(input.window.offset), width: px(input.window.width) }} />}
              </div>
            )}
          </div>
          {layout.warnings.map(w => <div key={w} className="alert">{w}</div>)}

          {!layout.error && (
            <div className="chips">
              {floor.map(e => <span key={e.id} className={`chip${e.kind === 'sink' ? ' chip-sink' : ''}`}>{e.label} {NAME[e.kind]} {e.width}</span>)}
              {uppers.length > 0 && <span className="chip chip-upper">{uppers.length} gornjih ({uppers.map(u => u.width).join(', ')})</span>}
            </div>
          )}

          <div className="actions">
            <button type="button" className="primary" disabled={!!layout.error} onClick={() => open('/projekat')}>Napravi projekat i doteraj</button>
            <button type="button" disabled={!!layout.error} onClick={() => open('/krojna-lista')}>Odmah krojna lista</button>
            <button type="button" disabled={!!layout.error} onClick={() => open('/ponuda')}>Odmah cena za kupca</button>
          </div>
        </section>
      </div>
    </div>
  );
}
