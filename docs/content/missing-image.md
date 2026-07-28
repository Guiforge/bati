---
title: Missing Images — inventory
type: content
status: active
updated: 2026-07-27
related: [missing-covers.md, ../planning/screen-redesign-proposals.md, ../planning/dev-execution-plan.md]
sources: [constants/assetMap.ts, drizzle, assets/images, db/muscles.ts, db/schema.ts, db/village.ts, components/village/VillageScene.tsx, components/session/BossPhaseImage.tsx, components/session/BossHpBar.tsx]
---

# Missing Images — inventory

> What art is still missing (nothing, as of this pass), what is covered, what exists but is
> unused — and
> [how to generate the gaps](#how-to-generate-missing-art).
> Re-verified 2026-07-27 (through migration `0018`) by diffing seed `imagePath` basenames
> against `constants/assetMap.ts` keys and files on disk. The render path resolves images by
> **basename key** through `assetMap` (e.g. `getExerciseAsset`), not by the raw seed path — so
> coverage is measured against assetMap keys, not filenames: a row can have a perfectly good
> `imagePath` and still render the placeholder (see §5).
>
> Distinct from [missing-covers.md](missing-covers.md), which tracked the earlier
> adventure/quest cover gap (now resolved). This file tracks what's left **after** the
> 2026-07 redesign phases.

## TL;DR

- **§5 RESOLVED (2026-07-27)**: the 11 assets the phase-C/D/E batch pointed at now exist,
  are reviewed and are registered in `assetMap`. **Every gap in this doc is closed.**
- **§4 RESOLVED (2026-07-27)**: the 20 bodyweight exercises from
  `drizzle/0010_seed_bodyweight_exercises.sql` now have dedicated character-pose art,
  assigned by `drizzle/0011_seed_bodyweight_exercise_images.sql` and registered in
  `EXERCISE_ASSETS`. See §4 below.
- **§0 RESOLVED (2026-07-21)**: all 20 village building icons now have real art — 14
  generated (`scripts/generate-village.py buildings/*`, `assets/images/village/buildings/`)
  and registered as `BUILDING_ICON_ASSETS` / `getBuildingIconAsset(code, relatedMuscle)` in
  `assetMap.ts`; the other 6 (the tier-2 muscle buildings) reuse the existing `sport_*`
  sprites via the same helper's fallback, zero new assets, as recommended. Wiring
  `VillageScene.tsx`'s building grid to render these instead of the `emoji` field — and the
  per-level tint ramp — remains a separate dev task, same boundary as §1a/§1b before it.
- **Content art: 47/47 exercises, 27/27 quests, 8/8 adventures.** Nothing seeded renders the
  placeholder. (47, not 48: `0018` deleted Barbarian's Overhead Press, the catalogue's only
  dumbbell movement — see the work roadmap §15.)
- **§1a/§1b RESOLVED (2026-07-20)**: 5 village tier illustrations + 6 sport sprites, generated
  (`scripts/generate-village.py`) and wired into `VillageScene.tsx` (`4356ee4`).
- **§1c RESOLVED (2026-07-20)**: `BossPhaseImage.tsx` now renders the boss's own adventure
  cover with a per-phase color tint, replacing the emoji placeholders — zero new assets needed,
  exactly as recommended (`2b06f3e`). `BossFight.imagePath`/`BossBanner.imagePath` are now
  plain `string` (never `| null`), resolving to the shared placeholder at the query layer —
  same convention as every other `getXAsset()` helper, no null-branching in components.

---

## How to generate missing art

The pipeline that produced every asset in this doc. Three scripts, one shared API and art
direction — `scripts/README.md` documents an unrelated Mistral helper, not this.

### Prerequisites

```bash
export MAMMOUTH_API_KEY=sk-...   # https://api.mammouth.ai, never hardcode it in a script
magick --version                 # ImageMagick — used for the resize/pad step
```

### Which script

| Script | Produces | Output |
| --- | --- | --- |
| `scripts/generate-covers.py` | quest + adventure covers | `1024x768` JPG → `assets/images/{quests,adventures}/` |
| `scripts/generate-exercises.py` | exercise character poses | `1024x768` PNG → `assets/images/exercises/` |
| `scripts/generate-village.py` | village tiers, sport sprites, building icons | `1024x1024` PNG → `assets/images/village/[buildings/]` |

```bash
python3 scripts/generate-exercises.py              # every entry still missing
python3 scripts/generate-exercises.py squat plank  # just these slugs
MODEL=gemini-2.5-flash-image python3 scripts/…     # override the model
```

Each script **skips slugs whose file already exists** — so a re-run only fills gaps, and
regenerating one image means deleting it first.

### Adding a new asset

Append a `(slug, prompt)` tuple to the script's list (`COVERS`, `EXERCISES`, or
`TIERS`/`SPRITES`/`BUILDINGS`) — list order is generation order, so put the most visible
asset first. The shared `STYLE` constant is appended automatically; the per-asset prompt
should only describe *the subject and its pose/scene*, never restate the art direction.

