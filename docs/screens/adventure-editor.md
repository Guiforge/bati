---
title: Adventure Editor
type: screen
route: /adventures/edit
status: active
updated: 2026-10-21
related: [adventures.md, adventure-details.md, ../gameplay/adventures.md]
sources: [app/(tabs)/adventures/edit.tsx, components/adventures/QuestPickerSheet.tsx, db/heroAdventures.ts]
---

# Adventure Editor (`/adventures/edit`, `?id=` to edit)

## Purpose

Write an adventure out of quests the hero already has or has written. One scroll, one primary button.

## Main features on this page

- **Start from your last sessions** (new adventure, two sessions or more): fills the steps with the
  quests of the 8 latest sessions, oldest first. Nothing is saved.
- **Cover**: one of the bundled adventure covers, or a photo of the hero's own (the picture field's
  photo tile, a JPEG shrunk to 512 px and stripped of location and camera data, stored in
  `adventures.imagePath` as a `data:` URI like a quest's). In a shared file the photo rides in an
  optional `adventure.photo`, and `cover` keeps a bundled key as the fallback, so an older Bati
  imports the file and shows a real cover; it is counted in "the file holds N photos" and spends the
  same byte budget as the quests' photos, first. **Name** (60) and **introduction** (280).
- **Steps, 2 to 8**: a card per step with its quest, its duration, **Before you set out** (160) and,
  behind "Add a return", **On the way back** (160); move up, move down, remove. "Add a step" opens the
  quest picker (the hero's quests first, a name search) and is gone at eight.
- **The end**: a route, or a boss. The picker lists the hero's own bosses first (each with its picture,
  what it is weak to and what it resists), then the painted monsters the hero may pick: the first two
  and any already beaten, with the monster already on a saved adventure always shown (`listOfferedMonsters`),
  and a **New boss** button that opens the boss editor (the form stays as it is; the boss made there is
  chosen on return, the hero having made it for this adventure: the uuids known when they left tell it
  apart from one that arrived by sync, and the choice is theirs to change). The figure of the pool is and about how many HP it has at the hero's level for these steps (the figure the fight will
  use). If every step is an outing, a line says outings do not hit the boss; saving stays possible.
- **The boss itself is not edited here any more**: its name, pictures, weakness, resistance and lines
  live in the boss editor (`/bosses/edit`, reached from the Forge or from this picker's New boss).
  Editing a boss changes every adventure that ends on it, so it stays editable under a playthrough.
  The draft carries only `end.heroBoss` (the boss's uuid), no voice.
- **Import**: not here any more. The **[Forge](forge.md)** has the one door, to the same preview a
  file tapped in a chat opens (`/quest-import`), which reads the kind from the file.
- **Summary**: steps, weeks, the boss (the hero's name for it once there is one), what it trains.
- **Balance sentences**, under the summary, at most two, derived from the steps and never typed. A push
  streak: 3 or more steps in a row that push (a push pattern slot) and do not pull. Else a pull deficit:
  2 or more push slots and pull slots under `PULL_DEFICIT_RATIO` (the Coach's 0.5) of them; the 2 is this
  screen's own. Then the muscles: none worked (absent), else those under `WEAK_SHARE_OF_IDEAL` (0.5) of the
  ideal share. No muscle sentence when no slot works any muscle (all outings). A movement with no
  pattern neither pushes nor pulls, but its muscles count. A step whose quest is gone is skipped, so the
  steps on either side of it can join into a streak.
- **Save** creates or updates, then opens the adventure's page. Missing name or fewer than two steps
  are said on the field, and the page scrolls to it (the name, or the message under "Add a step").
- **Retire this adventure** (edit mode, no run under way), after a confirmation.

## Rules

- With a playthrough under way, the steps and the end (the boss chosen included) are frozen (one line
  says so); the words, the name and the cover still change. A step whose quest is gone leaves the form when it is reopened, and
  saving repairs the adventure.
- Everything is free: no quota, no lock, no offer.
- The dirty-form guard asks before leaving, as the quest editor does.
