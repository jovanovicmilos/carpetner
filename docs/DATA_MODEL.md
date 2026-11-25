# Model podataka

Jedini zajednički primer je `fixtures/kuhinja-petrovic.json` (pravi ga `tools/make_fixture.py`). Svi ekrani u `design/screens/` prikazuju te podatke (vidi `design/screens/screens.json`, polje `data`).

## Konvencije
- Sve mere su celobrojni **milimetri**. Uglovi u stepenima. Cene u para/centima (integer).
- Koordinate plana: X desno, Y „u prostoriju" (nadole na ekranu). Unutrašnji ugao zidova A i B je (0, 0).
- **Zid** je duž njegove ose (`a` → `b`) sa debljinom. Zidovi jedne prostorije idu u krug, u smeru kazaljke na satu na ekranu (B → A → C → D), pa je unutrašnjost uvek sa leve strane hoda, tj. na strani normale `n = (−u.y, u.x)` → `side: +1`.
- **`offset`** elementa, otvora, prepreke i instalacije meri se **od unutrašnjeg lica zida na početku zida** (tačka `a`), duž zida. To je mera koju UI prikazuje kao „od početka zida". Interno, 2D editor računa po osi: `t = offset + (debljina susednog zida / 2)` ako je početak spojen sa drugim zidom.
- `height` instalacije je visina centra od poda; `height` prepreke je visina od poda do vrha (2600 = do plafona).

## Engine tipovi (TypeScript)

```ts
type Mm = number;
type Unit = 'mm' | 'cm';
type Side = 1 | -1;
type Hinge = 'L' | 'R' | 'LR' | 'down' | 'none';   // gledano spreda; 'down' = fronta aparata (MSP)

interface Project {
  id: string; name: string; customer?: string; organizationId?: string;
  unit: Unit;
  presetId: 'en1116' | 'iso3055' | 'workshop' | 'none';
  roomHeight: Mm;
  walls: Wall[];
  openings: Opening[];
  obstacles: Obstacle[];
  installations: Installation[];
  elements: Element[];
  rules: ConstructionRules;
  materials: Record<string, Material>;
}

interface Point { x: Mm; y: Mm }
interface Wall { id: string; name: string; a: Point; b: Point; thickness: Mm;
  heightStart?: Mm; heightEnd?: Mm }   // kosina (potkrovlje): visina zida na početku / kraju; nema = roomHeight (2026-11-20)

interface Opening {
  id: string; kind: 'window' | 'door'; wallId: string;
  offset: Mm; width: Mm; height: Mm; sill: Mm;          // vrata: sill = 0
  swing?: 'into-room' | 'out'; hinge?: 'L' | 'R';
}

type Obstacle =
  | { id: string; kind: 'radiator' | 'chimney'; wallId: string; offset: Mm; side: Side; width: Mm; depth: Mm; height: Mm }
  | { id: string; kind: 'column' | 'duct' | 'other'; x: Mm; y: Mm; width: Mm; depth: Mm; height: Mm; label?: string };

interface Installation {
  id: string; kind: 'water' | 'drain' | 'power' | 'power400' | 'gas';
  wallId: string; offset: Mm; height: Mm; side: Side; diameter?: Mm; note?: string;
}

type ElementKind = 'base' | 'sink' | 'drawer' | 'oven' | 'corner-blind' | 'appliance-front' | 'filler' | 'wall' | 'tall';

interface Element {
  id: string;                      // ujedno oznaka: D1…, F, V1…, G1… (UI: oznake se dodeljuju redom po vrsti)
  kind: ElementKind;
  wallId: string; offset: Mm; side: Side;
  width: Mm; height: Mm; depth: Mm; // korpus
  legs?: Mm;                       // donji/visoki: visina nogica = donja ivica korpusa od poda
  elevation?: Mm;                  // gornji: donja ivica od poda
  shelves?: number;
  doors?: 0 | 1 | 2; hinge?: Hinge;
  drawerFronts?: Mm[];             // visine fronti fioka odozgo
  blindWidth?: Mm;                 // slepi deo ugaonog
  note?: string;
  materials: { carcass: string; front: string; back?: string; drawerBottom?: string };  // drawerBottom = ploča sanduka fioke (stranice, prednja / zadnja, pod)
  templateId?: string;             // ako je napravljen iz šablona radionice
  name?: string;                   // sopstveni naziv korisnika (opciono); UI: „D2 · Sudopera · <naziv>“
  catalogKey?: string;             // stavka iz fixtures/katalog.json (npr. 'drawer600')
  front?: FrontRow[];              // redovi fronte odozgo nadole (izvor istine za fronte; drawerFronts/doors se izvode)
  interior?: { shelves: number; innerDrawers: number };
  opening?: OpeningSpec;           // prazno = Project.opening
  overrides?: PartOverride[];
}

type OpeningKind = 'bar' | 'knob' | 'profile' | 'push';          // 'gola' = v2
interface OpeningSpec { kind: OpeningKind; spacing?: 96 | 128 | 160 | 192 | 320; color?: 'inox' | 'black' | 'brass' | 'gold' | 'front'; profileHeight?: Mm /* 20 */ }
type FrontRowType = 'door' | 'door2' | 'drawer' | 'app' | 'glass' | 'open' | 'lift' | 'hood' | 'panel' | 'doorBlind';
interface FrontRow {
  type: FrontRowType;
  height: Mm | null;               // null = deli ostatak visine sa ostalim null redovima
  appliance?: string;              // id iz fixtures/aparati.json (app, hood, open niša)
  blindWidth?: Mm;                 // doorBlind: slepi deo ugaonog
  mechanism?: string;              // npr. 'izvlačni ugaoni'
}
// Project dobija: opening: OpeningSpec; look?: { wall: string; floor: string; applianceFinish: 'inox' | 'black' | 'white'; light: 'day' | 'night' }
// Material dobija: look?: MaterialLook
interface MaterialLook {
  color: string;                   // za tehnički prikaz i kad nema teksture
  texture?: string; repeat?: { w: Mm; h: Mm }; grain: 'length' | 'none';
  finish: 'matte' | 'satin' | 'gloss';                  // roughness 0,85 / 0,55 / 0,2
  license: 'none' | 'maker' | 'cc0' | 'own' | 'bought' | 'check'; source?: string; checkedAt?: string;
}
interface ApplianceModel { id: string; name: string; category: string; niche: string; finishes: string[]; glb: string; sizeKB: number; license: string; source: string; author?: string; status: 'ok' | 'dorada' }

interface ConstructionRules {
  carcassThickness: Mm;                                  // 18
  backMode: 'nailed' | 'groove' | 'inset18';
  backReduction: Mm;                                     // 4 (nabijena)
  frontGap: Mm;                                          // 3
  bottomMode: 'between' | 'under';
  joint: 'dowel+confirmat' | 'minifix' | 'confirmat';
  carcassEdge: EdgeSpec; frontEdge: EdgeSpec;
  deductEdgeFromCutMinThickness: Mm;                     // 1
  wasteFactor: number;                                   // 0.15
  edgeExtra: number;                                     // 0.10
  followGrain: boolean;
  backCutout: { margin: Mm; round: Mm; minWidth: Mm; minHeight: Mm; edgeClearance: Mm }; // 75 / 50 / 300 / 250 / 30
  staplePitch: Mm;                                       // 150
  drawerSlide?: string;                                  // klizač iz SLIDES (engine slides.ts); podrazumevano 'gtv-modern-slide-3d'
  drawerDepthReserve?: Mm;                               // dubina korpusa iza klizača; podrazumevano 60 (D 560 → klizač 500)
}

interface EdgeSpec { material: string; thickness: number }
interface Material { id: string; name: string; thickness: Mm; kind: 'chipboard' | 'mdf' | 'hdf' | 'worktop'; sheet?: { l: Mm; w: Mm }; grain: boolean }

interface Part {
  elementId: string; pos: string;          // "D2-4"
  name: string; materialId: string;
  qty: number; length: Mm; width: Mm;      // vidi KONSTRUKCIJA.md „Dužina i širina"
  edges: { L1: number; L2: number; W1: number; W2: number };
  cutLength: Mm; cutWidth: Mm;
  note?: string;                           // npr. "izrez 300×250 za V+O"
}
interface HardwareLine { sku: string; name: string; qty: number; unit: 'kom' | 'kpl' | 'par' | 'm'; elementIds: string[] }
```

