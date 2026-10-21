---
title: Forge
type: screen
route: /forge
status: active
updated: 2026-10-21
related: [quests.md, adventures.md, exercises.md, adventure-editor.md, village.md, ../product/glossary.md]
sources: [app/forge.tsx, components/forge/ForgeButton.tsx, components/quests/QuestFileButtons.tsx]
---

# Forge (`/forge`)

## Purpose

Where a hero makes things: quests, adventures and exercises of their own, and where a file someone
sent comes in. It adds no data. Each row opens the screen the galleries already open, each button
pushes the route they already push.

The Forge is also the village's Forge building (the one a chest session raises). Its sheet carries
**Enter the forge** and lands here, so the word names one place and not two.

## Getting here

- **Create**, a small outline button with a hammer in the header of the Adventures gallery, the
  Quests gallery and the exercise catalogue. Same word, same place, in all three. It replaced the
  full-width "Write an adventure" row and the two `+` icons, which a hero could not decode or did
  not find. It sits where the `+` sat, so the title is still what gives way at 130 % text.
- **Enter the forge** in the village Forge building's sheet, built or not.
- No tab (the bar is full) and nothing on Home.

An empty gallery keeps its own direct create button.

## Layout

One column, never a grid. In this order, the most frequent first:

1. **Your quests**: the last three the hero wrote, "See all" (the Quests gallery, which already
   leads with the hero's own), and **New quest**.
2. **Your adventures**: the same, with **Write an adventure**.
3. **Your exercises**: the same; "See all" opens the catalogue on the hero's own (`?mine=1`).
4. **Import a received file**: the one door for a quest or an adventure file. The preview screen
   reads which it is (`/quest-import`). The editors no longer carry an import link.

A section with nothing in it says one line and keeps its button. No counter, no XP, no
achievement for a first creation.

## Not yet

A mark on an exercise with no image, instruction or main muscle; the smith's voice.
