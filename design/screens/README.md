# Referentni ekrani

Otvori `index.html` dvoklikom. Svaki ekran radi samostalno, bez servera (fontovi se učitavaju sa Google Fonts kad ima interneta).

- `<Ekran>.html` — radni ekran; u izvoru: `dc-template` (markup), `dc-logic` (logika)
- `<Ekran>.png` — snimak (dodatno: `Element_korak_hover`, `Main_prepreke`, `Main_rucke_sipka`, `Pogled3D_tehnicki`, `Pogled3D_vece`, `Pogled3D_slika`, `Konfigurator_pritisak`, `Konfigurator_visoki`, `Biblioteka_rucke`, `Biblioteka_aparati`, `Biblioteka_katalog`, `Main_prazan`, `Main_izabrano`, `Main_desni_klik`, `Main_provera`, `Main_bez_pomoci`, `Nacrti_odozgo`, `Nacrti_radne_ploce`, `Nacrti_tehnicki`)
- `<Ekran>.layout.json` — izmereni regioni i kontrole
- `tokens-usage.json` — stvarno korišćene boje, fontovi, radijusi, ivice
- `dc-lite.js` — runtime za ove reference (nije deo aplikacije)

Pravila prenosa: `../DESIGN_SPEC.md`.
