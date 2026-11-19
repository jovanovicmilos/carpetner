# Pravila konstrukcije (engine)

Sve mere u mm. `t` = debljina korpusa (18), `W` = širina elementa, `H` = visina korpusa, `D` = dubina korpusa.
Pravila su podrazumevana pravila radionice i moraju biti podesiva (`ConstructionRules`).

## Podrazumevana pravila
| Pravilo | Vrednost |
|---|---|
| Korpus | iverica 18, dno IZMEĐU bokova |
| Leđa | HDF 3 nabijena: `(W − 4) × (H − 4)` |
| Fuga fronti | 3 mm (između i po obodu: fronta = otvor − 3) |
| Kant korpusa | ABS 0,8 samo prednja (duža vidljiva) ivica → `1D` |
| Kant fronti | ABS 2 sve 4 ivice → `2D 2K` |
| Mera za sečenje | gotova − debljina kanta po ivici, samo za kant ≥ 1 mm |
| Spoj | tipl 8×35 + konfirmat 7×50 |

## Donji element (`base`)
| Deo | Kom | Dužina × Širina | Kant |
|---|---|---|---|
| Bok | 2 | `H × D` | 1D 0,8 |
| Dno | 1 | `(W − 2t) × D` | 1D 0,8 |
| Vezna letva | 2 (prednja + zadnja) | `(W − 2t) × 100` | 1D 0,8 |
| Polica | n | `(W − 2t) × (D − 20)` | 1D 0,8 |
| Leđa | 1 | `(W − 4) × (H − 4)` HDF | — |
| Vrata | 1 ili 2 | 1: `(H − 4) × (W − 3)`; 2: `(H − 4) × floor((W − 6) / 2)` | 2D 2K 2 |

Primer D2 (sudopera, W 800, H 720, D 560, 2 vrata, bez police):
- Bok 2 × 720×560, Dno 1 × 764×560, Vezna letva 2 × 764×100, Leđa 1 × 796×716 (izrez za V+O), Vrata 2 × 716×397 (za sečenje 712×393).

Varijante:
- `sink`: bez police; izrez u leđima ako su instalacije iza.
- `drawer` (fiokar): fronte fioka po zadatim visinama (npr. 176/266/266 za H 720), dno fioke iverica 16 `526 × 476` za W 600 (zavisi od sistema fioka — pravilo iz kataloga okova).
- `oven` (rerna): 1 vezna letva, bez leđa, fronta fioke ispod rerne.
- `corner-blind`: slepi deo ostaje prazan (bez slepe ploče). Uz krilo idu 2 **stubića** `(H − 2t) × 100` od materijala korpusa (širina veznog komada): stoje na podu, gore se šrafe u vezni komad, i šrafljeni jedan u drugi čine „L“ profil na koji naleže krilo. Krilo na slobodnom delu `W − slepi deo − 3`. (Izmena 2026-11-19, po radioničkoj praksi korisnika.)
- `appliance-front` (MSP): samo fronta `(H − 4) × (W − 3)`.
- `filler`: jedna traka `(H − 4) × (W − 4)` od materijala fronti.

## Gornji element (`wall`), D = 320
| Deo | Kom | Mera | Kant |
|---|---|---|---|
| Bok | 2 | `H × D` | 1D 0,8 |
| Dno / vrh | 2 | `(W − 2t) × D` | 1D 0,8 |
| Polica | n | `(W − 2t) × (D − 20)` | 1D 0,8 |
| Leđa | 1 | `(W − 4) × (H − 4)` | — |
| Vrata | 1 | `(H − 4) × (W − 3)` | 2D 2K 2 |

## Visoki element (`tall`) — primer frižider W 600, H 2070
Bok 2 × 2070×560; dno/vrh/pregrada 3 × 564×560; leđa gornjeg dela 596×366; vrata frižider 1696×597; gornja vrata 366×597.

