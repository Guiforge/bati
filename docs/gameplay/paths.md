---
title: Paths (the variation ladder)
type: system
status: active
updated: 2026-10-11
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
  behind them (`ladderPosition` in `db/progress.ts`, the one function the path card and the quest
  slot both read).

The second rule replaced two older ones, "recent, not historical" and "contiguous from the
bottom", on 2026-09-15. Together they sent every hero who progresses back to the bottom: someone
who climbed from wall push-ups to push-ups stops doing wall push-ups, eight weeks later those
sessions left the window, and the exercise page, every quest and the warm-up served wall push-ups
to a hero doing fifteen real ones. And a hero holding a clean 45 s plank was told to do dead bugs.
The floor now only ever rises; the next rung still has to be earned lately.

**The bar is what the app prescribed, not what the hero set** (`0070`). `QuestConfig` lets a hero
lower a target to 1, and the ladder used to read that handed value: one rep earned a rung. Each
set now carries `completed_exercises.prescribedValue`, the target before the stepper was touched,
and a session is clean when every set reached *that*. `targetValue` is still what the hero was
handed and what the Journal shows, so a target raised to 20 on a prescribed 12, with 15 done, reads
"under target" in the Journal and counts for the rung, on purpose. Rows from before the column
have no prescribed value and are judged on the handed one, as they always were: no rung a hero
already owns moved.

Some sets the ladder does not judge at all, neither clean nor missed
(`completed_exercises.ladderNeutral`, written by `createCompletedSession` and nothing else):

- **A lowered target not reached at the prescribed value.** A careful evening is not a failure.
  Counted as a miss, it would have made lowering a target cost a streak.
- **A movement left mid-session**, skipped or swapped away from. A skip writes no row, so one
  clean round followed by "I couldn't" used to read as a clean session. It is deduced from the
  rows (`ladderNeutralSets`), so it survives the app being killed before the save: a movement is
  neutral when it lacks a row for any round it was due in, up to the quest's last round. A
  movement the quest handed over is due from round one, so rounds missing *before* its first row
  are skips too. A movement the hero swapped in mid-session is due from the round it arrived in,
  and counts as it always did, including one swapped in after a skipped round. The rows alone
  cannot tell those apart, so each set says the round its movement *first* came in
  (`swappedIn`). The slot remembers it for the whole session (`QuestExercise.swaps`), because a
  movement swapped in and skipped was still due in that round, however many swaps follow. The
  movement the quest handed over is never marked, swapped away from and back to or not.

A swap made mid-session keeps what the app had prescribed when it keeps the hero's number (same
unit). Otherwise the lowered number would become "what was asked" on the new movement.

Known ceilings, marked in the code: a hero's own quest sets its own bar, so a quest written with a
target of 1 still earns rungs; and lowering every target by one makes misses neutral, so a streak
of three never breaks. Tighten either if someone reports rungs earned that way.

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
on the card ("Working up to Push-ups"). What changed is the default, not the permission. A hero
who wants the summit tonight still gets it by asking; before, the only way to decline was to type
a number they had not performed.

### "I can already do this"

A hero who holds a clean plank and installs Bati today is served dead bugs: with an empty journal
everyone starts at the bottom of every chain. The way to the written movement used to be an
icon-only Replace inside a folded card, then a search of the whole catalogue, which is not "one
tap away" whatever the code comment said.

The expanded row of a stepped-down slot now carries one button, **"Do Plank instead"**
(`QuestExerciseRow`, `onPin`). It is the existing swap with the movement the quest wrote, saved
per quest, and nothing is declared or stored about what a hero can do. The pinned movement is
prescribed what the quest wrote for it, its band and its own record for a hold, which the slot
carries (`substitutedFor.target`, set by `resolveSlot` for the screen and the gallery card
alike), not the easier rung's number moved across. Taking the written movement back from the
swap sheet in the middle of a session gives the same number. The journal settles the rest:
one clean session on the Plank puts Dead Bug behind the hero in *every* quest (`ladderPosition`), and
the pin becomes moot.

The way back is the same spot: a pinned slot reads "Your choice, instead of Dead Bug" and its
button says **"Back to Dead Bug"**. And a pin does not outlive a bad evening. Skipping the
movement or swapping away from it mid-session drops the pin (`dropSlotSwap`), and tonight's rows
for it are neutral (above), so the quest serves the hero's own rung again next time.

The training level asked in onboarding moves no rung. It is editable in Settings since the same
change ("Point de départ"), and it also sets the difficulty a quest never played starts at
([progression.md](progression.md#where-a-quest-starts)). Beyond that, what it decides is what
the app *picks* for the hero (`startsGently`,
[`db/preferences.ts`](../../db/preferences.ts)): no jump in the warm-up, and no quest that would
*serve* them a jump in the suggestions. The suggestions ask what the
slot would run, in the slot's own order (`servedJumps`): what the hero set aside is replaced
first, then the rung they stand on. So a quest naming Jump Squat is fine for a hero still on
Squat and held back once they are served the jump itself, and a hero who set every jump aside is
not kept off the quests those jumps were written in. Three things bound it. It counts the sessions
logged *before today* (`workoutsBeforeToday`), so the suggestions cannot change in the middle
of a day. It applies to quests the app wrote, never to a hero's
own. And an oath sworn on a jump still finds its quest: that is the hero's choice, not the app's.

## Where a path speaks

| Surface | What it says |
| --- | --- |
| [Exercise details](../screens/exercise-details.md) | The whole path: name, bar, the rung you stand on, the next rung. Both are tappable. |
| **Home — the oath card** | When the sworn movement sits on a path, the strip *replaces* the gold bar. |
| Journal — quest log, "What it moved" | The rung the session's movements are climbing, and how many clean sessions are left. Once earned, a fork names every movement it opens. |
| Victory, "Tonight" list (`TonightList`) | Rungs this session just crossed: one row per rung, the first successor illustrated, the rest of a fork named on a line. |
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
