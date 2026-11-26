// Unit icon in a 3/4 view (design/Main.dc.html `unitIcon`, design/BRIEF_LIBRARY_ICONS.md answer, 2026-11-26): the front layout
// to scale (rows, doors, drawers, handles per opening) on the face of the carcass, plus the right side, the top, the plinth, a soft
// shadow, a sink basin and faucet on top, hinge ticks. Oblique projection, all in mm in one viewBox: depth goes right and up.
import { frontRows, type Element, type OpeningKind } from 'engine';
import { cn } from '@/lib/utils';

export type ThumbEl = Pick<Element, 'width' | 'height' | 'kind' | 'front' | 'hinge' | 'blindWidth' | 'doors' | 'drawerFronts'> & { depth?: number };

const IC = { front: '#FBF8F2', edge: '#4A4640', side: '#E2D5BF', top: '#EFE7D8', plinth: '#4A4743', inner: '#E4D8C5', app: '#3B3E40', steel: '#B9BEC1', glass: '#D7E5F1', hinge: '#9A9184', blind: '#ECE5D8' };
const KX = 0.42, KY = 0.26, PAD = 30;

/** Rows for the picture: the element's own rows, else its classic layout (visual only). */
function thumbRows(el: ThumbEl, H: number): { type: string; h: number }[] {
  if (el.front?.length) return frontRows({ ...el, height: H } as Element).map(r => ({ type: r.row.type, h: r.h }));
  const drawers = (el.drawerFronts ?? []).map(h => ({ type: 'drawer', h: h + 4 }));
  switch (el.kind) {
    case 'drawer': return drawers.length ? drawers : [{ type: 'drawer', h: H }];
    case 'oven': return [{ type: 'app', h: H - drawers.reduce((s, d) => s + d.h, 0) }, ...drawers];
    case 'tall': return [{ type: 'door', h: H - 1700 }, { type: 'door', h: 1700 }];
    case 'corner-blind': return [{ type: 'doorBlind', h: H }];
    case 'appliance-front': case 'filler': return [{ type: 'panel', h: H }];
    default: return [{ type: el.doors === 2 ? 'door2' : el.doors === 1 ? 'door' : 'open', h: H }];
  }
}

type Path = { d: string; f?: string; s?: string; w?: number; o?: number };

