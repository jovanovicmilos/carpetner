# UI pravila: raspored ekrana i pomoć

## Dve vrste ekrana
| Vrsta | Ekrani | Pravilo |
|---|---|---|
| **Radni (fiksni)** — svuda gde je 2D/3D prikaz ili crtež | Brzi start, AI iz slike, 2D editor (Prostor), Pogled na zid, 3D, Element, Tehnički nacrti | Ekran nikad ne skroluje (`height: 100vh; overflow: hidden`). Zaglavlje i traka alata su fiksni; crtež/plan/3D uvek vidljiv i prilagođava se prozoru; bočni paneli (biblioteka, svojstva, liste) imaju svoj skrol. Na Element ekranu: levo crtež i pravila, desno krojna lista i okov, svaka kolona sa svojim skrolom. |
| **Dokumenti i sajt (skroluju)** | Krojna lista, Obračun, Poređenje pilana, admin ekrani, sajt, prijava | Obična strana koja se skroluje. |

Ispod 900 px širine radni ekrani slažu panele vertikalno: plan/crtež u sredini, paneli gore/dole sa ograničenom visinom i svojim skrolom.

Implementacija: layout komponenta `AppShell` (header + toolbar + `flex: 1; min-height: 0` telo) za radne ekrane; `PageLayout` za ostale. Plan/canvas koristi `ResizeObserver` (ili `container-type: size`) da popuni slobodan prostor.

## Sistem pomoći (objašnjenja)
- Dugme **Pomoć** u zaglavlju svakog ekrana uključuje/isključuje objašnjenja; izbor se pamti po korisniku (u bazi; u prototipu `localStorage` ključ `kroj.help`) i važi na svim ekranima.
- Kad je uključena:
  - **oznaka „i"** pored važnih kontrola, naslova i kolona; objašnjenje se pojavljuje na prelaz mišem ili fokus tastaturom (dostupno čitačima ekrana kroz `aria-label`);
  - **kartica na planu** (2D editor): prelaz preko zida, elementa ili prepreke pokazuje mere, sloj, otvaranje, instalacije iza i upozorenja;
  - **legenda simbola** (2D editor, nacrti).
- Admin → Podrazumevane mere → „Pomoć i objašnjenja": podrazumevano za radionicu (uključena za sve / samo novi korisnici prvih 14 dana / isključena), kartica na planu, legenda, vlastite napomene radionice u objašnjenjima.
- Tekstovi objašnjenja su u jednom rečniku (`i18n/sr.json`, ključ po kontroli), pa se lako menjaju i prevode.
