---
title: Village bubble (bulle BD), hammer marker, banner
type: design
status: draft
updated: 2026-10-30
related: [../design-system.md, ../../designs/village-iso-v1/PLAN-SPEC-VI.md]
sources: [components/common/Recitatif.tsx, components/chorus/VillagerLine.tsx, components/chorus/VillagerCameo.tsx, components/village/VillageDetailSheet.tsx, components/common/FormSheet.tsx, components/village/iso/Reclame.tsx]
---

# Village bubble, hammer marker, banner

The three new components of the iso village V1 (card L6-T14). Specified here before any code, as the village spec asks. Nothing below invents a token or a string: every value is an existing one.

## 1. The bubble (bulle BD)

One bubble opens for everything tapped in the iso scene: building, stele, statue, boundary stone, keeper, healer. Same anatomy for all; only the fact changes.

### Anatomy

- Frame: the phylactere recipe (`$parchment` fill, radius `$1`, `$bgDark` 1.5px outline so it reads on any painting, night or day). Not a dark card, not a Tamagui `Sheet`.
- Tail: a small filled triangle on the frame edge facing the tapped element, pointing at its anchor (top-centre of the sprite's tap mask), same ink outline. `react-native-svg`, as in `VillagerLine` (`villager-tail`).
- Name: heading font 20/700, `$bgDark`, role `header`.
- Fact: one sentence, 14 regular, `$bgDark`, wraps freely, never `numberOfLines`, never `adjustsFontSizeToFit`. Example: "Forge, stage 3." or the `buildingMilestoneLine`.
- Date: 12/700 `$ink800` under the fact (the day it was earned, `getDateTimeFormat` with the existing `DATE_OPTIONS`). Absent when the element has none (keeper, healer).
- Figures (reps, `LevelPips`, `ProgressBar`): here only, never on the map (figures at tap only). Kept from `VillageDetailSheet`: level text, pips, the driver line, the bar with its two ends (`buildingScale`), `kept_level`, the milestone. All through the existing helpers (`rows.ts`, `milestoneLine.ts`).
- Primary action: `AppButton` (braise, the action colour), "Evolve" (`village.claim_action`), only when the building is ready, 48 dp high. At most one action. No close button inside: outside tap and Back close it.
- Secondary link: `QuestLink` as a text link under the fact when the building has one.

### States

| State | What shows |
| --- | --- |
| Simple | name, fact, date, figures |
| Ready to evolve | simple + hammer glyph (marker's shape) before the name, the line "Ready to evolve" (`village.claim_ready`), the braise button. Never colour alone: glyph, words and button |
| Loading | the deed list (`loadExtra`) loads after opening. The bubble opens at once with name and fact; extra rows are `Skeleton` blocks of fixed height, so nothing jumps. A failed load shows nothing and goes through `reportError("village.bubble", e)` |

The Journal's defeated-boss card keeps `VillageDetailSheet` (out of the scene).

### Placement

- Pure, tested function `placerBulle({ ancre, taille, ecran, insets })` in `components/village/iso/`: above the anchor by default; below when the room above is smaller than bubble height plus tail; then clamped horizontally into the safe area with an 8 dp margin; the tail follows the anchor, clamped inside the frame corners. If neither side fits, the bubble becomes the bottom sheet (below). Never off screen.
- Width: min(320 dp, window width minus 32), `CONTENT_MAX_WIDTH` on tablets.
- Landscape (about 360 dp high): the side with more room wins; a bubble taller than 70 percent of the window becomes the sheet.
- The anchor is read in screen space after the camera transform. A pan or pinch closes the bubble.
- Opening: opacity and a 150 ms scale from 0.96 (transform and opacity only); with `useReducedMotion`, no animation.

### Bottom sheet beyond 130 percent

When `fontScale` is above 1.3, or `placerBulle` finds no room, the same content renders in the bottom-sheet recipe of `VillageDetailSheet` (Tamagui `Sheet`, `snapPointsMode="fit"`, `disableDrag`, `Sheet.ScrollView` with `onMoveShouldSetResponder`, max height 90 percent, `maxW` `CONTENT_MAX_WIDTH`). Parchment and ink stay, no tail. One content component feeds both shells, so the text has one source. No third layout.

### Closing

- Tap outside: a transparent full-screen `Pressable` behind the bubble closes it and swallows the tap (no second element selected by the same tap).
- Android Back: the `BackHandler` pattern of `VillageDetailSheet` (registered while open, returns true, so the router never sees the press).
- Tapping another element replaces the bubble; tapping the same one closes it.

### Accessibility

- `accessibilityViewIsModal`. Reading order: name, fact, date, figures, action.
- On open, focus goes to the name (`AccessibilityInfo.setAccessibilityFocus`); on close, back to the tapped element's node.
- Each tappable scene node is named by its fact, built from the same data as the bubble: "Forge, stage 3, ready to evolve". Button label: "Evolve the Forge".
- Hit area at least 48 dp (the hit box grows around a small sprite without drawing); 12 tappable points at most, controls included.
- Contrast: ink on parchment 12.6:1, `$ink800` 9.3:1 (text 4.5:1); outline and tail 3:1 by the ink line; state never by colour alone.
- Checked at 100, 130 and 200 percent text, in 360 x 640, portrait and landscape; nothing cut.

### Reuse (no new primitive)

Tokens `$parchment`, `$bgDark`, `$ink800`, `$borderStrong`, radius `$1`; `AppButton`, `Skeleton`, `ProgressBar`, `LevelPips`, `QuestLink`; the tail of `VillagerLine`; the Back and Sheet recipe of `VillageDetailSheet`; `useFontScaled`, `useReducedMotion`. New code: one `Bulle` (shell and content) and the pure `placerBulle`. Colours only from `constants/rawColors.ts`.

### Copy

`locales/*.json`, `village.iso.*` (en, fr, de, es, ru): `bubble_date` ("Earned on {{date}}"), `bubble_loading`, `a11y_building` ("{{name}}, stage {{stage}}"), `a11y_ready` ("{{name}}, stage {{stage}}, ready to evolve"), `a11y_evolve` ("Evolve the {{name}}"). Reused as they are: `village.claim_action`, `village.claim_ready`, `village.claim_all`, `village.kept_level`, the driver and milestone strings. No em dash, "tu".

### What it replaces

On the iso map, `VillageDetailSheet` for buildings. The sheet stays for the list view, the Journal boss card and the flag-off path (F-Droid unchanged). Extract the stats of `BuildingDetail` into one `BuildingFacts` used by both, so the numbers have one writer.

### Don't

Cut text. Show figures on the map. Signal ready by colour alone. Stack two bubbles. Put a close button inside the bubble.

## 2. Hammer marker (coded: `components/village/iso/Reclame.tsx`)

- Anatomy: a bone (`rawColors.text`) hammer, dark outline (`rawColors.bgDark`, 1.6 stroke), 24-unit viewBox rotated 35 degrees, over the top-centre of the building body; diameter max(22 dp, 18 percent of the body width); `pointerEvents="none"` (the tap reaches the building); `testID` `iso-marteau-<code>`.
- States: drawn at rest and in reduced motion (a shape, not a colour). During a wave only, a gold glow ellipse (`resourceGold`, opacity up to 0.45) over the sprite shakes 0.04 rad, driven by the ambient clock (one animated node per building). Absent unless the building is in `ReclamablesContext.tous`.
- Placement: fixed above the building; only the glow moves.
- Accessibility: no node of its own; the building's name carries "ready to evolve".
- Tokens: `text`, `bgDark`, `resourceGold` (gold = earned).
- Known limits: the glow shakes over the sprite, not its pixels (shortcut noted in the file); hammer contrast against painted roofs is judged by eye, not measured.

## 3. Banner (return and anniversary, to code with the engine)

- Anatomy: a Recitatif cartouche (`$bgDark`, 1px `$borderStrong`, radius `$1`, `$text`, heading font) at the top edge of the scene: title, plus an optional 14 regular line. Gold kicker (`$resourceGold`) for an anniversary, none for a return. Reuse `Recitatif`; no new box.
- States: return, anniversary. One at a time; return wins.
- Placement: top, under the status-bar inset, width minus 16 dp margins, wraps and grows, never cut at 200 percent; landscape: top-left, 60 percent width at most.
- Behaviour: no notification; dismissed by a tap (48 dp tall at least) or at the next visit; the "seen" state is local, not synced.
- Accessibility: `header` role, announced once when the Village tab opens (`announceForAccessibility`), no focus trap; reduced motion: no slide.
- Copy: `village.iso.banner_return`, `village.iso.banner_anniversary`, all locales.

## Open decisions

1. Tail anchor on wide sprites: top-centre of the mask, or the tapped pixel.
2. Bubble on camera move: closes (proposed) or follows.
3. Date of a building: last evolution or first stone (engine data).
4. The 130 percent threshold read at mount only, or live.
5. Banner wording and "seen" key, after the engine lands.

## Decisions (team lead, 30/10, autonomy given by Guillaume)

- Tail anchor: the top centre of the tapped sprite's alpha-mask box, clamped to the screen.
- The bubble closes when the camera moves (pan or pinch); it never follows.
- Date: the last evolution of the building when known, otherwise no date line (never an invented date).
- The 130 % threshold is read live from the font scale, not once at mount.
- Banner text and its "seen" key wait for the village engine.

## As built in V1 (T14, accepted by the team lead on 30/10)

Code: `components/village/iso/bulle.ts` (pure rules), `components/village/iso/Bulle.tsx` (shell and building content), `BuildingFacts` and `BuildingLevel` in `components/village/VillageDetailSheet.tsx`. Where the build differs from the spec above:

- Figures in an ink caption: the name, the "ready" line and the fact sit on the parchment; the figures (level, pips, driver line, bar, milestone, deeds, Evolve) sit in a `bgDark` box inside it, a Récitatif within the speech bubble. `ProgressBar`, `LevelPips` and `SectionLabel` carry dark-theme colours that do not read on parchment, and a parchment theme would be a change to `tamagui.config.ts`. The sheet shell has the same box on parchment.
- No date line: `VillageBuilding` carries no evolution date, so the decision "never an invented date" leaves the line out, and `bubble_date` was not added. No new copy at all: `village.claim_ready`, `claim_ready_a11y`, `claim_action`, `claim_action_a11y` and `close` are reused.
- No TalkBack nodes in the scene: the map stays hidden from the screen reader and the village list stays its door (reading order belongs to T04). Focus goes to the name on open; it does not return to the tapped element on close.
- Tap area not enlarged: a small sprite's hit box is its mask only. Growing it to 48 dp would change the tap-precision criterion (L4-T04). `QuestLink` stays at 44 dp (shared with the list); Evolve is 48 dp.
- Placed once per opening: after the first measure the bubble never moves. Above its anchor it hangs from its tail's edge and grows upwards as the deeds load; it becomes the sheet only on its first measure (no room, or taller than 70 %), or live beyond 130 % text.
- Camera move: the backdrop takes the first touch anywhere outside the bubble, so a pan or pinch closes it before the map moves. A touch that travels more than 10 dp is a drag: it only closes. A tap is read at its press-in point and may open the building there.