Prompts follow Google's Nano Banana guidance: natural-language creative-director phrasing
(not comma tag-soup), an explicit shot type, and **semantic** negatives ("the clearing is
deserted, no people") rather than a bare "no characters". Full art direction lives in
[image-style-prompt.md](image-style-prompt.md); the palette anchor is `#0B0F19` with the glow
color carrying the asset's meaning (per-muscle for exercises/sprites, per-resource for
buildings — see `muscleToResource` in `db/schema.ts`).

### Model choice

Default `gemini-3.1-flash-image-preview` (Nano Banana 2) — the best model reachable on this
key, and a visible step up from 2.5 (deeper shadows, better depth). Verified alternatives:

| Model | Status |
| --- | --- |
| `gemini-3.1-flash-image-preview` | ✅ default |
| `gemini-2.5-flash-image` | ✅ works — flatter, more cartoonish; usable fallback |
| `gemini-3-pro-image-preview` | ❌ `403` — not enabled on this key |
| `gpt-image-2` | ❌ `524` — gateway times out through Mammouth |

### Known failure modes

- **`403` on every call** — the API rejects urllib's default User-Agent. All three scripts
  send `User-Agent: curl/8.0`; keep it on any new caller.
- **`429 Too Many Requests`** — expected on long batches. `generate-exercises.py` and
  `generate-village.py` retry with a 30s→180s backoff; `generate-covers.py` does *not* yet,
  so a large cover batch may need re-running (it resumes, thanks to the skip-if-exists rule).
- **White background / letterboxing** — the model occasionally ignores the dark-void
  instruction. Check before accepting:
  `magick out.png -format "%[pixel:p{5,5}]\n" info:` should be near-black, not `srgb(255,255,255)`.
  Fix by deleting and regenerating with an explicit "background must be dark navy-black
  filling the whole frame, absolutely no white" clause.
- **Hallucinated text or UI chrome** — occasionally bakes in a caption or a tablet status bar.
  Only caught by looking; always review a contact sheet before wiring:
  `magick montage assets/images/exercises/*.png -tile 4x5 -geometry 280x210+4+4 sheet.png`

### Wiring — the part that is easy to miss

Generating the file is **not** enough. `getExerciseAsset()` and friends resolve by
**basename key** through `assetMap`, not by the raw DB path, so art that isn't registered
still renders `placeholder.jpg` no matter what the SQL says. Every new asset needs:

1. **`constants/assetMap.ts`** — a `require()` entry keyed by basename in the matching map
   (`EXERCISE_ASSETS`, `QUEST_ASSETS`, `ADVENTURE_ASSETS`, `BUILDING_ICON_ASSETS`, …).
2. **A migration** setting `imagePath`, for DB-backed content (exercises/quests/adventures) —
   one ``UPDATE `exercises` SET `imagePath` = '…' WHERE `enName` = '…';`` per row, following
   `0011_seed_bodyweight_exercise_images.sql`. Village/building art is code-only: no migration.
3. **Register the migration** in `drizzle/migrations.js` *and* `drizzle/meta/_journal.json`
   (matching `idx`/`tag`) — missing either means it silently never runs.

### Verify before committing

Count-match all three layers, rather than eyeballing them — a typo in an `enName` makes the
`UPDATE` a silent no-op that still leaves a placeholder on screen:

```bash
# seeded rows == UPDATE statements == assetMap keys, and every path exists on disk
grep -c "SET \`imagePath\`" drizzle/00XX_*.sql
python3 -c "import re,os;print([p for p in re.findall(r\"'(assets/[^']+)'\", open('drizzle/00XX_….sql').read()) if not os.path.exists(p)] or 'all exist')"
npx tsc --noEmit && npx jest __tests__/assetMap.test.ts
```

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

- **Exercises — 46/48.** The original 26 plus the 20 bodyweight ones from §4 all map to a real
  `EXERCISE_ASSETS` key. (Note: seed `alchemist_hollow_body_hold` correctly maps to the file
  `alchemist_hollow_body.png` via its assetMap key — resolves fine despite the filename
  difference.) The 2 missing are the §5 pull exercises.
