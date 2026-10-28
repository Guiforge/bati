---
title: Quests Gallery
type: screen
route: /quests
status: active
updated: 2026-10-21
related: [quest-details.md, ../gameplay/quests.md]
sources: [app/(tabs)/quests/index.tsx, components/common/FilterRail.tsx]
---

# Quests Gallery (`/quests`)

## Purpose

The Quests gallery is where you **browse workouts**.

A **Quest** is a workout template (one quest = one session when you run it).

## Main features on this page

- **Browse quests**: discover workouts by theme.
- **Find what fits today**: quickly locate a quest that matches your focus.
- **Create** (header, in the place the "+" had): opens the **[Forge](forge.md)**, where "New quest" and the file import live.
- **Filters** (conceptually): narrow down quests based on what you want to train or what equipment you have.

## Visual rules

- Quest cards should feel dense but calm: subtle borders, readable metadata, no thick outline frames.
- Thumbnail strips are support content, not the main story.
- The header count/filter area should stay lightweight so the quest cards remain the focus.
- **Filters are two lines, never three, and never shift sideways.** Line one is a pill per
  dimension (Duration · Type · Muscles · Equipment) whose label never changes. Line two has one
  job at a time: the open dimension's options in a wrap, or — nothing open — the applied filters
  as removable chips plus "Clear". No filters, no second line. Duration is single-select and
  folds on pick. This replaced one horizontal strip of ~22 chips, where the hero saw three and
  could not know the other dimensions existed.
- **Muscles filter on the card's focus line, equipment on what the hero has.** A muscle chip
  matches the quests whose ranked focus (`trainingFocus`, the same list the card prints) names
  it — not every quest with one exercise that brushes it, which matched 28 of 34 seed quests
  for "back". An equipment chip means "I have this": every exercise must be doable with the
  selection, bodyweight always is, so "No equipment" is the 27 pure-bodyweight quests, not the
  33 that contain one bodyweight move.

## Typical user actions

- Scroll through quests.
- Pick a quest that matches the day’s goal (quick / standard / harder).
- Tap into a quest to see full details.

## What happens next

Selecting a quest takes you to **[Quest Details](quest-details.md)** to review and start.

## Implementation note

The current gallery implementation uses tokenized dark cards and lighter thumbnail borders to reduce the old high-contrast gallery look.

## Receiving a file (`/quest-import`)

One screen for both kinds of file (`app/quest-import.tsx`). It reads the file once and looks at `kind`: a
quest file shows the quest preview (rename, tick the movements, update or keep both), an adventure file
shows `AdventureImport` (cover, text, end, each step as already here, arriving with it or unknown to this
version, update or keep both, and a forced copy while a run of it is under way). The header names what
was received, never the door that opened it; before the kind is known it reads "File received". The kind
also decides where a success lands: `/quests/{id}` or `/adventures/{id}`. Both editors offer the same
picker button.

Two things are said before the hero accepts, both read by `arrivals()` (`src/questFile.ts`) from the same
catalogue the import writes into:

- **What arrives** (adventure files, `ImportArrives`): a card with the counts of quests, exercises and
  photos the file adds to this phone (`quests.import_arrives_*`). A row at zero is left out, and the card
  is gone when everything is already here. An exercise counts once however many quests name it, and one
  the hero already has by uuid is not an arrival. A new adventure's own photo counts among the photos, as
  the sender's share dialog counts it.
- **A same-name exercise** (both kinds, `ImportClashes`): "You already have an exercise named X: both will
  stay." Identity is the uuid, never the name (a hero may name two exercises alike, 0036), so the file's
  exercise arrives as a second row beside the hero's own. The match ignores case and surrounding spaces
  and looks only at the hero's own exercises, never the seeded ones. Neutral, not a warning. In a quest
  file, an exercise the hero unticks does not arrive, so its line goes with it.
- **A name the game already uses** (both kinds, `ImportClashes`): an arriving exercise named like a game
  exercise, or a quest titled like a game quest, says so ("... The one in this file stays separate.",
  `quests.import_game_name`, `quests.import_game_quest`). The import finds a hero exercise by uuid only
  and the hero and game names are separate populations ([exercise ownership](../architecture/exercise-ownership.md)),
  so the two never merge. English names, case-insensitive; a name that is also a hero clash gets the
  clash line alone.

A quest file carrying the uuid of a quest whose session is under way (warm-up to paused, the same live
test as starting a session) is forced to a copy: the update and keep-both choices give way to one line,
`quests.import_running`, as an adventure under way does. The test is read again at the tap. Only this
door is guarded: the quest editor and the sync merge can rewrite the quest mid-session, harmlessly,
because the session keeps its own copy.

The adventure preview reads in the order of the decision: cover and title, the "already here" notice
(update or keep both), **What arrives**, the same-name exercise line, the steps, then the boss (its name,
picture, and its lines behind a fold, "What it will say (5)", closed: every moment is readable, the
closing line is not thrown at the hero). See [boss fights](../gameplay/boss-fights.md).
