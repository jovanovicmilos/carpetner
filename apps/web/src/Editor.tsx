// 2D room editor (docs/EDITOR_2D.md, design/Main.dc.html): draw walls, drag units and obstacles from the library,
// move them along or across walls, edit properties, see checks. Every change goes through the engine model.
import {
  autoLayout, DEFAULT_ELEMENT_MATERIALS, DEFAULT_MATERIALS, DEFAULT_RULES, generateParts, hingeOf, labelPrefix, layerOf, layoutIssues,
  makeElement, nextId, nextWallId, placeOnWall, placeUnit, PRESETS, quickStartRoom, roomWalls, setWallLength, sideOf, syncWalls,
  wallGeoms, wallPoint, worktops, type Element, type ElementKind, type Installation, type Obstacle, type Opening, type Placement,
  type Point, type Project, type Room, type Unit,
} from 'engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { HingeField, LenField } from './fields';
import { Header } from './Header';
import { Tip, useHelp, type HelpKey } from './help';
import { fmt, INSTALLATION_MARK, INSTALLATION_NAME, KIND_NAME, OBSTACLE_NAME } from './labels';
import { ID_PREFIX, LIBRARY, LIBRARY_GROUPS, type LibItem } from './library';
import { fitView, Plan, type Selection, type ViewBox } from './Plan';
import { useProject } from './store';

/** Grow a view box to 4:3 around its centre (the plan box is 4:3, so pan/zoom math stays 1:1). */
const fit43 = (v: ViewBox): ViewBox => {
  const w = Math.max(v.w, (v.h * 4) / 3), h = (w * 3) / 4;
  return { x: v.x - (w - v.w) / 2, y: v.y - (h - v.h) / 2, w, h };
};
const DEFAULT_VIEW: ViewBox = { x: -700, y: -700, w: 4800, h: 3600 };
const roomFits = (p: Project) => roomWalls(p.room).flatMap(w => [w.a, w.b])
  .every(q => q.x > DEFAULT_VIEW.x && q.x < DEFAULT_VIEW.x + DEFAULT_VIEW.w && q.y > DEFAULT_VIEW.y && q.y < DEFAULT_VIEW.y + DEFAULT_VIEW.h);
const viewCenter = (v: ViewBox): Point => ({ x: v.x + v.w / 2, y: v.y + v.h / 2 });
const presetOf = (p: Project) => PRESETS[p.presetId === 'none' ? 'workshop' : p.presetId];
const emptyProject = (): Project => ({
  id: 'project', name: 'Novi prostor', unit: 'mm', presetId: 'workshop',
  room: { height: 2600, walls: [], openings: [], installations: [], obstacles: [] },
  elements: [], rules: DEFAULT_RULES, materials: DEFAULT_MATERIALS,
});
/** "Učitaj primer": the example room of design/screens/Main.html (example()), so the editor matches the reference 1:1.
 * Design offsets `t` are measured from the wall axis start; ours from the inner corner (t − 60 for 120 mm walls). */
