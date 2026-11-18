# Kroj — dizajn specifikacija za tačno preslikavanje

> **Izvor istine za izgled i ponašanje su referentni ekrani u `design/screens/`.** Svaki je samostalan HTML. Otvori `design/screens/index.html` u browseru (dupli klik) i isprobaj ga: dugmad, prevlačenje, unos, tabovi i pomoć rade kao na platnu za dizajn. Aplikacija mora izgledati i ponašati se **isto**. Ne izmišljaj drugačiji raspored, boje, veličine ni tekstove.

## 1. Šta je u paketu
| Fajl | Namena |
|---|---|
| `design/screens/<Ekran>.html` | radni referentni ekran (otvara se direktno, bez servera) |
| `design/screens/<Ekran>.png` | snimak ekrana pri stvarnoj veličini (1440 × visina ekrana) |
| `design/screens/<Ekran>.layout.json` | izmereni raspored: svaki region i kontrola sa `x, y, w, h`, padding, gap, boja, font, ivica, radijus, overflow |
| `design/screens/tokens-usage.json` | sve boje, veličine fonta, težine, radijusi, ivice i senke koje ekrani stvarno koriste, sa brojem pojavljivanja |
| `design/tokens.css` | dizajn tokeni kao CSS promenljive — koristi samo njih |
| `design/screens/dc-lite.js` | mali runtime koji pokreće reference (NIJE za aplikaciju) |
| `design/*.dc.html` | izvorni fajlovi sa platna (isti sadržaj kao `screens/`, ali traže runtime alata za dizajn) |

Napomena za PNG snimke: napravljeni su bez interneta, pa je umesto IBM Plex fontova korišćen zamenski font. Pozicije i veličine blokova su tačne, a širina teksta može malo da se razlikuje. Za brojeve uvek gledaj `.layout.json`.

## 2. Kako preneti ekran u React (obavezan postupak)
1. Otvori `design/screens/<Ekran>.html` i odgovarajući `.png`.
2. U izvoru tog fajla nađi `<script id="dc-template">`: to je **markup ekrana 1:1**. Prenesi ga u JSX bez menjanja strukture, redosleda, teksta i inline stilova:
   - `{{ime}}` → `{ime}`; `{{a.b}}` → `{a.b}`
   - `<sc-for list="{{lista}}" as="x">…</sc-for>` → `{lista.map((x, $index) => …)}`
   - `<sc-if value="{{uslov}}">…</sc-if>` → `{uslov && (…)}`
   - `style="a: b; c: d"` → isti stil (CSS modul / `style={{…}}` sa istim vrednostima). Dinamički stilovi koje vraća `renderVals()` (npr. `planStyle`, `eb.style`) prenose se kao funkcije koje vraćaju iste vrednosti.
   - `class="k-tip …"` → komponenta `<Tip>` (pravila u §5).
   - Događaji su već u React obliku (`onClick`, `onPointerDown`, `onChange`, `onDragStart`, …).
3. U `<script id="dc-logic">` je **logika ekrana** (`class Component`, `renderVals()`). Prenesi je u hook/store (Zustand) sa istim imenima stanja i istim izračunima. Za 2D editor (`Main.html`) to je referentna implementacija geometrije, lepljenja, kolizija, zuma i crtanja zidova: prenesi je u `packages/engine` + `apps/web` bez pojednostavljivanja.
4. Pokreni Playwright i uporedi svoj ekran sa `.png` pri istom viewport-u (§8). Ne prelazi na sledeći ekran dok se raspored ne poklapa.

## 3. Globalna pravila izgleda
- Fontovi: **IBM Plex Sans** za sav tekst, **IBM Plex Mono** za sve mere, brojeve, cene, kote i oznake elemenata (D1, G2, V1). Učitaj oba (vidi `tokens.css`).
- Jezik UI: srpski latinica, tačno kao u referenci (uključujući „ “ i — crte).
- Pozadina aplikacije `--c-ground`; paneli i kartice `--c-surface` sa ivicom `1px solid --c-line`.
- Bez senki osim navedenih u tokenima; bez gradijenata; bez emoji ikonica (ikone su tanke stroke SVG, 16 px, `currentColor`).
- Minimalna visina kontrola 36–44 px (pogledaj konkretnu kontrolu u `.layout.json`).
- Dve vrste ekrana (detalji u `docs/UI_PRAVILA.md`):
  - **radni ekrani** (Brzi start, AI iz slike, Prostor/2D, Pogled na zid, 3D, Element, Nacrti): `height: 100vh; overflow: hidden`; strana se NIKAD ne skroluje; skroluju samo bočni paneli;
  - **dokumenti i sajt** (Krojna lista, Obračun, Poređenje, admin, sajt, prijava): normalan skrol strane.

