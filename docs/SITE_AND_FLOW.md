# Site first, one planner for every role — redesign plan

Status: **PORTED** (2026-11-21: all screens of this direction are in the app — role shell, Pregled, site pages, customer flow incl. phone layouts, Ponude, Moje kuhinje, Radionice + profile, workshop profile settings, Saradnja; route map, placeholders and next step in `docs/PROGRESS.md` → Current state → Pause handover). Still to build from the rework list: Upiti. Earlier: (user said "kreni" 2026-11-20 23:43; flow approved 23:50 "pa ćemo menjati ako ne valja"). Design v1 done: flow `design/flow/Tok.dc.html`; screens Planer, PlanerStolar, Pregled, Pocetna, Inspiracija, Kuhinja, ZaStolare in `design/` + `design/screens/`. Earlier text: **WAITING.** The user recorded this direction on 2026-11-20 at 23:38 and said not to start yet: "Čim ti budem rekao kreni, to ćeš krenuti." When the user says "kreni", start with "Order of work" below.

## What the user asked for (2026-11-20)
1. **The site is the main product surface.** People land on the site and go from there into the editor (the "kitchen planner"). The planner is not a separate app with its own entrance.
2. **The site is built from what the editor makes.** Kitchens that users design (plan, 3D, materials) appear on the site as real examples, for marketing.
3. **Kitchens are public by default.** Keeping one **private costs money.** This becomes part of the business model.
4. **One planner, and its view depends on the role:** a workshop (stolar) or an ordinary user / potential customer.
5. **The whole flow should be reworked step by step,** using the best UX/UI practice that exists, so the user can always "swim" (always knows where they are and what comes next). Change the design wherever needed.
6. **Redo every screen with Tailwind + shadcn/ui:** both the editor part and the site.

## Business model addition: public by default, private is paid
- Every kitchen a customer designs is **public by default**. It shows in the site gallery ("Inspiracija"). Visitors can open it in 3D and start their own kitchen from it ("Napravi ovakvu" makes a copy).
- **Private** (not in the gallery, link only for people the owner invites) is **paid**. Default: private is **included in Plus**. Without Plus it is available as a small one-time "Privatno" fee per project. Price and packaging are open question 1.
- **What a public kitchen shows:** plan, 3D, layout, materials and decors, approximate size. **It never shows:** name, address or exact location (city at most, opt-in), contact details, room photos, prices from offers, or messages. Room photos and Saradnja are always private.
- **Honesty and law** (Serbian ZZPL / GDPR-style rules):
  - Public visibility is stated clearly **before the first save**, on the same screen, with a switch. It is not hidden in the terms.
  - The owner can make a kitchen private later by paying. Before payment they can always **delete** the kitchen; it then disappears from the site.
  - Kitchens created before this rule keep their current visibility.
- **Workshops:** client work is not the workshop's to publish. Default: workshop projects are **private on every plan**. A workshop can publish chosen projects to its **public profile / portfolio** and the gallery, credited "izradila [radionica]" (with the customer's consent if the project came from a customer). This differs from the customer rule on purpose: confirm it with the user (open question 2).
- **Marketing loop:**
  1. A gallery kitchen gets "Napravi ovakvu" → a new customer.
  2. If it was built by a workshop, the kitchen page links that workshop's profile → a lead for the workshop.
  3. Partner decors (e.g. Kronospan) are named on the kitchen page → value for the partner.
- **Entitlements:** `project.private` (Plus, the "Privatno" add-on, every workshop plan) and `gallery.publish`. Screens ask for the right, never for a plan name (MARKETPLACE.md → implementation rule).

