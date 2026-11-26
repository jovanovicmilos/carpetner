# Brief for Claude Design: modern unit icons in the Prostor library (2026-11-26)

**User:** "ikonice u biblioteci treba modernizovati, možda i prikazati elemente u 3D-u … ili da napišeš prompt za Claude Design."

## Where
The library is in `design/Main.dc.html` (Prostor), in the left panel (240 px), tab **Elementi**. Cards are in a 2-column grid. Each card is at least 96 px tall and has:
- the icon;
- the name, for example "Fiokar 3 fioke";
- the width in mono, for example "600".

Click adds the unit to the selected wall, and drag places it exactly. The groups are:

| Group | Units |
|---|---|
| Moji šabloni | the user's own saved units |
| Donji (13) | Donji 1 krilo, Donji 2 krila, Fioka + krilo, Fiokar 2 / 3 / 4 fioke, Sudopera 800, Rerna + fioka, MSP ugradna, Ugaoni slepi, Ugaoni izvlačni, Uski izvlačni 200, Završni otvoreni |
| Gornji (7) | Gornji 1 krilo, Gornji 2 krila, Kipovanje (klapna), Iznad aspiratora, Vitrina staklo, Otvorene police, Ugaoni gornji |
| Visoki (9) | Ugradni frižider, Rerna + mikrotalasna, Rerna + fioke, Ostava sa policama, Ostava, unutr. fioke, Visoki izvlačni 300, Metlara, Niša za frižider, Polovični visoki |
| Završni (2) | Bočna maska, Filer |

The same picture appears big in the unit panel, "Izgled fronte sa izabranim ručkama".

## What it is now
`frontThumb` is a flat front view drawn to scale:
- the carcass is beige `#EADBC4`;
- appliances are dark;
- glass is blue;
- open rows are dashed;
- handles change with the project's opening (šipka / dugme / profil / na pritisak).

It is correct, but it looks dated. It is small and flat, tall units turn into thin sticks, and the dark appliance blocks look heavy.

## What we want
Modern, calm icons that you read at a glance at 44–80 px. A joiner should tell "fiokar 3 fioke" from "fioka + krilo" in a second, and a customer should find them attractive. Please propose a direction. Two options we see:

1. **Drawn icons, 3/4 view** (slightly from above and from the side). Use flat colours from our palette with thin lines and a soft shadow, the same style for every unit. The front layout must stay true:
   - rows, doors and drawers;
   - the hinge side;
   - the sink, the oven, the glass;
   - the kip front, hinged on top with the handle at the bottom;
   - the dishwasher front.
2. **Real 3D renders from the app.** Claude Code can export one PNG per catalog unit from the realistic 3D scene, like the site assets (`design/assets/site/`), with transparent background and a fixed camera. You design the card around the picture: size, background, crop and how tall units fit.

Either way:
- **Handles follow the opening.** The icon must react to the project's handle choice, or show none for "na pritisak". With option 2 that means 4 renders per unit, or a neutral handle. Tell us which.
- **Tall units** (2100) and narrow ones (200–300, Bočna maska 19) need a rule, so they don't become sticks. For example a fixed card height with the unit scaled to fit, plus the width shown in the label.
- **States:** default, hover, picked (`aria-pressed`, green ring now) and dragging. Also the big panel version.
- **Customer view** (`KupacEditor`) uses the same library, so the same icons go there.
- Keep the grid, the panel width, the texts and the click / drag behaviour.

## Already in the app (keep in mind)
- Hovering a unit card (350 ms) now opens a card to the right of the library (shadcn HoverCard, 280 px). It shows the unit live in the realistic 3D, then its name, width and "Klik pa klikni zid · prevuci za tačno mesto". If you want it styled differently, include it in the design.
- Real 3D of a single unit, assembled, opened and exploded, is on the Element page and in the Konfigurator (tab "3D").

## Deliver
- `design/Main.dc.html` updated (library cards, the big panel thumb, the hover card if you change it).
- `KupacEditor.dc.html` if it differs.
- The icon drawing rules (or the render spec for option 2: camera, size, background, which handle).
- Then tell Claude Code "ima promene na designu".

## Answer from Claude Design (2026-11-26 10:55): option 1, drawn 3/4 icons, done in `design/Main.dc.html`
- **Why drawn and not renders:** they follow the handle choice live, with no 4 × N renders. They read at 44–80 px. The same function draws the card icon and the big panel. The realistic 3D stays in your hover card and on the Element page.
- **Code:** `unitIcon(T, opening, w)` next to `frontThumb` (it reuses `frontRects` / `frontThumb` for the front layout). Port it as `UnitIcon` in `apps/web`, and feed it from the real catalog front layout instead of the reference codes.
- **Projection:** oblique, depth goes up and to the right. `x + z·0.42`, `y − z·0.26`, with depth capped at 600 mm, all in mm in one viewBox.
- **Faces and colours:**
  - fronts `#FBF8F2`;
  - carcass right side `#E2D5BF`, top `#EFE7D8`;
  - lines `#4A4640`, 1 px non-scaling;
  - plinth `#4A4743`, 100 mm, set back 50 mm; none on uppers or the mask;
  - soft shadow polygon, 8 % ink (5 % under uppers).
- **Details:**
  - **Sink:** basin on the top `#CDD7E0` and a faucet.
  - **Oven / micro:** dark face `#3B3E40`.
  - **Glass:** `#D7E5F1` with frame.
  - **Open:** inner colour `#E4D8C5`, shelves, shadow under the top.
  - **Blind corner part:** `#ECE5D8` with hatch.
  - **Dishwasher:** steel control line at the top.
  - **Hood:** steel trapezoid.
  - **Hinge marks:** two short `#9A9184` ticks on the hinge edge of every door / glass door, on the top edge of kip fronts.
  - **Handles:** same rules as `frontThumb` for šipka / dugme / profil / pritisak. Stroke 2.4 px, or 5 for a knob.
- **Size rule:**
  - icon box height 60 px (92 px for Visoki);
  - width = height × the icon's aspect ratio, max 84 px;
  - aligned to the bottom (`xMidYMax meet`);
  - narrow and tall units stay honest; the label carries the width.
- **States:**
  - hover: icon lifts 2 px (`transform` 150 ms);
  - picked (`aria-pressed`): green ring as before, icon lifted;
  - dragging: cursor grabbing; the native drag image is the card.
- **Big panel** ("Izgled elementa sa izabranim ručkama"): the same icon, 110 px high (170 for tall).
- **Hover card:** keep yours (live realistic 3D). It complements the drawn icon well.
- KupacEditor has no unit library, so nothing changes there.
