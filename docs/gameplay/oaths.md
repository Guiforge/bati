---
title: Oaths (Serments)
type: system
status: active
updated: 2026-07-21
related: [progression.md, coach-planning.md, statistics-progress.md, ../planning/system-redesign-options.md]
sources: [db/oaths.ts, app/oath.tsx, components/home/OathCard.tsx]
---

# Oaths

## Summary

An **Oath** is a target the user sets for themself — "10 pull-ups in a row", "1000 push-ups",
"a 30-day flame". It is stored as **one JSON key in `user_preferences`**: no table, no
migration, no parallel state machine. Progress is a pure function of the session journal,
recomputed on read exactly like [achievements](../../db/achievements.ts).

## Why not a coach goal

[coach-planning.md](coach-planning.md) deliberately rejected typed goals with plan
generation ([system-redesign-options.md](../planning/system-redesign-options.md) §7, Option
C): auto-generated training advice needs validation by a sports professional before the app
can safely tell someone what to do.

An Oath sidesteps that entirely — **the user chooses the target, Bati only counts.** The app
never prescribes, so there is nothing to validate.

## The one stored value

```ts
type Oath = {
  metric: "exercise_pr" | "exercise_volume" | "sessions" | "streak";
  exerciseId: number | null;   // required by the exercise_* metrics
  target: number;
  swornAt: string;
  fulfilledAt: string | null;  // written once, so the victory screen fires once
};
```

`fulfilledAt` is the only thing ever written after swearing. Everything else is derived.

## Metrics

| Metric | Example | Derived from |
| --- | --- | --- |
| `exercise_pr` | "10 pull-ups in a row" | `MAX(resultValue)` for that exercise |
| `exercise_volume` | "1000 push-ups" | `SUM(resultValue)` for that exercise |
| `sessions` | "100 sessions" | `COUNT(*)` on the journal |
| `streak` | "a 30-day flame" | `getStreakInfo().best` |

## One oath at a time

`swearOath()` replaces any existing oath. A list of simultaneous targets is a todo list, not
an oath — the weight of the commitment is the point.

## Surfaces

1. **Home card** ([OathCard.tsx](../../components/home/OathCard.tsx)) — sits under the coach
   nudge. The coach says what to do this week; the oath says what you are working toward.
   Renders nothing when no oath is sworn, so it never competes with the coach for the slot.
2. **Victory screen** ([SessionRewards.tsx](../../components/session/SessionRewards.tsx)) —
   the fulfilment card leads, above level-up and achievements: it is the user's own promise.
3. **Swear screen** ([app/oath.tsx](../../app/oath.tsx)) — metric, target, exercise. Reached
   from Settings, or by tapping the home card.

## Related

- [progression.md](progression.md) — the journal every metric reads from
- [coach-planning.md](coach-planning.md) — the weekly goal, the one other persisted setting
- [statistics-progress.md](statistics-progress.md) — same derive-on-read philosophy
