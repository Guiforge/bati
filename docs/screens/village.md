---
title: Village
type: screen
route: /village
status: active
updated: 2026-07-14
related: [treasury.md, ../economy/rewards-and-progression.md]
sources: [app/(tabs)/village.tsx]
---

# Village (`/village`)

## Purpose

The Village is the **visual reward layer**. It shows your progress as a growing fantasy village.

The village is meant to feel automatic and satisfying: you train, and the world grows.

## Visual rules

- Use calm dark surfaces and subtle tokenized borders.
- Keep the village summary informative, not promotional.
- Building cards should feel like part of one shared component family.
- Locked and completed states should stay secondary to the overall progression story.

## Main features on this page

- **Visual progression**: see your village evolve as you keep training.
- **Training fingerprint**: what you do more of becomes more prominent.
- **No micromanagement**: you don’t choose buildings manually—your workouts drive growth.

## Typical user actions

- Check what has improved since the last session.
- Feel the “collecting” motivation (progress made tangible).

## Relationship to resources

Resources earned from workouts are one of the main drivers of village growth.

## Implementation note

The current implementation uses the shared `Card` primitive and tokenized dark surfaces to keep the village hierarchy readable while avoiding the old white-border look.
