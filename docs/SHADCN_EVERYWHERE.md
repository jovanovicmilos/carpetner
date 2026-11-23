# shadcn/ui everywhere (decision 2026-11-23)

**User:** "svuda osim na sajtu primeniti ui.shadcn.com komponente — inputi, dugmad i sve ostalo gde može." Component list: https://ui.shadcn.com/docs/components

## What changes
Until now `apps/web/src/components/ui/*` were shadcn components **re-sized to the old reference pixels** (button 42 px, semibold, select 40 px, menus 36 px items, etc.), and many screens still use raw `<button>`, `<input>`, `<select>`, hand-made tabs, switches and dialogs.

From now on:
1. **Stock shadcn/ui (new-york, Tailwind v4) is the source of truth for how a control looks and behaves.** Only the colours, radius and font come from our theme (`apps/web/src/index.css` = `design/kroj-theme.css` variables). Do not re-size components to old reference pixels.
2. **The design references are the source of truth for layout, content, order and texts** (where things are, what they say). Not for control pixel sizes.
3. **Every control on every app screen is a shadcn component.** No raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<input type="checkbox|range">`, hand-made tabs / switches / menus / dialogs / tooltips (`title=` tooltips too).
4. **The public site** (`Site.tsx`, `Radionice.tsx`, Kuhinja / Inspiracija / ZaStolare pages) keeps its look for now. It is done later, after the app.
5. The 2D plan, 3D scene and drawings stay our own components (SVG / R3F). Only the controls around them are shadcn.

Reference already redrawn this way: **`design/screens/Main*.png` (Prostor)**, with the `ui-*` classes in `design/Main.dc.html` naming which shadcn component each control is.

## Steps for Claude Code
1. **Reset `components/ui/*` to stock.** Re-add with `npx shadcn@latest add <name> --overwrite` (or copy the current new-york v4 source). Keep only theme-level differences (our CSS variables). Remove the size and weight overrides: Button default `h-9 px-4 text-sm font-medium shadow-xs`, `sm` h-8, `lg` h-10, `icon` size-9; Input / Select trigger `h-9 shadow-xs`; menus `p-1`, items `px-2 py-1.5 text-sm rounded-sm`; Card `rounded-xl py-6 shadow-sm`; Tooltip `bg-foreground text-background text-xs`. Remove per-call `className` size overrides (`h-[42px]`, `rounded-[7px]`, `text-[13.5px]`…) unless the layout really needs them.
   - Two Kroj additions stay: Button variant `dark` (dark green, active tool / dark bars) and the pressed-toggle colour `bg-accent-soft text-accent-ink` (instead of grey `bg-accent`, which is too faint on our ground).
2. **Add the missing components** used by the app: `alert`, `alert-dialog`, `avatar`, `breadcrumb`, `button-group`, `calendar` + `date-picker` (Saradnja Termini), `collapsible` / `accordion` (Brzi start steps), `command` / `combobox` (library search, material pickers), `empty`, `field`, `input-group` (search with icon, inputs with a unit "mm"), `kbd`, `label`, `separator`, `sheet` / `drawer` (phone bottom sheets), `sidebar` (AdminLayout), `skeleton`, `sonner` (toasts), `spinner`, `switch` (Pomoć na ekranu, Prijem upita), `toggle`, `scroll-area`, `bubble` / `message` / `message-scroller` (session chat dock and modal).
3. **Replace raw controls, screen by screen** (counts on 2026-11-23): QuickStart 13, CustomerStart 10, ProfilRadionice 9, SessionPanel 7, Posalji 6, AppShell 5, Upiti 3, LoginPage 3, SaradnjaLive 2, and 1 each in WallView, SubscriptionPage, Saradnja, PriceListPage, Pregled, LibraryPage, Editor, Drawings, CutList, Compare, AiProposalPage. Also 21 `title=` tooltips → `Tooltip`, 6 checkboxes → `Checkbox`, 1 range → `Slider`, 6 hand-made `role="tab"` → `Tabs`, 2 `role="switch"` → `Switch`.
   Mapping: action → `Button`; on/off → `Toggle` / `Switch`; one-of-few → `ToggleGroup` (or `Tabs` when it switches content); list choice → `Select` (long or searchable list → `Combobox`); value with a unit → `InputGroup` + addon; label + control + help → `Field`; status → `Badge`; warnings → `Alert`; confirm delete → `AlertDialog`; side panels on phone → `Sheet` / `Drawer`; toasts → `Sonner`; avatars and presence → `Avatar`; keyboard hints → `Kbd`.
4. **Order:** Prostor (Editor + Plan controls, reference ready) → Pogled na zid → Element / Konfigurator → Krojna lista → Nacrti → 3D → Obračun / Ponuda → Poređenje → Projekti → Brzi start → admin (Cenovnik, Biblioteka, Standardi, Korisnici, Profil radionice, Pretplata, AI) → Upiti / Saradnja / session → customer planner screens. The site comes last, on a separate OK.
5. **Visual test:** control sizes will no longer match the old PNGs. For Prostor compare with the new `Main*.png`. For the other screens, check layout and texts by eye against the reference. After a screen is converted, **update its baseline from the app** (Playwright `--update-snapshots` for that screen) and note it in PROGRESS. I (design) redraw the reference screens to match over time. The app may run ahead of the references.
6. Accessibility comes for free with Radix (focus, keyboard, aria). Keep the `aria-label`s and Serbian texts we already have.
