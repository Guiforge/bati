---
title: Dev Execution Plan — approved screen redesigns
type: planning
status: archived
updated: 2026-07-28
related: [screen-redesign-proposals.md, roadmap.md, ../design/ui-checklist.md, ui-screen-audit-tracker.md]
sources: [app, components, db, stores, assets]
---

# Dev Execution Plan — approved screen redesigns

> The task breakdown promised by [screen-redesign-proposals.md](screen-redesign-proposals.md)
> (§ Plan for devs). Method and PR rules come from
> [roadmap.md](roadmap.md); this file is only the concrete, ordered
> phases for the 4 approved items. One phase = one scope = one commit, each behind the same
> quality gate.

## Quality gate (every phase, before its commit)

```text
1. npm run check     # biome (write) + tsc --noEmit
2. npm test          # jest
3. UI checklist pass on touched screens (docs/design/ui-checklist.md)
4. before/after screenshot for any visible change
5. commit — one scope only
```

**Gate scope rule (important):** the repo already has ~147 pre-existing biome warnings across
unrelated files. The gate is **no new errors/warnings introduced by the files this phase
touches** — not "fix the whole repo." Do not expand a phase to clean pre-existing debt; that's
a separate task, and bundling it breaks the one-scope-per-commit rule.
<!-- ponytail: gate checks the diff's files, not the whole tree; whole-repo lint cleanup is its own PR -->

## Ordering rationale

Ordered by ascending risk, so the safest, most isolated change lands first and each commit is
easy to revert alone. Readiness was verified against the working tree (assets on disk, store
fields, dead-code usage) — not assumed from the design doc.

| Phase | Item | Risk | Asset dep | Status |
| --- | --- | --- | --- | --- |
| 1 | §4 delete dead FAB | trivial | none | ✅ shipped `3ad0122` |
| 2 | §5 exercise imagery | low | ✅ on disk | ✅ shipped `9097a1c` |
| 3 | §3 per-boss banners (layer 3) | low-med | ✅ on disk | ✅ shipped `cdac3cb` |
| 4 | §2 onboarding merge | medium | none | ✅ shipped `f845ec7` |
| 5 | §3 tier art + sport sprites (layers 1–2) | low-med | ✅ generated 2026-07-20 | ✅ shipped `4356ee4` |
| 6 | §1c boss phase art | low | ✅ reused adventure covers | ✅ shipped `2b06f3e` |
| — | §1 navigation | — | — | not scheduled (decided B) |

