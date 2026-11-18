# Brzi start i skraćivanje koraka

Cilj: od praznog ekrana do krojne liste i cene za oko 2 minuta, bez AI-ja. Ekran: `design/BrziStart.dc.html`. U njemu je radna JS verzija algoritma, pa je koristi kao referencu.

## Tok
1. Oblik: ravna (I), ugaona (L), U.
2. Dužine zidova A, B, C (mm).
3. Voda i odvod (zid A, mm od ugla), trofazna (zid B; kod ravne na zidu A), prozor na A (od ugla, širina, opciono).
4. Opcije: MSP, visoki element za frižider, gornji elementi. Materijali i mere idu iz poslednjeg projekta, iz šablona radionice ili iz EN 1116 preseta.
5. Rezultat odmah: tlocrt, spisak elemenata, upozorenja → „Napravi projekat i doteraj" / „Odmah krojna lista" / „Odmah cena".

## Algoritam auto-rasporeda (`engine/autoLayout.ts`, čist i deterministički)
- Ugao: ugaoni slepi element 1000 na početku zida A (L, U); kod U i na kraju A. Zidovi B i C počinju na 600 (dubina ugla).
- Sudopera 800: početak = `round50(voda − 400)`, ograničen na slobodan deo zida i na mesto za MSP iza nje (kod ravne kuhinje i za rernu). Ako bi ostao razmak < 300 do ugla, sudopera se lepi uz ugao.
- MSP 600 odmah posle sudopere (ako ima mesta).
- Rerna 600: centrirana na trofaznu utičnicu (`round50(p400 − 300)`), na zidu B (kod ravne na A posle MSP-a). Razmaci < 300 se izbegavaju pomeranjem uz ivicu.
- Frižider: visoki element 600 na kraju zida B (kod ravne na kraju zida A).
- Popuna praznina: pohlepno, širine 600 / 500 / 400 / 300, tako da ostatak bude 0 ili ≥ 300; ostatak < 300 postaje filer.
- Gornji: zid A, segmenti bez prozora (± 100 mm) i bez visokog elementa; 600, pa 400.
- Upozorenja (ne blokiraju): voda nije iza sudopere; nema mesta za rernu; zid prekratak za oblik (I ≥ 2400, L ≥ 2400 + B ≥ 1200, U ≥ 3400 + B, C ≥ 1200).
- Izlaz su obični `Element[]` (sa podrazumevanim merama preseta), pa sve ostalo (krojna lista, 3D, cena) radi kao za ručno nacrtan projekat.

Test: L 3200 × 2400, voda 1500, trofazna 900, prozor 1100 / 1000, MSP + frižider + gornji →
`ugaoni 1000 | sudopera 800 | MSP 600 | donji 500 | donji 300` na A; `rerna 600 | donji 600 | frižider 600` na B; gornji 600, 400, 600, 400.

## Ostale prečice (ugraditi gde je jeftino)
- „Kao prošli put": novi projekat nasleđuje materijale, kant i pravila iz poslednjeg projekta.
- Šabloni elemenata radionice (npr. „Sudopera 800 sa izrezom", „Fiokar 3 fioke") ubacuju se jednim prevlačenjem.
- „Popuni zid": klik na prazan deo zida → popuna po istom algoritmu.
- Unos mera: samo brojevi, Enter prelazi na sledeće polje, `+`/`−` za 50 mm; dozvoljen unos u cm (`72,0` → 720).
- Promena širine elementa automatski pomera susede i popunjava ostatak filerom (opcija).
- Kopiraj element / ogledalo; promena materijala za ceo projekat jednim izborom.
- Jedno dugme „Pošalji sve": pilani krojna lista i kant, okovaru okov, kupcu ponuda.
- Dupliraj projekat (ista kuhinja, drugi kupac).
- Na telefonu/tabletu kod kupca: Brzi start + fotografije, ostalo u radionici.