## Flow: site → planner, step by step
Principles to follow (common UX practice; check them against well-known planners such as IKEA's kitchen planner, Planner 5D, Roomle and Houzz before designing):
- **One primary action per step.** A visible stepper says where you are, what is done and what is next. Back is always safe.
- **Guest first.** No account needed to start; the account is asked for at "save", "send" or "make private". Work is autosaved locally and moved to the account on sign-up.
- **Smart defaults and templates.** Start from a gallery kitchen or from the 5-question wizard (auto layout). Never start from an empty canvas unless asked.
- **Progressive disclosure.** Customers see catalog units, widths from a list and cm. Workshops see construction, cut list, drawings and prices. It is the same model and the same planner.
- **Undo everywhere**, inline validation in plain words (warnings stay orange), and empty states that say what to do.
- **A review step before anything leaves the user:** summary, example price (partner only), visibility, then send.
- **Mobile:** the site and customer steps work on a phone. The full workshop editor is desktop-first.

Proposed customer path:
1. **Site:** Početna → Inspiracija (gallery) → kitchen page (3D, plan, materials, "Napravi ovakvu") or "Počni od nule".
2. **Planner, guest / customer:** 1 Prostor (wizard or plan) → 2 Raspored (simple editor) → 3 Izgled (3D, decors, handles) → 4 Pregled (summary, example price, **Javno / Privatno**) → 5 Stolar (choose workshops, Plus, send) → 6 Ponude i saradnja.

Proposed workshop path (trial: **30 days Pro free, no card** — user, 2026-11-20; no payment field at sign-up, falls back to Start automatically, reminders 7 and 1 day before the end):
1. **Site:** "Za stolare" (For business) → Cene → sign-up → Projekti.
2. **Planner, workshop role:** the same steps, with the professional steps added: Prostor → Raspored → Izgled → Konstrukcija (element) → Krojna lista → Nacrti → Ponuda. Upiti and Saradnja open customer projects in this view.
3. **Workshop public profile** on the site: portfolio built from the projects the workshop published.

Site map (first proposal): Početna · Inspiracija · Kako radi · Za stolare · Cene · Radionice (directory + profiles) · Prijava. Public pages need SEO: pre-render or server-render them (open question 3). 3D loads lazily; a static image is used for previews and social sharing.

## Same editor, shared session (user, 2026-11-20 23:49)
The kitchen editor is **the same for both users**, so they can agree on changes together in a session. Only the role restricts what each side can do.

| Part of the editor | Customer | Workshop |
|---|---|---|
| Room (walls, openings, installations) | edits until sent; after sending, proposes | edits in mm; "izmereno" locks a value for the customer |
| Units | catalog, widths from the list, swap, delete | everything + free widths, custom unit |
| Look (decors, handles, worktop) | chooses freely (or from what the workshop offers) | chooses; can limit to what it offers |
| Construction, cut list, drawings | hidden | full (by plan) |
| Prices | example price (partner) and offers | price list, suppliers, calculation |
| Locking | cannot lock | locks a unit or a measure ("potvrđeno") |
| The other side's change outside a session | the workshop's change arrives as a proposal | the customer's change arrives as a proposal |

Shared session (live):
1. **Invite:** "Započni sesiju" from Saradnja; the other side gets a notification and a link.
2. **Presence:** avatars and cursors of both sides on the plan and in 3D, showing who is changing what.
3. **Prati me:** one side leads, the other sees the same view (plan, wall, 3D).
4. **Live edits:** every change is tagged with its author; undo works per author; role limits apply in the session too.
5. **Talk:** side messages, comments on a unit, an optional video-call link.
6. **End:** list of the session's changes → both sides confirm → a new version and a checkpoint in "Dogovoreno".

Technical consequence: the editor needs real-time sync of one `Project` document (e.g. operations over WebSocket on `apps/api`, author per operation, server keeps the order) and the engine's model must stay the only source. Role checks run on the server too, not only in the UI.

## What changes in the current design
The marketplace screens drawn on 2026-11-20 are **input, not final**:
- **Rework:** KupacStart, KupacEditor, KupacPosalji, KupacPonude, Sajt, Prijava, Projekti, Upiti and Saradnja, into the flow above.
- **New:**
  - gallery;
  - kitchen page;
  - workshop public profile;
  - the Pregled step with the Javno / Privatno switch;
  - the role-based planner shell (one header and one stepper whose steps depend on the role).
- **Keep and port:** Pretplata, Dobavljaci and the lock pattern. Add the "Privatno" option to them.
- **All editor screens** (Main, Zid, Pogled3D, Element, Konfigurator, KrojnaLista, Nacrti, Obračun, Poređenje) are reviewed for the role shell and redrawn where the flow needs it.

## Data model (draft)
- `Project.visibility`: `'public' | 'private'`. Optional later: `'unlisted'` (link only, not in the gallery).
- `Project.publishedAt`, `Project.slug` (for the kitchen page).
- `Project.sourceProjectId`: set when started from "Napravi ovakvu".
- `Project.publicCity` (opt-in).
- The gallery reads an **anonymized public view**: plan, units, decors, 3D. It never reads the raw document.

## Order of work (after "kreni")
1. **Claude Design:** draw the flow first, as one storyboard row (site → planner per role → review → send). Then the screens, all in the Kroj theme (green + wood, `design/kroj-theme.css`), drawn so they map 1:1 to Tailwind + shadcn/ui components (`docs/UI_KOMPONENTE.md`). The user approves the flow before the screens are detailed.
2. **Update the docs:** MARKETPLACE.md (money table and visibility), DESIGN_SPEC (site + role shell), PROGRESS decisions.
3. **Claude Code:** port screen by screen with Tailwind + shadcn and run the visual test against each new reference. Order: role shell + stepper → site pages → gallery and kitchen page → customer steps → workshop steps.

## Open questions
1. Price of "Privatno" without Plus. (**Decided 2026-11-20 23:41, user "može, slažem se":** Plus always includes private.)
2. ~~Workshop projects private by default~~ — **decided 2026-11-20 23:41 (user agreed):** workshop projects are private on every plan; the workshop publishes chosen projects to its portfolio / the gallery (with the customer's consent if the project came from a customer).
3. SEO for the public site: pre-render inside the current Vite app, or a separate site framework sharing the components?
4. Can a customer show a public kitchen with "Izradila [radionica]" after the work is done (review / rating later)?
5. Moderation of public kitchens (reports, hiding).
