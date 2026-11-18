# Tehnički nacrti, izvoz i uvoz

Ekran: `design/Nacrti.dc.html`. Primeri pravih izvoza: `fixtures/export/` (napravio ih je `tools/export_samples.py` iz primera kuhinje), pa ih odmah otvori u AutoCAD-u ili Blender-u.

## Tri nacrta (svi iz istog modela projekta)
| Nacrt | Sadržaj |
|---|---|
| **Spreda (po zidu)** | konture zida, sokla, radna ploča, fronte sa ručkama, prozor; **smer otvaranja**: isprekidane linije se sastaju na strani šarki (MSP: nadole), fioke označene; šrafirano: slepi deo ugaonog elementa i filer; instalacije sa visinom (h500…) i oznakom izreza u leđima; lanac kota dole (elementi + ukupno), gore (gornji + prozor), desno (sokla 100, korpus 720, radna 38, razmak, gornji 720, do plafona) |
| **Odozgo (tlocrt)** | zidovi šrafirani, prozor u zidu, vrata prostorije sa krugom otvaranja, radijator, kanal; brojevi elemenata; **krila otvorena pod 45° od strane šarki** (puna linija za donje i visoke, isprekidana za gornje); fioke i MSP isprekidano; gornji elementi isprekidano; kote po zidovima i položaj vrata |
| **Radne ploče (PDT)** | kroj svake radne ploče (PDT 1, PDT 2…), spoj, kantovane ivice, izrez za sudoperu i ploču sa merom **do centra** od leve i od prednje ivice, opcioni zasek ili kosi ugao |

Isti brojevi elemenata (D1, G1, V1…) važe u nacrtima, krojnoj listi i na nalepnicama.

## Stil
- **Prezentacija**: boje, za kupca.
- **Tehnički**: crno-belo, sastavnica (projekat, nacrt, razmera, radionica, crtao, list), za radionicu i montažu.
- **Kombinovano** (podrazumevano): boje + sastavnica.
- PDF: A3, 3 lista, razmera 1:20, vektorski.

## Strana otvaranja (model)
`Element.hinge`: `'L' | 'R' | 'LR' | 'none'` (+ za fronte aparata `'down'`). Levo/desno se gleda spreda, kad se stoji ispred elementa. Podrazumevano po tipu (sudopera = 2 krila, gornji 400 = desno…), menja se u 2D editoru. Šarke u krojnoj listi/okovu i bušenje na boku idu na stranu `hinge`.

## Izvoz
| Format | Za | Napomena |
|---|---|---|
| **DXF** (2D) | AutoCAD, BricsCAD, DraftSight, LibreCAD, QCAD | mm, slojevi ispod; R12 ASCII radi svuda (`$DWGCODEPAGE ANSI_1250` zbog č/ć/š/ž/đ). U aplikaciji može i noviji DXF sa pravim DIMENSION entitetima (npr. biblioteka `@tarikjabiri/dxf`). |
| **DWG** | AutoCAD | zatvoren format: AutoCAD otvara DXF direktno; za pravi DWG treba konverzija na serveru (npr. ODA File Converter, licenca) — kasnija faza |
| **PDF / SVG** | štampa, kupac, Inkscape/Illustrator | vektorski, iz istog SVG-a kao ekran |
| **GLB (glTF 2.0)** | Blender, three.js, web, SketchUp (preko dodatka) | metri, Y gore, čvor po elementu (D1, G1…), materijali po vrsti (korpus, fronta, radna, zid…). U aplikaciji: three.js `GLTFExporter` iz iste 3D scene |
| **OBJ + MTL** | Blender, 3ds Max, Cinema 4D, SketchUp | metri, Y gore; `OBJExporter` |
| **DAE (Collada)** | SketchUp, stariji programi | `ColladaExporter` (three.js examples) ili server |
| **CSV** | pilana, optimizacija | krojna lista i kant |
| Kasnije | CNC, BXF (Blum), IFC (Revit/ArchiCAD) | delovi sa bušenjima kao zasebne konture |

### Standard slojeva (DXF)
| Sloj | Boja (ACI) | Tip linije | Sadržaj |
|---|---|---|---|
| ZIDOVI / KONTURA | 7 | puna | zidovi, kontura zida u pogledu |
| OTVORI | 4 | puna | prozori, vrata, krug otvaranja |
| ELEMENTI_DONJI | 7 | puna | korpusi donjih |
| ELEMENTI_GORNJI | 30 | DASHED | gornji u tlocrtu |
| ELEMENTI_VISOKI | 8 | puna | visoki |
| FRONTE | 7 | puna | fronte u pogledu |
| OTVARANJE | 6 | puna (tlocrt) / DASHED (pogled) | smer otvaranja |
| RADNA_PLOCA | 2 | puna | radne ploče i izrezi |
| INSTALACIJE | 5 | puna | voda, odvod, struja, gas, izrezi |
| KOTE | 3 | puna | kote |
| TEKST | 7 | — | brojevi i natpisi |

Koordinate u DXF-u: tlocrt X desno, Y gore (u modelu je Y „u prostoriju", pa se pri izvozu obrće); pogled X duž zida, Y visina od poda.

## Uvoz
- **Plan stana kao podloga** (DXF, ili PDF/slika uz kalibraciju jednom merom): postavlja se ispod 2D editora 1:1; zidovi se crtaju preko njega (lepljenje za linije podloge) ili se predlažu iz slojeva (AI ili prepoznavanje pravih linija → predlog na proveru).
- Kasnije: uvoz GLB/OBJ aparata ili dekora za 3D prikaz.
