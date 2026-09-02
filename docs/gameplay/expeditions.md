# Expeditions

> Walking, running and riding: the only things that take the hero out of the walls.

## What one is

An expedition is a quest whose every movement carries the `expedition` style: walking, running or
riding, measured by GPS rather than counted in reps. The three seeded ones are each one movement,
one round (The Warden's Round on foot, Word Must Travel at a run, The Long Reach on a mount), and a
hero can write their own in the editor. Home's "Head out" band lists every quest whose every slot
is an expedition; the gallery's "Outside" chip lists any quest with one.

## The goal

On the quest screen the hero sets either a **duration** or a **distance**. The session shows no
countdown: the phone is in a pocket. When the goal is met, the phone buzzes once (if haptics are
on) and the ongoing notification says "Goal reached". Walking past it costs nothing and earns
normally.

A duration is measured in *moving* seconds, the same witness XP is paid in. A distance is the
reducer's credited ground (`src/gps/track.ts`), never a raw sum of fixes.

## What it pays

- **XP**, on moving seconds, with no target ceiling.
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

## Where the rules live

- Predicates: `db/expeditions.ts`. Goal and reducer: `src/gps/track.ts`, `stores/expedition.ts`.
- Economy: `db/workUnits.ts` (`NON_REP_STYLE` converts to zero), `db/xp.ts` (outing branch).
- Road floors: `db/village.ts` (`ROAD_FLOORS`). Scale: `db/gps.ts` (`METRES_PER_LEAGUE`).
- Design: [`../designs/expeditions.md`](../designs/expeditions.md),
  [`../designs/gps-without-google.md`](../designs/gps-without-google.md).
