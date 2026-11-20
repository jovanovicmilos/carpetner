# Izmene u ovom exportu

## 0f. Nova paleta: zelena + drvo, tamno zeleno zaglavlje (2026-11-20)
Svi ekrani u `design/` i `design/screens/` su prebojeni; `design/tokens.css` i `design/kroj-theme.css` imaju nove vrednosti. Aplikaciju treba uskladiti (vidi PROGRESS → Next step).

| Uloga | Staro | Novo |
|---|---|---|
| primarna (`--primary`, `--ring`, `--c-accent`) | #B4440E | #2E6B4E |
| tekst na svetlom akcentu (`accent-ink`) | #7C2D0A | #1D4632 |
| pozadina izabranog (`accent-soft`) | #FBE3D3 | #E2EFE6 |
| najsvetlija | #FFF8F3 | #F2F8F4 |
| akcenat na tamnom (`accent-on-dark`) | #E2804D | #8CC5A2 |
| broj cene na tamnoj kartici (`accent-light`) | #F6B48E | #A9D6BA |
| gornji element u planu (`el-upper`) | rgba(180,68,14,0.10) | rgba(46,107,78,0.10) |
| zaglavlje, tamna dugmad i kartice (`dark`) — samo **pozadina** #1C1B19 | #1C1B19 | #1F2B24 |
| hover na tamnom / dark-2 / linija / #3A3835 / #6B665E | #2E2C29 / #2A2926 / #4A4743 / #3A3835 / #6B665E | #2A3A31 / #26352C / #3E5045 / #34463B / #5A6E62 |
| donji element / visoki / filer / svetlo drvo | #E7E1D5 / #C9BEA9 / #D6CDBC / #EFE9DE | #EADBC4 / #D6BE98 / #E0CCAD / #EADBC4 |

**Ne menja se:** tekst #1C1B19 (ink), upozorenja i gas ostaju narandžasti — novi tokeni `warn` #B4440E, `warn-ink` #7C2D0A, `warn-soft` #FBE3D3, `warn-line` #E2804D. Zelena nikad ne znači upozorenje. Novi tokeni drveta: `wood-birch/oak/walnut/bark`.
Gde stariji dokumenti (`docs/TOK_PROJEKTA.md` i dr.) kažu „narandžasto“ za izabrano / u toku / akcenat, sada važi zelena; za upozorenja i gas i dalje narandžasto. Referentni snimci su merodavni.

## 0e. UI: Tailwind CSS v4 + shadcn/ui
Aplikacija se gradi sa Tailwind v4 i shadcn/ui (Radix), u našem stilu — ne podrazumevanom shadcn izgledu.
- `design/kroj-theme.css` — gotov ulazni CSS (shadcn promenljive → Kroj boje, `@theme inline`, radijusi, senke, fontovi).
- `docs/UI_KOMPONENTE.md` — šta je zabranjeno i tabela: svaki element dizajna → shadcn komponenta → tačne klase.

## 0d. Tok projekta: koraci sa procentom + „nastavi gde si stao“
- Zaglavlje: umesto „1 Prostor 2 Nacrti…“ stepper sa statusom svakog koraka (završen / u toku / nije započet), hover kartica sa uslovima, „59 % urađeno · sledeće: …“ i traka napretka. Koraci i dalje na fiksnom mestu.
- Novi početni ekran **Projekti**: kartica „Nastavi gde si stao“, filteri, pretraga, kartice projekata sa procentom i dugmetom „Nastavi: {korak}“.
- Pravila procenta, uslovi koraka i šta se pamti za nastavak (`Project.resume`, `Project.progress`): **`docs/TOK_PROJEKTA.md`**.

## 0c. Zaglavlje se više ne pomera
Koraci (1 Prostor … 6 Ponuda) su na fiksnom mestu u sredini na svim ekranima projekta; mm/cm i Pomoć su uvek desno; aktivni korak nije podebljan. Napravi jednu komponentu `ProjectHeader` — vidi DESIGN_SPEC §6 (sa testom pozicija).

## 0b. NOVO — katalog, prilagođeni element, ručke, realni 3D
- **Katalog gotovih elemenata** (32: Donji 13, Gornji 7, Visoki 9, Završni 2 + šabloni) u biblioteci Prostora; **klik dodaje na izabrani zid** na prvo slobodno mesto. Podaci `fixtures/katalog.json`, opis `docs/KATALOG.md`.
- **Prilagođeni element** — novi ekran `Konfigurator`: osnova, redovi fronte, unutrašnjost, ručke, materijali; uživo krojna lista i okov. Očekivani rezultati: `fixtures/konfigurator-primer.json` (3 primera) — napravi testove.
- **Ručke i otvaranje**: šipka, dugme, profil na vrhu fronte, na pritisak (gola = v2). Projekat + izmena po elementu. Menja krojnu listu, okov i bušenje: `docs/OTVARANJE.md`, `fixtures/otvaranje.json`.
- **3D: Tehnički / Realni** + Dan/Veče + „Slika za ponudu“; panel „Izgled za kupca“. 3D se gradi iz delova krojne liste: `docs/3D.md`.
- **Generički aparati** (bez brenda) samo u realnom 3D: `fixtures/aparati.json` sa pravilima licenci.
- **Admin · Materijali, ručke, aparati** — novi ekran `Biblioteka` (4 taba: Materijali sa teksturom/površinom/licencom, Ručke i otvaranje, Aparati, Katalog elemenata).
- DATA_MODEL: `Element.catalogKey/front/interior/opening`, `OpeningSpec`, `FrontRow`, `MaterialLook`, `ApplianceModel`, nove tabele.
- Snimci: `Konfigurator*.png`, `Pogled3D*.png`, `Biblioteka*.png`, `Main_prepreke.png`, `Main_rucke_sipka.png`.

