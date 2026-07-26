---
title: Exercise Details
type: screen
route: /exercises/[id]
status: active
updated: 2026-07-18
related: [quests.md, quest-details.md, session.md, ../gameplay/quests.md]
sources: ["app/exercises/[id].tsx"]
---

# Exercise Details (`/exercises/[id]`)

## Purpose

Exercise Details explains a single movement before or after it appears in a quest.

## Main features on this page

- **Exercise media**: large image/animation area for visual recognition.
- **Localized name and description**: English/French content follows the active language.
- **Equipment tag**: clarifies whether equipment is required.
- **Timing hint**: shows seconds-per-rep guidance when available.
- **Muscle tags**: lists the muscles trained by the movement.
- **Loading/error states**: handles invalid IDs and database load failures.

## Visual rules

- The media should help recognition without overpowering the exercise name.
- Tags should scan quickly; do not turn this page into a stats dashboard.
- Error/loading states should stay calm and actionable.

## Typical user actions

- Check what an exercise is.
- Confirm equipment and target muscles.
- Go back to the previous quest/session context.

## What happens next

This page is read-only. It does not start a workout by itself.

## Implementation note

The screen loads data through `getExerciseById`, resolves local/remote exercise imagery, and reads
the active language from `useSettingsStore`.
