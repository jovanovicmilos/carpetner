# Progress — Kroj

Project state log, updated after every step (see "Session continuity" in `CLAUDE.md`).
To resume: `git pull`, then tell Claude "nastavi gde smo stali".

## New machine setup
1. nvm: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh | bash`, open a new terminal
2. `nvm install` (reads `.nvmrc` = LTS) → `npm i -g pnpm`
3. `pnpm i` → `pnpm -F engine test` (must be all green)

## Current state
- MVP step 1 (engine) **done**: `generateParts`, `hardware`, `edgeTotals`, `sheetEstimate`, `worktops`. Fixture test passes (58 lines / 81 pcs, dimensions, edges, m², sheets, hardware, worktops). Excluded: staples, cutout note text (see Open questions).
- MVP step 2 (Quick start) **in progress**: engine part done — `autoLayout`, `quickStartRoom`, `PRESETS` (`packages/engine/src/autoLayout.ts`, `presets.ts`), 11/11 tests green. Web screen not started.

## Next step
Scaffold `apps/web` (Vite + React + TS, React Router, Zustand) and build the Quick start screen per `design/BrziStart.dc.html`: form → `autoLayout` → floor plan preview, element chips, warnings, buttons.

## Done
- 2026-11-18: Spec from `kroj-start` copied into the repo; this log introduced.
- 2026-11-18: Installed nvm (`~/.nvm`), Node v26.13.1 LTS, pnpm 12. Added `.nvmrc`.
- 2026-11-18: pnpm monorepo + `packages/engine` (TS 7, Vitest 5); engine passes the fixture.
- 2026-11-18: `autoLayout` ported from the design reference; BRZI_START.md example passes.

## Decisions
- 2026-11-18: State is tracked in git (`docs/PROGRESS.md` + commit/push after each step), no extra plugins.
- 2026-11-18: Code, comments, notes and docs in English; UI in Serbian.
- 2026-11-18: Back cutouts only for pipes (water, drain, gas), not power — fixture V1 has outlet S4 behind its back and no cutout. Installation must also be within the carcass height.
- 2026-11-18: Tall unit = fridge housing with a 1700 niche (lower door 1696, upper H−1704). Drawers: 500 slides, bottom W−74 × 476. Blind panel 420. All marked `shortcut:` in code.
- 2026-11-18: Parts are classified for hardware by part name (Vrata*, Fronta*, Dno*, Vezna letva, Polica).
- 2026-11-18: autoLayout: base unit gets 2 doors when wider than 600; oven gets one 116 drawer front; tall height aligns with wall-unit tops (2070 with workshop preset). Wall order is always A, B, C with 90° corners; quick start installation heights come from the fixture (`shortcut:` in `quickStartRoom`).

## Open questions (for the user)
1. **Staples (klamerica)**: fixture expects 170, but `KONSTRUKCIJA.md` has no rule. No natural spacing (100/150 mm along the back perimeter) gives 170. How are they counted?
2. **D2 cutout**: fixture says "izrez 300×250 za V+O"; the spec formula (installation bounding box + 50 per side) gives 275×175. What is the rule (rounding, minimum cutout size, pipe diameter)?
