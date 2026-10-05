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
  parchment: "#D9CFBC"
typography:
  display:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "44px"
    fontWeight: 700
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
    fontFamily: "Alegreya, Georgia, serif"
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
    borderColor: "{colors.border-strong}"  # sides; the bottom edge is primary-edge, 3px
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

The values above are a snapshot for tools that read this file. The code is the source:
colours live in [`constants/rawColors.ts`](constants/rawColors.ts) and nowhere else, fonts,
springs and themes in [`tamagui.config.ts`](tamagui.config.ts), and the space, size and radius
scales are Tamagui v4's defaults. When they disagree, the code wins and this file is the bug.

## 1) System intent

**Creative north star:** *Inked dark-fantasy BD*. The chrome speaks the art's language: a cold,
desaturated night (ink), one warm light (the braise), a chronicle serif, panel frames. Bati must
feel immersive but remain operationally clear in the middle of a workout.

- Sport-first ergonomics over decorative complexity.
- One-screen-one-priority hierarchy.
- Dark-only visual world.
- One content column, at most `CONTENT_MAX_WIDTH` (520 dp), even on a tablet.

## 2) Visual foundations

### Color roles

- `$primary`: the braise, one main action per screen. It is a **fill**: 3.75:1 on `$bgDark`,
  so never text. Its label is `$onPrimary` (4.77:1).
- `$primaryText`: the braise lifted for text and icons on dark grounds (6.5:1 at worst). It is
  also `$warning` and `$resourceFire`: fire is the brand's light, and a caution in amber was
  indistinguishable from the gold under deuteranopia.
- There is **no second accent**. Each use goes to the colour of its meaning: rewards and records
  `$resourceGold`, the boss's weakness and attack glyphs `$primaryText`, "hard" `$error`, an
  adventure in progress `$primaryText` (completed `$resourceGold`), a selected option `$primary`
  with `$onPrimary`, a plain count or metadata the neutral default.
- `$success` / `$warning` / `$error`: state feedback, always paired with a label or icon.
  Difficulty maps to them one-to-one (`DIFFICULTY_COLORS`): easy `$success`, medium `$primary`,
  hard `$error`.
- **Fills and their text.** `$primary` fills take `$onPrimary`. `$success`, `$error`, `$warning`
  and `$resourceGold` fills take `$bgDark` text (7.9, 5.8, 7.81, 10.1:1). Light text on those fills
  is banned (1.5 to 3.1:1).
- `$bgDark` (the Void, "encre froide"), `$surface`, `$surface2`: layered depth. `$bgOverlay` for
  sheets, `$bgOverlaySoft` or `$glassBg` + `$glassBorder` over artwork.
