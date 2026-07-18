---
title: Treasury
type: screen
route: /treasury
status: active
updated: 2026-07-18
related: [village.md, ../economy/rewards-and-progression.md]
sources: [app/treasury.tsx]
---

# Treasury (`/treasury`)

## Purpose

Treasury is your passive reward receipt. It shows resource totals earned from training focus.

## Main features on this page

- **Totals for loot**: see muscle-linked resource counts.
- **Training-to-loot clarity**: helps connect your workout focus to what you earned.
- **Motivation**: turns workouts into a “treasure chest” moment over time.

Treasury is **read-only in MVP**. It is not a shop, spend loop, or village management screen.

## Visual rules

- Resource counts should be the first thing you read in each tile.
- The inventory grid should feel balanced and low-noise.
- Support text should stay secondary to the numbers.

## Typical user actions

- Check current totals.
- Notice which resources you’ve been earning most (and what that says about your training).

## What happens next

Treasury doesn’t start workouts—think of it as the “receipt” page.

## Implementation note

The Treasury route already follows the newer glass/card style closely, with a small cleanup to keep the counts and tip hierarchy calmer.
