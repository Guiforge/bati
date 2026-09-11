---
title: Reference scout, sport app mechanics
type: design
status: active
updated: 2026-09-10
related: [../audit-protocol.md]
---

# Reference scout, sport app mechanics

> The scout is not a user and holds no veto. Everything below is a proposal that enters the
> ledger like any other finding. Ranked by how much it would move the two things Bati is
> measured on: immersion, and the feeling of accomplishment after a session and over weeks.
>
> Researched 2026-09-10 across Strava, Hevy, Whoop, Zwift, Peloton, Nike Run Club, Apple
> Fitness, Duolingo, Habitica, Finch, Streaks, Forest, Ring Fit Adventure, Fitness Boxing,
> Beat Saber, Zombies Run, The Walk, Walkr, Pokemon GO and Orna.

---

## 1

[app] Hevy
[mechanic] The instant a logged set beats the stored best for that movement, a badge stamps that
set row and a toast animates in over it, mid-session, before the next set. The check is per-set
against a local table keyed by exercise, not a post-workout pass.
[why it works] The reward lands at the peak of the effort that earned it, not four movements
later. A reward deferred to a summary screen is attributed to the summary screen.
[for Bati] The session screen (`ActiveExerciseView`), on the tap that logs a result. It does not
replace `NewRecordsBadge` on victory, it precedes it: victory keeps the list, the session gets the
moment. Bati has no per-movement best today, only six session-level records
(`pr_most_xp`, `pr_longest`, `pr_best_streak`, `pr_ground`, `pr_longest_outing`,
`pr_total_sessions`), all of which stop being beatable after month one.
[cost] new system (a per-movement best table derived from the journal), then trivial to surface

> **Out of date since 2026-09-11, kept as written.** The two sentences above were true when this
> was researched and were wrong a day later. `getExerciseHistory` returns `{last, best, at}` per
> movement *and per unit*, `checkForNewRecords` detects `exercise_max_reps` and
> `exercise_max_time`, `0051` stores which record a session broke, and the number to beat was
> already under the counter as the ghost line. The cost was not a new system: it was one
> comparison. Finding 7 below, "pre-fill the set row with last time's number", is the ghost line
> and shipped before this report was written.
>
> The correction lives here rather than in the text because a research note is a record of what
> someone believed on a day, and the useful thing to preserve is that a cost estimate aged out in
> twenty-four hours.

## 2

[app] Strava
[mechanic] Best Efforts scans a single activity with a sliding window for the fastest 400 m, 1 km,
1 mile, 5 km and so on found inside it, then labels the result against your lifetime and
year top three: "Best 5K: 22:14, 2nd fastest this year". The run was not a race and still
produced a record.
[why it works] It manufactures a notable result out of an ordinary session. The odds that any
given session yields a positive signal go from rare to near certain, which is the difference
between a progression system that pays weekly and one that pays once a quarter.
[for Bati] The victory screen and the journal's `PersonalRecordsCard`. Bati's journal already holds
everything needed: best reps on a movement at a level, best single round, most volume on a muscle
in one session, longest hold. Replace six unbeatable global records with a scan that finds what
this session was best at.
[cost] new system

## 3

[app] Zombies, Run!
[mechanic] Scripted audio drama plays in 2 to 5 minute clips at mission checkpoints, with the
player's own music between them. The chase sequences are the interval prescription: the story
tells you to speed up, and that is the workout structure. The plan is invisible because it
arrives as plot.
[why it works] The narrative occupies the exact minutes the body is not working, so rest stops
being dead time and becomes the reason to come back. Nothing competes with the effort, because
the story only speaks when the effort has stopped.
[for Bati] `RestView`. Adventure narrative currently lives between steps on a separate screen
that the hero taps through before the session. Move the campaign beat into the 90 seconds of rest,
one paragraph per rest, and the adventure is read while the hero is already in it. This is the
single largest immersion win available for the least new art.
[cost] one screen (the copy already exists in `adventures`; the beat needs a pointer per rest)

