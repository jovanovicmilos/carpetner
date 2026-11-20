// Default dimensions per preset (docs/STANDARDI.md). 'none' has no defaults: forms stay empty.
import type { ConstructionRules, Material, Mm } from './types';

export interface Dimensions {
  worktopTopHeight: Mm;
  worktopDepth: Mm;
  worktopThickness: Mm;
  plinthHeight: Mm;
  baseCarcassHeight: Mm;
  baseCarcassDepth: Mm;
  worktopToWallUnit: Mm;
  wallUnitDepth: Mm;
  wallUnitHeight: Mm;
  worktopOverhang: Mm;   // worktop front past the carcass
  elementWidth: Mm;      // suggested width of a new unit
}

const en1116: Dimensions = {
  worktopTopHeight: 900, worktopDepth: 600, worktopThickness: 38, plinthHeight: 100,
  baseCarcassHeight: 900 - 100 - 38, baseCarcassDepth: 560,
  worktopToWallUnit: 550, wallUnitDepth: 320,
  wallUnitHeight: 720, // not in the standards table; workshop value
  worktopOverhang: 20, elementWidth: 600,
};

export const PRESETS: Record<'en1116' | 'iso3055' | 'workshop', Dimensions> = {
  en1116,
  iso3055: en1116, // same values until confirmed from the ISO 3055 text
  workshop: { ...en1116, worktopTopHeight: 858, baseCarcassHeight: 720, worktopToWallUnit: 592, worktopOverhang: 40 },
};

/** Wall unit bottom edge from the floor: plinth + base carcass + worktop + gap. */
export const wallUnitElevation = (d: Dimensions): Mm =>
  d.plinthHeight + d.baseCarcassHeight + d.worktopThickness + d.worktopToWallUnit;

// Starting rules and materials for a new project (same as the fixture workshop).
// shortcut: hardcoded until workshop settings / "like last time" are stored (Supabase step).
export const DEFAULT_RULES: ConstructionRules = {
  carcassThickness: 18, backMode: 'nailed', backReduction: 4, frontGap: 3, bottomMode: 'between',
  joint: 'dowel+confirmat',
  carcassEdge: { material: 'Bela', thickness: 0.8 },
  frontEdge: { material: 'ABS U708', thickness: 2 },
  deductEdgeFromCutMinThickness: 1, wasteFactor: 0.15, edgeExtra: 0.1,
  followGrain: true, backCutout: { margin: 75, round: 50, minWidth: 300, minHeight: 250, edgeClearance: 30 }, staplePitch: 150,
};

const sheet = { l: 2800, w: 2070 };
export const DEFAULT_MATERIALS: Record<string, Material> = {
  'iv18-w980': { id: 'iv18-w980', name: 'Iverica 18 bela W980', thickness: 18, kind: 'chipboard', sheet, grain: false },
  'iv18-u708': { id: 'iv18-u708', name: 'Iverica 18 siva U708', thickness: 18, kind: 'chipboard', sheet, grain: false },
  'hdf3': { id: 'hdf3', name: 'HDF 3 bela', thickness: 3, kind: 'hdf', sheet, grain: false },
  'iv16-w980': { id: 'iv16-w980', name: 'Iverica 16 bela W980', thickness: 16, kind: 'chipboard', sheet, grain: false },
};
export const DEFAULT_ELEMENT_MATERIALS = { carcass: 'iv18-w980', front: 'iv18-u708', back: 'hdf3', drawerBottom: 'iv16-w980' };

/** EN 1116:2018 limits per dimension (summary, design/screens/Standardi.html; to be confirmed from the standard's text). */
export const STANDARD_LIMITS: { key: keyof Dimensions; label: string; min: Mm | null; max: Mm | null; text: string }[] = [
  { key: 'worktopTopHeight', label: 'Visina radne ploče (gore)', min: 850, max: 1000, text: '850 / 900 / 950 (+50)' },
  { key: 'worktopDepth', label: 'Dubina radne ploče', min: 600, max: null, text: '≥ 600' },
  { key: 'worktopOverhang', label: 'Prepust radne ploče', min: null, max: 30, text: '≤ 30' },
  { key: 'plinthHeight', label: 'Sokla', min: 80, max: null, text: '≥ 80' },
  { key: 'worktopThickness', label: 'Debljina radne ploče', min: null, max: null, text: '—' },
  { key: 'baseCarcassHeight', label: 'Visina donjeg korpusa', min: null, max: null, text: 'izračunato iz gornjih' },
  { key: 'baseCarcassDepth', label: 'Dubina donjeg korpusa', min: 550, max: null, text: '≥ 550' },
  { key: 'worktopToWallUnit', label: 'Razmak radna ploča — gornji', min: 450, max: null, text: '≥ 450' },
  { key: 'wallUnitDepth', label: 'Dubina gornjeg elementa', min: 310, max: 400, text: '310 – 400' },
  { key: 'elementWidth', label: 'Širina elementa (predlog)', min: null, max: null, text: '400 / 500 / 600 / 900' },
];

/** 'ok' inside the limits, 'out' outside (a warning, never a block — docs/STANDARDI.md), null when there is no limit or value. */
export function checkLimit(key: keyof Dimensions, value: Mm | null): 'ok' | 'out' | null {
  const l = STANDARD_LIMITS.find(x => x.key === key);
  if (!l || value === null || (l.min === null && l.max === null)) return null;
  return (l.min === null || value >= l.min) && (l.max === null || value <= l.max) ? 'ok' : 'out';
}
