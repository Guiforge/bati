---
title: Missing Images — inventory
type: content
status: active
updated: 2026-07-21
related: [missing-covers.md, ../planning/screen-redesign-proposals.md, ../planning/dev-execution-plan.md]
sources: [constants/assetMap.ts, drizzle, assets/images, db/muscles.ts, db/schema.ts, db/village.ts, components/village/VillageScene.tsx, components/session/BossPhaseImage.tsx, components/session/BossHpBar.tsx]
---

# Missing Images — inventory

> What art is still missing, what is fully covered, and what art exists but is unused.
> Verified 2026-07-20 by diffing seed `imagePath` basenames against `constants/assetMap.ts`
> keys and files on disk. The render path resolves images by **basename key** through
> `assetMap` (e.g. `getExerciseAsset`), not by the raw seed path — so coverage is measured
> against assetMap keys, not filenames.
>
> Distinct from [missing-covers.md](missing-covers.md), which tracked the earlier
> adventure/quest cover gap (now resolved). This file tracks what's left **after** the
> 2026-07 redesign phases.

## TL;DR

Everything identified in this doc is now resolved:

- **§0 RESOLVED (2026-07-21)**: all 20 village building icons now have real art — 14
  generated (`scripts/generate-village.py buildings/*`, `assets/images/village/buildings/`)
  and registered as `BUILDING_ICON_ASSETS` / `getBuildingIconAsset(code, relatedMuscle)` in
  `assetMap.ts`; the other 6 (the tier-2 muscle buildings) reuse the existing `sport_*`
  sprites via the same helper's fallback, zero new assets, as recommended. Wiring
  `VillageScene.tsx`'s building grid to render these instead of the `emoji` field — and the
  per-level tint ramp — remains a separate dev task, same boundary as §1a/§1b before it.
- **Content art is complete**: every seeded exercise (20), quest (13), and adventure (3)
  resolves to real art. No content currently renders the placeholder.
- **§1a/§1b RESOLVED (2026-07-20)**: 5 village tier illustrations + 6 sport sprites, generated
  (`scripts/generate-village.py`) and wired into `VillageScene.tsx` (`4356ee4`).
- **§1c RESOLVED (2026-07-20)**: `BossPhaseImage.tsx` now renders the boss's own adventure
  cover with a per-phase color tint, replacing the emoji placeholders — zero new assets needed,
  exactly as recommended (`2b06f3e`). `BossFight.imagePath`/`BossBanner.imagePath` are now
  plain `string` (never `| null`), resolving to the shared placeholder at the query layer —
  same convention as every other `getXAsset()` helper, no null-branching in components.

---

## 0. RESOLVED — village building icons (20/20 have art)

`VillageScene.tsx` still renders the building grid from the `emoji` field on
`buildingDefinitions` today — that UI wiring is unchanged. What changed is that real art now
exists for every building, closing the content half of this gap
([db/village.ts](../../db/village.ts) levels were already real).

**14 generated (2026-07-21)**, `scripts/generate-village.py buildings/*` →
`assets/images/village/buildings/`: 3 starter (`campfire`, `tent`, `training_dummy`), 2 style
(`wizard_tower`, `druid_grove`), 6 tier-3 upgrades (`watchtower`, `castle_wall`, `armory`,
`fountain`, `observatory`, `barn` — same muscle glow color as their tier-2 building, grander
structure), 3 legendary (`dragon_lair`, `heroes_hall`, `champion_arena`). Registered as
`BUILDING_ICON_ASSETS` in `assetMap.ts`.

**6 covered by reuse, zero new assets**: the tier-2 muscle buildings (`archery_range`,
`quarry`, `forge`, `well`, `windmill`, `farm`) have no dedicated icon — `getBuildingIconAsset`
falls back to the matching `sport_*` sprite via `relatedMuscle`, per the "layer, don't paint"
principle already used for §1c.

**Remaining, still a dev task, not art**: wiring `VillageScene.tsx`'s grid to call
`getBuildingIconAsset(building.code, def.relatedMuscle)` instead of rendering `emoji`, plus the
per-level tint ramp (a level-5 forge should read differently from a level-1 forge — one tint
ramp per icon, as `BossPhaseImage` already does per HP phase, not 5 assets per building).

---

## 1. RESOLVED — was missing, now wired

### 1c. Boss phase art — `BossPhaseImage` (was 100% emoji, now real art)

