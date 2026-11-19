# Ručke i otvaranje

Podaci: `fixtures/otvaranje.json`. Ekrani: biblioteka Prostora („Ručke u projektu"), panel mera i meni na desni klik (po elementu), Prilagođeni element (korak 4), 3D realni prikaz, Admin → tab „Ručke i otvaranje".

## Gde se bira
1. **Projekat** — `Project.opening` (podrazumevano za nove projekte iz admina; u dizajnu „Profil na vrhu fronte").
2. **Element** — `Element.opening` (opciono). Prazno = kao projekat. U meniju na desni klik je segment „Ručke" sa 4 opcije; ako izabereš isto što ima projekat, izmena se briše (element ponovo prati projekat).
3. Sličice u katalogu i panel mera crtaju ručke po važećem izboru.

## Pravila (moraju da se poklope sa `fixtures/konfigurator-primer.json`)

| Način | Krojna lista | Okov | Bušenje (nacrti, CNC) |
|---|---|---|---|
| **Šipka** (`bar`) | bez promene | `Ručka šipka {razmak} mm` × broj fronti sa ručkom (krila + fioke + maske aparata) | 2 × Ø5. Krilo: vertikalno, 40 mm od ivice otvaranja (suprotno od šarki); donji: gornji kraj 40 mm od vrha, gornji: donji kraj 40 mm od dna, visoki: sredina. Fioka: horizontalno, centrirano, osa na min(50 mm, 30 % visine) od vrha |
| **Dugme** (`knob`) | bez promene | `Ručka dugme` × broj fronti | 1 × Ø5, u centru gde bi bila šipka |
| **Profil na vrhu** (`profile`) | svaka fronta kraća za `profileHeight` (20 mm); napomena „−20 za profil" | `Alu profil na vrhu fronte` = zbir širina fronti / 1000, zaokruženo na 0,01 m za prikaz, 0,1 m za narudžbinu | nema. Kod gornjih elemenata profil je na donjoj ivici |
| **Na pritisak** (`push`) | bez promene (zazor ostaje 3 mm, najmanje 2,5) | šarke → `Šarka 110° bez opruge`; + `Potiskivač za krilo (mehanički)` 1 kom po krilu; vođice → `Vođice fioke sa potiskivanjem` | nema rupa za ručke |
| Gola (`gola`) | — | — | **v2, ne implementirati** (menja konstrukciju korpusa) |

Fronte bez ručke u svim načinima: slepi deo ugaonog, otvoreni red, filer, bočna maska. Kipovanje (`lift`) ima ručku horizontalno na donjoj ivici (šipka/dugme) ili profil na donjoj ivici.

Šarke po krilu (svi načini): visina ≤ 900 → 2, ≤ 1600 → 3, više → 4.

U UI su stavke okova koje zavise od načina otvaranja istaknute (pozadina `#FBE3D3`, tekst `#7C2D0A`) — Prilagođeni element, desni panel „Okov".

## Boje
`inox` `#A7ADB3` · `black` (Crna mat) `#1E1E1E` · `brass` (Mesing) `#B08D57` · `front` (u boji fronte; samo šipka/dugme) · profil: Crna / Inox / Zlatna. Artikal u cenovniku: `HANDLE-BAR-{spacing}-{color}`, `HANDLE-KNOB-{color}`, `PROFILE-TOP-{color}`, `PUSH-DOOR`.
