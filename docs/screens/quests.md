---
title: Quests Gallery
type: screen
route: /quests
status: active
updated: 2026-08-16
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

## Typical user actions

- Scroll through quests.
- Pick a quest that matches the day’s goal (quick / standard / harder).
- Tap into a quest to see full details.

## What happens next

Selecting a quest takes you to **[Quest Details](quest-details.md)** to review and start.

## Implementation note

The current gallery implementation uses tokenized dark cards and lighter thumbnail borders to reduce the old high-contrast gallery look.
