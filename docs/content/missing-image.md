---
title: Missing Images — inventory
type: content
status: active
updated: 2026-08-31
related: [missing-covers.md, ../planning/roadmap.md]
sources: [constants/assetMap.ts, drizzle, assets/images, db/muscles.ts, db/schema.ts, db/village.ts, components/village/VillageScene.tsx, components/session/BossPhaseImage.tsx, components/session/BossHpBar.tsx]
---

# Missing Images — inventory

> **Superseded pipeline.** The generation instructions below describe the Mammouth API and
> Gemini models, which are no longer used: everything is generated against Black Forest Labs
> directly, because the FLUX output licence follows the API key and an aggregator's terms grant
> nothing onward. See [image-style-prompt.md](image-style-prompt.md) and
> [`scripts/lib/flux.py`](../../scripts/lib/flux.py). The *inventory* below is still accurate.


> What art is still missing (three poses, see §8), what is covered, what exists but is
> unused — and
> [how to generate the gaps](#how-to-generate-missing-art).
> Re-verified 2026-07-30 (through migration `0024`) by diffing seed `imagePath` basenames
> against `constants/assetMap.ts` keys and files on disk. The render path resolves images by
> **basename key** through `assetMap` (e.g. `getExerciseAsset`), not by the raw seed path — so
> coverage is measured against assetMap keys, not filenames: a row can have a perfectly good
> `imagePath` and still render the placeholder (see §5).
>
> Distinct from [missing-covers.md](missing-covers.md), which tracked the earlier
> adventure/quest cover gap (now resolved). This file tracks what's left **after** the
> 2026-07 redesign phases.

## TL;DR

- **§8 OPEN (2026-08-17)**: the calisthenics batch (`0032`/`0033`) added 13 movements and got
  11 of them drawn; `bulgarian_split_squat` and `muscle_up` ship on the placeholder because no
  attempt produced a usable pose. The same pass repaired **17 of the original 49**, whose art had
  been showing the wrong movement since it was first generated, and `windshield_wipers` joins the
  open list. §8 also records what this model will and will not draw — read it before writing a
  prompt.
- **§7 RESOLVED (2026-07-30)**: the mobility branch (`0024`) shipped 7 exercises and 3 quest
  covers with no art; all 10 are now generated, reviewed and wired. One pose was rejected and
  regenerated — see §7 below.
- **§6 RESOLVED (2026-07-28)**: `0023` renamed the `0006` batch to the movements' official names
  and merged five duplicates away; the 14 poses that staged a goblin, a dragon or a wizard were
  regenerated as the same lone hero as the rest of the set.
- **§5 RESOLVED (2026-07-27)**: the 11 assets the phase-C/D/E batch pointed at now exist,
  are reviewed and are registered in `assetMap`.
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
- **Content art: 60/62 exercises, 34/34 quests, 8/8 adventures.** Two exercises render the
  placeholder, both named in §8. A third, `windshield_wipers`, has art that resolves but shows
  the wrong movement — the inventory counts files, so only a person reading §8 will know. (62, not 68: `0018` deleted Barbarian's Overhead Press, the catalogue's only
  dumbbell movement — see the work roadmap §15 — and `0023` merged five `0006` exercises into
  the `0001` originals they duplicated.)
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
export BFL_API_KEY=...            # https://bfl.ai — see .env.example, never hardcode it
magick --version                 # ImageMagick — used for the resize/pad step
```

### Which script

| Script | Produces | Output |
| --- | --- | --- |
| `scripts/generate-covers.py` | quest + adventure covers | `1024x768` JPG → `assets/images/{quests,adventures}/` |
| `scripts/generate-exercises.py` | exercise character poses | `1024x768` JPG → `assets/images/exercises/` |
| `scripts/generate-village.py` | village tiers, sport sprites, building icons | `1024x1024` PNG → `assets/images/village/[buildings/]` |

```bash
python3 scripts/generate-exercises.py              # every entry still missing
python3 scripts/generate-exercises.py squat plank  # just these slugs
MODEL=gemini-2.5-flash-image python3 scripts/…     # override the model
```

Each script **skips slugs whose file already exists** — so a re-run only fills gaps, and
regenerating one image means deleting it first. `generate-exercises.py` checks both extensions,
because the exercise folder is mid-conversion from PNG to JPG (~850 KB → ~100 KB a frame).

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

**Both done, and the second one landed differently than planned.** The grid calls
`getBuildingIconAsset()`, and a level-5 forge does read differently from a level-1 one.

The plan above said "one tint ramp per icon, not 5 assets per building", citing `BossPhaseImage`.
Two corrections to that, for anyone following the trail:

- `BossPhaseImage` no longer exists (deleted in `bb026b8a`). The mechanism survives as
  `components/session/bossPhase.ts` — a table of rgba tints laid over one unmodified image by
  `BossArena.tsx`.
- What shipped is **three paintings per building, not one and not five**: `_rough`, the existing
  art as `solid`, and `_grand`, chosen by `buildingStage()` in `constants/buildingLevels.ts`. The
  opacity ramp in `BuiltBuildingCard` still fills the steps between them, so the two approaches
  are stacked rather than one replacing the other.

Sixty emblems instead of twenty, which is the cost this section was trying to avoid. It was
re-opened deliberately: the tint ramp alone left every level the same shape, and shape is what
reads at 48px. The two stage prompts are shared modifiers in `generate-village.py`, not forty
bespoke descriptions, so the transformation is identical across all twenty buildings.

---

## 1. RESOLVED — was missing, now wired

### 1c. Boss phase art — the monster's own portrait, treated per phase

**Superseded twice; this is the current state (2026-08-03).**

- `BossPhaseImage` and `BossHpBar` no longer exist (deleted in `bb026b8a`). The phase mechanism
  survives as [`components/session/bossPhase.ts`](../../components/session/bossPhase.ts), applied
  by [`BossArena`](../../components/session/BossArena.tsx).
- It is no longer a flat rgba tint either. A phase is now a **dim + red rim + screen colour** — the
  art keeps its own colours and the room loses its light, rather than the painting being repainted
  50 % red at Enraged. Values are opacities over token-coloured layers, so nothing lands outside
  `constants/rawColors.ts`.
- **It no longer shows the adventure cover.** `0025_boss_art.sql` added `adventures.bossImagePath`
  and pointed it at the standalone creature portraits, so the fight shows the thing you are hitting
  and the gallery still shows a poster for the journey. The schema note this section used to carry
  ("no per-boss identity field") is obsolete: `bossImagePath` *is* that field, and
  `getBossKey()` + [`constants/bosses.ts`](../../constants/bosses.ts) key each monster's name and
  taunt pools off it.

Still true: no new art per phase. Four phases, one painting, layered — the original principle held.

---

## 2. COVERED — no action needed

All resolve to real art via `assetMap` (verified basename-key match):

- **Exercises — 42/42.** Every row maps to a real `EXERCISE_ASSETS` key. (The
  `alchemist_hollow_body_hold` key / `alchemist_hollow_body` filename mismatch this section used
  to flag is gone: both became `hollow_body_hold` in §6.)
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
- **Boss portraits — 12 paintings, 6/6 campaigns each with its own monster (2026-08-04).** The
  whole set was regenerated square (1024×1024): the first batch was 2:1 for the old letterboxed
  arena, and the art-hero arena (`sessionArtHeight`, ~1:1 on a phone) was cropping almost half of
  every painting's width. Six base monsters — including `iron_golem`, so The Golem finally stopped
  sharing `stone_golem` with The Guardian's Oath (`0027`) — plus six `*_legendary` forms for the
  rematch tier (`BOSS_LEGENDARY_ASSETS`). `scripts/generate-bosses.py` carries all twelve prompts;
  provenance is in `scripts/provenance.json` as always.
- **Trophy shelf (2026-07-21).** Needs no new art: boss trophies reuse the adventure cover via
  `getAdventureAsset`, achievement trophies use the `icon` emoji already on
  `achievementDefinitions`. Deliberate — an emoji rack reads as a trophy shelf.

---

## 3. UNUSED — art that exists with no content (cleanup candidates, not missing)

The inverse problem — art shipped without content to use it:

- **4 orphan adventure covers**: `guardian_oath`, `monk_enlightenment`, `ranger_journey`,
  `scout_trial` — present on disk and in `ADVENTURE_ASSETS`, but no seeded adventure references
  them. Either seed 4 more adventures to use them, or drop them.
- ~~**1 duplicate exercise file**: `ranger_single_leg_deadlift_1`~~ — deleted in the §6 pass,
  along with the 6 poses the merges and `0018` had orphaned.

- ~~**5 unlinked boss creature portraits**~~ — **wired up, not cleaned up.** `0025` added
  `adventures.bossImagePath` and `0026` corrected which campaigns it points at. All five are live
  in `BossArena` and in the adventure screen's `BossPanel`, and each one is now also a *name*: the
  painting is the only place a boss's identity is written down, so `getBossKey()` resolves the
  monster from it and `constants/bosses.ts` keys its name and taunts by that. The campaign title is
  only a fallback for content shipping without a painting.

  ~~The one gap left: six boss campaigns, five paintings.~~ Closed 2026-08-04: `iron_golem` (the
  Rustlord) was generated with the square rebatch and `0027` pointed The Golem at it. Every boss
  campaign now has its own monster, and every monster has a `*_legendary` form for the rematch.

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

## 6. RESOLVED — the 0006 batch renamed and repainted (14 poses, 2026-07-28)

`drizzle/0023_official_exercise_names.sql` renamed the `0006` batch to the movements' real names
and merged the five that duplicated a `0001` exercise. Their art was staged for the old names — a
goblin squatting, a dragon pressing, a wizard crunching — so it was regenerated in the same pass:
same lone hero as every other pose in `EXERCISES`, no creature. Files were renamed *before*
regenerating, so nothing rendered the placeholder in between.

| Old slug | New slug | Exercise |
| --- | --- | --- |
| `shadow_step_lunge` | `lunge` | Lunge |
| `berserker_burpee` | `burpee` | Burpee |
| `monk_mountain_climber` | `mountain_climber` | Mountain Climber |
| `titan_dip` | `dip` | Dip |
| `archer_pike_pushup` | `pike_pushup` | Pike Push-Up |
| `thunder_jumping_jack` | `jumping_jack` | Jumping Jack |
| `paladin_high_knee` | `high_knees` | High Knees |
| `wizard_bicycle_crunch` | `bicycle_crunch` | Bicycle Crunch |
| `knight_diamond_pushup` | `diamond_pushup` | Diamond Push-Up |
| `ranger_single_leg_deadlift` | `single_leg_deadlift` | Single-Leg Deadlift |
| `druid_cobra_stretch` | `cobra_stretch` | Cobra Stretch |
| `samurai_warrior_pose` | `warrior_pose` | Warrior Pose |
| `rogue_skater_hop` | `skater_hop` | Skater Hop |
| `alchemist_hollow_body` | `hollow_body_hold` | Hollow Body Hold |

The last row closes the one key/filename mismatch this page has been carrying since §2: the
`assetMap` key was `alchemist_hollow_body_hold`, the file was `alchemist_hollow_body`. Both are
`hollow_body_hold` now, and the test that guarded the divergence has nothing left to guard.

**Generated** with `gemini-3.1-flash-image-preview`, 14 prompts appended to
`scripts/generate-exercises.py`. To redo one, delete it first — the script skips any slug that
already has a file, now checked on **both** `.jpg` and `.png` since the folder is mid-conversion:

```bash
rm assets/images/exercises/lunge.jpg
python3 scripts/generate-exercises.py lunge
magick montage assets/images/exercises/*.jpg -tile 4x4 -geometry 300x225+3+3 /tmp/sheet.jpg
```

**Reviewed.** Corner-pixel check passed on all 14 (darkest `srgb(0,2,1)`, lightest
`srgb(6,14,27)` — no white-background failures), no baked-in captions or UI chrome, all
`1024x768`, 46–102 KB each. One reject caught by looking, exactly the case this page keeps
warning about: the first `lunge` handed the hero a war hammer and read as a charge, not a
lunge. Its prompt now says empty hands, no weapon, static hold — regenerated and correct.

**Output is JPG now**, not PNG: ~75 KB a frame against ~850 KB for the same image, so the 14
poses cost less than one of the `0010` PNGs still in the folder.

**Deleted in the same pass** (6 files, ~700 KB): `goblin_squat`, `dragon_pushup`,
`iron_grip_pullup`, `stone_guardian_plank` and `wall_sentinel_hold` — merged into Squat,
Push-ups, Pull-ups, Plank and Wall Sit, which keep their own `0001` art — plus
`barbarian_overhead_press`, orphaned since `0018` deleted that exercise, and the byte-identical
`ranger_single_leg_deadlift_1` duplicate flagged in §3.

---

## 7. RESOLVED — the mobility branch has art (10 assets, 2026-07-30)

`drizzle/0024_mobility_branch.sql` seeded 7 mobility exercises and 3 mobility quests with no
art. All 10 now exist, are reviewed and are wired.

The content shipped ahead of the art on purpose, unlike §4–§6: the branch existed to be *used*.
The catalogue held two mobility movements and one mobility quest, which is why §11.4's rest-day
session had nowhere to live, and the warm-up could not prepare a wrist because no wrist movement
existed to draw by name (§8.6.4). The seeds unblocked both; the placeholder was honest meanwhile.

| Slug | Kind | Row |
| --- | --- | --- |
| `wrist_circles` | exercise | Wrist Circles — the prehab movement the warm-up needs |
| `cat_cow` | exercise | Cat-Cow |
| `thread_the_needle` | exercise | Thread the Needle |
| `standing_forward_fold` | exercise | Standing Forward Fold |
| `downward_dog` | exercise | Downward Dog |
| `pigeon_pose` | exercise | Pigeon Pose |
| `worlds_greatest_stretch` | exercise | World's Greatest Stretch |
| `dawn_ritual` | quest cover | The Dawn Ritual |
| `hearthside_unbinding` | quest cover | The Hearthside Unbinding |
| `handlers_vigil` | quest cover | The Handler's Vigil |

**Generated** with `gemini-3.1-flash-image-preview`, all 10 at `1024x768` JPG, 65–202 KB. The
three cover scenes are deliberately calm and unpeopled: these are rest-day sessions, and a cover
that shouts undercuts the one thing the session is for.

**One reject, caught by looking** — exactly the failure this page keeps warning about, and the
prediction above was wrong about which asset would fail. `wrist_circles` came out right first
time. `thread_the_needle` failed twice over: a bright violet halo filling the border (corner
pixel `srgb(102,104,205)` against near-black everywhere else), and, worse, **the wrong movement**
— a hero reaching one arm forward along the floor, which is a kneeling extension, not a spinal
rotation. Its prompt now spells out that the shoulder and the side of the head press into the
ground, that the threaded hand comes out past the opposite knee palm-up, that the chest faces
sideways, and explicitly that "nothing extends in front of the head" — plus a no-halo clause.
Regenerated and correct.

**Reviewed.** Corner-pixel check on both corners of all 10: darkest `srgb(0,3,8)`, lightest
`srgb(3,10,26)`, no white-background and no coloured-border failures. No baked-in captions, no
UI chrome, no people in any of the three covers.

**Wired**: 7 keys in `EXERCISE_ASSETS`, 3 in `QUEST_ASSETS`. No migration needed — `0024`
already wrote the intended `imagePath` for all 10 rows.

**Verified** by replaying every migration into an in-memory DB and matching each seeded
`imagePath` basename against the `assetMap` keys *and* the files on disk: **49/49 exercises,
30/30 quests, 8/8 adventures**. Both checks matter — a key can exist for a file that does not,
and Metro resolves `require()` at bundle time, so that combination breaks the build rather than
falling back. It is why `0024` shipped with no `assetMap` entries at all.

```bash
python3 scripts/generate-exercises.py   # fills only what is missing
python3 scripts/generate-covers.py
magick montage assets/images/exercises/*.jpg -tile 4x4 -geometry 300x225+3+3 /tmp/sheet.jpg
```

---

## 8. The calisthenics batch (`0032`/`0033`) — 11 of 13 delivered

The thirteen new movements are drawn, converted, thumbed and wired into `assetMap`, minus two.
**`bulgarian_split_squat` and `muscle_up` ship on the placeholder**: neither reached a usable pose
in seven and five attempts, and a wrong illustration in a training app is worse than no
illustration. Their files are deliberately absent rather than present-and-unreferenced, so the
tree holds nothing dead.

The same pass fixed **seventeen of the original forty-nine**, whose poses had been wrong since
their first draw — a wall sit sitting on an invented stone block, a dip standing on the floor
between the bars, a chin-up standing upright holding a bar at chest height, a pull-up with no
face at all.

### What the model will and will not draw

Roughly sixty generations went into this, and the failures were not random. Four rules came out
of them, and each prompt in `scripts/generate-exercises.py` carries the note of which one it
needed:

1. **A contact point and a shape, never a distance.** "Lifted a few centimetres off the ground"
   is never drawn; "the only thing touching the floor is the small of the back, and the body
   curves up at both ends like a banana" always is. This unlocked the hollow body, the superman,
   the cobra and the calf raise.
2. **Final positions, never the path.** "Thread the arm under the chest" gave a plain quadruped
   every time; "the shoulder and ear rest on the floor and that arm lies flat pointing sideways
   past the opposite knee" was right on the first try. Same for the curtsy squat's crossing.
3. **Add, never forbid.** Banning "stool, bench, block, step or ledge" under the wall sit
   produced a chair — the model finds whatever the list forgot. Give the empty space something to
   draw instead: the stone wall carrying on down to the floor, visible under the seat.
4. **A countable fact beats an adjective.** "One-legged squat" drew two legs on the ground;
   "exactly one foot touches the ground" drew a pistol squat.

Two further traps. A movement whose name is made of common nouns gets the nouns drawn — the
dragon flag came back as an athlete waving a dragon banner, and only a prompt that never names it
produced the lever. And an anchor ("it is exactly a dead hang, but the elbows are bent") works
when the delta *adds* and fails when it *replaces*: "a push-up, but on the knees instead of the
toes" reliably draws a push-up on the toes.

### Still open

| Slug | Attempts | Failure it keeps returning to |
| --- | --- | --- |
| `bulgarian_split_squat` | 7 | sits on the bench, straddles it, or stands on top of it |
| `muscle_up` | 5 | hangs below the bar, or leans on it from the side |
| `windshield_wipers` | 4 | no rotation; the last draw fused two bodies together |

All three share a shape whose difference from the pose the model prefers is gradual rather than
structural, which is exactly what none of the four rules can express. The remaining lever is a
reference image (`image_prompt`, which `scripts/lib/flux.py` does not currently send). Note that
the Gym visual dataset is not usable for that — its media is licensed to that repository alone,
and this app's art pipeline exists to stay redistributable for F-Droid.

```bash
python3 scripts/generate-exercises.py <slug>   # one at a time; the whole list re-rolls everything
FLUX_SEED_SALT=1 python3 scripts/generate-exercises.py <slug>   # same prompt, different dice
python3 scripts/to-webp.py && python3 scripts/thumb-exercises.py
```

Add the `assetMap` entry in the same commit as the file, never before: Metro resolves `require()`
at bundle time, so a key pointing at a missing file breaks the build instead of falling back.

---

## Related

- [missing-covers.md](missing-covers.md) — the prior (resolved) cover gap + generation pipeline
- [../planning/roadmap.md](../planning/roadmap.md) — what is still open, art included

## 9. The expeditions (`0041`/`0042`) — 6 of 6 delivered

All six are drawn, converted, thumbed and wired. Nothing in this section falls back to the
placeholder any more, and unlike §8 there is nothing left open: eight generations produced six
usable images, one of which was a re-roll.

**Three movements** (`assets/images/exercises/`, keyed without the extension, so the migration's
`.jpg` and a delivered `.webp` are the same asset):

| key | movement | what it shows |
|---|---|---|
| `wardens_walk` | Warden's Walk | a lantern-carrying walker seen from behind on the track beside a village wall at dusk, brazier burning at the far turn, moor falling away on the other side |
| `messengers_run` | Messenger's Run | a runner mid-stride on a rutted road at last light, satchel strapped across the back, the lights of the next village small on the plain ahead |
| `outriders_ride` | Outrider's Ride | a cloaked scout riding a black horse at a canter along a downland track at golden hour, hooves throwing turf, leagues of empty country either side |

**Three quest covers** (`assets/images/quests/`): `wardens_round` (an empty rampart walk above the
village roofs), `word_must_travel` (a road running down out of the hills toward a village's
lights), `long_reach` (a saddled horse waiting inside an open gate, the track beyond running out
into unmapped country).

### The judgement these needed, which was not the one §8 needed

Every other illustration in the catalogue is a body doing a movement against a plain ground, and
these are *places* — a road, a wall, a horizon. So all six were written in the covers register,
including the three that live in `assets/images/exercises/`: shot type first, the emptiness stated
positively at the end, edges falling into darkness.

That meant `generate-exercises.py`'s shared `STYLE` could not be appended to them. It says, in
order, that the background is an unbroken void holding "no scenery, no floor line and no horizon",
and that there is one athlete in fitted training clothes with nothing else in frame — three
sentences that describe the exact opposite of an expedition. The three scenes therefore sit in
their own `EXPEDITIONS` list under an `EXPEDITION_STYLE` constant in the same file, and the
`__main__` block concatenates the two lists. They stay **square at 1280 and in the exercise
folder**, because they land in the same six render slots as every other movement, five of which
are square, and `thumb-exercises.py` reads that directory.

The figure in two of them is the size of a merlon. That is deliberate: an instructional diagram of
a stride would be absurd, and what these have to say is *where*, not *how*.

### The bicycle, which is the whole point

`outriders_ride` is a bicycle in the real world and this world has no bicycles — it is why the
catalogue renames movements at all. It came back right on the first draw: a real horse, four
hooves, one hind hoof still driving off the turf, saddle and stirrups and reins, and nothing
mechanical anywhere in the frame. `long_reach`, its quest cover, is a saddled horse at a gate, so
the two reinforce each other.

Two of §8's four rules were applied at once to get there, and the prompt is written to be read that
way. A countable fact beats an adjective, so the animal is given four legs and four hooves rather
than being called a horse and left there. And *add, never forbid*: the anatomy is described in full
— arched neck, streaming mane, full tail, bit and bridle — so the model has nothing left to
substitute. One blunt negative stayed anyway ("no wheel, no cart, no machine, no vehicle of any
kind"), against this page's own rule 3, because this is the one failure worth discarding a paid
draw over rather than shipping. It did not have to earn its keep.

### One reject, caught by looking

`word_must_travel` came back with two lines of hallucinated gibberish lettering on the roadside
signpost — the failure §5 warns is only ever caught by a person opening the file. The fix was not a
ban on text: the board is now described as a thing with a surface, "a plain slab of weathered grey
timber worn perfectly smooth and bare, its lettering long since gone". Rule 3 again — give the
empty space something to draw. Regenerated at the same seed, correct, and the signpost survived.

**Reviewed.** All six opened and looked at. Corner-pixel check on all four corners of each: darkest
`srgb(0,0,0)`, lightest `srgb(47,55,66)`, no white-background and no coloured-border failures. No
baked-in captions, no UI chrome, no bicycle. Two notes for whoever reads these next:

- `messengers_run` carries a thin painted black frame at all four edges (hence the `srgb(0,0,0)`
  corners). It is *darker* than the `#0B0F19` the art fades into rather than lighter, so it reads as
  vignette on a dark screen and was accepted rather than re-rolled.
- `wardens_walk` has a second small figure at the wall's gate that the prompt did not ask for. At
  that scale it is scenery, like the crows in `crows_ascent`.

**Wired**: 3 keys in `EXERCISE_ASSETS`, 3 in `EXERCISE_THUMB_ASSETS`, 3 in `QUEST_ASSETS`. No
migration needed — `0041` and `0042` already wrote the intended `imagePath` for all six rows.

### What they cost, which is more than a pose does

**1.41 MB of new bundle** for nine files (six renders plus three thumbnails), against roughly
4.8 MiB of headroom under the release workflow's 55 MiB ceiling. **That is about 28 % of the
remaining budget for six images**, and it is worth saying out loud before the next batch of scenes
is commissioned.

The quest covers are ordinary — 104, 117 and 120 KB, against a median of 104 KB and a previous
maximum of 189 KB across the other 34. The three movement scenes are not: 287, 343 and 425 KB, the
three largest files in `assets/images/exercises/` by some distance, where the median pose is 81 KB
and the previous maximum was 218 KB. Nothing went wrong. A pose is a figure on a flat void, which
is the case WebP compresses best; a landscape is high-frequency detail edge to edge at 1280², which
is the case it compresses worst. Any future expedition scene should be budgeted at ~350 KB, not at
the ~80 KB a movement costs.

They were left at the pipeline's own `cwebp -q 85` rather than hand-tuned down. `provenance.json`
records that quality for every file, and a tree that `to-webp.py` cannot reproduce is the one thing
that ledger exists to prevent. If the ceiling ever gets close, lower the quality **in the script**,
for every asset, and re-run.

```bash
python3 scripts/generate-exercises.py wardens_walk messengers_run outriders_ride
python3 scripts/generate-covers.py wardens_round word_must_travel long_reach
python3 scripts/to-webp.py && python3 scripts/thumb-exercises.py
```

One trap in that last line, worth knowing before the next batch: `thumb-exercises.py` rewrites
**every** thumbnail in the folder, and a different libwebp version writes different bytes for an
unchanged image. It produced 61 spurious modifications here. Check `git status` after running it and
restore the ones you did not mean to touch.
