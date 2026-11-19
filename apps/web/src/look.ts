// Realistic 3D look (design/Pogled3D.dc.html "Izgled za kupca", docs/3D.md): palettes and the colours the isometric view,
// the WebGL scene and the quote picture use. Fronts are real materials (changing them changes the cut list and price);
// worktop, wall, floor and appliance finish are only looks (Project.look).
import type { Material, Project } from 'engine';

/** [name, swatch (CSS), material it stands for]. Wood decors have grain. */
export const FRONTS: [string, string, Omit<Material, 'sheet'>][] = [
  ['Bela mat', '#F2F0EB', { id: 'mdf19-lak-bela', name: 'MDF 19 lak mat bela', thickness: 19, kind: 'mdf', grain: false }],
  ['Kašmir mat', '#D8CEC0', { id: 'iv18-u702', name: 'Iverica 18 kašmir U702', thickness: 18, kind: 'chipboard', grain: false }],
  ['Maslinasta mat', '#7D8166', { id: 'iv18-u633', name: 'Iverica 18 maslinasta U633', thickness: 18, kind: 'chipboard', grain: false }],
  ['Antracit mat', '#3A3C3F', { id: 'iv18-u961', name: 'Iverica 18 antracit U961', thickness: 18, kind: 'chipboard', grain: false }],
  ['Hrast prirodni', 'repeating-linear-gradient(90deg, #C99E6E 0 3px, #B98C5D 3px 4px, #D2A979 4px 8px)', { id: 'iv18-h1180', name: 'Iverica 18 hrast Halifax H1180', thickness: 18, kind: 'chipboard', grain: true }],
  ['Orah', 'repeating-linear-gradient(90deg, #6E4C34 0 3px, #553825 3px 4px, #7A5639 4px 8px)', { id: 'iv18-h3734', name: 'Iverica 18 orah H3734', thickness: 18, kind: 'chipboard', grain: true }],
];
export const WTOPS: [string, string, string][] = [
  ['Hrast', 'repeating-linear-gradient(0deg, #BF9466 0 3px, #A57A4D 3px 4px, #C99E70 4px 8px)', '38 mm hrast dekor'],
  ['Kvarc beli', 'radial-gradient(#BDB8AE 1px, transparent 1.5px) 0 0 / 6px 6px, #ECEAE5', '20 mm kvarc beli'],
  ['Crni granit', 'radial-gradient(#8D8D92 1px, transparent 1.5px) 0 0 / 5px 5px, #2A2A2C', '30 mm granit crni'],
  ['Beton', 'radial-gradient(#8F8B85 2px, transparent 3px) 0 0 / 10px 10px, #A9A59F', '38 mm beton dekor'],
];
export const WALLS: [string, string][] = [['Topla bela', '#EEE9E1'], ['Svetlo siva', '#E1E0DC'], ['Kadulja', '#C8D0BF'], ['Terakota', '#D9B9A3']];
export const FLOORS: [string, string][] = [
  ['Hrast parket', 'repeating-linear-gradient(0deg, #C7A07A 0 9px, #8B6744 9px 10px)'],
  ['Sive pločice', 'linear-gradient(#F2F0EC 1px, transparent 1px) 0 0 / 10px 10px, linear-gradient(90deg, #F2F0EC 1px, transparent 1px) 0 0 / 10px 10px, #C8C6C1'],
];
export const APPS: [NonNullable<NonNullable<Project['look']>['applianceFinish']>, string, string][] = [['inox', 'Inox', '#C9CED3'], ['black', 'Crno staklo', '#1E1F21'], ['white', 'Belo', '#F2F2F0']];
export const HANDLE_COLORS: ['inox' | 'black' | 'brass', string, string][] = [['inox', 'Inox', '#A7ADB3'], ['black', 'Crna', '#1E1E1E'], ['brass', 'Mesing', '#B08D57']];

// Flat colours per decor code (swatch / 3D); wood decors also get an SVG pattern in the isometric view.
const DECOR: Record<string, string> = { W980: '#F4F4F2', U708: '#BFC3C7', U702: '#D8CEC0', U633: '#7D8166', U961: '#3A3C3F', H1180: '#C99E6E', H3734: '#6E4C34' };
export const WOOD: Record<string, string> = { H1180: 'k-oak', H3734: 'k-walnut' };
const decor = (m?: Material) => m?.name.split(/\s+/).find(w => DECOR[w]);
export const materialColor = (m?: Material) => (m?.kind === 'mdf' ? '#F2F0EB' : DECOR[decor(m) ?? ''] ?? '#E7E1D5');