## 4

[app] Zwift
[mechanic] Crossing a route's finish line fires a full-width banner over the 3D world, naming the
route and the XP, before the app leaves the world for the end-of-ride summary screen.
[why it works] The celebration happens where the effort happened. Once the camera has cut to a
stats page, the achievement is being read about rather than experienced.
[for Bati] The last rep of a boss fight. `VictoryView` currently owns the sword and the
120-particle burst, which means the kill is announced on a different screen from the arena that
staged it. Play the death over `BossArena`, on the art, then transition. Victory keeps the numbers.
[cost] one screen

## 5

[app] Apple Fitness
[mechanic] The ring-close animation fires the instant the numeric goal is crossed, full screen,
with its own haptic knock. A documented failure of the same system: when two rings close in the
same moment, the animation can be suppressed entirely and the user gets nothing.
[why it works] Threshold crossings are the only unambiguous moments a tracker owns. Firing them
late costs the association, firing two at once costs both.
[for Bati] Victory currently receives level-up, village tier change, achievement unlocks, new
records and boss defeat as one pile on one screen. Queue them as a sequence with one beat each,
and fire the ones that can be known mid-session (level-up, achievement) when they happen.
`SessionRewards` is where the queue belongs.
[cost] one screen

## 6

[app] Duolingo
[mechanic] A streak freeze is consumed silently and retroactively. The user finds out on next open,
because the calendar shows a snowflake on the day they missed. There is no spend-or-not decision
in the moment, and the protection is legible after the fact.
[why it works] Making the user choose to spend forgiveness forces them to admit failure to buy it.
Applying it silently and then showing the mark teaches that the system caught them, which is what
makes the next miss less frightening.
[for Bati] The flame is already the most forgiving design in this report: a 7-day window against
the hero's own quota, one blank week forgiven, rest days free (`db/streaks.ts`). None of that is
visible. `MonthlyCalendarCard` should mark the forgiven week the way Duolingo marks the frozen
day, and the flame should say which of the two windows is currently holding it up.
[cost] one screen

## 7

[app] Hevy
[mechanic] Every set row is pre-filled in grey with what you logged for that exact movement and set
index last time. You type a delta against a visible number rather than into a blank field.
[why it works] It costs nothing and turns each set into an implicit beat-this without ever making
a claim the hero has to live up to. Logging friction drops at the same time.
[for Bati] `ActiveExerciseView`'s result input. The quest already prescribes a target; the ghost is
a second, personal number beside it. Sport first, and it is the cheapest accomplishment signal in
the report.
[cost] one screen

## 8

[app] Ring Fit Adventure
[mechanic] The guide asks, in character, on a cadence: same, harder, or easier? The answer moves
the Ring-Con resistance and the rep counts. The difficulty curve is negotiated conversationally
rather than adjusted by a hidden algorithm.
[why it works] The hero stays the author of their own challenge, and the question is one more
moment the world speaks to them rather than a form field.
[for Bati] The Easy/Good/Hard row on `VictoryView`, which today is three bare buttons under a
heading. The rule behind it is already good (3 of the last 5, `suggestDifficultyFromSessions`).
Give the question to a villager, inside the pact in `villagers.md`: asked once, answered in a tap,
gone in a breath. Same three buttons, same rule, a world instead of a survey.
[cost] trivial

## 9

[app] Habitica
[mechanic] Rest in the Inn is a settings toggle that freezes all daily damage and streak decay for
as long as it is on. No cap, no cost, no purchase, explicitly for illness, travel and burnout.
[why it works] Forgiveness the user asks for out loud is stronger than forgiveness applied behind
their back, because it converts an impending failure into a decision they made. It also removes
the app's incentive to guess whether a silence is a rest or a collapse.
[for Bati] Settings, and a line on `OathCard`. The flame forgives one blank week; two ends it, and
a broken ankle is six. An explicit, uncapped, free pause is the only forgiveness Bati is missing,
and it is a boolean read by `db/streaks.ts` before it counts the window.
[cost] one screen

