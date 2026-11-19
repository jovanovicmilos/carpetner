// 2D room editor (docs/EDITOR_2D.md, design/Main.dc.html): draw walls, drag units and obstacles from the library,
// move them along or across walls, edit properties, see checks. Every change goes through the engine model.
import {
  firstFreeOffset, frontRows, verticalRange, type OpeningKind,
  autoLayout, snapToSegments, DEFAULT_ELEMENT_MATERIALS, DOOR_KINDS, elementBox, fromDataModel, hingePatch, obstacleBox, type DataModelProject, DEFAULT_MATERIALS, DEFAULT_RULES, generateParts, hingeOf, labelPrefix, layerOf, layoutIssues,
  makeElement, nextId, nextWallId, placeOnWall, placeUnit, PRESETS, quickStartRoom, roomWalls, setWallLength, sideOf, syncWalls, cornerAngle, moveCorner, setCornerAngle, splitWall,
  wallGeoms, wallPoint, worktops, type Element, type ElementKind, type Installation, type Obstacle, type Opening, type Placement,
  type Hinge, type Point, type Project, type Room, type Unit,
} from 'engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import fixture from '../../../fixtures/kuhinja-petrovic.json';
import { Link } from 'react-router';
import { HingeField, LenField, NameField } from './fields';
import { Header } from './Header';
import { Tip, useHelp, type HelpKey } from './help';
import { fmt, ownName, INSTALLATION_MARK, INSTALLATION_NAME, KIND_NAME, OBSTACLE_NAME } from './labels';
import { CATALOG_GROUPS, ID_PREFIX, LIBRARY, OBSTACLE_GROUPS, type LibItem } from './library';
import { fitView, Plan, type Selection, type ViewBox } from './Plan';
import { useProject } from './store';
import { SegmentedControl, sx } from './ui';
import { useTemplates } from './templates';
import { calibrate, underlaySegments, useUnderlay } from './underlay';

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
/** "Učitaj primer": the shared example fixtures/kuhinja-petrovic.json (every reference screen shows it). */
const exampleProject = (): Project => fromDataModel(fixture.project as unknown as DataModelProject);

type Menu = { target: Selection | null; x: number; y: number; w: number; h: number; at: Point };
type Drag =
  | { kind: 'item'; sel: Selection; start: Point; off: Point; moved: boolean }
  | { kind: 'pan'; client: Point; view: ViewBox; moved: boolean; at: Point; click: boolean }
  | { kind: 'corner'; at: Point; moved: boolean };

