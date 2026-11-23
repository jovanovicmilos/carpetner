# UI: Tailwind CSS v4 + shadcn/ui (Radix) u Kroj stilu

> **2026-11-23: zamenjeno sa `docs/SHADCN_EVERYWHERE.md`** — stock shadcn veličine svuda u aplikaciji (osim sajta). Tabela ispod važi samo za boje i za to koja komponenta ide gde; mere iz nje (42 px dugmad, 36 px stavke menija…) više ne važe.

**Odluka:** aplikacija koristi Tailwind CSS v4 i shadcn/ui komponente (Radix). Izgled je i dalje **tačno onaj iz `design/screens/*.html`** — shadcn daje ponašanje (tastatura, fokus, pozicioniranje, pristupačnost), a izgled dolazi iz naše teme.

## Podešavanje
1. `design/kroj-theme.css` → kopiraj kao ulazni CSS (`src/index.css`). Sve boje, radijusi, senke i fontovi su tu.
2. `components.json`: `"tailwind": { "config": "", "css": "src/index.css", "baseColor": "neutral", "cssVariables": true }` — baseColor se ignoriše jer `:root` promenljive prepisuju naše vrednosti. **Ne pokreći generator tema i ne lepi tuđe teme.**
3. Nema `tailwind.config.js`. Nema tamne teme u v1.
4. Posle `npx shadcn add <komponenta>` komponenta se **prilagođava** po tabeli ispod (shadcn kopira kod u projekat — menja se slobodno).

## Zabranjeno (da ne ispadne „generički shadcn“)
- Podrazumevane sive palete (`zinc`, `slate`, `neutral-*`), `oklch` boje iz primera, `rounded-xl` kartice sa velikim senkama, Inter/Geist font.
- Proizvoljne nijanse (`bg-gray-100`, `text-gray-500`): koristi samo boje iz teme (`bg-muted`, `text-muted-foreground`, `bg-accent-soft`, `text-accent-ink`…).
- Ikone sa emoji. Ikone: `lucide-react` stroke 1.6, 16 px (kao inline SVG u dizajnu).
- Menjanje rasporeda, razmaka i veličina zbog „lepšeg“ izgleda — dizajn je izvor istine (DESIGN_SPEC, snimci).

## Mapiranje: element iz dizajna → shadcn komponenta → Kroj stil

