# Poruka za Claude Code (kopiraj i nalepi)

## A) Ako projekat već postoji, a dizajn nije preslikan

```
UI aplikacije ne odgovara dizajnu. Ubaci folder design/ i tools/ iz novog paketa u projekat
(zameni postojeće), pa:

1. Pročitaj CLAUDE.md (deo „DIZAJN SE PRESLIKAVA TAČNO") i design/DESIGN_SPEC.md.
2. Otvori design/screens/index.html i svaki ekran, i pogledaj odgovarajući .png i .layout.json.
3. Uvedi design/tokens.css kao jedini izvor boja, fontova, radijusa i razmaka.
   Ukloni sve stilove/komponente koji ne postoje u referenci.
4. Ekran po ekran (redosled: Main, BrziStart, Nacrti, Pogled3D, Zid, Element, KrojnaLista,
   Obracun, Poredjenje, AIPredlog, Cenovnik, Standardi, AIPodesavanja, Sajt, Prijava):
   - prenesi markup iz <script id="dc-template"> u JSX 1:1 (pravila prenosa u DESIGN_SPEC §2),
   - prenesi logiku iz <script id="dc-logic"> (renderVals, handleri) u hook/store,
   - dodaj Playwright vizuelni test protiv design/screens/<Ekran>.png (DESIGN_SPEC §8)
     i ne prelazi na sledeći ekran dok test ne prođe.
5. Na kraju mi pokaži tabelu: ekran | razlika u pikselima | šta se još razlikuje.
Ne menjaj engine osim ako je potrebno da ekran dobije iste podatke kao referenca.
```

## B) Ako počinješ od nule

```
Pročitaj CLAUDE.md i design/DESIGN_SPEC.md. Uradi korak 0 iz „Redosled rada": UI ljuska po
referenci za sve ekrane iz design/screens/screens.json, sa vizuelnim testovima. Zatim korak 1
(engine + test sa fixtures/kuhinja-petrovic.json).
```

## Dopuna: novi 2D editor
Ekran Prostor (`Main`) je promenjen: alati, meni na desni klik, traka akcija iznad izabranog, plutajući panel mera i Provera dole levo. Pre rada pročitaj `CHANGES.md` tačku 0 i `docs/EDITOR_2D.md` (tabele „Traka akcija", „Meni na desni klik", „Tastatura") i preslikaj `design/screens/Main.html` + snimke `Main_izabrano.png`, `Main_desni_klik.png`, `Main_provera.png`.

## Dopuna: katalog, prilagođeni element, ručke, realni 3D
Pročitaj `CHANGES.md` tačku 0b, pa `docs/KATALOG.md`, `docs/OTVARANJE.md`, `docs/3D.md`. Redosled:
1. Model podataka (DATA_MODEL: `FrontRow`, `OpeningSpec`, `catalogKey`) + učitavanje `fixtures/katalog.json`.
2. Generator: konfiguracija → delovi → okov; testovi moraju da prođu na `fixtures/konfigurator-primer.json`.
3. UI: biblioteka (katalog, quickAdd), panel mera (vrsta kao select, ručke), Konfigurator — preslikaj `design/screens/Main.html`, `Konfigurator.html`.
4. 3D: `partsToMeshes` → tehnički prikaz → realni prikaz → generički aparati → slika za ponudu (`docs/3D.md`, faze 1–5).
5. Admin `Biblioteka.html`.

## Dopuna: tok projekta
Pročitaj `CHANGES.md` 0d i `docs/TOK_PROJEKTA.md`. Napravi `ProjectHeader` sa stepperom (izračunavanje statusa koraka iz podataka), ekran Projekti (`design/screens/Projekti.html`) i čuvanje `resume` pri svakoj promeni ekrana. Test: Petrović = 59 %, pozicije koraka iste na svim ekranima.

## Dopuna: UI stack
Pre bilo kog UI koda pročitaj `docs/UI_KOMPONENTE.md`. Postavi Tailwind CSS v4 + shadcn/ui sa `design/kroj-theme.css` kao ulaznim CSS-om (bez tailwind.config.js, bez generatora tema). Postojeće ekrane prebaci na shadcn komponente po tabeli mapiranja, ekran po ekran, i posle svakog pokreni vizuelni test — izgled se ne sme promeniti.
