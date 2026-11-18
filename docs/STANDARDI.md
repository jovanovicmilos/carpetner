# Podrazumevane mere i standardi

Radionica bira izvor podrazumevanih mera (Admin → Podrazumevane mere). Projekat može da ga promeni.

| Preset | Ponašanje |
|---|---|
| `en1116` | vrednosti po EN 1116:2018, polja popunjena, zaključana u podešavanjima (u elementu se mogu menjati) |
| `iso3055` | ISO 3055:2021 — pokriva iste koordinacione mere; dok se ne potvrde vrednosti iz teksta standarda, koristi iste kao `en1116` |
| `workshop` | mere radionice (uređuje vlasnik) |
| `none` | forme ostaju prazne; element nije validan dok se ne popune obavezna polja |

Granice (min/max) se UVEK koriste za upozorenja (opciono i kad je preset `none`), nikad ne blokiraju.

## Vrednosti (sažetak EN 1116:2018 — potvrditi iz zvaničnog teksta pre objave)
| Ključ | EN 1116 default | Radionica (primer) | Granica |
|---|---|---|---|
| `worktopTopHeight` | 900 | 858 | 850 / 900 / 950 (tolerancija +50) |
| `worktopDepth` | 600 | 600 | ≥ 600 |
| `worktopOverhang` | 20 | 40 | ≤ 30 |
| `plinthHeight` | 100 | 100 | ≥ 80 |
| `worktopThickness` | 38 | 38 | — |
| `baseCarcassHeight` | izvedeno: `worktopTopHeight − plinthHeight − worktopThickness` (762) | 720 | — |
| `baseCarcassDepth` | 560 | 560 | ≥ 550 (ispod radne 600) |
| `worktopToWallUnit` | 550 | 592 | ≥ 450 |
| `wallUnitDepth` | 320 | 320 | 310 – 400 (ukupno) |
| `unitWidthSuggestions` | 400, 500, 600, 900 | 300…1000 | nominalne širine |
| `builtUnderRecessHeight` | 820 / 870 / 920 | — | min. visina niše za aparat ispod radne |

Napomena: EN 1116 ne važi za komercijalne kuhinje (restorani, hoteli).
