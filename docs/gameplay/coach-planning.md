---
title: Coach
type: system
status: active
updated: 2026-07-30
related:
  [
    progression.md,
    statistics-progress.md,
    ../planning/roadmap.md,
    ../raw/bodyweight-app-research.md,
  ]
sources:
  [components/home/useSmartAction.ts, db/muscleBalance.ts, db/restSuggestions.ts, db/streaks.ts]
---

# Coach

## Summary

The Coach is not a planning system. It is **one priority waterfall on Home**, implemented in
[`components/home/useSmartAction.ts`](../../components/home/useSmartAction.ts) and evaluated
against the session journal and the
[muscle balance](statistics-progress.md#1-muscle-balance-last-30-days) view. No persisted
state, no generated plans, no scheduling, no notifications — those are explicit non-goals
(see below). The user's chosen **objective** lives in the [Oath](oaths.md), not here, so the
two never compete for the objective slot.

## What actually runs

`useSmartAction` decides what the single hero card on Home offers. First match wins:

| # | Rule | Source | Result |
| --- | --- | --- | --- |
| 1 | An adventure run is active | `getAnyActiveAdventureRun()` | "Continue Adventure" + step count, rendered as a scene |
| 2 | A muscle sits below its share of 30-day volume | `getSuggestedQuestsForWeakAreas(1)` | "Start Quest" + the muscles it targets |
| 3 | Neither | — | "Start Quest" → the quest gallery |

Each branch links to one concrete action. It never just reports a number.

### The rest rule is written but not wired

[`db/restSuggestions.ts`](../../db/restSuggestions.ts) implements `getRestSuggestion()` and
`getQuickRestCheck()` — consecutive-days-trained detection, an `overtraining` reason, the whole
thing. It is exported from `db/index.ts` and covered by `__tests__/db-restSuggestions.test.ts`.
**No component calls it.** This page previously claimed a Rest rule fired on Home ahead of the
weak-area rule; it does not, and has not.

That is a gap rather than dead code to delete: [§4](../raw/bodyweight-app-research.md) puts
overreach detection among the guardrails a training app owes its users, and the function
already encodes it. Wiring it into the waterfall — above the weak-area rule, since safety
outranks balance — is the smallest way to close it.

When it is wired, it must not contradict the [flame](progression.md#flame-consistency-streak):
taking the day off costs nothing, so the Coach can advise rest without the app punishing it.

### Pattern balance, not just muscle balance

The weak-area rule reads the muscle taxonomy. [§10.4](../raw/bodyweight-app-research.md) asks
for something that vocabulary cannot express — **movement-pattern** balance — and names the
failure it catches: "your pulling volume is 4 sets vs 16 pushing". §2 and §10.2 both identify
pulling as the structural weak point of equipment-free training, because without a bar the
vertical pull nearly disappears.

`exercises.pattern` has existed since migration `0020` and is carried all the way to the UI,
but nothing aggregates it over the journal. See
[statistics-progress.md](statistics-progress.md).

## The training rules any nudge must respect

From [`raw/bodyweight-app-research.md`](../raw/bodyweight-app-research.md) §2, §4 and §7 —
these bound what the Coach is allowed to say:

- **~48 h per muscle group** between hard sessions; ≥1 full rest day per week.
- **Deload every 4–8 weeks** (reduced volume/intensity) to clear accumulated fatigue.
- **Sustained performance decline** is the most consensual overreach marker (Grandou 2020) —
  ahead of soreness or mood, which are noisier signals.
- The baseline is the WHO one: 150–300 min/week of moderate activity **plus** muscle
  strengthening ≥2 days/week, and "some is better than none" for anyone starting below it.
- Guardrails here are **preventive, not diagnostic** — overtraining is hard to diagnose, often
  only in hindsight, and the app should defer to a health professional rather than pronounce.

## Why not more?

A full plan-generation system (goals with types, auto-built multi-week adventures, scheduling,
push notifications) was previously designed here but never shipped. It adds three database
tables and an algorithm that needs validation by a sports professional before it can safely
tell someone what to do. A handful of rules against the existing journal delivers the "tell me
what to do next" need without that cost. See
[system-redesign-options.md](../planning/system-redesign-options.md) (§7) for the option
comparison — a weekly suggested-quest list (Option B there) is the natural next step if user
feedback asks for more direction than these rules give.

## Related

- [statistics-progress.md](statistics-progress.md) — muscle balance feeds the weak-area rule
- [progression.md](progression.md) — the journal these rules read from
- [quests.md](quests.md) — what a rule links to when it suggests an action
- [../raw/bodyweight-app-research.md](../raw/bodyweight-app-research.md) — §2, §4, §7, §10.4
