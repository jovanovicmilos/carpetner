// Quick start screen (design/BrziStart.dc.html): four questions → auto-laid-out kitchen.
import {
  autoLayout, DEFAULT_ELEMENT_MATERIALS, DEFAULT_MATERIALS, DEFAULT_RULES, generateParts, PRESETS,
  quickStartRoom, syncWalls, worktops, type Obstacle, type Project, type QuickStartInput, type Shape,
} from 'engine';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Header } from './Header';
import { Tip } from './help';
import { KIND_NAME, num, OBSTACLE_NAME } from './labels';
import { fitView, Plan } from './Plan';
import { useProject } from './store';

const SHAPES: { id: Shape; label: string }[] = [
  { id: 'I', label: 'Ravna' }, { id: 'L', label: 'Ugaona (L)' }, { id: 'U', label: 'U oblik' },
];
const PRESET_OPTIONS = [
  { id: 'workshop', label: 'Šablon radionice: Standard' },
  { id: 'en1116', label: 'EN 1116 podrazumevano' },
] as const;
type ObstacleRow = { key: number; wallId: string; kind: Obstacle['kind']; offset: string; width: string; depth: string };


export function QuickStart() {
  const navigate = useNavigate();
  const setProject = useProject(s => s.setProject);
  const [shape, setShape] = useState<Shape>('L');
  const [f, setF] = useState({ a: '3200', b: '2400', c: '2000', water: '1500', p400: '900', winFrom: '1100', winW: '1000' });
  const [opts, setOpts] = useState({ dishwasher: true, fridge: true, wallUnits: true });
  const [obstacles, setObstacles] = useState<ObstacleRow[]>([]);
  const walls = shape === 'I' ? ['A'] : shape === 'L' ? ['A', 'B'] : ['A', 'B', 'C'];
  const updateObstacle = (key: number, patch: Partial<ObstacleRow>) =>
    setObstacles(obstacles.map(o => (o.key === key ? { ...o, ...patch } : o)));
  const [presetId, setPresetId] = useState<(typeof PRESET_OPTIONS)[number]['id']>('workshop');

  const input: QuickStartInput = {
    shape, a: num(f.a), b: num(f.b), c: num(f.c), water: num(f.water), power400: num(f.p400),
    window: num(f.winW) ? { offset: num(f.winFrom), width: num(f.winW) } : undefined, ...opts,
    obstacles: obstacles
      .filter(o => walls.includes(o.wallId) && num(o.width) > 0)
      .map((o, i) => ({ id: `K${i + 1}`, wallId: o.wallId, kind: o.kind, offset: num(o.offset), width: num(o.width), depth: num(o.depth) })),
  };
  const layout = autoLayout(input, PRESETS[presetId], DEFAULT_ELEMENT_MATERIALS);
  const project: Project = {
    id: 'quick-start', name: 'Brzi start', unit: 'mm', presetId,
    room: quickStartRoom(input), elements: layout.elements, rules: DEFAULT_RULES, materials: DEFAULT_MATERIALS,
  };
  const open = (path: string) => {
    setProject({ ...project, room: syncWalls(project.room), id: 'project', name: `Kuhinja ${shape === 'I' ? 'ravna' : shape === 'L' ? 'ugaona (L)' : 'U'}` });
    navigate(path);
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
    <div className="app app-fixed">
      <Header title="Novi projekat" />

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

          <section>
            <h2><span className="step">5</span> Prepreke na zidu (dimnjak, stub)</h2>
            <p className="hint">Od poda do plafona. Elementi i gornji ih zaobilaze.</p>
            {obstacles.map((o, i) => (
              <fieldset key={o.key} className="obstacle">
                <legend>Prepreka {i + 1}</legend>
                <label className="field">Zid
                  <select value={o.wallId} onChange={e => updateObstacle(o.key, { wallId: e.target.value })}>
                    {walls.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </label>
                <label className="field">Vrsta
                  <select value={o.kind} onChange={e => updateObstacle(o.key, { kind: e.target.value as Obstacle['kind'] })}>
                    {Object.entries(OBSTACLE_NAME).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                  </select>
                </label>
                {(['offset', 'width', 'depth'] as const).map(k => (
                  <label key={k} className="field">{{ offset: 'Od ugla', width: 'Širina', depth: 'Dubina' }[k]}
                    <input type="text" inputMode="numeric" value={o[k]} onChange={e => updateObstacle(o.key, { [k]: e.target.value })} />
                  </label>
                ))}
                <button type="button" className="link" onClick={() => setObstacles(obstacles.filter(x => x.key !== o.key))}>Ukloni</button>
              </fieldset>
            ))}
            <button type="button" className="add" onClick={() => setObstacles([...obstacles,
              { key: Math.max(0, ...obstacles.map(x => x.key)) + 1, wallId: 'A', kind: 'chimney', offset: '', width: '400', depth: '300' }])}>
              + Dodaj prepreku
            </button>
          </section>
        </main>

        <section aria-label="Rezultat" className="result">
          <div className="result-head">
            <h2 className="field-label">Složeno automatski<Tip k="quick.preview" /></h2>
            {!layout.error && (
              <span className="muted">
                {lowers.length} donjih · {uppers.length} gornjih · {talls.length} visoki · radna ploča {tops.map(t => t.length).join(' + ')} mm · {pieces} delova
              </span>
            )}
          </div>

          {layout.error && <div className="alert" role="alert">{layout.error}</div>}
          {!layout.error && <div className="plan-wrap preview"><div className="plan-box"><Plan project={project} view={fitView(project, 500)} /></div></div>}
          {!layout.error && <p className="hint">Ovo je pregled. Elemente pomeraš i menjaš posle klika na „Napravi projekat i doteraj“.</p>}
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
            {/* shortcut: quote is disabled until its screen exists (MVP step 7). */}
            <button type="button" className="primary" disabled={!!layout.error} onClick={() => open('/projekat')}>Napravi projekat i doteraj</button>
            <button type="button" disabled={!!layout.error} onClick={() => open('/krojna-lista')}>Odmah krojna lista</button>
            <button type="button" disabled title="Uskoro">Odmah cena za kupca</button>
          </div>
        </section>
      </div>
    </div>
  );
}
