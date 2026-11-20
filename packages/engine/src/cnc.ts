// Parts one by one for CNC / nesting (docs/NACRTI_I_IZVOZ.md "Proizvodnja"): DXF R12, mm, every piece of the cut list as its own
// closed contour at cut size, laid out in rows per material. Layers: KONTURA (outline), IZREZ (back cutout), KANT (banded edges,
// a line 5 mm inside), TEKST (position, name, finished size). Pure: the caller encodes the text (cp1250) and saves it.
// shortcut: no drilling yet (hinge cups, shelf pins, connectors) — waits on the workshop's hole spacing; BXF later.
import { backCutouts, generateParts } from './parts';
import type { Mm, Project } from './types';

const GAP = 50;      // between pieces
const ROW_W = 3000;  // row length before wrapping

export function partsDxf(p: Project): string {
  const parts = generateParts(p, false), cutouts = backCutouts(p);
  const els = Object.fromEntries(p.elements.map(e => [e.id, e]));
  const ents: string[] = [];
  const f = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
  const line = (layer: string, x0: Mm, y0: Mm, x1: Mm, y1: Mm) => ents.push('0', 'LINE', '8', layer, '10', f(x0), '20', f(y0), '30', '0.0', '11', f(x1), '21', f(y1), '31', '0.0');
  const rect = (layer: string, x0: Mm, y0: Mm, x1: Mm, y1: Mm) => {
    ents.push('0', 'POLYLINE', '8', layer, '66', '1', '70', '1');
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) ents.push('0', 'VERTEX', '8', layer, '10', f(x), '20', f(y), '30', '0.0');
    ents.push('0', 'SEQEND', '8', layer);
  };
  const text = (x: Mm, y: Mm, h: Mm, s: string) => ents.push('0', 'TEXT', '8', 'TEKST', '10', f(x), '20', f(y), '30', '0.0', '40', f(h), '1', s);

  let y = 0;
  const byMat = [...new Set(parts.map(x => x.materialId))];
  for (const mat of byMat) {
    text(0, y, 60, `${p.materials[mat]?.name ?? mat}`);
    y -= 120;
    let x = 0, rowH = 0;
    for (const part of parts.filter(x => x.materialId === mat)) for (let k = 0; k < part.qty; k++) {
      const L = part.cutLength, W = part.cutWidth;
      if (x > 0 && x + L > ROW_W) { x = 0; y -= rowH + GAP + 40; rowH = 0; }
      const top = y, bottom = y - W;
      rect('KONTURA', x, bottom, x + L, top);
      // Banded edges: L1 = front (bottom side here), L2 = back, W1 / W2 = the ends.
      const e = part.edges, i = 5;
      if (e.L1) line('KANT', x, bottom + i, x + L, bottom + i);
      if (e.L2) line('KANT', x, top - i, x + L, top - i);
      if (e.W1) line('KANT', x + i, bottom, x + i, top);
      if (e.W2) line('KANT', x + L - i, bottom, x + L - i, top);
      // Back cutout: centre measured from the element's left and bottom; the back is centred in the element.
      const c = part.name.startsWith('Poleđina') && part.note ? cutouts[part.elementId] : undefined, el = els[part.elementId];
      if (c && el) {
        const cx = c.cx - (el.width - L) / 2, cy = c.cy - (el.height - W) / 2;
        rect('IZREZ', x + cx - c.w / 2, bottom + cy - c.h / 2, x + cx + c.w / 2, bottom + cy + c.h / 2);
      }
      text(x, top + 10, 25, `${part.pos}${part.qty > 1 ? `/${k + 1}` : ''} ${part.name} ${part.length}×${part.width}`);
      x += L + GAP;
      rowH = Math.max(rowH, W);
    }
    y -= rowH + GAP + 200;
  }

  const layers: [string, number][] = [['KONTURA', 7], ['IZREZ', 1], ['KANT', 30], ['TEKST', 7]];
  const head = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$DWGCODEPAGE', '3', 'ANSI_1250', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LTYPE', '70', '1', '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0', '0', 'ENDTAB',
    '0', 'TABLE', '2', 'LAYER', '70', String(layers.length),
    ...layers.flatMap(([n, c]) => ['0', 'LAYER', '2', n, '70', '0', '62', String(c), '6', 'CONTINUOUS']),
    '0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'];
  return [...head, ...ents, '0', 'ENDSEC', '0', 'EOF'].join('\r\n') + '\r\n';
}
