---
title: Design & UI
type: category
status: active
updated: 2026-09-20
related: [../README.md]
---

# Design & UI

> Visual design system, UX principles, and design checklists.

## Pages

- [design-system.md](design-system.md) — ⭐ Single source of truth: tokens, rules, decision order
- [ui-checklist.md](ui-checklist.md) — PR merge gate (checks the rules in design-system.md)
- [components/past-session-sheet.md](components/past-session-sheet.md): The form that writes down a session Bati did not see
- [components/gps-chip.md](components/gps-chip.md): "GPS : oui / non" on the outing goal sheet
- [components/hand-mark.md](components/hand-mark.md): "saisie à la main", the one mark for a typed figure
- [exercise-colors.md](exercise-colors.md) — Muscle group → color mapping
- [audit-protocol.md](audit-protocol.md) — Capturing every screen, then judging it with adversarial personas
- [audits/2026-09-10.md](audits/2026-09-10.md) — ⚠️ 55 findings from four personas, 12 blockers, 4 confirmed in the code
- [audits/2026-09-10-home-and-outings.md](audits/2026-09-10-home-and-outings.md) — Moves between opening the app and being under way
- [audits/2026-09-10-outings.md](audits/2026-09-10-outings.md) — The live outing, its speed, and where the trace stops being drawn
- [audits/2026-09-10-stats.md](audits/2026-09-10-stats.md) — Which stats cards earn their place
- [audits/2026-09-20-quest-setup.md](audits/2026-09-20-quest-setup.md) — The controls that change a quest before it starts, measured on an emulator
- [audits/2026-10-11-onboarding.md](audits/2026-10-11-onboarding.md) — Install to first rep: 5 screens, 6 taps, 3 blockers, six personas, with captures

## Consistency contract

- Reuse shared primitives first (`card`, `button`, `header`, `state`, `screen`).
- If a screen needs a new visual pattern, add it to `design-system.md` before copying it elsewhere.
- If a screen breaks a rule, flag it in `ui-checklist.md` and add it to the UI backlog in
  [../planning/roadmap.md](../planning/roadmap.md) §2.

## Related

- [../gameplay/session-flow.md](../gameplay/session-flow.md) — screens that use these tokens
- [../screens/README.md](../screens/README.md) — screen-by-screen specs
