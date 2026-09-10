# Expeditions

> Walking, running and riding: the only things that take the hero out of the walls.

## What one is

An expedition is a quest whose every movement carries the `expedition` style: walking, running or
riding, measured by GPS rather than counted in reps. The three seeded ones are each one movement,
one round (The Warden's Round on foot at 45 minutes, Word Must Travel at a run at 30, The Long
Reach on a mount at 45), and a hero can write their own in the editor. Those durations are a
suggestion the hero edits, held to a 20-to-60 minute window because it is shipped content; a hero
may set themselves up to twelve hours. Home's "Head out" band lists every quest whose every slot
is an expedition; the gallery's "Outside" chip lists any quest with one.

## The goal

On the quest screen the hero sets either a **duration** or a **distance**. The session shows no
countdown: the phone is in a pocket. When the goal is met, the phone buzzes once (if haptics are
on) and the ongoing notification says "Goal reached". Walking past it costs nothing and earns
normally.

A duration is measured in *moving* seconds, the same witness XP is paid in. A distance is the
reducer's credited ground (`src/gps/track.ts`), never a raw sum of fixes.

## What it pays

- **XP**, on moving seconds, at a rate per way out rather than a movement's difficulty weight:
  **walk ¼ · ride ¼ · run ½** of a minute of effort, so an hour on foot is 300 XP. No target
  ceiling and no level multiplier — a walk is neither easy nor hard. The first hour of the day
  pays in full, the second half, the rest a quarter, and that decay is measured over the day so
  cutting one walk into six changes nothing. See
  [progression.md](progression.md#ground-is-priced-by-the-way-out-not-by-the-movement).
- **Leagues** (one per kilometre), written once on `completed_sessions.leaguesM`. They drive the
  High Road in the village, the "Ground covered" total and "Longest outing" record in the
  Journal, and an oath sworn in leagues. They never convert to reps, damage or village volume.
- **A trace**, on the phone only, drawn on the recap map and exportable as GPX.

Its moving seconds are written beside the ground, on `completed_sessions.movingSeconds` (0046).
Both columns are decided once by the reducer at save, and the recap prints them rather than
folding the fixes again: a failed flush drops up to thirty of them, which the distance already
contains and a replay never would. An outing saved before that column says nothing about its pace.

## How long an outing lasted

**What its trace can prove**: first fix to last, capped by moving seconds plus twenty minutes of
stops. Not the session's own clock, which cannot answer for a walk the OS killed — recovery banks
every second of the downtime as pause, so a walk killed at 45 minutes and resumed for ten more
read ten. The duration on the victory screen, the one in the journal and the effort the XP ceiling
is bounded by all read that one definition (`sessionClock`, `stores/session.ts`).

## Standing still

Nothing is credited while the hero is stopped, and stopping costs nothing either. A fix is
credited as it lands so the panel can move every second, but what has been credited under an
anchor the hero never cleared is taken back when the window closes (`RULES.pauseAfterMs`,
`src/gps/track.ts`). Two known limits: a stop shorter than the window cannot be told from walking
at the floor pace, and below that floor — 0.25 m/s, 0.9 km/h — nothing is credited at all.

## It is not a workout, and it is still a session

`completed_sessions.outing` says which kind a logged session was, written at save from the strict
predicate: every slot outdoors. A mixed quest is null, because it holds real work.

Everything that means *training* filters on it — the journal's average duration, the calendar
dots, the weekly trends, the longest-session and most-XP records, the two "60+ minute workout"
badges, the overtraining warning. Everything that means *showing up* counts a walk of ten moving
minutes: the flame, and both oath metrics. Two badges are a walk's own, since it can take none of
the others.

`leaguesM` is not that marker and never was: a walk whose service never started has no ground and
is still a walk, a mixed quest has ground and is still a workout. It answers a third and smaller
question — whether to *show* a distance — as `hasGround` in `db/expeditions.ts`.

## Where the rules live

- Predicates: `db/expeditions.ts`. Goal and reducer: `src/gps/track.ts`, `stores/expedition.ts`.
- Economy: `db/workUnits.ts` (`NON_REP_STYLE` converts to zero), `db/xp.ts` (`LOCOMOTION_RATE`,
  `creditedOutingSeconds`). What the hero reads: `app/xp.tsx`.
- Which kind a session was: `completed_sessions.outing` (`0049`), `isWorkout` /
  `countsAsSession` in `db/completed.ts`.
- Road floors: `db/village.ts` (`ROAD_FLOORS`). Scale: `db/gps.ts` (`METRES_PER_LEAGUE`).
- Design: [`../designs/expeditions.md`](../designs/expeditions.md),
  [`../designs/gps-without-google.md`](../designs/gps-without-google.md).
