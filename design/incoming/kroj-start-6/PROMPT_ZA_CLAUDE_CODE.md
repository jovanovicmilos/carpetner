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