## 10

[app] Duolingo, plus the literature
[mechanic] Duolingo's break screen does not linger on zero. It shows the repair path in the same
frame as the loss. The research behind this is the abstinence violation effect: after a first
break, people abandon the goal entirely rather than fail once, because the first slip is inflated
by loss framing. A study on run-streak cessation found the same backfire, strongest in runners
whose only motivation was the streak.
[why it works] The cascade happens in seconds. Whatever is on screen at that moment decides
whether the hero reframes or quits, and a large "0" with nothing beside it reliably chooses quit.
[for Bati] The moment the flame goes out, on `HomeHeader` and in the journal. Never show a bare
zero. Show what survived: sessions this month, level, leagues covered, bosses down. Bati is well
placed for this because the flame is only one of five progression tracks, and none of the other
four resets.
[cost] one screen

## 11

[app] Strava (Year in Sport) and Hevy (monthly card)
[mechanic] Purely local aggregation over the user's own table, rendered once per period as a
single artifact in a visual language distinct from the app's normal chrome: totals, longest,
superlatives, records hit. Hevy does it monthly, Strava annually.
[why it works] Scattered daily effort is not felt as a quantity until something sums it. A period
long enough to contain real change is what makes the sum land, which is why monthly beats daily.
[for Bati] A chronicle page in the journal, written in the world's register rather than the
journal's: the month as a chapter. `TrendsCard` already computes weekly and monthly deltas, so the
data is there and only the framing is missing. This is the strongest weeks-scale accomplishment
mechanic that needs no server.
[cost] one screen

## 12

[app] Peloton
[mechanic] During a class, a literal line is drawn on the live output graph at your personal-record
pace: PR total output divided by class duration, times elapsed. Above the line you are on pace,
below it you are behind, continuously, all class.
[why it works] A ghost you are racing is a target that moves, which is a far stronger pull than a
static number, and it is entirely made of your own past.
[for Bati] `BossArena`. The boss HP hairline could carry a second, dimmer mark at where the same
boss stood at this point in the fight the last time the hero faced it. On a rematch, the tier is
already derived and the damage log already exists (`boss_damage_log`). The fight becomes a race
against the last attempt rather than a bar draining at an unknown speed.
[cost] new system

## 13

[app] Fitness Boxing
[mechanic] Sustained perfect-timing hits push the player into "Zone State", which visually
transforms the stage and multiplies points. It is an escalating environmental reward for a
maintained run of good reps, not a counter incrementing in a corner.
[why it works] The world reacting is a stronger signal than a number rising, and escalation gives
the run of good reps a shape: it can be entered, held, and lost.
[for Bati] The boss arena's phases. `bossPhase.ts` currently darkens the art by HP threshold.
Let a run of crits escalate the arena instead of, or alongside, HP, and the hero's own good work
is what changes the scene. The rule that a treatment darkens art and never repaints it still holds.
[cost] one screen

## 14

[app] Beat Saber
[mechanic] The score multiplier climbs 1x, 2x, 4x, 8x on consecutive clean hits, and a miss halves
it rather than resetting it to one.
[why it works] Halving is punishing and recoverable. Resetting tells the player the run is over,
and they stop trying inside the same run rather than at the end of it.
[for Bati] `paths.md`: a rung is owned three clean sessions at a time. Check what a failed session
does to the count. If it zeroes, halving or a one-step decrement keeps a hero who missed the third
session working toward the same rung instead of restarting a ladder they were one session from
topping. `PathStrip` is where the hero would read it.
[cost] trivial

## 15

