# Kroj — web aplikacija za stolare

Kroj je web aplikacija (u browseru) za stolarske radionice: crta se prostor (zidovi, otvori, instalacije), slažu se elementi od pločastog materijala (donji, gornji, visoki, ugaoni), prikaz je u 2D i 3D, a aplikacija iz istog modela izbacuje krojnu listu, kantovanje, okov/repro materijal, cenu i ponudu, i šalje narudžbinu pilani. Javna SaaS aplikacija sa pretplatom (radionice kao organizacije).

## ⚠ DIZAJN SE PRESLIKAVA TAČNO
**Izvor istine za izgled i ponašanje: `design/screens/`** — svaki ekran je radni HTML (otvori `design/screens/index.html`), uz snimak (`.png`) i izmeren raspored (`.layout.json`). Pre bilo kakvog UI rada pročitaj **`design/DESIGN_SPEC.md`** i **`docs/UI_KOMPONENTE.md`**; ulazni CSS je **`design/kroj-theme.css`** (iste vrednosti kao `design/tokens.css`). Markup iz `<script id="dc-template">` i logika iz `<script id="dc-logic">` u svakom ekranu prenose se 1:1 u React. Ne menjaj raspored, boje, veličine, tekstove ni redosled kontrola; UI stack je **Tailwind CSS v4 + shadcn/ui (Radix)** isključivo sa našom temom — bez podrazumevanih shadcn paleta, generatora tema, MUI i sličnih biblioteka koje menjaju izgled. Svaki ekran se proverava Playwright snimkom protiv reference (DESIGN_SPEC §8) pre nego što se pređe na sledeći. **Izmena 2026-11-23 (`docs/SHADCN_EVERYWHERE.md`): kontrole su stock shadcn/ui (new-york, v4) svuda u aplikaciji osim sajta — veličine i ponašanje dolaze od shadcn-a, iz naše teme samo boje/radijus/font; reference ostaju izvor istine za raspored, sadržaj i tekstove. Nema sirovih `<button>/<input>/<select>`.** **Svi ekrani su na Tailwind + shadcn (2026-11-20):** jedini CSS je `apps/web/src/index.css` (preflight uključen; u `@layer base` su vraćeni podrazumevani detalji browsera na kojima su reference nacrtane — `line-height: normal`, podebljani naslovi, podvučeni linkovi, ćelije tabela). Nema `styles.css`; novi UI samo Tailwind klase + `@/components/ui/*`.

## Session continuity (MANDATORY)
Work continues from any computer; the only source of state is this git repo (GitHub `origin`).
- **At session start** (e.g. the user says "nastavi gde smo stali" / "continue where we left off"): `git pull`, read `docs/PROGRESS.md`, continue from "Next step".
- **After every finished step**: update `docs/PROGRESS.md` (state, done, decisions, next step, open questions), then commit + push. Never end a session with a stale PROGRESS.md.
- Decisions that change the spec go into PROGRESS.md under "Decisions" (date + reason).

## Writing language
- Code, comments, commit messages, notes and docs written from now on: **English**.
- UI text stays Serbian (Latin), per "Jezik" below. The original spec docs in `docs/` stay as they are.

