// Drawer slide catalog + drawer box rule (docs/KONSTRUKCIJA.md "Fioke i klizači").
// Neither EN 1116:2018 nor ISO 3055:2021 sizes drawers (they coordinate unit / worktop sizes only); the box always follows the
// chosen slide's data sheet. `verified: false` = deductions taken from the slide family (Blum TANDEM rule copied by GTV / KV /
// Hettich for undermount, 12.5 mm per side for H45 ball-bearing), to be checked against the maker's sheet.
import type { Mm } from './types';

export interface Slide {
  id: string; name: string; brand: string;
  kind: 'undermount' | 'ball' | 'roller';
  lengths: Mm[];          // nominal lengths NL
  widthDeduct: Mm;        // outer box width = inner carcass width (LW) − widthDeduct
  lengthDeduct: Mm;       // box length = NL − lengthDeduct
  bottomRecess: Mm;       // drawer bottom raised from the lower edge of the box sides
  sideMax: Mm;            // thickest box side the slide takes
  softClose: boolean;
  push?: string;          // push-to-open variant (docs/OTVARANJE.md)
  loadKg: number;
  source: string;
  verified: boolean;
}

const undermount = { kind: 'undermount', widthDeduct: 10, lengthDeduct: 10, bottomRecess: 13 } as const;
const ball = { kind: 'ball', widthDeduct: 25, lengthDeduct: 0, bottomRecess: 0, sideMax: 19 } as const;
const L = (from: Mm, to: Mm) => Array.from({ length: (to - from) / 50 + 1 }, (_, i) => from + 50 * i);

export const SLIDES: Slide[] = [
  // Default (user 2026-11-25, after Riex: "možda ipak ovaj"). Pinoles 3404170, cat. no. PK-0H45500XP: telescopic, full extension,
  // 30 kg, 755 RSD / pair; soft close and fitting sizes not on the page → H45 family rule 12.5 per side (−25), box = NL.
  // shortcut: only 500 is confirmed; the other lengths follow the GTV H45 range.
  { id: 'gtv-h45', name: 'Teleskopski klizač H45', brand: 'GTV', ...ball, lengths: L(250, 600), softClose: false, push: 'gtv-h45-p2o', loadKg: 30,
    source: 'https://www.pinoles.com/proizvod/gtv-klizac-teleskopski-l-500mm/', verified: false },
  // First default of 2026-11-25 (user: "najčešće se koristi"), then GTV H45 above. H45 ball-bearing, soft close (spring + oil damper), full extension, 20–35 kg by
  // length. Hranipex pages give no fitting sizes (the 2D drawing PDF could not be read here): H45 standard 12.7 per side → 26 in whole
  // mm (13 per side; 25 would leave 12.5 < 12.7 and bind). No own push variant found → GTV H45 push to open.
  { id: 'riex-nb58', name: 'Teleskopski klizač NB58 slowmotion', brand: 'Riex', kind: 'ball', widthDeduct: 26, lengthDeduct: 0, bottomRecess: 0, sideMax: 19,
    lengths: L(300, 600), softClose: true, push: 'gtv-h45-p2o', loadKg: 35,
    source: 'https://hranipex.com/en/product/riex-nb58-ball-bearing-slide-full-extension-soft-close-35-kg-30-kg-h45-550-mm-matt-black-fwf010344', verified: false },
  { id: 'gtv-modern-slide-3d', name: 'Skriveni klizač Modern slide 3D sa usporivačem', brand: 'GTV', ...undermount, lengths: L(300, 500), sideMax: 19,
    softClose: true, push: 'gtv-modern-slide-p2o', loadKg: 30, source: 'https://www.okov.rs/sr/proizvodi/podgradni-klizac-modern-slide-3d-16-19mm-500mm-gtv', verified: false },
  { id: 'gtv-modern-slide-p2o', name: 'Skriveni klizač Modern slide Pro 3D P2O (na pritisak)', brand: 'GTV', ...undermount, lengths: L(350, 500), sideMax: 19,
    softClose: false, loadKg: 30, source: 'https://www.okov.rs/sr/proizvodi/podgradni-klizac-modern-slide-pro-3d-p2o-16-19mm-500mm-gtv', verified: false },
  { id: 'blum-tandem-plus', name: 'Skriveni klizač TANDEM plus BLUMOTION', brand: 'Blum', ...undermount, lengths: L(250, 600), sideMax: 16,
    softClose: true, loadKg: 30, source: 'https://popularwoodworking.com/editors-blog/sizing-parts-for-drawers-on-blum-tandem-slides', verified: true },
  { id: 'gtv-versalite-h45', name: 'Kuglični klizač Versalite H45 sa usporivačem', brand: 'GTV', ...ball, lengths: L(250, 600),
    softClose: true, push: 'gtv-h45-p2o', loadKg: 30, source: 'https://www.okov.rs/sr/proizvodi/telesk-klizac-fioke-versalite-45x350mm-sa-usporivacem-gtv', verified: false },
  { id: 'gtv-h45-p2o', name: 'Kuglični klizač H45 push to open', brand: 'GTV', ...ball, lengths: L(300, 500),
    softClose: false, loadKg: 30, source: 'https://www.okov.rs/sr/okovi/okovi-za-namestaj/klizaci', verified: false },
  { id: 'gtv-prestige-h45', name: 'Kuglični klizač Prestige H45', brand: 'GTV', ...ball, lengths: L(250, 600),
    softClose: false, loadKg: 35, source: 'https://www.okov.rs/sr/proizvodi/telesk-klizac-fioke-prestige-45x500mm-gtv', verified: false },
];

