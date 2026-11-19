# 2D editor prostora (drag & drop)

Ekran: `design/Main.dc.html`. Radi kao prototip: u njegovom `<script>` delu je kompletna logika (geometrija, lepljenje, kolizije, crtanje zidova), pa je koristi kao referencu za `apps/web` i `packages/engine`.

## Raspored ekrana
**Aplikacija preko celog ekrana, strana se nikad ne skroluje** (`height: 100vh; overflow: hidden`). Plan je uvek vidljiv i staje u slobodan prostor u razmeri 4:3 (`container-type: size`, širina `min(100cqw, 100cqh·4/3)`). **Nema trake alata ispod zaglavlja, nema stalnog desnog panela ni statusne trake** — sve kontrole plutaju nad planom, pa plan dobija ceo prostor između biblioteke i desne ivice.

Elementi ekrana (svi nad planom, `position: absolute` u kontejneru plana, 8 px od ivice, bele kartice sa senkom `0 4px 14px rgba(28,27,25,.10)`, radijus 10):

| Mesto | Šta | Detalji |
|---|---|---|
| levo | **Biblioteka** 240 px (jedini stalni panel) | zaglavlje „Biblioteka" + dugme ‹ koje je sakriva; kad je sakrivena, u traci alata se pojavi ikonica biblioteke kao prvo dugme |
| gore levo | **Traka alata (ikonice 36×36)** | Izaberi i pomeri (V) · Crtaj zidove (W) · \| · Poništi (Ctrl+Z) · \| · Mreža 50 mm · Pravi uglovi · Gornji elementi · Legenda · „i". Uključeni prekidači: pozadina `#FBE3D3`, ikona `#7C2D0A`, unutrašnja ivica `#E2804D`; aktivan režim: crna pozadina, bela ikona. Svaka ikonica ima tamni tooltip ispod sa nazivom i prečicom (`data-tip`, uvek uključen — to je naziv dugmeta, ne „Pomoć") |
| gore u sredini | **Traka uputstva** (samo u režimu crtanja zidova ili postavljanja iz biblioteke) | narandžasta pilula: naslov + uputstvo, „Završi zid" (dok se crta) i „Gotovo / Otkaži · Esc" |
| gore desno | **⋯ Projekat** | meni: Uklopi prikaz · Brzi start · Učitaj primer · — · Novi prazan prostor |
| desno (samo kad je nešto izabrano) | **Panel mera** 300 px, plutajući (top 60, max visina 100 % − 124 px, svoj skrol) | natpis „Izabrano · …", naslov, × (sakriva panel, izbor ostaje; Enter ili dugme „Mere" ga vraća). Sadržaj: polja mera, vrsta, širine, otvaranje, instalacije iza, „Konstrukcija i krojna lista" / „Pogled na zid i instalacije". **Bez dugmadi Obriši/Dupliraj/Druga strana** — ona su u traci akcija i meniju |
| iznad izabranog | **Traka akcija** (tamna, `#1C1B19`, radijus 10) | prati element pri zumu/pomeranju (pozicija u % plana), iznad elementa, a ispod njega ako je element uz gornju ivicu; sakriva se dok se vuče i dok je otvoren meni. Vidi tabelu ispod |
| dole levo | **Provera** (čip) | zeleni „✓ Sve je u redu" ili narandžasti „! N upozorenja"; klik otvara karticu: upozorenja (klik na upozorenje bira element i otvara mere), 4 brojke (zidova, donjih, gornjih, radna ploča), zbir stavki |
| dole u sredini | koordinate kursora + (kad je Pomoć uključena) „Desni klik: opcije · Del: obriši · Ctrl+Z: poništi · Esc: otkaži" | bez pozadinske trake, `pointer-events: none` |
| dole desno | **Zum** − % + Uklopi | kao ranije |

Ispod 900 px: biblioteka je traka gore (max 150 px); panel mera ide preko donje polovine plana (levo/desno 8 px, max 48 %).

