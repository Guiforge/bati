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

## Swearing: presets first

The default path is a deck of ready-made oaths (`OATH_PRESETS` in [db/oaths.ts](../../db/oaths.ts))
— tap one and it's sworn, no target to guess. Exercise presets name their exercise by `enName`
(stable seed content); the screen resolves the id and drops any preset whose exercise is absent.
A "custom oath" toggle reveals the original metric/target/exercise form for exact targets.

## Surfaces

1. **Home card** ([OathCard.tsx](../../components/home/OathCard.tsx)) — shows the sworn oath's
   progress, or a "swear an oath" CTA when none is set. It never hides: it is the only entry
   point to the feature from Home. The coach ([CoachCard](../../components/home/CoachCard.tsx))
   is now purely reactive (rest / weak-area), so the two no longer compete for the objective slot.
2. **Victory screen** ([SessionRewards.tsx](../../components/session/SessionRewards.tsx)) —
   the fulfilment card leads, above level-up and achievements: it is the user's own promise.
   Fulfilling an oath pays a flat `OATH_XP_BONUS` (added to the tip-over session's row, so the
   XP `SUM` and level pick it up with no extra state) and fires the big-win confetti burst.
3. **Swear screen** ([app/oath.tsx](../../app/oath.tsx)) — presets deck first, custom form behind
   a toggle. Reached from Settings, or by tapping the home card.

## Related

- [progression.md](progression.md) — the journal every metric reads from
- [coach-planning.md](coach-planning.md) — the weekly goal, the one other persisted setting
- [statistics-progress.md](statistics-progress.md) — same derive-on-read philosophy
