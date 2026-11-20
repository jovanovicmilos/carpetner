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

| `design/screens/fonts-test.css` + `fonts/` | fontovi za snimke i vizuelne testove (lokalno) |
| `fixtures/kuhinja-petrovic.json` | **jedini zajednički primer** — podaci svih ekrana (vidi §9) |

**Fontovi u PNG snimcima i `.layout.json`:** **IBM Plex Mono je pravi** (lokalni fajlovi IBMPlexMono-Regular/Bold, OFL). **IBM Plex Sans nije bio dostupan van mreže**, pa je u snimcima zamenjen fontom **Inter 4** (Regular 400, Medium 500, SemiBold 600, Bold 700; lokalni .otf, OFL), učitanim pod imenom „IBM Plex Sans" kroz `design/screens/fonts-test.css`. Google Fonts su u snimanju blokirani. Zato u vizuelnim testovima aplikacije **ubaci isti `fonts-test.css`** i blokiraj `fonts.googleapis.com` (§8) — onda se poredi isto sa istim. U samoj aplikaciji fontovi se učitavaju sa Google Fonts (`tokens.css`).

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
| Prostor (`Main`) | 56 px | **nema** (alati plutaju nad planom) | biblioteka **240** (padding 14px 12px, skrol, može da se sakrije) · plan fleksibilan (padding 10) sa plutajućim slojevima: traka alata gore levo, ⋯ Projekat gore desno, traka uputstva gore u sredini (samo u režimu), panel mera **300** desno samo kad je nešto izabrano, Provera dole levo, zum dole desno, traka akcija iznad izabranog, meni na desni klik — tačne mere i sadržaj: `docs/EDITOR_2D.md` |
| Nacrti | 56 | tabovi + stil + prekidači + izvoz, 113 (prelama se u 2 reda) | crtež fleksibilan (padding 16px 20px, skrol samo kad mora) · desni panel **320** |
| Prilagođeni element (`Konfigurator`) | 56 | traka 62 (← Prostor, naslov, sažetak, akcije) | podešavanja **380** (skrol) · crtež spreda fleksibilan (`#FAF8F4`) · delovi i okov **360** (skrol) |
| 3D (`Pogled3D`) realni | 56 | toolbar: Tehnički/Realni, Dan/Veče, pogledi, Snimak PNG, **Slika za ponudu** | scena · panel **320** „Izgled za kupca“ |
| Pogled na zid (`Zid`) | 56 | — | crtež fleksibilan · panel instalacija **400** (padding 20px) |
| 3D (`Pogled3D`) | 56 | — | scena fleksibilna (pozadina #E9E6DF) · panel **320** |
| Element | 56 | traka elemenata 65 (padding 12px 24px) | dve kolone **55% / 45%**, svaka sa svojim skrolom, padding 20px 24px |
| Brzi start | 56 | — | forma levo **440** (padding 24px, skrol) · rezultat desno fleksibilan |
| AI iz slike | 56 | — | sadržaj fleksibilan (padding 20px) · predlog **420** (padding 20px) |

Plan u 2D editoru: kvadrat 4:3 koji staje u slobodan prostor (`container-type: size`; širina `min(100cqw, 100cqh × 4/3)`), pozadina `--c-plan`, ivica `1px --c-line`, radijus 8, mreža 500 mm (`--c-grid`). Kontrole zuma: dole desno, 8 px od ivice, bela kartica sa `--shadow-float`.

Ispod 900 px: paneli idu vertikalno (biblioteka gore max 150 px, svojstva dole max 38–42 vh), plan/crtež u sredini. U Prostoru panel mera pluta preko donje polovine plana.

Plutajući slojevi Prostora (z-index): mreža/plan 0 · natpis dole 20 · panel mera 28 · uputstvo 29 · traka alata, Projekat, Provera, zum 30 · legenda 31 · traka akcija 35 · meni 50 · tooltip ikonica 90. Ikonica-dugme `.k-ib`: 36×36, radijus 7, hover `#F3F1EC`, onemogućeno `#BDB6AA`, fokus 2px `#2E6B4E`. Stavka menija `.k-mi`: visina 36, padding 6px 10px, 13.5px, gap 10, hover `#F3F1EC`; opasna stavka `#A3261F`. Referentni snimci: `Main.png`, `Main_izabrano.png`, `Main_desni_klik.png`, `Main_provera.png`, `Main_prazan.png`.

## 5. Komponente (tačne vrednosti)
**AppHeader** — visina 56; `background --c-dark` (#1F2B24, tamno zelena — paleta 2026-11-20); hover na koraku/linku u zaglavlju: pozadina `--c-dark-hover` (#2A3A31) i **beo tekst** — globalno `a:hover { color: --accent-ink }` ne sme da važi u zaglavlju (tamnozeleno na tamnozelenom se ne vidi); padding `10px 20px`; gap 16. Logo: SVG 28 px (kvadrat sa dve linije, druga `--c-accent-on-dark`) + „Kroj" 18/700. Projekat: 14 `--c-on-dark-muted`, ime 600 belo. Navigacija desno (`margin-left: auto`): linkovi `padding 8px 14px`, radijus 6, 14 px; aktivni `background --c-ground; color --c-ink; 600`. Jedinice mm/cm: grupa sa ivicom `1px --c-muted`, radijus 6; aktivno `--c-accent-on-dark` + tamni tekst 600. Dugme **Pomoć**: 13 px, visina 36, ikona „i" 16 px; uključeno `--c-accent-on-dark` puna boja + tamni tekst 600, isključeno providno + ivica `--c-muted`.

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

**Upozorenje / uspeh** — upozorenje `--c-warn-soft` + `--c-warn-ink` (ostaje narandžasto; zelena nije upozorenje), uspeh `--c-ok-soft` + `--c-ok`; 13 px, padding `8px 10px`, radijus 6.

**Oznake instalacija** — krug 22 px (u biblioteci i nacrtima 18–20), slovo mono 11/700: V `--c-water` beo, O `--c-drain` beo, S `--c-power` tamni tekst, G `--c-gas` beo; bela ivica 2 px (izabrano: akcenat), `--shadow-marker`.

**Elementi u planu** — donji `--c-el-base` + `1.2px --c-ink`; sudopera `--c-el-sink`; rerna `--c-el-oven` + beo tekst; visoki `--c-el-tall`; filer `--c-el-filler`; gornji `--c-el-upper` + `1.5px dashed --c-accent`, tekst `--c-accent-ink`; izabran `2.5px --c-accent` + `--c-accent-soft`; problem `2px --c-error` + `--c-error-soft`. Oznaka unutra: mono 11/600 „D2 · 800". Otvoreno krilo: linija 1.4 px pod 45° od strane šarki, dužine 60% širine krila.

## 6. Ekrani, navigacija i tok
**Zaglavlje projekta je JEDNA komponenta (`ProjectHeader`), identična na svim ekranima projekta** (Main, Zid, Nacrti, Pogled3D, Element, Konfigurator, KrojnaLista, Poredjenje, Obracun). Koraci se **nikad ne pomeraju** pri prelasku sa ekrana na ekran:
- `display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)` — levo logo + projekat (ime se skraćuje sa „…“), **u sredini koraci** (`justify-content: center`), desno (`justify-self: end`) **mm/cm i Pomoć — uvek prisutni na svakom ekranu**.
- Jedinice su podešavanje projekta (`Project.unit`, u prototipu `localStorage kroj.unit`) i važe svuda; prekidač nikad ne nestaje.
- Koraci su **stepper sa statusom i procentom** (završen / u toku / nije započet), traka napretka na dnu zaglavlja i „59 % urađeno · sledeće: …“ ispod imena projekta — tačne mere i boje: `docs/TOK_PROJEKTA.md`. Svi koraci imaju istu debljinu fonta (500); trenutni se razlikuje samo pozadinom `#F3F1EC`, ne debljinom.
- Ispod 900 px koraci prelaze u drugi red, poravnati levo.
- Test: x-pozicija svakog koraka mora biti ista na svih 9 ekrana (u prototipu pri 1440 px: 405, 513, 614, 694, 811, 943).
- Logo „Kroj“ vodi na ekran **Projekti** (`design/Projekti.dc.html`).

**Navigacija projekta (zaglavlje), ista na svim ekranima projekta:** `1 Prostor | 2 Nacrti | 3 3D | 4 Elementi | 5 Krojna lista | 6 Ponuda` → `Main | Nacrti | Pogled3D | Element | KrojnaLista | Obracun`. Aktivni korak ima `aria-current="page"` i svetlu pozadinu.

| Ekran | Aktivni korak | Kako se dolazi |
|---|---|---|
| Main (Prostor) | 1 | korak 1; posle Brzog starta / AI-ja / praznog projekta |
| **Zid (Pogled na zid i instalacije)** | **1** (podekran Prostora) | **(a)** u Prostoru izaberi zid → panel svojstava → dugme „Pogled na zid i instalacije →"; **(b)** Nacrti, tab „Spreda (po zidu)" → dugme „Uredi instalacije ovog zida →". Na ekranu Zid levo od naslova je dugme „← Prostor". |
| Nacrti | 2 | korak 2 |
| Pogled3D | 3 | korak 3 |
| Element | 4 | korak 4; iz Prostora: element → „Konstrukcija i krojna lista" |
| **Konfigurator (Prilagođeni element)** | **4** | Prostor → biblioteka → „+ Prilagođeni element“ (i link u praznom stanju pretrage); „← Prostor“, „Dodaj u prostor“. `docs/KATALOG.md` |
| KrojnaLista | 5 | korak 5 |
| **Poređenje pilana** | **5** (podekran Krojne liste) | Krojna lista → „Uporedi cene pilana"; nazad „← Krojna lista" |
| Obracun (Ponuda) | 6 | korak 6 |
| BrziStart, AIPredlog | — | zaglavlje „Novi projekat" sa navigacijom načina početka: `Brzi start | Iz fotografije (AI) | Prazan projekat` |
| Admin (Cenovnik, Standardi, AIPodesavanja, **Biblioteka**) | — | leva tamna navigacija admina; „Materijali, ručke, aparati“ i „Katalog elemenata“ vode na `Biblioteka` (4 taba). `docs/3D.md`, `docs/OTVARANJE.md`, `docs/KATALOG.md` |
| **Projekti** | — | početni ekran posle prijave; logo u zaglavlju; „Nastavi gde si stao“. `docs/TOK_PROJEKTA.md` |
| Sajt, Prijava | — | javni deo |

## 7. Ponašanje koje mora da se poklopi
- 2D editor: sve u `docs/EDITOR_2D.md` + logika u `design/screens/Main.html` (crtanje zidova, lepljenje 50 mm, pravi uglovi, zatvaranje prostorije, drag & drop iz biblioteke, pomeranje, otvaranje vrata, provere, zum/pomeranje, poništi, mm/cm).
- Brzi start: algoritam u `docs/BRZI_START.md` i u `BrziStart.html`.
- Nacrti: tabovi, stilovi, prekidači slojeva; izvoz u `docs/NACRTI_I_IZVOZ.md`.
- Pomoć: `docs/UI_PRAVILA.md`.

## 8. Provera sličnosti (obavezna)
- Playwright test po ekranu: isti viewport kao u `design/screens/screens.json` (`w × min(h, 1000)`), isti podaci (`fixtures/kuhinja-petrovic.json`), `page.route('**/fonts.googleapis.com/**', r => r.abort())`, `page.addStyleTag({ path: 'design/screens/fonts-test.css' })` (relativne putanje fontova: kopiraj `fonts/` pored ili koristi `url`), `await page.evaluate(() => document.fonts.ready)`, pa `toHaveScreenshot` protiv `design/screens/<Ekran>.png` sa pragom `maxDiffPixelRatio: 0.03`. Dodatna stanja: `Main_prazan`, `Main_bez_pomoci`, `Nacrti_odozgo`, `Nacrti_radne_ploce`, `Nacrti_tehnicki`, `Element_sablon`, `Element_fiokar` (koraci u `tools/screenshot_screens.py`). Za proveru rasporeda koristi `.layout.json`: glavni regioni (zaglavlje, trake, paneli, plan) moraju se poklopiti ±2 px.
- `tools/screenshot_screens.py` i `tools/inspect_screens.py` prave snimke i merenja; isto pokreni nad aplikacijom i uporedi.

## 9. Podaci na ekranima (isti primer svuda)
Svi ekrani projekta prikazuju **`fixtures/kuhinja-petrovic.json`** (format `docs/DATA_MODEL.md`): prostorija A 3200 × B 2400 (zidovi A–D debljine 120), prozor na A, vrata na D, radijator na C, kanal u uglu C/D, instalacije V, O, S1 (MSP), S2, T (trofazna, zid B), S4 (frižider), 12 elemenata D1–D6, F, V1, G1–G4, 81 deo. Za svaki ekran tačan opis je u `design/screens/screens.json` → `data`. Brojevi koji NISU u fixture-u (cene, 118 m reza, cene pilana) su primer cenovnika i označeni su tako.

Pravila prikaza podataka:
- Naziv materijala = `Material.name` sa šifrom dekora (Iverica 18 bela W980, Iverica 18 siva U708, HDF 3 bela, Iverica 16 bela W980).
- Dužina/širina dela po pravilu iz `docs/KONSTRUKCIJA.md` („Dužina i širina dela").
- „Od početka zida" = `offset` iz fixture-a.

## 10. Ekran Element — delovi
Leva kolona (skrol): naslov → „Konstrukcija — pogled spreda i presek" → „Pravila konstrukcije" (spoj, dno, leđa, fuga, kant; „i" uz Spoj i Leđa daju formule iz KONSTRUKCIJA.md; „Prati smer šare" sa objašnjenjem) → **„Mere i vrsta"**: vrsta (9 dugmadi), širina, visina korpusa, dubina, nogice (gornji: od poda), police (siva i zaključana kad se ne koristi), vrata 1/2 + otvaranje (Levo/Desno ili 2 krila), fronte fioka (samo fiokar/rerna: polja visina + „+ Fioka" + „Raspodeli" + provera zbira), materijali (korpus, fronte, leđa), napomena. Desna kolona (skrol): krojna lista elementa (tabela ne prelama redove, skrol vodoravno), okov, sažetak.
„Sačuvaj kao šablon" otvara dijalog (naziv, šta se čuva: mere/fronte/otvaranje, materijali i kant, pravila) → posle čuvanja obaveštenje dole desno sa linkom „Otvori Prostor"; šablon je u biblioteci Prostora, grupa „Moji šabloni".
