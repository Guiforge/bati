---
title: UI/UX Checklist
type: design
status: active
updated: 2026-07-18
related: [design-system.md]
---

# UI/UX Checklist (Bati)

> Practical quality gate for Bati screens. Use before every UI PR and before merge.

---

## 1) Clarity & hierarchy ("is it obvious?")

- [ ] One primary action is visually dominant on screen (`$primary`).
- [ ] No competing CTAs with equal emphasis.
- [ ] Titles explain purpose in 1 line; helper copy is short and specific.
- [ ] Critical workout data (timer/reps/current step) is above decorative content.

## 2) Visual consistency (tokens + components only)

- [ ] Uses Tamagui tokens only for color/spacing/radius (`$bgDark`, `$surface`, `$text`, etc.).
- [ ] No hardcoded hex in screen/components styles.
- [ ] Uses shared UI primitives (card/button/header/state components), not one-off visuals.
- [ ] **No thick white/off-white borders** on cards/buttons (the "white border ugly" issue).
- [ ] Border style is subtle and purposeful (`$borderStrong` or `$glassBorder`, usually 1px).

## 3) Accessibility (WCAG AA + gym lighting)

- [ ] Body text contrast ≥ 4.5:1; large text and meaningful icons ≥ 3:1.
      `__tests__/color-contrast.test.ts` holds this for every token written as `color="$x"`, and
      a token nobody has weighed fails there rather than on a screen. Resolve through the theme,
      not `rawColors`: `$muted` renders `#909ACB`.
- [ ] Secondary text remains readable under bright ambient light.
- [ ] Touch targets are at least 44×44 dp. `hitSlop` counts and is the usual answer when the
      design wants a smaller control; `uiautomator` bounds do not show it, so read the source
      before filing a 36×36 as a bug.
- [ ] State meaning is never color-only (icon, text, or shape reinforces status).
- [ ] Reduced motion is respected for non-essential animation.

## 4) Interaction quality (sport-first ergonomics)

- [ ] Core workout actions are reachable one-handed and low-friction.
- [ ] Press states are immediate and consistent.
- [ ] Loading, empty, and error states exist and are actionable.
- [ ] Back/cancel paths are always available in multi-step flows.

## 5) Copy & localization

- [ ] All user-facing strings use `t()` (EN/FR ready).
- [ ] Labels are concrete (avoid vague "Continue" when context is ambiguous).
- [ ] Error text explains what happened and what to do next.

## 6) Dark-only policy

- [ ] No light-theme logic in product UI.
- [ ] No color choices that rely on white backgrounds.

## 7) Final PR gate

- [ ] Visual diff checked on small + large phone screens, **and on one window a phone cannot
      make**. Android 16 ignores the portrait lock on large screens, so a tablet and an unfolded
      foldable resize the app today. `adb shell wm size 1840x2208` (a foldable's inner panel) is
      the cheapest one and the one that broke the Village: its "short screen" rule tested height,
      which only means what it says while width is the short side. Content is capped at
      `CONTENT_MAX_WIDTH`, so a screen that reads its own width from `useWindowDimensions` is
      reading the window rather than the column.
- [ ] `npm run check` passes.
- [ ] `npm test` passes.

---

## Reference

- [design-system.md](design-system.md) — the rules this checklist verifies
