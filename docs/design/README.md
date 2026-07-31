---
title: Design & UI
type: category
status: active
updated: 2026-07-18
related: [../README.md]
---

# Design & UI

> Visual design system, UX principles, and design checklists.

## Pages

- [design-system.md](design-system.md) — ⭐ Single source of truth: tokens, rules, decision order
- [ui-checklist.md](ui-checklist.md) — PR merge gate (checks the rules in design-system.md)
- [exercise-colors.md](exercise-colors.md) — Muscle group → color mapping

## Consistency contract

- Reuse shared primitives first (`card`, `button`, `header`, `state`, `screen`).
- If a screen needs a new visual pattern, add it to `design-system.md` before copying it elsewhere.
- If a screen breaks a rule, flag it in `ui-checklist.md` and add it to the UI backlog in
  [../planning/roadmap.md](../planning/roadmap.md) §2.

## Related

- [../gameplay/session-flow.md](../gameplay/session-flow.md) — screens that use these tokens
- [../screens/README.md](../screens/README.md) — screen-by-screen specs
