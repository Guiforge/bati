---
title: Village
type: screen
route: /village
status: active
updated: 2026-07-20
related: [../gameplay/progression.md, ../gameplay/boss-fights.md]
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
  The level is legible three ways without tapping: pips, an opacity ramp over the icon
  (level 0 is the flat silhouette, level 5 the full painting), and a bar toward the next rung.
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
Built tiles live in `BuiltBuildingCard.tsx`.

**The hero is square, because the art is.** The tier PNGs are 1024×1024 and `contentFit="cover"`
crops whatever the slot does not match — the 4:3 hero this screen used to have silently threw away
a quarter of every illustration, including the beam crowning tier 5's palace. `heroHeight = width`.
Aspect ratio follows the source, not the taste ([image-style-prompt.md](../content/image-style-prompt.md)).

Buildings are **derived, never stored**: `getVillageBuildings()` in [db/village.ts](../../db/village.ts)
computes every level from existing signals (lifetime muscle volume, exercise-style volume,
bosses defeated, village tier) using the `buildingDefinitions` / `buildingLevelThresholds`
metadata already declared in `db/schema.ts`. The `village_buildings` and `village_stats`
tables are seeded but unused — there is no unlock/upgrade write path to keep consistent.

`getBuildingProgress()` (db/village.ts) is the single source for "how far to the next level": the
tile bar and the detail sheet bar both call it, so they cannot disagree about when a locked
building has something honest to count.

Open gap: `getVillageScene()` still returns a `bossBanners` field that nothing renders — the
banners reach the screen only laundered through `trophies`, though the visual rules above ask for
them on the scene.
