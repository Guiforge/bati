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
  not a thumbnail in a frame. In a boss fight the arena takes that slot, at exactly the same
  size, and the exercise rides on the arena's own scrim: name, target muscle and a 36 px
  circular thumbnail over the art's base, so both images are on screen at once.
- **The boss owns the screen, including its colour.** During a fight the background comes from
  the boss's phase rather than the exercise's muscle — a fire dragon should not be fought on the
  "shoulders" pastel — and it darkens as the fight turns. Its health is a 3 px hairline at the
  screen's top edge, where a game puts a boss bar, not a widget captioned under a picture.
- **The HUD floats over the art, on one line**: where you are (round, exercise), how far in
  (percentage plus a hairline bar), and the way out (pause). It carries no value the screen
  didn't already show — it just stopped printing the round twice.
- The timer / reps counter is still the loudest element on the screen.
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

The full-bleed exercise art lives in [`components/session/ExerciseHero.tsx`](../../components/session/ExerciseHero.tsx). Its gradient fades into the per-muscle screen colour, which means it needs that colour as a plain string: `getExerciseBgRawForSessionStep()` in [`constants/exerciseColors.ts`](../../constants/exerciseColors.ts) resolves it from the same token the screen itself uses, so the fade cannot end on a different colour than the background it fades into. `getPhaseLook()` returns the same pair — token and raw string — for a boss fight, for the same reason.

### The height budget

`sessionArtHeight()` in [`components/session/sessionArt.ts`](../../components/session/sessionArt.ts) is `min(height × 0.42, width × 1.1)`, and it is the single answer for three consumers: the hero, the arena, and `BossTauntOverlay`, which renders above every session view and so cannot measure the arena — it anchors its bubble to `sessionArtHeight(width, height) - 8` instead, correct in both `running` and `resting` because the arena starts at y=0 in both.

Every pixel over that comes straight out of the ScrollView below it. On a 360×640 running screen the arena is 269 px and the ScrollView gets 265, against ~226 of rep content — about 39 px of slack. That is why the arena is *equal* to the hero rather than larger, and why `RestView` drops its flame header during a fight: the boss is the screen's title there, and printing both costs more than the timer alone can spare.

The CTA is the ScrollView's **sibling**, never inside it, in both `ActiveExerciseView` and `RestView`. Fixed-height siblings do not shrink in RN (`flexShrink` is 0), so before that fix tall content pushed "done" past the bottom edge — worst on a boss fight, on a small screen, with "how to" expanded. `BossArena`'s status line swaps content instead of adding a row, and every branch of it is pinned to the same height, so the arena's height stays a pure function of the window and the CTA cannot move mid-workout.
