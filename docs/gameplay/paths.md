---
title: Paths (the variation ladder)
type: system
status: active
updated: 2026-09-16
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

> *The Path of the Pull*: Towel Door Row → Table Row → Inverted Row → Dead Hang →
> Scapular Pull-Up → Negative Pull-Up → Chin-Up → Pull-ups → **Muscle-Up**

Thirteen paths, each named after the movement it ends on. Like everything else here, position on a
path is **derived from the session journal** on read — nothing is stored.

## Why the name matters

Every other system in Bati carries a name: a quest is *The Squire's Awakening*, the village climbs
from *hameau* to *capitale éternelle*, the flame runs *Spark → Eternal*. The ladder alone spoke in
coordinates — "rung 3 of 9" — and a coordinate cannot be wanted, or told to anyone. It was the one
system that was a measurement instead of a place.

Names live in [`db/paths.ts`](../../db/paths.ts), keyed by the summit's `enName` (the same
convention `OATH_PRESETS` uses: ids are seeding order, names are content). **A path is identified
by its summit** because walking a chain *down* is unambiguous — one prerequisite per movement — and
branching only ever happens going up. A summit with no name falls back to the movement's own, so
content never blocks code; a content invariant keeps the thirteen honest.

That key is where the cost of new content lands. `0033` added six summits, and five paths moved
key in the same commit: two kept their name (the pull route still ends in a pull, it just ends
higher), three retired theirs for the movement that replaced them — *of the Diamond* → *of the
Archer*, *of the Curtsy* → *of the Pistol*, *of the L-Sit* → *of the Planche*. Adding a movement
above a summit is therefore never only a content change: it renames the route underneath it.

## Owning a rung

A rung is owned after **three sessions on target** (`PROGRESSION_SESSIONS_REQUIRED`), where a
session counts only if *every* set logged for that movement met its target — the research's
"3×12 clean reps", not one good set out of three.

Three rules make that measure honest:

- **Sessions, not rows.** A three-round quest writes three rows in one evening. Counting rows
  handed the next variation over after a single workout, which is the *program hopping before
  progressing* the research names as beginner mistake number one.
- **Recent opens the next rung.** The three sessions must fall inside an eight-week window, and
  in a row: "Hit your target 2 more sessions in a row" counts the run at the head of the journal,
  not the clean sessions out of the last three. Ability to take the *next* step is current; three
  clean sets from last spring say nothing about today. The window is wide enough that a rest week
  or a deload costs nothing. This is what "Next rung", the victory screen and the quest log read.
  One exception keeps the two cards on a page honest: when the hero already stands on the next
  rung or above it, "Next rung" says it is earned (`getNextProgression`). The Wall Sit page used
  to ask a hero who trains Squat for three more Wall Sit sessions while the Squat page said "You
  are here". "Above" means every branch: a rung may open several movements at once (Push-ups
  opens three), the page names them all, and standing on any of them earns the rung.
- **What is behind the hero stays there.** Where the hero *stands* is not windowed. A rung is
  behind them once it has been owned ever, or once any rung above it has been owned ever, or has
  one on-target session inside the window. The hero stands on the rung just above the highest one
  behind them (`rungsBehind` in `db/exercises.ts`, the one function the path card and the quest
  slot both read).

The second rule replaced two older ones, "recent, not historical" and "contiguous from the
bottom", on 2026-09-15. Together they sent every hero who progresses back to the bottom: someone
who climbed from wall push-ups to push-ups stops doing wall push-ups, eight weeks later those
sessions left the window, and the exercise page, every quest and the warm-up served wall push-ups
to a hero doing fifteen real ones. And a hero holding a clean 45 s plank was told to do dead bugs.
The floor now only ever rises; the next rung still has to be earned lately.

Known ceilings, marked in the code: the bar is the target the hero was *handed*, and `QuestConfig`
lets them lower it, so a self-lowered target earns rungs faster, and one clean session at a
lowered target puts the rungs below it behind the hero. Reading the quest template's own value
means joining `quest_exercises` into every path read; deferred until someone reports it.