| U dizajnu | shadcn / Radix | Kroj prilagođavanje (klase / vrednosti) |
|---|---|---|
| Glavna dugmad (Dodaj u prostor, Novi projekat, Slika za ponudu) | `Button` variant `default` | `h-[42px] px-4 rounded-md bg-primary text-white font-semibold text-sm` |
| Sekundarna dugmad | `Button` variant `outline` | `border-border bg-white text-foreground`; tamna ivica varijanta (`border-foreground`) za „Sačuvaj kao šablon“ |
| Ikonica-dugme 36×36 (traka alata, traka akcija) | `Button` variant `ghost` size `icon` + `Tooltip` | `size-9 rounded-[7px] hover:bg-muted`; uključeno: `bg-dark text-white`; prekidač uključen: `bg-accent-soft text-accent-ink ring-1 ring-inset ring-accent-on-dark`; traka akcija (tamna): `text-on-dark hover:bg-[#3D3A35]` |
| Tooltip naziva ikonice (`data-tip`) | `Tooltip` | tamni: `bg-dark text-on-dark text-xs px-2 py-1 rounded-[5px]`, ispod dugmeta, delay 300 ms; na tamnoj traci beli |
| „i“ objašnjenja (`.k-tip`) | `Tooltip` (ili `HoverCard` za duže) | okrugli 18 px trigger; sadržaj max 240 px, `bg-dark text-on-dark text-[12.5px] leading-[1.45]`; **sakriven kad je Pomoć isključena** (klasa `k-helpoff` na korenu) |
| Meni na desni klik (2D plan) | `ContextMenu` | širina 256, `rounded-xl p-[5px] shadow-[var(--shadow-menu)]`; naslov sekcije 11px velika slova `text-muted-2`; stavka `h-9 px-2.5 gap-2.5 text-[13.5px]` + ikona 16 + prečica `font-mono text-[11px] text-muted-2`; opasna stavka `text-destructive`; segment Otvaranje/Ručke = `ToggleGroup` u meniju (`bg-muted p-[3px] rounded-[7px]`, izabrano belo sa senkom, `text-accent-ink font-semibold`). Dug dodir 550 ms otvara isti meni |
| ⋯ Projekat, ⋯ u traci akcija | `DropdownMenu` | isti stil stavki kao ContextMenu |
| Traka akcija iznad izabranog | običan `div` + `Button` ikonice (nije shadcn komponenta) | `bg-dark rounded-[10px] p-1 shadow-[var(--shadow-bar)]`, pozicija u % plana (EDITOR_2D) |
| Panel mera (plutajući, desno) | `Card` (bez Sheet-a — ne sme da zatamni plan) | `w-[300px] rounded-2xl shadow-[var(--shadow-pop)] p-4` |
| Provera, Legenda, Projekat (popoveri na planu) | `Popover` | `rounded-xl shadow-[var(--shadow-pop)] p-3` |
| Kartica koraka u zaglavlju (hover) | `HoverCard` | `w-[230px] rounded-lg border p-3 text-[12.5px]`, ✓ `text-ok-strong`, ○ `text-muted-2` |
| Stepper u zaglavlju | sopstvena komponenta `ProjectSteps` (Link + stanje) | `docs/TOK_PROJEKTA.md` |
| Tabovi (biblioteka Elementi/Prepreke, Admin tabovi, filteri Projekata) | `Tabs` | segment: lista `bg-muted p-[3px] rounded-lg`, aktivni `bg-white shadow-sm font-semibold`; admin tabovi: podvučeni (`border-b-[3px] border-primary`) |
| Segmentirane kontrole (Tehnički/Realni, Donji/Gornji/Visoki, mm/cm, Dan/Veče) | `ToggleGroup` type single | isti stil kao segment tabovi; mm/cm na tamnom: uključeno `bg-accent-on-dark text-dark font-semibold` |
| Dijalozi (Sačuvaj kao šablon, Slika za ponudu) | `Dialog` | `max-w-[440px]/[480px] rounded-2xl p-[22px] shadow-[var(--shadow-modal)]`, overlay `bg-[rgba(28,27,25,0.45)]` |
| Select polja (Vrsta, Ručke u projektu, Leđa, materijali) | `Select` | `h-10 rounded-md border-border text-sm`; stavke kao u meniju |
| Tekstualna/brojna polja (mere) | `Input` | mere: `font-mono text-base`, aktivno polje `border-primary`; `inputMode="numeric"` |
| Stepper −/+ (Police, Unutrašnje fioke) | `Button` ×2 + broj | `h-[38px]` grupa sa ivicom |
| Kvačice (U biblioteci, Ubaci u ponudu) | `Checkbox` | `accent` = primary, 16–18 px (u aplikaciji: `src/components/ui/checkbox.tsx`) |
| Oznake statusa (U toku, Završen, Spreman, Dorada, licence) | `Badge` | `rounded-[10px] px-2 py-0.5 text-xs`; u toku/upozorenje `bg-accent-soft text-accent-ink`; ok `bg-ok-soft text-ok`; neutralno `bg-muted text-muted-foreground` |
| Trake napretka (zaglavlje, Projekti, Slika za ponudu) | `Progress` | visina 3 / 6 px, pozadina `bg-dark-line` ili `bg-line-soft`, ispuna `bg-accent-on-dark` (100 % = `bg-ok-strong`) |
| Toast („… je sačuvan u Moji šabloni“) | `Sonner` | `bg-dark text-white rounded-lg px-4 py-3`, dole u sredini |
| Tabele (krojna lista, materijali, aparati) | `Table` | redovi `border-b border-line-soft`, zaglavlje `text-muted-foreground text-[13px] font-medium`, brojevi `font-mono` desno |
| Pretraga (biblioteka, Projekti) | `Input` + lupa | `h-10/42 rounded-lg` |
| Kartice projekata, katalog | `Card` | `rounded-xl border p-[18px]`, bez senke |

## Šta NIJE shadcn
2D plan (SVG + pointer događaji), 3D scena (React Three Fiber), crteži u konfiguratoru i nacrtima, sličice fronti — to su sopstvene komponente. Tailwind se koristi samo za okvir oko njih.

## Provera
Posle svakog ekrana: snimak pri 1440 × 920 sa `design/screens/fonts-test.css` i poređenje sa `design/screens/*.png` (npm run test:visual). Razlika u bojama, razmacima ili radijusima = greška, ne „stilska sloboda“.
