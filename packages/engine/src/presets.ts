// Default dimensions per preset (docs/STANDARDI.md). 'none' has no defaults: forms stay empty.
import type { Mm } from './types';

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
}

const en1116: Dimensions = {
  worktopTopHeight: 900, worktopDepth: 600, worktopThickness: 38, plinthHeight: 100,
  baseCarcassHeight: 900 - 100 - 38, baseCarcassDepth: 560,
  worktopToWallUnit: 550, wallUnitDepth: 320,
  wallUnitHeight: 720, // not in the standards table; workshop value
};

export const PRESETS: Record<'en1116' | 'iso3055' | 'workshop', Dimensions> = {
  en1116,
  iso3055: en1116, // same values until confirmed from the ISO 3055 text
  workshop: { ...en1116, worktopTopHeight: 858, baseCarcassHeight: 720, worktopToWallUnit: 592 },
};

/** Wall unit bottom edge from the floor: plinth + base carcass + worktop + gap. */
export const wallUnitElevation = (d: Dimensions): Mm =>
  d.plinthHeight + d.baseCarcassHeight + d.worktopThickness + d.worktopToWallUnit;
