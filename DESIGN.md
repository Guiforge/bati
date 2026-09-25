---
name: Bati
description: A minimal, ludic fitness RPG that turns strength training into a dark-fantasy quest.
source: constants/rawColors.ts, tamagui.config.ts, @tamagui/config/v4 defaults, components/common/
colors:
  primary: "#4A3FD6"
  primary-text: "#8177F7"
  primary-hover: "#5D53E8"
  primary-press: "#372FA6"
  primary-glow: "rgba(74, 63, 214, 0.45)"
  secondary: "#DB2777"
  success: "#16A34A"
  warning: "#F59E0B"
  error: "#FF1744"
  bg-dark: "#0B0F19"
  bg-overlay: "rgba(11, 15, 25, 0.92)"
  bg-overlay-soft: "rgba(11, 15, 25, 0.72)"
  surface: "#101322"
  surface-2: "#151A2E"
  glass-bg: "rgba(16, 19, 34, 0.65)"
  glass-border: "rgba(232, 236, 255, 0.14)"
  gold-hairline: "rgba(255, 215, 0, 0.22)"
  border-strong: "#2A3360"
  text: "#E8ECFF"
  text-secondary: "#909ACB"
  shadow: "#060812"
  boss-phase-2: "#170F1D"
  boss-phase-3: "#1F0E18"
  boss-phase-4: "#280B12"
  map-water: "#0E1730"
  map-wood: "#101E1B"
  resource-gold: "#FFD700"
  resource-wood: "#8B4513"
  resource-stone: "#808080"
  resource-fire: "#FF6B35"
  resource-water: "#4ECDC4"
  resource-wind: "#C9B1FF"
  resource-grain: "#DAA520"
  gold-100: "#FFF8D9"
  gold-300: "#FFE066"
  gold-600: "#C4A600"
  gold-700: "#6B5A12"
  gold-800: "#3A3110"
  gold-900: "#241F08"
  ink-800: "#232A44"
  ink-900: "#0E1220"
typography:
  display:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: "50px"
  headline:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "40px"
  title:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "32px"
  label:
    fontFamily: "SpaceGrotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: "20px"
    letterSpacing: "4px"
  body:
    fontFamily: "NotoSans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  button:
    fontFamily: "NotoSans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
  caption:
    fontFamily: "NotoSans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  journal-body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
rounded:
  tag: "7px"      # $3
  chip: "9px"     # $4, static chip
  md: "22px"      # $8, cards and buttons
  pill: "34px"    # $10, pressable chip
  full: "9999px"
spacing:
  xs: "2px"       # $1
  sm: "7px"       # $2
  md: "13px"      # $3
  lg: "18px"      # $4, card padding
  xl: "24px"      # $5
sizes:
  hit-target: "44px"
  content-max-width: "520px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text}"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.md}"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "#FFFFFF"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.md}"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.bg-overlay}"
    textColor: "{colors.text}"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.md}"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.md}"
    padding: "18px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "7px 13px"
  tag:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.tag}"
    padding: "2px 7px"
---

# Design System: Bati

The values above are a snapshot for tools that read this file. The code is the source:
colours live in [`constants/rawColors.ts`](constants/rawColors.ts) and nowhere else, fonts,
springs and themes in [`tamagui.config.ts`](tamagui.config.ts), and the space, size and radius
scales are Tamagui v4's defaults. When they disagree, the code wins and this file is the bug.

## 1) System intent

**Creative north star:** *The Hero's HUD*.

Bati must feel immersive but remain operationally clear in the middle of a workout.

- Sport-first ergonomics over decorative complexity.
- One-screen-one-priority hierarchy.
- Dark-only visual world.
- One content column, at most `CONTENT_MAX_WIDTH` (520 dp), even on a tablet.

## 2) Visual foundations

### Color roles

- `$primary`: deep indigo, one main action per screen. It is a **fill**: 2.7:1 on `$bgDark`,
  so never text. Write `$text` / `$onPrimary` on it (6.0:1).
- `$primaryText`: the same indigo lifted for text and icons on dark grounds (4.85 to 5.39:1).
- `$secondary`: magenta, occasional emphasis, `$white` on it.
- `$success` / `$warning` / `$error`: state feedback, always paired with a label or icon.
  Difficulty maps to them one-to-one (`DIFFICULTY_COLORS`): easy `$success`, medium `$primary`,
  hard `$error`.
- `$bgDark` (the Void), `$surface`, `$surface2`: layered depth. `$bgOverlay` for sheets,
  `$bgOverlaySoft` or `$glassBg` + `$glassBorder` over artwork.
- `$text`, `$textSecondary`: reading hierarchy. `$muted` resolves to `$textSecondary` through the
  theme; the raw slate `muted` in `rawColors.ts` is shadowed and should not carry text.
