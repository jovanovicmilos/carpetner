// Serbian UI names for engine enums, unit formatting/parsing at the UI edge.
import { format, type ElementKind, type Installation, type Obstacle, type Unit } from 'engine';

export const KIND_NAME: Record<ElementKind, string> = {
  'corner-blind': 'ugaoni', base: 'donji', sink: 'sudopera', drawer: 'fiokar', 'appliance-front': 'MSP',
  oven: 'rerna', filler: 'filer', tall: 'visoki', wall: 'gornji',
};

/** " · <own name>" when the user named the element, else empty. */
export const ownName = (e: { name?: string }) => (e.name ? ` · ${e.name}` : '');

export const OBSTACLE_NAME: Record<Obstacle['kind'], string> = {
  chimney: 'Dimnjak', column: 'Stub', duct: 'Kanal', radiator: 'Radijator', other: 'Ostalo',
};

export const INSTALLATION_NAME: Record<Installation['kind'], string> = {
  water: 'Voda', drain: 'Odvod', power: 'Struja', power400: 'Trofazna 400 V', gas: 'Gas',
};

/** [letter, background, text colour] per design/README.md. */
export const INSTALLATION_MARK: Record<Installation['kind'], [string, string, string]> = {
  water: ['V', '#1E50C8', '#FFFFFF'], drain: ['O', '#57534E', '#FFFFFF'], power: ['S', '#F2B630', '#1C1B19'],
  power400: ['T', '#A15C00', '#FFFFFF'], gas: ['G', '#B4440E', '#FFFFFF'],
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

/** "1 nova poruka", "3 nove poruke", "5 novih poruka" (Serbian plural). */
export function newMessages(n: number) {
  const one = n % 10 === 1 && n % 100 !== 11, few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return `${n} ${one ? 'nova poruka' : few ? 'nove poruke' : 'novih poruka'}`;
}

/** Hover card of an installation (2D plan and 3D, user 2026-11-22: what it is and where). */
export function installationCard(i: Installation, unit: Unit) {
  const f = (mm: number) => fmt(mm, unit);
  return { title: INSTALLATION_NAME[i.kind], lines: [`Zid ${i.wallId} · ${f(i.offset)} ${unit} od ugla`,
    `Visina od poda ${f(i.height)} ${unit}${i.diameter ? ` · prečnik ${f(i.diameter)}` : ''}`, 'Element ispred dobija izrez u poleđini'] };
}

/** Hover card of an obstacle (2D plan): what it is, its size and where. */
export function obstacleCard(o: Obstacle, unit: Unit) {
  const f = (mm: number) => fmt(mm, unit);
  return { title: o.label || OBSTACLE_NAME[o.kind], lines: [
    `${f(o.width)} × ${f(o.depth)} ${unit}, ${o.height ? `visina ${f(o.height)}` : 'od poda do plafona'}${o.elevation ? ` · od poda ${f(o.elevation)}` : ''}`,
    ...(o.wallId ? [`Zid ${o.wallId} · ${f(o.offset ?? 0)} ${unit} od ugla`] : []), 'Elementi ne smeju da ga preklapaju'] };
}