## Redovi fronte (`Element.front`, katalog i Prilagođeni element) — pravila radionice (korisnik 2026-11-19)
Važe ista pravila kao gore (nazivi, kant, leđa, fioka komplet 500); formule iz `design/Konfigurator.dc.html` (Dno, Veza gore, H − 3, kutija fioke) se **ne** koriste.
- Redovi idu odozgo nadole; red bez visine deli ostatak visine korpusa (prvi takav red dobija neparan mm).
- Fronta reda = visina reda − 4 (2 mm gore i dole), širina W − 3; 2 krila: 2 × ⌊(W − 6) / 2⌋. Isto kao frižider 1700 + 370 → 1696 + 366.
- Vrste: krilo, 2 krila, fioka (Fronta fioke + Pod fioke + komplet 500), aparat (niša, **bez fronte**), staklo (alu ram, okov), otvoreno (bez fronte), kip (Fronta kip + mehanizam), panel (fiksna fronta).
- **Visoki**: Stranica 2 × H × D, Pod / plafon 2, i **Srednja stranica** (pune dubine) na svakoj granici redova osim između dve fioke — dakle fiksna ploča ispod svakog aparata.
- **Donji / gornji**: fiksna Srednja stranica samo ispod niše aparata (ako niša nije donji red).
- **Poleđina** samo iza redova bez aparata (ventilacija): po jedna „Poleđina (deo)" za svaki neprekinut niz redova; visina = visina niza − isto umanjenje kao cela poleđina.
- Ručke i otvaranje: `docs/OTVARANJE.md` (profil skraćuje svaku frontu sa ručkom za 20; na pritisak menja šarke i fioke, dodaje potiskivače).

## Kant notacija
- `D` = duža ivica, `K` = kraća ivica. `1D` jedna duža, `2D 2K` sve četiri.
- Metraža kanta = Σ (dužine kantovanih ivica × kom), zbirno po tipu kanta, + 10% (podesivo).

## Okov — pravila brojanja
| Stavka | Pravilo |
|---|---|
| Šarka + montažna pločica | po vratima prema visini vrata: ≤ 900 → 2; ≤ 1600 → 3; ≤ 2000 → 4; > 2000 → 5. Fronta MSP i fioke → 0 |
| Nogice | 4 po donjem/visokom korpusu (ne za `appliance-front` i `filler`) |
| Klipse za soklu | 2 po korpusu sa nogicama |
| Nosač police | 4 po polici |
| Vešaljka za gornji | 1 par po gornjem elementu |
| Fioka komplet | 1 po fioci (vodilice po dubini korpusa, npr. 500) |
| Ručka | 1 po fronti, osim filera |
| Tipl 8×35 | 3 po kraju dna/vrha/pregrade, 2 po kraju vezne letve |
| Konfirmat 7×50 | 2 po kraju dna/vrha/pregrade, 1 po kraju vezne letve |
| Šraf 3,5×16 | šarka 2 + pločica 2 + nogica 4 |
| Klamerica za leđa | po nabijenim leđima: `floor(2 × (L + W) / 150)` (obim / 150 mm, naniže). D2 796×716 → 20; ceo primer → 150. Leđa u nut i upuštena: 0 |
| Aluminijumska podloga za sudoperu | 1 po elementu vrste `sink` |
| Sokla | zbir dužina nizova elemenata na nogicama (primer: A 3200 + B 1800 = 5,0 m) + ugaoni spoj po uglu niza |
| Zidna lajsna | dužine radnih ploča uz zid (primer: 3200 + 1200 = 4,4 m) + završeci |
| Spojnica radne ploče | 3 po spoju radnih ploča; silikon 1 tuba po radnoj ploči |

Provera D2: šarke 4, pločice 4, nogice 4, klipse 2, tipl 14, konfirmat 8, šraf 32, klamerice 20, alu podloga 1, ručke 2.
Ceo primer (`fixtures/kuhinja-petrovic.json` → `expected.hardware`): šarke 22, pločice 22, fioke 4, nogice 24, klipse 12, nosači police 24, vešaljke 4 para, ručke 15, tiplovi 132, konfirmati 82, šrafovi 184, klamerice 150, alu podloga 1.

