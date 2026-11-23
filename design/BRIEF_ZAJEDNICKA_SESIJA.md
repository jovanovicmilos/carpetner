# Brief for Claude Design — shared session (zajednička sesija), 2026-11-23

The app changed how customer and workshop work together. Several reference screens are now out of date, and the user does
not like how the shared session looks in the app today (it was built from older references plus quick additions). Please
redesign the screens below to match the new flow, then export them as usual (`tools/export_screens.py`). UI text stays
Serbian (Latin). Use the workshop terms the user chose: stranica, pod, plafon, srednja stranica, vezni komad, poleđina, fah,
krilo, fronta, sokla, kant, krojna lista, okov, repro materijal, pilana.

## What changed (decided by the user, already in the app)

1. **One kitchen, both edit it.** When the workshop takes the customer's request ("Preuzmi projekat"), there is no workshop
   copy any more. Customer and workshop edit the *same* kitchen at the same time. Each side sees the other's edits within
   2–4 seconds. Both edits are kept, and only the same field of the same unit changed on both sides takes the later save.
   Each side can change what its role allows: the customer uses catalog units and widths in cm, without Konstrukcija or
   krojna lista. The workshop has every tool: mm, free sizes, custom unit, Konstrukcija, confirming a unit.
2. **No proposals.** The "predlozi izmena" flow (workshop proposes, customer accepts / declines each change, "Odobri raspored")
   is removed. Agreement = the accepted offer (ponuda).
3. **No separate "Raspored" screen.** There is one 2D editor, **Prostor**, for both roles: walls, openings, installations,
   obstacles and units together. Customer steps are now **Prostor → Izgled → Pregled → Stolar** (4 steps; Zid and
   Prilagođeni element belong to Prostor). Workshop steps are unchanged: Prostor, Nacrti, 3D, Elementi, Krojna lista, Ponuda.
4. **No "start / end session".** The session is simply on while the request is taken. There is no "Završi sesiju" /
   "Započni sesiju", and no "N izmena čeka potvrdu".
5. **Messages** are the request's thread (same messages in Saradnja and in Prostor). A message can be about a unit
   ("Komentar na: D2"). Unread messages are counted per side.

## Screens to (re)design

### Prostor in a shared session — customer (`KupacEditor`) and workshop (`Main` / editor)
The most important screen. Today the app shows: customer header "● Uživo" + two avatars, workshop project bar chip
"● Uživo sa <kupac>", and a "Poruke" button next to "··· Projekat" that opens a small popover chat. The user does not like
it. Please design:
- How each side sees that the other one is in the kitchen right now (who, since when; presence even if nobody types).
- How the other side's edits show up on the plan when they arrive: e.g. a short highlight of the changed unit with the
  person's colour, and a small "Marko je pomerio D2" note.
- Chat on the drawing for both roles: open / closed states, unread count, writing a comment about the selected unit, the
  link to Saradnja i ponuda. Should it be a side panel, a drawer, or a popover? It must not hide the plan (UI_PRAVILA: the
  2D / 3D stay visible, no page scroll on work screens).
- An optional list of the edits in this session ("Izmene u ovoj sesiji": who, what, undo of one's own edit), if it fits.
- States: no session yet (kitchen not sent / not taken), session on, the other side is editing, a new message, offline /
  reconnecting.
- Phone (390 px) for the customer: the same session and chat (this replaces PlanerTelefon).

### Saradnja (`Saradnja`)
In the app today: left "Dogovoreno" (only "Ponuda prihvaćena") + timeline (sent, taken, offer versions, accepted), middle
"Kuhinja": the shared kitchen's plan (live) + "Otvori kuhinju" (opens Prostor), right: messages. Remove the proposals list,
"Prihvati / Odbij", "Prihvati sve", "Odobri raspored", "Predlozi stolara", "Raspored odobren". Design what the middle should
show instead (the user wants it to feel like one place for the kitchen, the messages and the offer).

### Moje kuhinje (`MojeKuhinje`)
The customer cannot find the session today: "Nastavi" opens Pregled. Each kitchen card should show its state, e.g.
"Uživo sa IKEA", "Poslato — čeka radionicu", "Ponuda stigla", plus new messages, and a direct "Otvori kuhinju" that goes to
Prostor.

### Customer header (planner stepper, used on Prostor, Zid, Prilagođeni, Izgled, Pregled, Stolar, Ponude)
4 steps (Prostor, Izgled, Pregled, Stolar). Real names and initials (not the "Ana / Marko" placeholders). Signed-in state.

### Site header (`Sajt` / Pocetna, Inspiracija, Kuhinja, ZaStolare, Radionice)
Signed in it now shows "Moje kuhinje" (customer) or "Projekti" (workshop member) + avatar + "Odjava" instead of
"Prijava" + the call to action. Please draw the signed-in variant (and where Odjava / account settings live).

### Workshop: Upiti (`Upiti`) and project bar (`AppShell`)
- Upiti: "Preuzmi projekat otvara zajedničku sesiju: ti i kupac menjate istu kuhinju i vidite izmene jedno drugog." (was
  the working-copy text). "Otvori projekat" opens Prostor.
- Project bar: the "Uživo sa <kupac>" indicator on every project screen (Prostor, Nacrti, 3D, Elementi, Krojna lista,
  Ponuda) — design it properly with the bar's steps.

### Kupac Ponude (`KupacPonude`)
The link under each workshop is now "Poruke i kuhinja" (was "Poruke i predlozi izmena").

## References to drop
`Planer`, `PlanerStolar`, `PlanerTelefon`: the screens no longer exist in the app. Fold whatever is good in them (live
strip, change list, phone bottom sheet, chat next to the plan) into Prostor above.

## Still open from before (not part of this brief)
The old headers of other screens still need regenerating (visual tests skip them as OLD_HEADER).
