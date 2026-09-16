---
title: Exercise Details
type: screen
route: /exercises/[id]
status: active
updated: 2026-09-16
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
- **Timing hint**: seconds-per-rep guidance on a counted movement. A hold (`measure = time`) and
  an expedition get no chip: their `secondsPerRep` of 1 only feeds the duration estimator, and
  "tempo 1s/rep" under a 45 s plank was not a fact about the plank.
- **Your numbers**: what the hero last did here and the record they are chasing, one line per
  unit, because a hold and a count on the same movement are two different records. Both numbers
  carry their day, in the Journal's words and through the Journal's own `recordWhen`: "Last time
  45s 15 Sept · Record 1:00 10 months ago". The label is **Record**, not "best" — the wall two
  taps away says Record about the same number, and the page used to print an undated "best 60s",
  which reads as something set tonight. `bestAt` comes from `getExerciseHistory`, dated the way
  the wall dates one: the earliest session that reached the standing best.
- **Muscle tags**: the muscles the movement trains.
- **The path** — its name, a segment bar, and the rung the hero stands on. Tapping opens that
  rung.
- **The next rung** — the harder variation, illustrated, with how many on-target sessions in a
  row are left (the run at the head of the recency window, not the clean ones out of three).
  Tapping opens it. A rung is allowed to fork: Push-ups opens Dip, Pike Push-Up and Diamond
  Push-Up, and Dead Bug opens three. One of them is illustrated and the rest are **named on one
  line** ("The same rung also leads to Pike Push-Up, Diamond Push-Up."), subject being the rung
  rather than the card's headline, which would make "Dip also leads to" a false sentence. The line
  is `progression.rung_also_leads_to` and the quest log and the victory card say it too, about the
  same fork: all three read `successorsOf`, so they illustrate the same movement. Three more poses would turn the card into a list of
  what the hero is not doing, which is the wall the skill-tree screen was dropped for. Standing
  on *any* branch earns the rung (`alsoNext` is part of what `getNextProgression` looks above at),
  so a hero doing Diamond Push-Ups is no longer told to go and earn Dip.
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

A path is declared **climbed** when every rung of it, this page's included, is behind the hero
(`chain.climbed`). Behind is not the windowed `isEarned`: a rung stays behind once it was owned
ever, or once a rung above it was owned ever or has one on-target session in the window
([paths.md](../gameplay/paths.md) § Owning a rung). Reading the top rung's `isEarned` instead made
"climbed" blink out eight weeks after the hero stopped repeating a summit they own, and the old
contiguous count made a hero holding a clean plank read "You are on Dead Bug" right above "Side
Plank: You have earned it".

## Visual rules

- The media helps recognition without overpowering the name. The frame is **square**, because the
  art is: all 64 movement illustrations are 1280×1280, as is the placeholder. The 16:9 frame it
  used to sit in spent 44 % of its width letterboxing them, and `contentFit` stays `contain` for
  the one case that is not square, a hero's own photo. The loading state renders that same frame
  empty rather than a skeleton of a guessed height, so nothing shifts when the image lands.
- **Do not turn this page into a stats dashboard.** One bar for the path, no per-rung bars, no
  difficulty badge, no percentages — a wall of unlit movements is what the dedicated skill-tree
  screen was dropped for ([exercises.md](exercises.md)).
- The path is **named, not numbered**. "Rung 3 of 6" is a coordinate; "Path of the Pull" is a
  thing a hero can want. Names live in [`db/paths.ts`](../../db/paths.ts), keyed by the summit.
  The chain ends on the page's own movement, so most pages are not a named summit: there the
  caption says where it goes, "Working up to Plank · rung 1 of 2" / "En route vers Gainage
  ventral · étape 1 sur 2", with the words a substituted quest slot uses. "Plank · Rung 1/2" read
  as "the plank is rung 1". A climbed page reads "Plank · Climbed" / "Gainage ventral · sommet
  atteint" (not "Gravie", which only agreed with *voie*). `pathCaption` in `db/paths.ts` writes
  the line for this card and the Home oath strip.
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
