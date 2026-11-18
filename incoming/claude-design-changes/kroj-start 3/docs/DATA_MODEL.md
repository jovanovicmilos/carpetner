# Model podataka

## Engine tipovi (TypeScript, sve mere u mm, integer)

```ts
type Mm = number;
type Unit = 'mm' | 'cm';

interface Project {
  id: string; name: string; organizationId: string;
  unit: Unit;
  presetId: 'en1116' | 'iso3055' | 'workshop' | 'none';
  room: Room;
  elements: Element[];
  rules: ConstructionRules;
  materials: Record<string, Material>;   // ključ = materialId
}

interface Room { height: Mm; walls: Wall[]; openings: Opening[]; installations: Installation[] }
interface Wall { id: string; length: Mm; thickness: Mm; angleToPrev: number /* stepeni */ }
interface Opening { id: string; wallId: string; kind: 'window' | 'door'; offset: Mm; width: Mm; height: Mm; sill: Mm }
interface Installation {
  id: string; wallId: string;
  kind: 'water' | 'drain' | 'power' | 'power400' | 'gas';
  offset: Mm;      // od ugla (početka zida)
  height: Mm;      // od poda
  diameter?: Mm;
}

type ElementKind = 'base' | 'sink' | 'drawer' | 'oven' | 'corner-blind' | 'appliance-front' | 'filler' | 'wall' | 'tall';

interface Element {
  id: string; label: string; kind: ElementKind;
  wallId: string; offset: Mm;        // od ugla
  width: Mm; height: Mm; depth: Mm;  // korpus
  legs?: Mm;                          // nogice
  elevation?: Mm;                     // za gornje: donja ivica od poda
  shelves?: number;
  doors?: 0 | 1 | 2;
  drawerFronts?: Mm[];                // visine fronti fioka
  blindWidth?: Mm;                    // slepi ugao
  materials: { carcass: string; front: string; back?: string; drawerBottom?: string };
  overrides?: PartOverride[];         // ručne izmene, jasno označene
}

interface ConstructionRules {
  carcassThickness: Mm;               // 18
  backMode: 'nailed' | 'groove' | 'inset18';
  backReduction: Mm;                  // 4
  frontGap: Mm;                       // 3
  bottomMode: 'between' | 'under';
  joint: 'dowel+confirmat' | 'minifix' | 'confirmat';
  carcassEdge: EdgeSpec;              // ABS 0,8 front
  frontEdge: EdgeSpec;                // ABS 2 sve
  deductEdgeFromCutMinThickness: Mm;  // 1
  wasteFactor: number;                // 0.15
  edgeExtra: number;                  // 0.10
}

interface EdgeSpec { material: string; thickness: number }
interface Material { id: string; name: string; thickness: Mm; kind: 'chipboard' | 'mdf' | 'hdf' | 'worktop'; sheet?: { l: Mm; w: Mm }; grain: boolean }

interface Part {
  elementId: string; pos: string;     // npr. "D2-4"
  name: string; materialId: string;
  qty: number; length: Mm; width: Mm; // length = smer šare
  edges: { L1: number; L2: number; W1: number; W2: number }; // debljina kanta ili 0
  cutLength: Mm; cutWidth: Mm;
  note?: string;
}
interface HardwareLine { sku: string; name: string; qty: number; unit: 'kom' | 'kpl' | 'par' | 'm'; elementIds: string[] }
```

Engine API:
```ts
generateParts(project): Part[]
mergeParts(parts): MergedPart[]                 // isti materijal+mere+kant+napomena
edgeTotals(parts, rules): { edge: EdgeSpec; meters: number }[]
hardware(project): HardwareLine[]
sheetEstimate(parts, materials, rules): { materialId: string; areaM2: number; sheets: number }[]
quote(project, priceList): Quote
compareSuppliers(project, priceLists[]): Comparison
format(mm, unit): string                         // 720 → "720" | "72,0"
```

## Baza (Postgres / Supabase), RLS po `organization_id`
- `organizations` (id, name, plan, trial_ends_at, default_preset)
- `memberships` (user_id, organization_id, role: owner | designer)
- `projects` (id, organization_id, name, customer, data jsonb = `Project`, updated_at)
- `quotes` (id, project_id, frozen_prices jsonb, totals jsonb, pdf_path, created_at)
- `price_lists` (id, organization_id, supplier_id null = sopstveni, valid_from)
- `price_items` (price_list_id, category: sheet | edge | cutting | edging | hardware | labor, ref, unit, price_minor)
- `suppliers` (id, organization_id, name, email, phone, delivery_price_minor, lead_days)
- `materials`, `hardware_catalog` (global + organization)
- `workshop_presets` (organization_id, values jsonb)
- `subscriptions` (organization_id, provider, status, current_period_end)
