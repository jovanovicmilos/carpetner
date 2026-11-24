# Brief for Claude Code: real 3D renders and drawings for the site (2026-11-24)

**User:** "treba pravi 3D crtež i nacrti te kuhinje — traži od Claude Code-a da ti spremi iz aplikacije, čak i realan prikaz, ne samo tehnički."

The one-page site home (`design/Pocetna.dc.html`) currently draws the kitchen with toy SVG. Replace that with **real output of the app** for the shared example **`fixtures/kuhinja-petrovic.json` (Ugaona L 320 × 240)**. The site's example kitchen = this fixture from now on.

## What to produce
Put everything in **`design/assets/site/`** together with a `manifest.json` (file → parameters). Do it with a script that can be re-run (`tools/export_site_assets.ts`, Playwright against `pnpm -F web dev`, or a hidden dev route `/dev/site-assets?…` that renders one view per URL). Use the real engine, scene and drawing components. Do not redraw anything by hand.

### 1. 3D: realistic (main ask) and technical
- Same camera for all images: from the front-right, slightly above, both walls visible, like the current site sheet. Use a fixed FOV and fixed position (write them in the manifest). Use the `Realni` mode with materials, soft shadows and ambient occlusion if the scene has them. Background: transparent PNG. If the scene can't do transparent, use `#FAF8F4`.
- `3d-real-{front}-{top}.png`, 1600 × 1100, @2x if cheap:
  - fronts: `bela` (white matt), `hrast` (oak), `zelena` (dark green matt), `orah` (walnut);
  - tops: `hrast`, `beton`, `crna`;
  - 12 images. Map each name to the closest decor in our catalog and note the decor id in the manifest.
- `3d-teh.png`: the same camera in `Tehnički` mode (white with edges).
- `3d-hero.png`, 2400 × 1500: oak / oak, nicest light. It is the first image people see.
- Shapes for section 01, oak / oak, all real `autoLayout` results:
  - `3d-real-shape-prava-320.png`
  - `3d-real-shape-L-320x240.png` (the fixture)
  - `3d-real-shape-U-320x240x240.png`

### 2. Plan (section 01)
- `plan-{shape}.svg`: the 2D editor drawing for the same three shapes.
  - Read-only, with dimension chains, window, installations and dashed uppers.
  - No UI chrome. Viewbox tight around the drawing.

### 3. Nacrti (section 02): from `Drawings.tsx` / `WallView.tsx`
- `nacrt-zid-A.svg` and `nacrt-zid-B.svg`: front views with full dimension chains and heights.
- `nacrt-odozgo.svg`: top view.
- `nacrt-radne-ploce.svg`: worktop pieces with cut-outs and edge marks.
- `nacrt-list-A3.png`: the whole printable sheet as the PDF export renders it, 2480 px wide.

### 4. Elementi (section 04)
- `element-{w}-{content}.svg`: front view and section, for w ∈ 40, 50, 60, 80 and content ∈ `krilo`, `fioke`, `sudopera`. 12 files, from the element drawing on the Element screen.
- `element-60-{content}-3d.png`: **exploded 3D view** (parts pulled apart about 40 mm) of the 60 cm unit, realistic. 3 files. This is the "izgleda kao kutija, nije kutija" shot. If the scene has no exploded mode, add a small one (offset each part along its normal). It is useful in the app too.

### 5. Krojna lista (section 05)
- `parts-{w}-{content}.json`: the engine's parts for the 12 elements above (name, qty, L × W, edge per side, material).
- `parts-kitchen.json`: the whole fixture's cut list.
- `nesting-{n}.svg`: the board layout of the whole kitchen as the app's cutting optimizer gives it, plus the yield in the manifest. If there is no optimizer yet, skip this and say so.

### 6. Ponuda (section 06)
- `price-{front}-{top}-{who}.json`, who ∈ `stolar`, `sam`: line items (korpusi, fronte, radna ploča, kant i okov, izrada or sečenje, montaža) and the total. Use a **demo public price list**: add `fixtures/cenovnik-demo.json` if none exists. Mark it as demo.

## After
Commit the assets, the script and the manifest. In PROGRESS.md, write "SITE ASSETS READY" with anything you couldn't make. Then I (design) rebuild the site sheets with these images and SVGs. Sizes matter less than the camera and the look being consistent across all 3D images.

## Addendum 2026-11-24 16:00: night mode and custom elements
**User:** "na početnoj da postoji noćni režim pregleda 3D kuhinje, da se smenjuje, da se vidi dugme kao što je u app" + "sekcija da mogu custom da se rade elementi".

1. **Night renders.** Same camera, same names with `night`:
   - `3d-night-{front}-{top}.png` (12 images);
   - `3d-night-hero.png`.

   Use the app's night look (moon in the 3D canvas toolbar): dark room, under-cabinet LED strips on, worktop lit, window dark. The site now has the sun / moon toggle bottom-right on the hero and the 3D sheet. Until these exist, the reference fakes night with a CSS filter and a warm glow overlay (`.s-3dwrap[data-night]`, `.s-glow` in `design/Pocetna.dc.html`). Delete that once the real images are in.
2. **Po meri (new section 05)** = a small version of the Konfigurator on the site:
   - Controls: Vrsta (Donji / Gornji / Visoki), Širina 300–1200, Ručka (Šipka / Profil / Na pritisak), Police −/+, rows from top to bottom (Krilo / 2 krila / Fioka / Otvoreno / Staklo / Aparat, height ±20 mm or auto, remove), "+ Dodaj red".
   - Output: front drawing with dimensions, the "Konstrukcija je u redu" or warning line, parts table and okov list.

   The reference computes this with the formulas from `docs/KATALOG.md`. **On the live site use the engine + `CarcassDrawing` / the Konfigurator front drawing**. Nothing to export for it. Optional: `custom-{preset}-3d.png` realistic renders for 3 presets (fiokar 600, vitrina gornji 800 staklo, visoki 600 for the oven: krilo + aparat + fioka) if the site should show a 3D next to the drawing.
