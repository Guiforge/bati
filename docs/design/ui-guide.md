---
title: UI Guide
type: design
status: active
updated: 2026-07-18
related: [design-system.md, ui-checklist.md, ../product/positioning.md]
---

# Bati UI Guide

> Product UI for athletes in motion: clear, fast, dark, and motivating.

## Product intent

Bati is a **sport-first** interface with RPG motivation. During a workout, clarity always wins over decoration.

- **Dark-only** environment.
- **One primary action** per screen.
- **Fast cognition** under variable gym lighting.
- **Minimal friction** for one-handed operation.

## Hard rules

These are not style suggestions; they are product rules.

- One screen = one primary action.
- Dark-only UI in product screens.
- No thick white/off-white borders on cards or buttons.
- No competing CTA styling on the same screen.
- No hardcoded color values when a token exists.
- No one-off visual systems unless they are promoted into the shared design system.

## Visual language

### Color behavior

- Base layers: `$bgDark` → `$surface`/`$surface2`.
- Action signal: `$primary` (reserved for the current main CTA).
- Secondary emphasis: `$secondary` only when it does not compete with `$primary`.
- Text: `$text` for core info, `$textSecondary` for supporting info.

### Borders and elevation

- Prefer subtle structure: `$borderStrong` or `$glassBorder` (typically 1px).
- Avoid thick white/off-white outlines on cards and buttons.
- Use glow as guidance, not decoration: one controlled glow around the main CTA.

### Typography

- Headings: `Space Grotesk`.
- Body/utility text: `Noto Sans`.
- Labels can use tracking; body paragraphs must not.

## UX principles

### 1) Clarity first

- Timer, reps, and current step are always visually dominant in session flows.
- If two actions look equally important, hierarchy is wrong.

### 2) Efficiency first

- The next workout action should be reachable in ≤2 taps.
- Avoid modal-heavy paths when inline progression is possible.

### 3) Feedback with restraint

- Press feedback: immediate scale/opacity response.
- Success moments: short, satisfying, skippable.
- Reduced-motion alternatives are mandatory.

### 4) Accessible by default

- WCAG AA targets: 4.5:1 body, 3:1 large text.
- Touch targets ≥44×44.
- State is never color-only.

## Component guidance

### Buttons

- Primary CTA: `$primary`, full-width when action is critical.
- Secondary CTA: neutral/glass variant.
- Disabled state must remain legible and clearly inactive.

### Cards

- Use cards to group content, not as decoration.
- Do not nest cards unless information architecture truly requires it.
- Keep card radius, border, and shadow recipes consistent across the app.

### Shared primitives

- Prefer the established screen/header/card/button primitives before creating new variants.
- If a new pattern appears on a second screen, move it into the shared system.
- Avoid “just this once” styling; that is how border drift and random glows spread.

### Inputs

- Keep text size readable (16px body-equivalent on mobile).
- Show clear labels and practical validation copy.

## Anti-patterns to reject

- Thick white accent borders as default style.
- Multiple glowing elements competing for attention.
- Color-only status communication.
- Long copy blocks inside action-critical screens.
- Any light-theme branch or dual-theme logic in product UI.

## Implementation note

Always use Tamagui tokens and shared UI primitives. For iconography, route through `@/hooks/useGameIcon`.
