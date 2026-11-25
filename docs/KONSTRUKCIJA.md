# Pravila konstrukcije (engine)

Sve mere u mm. `t` = debljina korpusa (18), `W` = širina elementa, `H` = visina korpusa, `D` = dubina korpusa.
Pravila su podrazumevana pravila radionice i moraju biti podesiva (`ConstructionRules`).

## Podrazumevana pravila
| Pravilo | Vrednost |
|---|---|
| Korpus | iverica 18, dno IZMEĐU bokova |
| Leđa | HDF 3 nabijena: `(W − 4) × (H − 4)` |
| Fuga fronti | 3 mm (između i po obodu: fronta = otvor − 3) |
| Kant korpusa | običan kant 0,8 (nije ABS; korisnik 2026-11-20) samo prednja (duža vidljiva) ivica → `1D` |
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
- `drawer` (fiokar): fronte fioka po zadatim visinama (npr. 176/266/266 za H 720) + **sanduk fioke i klizači** po izabranom klizaču (vidi „Fioke i klizači“ ispod; izmena 2026-11-25).
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
Važe ista pravila kao gore (nazivi, kant, leđa, fioke i klizači); formule iz `design/Konfigurator.dc.html` (Dno, Veza gore, H − 3, kutija fioke) se **ne** koriste.
- Redovi idu odozgo nadole; red bez visine deli ostatak visine korpusa (prvi takav red dobija neparan mm).
- Fronta reda = visina reda − 4 (2 mm gore i dole), širina W − 3; 2 krila: 2 × ⌊(W − 6) / 2⌋. Isto kao frižider 1700 + 370 → 1696 + 366.
- Vrste: krilo, 2 krila, fioka (Fronta fioke + sanduk fioke + par klizača), aparat (niša, **bez fronte**), staklo (alu ram, okov), otvoreno (bez fronte), kip (Fronta kip + mehanizam), panel (fiksna fronta).
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
| Klizači za fioku | 1 par po fioci; vrsta = `rules.drawerSlide`, dužina po dubini korpusa (vidi „Fioke i klizači“; D 560 → 500) |
| Šraf 4 × 40 (sanduk fioke) | 12 po fioci: prednja i zadnja strana 2 × 2 kraja × 2 šrafa + pod 2 sa svake strane |
| Ručka | 1 po fronti, osim filera |
| Tipl 8×35 | 3 po kraju dna/vrha/pregrade, 2 po kraju vezne letve |
| Konfirmat 7×50 | 2 po kraju dna/vrha/pregrade, 1 po kraju vezne letve |
| Šraf 3,5×16 | šarka 2 + pločica 2 + nogica 4 |
| Klamerica za leđa | po nabijenim leđima: `floor(2 × (L + W) / 150)` (obim / 150 mm, naniže). D2 796×716 → 20; ceo primer → 150. Leđa u nut i upuštena: 0 |
| Aluminijumska podloga za sudoperu | 1 po elementu vrste `sink` |
| Sokla | zbir dužina komada sokle (vidi „Sokla“ ispod; primer: A 2708 + B 1890 = 4,598 m) |
| Zidna lajsna | dužine radnih ploča uz zid (primer: 3200 + 1200 = 4,4 m) + završeci |
| Spojnica radne ploče | 3 po spoju radnih ploča; silikon 1 tuba po radnoj ploči |

Provera D2: šarke 4, pločice 4, nogice 4, klipse 2, tipl 14, konfirmat 8, šraf 32, klamerice 20, alu podloga 1, ručke 2.
Ceo primer (`fixtures/kuhinja-petrovic.json` → `expected.hardware`): šarke 22, pločice 22, klizači 4 para (GTV Modern slide 3D 500), šraf 4 × 40 48, nogice 24, klipse 12, nosači police 24, vešaljke 4 para, ručke 15, tiplovi 132, konfirmati 82, šrafovi 184, klamerice 150, alu podloga 1.

## Fioke i klizači (korisnik 2026-11-25: „kako misliš da je najbolje, samo dokumentuj sve“)
Ranije je fioka bila „Fioka komplet 500“ + samo dno `W − 74 × 476`. Sada se za svaku fioku računa **sanduk fioke** iz izabranog klizača.

**Standardi.** EN 1116:2018 i ISO 3055:2021 ne propisuju mere fioke — samo koordinacione mere kuhinje (širine elemenata, visina radne ploče, dubina radne ploče 600 / element ≥ 550, sokla ≥ 80, gornji 310–400). Izdržljivost klizača je EN 15338. Mere sanduka uvek dolaze iz tehničkog lista klizača → **spisak klizača sa odbijanjima** (`packages/engine/src/slides.ts`, `SLIDES`).

