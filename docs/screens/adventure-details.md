---
title: Adventure Details
type: screen
route: /adventures/[id]
status: active
updated: 2026-07-14
related: [adventures.md, quest-details.md, ../ADVENTURES.md, ../BOSS.md]
sources: [app/(tabs)/adventures/[id].tsx]
---

# Adventure Details (`/adventures/[id]`)

## Purpose

Adventure Details is the campaign hub. It shows:

- the **storyline**,
- the **ordered steps**,
- your **current progress**,
- and the **next quest** to complete.

## Main features on this page

- **Steps list**: see the journey broken into parts.
- **Progress tracking**: completed vs current vs locked steps.
- **Start / Continue**: resume exactly where you left off.
- **Suggested difficulty** (conceptually): help choose an appropriate challenge based on recent training.

## Visual rules

- The campaign title should sit above the utility chips.
- The step list should read like progression, not a second dashboard.
- The primary continue/start action should remain visually dominant.

## Typical user actions

- Start a new adventure.
- Continue the next step of an existing run.
- Review what’s coming next in the campaign.

## What happens next

Continuing an adventure sends you to the next **[Quest Details](quest-details.md)** page for that step, then into the **[Session](session.md)**.

## Boss adventures

Boss adventures are still made of steps like any other adventure, but the last steps are framed as a bigger climax.

## Implementation note

The details hub now uses tokenized dark surfaces and calmer row separators so the narrative, progress, and start action stay easy to parse.
