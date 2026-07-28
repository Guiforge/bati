---
title: Oaths (Serments)
type: system
status: active
updated: 2026-07-28
related: [progression.md, coach-planning.md, statistics-progress.md, ../planning/system-redesign-options.md]
sources: [db/oaths.ts, db/oathReminder.ts, app/oath.tsx, components/home/OathCard.tsx, src/notifications.ts]
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
  metric: "exercise_pr" | "exercise_volume" | "sessions" | "streak" | "weekly_sessions";
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
| `streak` | "a 30-day flame" | `getStreakInfo().best` — days of consistency, not days trained |
| `weekly_sessions` | "3 a week, for 8 weeks" | weeks since `swornAt` that hit `weeklyTarget` |

## The oath sets the flame's bar

A `weekly_sessions` oath is not just a target: its `weeklyTarget` **is** the quota the
[flame](progression.md#flame-consistency-streak) is measured against. Swear three a week and the
flame asks for three; swear nothing and it sits at the WHO baseline of two. That is deliberate —
the hero should have one commitment, chosen by them, rendered in the most visible place on Home,
instead of a promise they made competing with a streak the app imposed.

## Forgiveness is in the definition, not in a token

`weekly_sessions` counts the weeks that hit the quota. A missed week costs that week and nothing
else: nothing resets, and last week's miss cannot undo the eight before it. The flame follows the
same principle at day granularity — one blank week forgiven, two not. Neither needs a "streak
freeze" item, because neither punishes rest in the first place.

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
4. **The reminder** ([src/notifications.ts](../../src/notifications.ts)) — one local notification,
   fired three idle days after the last session. See below.

## The reminder is one pending notification, not a system

The oath is the only thing Bati ever notifies about, and it does so through a single **one-shot**
local notification. There is no scheduler, no background task, no push server and no ids to track:

- [db/oathReminder.ts](../../db/oathReminder.ts) is a pure function — last activity + chosen hour
  → the date to fire, or the next occurrence of that hour if the deadline already passed.
- `rescheduleOathReminder()` cancels everything and schedules that one date. It runs at exactly
  two moments: cold start ([app/_layout.tsx](../../app/_layout.tsx)) and after a session is
  journaled ([stores/session.ts](../../stores/session.ts)). Cancel-then-schedule makes it
  idempotent, which is why a one-shot is enough — the app re-derives it every time it is used.
- It is silent by default: no permission, toggle off, no oath sworn, or oath already fulfilled all
  produce nothing scheduled. Permission is requested only from the Settings toggle, never on launch.

The reminder reuses the oath label from [useOathText.ts](../../components/oath/useOathText.ts), so
the notification says the same thing as the home card.

## Related

- [progression.md](progression.md) — the journal every metric reads from
- [coach-planning.md](coach-planning.md) — the weekly goal, the one other persisted setting
- [statistics-progress.md](statistics-progress.md) — same derive-on-read philosophy
