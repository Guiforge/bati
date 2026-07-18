---
title: Session Details
type: screen
route: /journal/[id]
status: active
updated: 2026-07-14
related: [journal.md, session.md, ../gameplay/statistics-progress.md]
sources: ["app/(tabs)/journal/[id].tsx"]
---

# Session Details (`/journal/[id]`)

## Purpose

Session Details is a **post-workout report** for one completed quest.

It’s where you review what happened during that workout.

## Main features on this page

- **Workout summary**: when you trained and how long it took.
- **Difficulty recap**: the challenge level used.
- **Exercise breakdown**: results per exercise (and per round when applicable).
- **Personal feedback loop**: helps you understand what’s improving and what needs attention.

## Visual rules

- The workout summary should be the first thing the eye reads.
- Round and exercise cards should use subtle separators, not thick borders.
- The page should feel like a receipt for one session, not a second dashboard.

## Typical user actions

- Confirm what you achieved.
- Use it as a reference for next time (try to beat it or keep it steady).

## What changes after viewing

Viewing doesn’t change data; it’s a read-only “receipt” of your effort.

## Implementation note

The current details view has been shifted toward tokenized summary cards and calmer labels so the receipt reads more like a log and less like a promo panel.
