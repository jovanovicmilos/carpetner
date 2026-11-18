// Editor library (docs/EDITOR_2D.md, design/Main.dc.html): what can be dropped on the plan.
import type { ElementKind, Hinge, Installation, Mm, Obstacle, Opening } from 'engine';

export type LibItem =
  | { key: string; group: string; name: string; type: 'el'; kind: ElementKind; width: Mm; hinge?: Hinge }
  | { key: string; group: string; name: string; type: 'opening'; kind: Opening['kind']; width: Mm; height: Mm; sill: Mm }
  | { key: string; group: string; name: string; type: 'obs'; kind: Obstacle['kind']; width: Mm; depth: Mm; height?: Mm; free: boolean; label?: string }
  | { key: string; group: string; name: string; type: 'inst'; kind: Installation['kind']; height: Mm };

export const LIBRARY: LibItem[] = [
  // shortcut: one fixed example template (design/screens/Main.html); real templates come with "Sačuvaj kao šablon" (element_templates).
  { key: 'tplSink', group: 'Moji šabloni', name: 'Sudopera 800 (moja)', type: 'el', kind: 'sink', width: 800, hinge: 'LR' },
  { key: 'base600', group: 'Donji', name: 'Donji 600', type: 'el', kind: 'base', width: 600 },
  { key: 'base400', group: 'Donji', name: 'Donji 400', type: 'el', kind: 'base', width: 400 },
  { key: 'sink800', group: 'Donji', name: 'Sudopera 800', type: 'el', kind: 'sink', width: 800 },
  { key: 'drawer600', group: 'Donji', name: 'Fiokar 600', type: 'el', kind: 'drawer', width: 600 },
  { key: 'oven600', group: 'Donji', name: 'Rerna 600', type: 'el', kind: 'oven', width: 600 },
  { key: 'dw600', group: 'Donji', name: 'MSP 600', type: 'el', kind: 'appliance-front', width: 600 },
  { key: 'corner1000', group: 'Donji', name: 'Ugaoni 1000', type: 'el', kind: 'corner-blind', width: 1000 },
  { key: 'filler', group: 'Donji', name: 'Filer', type: 'el', kind: 'filler', width: 100 },
  { key: 'up600', group: 'Gornji i visoki', name: 'Gornji 600', type: 'el', kind: 'wall', width: 600 },
  { key: 'up400', group: 'Gornji i visoki', name: 'Gornji 400', type: 'el', kind: 'wall', width: 400, hinge: 'R' },
  { key: 'tall600', group: 'Gornji i visoki', name: 'Visoki 600', type: 'el', kind: 'tall', width: 600 },
  { key: 'window', group: 'Otvori i prepreke', name: 'Prozor', type: 'opening', kind: 'window', width: 1000, height: 1200, sill: 1000 },
  { key: 'door', group: 'Otvori i prepreke', name: 'Vrata', type: 'opening', kind: 'door', width: 900, height: 2050, sill: 0 },
  { key: 'radiator', group: 'Otvori i prepreke', name: 'Radijator', type: 'obs', kind: 'radiator', width: 800, depth: 100, height: 600, free: false },
  { key: 'chimney', group: 'Otvori i prepreke', name: 'Dimnjak', type: 'obs', kind: 'chimney', width: 500, depth: 400, height: 2600, free: false },
  { key: 'column', group: 'Otvori i prepreke', name: 'Stub', type: 'obs', kind: 'column', width: 300, depth: 300, free: true },
  { key: 'duct', group: 'Otvori i prepreke', name: 'Kanal', type: 'obs', kind: 'duct', width: 250, depth: 250, free: true },
  { key: 'other', group: 'Otvori i prepreke', name: 'Ostalo', type: 'obs', kind: 'other', width: 400, depth: 400, height: 900, free: true, label: 'Ostalo' },
  { key: 'water', group: 'Instalacije', name: 'Voda', type: 'inst', kind: 'water', height: 500 },
  { key: 'drain', group: 'Instalacije', name: 'Odvod', type: 'inst', kind: 'drain', height: 450 },
  { key: 'power', group: 'Instalacije', name: 'Struja', type: 'inst', kind: 'power', height: 1100 },
  { key: 'power400', group: 'Instalacije', name: 'Trofazna 400 V', type: 'inst', kind: 'power400', height: 600 },
  { key: 'gas', group: 'Instalacije', name: 'Gas', type: 'inst', kind: 'gas', height: 600 },
];

export const LIBRARY_GROUPS = ['Moji šabloni', 'Donji', 'Gornji i visoki', 'Otvori i prepreke', 'Instalacije'];

/** Id prefixes for new items. */
export const ID_PREFIX: Record<string, string> = {
  window: 'P', door: 'Vr', radiator: 'R', chimney: 'K', column: 'St', duct: 'Ka', other: 'X',
  water: 'V', drain: 'O', power: 'S', power400: 'T', gas: 'G',
};