> **All 6 phases shipped 2026-07-20**, each behind its gate (tsc + jest green, lint clean on
> the diff) and its own commit. A prerequisite stale-test fix landed first as `bd9e158` (the
> `0006` image seed had broken `db-exercises`' hardcoded placeholder assertion). Phases 5–6
> were added mid-plan once village/sport art was generated and a real gap in `BossPhaseImage`
> (still emoji, despite being live in every boss fight) was found while auditing missing art —
> see [missing-image.md](../content/missing-image.md). Along the way, `BossFight.imagePath` /
> `BossBanner.imagePath` were changed from `string | null` to plain `string` (placeholder
> fallback resolved at the query layer, matching every other `getXAsset()` helper), removing
> null-branching from `BossPhaseImage`/`VillageScene` per feedback.
> **Device screenshot QA is still pending** for all UI-visible phases (no simulator in the
> build env) — the automated gate passed, but visual verification on-device remains, consistent
> with the "re-audit on device pending" rows in
> [ui-screen-audit-tracker.md](ui-screen-audit-tracker.md).

---

## Phase 1 — Delete dead code (§4)

**Scope:** remove `components/home/ContinueAdventureFab.tsx`.

**Why safe:** re-verified zero importers (`grep -rn ContinueAdventureFab app components` →
only its own definition). No behavior change.

**Steps:**

1. `git rm components/home/ContinueAdventureFab.tsx`.
2. Gate (test/tsc confirm nothing referenced it).

**Done when:** file gone, gate green, committed.

**Commit:** `chore(home): remove unused ContinueAdventureFab`

---

## Phase 2 — Render real exercise imagery (§5)

**Scope:** `components/session/ActiveExerciseView.tsx` (hero image slot, ~line 210) and
`components/session/RestView.tsx` ("up next" thumbnail, ~line 212).

**Why ready (verified):** exercise art landed in a prior commit —
`assets/images/exercises/` holds 20+ images, the `0006` seed no longer references
`assets/placeholder.jpg`, and `constants/assetMap.ts` already exposes a fallback helper
(`getExerciseAsset(id)` → `?? require("@/assets/placeholder.jpg")`). This is a render swap,
not a content task.

**Steps:**

1. Replace the placeholder `GameIcon name="muscle"` in the `ActiveExerciseView` hero slot with
   an `expo-image` `Image` sourced from the exercise's asset via the existing `assetMap`
   helper (do **not** hand-roll a `require` — reuse `getExerciseAsset`, it already handles the
   missing-image fallback).
2. Same swap for the `RestView` "up next" thumbnail.
3. Keep the surrounding card/border/layout exactly as-is (both slots already reserve the
   space).
4. Gate — pay attention to the screenshot: this is the most-seen mid-workout screen.

**Done when:** both slots show real per-exercise art with graceful fallback, gate green,
committed.

**Commit:** `feat(session): render real exercise images in active + rest views`

---

## Phase 3 — Per-boss village banners (§3, layer 3 only)

**Scope:** `db/village.ts` (banner query) + `components/village/VillageScene.tsx` (banner
render). **Layers 1 (tier illustrations) and 2 (sport sprites) are NOT in this phase** — see
Blocked below.

**Why partial:** boss/adventure art exists (`assets/images/bosses/` 6 images,
`assets/images/adventures/` 7 covers), so the generic `<Crown>` per banner can become the
boss's own art now. Tier and sport sprites don't exist yet, so those stay text/existing-icon
until art is produced.

**Steps:**

1. Extend the banner query in `db/village.ts` to also return the adventure/boss `imagePath`
   (it currently returns `enTitle`/`frTitle` but not the image).
2. In `VillageScene.tsx`, render a small cropped boss image in place of the shared `<Crown>`
   icon per banner; fall back to `<Crown>` if `imagePath` is null.
3. Leave tier badge (still generic castle icon) and dominant-sport line (still text) untouched
   this phase.
4. Gate.

**Done when:** each boss banner shows its own art, gate green, committed. Note in the commit
body that §3 layers 1–2 remain open.

**Commit:** `feat(village): show per-boss art on banners`

---

## Phase 4 — Onboarding merge (§2)

**Scope:** `app/onboarding/*` — merge avatar + name into one screen, add a skippable
training-level step. Highest-risk phase (touches routing, the onboarding store, and adds a
persisted preference).

**Prerequisite (small, same phase):** there is currently **no training-level field** in
`stores/user.ts` or `stores/settings.ts`. Add one persisted preference (via the existing
`db/preferences.ts` key/value pattern — do not add a table). This is the only new data in the
whole plan.

**Steps:**

1. Add a `trainingLevel` preference (`beginner | regular | advanced | null`) to the settings
   store + `db/preferences.ts`, defaulting null (= skipped).
2. New combined screen `app/onboarding/hero-setup.tsx`: a small tap-to-select avatar strip
   (reuse `AVATARS`/`getAvatarById`, no swipe gesture, no full-bleed background swap) with the
   name `TextInput` + validation (lift from `village-name.tsx`) directly below, one `Continue`
   CTA.
3. New final step `app/onboarding/training-level.tsx`: 3 chips + a visible Skip. Writes
   `trainingLevel`, then completes onboarding.
4. Rewire `app/onboarding/index.tsx` / `_layout.tsx` flow:
   `presentation → hero-setup → training-level`. Remove `choose-avatar.tsx` and
   `village-name.tsx` once their pieces are absorbed.
5. Keep the immersive treatment (backgrounds, gradients, the name stamp animation) — the
   proposal only drops the swipe interaction, not the visual style.
6. Gate — screenshot every step; verify `ProgressDots` still reads 3 steps.

**Done when:** onboarding is `presentation → hero-setup → training-level` (still 3 steps),
`trainingLevel` persists, gate green, committed.

**Commit:** `feat(onboarding): merge avatar+name, add skippable training level`

**Follow-up (not this plan):** `getSuggestedQuestsForWeakAreas` / the Coach card can start
reading `trainingLevel` — a separate change once the signal exists.

---

## Phase 5 — Village tier + sport-sprite art (§3 layers 1–2)

**Scope:** `components/village/VillageScene.tsx` — render the generated tier illustration
full-bleed as the scene, with the dominant-sport sprite as a corner overlay.

**Why unblocked:** village art was generated (`scripts/generate-village.py`, 11 assets in
`assets/images/village/`) and registered in `constants/assetMap.ts`
(`VILLAGE_TIER_ASSETS`/`SPORT_SPRITE_ASSETS` + `getVillageTierAsset`/`getSportSpriteAsset`) —
the content blocker from the original plan is gone.

**Steps:**

1. Replace the small circular castle-icon placeholder with a full-width `aspectRatio={4/3}`
   tier illustration via `getVillageTierAsset(scene.tier)`.
2. Layer the sport sprite (`getSportSpriteAsset(scene.dominantSport.muscle)`) as a small
   bottom-right corner badge, only when `scene.dominantSport` exists.
3. Keep tier name/level/flame/dominant-sport text below the image, unchanged in content.
4. Gate.

**Done when:** village scene shows real tier art + sport overlay, gate green, committed.

**Commit:** `feat(village): wire generated tier illustrations + sport sprites (§3 layers 1-2)`

---

## Phase 6 — Boss phase art (§1c)

**Scope:** `components/session/BossPhaseImage.tsx` (render), `components/session/BossHpBar.tsx`
and its two callers (prop threading), `db/bossFights.ts` (add `imagePath` to `BossFight`),
`db/village.ts` and `VillageScene.tsx` (drop `| null` from `BossBanner.imagePath` for
consistency).

**Why ready:** identified while auditing missing art
([missing-image.md](../content/missing-image.md) §1c) — `BossPhaseImage` is live inside
`BossHpBar` on every boss fight but was 100% emoji, with the code's own comment admitting it.
Zero new assets needed: reuse the boss's adventure cover (already resolved via
`getAdventureAsset`) with a per-phase color tint instead of 4 separate paintings.

