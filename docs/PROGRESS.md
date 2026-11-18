# Napredak — Kroj

Dnevnik stanja projekta. Ažurira se posle svakog koraka (vidi „Kontinuitet rada“ u `CLAUDE.md`).
Da nastaviš: `git pull`, pa reci Claude-u „nastavi gde smo stali“.

## Postavka na novom računaru
1. nvm: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh | bash`, pa otvori novi terminal
2. `nvm install` (čita `.nvmrc` = LTS) → `npm i -g pnpm`
3. `pnpm i` → `pnpm -F engine test` (mora 6/6 zeleno)

## Trenutno stanje
- MVP korak 1 (engine) **urađen**: `packages/engine` — `generateParts`, `hardware`, `edgeTotals`, `sheetEstimate`, `worktops`.
- Test `packages/engine/test/fixture.test.ts` prolazi: 58 linija / 81 kom, sve mere i kant, m², ploče, okov, radne ploče.
- Izuzeto iz testa (vidi Otvorena pitanja): klamerice, tekst napomene izreza.

## Sledeći korak
MVP korak 2 — Brzi start: pročitati `docs/BRZI_START.md`, napraviti `autoLayout` u engine-u + test, pa postaviti `apps/web` (Vite + React) i ekran Brzi start (`design/BrziStart.dc.html`).

## Urađeno
- 2026-11-18: Spec iz `kroj-start` prebačen u repo; uveden ovaj fajl za kontinuitet.
- 2026-11-18: Instalirani nvm (`~/.nvm`), Node v26.13.1 LTS, pnpm 12. Dodat `.nvmrc`.
- 2026-11-18: pnpm monorepo + `packages/engine` (TS 7, Vitest 5); engine prolazi fixture.

## Odluke
- 2026-11-18: Stanje projekta se prati u git-u (`docs/PROGRESS.md` + commit/push posle svakog koraka), bez dodatnih plugin-ova.
- 2026-11-18: Izrez u leđima samo za cevi (voda, odvod, gas), ne za struju — fixture: V1 ima utičnicu S4 iza leđa, a nema izrez. Instalacija mora biti i po visini unutar korpusa.
- 2026-11-18: Visoki element = kućište frižidera sa nišom 1700 (donja vrata 1696, gornja H−1704). Fioke: vodilice 500, dno W−74 × 476. Slepa ploča 420. Sve označeno `shortcut:` u kodu.
- 2026-11-18: Deo i okov se prepoznaju po imenu dela (Vrata*, Fronta*, Dno*, Vezna letva, Polica).

## Otvorena pitanja (za korisnika)
1. **Klamerice**: fixture očekuje 170, ali u `KONSTRUKCIJA.md` nema pravila. Nijedan prirodan razmak (100/150 mm po obimu leđa) ne daje 170. Kako se broje?
2. **Izrez D2**: fixture kaže „izrez 300×250 za V+O“, a formula iz speca (obuhvat instalacija + 50 sa svake strane) daje 275×175. Koje je pravilo (zaokruživanje, minimalni izrez, prečnik vode)?
