---
title: Journal
type: screen
route: /journal
status: active
updated: 2026-09-15
related: [session-details.md, session.md, ../gameplay/statistics-progress.md, ../design/audits/2026-09-10-stats.md]
sources: ["app/(tabs)/journal/index.tsx", "app/(tabs)/journal/_layout.tsx", components/journal/stats/StatsView.tsx, components/journal/nocturne.tsx, db/journal.ts]
---

# Journal (`/journal`)

## Purpose

The Journal answers, in this order: what is there to beat tonight, is the flame holding, what did
this month do against the last one, where did the work go, how far is the next level. Everything
else is one tap away.

## Design

Redrawn on 2026-09-15 from the design project "Journal Bati", option **3c**: the structure of the
Nocturne design system on Bati's own colours. What Nocturne brings is everything that is not a
colour: Inter (500 for titles and numbers), a 0.7x spacing scale, radii 4/8/14, surfaces without
borders, outlined buttons, rules that fade at both ends, paintings blended into the ground
(`mix-blend-mode: lighten`), and **one accent**. The accent is `resourceGold`, stepped by a gold
ramp (`gold100` to `gold900` in `constants/rawColors.ts`), so "done", "new" and "still coming" are
steps of one colour plus a word, never a green and a red.

The design turn **3a** drew the same markup in Nocturne's own violet. It was set aside by the
designer's own recommendation: the Journal is a tab beside a Village and 24 boss paintings made for
navy and gold, and the gold is the colour of the loot.

The stack is wrapped in the `dark_journal` Tamagui theme (`app/(tabs)/journal/_layout.tsx`), which
remaps the app's keys (`$surface`, `$primary`, `$borderStrong`) so a shared component mounted here
(the achievements list, the balance card, a history row) takes the same ground and accent. The
Journal's own pieces are in `components/journal/nocturne.tsx`, one per Nocturne class.

## The stats page

| Block | Says | Source |
| --- | --- | --- |
| The sentence | "9 days trained in September, and 2 outings." plus the latest record in gold. A rest day, a first day and a veteran whose records have aged each get their own sentence. | `StatsView`, from figures already read |
| To beat tonight | The four movements trained last, each with its record, the day it fell, the last result, and the number that beats it (record + 1 in the movement's own unit). A first day shows four seed movements with a target of 1. | `getRecordWall`, `getStarterWall` |
| Flame | Days lit, the last seven days as dots, sessions in seven days against the quota, the rule, and the best run with the day it ended. | `getFlameDetail` |
| This month so far | Quests, reps, time in quests, ground, XP, records, each against the same number of days of last month; then the month as a frieze. | `getPeriodFigures`, `monthWindows`, `getActivityDays` |
| Where the work went | The thirty days' muscle shares as one stacked bar, a verdict, a link to the balance page. | `getMuscleBalance` |
| Level and shelf | The level bar, the XP to the next level at this week's pace, the shelf count and the next achievement with how far it is. | `getUserLevelInfo`, `getWeekXpPerSession`, `nextOnShelf` |
| Buttons | Lifetime, Achievements n/27, Bosses n. | routes below |

The record's date is not stored: it is the first row that reached the standing best, which is
exactly when `checkForNewRecords` (a strict `>`) wrote it.

The page is read in one pass (`useJournalStats`) and, on focus, only when `getJournalVersion` says
something changed: sessions (count, last id, XP, record flags), the oath, the unlocks, or the day.
Pull-to-refresh always reads. Returning from a session used to re-run the whole read, 42 queries
on the JS thread during the back animation.

## Pages pushed from it

- **Lifetime** (`/journal/lifetime`): every figure over all time and over thirty days, side by side,
  with how it is counted, then the three session records (longest quest, most XP, most reps).
- **Achievements** (`/journal/achievements`): the full shelf with its filters.
- **Balance** (`/journal/balance`): the muscle balance card and the quests for what is behind.
- **Bosses felled** (`/journal/bosses`): every boss campaign won, each opening its kill report.
- **A session** (`/journal/[id]`): the quest log, or the kill report. See
  [session-details.md](session-details.md).

## History

The segmented control's second half: the sessions a hundred at a time, newest first, each opening
the quest log. It follows the same version check as the stats page, and when it does re-read, it
reads back everything already scrolled through, so a return from a session keeps the hero's place.
An empty history is "An empty page", never a button that sends the hero elsewhere.

## What left the page

The old stats tab stacked ten cards over five screens. Your Progress (two histograms whose badges
compared something other than the bars) is gone, and the sentence carries the month's gap in words.
The Total Workouts / Minutes / Avg Duration tiles became Lifetime. Your bests became the wall. The
6x7 calendar became the frieze. Achievements, the bosses, and the balance with its suggested quests
each became a page. The Next rung card moved into the quest log, where it names the rung the
session's movements are climbing.