- `$resource*`: one colour per resource, always shown with its game icon. `$resourceGold` is
  progression (XP, rewards, the oath strip's `$goldHairline`).
- `$bossPhase2..4`: the boss room darkening and reddening after phase 1 on `$bgDark`.
- `$mapWater`, `$mapWood`: the recap map's two own colours; everything else reuses a token.

### The Journal theme

`<Theme name="journal">` remaps the app's keys instead of adding new ones, so shared components
follow without knowing: `$primary`, `$success` become `$resourceGold`, `$surface` becomes
`$surface2`, `$borderStrong` folds into `$surface2` (cards lose their outline), and "done / new /
still coming" are steps of the `$gold100..900` ramp rather than a green and a red. Journal text
opts into `fontFamily="$nocturne"` (Inter), since a font is not a theme value.

### Border/elevation rule

- Default border: 1px `$borderStrong`, or `$glassBorder` on glass.
- `$borderStrong` is 1.6:1 on `$bgDark`: decorative. A control is recognised by its fill and
  shape, never by its border alone.
- Avoid thick white/off-white border accents on cards and buttons.
- Elevation comes from contrast, spacing, and one card shadow (`$shadowColor`, radius 12,
  opacity 0.14, offset 0/6). `$primaryGlow` is the only glow, once per screen.
- Drop the shadow (`Card flat`) on list rows and grid tiles.

### Typography

- Hero/display moments: `SpaceGrotesk` (`$heading`), 700 for titles.
- Body and utility reading: `NotoSans` (`$body`).
- The Journal: `Inter` (`$nocturne`).
- The **label** recipe: short, uppercase, `$heading` 14/700, 4px tracking. Wide tracking belongs
  to short labels only, never body text.

### Spacing and radius

Tamagui v4 scales, not a 4px grid: `$1` 2, `$2` 7, `$3` 13, `$4` 18, `$5` 24, `$6` 32.
Radius `$3` 7, `$4` 9, `$8` 22, `$10` 34. Keep the exact tokens rather than rounding.

### Motion

- `quick` spring (damping 30, stiffness 400): every press, no overshoot, ~150 to 200 ms.
  Buttons press to scale 0.98 / opacity 0.9, cards to 0.99 / 0.92.
- `bouncy` spring (damping 14, stiffness 150): rewards only.
- Reduced motion follows the OS live; with it on, animations are switched off.

## 3) Component standards

### Consistency rules

- Use the same component family for the same job across screens.
- Do not invent a new card border or button glow unless it is a documented variant.
- Keep the default hierarchy stable: primary action, content, supporting action.
- Prefer tokens and shared primitives (`components/common/`) over screen-local styles.

### Buttons (`AppButton`, `AppIconButton`)

- Variants: `primary` (`$primary` fill), `secondary` (`$secondary`, `$white` label), `outline`
  (`$background`, `$text` label). All: radius `$8`, 1px `$borderStrong`, label 20/700.
- Interaction: consistent `pressed`, `disabled`, and loading states.
- Minimum hit area: 44×44. `AppButton` enforces it as `minH`; a smaller glyph or button gets
  `hitSlop` to reach it.

### Cards/containers (`Card`)

- `$surface` ground, radius `$8`, padding `$4`, 1px `$borderStrong`, card shadow.
- Use one card style family across screens; avoid nesting cards.

### Chips and tags

- `Chip` is interactive when it has `onPress`: 44 dp pill (radius `$10`), 2px border, tones
  `default` / `primary` / `secondary` / `success`.
- `Tag` is non-interactive metadata: flat (radius `$3`), dark tint (`$pastelBlue`, `$pastelPink`,
  `$pastelGreen`) under `$text`. It must never look like a button.

### Inputs

- `Stepper` is the numeric input: 36 dp round buttons with `hitSlop` 8, value 18/700, hold to
  repeat and accelerate.
- Legible text size and clear labels.
- Focus state must be obvious without over-bright effects.
- Validation copy must be actionable.

### Icons

- Use `useGameIcon` / `GameIcon` for fantasy, resource, and game-world icons (game-icons.net,
  white on transparent).
- Utility/navigation icons are Lucide, imported only through `components/icons.ts`.
- No direct `lucide-react-native` or `@tamagui/lucide-icons` imports in product UI.

## 4) Accessibility and legibility

- WCAG AA target: body 4.5:1, large text 3:1.
- Known misses kept on purpose: `$error` text on `$surface2` is 4.48:1; `$borderStrong` is
  decorative (see above).
- Ensure readability in bright gym conditions (not only dark-room previews).
- Never rely on color alone to convey status.
- Support reduced motion.

## 5) Design constraints

### Required

- Dark-only implementation.
- Tokens for color/spacing/radius/effects; raw colours only in `constants/rawColors.ts`
  (enforced by `.biome/plugins/noRawHexColor.grit`).
- i18n via `t()` for user-facing strings, following [`docs/product/writing.md`](docs/product/writing.md).
- Inline `style` only when React Native/Image/chart APIs require it; semantic colors and repeated
  visual recipes should use tokens/shared primitives.

### Forbidden

- Light-theme branching.
- Thick white accent borders as default visual style.
- Competing primary CTAs on the same screen.
- `$primary` as text colour.
- Decorative motion that slows task completion.
