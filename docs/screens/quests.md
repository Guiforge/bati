---
title: Quests Gallery
type: screen
route: /quests
status: active
updated: 2026-07-14
related: [quest-details.md, ../QUESTS.md]
sources: [app/(tabs)/quests/index.tsx]
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

## Typical user actions

- Scroll through quests.
- Pick a quest that matches the day’s goal (quick / standard / harder).
- Tap into a quest to see full details.

## What happens next

Selecting a quest takes you to **[Quest Details](quest-details.md)** to review and start.

## Implementation note

The current gallery implementation uses tokenized dark cards and lighter thumbnail borders to reduce the old high-contrast gallery look.
