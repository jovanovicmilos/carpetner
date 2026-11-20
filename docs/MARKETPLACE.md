# Kroj as a marketplace: customers and workshops on one platform

Status: **idea, being worked out** (user, 2026-11-20). Nothing here is built yet. This document records the business idea and the logic we derive from it; open points are listed at the end and get decided one by one (decisions go to `docs/PROGRESS.md` → Decisions).

## The idea in one paragraph

Kroj connects people who need a made-to-measure kitchen (**customers**) with the workshops that build them (**workshops**: carpentry firms, small shops, anyone who makes kitchens to measure). Both sides get an account and both can draw their room and their kitchen in 2D and 3D with the same editor. A customer designs the kitchen they want and sends it to a workshop they pick. The workshop opens the customer's project, sees exactly what the customer tried to enter, adjusts it to what can really be built, picks materials, and Kroj prices it from the workshop's own price list and margin. The usual back-and-forth ("how much would a kitchen like this cost?", sketches on paper, three visits to agree on a layout) is replaced by one shared project. The price the customer sees before the workshop's review is **indicative**, and the app says so clearly.

## Product name: not decided
(User, 2026-11-20.) **"Kroj" is only a working name.** The final name is open. Until it is chosen:
- docs and code keep "Kroj" as a placeholder; the products are called **[Ime] Biznis** (workshops) and **[Ime] Studio** (customers), plus the public **sajt**;
- addresses below (`kroj.rs`…) are examples only;
- implementation rule: the product name, logo, domain and e-mail sender come from **one brand config** (e.g. `apps/web/src/brand.ts` + the site's config), never hard-coded in screens, texts or PDFs, so renaming is one change.

## Segments and names: sajt, Biznis, Studio
(User, 2026-11-20.) The public website is one segment; the app has two products whose names say who they are for:

| | **sajt** (public website) | **[Ime] Biznis** — for workshops | **[Ime] Studio** — for customers |
|---|---|---|---|
| What | what the product is, both offers and prices, the workshop directory and public workshop profiles, inspiration gallery, help, sign up and log in | the professional workspace: Projekti, Upiti (requests), Brzi start, Prostor 2D, 3D, elements, Konfigurator, Krojna lista, Nacrti, Obračun / Ponuda, pilana, admin, Saradnja with customers | the simple workspace: wizard, simple editor, 3D look, indicative price, „Pošalji stolaru", Saradnja with the workshop |
| Who | everyone, no account; indexed by search engines | workshops (organizations, several users) | people who need a kitchen (one person; can start without an account) |
| Plans | — | **Start** (free) · **Pro** · **Tim** + add-ons, 30-day Pro trial | **Besplatno** · **Studio Plus** (one-time per project) |
| Design screens today | `Sajt`, `Prijava` | all current app screens | to be designed (wizard, simple editor, Saradnja) |
| Address (example, name not decided) | `[ime].rs` | `[ime].rs/biznis` (or `biznis.[ime].rs`) | `[ime].rs/studio` (or `studio.[ime].rs`) |

- Same code base and the same editor for Biznis and Studio (`apps/web`); the account kind decides which product (screens, tools, home screen) the person gets. The site stays separate (static / server-rendered, SEO).
- The site shows the two offers side by side: „Za stolare — [Ime] Biznis" and „Za vašu kuhinju — [Ime] Studio".
- Entry points from the site: „Nacrtaj svoju kuhinju" → Studio wizard; „Isprobaj 30 dana" → Biznis trial; „Prijavi se"; on a workshop's public profile „Nacrtaj kuhinju sa nama" → Studio with that workshop preselected.
- Public workshop profiles live on the site (e.g. `[ime].rs/stolari/kuhinje-petrovic`); the workshop edits its profile in Biznis.
- Home screens: Studio — my kitchens and connections; Biznis — Projekti + Upiti.
- The top workshop plan is called **Tim** (it adds team users and roles), so "Biznis" and "Studio" always mean the two products.

## Core principle: two independent uses, the connection is optional
(User, 2026-11-20.) Kroj must be complete for each side **on its own**:

1. **Workshop alone** — a workshop uses Kroj as its professional tool, with or without customers on the platform: it creates as many projects as it wants (for walk-in clients, phone orders, its own showroom), draws, prices, makes cut lists and orders from the pilana. Nothing in the workshop flow waits for a customer account. This is the app as it is today.
2. **Customer alone** — anyone who needs a kitchen can come in, enter the room and **play** with units, layout and look in 2D and 3D, as long as they like, without talking to anyone and without a workshop.
3. **Together, when they choose** — when the customer wants a real price and installation, they connect with a workshop to finalise design, price and mounting. A workshop can also start it from its side: invite its client to a workshop project so the client can look, comment and play with options.

So the connection is an extra layer on top of two full products, not a gate. Consequences:
- Workshop project count is never limited by plan (plans limit professional tools and requests, not own projects).
- Customer drawing and playing is free; payment is for extras, not for the right to design.
- A project always has one owner (workshop or customer); connecting shares it, it does not move it.

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

## Connection between customer and workshop
When a customer sends a project and the workshop accepts, the two profiles get a **connection** (Saradnja). It is the shared place for everything about that kitchen; it stays in both profiles until the job is done (and in the archive after).

What the connection contains:
- **Messages** (chat per project), with notifications by e-mail and in the app; attach photos of the room, sketches, PDFs.
- **Comments pinned to the plan or the 3D view**: click a unit, a wall or a point → write "ovde bih fioke umesto krila". The pin is visible on both sides until it is resolved.
- **Timeline**: sent → taken over → measured → offer v1 → changes → offer v2 → accepted → in production → mounted. Each step with date and who did it.
- **Appointments**: proposed dates for measuring on site / showroom visit; the customer confirms one.
- **Documents**: offers (all versions), the design PDF, contract / terms, invoice later.
- **Contact details** shown inside the connection (rule for when exactly: open question 2).

## Working together on corrections
The goal is that customer and workshop reach an agreed kitchen in a few rounds, not by phone calls.

- **One project, two roles, turn by turn.** Not a free-for-all simultaneous edit at first: whoever has the turn edits, the other sees the changes and reacts. (Live co-editing with presence can come later.)
- **Changes as proposals (like tracked changes).** When the workshop changes the customer's layout (e.g. moves the sink 200 mm, swaps a 900 unit for 2 × 450), the customer sees each change as a proposal with a short reason ("odvod je na 1.450 mm"), and accepts or rejects it — one by one or all at once. The same works in the other direction: the customer can propose changes to the workshop's version.
- **Compare versions**: 2D overlay with colours (added / removed / moved / resized units), side-by-side 3D, and the price difference between versions.
- **Checkpoints that both confirm**: Raspored odobren → Izgled odobren (decors, handles, worktop) → Ponuda prihvaćena. After a checkpoint, changes to that part reopen it.
- **"Pitaj stolara"** button on any unit or wall in the customer editor: opens a pinned comment for the workshop.
- **Workshop notes visible to the customer** (why something is not possible, standard heights, what the warning means) — written in plain language.
- Everything stays in one model: proposals are edits of the same `Project` (rule 1 in CLAUDE.md), stored as a list of changes against a version.

## Customer experience: simpler than the workshop app
The customer side must work for someone who has never drawn a plan:
1. **Guided start** (wizard, one question per screen, big buttons): shape of the kitchen (prava / L / U / sa ostrvom) → wall lengths in cm ("izmerite metrom od ugla do ugla") → where the window, door, water and power are (tap on the wall) → what you want (sudopera, rerna u visokom ili ispod ploče, frižider ugradni / samostojeći, MSP) → style (light / wood / dark, handles or push). Kroj lays out the kitchen (Brzi start `autoLayout`).
2. **Simple editor**: the plan plus a short catalog with large picture cards, drag to the wall or tap "dodaj"; change width with + / −; swap a unit ("zameni"); delete. No cut list, no construction, no technical panels; centimetres by default.
3. **Look**: 3D first, swatches for fronts, worktop, handles, wall colour.
4. **Price**: the indicative range and the list of what can change it, always visible.
5. **Send**: pick a workshop, add a note and photos, send.
Mobile first for the customer (most will start on a phone); the workshop side stays desktop / tablet first.

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

## Money: free and paid plans on both sides
Decided with the user (2026-11-20): Kroj earns from **both** workshops and customers. Each side gets a useful free plan; the full package is paid. Prices are placeholders until we test them.

### Customers
A customer buys a kitchen once, so a **one-time pass per project** fits better than a monthly subscription.

| | **Besplatno** | **Studio Plus** (one-time per project, [cena]) |
|---|---|---|
| Guided start (wizard) + simple editor | ✓ | ✓ |
| Projects (draw and play) | unlimited | unlimited + variants of the same kitchen compared side by side (A / B / C) |
| Catalog units, basic decors | ✓ | ✓ all decors, handles, appliances |
| 3D | Tehnički + Realni preview | Realni in full quality, day / night, photo-quality image to download |
| Indicative price | ✓ range | ✓ range + breakdown (carcasses, fronts, worktop, appliances niche, assembly) |
| Send to a workshop | 1 workshop | up to 3 workshops, offers compared side by side |
| Connection with the workshop (messages, comments on the plan) | ✓ | ✓ + priority, video-call link, measuring appointment booking |
| PDF of the design (plan, views, dimensions) to keep | — | ✓ |
| Ad-free, no Kroj watermark on images | — | ✓ |

### Workshops
| | **Start** (free) | **Pro** (monthly, [cena]) | **Tim** (monthly, [cena]) |
|---|---|---|---|
| Public profile in the directory | ✓ | ✓ | ✓ featured |
| Own projects (without customers) | unlimited | unlimited | unlimited |
| Customer requests | up to [3] / month | unlimited | unlimited |
| Editor 2D / 3D, catalog, Konfigurator | ✓ | ✓ | ✓ |
| Offer to the customer | simple offer (total only, Kroj branding) | full offer with own logo, terms, PDF | ✓ |
| Price list, margin, VAT, decors with prices | basic | full | full |
| Krojna lista, kant, okov, sheet estimate | — | ✓ | ✓ |
| Technical drawings export (PDF / DXF), order to pilana, supplier comparison | — | ✓ | ✓ |
| CNC export per part | add-on | add-on | add-on |
| Users in the workshop | 1 | 3 | unlimited + roles |
| Invite own clients into a workshop project (view, comment, play with options) | 1 at a time | ✓ | ✓ |
| White-label link on own website | — | link with Kroj branding | own branding |
| Statistics (requests → offers → orders, average order) | — | basic | full |

### Workshop business model: trial, base plan, add-ons — kept open
(User, 2026-11-20: "freetrial, opcije koje mogu da se dodaju po određenoj ceni … ostaviti prilagodljivo i otvoreno".) The tables above are a **starting point, not code**. The business side (what is in which plan, prices, trial length, add-ons) must be changeable by us without a new release.

- **Free trial**: a new workshop gets the full package (Pro or Tim) for a trial period ([14 / 30] days, configurable), no card required (or card required — a setting). After the trial it drops to Start (free) unless it subscribes; its projects and data are never lost or locked, only the paid tools become read-only / hidden.
- **Base plan + add-ons**: besides the plans, single features can be bought on top, each with its own price and billing period. Candidate add-ons (all as data, any of them can move between "in plan" and "add-on"):
  - extra users (per seat);
  - customer request packs (e.g. +10 requests / month) or unlimited requests;
  - CNC / DXF export per part, technical drawings;
  - ordering from the pilana + supplier price comparison;
  - branded offers (logo, terms) and white-label link;
  - featured placement in the directory (per city / period);
  - AI assistant credits (docs/AI.md);
  - extra storage (photos, PDFs, textures);
  - premium decor / appliance libraries.
- **Billing options** (all settings): monthly / yearly (yearly discount), currency (RSD / EUR), VAT handling, promo codes and partner codes (e.g. a pilana gives its customers 3 months free), grace period after a failed payment, regional prices.
- **Customers** use the same mechanism: Studio Plus is just another product with its own entitlements (one-time, per project).

**Decided defaults (2026-11-20, decided by Claude on the user's request, based on the design; all are settings and can change):**

*Trial*
- **30 days of Pro**, **no card required**. Reason: a kitchen job (measuring → design → offer) takes 1–3 weeks, so a workshop can finish at least one real job inside the trial; no card lowers the barrier for small workshops.
- Tim is not trialled (its extras — team roles, own branding, featured listing — only matter once a workshop already uses Kroj). A Tim trial can be given by a promo code.
- Reminders in the app and by e-mail on day 23 and day 28; on day 31 the workshop drops to Start. Projects stay; Pro screens (cut list, drawings export, full offer…) show a lock with "Aktiviraj Pro".

*What is in which plan* (mapped to the design screens):

| Screen / feature (design) | Start (free) | Pro | Tim |
|---|---|---|---|
| Projekti, unlimited own projects, „nastavi gde si stao" | ✓ | ✓ | ✓ |
| Brzi start, Prostor (2D), Pogled na zid, catalog, Prilagođeni element, Element | ✓ | ✓ | ✓ |
| 3D Tehnički + Realni, decors, handles, appliances | ✓ (Kroj watermark on saved images) | ✓ | ✓ |
| Nacrti — view on screen | ✓ | ✓ | ✓ |
| Nacrti — PDF / DXF / GLB / OBJ export | — | ✓ | ✓ |
| Krojna lista, kant, okov + CSV / XLSX | — | ✓ | ✓ |
| Obračun: price list, margin, VAT; Ponuda PDF | simple offer (total, Kroj branding) | full offer, own logo and terms | ✓ |
| „Slika za ponudu" | — | ✓ | ✓ |
| Poređenje pilana, order to the pilana | — | ✓ | ✓ |
| Admin: Cenovnik, Standardi, Materijali / ručke / aparati / katalog | Cenovnik basic, Standardi | ✓ | ✓ |
| Customer requests | 3 / month | unlimited | unlimited |
| Invite own clients into a project | 1 at a time | ✓ | ✓ |
| Users | 1 | 3 | unlimited + roles |
| Public profile in the directory | ✓ | ✓ | ✓ featured |
| White-label link | — | with Kroj branding | own branding |
| Statistics | — | basic | full |

*Add-ons* (bought on top of any plan, priced separately):
- **Extra user** (per seat) — Pro and Tim.
- **CNC export per part** (DXF per part with KONTURA / IZREZ / KANT layers, Nacrti → „Delovi pojedinačno (CNC)") — not in any plan by default, because many small workshops have no CNC.
- **AI assistant credits** (docs/AI.md) — any plan.
- **Request pack +10 / month** — Start only (Pro / Tim have unlimited).
- **Featured placement** in the directory (per city, per month) — Pro (Tim has it).
- **Extra storage** (photos, PDFs, own textures) above the plan quota.
- Not add-ons: maker decor catalog and generic appliances stay included in all plans (they make the 3D useful for everyone).

*Customers*: Besplatno + Studio Plus as in the customer table above; no trial needed (designing is free).

*Prices*: still placeholders ([cena]); set after talking to 5–10 workshops. Yearly = 2 months free. Currency RSD for Serbia, EUR for other countries.

**How the code stays open (rule for implementation):**
- Never check plan names in code (`if (plan === 'pro')`). Code asks for **entitlements**: `can(account, 'export.cnc')`, `limit(account, 'requests.per_month')`, `usage(account, 'requests.per_month')`.
- Plans, add-ons, prices, trial length and limits live in tables edited from the **platform admin** (us): `products` (plan / add-on / customer pass), `product_entitlements` (feature key → on / limit value), `prices` (amount, currency, period), `subscriptions` and `purchases` (per organization or customer, start / end / trial_end / status), `entitlement_overrides` (manual gifts, partner deals), `usage_counters` (monthly counters).
- The effective entitlements of an account = union of its active plan, add-ons, passes and overrides; computed in one place (`billing` module) and cached per session.
- UI shows locked features with a short explanation and the cheapest way to unlock (plan or add-on), never a dead button.
- The payment provider is behind the `billing` module (CLAUDE.md → Pretplate); the entitlement logic does not depend on which provider is chosen.

Optional later, if numbers support it: a **fee per accepted order** or **featured placement** in the directory instead of (or on top of) the plan price. Payments go through a provider that works for Serbian companies (see CLAUDE.md → Pretplate), behind the `billing` module.

## Phases (proposal)
1. **Roles and plans** — customer account, customer mode (wizard + simple editor), indicative price with the disclaimer; plan limits in code (free / paid flags), payments later.
2. **Requests and connection** — "Pošalji stolaru", workshop inbox *Upiti*, take over → working copy, messages per project, offer to the customer in the app.
3. **Corrections together** — pinned comments, changes as proposals, version compare, checkpoints, accept / decline.
4. **Directory and growth** — public workshop profiles, search by city / area, gallery; workshops invite their own customers; white-label link.
5. **Payments and more** — Studio Plus and workshop plans through the payment provider, appointments, reviews, offers from several workshops compared.

## Open questions (to work out together)
1. Can a customer send the same project to **several workshops** at once, or one at a time? (More choice for the customer vs. workshops fearing price shopping.)
2. Who can see **customer contact details** and when (immediately, or only after the workshop takes the request)? Proposal: the workshop sees name and city with the request, phone and e-mail after it takes the request over.
3. Indicative price source: the chosen workshop's public prices, a platform average, or both? Does a workshop have to publish base prices to receive requests?
4. Does the customer need an account to design, or only to send?
5. Does the workshop's **measuring on site** become an explicit step (with an appointment) before the final offer?
6. ~~Business model~~ decided: free + paid plans for both sides (see "Money"). Still open: exact limits and prices, and whether a per-order fee is added later.
7. Can a workshop **invite its own customers** into Kroj (customer draws at home, workshop gets it directly)? Likely the fastest way to get the first customers.
8. Customer editor limits: only catalog units, or also the simplified Konfigurator? Which warnings to show?
9. Branding: a white-label link for a workshop ("Kuhinje Petrović — nacrtaj svoju kuhinju") on the workshop's own website?
10. Legal: terms for indicative prices, data protection (GDPR / Serbian ZZPL) for customer data and photos.
11. Customer pass: one-time per project (proposal) or a monthly subscription?
12. Is live co-editing (both edit at the same time) needed early, or is turn-by-turn with proposals enough for the first version (proposal: turn-by-turn)?
13. ~~Workshop trial~~ decided: 30 days of Pro, no card (see "Decided defaults").
14. ~~Plans vs add-ons~~ decided: see "Decided defaults". Still open: prices.
15. **Product name** (Kroj is a working name): to choose; check domain (.rs / .com) and trademark availability.