## 0. NOVO — 2D editor (Prostor): moderniji rad, više mesta za plan
- Uklonjena traka alata ispod zaglavlja, stalni desni panel i statusna traka. Plan je sada širi za ~300 px i viši za ~100 px.
- **Traka alata sa ikonicama** pluta gore levo nad planom (izaberi, crtaj zidove, poništi, mreža, pravi uglovi, gornji, legenda), sa tooltipom i prečicom na svakoj ikonici.
- **⋯ Projekat** gore desno: Uklopi prikaz, Brzi start, Učitaj primer, Novi prazan prostor.
- **Meni na desni klik** (dug dodir na tabletu) na elementu, zidu, prepreci i praznom planu — sve opcije na jednom mestu, uključujući otvaranje L/D/2 krila/bez i **Obriši**.
- **Traka akcija iznad izabranog** (kao u Figma/Canva): otvaranje, druga strana, dupliraj, mere, konstrukcija, ⋯, obriši.
- **Panel mera** se pojavljuje samo kad je nešto izabrano, pluta desno i može da se sakrije (×); u njemu više nema dugmadi za brisanje/dupliranje.
- **Provera** je čip dole levo (zeleno/narandžasto sa brojem); klik na upozorenje bira element.
- **Legenda** je popover iz trake alata (više nije u desnom panelu).
- **Tastatura**: Delete, Ctrl+Z, Ctrl+D, F, strelice (10/50 mm), Enter, V/W, Esc.
- Biblioteka može da se sakrije (‹) za još više prostora.
- Ispravka: izbor elementa klikom više ne nestaje (pointer capture tek kad prevlačenje stvarno počne).
- Detalji: `docs/EDITOR_2D.md` (tabele traka akcija, meni, tastatura), `design/DESIGN_SPEC.md` §4. Novi snimci: `Main_izabrano.png`, `Main_desni_klik.png`, `Main_provera.png`.

# Ranije izmene (odgovor na tačke 1–8)

## 1. Navigacija
- Svuda ista: `1 Prostor | 2 Nacrti | 3 3D | 4 Elementi | 5 Krojna lista | 6 Ponuda` (Main, Zid, Nacrti, Pogled3D, Element, KrojnaLista, Poredjenje, Obracun). „2 Zidovi" više ne postoji.
- **Pogled na zid** (`Zid`) je podekran Prostora (aktivan korak 1), sa dugmetom „← Prostor". Ulazi: Prostor → izaberi zid → panel → **„Pogled na zid i instalacije →"**; Nacrti → tab „Spreda (po zidu)" → **„Uredi instalacije ovog zida →"**. Nacrtano u `Main.html` (panel zida) i `Nacrti.html`.
- **Poređenje pilana**: podekran Krojne liste (aktivan korak 5) sa „← Krojna lista".
- **AI iz slike** dobio istu navigaciju načina početka kao Brzi start (`Brzi start | Iz fotografije (AI) | Prazan projekat`).
- DESIGN_SPEC §6: tabela ekran → aktivni korak → kako se dolazi.

