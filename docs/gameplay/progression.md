---
title: Progression (XP, Village, Flame)
type: system
status: active
updated: 2026-10-18
related:
  [
    ../planning/roadmap.md,
    session-flow.md,
    statistics-progress.md,
    coach-planning.md,
    ../raw/bodyweight-app-research.md,
  ]
sources: [db/xp.ts, db/streaks.ts, db/preview.ts]
---

# Progression

> Replaces the former `economy/rewards-and-progression.md`. Resources, buildings, and Gold
> are gone — the village is a **pure function of the session journal**, nothing is stored or
> managed. See [roadmap.md](../planning/roadmap.md) §7 — the decision is closed.

## Summary

Every workout is logged to an append-only session journal. XP, level, streak, and the
village's appearance are all **derived** from that journal by pure functions. There is no
inventory, no currency, no build menu, and no per-building progression.

## The loop

```
DO WORKOUT → session journal entry (append-only)
           → recompute: XP, level, flame, dominant sport, totals per muscle
           → village re-renders from the new derived state (no stored mutation)
           → victory screen shows: +XP, streak, and (if crossed) a village reaction
```

## XP & level

Every workout grants XP. Level is a running total → level curve. Level is the single number
that drives the village's tier (below). Nothing else consumes or stores XP per-building.

### XP measures effort, not elapsed time

**One XP per three seconds of effort** — so one XP per rep on a `medium` movement at the
catalogue's default 3s tempo, and a minute of holds is worth a minute of reps. Effort is read from
what the hero logged, at each movement's own `secondsPerRep`, then weighted by how hard that
movement is: **easy 0.8 · medium 1.0 · hard 2.5**, and by its style: **`yoga` 0.5**, every other
style 1.0. The hero's chosen level scales the payout on top of that (×0.9 / ×1.0 / ×1.2), as the
quest screen advertises.

