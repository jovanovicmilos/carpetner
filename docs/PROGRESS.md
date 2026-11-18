# Napredak — Kroj

Dnevnik stanja projekta. Ažurira se posle svakog koraka (vidi „Kontinuitet rada“ u `CLAUDE.md`).
Da nastaviš: `git pull`, pa reci Claude-u „nastavi gde smo stali“.

## Trenutno stanje
- Faza: MVP korak 1 (engine), nije započet kod.
- Repo sadrži spec (`CLAUDE.md`, `docs/`), makete (`design/`) i fixture (`fixtures/kuhinja-petrovic.json`).

## Sledeći korak
1. Instalirati Node.js (LTS) + pnpm na računaru (nisu bili instalirani 2026-11-18).
2. Postaviti pnpm monorepo + `packages/engine` (TypeScript, Vitest).
3. `generateParts` + `hardware` + `edgeTotals` + `sheetEstimate` → test da `kuhinja-petrovic.json` prolazi (58 linija, 81 kom).

## Urađeno
- 2026-11-18: Spec iz `kroj-start` prebačen u repo; uveden ovaj fajl za kontinuitet.

## Odluke
- 2026-11-18: Stanje projekta se prati u git-u (`docs/PROGRESS.md` + commit/push), bez dodatnih plugin-ova.

## Otvorena pitanja
- (nema)
