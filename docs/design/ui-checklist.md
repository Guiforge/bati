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

- [ ] Body text contrast ≥ 4.5:1; large text ≥ 3:1.
- [ ] Secondary text remains readable under bright ambient light.
- [ ] Touch targets are at least 44×44 dp.
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

- [ ] Visual diff checked on small + large phone screens.
- [ ] `npm run check` passes.
- [ ] `npm test` passes.

---

## Reference docs

- [design-system.md](design-system.md)
- [ui-guide.md](ui-guide.md)
- [mobile-ux-handbook.md](mobile-ux-handbook.md)
