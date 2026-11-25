// Types from docs/DATA_MODEL.md. All dimensions are integer mm.
export type Mm = number;
export type Unit = 'mm' | 'cm';

export interface Project {
  id: string; name: string; customer?: string; organizationId?: string;
  unit: Unit;
  presetId: 'en1116' | 'iso3055' | 'workshop' | 'none';
  room: Room;
  elements: Element[];
  rules: ConstructionRules;
  materials: Record<string, Material>;
  /** Plinth from board: one piece per run of units (default) or one under every unit (docs/KONSTRUKCIJA.md "Sokla"). */
  plinth?: 'run' | 'unit';
  opening?: OpeningSpec;              // handles for the whole project (docs/OTVARANJE.md); missing = plain 128 mm handle as before
  /** Realistic 3D look for the customer (docs/3D.md "Izgled za kupca"); fronts are the elements' front material. Names from the palettes. */
  look?: { worktop?: string; wall?: string; floor?: string; applianceFinish?: 'inox' | 'black' | 'white'; light?: 'day' | 'night' };
  /** What the user marked on the way (docs/TOK_PROJEKTA.md); everything else of the step status is computed from the data. */
  marks?: ProjectMarks;
  /** The customer guide's answers (apps/web CustomerStart), so "Prostor" reopens it filled in; opaque to the engine. */
  guide?: Record<string, unknown>;
}
export interface ProjectMarks {
  noInstallations?: boolean;      // Prostor: "nema instalacija"
  drawingsSeen?: ('front' | 'top')[]; drawingsReviewed?: boolean;   // Nacrti: views opened + "Pregledano"
  cutListChecked?: boolean; cutListSent?: boolean;                   // Krojna lista: opened without errors, sent / exported
  priced?: boolean; offerSent?: boolean; offerAccepted?: boolean;    // Ponuda
}

export interface Room { height: Mm; walls: Wall[]; openings: Opening[]; installations: Installation[]; obstacles?: Obstacle[] }
/**
 * Fixed block units must avoid. Either on a wall (`wallId` + `offset`, sticks out `depth` from the face)
 * or free in the room (`x`, `y` = top-left corner in plan coordinates). Rectangle in plan.
 */
export interface Obstacle {
  id: string;
  kind: 'chimney' | 'column' | 'duct' | 'radiator' | 'other';
  wallId?: string; offset?: Mm; side?: 1 | -1;
  x?: number; y?: number;
  width: Mm;       // along the wall (or x size when free)
  depth: Mm;       // out of the wall (or y size when free)
  elevation?: Mm;  // bottom from the floor, default 0
  height?: Mm;     // default: up to the ceiling
  label?: string;  // free name for 'other' (e.g. bojler)
}
export interface Point { x: number; y: number }
/**
 * `length` is the inner length. `a`/`b` = wall axis in plan coordinates (2D editor); derived for A/B/C rooms when missing.
 * `heightStart` / `heightEnd`: wall height at the inner start / end, for a sloped ceiling (attic); missing = room height.
 * `island`: not a wall but the base line of a kitchen island (thickness 0): units stand on it, nothing is drawn or built for it.
 */
export interface Wall { id: string; length: Mm; thickness: Mm; angleToPrev: number; a?: Point; b?: Point; heightStart?: Mm; heightEnd?: Mm; island?: boolean }
export interface Opening { id: string; wallId: string; kind: 'window' | 'door'; offset: Mm; width: Mm; height: Mm; sill: Mm; side?: 1 | -1; swing?: 'into-room' | 'out'; hinge?: 'L' | 'R' }
export interface Installation {
  id: string; wallId: string;
  kind: 'water' | 'drain' | 'power' | 'power400' | 'gas';
  offset: Mm; height: Mm; diameter?: Mm;
  side?: 1 | -1;
}

export type ElementKind = 'base' | 'sink' | 'drawer' | 'oven' | 'corner-blind' | 'appliance-front' | 'filler' | 'wall' | 'tall';

