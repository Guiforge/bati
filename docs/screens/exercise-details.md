---
title: Exercise Details
type: screen
route: /exercises/[id]
status: active
updated: 2026-08-17
related: [exercises.md, quests.md, quest-details.md, session.md, ../gameplay/paths.md]
sources: ["app/exercises/[id].tsx", "db/exercises.ts", "db/paths.ts", "components/common/PathStrip.tsx"]
---

# Exercise Details (`/exercises/[id]`)

## Purpose

Exercise Details explains a single movement — and, when the movement sits on one, shows the
**path** it belongs to: where it leads, where the hero stands, and how close the next rung is.

## Main features on this page

- **Exercise media**: large image area for visual recognition.
- **Localized name and description**: English/French content follows the active language.
- **Equipment tag**: clarifies whether equipment is required.
- **Timing hint**: seconds-per-rep guidance when available.
- **Muscle tags**: the muscles the movement trains.
- **The path** — its name, a segment bar, and the rung the hero stands on. Tapping opens that
  rung.
- **The next rung** — the harder variation, illustrated, with how many on-target sessions are
  left. Tapping opens it.
- **Loading/error states**: invalid IDs and database failures.

## The four states of the path block

`getChainTo` always ends its chain on the movement being viewed, so the last rung is this page and
`chain.position` is where the hero stands.

| State | Condition | Shown |
| --- | --- | --- |
| Off any path | no chain, no next rung | nothing (e.g. Burpee) |
| Foot of a path | no chain, a next rung | the next-rung card only (e.g. Wall Push-Up) |
| On the way | chain + next rung | both cards |
| Summit | chain, no next rung | the path card only |

The summit case is why the two are separate cards. They used to be one, with the path nested
inside the next-rung card — so on the twelve summits (L-Sit, Handstand Push-Up, Pull-ups…), the
movements a hero opens out of ambition, the whole block was absent.

A path is declared **climbed** only when `position === total` *and* the top rung is earned. The
second condition alone is not enough: mastery counts contiguously from the bottom, so a hero can
own a high rung while still standing on the first one.

## Visual rules

- The media helps recognition without overpowering the name.
- **Do not turn this page into a stats dashboard.** One bar for the path, no per-rung bars, no
  difficulty badge, no percentages — a wall of unlit movements is what the dedicated skill-tree
  screen was dropped for ([exercises.md](exercises.md)).
- The path is **named, not numbered**. "Rung 3 of 6" is a coordinate; "Path of the Pull" is a
  thing a hero can want. Names live in [`db/paths.ts`](../../db/paths.ts), keyed by the summit.
- State is never colour-only: the segment bar repeats what the caption already says in words.
- Small slots read the 128 px thumbnail, never the 1280 px session-hero art
  ([performance.md](../architecture/performance.md)).

## Typical user actions

- Check what a movement is, its equipment and its muscles.
- Ask "where does this lead?" — and open the next rung.
- Ask "this is too hard, what do I train instead?" — and open the rung the journal says they are
  standing on. That is deliberately *not* the direct prerequisite: on the Pull-ups page that would
  be Chin-Up, which someone who cannot do a pull-up cannot do either.

## What happens next

The page starts no workout. It now links **laterally**, up and down the path, so a movement is a
position on a route rather than a dead end.

## Implementation note

- `getExerciseById` for the movement; `getChainTo` + `getNextProgression` for the path. A ladder
  failure is reported and swallowed — the path is a hint, and its absence changes nothing else on
  the screen.
- The bar is [`components/common/PathStrip.tsx`](../../components/common/PathStrip.tsx), shared
  with the Home oath card. `readPath` (in [`db/paths.ts`](../../db/paths.ts)) is the single reader
  of what a chain means, so the two screens cannot disagree.
- Nothing here gates anything: no quest is hidden and no movement is locked. A hero who wants to
  try the summit tonight can.
