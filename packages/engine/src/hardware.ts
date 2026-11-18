// Okov i repro materijal po tabeli „Okov — pravila brojanja“ iz docs/KONSTRUKCIJA.md.
// shortcut: klamerice, sokla i zidna lajsna nisu implementirani (nema pravila u specu); dodati kad se pravilo potvrdi.
import { DRAWER_SLIDE, generateParts } from './parts';
import type { HardwareLine, Project } from './types';

const hingesFor = (doorHeight: number) => (doorHeight <= 900 ? 2 : doorHeight <= 1600 ? 3 : doorHeight <= 2000 ? 4 : 5);
const PANELS = new Set(['Dno', 'Dno / vrh', 'Dno / vrh / pregrada']);
const NO_LEGS = new Set(['wall', 'appliance-front', 'filler']);

export function hardware(p: Project): HardwareLine[] {
  const lines = new Map<string, HardwareLine>();
  const add = (sku: string, name: string, unit: HardwareLine['unit'], qty: number, elementId: string) => {
    if (!qty) return;
    const l = lines.get(sku) ?? lines.set(sku, { sku, name, qty: 0, unit, elementIds: [] }).get(sku)!;
    l.qty += qty;
    if (!l.elementIds.includes(elementId)) l.elementIds.push(elementId);
  };
  const parts = generateParts(p);

  for (const el of p.elements) {
    const own = parts.filter(x => x.elementId === el.id);
    const count = (pred: (name: string) => boolean) => own.filter(x => pred(x.name)).reduce((s, x) => s + x.qty, 0);

    const hinges = own.filter(x => x.name.startsWith('Vrata')).reduce((s, x) => s + x.qty * hingesFor(x.length), 0);
    const legs = el.legs && !NO_LEGS.has(el.kind) ? 4 : 0;
    const panels = count(n => PANELS.has(n));
    const rails = count(n => n === 'Vezna letva');

    add('sarka', 'Šarka', 'kom', hinges, el.id);
    add('plocica-sarke', 'Montažna pločica', 'kom', hinges, el.id);
    add(`nogica-${el.legs}`, `Nogica ${el.legs}`, 'kom', legs, el.id);
    add('klipsa-sokla', 'Klipsa za soklu', 'kom', legs ? 2 : 0, el.id);
    add('nosac-police', 'Nosač police', 'kom', 4 * count(n => n === 'Polica'), el.id);
    add('vesaljka-par', 'Vešaljka za gornji', 'par', el.kind === 'wall' ? 1 : 0, el.id);
    add(`fioka-komplet-${DRAWER_SLIDE}`, `Fioka komplet ${DRAWER_SLIDE}`, 'kpl', el.drawerFronts?.length ?? 0, el.id);
    add('rucka', 'Ručka', 'kom', count(n => n.startsWith('Vrata') || n.startsWith('Fronta')), el.id);
    add('tipl-8x35', 'Tipl 8×35', 'kom', 2 * (3 * panels + 2 * rails), el.id);
    add('konfirmat-7x50', 'Konfirmat 7×50', 'kom', 2 * (2 * panels + rails), el.id);
    add('sraf-3.5x16', 'Šraf 3,5×16', 'kom', hinges * 2 + hinges * 2 + legs * 4, el.id);
  }
  return [...lines.values()];
}