**Spisak klizača** (polja: vrste, dužine NL, odbijanje po širini i dužini, uvlačenje dna, najdeblja stranica, usporivač, varijanta na pritisak, nosivost, izvor, `verified`):
| id | klizač | vrsta | NL (mm) | spoljna širina sanduka | dužina sanduka | dno uvučeno |
|---|---|---|---|---|---|---|
| `riex-nb58` (prvi izbor istog dana, pre GTV Versalite) | Riex NB58 slowmotion (Hranipex), H45, usporivač, 20–35 kg | kuglični (teleskopski) | 300–600 | LW − 26 (13 po strani; H45 standard 12,7) | NL | 0 |
| `gtv-modern-slide-3d` | GTV Modern slide 3D, usporivač, stranice 16–19 | skriveni (podgradni) | 300–500 | LW − 10 (unutra LW − 42 za 16 mm) | NL − 10 | 13 |
| `gtv-modern-slide-p2o` | GTV Modern slide Pro 3D P2O (na pritisak) | skriveni | 350–500 | LW − 10 | NL − 10 | 13 |
| `blum-tandem-plus` | Blum TANDEM plus BLUMOTION, stranice 16 | skriveni | 250–600 | LW − 10 (unutra LW − 42) | NL − 10 | 13 |
| `gtv-h45-ekonomik` | GTV teleskopski H45 Ekonomik (3404170, Pinoles), **tehnički list pročitan** | kuglični | 250–700 | LW − 25 (list: 2 × 12,7 ± 0,2) | NL (DF = DK) | 0 |
| `gtv-versalite-h45` (**podrazumevan**, korisnik 2026-11-25: „uzmi kao primer“, PK-L-H45) | GTV Versalite H45, usporivač, pun izvlak, 30 kg | kuglični | 250–600 | LW − 25 (12,5 po strani) | NL | 0 |
| `gtv-h45-p2o` | GTV H45 push to open | kuglični | 300–500 | LW − 25 | NL | 0 |
| `gtv-prestige-h45` | GTV Prestige H45, bez usporivača | kuglični | 250–600 | LW − 25 | NL | 0 |

LW = svetla (unutrašnja) širina korpusa = W − 2 × debljina stranice.

**GTV tehnički list H45 Ekonomik (3404170, korisnik 2026-11-25):** ŠF = UŠ − 2 × 12,7 (± 0,2 po strani) → u celim mm −25 (12,5 je u toleranciji, 13 nije); standardna fioka DF = DK, korpus ≥ DK + 3 (`minDepthExtra`); unutrašnja fioka (iza fronte debljine X) ≥ DK + X + 3; šina 43,7 visoka (3D 44); prva rupa na stranici korpusa 37 od prednje ivice, dalje po šablonu 64 / 96 / 128 …; „za pravilan rad klizača, širina fioke ne bi smela da prelazi dužinu klizača“ — to važi i za običnu fioku 600 sa klizačem 500 (539 > 500), zato je to samo upozorenje na stranici elementa, ne napomena u krojnoj listi. Versalite (usporivač) je isti H45 sistem, pa važe isti brojevi.

**Istraživanje korisnika (2026-11-25, nalepljen tekst sa izvorima assets.gtv.com.pl, hranipex.com, d2.blum.com), šta je uneto:**
- GTV Versalite H45 (dok. 2020 str. 136–137) i Prestige H45 (str. 148–149): 12,7 ± 0,2 po strani, SKL = NL → **potvrđeni** (`verified: true`), isto kao list Ekonomik.
- Riex NB58: LW − 26, unutrašnja dubina ≥ NL + 4, šina 45,7, rupe za 500: 37 / 165 / 261 / 357 → uneto (`minDepthExtra: 4`, `railHeight: 46`), i dalje `verified: false` (tekst sam kaže „potrebna dodatna potvrda“).
- GTV Modern slide 3D: NL − 10, dubina ≥ NL + 5, stranica ≤ 19 → uneto `minDepthExtra: 5`. **Nije uneto** „LW − 49 / 24,5 po strani“: kod skrivenih klizača unutrašnja širina zavisi od debljine stranice, pa to nije bočni zazor — čeka PDF.
- GTV H45 push to open: 12,7 po strani je već tako. **Nije uneto** „dubina fioke NL + 8“ (fioka duža od klizača nema smisla; verovatno je to najmanja dubina korpusa) — čeka PDF.
- Modern slide Pro P2O: nema potvrđenih mera. Blum: tabela najmanjih dubina je za američke dužine (229 / 305 / 381 / 457 / 533), ne za NL 250–600 — nije uneto.
- Rupe za montažu, zarezi pozadi, potiskivač: još nisu u modelu (kasnije polja u `SLIDES`, uz link na PDF). Pravilo „unutrašnja širina fioke = LW − 42, dužina = NL − 10, dno 13 mm“ je Blumovo (TANDEM uputstvo); GTV / KV / Hettich skriveni klizači ga prate. **`verified: false`** za GTV i Riex = odbijanja po vrsti klizača, ne iz njihovog tehničkog lista (PDF-ovi nisu bili čitljivi) — stranica elementa to piše ispod izbora; potvrditi iz lista i promeniti brojeve u `SLIDES` + `tools/make_fixture.py`. Riex NB58: Hranipex stranice daju visinu 45, usporivač, pun izvlak, dužine i nosivost, ali ne i mere za ugradnju (2D crtež je PDF) → 12,7 po strani je standard H45 klizača; zaokruženo na 13, jer manji zazor od 12,7 koči fioku. Izvori: okov.rs (dužine, nosivost), hranipex.com (Riex NB58), gtv.com.pl, Blum TANDEM uputstvo, Hettich Quadro (EB 12,5 za korpus 16, 10,5 za 18).