## Instalacije i izrezi
- Instalacija pripada elementu ako je `offset` unutar `[el.offset, el.offset + W]` na istom zidu.
- Instalacija je **iza korpusa** ako je na istom zidu i strani, `offset` je u `[el.offset, el.offset + W]` i visina centra je u `[legs, legs + H]` (gornji: `[elevation, elevation + H]`). Utičnica iznad radne ploče zato nije iza donjeg elementa.
- Za element sa leđima (ne rerna, ne fronta aparata) pravi se **izrez u leđima**:
  - okvir oko centara svih takvih instalacija (x = `offset − el.offset`, y = `visina − legs`),
  - + `margin` 75 mm na svaku stranu,
  - zaokruženo **naviše na 50 mm**,
  - najmanje **300 × 250** (š × v),
  - centar izreza = centar okvira instalacija; ako bi izrez prišao ivici leđa bliže od 30 mm, pomera se ka unutra,
  - napomena dela leđa: `izrez {š}×{v} za {oznake}` (oznake: V voda, O odvod, S struja, T trofazna, G gas, spojene sa „+").
- Primer D2: V (500 od leve ivice elementa, h 500) i O (650, h 450) → okvir 150 × 50 → +150 → 300 × 200 → minimum → **300 × 250**, centar x 575, y 375 od dna korpusa. Napomena „izrez 300×250 za V+O".
- Upozorenja: voda/odvod nisu iza `sink` elementa; utičnica u zoni aparata (MSP) — predlog pomeranja.

## Ploče i obračun
- m² delova po materijalu → broj ploča = `ceil(m² × (1 + otpad%) / m² ploče)` (ili zaokruživanje na pola / po m², po pravilu).
- Kasnije: prava optimizacija krojenja (guillotine, rez 4 mm) zamenjuje procenu.

## Dužina i širina dela
- Materijal **sa šarom** (`grain: true`) i uključeno `followGrain`: `length` je uvek u smeru šare (vrata i bokovi: visina; fronte fioka: širina), optimizacija ne sme da rotira deo, a u krojnoj listi uz deo piše „šara ↑".
- Materijal **bez šare** (jednobojni, npr. W980, U708, HDF): `length` je **duža** stranica, `width` kraća. Pri zameni L i W menjaju se i oznake kanta (D ↔ K). Primer: „Vrata gornja" V1 → 597 × 366; leđa G1 → 716 × 596.
- Isključeno `followGrain`: kao bez šare.

## Varijante spoja (`rules.joint`) — mere delova se ne menjaju
| Spoj | Dno/vrh/pregrada (po kraju) | Vezna letva (po kraju) |
|---|---|---|
| `dowel+confirmat` (podrazumevano) | 3 tipla 8×35 + 2 konfirmata 7×50 | 2 tipla + 1 konfirmat |
| `minifix` (ekscentar) | 2 ekscentra 15 mm (kućište + klin) + 2 tipla | 1 ekscentar + 1 tipl |
| `confirmat` (samo konfirmat) | 3 konfirmata | 2 konfirmata |

## Varijante leđa (`rules.backMode`)
| Leđa | Mera leđa | Promena drugih delova | Okov |
|---|---|---|---|
| `nailed` HDF 3 nabijena (podrazumevano) | `(W − 4) × (H − 4)` | — | klamerice (vidi gore) |
| `groove` HDF 3 u nut | nut 4 × 8 mm, 10 mm od zadnje ivice, u bokovima, dnu (i vrhu). Donji: `(W − 22) × (H − 11)`; gornji/visoki sa vrhom: `(W − 22) × (H − 22)` | — | bez klamerica |
| `inset18` iverica 18 upuštena | leđa između bokova, na dnu: `(W − 36) × (H − 18)`, materijal korpusa, kant 0 | dno i vrh: dubina `D − 18`; donji element: samo prednja vezna letva | 3 konfirmata po boku + 2 kroz dno (i vrh) |

## Podrazumevana strana šarki (autoLayout i novi element)
- Dvokrilna vrata: `LR`. Fronta aparata (MSP): `down`.
- Ugaoni slepi: šarke na strani **dalje od ugla** (primer D1: `R`).
- Jednokrilna vrata (donji, visoki, gornji): šarke na strani **bližeg kraja niza**. Kraj niza je zid, ugao, prozor ili drugi prekid niza tog sloja. Primer: G1 `L`, G2 `R`, G3 `L`, G4 `R`, D6 `L`, V1 `L`.
- Korisnik uvek može da promeni stranu (2D editor ili ekran Element).
