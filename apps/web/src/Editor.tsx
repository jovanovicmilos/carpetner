// Project editor: interactive 2D plan (design/Main.dc.html). Drag units along walls, edit in the side panel.
import {
  DEFAULT_ELEMENT_MATERIALS, firstFreeOffset, generateParts, labelPrefix, layoutWarnings, makeElement, nextId,
  PRESETS, verticalRange, worktops, type Element, type ElementKind, type Mm, type Obstacle, type Project,
} from 'engine';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Header } from './Header';
import { KIND_NAME, num, OBSTACLE_NAME } from './labels';
import { Plan } from './Plan';
import { useProject } from './store';

const PALETTE: { kind: ElementKind; width: Mm; label: string }[] = [
  { kind: 'base', width: 600, label: 'Donji element' },
  { kind: 'sink', width: 800, label: 'Sudopera' },
  { kind: 'drawer', width: 600, label: 'Fiokar' },
  { kind: 'oven', width: 600, label: 'Rerna' },
  { kind: 'appliance-front', width: 600, label: 'MSP (fronta)' },
  { kind: 'corner-blind', width: 1000, label: 'Ugaoni element' },
  { kind: 'filler', width: 100, label: 'Filer' },
  { kind: 'tall', width: 600, label: 'Visoki (frižider)' },
  { kind: 'wall', width: 600, label: 'Gornji element' },
];
const presetOf = (p: Project) => PRESETS[p.presetId === 'none' ? 'workshop' : p.presetId];

