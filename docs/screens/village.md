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

The Village is the **visual reward layer**: one illustrated scene whose tier and overlays
are a pure function of your training ([progression.md](../gameplay/progression.md)). There
is nothing to manage here — no buildings to unlock individually, no XP bars, no prestige
score.

## Visual rules

- Use calm dark surfaces and subtle tokenized borders.
- The scene itself is the visual center — no card grid competing with it.
- Overlays (flame, dominant-sport visual, boss banners) should read as part of one living
  scene, not as separate collectible tiles.

## Main features on this page

- **Visual progression**: the scene's tier grows with your level.
- **Training fingerprint**: your dominant sport shows up as a visual on the scene.
- **Boss banners**: a permanent banner per boss defeated.
- **No micromanagement**: nothing is chosen, unlocked, or spent — your workouts drive
  everything.

## Typical user actions

- Check what has changed since the last session.
- Feel the "collecting" motivation (progress made tangible) without any management step.

## Relationship to progression

The village tier is `f(level)`; overlays are `f(streak, last-7-days dominant sport,
bosses defeated)`. Full rules: [progression.md](../gameplay/progression.md).

## Implementation note

The rebuild described above has shipped: `VillageScene.tsx` renders one scene (tier name +
level, flame overlay via `FlameFlicker`, dominant-sport line, boss banners) with no building
list or management UI. The one open gap against the design intent: the tier badge is a single
generic castle icon reused across all 5 tiers, not 5 distinct illustrated scenes — see the
redesign proposal in
[screen-redesign-proposals.md](../planning/screen-redesign-proposals.md#village) for the
content/art gap this leaves.
