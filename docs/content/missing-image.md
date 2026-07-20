---
title: Missing Images — inventory
type: content
status: active
updated: 2026-07-20
related: [missing-covers.md, ../planning/screen-redesign-proposals.md, ../planning/dev-execution-plan.md]
sources: [constants/assetMap.ts, drizzle, assets/images, db/muscles.ts]
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

- **Content art is complete**: every seeded exercise (20), quest (13), and adventure (3)
  resolves to real art. No content currently renders the placeholder.
- **Missing = the two Village §3 layers only**: 5 tier illustrations + 6 sport sprites. These
  are the sole blocker on finishing [dev-execution-plan.md](../planning/dev-execution-plan.md)
  §3 layers 1–2.

---

## 1. MISSING — must be created

### 1a. Village tier illustrations (5) — blocks §3 layer 1

One base illustration per village tier. **None exist** (`assets/images/` has only
`adventures/ bosses/ exercises/ quests/`, no tier art). The Village scene currently reuses one
generic castle icon for all 5 tiers.

| Tier | Name (EN / FR) | Level floor | Asset needed |
| --- | --- | --- | --- |
| 1 | Hamlet / Hameau | 1 | `assets/images/village/tier_1.png` |
| 2 | Village / Village | 5 | `assets/images/village/tier_2.png` |
| 3 | Town / Bourg | 10 | `assets/images/village/tier_3.png` |
| 4 | City / Cité | 15 | `assets/images/village/tier_4.png` |
| 5 | Flourishing City / Cité florissante | 20 | `assets/images/village/tier_5.png` |

(Tier→level floors from `db/village.ts` `TIER_LEVEL_FLOORS`.)

### 1b. Sport-focus sprites (6) — blocks §3 layer 2

One small foreground motif per muscle group, keyed to `scene.dominantSport.muscle`. **None
exist.** Muscle codes from `db/muscles.ts` (`MUSCLE_LABELS`):

| Muscle | Asset needed |
| --- | --- |
| arms | `assets/images/village/sport_arms.png` |
| back | `assets/images/village/sport_back.png` |
| shoulder | `assets/images/village/sport_shoulder.png` |
| chest | `assets/images/village/sport_chest.png` |
| abs | `assets/images/village/sport_abs.png` |
| calf | `assets/images/village/sport_calf.png` |

> Note: when running/cycling ship later (parked in `future-roadmap.md`), each adds one more
> sport sprite here — the set is not final, it grows with supported sports.

**Total missing: 11 assets** (5 tiers + 6 sprites), all in a new `assets/images/village/` dir.
Generate via the existing pipeline (`scripts/generate-covers.py`, style from
[image-style-prompt.md](image-style-prompt.md)); the dev side is then a small layered `Image`
render mirroring the existing `FlameFlicker` overlay.

---

## 2. COVERED — no action needed

All resolve to real art via `assetMap` (verified basename-key match):

- **Exercises — 20/20.** All seeded `imagePath`s map to a real `EXERCISE_ASSETS` key. (Note:
  seed `alchemist_hollow_body_hold` correctly maps to the file `alchemist_hollow_body.png` via
  its assetMap key — resolves fine despite the filename difference.)
- **Quests — 13/13.** All seeded quest covers present in `QUEST_ASSETS`.
- **Adventures — 3/3.** The Lumber Route, The Golem, The Iron Lord all have covers in
  `ADVENTURE_ASSETS`. (Per-boss village banners, §3 layer 3, reuse these via `getAdventureAsset`.)

---

## 3. UNUSED — art that exists with no content (cleanup candidates, not missing)

The inverse problem — art shipped without content to use it:

- **4 orphan adventure covers**: `guardian_oath`, `monk_enlightenment`, `ranger_journey`,
  `scout_trial` — present on disk and in `ADVENTURE_ASSETS`, but no seeded adventure references
  them. Either seed 4 more adventures to use them, or drop them.
- **5 boss images unwired**: `assets/images/bosses/` (`fire_dragon`, `forest_titan`,
  `shadow_serpent`, `stone_golem`, `wind_wraith`) + their `BOSS_ASSETS` keys are referenced
  **nowhere** in `app/` or `components/` (`getBossAsset` has zero callers). Phase 3 rendered
  boss banners from *adventure* art instead. Decide: wire boss art into the boss/session UI, or
  remove the unused map.
- **1 duplicate exercise file**: `ranger_single_leg_deadlift_1.png` — unreferenced orphan next
  to the real `ranger_single_leg_deadlift.png`.

## Related

- [missing-covers.md](missing-covers.md) — the prior (resolved) cover gap + generation pipeline
- [../planning/dev-execution-plan.md](../planning/dev-execution-plan.md) — §3 layers 1–2 are the work this art unblocks
- [../planning/screen-redesign-proposals.md](../planning/screen-redesign-proposals.md) — §3 design intent
