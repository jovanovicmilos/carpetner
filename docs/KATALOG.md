# Katalog gotovih elemenata i Prilagođeni element

Podaci: `fixtures/katalog.json` (32 stavke). Ekrani: biblioteka u Prostoru (`Main`), **Prilagođeni element** (`design/Konfigurator.dc.html`), Admin → tab „Katalog elemenata" (`design/Biblioteka.dc.html`).

## Princip
Postoji **jedan parametarski element**. Gotov element iz kataloga je samo podrazumevana konfiguracija (vrsta, mere, redovi fronte, unutrašnjost). Prilagođeni element je ista konfiguracija sa svim podešavanjima. Šablon radionice („Moji šabloni") je sačuvana konfiguracija (`element_templates`). Zato se katalog širi bez novog koda.

## Biblioteka u Prostoru (levi panel, 240 px)
Redom odozgo:
1. Naslov „Biblioteka" + ‹ (sakrij).
2. Tabovi **Elementi | Prepreke** (segment, visina 34).
3. Pretraga (filtrira po nazivu i grupi; prazno stanje: „Nema stavke za „…". … napravi prilagođeni element").
4. (Elementi) dugme **„+ Prilagođeni element"** (isprekidana ivica `#B4440E`, pozadina `#FFF8F3`) → Konfigurator.
5. (Elementi) **„Ručke u projektu"** — select sa 4 načina (`docs/OTVARANJE.md`).
6. Uputstvo: sa izabranim zidom „Klik dodaje element na Zid A na prvo slobodno mesto…", bez zida „Izaberi zid (klik na plan) pa klikni element…".
7. Grupe (naslov velikim slovima + broj stavki + „i"): Moji šabloni · Donji 13 · Gornji 7 · Visoki 9 · Završni 2. Kartice 2 u redu, min visina 96: sličica fronte (visina 34 donji / 30 gornji / 50 visoki, u razmeri), naziv 12px, širina mono 11px.

### Klik na karticu = dodaj (quickAdd)
- Ciljni zid: izabrani zid → zid izabranog elementa/prepreke → poslednji zid na koji je nešto dodato → inače „naoružaj" stavku (uputstvo gore: „Klikni na zid na koji ide …").
- Strana zida: strana postojećih elemenata istog sloja na tom zidu, inače +1.
- Pozicija: prvi razmak od početka zida (unutrašnja dužina) u koji staje širina, preskačući elemente sa kojima se sudara po sloju (donji/gornji/visoki; visoki se sudara sa svima).
- Ako nema mesta: stavka ostaje naoružana, uputstvo „Na zidu A nema 600 mm slobodno — klikni na drugi zid ili smanji susedni element."
- Posle dodavanja element je izabran (traka akcija + panel mera).
- Prevlačenje radi kao ranije (tačno mesto i strana).
- Tab Prepreke: klik naoruža, pa klik na zid (kao ranije).

### Sličica fronte
Generiše se iz redova fronte (`front`) i važećeg načina otvaranja: ploča `#EFE9DE` sa ivicom, aparat taman (`#2B2A28`), staklo `#D6E3F5`, otvoreno/unutrašnje fioke isprekidano, ručke tamne (šipka, tačka za dugme, linija za profil, ništa za pritisak). Ista funkcija crta i veću sliku u panelu mera i u Adminu (`frontThumb` u `Main.dc.html`).

## Panel mera elementa (dopuna)
Iznad polja: sličica fronte (visina 84, visoki 150). „Vrsta" je **select** sa svim elementima istog sloja iz kataloga (menja vrstu na istom mestu i širini). Novo polje **„Ručke i otvaranje"**: „Kao projekat (Profil)" + 4 načina.

## Prilagođeni element (`Konfigurator`)
Zaglavlje projekta (aktivno „4 Elementi"), traka: „← Prostor", naslov + „i", sažetak u mono („Donji 600 × 720 × 560 · 3 reda · Kao projekat (profil)"), desno „Sačuvaj kao šablon" (dijalog sa nazivom → toast „„…" je sačuvan u Moji šabloni") i „Dodaj u prostor".

| Kolona | Sadržaj |
|---|---|
| Levo 380 px (skrol) | **1 Osnova**: Donji / Gornji / Visoki (menja podrazumevane mere i redove), Širina / Visina / Dubina, brze širine, napomena o sokli · **2 Fronta**: brzi rasporedi po vrsti, redovi (broj, vrsta: Krilo / 2 krila / Fioka / Aparat (otvor) / Staklo (vitrina) / Otvoreno, visina mm ili prazno = ostatak sa „auto N", gore/dole/ukloni), „+ Dodaj red", šarke za 1 krilo Levo/Desno · **3 Unutrašnjost**: Police i Unutrašnje fioke (−/+), Leđa (u žlebu / na preklop) · **4 Ručke i otvaranje**: 5 kartica (Kao projekat preko cele širine + 4 načina), razmak šipke, objašnjenje za profil/pritisak, boja · **5 Materijali**: Korpus, Fronta, Kant fronte (kvadratić boje) |
| Sredina | crtež spreda u mm: korpus, sokla, fronte u boji materijala, aparati tamni, staklo, otvoreno, isprekidani trougao šarki (vrh na strani šarki), ručke u boji ručke, kote (`#B4440E`, tekst `#7C2D0A`): širina dole, visina i sokla desno, visine redova levo. Gore desno upozorenja (zbir redova > visine, fioka < 110, krilo > 600) ili „Konstrukcija je u redu" |
| Desno 360 px | **Krojna lista elementa** (Deo + materijal/kant, Kom, Mera duža × kraća) i **Okov** (stavke zavisne od otvaranja istaknute) |

Formule (ploča 18, HDF 3, zazor 3; moraju dati `fixtures/konfigurator-primer.json`):
- Stranica 2 × H × D; Dno (W − 36) × D; donji: Veza gore 2 × (W − 36) × 100, gornji/visoki: Plafon (W − 36) × D
- Polica n × (W − 38) × (D − 20); Leđa u žlebu (W − 22) × (H − 22), na preklop (W − 4) × (H − 4)
- Red visine h: fronta (W − 3) × (h − 3 − profil); 2 krila: 2 × ((W − 6) / 2) × (h − 3 − profil); aparat: „Maska aparata" iste mere; otvoreno: bez fronte; staklo: alu ram (okov)
- Fioka (i unutrašnja): Dno fioke (W − 76) × (D − 60), Leđa fioke (W − 123) × 120
- Okov: šarke po krilu (≤ 900: 2, ≤ 1600: 3, više: 4), vođice 1 par po fioci, nogice 4 (W ≥ 800: 6) ili nosači gornjeg 2, nosači police 4 po polici, konfirmat/tipl 8 (donji) / 4, + stavke iz `docs/OTVARANJE.md`

**Uređivanje postojećeg elementa (korisnik 2026-11-25):** svaki element iz kuhinje (i Brzi start / primer) otvara se u Konfiguratoru: `/prilagodjeni?element=ID`. Klasičan element (krila, fioke, rerna, ugaoni, frižider) prevodi se u redove fronte (engine `asRows`: red = fronta + 4; rerna = niša `oven60` + fioke dole; visoki = gornje krilo + krilo frižidera; ugaoni = red „Ugaono krilo (slepi deo + maska)" `doorBlind`); MSP fronta i filer se ne otvaraju. „Sačuvaj izmene" upisuje redove u element. Ulazi: Prostor — **dvoklik na element**, olovka u traci akcija, desni klik „Uredi u konfiguratoru" (`&iz=prostor`: „←" i čuvanje vraćaju u Prostor); stranica elementa — „Uredi u konfiguratoru" (vraća na element). Stepper „Police" se zove „Fahovi".

**Sredina — tabovi „Spreda" / „3D" (korisnik 2026-11-25):** 3D je nacrt elementa sam (bez zidova i radne ploče), sklopljen; dugmad dole desno „Otvori" / „Zatvori" i „Rasklopi" / „Sklopi" (animirano, `docs/3D.md` „Rasklopi and Otvori"); klik na dasku označi njen red u krojnoj listi desno i obrnuto. Ista 3D kartica je i na stranici elementa (tabovi „Crtež" / „3D").

Ovo su pravila prikaza u konfiguratoru; konačna krojna lista ide kroz `generateParts` sa pravilima radionice (`docs/KONSTRUKCIJA.md`, smer šare, umanjenje za kant). Za podrazumevana pravila rezultati moraju biti isti.

## Admin → Katalog elemenata
Kartice po grupama (sličica, naziv, Š × V × D, kvačica „U biblioteci"). Sakrivena stavka: isprekidana ivica, providnost 0,7, ne pojavljuje se u biblioteci Prostora.
