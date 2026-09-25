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

### Art heroes

When artwork *is* the content — the boss you are fighting, the movement you are doing — it owns
its edge of the screen instead of sitting in a card. Used by
[`BossArena`](../../components/session/BossArena.tsx) and
[`ExerciseHero`](../../components/session/ExerciseHero.tsx); promoted here on its second use, per
§2. The recipe:

- Full width, no border, no inset. Height capped against *both* `width` and `height` from
  `useWindowDimensions` — one shared function, [`sessionArtHeight()`](../../components/session/sessionArt.ts),
  not a per-component expression — so a short screen still leaves the primary action room and two
  heroes in the same slot cannot end up different sizes.
- Text goes **on** the art, held by a `LinearGradient` scrim ending on the colour behind the
  image — never by a box or a shadow. The scrim is what carries AA contrast in gym lighting; it
  is not decoration and is not optional because one particular painting happens to be dark.
- Gradients cannot take a Tamagui token, so they read their endpoints from
  [`constants/rawColors.ts`](../../constants/rawColors.ts) — resolved from the same token the
  surrounding screen uses, so the fade cannot land on a near-miss colour.
- **A treatment darkens the art; it never repaints it.** When state has to change how a hero
  reads — a boss's phase, say — layer opacity over a token-coloured fill and let the painting keep
  its own colours. `bossPhase.ts` used to end on a flat 50 % red, which is not drama, it is a lost
  painting.

> This section was written while only `ExerciseHero` followed it: `BossArena` was still a rounded,
> bordered, shadowed card at `px="$4"` with art 45 % shorter than the hero on the other branch of
> the same screen. Both comply as of 2026-08-03. A recipe documented here is a claim about the
> code, and it is worth checking that the second user actually is one.

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
- [../planning/roadmap.md](../planning/roadmap.md) — §2, the UI closing pass and its backlog
