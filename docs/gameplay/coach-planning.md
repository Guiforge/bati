---
title: Coach
type: system
status: active
updated: 2026-07-18
related: [progression.md, statistics-progress.md, ../planning/roadmap-alignment.md]
sources: [db/xp.ts, db/streaks.ts]
---

# Coach

## Summary

The Coach is a small card on Home, not a planning system. It is **purely reactive**: two
rules evaluated against the session journal and the
[muscle balance](statistics-progress.md#1-muscle-balance-last-30-days) view. No persisted
state, no generated plans, no scheduling, no notifications — those are explicit non-goals
(see below). The user's chosen **objective** lives in the [Oath](oaths.md), not here — the
Coach no longer echoes a weekly-goal count, so the two never compete for the objective slot.

## The two rules

| Rule | Trigger | Message example |
| --- | --- | --- |
| **Rest** | ≥5 consecutive days trained | "Pense à un jour de repos" |

The rest rule no longer contradicts the [flame](progression.md#flame-consistency-streak): taking
the day off costs nothing, so the Coach can advise rest without the app punishing it.
| **Weak area** | A muscle sits well below its share of 30-day volume ([statistics-progress.md](statistics-progress.md)) | "Tes jambes sont en retard — essaie [Quête jambes]" |

Priority: rest (safety) > weak-area. When neither fires the card renders nothing. Each rule
that fires links to one concrete action (start a quest, or rest) — it doesn't just report a
number.

## Why not more?

A full plan-generation system (goals with types, auto-built multi-week adventures,
scheduling, push notifications) was previously designed here but never shipped. It adds
three database tables and an algorithm that needs validation by a sports professional before
it can safely tell someone what to do. Three rules against the existing journal deliver the
"tell me what to do next" need without that cost. See
[system-redesign-options.md](../planning/system-redesign-options.md) (§7) for the option
comparison — a weekly suggested-quest list (Option B there) is the natural next step if user
feedback asks for more direction than the three rules give.

## Related

- [statistics-progress.md](statistics-progress.md) — muscle balance feeds the weak-area rule
- [progression.md](progression.md) — the journal these rules read from
- [quests.md](quests.md) — what a rule links to when it suggests an action
