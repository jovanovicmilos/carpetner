// 2D room editor (docs/EDITOR_2D.md, design/Main.dc.html): draw walls, drag units and obstacles from the library,
// move them along or across walls, edit properties, see checks. Every change goes through the engine model.
import {
  autoLayout, DEFAULT_ELEMENT_MATERIALS, DEFAULT_MATERIALS, DEFAULT_RULES, generateParts, labelPrefix, layerOf, layoutIssues,
  makeElement, nextId, nextWallId, placeOnWall, placeUnit, PRESETS, quickStartRoom, roomWalls, setWallLength, sideOf, syncWalls,
  wallGeoms, wallPoint, worktops, type Element, type ElementKind, type Installation, type Obstacle, type Opening, type Placement,
  type Point, type Project, type Room, type Unit,
} from 'engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ElementFields, LenField } from './fields';
import { Header } from './Header';
import { fmt, INSTALLATION_MARK, INSTALLATION_NAME, KIND_NAME, OBSTACLE_NAME } from './labels';
import { ID_PREFIX, LIBRARY, LIBRARY_GROUPS, type LibItem } from './library';
import { fitView, Plan, type Selection, type ViewBox } from './Plan';
import { useProject } from './store';

const presetOf = (p: Project) => PRESETS[p.presetId === 'none' ? 'workshop' : p.presetId];
const emptyProject = (): Project => ({
  id: 'project', name: 'Novi prostor', unit: 'mm', presetId: 'workshop',
  room: { height: 2600, walls: [], openings: [], installations: [], obstacles: [] },
  elements: [], rules: DEFAULT_RULES, materials: DEFAULT_MATERIALS,
});
const exampleProject = (): Project => {
  const input = { shape: 'L' as const, a: 3200, b: 2400, water: 1500, power400: 900, window: { offset: 1100, width: 1000 }, dishwasher: true, fridge: true, wallUnits: true };
  const { elements } = autoLayout(input, PRESETS.workshop, DEFAULT_ELEMENT_MATERIALS);
  return { ...emptyProject(), name: 'Primer kuhinje', room: syncWalls(quickStartRoom(input)), elements };
};

type Drag =
  | { kind: 'item'; sel: Selection; start: Point; off: Point; moved: boolean }
  | { kind: 'pan'; client: Point; view: ViewBox; moved: boolean; at: Point; click: boolean };

