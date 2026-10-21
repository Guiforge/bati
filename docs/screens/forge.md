---
title: Forge
type: screen
route: /forge
status: active
updated: 2026-10-21
related: [boss-editor.md, quests.md, adventures.md, exercises.md, adventure-editor.md, village.md, ../product/glossary.md]
sources: [app/forge.tsx, components/forge/ForgeButton.tsx, components/quests/QuestFileButtons.tsx, components/chorus/VillagerLine.tsx]
---

# Forge (`/forge`)

## Purpose

Where a hero makes things: quests, adventures, exercises and bosses of their own, and where a file someone
sent comes in. It adds no data. Each row opens the screen the galleries already open, each button
pushes the route they already push.

The page is the inside of the village's Forge building (the one a chest session raises). Its sheet
carries **Enter the forge** and lands here, so the word names one place and not two.

## Getting here

- **Create**, a small outline button with a hammer in the header of the Adventures gallery, the
  Quests gallery and the exercise catalogue. Same word, same place, in all three. It replaced the
  full-width "Write an adventure" row and the two `+` icons, which a hero could not decode or did
  not find. It sits where the `+` sat, so the title is still what gives way at 130 % text.
- **Enter the forge** in the village Forge building's sheet, built or not.
- No tab (the bar is full) and nothing on Home.

An empty gallery keeps its own direct create button.

## Layout

The header says where the hero stands: beside the title, the building's own painting at 48 dp at the
hero's rank (`getBuildingIconAsset`, the helper the village uses, so rough, solid or grand by the same
rule; rough before the building is built, and nothing is locked), and under it the smith in his bubble (`VillagerSays`, the bubble the villager lines use, without the cue machinery)
with one fixed line, `forge.smith_greeting`, which speaks of everything made here, not of quests
only. There is no subtitle: the bubble says it. A warm glow from `rawColors.primary` fades from the top
of the page before the lists. The header is sized so **New quest** stays above the fold at 130 %
text on 360x640.

Then one column, never a grid. In this order, the most frequent first:

1. **Your quests**: the last three the hero wrote, "See all" (the Quests gallery, which already
   leads with the hero's own), and **New quest**.
2. **Your adventures**: the same, with **Write an adventure**.
3. **Your bosses**: the last three, "See all" (`/bosses`), and **New boss** (`/bosses/edit`), the
   [boss editor](boss-editor.md). A boss only exists to end an adventure, so it follows them.
4. **Your exercises**: the same as quests; "See all" opens the catalogue on the hero's own (`?mine=1`).
5. **Import a received file**: the one door for a quest or an adventure file. The preview screen
   reads which it is (`/quest-import`). The editors no longer carry an import link.

The page asserts nothing before it has read (the state is `null` until the four lists are in; the
buttons are there, the sentences are not), and a failed read is reported (`reportError("forge.load")`)
and says the generic error line, never "you have not made X". A section with nothing in it says one
line and keeps its button, unless the hero has made nothing at all: then there is no line, the smith is
the one voice. No counter, no XP, no achievement for a first creation.

## Not yet

A mark on an exercise with no image, instruction or main muscle. The smith says one line; a pool
that rotates would need a chorus moment of its own (`constants/villagers.ts`).