export interface Element {
  id: string; label: string; kind: ElementKind;
  /** When the user confirmed this element's construction (step Elementi); cleared when the element changes. */
  confirmedAt?: string;
  wallId: string; offset: Mm;
  width: Mm; height: Mm; depth: Mm;
  legs?: Mm;
  elevation?: Mm;
  shelves?: number;
  doors?: 0 | 1 | 2;
  drawerFronts?: Mm[];
  blindWidth?: Mm;
  /** The user's own name, shown after the label and kind ("D2 · Sudopera · Kod prozora"). */
  name?: string;
  note?: string;
  side?: 1 | -1;                      // wall side (2D editor); default = side facing the room
  hinge?: Hinge;                      // door opening seen from the front (docs/NACRTI_I_IZVOZ.md); default per kind, see hingeOf
  materials: { carcass: string; front: string; back?: string; drawerBottom?: string };
  overrides?: PartOverride[];
  catalogKey?: string;                // fixtures/katalog.json item it came from
  /** A hob on the worktop over this unit when the oven is not under it (oven in a tall unit, or no oven): cut-out, 3D hob. */
  hob?: boolean;
  /** Front rows top → bottom (docs/KATALOG.md). When set it replaces doors / drawerFronts for the fronts. */
  front?: FrontRow[];
  interior?: { shelves: number; innerDrawers: number };
  opening?: OpeningSpec;              // missing = Project.opening
}

export type OpeningKind = 'bar' | 'knob' | 'profile' | 'push';
export interface OpeningSpec { kind: OpeningKind; spacing?: 96 | 128 | 160 | 192 | 320; color?: 'inox' | 'black' | 'brass' | 'gold' | 'front'; profileHeight?: Mm }
export type FrontRowType = 'door' | 'door2' | 'drawer' | 'app' | 'glass' | 'open' | 'lift' | 'hood' | 'panel' | 'doorBlind';
/** `height` is the row's share of the carcass height; null rows split what is left. */
export interface FrontRow { type: FrontRowType; height: Mm | null; appliance?: string; blindWidth?: Mm; mechanism?: string }

/** Door hinge side seen from the front: left, right, two leaves, appliance front opening down, no doors. */
export type Hinge = 'L' | 'R' | 'LR' | 'down' | 'none';

export interface PartOverride { pos: string; length?: Mm; width?: Mm; qty?: number; note?: string }

export interface ConstructionRules {
  carcassThickness: Mm;
  backMode: 'nailed' | 'groove' | 'inset18';
  backReduction: Mm;
  frontGap: Mm;
  bottomMode: 'between' | 'under';
  joint: 'dowel+confirmat' | 'minifix' | 'confirmat' | 'screw'; // screw = holšraf (holes.ts)
  carcassEdge: EdgeSpec;
  frontEdge: EdgeSpec;
  deductEdgeFromCutMinThickness: Mm;
  wasteFactor: number;
  sheetRounding?: 'sheet' | 'half' | 'm2'; // sheets to buy: whole (default), halves, or exact (price per m²)
  edgeExtra: number;
  followGrain: boolean;                 // grain materials: length = grain direction; otherwise length = longer side
  backCutout: { margin: Mm; round: Mm; minWidth: Mm; minHeight: Mm; edgeClearance: Mm };
  staplePitch: Mm;                      // nailed back: floor(perimeter / pitch) staples
  drawerSlide?: string;                 // slide id from SLIDES (engine/slides.ts); default GTV Modern slide 3D
  screw?: Partial<ScrewSpec>;           // holšraf; default 4 × 50, head Ø 18 sunk (holes.ts DEFAULT_SCREW)
  drawerDepthReserve?: Mm;              // carcass depth left behind the slide; default 60 (560 → 500)
}

/** Holšraf joint: screw Ø d × length, head Ø (countersink), through hole Ø, pilot Ø, first hole from the edge, max pitch. */
export interface ScrewSpec { d: Mm; length: Mm; head: Mm; through: Mm; pilot: Mm; edge: Mm; pitch: Mm }

export interface EdgeSpec { material: string; thickness: number }
export interface Material { id: string; name: string; thickness: Mm; kind: 'chipboard' | 'mdf' | 'hdf' | 'worktop'; sheet?: { l: Mm; w: Mm }; grain: boolean }

export interface Part {
  elementId: string; pos: string;
  name: string; materialId: string;
  qty: number; length: Mm; width: Mm;
  edges: { L1: number; L2: number; W1: number; W2: number };
  cutLength: Mm; cutWidth: Mm;
  note?: string;
}

export interface HardwareLine { sku: string; name: string; qty: number; unit: 'kom' | 'kpl' | 'par' | 'm'; elementIds: string[] }
