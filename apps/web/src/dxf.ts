// DXF R12 (ASCII, mm, cp1250) from a drawing SVG on the Nacrti screen (docs/NACRTI_I_IZVOZ.md "Standard slojeva").
// The SVG is drawn from the project at `data-mm` px per mm, so walking it gives the same drawing 1:1 in mm, Y up.
// Layer = nearest `data-layer` ancestor; groups hidden with opacity 0 (Kote, Brojevi… unchecked) are left out.
// shortcut: lines, rects, polylines, circles, M/L/H/V/Z paths and text only (no hatches, rounded corners, real DIMENSION entities).

const LAYERS: Record<string, [number, string]> = {
  ZIDOVI: [7, 'CONTINUOUS'], KONTURA: [7, 'CONTINUOUS'], OTVORI: [4, 'CONTINUOUS'], ELEMENTI_DONJI: [7, 'CONTINUOUS'],
  ELEMENTI_GORNJI: [30, 'DASHED'], ELEMENTI_VISOKI: [8, 'CONTINUOUS'], FRONTE: [7, 'CONTINUOUS'], OTVARANJE: [6, 'CONTINUOUS'],
  RADNA_PLOCA: [2, 'CONTINUOUS'], INSTALACIJE: [5, 'CONTINUOUS'], KOTE: [3, 'CONTINUOUS'], TEKST: [7, 'CONTINUOUS'],
};
// Windows-1250 bytes for the characters the drawings use beyond ASCII.
const CP1250: Record<string, number> = {
  'č': 0xe8, 'ć': 0xe6, 'š': 0x9a, 'ž': 0x9e, 'đ': 0xf0, 'Č': 0xc8, 'Ć': 0xc6, 'Š': 0x8a, 'Ž': 0x8e, 'Đ': 0xd0,
  '×': 0xd7, '·': 0xb7, '—': 0x97, '–': 0x96, '°': 0xb0, '„': 0x84, '“': 0x93, '”': 0x94,
};

export function encodeCp1250(s: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([...s].map(ch => (ch.charCodeAt(0) < 128 ? ch.charCodeAt(0) : CP1250[ch] ?? 0x3f)));
}

export function svgToDxf(svg: SVGSVGElement): Uint8Array<ArrayBuffer> {
  const k = Number(svg.dataset.mm) || 1;
  const root = svg.getScreenCTM()!.inverse();
  const ents: string[] = [];
  const f = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

  for (const el of svg.querySelectorAll<SVGGraphicsElement>('line, rect, polyline, polygon, circle, path, text')) {
    if (el.closest('defs, [opacity="0"]')) continue;
    const L = el.closest<SVGElement>('[data-layer]')?.dataset.layer ?? (el.tagName === 'text' ? 'TEKST' : 'KONTURA');
    const m = root.multiply(el.getScreenCTM()!);
    const P = (x: number, y: number): [number, number] => [(m.a * x + m.c * y + m.e) / k, -(m.b * x + m.d * y + m.f) / k];
    const line = (a: [number, number], b: [number, number]) =>
      ents.push('0', 'LINE', '8', L, '10', f(a[0]), '20', f(a[1]), '30', '0.0', '11', f(b[0]), '21', f(b[1]), '31', '0.0');
    const poly = (pts: [number, number][], close: boolean) => {
      pts.slice(1).forEach((p, i) => line(pts[i], p));
      if (close && pts.length > 2) line(pts.at(-1)!, pts[0]);
    };
    const n = (a: string) => Number(el.getAttribute(a) ?? 0);

    switch (el.tagName) {
      case 'line': line(P(n('x1'), n('y1')), P(n('x2'), n('y2'))); break;
      case 'rect': { const [x, y, w, h] = [n('x'), n('y'), n('width'), n('height')]; poly([P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)], true); break; }
      case 'polyline': case 'polygon': {
        const v = (el.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number);
        poly(Array.from({ length: v.length >> 1 }, (_, i) => P(v[2 * i], v[2 * i + 1])), el.tagName === 'polygon');
        break;
      }
      case 'circle': {
        const [x, y] = P(n('cx'), n('cy'));
        ents.push('0', 'CIRCLE', '8', L, '10', f(x), '20', f(y), '30', '0.0', '40', f((n('r') * Math.hypot(m.a, m.b)) / k));
        break;
      }
      case 'path': {
        let cur: [number, number] = [0, 0], start = cur, pts: [number, number][] = [];
        const flush = (close: boolean) => { if (pts.length > 1) poly(pts.map(p => P(...p)), close); pts = []; };
        for (const [, c, args] of (el.getAttribute('d') ?? '').matchAll(/([MLHVZ])([^MLHVZ]*)/gi)) {
          const a = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
          switch (c) {
            case 'M': flush(false); cur = start = [a[0], a[1]]; pts = [cur]; break;
            case 'L': for (let i = 0; i < a.length; i += 2) pts.push(cur = [a[i], a[i + 1]]); break;
            case 'H': pts.push(cur = [a[0], cur[1]]); break;
            case 'V': pts.push(cur = [cur[0], a[0]]); break;
            case 'Z': case 'z': flush(true); cur = start; break;
          }
        }
        flush(false);
        break;
      }
      case 'text': {
        const s = el.textContent?.trim();
        if (!s) break;
        const [x, y] = P(n('x'), n('y'));
        const h = (parseFloat(getComputedStyle(el).fontSize) * Math.hypot(m.a, m.b) * 0.72) / k;
        const rot = (-Math.atan2(m.b, m.a) * 180) / Math.PI;
        const align = { middle: '1', end: '2' }[getComputedStyle(el).textAnchor] ?? '0';
        ents.push('0', 'TEXT', '8', L, '10', f(x), '20', f(y), '30', '0.0', '40', f(h), '1', s);
        if (Math.abs(rot) > 0.01) ents.push('50', f(rot));
        if (align !== '0') ents.push('72', align, '11', f(x), '21', f(y), '31', '0.0');
        break;
      }
    }
  }

  const head = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$DWGCODEPAGE', '3', 'ANSI_1250',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LTYPE', '70', '2',
    '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0',
    '0', 'LTYPE', '2', 'DASHED', '70', '0', '3', 'Dashed __ __ __', '72', '65', '73', '2', '40', '150.0', '49', '100.0', '49', '-50.0',
    '0', 'ENDTAB', '0', 'TABLE', '2', 'LAYER', '70', String(Object.keys(LAYERS).length),
    ...Object.entries(LAYERS).flatMap(([name, [color, lt]]) => ['0', 'LAYER', '2', name, '70', '0', '62', String(color), '6', lt]),
    '0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'];
  return encodeCp1250([...head, ...ents, '0', 'ENDSEC', '0', 'EOF'].join('\r\n') + '\r\n');
}
