# BD direction: visual identity refresh

Validated by the owner on 2026-10-05, after a design review and an adversarial audit. The choices
were made in the artifact "L'atelier des choix" (https://claude.ai/artifact/MBpGMarmn96QEFQ26iBiEz,
db document `choix/bati`, 14 decisions, all on the post-audit recommendation).

## Why

Bati's illustrations are inked dark-fantasy BD: a cold, desaturated night lit by warm sources (an
axe in a sunbeam, a window, a torch). Measured averages: quest art #373637, Ombre-Lovée #282A35,
forest titan #334039, the logo #3B4D5E. The chrome around them spoke SaaS: electric indigo, a
saturated blue-night ground, Space Grotesk, magenta, emoji, CSS-default resource colours. The
refresh moves the chrome to the art's own language (ink, bone, one warm light, a chronicle
serif, panel frames) without giving up anything a lifter needs mid-set.

## The palette (`constants/rawColors.ts`)

| token | old | new | note |
|---|---|---|---|
| bgDark | #0B0F19 | #0C0D11 | "encre froide", also app.json and the committed colors.xml |
| bgOverlay | rgba(11,15,25,.92) | rgba(12,13,17,.92) | |
| bgOverlaySoft | rgba(11,15,25,.72) | rgba(12,13,17,.72) | |
| surface | #101322 | #15171C | |
| surface2 | #151A2E | #1D2027 | |
| bgLight | #101322 | #15171C | = surface |
| borderStrong | #2A3360 | #363A44 | decorative only, as before |
| glassBg | rgba(16,19,34,.65) | rgba(21,23,28,.65) | |
| glassBorder | rgba(232,236,255,.14) | rgba(236,228,212,.14) | |
| glassBorderClear | rgba(232,236,255,0) | rgba(236,228,212,0) | |
| bgDarkClear | rgba(11,15,25,0) | rgba(12,13,17,0) | |
| text | #E8ECFF | #ECE4D4 | "os" |
| textSecondary | #909ACB | #A89C88 | |
| muted | #64748B | #6B707B | icons and tints only |
| primary | #4A3FD6 | #C2410C | "braise", a fill |
| primaryText | #8177F7 | #F08A4B | braise as text/icon on dark |
| primaryHover | #5D53E8 | #D4501A | |
| primaryPress | #372FA6 | #9A3412 | |
| primaryEdge | (new) | #7A2905 | the button's bottom edge |
| onPrimary | (theme → text) | #FFF4E6 | new raw colour; label on a primary fill (4.77:1) |
| primaryGlow | rgba(74,63,214,.45) | removed | the glow was dropped in the audit fixes (2026-10-05); there is no glow token |
| secondary | #DB2777 | removed | every use reassigned by meaning, see below |
| success | #16A34A | #6DB57A | |
| warning | #F59E0B | = primaryText #F08A4B | amber was indistinguishable from gold under deuteranopia |
| error | #FF1744 | #F0595D | >= 4.88:1 on every surface |
| shadowColor | #060812 | #000000 | |
| goldHairline | rgba(255,215,0,.22) | rgba(226,181,74,.22) | |
| resourceGold | #FFD700 | #E2B54A | "or patiné" |
| resourceFire | #FF6B35 | = primaryText #F08A4B | fire is the brand's braise |
| resourceWood/Stone/Water/Wind/Grain | ... | removed | zero consumers |
| gold100/300/600/700/800/900 | #FFF8D9 #FFE066 #C4A600 #6B5A12 #3A3110 #241F08 | #F7ECCF #EDCB76 #B08A2E #5E4A1E #362C15 #211B0E | the Journal's ramp |
| ink800 / ink900 | #232A44 / #0E1220 | #262A33 / #101217 | |
| parchment | (new) | #D9CFBC | the phylactère's paper, a step under bone; ink text 12.6:1, ink800 name 9.3:1 |
| pastelBlue | #1A2633 | #18202A | |
| pastelPink | #331A22 | #2A1719 | now an error tint |
| pastelGreen | #1A3320 | #16261B | |
| pastelYellow | #33301A | #2A2413 | |
| pastelPurple | #261A33 | removed (iteration 2) | no card is violet; shoulder and mixed quests use `$bgLight` |
| pastelOrange | #332618 | #2B1B12 | |
| bossPhase2/3/4, mapWater, mapWood, sheetScrim, white, black | | unchanged | |

`DIFFICULTY_COLORS` keeps its mapping (easy success, medium primary, hard error) with the new values.

## Rules

1. **Fills and their text.** `primary` fills take `$onPrimary`. `success`, `error`, `warning` and
   `resourceGold` fills take `$bgDark` text (7.9, 5.8, 8.9, 10.1:1). Light text on those fills is
   banned (2.0 to 3.6:1).
2. **No second accent.** Each former `$secondary` use takes the colour of its meaning: rewards and
   records `$resourceGold`, the boss's weakness and attack glyphs `$primaryText`, "hard" `$error`,
   an adventure in progress `$primaryText` (completed `$resourceGold`), a selected option `$primary`
   with `$onPrimary`, a plain count or metadata the neutral default.