/** The icon as SVG paths in mm (viewBox + aspect ratio). */
export function unitIcon(el: ThumbEl, opening?: OpeningKind): { vb: string; ratio: number; p: Path[] } {
  const up = el.kind === 'wall', tall = el.kind === 'tall', mask = el.kind === 'filler' && el.width <= 25;
  const W = el.width, D = Math.min(el.depth ?? (up ? 320 : 560), 600), H = tall ? el.height - 100 : el.height, pl = up || mask ? 0 : 100, g = 3;
  const dX = D * KX, dY = D * KY, yTop = dY + (el.kind === 'sink' ? 150 : PAD);
  const P = (x: number, y: number, z: number) => [x + z * KX, yTop + (H - y) - z * KY]; // y up from the carcass bottom
  const poly = (pts: number[][]) => `M${pts.map(q => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z`;
  const R = (x: number, y: number, w: number, h: number) => `M${x} ${y + yTop}h${w}v${h}h${-w}Z`; // front plane, y down from the top
  const out: Path[] = [], add = (d: string, f?: string, s?: string, w = 1, o = 1) => { if (d) out.push({ d, f, s, w, o }); };
  const floorY = yTop + H + pl;

  // shadow, plinth (50 mm in), carcass right side and top
  if (!up) add(poly([[-18, floorY + 6], [W + 10, floorY + 6], [W + dX + 26, floorY - dY + 2], [dX - 6, floorY - dY + 2]]), '#1C1B19', undefined, 0, 0.08);
  else add(poly([[W * 0.08, floorY + 34], [W * 0.98, floorY + 34], [W + dX * 0.7, floorY + 22], [dX * 0.6, floorY + 22]]), '#1C1B19', undefined, 0, 0.05);
  if (pl) {
    add(poly([P(0, -pl, 50), P(W, -pl, 50), P(W, 0, 50), P(0, 0, 50)]), IC.plinth, IC.edge, 0.8);
    add(poly([P(W, -pl, 50), P(W, -pl, D - 20), P(W, 0, D - 20), P(W, 0, 50)]), '#3A3835', IC.edge, 0.8);
  }
  add(poly([P(W, 0, 0), P(W, 0, D), P(W, H, D), P(W, H, 0)]), IC.side, IC.edge, 0.9);
  add(poly([P(0, H, 0), P(W, H, 0), P(W, H, D), P(0, H, D)]), IC.top, IC.edge, 0.9);
  if (el.kind === 'sink') {
    add(poly([P(W * 0.16, H, 70), P(W * 0.84, H, 70), P(W * 0.84, H, D - 150), P(W * 0.16, H, D - 150)]), '#CDD7E0', '#8A97AA', 0.8);
    const f = [P(W / 2, H, D - 80), P(W / 2, H + 190, D - 80), P(W / 2, H + 190, D - 230), P(W / 2, H + 150, D - 260)];
    add(`M${f.map(q => `${q[0]} ${q[1]}`).join('L')}`, undefined, '#7E858A', 2.2);
  }

  // front plane: rows to scale (y down from the carcass top), like the old flat thumb
  const rows = thumbRows(el, H);
  let box = '', app = '', steel = '', glass = '', lines = '', hand = '', ticks = '', blind = '', y0 = 0;
  const hingeL = el.hinge !== 'R';
  const tick = (x: number, y: number, h: number, left: boolean) => { for (const k of [0.14, 0.86]) ticks += `M${left ? x + 4 : x - 4} ${y + yTop + h * k}h${left ? 26 : -26}`; };
  for (const r of rows) {
    const x = g / 2, y = y0 + g / 2, ww = W - g, hh = r.h - g;
    y0 += r.h;
    if (r.type === 'hood') { steel += `M${x} ${y + yTop + hh}L${x + ww * 0.3} ${y + yTop}h${ww * 0.4}L${x + ww} ${y + yTop + hh}Z`; continue; }
    if (r.type === 'door2') { const hw = (ww - g) / 2; box += R(x, y, hw, hh) + R(x + hw + g, y, hw, hh); tick(x, y, hh, true); tick(x + ww, y, hh, false); }
    else if (r.type === 'doorBlind' && el.kind === 'corner-blind') {
      // blind part on the corner side = opposite the hinge (engine blindSpan), hatched; the door on the open part
      const b = el.blindWidth ?? 628, bx = hingeL ? x + ww - b + g : x, dx = hingeL ? x : x + b;
      blind += R(bx, y, b - g, hh); box += R(dx, y, ww - b, hh); tick(hingeL ? dx : dx + ww - b, y, hh, hingeL);
    } else box += R(x, y, ww, hh);
    if (r.type === 'door' || r.type === 'glass') tick(hingeL ? x : x + ww, y, hh, hingeL);
    if (r.type === 'lift') for (const k of [0.2, 0.8]) ticks += `M${x + ww * k} ${y + yTop + 4}v26`;
    if (r.type === 'app') { const m = Math.min(ww, hh) * 0.12; app += R(x + m, y + m * 1.6, ww - 2 * m, hh - m * 2.4); }
    if (r.type === 'glass') { const m = Math.min(ww, hh) * 0.1; glass += R(x + m, y + m, ww - 2 * m, hh - 2 * m); }
    if (r.type === 'open') lines += `M${x} ${y + yTop + hh / 3}h${ww}M${x} ${y + yTop + (hh * 2) / 3}h${ww}`;
    if (r.type === 'open' || r.type === 'app' || el.kind === 'filler') continue;
    const horiz = r.type === 'drawer' || r.type === 'panel' || r.type === 'lift';
    if (opening === 'push') continue;
    if (opening === 'profile') { hand += `M${x} ${yTop + ((up && !horiz) || r.type === 'lift' ? y + hh - 6 : y + 6)}h${ww}`; continue; }
    const len = Math.min(ww * 0.45, 260);
    if (horiz) { const hx = x + ww / 2, hy = yTop + (r.type === 'lift' ? y + hh - 40 : y + Math.min(60, hh * 0.3)); hand += opening === 'knob' ? `M${hx} ${hy}h0.01` : `M${hx - len / 2} ${hy}h${len}`; }
    else if (r.type === 'door2') {
      const hw = (ww - g) / 2, vlen = Math.min(hh * 0.3, 220), cy = yTop + (up ? y + hh - vlen / 2 - 40 : y + vlen / 2 + 40);
      for (const hx of [x + hw - 45, x + hw + g + 45]) hand += opening === 'knob' ? `M${hx} ${cy}h0.01` : `M${hx} ${cy - vlen / 2}v${vlen}`;
    } else {
      const doorX = r.type === 'doorBlind' && el.kind === 'corner-blind' ? (hingeL ? x : x + (el.blindWidth ?? 628)) : x;
      const doorW = r.type === 'doorBlind' && el.kind === 'corner-blind' ? ww - (el.blindWidth ?? 628) : ww;
      const hx = hingeL ? doorX + doorW - 45 : doorX + 45, vlen = Math.min(hh * 0.3, 220);
      const cy = yTop + (tall ? (y0 - r.h < H * 0.3 ? y + hh - vlen / 2 - 50 : y + vlen / 2 + 50) : up ? y + hh - vlen / 2 - 40 : y + vlen / 2 + 40);
      hand += opening === 'knob' ? `M${hx} ${cy}h0.01` : `M${hx} ${cy - vlen / 2}v${vlen}`;
    }
  }
  const open = rows.every(r => r.type === 'open');
  add(box, open ? IC.inner : IC.front, IC.edge, 1);
  if (open) add(poly([P(0, H, 0), P(W, H, 0), P(W - 40, H - 40, 0), P(40, H - 40, 0)]), '#CDBFA8', undefined, 0); // shadow under the top
  add(lines, undefined, '#B9AC97', 1.2);
  add(app, IC.app, undefined, 0);
  add(steel, IC.steel, IC.edge, 0.8);
  add(glass, IC.glass, '#8A97AA', 0.8);
  if (blind) {
    add(blind, IC.blind, IC.edge, 1);
    const [bx, by, bw, bh] = blind.match(/-?[\d.]+/g)!.map(Number); // M x y h w v h …
    let hatch = '';
    for (let k = -bh; k < bw; k += 70) { const t0 = Math.max(0, -k), t1 = Math.min(bh, bw - k); if (t1 > t0) hatch += `M${bx + k + t0} ${by + t0}L${bx + k + t1} ${by + t1}`; }
    add(hatch, undefined, '#CFC5B4', 0.8);
  }
  if (el.kind === 'appliance-front') add(`M${W * 0.1} ${yTop + 50}h${W * 0.8}`, undefined, IC.steel, 2); // dishwasher control strip
  add(ticks, undefined, IC.hinge, 1.4);
  add(hand, undefined, '#1C1B19', opening === 'knob' ? 5 : opening === 'profile' ? 2.6 : 2.4);
  const vbW = W + dX + PAD * 2, vbH = yTop + H + pl + (up ? 50 : 20);
  return { vb: `${-PAD} 0 ${vbW.toFixed(0)} ${vbH.toFixed(0)}`, ratio: vbW / vbH, p: out };
}