- **Quests — 19/27.** 19 covers present in `QUEST_ASSETS`; the 8 missing are the §5 batch.
- **Adventures — 7/8.** Includes The Lumber Route, The Golem, The Iron Lord; the missing one is
  §5's The Squire's Path. (Per-boss village banners, §3 layer 3, reuse these via
  `getAdventureAsset`.)
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

## 4. RESOLVED — 20 bodyweight exercises now have art (2026-07-27)

**Closed the same day it opened.** All 20 now have dedicated character-pose art:

- **Generated**: `scripts/generate-exercises.py` extended with the 20 (glow color per the
  exercise's own seeded muscle — arms=amber, back=silver-blue, chest=orange-red,
  abs=electric-blue, shoulder=cyan, calf=gold), output to `assets/images/exercises/`.
- **DB**: `drizzle/0011_seed_bodyweight_exercise_images.sql` sets each row's `imagePath`,
  mirroring `0009`'s pattern; registered in `migrations.js` + `meta/_journal.json` (idx 11).
- **Render**: all 20 basename keys added to `EXERCISE_ASSETS` in `assetMap.ts` — required,
  since `getExerciseAsset` resolves by basename key, not raw path. Verified 20 seeded = 20
  updated = 20 assetMap keys, no drift.

**Origin of the batch:** `drizzle/0010_seed_bodyweight_exercises.sql` added 20 bodyweight
exercises curated from the
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) `body weight`
subset (EN + FR only, the other 8 dataset languages dropped; equipped/weighted exercises
excluded per scope). They were seeded without an `imagePath`, so they fell back to the schema
default (`assets/placeholder.jpg`) until `0011` assigned real art.

The 20: Chin-Up, Superman, Bear Crawl, Russian Twist, Side Plank, Glute Bridge, Standing Calf
Raise, Handstand Push-Up, Wall Push-Up, Flutter Kicks, Inverted Row, Dead Bug, Hanging Leg
Raise, Jump Squat, Reverse Crunch, Curtsy Squat, Scapular Pull-Up, L-Sit, Star Jump, Windshield
Wipers.

---

## 5. RESOLVED — phase-C/D/E content batch now has art (11 assets, 2026-07-27)

The `0014`–`0017` batch seeded rows whose `imagePath` named files that had never been
generated. Because those paths were already written, closing it needed **no migration** — only
step 1 and step 3 of the wiring checklist above.

**Generated** with `gemini-3.1-flash-image-preview`, prompts appended to the two scripts per
§How-to (shot type first, semantic negatives, no restating of the shared `STYLE`):

| Slug | Content | Kind |
| --- | --- | --- |
| `squire_path` | The Squire's Path | adventure cover |
| `squire_awakening` | The Squire's Awakening | quest cover |
| `bears_road` | The Bear's Road | quest cover |
| `cellar_hauler` | The Cellar Hauler | quest cover |
| `ploughmans_vow` | The Ploughman's Vow | quest cover |
| `crows_ascent` | The Crow's Ascent | quest cover |
| `colossus_trial` | The Colossus Trial | quest cover |
| `storm_of_blades` | Storm of Blades | quest cover |
| `serpents_coil` | The Serpent's Coil | quest cover |
| `table_row` | Table Row | exercise pose |
| `towel_door_row` | Towel Door Row | exercise pose |

**Reviewed before wiring**, per this page's own warning that hallucinated captions and UI chrome
are only caught by looking: contact sheet inspected, no baked-in text, no chrome, no people in
any of the nine covers, and both poses show the intended movement. Corner-pixel check passed on
all eleven — darkest `srgb(1,1,1)`, lightest `srgb(25,36,54)`, no white-background failures. The
two new PNGs (832K, 888K) sit inside the existing spread (median 712K, max 928K).

**Wired**: 8 keys in `QUEST_ASSETS`, 1 in `ADVENTURE_ASSETS`, 2 in `EXERCISE_ASSETS`.

**Verified** by replaying every migration into an in-memory DB and matching each seeded
`imagePath` basename against the `assetMap` keys: **47/47 exercises, 27/27 quests, 8/8
adventures**. The one path that does not exist on disk is `alchemist_hollow_body_hold.png`,
which resolves through its key to `alchemist_hollow_body.png` — the known, harmless mismatch
already noted in §2.

**Pipeline note**: `generate-covers.py` was the one script without the 429/5xx backoff described
under §Known failure modes. This batch was nine covers long, exactly the case that trips it, so
it now retries like its siblings.


---

## Related

- [missing-covers.md](missing-covers.md) — the prior (resolved) cover gap + generation pipeline
- [../planning/dev-execution-plan.md](../planning/dev-execution-plan.md) — the plan this art unblocked, now fully shipped
- [../planning/screen-redesign-proposals.md](../planning/screen-redesign-proposals.md) — §3 design intent