- **Braise means action.** Metadata (a quest card's type and muscle line, a duration, a count, a
  hero's own label) is never braise: it is ash, `$textSecondary`, its glyphs `$muted`. That covers
  the exercise list's "leads to X" captions and their link glyph, the "Yours" caption, the
  exercise picker's substitution caption, the quest config card's shield glyph and a kicker such
  as the prep screen's "FIRST TRIAL". A value that is itself an editable control keeps its colour.
  Braise marks actions and the few states named in this section, and these: the boss's weakness
  line and glyphs, the Home advice and kicker icons (`$primaryText`), the completed segments of an
  adventure's progress bar (`$primary`) and the avatar's fallback fill (`$primary`).
- **No violet.** `pastelPurple` is deleted. No card is violet: adventure cards, the adventure
  hero card and the quest detail's info card are `$surface` with the 1px `$borderStrong` frame;
  shoulder and mixed quests use `$bgLight`; the rest screen's wash is an ink fade of `$bgDark`.
- **The Home "Protect your hero" banner is quiet.** Its title stays bone (`$text`) and its body
  and shield ash; braise is only on the chevron. An ash title over an ash body loses the
  hierarchy, so "quiet" means no braise, not no bone.
- `$text` (bone), `$textSecondary` (ash): reading hierarchy. `$muted` resolves to `$textSecondary`
  through the theme; the raw grey `muted` in `rawColors.ts` is shadowed and should not carry text.
- `$resourceGold`: patinated gold, **earned**: every reward, record and progression figure or
  glyph (XP gained, trophies, achievement titles and glyphs, new-record badges, the Victory
  figures, the oath strip's `$goldHairline`). Oath progress bars sit on a `$gold800` track and the
  village tier bar is gold. Braise is *done*: it marks the action, never the prize. Only gold and
  fire are drawn as colours; the other resources are white game-icons glyphs.
- `$bossPhase2..4`: the boss room darkening and reddening after phase 1 on `$bgDark`.
- `$parchment`: the phylactère's paper, a step under bone so a speech bubble never outshines the
  screen's action. Ink text 12.6:1, `$ink800` name 9.3:1.
- `$mapWater`, `$mapWood`: the recap map's two own colours; everything else reuses a token.
- One source per value: no rgba literal outside `constants/rawColors.ts`. A gradient or text
  shadow that needs a translucent token calls `fade(token, alpha)`.

### The Journal theme

`<Theme name="journal">` remaps the app's keys instead of adding new ones, so shared components
follow without knowing: `$primary`, `$success` become `$resourceGold`, `$surface` becomes
`$surface2`, `$borderStrong` folds into `$surface2` (cards lose their outline), and "done / new /
still coming" are steps of the `$gold100..900` ramp rather than a green and a red. Journal text
opts into `fontFamily="$nocturne"` (Inter), since a font is not a theme value.

### Panels, not shadows

- Default border: 1px `$borderStrong`, or `$glassBorder` on glass. The one hero card of a screen
  (Home's quest stage, the Victory card) takes 1.5px.
- `$borderStrong` is 1.71:1 on `$bgDark`: decorative. A control is recognised by its fill and
  shape, never by its border alone.
- Avoid thick white/off-white border accents on cards and buttons.
- Cards have no drop shadow and there is no `flat` variant. Elevation comes from contrast and
  spacing. Toasts and overlays keep their soft shadow. There is no glow token any more.
- **Récitatif.** A quest title over its art sits in a rectangular ink cartouche (`$bgDark` fill,
  1px `$borderStrong`, radius `$1`, `$text`, title font) pinned to an edge of the art
  (`components/common/Recitatif.tsx`).
- **Phylactère.** A villager's spoken line is a parchment bubble (`$parchment` fill, `$bgDark`
  line 14 regular, speaker name `$ink800` 12/700, radius `$1`), never a dark card; one bubble
  style everywhere. In the in-flow villager line (`VillagerLine`) the face sits in a round ink
  **medallion** (48 dp, `$bgDark` fill, 1.5px `$borderStrong` ring) top-aligned with the bubble,
  and the tail points at the medallion's centre. The Village cameo keeps the full figure and its
  own tail.
- **Titles on art.** Quest-list and adventure cards carry their title in a Récitatif on the
  art's bottom-left edge, and the card body keeps its metadata. The exercise name over its
  illustration (`ExerciseHero`, and the exercise detail screen, frame radius `$3`) sits in a
  Récitatif too. The warm-up's exercise name is `$heading` 20.
- **Victory is a gold plate.** "QUEST COMPLETE!" is the Récitatif's kicker, in gold, and every
  reward figure is gold.
- **The boss HP gauge** (`BossHpGauge`): 10 dp tall, `$bgDark` track, 1.5px `$borderStrong` frame,
  fill coloured by `bossHpColor` (phase, enraged, down), the figure in `$body` tabular `$text`
  beside it. The arena draws it under the boss's name and the adventure's boss panel draws the
  same component, so a monster never reads two ways.
- No texture overlays, no halftone, no tilted panels, no hand-lettered fonts.

### Typography

- Titles: `Alegreya` (`$heading`), 700 (400 for the rare light heading). No letter spacing.
  Screen titles and the names of things in the world (quests, adventures, the village, buildings
  shown as titles) are titles; lists, labels, metadata and the Journal are not.
  Alegreya never sets a digit of the app's own: timers, HP, XP, levels and counts stay in
  `NotoSans` (`$body`) with tabular numerals. A title the hero wrote (a recap title, a quest
  name) may carry digits.
- **Every screen title is `$heading` 700**: Quest, Adventure, Exercises, Exercise, the quest
  editor, Settings, session details, Swear an Oath, the recap, credits, privacy, XP and the
  Journal's titles (through `NTitle`). The Journal's body stays Inter. The one exception is the
  what's-new title, which keeps the body font because it interpolates a version number.
- **One timer.** Every timer and countdown digit (warm-up, pre-start countdown, active, rest) is
  `$body` 700, tabular, `$text`. The one state colour is overtime, `$success`, also carried by the
  flame and the "target reached" label. Session progress bars stay braise: they are the session's
  action line.
- Body and utility reading: `NotoSans` (`$body`).
- The Journal: `Inter` (`$nocturne`).
- The **label** recipe: short, uppercase, `$body` 14/700, 2px tracking. Wide tracking belongs
  to short labels only, never body text.

### Spacing and radius

Tamagui v4 scales, not a 4px grid: `$1` 2, `$2` 7, `$3` 13, `$4` 18, `$5` 24, `$6` 32.
Radius scale: `$1` (3) tags and static chips, `$3` (7) cards (the rest screen's, the village's),
buttons, pressable chips (the filter rail's), quick-action tiles, inputs and dialogs, `$6` (16)
sheet tops, full circles for round icon buttons, steppers and avatars. Keep the exact tokens
rather than rounding.

### Motion

- `quick` spring (damping 30, stiffness 400): every card press, no overshoot, ~150 to 200 ms.
  Cards press to 0.99 / 0.92. `AppButton` has no `transition` at all, for any variant: its press
  is instant (the seal moves down 2px, the outline goes to 0.98 / 0.9), because a transition
  that toggles with a prop changes Tamagui's hook shape on a mounted button.
- `bouncy` spring (damping 14, stiffness 150): rewards only.
- Reduced motion follows the OS live; with it on, animations are switched off.

## 3) Component standards

### Consistency rules

- Use the same component family for the same job across screens.
- Do not invent a new card border or button glow unless it is a documented variant.
- Keep the default hierarchy stable: primary action, content, supporting action.
- Prefer tokens and shared primitives (`components/common/`) over screen-local styles.

### Buttons (`AppButton`, `AppIconButton`)

- Variants: `primary` (the **seal**) and `outline` (`$background`, `$text` label). `AppButton`
  derives the label colour and forbids `pressStyle`, `rounded` and `bg` overrides.
- Every button label is set in the title font (`$heading`, 20/700). The seal: radius `$3`, sides
  in `$borderStrong`, a 3px bottom edge in `$primaryEdge`, label in `$onPrimary`. Pressed, it moves down 2px and the edge takes the fill colour.
- **Every primary action is the seal**, session included: Home's Start (56 px) is an `AppButton`,
  and so are the session's Done and the rest screen's "I'm ready", at 64 px with a 24 px label.
  Past its target, Done turns `$success`: no edge, label in ink. No extra glow.
- Label colour follows the fill: `$onPrimary` on the braise, `$text` on the outline, ink
  (`$bgDark`) on `$success`, `$warning` and `$resourceGold`, `$onError` on `$error`.
- The outing's hold-to-finish button is 64 px, radius `$3`, its label in the title font.
- A **disabled primary** still reads as a button: `$surface2` fill, `$textSecondary` label
  (6.04:1), no seal edge. Opacity is not used to fake it (that measured 2.4:1).
- Interaction: consistent `pressed`, `disabled`, and loading states.
- Minimum hit area: 44x44. `AppButton` enforces it as `minH`; a smaller glyph or button gets
  `hitSlop` to reach it.

### Cards/containers (`Card`)

- `$surface` ground, radius `$3`, padding `$4`, 1px `$borderStrong`, no shadow.
- Use one card style family across screens; avoid nesting cards.

### Chips and tags

- `Chip` is interactive when it has `onPress`: 44 dp, radius `$3`, 2px border, tones `default` /
  `primary` / `success`. Static, it is radius `$1`.
- `Tag` is non-interactive metadata: radius `$1`, dark tint (`$pastelBlue`, `$pastelGreen`) under
  `$text`. It must never look like a button.

### Feedback and covers

- No decorative emoji where this direction applies: the end-of-session feedback and the quest and
  adventure cover fallbacks use game-icons glyphs through `GameIcon`.

### Inputs

- `Stepper` is the numeric input: 36 dp round buttons with `hitSlop` 8, Lucide `Minus` and `Plus`
  glyphs of the same size, value 18/700, hold to repeat and accelerate.
- Onboarding level choices, the village-name input and the Share chip are radius `$3`. The active
  set's tertiary links ("How to do it", "Replace", "I couldn't do this one") reach 44 dp through
  `hitSlop`.
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
- Known misses kept on purpose: `$borderStrong` is decorative (see above). `$error` is at least
  4.88:1 on every surface.
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
