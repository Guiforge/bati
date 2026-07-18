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

The Coach is a small card on Home, not a planning system. One setting is persisted (the
user's weekly session goal); everything else is three rules evaluated against the session
journal and the [muscle balance](statistics-progress.md#1-muscle-balance-last-30-days) view.
No generated plans, no scheduling, no notifications — those are explicit non-goals (see
below).

## The one setting

**Weekly goal**: how many sessions per week the user wants to train. Chosen once in
settings/onboarding, editable any time. This is the only piece of Coach state that isn't
derived from the journal.

## The three rules

| Rule | Trigger | Message example |
| --- | --- | --- |
| **Weekly goal** | Sessions this week vs. weekly goal | "2/3 séances cette semaine" |
| **Weak area** | A muscle sits well below its share of 30-day volume ([statistics-progress.md](statistics-progress.md)) | "Tes jambes sont en retard — essaie [Quête jambes]" |
| **Rest** | ≥5 consecutive days trained | "Pense à un jour de repos" |

Each rule that fires links to one concrete action (start a quest, or rest) — it doesn't just
report a number.

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
