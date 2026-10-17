---
title: Adventure Editor
type: screen
route: /adventures/edit
status: active
updated: 2026-10-17
related: [adventures.md, adventure-details.md, ../gameplay/adventures.md]
sources: [app/(tabs)/adventures/edit.tsx, components/adventures/QuestPickerSheet.tsx, db/heroAdventures.ts]
---

# Adventure Editor (`/adventures/edit`, `?id=` to edit)

## Purpose

Write an adventure out of quests the hero already has or has written. One scroll, one primary button.

## Main features on this page

- **Start from your last sessions** (new adventure, two sessions or more): fills the steps with the
  quests of the 8 latest sessions, oldest first. Nothing is saved.
- **Cover**: one of the bundled adventure covers (no photo). **Name** (60) and **introduction** (280).
- **Steps, 2 to 8**: a card per step with its quest, its duration, **Before you set out** (160) and,
  behind "Add a return", **On the way back** (160); move up, move down, remove. "Add a step" opens the
  quest picker (the hero's quests first, a name search) and is gone at eight.
- **The end**: a route, or a boss among the six painted ones, each with what it is weak to, what it
  resists, and about how many HP it has at the hero's level for these steps (the figure the fight will
  use). If every step is an outing, a line says outings do not hit the boss; saving stays possible.
- **Import an adventure** (new adventure only, above the form): opens the file picker, then the same
  preview screen a file tapped in a chat opens (`/quest-import`), which reads the kind from the file.
- **Summary**: steps, weeks, the boss, what it trains.
- **Save** creates or updates, then opens the adventure's page. Missing name or fewer than two steps
  are said on the field.
- **Retire this adventure** (edit mode, no run under way), after a confirmation.

## Rules

- With a playthrough under way, the steps and the end are frozen (one line says so); the words, the
  name and the cover still change. A step whose quest is gone leaves the form when it is reopened, and
  saving repairs the adventure.
- Everything is free: no quota, no lock, no offer.
- The dirty-form guard asks before leaving, as the quest editor does.
