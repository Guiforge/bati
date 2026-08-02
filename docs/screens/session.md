---
title: Session (Active Workout)
type: screen
route: /session
status: active
updated: 2026-08-02
related: [quest-details.md, session-details.md, journal.md, ../SESSION.md]
sources: [app/session.tsx, components/session/ActiveExerciseView.tsx, components/session/ExerciseHero.tsx]
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
  not a thumbnail in a frame. In a boss fight the arena takes that slot instead and the exercise
  art drops to a thumbnail beside its name; the screen swaps one image for the other, never
  stacks both.
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

The full-bleed exercise art lives in [`components/session/ExerciseHero.tsx`](../../components/session/ExerciseHero.tsx). Its gradient fades into the per-muscle screen colour, which means it needs that colour as a plain string: `getExerciseBgRawForSessionStep()` in [`constants/exerciseColors.ts`](../../constants/exerciseColors.ts) resolves it from the same token the screen itself uses, so the fade cannot end on a different colour than the background it fades into.
