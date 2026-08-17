---
title: Paths (the variation ladder)
type: system
status: active
updated: 2026-08-17
related:
  [
    progression.md,
    oaths.md,
    statistics-progress.md,
    ../screens/exercise-details.md,
    ../raw/bodyweight-app-research.md,
  ]
sources: [db/exercises.ts, db/paths.ts, components/common/PathStrip.tsx]
---

# Paths

## Summary

Progressive overload without weights is a **harder variation**, not a bigger multiplier. Bati
authors that as data — `exercises.prerequisiteExerciseId`, migration `0022` — and surfaces it as a
**path**: a named route from an easy movement to a hard one.

> *The Path of the Pull*: Towel Door Row → Table Row → Inverted Row → Scapular Pull-Up →
> Chin-Up → **Pull-ups**

Twelve paths, each named after the movement it ends on. Like everything else here, position on a
path is **derived from the session journal** on read — nothing is stored.

## Why the name matters

Every other system in Bati carries a name: a quest is *The Squire's Awakening*, the village climbs
from *hameau* to *capitale éternelle*, the flame runs *Spark → Eternal*. The ladder alone spoke in
coordinates — "rung 3 of 6" — and a coordinate cannot be wanted, or told to anyone. It was the one
system that was a measurement instead of a place.

Names live in [`db/paths.ts`](../../db/paths.ts), keyed by the summit's `enName` (the same
convention `OATH_PRESETS` uses: ids are seeding order, names are content). **A path is identified
by its summit** because walking a chain *down* is unambiguous — one prerequisite per movement — and
branching only ever happens going up. A summit with no name falls back to the movement's own, so
content never blocks code; a content invariant keeps the twelve honest.

## Owning a rung

A rung is owned after **three sessions on target** (`PROGRESSION_SESSIONS_REQUIRED`), where a
session counts only if *every* set logged for that movement met its target — the research's
"3×12 clean reps", not one good set out of three.

Three rules make that measure honest:

- **Sessions, not rows.** A three-round quest writes three rows in one evening. Counting rows
  handed the next variation over after a single workout, which is the *program hopping before
  progressing* the research names as beginner mistake number one.
- **Recent, not historical.** Sessions must fall inside an eight-week window. Ability is current;
  three clean sets from last spring say nothing about today. The window is wide enough that a rest
  week or a deload costs nothing.
- **Contiguous from the bottom.** Mastering a hard variation out of order does not skip the ones
  below it.

Known ceiling, marked in the code: the bar is the target the hero was *handed*, and `QuestConfig`
lets them lower it, so a self-lowered target earns rungs faster. Reading the quest template's own
value means joining `quest_exercises` into every path read; deferred until someone reports it.

## A hint, never a gate

Nothing is locked. No quest is hidden, no movement is withheld, and a hero who wants to try the
summit tonight can. `0022` says so in its own header, and the decision is closed in
[roadmap.md](../planning/roadmap.md) §5: gating would show a beginner three quests out of
twenty-seven. The research asks for hard gates on advanced skill branches; that stays blocked on
content Bati does not have yet.

The path also answers the *downward* question. The rung the hero stands on is the honest reply to
"this is too hard, what do I train instead?" — and it is not the direct prerequisite, which on the
Pull-ups page would be Chin-Up.

## Where a path speaks

| Surface | What it says |
| --- | --- |
| [Exercise details](../screens/exercise-details.md) | The whole path: name, bar, the rung you stand on, the next rung. Both are tappable. |
| **Home — the oath card** | When the sworn movement sits on a path, the strip *replaces* the gold bar. |
| Journal — `ProgressionCard` | The one step worth naming right now, across everything trained lately. |
| Victory — `SessionRewards` | Rungs this session just crossed. |
| [Catalogue](../screens/exercises.md) | "Leads to X" per row, plus a ladder filter. |

### The oath is a path

Four of the seven oath presets swear a movement that sits on one. `exercise_pr` measures a rep
record, so a beginner swearing "Pull-ups × 15" reads **0/15 for months** — while the climb beneath
moves every three sessions. The card therefore leads with the climb and demotes the counter: the
strip measures the distance to the *movement*, the counter the distance to fifteen reps of it. The
day the hero pulls their first rep, the strip fills and the counter starts moving.

One card, one gauge — two would be two notions of progress fighting for the same eye.

## Climbing one, for keeps

Owning every rung of a path unlocks the **Path Climbed** trophy, which lands on the village shelf
beside defeated bosses ([progression.md](progression.md)). The boss is a victory of story; the
path is a victory of competence — until now the village recorded volume and never skill.

**The trophy grants no XP and no points.** The research warns that extrinsic rewards can erode the
intrinsic kind and must stay secondary to real progress, while endorsing badges that *materialize*
mastery. The trophy has to **be** the progress, never a currency laid on top.

It therefore uses a different measure from the rung above: *did three consecutive on-target
sessions ever happen*, anywhere in the journal — monotonic, and so irreversible.

> **The current state may fall; the shelf never gives anything back.** The path tells the hero
> honestly where they stand today, including after a quiet summer. What they did once is theirs.

## Related

- [progression.md](progression.md) — XP, village, flame: the other three derived systems
- [oaths.md](oaths.md) — the target the hero chooses, which is usually a summit
- [../screens/exercise-details.md](../screens/exercise-details.md) — the screen that carries a path
- [../raw/bodyweight-app-research.md](../raw/bodyweight-app-research.md) — §2 overload, §4
  guardrails, §5 competence and gamification, §8 skills
