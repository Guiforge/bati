---
title: Treasury
type: screen
route: /treasury
status: active
updated: 2026-07-14
related: [village.md, ../REWARDS.md, ../RESOURCES.md]
sources: [app/treasury.tsx]
---

# Treasury (`/treasury`)

## Purpose

Treasury is your **inventory**. It shows everything you’ve collected from training.

## Main features on this page

- **Totals for loot**: see gold and resource counts.
- **Training-to-loot clarity**: helps connect your workout focus to what you earned.
- **Motivation**: turns workouts into a “treasure chest” moment over time.

## Visual rules

- Resource counts should be the first thing you read in each tile.
- The inventory grid should feel balanced and low-noise.
- Support text should stay secondary to the numbers.

## Typical user actions

- Check current totals.
- Notice which resources you’ve been earning most (and what that says about your training).

## What happens next

Treasury doesn’t start workouts—think of it as the “bank/receipt” page.

## Implementation note

The Treasury route already follows the newer glass/card style closely, with a small cleanup to keep the counts and tip hierarchy calmer.
