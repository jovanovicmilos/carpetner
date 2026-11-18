# 2D editor prostora (drag & drop)

Ekran: `design/Main.dc.html`. Radi kao prototip: u njegovom `<script>` delu je kompletna logika (geometrija, lepljenje, kolizije, crtanje zidova), pa je koristi kao referencu za `apps/web` i `packages/engine`.

## Raspored ekrana
- Traka alata: režim **Izaberi i pomeri** / **Crtaj zidove**, Mreža 50 mm, Pravi uglovi, Gornji elementi (prikaži/sakrij), Poništi, **Novi prazan prostor**, Učitaj primer, Brzi start.
- Levo: **biblioteka** po grupama: Donji, Gornji i visoki, Otvori i prepreke (prozor, vrata, radijator, stub, kanal), Instalacije (voda, odvod, struja, gas). Svaka stavka ima ikonu u razmeri.
- Sredina: plan sa mrežom, traka sa uputstvom za trenutni režim, statusna traka (broj stavki, koordinate kursora).
- Desno: svojstva izabranog (zid / element / prepreka) ili pregled prostora, plus **Provera** sa upozorenjima.

## Interakcije
| Radnja | Ponašanje |
|---|---|
| Novi prazan prostor | briše sve (ima Poništi) i uključuje crtanje zidova; prazno stanje prikazuje 3 koraka |
| Crtanje zidova | klik po klik po uglovima; „Pravi uglovi" ograničava na 0/90°; lepljenje za mrežu 50 mm i za postojeće uglove (< 200 mm); klik na prvi ugao zatvara prostoriju; dupli klik ili „Završi zid" prekida; dok se crta, vidi se dužina |
| Prevlačenje iz biblioteke (HTML5 DnD) | „duh" elementa se lepi uz najbliži zid (< 1500 mm) na stranu na kojoj je kursor; pozicija se zaokružuje na 50 mm; lepi se uz susede (< 150 mm); ostaje u unutrašnjoj dužini zida |
| Dodir/klik na stavku pa na plan | isto kao prevlačenje (tablet, telefon) |
| Pomeranje elementa | prevlačenje duž zida ili na drugi zid (pointer events + pointer capture); pomeraj > 40 mm = drag, inače izbor |
| Prepreke | prozor/vrata/radijator i instalacije se lepe na zid; stub i kanal se slobodno postavljaju u prostor |
| Svojstva zida | dužina (unutrašnja mera) i debljina; promena dužine pomera susedni zid paralelno, pa uglovi ostaju pravi |
| Svojstva elementa | širina (polje + brzi izbor 300…1000), „od početka zida", **otvaranje: levo / desno / 2 krila / bez** (crta se otvoreno krilo pod 45° ispred elementa), druga strana zida, dupliraj pored, obriši, link na konstrukciju |
| Polja za unos | čuvaju se na Enter ili kad polje izgubi fokus; prikaz i unos u mm ili cm |
| Poništi | istorija promena (60 koraka) |

## Geometrija
- Zid: `a`, `b` (osa zida), `th` (debljina). Element: `wall`, `t` (pomeraj duž ose od `a`), `side` (+1 / −1 = strana normale), `w`.
- Element počinje na licu zida: pomeraj po normali `th/2`, dubina iz tipa (donji 560, gornji 320, visoki 560).
- **Unutrašnja dužina** = osa − `th/2` na svakom kraju koji je spojen sa drugim zidom. Kote, polja i „od početka zida" koriste unutrašnju meru, kao što stolar meri metrom.
- Slojevi: donji, gornji i visoki. Donji i gornji se ne sudaraju; visoki se sudara sa oba.

## Provere (upozorenja, nikad ne blokiraju)
- elementi se preklapaju (AABB, isti sloj);
- stub/kanal se preklapa sa elementom;
- element zaklanja vrata; gornji/visoki element ide preko prozora; donji element je ispred radijatora;
- voda/odvod nemaju element ispred ili nisu iza sudopere.

## Implementacija u pravoj aplikaciji
- Plan u SVG-u (viewBox u mm) sa pan/zoom (točkić, dva prsta), umesto fiksnog prikaza iz prototipa.
- Prečice na tastaturi: V (izaberi), W (zid), Esc (prekini), Delete, Ctrl+Z / Ctrl+Shift+Z, strelice (pomeraj 10 mm, sa Shift 50 mm).
- Zid se može podeliti (dodaj tačku) i povući za ugao; ugao koji nije 90° se unosi brojem.
- Model posle svake izmene ide u engine (krojna lista, 3D, cena se odmah osvežavaju).