## 4. Raspored radnih ekrana (izmereno pri 1440 px)
| Ekran | Zaglavlje | Traka ispod zaglavlja | Telo |
|---|---|---|---|
| Prostor (`Main`) | 56 px | traka alata 63 px (padding 10px 16px) | biblioteka **240** (padding 14px 12px, skrol) · centar fleksibilan (traka uputstva 40 + plan + statusna traka ~33) · svojstva **300** (padding 18px, skrol) |
| Nacrti | 56 | tabovi + stil + prekidači + izvoz, 113 (prelama se u 2 reda) | crtež fleksibilan (padding 16px 20px, skrol samo kad mora) · desni panel **320** |
| Pogled na zid (`Zid`) | 56 | — | crtež fleksibilan · panel instalacija **400** (padding 20px) |
| 3D (`Pogled3D`) | 56 | — | scena fleksibilna (pozadina #E9E6DF) · panel **320** |
| Element | 56 | traka elemenata 65 (padding 12px 24px) | dve kolone **55% / 45%**, svaka sa svojim skrolom, padding 20px 24px |
| Brzi start | 56 | — | forma levo **440** (padding 24px, skrol) · rezultat desno fleksibilan |
| AI iz slike | 56 | — | sadržaj fleksibilan (padding 20px) · predlog **420** (padding 20px) |

Plan u 2D editoru: kvadrat 4:3 koji staje u slobodan prostor (`container-type: size`; širina `min(100cqw, 100cqh × 4/3)`), pozadina `--c-plan`, ivica `1px --c-line`, radijus 8, mreža 500 mm (`--c-grid`). Kontrole zuma: dole desno, 8 px od ivice, bela kartica sa `--shadow-float`.

Ispod 900 px: paneli idu vertikalno (biblioteka gore max 150 px, svojstva dole max 38–42 vh), plan/crtež u sredini.

## 5. Komponente (tačne vrednosti)
**AppHeader** — visina 56; `background --c-ink`; padding `10px 20px`; gap 16. Logo: SVG 28 px (kvadrat sa dve linije, druga `--c-accent-on-dark`) + „Kroj" 18/700. Projekat: 14 `--c-on-dark-muted`, ime 600 belo. Navigacija desno (`margin-left: auto`): linkovi `padding 8px 14px`, radijus 6, 14 px; aktivni `background --c-ground; color --c-ink; 600`. Jedinice mm/cm: grupa sa ivicom `1px --c-muted`, radijus 6; aktivno `--c-accent-on-dark` + tamni tekst 600. Dugme **Pomoć**: 13 px, visina 36, ikona „i" 16 px; uključeno `--c-accent-on-dark` puna boja + tamni tekst 600, isključeno providno + ivica `--c-muted`.

**SegmentedControl** (režim, tabovi nacrta) — kontejner `background --c-ground; padding 3px; radius 8; gap 4`. Stavka visina 36, padding `7px 12px`, 13 px, radijus 6; aktivna `--c-ink` + beo tekst 600; neaktivna providna. Stil nacrta: aktivna bela sa `box-shadow: 0 0 0 1px --c-ink`.

**Button** — visina 40 (traka) / 44 (paneli) / 48–52 (CTA); radijus 6; 13–15 px.
- primarno: `--c-accent` + beo tekst 600
- sekundarno: belo + `1px --c-line` + `--c-ink`
- tamno: `--c-ink` + belo
- naglašeno sekundarno („Novi prazan prostor"): belo + `1px --c-ink`
- opasno: belo + `1px --c-accent-ink` + `--c-accent-ink`
- isprekidano („+ Dodaj"): belo + `1px dashed --c-muted`

**Checkbox / radio** — 16–20 px, `accent-color: --c-accent`; uvek u `<label>` sa tekstom, min-visina 40.

**TextField (mere)** — `font: --font-mono`, 15–18 px, padding `9px 10px`, radijus 6, ivica `1px --c-line`; glavno polje izabrane stavke ima ivicu `--c-accent`. Labela iznad: 13 px `--c-muted`, gap 4. Vrednost se potvrđuje na Enter ili blur (vidi `Main.html` logiku `edit`/`commit`).

**Card / Panel** — belo, `1px --c-line`, radijus 10, padding 20; naslov 16–18/600. Tamna kartica (sažetak, cena): `--c-ink`, tekst `--c-on-dark`, sekundarni `--c-on-dark-muted-2`.

**StatTile** — `--c-ground`, radijus 8, padding 10; labela 12 `--c-muted`; vrednost mono 20/600.

**Table** — zaglavlje `--c-ground`, ćelije padding `9px 10px` (u nekim tabelama 10px), redovi `border-top: 1px --c-line-soft`; brojevi mono i desno poravnati; omotač `overflow-x: auto`.

**Library tile** (2D editor) — mreža 2 kolone, gap 6; pločica min-visina 68, radijus 8, `1px --c-line`, padding `8px 4px`, ikona u razmeri (širina = w/1000 × 44 px, visina = dubina/600 × 20 px, boje kao u planu), naziv 12 px centriran. Izabrana (dodir/klik): `2px --c-accent` + `--c-accent-soft`. `draggable`.

**Tip** (objašnjenje „i") — dugme 18×18, krug, `1px --c-muted-2`, belo, „i" 11/600 `--c-muted`; hover/fokus: `--c-ink` pozadina, beo tekst. Oblak: `--c-ink`, tekst `--c-on-dark` 12.5/1.45, padding `8px 10px`, radijus 6, max širina 240, `--shadow-pop`, 8 px ispod (varijante: iznad, poravnato levo/desno da ne izlazi iz panela). `aria-label` = ceo tekst. Sakriva se kad je Pomoć isključena (ključ `kroj.help`).

**Hover kartica na planu** — tamna (`--c-ink`), naslov 13/600, redovi 12 `--c-on-dark-muted`, padding `8px 10px`, radijus 6, 14 px od kursora, okreće se ka unutra kod desne/donje ivice plana.

**Upozorenje / uspeh** — upozorenje `--c-accent-soft` + `--c-accent-ink`, uspeh `--c-ok-soft` + `--c-ok`; 13 px, padding `8px 10px`, radijus 6.

**Oznake instalacija** — krug 22 px (u biblioteci i nacrtima 18–20), slovo mono 11/700: V `--c-water` beo, O `--c-drain` beo, S `--c-power` tamni tekst, G `--c-gas` beo; bela ivica 2 px (izabrano: akcenat), `--shadow-marker`.

**Elementi u planu** — donji `--c-el-base` + `1.2px --c-ink`; sudopera `--c-el-sink`; rerna `--c-el-oven` + beo tekst; visoki `--c-el-tall`; filer `--c-el-filler`; gornji `--c-el-upper` + `1.5px dashed --c-accent`, tekst `--c-accent-ink`; izabran `2.5px --c-accent` + `--c-accent-soft`; problem `2px --c-error` + `--c-error-soft`. Oznaka unutra: mono 11/600 „D2 · 800". Otvoreno krilo: linija 1.4 px pod 45° od strane šarki, dužine 60% širine krila.

## 6. Ekrani i redosled toka
`Brzi start` (ili `AI iz slike`, ili prazan projekat) → `Prostor` (2D) → `Nacrti` / `Zid` / `3D` → `Element` → `Krojna lista` → `Obračun` (ponuda) → `Poređenje pilana`. Admin: `Cenovnik`, `Standardi` (podrazumevane mere + pomoć), `AI asistent`. Javno: `Sajt`, `Prijava`. Navigacija u zaglavlju je ista na svim radnim ekranima.

## 7. Ponašanje koje mora da se poklopi
- 2D editor: sve u `docs/EDITOR_2D.md` + logika u `design/screens/Main.html` (crtanje zidova, lepljenje 50 mm, pravi uglovi, zatvaranje prostorije, drag & drop iz biblioteke, pomeranje, otvaranje vrata, provere, zum/pomeranje, poništi, mm/cm).
- Brzi start: algoritam u `docs/BRZI_START.md` i u `BrziStart.html`.
- Nacrti: tabovi, stilovi, prekidači slojeva; izvoz u `docs/NACRTI_I_IZVOZ.md`.
- Pomoć: `docs/UI_PRAVILA.md`.

## 8. Provera sličnosti (obavezna)
- Playwright test po ekranu: isti viewport kao u `design/screens/screens.json` (`w × min(h, 1000)`), isti podaci (primer „Kuhinja Petrović" iz `fixtures/`), `toHaveScreenshot` protiv `design/screens/<Ekran>.png` sa pragom `maxDiffPixelRatio: 0.03`. Za proveru rasporeda koristi `.layout.json`: glavni regioni (zaglavlje, trake, paneli, plan) moraju se poklopiti ±2 px.
- `tools/screenshot_screens.py` i `tools/inspect_screens.py` prave snimke i merenja; isto pokreni nad aplikacijom i uporedi.
