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

## Where the rules live

- Predicates: `db/expeditions.ts`. Goal and reducer: `src/gps/track.ts`, `stores/expedition.ts`.
- Economy: `db/workUnits.ts` (`NON_REP_STYLE` converts to zero), `db/xp.ts` (outing branch).
- Road floors: `db/village.ts` (`ROAD_FLOORS`). Scale: `db/gps.ts` (`METRES_PER_LEAGUE`).
- Design: [`../designs/expeditions.md`](../designs/expeditions.md),
  [`../designs/gps-without-google.md`](../designs/gps-without-google.md).