Pročitaj pre rada:
- `docs/SPEC.md` — proizvod, ekrani, uloge, faze (MVP prvo)
- `docs/SITE_AND_FLOW.md` — NEW DIRECTION (2026-11-20, waits for the user's "kreni"): site first, one role-based planner, public-by-default kitchens (private paid), redo all screens with Tailwind + shadcn
- `docs/MARKETPLACE.md` — business direction (2026-11-20, being worked out): customers and workshops on one platform, roles, request → offer flow, open questions
- `docs/KONSTRUKCIJA.md` — pravila konstrukcije, formule delova, kant, okov (SRCE aplikacije)
- `docs/DATA_MODEL.md` — tipovi i tabele
- `docs/STANDARDI.md` — podrazumevane mere (EN 1116 / ISO 3055 / radionica / prazno)
- `docs/UI_PRAVILA.md` — radni ekrani bez skrola strane (2D/3D uvek vidljivi), sistem pomoći (oznake i, kartica na planu, legenda)
- `docs/NACRTI_I_IZVOZ.md` — tehnički nacrti (spreda, odozgo, radne ploče), izvoz DXF/PDF/GLB/OBJ, uvoz podloge; primeri u `fixtures/export/`
- `docs/EDITOR_2D.md` — 2D editor: crtanje zidova, prepreke, drag & drop elemenata
- `docs/BRZI_START.md` — Brzi start: auto-raspored kuhinje i prečice
- `docs/AI.md` — AI asistent: MCP konektor za Claude, AI u aplikaciji, predefinisani zadaci, predlozi na proveru
- `docs/KATALOG.md`, `docs/OTVARANJE.md`, `docs/3D.md` — katalog i prilagođeni element, ručke, 3D (tehnički/realni, aparati)
- `fixtures/katalog.json`, `fixtures/otvaranje.json`, `fixtures/aparati.json`, `fixtures/konfigurator-primer.json` — podaci i očekivani rezultati za testove
- `fixtures/kuhinja-petrovic.json` — jedini zajednički primer projekta (svi ekrani) + OČEKIVANI izlaz engine-a (test)
- `CHANGES.md` — šta se promenilo u ovom exportu
- `docs/TOK_PROJEKTA.md` — koraci projekta, procenat, ekran Projekti i „nastavi gde si stao“
- `design/DESIGN_SPEC.md`, `design/tokens.css`, `design/screens/` — tačan dizajn: radni referentni ekrani, snimci, izmereni raspored, tokeni
- `docs/UI_KOMPONENTE.md` + `design/kroj-theme.css` — Tailwind v4 + shadcn/ui u Kroj stilu (obavezno pre pisanja UI-ja)

## Jezik
- Ceo UI na srpskom (latinica). Kod, imena fajlova, tipova i promenljivih na engleskom.
- Stručni termini u UI: stranica, pod, plafon, srednja stranica, vezni komad, poleđina, fah, krilo (vrata elementa; vrata prostorije ostaju „vrata“), fronta, sokla, kant, krojna lista, okov, repro materijal, pilana (radionički nazivi po izboru korisnika 2026-11-19; reference u `design/` i `docs/` još koriste bok/dno/vrh/pregrada/polica/leđa).

## Stack (predlog — pitaj korisnika pre zamene)
- Monorepo (pnpm workspaces):
  - `packages/engine` — čist TypeScript, BEZ zavisnosti od UI-a: model projekta → delovi, kant, okov, obračun, poređenje dobavljača, optimizacija krojenja. Sve se testira Vitest-om.
  - `apps/web` — Vite + React + TypeScript, Tailwind CSS v4 + shadcn/ui (Radix, `lucide-react` ikone), React Router, Zustand za stanje projekta, React Three Fiber (+ drei) za 3D, SVG za 2D tlocrt i poglede na zid.
  - Backend: `apps/api` — Node + Express 5 + MongoDB (Mongoose), TypeScript (tsx). Auth preuzet iz korisnikovog `arbyte-api` (JWT access/refresh, potvrda e-pošte, reset lozinke, Google). Izolacija radionica u kodu: svaki upit ide kroz proveru članstva (`apps/api/src/workshops.ts`), test radionica A ↔ B. (Odluka 2026-11-20, umesto Supabase.)
- Izvoz: CSV (za pilane), XLSX (SheetJS), PDF (pdf-lib ili @react-pdf/renderer).
- Pretplate: provajder se bira kasnije (Stripe ne prima firme registrovane u Srbiji — razmotriti Paddle / Lemon Squeezy). Apstrahovati iza `billing` modula.

## Nepromenljiva pravila
1. **Jedan izvor istine.** 2D, 3D, krojna lista, okov i cena se UVEK izvode iz istog modela (`Project` → `engine`). Nikad ne čuvaj izračunate delove kao ručno uređivane podatke (izuzetak: ručni „override" deo sa jasnom oznakom).
2. **Sve mere interno su celobrojni milimetri** (`number`, integer). Jedinica (mm/cm) je samo prikaz i unos; konverzija na ivici UI-a. Cene interno u para/centima (integer).
3. Engine je deterministički i čist (bez `Date.now`, bez random) — isti ulaz, isti izlaz.
4. `fixtures/kuhinja-petrovic.json` je **jedini zajednički primer**: iste podatke prikazuju svi referentni ekrani i on mora da prolazi (delovi, mere, kant, okov, izrezi, pribor = `expected`). Fixture se ne menja ručno: pravila su u `tools/make_fixture.py` + `docs/KONSTRUKCIJA.md`; promena pravila = izmena oba + `python3 tools/make_fixture.py fixtures/kuhinja-petrovic.json`.
5. Podrazumevane mere dolaze iz izabranog preseta (`docs/STANDARDI.md`); preset „prazno" ostavlja polja prazna i element nije validan dok se ne popune.
6. Upozorenja po standardu nikad ne blokiraju unos.

## Komande (kada se postavi projekat)
- `pnpm i`
- `pnpm -F engine test`
- `pnpm -F web dev`
- `pnpm test:all` — svi testovi (engine + funkcionalni e2e + vizuelni), ~40 s; opis u `docs/TESTS.md`. Nova funkcija ili popravka dobija test u istom koraku.
- `pnpm -F web test:e2e` — funkcionalni testovi u browseru (`apps/web/e2e/`)
- `pnpm -F web test:visual` — Playwright poređenje sa `design/screens/*.png` (sa `design/screens/fonts-test.css`, Google Fonts blokirani — DESIGN_SPEC §1 i §8)
- Reference: otvori `design/screens/index.html`; posle izmene dizajna: `python3 tools/export_screens.py <dir sa .dc.html> design/screens`, pa `python3 tools/screenshot_screens.py design/screens` i `python3 tools/inspect_screens.py design/screens`

## Redosled rada (MVP)
0. **UI ljuska po referenci**: `tokens.css`, zajedničke komponente (AppHeader, SegmentedControl, Button, TextField, Card, Table, Tip, StatTile) i rute za sve ekrane iz `design/screens/screens.json`, popunjene primerom „Kuhinja Petrović". Svaki ekran mora proći vizuelnu proveru protiv `design/screens/<Ekran>.png`.
1. `packages/engine`: tipovi + generator delova za donji/gornji/visoki element + kant + okov → test sa fixture-om.
2. Brzi start: `autoLayout` u engine-u (`docs/BRZI_START.md`) + ekran Brzi start. To je glavni način pravljenja projekta, jer najviše skraćuje korake.
3. Krojna lista (po elementu i zbirno, grupisano po materijalu, mm/cm) + CSV/XLSX izvoz.
4. Editor elementa (forma + crtež spreda) i podrazumevane mere.
5. 2D editor (`docs/EDITOR_2D.md`): crtanje zidova, prepreke i instalacije, drag & drop elemenata sa lepljenjem, pomeranje, provere; zatim pogled na zid.
6. 3D prikaz (R3F) iz istog modela + tehnički nacrti i izvoz (`docs/NACRTI_I_IZVOZ.md`; `tools/export_samples.py` pokazuje DXF R12 i GLB pisanje).
7. Cenovnik + obračun + PDF ponuda.
8. Nalog/organizacija/uloge, pretplata, poređenje pilana.
9. AI (opciono, `docs/AI.md`): Proposal + applyProposal u engine-u → remote MCP server (Kroj u Claude-u) → AI u Kroju (krediti / sopstveni API ključ). AI nikad ne menja projekat direktno; sve radi i bez AI-ja.
