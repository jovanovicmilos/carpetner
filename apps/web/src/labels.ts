// Serbian UI names for engine enums, unit formatting/parsing at the UI edge.
import { format, type ElementKind, type Installation, type Obstacle, type Unit } from 'engine';

export const KIND_NAME: Record<ElementKind, string> = {
  'corner-blind': 'ugaoni', base: 'donji', sink: 'sudopera', drawer: 'fiokar', 'appliance-front': 'MSP',
  oven: 'rerna', filler: 'filer', tall: 'visoki', wall: 'gornji',
};

export const OBSTACLE_NAME: Record<Obstacle['kind'], string> = {
  chimney: 'Dimnjak', column: 'Stub', duct: 'Kanal', radiator: 'Radijator', other: 'Ostalo',
};

export const INSTALLATION_NAME: Record<Installation['kind'], string> = {
  water: 'Voda', drain: 'Odvod', power: 'Struja', power400: 'Trofazna', gas: 'Gas',
};

/** [letter, background, text colour] per design/README.md. */
export const INSTALLATION_MARK: Record<Installation['kind'], [string, string, string]> = {
  water: ['V', '#1E50C8', '#FFFFFF'], drain: ['O', '#57534E', '#FFFFFF'], power: ['S', '#F2B630', '#1C1B19'],
  power400: ['S', '#F2B630', '#1C1B19'], gas: ['G', '#B4440E', '#FFFFFF'],
};

/** Digits only, for plain mm fields. */
export const num = (v: string) => { const n = parseInt(v.replace(/\D/g, ''), 10); return isNaN(n) ? 0 : n; };

export const fmt = (mm: number, unit: Unit) => format(Math.round(mm), unit);

/** "72,5" in cm → 725 mm; "720" in mm → 720. Null when not a number. */
export function parseLength(text: string, unit: Unit): number | null {
  const n = parseFloat(text.replace(',', '.'));
  if (isNaN(n)) return null;
  return Math.round(unit === 'cm' ? n * 10 : n);
}