export const DEFAULT_SLIDE = 'gtv-h45';
/** Workshop practice (user 2026-11-25): about 60 mm of the carcass depth stays behind the slide (back, pipes, damper) → 560 takes 500. */
export const DEFAULT_DRAWER_DEPTH_RESERVE = 60;

export const slideOf = (id: string | undefined, push = false): Slide => {
  const s = SLIDES.find(x => x.id === id) ?? SLIDES.find(x => x.id === DEFAULT_SLIDE)!;
  return (push && s.push && SLIDES.find(x => x.id === s.push)) || s;
};

/** Longest nominal length that fits depth − reserve; the shortest one if none fits (flagged by `fits`). */
export function slideLength(s: Slide, depth: Mm, reserve: Mm): { nl: Mm; fits: boolean } {
  const ok = s.lengths.filter(l => l <= depth - reserve);
  return ok.length ? { nl: Math.max(...ok), fits: true } : { nl: Math.min(...s.lengths), fits: false };
}

/** Box side height from the drawer front height: 50 mm lower, down to 10 mm, at least 70 (undermount needs ~14 below + 7 above). */
export const boxHeight = (front: Mm): Mm => Math.max(70, Math.floor((front - 50) / 10) * 10);
/** Inner drawers (behind a door) have no front to follow. shortcut: fixed height, make it a field when inner drawers get a form. */
export const INNER_DRAWER_HEIGHT = 100;

export interface DrawerBox { nl: Mm; fits: boolean; outer: Mm; inner: Mm; length: Mm; height: Mm; panel: Mm; s: Mm; recess: Mm }

/**
 * Drawer box of 16 mm board: 2 sides (full length), front + back panel between the sides standing on the bottom,
 * bottom between the sides raised by the slide's bottom recess.
 */
export function drawerBox(s: Slide, innerWidth: Mm, depth: Mm, reserve: Mm, height: Mm, side: Mm): DrawerBox {
  const { nl, fits } = slideLength(s, depth, reserve);
  const outer = innerWidth - s.widthDeduct, inner = outer - 2 * side;
  return { nl, fits, outer, inner, length: nl - s.lengthDeduct, height, panel: height - s.bottomRecess - side, s: side, recess: s.bottomRecess };
}
