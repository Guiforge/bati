---
title: Session (Active Workout)
type: screen
route: /session
status: active
updated: 2026-08-02
related: [quest-details.md, session-details.md, journal.md, ../SESSION.md]
sources:
  [
    app/session.tsx,
    components/session/ActiveExerciseView.tsx,
    components/session/ExerciseHero.tsx,
    components/session/BossArena.tsx,
    components/session/sessionArt.ts,
  ]
---

# Session (Active Workout) (`/session`)

## Purpose

The Session is where you **do the workout**.

It guides you exercise-by-exercise, tracks your results, and ends with a clear completion moment.

## Main features on this page

- **Exercise guidance loop**: move through the quest step-by-step.
- **Reps or timer completion**: different exercise types, same simple flow—do it, confirm it.
- **Rest moments**: recover between exercises/rounds when the quest includes rest.
- **Pause**: take a break without losing the session.
- **Finish + rewards**: after completion, you earn XP and loot and the session is saved.

## Visual rules

- **The artwork is the top of the screen.** The current movement runs full-bleed under the
  status bar with no border, no rounding and no inset — a picture you can read across a room,
  not a thumbnail in a frame. In a boss fight the arena takes that slot, taller (0.46 of the
  screen's height against the exercise's 0.34), and the exercise rides on the arena's own scrim: name, target muscle and a 36 px
  circular thumbnail over the art's base, so both images are on screen at once.
- **The boss owns the screen, including its colour.** During a fight the background comes from
  the boss's phase rather than the exercise's muscle — a fire dragon should not be fought on the
  "shoulders" pastel — and it darkens as the fight turns. Its health is a 10 dp gauge under the
  boss's name (framed track, phase-coloured fill, "422 / 425" beside it), the same
  `BossHpGauge` the campaign's boss panel draws.
- **The HUD floats over the art, on one line**: where you are (round, exercise), how far in
  (percentage plus a hairline bar), and the way out (pause). It carries no value the screen
  didn't already show — it just stopped printing the round twice.
- The timer / reps counter is still the loudest element on the screen. The bar under a running
  clock (rest, timed set, warm-up) steps once a second with the numeral and never eases: an
  animated bar held the JS thread at 40 % of a core for the whole clock
  ([performance](../architecture/performance.md), `TimerBar`).
- **Borders only where they mean something.** The counter is outlined in `$success` in overtime
  and bare otherwise; text on artwork is held by a gradient scrim, never by a box.
- Pause and victory states must feel like the same session system, not separate mini-apps.
- Celebration must respect reduced-motion preferences.

## Typical user actions

- Complete each exercise.
- Adjust results when needed (if you did a little more/less).
- Rest when prompted.
- Pause/resume if interrupted.

## What happens next

Completing the session leads to the post-workout result moment (victory/rewards), and your progress becomes visible in:

- **[Journal](journal.md)** (history + stats)
- **[Village](village.md)** (growth)
- **[Adventures](adventures.md)** (step completion if you were in a campaign)

## Implementation note

The current session implementation uses tokenized dark surfaces and reduced-motion gating for confetti so the workout flow stays readable and predictable.

The full-bleed exercise art lives in [`components/session/ExerciseHero.tsx`](../../components/session/ExerciseHero.tsx). Its gradient fades into the screen colour, which means it needs that colour as a plain string: the screen is `$bgDark` (`rawColors.bgDark`) outside a boss fight, and in one `getPhaseLook()` returns the pair, token and raw string, so the fade cannot end on a different colour than the background it fades into.

### The height budget

`sessionArtHeight()` in [`components/session/sessionArt.ts`](../../components/session/sessionArt.ts) is `min(height × factor, width × 1.1)`, with a factor of 0.34 for an exercise and 0.46 for a boss: the monster is the screen's subject, so its cut is taller. It answers three consumers. The arena is `height={artHeight}` (the 0.46 cut, 294 px at 640 dp) and grows with `flexGrow`. The hero's floor is the top inset plus `HUD_HEIGHT` plus 0.6 of the exercise cut (`heroMinHeight` in `ActiveExerciseView`, about 211 px at 640 dp with a 24 dp inset), and `LiveMap` on an outing takes the same floor (about 211 px, like the hero). The pre-start countdown takes 0.5 of the cut. Both art slots grow into whatever the counter and the CTA leave, so the art's height is not a pure function of the window. `BossTauntOverlay` renders above every session view and cannot measure any of this, so it does not call `sessionArtHeight()`; it anchors its bubble to the *top* of the art, under the HUD (`HUD_HEIGHT`), or under the rest header (`REST_HEADER_HEIGHT`) while resting, and never to the arena's bottom, where the boss's name and HP gauge sit. The bubble is narrowed to 180 dp so it covers less of the painting.

Every pixel over the floor comes straight out of the ScrollView below it. On a 360×640 running screen the hero's floor is about 211 px and the arena's 294 px, so the arena's floor is larger than the hero's and the ScrollView has that much less. `RestView` does not render the arena: a rest looks the same whether or not a boss is being fought, and its flame header (`REST_HEADER_HEIGHT`) takes the slot, because printing the boss's art as well costs more than the timer can spare.

The CTA is the ScrollView's **sibling**, never inside it, in both `ActiveExerciseView` and `RestView`. Fixed-height siblings do not shrink in RN (`flexShrink` is 0), so before that fix tall content pushed "done" past the bottom edge — worst on a boss fight, on a small screen, with "how to" expanded. `BossArena`'s status line swaps content instead of adding a row, and every branch of it is pinned to the same height, so the arena's height does not change mid-workout. The arena is the elastic child of its column: its `sessionArtHeight()` cut is its floor, and any slack the counter and CTA leave goes into the painting rather than a void between them.