3. **Titles in Alegreya** (700, 800; 400 for the rare light heading). Alegreya never sets a digit of the app's own:
   timers, HP, XP, levels and counts stay in Noto Sans (`$body`) with tabular numerals. No letter
   spacing on Alegreya.
4. **Radius scale:** `$1` (3) tags and static chips, `$3` (7) cards, buttons, pressable chips,
   inputs and dialogs, `$6` (16) sheet tops, full circles for round icon buttons, steppers, avatars.
5. **Panels, not shadows.** Cards have no drop shadow. A 1 px `$borderStrong` frame; the one hero
   card of a screen (Home's quest stage, the Victory card) takes 1.5 px. Toast and overlays keep
   their soft shadow.
6. **The seal button.** Primary AppButton: radius `$3`, a 3 px bottom edge in `$primaryEdge`, label
   in the title font in `$onPrimary`. Pressed: moves down 2 px and the edge takes the fill colour.
   No spring on press.
7. **Récitatif.** A quest title over its art sits in a rectangular ink cartouche (`$bgDark` fill,
   1 px `$borderStrong`, radius `$1`, `$text`, title font) pinned to an edge of the art.
8. **Phylactère.** A villager's spoken line is a parchment bubble (`$parchment` fill, `$bgDark`
   text in regular weight, speaker name `$ink800`, radius `$1`), never a dark card. The face sits
   in the in-flow villager line (`VillagerLine`) in a round ink medallion top-aligned with the
   bubble, and the tail points at its centre. The bubble style is the same everywhere; the Village
   cameo keeps its full figure and own tail.
9. **No decorative emoji** where this refresh touches: the end-of-session feedback and the quest and
   adventure cover fallbacks use game-icons glyphs through `GameIcon`.
10. **No texture overlays, no halftone, no tilted panels, no hand-lettered fonts.**
11. **One source per value:** no rgba literal outside `constants/rawColors.ts`; a gradient or text
    shadow needing a translucent token calls `fade(token, alpha)`.

## Iteration 2 (2026-10-06, decisions G to N)

Born from an expert audit of iteration 1 (not validated). The code is on `feat/bd-direction`.

- **G. Gold is earned, braise is done.** Every reward, record and progression figure or glyph is
  `$resourceGold`: XP gained, trophies, achievement titles and glyphs, new-record badges, oath
  progress bars (on a `$gold800` track), the village tier bar. The boss's weakness line and
  glyphs are `$primaryText`.
- **H. Metadata is never braise.** "Leads to X" captions and their glyph (exercise list), "Yours",
  the picker's substitution caption, the quest config card's shield, kickers like "FIRST TRIAL":
  `$textSecondary`, glyphs `$muted`. A value that is itself an editable control keeps its colour.
- **I. No violet.** `pastelPurple` is deleted (see the palette). Adventure cards, the adventure
  hero card and the quest detail card are `$surface` with the 1 px frame; the rest screen's wash
  is an ink fade; shoulder and mixed quests use `$bgLight`.
- **J. One screen title.** Every screen title is `$heading` 700, the Journal's through `NTitle`;
  the Journal body stays Inter; the what's-new title keeps the body font (it interpolates a
  version).
- **K. One timer.** `$body` 700, tabular, `$text` for every timer and countdown digit. Overtime
  keeps `$success` (ruling B2: a meaningful state, also carried by the flame and the label).
  Session progress bars stay braise.
- **L. Controls on the scale.** A disabled primary is `$surface2` with a `$textSecondary` label
  (6.04:1), no seal. Stepper minus and plus are Lucide `Minus` and `Plus`. Onboarding choices, the
  village-name input and the Share chip are radius `$3`. Tertiary links in the active set reach
  44 dp through `hitSlop`.
- **M. Engagement.** The boss HP gauge: 10 dp, `$bgDark` track, 1.5 px `$borderStrong` frame, fill
  from `bossHpColor`, the figure in `$body` tabular `$text`; one shared `BossHpGauge` for the arena
  and the adventure boss panel (ruling B4). Titles on art in a Récitatif: quest and adventure
  cards (bottom-left), the exercise detail (radius `$3`); the warm-up name is `$heading` 20.
  Victory is a gold plate with "QUEST COMPLETE!" as the Récitatif's gold kicker. The Home
  "Protect your hero" banner keeps a bone title over ash body and shield, braise on the chevron
  only (ruling B1). Hero-written titles under `$heading` may carry digits (ruling B3).
- **N. History placeholder.** The "-- ·" leaking into a Journal history row is fixed at its
  formatter.

## Out of scope (follow-ups)

The long tail of numeric `rounded={n}` values in feature screens; decorative emoji in error and
empty states, the widget and the DB splash; lettering for "QUÊTE ACCOMPLIE !" and critical hits;
the adventure road as a strip of panels; the store screenshots and feature graphic artwork.