export function Editor() {
  const { project, setProject, change, undo, redo, past, future } = useProject();
  const svgRef = useRef<SVGSVGElement>(null);
  const [mode, setMode] = useState<'select' | 'wall'>('select');
  const [armed, setArmed] = useState<LibItem | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);
  const [draft, setDraft] = useState<{ from: Point; chainStart: Point } | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [snap, setSnap] = useState(true);
  const [ortho, setOrtho] = useState(true);
  const [showUp, setShowUp] = useState(true);
  const [view, setView] = useState<ViewBox | null>(null);
  const drag = useRef<Drag | null>(null);
  const libDrag = useRef<LibItem | null>(null);
  const [dragOverPlacement, setDragOverPlacement] = useState<Placement | null>(null);

  // First visit: an empty room; older/Quick start rooms get wall points stored once.
  useEffect(() => {
    if (!project) { setProject(emptyProject()); setMode('wall'); }
    else if (project.room.walls.some(w => !w.a || !w.b)) change(p => ({ ...p, room: syncWalls(p.room) }), false);
  }, [project, setProject, change]);

  const issues = useMemo(() => (project ? layoutIssues(project) : []), [project]);
  const bad = useMemo(() => new Set(issues.flatMap(i => i.ids)), [issues]);
  const currentView = view ?? (project ? fitView(project) : { x: -700, y: -700, w: 4800, h: 3600 });
  // Fit once, then keep the view still while the user draws or drags (no jumps between clicks).
  useEffect(() => { if (project && !view) setView(fitView(project)); }, [project, view]);

  // Wheel zoom around the cursor (native listener: React's wheel listener is passive).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const p = toWorld(ev.clientX, ev.clientY);
      if (p) zoomAt(p, ev.deltaY > 0 ? 1.12 : 1 / 1.12);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  });

  // Keyboard shortcuts from docs/EDITOR_2D.md.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement).closest('input, select, textarea')) return;
      const mod = ev.metaKey || ev.ctrlKey;
      if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (ev.shiftKey) redo(); else undo(); return; }
      if (ev.key === 'Escape') { setDraft(null); setArmed(null); setSel(null); setNotice(null); return; }
      if (ev.key === 'v' || ev.key === 'V') { setMode('select'); setDraft(null); return; }
      if (ev.key === 'w' || ev.key === 'W') { setMode('wall'); setArmed(null); setSel(null); return; }
      if (!sel) return;
      if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); deleteSel(); return; }
      const dir = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[ev.key];
      if (dir) { ev.preventDefault(); nudge(dir * (ev.shiftKey ? 50 : 10)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!project) return null;
  const room = project.room;
  const unit = project.unit;
  const dims = presetOf(project);
  const geoms = wallGeoms(room);
  const snapV = (v: number) => (snap ? Math.round(v / 50) * 50 : Math.round(v));

  function toWorld(clientX: number, clientY: number): Point | null {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  function zoomAt(p: Point, factor: number) {
    setView(v => {
      const cur = v ?? currentView;
      const w = Math.min(40000, Math.max(800, cur.w * factor)), k = w / cur.w;
      return { x: p.x - (p.x - cur.x) * k, y: p.y - (p.y - cur.y) * k, w, h: cur.h * k };
    });
  }
  const setRoom = (fn: (r: Room) => Room, record = true) => change(p => ({ ...p, room: fn(p.room) }), record);

  // ---------- items ----------
  const findEl = (id: string) => project.elements.find(e => e.id === id);
  function patchSel(s: Selection, patch: Record<string, unknown>, record = true) {
    change(p => {
      const upd = <T extends { id: string }>(list: T[]) => list.map(x => (x.id === s.id ? { ...x, ...patch } : x));
      switch (s.kind) {
        case 'el': return { ...p, elements: upd(p.elements) };
        case 'obs': return { ...p, room: { ...p.room, obstacles: upd(p.room.obstacles ?? []) } };
        case 'opening': return { ...p, room: { ...p.room, openings: upd(p.room.openings) } };
        case 'inst': return { ...p, room: { ...p.room, installations: upd(p.room.installations) } };
        case 'wall': return { ...p, room: syncWalls({ ...p.room, walls: upd(p.room.walls) }) };
      }
    }, record);
  }
  function deleteSel() {
    if (!sel) return;
    const s = sel;
    change(p => {
      const keep = <T extends { id: string }>(list: T[]) => list.filter(x => x.id !== s.id);
      if (s.kind === 'el') return { ...p, elements: keep(p.elements) };
      if (s.kind === 'obs') return { ...p, room: { ...p.room, obstacles: keep(p.room.obstacles ?? []) } };
      if (s.kind === 'opening') return { ...p, room: { ...p.room, openings: keep(p.room.openings) } };
      if (s.kind === 'inst') return { ...p, room: { ...p.room, installations: keep(p.room.installations) } };
      // A wall takes everything mounted on it.
      const off = (x: { wallId?: string }) => x.wallId !== s.id;
      return {
        ...p, elements: p.elements.filter(off),
        room: syncWalls({ ...p.room, walls: keep(p.room.walls), openings: p.room.openings.filter(off),
          installations: p.room.installations.filter(off), obstacles: (p.room.obstacles ?? []).filter(off) }),
      };
    });
    setSel(null);
  }
  /** Arrow keys: along the wall for wall-mounted items, x for free obstacles. */
  function nudge(delta: number) {
    if (!sel || sel.kind === 'wall') return;
    const item = selected();
    if (!item) return;
    if ('x' in item && item.x !== undefined) { patchSel(sel, { x: item.x + delta }); return; }
    const g = geoms[(item as { wallId: string }).wallId];
    const width = 'width' in item ? item.width : 0;
    if (g) patchSel(sel, { offset: Math.max(0, Math.min(g.inner - width, (item as { offset: number }).offset + delta)) });
  }
  function selected(): Element | Obstacle | Opening | Installation | undefined {
    if (!sel) return;
    if (sel.kind === 'el') return findEl(sel.id);
    if (sel.kind === 'obs') return room.obstacles?.find(o => o.id === sel.id);
    if (sel.kind === 'opening') return room.openings.find(o => o.id === sel.id);
    if (sel.kind === 'inst') return room.installations.find(o => o.id === sel.id);
  }

  // ---------- placing from the library ----------
  function elementPlacement(item: Extract<LibItem, { type: 'el' }>, p: Point) {
    const probe = makeElement(item.kind, '', 0, item.width, 'x', dims, DEFAULT_ELEMENT_MATERIALS);
    return { placement: placeUnit(room, project!.elements, p, item.width, layerOf(probe), null, snap ? 50 : 1), depth: probe.depth };
  }
  function place(item: LibItem, p: Point) {
    setNotice(null);
    if (item.type === 'el') {
      const { placement } = elementPlacement(item, p);
      if (!placement) { setNotice('Klikni bliže zidu.'); return; }
      const id = nextId(project!.elements.map(e => e.id), labelPrefix(item.kind));
      const el = { ...makeElement(item.kind, placement.wallId, placement.offset, item.width, id, dims, DEFAULT_ELEMENT_MATERIALS), side: placement.side, ...(item.hinge && { hinge: item.hinge }) };
      change(pr => ({ ...pr, elements: [...pr.elements, el] }));
      setSel({ kind: 'el', id });
    } else if (item.type === 'obs' && item.free) {
      const id = nextId((room.obstacles ?? []).map(o => o.id), ID_PREFIX[item.kind]);
      const o: Obstacle = { id, kind: item.kind, x: snapV(p.x - item.width / 2), y: snapV(p.y - item.depth / 2), width: item.width, depth: item.depth, height: item.height };
      setRoom(r => ({ ...r, obstacles: [...(r.obstacles ?? []), o] }));
      setSel({ kind: 'obs', id });
    } else {
      const width = item.type === 'inst' ? 0 : item.width;
      const pl = placeOnWall(room, p, width, snap ? 50 : 1);
      if (!pl) { setNotice('Klikni bliže zidu.'); return; }
      if (item.type === 'opening') {
        const id = nextId(room.openings.map(o => o.id), ID_PREFIX[item.kind]);
        const o: Opening = { id, kind: item.kind, wallId: pl.wallId, offset: pl.offset, side: pl.side, width: item.width, height: item.height, sill: item.sill };
        setRoom(r => ({ ...r, openings: [...r.openings, o] }));
        setSel({ kind: 'opening', id });
      } else if (item.type === 'obs') {
        const id = nextId((room.obstacles ?? []).map(o => o.id), ID_PREFIX[item.kind]);
        const o: Obstacle = { id, kind: item.kind, wallId: pl.wallId, offset: pl.offset, side: pl.side, width: item.width, depth: item.depth, height: item.height };
        setRoom(r => ({ ...r, obstacles: [...(r.obstacles ?? []), o] }));
        setSel({ kind: 'obs', id });
      } else {
        const id = nextId(room.installations.map(o => o.id), ID_PREFIX[item.kind]);
        const i: Installation = { id, kind: item.kind, wallId: pl.wallId, offset: pl.offset, side: pl.side, height: item.height };
        setRoom(r => ({ ...r, installations: [...r.installations, i] }));
        setSel({ kind: 'inst', id });
      }
    }
    setArmed(null);
  }

  // ---------- drawing walls ----------
  const vertices = roomWalls(room).flatMap(w => [w.a, w.b]);
  const nearVertex = (q: Point) => {
    let best: Point | null = null, bd = 200;
    for (const v of vertices) { const d = Math.hypot(v.x - q.x, v.y - q.y); if (d < bd) { best = v; bd = d; } }
    return best;
  };
  const orthoPt = (from: Point, p: Point): Point => {
    const q = { x: snapV(p.x), y: snapV(p.y) };
    if (ortho) { if (Math.abs(q.x - from.x) >= Math.abs(q.y - from.y)) q.y = from.y; else q.x = from.x; }
    return q;
  };
  function wallClick(p: Point) {
    if (!draft) {
      const start = nearVertex(p) ?? { x: snapV(p.x), y: snapV(p.y) };
      setDraft({ from: start, chainStart: start });
      return;
    }
    let q = orthoPt(draft.from, p);
    const closing = Math.hypot(p.x - draft.chainStart.x, p.y - draft.chainStart.y) < 200;
    if (closing) q = draft.chainStart; else q = nearVertex(q) ?? q;
    if (Math.hypot(q.x - draft.from.x, q.y - draft.from.y) < 100) return;
    const from = draft.from;
    setRoom(r => syncWalls({ ...r, walls: [...r.walls, { id: nextWallId(r), length: 0, thickness: 120, angleToPrev: 0, a: from, b: q }] }));
    setDraft(closing ? null : { from: q, chainStart: draft.chainStart });
    if (closing) setMode('select');
  }

  // ---------- pointer handling ----------
  function backgroundClick(p: Point) {
    if (mode === 'wall') wallClick(p);
    else if (armed) place(armed, p);
    else setSel(null);
  }
  /** Dragging on the plan must not select page text; blur first so an edited field still commits. */
  function claimPointer(ev: React.PointerEvent) {
    ev.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur?.();
  }
  function onItemDown(s: Selection, ev: React.PointerEvent) {
    claimPointer(ev);
    const p = toWorld(ev.clientX, ev.clientY);
    if (!p) return;
    if (mode === 'wall' || armed) { startPan(ev, p); return; }
    setSel(s);
    if (s.kind === 'wall') { startPan(ev, p, false); return; }
    let off: Point = { x: 0, y: 0 };
    if (s.kind === 'el') {
      const e = findEl(s.id)!, g = geoms[e.wallId];
      // Relative to the unit's centre (not the wall axis), so the side under the cursor stays unambiguous.
      if (g) { const c = wallPoint(g, e.offset + e.width / 2, g.th / 2 + e.depth / 2, sideOf(geoms, e)); off = { x: p.x - c.x, y: p.y - c.y }; }
    } else if (s.kind === 'obs') {
      const o = room.obstacles?.find(x => x.id === s.id);
      if (o?.x !== undefined && o.y !== undefined) off = { x: p.x - o.x, y: p.y - o.y };
    }
    drag.current = { kind: 'item', sel: s, start: p, off, moved: false };
    svgRef.current?.setPointerCapture(ev.pointerId);
  }
  /** Drag on empty plan pans; a plain click (`click`) acts on the background. */
  function startPan(ev: React.PointerEvent, p: Point, click = true) {
    drag.current = { kind: 'pan', client: { x: ev.clientX, y: ev.clientY }, view: currentView, moved: false, at: p, click };
    svgRef.current?.setPointerCapture(ev.pointerId);
  }
  function onMove(ev: React.PointerEvent) {
    const p = toWorld(ev.clientX, ev.clientY);
    if (!p) return;
    setCursor(p);
    const d = drag.current;
    if (d?.kind === 'pan') {
      const dx = ev.clientX - d.client.x, dy = ev.clientY - d.client.y;
      if (!d.moved && Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      const k = d.view.w / (svgRef.current?.clientWidth || 1);
      setView({ ...d.view, x: d.view.x - dx * k, y: d.view.y - dy * k });
      return;
    }
    if (d?.kind === 'item') {
      if (!d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) <= 40) return; // > 40 mm = drag, else select
      const first = !d.moved;
      d.moved = true;
      moveItem(d.sel, { x: p.x - d.off.x, y: p.y - d.off.y }, first);
      return;
    }
    if (armed?.type === 'el') setDragOverPlacement(elementPlacement(armed, p).placement);
  }
  function moveItem(s: Selection, p: Point, first: boolean) {
    if (s.kind === 'el') {
      const e = findEl(s.id)!;
      const pl = placeUnit(room, project!.elements, p, e.width, layerOf(e), e.id, snap ? 50 : 1);
      if (pl) patchSel(s, { ...pl }, first);
      return;
    }
    const item = selectedFor(s);
    if (!item) return;
    if ('x' in item && item.x !== undefined) { patchSel(s, { x: snapV(p.x), y: snapV(p.y) }, first); return; }
    const pl = placeOnWall(room, p, 'width' in item ? item.width : 0, snap ? 50 : 1);
    if (pl) patchSel(s, { ...pl }, first);
  }
  const selectedFor = (s: Selection) => {
    if (s.kind === 'obs') return room.obstacles?.find(o => o.id === s.id);
    if (s.kind === 'opening') return room.openings.find(o => o.id === s.id);
    if (s.kind === 'inst') return room.installations.find(o => o.id === s.id);
  };
  function onUp() {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === 'pan' && !d.moved && d.click) backgroundClick(d.at);
  }

  // HTML5 drag and drop from the library.
  function onDragOver(ev: React.DragEvent) {
    const item = libDrag.current;
    if (!item) return;
    ev.preventDefault();
    const p = toWorld(ev.clientX, ev.clientY);
    if (p && item.type === 'el') setDragOverPlacement(elementPlacement(item, p).placement);
  }
  function onDrop(ev: React.DragEvent) {
    ev.preventDefault();
    const item = libDrag.current ?? LIBRARY.find(l => l.key === ev.dataTransfer.getData('text/plain'));
    libDrag.current = null;
    setDragOverPlacement(null);
    const p = toWorld(ev.clientX, ev.clientY);
    if (item && p) place(item, p);
  }

  const ghostItem = libDrag.current ?? armed;
  const ghost = dragOverPlacement && ghostItem?.type === 'el'
    ? { placement: dragOverPlacement, width: ghostItem.width, depth: elementPlacement(ghostItem, { x: 0, y: 0 }).depth } : null;

  const lowers = project.elements.filter(e => layerOf(e) === 'low');
  const tops = worktops(project, dims.worktopDepth, dims.worktopThickness);
  const pieces = generateParts(project).reduce((s, x) => s + x.qty, 0);
  const item = selected();
  const isEmpty = room.walls.length === 0 && mode !== 'wall';

  const hint = mode === 'wall'
    ? { title: 'Crtanje zidova', text: draft ? 'Klikni sledeći ugao. Klik na prvi ugao zatvara prostoriju, dupli klik ili „Završi zid“ prekida.' : 'Klikni prvi ugao prostorije.', on: true }
    : armed ? { title: `Postavljanje: ${armed.name}`, text: 'Klikni na zid (ili u prostor za stub/kanal). Ponovni klik na stavku u biblioteci otkazuje.', on: true }
    : { title: 'Izaberi i pomeri', text: 'Prevuci element iz biblioteke na zid. Postojeće elemente pomeraj prevlačenjem. Točkić zumira, prevlačenje praznog dela pomera prikaz.', on: false };

  return (
    <div className="app">
      <Header title={`Projekat: ${project.name}`} />
      <div className="toolbar-row" role="toolbar" aria-label="Alati">
        <div className="segmented dark">
          <button type="button" aria-pressed={mode === 'select'} onClick={() => { setMode('select'); setDraft(null); }}>Izaberi i pomeri <kbd>V</kbd></button>
          <button type="button" aria-pressed={mode === 'wall'} onClick={() => { setMode('wall'); setArmed(null); setSel(null); }}>Crtaj zidove <kbd>W</kbd></button>
        </div>
        {draft && <button type="button" className="tool" onClick={() => setDraft(null)}>Završi zid</button>}
        <button type="button" className="tool" aria-pressed={snap} onClick={() => setSnap(!snap)}>Mreža 50 mm</button>
        <button type="button" className="tool" aria-pressed={ortho} onClick={() => setOrtho(!ortho)}>Pravi uglovi</button>
        <button type="button" className="tool" aria-pressed={showUp} onClick={() => setShowUp(!showUp)}>Gornji elementi</button>
        <div className="segmented">
          {(['mm', 'cm'] as Unit[]).map(u => <button key={u} type="button" aria-pressed={unit === u} onClick={() => change(p => ({ ...p, unit: u }), false)}>{u}</button>)}
        </div>
        <button type="button" className="tool" onClick={undo} disabled={!past.length}>Poništi</button>
        <button type="button" className="tool" onClick={redo} disabled={!future.length}>Ponovi</button>
        <span className="spacer" />
        <button type="button" className="tool" onClick={() => { change(() => emptyProject()); setSel(null); setView(null); setMode('wall'); }}>Novi prazan prostor</button>
        <button type="button" className="tool" onClick={() => { change(() => exampleProject()); setSel(null); setView(null); setMode('select'); }}>Učitaj primer</button>
      </div>

      <div className="editor">
        <aside className="palette" aria-label="Biblioteka">
          {LIBRARY_GROUPS.map(group => (
            <section key={group}>
              <h2>{group}</h2>
              <div className="lib-grid">
                {LIBRARY.filter(l => l.group === group).map(l => (
                  <button key={l.key} type="button" draggable className="lib-item" aria-pressed={armed?.key === l.key}
                    onDragStart={ev => { libDrag.current = l; ev.dataTransfer.setData('text/plain', l.key); ev.dataTransfer.effectAllowed = 'copy'; }}
                    onDragEnd={() => { libDrag.current = null; setDragOverPlacement(null); }}
                    onClick={() => { setArmed(armed?.key === l.key ? null : l); setMode('select'); setDraft(null); setSel(null); }}>
                    <LibIcon item={l} />
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </aside>

        <main className="canvas">
          <div className={`hintbar${hint.on ? ' on' : ''}`}><strong>{hint.title}</strong> {hint.text}</div>
          {notice && <div className="alert" role="status">{notice}</div>}
          <div className="plan-wrap">
            <Plan ref={svgRef} project={project} view={currentView} unit={unit} showWallUnits={showUp} selection={sel} bad={bad}
              ghost={ghost} draft={mode === 'wall' && draft && cursor ? { from: draft.from, to: orthoPt(draft.from, cursor) } : null}
              interactive onItemDown={onItemDown}
              onPointerDown={ev => { claimPointer(ev); const p = toWorld(ev.clientX, ev.clientY); if (p) startPan(ev, p); }}
              onMouseDown={ev => ev.preventDefault() /* Chrome starts text selection on mousedown */}
              onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }}
              onPointerLeave={() => { if (!drag.current) { setCursor(null); setDragOverPlacement(null); } }}
              onDoubleClick={() => { if (mode === 'wall') setDraft(null); }}
              onDragOver={onDragOver} onDrop={onDrop} onDragLeave={() => setDragOverPlacement(null)}
              style={{ cursor: mode === 'wall' || armed ? 'crosshair' : 'default' }} />
            <button type="button" className="fit-btn" title="Centriraj i vrati podrazumevani zum" onClick={() => setView(fitView(project))}>⌖ Centriraj</button>
            {isEmpty && (
              <div className="empty">
                <h2>Prazan prostor</h2>
                <ol>
                  <li>Klikni <strong>Crtaj zidove</strong> (ili W).</li>
                  <li>Klikći po uglovima prostorije; klik na prvi ugao je zatvara.</li>
                  <li>Prevuci elemente iz biblioteke na zid.</li>
                </ol>
                <button type="button" className="primary-btn" onClick={() => setMode('wall')}>Crtaj zidove</button>
              </div>
            )}
          </div>
          <div className="statusbar mono">
            <span>{room.walls.length} zidova · {project.elements.length} elemenata · {(room.obstacles?.length ?? 0) + room.openings.length + room.installations.length} prepreka/instalacija · {pieces} delova</span>
            <span>{cursor ? `X ${fmt(cursor.x, unit)} · Y ${fmt(cursor.y, unit)} ${unit}` : ''}</span>
          </div>
        </main>

        <aside className="props" aria-label="Svojstva">
          {!sel && (
            <div className="panel">
              <h2>Prostor</h2>
              <dl className="stats-grid">
                <dt>Zidova</dt><dd>{room.walls.length}</dd>
                <dt>Donjih</dt><dd>{lowers.length}</dd>
                <dt>Gornjih</dt><dd>{project.elements.filter(e => e.kind === 'wall').length}</dd>
                <dt>Radna ploča</dt><dd>{tops.map(t => fmt(t.length, unit)).join(' + ') || '—'}</dd>
              </dl>
            </div>
          )}
          {sel?.kind === 'wall' && geoms[sel.id] && (
            <WallPanel id={sel.id} inner={geoms[sel.id].inner} thickness={geoms[sel.id].th} unit={unit}
              onLength={v => setRoom(r => setWallLength(r, sel.id, v))}
              onThickness={v => patchSel(sel, { thickness: Math.max(50, Math.min(500, v)) })}
              onDelete={deleteSel} />
          )}
          {sel?.kind === 'el' && item && 'materials' in item && (
            <ElementPanel key={item.id} el={item} unit={unit} inner={geoms[item.wallId]?.inner ?? 0}
              installations={room.installations.filter(i => i.wallId === item.wallId && sideOf(geoms, i) === sideOf(geoms, item) && i.offset >= item.offset && i.offset <= item.offset + item.width)}
              onChange={patch => patchSel(sel, patch)}
              onKind={kind => patchSel(sel, { ...makeElement(kind, item.wallId, item.offset, item.width, item.id, dims, item.materials), label: item.label, side: item.side })}
              onFlip={() => patchSel(sel, { side: -sideOf(geoms, item) })}
              onDuplicate={() => {
                const g = geoms[item.wallId];
                let offset = item.offset + item.width;
                if (g && offset + item.width > g.inner) offset = Math.max(0, item.offset - item.width);
                const id = nextId(project.elements.map(e => e.id), labelPrefix(item.kind));
                change(p => ({ ...p, elements: [...p.elements, { ...item, id, label: id, offset }] }));
                setSel({ kind: 'el', id });
              }}
              onDelete={deleteSel} />
          )}
          {sel && sel.kind !== 'el' && sel.kind !== 'wall' && item && (
            <ItemPanel key={`${sel.kind}-${item.id}`} kind={sel.kind} item={item as Obstacle | Opening | Installation} unit={unit}
              onChange={patch => patchSel(sel, patch)} onDelete={deleteSel} />
          )}
          <section className="checks" aria-label="Provera">
            <h2>Provera {issues.length > 0 && <span className="badge">{issues.length}</span>}</h2>
            {issues.length === 0 ? <div className="ok">Sve je u redu.</div> : issues.map(i => <div key={i.text} className="alert">{i.text}</div>)}
          </section>
        </aside>
      </div>
    </div>
  );
}

function LibIcon({ item }: { item: LibItem }) {
  if (item.type === 'inst') {
    const [letter, bg, fg] = INSTALLATION_MARK[item.kind];
    return <span className="lib-icon round" style={{ background: bg, color: fg }}>{letter}</span>;
  }
  if (item.type === 'el') {
    const depth = item.kind === 'wall' ? 320 : 560;
    return <span className={`lib-icon unit${item.kind === 'wall' ? ' upper' : ''}`} style={{ width: Math.max(10, Math.round((item.width / 1000) * 44)), height: Math.round((depth / 600) * 20) }} />;
  }
  return <span className={`lib-icon obs-${item.kind}`} />;
}

/** Length field in the project unit; commits on Enter or blur (one undo step per edit). */
function WallPanel({ id, inner, thickness, unit, onLength, onThickness, onDelete }: {
  id: string; inner: number; thickness: number; unit: Unit; onLength: (v: number) => void; onThickness: (v: number) => void; onDelete: () => void;
}) {
  return (
    <div className="panel">
      <div className="muted small">Izabrano · zid</div>
      <h2>Zid {id}</h2>
      <div className="grid2">
        <LenField label={`Dužina (${unit}, unutrašnja)`} value={inner} unit={unit} onCommit={onLength} />
        <LenField label={`Debljina (${unit})`} value={thickness} unit={unit} onCommit={onThickness} />
      </div>
      <p className="hint">Promena dužine pomera susedni zid paralelno, pa uglovi ostaju pravi.</p>
      <button type="button" className="danger" onClick={onDelete}>Obriši zid (i sve na njemu)</button>
    </div>
  );
}

const WIDTH_CHIPS = [300, 400, 450, 500, 600, 800, 900, 1000], FILLER_CHIPS = [50, 100, 150, 200];

function ElementPanel({ el, unit, inner, installations, onChange, onKind, onFlip, onDuplicate, onDelete }: {
  el: Element; unit: Unit; inner: number; installations: Installation[];
  onChange: (p: Partial<Element>) => void; onKind: (k: ElementKind) => void; onFlip: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const layer = layerOf(el);
  const setWidth = (w: number) => onChange({ width: Math.max(50, Math.min(1200, w)) });
  return (
    <div className="panel">
      <div className="muted small">Izabrano · {layer === 'up' ? 'gornji element' : layer === 'tall' ? 'visoki element' : 'donji element'}</div>
      <h2>{el.label} · {KIND_NAME[el.kind]}</h2>
      <LenField label={`Širina (${unit})`} value={el.width} unit={unit} onCommit={setWidth} />
      <div className="chips-row" role="group" aria-label="Brzi izbor širine">
        {(el.kind === 'filler' ? FILLER_CHIPS : WIDTH_CHIPS).map(w => (
          <button key={w} type="button" className="chip-btn mono" aria-pressed={el.width === w} onClick={() => setWidth(w)}>{fmt(w, unit)}</button>
        ))}
      </div>
      <LenField label={`Od početka zida (${unit})`} value={el.offset} unit={unit} onCommit={v => onChange({ offset: Math.max(0, Math.min(inner - el.width, v)) })} />
      <p className="muted small mono">Dubina {fmt(el.depth, unit)} · zid {el.wallId} · {fmt(el.offset, unit)}–{fmt(el.offset + el.width, unit)}</p>
      {installations.length > 0 && (
        <ul className="inst-list">
          {installations.map(i => (
            <li key={i.id}><span className="dot" style={{ background: INSTALLATION_MARK[i.kind][1] }} />{INSTALLATION_NAME[i.kind]} iza elementa · h {fmt(i.height, unit)}</li>
          ))}
        </ul>
      )}
      <div className="btn-row">
        <button type="button" className="tool" onClick={onFlip}>Druga strana zida</button>
        <button type="button" className="tool" onClick={onDuplicate}>Dupliraj pored</button>
      </div>
      <details>
        <summary>Konstrukcija</summary>
        <div className="panel">
          <label className="field">Vrsta
            <select value={el.kind} onChange={e => onKind(e.target.value as ElementKind)}>
              {Object.entries(KIND_NAME).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </label>
          <ElementFields el={el} unit={unit} onChange={onChange} />
        </div>
      </details>
      <Link className="tool link-btn" to={`/element/${el.id}`}>Otvori element i krojnu listu</Link>
      <button type="button" className="danger" onClick={onDelete}>Obriši element</button>
    </div>
  );
}

function ItemPanel({ kind, item, unit, onChange, onDelete }: {
  kind: 'obs' | 'opening' | 'inst'; item: Obstacle | Opening | Installation; unit: Unit;
  onChange: (p: Record<string, unknown>) => void; onDelete: () => void;
}) {
  const title = kind === 'inst' ? INSTALLATION_NAME[(item as Installation).kind]
    : kind === 'opening' ? ((item as Opening).kind === 'window' ? 'Prozor' : 'Vrata')
    : OBSTACLE_NAME[(item as Obstacle).kind];
  const onWall = 'wallId' in item && item.wallId !== undefined;
  return (
    <div className="panel">
      <div className="muted small">Izabrano · {kind === 'inst' ? 'instalacija' : kind === 'opening' ? 'otvor' : 'prepreka'}</div>
      <h2>{title} <span className="muted small">{item.id}{onWall ? ` · zid ${(item as { wallId: string }).wallId}` : ''}</span></h2>
      <div className="grid2">
        {onWall && <LenField label={`Od početka zida (${unit})`} value={(item as { offset?: number }).offset ?? 0} unit={unit} onCommit={v => onChange({ offset: Math.max(0, v) })} />}
        {'width' in item && <LenField label={`Širina (${unit})`} value={item.width} unit={unit} onCommit={v => onChange({ width: Math.max(50, Math.min(4000, v)) })} />}
        {kind === 'obs' && <LenField label={`Dubina (${unit})`} value={(item as Obstacle).depth} unit={unit} onCommit={v => onChange({ depth: Math.max(20, v) })} />}
        {kind === 'opening' && (item as Opening).kind === 'window' && <LenField label={`Parapet (${unit})`} value={(item as Opening).sill} unit={unit} onCommit={v => onChange({ sill: v })} />}
        {kind === 'opening' && <LenField label={`Visina (${unit})`} value={(item as Opening).height} unit={unit} onCommit={v => onChange({ height: v })} />}
        {kind === 'obs' && <LenField label={`Visina (${unit})`} value={(item as Obstacle).height} unit={unit} placeholder="do plafona" onCommit={v => onChange({ height: v || undefined })} />}
        {kind === 'obs' && <LenField label={`Od poda (${unit})`} value={(item as Obstacle).elevation ?? 0} unit={unit} onCommit={v => onChange({ elevation: v })} />}
        {kind === 'inst' && <LenField label={`Visina od poda (${unit})`} value={(item as Installation).height} unit={unit} onCommit={v => onChange({ height: v })} />}
      </div>
      <button type="button" className="danger" onClick={onDelete}>Obriši</button>
    </div>
  );
}
