---
title: Statistics & Progress
type: system
status: active
updated: 2026-09-11
related: [progression.md, coach-planning.md, expeditions.md, ../planning/roadmap.md]
sources: [db/xp.ts, db/streaks.ts, db/completed.ts, components/journal/journalGrids.ts]
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

**Where a record is announced.** Three places, and the earliest one is the one that matters. The
session screen's ghost line already names what there is to beat (`ExerciseGhost`, keyed per
movement *and* per unit by `ghostKey`), and the moment the value about to be logged passes that
best, the line becomes a gold stamp reading "Past your best" — mid-set, in the space the number it
beat was occupying, with a haptic on the crossing. Not "new record": the number is what the set
*would* log, a hero who taps the reps back down has set nothing, and the word is worth more if the
victory screen is the only place that spends it. `NewRecordsBadge` then lists the records that
really fell, and the journal's history badge names the movement afterwards.

**When nothing falls.** A record is rare by construction — the curve flattens and every session
after that pays nothing — so a session that broke none of its bests is asked the weaker question
instead: *where does this sit*. `getSessionStanding()` ranks each movement's best set of the night
against every past session's best on the same movement and unit, and the victory screen prints the
strongest placing it found ("2nd best in 12 sessions"). It is derived, like everything else here,
and it obeys four gates: nothing at all on a night that set a record, never rank 1 (that is a
record), never a placing the hero did not earn by beating at least one past session, and a tie
ranks behind the session that got there first.

### 3. Sessions per week

The number the weekly-goal coach rule compares against
([coach-planning.md](coach-planning.md)).

```
Mon ██  Tue ████  Wed  Thu ██████  Fri ████  Sat  Sun ████████
Total: 5 sessions this week
```

### 4. Training calendar

A month grid, one dot per day trained — the "did I show up" view.

## Outings are counted apart

A walk and a set of push-ups are both sessions, and averaging them together makes the training
numbers say something nobody did: three 20 min workouts and one hour-long Sunday walk read as a
usual workout of 77 min, which is how a tester found this. So the training tiles (sessions,
minutes, average duration) and the difficulty split count workouts alone, and the outings get
their own three: how many, the ground covered, how long one lasts. They appear only once the hero
has been out, like the walk tiles on the records card.

Recent activity is deliberately **not** split. That block asks what the hero did this week, and a
walk is something they did — the same answer the flame gives.

An outing's own minutes are its **moving** ones, which is what its trace can prove and what its XP
was paid on. Standing at a crossing is not time on the road.

### What tells them apart

`completed_sessions.outing` (`0049`), never `leaguesM`. The column is written once at save from
`isOutingQuest` — every slot outdoors — and read as a plain `WHERE` by everything that means
*training*: this screen, the calendar dots, the weekly trends, the longest-session and most-XP
records, the two "60+ minute workout" badges, the overtraining warning.

`leaguesM` was the nearest thing before that column and it is wrong twice. A walk whose service
never started covered no ground and is still a walk. A "walk five minutes then do push-ups in the
yard" covered ground and is still a workout — it holds real work, so its minutes belong in the
training average and its reps are priced the way reps always were.

Two questions, two predicates, both in `db/completed.ts`: `isWorkout()` for the numbers above, and
`countsAsSession()` for the flame and the oaths, which a walk of ten moving minutes passes.
`hasGround()` in `db/expeditions.ts` is a third and smaller one, and it is about ground rather than
kind: whether to *show* a distance on a row.

## Streak

See [progression.md](progression.md#flame-consistency-streak) — the flame is the visual layer on
top of the same count shown here. It measures days of consistency, so a rest day never reduces
it; the calendar grid above is the "did I show up" view, the flame is the "am I holding my
rhythm" one.

## What was removed, and why

The previous version of this page specified 3 dedicated tables (`personal_records`,
`streak_data`, `daily_stats`), rep-level charts, and a full stats dashboard. All of it is
recomputable from the journal on read; dedicated tables are an implementation optimization
(cache), not a product concept, so they don't belong in this design doc.

## Related

- [progression.md](progression.md) — XP, level, village, flame
- [coach-planning.md](coach-planning.md) — uses muscle balance + sessions/week
- [session-flow.md](session-flow.md) — where a session is journaled