export function Editor() {
  const { project, change, undo, past } = useProject();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layer, setLayer] = useState<'lower' | 'upper'>('lower');
  const [targetWall, setTargetWall] = useState('A');

  const selected = project?.elements.find(e => e.id === selectedId) ?? project?.room.obstacles?.find(o => o.id === selectedId);

  const updateItem = (id: string, patch: Partial<Element> | Partial<Obstacle>, record = true) => change(p => ({
    ...p,
    elements: p.elements.map(e => (e.id === id ? { ...e, ...patch } as Element : e)),
    room: { ...p.room, obstacles: p.room.obstacles?.map(o => (o.id === id ? { ...o, ...patch } as Obstacle : o)) },
  }), record);
  const removeItem = (id: string) => {
    change(p => ({ ...p, elements: p.elements.filter(e => e.id !== id), room: { ...p.room, obstacles: p.room.obstacles?.filter(o => o.id !== id) } }));
    setSelectedId(null);
  };

  // Keyboard: arrows move the selection (50 mm, Shift = 10 mm), Delete removes, Esc deselects, Cmd/Ctrl+Z undoes.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement).closest('input, select, textarea')) return;
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'z') { ev.preventDefault(); undo(); return; }
      if (!selected || !project) return;
      const wall = project.room.walls.find(w => w.id === selected.wallId);
      const step = ev.shiftKey ? 10 : 50;
      const dir = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[ev.key];
      if (dir && wall) {
        ev.preventDefault();
        updateItem(selected.id, { offset: Math.max(0, Math.min(wall.length - selected.width, selected.offset + dir * step)) });
      } else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); removeItem(selected.id); }
      else if (ev.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!project) return <Navigate to="/" replace />;

  const walls = project.room.walls.map(w => w.id);
  const dims = presetOf(project);
  const warnings = layoutWarnings(project);
  const pieces = generateParts(project).reduce((s, p) => s + p.qty, 0);
  const tops = worktops(project, dims.worktopDepth, dims.worktopThickness);

  const addElement = (kind: ElementKind, width: Mm) => {
    const id = nextId(project.elements.map(e => e.id), labelPrefix(kind));
    const el = makeElement(kind, targetWall, 0, width, id, dims, DEFAULT_ELEMENT_MATERIALS);
    el.offset = firstFreeOffset(project, targetWall, width, verticalRange(el));
    change(p => ({ ...p, elements: [...p.elements, el] }));
    setLayer(kind === 'wall' ? 'upper' : 'lower');
    setSelectedId(id);
  };
  const addObstacle = () => {
    const obstacles = project.room.obstacles ?? [];
    const o: Obstacle = { id: nextId(obstacles.map(x => x.id), 'K'), wallId: targetWall, kind: 'chimney', offset: 0, width: 400, depth: 300 };
    o.offset = firstFreeOffset(project, targetWall, o.width, [0, Infinity]);
    change(p => ({ ...p, room: { ...p.room, obstacles: [...obstacles, o] } }));
    setSelectedId(o.id);
  };

  return (
    <div className="app">
      <Header title={`Projekat: ${project.name}`} />
      <div className="editor">
        <aside className="palette" aria-label="Dodavanje">
          <label className="field">Dodaj na zid
            <select value={targetWall} onChange={e => setTargetWall(e.target.value)}>
              {walls.map(w => <option key={w} value={w}>Zid {w}</option>)}
            </select>
          </label>
          <h2>Elementi</h2>
          {PALETTE.map(p => (
            <button key={p.kind} type="button" className="palette-btn" onClick={() => addElement(p.kind, p.width)}>
              {p.label} <span className="mono">{p.width}</span>
            </button>
          ))}
          <h2>Prostor</h2>
          <button type="button" className="palette-btn" onClick={addObstacle}>Dimnjak / stub</button>
        </aside>

        <main className="canvas">
          <div className="toolbar">
            <h1>Tlocrt prostorije</h1>
            <span className="muted">{project.room.walls.map(w => `${w.id} ${w.length}`).join(' · ')} mm</span>
            <div className="toolbar-actions">
              <div role="group" aria-label="Uređujem" className="segmented">
                <span className="muted small">Uređujem:</span>
                <button type="button" aria-pressed={layer === 'lower'} onClick={() => setLayer('lower')}>Donji i visoki</button>
                <button type="button" aria-pressed={layer === 'upper'} onClick={() => setLayer('upper')}>Gornji</button>
              </div>
              <button type="button" onClick={undo} disabled={!past.length}>Poništi</button>
            </div>
          </div>
          <Plan project={project} layer={layer} selectedId={selectedId} onSelect={setSelectedId}
            onMove={(id, offset, first) => updateItem(id, { offset }, first)} />
          <p className="hint">Uhvati element mišem i prevuci ga duž zida (korak 50 mm, Shift = slobodno). Gornje elemente pomeraš kad izabereš „Gornji“ gore desno. Strelice pomeraju izabrano, Delete briše, Cmd/Ctrl+Z poništava.</p>
          <div className="stats mono">
            {project.elements.length} elemenata · {pieces} delova · radna ploča {tops.map(t => `${t.wallId} ${t.length}`).join(' + ') || '—'} mm
          </div>
          {warnings.map(w => <div key={w} className="alert">{w}</div>)}
        </main>

        <aside className="props" aria-label="Svojstva">
          {!selected && <p className="muted">Izaberi element ili prepreku na tlocrtu.</p>}
          {selected && 'kind' in selected && 'materials' in selected && (
            <ElementPanel key={selected.id} el={selected} walls={walls}
              onChange={patch => updateItem(selected.id, patch)}
              onKind={kind => change(p => ({ ...p, elements: p.elements.map(e => e.id === selected.id
                ? { ...makeElement(kind, e.wallId, e.offset, e.width, e.id, dims, e.materials), label: e.label } : e) }))}
              onRemove={() => removeItem(selected.id)} />
          )}
          {selected && !('materials' in selected) && (
            <ObstaclePanel key={selected.id} o={selected as Obstacle} walls={walls}
              onChange={patch => updateItem(selected.id, patch)} onRemove={() => removeItem(selected.id)} />
          )}
          <Link to="/" className="back">← Brzi start (nova kuhinja)</Link>
        </aside>
      </div>
    </div>
  );
}

