---
title: Statistics & Progress
type: system
status: active
updated: 2026-07-18
related: [progression.md, coach-planning.md, ../planning/roadmap.md]
sources: [db/xp.ts, db/streaks.ts]
---

# Statistics & Progress

## Summary

Everything on the stats screen is **derived** from the session journal
(`completed_sessions` / `completed_exercises`) — no separate aggregate tables, no cached
records. Four views cover the "see your progress" need without turning stats into its own
subsystem.

## The four views

### 1. Muscle balance (last 30 days)

Bar per muscle group, share of total training volume. Powers the coach's weak-area nudge
([coach-planning.md](coach-planning.md)).

```
Arms     ████████████████░░░░  32%
Back     ████████████░░░░░░░░  24%
Chest    ████████░░░░░░░░░░░░  16%
Abs      ██████░░░░░░░░░░░░░░  12%
Shoulder ████░░░░░░░░░░░░░░░░   8%
Legs     ████░░░░░░░░░░░░░░░░   8%
```

### 2. Personal records

Best reps/hold per exercise, longest session, best streak — computed by scanning the
journal, not stored as a separate table.

### 3. Sessions per week

The number the weekly-goal coach rule compares against
([coach-planning.md](coach-planning.md)).

```
Mon ██  Tue ████  Wed  Thu ██████  Fri ████  Sat  Sun ████████
Total: 5 sessions this week
```

### 4. Training calendar

A month grid, one dot per day trained — the "did I show up" view.

## Streak

See [progression.md](progression.md#flame-consistency-streak) — the flame is the visual layer on
top of the same count shown here. It measures days of consistency, so a rest day never reduces
it; the calendar grid above is the "did I show up" view, the flame is the "am I holding my
rhythm" one.

## What was removed, and why

The previous version of this page specified 3 dedicated tables (`personal_records`,
`streak_data`, `daily_stats`), rep-level charts, and a full stats dashboard. All of it is
recomputable from the journal on read; dedicated tables are an implementation optimization
(cache), not a product concept, so they don't belong in this design doc. See
[system-redesign-options.md](../planning/system-redesign-options.md) (§6) for the option
comparison.

## Related

- [progression.md](progression.md) — XP, level, village, flame
- [coach-planning.md](coach-planning.md) — uses muscle balance + sessions/week
- [session-flow.md](session-flow.md) — where a session is journaled
