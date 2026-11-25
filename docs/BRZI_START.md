# Brzi start i skraćivanje koraka

Cilj: od praznog ekrana do krojne liste i cene za oko 2 minuta, bez AI-ja. Ekran: `design/screens/BrziStart.html` (u izvoru je radna JS verzija algoritma). **Sa podrazumevanim unosom rezultat je tačno projekat iz `fixtures/kuhinja-petrovic.json`.**

## Ulaz (`QuickStartInput`) — polja forme
| Polje | Tip | Podrazumevano | Napomena |
|---|---|---|---|
| `shape` | `'I' \| 'L' \| 'U'` | `L` | ravna / ugaona / U |
| `wallA` | mm | 3200 | unutrašnja dužina zida A (zid sa vodom) |
| `wallB` | mm | 2400 | L i U: zid levo od A (gledano iz prostorije) |
| `wallC` | mm | 2000 | samo U: zid desno od A |
| `water` | mm | 1500 | voda i odvod na zidu A, od levog ugla do sredine |
| `power400` | mm | 900 | trofazna: kod L/U na zidu B, **od ugla sa zidom A**; kod I na zidu A |
| `windowFrom`, `windowWidth` | mm | 1100, 1000 | prozor na zidu A (prazno = nema) |
| `dishwasher` | bool | da | ugradna MSP |
| `fridge` | bool | da | visoki element 600 za ugradni frižider |
| `uppers` | bool | da | gornji elementi |
| `materialsFrom` | `'last' \| 'template' \| 'en1116'` | `last` | odakle dolaze materijali, kant i podrazumevane mere |

## Izlaz — `Project` (format `docs/DATA_MODEL.md`)
- Zidovi: prostorija sa 4 zida debljine 120 (A, B, C, D), unutrašnje mere iz unosa; kod I: samo A (+ bočni zidovi ako se kasnije docrtaju); visina 2600.
- Otvori: prozor na A. Instalacije: V i O na A (`water`, odvod na `water + 150`, visine 500 i 450), T (trofazna) na B (`offset = wallB − power400` jer zid B ide od ugla sa D ka A) na visini 600.
- Elementi po algoritmu ispod, sa merama iz preseta, materijalima iz `materialsFrom`, oznakama D1…, F, V1…, G1… redom.
- Projekat se snima i otvara.

## Algoritam auto-rasporeda (`engine/autoLayout.ts`, čist i deterministički)
1. Ugao: ugaoni slepi element **1100** (slepi deo 628 = dubina 560 + fronta 18 + maska 50, krilo 469; izmena 2026-11-25, ranije 1000 / 400 — krilo je udaralo u element u drugom uglu) na početku zida A (L, U); kod U i na kraju A (šarke levo, slepi deo desno). Zidovi B i C počinju na 600 od zida A (dubina ugla).
2. Sudopera 800: početak = `round50(water − 400)`, ograničen na slobodan deo zida A, ostavljajući mesto za MSP (kod I i za rernu). Ako bi do ugla ostalo manje od 300, sudopera se lepi uz ugao.
3. MSP 600 odmah posle sudopere (ako ima mesta).
4. Rerna 600 centrirana na trofaznu (`round50(power400 − 300)` od ugla sa A), na zidu B (kod I na A, posle MSP-a). Razmaci manji od 300 se izbegavaju pomeranjem uz ivicu.
5. Frižider: visoki 600 na kraju zida B (kod I na kraju zida A).
6. Popuna praznina: **najveća standardna širina koja staje** (600, 500, 400, 300), ponavljano; ostatak manji od 300 je **filer**.
7. **Prvi donji element odmah posle MSP-a postaje fiokar** (3 fioke 176/266/266), ako je širok bar 400.
8. Gornji: zid A, delovi bez prozora (± 100 mm) i bez visokog elementa; 600, pa 400.
9. Strane šarki: pravila iz `docs/KONSTRUKCIJA.md` („Podrazumevana strana šarki").
10. Upozorenja (ne blokiraju): voda nije iza sudopere; nema mesta za rernu; zid prekratak za oblik (I ≥ 2400, L: A ≥ 2500 i B ≥ 1200, U: A ≥ 3600, B i C ≥ 1200 — ugaoni 1100 od 2026-11-25); nema mesta za mašinu za sudove pored sudopere.

Test (podrazumevani unos): A `D1 ugaoni 1100 | D2 sudopera 800 | D3 MSP 600 | D4 fiokar 600 | F filer 100`; B `D5 rerna 600 | D6 donji 600 | V1 frižider 600`; gornji `G1 600 | G2 400 | G3 600 | G4 400` = elementi iz `fixtures/kuhinja-petrovic.json`.

## Dugmad na rezultatu
| Dugme | Šta radi |
|---|---|
| **Napravi projekat i doteraj** | pravi projekat iz izlaza autoLayout-a, snima ga i otvara **Prostor** (2D editor) |
| **Odmah krojna lista** | pravi isti projekat, snima ga i otvara **Krojnu listu** |
| **Odmah cena za kupca** | pravi isti projekat, snima ga i otvara **Obračun (Ponuda)** |

## Ostale prečice
- „Kao prošli put": novi projekat nasleđuje materijale, kant i pravila iz poslednjeg projekta.
- Šabloni elemenata radionice (grupa „Moji šabloni" u biblioteci) — pravljenje: ekran Element → „Sačuvaj kao šablon".
- „Popuni zid": klik na prazan deo zida → popuna po istom algoritmu (kasnije).
- Unos mera: samo brojevi, Enter potvrđuje; dozvoljen unos u cm (`72,0` → 720).
- Dupliraj element pored; dupliraj projekat (ista kuhinja, drugi kupac).
- Jedno dugme „Pošalji sve": pilani krojna lista i kant, okovaru okov, kupcu ponuda.