**Naziv materijala** u UI je uvek `Material.name` iz kataloga, sa šifrom dekora (npr. „Iverica 18 bela W980"). Uz naziv se može dodati uloga („· korpus", „· fronte").

## Engine API
```ts
generateParts(project): Part[]
mergeParts(parts): MergedPart[]          // isti materijal + naziv + mere + kant + napomena
edgeTotals(parts, rules): { edge: EdgeSpec; meters: number; orderMeters: number }[]
hardware(project): HardwareLine[]
accessories(project): { plinthMeters; wallStripMeters; worktopConnectors; siliconeTubes }
backCutouts(project): Record<elementId, { w; h; cx; cy; names }>
sheetEstimate(parts, materials, rules): { materialId; areaM2; sheets }[]
autoLayout(input: QuickStartInput, preset): Project      // docs/BRZI_START.md
quote(project, priceList): Quote
compareSuppliers(project, priceLists[]): Comparison
format(mm, unit): string                                  // 720 → "720" | "72,0"
```

## Baza (Postgres / Supabase), RLS po `organization_id`
- `organizations` (id, name, plan, trial_ends_at, default_preset, help_default)
- `memberships` (user_id, organization_id, role: owner | designer)
- `projects` (id, organization_id, name, customer, data jsonb = `Project`, updated_at)
- `projects` dobija `resume jsonb` (`ProjectResume`), `progress jsonb` (`ProjectProgress`), `status` — vidi `docs/TOK_PROJEKTA.md`; elementi dobijaju `confirmed_at`
- `element_templates` (id, organization_id, name, group, data jsonb = deo `Element` bez položaja: catalogKey, front, interior, opening, materials; saves_materials, saves_rules)
- `catalog_visibility` (organization_id, catalog_key, visible) — Admin → Katalog elemenata
- `material_looks` (material_id, data jsonb = `MaterialLook`), `appliance_models` (platforma, `ApplianceModel`), `project_images` (project_id, kind 'offer', path, settings)
- `quotes` (id, project_id, frozen_prices jsonb, totals jsonb, pdf_path, created_at)
- `price_lists`, `price_items`, `suppliers`, `materials`, `hardware_catalog`, `workshop_presets`, `subscriptions` — kao ranije
