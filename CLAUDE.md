# Kroj — web aplikacija za stolare

Kroj je web aplikacija (u browseru) za stolarske radionice: crta se prostor (zidovi, otvori, instalacije), slažu se elementi od pločastog materijala (donji, gornji, visoki, ugaoni), prikaz je u 2D i 3D, a aplikacija iz istog modela izbacuje krojnu listu, kantovanje, okov/repro materijal, cenu i ponudu, i šalje narudžbinu pilani. Javna SaaS aplikacija sa pretplatom (radionice kao organizacije).

## Kontinuitet rada (OBAVEZNO)
Rad se nastavlja sa bilo kog računara, a jedini izvor stanja je ovaj git repo (GitHub `origin`).
- **Na početku sesije** (npr. kad korisnik kaže „nastavi gde smo stali“): `git pull`, zatim pročitaj `docs/PROGRESS.md` i nastavi od „Sledeći korak“.
- **Posle svakog završenog koraka**: ažuriraj `docs/PROGRESS.md` (stanje, šta je urađeno, odluke, sledeći korak, otvorena pitanja), pa commit + push. Nikad ne završavaj sesiju sa neažuriranim PROGRESS.md.
- Odluke koje menjaju spec upiši u PROGRESS.md pod „Odluke“ (datum + razlog).

Pročitaj pre rada:
- `docs/SPEC.md` — proizvod, ekrani, uloge, faze (MVP prvo)
- `docs/KONSTRUKCIJA.md` — pravila konstrukcije, formule delova, kant, okov (SRCE aplikacije)
- `docs/DATA_MODEL.md` — tipovi i tabele
- `docs/STANDARDI.md` — podrazumevane mere (EN 1116 / ISO 3055 / radionica / prazno)
- `docs/BRZI_START.md` — Brzi start: auto-raspored kuhinje i prečice
- `docs/AI.md` — AI asistent: MCP konektor za Claude, AI u aplikaciji, predefinisani zadaci, predlozi na proveru
- `fixtures/kuhinja-petrovic.json` — kompletan primer projekta + OČEKIVANA krojna lista (test)
- `design/` — dizajn svih ekrana (HTML maketa, otvori u browseru samo kao referencu izgleda; nije kod za kopiranje)

## Jezik
- Ceo UI na srpskom (latinica). Kod, imena fajlova, tipova i promenljivih na engleskom.
- Stručni termini u UI: bok, dno, vrh, vezna letva, leđa, polica, fronta, sokla, kant, krojna lista, okov, repro materijal, pilana.

## Stack (predlog — pitaj korisnika pre zamene)
- Monorepo (pnpm workspaces):
  - `packages/engine` — čist TypeScript, BEZ zavisnosti od UI-a: model projekta → delovi, kant, okov, obračun, poređenje dobavljača, optimizacija krojenja. Sve se testira Vitest-om.
  - `apps/web` — Vite + React + TypeScript, React Router, Zustand za stanje projekta, React Three Fiber (+ drei) za 3D, SVG za 2D tlocrt i poglede na zid.
  - Backend: Supabase (Postgres, Auth, Row Level Security po `organization_id`, Storage za PDF-ove).
- Izvoz: CSV (za pilane), XLSX (SheetJS), PDF (pdf-lib ili @react-pdf/renderer).
- Pretplate: provajder se bira kasnije (Stripe ne prima firme registrovane u Srbiji — razmotriti Paddle / Lemon Squeezy). Apstrahovati iza `billing` modula.

## Nepromenljiva pravila
1. **Jedan izvor istine.** 2D, 3D, krojna lista, okov i cena se UVEK izvode iz istog modela (`Project` → `engine`). Nikad ne čuvaj izračunate delove kao ručno uređivane podatke (izuzetak: ručni „override" deo sa jasnom oznakom).
2. **Sve mere interno su celobrojni milimetri** (`number`, integer). Jedinica (mm/cm) je samo prikaz i unos; konverzija na ivici UI-a. Cene interno u para/centima (integer).
3. Engine je deterministički i čist (bez `Date.now`, bez random) — isti ulaz, isti izlaz.
4. Fixture `kuhinja-petrovic.json` mora da prolazi: broj delova, mere, kant metraža i količine okova moraju se poklopiti sa `expected`.
5. Podrazumevane mere dolaze iz izabranog preseta (`docs/STANDARDI.md`); preset „prazno" ostavlja polja prazna i element nije validan dok se ne popune.
6. Upozorenja po standardu nikad ne blokiraju unos.

## Komande (kada se postavi projekat)
- `pnpm i`
- `pnpm -F engine test`
- `pnpm -F web dev`

## Redosled rada (MVP)
1. `packages/engine`: tipovi + generator delova za donji/gornji/visoki element + kant + okov → test sa fixture-om.
2. Brzi start: `autoLayout` u engine-u (`docs/BRZI_START.md`) + ekran Brzi start. To je glavni način pravljenja projekta, jer najviše skraćuje korake.
3. Krojna lista (po elementu i zbirno, grupisano po materijalu, mm/cm) + CSV/XLSX izvoz.
4. Editor elementa (forma + crtež spreda) i podrazumevane mere.
5. 2D tlocrt (zidovi, ugao, instalacije, postavljanje elemenata uz zid) i pogled na zid.
6. 3D prikaz (R3F) iz istog modela.
7. Cenovnik + obračun + PDF ponuda.
8. Nalog/organizacija/uloge, pretplata, poređenje pilana.
9. AI (opciono, `docs/AI.md`): Proposal + applyProposal u engine-u → remote MCP server (Kroj u Claude-u) → AI u Kroju (krediti / sopstveni API ključ). AI nikad ne menja projekat direktno; sve radi i bez AI-ja.
