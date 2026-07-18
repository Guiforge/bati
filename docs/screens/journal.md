---
title: Journal
type: screen
route: /journal
status: active
updated: 2026-07-14
related: [session-details.md, session.md, ../STATISTICS.md]
sources: [app/(tabs)/journal/index.tsx]
---

# Journal (`/journal`)

## Purpose

The Journal is your **training record**. It answers:

- “What have I done lately?”
- “Am I consistent?”
- “Am I progressing?”

## Main features on this page

- **Stats view**: a summary of progress signals (level, trends, balance, suggestions).
- **History view**: a list of completed sessions.
- **Motivation through proof**: you can literally see your streak and activity over time.

## Visual rules

- The stats/history switch should be obvious but quiet.
- Summary cards should group information into a few readable blocks.
- Empty and loading states should feel like part of the same journal system.

## Typical user actions

- Check progress stats.
- Browse session history.
- Open a specific past session to see details.

## What happens next

Tapping a past session opens **[Session Details](session-details.md)**.

## Implementation note

The Journal route now leans on calmer tokenized surfaces so the stats stack and history list don’t fight each other for attention.