/** Library card icon (60 px high, 92 for tall, max 84 wide, bottom-aligned) or the big panel picture (110 / 170 px). */
export function FrontThumb({ el, opening, big }: { el: ThumbEl; opening?: OpeningKind; big?: boolean }) {
  const ic = unitIcon(el, opening), tall = el.kind === 'tall';
  const hpx = tall ? 92 : 60, wpx = Math.min(84, hpx * ic.ratio);
  const svg = (
    <svg viewBox={ic.vb} preserveAspectRatio={big ? 'xMidYMid meet' : 'xMidYMax meet'} {...(big ? { role: 'img', 'aria-label': 'Izgled elementa sa izabranim ručkama' } : { 'aria-hidden': true })}
      className={big ? undefined : 'transition-transform duration-150 group-hover:-translate-y-0.5 group-aria-pressed:-translate-y-0.5'}
      style={big ? { width: '100%', height: tall ? 170 : 110 } : { width: wpx, height: hpx, overflow: 'visible' }}>
      {ic.p.map((q, i) => <path key={i} d={q.d} fill={q.f ?? 'none'} stroke={q.s ?? 'none'} strokeWidth={q.w} opacity={q.o} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
  return big
    ? <span className="flex justify-center rounded-[8px] bg-[#F7F4EE] p-[10px]">{svg}</span>
    : <span className={cn('flex w-full items-end justify-center')} style={{ height: hpx }}>{svg}</span>;
}

// Obstacle and installation icons (design/Main.dc.html OBSICON, BRIEF_LIBRARY_ICONS addendum 2026-11-26): 48 × 48, drawn at 46 px.
// Obstacles stand on a floor line; installations keep their plan colour as a rounded tile with a symbol (the plan keeps letters).
const OI = '#3D3A35';
const op = (d: string, f?: string, s?: string, w = 0, da?: string) => ({ d, f, s, w, da });
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const FLOOR = op('M4 43h40', undefined, '#8A8378', 1.4);
const badge = (bg: string) => op('M8 4h32a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z', bg);
const FINS = Array.from({ length: 7 }, (_, i) => `M${9 + 4.5 * i} 15h3v19h-3z`).join('');
const BRICKS = 'M14 15h18M14 20h18M14 25h18M14 30h18M14 35h18M14 40h18M20 10v5M26 15v5M20 20v5M26 25v5M20 30v5M26 35v5M20 40v2';
const OBSICON: Record<string, ReturnType<typeof op>[]> = {
  window: [op('M8 7h32v29H8z', '#FBF8F2', OI, 1.5), op('M11 10h12v23H11zM25 10h12v23H25z', '#D7E5F1', OI, 1.1), op('M5 36h38v3H5z', '#E2D5BF', OI, 1.2), op('M22 20v4M26 20v4', undefined, OI, 1.6), op('M13 12l6 6', undefined, '#FFFFFF', 1.6)],
  door: [FLOOR, op('M12 6h24v37H12z', '#EFE7D8', OI, 1.4), op('M14 8h20v35H14z', '#FBF8F2', OI, 1.2), op('M17 12h14v12H17zM17 27h14v12H17z', undefined, '#B9AC97', 1), op('M30 25h3', undefined, OI, 2.2), op('M14 43 34 30', undefined, '#8A8378', 1, '3 2')],
  radiator: [FLOOR, op('M6 13h36M6 35h36', undefined, '#8A8378', 1.6), op(FINS, '#FFFFFF', OI, 1.1), op('M6 35v8M42 35v8', undefined, '#8A8378', 1.6), op(circle(6, 37, 2.2), '#B4440E', OI, 0.8)],
  chimney: [FLOOR, op('M32 10l6-4v33l-6 4z', '#C4AA8B', OI, 1.2), op('M14 10l6-4h18l-6 4z', '#E2CFB6', OI, 1.2), op('M14 10h18v33H14z', '#D9C3A8', OI, 1.3), op(BRICKS, undefined, '#B5987A', 0.9)],
  column: [FLOOR, op('M28 8l6-4v35l-6 4z', '#C2BDB3', OI, 1.2), op('M16 8l6-4h12l-6 4z', '#E6E2DA', OI, 1.2), op('M16 8h12v35H16z', '#D8D4CC', OI, 1.3), op('M19 14l2 1M24 22l1 2M20 31l2-1', undefined, '#A8A298', 1)],
  duct: [FLOOR, op('M31 12l5-3v31l-5 3z', '#B7BEC4', OI, 1.2), op('M15 12l5-3h16l-5 3z', '#DCE1E5', OI, 1.2), op('M15 12h16v31H15z', '#CDD3D8', OI, 1.3), op('M18 18h10M18 22h10M18 26h10M18 30h10', undefined, '#8E979E', 1.2), op('M19 7c1.5-2 3 0 4.5-2M24 7c1.5-2 3 0 4.5-2', undefined, '#7FA7D9', 1.3)],
  other: [FLOOR, op('M14 13l6-5h16l-6 5zM30 13l6-5v30l-6 5zM14 13h16v30H14z', '#F3F1EC', OI, 1.3, '3 2'), op('M19.5 23a2.8 2.8 0 1 1 4 2.5c-1 .5-1.2 1.2-1.2 2.3M22.3 31.5v.4', undefined, OI, 1.8)],
  water: [badge('#1E50C8'), op('M11 17h14a5 5 0 0 1 5 5v3', undefined, '#FFFFFF', 3), op('M15 13h6', undefined, '#FFFFFF', 3), op('M30 29c-2 3-3 4.5-3 6a3 3 0 0 0 6 0c0-1.5-1-3-3-6z', '#FFFFFF')],
  drain: [badge('#57534E'), op(circle(24, 24, 12), undefined, '#FFFFFF', 2.2), op('M17 20h14M15 24h18M17 28h14', undefined, '#FFFFFF', 2)],
  power: [badge('#F2B630'), op(circle(24, 24, 12), '#FCE6A6', '#1C1B19', 2), op(circle(19.5, 24, 2.2) + circle(28.5, 24, 2.2), '#1C1B19'), op('M22 12.5h4M22 35.5h4', undefined, '#1C1B19', 2.2)],
  power400: [badge('#A15C00'), op(circle(24, 24, 12.5), undefined, '#FFFFFF', 2), op(circle(24, 16.5, 1.8) + circle(31, 21.5, 1.8) + circle(28.4, 30, 1.8) + circle(19.6, 30, 1.8) + circle(17, 21.5, 1.8), '#FFFFFF'), op('M24 24.5v2', undefined, '#FFFFFF', 2.4)],
  gas: [badge('#B4440E'), op('M24 9c4 6 10 9 10 17a10 10 0 0 1-20 0c0-4.5 2.5-7 4.5-9 0 3.5 1.5 5.5 3.5 5.5 0-5.5-1.5-9 2-13.5z', '#FFFFFF'), op('M24 33c-2.5 0-4-1.8-4-4 0-2.2 2-3.5 3-5.5 1 3 5 4 5 6.5 0 1.8-1.6 3-4 3z', '#F6B48A')],
};

/** Library icon of an opening, obstacle or installation, by its kind (window, door, radiator, …, water, drain, power, power400, gas). */
export function ObstacleIcon({ kind }: { kind: string }) {
  return (
    <span className="flex h-[50px] w-full items-end justify-center">
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-[46px] transition-transform duration-150 group-hover:-translate-y-0.5 group-aria-pressed:-translate-y-0.5">
        {(OBSICON[kind] ?? OBSICON.other).map((q, i) => <path key={i} d={q.d} fill={q.f ?? 'none'} stroke={q.s ?? 'none'} strokeWidth={q.w} strokeDasharray={q.da} strokeLinejoin="round" strokeLinecap="round" />)}
      </svg>
    </span>
  );
}