[app] Zwift
[mechanic] Every route awards a one-time completion badge worth roughly its own base XP, so the
first ride of a new route pays about double. Bonuses run from about 60 XP on a short route to about
950 on the longest.
[why it works] The bonus is a reason to try unfamiliar content rather than grind the loop you
already know, and it costs the designer nothing but a visited-once table.
[for Bati] The quest gallery and `VictoryView`'s XP line. A first-clear bonus per quest would push
heroes through the catalogue instead of into one quest they trust, and Bati's XP model already has
a clean place to add a flat, once-only term (`db/xp.ts`). It must be flat rather than
multiplicative, for the same reason the daily-quest bonus was changed from a multiplier to half the
proposed target.
[cost] trivial

## 16

[app] Duolingo
[mechanic] A home-screen widget shows the live streak count and the mascot's expression reacting to
whether the streak is at risk. Duolingo credits the widget with a large lift in daily opens, on the
mechanism that the stakes become glanceable without opening the app.
[why it works] The number does the reminding, so the app does not have to send a notification to do
it. Ambient stakes beat an interruption.
[for Bati] The Android widget already exists (`react-native-android-widget` is registered in
`index.ts`, and the widget already resolves the app's language through `resolveAppLanguage()`).
Putting the flame and the current village tier on it costs one render and no new infrastructure.
Note that `oaths.md` deliberately ships no reminder; a widget is the version of that pull which
does not interrupt.
[cost] one screen

## 17

[app] Whoop
[mechanic] A journalled behaviour only produces a correlation claim once it has at least five yes
and five no instances inside a rolling 90-day window. Below that it is suppressed as unreliable.
[why it works] One insight fired on noise costs the credibility of every insight that follows. An
explicit minimum sample is the cheapest possible guard on a feature whose whole value is being
believed.
[for Bati] `MuscleBalanceCard` and its `pull_deficit_title` claim, plus `SuggestedQuestsCard`.
Bati asserts things about the hero's training from the last 30 days with no stated floor. Adopt a
named threshold before any card makes a claim about a pattern, and say nothing rather than guess.
This is the same rule as "a loading state must not assert".
[cost] trivial

## 18

[app] Strava
[mechanic] Matched Activities clusters your own past outings that share a start point, end point,
direction and distance into one route without you defining anything, then charts your times on it
over the months.
[why it works] Longitudinal progress on a thing you actually repeat is the most convincing evidence
of getting better, and it requires no act of curation from the user.
[for Bati] `app/recap.tsx` and `ExpeditionSummary`. Bati stores every trace on the phone. Matching
today's outing against previous ones by start, end and credited ground would let the recap say "the
twelfth time on this round, your fastest" instead of only reporting the numbers of one walk. The
league and moving-seconds columns needed for the comparison already exist (0046).
[cost] new system

## 19

[app] Ring Fit Adventure
[mechanic] Colour-coded elemental weakness, where matching an exercise category to an enemy's
colour deals bonus damage, is not available at the start. The ability is unlocked partway through
World 2, once the player has already learned the base loop.
[why it works] Tactical depth handed over at minute one reads as complexity. The same rule
introduced after the loop is understood reads as the game opening up.
[for Bati] `BossPanel` on the adventure screen shows weakness and resistance before the first
fight. Consider holding it until the second boss: the first fight teaches that reps become damage,
the second teaches that the right reps become more damage. Onboarding, not gameplay, so nothing in
`boss-fights.md` changes except when the panel starts speaking.
[cost] trivial

## 20

[app] Habitica
[mechanic] Every task carries a continuous value score that colours it from red through yellow to
blue. Completing it pushes the colour up, missing pushes it down, and untouched tasks decay slowly
toward neutral. Damage and rewards both scale off that value, so an established habit is forgiven
more than a struggling one.
[why it works] A continuous indicator survives a single miss. A binary streak flag does not, which
is why one bad day can end a three-month record and a colour ramp cannot.
[for Bati] The five flame levels (Spark, Ember, Blaze, Inferno, Eternal) are already a ramp rather
than a binary, which is the good half of this. The missing half is the decay direction: today the
count is derived from a window and levels are thresholds on it, so a hero at Inferno who misses a
week drops several tiers at once. A dimming that reads as continuous, on `FlameFlicker`, would let
a bad week cost intensity without costing the tier's name.
[cost] one screen

## 21

[app] Whoop
[mechanic] Every top-line metric is shown as a colour and a short directive before the raw number
is shown at all, and insights are pushed on open rather than waiting to be queried.
[why it works] Removing the interpretation step is what makes the app feel like it is paying
attention rather than storing rows. A number the user has to judge is homework.
[for Bati] `JournalStats` and `TrendsCard`, which lead with figures. Bati's register can carry a
verdict better than Whoop's can, because it has a world to say it in. Caution: the colour half of
this is out, per the rule that state is never colour-only, and the directive must not become a
fifteenth copy of the same sentence shape.
[cost] one screen

## 22

[app] Ring Fit Adventure
[mechanic] Silent Mode swaps jogging in place for the analog stick, so a player with a leg injury
or a downstairs neighbour keeps the identical narrative and combat loop. The input method is
decoupled from the game state.
[why it works] It proves the RPG framing never depended on the sensor. Progression that survives a
changed input is progression the hero can keep through the six weeks their shoulder is out.
[for Bati] The session screen's movement slot. A hero who cannot do a movement today should be able
to substitute down the variation ladder and still deal damage, earn XP and light the day, with the
path rung being the only thing that does not advance. The ladder that makes this possible already
exists in `paths.md`.
[cost] new system

---

## Not for us

Each of these is genuinely excellent and each fails on something Bati has decided not to have.

- **Strava Local Legend and KOM/QOM.** Both rank you against other people on a shared segment. No social graph, no server.
- **Zwift Ride On, and rubber-banding.** Recognition from, and pacing against, other riders in the same event. No social graph.
- **Duolingo Leagues.** Weekly cohorts of about thirty real users. Needs a server and a population; a fake local leaderboard would be a lie the hero eventually notices.
- **Duolingo Friends Quest, Habitica party boss quests.** Shared targets and shared damage across real accounts. No social graph.
- **Peloton live shoutout.** An instructor reading your name in a scheduled live class. Needs live class infrastructure.
- **Whoop Recovery, Strain, Strain Target.** All rest on overnight HRV, resting heart rate and sleep staging. No wearable.
- **Strava Relative Effort.** The zone weighting is portable, but it is meaningless without a heart-rate stream. No wearable.
- **Apple Activity rings.** On-device and server-free, but every input is HealthKit sensor data. No wearable. The calendar-bounded badge pattern is stolen separately at finding 11.
- **Whoop and Peloton population comparisons, Apple's Burn Bar against others.** All need an aggregate of other users' data. No server.
- **Hevy plate calculator and estimated 1RM.** Both assume an external load. Bati is bodyweight, so there is no bar to load and no weight to plug into Epley.
- **Duolingo hearts, gem-bought streak repair, Super-gated forgiveness.** All are monetisation levers. No IAP, no subscription, and forgiveness that costs money is the version of forgiveness this app should least want.
- **Pokemon GO Adventure Sync.** Weekly distance tiers tracked with the app closed via OS health APIs. The tier pattern is worth having, the background health-API dependency is not, and Bati's expedition already owns its own trace.
- **Duolingo's outage protection.** Server-side by definition. Its lesson still applies though, and it is not a small one: never let infrastructure failure read as user failure. In Bati that means a session the OS killed must never cost a day, which `sessionClock` and the recovery path already take seriously.

## Related

- [../audit-protocol.md](../audit-protocol.md) - where these findings enter the ledger
- [../../docs/gameplay/progression.md](../../docs/gameplay/progression.md) - XP, village, flame
- [../../docs/gameplay/boss-fights.md](../../docs/gameplay/boss-fights.md) - the arena these would change
