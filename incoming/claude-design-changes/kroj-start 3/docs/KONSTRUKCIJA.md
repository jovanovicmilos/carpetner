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
- `corner-blind`: dodatna slepa ploča `(H − 4) × 420`, vrata na slobodnom delu.
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
| Sokla, zidna lajsna | po dužini niza donjih elemenata (m) |

Provera D2: šarke 4, pločice 4, nogice 4, klipse 2, tipl 14, konfirmat 8, šraf 32, ručke 2.

## Instalacije i izrezi
- Instalacija pripada elementu ako je `offset` unutar `[el.offset, el.offset + W]` na istom zidu.
- Ako je iza korpusa sa leđima → izrez u leđima: pravougaonik oko svih takvih instalacija + 50 mm sa svake strane, napomena „izrez A×B za V+O".
- Upozorenja: voda/odvod nisu iza `sink` elementa; utičnica u zoni aparata (MSP) — predlog pomeranja.

## Ploče i obračun
- m² delova po materijalu → broj ploča = `ceil(m² × (1 + otpad%) / m² ploče)` (ili zaokruživanje na pola / po m², po pravilu).
- Kasnije: prava optimizacija krojenja (guillotine, rez 4 mm) zamenjuje procenu.
