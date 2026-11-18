# Progress — Kroj

Project state log, updated after every step (see "Session continuity" in `CLAUDE.md`).
To resume: `git pull`, then tell Claude "nastavi gde smo stali".

## New machine setup
1. nvm: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh | bash`, open a new terminal
2. `nvm install` (reads `.nvmrc` = LTS) → `npm i -g pnpm`
3. `pnpm i` → `pnpm -F engine test` (must be all green)

## Current state
- MVP step 1 (engine) **done**: `generateParts`, `hardware`, `edgeTotals`, `sheetEstimate`, `worktops`. Fixture test passes (58 lines / 81 pcs, dimensions, edges, m², sheets, hardware, worktops). Excluded: staples, cutout note text (see Open questions).
- MVP step 2 (Quick start) **done**: engine `autoLayout`, `quickStartRoom`, `PRESETS`, `DEFAULT_RULES/MATERIALS` (11/11 tests) + `apps/web` Quick start screen (`apps/web/src/QuickStart.tsx`): form → layout → SVG plan, chips, warnings, summary with worktops and part count. Run: `pnpm -F web dev` → http://localhost:5173.
- Room obstacles (chimney / column / other): `Obstacle` in `Room.obstacles` (engine types). `autoLayout` skips them per height zone (base vs wall units), fridge is dropped with a warning if blocked, `worktops` splits at gaps. Quick start has step 5 "Prepreke na zidu" (full-height rectangles; wall, kind, offset, width, depth) and draws them hatched in the plan. 14/14 engine tests.
- The three action buttons are disabled until their screens exist. No router/Zustand yet (one screen); add them with the second screen.
- Verified by typecheck, `vite build` and a server-side render (L example: 7 lower, 4 upper, 1 tall, worktop 3200 + 1200, 84 parts). Not yet checked visually in a browser (Chrome extension did not respond).

## Next step
MVP step 3 — Cut list (`design/KrojnaLista.dc.html`): engine `mergeParts` + `format(mm, unit)` with tests; web screen grouped by material, per element and merged, mm/cm toggle, sheet/edge totals, hardware; CSV + XLSX (SheetJS) export. Add React Router + Zustand project store here and wire "Odmah krojna lista" from Quick start. First do a visual browser check of the Quick start screen.

## Done
- 2026-11-18: Spec from `kroj-start` copied into the repo; this log introduced.
- 2026-11-18: Installed nvm (`~/.nvm`), Node v26.13.1 LTS, pnpm 12. Added `.nvmrc`.
- 2026-11-18: pnpm monorepo + `packages/engine` (TS 7, Vitest 5); engine passes the fixture.
- 2026-11-18: `autoLayout` ported from the design reference; BRZI_START.md example passes.
- 2026-11-18: `apps/web` scaffolded (Vite 8, React 19, TS 7); Quick start screen built.
- 2026-11-18: Room obstacles (user request: chimney on a kitchen wall) in model, autoLayout, worktops and Quick start.

## Decisions
- 2026-11-18: State is tracked in git (`docs/PROGRESS.md` + commit/push after each step), no extra plugins.
- 2026-11-18: Code, comments, notes and docs in English; UI in Serbian.
- 2026-11-18: Back cutouts only for pipes (water, drain, gas), not power — fixture V1 has outlet S4 behind its back and no cutout. Installation must also be within the carcass height.
- 2026-11-18: Tall unit = fridge housing with a 1700 niche (lower door 1696, upper H−1704). Drawers: 500 slides, bottom W−74 × 476. Blind panel 420. All marked `shortcut:` in code.
- 2026-11-18: Parts are classified for hardware by part name (Vrata*, Fronta*, Dno*, Vezna letva, Polica).
- 2026-11-18: autoLayout: base unit gets 2 doors when wider than 600; oven gets one 116 drawer front; tall height aligns with wall-unit tops (2070 with workshop preset). Wall order is always A, B, C with 90° corners; quick start installation heights come from the fixture (`shortcut:` in `quickStartRoom`).

- 2026-11-18: Obstacles are axis-aligned rectangles on a wall (offset, width, depth, optional elevation/height). Free-form drawing belongs to the 2D floor plan editor (MVP step 5), which must also let users place/edit obstacles and warn when an element overlaps one. Not handled yet: obstacles inside the corner units' zone, and units with reduced depth in front of a shallow obstacle.

## Open questions (for the user)
1. **Staples (klamerica)**: fixture expects 170, but `KONSTRUKCIJA.md` has no rule. No natural spacing (100/150 mm along the back perimeter) gives 170. How are they counted?
2. **D2 cutout**: fixture says "izrez 300×250 za V+O"; the spec formula (installation bounding box + 50 per side) gives 275×175. What is the rule (rounding, minimum cutout size, pipe diameter)?
