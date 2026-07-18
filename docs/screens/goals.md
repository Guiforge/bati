---
title: Goals
type: screen
route: /goals
status: deferred
updated: 2026-07-18
related: [schedule.md, ../gameplay/coach-planning.md]
sources: [app/goals.tsx]
---

# Goals (`/goals`)

> ⚠️ **Status: deferred.** The Coach redesign
> ([coach-planning.md](../gameplay/coach-planning.md)) replaces a dedicated goal-setting
> flow (type + days/week + session length + generated plan preview) with a single weekly
> session-count setting, shown as a card on Home. This full screen is not part of that
> design — see [system-redesign-options.md](../planning/system-redesign-options.md) (§7).

## Purpose (legacy design, not built)

Goals helps you set a simple direction for your training.

Instead of browsing randomly, you can say “this is what I’m aiming for” and let the app guide the week.

## Main features on this page

- **Choose a focus** (examples): strength, endurance, flexibility, balanced.
- **Choose frequency**: how many days per week you want to train.
- **Choose session length**: how long workouts should be.
- **Plan preview**: see what the week could look like before confirming.

## Visual rules

- The goal type, days, and duration controls should feel grouped and readable.
- Selected states should be clear without thick borders.
- The page should guide one decision at a time.

## Typical user actions

- Create a new goal.
- Adjust an existing goal.
- Confirm a suggested plan.

## What happens next

After confirming, the plan influences what you do in the week (and connects naturally with the **[Schedule](schedule.md)** page).

## Implementation note

The goals screen now leans more on the shared dark surface system so the form feels calmer and more consistent with the rest of the app.
