// Hardware and consumables per the counting table in docs/KONSTRUKCIJA.md.
import { DRAWER_SLIDE, generateParts } from './parts';
import type { HardwareLine, Project } from './types';

const hingesFor = (doorHeight: number) => (doorHeight <= 900 ? 2 : doorHeight <= 1600 ? 3 : doorHeight <= 2000 ? 4 : 5);
const PANELS = new Set(['Pod', 'Pod / plafon', 'Pod / plafon / srednja stranica', 'Srednja stranica']);
// Fasteners per joined end: [panel end, rail end] (docs/KONSTRUKCIJA.md "Varijante spoja").
const JOINT = {
  'dowel+confirmat': { tipl: [3, 2], konfirmat: [2, 1], ekscentar: [0, 0] },
  minifix: { tipl: [2, 1], konfirmat: [0, 0], ekscentar: [2, 1] },
  confirmat: { tipl: [0, 0], konfirmat: [3, 2], ekscentar: [0, 0] },
} as const;
const NO_LEGS = new Set(['wall', 'appliance-front', 'filler']);

export function hardware(p: Project): HardwareLine[] {
  const lines = new Map<string, HardwareLine>();
  const add = (sku: string, name: string, unit: HardwareLine['unit'], qty: number, elementId: string) => {
    if (!qty) return;
    const l = lines.get(sku) ?? lines.set(sku, { sku, name, qty: 0, unit, elementIds: [] }).get(sku)!;
    l.qty += qty;
    if (!l.elementIds.includes(elementId)) l.elementIds.push(elementId);
  };
  const parts = generateParts(p, false); // construction orientation: door length = height
  const j = JOINT[p.rules.joint];
  const ends = (f: readonly [number, number], panels: number, rails: number) => 2 * (f[0] * panels + f[1] * rails);

  for (const el of p.elements) {
    const own = parts.filter(x => x.elementId === el.id);
    const count = (pred: (name: string) => boolean) => own.filter(x => pred(x.name)).reduce((s, x) => s + x.qty, 0);

    const hinges = own.filter(x => x.name.startsWith('Vrata')).reduce((s, x) => s + x.qty * hingesFor(x.length), 0);
    const legs = el.legs && !NO_LEGS.has(el.kind) ? 4 : 0;
    const panels = count(n => PANELS.has(n));
    const rails = count(n => n === 'Vezna letva');

    // Names and order as in design/screens/Element.html.
    add('sarka', 'Šarka 110° sa usporivačem', 'kom', hinges, el.id);
    add('plocica-sarke', 'Montažna pločica za šarku', 'kom', hinges, el.id);
    add(`nogica-${el.legs}`, `Nogica ${el.legs} mm, podesiva`, 'kom', legs, el.id);
    add('klipsa-sokla', 'Klipsa za soklu', 'kom', legs ? 2 : 0, el.id);
    add('nosac-police', 'Nosač faha', 'kom', 4 * count(n => n === 'Fah'), el.id);
    add('vesaljka-par', 'Vešaljka za gornji', 'par', el.kind === 'wall' ? 1 : 0, el.id);
    add(`fioka-komplet-${DRAWER_SLIDE}`, `Fioka komplet ${DRAWER_SLIDE}`, 'kpl', el.drawerFronts?.length ?? 0, el.id);
    add('tipl-8x35', 'Tipl 8 × 35', 'kom', ends(j.tipl, panels, rails), el.id);
    // inset18 back: 3 confirmats per side + 2 through the bottom (and top).
    const insetBack = p.rules.backMode === 'inset18' ? count(n => n.startsWith('Poleđina')) * (6 + 2 * (el.kind === 'wall' || el.kind === 'tall' ? 2 : 1)) : 0;
    add('konfirmat-7x50', 'Konfirmat 7 × 50', 'kom', ends(j.konfirmat, panels, rails) + insetBack, el.id);
    add('ekscentar-15', 'Ekscentar 15 mm (kućište + klin)', 'kom', ends(j.ekscentar, panels, rails), el.id);
    add('sraf-3.5x16', 'Šraf 3,5 × 16', 'kom', hinges * 2 + hinges * 2 + legs * 4, el.id);
    const backs = own.filter(x => x.name.startsWith('Poleđina'));
    add('klamerica', 'Klamerica za poleđinu', 'kom', p.rules.backMode === 'nailed'
      ? backs.reduce((s, x) => s + x.qty * Math.floor(2 * (x.length + x.width) / p.rules.staplePitch), 0) : 0, el.id);
    add('rucka', 'Ručka 128 mm', 'kom', count(n => n.startsWith('Vrata') || n.startsWith('Fronta')), el.id);
    add('alu-podloga-sudopera', 'Aluminijumska podloga za sudoperu', 'kom', el.kind === 'sink' ? 1 : 0, el.id);
  }
  return [...lines.values()];
}