**Steps:**

1. Add `imagePath: string` to `BossFight` (not `| null` — resolve to the placeholder path at
   the query layer in `getOrCreateBossFight`/`getBossFightByAdventure`, matching the
   `getXAsset()` convention everywhere else).
2. `BossPhaseImage`: accept `bossImagePath: string`, always render via `getAdventureAsset`
   (single code path, no emoji branch), overlay a `tint` per phase (none → light → stronger →
   heaviest at Enraged).
3. Thread `bossImagePath={bossFight.imagePath}` through `BossHpBar` from both callers
   (`ActiveExerciseView`, `RestView`).
4. Same null-removal pass on `BossBanner.imagePath` (`db/village.ts`) and `VillageScene.tsx`'s
   banner render (drop the `<Crown>` fallback branch) for consistency.
5. Gate.

**Done when:** boss fights show real art with phase tinting, no `| null` imagePath anywhere in
this chain, gate green, committed.

**Commit:** `feat(boss): wire boss phase art from adventure cover (§1c)`

---

## Not scheduled

- **§1 navigation** — decided B (keep two tabs). No work.

## After each phase

Log it in [ui-screen-audit-tracker.md](ui-screen-audit-tracker.md) (the implementation log),
and tick the matching row here. This file tracks execution; the tracker records what shipped.

## Related

- [screen-redesign-proposals.md](screen-redesign-proposals.md) — the decisions this executes
- [roadmap.md](roadmap.md) — open work, guardrails and PR delivery rules
- [../design/ui-checklist.md](../design/ui-checklist.md) — the per-phase UI gate