## 2. Podaci primera „Kuhinja Petrović"
- a) **Klamerice**: `floor(2 × (L + W) / 150)` po nabijenim leđima → D2 = 20, ukupno 150 (fixture ažuriran, KrojnaLista prikazuje 150).
- b) **Aluminijumska podloga za sudoperu**: 1 po elementu `sink` → u `expected.hardware` (`alu-podloga-sudopera: 1`), u Krojnoj listi i Obračunu.
- c) **Izrez u leđima**: okvir centara instalacija iza korpusa (samo one čija je visina unutar korpusa) + 75 mm sa svake strane, naviše na 50 mm, najmanje 300 × 250, centriran; 30 mm od ivice. D2 → 300×250, centar 575 / 375. U `docs/KONSTRUKCIJA.md` i `expected.backCutouts`.
- d) **Nazivi materijala** svuda sa šifrom dekora: „Iverica 18 bela W980", „Iverica 18 siva U708", „HDF 3 bela", „Iverica 16 bela W980" (Element, Krojna lista, Obračun, 3D).
- Usklađeno i: tiplovi 132, konfirmati 82, šrafovi 184 (Krojna lista); sokla 5,0 m (nizovi A 3200 + B 1800), zidna lajsna 4,4 m, 3 spojnice, 2 silikona (`expected.accessories`); Obračun i cena na sajtu preračunati (268.066 RSD); kant u sažetku D2 3,7 m; napomena „šara po dužini" uklonjena (U708 nema šaru).
- **Dužina/širina**: bez šare `length` = duža stranica (V1 „Vrata gornja" 597 × 366, leđa 716 × 596…); sa šarom = smer šare.

## 3. Element — mere
- Nova karta **„Mere i vrsta"** u levoj koloni ispod „Pravila konstrukcije": vrsta (9 vrsta), širina, visina korpusa, dubina, nogice / od poda, police, vrata 1/2 + otvaranje, fronte fioka (fiokar/rerna), materijali, napomena. Snimci: `Element.png`, `Element_fiokar.png`.
- **Vrsta** se menja na ekranu Element (karta „Mere i vrsta") i brzo u Prostoru (panel elementa → „Vrsta").

## 4. Element — šablon i pravila
- „Sačuvaj kao šablon" → dijalog (naziv, šta se čuva) → obaveštenje sa linkom; šablon se pojavljuje u biblioteci Prostora, grupa **„Moji šabloni"** (primer „Sudopera 800 (moja)"). Snimak `Element_sablon.png`.
- Formule za **Ekscentar (minifix)**, **Samo konfirmat**, **HDF u nut**, **Iverica 18 upuštena** u `docs/KONSTRUKCIJA.md`; kratko i u „i" pored Spoj i Leđa.
- „Prati smer šare": definicija (dužina u smeru šare, bez rotacije pri optimizaciji, „šara ↑" u krojnoj listi; bez efekta za jednobojne dekore) — u KONSTRUKCIJA.md i „i".

## 5. Biblioteka u Prostoru
- **Dimnjak** (Otvori i prepreke): uz zid, širina × dubina × visina (podrazumevano 500 × 400, do plafona 2600), šrafiran 135° sa natpisom; panel: od početka zida, širina, dubina, visina, „Do plafona (2600)"; provera preklapanja.
- **Ostalo** (prepreka): slobodna, sa **nazivom** (npr. bojler), isprekidan okvir; panel: naziv, širina, dubina, visina.
- **Trofazna 400 V** (instalacija): oznaka **T**, boja #A15C00, belo slovo; visina od poda.
- Sve tri imaju ikonicu, prikaz na planu, legendu, „i" tekst i kartice na prelaz mišem. Grupa „Moji šabloni" dodata na vrh.

## 6. Fontovi
- Snimci sada koriste **pravi IBM Plex Mono** (lokalno, OFL). **IBM Plex Sans** nije bilo moguće nabaviti van mreže → zamenjen fontom **Inter 4** (400/500/600/700) pod istim imenom, samo u snimcima, kroz `design/screens/fonts-test.css`; Google Fonts blokirani. Isti CSS se ubacuje u aplikaciju u vizuelnim testovima (DESIGN_SPEC §1, §8).

## 7. Isti podaci svuda
- `fixtures/kuhinja-petrovic.json` je **jedini zajednički primer** u formatu `docs/DATA_MODEL.md` (zidovi A–D sa tačkama i debljinom, otvori, prepreke, instalacije, elementi sa `side`, `hinge`, `offset` od unutrašnjeg lica). Pravi ga `tools/make_fixture.py`.
- `Main` (2D editor) učitava baš te podatke (example() je generisan iz fixture-a); Brzi start sa podrazumevanim unosom daje iste elemente; Element, Zid, Krojna lista, Obračun, Nacrti koriste iste brojeve.
- Za svaki ekran opis podataka: `design/screens/screens.json` → `data` i DESIGN_SPEC §9.
- **Promena u odnosu na stari fixture:** novi format zidova (`a`, `b`, `thickness`), zid B ide od ugla sa D ka A (offseti na B: V1 0, D6 600, D5 1200; T 1500, S4 300), D6 šarka **L** (pravilo „ka bližem kraju niza"; nacrti i DXF ažurirani), dodati `openings`, `obstacles`, `expected.backCutouts`, `expected.accessories`, `expected.edgeMetersOrder` (naviše na metar: 40 / 41).

## 8. Brzi start
- Ulaz (polja), izlaz (`Project`), algoritam i šta otvara koje dugme: `docs/BRZI_START.md`. Popuna: najveća širina koja staje, ostatak < 300 = filer; prvi donji posle MSP-a = fiokar. Podrazumevani unos daje tačno elemente iz fixture-a.
- „Napravi projekat i doteraj" → Prostor; „Odmah krojna lista" → Krojna lista; „Odmah cena za kupca" → Obračun — sva tri prave i snimaju isti projekat.