`components/session/BossPhaseImage.tsx` renders live inside `BossHpBar` during every boss
fight. Was emoji placeholders (👹😤😡🔥) for all 4 HP phases; now renders the boss's adventure
cover (`getAdventureAsset`) with a color-tint treatment per phase (none → light → stronger →
heaviest at Enraged), per the "layer, don't paint 4× per boss" principle — no new assets.

**Schema note, still true:** `boss_fights` has no creature-name/image field of its own — a
"boss" is an `adventures` row with `kind='boss'`; its art is the adventure's own cover, reused
for both the phase art here and the village banner (§3 layer 3). The 5 standalone creature
portraits in `assets/images/bosses/` (`fire_dragon`, `forest_titan`, `shadow_serpent`,
`stone_golem`, `wind_wraith`) remain unlinked to any seeded boss — see §3 below, still a
cleanup-or-wire-up call, not a missing-art gap.

---

## 2. COVERED — no action needed

All resolve to real art via `assetMap` (verified basename-key match):

- **Exercises — 20/20.** All seeded `imagePath`s map to a real `EXERCISE_ASSETS` key. (Note:
  seed `alchemist_hollow_body_hold` correctly maps to the file `alchemist_hollow_body.png` via
  its assetMap key — resolves fine despite the filename difference.)
- **Quests — 13/13.** All seeded quest covers present in `QUEST_ASSETS`.
- **Adventures — 3/3.** The Lumber Route, The Golem, The Iron Lord all have covers in
  `ADVENTURE_ASSETS`. (Per-boss village banners, §3 layer 3, reuse these via `getAdventureAsset`.)
- **Village tiers — 5/5 (generated + wired 2026-07-20).** One base illustration per tier
  (`assets/images/village/tier_1.png` … `tier_5.png`, hamlet → flourishing city), rendered
  full-bleed in `VillageScene.tsx` via `getVillageTierAsset(tier)` (`4356ee4`). §3 layer 1 done.
- **Sport sprites — 6/6 (generated + wired 2026-07-20).** One glowing emblem per muscle group
  (`sport_arms/back/chest/abs/shoulder/calf.png`, color-matched to `muscleToResource` — wood,
  stone, fire, water, wind, grain), rendered as a corner overlay via `getSportSpriteAsset(muscle)`
  when a dominant sport exists. §3 layer 2 done. Set grows if running/cycling ship later.
- **Building icons — 20/20 (14 generated, 6 reused — 2026-07-21).** See §0 above; content-side
  done via `getBuildingIconAsset`, rendering them in `VillageScene.tsx` is the open dev task.
- **Boss phase art (2026-07-20).** `BossPhaseImage` now renders each boss's adventure cover
  via `getAdventureAsset`, tinted per HP phase. §1c done (`2b06f3e`).
- **Trophy shelf (2026-07-21).** Needs no new art: boss trophies reuse the adventure cover via
  `getAdventureAsset`, achievement trophies use the `icon` emoji already on
  `achievementDefinitions`. Deliberate — an emoji rack reads as a trophy shelf.

---

## 3. UNUSED — art that exists with no content (cleanup candidates, not missing)

The inverse problem — art shipped without content to use it:

- **4 orphan adventure covers**: `guardian_oath`, `monk_enlightenment`, `ranger_journey`,
  `scout_trial` — present on disk and in `ADVENTURE_ASSETS`, but no seeded adventure references
  them. Either seed 4 more adventures to use them, or drop them.
- **1 duplicate exercise file**: `ranger_single_leg_deadlift_1.png` — unreferenced orphan next
  to the real `ranger_single_leg_deadlift.png`.

- **5 unlinked boss creature portraits**: `assets/images/bosses/` (`fire_dragon`,
  `forest_titan`, `shadow_serpent`, `stone_golem`, `wind_wraith`) — `BossPhaseImage` now has a
  real consumer wired (§1c above), but it uses the boss's *adventure* cover, not these separate
  creature portraits (there's no per-boss identity field to key them from — see the schema note
  in §1c). Genuinely a cleanup-or-wire-up call now: either add a boss-identity concept to attach
  these to, or drop them.

## Related

- [missing-covers.md](missing-covers.md) — the prior (resolved) cover gap + generation pipeline
- [../planning/dev-execution-plan.md](../planning/dev-execution-plan.md) — the plan this art unblocked, now fully shipped
- [../planning/screen-redesign-proposals.md](../planning/screen-redesign-proposals.md) — §3 design intent
