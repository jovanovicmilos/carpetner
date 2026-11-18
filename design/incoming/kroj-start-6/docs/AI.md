# AI u Kroju

AI je opcija, ne obaveza. Sve što AI radi mora da može i ručno. AI **uvek pravi predlog** (`Proposal`), a majstor svaku stavku prihvata, menja ili odbija. Ekrani: `design/AIPredlog.dc.html`, `design/AIPodesavanja.dc.html`.

## Važno: Claude pretplata i tuđe aplikacije
Anthropic ne dozvoljava da aplikacija treće strane koristi prijavu korisnikove Claude pretplate (Free/Pro/Max OAuth) da bi trošila njegove limite. To je dozvoljeno samo u Claude.ai i Claude Code. **Ne praviti „Login with Claude" za AI pozive iz Kroja.**
Dozvoljeni putevi su ispod.

## Tri načina (radionica bira u Admin → AI asistent)

### A) Kroj u Claude-u — remote MCP konektor (koristi korisnikovu Claude pretplatu)
- Kroj objavljuje remote MCP server: `https://<domen>/mcp` (Streamable HTTP, OAuth 2.1 sa Kroj nalogom, pristup samo podacima njegove organizacije).
- Korisnik ga doda u Claude kao custom connector. Slika, razgovor i tokeni su u Claude-u, na njegovom planu; Kroj daje alate i čuva projekat.
- Kasnije: prijava u Anthropic Connectors Directory (marketing).
- Alati (svi koji menjaju projekat prave SAMO predlog):

| Alat | Opis |
|---|---|
| `list_projects` | projekti radionice |
| `get_project(project_id)` | model projekta (mere u mm) |
| `create_project(name, customer?)` | prazan projekat |
| `propose_room(project_id, walls[], openings[], installations[], reference_measurement)` | predlog prostora sa `confidence` po stavci |
| `propose_elements(project_id, elements[])` | predlog elemenata (raspored ili prepis postojeće kuhinje) |
| `check_project(project_id)` | lista primedbi (ne menja ništa) |
| `get_cut_list(project_id, unit)` | krojna lista (engine) |
| `get_quote(project_id)` | obračun (engine) |
| `draft_quote_text(project_id, tone)` | tekst ponude kupcu |
| `get_proposal_status(proposal_id)` | da li je majstor prihvatio |

- MCP `prompts` = predefinisani zadaci (lista ispod), da korisnik ne mora da piše prompt.
- Odgovor alata vraća link „Otvori predlog u Kroju" → ekran AI predlog.

### B) AI u Kroju — Kroj krediti
- Dugme „AI iz slike" i zadaci rade direktno u Kroju.
- Server (nikad browser) zove Anthropic Messages API sa vision ulazom i tool use; koriste se ISTE šeme alata kao u MCP serveru (jedan izvor: `packages/ai-tools`).
- Merenje potrošnje po organizaciji (input/output tokeni → krediti), mesečni krediti po paketu, dokup.

### C) AI u Kroju — sopstveni Anthropic API ključ (BYOK)
- Isto kao B, ali sa ključem radionice iz Claude Console; ključ šifrovan u bazi (npr. pgsodium/Vault), mesečni limit, bez Kroj kredita.

Model: izabrati aktuelni Claude model u trenutku implementacije (proveriti docs.claude.com); vision je obavezan.

## Proposal (engine)
```ts
interface Proposal {
  id: string; projectId: string; source: 'mcp' | 'in-app';
  task: PromptId; status: 'pending' | 'applied' | 'discarded';
  referenceMeasurement?: { wallId: string; length: Mm };
  items: ProposalItem[];
}
interface ProposalItem {
  id: string;
  op: 'addWall' | 'addOpening' | 'addInstallation' | 'addElement' | 'updateElement';
  payload: unknown;                  // validira se zod šemom po op
  confidence: 'high' | 'medium' | 'low';
  note?: string;
  accepted: boolean;                 // podrazumevano: high → true, ostalo → false
}
applyProposal(project, proposal, acceptedIds): { project: Project; history: HistoryEntry }
```
Pravila: bez `referenceMeasurement` predlog prostora ne može da se prenese; sve mere se zaokružuju na 10 mm i označavaju kao procena; svaka primena ide u istoriju i ima undo.

## Predefinisani zadaci (prompts)
Sistemski deo (zajednički):
> Ti si asistent u Kroju, aplikaciji za stolare. Sve mere su u milimetrima. Ne izmišljaj mere koje se ne vide: označi ih kao procenu i stavi `confidence: low`. Nikad ne menjaj projekat direktno — koristi samo `propose_*` alate. Poštuj podrazumevane mere radionice i pravila konstrukcije iz `get_project`.

| id | Naziv | Uputstvo |
|---|---|---|
| `detect-room` | Prepoznaj zidove i instalacije | Sa fotografija prepoznaj zidove, ugao, otvore i instalacije (voda, odvod, struja, trofazna, gas). Mere preračunaj iz jedne izmerene mere. Za svaku stavku navedi sigurnost. |
| `suggest-layout` | Predloži raspored kuhinje | Predloži elemente: sudopera iznad vode i odvoda, rerna i ploča uz trofaznu, frižider na kraju niza, MSP uz sudoperu. Širine iz nominalnih širina radionice; popuni ostatak filerom. |
| `copy-kitchen` | Prepiši postojeću kuhinju sa slike | Prepoznaj donje, gornje i visoke elemente, broj vrata i fioka, procenjene širine. |
| `check-project` | Proveri projekat | Instalacije iza pogrešnog elementa, mere van standarda, preklapanja, delovi veći od ploče, fronte bez okova. Samo lista, bez izmena. |
| `explain-cutlist` | Objasni krojnu listu | Objasni i predloži uštedu ploča/kanta. |
| `draft-quote` | Napiši ponudu kupcu | Kratak tekst ponude bez internih cena i marže. |
| `import-pricelist` | Uvezi cenovnik iz PDF-a/slike | Pročitaj cenovnik dobavljača i predloži stavke cenovnika (materijal, debljina, format, jedinica, cena). |

Radionica može da isključi zadatak ili doda svoj (Admin → AI asistent).
