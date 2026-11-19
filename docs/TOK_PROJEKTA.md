# Tok projekta: koraci, procenat i „nastavi gde si stao“

Ekrani: zaglavlje svih ekrana projekta (`ProjectHeader`), **Projekti** (`design/Projekti.dc.html`, početni ekran posle prijave; logo „Kroj“ u svakom zaglavlju vodi ovde). Snimci: `Projekti.png`, `Element_korak_hover.png`.

## Koraci i težine

| # | Korak | Ekran(i) | Težina | Završeno kad (sve stavke ✓) |
|---|---|---|---|---|
| 1 | Prostor | Main, Zid | 25 % | zidovi zatvoreni · bar 1 element · instalacije unete (ili označeno „nema“) · nema upozorenja u Proveri |
| 2 | Nacrti | Nacrti | 10 % | otvoreni pogledi Spreda i Odozgo i kliknuto „Pregledano“ (strane otvaranja proverene) |
| 3 | 3D | Pogled3D | 10 % | izabrani materijal fronti i radne ploče · izabrane ručke (može i podrazumevano iz projekta, uz potvrdu) |
| 4 | Elementi | Element, Konfigurator | 20 % | konstrukcija svakog elementa potvrđena (`element.confirmedAt`); delimično = potvrđeni / ukupno |
| 5 | Krojna lista | KrojnaLista, Poredjenje | 20 % | krojna lista proverena (bez grešaka) · poslata pilani ili izvezena |
| 6 | Ponuda | Obracun | 15 % | cene obračunate · ponuda poslata kupcu (prihvaćena = projekat „Završen“) |

Status koraka: `done` (sve stavke), `partial` (deo: 0 < p < 1), `todo`. Procenat projekta = Σ težina × (1 / p / 0), zaokruženo. Primer Petrović: 25 + 10 + 10 + 20 × 9/13 = **59 %**.

Status se računa iz podataka (ne čuva se ručno), osim „Pregledano“ za Nacrte i potvrda elemenata. Izmena u ranijem koraku može vratiti kasniji korak u `partial` (npr. novi element posle potvrde → Elementi 12/14) — tada korak dobija narandžastu tačku i tooltip kaže šta treba ponovo.

## Zaglavlje projekta (stepper)
Isti raspored kao ranije (grid 1fr / auto / 1fr — koraci se ne pomeraju), u sredini:
- Korak = pilula `.k-step` (padding 5px 11px 5px 5px, radijus 16, 13px, debljina 500 uvek): krug 22 px + naziv. Između koraka linija 14 × 2 px: `#E2804D` posle završenog, `#4A4743` inače.
- Krug: **završen** = `#E2804D` sa tamnom kvačicom; **u toku** = prsten `conic-gradient(#E2804D 0 p%, #6B665E p% 100%)` sa brojem u sredini; **nije započet** = obrub 1,5 px `#8A8378`, broj `#BDB6AA`.
- **Trenutni ekran**: pilula `#F3F1EC`, tekst `#1C1B19`, `aria-current="step"`. Hover ostalih: `#2E2C29`.
- Hover/fokus na koraku: kartica 230 px ispod koraka — „4 · Elementi“ + status (zeleno završeno / narandžasto u toku · 69 % / sivo nije započeto), lista uslova sa ✓ (zeleno) i ○ (sivo), „Udeo u projektu: 20 %“.
- Levo ispod imena projekta: „**59 % urađeno** · sledeće: potvrdi 4 elementa“ (12px; procenat `#E2804D`).
- Dno zaglavlja: traka napretka preko cele širine, 3 px, pozadina `#3A3835`, ispuna `#E2804D` = procenat (`role="progressbar"`).
- Pozicije (test): pri 1440 px x-levi rub koraka 405, 513, 614, 694, 811, 943 na svih 9 ekrana; pri 1280: 325, 433, 534, 614, 731, 863.

## Ekran Projekti
- Zaglavlje: logo, glavni meni (Projekti · Cenovnik · Materijali i katalog · Podešavanja), naziv radionice, Pomoć.
- Naslov „Projekti“ + „Novi projekat“ (→ Brzi start).
- **Kartica „Nastavi gde si stao“** (tamna): poslednje menjani projekat, kupac i vreme, veliki stepper, „59 % urađeno“ + traka, dugme **„Nastavi: Elementi · D2 →“** i „Sledeće: …“.
- Filteri: Svi / U toku / Na ponudi / Završeni (sa brojem), pretraga po kupcu ili nazivu, redosled (Poslednje menjano / Najviše urađeno / Po nazivu).
- Kartice projekata (mreža, min 360 px): naziv, kupac i tip, oznaka (U toku / Poslato / Završen), traka + procenat, mini stepper (tačke 18 px), „Sledeće: …“, „Menjano …“, vrednost ponude (ili „—“), dugme „Nastavi: {korak}“ (završen projekat: „Otvori“).

## „Nastavi gde si stao“ — šta se pamti
Pri svakoj promeni ekrana i svakih ~10 s rada (debounce) čuva se `Project.resume`:
```ts
interface ProjectResume {
  screen: 'Main' | 'Zid' | 'Nacrti' | 'Pogled3D' | 'Element' | 'Konfigurator' | 'KrojnaLista' | 'Poredjenje' | 'Obracun';
  label: string;                 // „Elementi · D2“ — za dugme
  selection?: { kind: 'wall' | 'element' | 'obstacle'; id: string };
  view?: { x: number; y: number; w: number };     // zum/pomeraj 2D plana
  tab?: string;                  // npr. Nacrti: 'front' | 'top' | 'worktops', 3D: 'real'
  wallId?: string;               // Zid, Nacrti spreda
  at: string;                    // ISO vreme
}
interface ProjectProgress {      // izračunava se na serveru pri čuvanju projekta (i keš u bazi za listu)
  percent: number;
  steps: { key: 'space' | 'drawings' | 'view3d' | 'elements' | 'cutlist' | 'offer'; status: 'done' | 'partial' | 'todo'; part?: number; checks: { text: string; ok: boolean }[] }[];
  next: string;                  // „potvrdi 4 elementa“
}
```
- Tabela `projects` dobija kolone `resume jsonb`, `progress jsonb`, `updated_at` (lista se sortira po njoj), `status` ('active' | 'offer_sent' | 'done' | 'archived').
- Otvaranje projekta sa liste ili „Nastavi“ → ruta iz `resume.screen` sa vraćenim izborom, zumom i tabom.
- Prijava → Projekti (ako radionica nema nijedan projekat → Brzi start).
- Bez baze (prototip) isto radi preko `localStorage` ključa `kroj.resume.{projectId}`.