**Biblioteka**: tabovi Elementi | Prepreke, pretraga, „+ Prilagođeni element", „Ručke u projektu", katalog gotovih elemenata (klik = dodaj na izabrani zid na prvo slobodno mesto). Sve detalje vidi **`docs/KATALOG.md`**. Tab Prepreke ima iste grupe kao ranije:
  - **Otvori i prepreke**: prozor, vrata, radijator, **dimnjak** (uz zid: širina × dubina × visina, podrazumevano 500 × 400 do plafona 2600; na planu šrafiran 135°, natpis „Dimnjak“), stub, kanal, **ostalo** (slobodna prepreka sa nazivom);
  - **Instalacije**: voda V, odvod O, struja S (230 V), **trofazna T (400 V, #A15C00)**, gas G.

### Traka akcija (iznad izabranog)
| Izabrano | Dugmad (redom) |
|---|---|
| element | oznaka „D2 · Sudopera 800" · **otvaranje** (ikonica krila + L/D/2/–, klik kruži levo → desno → 2 krila → bez; samo za elemente sa vratima) · druga strana zida (F) · dupliraj pored (Ctrl+D) · \| · mere i vrsta (Enter; uključeno dok je panel otvoren) · konstrukcija i krojna lista (link) · ⋯ još opcija (otvara isti meni kao desni klik) · \| · **obriši** (crvena ikona) |
| zid | oznaka „Zid A · 3200" · dužina i debljina · pogled na zid i instalacije (link) · ⋯ · \| · obriši zid i sve na njemu |
| prepreka / instalacija | oznaka · mere i položaj · do plafona (dimnjak, stub, kanal, ostalo) · ⋯ · \| · obriši |

### Meni na desni klik (dug dodir 550 ms na tabletu)
Bela kartica 256 px, pojavljuje se na mestu kursora i okreće se levo/gore ako ne staje u plan. Naslov sive velike slova (npr. „D2 · SUDOPERA 800"), stavke 36 px sa ikonom, tekstom i prečicom desno. Desni klik takođe **bira** stavku.

| Na čemu | Stavke |
|---|---|
| element | segment **Otvaranje (gledano spreda): Levo / Desno / 2 krila / Bez** (samo elementi sa krilima) · segment **Ručke: Šipka / Dugme / Profil / Pritisak** (naslov „Ručke (kao projekat)“ dok element prati projekat) · Mere i vrsta `Enter` · Dupliraj pored `Ctrl+D` · Druga strana zida `F` · Konstrukcija i krojna lista · — · **Obriši element** `Del` (crveno) |
| zid | Dužina i debljina `Enter` · Pogled na zid i instalacije · Nastavi zid od ovog ugla `W` · — · Obriši zid i sve na njemu `Del` |
| prepreka | Mere i položaj (instalacija: Visina od poda) `Enter` · Do plafona (2600) · Pogled na zid i instalacije · — · Obriši `Del` |
| prazan deo plana | Crtaj zid odavde `W` · Uklopi prikaz · Poništi `Ctrl+Z` · — · Sakrij/Prikaži gornje elemente · Legenda plana |

U režimu crtanja zidova desni klik završava trenutni zid (ili izlazi iz režima); dok se postavlja stavka iz biblioteke, desni klik otkazuje. Meni se zatvara na klik van njega, Esc, točkić i posle svake akcije.

### Tastatura (fokus na planu; ne radi dok se kuca u polje)
| Taster | Radnja |
|---|---|
| Delete / Backspace | obriši izabrano |
| Ctrl/Cmd + Z | poništi |
| Ctrl/Cmd + D | dupliraj pored |
| F | druga strana zida |
| ← → ↑ ↓ | pomeri izabrano 10 mm duž zida (Shift = 50 mm); slobodne prepreke po X/Y |
| Enter | otvori panel mera |
| V / W | izaberi i pomeri / crtaj zidove |
| Esc | zatvori meni/popover → prekini zid → izađi iz režima → poništi izbor |

Kontejner plana ima `tabindex="0"` i dobija fokus na klik po planu; prečice se vezuju za njega, ne za `window`.

## Interakcije
| Radnja | Ponašanje |
|---|---|
| Novi prazan prostor | briše sve (ima Poništi) i uključuje crtanje zidova; prazno stanje prikazuje 3 koraka |
| Crtanje zidova | klik po klik po uglovima; „Pravi uglovi" ograničava na 0/90°; lepljenje za mrežu 50 mm i za postojeće uglove (< 200 mm); klik na prvi ugao zatvara prostoriju; dupli klik, desni klik ili „Završi zid" prekida; dok se crta, vidi se dužina |
| Prevlačenje iz biblioteke (HTML5 DnD) | „duh" elementa se lepi uz najbliži zid (< 1500 mm) na stranu na kojoj je kursor; pozicija se zaokružuje na 50 mm; lepi se uz susede (< 150 mm); ostaje u unutrašnjoj dužini zida |
| Dodir/klik na stavku pa na plan | isto kao prevlačenje (tablet, telefon) |
| Pomeranje elementa | prevlačenje duž zida ili na drugi zid (pointer events + pointer capture); pomeraj > 40 mm = drag, inače izbor. Pointer capture se uzima tek kad pomeraj pređe 40 mm (inače `click` ode na plan i poništi izbor) |
| Prepreke | prozor/vrata/radijator i instalacije se lepe na zid; stub i kanal se slobodno postavljaju u prostor |
| Svojstva zida | dužina (unutrašnja mera) i debljina; promena dužine pomera susedni zid paralelno, pa uglovi ostaju pravi |
| Panel mera elementa | širina (polje + brzi izbor 300…1000), „od početka zida", **otvaranje: levo / desno / 2 krila / bez** (crta se otvoreno krilo pod 45° ispred elementa), instalacije iza, link na konstrukciju. Dupliraj / druga strana / obriši: traka akcija, meni, tastatura |
| Vrsta elementa | u svojstvima elementa: dugmad Donji / Sudopera / Fiokar / Rerna / MSP / Ugaoni / Filer (za gornji i visoki samo ta vrsta). Promena zadržava mesto i širinu; strana šarki se vraća na podrazumevanu. Sve ostale mere: ekran Element |
| Svojstva prepreke | od početka zida (uz zid), širina, **dubina** (radijator, dimnjak, stub, kanal, ostalo), visina, **naziv** (ostalo), dugme „Do plafona (2600)“ |
| Panel mera zida | dužina, debljina, dugme **„Pogled na zid i instalacije →“** (otvara ekran Pogled na zid za taj zid). Brisanje: traka akcija / meni / Delete |
| Polja za unos | čuvaju se na Enter ili kad polje izgubi fokus; prikaz i unos u mm ili cm |
| Poništi | istorija promena (60 koraka) |
| Zum i pomeranje plana | točkić = zum oko kursora; dugmad −/+ i „Uklopi" (dole desno, prikazan %); prevlačenje praznog dela plana (ili srednjim tasterom u bilo kom režimu) pomera pogled; mreža od 500 mm prati zum |

## Geometrija
- Zid: `a`, `b` (osa zida), `th` (debljina). Element: `wall`, `t` (pomeraj duž ose od `a`), `side` (+1 / −1 = strana normale), `w`.
- Element počinje na licu zida: pomeraj po normali `th/2`, dubina iz tipa (donji 560, gornji 320, visoki 560).
- **Unutrašnja dužina** = osa − `th/2` na svakom kraju koji je spojen sa drugim zidom. Kote, polja i „od početka zida" koriste unutrašnju meru, kao što stolar meri metrom.
- Slojevi: donji, gornji i visoki. Donji i gornji se ne sudaraju; visoki se sudara sa oba.

## Provere (upozorenja, nikad ne blokiraju)
- elementi se preklapaju (AABB, isti sloj);
- stub, kanal, ostalo ili dimnjak se preklapa sa elementom (gornji se ne proveravaju ako je prepreka niža od 1450);
- element zaklanja vrata; gornji/visoki element ide preko prozora; donji element je ispred radijatora;
- voda/odvod nemaju element ispred ili nisu iza sudopere.

## Implementacija u pravoj aplikaciji
- Plan u SVG-u (viewBox u mm); zum i pomeranje kao u prototipu, plus dva prsta na tabletu.
- Prečice na tastaturi: V (izaberi), W (zid), Esc (prekini), Delete, Ctrl+Z / Ctrl+Shift+Z, strelice (pomeraj 10 mm, sa Shift 50 mm).
- Zid se može podeliti (dodaj tačku) i povući za ugao; ugao koji nije 90° se unosi brojem.
- Model posle svake izmene ide u engine (krojna lista, 3D, cena se odmah osvežavaju).
