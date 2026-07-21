---
title: Village
type: screen
route: /village
status: active
updated: 2026-07-20
related: [../gameplay/progression.md, ../gameplay/boss-fights.md, ../planning/screen-redesign-proposals.md]
sources: [app/(tabs)/village.tsx]
---

# Village (`/village`)

## Purpose

The Village is the **visual reward layer**: an illustrated scene, a grid of buildings, and a
trophy shelf — all a pure function of your training
([progression.md](../gameplay/progression.md)). Buildings have levels but nothing is
*managed*: there is no unlock button, no resource spending, no prestige score. A building
levels up because you trained the muscle it belongs to.

## Visual rules

- Use calm dark surfaces and subtle tokenized borders.
- The scene itself is the visual center — no card grid competing with it.
- Overlays (flame, dominant-sport visual, boss banners) should read as part of one living
  scene, not as separate collectible tiles.

## Main features on this page

- **Visual progression**: the scene's tier grows with your level.
- **Training fingerprint**: your dominant sport shows up as a visual on the scene.
- **Buildings with levels**: 20 buildings, each `level 0..5`. Starter buildings follow the
  village tier, muscle buildings follow that muscle's lifetime volume, tier-3 buildings are
  the upgrade of their tier-2 prerequisite, legendary buildings unlock on bosses defeated.
- **Trophy shelf**: unlocked achievements and defeated bosses on one rack, newest first.
- **No micromanagement**: nothing is chosen, unlocked, or spent — your workouts drive
  everything.

## Typical user actions

- Check what has changed since the last session.
- Feel the "collecting" motivation (progress made tangible) without any management step.

## Relationship to progression

The village tier is `f(level)`; overlays are `f(streak, last-7-days dominant sport,
bosses defeated)`. Full rules: [progression.md](../gameplay/progression.md).

## Implementation note

`VillageScene.tsx` renders the tier illustration (name + level, flame overlay via
`FlameFlicker`, dominant-sport sprite), then the building grid, then the trophy shelf.

Buildings are **derived, never stored**: `getVillageBuildings()` in [db/village.ts](../../db/village.ts)
computes every level from existing signals (lifetime muscle volume, exercise-style volume,
bosses defeated, village tier) using the `buildingDefinitions` / `buildingLevelThresholds`
metadata already declared in `db/schema.ts`. The `village_buildings` and `village_stats`
tables are seeded but unused — there is no unlock/upgrade write path to keep consistent.

Open gap: buildings render as emoji, not art.