/** Number field that commits on blur or Enter, so typing doesn't create an undo step per key. */
function NumField({ label, value, onCommit }: { label: string; value: number | undefined; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value ?? ''));
  useEffect(() => setText(String(value ?? '')), [value]);
  const commit = () => { if (num(text) !== value) onCommit(num(text)); };
  return (
    <label className="field">{label}
      <input type="text" inputMode="numeric" value={text} onChange={e => setText(e.target.value)}
        onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()} />
    </label>
  );
}

function ElementPanel({ el, walls, onChange, onKind, onRemove }: {
  el: Element; walls: string[]; onChange: (p: Partial<Element>) => void; onKind: (k: ElementKind) => void; onRemove: () => void;
}) {
  const hasDoors = ['base', 'sink', 'corner-blind', 'wall'].includes(el.kind);
  const hasShelves = ['base', 'corner-blind', 'wall'].includes(el.kind);
  const hasDrawers = el.kind === 'drawer' || el.kind === 'oven';
  return (
    <div className="panel">
      <div className="muted small">Izabrano · {KIND_NAME[el.kind]}</div>
      <h2>{el.label}</h2>
      <label className="field">Vrsta
        <select value={el.kind} onChange={e => onKind(e.target.value as ElementKind)}>
          {Object.entries(KIND_NAME).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
      </label>
      <label className="field">Zid
        <select value={el.wallId} onChange={e => onChange({ wallId: e.target.value })}>
          {walls.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      <div className="grid2">
        <NumField label="Od ugla" value={el.offset} onCommit={v => onChange({ offset: v })} />
        <NumField label="Širina" value={el.width} onCommit={v => onChange({ width: v })} />
        <NumField label="Visina korpusa" value={el.height} onCommit={v => onChange({ height: v })} />
        <NumField label="Dubina" value={el.depth} onCommit={v => onChange({ depth: v })} />
        {el.kind === 'wall'
          ? <NumField label="Od poda" value={el.elevation} onCommit={v => onChange({ elevation: v })} />
          : el.legs !== undefined && <NumField label="Nogice" value={el.legs} onCommit={v => onChange({ legs: v })} />}
        {hasShelves && <NumField label="Police" value={el.shelves} onCommit={v => onChange({ shelves: v })} />}
      </div>
      {hasDoors && (
        <label className="field">Fronta
          <select value={el.doors ?? 0} onChange={e => onChange({ doors: Number(e.target.value) as 0 | 1 | 2 })}>
            <option value={1}>1 vrata</option><option value={2}>2 vrata</option><option value={0}>bez vrata</option>
          </select>
        </label>
      )}
      {hasDrawers && (
        <label className="field">Fronte fioka (mm, odvojeno zarezom)
          <input type="text" defaultValue={el.drawerFronts?.join(', ')}
            onBlur={e => onChange({ drawerFronts: e.target.value.split(',').map(num).filter(Boolean) })} />
        </label>
      )}
      <button type="button" className="danger" onClick={onRemove}>Obriši element</button>
    </div>
  );
}

function ObstaclePanel({ o, walls, onChange, onRemove }: {
  o: Obstacle; walls: string[]; onChange: (p: Partial<Obstacle>) => void; onRemove: () => void;
}) {
  return (
    <div className="panel">
      <div className="muted small">Izabrano · prepreka</div>
      <h2>{o.id}</h2>
      <label className="field">Vrsta
        <select value={o.kind} onChange={e => onChange({ kind: e.target.value as Obstacle['kind'] })}>
          {Object.entries(OBSTACLE_NAME).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
      </label>
      <label className="field">Zid
        <select value={o.wallId} onChange={e => onChange({ wallId: e.target.value })}>
          {walls.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      <div className="grid2">
        <NumField label="Od ugla" value={o.offset} onCommit={v => onChange({ offset: v })} />
        <NumField label="Širina" value={o.width} onCommit={v => onChange({ width: v })} />
        <NumField label="Dubina" value={o.depth} onCommit={v => onChange({ depth: v })} />
        <NumField label="Od poda" value={o.elevation ?? 0} onCommit={v => onChange({ elevation: v })} />
      </div>
      <button type="button" className="danger" onClick={onRemove}>Obriši prepreku</button>
    </div>
  );
}
