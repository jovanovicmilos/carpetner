# Kroj as a marketplace: customers and workshops on one platform

Status: **idea, being worked out** (user, 2026-11-20). Nothing here is built yet. This document records the business idea and the logic we derive from it; open points are listed at the end and get decided one by one (decisions go to `docs/PROGRESS.md` → Decisions).

## The idea in one paragraph

Kroj connects people who need a made-to-measure kitchen (**customers**) with the workshops that build them (**workshops**: carpentry firms, small shops, anyone who makes kitchens to measure). Both sides get an account and both can draw their room and their kitchen in 2D and 3D with the same editor. A customer designs the kitchen they want and sends it to a workshop they pick. The workshop opens the customer's project, sees exactly what the customer tried to enter, adjusts it to what can really be built, picks materials, and Kroj prices it from the workshop's own price list and margin. The usual back-and-forth ("how much would a kitchen like this cost?", sketches on paper, three visits to agree on a layout) is replaced by one shared project. The price the customer sees before the workshop's review is **indicative**, and the app says so clearly.

## Why it works for both sides

| | Customer | Workshop |
|---|---|---|
| Problem today | does not know what is possible or what it costs; has to explain the kitchen in words and sketches; waits for offers | spends hours on first meetings, measuring and redrawing ideas that never turn into an order; price haggling |
| What Kroj gives | design the kitchen alone, see it in 3D, get an indicative price right away, send it to a chosen workshop with one click | receives requests that are already drawn (room, layout, wishes), turns them into a real project and a priced offer in minutes, with its own margin and materials |
| Result | faster, clearer decision; fewer surprises | more qualified leads, less time per offer, less negotiating |

## Two account types, one editor

The editor (Prostor, 2D/3D, catalog, Konfigurator) is the **same code** for both. What differs is which screens and controls a role sees.

