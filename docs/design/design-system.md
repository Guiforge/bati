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
  resource-gold: "#FFD700"
  resource-wood: "#8B4513"
  resource-stone: "#808080"
  resource-fire: "#FF6B35"
  resource-water: "#4ECDC4"
  resource-wind: "#C9B1FF"
  resource-grain: "#DAA520"
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

## 1) System intent

**Creative north star:** *The Hero's HUD*.

Bati must feel immersive but remain operationally clear in the middle of a workout.

- Sport-first ergonomics over decorative complexity.
- One-screen-one-priority hierarchy.
- Dark-only visual world.

## 2) Visual foundations

### Color roles

- `$primary`: one main action per screen.
- `$secondary`: occasional secondary emphasis.
- `$success` / `$error`: state feedback, always paired with label/icon.
- `$bgDark`, `$surface`, `$surface2`: layered depth.
- `$text`, `$textSecondary`, `$muted`: reading hierarchy.

### Border/elevation rule (updated)

- Default borders are subtle (`$borderStrong`, `$glassBorder`, usually 1px).
- Avoid thick white/off-white border accents on cards and buttons.
- Elevation comes from contrast, spacing, and controlled glow (not noisy outlines).

### Typography

- Hero/display moments: `SpaceGrotesk`.
- Body and utility reading: `NotoSans`.
- Wide tracking belongs to short labels only, never body text.

## 3) Component standards

### Consistency rules

- Use the same component family for the same job across screens.
- Do not invent a new card border or button glow unless it is a documented variant.
- Keep the default hierarchy stable: primary action, content, supporting action.
- Prefer tokens and shared primitives over screen-local styles.

### Buttons

- Primary: `$primary` fill, high-contrast text, optional restrained glow.
- Secondary/ghost: neutral or glass treatment.
- Interaction: consistent `pressed`, `disabled`, and loading states.
- Minimum hit area: 44×44.

### Cards/containers

- Use `$surface` or `$glassBg` depending on semantic layer.
- Use one card style family across screens.
- Prefer a single border treatment and avoid decorative nesting.

### Inputs

- Legible text size and clear labels.
- Focus state must be obvious without over-bright effects.
- Validation copy must be actionable.

### Icons

- Use `useGameIcon` / `GameIcon` for fantasy, resource, and game-world icons.
- Utility/navigation icons may use `@tamagui/lucide-icons`.
- No direct `lucide-react-native` imports in product UI.

## 4) Accessibility and legibility

- WCAG AA target: body 4.5:1, large text 3:1.
- Ensure readability in bright gym conditions (not only dark-room previews).
- Never rely on color alone to convey status.
- Support reduced motion.

## 5) Design constraints

### Required

- Dark-only implementation.
- Tokens for color/spacing/radius/effects.
- i18n via `t()` for user-facing strings.
- Inline `style` only when React Native/Image/chart APIs require it; semantic colors and repeated
  visual recipes should use tokens/shared primitives.

### Forbidden

- Light-theme branching.
- Thick white accent borders as default visual style.
- Competing primary CTAs on the same screen.
- Decorative motion that slows task completion.