/** Colours of one view. `pattern*` are SVG pattern ids defined by the isometric view. */
export interface Palette {
  real: boolean; wallA: string; wallB: string; floor: string; side: string; top: string; front: string; frontB: string; line: string;
  worktop: string; edge: string; edgeB: string; plinth: string; sink: string; hob: string; handle: string; night: boolean;
  carcass: string;                     // carcass board colour (WebGL; the SVG view shades the fronts' colour instead)
}
export const TECH: Palette = {
  real: false, wallA: '#F6F3EE', wallB: '#ECE8E0', floor: '#D9D2C4', side: '#A9AEB3', top: '#D3D6D9', front: '#BFC3C7', frontB: '#B3B8BD', line: '#1C1B19',
  worktop: '#B79C76', edge: '#8A7354', edgeB: '#7A6548', plinth: '#5F5A52', sink: '#DADDE0', hob: '#2A2A2A', handle: '#1C1B19', night: false,
  carcass: '#F4F4F2',
};
const shade = (hex: string, k: number) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');

export function realPalette(p: Project): Palette {
  const L = p.look ?? {}, frontMat = p.materials[p.elements[0]?.materials.front ?? ''];
  const f = materialColor(frontMat), wood = WOOD[decor(frontMat) ?? ''];
  const wt = L.worktop ?? 'Hrast';
  const top = { Hrast: ['url(#k-oakwt)', '#9C744A'], 'Kvarc beli': ['#ECEAE5', '#CFCBC3'], 'Crni granit': ['#2A2A2C', '#1C1C1E'], Beton: ['#A9A59F', '#8E8A84'] }[wt] ?? ['url(#k-oakwt)', '#9C744A'];
  const app = APPS.find(a => a[0] === (L.applianceFinish ?? 'inox'))!;
  const wall = WALLS.find(w => w[0] === L.wall)?.[1] ?? WALLS[0][1];
  const handle = HANDLE_COLORS.find(h => h[0] === (p.opening?.color ?? 'black'))?.[2] ?? '#1E1E1E';
  return {
    real: true, wallA: wall, wallB: shade(wall, 0.95), floor: L.floor === 'Sive pločice' ? 'url(#k-tiles)' : 'url(#k-floor)',
    side: shade(f, 0.86), top: shade(f, 0.95), front: wood ? `url(#${wood})` : f, frontB: wood ? `url(#${wood})` : shade(f, 0.93), line: f === '#3A3C3F' ? '#151515' : '#4A4744',
    worktop: top[0], edge: top[1], edgeB: shade(top[1], 0.88), plinth: wood ? '#2E2D2B' : shade(f, 0.8), sink: app[0] === 'black' ? '#2A2A2C' : '#C9CED3', hob: '#18181A', handle,
    night: L.light === 'night', carcass: materialColor(p.materials[p.elements[0]?.materials.carcass ?? '']),
  };
}
/** Colours for the WebGL scene by its material groups (engine Mat3). */
export function glColors(pal: Palette): Record<string, string> {
  const flat = (c: string, fb: string) => (c.startsWith('url') ? fb : c);
  return { zid: pal.wallA, pod: flat(pal.floor, '#B98F64'), korpus: pal.top, sokla: pal.plinth, fronta: flat(pal.front, '#C99E6E'), aparat: pal.sink, rerna: pal.hob, radna: flat(pal.worktop, '#B98C5D') };
}

/** Fronts of all elements → the chosen palette material (added to the project with the old front's sheet size). */
export function withFront(p: Project, i: number): Project {
  const m = FRONTS[i][2], old = p.materials[p.elements[0]?.materials.front ?? ''];
  return {
    ...p, materials: { ...p.materials, [m.id]: { ...m, ...(old?.sheet && { sheet: old.sheet }) } },
    elements: p.elements.map(e => ({ ...e, materials: { ...e.materials, front: m.id } })),
  };
}
