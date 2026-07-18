---
title: Adventures Gallery
type: screen
route: /adventures
status: active
updated: 2026-07-14
related: [adventure-details.md, ../ADVENTURES.md]
sources: [app/(tabs)/adventures/index.tsx]
---

# Adventures Gallery (`/adventures`)

## Purpose

Adventures are **story campaigns**: a sequence of quests chained together with narrative.

The Adventures gallery is where you browse and choose a campaign to follow over multiple sessions.

## Main features on this page

- **Browse campaigns**: see available adventures.
- **Recognize the type**:
  - standard adventure (route)
  - boss adventure (finale vibe)
  - event adventure (seasonal)
- **Get a quick preview**: what kind of journey it is and roughly what it involves.

## Visual rules

- The title and next action should be the loudest elements.
- Gallery cards should use subtle tokenized borders, not thick frames.
- Story text should be separated from utility chips so the page scans quickly.

## Typical user actions

- Pick a new adventure.
- Return to an in-progress adventure.

## What happens next

Selecting an adventure opens **[Adventure Details](adventure-details.md)**.

## Implementation note

The gallery now uses calmer text and image treatments so the campaign choice reads as one coherent path instead of a wall of metadata.
