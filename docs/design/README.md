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

- [design.md](design.md) — ⭐ Best-practice entry point for design decisions
- [design-system.md](design-system.md) — ⭐ Design tokens (Tamagui, NEW_STYLE)
- [ui-guide.md](ui-guide.md) — UX principles + visual guide
- [ui-checklist.md](ui-checklist.md) — UI/UX design checklist
- [exercise-colors.md](exercise-colors.md) — Muscle group → color mapping
- [mobile-ux-handbook.md](mobile-ux-handbook.md) — Mobile interface standards (reference)

## Current design decisions (resolved)

- **Visual register:** Dark Fantasy / High-Tech HUD (single source of truth).
- **Theme:** Dark-only. No light-mode branch in product UI.
- **Borders:** No thick white/off-white accent borders on cards and buttons.
	Prefer subtle tokenized borders (`$borderStrong`, `$glassBorder`) and hierarchy via spacing,
	contrast, and glow.
- **Primary action clarity:** one dominant CTA per screen (usually `$primary` + controlled glow).
- **Readability in gym lighting:** text contrast targets WCAG AA minimum (4.5:1 body, 3:1 large).

## Consistency contract

These rules keep the UI looking like one product instead of a pile of good ideas:

- Reuse shared primitives first (`card`, `button`, `header`, `state`, `screen`).
- If a screen needs a new visual pattern, add it to `design-system.md` before copying it elsewhere.
- If a screen breaks one of the rules below, it must be flagged in `ui-checklist.md` and tracked in `docs/planning/ui-screen-audit-tracker.md`.
- Prefer hierarchy through spacing, contrast, and typography before borders or decoration.

## Related

- [../gameplay/session-flow.md](../gameplay/session-flow.md) — screens that use these tokens
- [../screens/README.md](../screens/README.md) — screen-by-screen specs