## A hint, never a gate

Nothing is locked. No quest is hidden, no movement is withheld, and a hero who wants to try the
summit tonight can. `0022` says so in its own header, and the decision is closed in
[roadmap.md](../planning/roadmap.md) §5: gating would show a beginner three quests out of
twenty-seven. The research asks for hard gates on advanced skill branches; that stays blocked on
content Bati does not have yet.

The path also answers the *downward* question. The rung the hero stands on is the honest reply to
"this is too hard, what do I train instead?" — and it is not the direct prerequisite, which on the
Pull-ups page would be Chin-Up.

Since [issue #33](https://github.com/Guiforge/bati/issues/33) a quest *answers that question by
itself*: a slot naming a movement whose lower rungs are not behind the hero runs at the rung the
hero is on.
That is still not a gate, and the distinction is the whole point — the written movement is named
on the card ("Working up to Push-ups") and is one tap away in the swap sheet. What changed is the
default, not the permission. A hero who wants the summit tonight still gets it by asking; before,
the only way to decline was to type a number they had not performed.

## Where a path speaks

| Surface | What it says |
| --- | --- |
| [Exercise details](../screens/exercise-details.md) | The whole path: name, bar, the rung you stand on, the next rung. Both are tappable. |
| **Home — the oath card** | When the sworn movement sits on a path, the strip *replaces* the gold bar. |
| Journal — quest log, "What it moved" | The rung the session's movements are climbing, and how many clean sessions are left. Once earned, a fork names every movement it opens. |
| Victory — `SessionRewards` | Rungs this session just crossed: one row per rung, the first successor illustrated, the rest of a fork named on a line. |
| [Catalogue](../screens/exercises.md) | "Leads to X" per row, plus a ladder filter. |

### The oath is a path

Four of the seven oath presets swear a movement that sits on one. `exercise_pr` measures a rep
record, so a beginner swearing "Pull-ups × 15" reads **0/15 for months** — while the climb beneath
moves every three sessions. The card therefore leads with the climb and demotes the counter: the
strip measures the distance to the *movement*, the counter the distance to fifteen reps of it. The
day the hero pulls their first rep, the strip fills and the counter starts moving.

One card, one gauge — two would be two notions of progress fighting for the same eye.

## Climbing one, for keeps

Owning a path's summit, which puts every rung of it behind the hero, unlocks the **Path Climbed**
trophy, which lands on the village shelf
beside defeated bosses ([progression.md](progression.md)). The boss is a victory of story; the
path is a victory of competence — until now the village recorded volume and never skill.

**The trophy grants no XP and no points.** The research warns that extrinsic rewards can erode the
intrinsic kind and must stay secondary to real progress, while endorsing badges that *materialize*
mastery. The trophy has to **be** the progress, never a currency laid on top.

It therefore uses the measure the floor uses: *did three consecutive on-target sessions ever
happen*, anywhere in the journal — monotonic, and so irreversible. Since 2026-09-15 it is the same
reading as "climbed" on the path card: the summit owned once is enough, whatever was logged below
it. A hero who owned a summit without logging the rungs below will see the trophy unlock
retroactively after their next session.

> **The next rung may close again; the floor and the shelf never give anything back.** This used
> to say the path told the hero where they stand "including after a quiet summer", and in
> practice that meant the bottom rung. Research dossier §5, which roadmap §4.4 already cites for
> the trophy, is blunt that punishing an absence pushes people to abandon rather than restart: a
> hero back from a summer off stands where they left, and the recency window only decides whether
> the rung above is open yet.

## Related

- [progression.md](progression.md) — XP, village, flame: the other three derived systems
- [oaths.md](oaths.md) — the target the hero chooses, which is usually a summit
- [../screens/exercise-details.md](../screens/exercise-details.md) — the screen that carries a path
- [../raw/bodyweight-app-research.md](../raw/bodyweight-app-research.md) — §2 overload, §4
  guardrails, §5 competence and gamification, §8 skills
