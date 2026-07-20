---
title: Missing Images — inventory
type: content
status: active
updated: 2026-07-20
related: [missing-covers.md, ../planning/screen-redesign-proposals.md, ../planning/dev-execution-plan.md]
sources: [constants/assetMap.ts, drizzle, assets/images, db/muscles.ts, db/schema.ts, components/session/BossPhaseImage.tsx, components/session/BossHpBar.tsx]
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
- **Missing, with a ready consumer already built**: `BossPhaseImage.tsx` — a 4-phase
  (HP-based) boss visual, live inside `BossHpBar` during every boss fight — is 100% emoji
  placeholders (👹😤😡🔥), by the code's own admission (`// replace with actual images when
  available`). This is the single highest-leverage gap: it's rendered on every boss fight,
  right now, and nothing built stands in the way of wiring it except the art.
- **Missing, blocks a proposed feature**: the Village §3 layers — 5 tier illustrations + 6
  sport sprites — from [dev-execution-plan.md](../planning/dev-execution-plan.md) §3 layers 1–2.

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

### 1c. Boss phase art — blocks `BossPhaseImage` (highest leverage, live in every boss fight)

`components/session/BossPhaseImage.tsx` defines 4 HP-based phases and renders one **live,
during every boss fight**, inside `BossHpBar`:

| Phase | HP range | Label | Current visual |
| --- | --- | --- | --- |
| 1 | 75–100% | Full Power | 👹 emoji |
| 2 | 50–75% | Wounded | 😤 emoji |
| 3 | 25–50% | Critical | 😡 emoji |
| 4 | 0–25% | Enraged | 🔥 emoji + pulsing animation |

**Schema note (changes the sizing of this task):** `boss_fights` has no creature-name or
image field of its own — a "boss" is just an `adventures` row with `kind='boss'`; its only
art today is the adventure's own cover (`adventures.imagePath`, already used for the village
banner in §3 layer 3). The 5 separate creature portraits in `assets/images/bosses/`
(`fire_dragon`, `forest_titan`, `shadow_serpent`, `stone_golem`, `wind_wraith`) aren't linked
to any seeded boss — they're a thematic set with nowhere to attach, since there's no per-boss
identity field to key them from.

**Recommendation — layer, don't paint 4× per boss:** consistent with §3's "layers on one
scene, not a combinatorial art set" principle — use the boss's existing single cover image as
the base for all 4 phases, and vary a color/effect *treatment* per phase (desaturate → redder
tint → shake/pulse at Enraged) rather than commissioning 4 distinct paintings per boss. That
reuses art that already exists (adventure covers) and needs zero new assets to leave the emoji
placeholder — it's a pure dev task, higher priority than it looked in the last pass.

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
- **1 duplicate exercise file**: `ranger_single_leg_deadlift_1.png` — unreferenced orphan next
  to the real `ranger_single_leg_deadlift.png`.

> Correction from the prior version of this doc: the 5 `assets/images/bosses/` creature
> portraits were filed here as "unwired, decide whether to keep." That undersold it — there
> **is** a ready consumer (`BossPhaseImage`, live in every boss fight), it just isn't linked to
> any seeded boss identity (see §1c above). Moved to Missing since there's a real, current gap
> to close, not a cleanup call.

## Related

- [missing-covers.md](missing-covers.md) — the prior (resolved) cover gap + generation pipeline
- [../planning/dev-execution-plan.md](../planning/dev-execution-plan.md) — §3 layers 1–2 are the work this art unblocks
- [../planning/screen-redesign-proposals.md](../planning/screen-redesign-proposals.md) — §3 design intent