export function Editor() {
  const { project, setProject, change, undo, redo, past, future } = useProject();
  const templates = useTemplates(s => s.list);
  const library: LibItem[] = [
    ...templates.map((t): LibItem => ({ key: t.key, group: 'Moji šabloni', name: t.name, type: 'el', kind: t.element.kind, width: t.element.width, hinge: t.element.hinge, template: t.element })),
    ...LIBRARY,
  ];
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
  const { underlay, set: setUnderlay } = useUnderlay();
  // Underlay tool: pick 2 points + real length (calibrate), or a point on the image + where it goes (move).
  const [ulTool, setUlTool] = useState<{ kind: 'cal' | 'move'; pts: Point[] } | null>(null);
  const [snap, setSnap] = useState(true);
  const [ortho, setOrtho] = useState(true);
  const [showUp, setShowUp] = useState(true);
  const [view, setView] = useState<ViewBox | null>(null);
  // Floating UI (docs/EDITOR_2D.md): library shown, measurements panel open, right-click menu, popover (legend / project / checks).
  const [libOpen, setLibOpen] = useState(true);
  const [libTab, setLibTab] = useState<'el' | 'obs'>('el');
  const [libQ, setLibQ] = useState('');
  const [armMsg, setArmMsg] = useState('');
  const lastWall = useRef<string | null>(null);
  const [inspOpen, setInspOpen] = useState(true);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [pop, setPop] = useState<'leg' | 'proj' | 'chk' | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const longPress = useRef<number | null>(null);
  const drag = useRef<Drag | null>(null);
  const libDrag = useRef<LibItem | null>(null);
  // Two-finger pinch zoom + pan on tablets (docs/EDITOR_2D.md): touch points by pointer id, and the gesture start.
  const touches = useRef(new Map<number, Point>());
  const pinch = useRef<{ dist: number; at: Point; view: ViewBox } | null>(null);
  const [dragOverPlacement, setDragOverPlacement] = useState<Placement | null>(null);
  // Where the dragged / armed item would land: units and wall items (window, door, radiator, chimney, installation); free obstacles have no ghost.
  const placementOf = (item: LibItem, p: Point) => item.type === 'el' ? elementPlacement(item, p).placement
    : item.type === 'obs' && item.free ? null : placeOnWall(room, p, item.type === 'inst' ? 0 : item.width, snap ? 50 : 1);

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
  function duplicateSel() {
    const e = sel?.kind === 'el' ? findEl(sel.id) : undefined;
    if (!e) return;
    const g = geoms[e.wallId];
    let offset = e.offset + e.width;
    if (g && offset + e.width > g.inner) offset = Math.max(0, e.offset - e.width);
    const id = nextId(project!.elements.map(x => x.id), labelPrefix(e.kind));
    change(p => ({ ...p, elements: [...p.elements, { ...e, id, label: id, offset }] }));
    setSel({ kind: 'el', id });
  }
  function flipSel() {
    const e = sel?.kind === 'el' ? findEl(sel.id) : undefined;
    if (e) patchSel(sel!, { side: -sideOf(geoms, e) });
  }
  // An empty room starts zoomed out to 8 m (design: view -1000,-1000, 8000 wide).
  const newEmpty = () => { change(() => emptyProject()); setSel(null); setView({ x: -1000, y: -1000, w: 8000, h: 6000 }); setMode('wall'); setPop(null); };
  const loadExample = () => { change(() => exampleProject()); setSel(null); setView(null); setMode('select'); setPop(null); };
  const select = (s: Selection | null) => { setSel(s); if (s) setInspOpen(true); };
  /** Shortcuts keep working after a bar / menu button removes itself (focus would fall back to the page). */
  const refocus = () => requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) stageRef.current?.focus({ preventScroll: true }); });
  const cancelMode = () => { setMode('select'); setArmed(null); setDraft(null); setDragOverPlacement(null); };
  /** Menu at a client point, positioned inside the plan box (design: flips left/up when it does not fit). */
  function openMenu(target: Selection | null, clientX: number, clientY: number) {
    const r = boxRef.current?.getBoundingClientRect(), at = toWorld(clientX, clientY);
    if (!r || !at) return;
    cancelLongPress();
    drag.current = null;
    if (target) setSel(target);
    setPop(null);
    setMenu({ target, x: clientX - r.left, y: clientY - r.top, w: r.width, h: r.height, at });
  }
  function startLongPress(ev: React.PointerEvent, target: Selection | null) {
    cancelLongPress();
    if (ev.pointerType !== 'touch' || mode !== 'select' || armed) return;
    const { clientX, clientY } = ev;
    longPress.current = window.setTimeout(() => { longPress.current = null; openMenu(target, clientX, clientY); }, 550);
  }
  function cancelLongPress() { if (longPress.current !== null) { clearTimeout(longPress.current); longPress.current = null; } }
  function onKey(ev: React.KeyboardEvent) {
    if ((ev.target as HTMLElement).closest('input, select, textarea')) return;
    const mod = ev.metaKey || ev.ctrlKey, k = ev.key;
    let done = true;
    if (k === 'Escape') {
      if (menu || pop) { setMenu(null); setPop(null); }
      else if (mode === 'wall' && draft) setDraft(null);
      else if (mode === 'wall' || armed) cancelMode();
      else { setSel(null); setNotice(null); }
    } else if (mod && k.toLowerCase() === 'z') { if (ev.shiftKey) redo(); else undo(); }
    else if (mod && k.toLowerCase() === 'd') duplicateSel();
    else if (mod) done = false;
    else if (k === 'Delete' || k === 'Backspace') { setMenu(null); deleteSel(); }
    else if (k === 'f' || k === 'F') flipSel();
    else if (k === 'v' || k === 'V') { setMode('select'); setDraft(null); setArmed(null); }
    else if (k === 'w' || k === 'W') { setMode('wall'); setArmed(null); setSel(null); setMenu(null); }
    else if (k === 'Enter') { if (sel) setInspOpen(true); else done = false; }
    else {
      const d = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[k];
      if (d) nudge(d[0], d[1], ev.shiftKey ? 50 : 10); else done = false;
    }
    if (done) ev.preventDefault();
  }
  /** Arrow keys: along the wall when the arrow points along it (else nothing), free obstacles by x / y. */
  function nudge(dx: number, dy: number, step: number) {
    if (!sel || sel.kind === 'wall') return;
    const item = selected();
    if (!item) return;
    if ('x' in item && item.x !== undefined && item.y !== undefined) { patchSel(sel, { x: item.x + dx * step, y: item.y + dy * step }); return; }
    const g = geoms[(item as { wallId: string }).wallId];
    if (!g) return;
    const dot = dx * g.ux + dy * g.uy;
    if (Math.abs(dot) < 0.5) return;
    const width = 'width' in item ? item.width : 0;
    patchSel(sel, { offset: Math.max(0, Math.min(g.inner - width, (item as { offset: number }).offset + (dot > 0 ? step : -step))) });
  }
  function selected(): Element | Obstacle | Opening | Installation | undefined {
    if (!sel) return;
    if (sel.kind === 'el') return findEl(sel.id);
    if (sel.kind === 'obs') return room.obstacles?.find(o => o.id === sel.id);
    if (sel.kind === 'opening') return room.openings.find(o => o.id === sel.id);
    if (sel.kind === 'inst') return room.installations.find(o => o.id === sel.id);
  }

  // ---------- placing from the library ----------
  const newElement = (item: Extract<LibItem, { type: 'el' }>, wallId: string, offset: number, id: string): Element =>
    ({ ...makeElement(item.kind, wallId, offset, item.width, id, dims, DEFAULT_ELEMENT_MATERIALS), ...item.template, ...(item.hinge && { hinge: item.hinge }) });
  /** Catalog click (docs/KATALOG.md quickAdd): selected wall → wall of the selected item → last wall used; first free spot. */
  const targetWall = () => sel?.kind === 'wall' ? sel.id
    : sel?.kind === 'el' ? findEl(sel.id)?.wallId
    : sel?.kind === 'obs' ? room.obstacles?.find(o => o.id === sel.id)?.wallId ?? lastWall.current
    : lastWall.current;
  function quickAdd(item: Extract<LibItem, { type: 'el' }>) {
    setNotice(null);
    const wallId = targetWall();
    const arm = (msg: string) => { setArmed(item); setArmMsg(msg); setMode('select'); setDraft(null); };
    if (!wallId) { arm(`Klikni na zid na koji ide ${item.name.toLowerCase()}.`); return; }
    const id = nextId(project!.elements.map(e => e.id), labelPrefix(item.kind));
    const probe = newElement(item, wallId, 0, id);
    const offset = firstFreeOffset(project!, wallId, item.width, verticalRange(probe));
    if (offset === null) { arm(`Na zidu ${wallId} nema ${item.width} mm slobodno — klikni na drugi zid ili smanji susedni element.`); return; }
    const same = project!.elements.find(e => e.wallId === wallId && layerOf(e) === layerOf(probe));
    change(pr => ({ ...pr, elements: [...pr.elements, { ...probe, offset, side: same ? sideOf(geoms, same) : sideOf(geoms, { wallId }) }] }));
    lastWall.current = wallId;
    setArmed(null); setArmMsg(''); select({ kind: 'el', id });
  }
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
      const el = { ...newElement(item, placement.wallId, placement.offset, id), side: placement.side };
      change(pr => ({ ...pr, elements: [...pr.elements, el] }));
      lastWall.current = placement.wallId;
      setSel({ kind: 'el', id });
    } else if (item.type === 'obs' && item.free) {
      const id = nextId((room.obstacles ?? []).map(o => o.id), ID_PREFIX[item.kind]);
      const o: Obstacle = { id, kind: item.kind, x: snapV(p.x - item.width / 2), y: snapV(p.y - item.depth / 2), width: item.width, depth: item.depth, height: item.height, ...(item.label && { label: item.label }) };
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
  // Walls snap to the lines of a DXF underlay (docs/NACRTI_I_IZVOZ.md: "lepljenje za linije podloge"), within 150 mm.
  const ulSegs = underlay?.segs ? underlaySegments(underlay) : [];
  const ulSnap = (p: Point) => (ulSegs.length ? snapToSegments(ulSegs, p, 150) : null);
  /** Next wall corner: existing corner, else underlay line (kept on the right-angle axis), else grid + right angles. */
  const nextPt = (from: Point, p: Point): Point => {
    const v = nearVertex(p);
    if (v) return v;
    const u = ulSnap(p);
    if (!u) return orthoPt(from, p);
    if (!ortho) return { x: Math.round(u.x), y: Math.round(u.y) };
    return Math.abs(p.x - from.x) >= Math.abs(p.y - from.y) ? { x: Math.round(u.x), y: from.y } : { x: from.x, y: Math.round(u.y) };
  };
  function wallClick(p: Point) {
    if (!draft) {
      const u = ulSnap(p);
      const start = nearVertex(p) ?? (u ? { x: Math.round(u.x), y: Math.round(u.y) } : { x: snapV(p.x), y: snapV(p.y) });
      setDraft({ from: start, chainStart: start });
      return;
    }
    const closing = Math.hypot(p.x - draft.chainStart.x, p.y - draft.chainStart.y) < 200;
    const q = closing ? draft.chainStart : nextPt(draft.from, p);
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
  /** Right click while drawing ends the wall (or leaves the mode); while placing it cancels. */
  function rightCancel() { if (mode === 'wall' && draft) setDraft(null); else cancelMode(); }
  /** Dragging on the plan must not select page text; focusing the plan commits an edited field and enables the shortcuts. */
  function claimPointer(ev: React.PointerEvent) {
    ev.preventDefault();
    stageRef.current?.focus({ preventScroll: true });
  }
  function onItemDown(s: Selection, ev: React.PointerEvent) {
    claimPointer(ev);
    const p = toWorld(ev.clientX, ev.clientY);
    if (!p) return;
    if (ev.button === 1) { startPan(ev, p, false); return; } // middle button: pan in any mode
    if (ev.button === 2) { if (mode === 'select' && !armed) openMenu(s, ev.clientX, ev.clientY); else rightCancel(); return; }
    setMenu(null); setPop(null);
    if (mode === 'wall' || armed) { startPan(ev, p); return; }
    select(s);
    startLongPress(ev, s);
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
      cancelLongPress();
      const k = d.view.w / (svgRef.current?.clientWidth || 1);
      setView({ ...d.view, x: d.view.x - dx * k, y: d.view.y - dy * k });
      return;
    }
    if (d?.kind === 'item') {
      if (!d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) <= 40) return; // > 40 mm = drag, else select
      const first = !d.moved;
      d.moved = true;
      cancelLongPress();
      moveItem(d.sel, { x: p.x - d.off.x, y: p.y - d.off.y }, first);
      return;
    }
    if (d?.kind === 'corner') {
      const t = { x: snapV(p.x), y: snapV(p.y) };
      if (t.x === d.at.x && t.y === d.at.y) return;
      const from = d.at; // the updater may run later, after d.at moved on
      setRoom(r => moveCorner(r, from, t), !d.moved); // one undo step per drag
      d.at = t; d.moved = true;
      return;
    }
    if (armed) setDragOverPlacement(placementOf(armed, p));
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
  /** Capture-phase touch tracking: a second finger turns any gesture into pinch zoom around the fingers' midpoint. */
  const pinchState = () => { const [a, b] = [...touches.current.values()]; return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; };
  function pinchDown(ev: React.PointerEvent) {
    if (ev.pointerType !== 'touch') return;
    touches.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (touches.current.size !== 2) return;
    const { dist, mid } = pinchState(), at = toWorld(mid.x, mid.y);
    if (!at) return;
    ev.stopPropagation(); // the second finger must not select or start a drag
    drag.current = null; cancelLongPress();
    pinch.current = { dist, at, view: currentView };
  }
  function pinchMove(ev: React.PointerEvent) {
    if (!touches.current.has(ev.pointerId)) return;
    touches.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const pc = pinch.current, r = svgRef.current?.getBoundingClientRect();
    if (!pc || touches.current.size < 2 || !r) return;
    ev.stopPropagation();
    const { dist, mid } = pinchState();
    const w = Math.min(40000, Math.max(800, pc.view.w * pc.dist / dist)), k = w / r.width;
    setView({ x: pc.at.x - (mid.x - r.left) * k, y: pc.at.y - (mid.y - r.top) * k, w, h: pc.view.h * w / pc.view.w });
  }
  function pinchUp(ev: React.PointerEvent) {
    touches.current.delete(ev.pointerId);
    if (pinch.current) { ev.stopPropagation(); drag.current = null; if (touches.current.size < 2) pinch.current = null; }
  }
  function onUp() {
    cancelLongPress();
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
    if (p) setDragOverPlacement(placementOf(item, p));
  }
  function onDrop(ev: React.DragEvent) {
    ev.preventDefault();
    const item = libDrag.current ?? library.find(l => l.key === ev.dataTransfer.getData('text/plain'));
    libDrag.current = null;
    setDragOverPlacement(null);
    const p = toWorld(ev.clientX, ev.clientY);
    if (item && p) place(item, p);
  }

  const ghostItem = libDrag.current ?? armed;
  const ghost = !dragOverPlacement || !ghostItem ? null
    : ghostItem.type === 'el' ? { placement: dragOverPlacement, width: ghostItem.width, depth: elementPlacement(ghostItem, { x: 0, y: 0 }).depth }
    : ghostItem.type === 'opening' ? { placement: dragOverPlacement, width: ghostItem.width, depth: 0, inWall: true }
    : ghostItem.type === 'inst' ? { placement: { ...dragOverPlacement, offset: dragOverPlacement.offset - 50 }, width: 100, depth: 0, inWall: true }
    : { placement: dragOverPlacement, width: ghostItem.width, depth: ghostItem.depth };

  const lowers = project.elements.filter(e => layerOf(e) === 'low');
  const tops = worktops(project, dims.worktopDepth, dims.worktopThickness);
  const pieces = generateParts(project).reduce((s, x) => s + x.qty, 0);
  const item = selected();
  // No card over the selected item: its action bar and panel are there (a tap on a tablet also counts as hover).
  const hoverSelected = hover && sel && hover.kind === sel.kind && hover.id === sel.id;
  const card = help && hover && !hoverSelected && !drag.current && !ghost ? hoverCard(project, hover, bad, unit) : null;
  const isEmpty = room.walls.length === 0 && mode !== 'wall';

  const hint = mode === 'wall'
    ? { title: 'Crtanje zidova', text: draft ? 'Klikni sledeći ugao. Klik na prvi ugao zatvara prostoriju; dupli ili desni klik prekida.' : 'Klikni prvi ugao prostorije.' }
    : armed ? { title: `Postavljanje: ${armed.name}`, text: 'Klikni na zid (ili u prostor za stub, kanal, ostalo).' } : null;
  const dragging = !!drag.current?.moved;
  const title = selTitle(project, sel, unit);
  const hasDoors = sel?.kind === 'el' && item && 'kind' in item && DOOR_KINDS.includes((item as Element).kind);
  const elSel = sel?.kind === 'el' ? (item as Element | undefined) : undefined;
  const nW = issues.length;
  const box = selBox(project, sel);
  const bar = sel && box && mode === 'select' && !armed && !menu && !dragging ? barPos(box, currentView) : null;
  const toggle = (k: 'leg' | 'proj' | 'chk') => { setPop(pop === k ? null : k); setMenu(null); };
  const mItem = (text: string, d: string, act: () => void, o: { kbd?: string; danger?: boolean; disabled?: boolean } = {}) => (
    <button key={text} type="button" role="menuitem" className={`k-mi${o.danger ? ' del' : ''}`} disabled={o.disabled} onClick={() => { act(); setMenu(null); }}>
      <Ico d={d} /><span className="grow">{text}</span><span className="kbd">{o.kbd}</span>
    </button>
  );
  const mLink = (text: string, d: string, to: string) => (
    <Link key={text} to={to} role="menuitem" className="k-mi"><Ico d={d} /><span className="grow">{text}</span><span className="kbd" /></Link>
  );
  const mSep = (k: string) => <div key={k} role="separator" className="k-msep" />;
  const menuTarget = menu?.target ?? null;
  const menuEl = menuTarget?.kind === 'el' ? findEl(menuTarget.id) : undefined;
  const menuBody = !menu ? null : menuEl ? [
    DOOR_KINDS.includes(menuEl.kind) && (
      <div key="seg" className="k-mseg">
        <span>Otvaranje (gledano spreda)</span>
        <div role="group" aria-label="Otvaranje (gledano spreda)">
          {([['L', 'Levo'], ['R', 'Desno'], ['LR', '2 krila'], ['none', 'Bez']] as const).filter(([h]) => menuEl.kind !== 'tall' || h === 'L' || h === 'R').map(([h, t]) => (
            <button key={h} type="button" role="menuitemradio" aria-checked={hingeOf(menuEl) === h} onClick={() => patchSel(menuTarget!, hingePatch(menuEl, h))}>{t}</button>
          ))}
        </div>
      </div>
    ),
    hasFronts(menuEl) && (
      <div key="open" className="k-mseg">
        <span>Ručke{menuEl.opening ? '' : ' (kao projekat)'}</span>
        <div role="group" aria-label="Ručke">
          {OPEN_NAME.map(([k]) => (
            <button key={k} type="button" role="menuitemradio" aria-checked={(menuEl.opening?.kind ?? project.opening?.kind) === k}
              onClick={() => patchSel(menuTarget!, { opening: k === project.opening?.kind ? undefined : { ...(menuEl.opening ?? {}), kind: k } })}>{OPEN_SHORT[k]}</button>
          ))}
        </div>
      </div>
    ),
    mItem('Mere i vrsta', I.ruler, () => setInspOpen(true), { kbd: 'Enter' }),
    mItem('Dupliraj pored', I.dup, duplicateSel, { kbd: 'Ctrl+D' }),
    mItem('Druga strana zida', I.flip, flipSel, { kbd: 'F' }),
    mLink('Konstrukcija i krojna lista', I.cab, `/element/${menuEl.id}`),
    mSep('s'),
    mItem('Obriši element', I.trash, deleteSel, { kbd: 'Del', danger: true }),
  ] : menuTarget?.kind === 'wall' ? [
    mItem('Dužina i debljina', I.ruler, () => setInspOpen(true), { kbd: 'Enter' }),
    mLink('Pogled na zid i instalacije', I.wallv, `/zid/${menuTarget.id}`),
    mItem('Nastavi zid od ovog ugla', I.wall, () => {
      const w = roomWalls(room).find(x => x.id === menuTarget.id);
      if (w) { setMode('wall'); setSel(null); setArmed(null); setDraft({ from: w.b, chainStart: w.b }); }
    }, { kbd: 'W' }),
    mSep('s'),
    mItem('Obriši zid i sve na njemu', I.trash, deleteSel, { kbd: 'Del', danger: true }),
  ] : menuTarget ? [
    mItem(menuTarget.kind === 'inst' ? 'Visina od poda' : 'Mere i položaj', I.ruler, () => setInspOpen(true), { kbd: 'Enter' }),
    ...(toCeiling(project, menuTarget) ? [mItem(`Do plafona (${room.height})`, I.ceil, () => patchSel(menuTarget, { height: room.height }))] : []),
    ...(menuTarget.kind !== 'inst' && wallOf(project, menuTarget) ? [mLink('Pogled na zid i instalacije', I.wallv, `/zid/${wallOf(project, menuTarget)}`)] : []),
    mSep('s'),
    mItem('Obriši', I.trash, deleteSel, { kbd: 'Del', danger: true }),
  ] : [
    mItem('Crtaj zid odavde', I.wall, () => { const q = { x: snapV(menu.at.x), y: snapV(menu.at.y) }; setMode('wall'); setSel(null); setArmed(null); setDraft({ from: q, chainStart: q }); }, { kbd: 'W' }),
    mItem('Uklopi prikaz', I.fit, () => setView(fitted)),
    mItem('Poništi', I.undo, undo, { kbd: 'Ctrl+Z', disabled: !past.length }),
    mSep('s'),
    mItem(showUp ? 'Sakrij gornje elemente' : 'Prikaži gornje elemente', I.eye, () => setShowUp(!showUp)),
    mItem('Legenda plana', I.leg, () => setPop('leg')),
  ];
  const menuTitle = !menu ? '' : menuTarget ? selTitle(project, menuTarget, unit) : 'Prostor';
  const menuH = 34 + (menuBody ?? []).reduce((a, x) => a + (!x ? 0 : x.key === 's' ? 9 : x.key === 'seg' ? 64 : 36), 0);
  const curH = elSel ? hingeOf(elSel) : 'none';
  const CYC: Record<string, Hinge> = elSel?.kind === 'tall' ? { L: 'R', R: 'L' } : { L: 'R', R: 'LR', LR: 'none', none: 'L', down: 'L' };

  return (
    <div className="app app-fixed">
      <Header units />
      <div className="ed-body">
        {libOpen && (
          <aside className="palette ed-lib" aria-label="Biblioteka">
            <div className="ed-lib-head"><h2>Biblioteka</h2>
              <button type="button" className="k-ib" data-tip="Sakrij biblioteku" aria-label="Sakrij biblioteku" onClick={() => setLibOpen(false)} style={{ width: 32, height: 32 }}><Ico d="M10 3L5 8l5 5" /></button></div>
            <div role="tablist" aria-label="Biblioteka" style={sx('display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 3px; background: #F3F1EC; border-radius: 8px')}>
              {([['el', 'Elementi'], ['obs', 'Prepreke']] as const).map(([k, t]) => (
                <button key={k} type="button" role="tab" aria-selected={libTab === k} onClick={() => { setLibTab(k); setArmed(null); setArmMsg(''); }}
                  style={sx('font: inherit; font-size: 13px; min-height: 34px; border: 0; border-radius: 6px; cursor: pointer; ' + (libTab === k ? 'background: #FFFFFF; color: #1C1B19; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.12)' : 'background: transparent; color: #5F5A52'))}>{t}</button>
              ))}
            </div>
            <label style={sx('display: flex; align-items: center; gap: 8px; border: 1px solid #DDD8CE; border-radius: 8px; padding: 0 10px; min-height: 40px; box-sizing: border-box')}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.5 10.5L14 14" fill="none" stroke="#5F5A52" strokeWidth="1.6" strokeLinecap="round" /></svg>
              <span className="sr-only">Traži u biblioteci</span>
              <input type="search" value={libQ} onChange={e => setLibQ(e.target.value)} placeholder="Traži (npr. fioke, frižider)" style={sx('flex: 1; min-width: 0; border: 0; outline: none; font: inherit; font-size: 13px; background: transparent; color: #1C1B19')} />
            </label>
            {libTab === 'el' ? <>
              <Link to={`/prilagodjeni${targetWall() ? `?zid=${targetWall()}` : ''}`} style={sx('display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; border-radius: 8px; border: 1.5px dashed #B4440E; color: #7C2D0A; background: #FFF8F3; text-decoration: none; font-size: 13px; font-weight: 600')}><Ico d="M8 3v10M3 8h10" />Prilagođeni element</Link>
              <label style={sx('display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #5F5A52')}><span style={sx('display: flex; align-items: center')}>Ručke u projektu<Tip k="editor.opening" align="right" /></span>
                <select aria-label="Ručke u projektu" value={project.opening?.kind ?? ''} onChange={e => { const k = e.target.value as OpeningKind | ''; change(p => { const { opening: _, ...rest } = p; return k ? { ...rest, opening: { ...(p.opening ?? {}), kind: k } } : rest; }); }}
                  style={sx('font: inherit; font-size: 13px; min-height: 38px; padding: 0 8px; border: 1px solid #DDD8CE; border-radius: 6px; background: #FFFFFF; color: #1C1B19')}>
                  <option value="">Ručka 128 mm (dosadašnja)</option>
                  <option value="bar">Ručka – šipka</option>
                  <option value="knob">Ručka – dugme</option>
                  <option value="profile">Profil na vrhu fronte</option>
                  <option value="push">Na pritisak (bez ručke)</option>
                </select>
              </label>
              <p style={sx('margin: 0; font-size: 12px; color: #5F5A52; line-height: 1.45')}>{armMsg || (targetWall()
                ? `Klik dodaje element na Zid ${targetWall()} na prvo slobodno mesto. Prevuci za tačno mesto i stranu zida.`
                : 'Izaberi zid (klik na plan) pa klikni element — doda se na prvo slobodno mesto. Ili prevuci na zid.')}</p>
            </> : <p style={sx('margin: 0; font-size: 12px; color: #5F5A52; line-height: 1.45')}>Klikni stavku pa klikni na zid (ili u prostor za stub, kanal, ostalo). Može i prevlačenje.</p>}
            {(libTab === 'el' ? CATALOG_GROUPS : OBSTACLE_GROUPS).map(group => {
              const items = library.filter(l => l.group === group && (!libQ.trim() || `${l.name} ${l.group}`.toLowerCase().includes(libQ.trim().toLowerCase())));
              return items.length ? (
                <section key={group} style={sx('display: flex; flex-direction: column; gap: 6px')}>
                  <h2 className="lib-group">{group}<span style={sx("margin-left: 6px; font: 500 11px var(--font-mono); letter-spacing: 0; color: #8A8378")}>{items.length}</span><Tip k={`editor.group.${group}` as HelpKey} align="right" /></h2>
                  <div className="lib-grid">
                    {items.map(l => (
                      <button key={l.key} type="button" draggable className={`lib-item${l.type === 'el' ? ' lib-el' : ''}`} aria-pressed={armed?.key === l.key}
                        title={l.type === 'el' ? `${l.name} · ${l.width} — ${targetWall() ? `klik: dodaj na Zid ${targetWall()} (prvo slobodno mesto)` : 'klik pa klikni zid'} · prevuci za tačno mesto` : `${l.name} — klik pa klikni zid, ili prevuci`}
                        onDragStart={ev => { libDrag.current = l; ev.dataTransfer.setData('text/plain', l.key); ev.dataTransfer.effectAllowed = 'copy'; }}
                        onDragEnd={() => { libDrag.current = null; setDragOverPlacement(null); }}
                        onClick={() => {
                          if (armed?.key === l.key) { setArmed(null); setArmMsg(''); return; }
                          if (l.type === 'el') { quickAdd(l); return; }
                          setArmed(l); setArmMsg(''); setMode('select'); setDraft(null); setSel(null);
                        }}>
                        {l.type === 'el' ? <FrontThumb el={thumbOf(l)} opening={project.opening?.kind} /> : <LibIcon item={l} />}
                        <span>{l.name}</span>
                        {l.type === 'el' && <span style={sx("font: 11px var(--font-mono); color: #5F5A52")}>{l.width}</span>}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null;
            })}
            {libQ.trim() && !library.some(l => (libTab === 'el' ? CATALOG_GROUPS : OBSTACLE_GROUPS).includes(l.group) && `${l.name} ${l.group}`.toLowerCase().includes(libQ.trim().toLowerCase())) && (
              <p style={sx('margin: 0; font-size: 13px; color: #5F5A52')}>Nema stavke za „{libQ}". Probaj drugu reč ili napravi <Link to="/prilagodjeni">prilagođeni element</Link>.</p>
            )}
          </aside>
        )}

        <main className="ed-main">
          <div className="ed-pad">
            <div className="ed-stage" ref={stageRef} tabIndex={0} onKeyDown={onKey}
              aria-label="Plan prostora. Prečice: Delete briše izabrano, Ctrl+Z poništava, Ctrl+D duplira, F prebacuje na drugu stranu zida, strelice pomeraju, Esc otkazuje."
              onPointerDown={ev => {
                const t = ev.target as HTMLElement;
                if (t.closest('[data-menu]')) return;
                if (menu) setMenu(null);
                if (pop && !t.closest(`[data-pop="${pop}"]`)) setPop(null);
                if (!t.closest('input, textarea, select, button, a, [data-pop]')) ev.currentTarget.focus({ preventScroll: true });
              }}>
              <div className="plan-box" ref={boxRef}>
                <Plan ref={svgRef} project={project} view={currentView} unit={unit} showWallUnits={showUp} selection={sel} bad={bad}
                  ghost={ghost} draft={mode === 'wall' && draft && cursor ? { from: draft.from, to: nextPt(draft.from, cursor) } : null}
                  onCornerDown={mode === 'select' && !armed ? (c, ev) => { claimPointer(ev); setView(currentView); /* auto-fit would follow the moving corner */ drag.current = { kind: 'corner', at: c, moved: false }; svgRef.current?.setPointerCapture(ev.pointerId); } : undefined}
                  interactive onItemDown={onItemDown} onItemHover={setHover} px={currentView.w / (planW || 822)} underlay={underlay}
                  onPointerDown={ev => {
                    claimPointer(ev);
                    const p = toWorld(ev.clientX, ev.clientY);
                    if (!p) return;
                    if (ev.button === 2) { if (mode === 'select' && !armed) openMenu(null, ev.clientX, ev.clientY); else rightCancel(); return; }
                    startPan(ev, p, ev.button !== 1);
                    if (ev.button === 0) startLongPress(ev, null);
                  }}
                  onContextMenu={ev => ev.preventDefault()}
                  onMouseDown={ev => ev.preventDefault() /* Chrome starts text selection on mousedown */}
                  onPointerDownCapture={pinchDown} onPointerMoveCapture={pinchMove} onPointerUpCapture={pinchUp} onPointerCancelCapture={pinchUp}
                  onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; cancelLongPress(); }}
                  onPointerLeave={() => { if (!drag.current) { setCursor(null); setDragOverPlacement(null); } }}
                  onDoubleClick={() => { if (mode === 'wall') setDraft(null); else if (sel) setInspOpen(true); }}
                  onDragOver={onDragOver} onDrop={onDrop} onDragLeave={() => setDragOverPlacement(null)}
                  style={{ cursor: mode === 'wall' || armed ? 'crosshair' : 'default' }} />
                {underlay && ulTool && ulTool.pts.length < 2 && (
                  <div className="ul-pick" onPointerDown={ev => {
                    ev.preventDefault();
                    const p = toWorld(ev.clientX, ev.clientY);
                    if (!p) return;
                    const pts = [...ulTool.pts, p];
                    if (ulTool.kind === 'move' && pts.length === 2) {
                      setUnderlay({ ...underlay, x: Math.round(underlay.x + pts[1].x - pts[0].x), y: Math.round(underlay.y + pts[1].y - pts[0].y) });
                      setUlTool(null);
                    } else setUlTool({ ...ulTool, pts });
                  }}>
                    {ulTool.pts.map((p, i) => <span key={i} className="ul-dot" style={{ left: `${((p.x - currentView.x) / currentView.w) * 100}%`, top: `${((p.y - currentView.y) / currentView.h) * 100}%` }} />)}
                  </div>
                )}
                {card && cursor && !menu && (
                  <div className="hover-card" role="tooltip" style={{
                    left: `${((cursor.x - currentView.x) / currentView.w) * 100}%`, top: `${((cursor.y - currentView.y) / currentView.h) * 100}%`,
                    transform: `translate(${cursor.x > currentView.x + currentView.w * 0.6 ? 'calc(-100% - 14px)' : '14px'}, ${cursor.y > currentView.y + currentView.h * 0.6 ? 'calc(-100% - 14px)' : '14px'})`,
                  }}>
                    <strong>{card.title}</strong>{card.lines.map(l => <div key={l}>{l}</div>)}
                  </div>
                )}
                {isEmpty && (
                  <div className="empty">
                    <h2>Prazan prostor</h2>
                    <ol>
                      <li>Crtaj zidove: klikni uglove prostorije redom. Klik na prvi ugao zatvara prostoriju, dupli klik završava.</li>
                      <li>Dodaj prozore, vrata, stubove, kanale i instalacije iz biblioteke.</li>
                      <li>Prevuci elemente kuhinje na zidove.</li>
                    </ol>
                    <div className="empty-btns">
                      <button type="button" className="primary-btn" onClick={() => setMode('wall')}>Počni crtanje zidova</button>
                      <button type="button" className="line-btn" onClick={loadExample}>Učitaj primer</button>
                    </div>
                  </div>
                )}
                {bar && sel && (
                  <div data-menu="1" role="toolbar" aria-label="Akcije za izabrano" className="ed-bar" style={bar}
                    onPointerDown={ev => ev.stopPropagation()} onClick={ev => { ev.stopPropagation(); refocus(); }} onDoubleClick={ev => ev.stopPropagation()}
                    onContextMenu={ev => { ev.preventDefault(); ev.stopPropagation(); }}>
                    <span className="ed-bar-label">{title}</span>
                    {sel.kind === 'el' && elSel && <>
                      {hasDoors && <DkBtn tip={`Otvaranje: ${HINGE_NAME[curH]} — klik menja`} d={I.hinge} text={HINGE_SHORT[curH]} onClick={() => patchSel(sel, hingePatch(elSel, CYC[curH] ?? 'L'))} />}
                      <DkBtn tip="Druga strana zida (F)" d={I.flip} onClick={flipSel} />
                      <DkBtn tip="Dupliraj pored (Ctrl+D)" d={I.dup} onClick={duplicateSel} />
                      <span className="ed-bar-sep" />
                      <DkBtn tip="Mere i vrsta (Enter)" d={I.ruler} active={inspOpen} onClick={() => setInspOpen(!inspOpen)} />
                      <DkBtn tip="Konstrukcija i krojna lista" d={I.cab} to={`/element/${elSel.id}`} />
                    </>}
                    {sel.kind === 'wall' && <>
                      <DkBtn tip="Dužina i debljina (Enter)" d={I.ruler} active={inspOpen} onClick={() => setInspOpen(!inspOpen)} />
                      <DkBtn tip="Pogled na zid i instalacije" d={I.wallv} to={`/zid/${sel.id}`} />
                    </>}
                    {sel.kind !== 'el' && sel.kind !== 'wall' && <>
                      <DkBtn tip="Mere i položaj (Enter)" d={I.ruler} active={inspOpen} onClick={() => setInspOpen(!inspOpen)} />
                      {toCeiling(project, sel) && <DkBtn tip={`Do plafona (${room.height})`} d={I.ceil} active={(item as Obstacle | undefined)?.height === room.height} onClick={() => patchSel(sel, { height: room.height })} />}
                    </>}
                    <DkBtn tip="Još opcija" d={I.more} onClick={ev => { const r = ev.currentTarget.getBoundingClientRect(); openMenu(sel, r.left, r.bottom + 4); }} />
                    <span className="ed-bar-sep" />
                    <DkBtn tip={sel.kind === 'wall' ? 'Obriši zid i sve na njemu (Del)' : 'Obriši (Del)'} d={I.trash} danger onClick={deleteSel} />
                  </div>
                )}
                {menu && menuBody && (
                  <div data-menu="1" role="menu" aria-label={menuTitle} className="ed-menu"
                    style={{ left: Math.round(menu.x + 256 > menu.w - 6 ? Math.max(6, menu.x - 256) : menu.x), top: Math.round(menu.y + menuH > menu.h - 6 ? Math.max(6, menu.y - menuH) : menu.y) }}
                    onPointerDown={ev => ev.stopPropagation()} onClick={ev => { ev.stopPropagation(); refocus(); }} onDoubleClick={ev => ev.stopPropagation()}
                    onContextMenu={ev => { ev.preventDefault(); ev.stopPropagation(); }} onWheel={ev => ev.stopPropagation()}>
                    <div className="ed-menu-title">{menuTitle}</div>
                    {menuBody}
                  </div>
                )}
              </div>

              <div data-pop="tb" role="toolbar" aria-label="Alati za crtanje" className="ed-float ed-tools">
                {!libOpen && <>
                  <button type="button" className="k-ib" data-tip="Biblioteka elemenata" aria-label="Prikaži biblioteku elemenata" onClick={() => setLibOpen(true)}><Ico d="M2.5 3h11v10h-11zM6.5 3v10" /></button>
                  <span className="ed-tsep" />
                </>}
                <button type="button" className="k-ib" data-tip="Izaberi i pomeri (V)" aria-label="Izaberi i pomeri" aria-pressed={mode === 'select'} onClick={() => { setMode('select'); setDraft(null); }}><Ico d="M3 2l9 5-4 1.2L6.5 13z" /></button>
                <button type="button" className="k-ib" data-tip="Crtaj zidove (W)" aria-label="Crtaj zidove" aria-pressed={mode === 'wall'} onClick={() => { setMode('wall'); setArmed(null); setSel(null); }}><Ico d="M2 13V3h12" /></button>
                <span className="ed-tsep" />
                <button type="button" className="k-ib" data-tip="Poništi (Ctrl+Z)" aria-label="Poništi" onClick={undo} disabled={!past.length}><Ico d={I.undo} /></button>
                <span className="ed-tsep" />
                <button type="button" className="k-ib tog" data-tip="Mreža 50 mm" aria-label="Mreža 50 mm" aria-pressed={snap} onClick={() => setSnap(!snap)}><Ico d="M2 2h12v12H2zM6 2v12M10 2v12M2 6h12M2 10h12" /></button>
                <button type="button" className="k-ib tog" data-tip="Pravi uglovi (0° / 90°)" aria-label="Pravi uglovi" aria-pressed={ortho} onClick={() => setOrtho(!ortho)}><Ico d="M3 2.5V13h10.5M3 9.5h3.5V13" /></button>
                <button type="button" className="k-ib tog" data-tip="Gornji elementi: prikaži / sakrij" aria-label="Prikaži gornje elemente" aria-pressed={showUp} onClick={() => setShowUp(!showUp)}><Ico d="M2 6l6-3 6 3-6 3zM2 10l6 3 6-3" /></button>
                <button type="button" className="k-ib tog" data-pop="leg" data-tip="Legenda plana" aria-label="Legenda plana" aria-pressed={pop === 'leg'} onClick={() => toggle('leg')}><Ico d={I.leg} /></button>
                <Tip k="editor.tools" />
              </div>
              {pop === 'leg' && <Legend onClose={() => setPop(null)} />}
              {hint && (
                <div role="status" className="ed-hint">
                  <span className="grow"><strong>{hint.title}</strong> · {hint.text}</span>
                  {mode === 'wall' && draft && <button type="button" className="ed-hint-finish" onClick={() => setDraft(null)}>Završi zid</button>}
                  <button type="button" className="ed-hint-cancel" onClick={cancelMode}>{mode === 'wall' ? 'Gotovo' : 'Otkaži'} <span>Esc</span></button>
                </div>
              )}
              {notice && <div className="alert ed-notice" role="status">{notice}</div>}
              {underlay && <UnderlayBar unit={unit} tool={ulTool} setTool={setUlTool} opacity={underlay.opacity}
                onOpacity={opacity => setUnderlay({ ...underlay, opacity })} onRemove={() => { setUnderlay(null); setUlTool(null); }}
                onLength={mm => { const [a, b] = ulTool!.pts; setUnderlay(calibrate(underlay, a, b, mm)); setUlTool(null); }} />}
              <div data-pop="proj" className="ed-proj">
                <button type="button" aria-haspopup="menu" aria-expanded={pop === 'proj'} className="ed-proj-btn" onClick={() => toggle('proj')}><Ico d={I.more} w={2.6} /><span>Projekat</span></button>
                {pop === 'proj' && (
                  <div role="menu" aria-label="Projekat" className="ed-proj-menu">
                    <button type="button" role="menuitem" className="k-mi" onClick={() => { setView(fitted); setPop(null); }}><Ico d={I.fit} /><span className="grow">Uklopi prikaz</span></button>
                    <Link to="/" role="menuitem" className="k-mi"><Ico d="M9 1.5L3.5 9h4L6.5 14.5 12.5 7h-4z" /><span className="grow">Brzi start</span></Link>
                    <button type="button" role="menuitem" className="k-mi" onClick={loadExample}><Ico d="M3.5 2h6l3 3v9h-9zM9.5 2v3h3" /><span className="grow">Učitaj primer</span></button>
                    <div role="separator" className="k-msep" />
                    <button type="button" role="menuitem" className="k-mi" onClick={newEmpty}><Ico d={I.plus} /><span className="grow">Novi prazan prostor</span></button>
                  </div>
                )}
              </div>
              {sel && inspOpen && mode === 'select' && (
                <aside aria-label="Svojstva izabranog" data-pop="insp" className="props ed-insp">
                  <div className="ed-insp-head">
                    <div className="grow"><div className="sel-kicker">{inspKind(project, sel)}</div><h2 className="sel-title">{inspTitle(project, sel)}</h2></div>
                    <button type="button" className="k-ib" data-tip="Sakrij panel (Enter ga vraća)" aria-label="Sakrij panel sa merama" onClick={() => setInspOpen(false)} style={{ width: 32, height: 32 }}><Ico d="M4 4l8 8M12 4l-8 8" /></button>
                  </div>
                  {sel.kind === 'wall' && geoms[sel.id] && (
                    <WallPanel id={sel.id} inner={geoms[sel.id].inner} thickness={geoms[sel.id].th} unit={unit}
                      onLength={v => setRoom(r => setWallLength(r, sel.id, v))}
                      angle={cornerAngle(room, sel.id)} onAngle={v => setRoom(r => setCornerAngle(r, sel.id, v))}
                      onSplit={() => change(p => splitWall(p, sel.id))}
                      onThickness={v => patchSel(sel, { thickness: Math.max(50, Math.min(500, v)) })} />
                  )}
                  {sel.kind === 'el' && elSel && (
                    <ElementPanel key={elSel.id} el={elSel} unit={unit} inner={geoms[elSel.wallId]?.inner ?? 0}
                      installations={room.installations.filter(i => i.wallId === elSel.wallId && sideOf(geoms, i) === sideOf(geoms, elSel) && i.offset >= elSel.offset && i.offset <= elSel.offset + elSel.width)}
                      types={library.filter((l): l is Extract<LibItem, { type: 'el' }> => l.type === 'el')} projectOpening={project.opening?.kind}
                      onChange={patch => patchSel(sel, patch)}
                      onType={t => change(pr => ({ ...pr, elements: pr.elements.map(e => (e.id !== elSel.id ? e
                        // Same place and width, the catalog item's configuration; name, note, materials and handles stay (docs/KATALOG.md).
                        : { ...newElement(t, e.wallId, e.offset, e.id), width: e.width, label: e.label, materials: e.materials, ...(e.side && { side: e.side }), ...(e.name && { name: e.name }), ...(e.note && { note: e.note }), ...(e.opening && { opening: e.opening }) })) }))} />
                  )}
                  {sel.kind !== 'el' && sel.kind !== 'wall' && item && (
                    <ItemPanel key={`${sel.kind}-${item.id}`} kind={sel.kind} item={item as Obstacle | Opening | Installation} unit={unit} roomHeight={room.height} doorSide={sideOf(geoms, item as Opening)}
                      onChange={patch => patchSel(sel, patch)} />
                  )}
                </aside>
              )}
              <div data-pop="chk" className="ed-chk">
                {pop === 'chk' && (
                  <div className="ed-chk-card">
                    <h3>Provera ({nW})<Tip k="editor.checks" align="right" /></h3>
                    {(nW ? issues : [{ text: 'Sve je u redu.', ids: [] as string[] }]).map(i => (
                      <button key={i.text} type="button" className={nW ? 'warn' : 'ok'} onClick={() => {
                        const id = i.ids[0];
                        if (id) { setSel({ kind: project.elements.some(e => e.id === id) ? 'el' : 'obs', id }); setInspOpen(true); setPop(null); }
                      }}>{i.text}</button>
                    ))}
                    <div className="ed-stats">
                      {([['Zidova', String(room.walls.length)], ['Donjih', String(lowers.length)],
                        ['Gornjih', String(project.elements.filter(e => e.kind === 'wall').length)],
                        ['Radna ploča', fmt(tops.reduce((t, w) => t + w.length, 0), unit)]] as const).map(([l, v]) => (
                        <div key={l}><div>{l}</div><div className="v">{v}</div></div>
                      ))}
                    </div>
                    <div className="ed-count">{room.walls.length} zidova · {project.elements.length} elemenata · {(room.obstacles?.length ?? 0) + room.openings.length + room.installations.length} prepreka/instalacija</div>
                  </div>
                )}
                <button type="button" aria-expanded={pop === 'chk'} className={`ed-chk-btn${nW ? ' warn' : ''}`} onClick={() => toggle('chk')}>
                  <span className="dot">{nW ? '!' : '✓'}</span><span>{nW ? `${nW} ${nW === 1 ? 'upozorenje' : 'upozorenja'}` : 'Sve je u redu'}</span>
                </button>
              </div>
              <div aria-hidden="true" className="ed-status">
                <span className="mono">{cursor ? `X ${fmt(cursor.x, unit)} · Y ${fmt(cursor.y, unit)} ${unit}` : ''}</span>
                {help && mode === 'select' && !armed && <span>Desni klik: opcije · Del: obriši · Ctrl+Z: poništi · Esc: otkaži</span>}
              </div>
              <div className="zoom-ctl" role="group" aria-label="Zum">
                <button type="button" aria-label="Umanji" onClick={() => zoomAt(viewCenter(currentView), 1.25)}>−</button>
                <span className="mono" aria-live="polite">{Math.round((DEFAULT_VIEW.w / currentView.w) * 100)}%</span>
                <button type="button" aria-label="Uvećaj" onClick={() => zoomAt(viewCenter(currentView), 1 / 1.25)}>+</button>
                <button type="button" className="fit" onClick={() => setView(fitted)}>Uklopi</button>
                <Tip k="editor.zoom" align="up" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Icon paths from design/screens/Main.html (floatVals).
const I = {
  hinge: 'M3 14V2M3 14l9-7', flip: 'M8 2v12M5 5L2 8l3 3M11 5l3 3-3 3', dup: 'M5.5 5.5h8v8h-8zM2.5 10.5v-8h8',
  ruler: 'M2.5 10.5l8-8 3 3-8 8zM5 8l1.5 1.5M7 6l1.5 1.5M9 4l1.5 1.5', cab: 'M3 2h10v12H3zM3 6.5h10M8 6.5V14',
  more: 'M3 8h.01M8 8h.01M13 8h.01', trash: 'M2.5 4.5h11M6.5 4.5V2.5h3v2M4 4.5l.8 9.5h6.4l.8-9.5', wallv: 'M2 3h12v10H2zM5.5 13V9.5h3V13',
  ceil: 'M2 2.5h12M8 14V5M5 8l3-3 3 3', wall: 'M2 13V3h12', fit: 'M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4', undo: 'M5.5 3.5l-3 3 3 3M2.5 6.5H10a3.5 3.5 0 0 1 0 7H7',
  eye: 'M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8zM8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z', leg: 'M2 4h1.5M6 4h8M2 8h1.5M6 8h8M2 12h1.5M6 12h8', plus: 'M8 3v10M3 8h10',
};
function Ico({ d, w = 1.6 }: { d: string; w?: number }) {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
/** Dark icon button of the action bar: a button, or a link when `to` is given. */
function DkBtn({ tip, d, text, onClick, to, active, danger }: {
  tip: string; d: string; text?: string; onClick?: (ev: React.MouseEvent<HTMLButtonElement>) => void; to?: string; active?: boolean; danger?: boolean;
}) {
  const cls = `k-ib k-dk${text ? ' wide' : ''}${active ? ' active' : ''}${danger ? ' del' : ''}`;
  if (to) return <Link to={to} className={cls} data-tip={tip} aria-label={tip}><Ico d={d} /></Link>;
  return <button type="button" className={cls} data-tip={tip} aria-label={tip} onClick={onClick}><Ico d={d} />{text}</button>;
}

const HINGE_SHORT = { L: 'L', R: 'D', LR: '2', down: '↓', none: '–' } as const;

/** "D2 · Sudopera 800", "Zid A · 3200", obstacle name — the action bar label and menu title. */
function selTitle(p: Project, s: Selection | null, unit: Unit): string {
  if (!s) return '';
  if (s.kind === 'el') { const e = p.elements.find(x => x.id === s.id); return e ? `${e.label} · ${cap(KIND_NAME[e.kind])} ${fmt(e.width, unit)}${ownName(e)}` : ''; }
  if (s.kind === 'wall') { const g = wallGeoms(p.room)[s.id]; return g ? `Zid ${s.id} · ${fmt(g.inner, unit)}` : ''; }
  return inspTitle(p, s);
}
function inspTitle(p: Project, s: Selection): string {
  if (s.kind === 'el') { const e = p.elements.find(x => x.id === s.id); return e ? `${e.label} · ${cap(KIND_NAME[e.kind])}${ownName(e)}` : ''; }
  if (s.kind === 'wall') return `Zid ${s.id}`;
  if (s.kind === 'inst') { const i = p.room.installations.find(x => x.id === s.id); return i ? INSTALLATION_NAME[i.kind] : ''; }
  if (s.kind === 'opening') { const o = p.room.openings.find(x => x.id === s.id); return o?.kind === 'window' ? 'Prozor' : 'Vrata'; }
  const o = (p.room.obstacles ?? []).find(x => x.id === s.id);
  return o ? o.label || OBSTACLE_NAME[o.kind] : '';
}
function inspKind(p: Project, s: Selection): string {
  if (s.kind === 'el') { const e = p.elements.find(x => x.id === s.id); const l = e && layerOf(e); return `Izabrano · ${l === 'up' ? 'gornji element' : l === 'tall' ? 'visoki element' : 'donji element'}`; }
  return `Izabrano · ${s.kind === 'wall' ? 'zid' : s.kind === 'inst' ? 'instalacija' : s.kind === 'opening' ? 'otvor' : 'prepreka'}`;
}
/** Obstacles that can go up to the ceiling (chimney, column, duct, other). */
function toCeiling(p: Project, s: Selection): boolean {
  if (s.kind !== 'obs') return false;
  const o = (p.room.obstacles ?? []).find(x => x.id === s.id);
  return !!o && o.kind !== 'radiator';
}
function wallOf(p: Project, s: Selection): string | undefined {
  const list: { id: string; wallId?: string }[] = s.kind === 'opening' ? p.room.openings : s.kind === 'inst' ? p.room.installations : p.room.obstacles ?? [];
  return list.find(x => x.id === s.id)?.wallId;
}
/** Plan box of the selection (mm), for placing the action bar. */
function selBox(p: Project, s: Selection | null): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!s) return null;
  const geoms = wallGeoms(p.room);
  if (s.kind === 'el') { const e = p.elements.find(x => x.id === s.id); return e ? elementBox(geoms, e) : null; }
  if (s.kind === 'wall') {
    const w = roomWalls(p.room).find(x => x.id === s.id), g = geoms[s.id];
    return w && g ? { x0: Math.min(w.a.x, w.b.x), x1: Math.max(w.a.x, w.b.x), y0: Math.min(w.a.y, w.b.y) - g.th / 2, y1: Math.max(w.a.y, w.b.y) + g.th / 2 } : null;
  }
  if (s.kind === 'obs') { const o = (p.room.obstacles ?? []).find(x => x.id === s.id); return o ? obstacleBox(geoms, o) : null; }
  const it = s.kind === 'inst' ? p.room.installations.find(x => x.id === s.id) : p.room.openings.find(x => x.id === s.id);
  const g = it && geoms[it.wallId];
  if (!it || !g) return null;
  const sd = sideOf(geoms, it);
  const pts = 'width' in it
    ? [wallPoint(g, it.offset, -g.th / 2, sd), wallPoint(g, it.offset + it.width, g.th / 2, sd)]
    : [wallPoint(g, it.offset, g.th / 2 + 90, sd)].flatMap(c => [{ x: c.x - 120, y: c.y - 120 }, { x: c.x + 120, y: c.y + 120 }]);
  return { x0: Math.min(...pts.map(q => q.x)), x1: Math.max(...pts.map(q => q.x)), y0: Math.min(...pts.map(q => q.y)), y1: Math.max(...pts.map(q => q.y)) };
}
/** Action bar above the selection (below it when it touches the top edge), in % of the plan box (design floatVals). */
function barPos(b: { x0: number; y0: number; x1: number; y1: number }, v: ViewBox): React.CSSProperties {
  const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
  const cx = clamp(((b.x0 + b.x1) / 2 - v.x) / v.w * 100, 14, 86);
  let top = (b.y0 - v.y) / v.h * 100;
  const bot = (b.y1 - v.y) / v.h * 100;
  let below = top < 11;
  if (below && bot > 88) { below = false; top = 11; }
  return { left: `${cx.toFixed(2)}%`, top: `${(below ? clamp(bot, 0, 90) : clamp(top, 9, 100)).toFixed(2)}%`, transform: `translate(-50%, ${below ? '10px' : 'calc(-100% - 10px)'})` };
}

const HINGE_NAME = { L: 'levo', R: 'desno', LR: '2 krila', down: 'nadole', none: 'bez vrata' } as const;

/** Help card over the plan (docs/UI_PRAVILA.md): sizes, layer, opening, installations behind, warnings. */
function hoverCard(p: Project, s: Selection, bad: Set<string>, unit: Unit): { title: string; lines: string[] } | null {
  const geoms = wallGeoms(p.room), f = (mm: number) => fmt(mm, unit);
  if (s.kind === 'el') {
    const e = p.elements.find(x => x.id === s.id);
    if (!e) return null;
    const layer = layerOf(e);
    const behind = p.room.installations.filter(i => i.wallId === e.wallId && sideOf(geoms, i) === sideOf(geoms, e) && i.offset >= e.offset && i.offset <= e.offset + e.width);
    return { title: `${e.label} · ${KIND_NAME[e.kind]}${ownName(e)}`, lines: [
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
    return i ? { title: INSTALLATION_NAME[i.kind], lines: [`Visina od poda ${f(i.height)} ${unit}`, 'Element ispred dobija izrez u poleđini', 'Prevuci da pomeriš'] } : null;
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
  [{ background: '#1C1B19' }, 'Zid (kota = unutrašnja mera)'],
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
  [{ background: 'repeating-linear-gradient(135deg, #B8AFA0 0 4px, #E4DED2 4px 8px)', border: '1.5px solid #1C1B19' }, 'Dimnjak (uz zid)'],
  [{ background: '#F3F1EC', border: '1.5px dashed #1C1B19' }, 'Ostalo — prepreka sa nazivom'],
  [{ background: '#1E50C8', color: '#FFFFFF', borderRadius: '50%', width: 20, height: 20 }, 'Voda · O odvod · S struja · G gas', 'V'],
  [{ background: '#A15C00', color: '#FFFFFF', borderRadius: '50%', width: 20, height: 20 }, 'Trofazna 400 V (rerna, ploča)', 'T'],
];

function Legend({ onClose }: { onClose: () => void }) {
  return (
    <div data-pop="leg" className="ed-legend">
      <div className="ed-legend-head"><h3>Legenda plana</h3>
        <button type="button" className="k-ib" data-tip="Zatvori" aria-label="Zatvori legendu" onClick={onClose} style={{ width: 28, height: 28 }}><Ico d="M4 4l8 8M12 4l-8 8" /></button></div>
      {LEGEND.map(([st, text, t]) => <div key={text} className="ed-legend-row"><span className="sw" style={st}>{t}</span><span>{text}</span></div>)}
    </div>
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
  const bg: Record<string, string> = {
    window: '#DCE7F7', door: '#FFFFFF', other: '#F3F1EC',
    chimney: 'repeating-linear-gradient(135deg, #B8AFA0 0 3px, #E4DED2 3px 6px)', radiator: 'repeating-linear-gradient(90deg, #8A8F96 0 2px, #D3D6D9 2px 6px)',
  };
  return <span className="lib-icon obs" style={{ background: bg[item.kind], ...(item.kind === 'other' && { borderStyle: 'dashed' }) }} />;
}

/** Catalog card front (design frontThumb): rows to scale, appliance dark, glass blue, open dashed, handles per opening. */
type ThumbEl = Pick<Element, 'width' | 'height' | 'kind' | 'front' | 'hinge' | 'blindWidth' | 'doors' | 'drawerFronts'>;
const thumbOf = (l: Extract<LibItem, { type: 'el' }>): ThumbEl => ({ ...l.template, kind: l.kind, width: l.width, height: l.template?.height ?? (l.kind === 'tall' ? 2100 : 720), ...(l.hinge && { hinge: l.hinge }) });
/** Rows for the picture: the element's own rows, else its classic layout (visual only). */
function thumbRows(el: ThumbEl): { type: string; h: number }[] {
  const H = el.height;
  if (el.front?.length) return frontRows(el as Element).map(r => ({ type: r.row.type, h: r.h }));
  const drawers = (el.drawerFronts ?? []).map(h => ({ type: 'drawer', h: h + 4 }));
  switch (el.kind) {
    case 'drawer': return drawers.length ? drawers : [{ type: 'drawer', h: H }];
    case 'oven': return [{ type: 'app', h: H - drawers.reduce((s, d) => s + d.h, 0) }, ...drawers];
    case 'tall': return [{ type: 'door', h: H - 1700 }, { type: 'door', h: 1700 }];
    case 'corner-blind': return [{ type: 'doorBlind', h: H }];
    case 'appliance-front': case 'filler': return [{ type: 'panel', h: H }];
    default: return [{ type: el.doors === 2 ? 'door2' : el.doors === 1 ? 'door' : 'open', h: H }];
  }
}
function FrontThumb({ el, opening, big }: { el: ThumbEl; opening?: OpeningKind; big?: boolean }) {
  const layer = el.kind === 'wall' ? 'up' : el.kind === 'tall' ? 'tall' : 'low';
  const W = el.width, H = el.height, up = layer === 'up', g = 3;
  const rows = thumbRows(el);
  const item = { kind: el.kind, template: el };
  const R = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
  let box = '', app = '', glass = '', lines = '', hand = '', y0 = 0;
  for (const r of rows) {
    const x = g / 2, y = y0 + g / 2, ww = W - g, hh = r.h - g;
    y0 += r.h;
    if (r.type === 'hood') { app += `M${x} ${y + hh}L${x + ww * 0.3} ${y}h${ww * 0.4}L${x + ww} ${y + hh}Z`; continue; }
    if (r.type === 'door2') { const hw = (ww - g) / 2; box += R(x, y, hw, hh) + R(x + hw + g, y, hw, hh); }
    else if (r.type === 'doorBlind' && item.kind === 'corner-blind') { const b = item.template?.blindWidth ?? 400; box += R(x, y, b - g, hh) + R(x + b, y, ww - b, hh); }
    else box += R(x, y, ww, hh);
    if (r.type === 'app') { const m = Math.min(ww, hh) * 0.12; app += R(x + m, y + m * 1.6, ww - 2 * m, hh - m * 2.4); }
    if (r.type === 'glass') { const m = Math.min(ww, hh) * 0.1; glass += R(x + m, y + m, ww - 2 * m, hh - 2 * m); }
    if (r.type === 'open') lines += `M${x} ${y + hh / 3}h${ww}M${x} ${y + (hh * 2) / 3}h${ww}`;
    if (r.type === 'open' || r.type === 'app' || item.kind === 'filler') continue;
    const horiz = r.type === 'drawer' || r.type === 'panel' || r.type === 'lift';
    if (opening === 'push') continue;
    if (opening === 'profile') { hand += `M${x} ${(up && !horiz) || r.type === 'lift' ? y + hh - 6 : y + 6}h${ww}`; continue; }
    const len = Math.min(ww * 0.45, 260);
    if (horiz) { const hx = x + ww / 2, hy = r.type === 'lift' ? y + hh - 40 : y + Math.min(60, hh * 0.3); hand += opening === 'knob' ? `M${hx} ${hy}h0.01` : `M${hx - len / 2} ${hy}h${len}`; }
    else if (r.type === 'door2') {
      const hw = (ww - g) / 2, vlen = Math.min(hh * 0.3, 220), cy = up ? y + hh - vlen / 2 - 40 : y + vlen / 2 + 40;
      for (const hx of [x + hw - 45, x + hw + g + 45]) hand += opening === 'knob' ? `M${hx} ${cy}h0.01` : `M${hx} ${cy - vlen / 2}v${vlen}`;
    } else {
      const hx = item.template?.hinge === 'R' ? x + 45 : x + ww - 45, vlen = Math.min(hh * 0.3, 220);
      const cy = layer === 'tall' ? (y0 - r.h < H * 0.3 ? y + hh - vlen / 2 - 50 : y + vlen / 2 + 50) : up ? y + hh - vlen / 2 - 40 : y + vlen / 2 + 40;
      hand += opening === 'knob' ? `M${hx} ${cy}h0.01` : `M${hx} ${cy - vlen / 2}v${vlen}`;
    }
  }
  const hpx = layer === 'tall' ? 50 : up ? 30 : 34, wpx = Math.max(6, Math.min(80, (hpx * W) / H));
  const svgProps = big
    ? { preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Izgled fronte sa izabranim ručkama', style: { width: '100%', height: layer === 'tall' ? 150 : 84 } }
    : { preserveAspectRatio: 'xMidYMax meet', 'aria-hidden': true, style: { width: wpx, height: hpx, overflow: 'visible' } };
  return (
    <span style={sx(big ? 'background: #F7F4EE; border-radius: 8px; padding: 10px; display: flex; justify-content: center' : 'height: 50px; display: flex; align-items: flex-end; justify-content: center')}>
      <svg viewBox={`0 0 ${W} ${H}`} {...svgProps}>
        <path d={box || 'M0 0'} fill={rows.every(r => r.type === 'open') ? '#F7F4EE' : '#EFE9DE'} stroke="#1C1B19" strokeWidth={big ? 1.2 : 1} vectorEffect="non-scaling-stroke" />
        <path d={app || 'M0 0'} fill="#2B2A28" />
        <path d={glass || 'M0 0'} fill="#D6E3F5" stroke="#8A97AA" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        <path d={lines || 'M0 0'} fill="none" stroke="#8A8378" strokeWidth="0.8" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
        <path d={hand || 'M0 0'} fill="none" stroke="#1C1B19" strokeWidth={opening === 'knob' ? 5 : opening === 'profile' ? 3 : 2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

/** Length field in the project unit; commits on Enter or blur (one undo step per edit). */
function WallPanel({ id, inner, thickness, unit, angle, onLength, onThickness, onAngle, onSplit }: {
  id: string; inner: number; thickness: number; unit: Unit; angle: number | null;
  onLength: (v: number) => void; onThickness: (v: number) => void; onAngle: (deg: number) => void; onSplit: () => void;
}) {
  return (
    <div className="panel">
      <LenField label={`Dužina (${unit})`} value={inner} unit={unit} onCommit={onLength} tip="editor.wallLength" primary />
      <LenField label={`Debljina (${unit})`} value={thickness} unit={unit} onCommit={onThickness} tip="editor.wallThickness" />
      {angle !== null && (
        <label className="field">Ugao na početku zida (°)
          <input key={angle} type="text" inputMode="decimal" defaultValue={String(angle).replace('.', ',')}
            onBlur={e => { const v = Number(e.target.value.replace(',', '.')); if (v >= 30 && v <= 180 && v !== angle) onAngle(v); }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
        </label>
      )}
      <p className="panel-note">Promena dužine pomera susedni zid paralelno — uglovi ostaju pravi. Ugao (90 = prav) okreće ovaj zid oko početka. Ugao zida se pomera prevlačenjem kružića.</p>
      <button type="button" className="btn-line" onClick={onSplit} disabled={inner < 300}>Podeli zid na pola</button>
      <Link className="btn-line strong" to={`/zid/${id}`}>Pogled na zid i instalacije<span aria-hidden="true">→</span></Link>
    </div>
  );
}

const WIDTH_CHIPS = [300, 400, 450, 500, 600, 800, 900, 1000], FILLER_CHIPS = [50, 100, 150, 200];
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// Kind buttons in the element panel (design/screens/Main.html FAM): lower units can switch kind; wall and tall only show their own.

const OPEN_SHORT: Record<OpeningKind, string> = { bar: 'Šipka', knob: 'Dugme', profile: 'Profil', push: 'Pritisak' };
const OPEN_NAME: [OpeningKind, string][] = [['bar', 'Ručka – šipka'], ['knob', 'Ručka – dugme'], ['profile', 'Profil na vrhu fronte'], ['push', 'Na pritisak (bez ručke)']];
const hasFronts = (el: Element) => el.kind !== 'filler' && !(el.front?.length && el.front.every(r => r.type === 'open'));

function ElementPanel({ el, unit, inner, installations, types, projectOpening, onChange, onType }: {
  el: Element; unit: Unit; inner: number; installations: Installation[]; types: Extract<LibItem, { type: 'el' }>[]; projectOpening?: OpeningKind;
  onChange: (p: Partial<Element>) => void; onType: (item: Extract<LibItem, { type: 'el' }>) => void;
}) {
  const layer = layerOf(el);
  const setWidth = (w: number) => onChange({ width: Math.max(50, Math.min(1200, w)) });
  return (
    <div className="panel">
      <div className="grid2">
        <LenField label={`Širina (${unit})`} value={el.width} unit={unit} onCommit={setWidth} tip="editor.width" primary />
        <LenField label="Od početka zida" value={el.offset} unit={unit} onCommit={v => onChange({ offset: Math.max(0, Math.min(inner - el.width, v)) })} tip="editor.offset" />
      </div>
      <FrontThumb el={el} opening={el.opening?.kind ?? projectOpening} big />
      <label className="field"><span className="field-label">Vrsta<Tip k="editor.kind" align="right" /></span>
        <select aria-label="Vrsta" value={el.catalogKey ?? ''} onChange={e => { const t = types.find(x => x.key === e.target.value); if (t) onType(t); }}>
          {!types.some(t => t.key === el.catalogKey) && <option value="">{KIND_NAME[el.kind]} (postojeći)</option>}
          {types.filter(t => (t.kind === 'wall' ? 'up' : t.kind === 'tall' ? 'tall' : 'low') === layer).map(t => <option key={t.key} value={t.key}>{t.name}{t.group === 'Moji šabloni' ? ' (šablon)' : ''}</option>)}
        </select>
      </label>
      {hasFronts(el) && (
        <label className="field"><span className="field-label">Ručke i otvaranje<Tip k="editor.elOpening" align="right" /></span>
          <select aria-label="Ručke i otvaranje" value={el.opening?.kind ?? ''} onChange={e => { const k = e.target.value as OpeningKind | ''; onChange({ opening: k && k !== projectOpening ? { ...(el.opening ?? {}), kind: k } : undefined }); }}>
            <option value="">Kao projekat ({projectOpening ? OPEN_SHORT[projectOpening] : 'ručka 128'})</option>
            {OPEN_NAME.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </label>
      )}
      <SegmentedControl label="Brzi izbor širine" className="chips-row" itemClass="chip-btn mono" value={el.width} onChange={setWidth}
        options={(el.kind === 'filler' ? FILLER_CHIPS : WIDTH_CHIPS).map(w => [w, fmt(w, unit)] as const)} />
      <HingeField el={el} onChange={onChange} />
      <div className="panel-note">Dubina {fmt(el.depth, unit)} · Zid {el.wallId} · {fmt(el.offset, unit)}–{fmt(el.offset + el.width, unit)} od početka zida</div>
      {installations.map(i => (
        <div key={i.id} className="inst-row"><span className="dot" style={{ background: INSTALLATION_MARK[i.kind][1] }} />{INSTALLATION_NAME[i.kind]} iza elementa · h {fmt(i.height, unit)}</div>
      ))}
      <NameField el={el} onChange={onChange} />
      <Link className="btn-primary" to={`/element/${el.id}`}>Konstrukcija i krojna lista</Link>
    </div>
  );
}

function ItemPanel({ kind, item, unit, roomHeight, doorSide = 1, onChange }: {
  kind: 'obs' | 'opening' | 'inst'; item: Obstacle | Opening | Installation; unit: Unit; roomHeight: number; doorSide?: 1 | -1;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const obs = kind === 'obs' ? (item as Obstacle) : null;
  const free = obs !== null && obs.x !== undefined;
  const title = kind === 'inst' ? INSTALLATION_NAME[(item as Installation).kind]
    : kind === 'opening' ? ((item as Opening).kind === 'window' ? 'Prozor' : 'Vrata')
    : obs!.label || OBSTACLE_NAME[obs!.kind];
  const onWall = 'wallId' in item && item.wallId !== undefined;
  // design/screens/Main.html: one height field per kind (window = sill, installation / chimney / other = height from floor).
  const isWindow = kind === 'opening' && (item as Opening).kind === 'window';
  const fromFloor = kind === 'inst' || obs?.kind === 'chimney' || obs?.kind === 'other';
  const h = isWindow ? { label: 'Parapet', key: 'sill', v: (item as Opening).sill }
    : { label: fromFloor ? 'Visina od poda' : 'Visina', key: 'height', v: (item as Opening | Obstacle | Installation).height };
  return (
    <div className="panel">
      {onWall && <LenField label={`Od početka zida (${unit})`} value={(item as { offset?: number }).offset ?? 0} unit={unit} onCommit={v => onChange({ offset: Math.max(0, v) })} primary />}
      {'width' in item && <LenField label={`Širina (${unit})`} value={item.width} unit={unit} onCommit={v => onChange({ width: Math.max(50, Math.min(4000, v)) })} />}
      {obs && (free || obs.kind === 'chimney' || obs.kind === 'radiator') &&
        <LenField label={`Dubina (${unit})`} value={obs.depth} unit={unit} onCommit={v => onChange({ depth: Math.max(20, Math.min(3000, v)) })} />}
      {obs?.kind === 'other' && (
        <label className="field">Naziv
          <input type="text" defaultValue={obs.label ?? 'Ostalo'} onBlur={e => onChange({ label: e.target.value.trim() || undefined })}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
        </label>
      )}
      {obs && (free || obs.kind === 'chimney') && <button type="button" className="btn-line" onClick={() => onChange({ height: roomHeight })}>Do plafona ({roomHeight})</button>}
      <LenField label={`${h.label} (${unit})`} value={h.v} unit={unit} placeholder="do plafona" onCommit={v => onChange({ [h.key]: v || undefined })} />
      {kind === 'opening' && !isWindow && <>
        {/* Room door (docs/EDITOR_2D.md): hinge side seen from the room, and the swing direction. */}
        <div role="group" aria-label="Šarke vrata" className="kind-group"><span className="field-label">Šarke (gledano iz prostorije)</span>
          <SegmentedControl className="chips-row" itemClass="kind-btn" options={[['L', 'Levo'], ['R', 'Desno']] as const} value={(item as Opening).hinge ?? (doorSide > 0 ? 'L' : 'R')} onChange={v => onChange({ hinge: v })} />
        </div>
        <div role="group" aria-label="Otvaranje vrata" className="kind-group"><span className="field-label">Otvara se</span>
          <SegmentedControl className="chips-row" itemClass="kind-btn" options={[['into-room', 'U prostoriju'], ['out', 'Napolje']] as const} value={(item as Opening).swing ?? 'into-room'} onChange={v => onChange({ swing: v })} />
        </div>
      </>}
    </div>
  );
}

const UL_STEP = {
  cal: ['Klikni prvu tačku poznate mere na podlozi (npr. kraj zida).', 'Klikni drugu tačku iste mere.'],
  move: ['Klikni tačku na podlozi (npr. ugao zida).', 'Klikni gde ta tačka treba da bude na planu.'],
};

function UnderlayBar({ unit, tool, setTool, opacity, onOpacity, onRemove, onLength }: {
  unit: Project['unit']; tool: { kind: 'cal' | 'move'; pts: Point[] } | null; setTool: (t: { kind: 'cal' | 'move'; pts: Point[] } | null) => void;
  opacity: number; onOpacity: (o: number) => void; onRemove: () => void; onLength: (mm: number) => void;
}) {
  return (
    <div className="ul-bar" role="group" aria-label="Podloga">
      <strong>Podloga</strong>
      {tool ? <>
        {tool.pts.length < 2 ? <span>{UL_STEP[tool.kind][tool.pts.length]}</span>
          : <LenField label={`Stvarna mera (${unit})`} value={undefined} unit={unit} onCommit={mm => mm > 0 && onLength(mm)} primary />}
        <button type="button" onClick={() => setTool(null)}>Otkaži</button>
      </> : <>
        <button type="button" onClick={() => setTool({ kind: 'cal', pts: [] })}>Kalibriši merom</button>
        <button type="button" onClick={() => setTool({ kind: 'move', pts: [] })}>Pomeri podlogu</button>
        <label>Providnost <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={e => onOpacity(Number(e.target.value))} /></label>
        <button type="button" onClick={onRemove}>Ukloni</button>
      </>}
    </div>
  );
}