| Capability | Customer | Workshop |
|---|---|---|
| Draw walls, openings, installations; obstacles; sloped wall | ✓ | ✓ |
| Place catalog units, Konfigurator (custom unit) | ✓ simplified (no construction rules) | ✓ full |
| 3D Tehnički / Realni, decors, handles, appliances | ✓ | ✓ |
| Indicative price | ✓ (from the chosen workshop's public price list, or a platform average if none is chosen yet) | — (sees the real calculation) |
| Krojna lista, kant, okov, sheet estimate | — | ✓ |
| Construction rules, standards presets | — | ✓ |
| Price list, margin, VAT, quote PDF | — | ✓ |
| Technical drawings (DXF / PDF / CNC), order to pilana, supplier comparison | — | ✓ |
| Send project to a workshop / receive requests | send | receive (inbox) |
| Public profile in the workshop directory | — | ✓ |
| Messages on a project | ✓ | ✓ |

Rule: the customer never sees the workshop's price list, margin or cut list. The workshop always sees everything the customer entered, including what the customer changed after sending.

## Main flow

1. **Customer** creates an account (or starts without one and saves later), uses Brzi start or draws the room, places units, picks the look in 3D.
2. Kroj shows an **indicative price range** (e.g. "oko 240.000–290.000 RSD") with the note: *"Okvirna cena. Konačnu cenu daje stolar posle pregleda projekta i merenja na licu mesta."*
3. Customer picks a workshop (directory: location, delivery area, lead time, examples of work, ratings later) and presses **Pošalji stolaru**, optionally with a note and photos of the room.
4. **Workshop** gets the request in its inbox (new screen *Upiti*). It opens the project read-only, sees the customer's original version, and can **take it over** (Preuzmi projekat): Kroj makes the workshop's working copy, linked to the customer's original.
5. Workshop adjusts the copy (real dimensions after measuring, construction, materials, hardware). Every change against the customer's version is tracked so the customer can see what changed and why.
6. Kroj prices the copy with the workshop's price list and margin → **offer** (Ponuda) with the 3D picture, list of what is included, validity date, and the difference to the indicative price explained.
7. Customer sees the offer in the app: accept, ask for changes (comment on a unit / a wall), or decline. Changes go back to step 5 as a new offer version.
8. Accepted → order: on-site measuring appointment (if not done), production, cut list to the pilana — the existing workshop flow (steps Krojna lista → Ponuda) continues from here.

### Project states (shared)
`draft` (customer working) → `sent` (waiting for the workshop) → `in_review` (taken over) → `offer_sent` → `changes_requested` ⇄ `offer_sent` → `accepted` → `in_production` → `done` · side exits: `declined_by_workshop`, `declined_by_customer`, `expired`.

## Price accuracy: how "the price may differ" is handled

- **Before sending:** indicative range only. Computed with the same engine from the customer's layout, using the chosen workshop's public base prices (or platform averages), with a ± band (start: ±10 %; tune with real data).
- **Reasons the final price can differ**, shown as a short list next to the price: real wall dimensions after measuring, installations, chosen materials and hardware, transport and assembly, work on site.
- **In the offer:** final price + a line *"Razlika u odnosu na okvirnu cenu: +18.500 RSD"* with the reasons the workshop picks (checkboxes + free text).
- The indicative price is never binding; the offer is binding for its validity period (workshop's terms).

## Customer-made drawings: guard rails
Customers make mistakes a workshop would not. Kroj should help without blocking (rule 6 in CLAUDE.md still holds — warnings never block):
- measurements entered by a customer are marked "uneo kupac — proveriti" until the workshop confirms them (on site or by phone);
- the customer editor hides construction details and offers only catalog units and the simplified Konfigurator (widths from the catalog list, no rules);
- extra hints for typical mistakes (fridge without space for the door, no worktop space next to the hob, sink far from the water) — the existing Provera warnings, worded for laypeople.

## What already exists and fits

| Already built | Use in the marketplace |
|---|---|
| Editor, catalog, Konfigurator, 3D Realni, decors | shared editor for both roles (role-based visibility only) |
| Engine `quote`, price list, margin | workshop offer; indicative price for customers (public subset of prices) |
| `progress` steps, `ProjectResume`, Projekti screen | both sides; customer steps differ (see below) |
| Quote PDF, offer image (WebGL) | offer shown to the customer in the app and as PDF |
| Supabase plan with RLS by `organization_id` | extend with customer users and shared projects |

Customer steps in the header (instead of the workshop's six): **Prostor → Kuhinja → Izgled (3D) → Pošalji stolaru → Ponuda**.

## Data model changes (draft)
- `profiles.kind`: `'workshop_member' | 'customer'` (a person can be both later; start with one).
- `organizations` = workshops (as now) + public profile fields: `public_name`, `city`, `service_area`, `lead_time_weeks`, `gallery`, `accepts_requests`.
- `projects.owner_kind` / `owner_id` (customer user or organization); `projects.origin_project_id` for a workshop copy made from a customer project.
- `project_requests` (id, project_id, customer_id, organization_id, status, note, photos, created_at, responded_at).
- `offers` (id, request_id, project_id (workshop copy), version, total, indicative_total, diff_reasons jsonb, valid_until, status, pdf_path).
- `messages` (id, request_id, author_id, body, anchor jsonb — optional element / wall the comment points to, created_at).
- `public_prices` (organization_id, material/price ids exposed for indicative prices) — or a flag on price list rows.
- RLS: a customer reads only own projects, own requests and offers addressed to them; a workshop reads requests addressed to it and the linked customer project (read-only), full access to its own copies.

## Money (open)
Options to decide with real numbers:
1. Workshops pay the subscription (as planned); customers are free. Requests are part of the subscription (simple; slow start of the customer side).
2. Subscription + a fee per accepted request (lead fee).
3. Commission on accepted orders (needs payments through the platform; complex, legal and tax work).
Start: option 1, measure how many requests turn into orders, then decide.

## Phases (proposal)
1. **Roles in the app** — customer account and customer mode of the editor (hidden workshop tools), indicative price with the disclaimer. No marketplace yet: the customer can share a link with any workshop.
2. **Requests** — "Pošalji stolaru" to a workshop that has a Kroj account; workshop inbox *Upiti*; take over → working copy; offer to the customer in the app.
3. **Collaboration** — comments anchored to units / walls, offer versions, change tracking customer ↔ workshop, accept / decline.
4. **Directory** — public workshop profiles, search by city / area, gallery from finished projects (with customer consent).
5. **Later** — reviews, on-site measuring appointments, deposits / payments, sending one request to several workshops (see open questions).

## Open questions (to work out together)
1. Can a customer send the same project to **several workshops** at once, or one at a time? (More choice for the customer vs. workshops fearing price shopping.)
2. Who can see **customer contact details** and when (immediately, or only after the workshop takes the request)?
3. Indicative price source: the chosen workshop's public prices, a platform average, or both? Does a workshop have to publish base prices to receive requests?
4. Does the customer need an account to design, or only to send?
5. Does the workshop's **measuring on site** become an explicit step (with an appointment) before the final offer?
6. Business model: subscription only, lead fee, or commission (see "Money").
7. Can a workshop **invite its own customers** into Kroj (customer draws at home, workshop gets it directly)? Likely the fastest way to get the first customers.
8. Customer editor limits: only catalog units, or also the simplified Konfigurator? Which warnings to show?
9. Branding: a white-label link for a workshop ("Kuhinje Petrović — nacrtaj svoju kuhinju") on the workshop's own website?
10. Legal: terms for indicative prices, data protection (GDPR / Serbian ZZPL) for customer data and photos.
