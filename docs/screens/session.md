---
title: Session (Active Workout)
type: screen
route: /session
status: active
updated: 2026-07-14
related: [quest-details.md, session-details.md, journal.md, ../SESSION.md]
sources: [app/session.tsx]
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

- The timer / reps counter should be the loudest element on the screen.
- Progress bars and support cards should use subtle tokenized borders.
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
