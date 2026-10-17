---
title: Adventures Gallery
type: screen
route: /adventures
status: active
updated: 2026-10-17
related: [adventure-details.md, ../gameplay/adventures.md]
sources: [app/(tabs)/adventures/index.tsx, app/(tabs)/adventures/edit.tsx]
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
- **Your adventures**: the ones the hero wrote sit under their own header, newest first, each marked
  "Écrite par toi", and a **write row** ("Écrire une aventure") ends the section (or the game's section
  when there are none). A hero adventure whose first step lost its quest stays, with no duration or XP,
  and says so. One retired on another device stays while a run of it is under way here. Every adventure
  under way sorts first.

## Visual rules

- The title and next action should be the loudest elements.
- Gallery cards should use subtle tokenized borders, not thick frames.
- Story text should be separated from utility chips so the page scans quickly.

## Typical user actions

- Pick a new adventure.
- Write one: the write row opens **[the editor](adventure-editor.md)**.
- Return to an in-progress adventure.

## What happens next

Selecting an adventure opens **[Adventure Details](adventure-details.md)**.

## Implementation note

The gallery now uses calmer text and image treatments so the campaign choice reads as one coherent path instead of a wall of metadata.
