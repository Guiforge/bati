---
title: Schedule
type: screen
route: /schedule
status: deferred
updated: 2026-07-18
related: [goals.md, ../gameplay/coach-planning.md]
sources: [app/schedule.tsx]
---

# Schedule (`/schedule`)

> ⚠️ **Status: deferred.** The Home-stage redesign
> ([coach-planning.md](../gameplay/coach-planning.md)) has no scheduling concept — no
> planned days, no reminder times. The weekly-goal rule ("2/3 sessions this week") lives on
> the Home coach card instead of a dedicated weekly-view screen. See
> [system-redesign-options.md](../planning/system-redesign-options.md) (§7).

## Purpose (legacy design, not built)

Schedule helps you stay consistent by showing your week at a glance.

## Main features on this page

- **Weekly view**: a simple calendar-style view of the current week.
- **Rest suggestion**: encourages recovery when needed.

## Visual rules

- The weekly title should be obvious, but the page should stay quiet.
- Rest suggestions should read like guidance, not an alert banner.
- The calendar should remain the primary visual element.

## Typical user actions

- Check which days are planned for training.
- Follow rest guidance (especially after intense sessions).

## What happens next

Schedule supports consistency; you’ll usually jump from here to picking a quest or continuing an adventure.

## Implementation note

The schedule screen now uses the shared dark surface vocabulary for its rest suggestion so it stays aligned with the rest of the app.
