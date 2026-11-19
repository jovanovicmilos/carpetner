// Editor library (docs/EDITOR_2D.md, design/Main.dc.html): what can be dropped on the plan.
import type { Element, ElementKind, FrontRow, Hinge, Installation, Mm, Obstacle, Opening } from 'engine';
import catalog from '../../../fixtures/katalog.json';

export type LibItem =
  | { key: string; group: string; name: string; type: 'el'; kind: ElementKind; width: Mm; hinge?: Hinge; template?: Partial<Element>; front?: FrontRow[]; layer?: 'low' | 'up' | 'tall' }
  | { key: string; group: string; name: string; type: 'opening'; kind: Opening['kind']; width: Mm; height: Mm; sill: Mm }
  | { key: string; group: string; name: string; type: 'obs'; kind: Obstacle['kind']; width: Mm; depth: Mm; height?: Mm; free: boolean; label?: string }
  | { key: string; group: string; name: string; type: 'inst'; kind: Installation['kind']; height: Mm };

// Catalog of ready units (fixtures/katalog.json, docs/KATALOG.md): each is a default configuration of the one parametric element.
// Corner, dishwasher front and filler keep the classic construction (stubići, Fronta MSP, Filer), so no rows for them.
type CatalogItem = { key: string; group: string; name: string; kind: string; layer: 'low' | 'up' | 'tall'; width: Mm; depth: Mm; height: Mm; hinge: Hinge; front: FrontRow[]; interior: { shelves: number; innerDrawers: number } };
const KIND: Record<string, ElementKind> = { base: 'base', sink: 'sink', drawer: 'drawer', oven: 'oven', dw: 'appliance-front', corner: 'corner-blind', upper: 'wall', lift: 'wall', tall: 'tall', filler: 'filler' };
const CLASSIC = new Set<ElementKind>(['corner-blind', 'appliance-front', 'filler']);
export const CATALOG_GROUPS = ['Moji šabloni', 'Donji', 'Gornji', 'Visoki', 'Završni'];
const catalogItems: LibItem[] = (catalog.elementi as CatalogItem[]).filter(c => c.group !== 'Moji šabloni').map(c => {
  const kind = c.kind === 'open' ? (c.layer === 'up' ? 'wall' : 'base') : KIND[c.kind];
  const doors = c.front.some(r => r.type === 'door2') ? 2 : c.front.some(r => r.type === 'door' || r.type === 'glass' || r.type === 'doorBlind') ? 1 : 0;
  const template: Partial<Element> = CLASSIC.has(kind)
    ? { catalogKey: c.key, ...(kind === 'corner-blind' ? { hinge: c.hinge } : {}) }
    : { catalogKey: c.key, height: c.height, depth: c.depth, front: c.front, interior: c.interior, shelves: c.interior.shelves, drawerFronts: undefined, doors, hinge: doors === 2 ? 'LR' : doors ? c.hinge : 'none' };
  return { key: c.key, group: c.group, name: c.name, type: 'el', kind, width: c.width, template, ...(CLASSIC.has(kind) ? {} : { front: c.front, layer: c.layer }) };
});

export const LIBRARY: LibItem[] = [
  ...catalogItems,
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

// "Moji šabloni" items come from templates.ts (useTemplates), see Editor.
export const OBSTACLE_GROUPS = ['Otvori i prepreke', 'Instalacije'];

/** Id prefixes for new items. */
export const ID_PREFIX: Record<string, string> = {
  window: 'P', door: 'Vr', radiator: 'R', chimney: 'K', column: 'St', duct: 'Ka', other: 'X',
  water: 'V', drain: 'O', power: 'S', power400: 'T', gas: 'G',
};
