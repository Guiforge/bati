---
title: Exercise Catalogue
type: screen
route: /exercises
status: active
updated: 2026-08-16
related: [exercise-details.md, quests.md, ../gameplay/quests.md]
sources: ["app/exercises/index.tsx", "constants/exerciseFilters.ts", "components/exercises/ExerciseRow.tsx"]
---

# Exercise Catalogue (`/exercises`)

## Purpose

Everything Bati knows about movement, in one list — the answer to *"what does this app know
about rows?"*.

Until this screen existed, the only route to a movement was through a quest that happened to
contain it. That is also why the variation ladder was invisible: the ladder has been in the
database since `0022`, and the screen that shows it (**[Exercise Details](exercise-details.md)**)
could only be reached by accident. Roadmap 4.22 exists to give 4.4 somewhere to land.

## Getting here

The Dumbbell icon in the **[Quests gallery](quests.md)** header, beside the "+". No tab of its
own: five tabs is already the ceiling, and the catalogue is a reference book you consult, not a
place you live.

## Main features on this page

- **Every movement, A–Z** by localized name — seed order was insertion order across six
  migrations and read as random.
- **Search** on the localized name, so a French hero typing "tirage" finds "Tirage australien".
- **Filter rail**, the same one the quests gallery uses, grouped by dimension:
  - **Ladder** — only movements that lead to a harder variation.
  - **Movement** — the pattern (`push_vertical`, `hinge`, …).
  - **Muscles**, **Equipment**.
- **"Leads to X"** on every row that sits on a ladder. The row says *that* the movement goes
  somewhere and where; how close you are stays on the detail screen.
- **Loading / error / no-match states**, each with the way out under the sentence.

## Visual rules

- Rows are the same object as the quest editor's picker rows — one shared `ExerciseRow`, so the
  two screens read as the same list seen twice.
- The ladder caption is the row's only decoration. No difficulty badge, no per-row progress bar:
  the row's job is *find the movement*, not *rank it*. A wall of unlit progress bars is exactly
  what the dedicated skill-tree screen was dropped for.
- The header count reflects the **filtered** total — it is how you see that a filter did
  something.

## Typical user actions

- Look up a movement by name.
- Ask "what can I train with no equipment?" or "what works my back?".
- Ask "what leads somewhere?" — then follow a ladder up.

## What happens next

Tapping a row opens **[Exercise Details](exercise-details.md)**, which carries the full ladder
(`LadderStrip`) and the next rung (`NextStepCard`). The catalogue never starts a session.

## Implementation note

- Data comes from `listExercises()`, which is promise-cached and already warm whenever the quests
  gallery has been visited — the catalogue costs **zero queries** on a warm cache.
- "What does this lead to" is derived in one pass over that list (`buildLeadsTo`) from
  `Exercise.prerequisiteExerciseId`, not one query per row.
- Filtering is `filterExercises()` in [`constants/exerciseFilters.ts`](../../constants/exerciseFilters.ts),
  a pure function shared with the quest editor's picker sheet: OR inside a dimension, AND across
  them, exactly like `matchesFilters` does for quests.
- The rail is [`components/common/FilterRail.tsx`](../../components/common/FilterRail.tsx), lifted
  out of the quests gallery so both screens hoist active chips the same way.
- The list is `LegendList` with `recycleItems`, per
  [performance.md](../architecture/performance.md). No pagination: ~66 rows of seed content is
  not a list that grows.
