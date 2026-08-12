---
title: What Home offers next
type: system
status: active
updated: 2026-07-31
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

# What Home offers next

## Summary

This is not a planning system, and as of 2026-07-31 it is **not called "the Coach" anywhere in
the UI**. It is **one priority waterfall on Home**, implemented in
[`components/home/useSmartAction.ts`](../../components/home/useSmartAction.ts) and evaluated
against the session journal, the [Oath](oaths.md) and the
[muscle balance](statistics-progress.md#1-muscle-balance-last-30-days) view. No persisted
state, no generated plans, no scheduling, no notifications — those are explicit non-goals
(see below).

The word "Coach" was dropped because it named a feature that does not exist while hiding the one
that does. It only ever appeared on the journal's `ProgressionCard`, whose content is usually the
variation ladder; that card now says what it shows ("Your next rung" / "Adjust the difficulty").
`app/safety.tsx` states plainly that Bati is not a coach, and the UI no longer contradicts it.

## What actually runs

`useSmartAction` decides what the single hero card on Home offers. First match wins:

| # | Rule | Source | Result |
| --- | --- | --- | --- |
| 1 | An adventure run is active | `getAnyActiveAdventureRun()` | "Continue Adventure" + step count, rendered as a scene → the adventure map |
| 2 | An unfulfilled oath names an exercise | `getOathProgress()` → `getChainTo()` → `findQuestWithExercise()` | "Start Quest" + `Oath · Rung 4/6 · <movement>` → **starts the session** |
| 3 | A muscle sits below its share of 30-day volume | `getSuggestedQuestsForWeakAreas(1)` | "Start Quest" + the muscles it targets → **starts the session** |
| 4 | None of those | — | "Pick a quest" → the quest gallery |

Each branch links to one concrete action, and its label names that action. It never just reports
a number.

### The oath outranks the weak areas

Rule 2 is the spine of the app: an objective the hero chose, the ladder that leads to it, and a
session that climbs one rung of it. Balance is the app's opinion; the oath is the hero's, so the
oath goes first. It targets **the rung the hero is standing on**, not the movement they swore —
`getChainTo(oath.exerciseId).rungs[position - 1]` — because the top of the chain is the goal and
the rung underneath is tonight.

Oath metrics that name no exercise (`sessions`, `streak`, `weekly_sessions`) match nothing here
and fall through to rule 3 with no special case. So does an oath whose rung appears in no quest
the hero can train.

### Rules 2 and 3 start the session

They call `startSession` directly and push `/session`. The scene above the button shows the quest
being offered — cover, title, `4 exercises · Strength · ≈ 20 min` — so the hero sees what they are
accepting before they accept it. Previously the button read "Start a quest" and pushed a detail
screen carrying a second button reading "Begin the quest": two synonymous verbs, and a generic
illustration in place of the thing being started.

Both paths read the same saved per-quest config through `loadConfiguredQuest()`
([`db/questConfig.ts`](../../db/questConfig.ts)), so starting from Home and starting from the
quest screen run the same session.

### Rest is advice, never the primary button

[`db/restSuggestions.ts`](../../db/restSuggestions.ts) `getRestSuggestion()` is wired as of
2026-07-31 — but **not** as a branch of the waterfall. The one primary button on Home must never
read "do not train tonight". It renders as a quiet line under the stage
([`components/home/RestNote.tsx`](../../components/home/RestNote.tsx)), and the session is still
on offer underneath it.

It does not contradict the [flame](progression.md#flame-consistency-streak): taking the day off
costs nothing, so the app can advise rest without punishing it.

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
these bound what any nudge here is allowed to say:

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
what to do next" need without that cost. A weekly suggested-quest list is the natural next
step if user feedback asks for more direction than these rules give.

## Related

- [statistics-progress.md](statistics-progress.md) — muscle balance feeds the weak-area rule
- [progression.md](progression.md) — the journal these rules read from
- [quests.md](quests.md) — what a rule links to when it suggests an action
- [../raw/bodyweight-app-research.md](../raw/bodyweight-app-research.md) — §2, §4, §7, §10.4