**Izbor.** `rules.drawerSlide` (cela kuhinja; podrazumevano `gtv-versalite-h45`), na stranici elementa „Klizač fioke (cela kuhinja)“ kad element ima fioke. Otvaranje na pritisak (docs/OTVARANJE.md) uzima varijantu klizača na pritisak (`push`; GTV Versalite i Riex NB58 → GTV H45 push to open, Riex varijanta na pritisak nije nađena). Radionički dodaci klizača i izbor po elementu: kasnije.

**Dužina klizača.** NL = najduži sa spiska ≤ dubina korpusa − **rezerva 60** i NL + `minDepthExtra` (3) ≤ dubina (`rules.drawerDepthReserve`; praksa korisnika „6 cm se odbija“: poleđina, cevi, usporivač → D 560 daje 500). Upuštena poleđina (inset18) oduzima još 18. Ako nijedan ne staje: najkraći + napomena „klizač … duži od korpusa — proveri“.

**Sanduk** (iverica 16 = materijal `drawerBottom`, debljina s iz materijala):
- **Stranica fioke** 2 po fioci: dužina = dužina sanduka, visina = visina fronte − 50, naniže na 10, najmanje 70 (skriveni: ~14 ispod + 7 iznad). Kant 0,8 na gornjoj dugoj ivici.
- **Prednja / zadnja strana fioke** 2 po fioci, između stranica, stoje na dnu: dužina = unutrašnja širina (spoljna − 2s), visina = visina stranice − uvlačenje dna − s. Kant 0,8 gore.
- **Pod fioke** 1 po fioci, između stranica, uvučen za uvlačenje dna: unutrašnja širina × dužina sanduka. Bez kanta.
- Visina fronte: kod `drawerFronts` = zadata visina, kod redova fronte = red − 4 (bez skraćenja za profil). Unutrašnje fioke (iza krila): visina sanduka 100 (privremeno).
- Delovi istih mera se spajaju (po visini sanduka). Spoj: šraf 4 × 40 (12 po fioci).
- Primer D4 (W 600, D 560, fronte 176/266/266, GTV Versalite H45): klizač 500, sanduk 539 × 500 spolja, 507 unutra; Stranica fioke 2 × 500×120 + 4 × 500×210; Prednja / zadnja 2 × 507×104 + 4 × 507×194; Pod fioke 3 × 507×500. D5 (fronta 116): stranice 500×70, prednja / zadnja 507×54, pod 507×500. (Riex NB58: 538 / 506.) (Sa GTV Modern slide 3D bi bilo 554 × 490, 522 unutra, dno uvučeno 13.)
- 3D (`partBoxes`): sanduk 20 mm iznad dna svog reda, 3 mm iza prednje ivice korpusa; **klizači** (siva metalna šina, dužina NL): kuglični između stranice korpusa i stranice fioke, visina 45, na sredini visine stranice fioke; skriveni ispod stranice fioke; vidi se u „Rasklopi“ i u rasklopljenom 3D na stranici elementa.

**Privremeno / otvoreno:** zarez ili bušenje pozadi za kuku skrivenog klizača nije u krojnoj listi (radi se po šablonu klizača); metalni box sistemi (GTV Modern Box, AXIS PRO, Blum Tandembox: seče se samo dno i zadnja strana) nisu na spisku; cena „Klizači za fioke (par)“ koristi stari ključ cenovnika `drawerKit`.

## Sokla (korisnik 2026-11-24)
- Seče se iz pločastog materijala i ide u krojnu listu: materijal = fronta elemenata, visina = nogice (`legs`), bez kanta.
- Podešavanje projekta `plinth`: **„po nizu“** (podrazumevano) = jedan komad po nizu elemenata na nogicama; duži od table (`sheet.l`) deli se na jednake komade. **„po elementu“** = komad ispod svakog elementa (prvi i poslednji u nizu prate kraj niza).
- Prednja strana sokle je 50 mm iza prednje strane korpusa.
- Unutrašnji ugao (dva niza na susednim zidovima, svaki kraj ≤ dubina drugog + 100 od ugla): niz koji ulazi dublje u ugao ide **kroz**, do zadnje strane druge sokle (dubina drugog − 50 − debljina); drugi **udara** u njegovu prednju stranu (dubina prvog − 50). Primer: A od 492 do 3200 = 2708; B do 510 od zida A = 1800 + 90 = 1890.

## Radna ploča na uglu (korisnik 2026-11-24)
- Ploča koja se spaja na uglu (`ugaoni spoj`) seče se **knap** uz prednju ivicu ploče koja ide kroz: počinje tačno jednu dubinu radne ploče od ugla, bez obzira gde počinje njen niz elemenata. Izrezi se mere od tog spoja.

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