A session has two legs and they are priced in different units. The above is the one for sets. The
other is [ground](#ground-is-priced-by-the-way-out-not-by-the-movement), and a session that has
both — a walk and then push-ups in the yard — gets both.

The rules the hero can read are on the in-app page (`app/xp.tsx`, `xp.*` in the locales).
They are the same rules, in the same order the code applies them: when one changes, it changes in
three places or it is wrong in one.

The hard weight is wide because a narrow one was measured against the seeded catalogue and found
to punish the two archetypes it should reward. `skill` and `strength` quests are 80-87% rest *by
protocol* — ten seconds of front lever, two minutes of recovery — so a volume metric undervalues
them: at 0.85/1.0/1.25 they paid 0.31× and 0.51× of what the old clock paid, while `mobility` kept
0.97×. A hard rep being worth roughly three easy ones is also simply true; one pull-up is not one
jumping jack.

The style weight is the other half of that measurement: `mobility` kept 0.97× because a volume
metric overpays a stretch. A tester holds a plank for ninety seconds and flows through cat-cow for
five minutes or more, so a stretch is sustainable for about three times as long because it costs
about a third as much. That ratio says 0.4; 0.5 was kept because the weight also falls on `medium`
postures (downward dog, pigeon) that cost a hero coming back from a break as much as a hold, and the
three all-yoga quests fell from about 107 XP to 43 at 0.4, to 54 at 0.5. Five minutes of easy
cat-cow (0.8 × 0.5) now pays about a third more than ninety seconds of plank, not three times more. It is XP only: boss damage and village work read `toRepEquivalent` and do not
move. A mobility session still lights the flame, which counts sessions, not XP.

Order matters between the weight and the ceiling below: the ceiling bounds *physical* seconds,
the weight prices them. Weighting first would clip every honest session of hard movements against
its own clock.

Three bounds, each answering a different question (`db/xp.ts`):

| Bound | Value | What it answers |
| --- | --- | --- |
| Overshoot allowance | +25%, then 25% of the surplus | Beating a target pays, and keeps paying — it resists rather than stopping. Holds get no tail: a hold's result is a clock, so its overtime is not a claim anyone made. |
| Effort ceiling | elapsed − pauses − **rest taken**, ×1.2 | Nobody exercised for more seconds than the window allowed. A ceiling, never a source. |
| `MAX_SESSION_XP` | 2000 | The only bound no hero input can raise. Rounds, targets, tempo and results are all typed in, so a cap derived from them caps nothing. |

Rest is not effort, and does not appear on either side: not in the payout, and not in the ceiling.

### Ground is priced by the way out, not by the movement

A minute in motion is worth a fraction of a minute of effort: **walk ¼ · ride ¼ · run ½**. That
fraction replaces both the difficulty weight and the hero's level — a walk is neither easy nor
hard, it is a walk. Which fraction is read off `exercises.locomotion` (`0049`), and a
hero-authored expedition is always `walk`: the rate is the whole judgement, so a picker would be a
free doubling on identical GPS traces.

`ride` is not above `walk` even though the effort is. The mounted speed cap is 90 km/h
(`stores/expedition.ts`), so an hour on a motorway credits an hour of moving time, and paying that
above an hour of genuine walking inverts the one thing the trace does know. Lowering that cap is
the better fix and it belongs to the reducer.

Three bounds again, and each closes a hole the others could not see:

| Bound | Value | What it answers |
| --- | --- | --- |
| The witness | the trace's moving seconds | An outing is paid for what moved. Not a bound on what the slots recorded — the recorded value is the view's stopwatch, which counts a bus and a bench. |
| Decay | 1st hour full, 2nd ½, then ¼ | Going on is worth less per minute and never nothing. Measured over the **day**: per session it is undone by pressing stop and start, which paid 1800 for six hours worth 750. |
| The floor | 10 XP, not on the day's second outing | A one-minute walk is 1.25 XP and floors to 10, an eightfold uplift. 120 of them paid 1200 against 450 for the same two hours in one piece. |

A fourth bound exists for the time nothing witnessed, which going out without GPS made a button
instead of a rare hole. **At most two hours of it are paid per day**, however many outings without
GPS, outings where no fix ever locked, or resumes after a kill produced it (`untracedSecondsToday`,
`UNTRACED_PAID_SECONDS_PER_DAY` in `db/completed.ts`, applied in `outingLedger`, `stores/session.ts`):
450 XP of walking, 900 of running, before the day's decay. The duration written to the journal stays
what the clock said (bounded by `UNWITNESSED_OUTING_MAX_SECONDS`, four hours); only the paid time is
capped, and the flame reads the duration, not the XP. This replaces the "ceiling of a declaration"
that `UNWITNESSED_OUTING_MAX_SECONDS` used to name as a known hole.

One leg per session, never one per slot: a quest with six outdoor slots or six rounds — both of
which the editor allows — priced six first hours.

#### Why it changed

A walk paid 16 XP a minute, because a minute of it went through the formula above. What makes that
formula honest indoors is that rest comes out of it, and a walk has no rest to remove: 25 minutes
of watch paid 6 minutes of effort indoors and 25 outdoors. `MAX_SESSION_XP` was reached in 2 h 05
of walking and by nothing else — the best quest in the catalogue pays 383 at its targets — so a
tester's six-hour hike took him to level 5 on a journal holding three short real sessions. His
words: it devalues the real sessions.

Nothing was recalculated. `0049` gave a session a column saying which kind it was, and the records
a walk had taken stopped looking at walks, which settles the trophy without moving a journalled
number. See [statistics-progress.md](statistics-progress.md#outings-are-counted-apart).

### A session the hero writes down pays 75

A session done where Bati cannot see it (a gym session, a walk without the phone) is written down
afterwards, up to seven days back, one per calendar day, from ten minutes to four hours. It pays
`HAND_ENTRY_XP` (`db/xp.ts`): the XP of fifteen minutes in Bati, `15 * outingXpPerMinute("walk")`,
**75**, the same for every type and every duration. One figure because nothing checks what happened
in a gym, and a "run" entry would pay double for it. Fixed at the save: a correction changes the
day, the length, the name, the type or the distance and never the XP, because the oath bonus is
written on the same row and the sync keeps the larger XP of a row (`takeLargerXp`).

What it keeps and what it never touches is one table (`docs/product/glossary.md` has the words):

| | Written down |
| --- | --- |
| Flame, oath (sessions, per week, flame) | Yes: it is read as a session (`countsAsSession`) |
| Oath of leagues, the road | Only the distance the hero typed, bounded by four hours at the plausible speed |
| Boss damage, records, bests, objectives, the outing habit | Never: `isWorkout()` is `outing IS NULL AND byHand IS NULL` and `isMeasured()` is `byHand IS NULL`, so a reader that forgets either leaves the row out |
| Level, adventure step, light week, rung, cap offer | Never |
| Badges of count, hour and length (`sessions_*`, `early_bird`, `night_owl`, `long_session_*`, `first_outing`, `hour_outside`) | Never; the badges of XP and flame follow on their own |
| The village's presence (years, chronicle, crest, big feast) | Yes, as the flame does |

The flame can now be held by two sessions written down in a week, without opening a quest. That is
what the feature is for, and it is written here so nobody rediscovers it as a bug. The five refusals
(too old, one per day, under ten minutes or over four hours, overlapping a measured session, an
implausible distance: 8 km/h on foot, 20 running, 45 riding) are `checkHandEntry`,
`db/handEntryRules.ts`.

### The day's quest pays nothing extra

It used to: half of what the quest proposed, once a day, on a quest the app drew by the date and
never showed as the day's. A bonus nobody could see coming is a rule the hero cannot play, and
the XP page could not state it without also saying which quest it was. It was removed rather than
surfaced. `completed_sessions.dailyBonusXp` (`0071`) stays, unwritten, so the XP already paid
stays on its rows.

The suggestions still count only sessions logged before today (`workoutsBeforeToday`), so what
the app may suggest does not change in the middle of a day.

#### Why it changed

It used to be `durationSeconds / 5` — wall-clock and nothing else. Rest counted, waiting counted,
a backgrounded app counted. A hero who dragged the rest slider to its 300s maximum out-earned one
who trained, for no effort, and the gallery's "up to +N XP" chip advertised it: the tag moved with
the slider, so the exploit was discoverable without reading a line of code.

The fix is not a new design. This page already said XP measures *how much* — only the code
disagreed. What the rewrite cost was the assumption that a clock is a proxy for work.

`0037_xp_measures_effort.sql` is the one place the change reaches backwards. Journalled XP is left
alone — nobody is demoted by an update — except for sessions whose XP has no relation to the work
they recorded, because `most_xp` is a per-session record read live off the journal and the
exploiting session would otherwise stand as an unbeatable trophy.

## Where a quest starts

A workout runs at one of three difficulties, and the first one a hero meets on a quest is decided
by one rule, coded once (`loadDefaultLevels` and `startingDifficulty` in `db/questConfig.ts`):

```
the level picked on the quest screen for this start
  ?? the saved config of this quest
  ?? the difficulty of the hero's last session of this quest (the journal)
  ?? the starting point: "I'm starting or coming back" -> Easy
                         no answer, under 3 sessions  -> Easy
                         no answer, 3 sessions or more -> Medium
                         "I already train"            -> Medium
```

- **Hard is never a first default.** It is reached by the hero's own choice on the quest screen.
  Inside an adventure it can also come from the feedback suggestion
  (`suggestDifficultyFromSessions`, three "too easy" out of five sessions), which only adventures
  read; a quest lived at Hard then reopens at Hard through the journal line.
- **Inside an adventure**, the level the adventure proposes travels in the route and goes in front
  of this cascade. The starting point is only its base for a hero with no session.
- **An outing has no difficulty.** It is Medium everywhere and the rule does not touch it.
- **No answer is only read as "starting" while the journal is short** (`isStartingOut`, under
  three sessions before today). The question is recent and skippable: without this, an update
  read every hero who was here before it as a beginner. Three is the count `startsGently`
  (`db/preferences.ts`) holds the jumps back for, so the dose and the warm-up let go together;
  the two rules differ on purpose for a hero who said "I already train", who is kept off jumps
  for those first sessions and still handed the dose they asked for. The same reading decides
  that an advanced quest is not suggested.
- **A gentle start is warmed up gently**: no jump (`exercises.impact`), and no cardio movement
  above `easy` either (`tooBriskToOpen`, `db/exercises.ts`), so day one opens on the glute
  bridge. A warm-up is not harder than the work behind it.
- **A quest the hero wrote or was sent starts as written**, at Medium: Easy is three quarters of
  its numbers, and they are the hero's.
- The starting point is asked once in onboarding ("Tu en es où ?", two answers, skippable) and
  edited in Settings ("Point de départ"). Changing it moves the quests never played and which
  quests are offered, never a saved config, the journal or a record. An `advanced` answer stored
  before the question had two choices reads as `regular`.

Why the journal comes before the answer: sessions sync between devices and quest configs do not,
and an update or a change of answer must not move a quest the hero already knows.

Why it exists: up to 2.10.0 onboarding started the first quest at Easy and Home started the same
quest at Medium, whatever had been answered
([audit of 11 October 2026](../design/audits/2026-10-11-onboarding.md), B3).
`__tests__/starting-difficulty.test.ts` holds the table.

## What a slot asks tonight

The number a hero is asked for is derived on read from their own journal (`progressiveTarget`,
`db/progress.ts`; nothing is stored, there is no migration). The coach's rules:

| Rule | What Bati does |
| :--- | :--- |
| Double progression | Every non-neutral set met: +1 rep per set (+5 s for a hold). Otherwise the same target. A hold keeps its band (67 % of its record) and gains 5 s; it is never lowered. |
| Plafond puis échelon | At 20 reps / 60 s the progression stops. The victory of the session that completes a series of 3 at the cap offers the rung above in one tap (not on the 4th or 5th, again on the 6th, a miss restarts the count) (a swap in the quest config), and the next session starts at the bottom of its band. A neutral session (light week, lowered target, movement left) neither counts nor breaks the series, and one at the head of it completes nothing. |
| Reprise | More than 14 days without the movement: a level lower for 2 sessions, then back to the number from before the gap. |

Constants: `TARGET_STEP`, `TARGET_CAP`, `COMEBACK_GAP_DAYS`, `CAP_SESSIONS`.
A level change still moves a learnt target by the ratio of the two levels, so the picker keeps
meaning something after the first session. The hero's own number always wins: it is laid over the
app's, which keeps climbing underneath it.

Worked examples (each one a test in `__tests__/progressive-target.test.ts`): 12 met on every set
asks 13; a set at 11 asks 12 again; 20 met stays 20; a hold of 30 s met asks 35 s;
12 met then 15 days away asks 9, then 10, then 12.

- **One movement, one progression, inside each quest's band.** The history is the movement's, across
  quests, with the sessions of a hero-authored quest left out (a hero who wrote "50 squats" must not
  see 50 in every seeded quest). The result is clamped to tonight's band: raised to its floor, cut
  at `max(top, 20)`. A hero who only does 12-16 Squat quests and meets 16 still climbs to 20 in
  them; one who then opens a 20-25 quest starts at its floor. Decision PARK-7 (a)+(c).
- **Holds are never lowered.** A hold keeps today's band (67 % of its record, `generateTarget`)
  plus the +5 s step when every set was met. A 75 % cap of the record applies only to a record set
  by a max effort, and none is marked as one until "Dernière série max": the cap code is removed
  until then. Decision PARK-8, D-37.
- **A swap with no history starts at the bottom of the band**, for every swap (one rule: the config
  cannot tell the cap offer's swap from a manual one). Easy has no level under it and takes
  Medium's comeback step.
- **Bosses**: a boss's hit points still come from the quest's `targetMax`, never from the served
  target, while targets now climb up to the cap and damage follows the prescribed reps: a boss falls
  a little faster for a hero who progresses. Intended.
- **Home's "Ce soir" line** says the session objective (the slot's target, the big number), not
  "à battre", which stays on the wall and the ghost line (PARK-1). It is only on a quest stage, not on the adventure stage (it shows no
  quest) nor on a day already done, and only from a movement's second session.
- A mid-session swap keeps the slot's number and no history (`ponytail:` in `stores/session.ts`).

## Village

The village is **one illustrated scene**, not a list of buildings to manage.

1. **Tier** is a function of level — 12 illustrated scenes, no build menu, nothing chosen or
   spent: `hameau → clairière → village → carrefour → bourg → ville franche → cité →
   cité marchande → cité florissante → citadelle → métropole → capitale éternelle`, at levels
   1/3/5/8/10/13/15/18/20/25/32/40.

   The top three exist because the level curve does not stop at 20 — it runs on at a flat 2000 XP
   a rung, and without them the scene froze for the rest of the account's life after two or three
   months. Their gaps widen (5, 7, 8) so each still costs more than the last, which the flat XP
   curve up there would otherwise undo.

   The even tiers below 9 came later, filling 3/8/13/18. That is where a real player spends their
   first two months, and four levels between scenes is a long time to watch nothing change. The
   top half was deliberately left alone: the art there is already at the edge of what can escalate
   convincingly, and an intermediate step would read as a duplicate rather than a step.
2. **Overlays** layer on top conditionally:
   - Flame intensity (0–3), from the current consistency streak
   - Dominant-sport visual (from the last 7 days of training)
   - A permanent banner per boss defeated (see [boss-fights.md](boss-fights.md))
3. **Milestones** reveal a detail on the scene at a training-volume threshold —
   e.g. `totalArmReps >= 500` reveals a forge silhouette — not a separate badge/collection
   system, not a stored unlock.

## Flame (consistency streak)

**The flame counts days of consistency, not days trained.** A day keeps the flame lit when the
trailing 7-day window holds at least the hero's weekly quota of sessions — **or** when the week
before it did. Rest days therefore cost nothing, and one blank week is forgiven; two consecutive
blank weeks put it out.

| Days lit | Flame level |
| --- | --- |
| 3+ | 🔥 Spark |
| 7+ | 🔥🔥 Ember |
| 14+ | 🔥🔥🔥 Blaze |
| 30+ | 🔥🔥🔥🔥 Inferno |
| 100+ | ✨🔥✨ Eternal |

### The flame sleeps, it does not fall to zero

An unlit day no longer resets the count. `walkFlame` (`db/streaks.ts`) keeps an `idle` counter: the
unlit days **with no session** in a row. The count only goes at `FLAME_DORMANT_DAYS` (56), which is
eight weeks for a hero coming back under their quota and about ten from the last session for one who
stops dead (the flame stays lit fourteen days after a week at quota). **Any session that counts
resets `idle`**, even one that does not relight the flame, so a hero who comes back once a week keeps
their count as long as they come. The days of the gap are never counted: 100 days of flame are
100 lit days, which is also why the Eternal flame can stretch over more than 100 calendar days.

While it sleeps `current` stays 0 (so `isActive`, the village fire and `litUntil` do not move) and
`dormant` carries the count. The Journal shows it as "45 dormant", the widget as "🔥 45" over
"en veille". The relighting is measured at the hero's own quota, oath included; raising the quota
by an oath recounts the whole journal at it, and the oath screen says so before the tap. `best`
bridges the same gaps, and there are still two of them: at the hero's quota (Journal,
achievements, the `streak` oath) and at the baseline of 2 (the crest, which never loses a band).
No delay or countdown is shown anywhere, and no lower comeback rule exists yet (the grid's line 5
stays at 1).

`FLAME_PIVOT` (`constants/flame.ts`) is the date of the release that shipped this: a gap is only
bridged if the day that relights it is after it, and a hero out at the update reads `dormant` from
the first launch. Gaps already closed before it stay breaks, so no past `current` or `best` moves.

### A pause is a day the flame does not live

Settings, "Pause and zone" (`app/pause.tsx`, `db/pause.ts`, M-04). The hero says the day they come
back, up to 56 days. The list of pauses is the preference `pause_goal` (`constants/pause.ts`, never
trimmed: the flame needs the past) and `flameTimeline` leaves a paused day out of the timeline
altogether: it is neither lit nor idle, a "week" is seven days that are not paused, and the days
either side of a pause touch. So the flame reads on the way back exactly as it did the day it
stopped, a sleeping count is not eaten by the pause, and a session logged during one lands on the
day before it. Reminders start on the return date (`planReminders` `pausedUntil`), the oath is not
offered by Home or counted down in a notification (`isOathFrozen`), and the adventure has no clock to
stop. Nothing is paid: a pause earns nothing and takes nothing.

The second door, "I'm sparing a zone", changes nothing about the flame. One or two of the six muscle
groups for one to eight weeks: every exercise that works them is set aside through
`setExerciseAside` with `until` and `reason: "zone"`, which `getSetAsideExercises` stops returning
at the end date, so they come back with no gesture. A hand set-aside made before stays, one made
during makes the entry the hero's. A press counts as loading the shoulder whatever its muscle tags
say, and a slot with no close substitute takes the nearest strength movement of another pattern
(`setAsideReplacement`, `spared`). Joints are a second phase. Never advice: the screen points to
Safety. On return there is no card of its own until the NoticeSlot (P-05) exists.

### The quota is the hero's own promise

Without an oath the bar sits at the WHO baseline, **2 sessions a week**, so someone who has sworn
nothing still has a flame worth keeping. Swearing a [`weekly_sessions` oath](oaths.md) raises it
to their chosen 2, 3 or 4 — the flame becomes the live representation of whether they are keeping
the promise they made. One mechanic, one unit, and the target is chosen rather than imposed.

### Why it changed

The flame used to count consecutive training days, which put the app at war with itself: an
achievement asked for 100 days in a row while the [rest rule](coach-planning.md) nudges a rest day
after 5. The research is explicit that breaking a strict streak pushes people to abandon rather
than restart, and that missing a single day does not compromise habit formation — so the day a
hero rests must not cost them anything. See
[raw/bodyweight-app-research.md](../raw/bodyweight-app-research.md) §5.

The counter is still derived from the session journal on read (`db/streaks.ts`), so the change
needed no migration — but every hero's flame grew the day it shipped, because their rest days
now count.

### A mobility session is how a rest day still counts as work

[§11.4](../raw/bodyweight-app-research.md) names this the cleanest overlap the dossier found
between good programming and good retention design: a 10–15 min mobility session is
low-fatigue by design, so it can be done on a day the hero should not train hard, and it still
lights the day. Skill practice (§8.6.7) has the same property for the same reason — it is
capped by quality, not by effort.

The mechanic already exists on both sides: the flame counts a day the quota held, and the
`mobility` quest archetype is in the schema. What was missing was **content** — the catalogue
shipped exactly one mobility quest. See [quests.md](quests.md).

## Victory screen (example)

```
┌─────────────────────────────┐
│    ⚔️ QUEST COMPLETE! ⚔️    │
├─────────────────────────────┤
│  +150 XP   Level 5 ████░░   │
│  12-day flame               │
│                             │
│  🏰 The village grows!      │
│  (forge silhouette revealed)│
│                             │
│     [Continue to Village]   │
└─────────────────────────────┘
```

## What was removed, and why

Resources (wood/stone/fire/water/wind/grain/mana/leaf), Gold, boss tokens as an inventory
item, and per-building XP/levels/prerequisites/prestige all added a second parallel state
machine on top of the journal — with nothing to actually spend any of it on. Muscle-focus
feedback now lives in [statistics-progress.md](statistics-progress.md) (muscle balance);
boss victories now live directly as village banners instead of a spendable token.

## Skill, alongside volume

XP, the village and the flame all measure **how much** and **how often**. [paths.md](paths.md) is
the fourth thing derived from the same journal, and the only one that measures **what the hero can
now do**: a named route up the variation ladder, its rungs owned three clean sessions at a time.
Climbing a whole one puts a trophy on the village shelf beside the defeated bosses — until it
existed, the village recorded volume and never skill.

## Related

- [paths.md](paths.md) — the variation ladder: skill progression, derived the same way
- [statistics-progress.md](statistics-progress.md) — muscle balance, PRs, sessions/week, calendar
- [coach-planning.md](coach-planning.md) — what Home offers next: oath, weak-area, rest
- [session-flow.md](session-flow.md) — flame, victory screen, "no session is wasted" rule
- [boss-fights.md](boss-fights.md) — boss victories as village banners
