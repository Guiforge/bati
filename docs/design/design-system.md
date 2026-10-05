---
name: Bati
description: A minimal, ludic fitness RPG that turns strength training into a dark-fantasy quest.
source: constants/rawColors.ts, tamagui.config.ts, @tamagui/config/v4 defaults, components/common/
colors:
  primary: "#C2410C"
  primary-text: "#F08A4B"
  primary-hover: "#D4501A"
  primary-press: "#9A3412"
  primary-edge: "#7A2905"
  on-primary: "#FFF4E6"
  primary-glow: "rgba(194, 65, 12, 0.45)"
  success: "#6DB57A"
  warning: "#F08A4B"
  error: "#F0595D"
  bg-dark: "#0C0D11"
  bg-overlay: "rgba(12, 13, 17, 0.92)"
  bg-overlay-soft: "rgba(12, 13, 17, 0.72)"
  surface: "#15171C"
  surface-2: "#1D2027"
  glass-bg: "rgba(21, 23, 28, 0.65)"
  glass-border: "rgba(236, 228, 212, 0.14)"
  gold-hairline: "rgba(226, 181, 74, 0.22)"
  border-strong: "#363A44"
  text: "#ECE4D4"
  text-secondary: "#A89C88"
  shadow: "#000000"
  boss-phase-2: "#170F1D"
  boss-phase-3: "#1F0E18"
  boss-phase-4: "#280B12"
  map-water: "#0E1730"
  map-wood: "#101E1B"
  resource-gold: "#E2B54A"
  resource-fire: "#F08A4B"
  gold-100: "#F7ECCF"
  gold-300: "#EDCB76"
  gold-600: "#B08A2E"
  gold-700: "#5E4A1E"
  gold-800: "#362C15"
  gold-900: "#211B0E"
  ink-800: "#262A33"
  ink-900: "#101217"
typography:
  display:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: "52px"
  headline:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "35px"
    fontWeight: 700
    lineHeight: "42px"
  title:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "32px"
  label:
    fontFamily: "NotoSans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: "20px"
    letterSpacing: "2px"
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
  tag: "3px"      # $1, tags and static chips
  md: "7px"       # $3, cards, buttons, pressable chips, inputs
  sheet: "16px"   # $6, sheet tops
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
    textColor: "{colors.on-primary}"
    borderColor: "{colors.primary-edge}"
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
    rounded: "{rounded.md}"
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

**Creative north star:** *Inked dark-fantasy BD*: the chrome speaks the art's language (ink, bone, one
warm light, a chronicle serif, panel frames), immersive but operationally clear mid-workout.
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
- **Panels, not shadows.** Cards are a 1px `$borderStrong` frame (`$glassBorder` on glass) and
  carry no drop shadow; the one hero card of a screen (Home's quest stage, the Victory card)
  takes 1.5px. No thick white/off-white accent borders — that's a bug, not a style choice.
  Elevation comes from contrast and spacing; `$primaryGlow` is the only glow, once per screen.
  Toasts and overlays keep their soft shadow.
- **One accent.** The braise (`$primary` fill, `$primaryText` as text or icon) is the only
  accent; there is no second colour. Each use goes to the colour of its meaning: rewards and
  records `$resourceGold`, "hard" `$error`, a selected option `$primary`.
- **Fills and their text.** `$primary` fills take `$onPrimary`; `$success`, `$error`, `$warning`
  and `$resourceGold` fills take `$bgDark`. Light text on those is banned (2.0 to 3.6:1).
- **One source per value.** No rgba literal outside `constants/rawColors.ts`; a gradient or text
  shadow that needs a translucent token calls `fade(token, alpha)`.
- **No decorative emoji** where this direction applies (end-of-session feedback, quest and
  adventure cover fallbacks): use `GameIcon` glyphs. No texture overlays, halftone, tilted
  panels or hand-lettered fonts.
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

### Palette

Ink ground `$bgDark` (#0C0D11), `$surface` / `$surface2` above it, bone `$text`, ash
`$textSecondary`, braise `$primary` (#C2410C, fill) and `$primaryText` (#F08A4B, text on dark,
also `$warning` and `$resourceFire`), patinated gold `$resourceGold` (#E2B54A). Values and
contrast ratios live in [`constants/rawColors.ts`](../../constants/rawColors.ts); the
decision record is
[`docs/superpowers/specs/2026-10-05-bd-direction-design.md`](../superpowers/specs/2026-10-05-bd-direction-design.md).

### Typography

- Titles: `Alegreya` (`$heading`), 700 and 800, 400 for the rare light heading. No letter
  spacing, and never a digit: timers, HP, XP, levels and counts stay in `NotoSans` (`$body`)
  with tabular numerals.
- Body and utility reading: `NotoSans`.
- Wide tracking (2px) belongs to short labels only, never body text.

### Radius

`$1` (3) tags and static chips, `$3` (7) cards, buttons, pressable chips, inputs and dialogs,
`$6` (16) sheet tops, full circles for round icon buttons, steppers and avatars.

### Buttons

- Primary is the **seal**: `$primary` fill, radius `$3`, a 3px `$primaryEdge` bottom edge, label
  in the title font in `$onPrimary`. Pressed, it moves down 2px and the edge takes the fill
  colour; no spring. `AppButton` derives the label colour and forbids `pressStyle`, `rounded` and
  `bg` overrides.
- Secondary/ghost: `outline`, neutral or glass treatment.
- Consistent `pressed`, `disabled`, and loading states. Minimum hit area 44×44.

### Cards/containers

- `$surface` or `$glassBg` depending on semantic layer; one card style family app-wide.
- Group content, don't decorate with cards; avoid nesting unless IA truly requires it.

### Récitatif and phylactère

- A quest title over its art sits in a rectangular ink cartouche (`$bgDark` fill, 1px
  `$borderStrong`, radius `$1`, `$text`, title font) pinned to an edge of the art:
  [`Recitatif`](../../components/common/Recitatif.tsx).
- A villager's spoken line is a bone bubble (`$text` fill, `$bgDark` text, radius `$1`, a tail
  toward the speaker), never a dark card.

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
