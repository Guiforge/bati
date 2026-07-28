---
name: Bati
description: A minimal, ludic fitness RPG that turns strength training into a dark-fantasy quest.
colors:
  primary: "#0D33F2"
  primary-hover: "#2E5CFF"
  primary-press: "#0A25B0"
  primary-glow: "rgba(13, 51, 242, 0.45)"
  secondary: "#DB2777"
  success: "#16A34A"
  error: "#FF1744"
  bg-void: "#0B0F19"
  bg-overlay: "rgba(11, 15, 25, 0.92)"
  surface: "#101322"
  surface-raised: "#151A2E"
  glass-bg: "rgba(16, 19, 34, 0.65)"
  glass-border: "rgba(232, 236, 255, 0.14)"
  border-strong: "#2A3360"
  text: "#E8ECFF"
  text-secondary: "#909ACB"
  muted: "#64748B"
  shadow: "#060812"
typography:
  display:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: "50px"
    letterSpacing: "0"
  headline:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "0"
  title:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "0"
  body:
    fontFamily: "NotoSans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0"
  label:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: "20px"
    letterSpacing: "4px"
rounded:
  sm: "$4"
  md: "$8"
  pill: "$10"
  full: "9999px"
spacing:
  xs: "$1"
  sm: "$2"
  md: "$3"
  lg: "$4"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg-void}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.bg-overlay}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
---

# Design System: Bati

> Single canonical page for design decisions, tokens, and component standards — merged
> from the former `design.md` and `ui-guide.md` to remove duplicate rule statements.
> Read this first when designing or reviewing a screen; run [ui-checklist.md](ui-checklist.md)
> before merging.

## 1) System intent

**Creative north star:** *The Hero's HUD* — immersive but operationally clear mid-workout.
Ties directly to [roadmap.md](../planning/roadmap.md) (north star) and
[positioning.md](../product/positioning.md) (brand): sport-first ergonomics over decorative
complexity, dark-only visual world, one-screen-one-priority hierarchy.

### Decision order (use this when designing or reviewing a screen)

1. **Primary action?** If there's no clear answer, the screen isn't ready.
2. **Content hierarchy?** Title → primary action → supporting content → secondary actions.
3. **Shared primitive?** Reuse a card/button/header/state component before inventing one.
4. **Visual weight?** Prefer spacing, contrast, and typography before borders or decoration.
5. **Gym-lighting failure mode?** Check readability, contrast, and tap targets early.

## 2) The rules (stated once)

- **Dark-only.** No light theme, no per-OS reskinning, no white flash.
- **One primary CTA per screen.** No competing equal-weight actions.
- **Borders are subtle.** `$borderStrong` / `$glassBorder`, 1px. No thick white/off-white
  accent borders — that's a bug, not a style choice. Elevation comes from contrast, spacing,
  and controlled glow, not outlines.
- **Tokens only.** No hardcoded hex/spacing in screens or components; reuse shared
  primitives (`card`, `button`, `header`, `state`) instead of one-off visuals. If a pattern
  appears on a second screen, promote it into this file before copying it again.
- **Accessible by default.** WCAG AA: body 4.5:1, large text 3:1. Touch targets ≥44×44.
  State is never color-only — pair with icon, label, or shape. Respect reduced-motion.
- **Efficiency.** The next workout action should be reachable in ≤2 taps; avoid modal-heavy
  paths when inline progression works.
- **Icons.** `useGameIcon`/`GameIcon` for fantasy/resource/game-world icons;
  `@tamagui/lucide-icons` for utility/navigation icons. No direct `lucide-react-native`
  imports in product UI.

## 3) Visual foundations

### Typography

- Hero/display moments: `SpaceGrotesk`.
- Body and utility reading: `NotoSans`.
- Wide tracking belongs to short labels only, never body text.

### Buttons

- Primary: `$primary` fill, high-contrast text, optional restrained glow.
- Secondary/ghost: neutral or glass treatment.
- Consistent `pressed`, `disabled`, and loading states. Minimum hit area 44×44.

### Cards/containers

- `$surface` or `$glassBg` depending on semantic layer; one card style family app-wide.
- Group content, don't decorate with cards; avoid nesting unless IA truly requires it.

### Inputs

- Legible text size (16px body-equivalent), clear labels, actionable validation copy.
- Focus state must be obvious without over-bright effects.

## 4) What good looks like

- The user can tell what to do in a single glance.
- The most important action is visually dominant without shouting.
- A new screen looks like it belongs to the same app as the previous one.

## 5) Anti-patterns to reject

- Thick white/off-white accent borders as default style.
- Multiple glowing elements competing for attention.
- Color-only status communication.
- Long copy blocks inside action-critical (mid-workout) screens.
- Any light-theme branch or dual-theme logic in product UI.
- A one-off visual pattern that isn't promoted here once it's reused.

## Related

- [ui-checklist.md](ui-checklist.md) — merge gate that checks these rules
- [exercise-colors.md](exercise-colors.md) — muscle → color mapping
- [../product/positioning.md](../product/positioning.md) — brand personality behind these rules
- [../planning/ui-screen-audit-tracker.md](../planning/ui-screen-audit-tracker.md) — where drift gets logged
