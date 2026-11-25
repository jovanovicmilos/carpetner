// Front layout of one element in front view (x from the left, y down from the carcass top), in mm.
// Used by the element drawing, wall elevation, drawings and the 3D model. Visual only; part sizes come from generateParts.
import { blindSpan, CORNER_MASK, hingeOf } from './geometry';
import { frontRows } from './parts';
import type { ConstructionRules, Element } from './types';

/** `hinge`: side of the hinges for a door (drawn as dashed lines meeting on that side). */
export type FrontRect = { x: number; y: number; w: number; h: number; label?: string; hinge?: 'L' | 'R' };

/** Fronts, plus the oven niche bottom (y) for ovens, null otherwise. */
export function frontLayout(el: Element, rules: ConstructionRules): { fronts: FrontRect[]; ovenTop: number | null } {
  const { width: W, height: H } = el;
  const g = rules.frontGap;
  const fronts: FrontRect[] = [];
  const side = hingeOf(el) === 'R' ? 'R' : 'L';
  const doorRow = (x0: number, w: number) => {
    if (el.doors === 2) { const dw = Math.floor((w - 2 * g) / 2); fronts.push({ x: x0 + g / 2, y: 2, w: dw, h: H - 4, hinge: 'L' }, { x: x0 + g / 2 + dw + g, y: 2, w: dw, h: H - 4, hinge: 'R' }); }
    else if (el.doors === 1) fronts.push({ x: x0 + g / 2, y: 2, w: w - g, h: H - 4, hinge: side });
  };
  // Corner unit: door on the open part, the mask (maska ugla) next to it on the blind side; the rest of the blind part stays empty.
  const blindDoor = (y: number, h: number, b: number) => {
    const m = CORNER_MASK, left = hingeOf(el) !== 'L';
    if (left) fronts.push({ x: b - m - g / 2, y, w: m, h, label: 'maska' }, { x: b + g / 2, y, w: W - b - g, h, hinge: side });
    else fronts.push({ x: g / 2, y, w: W - b - g, h, hinge: side }, { x: W - b + g / 2, y, w: m, h, label: 'maska' });
  };
  let oven = false;
  if (el.front?.length) {
    // Rows top → bottom: each front is its row − 4; niches and open rows are drawn as labelled outlines.
    let y = 0;
    for (const { row, h } of frontRows(el)) {
      const r = { x: g / 2, y: y + 2, w: W - g, h: h - 4 };
      if (row.type === 'door2') { const dw = Math.floor((W - 2 * g) / 2); fronts.push({ ...r, w: dw, hinge: 'L' }, { ...r, x: g / 2 + dw + g, w: dw, hinge: 'R' }); }
      else if (row.type === 'door' || row.type === 'glass') fronts.push({ ...r, hinge: side, ...(row.type === 'glass' ? { label: 'staklo' } : row.appliance?.startsWith('fridge') ? { label: 'frižider' } : {}) });
      else if (row.type === 'app' || row.type === 'hood') fronts.push({ ...r, label: row.appliance?.startsWith('micro') ? 'MT' : row.type === 'hood' ? 'aspirator' : 'rerna' });
      else if (row.type === 'open') fronts.push({ ...r, label: 'otvoreno' });
      else if (row.type === 'doorBlind' && (row.blindWidth ?? el.blindWidth)) blindDoor(y + 2, h - 4, row.blindWidth ?? el.blindWidth ?? 0);
      else fronts.push(r);
      y += h;
    }
    return { fronts, ovenTop: null };
  }
  switch (el.kind) {
    case 'base': case 'sink': doorRow(0, W); break;
    case 'wall': if (blindSpan(el) && el.doors === 1) blindDoor(2, H - 4, el.blindWidth!); else doorRow(0, W); break;
    case 'corner-blind': if (el.blindWidth && el.doors === 1) blindDoor(2, H - 4, el.blindWidth); else doorRow(el.blindWidth ?? 0, W - (el.blindWidth ?? 0)); break;
    case 'appliance-front': fronts.push({ x: g / 2, y: 2, w: W - g, h: H - 4, label: 'MSP' }); break;
    case 'filler': fronts.push({ x: 2, y: 2, w: W - 4, h: H - 4 }); break;
    case 'tall': {
      const niche = Math.min(1700, H - 100); // shortcut: same fixed fridge niche as the engine
      fronts.push({ x: g / 2, y: 2, w: W - g, h: H - niche - 4, hinge: side }, { x: g / 2, y: H - niche + 2, w: W - g, h: niche - 4, label: 'frižider', hinge: side });
      break;
    }
    case 'drawer': case 'oven': {
      const hs = el.drawerFronts ?? [];
      oven = el.kind === 'oven';
      let y = oven ? H - hs.reduce((s, h) => s + h + g, 0) + g / 2 : g / 2;
      for (const h of hs) { fronts.push({ x: g / 2, y, w: W - g, h }); y += h + g; }
      break;
    }
  }
  return { fronts, ovenTop: oven ? Math.min(...fronts.map(fr => fr.y), H) : null };
}
