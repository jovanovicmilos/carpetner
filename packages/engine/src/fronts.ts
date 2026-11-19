// Front layout of one element in front view (x from the left, y down from the carcass top), in mm.
// Used by the element drawing, wall elevation, drawings and the 3D model. Visual only; part sizes come from generateParts.
import { hingeOf } from './geometry';
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
  let oven = false;
  switch (el.kind) {
    case 'base': case 'sink': case 'wall': doorRow(0, W); break;
    case 'corner-blind': doorRow(el.blindWidth ?? 0, W - (el.blindWidth ?? 0)); break;
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
