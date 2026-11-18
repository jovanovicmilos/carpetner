// Types from docs/DATA_MODEL.md. All dimensions are integer mm.
export type Mm = number;
export type Unit = 'mm' | 'cm';

export interface Project {
  id: string; name: string; organizationId?: string;
  unit: Unit;
  presetId: 'en1116' | 'iso3055' | 'workshop' | 'none';
  room: Room;
  elements: Element[];
  rules: ConstructionRules;
  materials: Record<string, Material>;
}

export interface Room { height: Mm; walls: Wall[]; openings: Opening[]; installations: Installation[]; obstacles?: Obstacle[] }
/** Fixed block on a wall that units must avoid (chimney, column, boxed pipe). Rectangle in plan. */
export interface Obstacle {
  id: string; wallId: string;
  kind: 'chimney' | 'column' | 'other';
  offset: Mm;      // from the wall start (corner)
  width: Mm;       // along the wall
  depth: Mm;       // how far it sticks out of the wall
  elevation?: Mm;  // bottom from the floor, default 0
  height?: Mm;     // default: up to the ceiling
}
export interface Wall { id: string; length: Mm; thickness: Mm; angleToPrev: number }
export interface Opening { id: string; wallId: string; kind: 'window' | 'door'; offset: Mm; width: Mm; height: Mm; sill: Mm }
export interface Installation {
  id: string; wallId: string;
  kind: 'water' | 'drain' | 'power' | 'power400' | 'gas';
  offset: Mm; height: Mm; diameter?: Mm;
}

export type ElementKind = 'base' | 'sink' | 'drawer' | 'oven' | 'corner-blind' | 'appliance-front' | 'filler' | 'wall' | 'tall';

export interface Element {
  id: string; label: string; kind: ElementKind;
  wallId: string; offset: Mm;
  width: Mm; height: Mm; depth: Mm;
  legs?: Mm;
  elevation?: Mm;
  shelves?: number;
  doors?: 0 | 1 | 2;
  drawerFronts?: Mm[];
  blindWidth?: Mm;
  note?: string;
  materials: { carcass: string; front: string; back?: string; drawerBottom?: string };
  overrides?: PartOverride[];
}

export interface PartOverride { pos: string; length?: Mm; width?: Mm; qty?: number; note?: string }

export interface ConstructionRules {
  carcassThickness: Mm;
  backMode: 'nailed' | 'groove' | 'inset18';
  backReduction: Mm;
  frontGap: Mm;
  bottomMode: 'between' | 'under';
  joint: 'dowel+confirmat' | 'minifix' | 'confirmat';
  carcassEdge: EdgeSpec;
  frontEdge: EdgeSpec;
  deductEdgeFromCutMinThickness: Mm;
  wasteFactor: number;
  edgeExtra: number;
}

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
