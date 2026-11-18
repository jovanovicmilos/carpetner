// Generator delova po docs/KONSTRUKCIJA.md.
// shortcut: implementirani samo bottomMode 'between' i backMode 'nailed', a overrides se ignorišu; proširiti kad editor elementa (MVP korak 4) to zatraži.
import type { Element, Installation, Mm, Part, Project } from './types';

type Kind = 'carcass' | 'front' | 'back' | 'drawerBottom';
type Spec = { name: string; qty: number; length: Mm; width: Mm; kind: Kind; note?: string };

const BLIND_PANEL_WIDTH = 420;
// shortcut: visoki element je uvek kućište frižidera sa nišom 1700; dodati varijante (rerna, ostava) kad dobiju spec.
const FRIDGE_NICHE = 1700;
// shortcut: fiksni sistem fioka (vodilice 500, dno W−74 × 476); zameniti pravilom iz kataloga okova.
export const DRAWER_SLIDE = 500;
const DRAWER_BOTTOM_DEDUCT = 74, DRAWER_BOTTOM_DEPTH = 476;
const CUTOUT_MARGIN = 50;
// Struja se ne seče u leđima; izrez samo za cevi (fixture: V1 ima utičnicu iza, bez izreza).
const PIPE_LETTER: Partial<Record<Installation['kind'], string>> = { water: 'V', drain: 'O', gas: 'G' };

function backCutout(p: Project, el: Element): string | undefined {
  const bottom = el.kind === 'wall' ? el.elevation ?? 0 : el.legs ?? 0;
  const hits = p.room.installations.filter(i => PIPE_LETTER[i.kind] && i.wallId === el.wallId
    && i.offset >= el.offset && i.offset <= el.offset + el.width
    && i.height >= bottom && i.height <= bottom + el.height);
  if (!hits.length) return;
  const r = (i: Installation) => (i.diameter ?? 0) / 2;
  const w = Math.max(...hits.map(i => i.offset + r(i))) - Math.min(...hits.map(i => i.offset - r(i))) + 2 * CUTOUT_MARGIN;
  const h = Math.max(...hits.map(i => i.height + r(i))) - Math.min(...hits.map(i => i.height - r(i))) + 2 * CUTOUT_MARGIN;
  const labels = [...new Set(hits.map(i => PIPE_LETTER[i.kind]))].join('+');
  return `izrez ${Math.round(w)}×${Math.round(h)} za ${labels}`;
}

function specs(p: Project, el: Element): Spec[] {
  const r = p.rules;
  const { width: W, height: H, depth: D } = el;
  const inner = W - 2 * r.carcassThickness, g = r.frontGap;
  const side: Spec = { name: 'Bok', qty: 2, length: H, width: D, kind: 'carcass' };
  const bottom: Spec = { name: 'Dno', qty: 1, length: inner, width: D, kind: 'carcass' };
  const rails = (qty: number): Spec => ({ name: 'Vezna letva', qty, length: inner, width: 100, kind: 'carcass' });
  const shelves: Spec[] = el.shelves ? [{ name: 'Polica', qty: el.shelves, length: inner, width: D - 20, kind: 'carcass' }] : [];
  const back: Spec = { name: 'Leđa', qty: 1, length: W - r.backReduction, width: H - r.backReduction, kind: 'back', note: backCutout(p, el) };
  const doors = (w: Mm): Spec[] =>
    el.doors === 2 ? [{ name: 'Vrata', qty: 2, length: H - 4, width: Math.floor((w - 2 * g) / 2), kind: 'front' }]
    : el.doors === 1 ? [{ name: 'Vrata', qty: 1, length: H - 4, width: w - g, kind: 'front' }]
    : [];
  const fronts = el.drawerFronts ?? [];
  const drawers: Spec[] = [
    ...fronts.map((h): Spec => ({ name: 'Fronta fioke', qty: 1, length: W - g, width: h, kind: 'front' })),
    ...(fronts.length ? [{ name: 'Dno fioke', qty: fronts.length, length: W - DRAWER_BOTTOM_DEDUCT, width: DRAWER_BOTTOM_DEPTH, kind: 'drawerBottom' as Kind }] : []),
  ];

  switch (el.kind) {
    case 'base':
    case 'sink':
      return [side, bottom, rails(2), ...shelves, back, ...doors(W)];
    case 'corner-blind':
      return [side, bottom, rails(2), ...shelves,
        { name: 'Slepa ploča', qty: 1, length: H - 4, width: BLIND_PANEL_WIDTH, kind: 'carcass' },
        back, ...doors(W - (el.blindWidth ?? 0))];
    case 'drawer':
      return [side, bottom, rails(2), back, ...drawers];
    case 'oven':
      return [side, bottom, rails(1), ...drawers];
    case 'appliance-front':
      return [{ name: 'Fronta MSP', qty: 1, length: H - 4, width: W - g, kind: 'front' }];
    case 'filler':
      return [{ name: 'Filer', qty: 1, length: H - 4, width: W - 4, kind: 'front' }];
    case 'wall':
      return [side, { ...bottom, name: 'Dno / vrh', qty: 2 }, ...shelves, back, ...doors(W)];
    case 'tall': {
      const upper = H - FRIDGE_NICHE - 4;
      return [side, { ...bottom, name: 'Dno / vrh / pregrada', qty: 3 },
        { ...back, name: 'Leđa (gornji deo)', width: upper },
        { name: 'Vrata frižider', qty: 1, length: FRIDGE_NICHE - 4, width: W - g, kind: 'front' },
        { name: 'Vrata gornja', qty: 1, length: upper, width: W - g, kind: 'front' }];
    }
  }
}

export function generateParts(p: Project): Part[] {
  const r = p.rules;
  const cut = (e: number) => (e >= r.deductEdgeFromCutMinThickness ? e : 0);
  return p.elements.flatMap(el => specs(p, el).map((s, i): Part => {
    const c = r.carcassEdge.thickness, f = r.frontEdge.thickness;
    const edges = s.kind === 'carcass' ? { L1: c, L2: 0, W1: 0, W2: 0 }
      : s.kind === 'front' ? { L1: f, L2: f, W1: f, W2: f }
      : { L1: 0, L2: 0, W1: 0, W2: 0 };
    const materialId = el.materials[s.kind];
    if (!materialId) throw new Error(`${el.label}: nedostaje materijal "${s.kind}"`);
    return {
      elementId: el.id, pos: `${el.label}-${i + 1}`, name: s.name, materialId,
      qty: s.qty, length: s.length, width: s.width, edges,
      cutLength: Math.round(s.length - cut(edges.W1) - cut(edges.W2)),
      cutWidth: Math.round(s.width - cut(edges.L1) - cut(edges.L2)),
      ...(s.note ? { note: s.note } : {}),
    };
  }));
}
