# Tests — what they check and how to run them

One command runs everything (about 40 s): **`pnpm test:all`** from the repo root. The dev server is started by Playwright when
none is running on 5173 (an open `pnpm -F web dev` is reused). System Chrome is used, as for the visual check.

| Suite | Command | What it checks |
|---|---|---|
| Engine (Vitest) | `pnpm -F engine test` | Construction rules and the example kitchen: parts, sizes, edging, hardware, drawers / slides, screws and holes, corner units, hood, parts from stock, 3D model boxes (hinges, plinth, obstacles), quote, supplier comparison, DXF. |
| Functional (Playwright, `apps/web/e2e/`) | `pnpm -F web test:e2e` | The app in a real browser with the example kitchen: clicks, dialogs, 3D framing — see the list below. |
| Visual (Playwright, `apps/web/visual/`) | `pnpm -F web test:visual` | Screens against the design references in `design/screens/` (layout / colours). |

Run one file or one test: `pnpm -F web test:e2e e2e/element.spec.ts`, `pnpm -F web test:e2e -g "undo"`.

## Functional tests (`apps/web/e2e/`)
- **element.spec.ts** — Element page: 3D centred and still centred after orbiting (own axis; reads the WebGL picture back, `drawnBox`), Rasklopi / Sklopi / Otvori, cut-list line ↔ boards, right-column accordion (cut list first, all open, folds), splitter (drag, remembered, double click), Otvori u konfiguratoru (not for the dishwasher front), shared plinth note.
- **prostor.spec.ts** — Novi prazan prostor dialog (Otkaži / Da) and the visible Poništi, Učitaj primer asks first, Esc cancels placing, double click → Konfigurator and back to Prostor, library hover → 3D card.
- **konfigurator.spec.ts** — undo / redo (buttons, Ctrl+Z / Ctrl+Shift+Z), a front from leftovers (+1 iz ostatka, saved, on the Element page, back to cutting), resizable side panels, 3D tab centred and orbiting its own axis.
- **screens.spec.ts** — wall view installation pick ↔ row, Poređenje missing-price warning at the top, 3D Izgled added decor swatch with the + kept.

`e2e/util.ts`: `open(page, path, project?, localStorage?)` loads the example kitchen (or a changed copy) and opens a page;
`drawnBox` / `orbit` measure and turn the 3D view.

## Rule
A new feature or a fixed bug gets an e2e test (or an engine test when it is a rule) in the same step, so `pnpm test:all` keeps
covering what exists. `apps/web/visual/tmp-*.spec.ts` are local, git-excluded screenshot helpers (`OUT=dir`); the normal runs skip them.
