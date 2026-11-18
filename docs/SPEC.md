# Kroj — specifikacija proizvoda

## Cilj
Specijalizovan alat za stolare (male i veće radionice), ne opšti 3D program. Od mere prostora do krojne liste, cene i narudžbine — bez prepisivanja.

## Korisnici i uloge
| Uloga | Šta radi |
|---|---|
| Vlasnik radionice (admin organizacije) | cenovnik, podrazumevane mere, pravila konstrukcije, šabloni, dobavljači, zaposleni, pretplata |
| Majstor / projektant | projekti, crtanje, elementi, krojna lista, slanje pilani |
| Platform admin (mi) | radionice, pretplate, globalni katalog okova i materijala |
| (kasnije) Partner pilana | održava svoj cenovnik u Kroju, prima narudžbine |

## Ekrani (dizajn u `design/`)
| # | Fajl | Ekran | Ključno |
|---|---|---|---|
| 1 | `Main.dc.html` | Prostor — 2D editor | prazan prostor ili primer; ručno crtanje zidova (pravi uglovi, mreža 50 mm, zatvaranje prostorije); prepreke (prozor, vrata, radijator, stub, kanal) i instalacije; drag & drop elemenata iz biblioteke sa lepljenjem uz zid i susede; pomeranje prevlačenjem; svojstva; provera kolizija; poništi. Detalji: `docs/EDITOR_2D.md` |
| 2 | `Zid.dc.html` | Pogled na zid | elevacija sa donjim/gornjim elementima, prozorom, kotama visina; tabela instalacija; automatska provera (npr. voda/odvod iza sudopere, utičnica iza MSP) |
| 3 | `Pogled3D.dc.html` | 3D | orbit/pan/zoom, puno/providno, sloj instalacija, slojevi, materijali, snimak PNG |
| 4 | `Element.dc.html` | Element | pravila konstrukcije (spoj, dno, leđa, fuga, kant), crtež spreda + presek, krojna lista elementa sa „mera za sečenje", okov elementa, nalepnice |
| 5 | `KrojnaLista.dc.html` | Krojna lista projekta | grupisano po materijalu, spajanje istovetnih delova, mm/cm, kant notacija, zbir ploča, kant metraža, okov i repro, tehnika i niše, raspored krojenja, slanje |
| 6 | `Obracun.dc.html` | Obračun i ponuda | ploče, radne ploče, sečenje, kantovanje, okov, rad, marža, PDV → PDF ponuda kupcu |
| 7 | `Poredjenje.dc.html` | Poređenje pilana | ista krojna lista po cenovniku više firmi, najjeftinija stavka, najbolja kombinacija, izvoz poređenja |
| — | `Sajt.dc.html` | Javni sajt | hero, funkcije, paketi (Start / Radionica / Pogon), mesečno/godišnje |
| ★ | `BrziStart.dc.html` | Brzi start | oblik → zidovi → voda/struja/prozor → opcije → automatski složena kuhinja; odmah krojna lista ili cena |
| — | `Prijava.dc.html` | Prijava / registracija radionice | e-pošta+lozinka, Google, pozivnica u radionicu |
| — | `Cenovnik.dc.html` | Admin — cenovnik | ploče, kant i usluge pilane, okov, rad, marža/PDV, uvoz Excel/CSV |
| — | `Standardi.dc.html` | Admin — podrazumevane mere | preset EN 1116 / ISO 3055 / radionica / prazno, granice i upozorenja |
| 0 | `AIPredlog.dc.html` | AI predlog iz fotografije | slika prostora/kuhinje → predlog zidova, instalacija, elemenata sa sigurnošću; jedna mera metrom obavezna; Prihvati/Izmeni po stavci; „Preskoči AI" |
| — | `AIPodesavanja.dc.html` | Admin — AI asistent | uključi/isključi AI; način: Kroj u Claude-u (konektor) / Kroj krediti / sopstveni API ključ; predefinisani zadaci |

## Funkcionalni zahtevi

### Prostor
- Zid: dužina, visina, debljina, ugao prema prethodnom (podrazumevano 90°). L, U, ravna kuhinja.
- Otvor: tip (prozor/vrata), od ugla, širina, visina, parapet.
- Instalacija: tip (`water` | `drain` | `power` | `power400` | `gas`), zid, od ugla (mm), visina od poda (mm), prečnik (opciono).
- Element se kači na zid (`wallId`, `offset` od ugla). Ugaoni element zauzima ugao i definiše početak susednog zida.

### Elementi
- Tipovi: `base` (donji), `wall` (gornji), `tall` (visoki), `corner-blind` (slepi ugao), `sink` (sudopera), `drawer` (fiokar), `appliance-front` (samo fronta, npr. MSP), `filler` (filer).
- Parametri (sa podrazumevanim iz preseta): širina, visina korpusa, dubina, nogice, fronte (vrata 1/2, fioke N sa visinama), police, materijali (korpus, fronte, leđa), kant.
- Instalacija iza elementa → automatski izrez u leđima (pravougaonik koji obuhvata instalacije + 50 mm), napomena u krojnoj listi.

### Krojna lista
- Po elementu i zbirno; grupisanje po materijalu; spajanje istovetnih delova (isti materijal, mere, kant, napomena) sa listom elemenata.
- Kolone: poz., deo, materijal, kom, dužina, širina, kant (notacija `1D`, `2D 2K`, debljina), mera za sečenje, napomena.
- Dužina = smer šare (godova) za dekore sa šarom.
- Jedinice mm/cm (cm sa jednom decimalom, zarez).
- Zbir: m² po materijalu, broj ploča (format ploče, % otpada, zaokruživanje), kant metraža po tipu (+10%).
- Izvoz: CSV za pilanu, XLSX, PDF, nalepnice (QR po delu, kasnije).

### Okov i repro
Pravila u `KONSTRUKCIJA.md`. Okov iz kataloga (globalni + radionica).

### Obračun
- `cena = Σ ploče + radne ploče + sečenje (m reza) + kantovanje (m po tipu) + okov + rad (po elementu + montaža) + marža (% na materijal i okov) + PDV`.
- Cene zamrznute u ponudi; pri promeni cenovnika ponuditi „Preračunaj".

### Poređenje dobavljača
- Svaki dobavljač ima svoj cenovnik (uvoz CSV/XLSX ili partnerski nalog).
- Ista krojna lista → obračun po svakom; označi minimum po stavci i ukupno; predlog podele narudžbine kada ušteda > dodatna dostava.
- Mapiranje dekora: ako dekor ne postoji kod dobavljača → upozorenje + najbliži (ručno potvrditi).

### Nalog, organizacija, pretplata
- Organizacija (radionica) → korisnici sa ulogama; RLS po `organization_id`.
- Paketi: Start (1 korisnik, ograničen broj projekata), Radionica (do 3 korisnika, cenovnik, slanje, optimizacija), Pogon (neograničeno, CNC izvoz, magacin ostataka, API). Cene paketa još nisu određene.
- 14 dana probe.

## Van MVP-a (kasnije)
- Optimizacija krojenja (guillotine nesting) i magacin ostataka
- BXF (Blum) / DXF / CNC izvoz
- Katalog aparata sa merama niša
- Partner portal za pilane, slanje upita i odgovora
- Ponuda sa 3D renderom