const exampleProject = (): Project => {
  const P = (x: number, y: number) => ({ x, y });
  const walls = [
    { id: 'A', length: 3200, thickness: 120, angleToPrev: 0, a: P(-60, -60), b: P(3260, -60) },
    { id: 'B', length: 2400, thickness: 120, angleToPrev: 90, a: P(-60, 2460), b: P(-60, -60) },
    { id: 'C', length: 2400, thickness: 120, angleToPrev: 90, a: P(3260, -60), b: P(3260, 2460) },
    { id: 'D', length: 3200, thickness: 120, angleToPrev: 90, a: P(3260, 2460), b: P(-60, 2460) },
  ];
  const d = PRESETS.workshop, m = DEFAULT_ELEMENT_MATERIALS;
  const el = (kind: ElementKind, wallId: string, t: number, width: number, id: string, extra: Partial<Element> = {}) =>
    ({ ...makeElement(kind, wallId, t - 60, width, id, d, m), side: 1 as const, ...extra });
  const elements = [
    el('corner-blind', 'A', 60, 1000, 'D1'), el('sink', 'A', 1060, 800, 'D2'), el('appliance-front', 'A', 1860, 600, 'D3'),
    el('drawer', 'A', 2460, 600, 'D4'), el('filler', 'A', 3060, 200, 'F'), el('oven', 'B', 1260, 600, 'D5'),
    el('base', 'B', 660, 600, 'D6', { hinge: 'R', doors: 1 }), el('tall', 'B', 60, 600, 'V1'),
    el('wall', 'A', 60, 600, 'G1'), el('wall', 'A', 660, 400, 'G2', { hinge: 'R' }), el('wall', 'A', 2260, 600, 'G3'), el('wall', 'A', 2860, 400, 'G4', { hinge: 'R' }),
  ];
  return {
    ...emptyProject(), name: 'Kuhinja Petrović — ugaona (L)',
    room: {
      height: 2600, walls,
      openings: [
        { id: 'P1', wallId: 'A', kind: 'window', offset: 1100, width: 1000, height: 1200, sill: 1000, side: 1 },
        { id: 'Vr1', wallId: 'D', kind: 'door', offset: 400, width: 900, height: 2050, sill: 0, side: 1 },
      ],
      obstacles: [
        { id: 'R1', kind: 'radiator', wallId: 'C', offset: 800, side: 1, width: 800, depth: 100, height: 600 },
        { id: 'Ka1', kind: 'duct', x: 2950, y: 2150, width: 250, depth: 250, height: 2600 },
      ],
      installations: [
        { id: 'V', wallId: 'A', kind: 'water', offset: 1500, height: 500, side: 1 },
        { id: 'O', wallId: 'A', kind: 'drain', offset: 1650, height: 450, side: 1 },
        { id: 'S1', wallId: 'A', kind: 'power', offset: 2700, height: 1100, side: 1 },
        { id: 'S2', wallId: 'B', kind: 'power', offset: 1500, height: 600, side: 1 },
        { id: 'S3', wallId: 'B', kind: 'power', offset: 300, height: 1950, side: 1 },
      ],
    },
    elements,
  };
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
  const [hover, setHover] = useState<Selection | null>(null);
  const [planW, setPlanW] = useState(0);
  // Plan width in screen pixels, for pixel-exact labels and strokes (px prop).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPlanW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [project === null]);
  const [help] = useHelp();
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
  const fitted = project ? fit43(fitView(project)) : DEFAULT_VIEW;
  // design/screens/Main.html starts at a fixed 4.8 m view; fit only when the room does not fit in it.
  const initial = project && !roomFits(project) ? fitted : DEFAULT_VIEW;
  const currentView = view ?? initial;
  // Fit once, then keep the view still while the user draws or drags (no jumps between clicks).
  useEffect(() => { if (project && !view) setView(roomFits(project) ? DEFAULT_VIEW : fit43(fitView(project))); }, [project, view]);

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
    if (ev.button === 1) { startPan(ev, p, false); return; } // middle button: pan in any mode
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
  const card = help && hover && !drag.current && !ghost ? hoverCard(project, hover, bad, unit) : null;
  const isEmpty = room.walls.length === 0 && mode !== 'wall';

  const hint = mode === 'wall'
    ? { title: 'Crtanje zidova', text: draft ? 'Klikni sledeći ugao. Klik na prvi ugao zatvara prostoriju, dupli klik ili „Završi zid“ prekida.' : 'Klikni prvi ugao prostorije.', on: true }
    : armed ? { title: `Postavljanje: ${armed.name}`, text: 'Klikni na zid (ili u prostor za stub/kanal). Ponovni klik na stavku u biblioteci otkazuje.', on: true }
    : { title: 'Izaberi i pomeri', text: 'Prevuci element iz biblioteke na zid. Postojeće elemente pomeraj prevlačenjem.', on: false };

  return (
    <div className="app app-fixed">
      <Header units />
      <div className="toolbar-row" role="toolbar" aria-label="Alati za crtanje">
        <div role="group" aria-label="Režim" className="mode-group">
          <button type="button" aria-pressed={mode === 'select'} onClick={() => { setMode('select'); setDraft(null); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2l9 5-4 1.2L6.5 13z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>Izaberi i pomeri
          </button>
          <button type="button" aria-pressed={mode === 'wall'} onClick={() => { setMode('wall'); setArmed(null); setSel(null); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 13V3h12" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg>Crtaj zidove
          </button>
        </div><Tip k="editor.mode" align="right" />
        <span className="tb-sep" aria-hidden="true" />
        <label className="tb-check"><input type="checkbox" checked={snap} onChange={() => setSnap(!snap)} />Mreža 50 mm</label><Tip k="editor.snap" />
        <label className="tb-check"><input type="checkbox" checked={ortho} onChange={() => setOrtho(!ortho)} />Pravi uglovi</label><Tip k="editor.ortho" />
        <label className="tb-check"><input type="checkbox" checked={showUp} onChange={() => setShowUp(!showUp)} />Gornji elementi</label><Tip k="editor.showUp" />
        <div className="tb-right">
          <button type="button" className="tb-btn" onClick={undo} disabled={!past.length} title="Ctrl+Z (Ctrl+Shift+Z ponovi)">Poništi</button><Tip k="editor.undo" />
          <button type="button" className="tb-btn strong" onClick={() => { change(() => emptyProject()); setSel(null); setView(null); setMode('wall'); }}>Novi prazan prostor</button><Tip k="editor.new" align="left" />
          <button type="button" className="tb-btn" onClick={() => { change(() => exampleProject()); setSel(null); setView(null); setMode('select'); }}>Učitaj primer</button>
          <Link className="tb-btn" to="/">Brzi start</Link>
        </div>
      </div>

      <div className="editor">
        <aside className="palette" aria-label="Biblioteka">
          <p className="lib-intro">Prevuci na zid — element se sam zalepi uz zid i susede. Na tabletu: dodirni pa dodirni zid.</p>
          {LIBRARY_GROUPS.map(group => (
            <section key={group}>
              <h2 className="lib-group">{group}<Tip k={`editor.group.${group}` as HelpKey} align="right" /></h2>
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
          <div className={`hintbar${hint.on ? ' on' : ''}`}>
            <strong>{hint.title}</strong><span>{hint.text}</span>
            {mode === 'wall' && draft && <button type="button" className="finish-btn" onClick={() => setDraft(null)}>Završi zid</button>}
          </div>
          {notice && <div className="alert" role="status">{notice}</div>}
          <div className="plan-wrap">
           <div className="plan-box">
            <Plan ref={svgRef} project={project} view={currentView} unit={unit} showWallUnits={showUp} selection={sel} bad={bad}
              ghost={ghost} draft={mode === 'wall' && draft && cursor ? { from: draft.from, to: orthoPt(draft.from, cursor) } : null}
              interactive onItemDown={onItemDown} onItemHover={setHover} px={currentView.w / (planW || 822)}
              onPointerDown={ev => { claimPointer(ev); const p = toWorld(ev.clientX, ev.clientY); if (p) startPan(ev, p, ev.button !== 1); }}
              onMouseDown={ev => ev.preventDefault() /* Chrome starts text selection on mousedown */}
              onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }}
              onPointerLeave={() => { if (!drag.current) { setCursor(null); setDragOverPlacement(null); } }}
              onDoubleClick={() => { if (mode === 'wall') setDraft(null); }}
              onDragOver={onDragOver} onDrop={onDrop} onDragLeave={() => setDragOverPlacement(null)}
              style={{ cursor: mode === 'wall' || armed ? 'crosshair' : 'default' }} />
            {card && cursor && (
              <div className="hover-card" role="tooltip" style={{
                left: `${((cursor.x - currentView.x) / currentView.w) * 100}%`, top: `${((cursor.y - currentView.y) / currentView.h) * 100}%`,
                transform: `translate(${cursor.x > currentView.x + currentView.w * 0.6 ? 'calc(-100% - 14px)' : '14px'}, ${cursor.y > currentView.y + currentView.h * 0.6 ? 'calc(-100% - 14px)' : '14px'})`,
              }}>
                <strong>{card.title}</strong>{card.lines.map(l => <div key={l}>{l}</div>)}
              </div>
            )}
            <div className="zoom-ctl" role="group" aria-label="Zum">
              <button type="button" aria-label="Umanji" onClick={() => zoomAt(viewCenter(currentView), 1.25)}>−</button>
              <span className="mono" aria-live="polite">{Math.round((DEFAULT_VIEW.w / currentView.w) * 100)}%</span>
              <button type="button" aria-label="Uvećaj" onClick={() => zoomAt(viewCenter(currentView), 1 / 1.25)}>+</button>
              <button type="button" className="fit" title="Centriraj i vrati podrazumevani zum" onClick={() => setView(fitted)}>Uklopi</button>
              <Tip k="editor.zoom" align="up" />
            </div>
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
          </div>
          <div className="statusbar">
            <span>{room.walls.length} zidova · {project.elements.length} elemenata · {(room.obstacles?.length ?? 0) + room.openings.length + room.installations.length} prepreka/instalacija</span>
            <span className="mono">{cursor ? `X ${fmt(cursor.x, unit)} · Y ${fmt(cursor.y, unit)} ${unit}` : ''}</span>
          </div>
        </main>

        <aside className="props" aria-label="Svojstva">
          {!sel && (
            <div className="panel">
              <h2 className="panel-h">Prostor<Tip k="editor.overview" align="left" /></h2>
              <div className="stat-cards">
                {([['Zidova', String(room.walls.length)], ['Donjih', String(lowers.length)],
                  ['Gornjih', String(project.elements.filter(e => e.kind === 'wall').length)],
                  ['Radna ploča', fmt(tops.reduce((t, w) => t + w.length, 0), unit)]] as const).map(([l, v]) => (
                  <div key={l}><div className="stat-l">{l}</div><div className="stat-v">{v}</div></div>
                ))}
              </div>
              <p className="panel-note">Klikni zid, element ili prepreku da menjaš mere. Element se pomera prevlačenjem duž zida ili na drugi zid.</p>
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
            <h3 className="panel-h3">Provera ({issues.length})<Tip k="editor.checks" align="left" /></h3>
            {issues.length === 0 ? <div className="ok">Sve je u redu.</div> : issues.map(i => <div key={i.text} className="alert">{i.text}</div>)}
          </section>
          {help && <Legend />}
        </aside>
      </div>
    </div>
  );
}

const HINGE_NAME = { L: 'levo', R: 'desno', LR: '2 krila', none: 'bez vrata' } as const;

/** Help card over the plan (docs/UI_PRAVILA.md): sizes, layer, opening, installations behind, warnings. */
function hoverCard(p: Project, s: Selection, bad: Set<string>, unit: Unit): { title: string; lines: string[] } | null {
  const geoms = wallGeoms(p.room), f = (mm: number) => fmt(mm, unit);
  if (s.kind === 'el') {
    const e = p.elements.find(x => x.id === s.id);
    if (!e) return null;
    const layer = layerOf(e);
    const behind = p.room.installations.filter(i => i.wallId === e.wallId && sideOf(geoms, i) === sideOf(geoms, e) && i.offset >= e.offset && i.offset <= e.offset + e.width);
    return { title: `${e.label} · ${KIND_NAME[e.kind]}`, lines: [
      `Širina ${f(e.width)} · dubina ${f(e.depth)} ${unit}`,
      `${layer === 'up' ? 'Gornji' : layer === 'tall' ? 'Visoki' : 'Donji'} element · otvaranje: ${HINGE_NAME[hingeOf(e)]}`,
      `Zid ${e.wallId}, ${f(e.offset)}–${f(e.offset + e.width)} od početka`,
      ...(behind.length ? [`Iza: ${behind.map(i => INSTALLATION_NAME[i.kind]).join(', ')}`] : []),
      ...(bad.has(e.id) ? ['Upozorenje: vidi Proveru desno'] : []),
      'Prevuci da pomeriš · klik za mere'] };
  }
  if (s.kind === 'wall') {
    const g = geoms[s.id];
    return g ? { title: `Zid ${s.id}`, lines: [`Unutrašnja dužina ${f(g.inner)} · debljina ${f(g.th)} ${unit}`,
      `Elemenata na zidu: ${p.elements.filter(e => e.wallId === s.id).length}`, 'Klik za izmenu dužine'] } : null;
  }
  if (s.kind === 'inst') {
    const i = p.room.installations.find(x => x.id === s.id);
    return i ? { title: INSTALLATION_NAME[i.kind], lines: [`Visina od poda ${f(i.height)} ${unit}`, 'Element ispred dobija izrez u leđima', 'Prevuci da pomeriš'] } : null;
  }
  if (s.kind === 'opening') {
    const o = p.room.openings.find(x => x.id === s.id);
    return o ? { title: o.kind === 'window' ? 'Prozor' : 'Vrata', lines: [`Širina ${f(o.width)} · visina ${f(o.height)}${o.kind === 'window' ? ` · parapet ${f(o.sill)}` : ''} ${unit}`, 'Prevuci da pomeriš'] } : null;
  }
  const o = (p.room.obstacles ?? []).find(x => x.id === s.id);
  return o ? { title: OBSTACLE_NAME[o.kind], lines: [`${f(o.width)} × ${f(o.depth)} ${unit}, ${o.height ? `visina ${f(o.height)}` : 'od poda do plafona'}`,
    'Elementi ne smeju da ga preklapaju', 'Prevuci da pomeriš'] } : null;
}

const LEGEND: [React.CSSProperties, string, string?][] = [
  [{ background: '#1C1B19', height: 6 }, 'Zid (kota = unutrašnja mera)'],
  [{ background: '#E7E1D5', border: '1.2px solid #1C1B19' }, 'Donji element'],
  [{ background: '#C9DAF2', border: '1.2px solid #1C1B19' }, 'Sudopera'],
  [{ background: '#3A3936', border: '1.2px solid #1C1B19' }, 'Rerna'],
  [{ background: '#C9BEA9', border: '1.2px solid #1C1B19' }, 'Visoki element'],
  [{ background: 'rgba(180,68,14,0.10)', border: '1.5px dashed #B4440E' }, 'Gornji element (iznad donjih)'],
  [{ background: '#D6CDBC', border: '1.2px solid #1C1B19' }, 'Filer'],
  [{ background: '#F6D5D3', border: '2px solid #C0262D' }, 'Problem — vidi Proveru'],
  [{ borderTop: '1.5px solid #1C1B19', height: 0, transform: 'rotate(-35deg)' }, 'Otvoreno krilo, počinje od šarki'],
  [{ background: '#DCE7F7', border: '1.5px solid #1C1B19' }, 'Prozor u zidu'],
  [{ background: 'repeating-linear-gradient(45deg, #CFC8BB 0 4px, #EDE9E1 4px 8px)', border: '1.5px solid #1C1B19' }, 'Stub ili kanal'],
  [{ background: '#1E50C8', color: '#FFFFFF', borderRadius: '50%', width: 20, height: 20 }, 'Voda · O odvod · S struja · G gas', 'V'],
];

function Legend() {
  return (
    <section className="checks" aria-label="Legenda plana">
      <h3 className="panel-h3">Legenda plana</h3>
      <div className="legend">{LEGEND.map(([st, text, t]) => <div key={text}><span className="sw" style={st}>{t}</span><span>{text}</span></div>)}</div>
    </section>
  );
}

// Library icons exactly as design/Main.dc.html: units scaled by width/depth in their plan colour, obstacles 34×18, installations as letter dots.
const LIB_FILL: Partial<Record<ElementKind, string>> = { sink: '#C9DAF2', oven: '#3A3936', filler: '#D6CDBC', tall: '#C9BEA9', wall: 'rgba(180,68,14,0.10)' };
function LibIcon({ item }: { item: LibItem }) {
  if (item.type === 'inst') {
    const [letter, bg, fg] = INSTALLATION_MARK[item.kind];
    return <span className="lib-icon round" style={{ background: bg, color: fg }}>{letter}</span>;
  }
  if (item.type === 'el') {
    const depth = item.kind === 'wall' ? 320 : 560;
    return <span className="lib-icon" style={{
      width: Math.max(10, Math.round((item.width / 1000) * 44)), height: Math.round((depth / 600) * 20),
      border: item.kind === 'wall' ? '1.5px dashed #B4440E' : '1.5px solid #1C1B19', background: LIB_FILL[item.kind] ?? '#E7E1D5',
    }} />;
  }
  return <span className="lib-icon obs" style={{ background: item.kind === 'window' ? '#DCE7F7' : item.kind === 'door' ? '#FFFFFF' : undefined }} />;
}

/** Length field in the project unit; commits on Enter or blur (one undo step per edit). */
function WallPanel({ id, inner, thickness, unit, onLength, onThickness, onDelete }: {
  id: string; inner: number; thickness: number; unit: Unit; onLength: (v: number) => void; onThickness: (v: number) => void; onDelete: () => void;
}) {
  return (
    <div className="panel">
      <div><div className="sel-kicker">Izabrano · zid</div><h2 className="sel-title">Zid {id}</h2></div>
      <LenField label={`Dužina (${unit})`} value={inner} unit={unit} onCommit={onLength} tip="editor.wallLength" primary />
      <LenField label={`Debljina (${unit})`} value={thickness} unit={unit} onCommit={onThickness} tip="editor.wallThickness" />
      <p className="panel-note">Promena dužine pomera susedni zid paralelno — uglovi ostaju pravi.</p>
      {/* shortcut: not in design/Main; the wall view's place in the nav waits for the new design export. */}
      <Link className="btn-line" to={`/zid/${id}`}>Pogled na zid {id}</Link>
      <button type="button" className="btn-danger" onClick={onDelete}>Obriši zid i sve na njemu</button>
    </div>
  );
}

const WIDTH_CHIPS = [300, 400, 450, 500, 600, 800, 900, 1000], FILLER_CHIPS = [50, 100, 150, 200];
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function ElementPanel({ el, unit, inner, installations, onChange, onFlip, onDuplicate, onDelete }: {
  el: Element; unit: Unit; inner: number; installations: Installation[];
  onChange: (p: Partial<Element>) => void; onFlip: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const layer = layerOf(el);
  const setWidth = (w: number) => onChange({ width: Math.max(50, Math.min(1200, w)) });
  return (
    <div className="panel">
      <div><div className="sel-kicker">Izabrano · {layer === 'up' ? 'gornji element' : layer === 'tall' ? 'visoki element' : 'donji element'}</div>
        <h2 className="sel-title">{el.label} · {cap(KIND_NAME[el.kind])}</h2></div>
      <div className="grid2">
        <LenField label={`Širina (${unit})`} value={el.width} unit={unit} onCommit={setWidth} tip="editor.width" primary />
        <LenField label="Od početka zida" value={el.offset} unit={unit} onCommit={v => onChange({ offset: Math.max(0, Math.min(inner - el.width, v)) })} tip="editor.offset" />
      </div>
      <div className="chips-row" role="group" aria-label="Brzi izbor širine">
        {(el.kind === 'filler' ? FILLER_CHIPS : WIDTH_CHIPS).map(w => (
          <button key={w} type="button" className="chip-btn mono" aria-pressed={el.width === w} onClick={() => setWidth(w)}>{fmt(w, unit)}</button>
        ))}
      </div>
      <HingeField el={el} onChange={onChange} />
      <div className="panel-note">Dubina {fmt(el.depth, unit)} · Zid {el.wallId} · {fmt(el.offset, unit)}–{fmt(el.offset + el.width, unit)} od početka zida</div>
      {installations.map(i => (
        <div key={i.id} className="inst-row"><span className="dot" style={{ background: INSTALLATION_MARK[i.kind][1] }} />{INSTALLATION_NAME[i.kind]} iza elementa · h {fmt(i.height, unit)}</div>
      ))}
      <div className="grid2 gap6">
        <button type="button" className="btn-line" onClick={onDuplicate}>Dupliraj pored</button>
        <button type="button" className="btn-line" onClick={onFlip}>Druga strana zida</button>
      </div>
      <Link className="btn-primary" to={`/element/${el.id}`}>Konstrukcija i krojna lista</Link>
      <button type="button" className="btn-danger small" onClick={onDelete}>Obriši element</button>
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
  // design/Main.dc.html: one height field per kind (window = sill, installation = height from floor).
  const isWindow = kind === 'opening' && (item as Opening).kind === 'window';
  const h = kind === 'inst' ? { label: 'Visina od poda', key: 'height', v: (item as Installation).height }
    : isWindow ? { label: 'Parapet', key: 'sill', v: (item as Opening).sill }
    : { label: 'Visina', key: 'height', v: (item as Opening | Obstacle).height };
  return (
    <div className="panel">
      <div><div className="sel-kicker">Izabrano · {kind === 'inst' ? 'instalacija' : kind === 'opening' ? 'otvor' : 'prepreka'}</div><h2 className="sel-title">{title}</h2></div>
      {onWall && <LenField label={`Od početka zida (${unit})`} value={(item as { offset?: number }).offset ?? 0} unit={unit} onCommit={v => onChange({ offset: Math.max(0, v) })} primary />}
      {'width' in item && <LenField label={`Širina (${unit})`} value={item.width} unit={unit} onCommit={v => onChange({ width: Math.max(50, Math.min(4000, v)) })} />}
      {/* shortcut: chimney is not in the design library (added on request), so its depth field is kept. */}
      {kind === 'obs' && (item as Obstacle).kind === 'chimney' && <LenField label={`Dubina (${unit})`} value={(item as Obstacle).depth} unit={unit} onCommit={v => onChange({ depth: Math.max(20, v) })} />}
      <LenField label={`${h.label} (${unit})`} value={h.v} unit={unit} placeholder="do plafona" onCommit={v => onChange({ [h.key]: v || undefined })} />
      <button type="button" className="btn-danger small" onClick={onDelete}>Obriši</button>
    </div>
  );
}
