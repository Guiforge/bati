# 🎨 Missing Cover Images — Plan & Prompts

> **Superseded pipeline.** The generation instructions below describe the Mammouth API and
> Gemini models, which are no longer used: everything is generated against Black Forest Labs
> directly, because the FLUX output licence follows the API key and an aggregator's terms grant
> nothing onward. See [image-style-prompt.md](image-style-prompt.md) and
> [`scripts/lib/flux.py`](../../scripts/lib/flux.py). The *inventory* below is still accurate.


The app's `constants/assetMap.ts` is fully backed by files on disk, **but the actually
seeded content** (the two hand-authored adventures in `0002`/`0003` — *The Lumber Route*
and *The Golem* — plus their quests) was never given covers. Those rows resolve to
`assets/placeholder.jpg`. A separate planned asset set existed on paper and did not match the
seeded content, so it did not fill this gap.

This doc lists the 11 missing covers, priority-ordered (most visible first), with a
ready-to-generate prompt each. Generation is done by `scripts/generate-covers.py` via the
Mammouth API. Output: `1024x768` JPG, matching existing covers.

## 🤖 Model choice

Mammouth's web plans advertise Nano Banana / FLUX / GPT Image / Recraft / Stable Diffusion,
but the **API** (`/v1/models`) only exposes the Gemini image family + `gpt-image-2` on this
key. Tested for real:

| Model | Status | Notes |
|-------|--------|-------|
| **`gemini-3.1-flash-image-preview`** (Nano Banana 2) | ✅ **chosen default** | Best accessible: deepest obsidian shadows, cinematic god-rays, honors "looming in background", native 1200×896. |
| `gemini-2.5-flash-image` (Nano Banana) | ✅ works | Brighter/flatter, more cartoonish; good fallback (`MODEL=…`). |
| `gemini-3-pro-image-preview` (Nano Banana Pro) | ❌ 403 | Best model overall but not enabled on this key. |
| `gpt-image-2` | ❌ 524 | Gateway times out through Mammouth — unusable. |

Note: urllib needs a `User-Agent` header or the API returns 403 (Cloudflare).

## 🖼️ Review outcome (best-of-each)

Both models were run for all 11 and compared. Per-image winner (Nano Banana 2 = v2):

- **Nano Banana 2 kept**: `the_golem`, `raise_the_shelter`, `golem_core` (rock formation, not a
  muscle torso), `knight_push`.
- **Nano Banana 2.5 kept**: `lumber_route`, `chop_wood`, `gather_stones`, `golem_strike`,
  `tower_climb`, `shield_wall`, `core_forge` — the 2 flash-2 renders of `chop_wood`/`gather_stones`
  hallucinated a UI status bar / baked-in caption text and were rejected.

## 🎯 Art Direction (recap — see `image-style-prompt.md`)

- **Style**: Dark-fantasy Franco-Belgian comic / graphic-novel, thick black outlines, cel-shaded.
- **Palette**: deep obsidian blue base `#0B0F19`, electric-blue accents `#0D33F2`; warm
  amber/orange for fire & lantern light, red-orange for the golem's magma.
- **Light**: high-contrast, volumetric, rim light, **fade to dark edges (vignette)** so the
  art blends into the app's dark UI.
- **Composition**: wide landscape 4:3, cinematic. **Environment only — no characters.**

Every prompt below ends with this shared suffix (added by the script):

> `Dark fantasy Franco-Belgian comic book style, thick black outlines, cel-shaded. Deep obsidian blue (#0B0F19) shadows, electric blue accents, high-contrast volumetric lighting, fade to dark edges. Wide 4:3 landscape, cinematic, no characters, environment only.`

## 🔎 Full content audit (exercises / quests / adventures / bosses)

From the seed SQL cross-checked against files on disk:

| Type | Seeded | Real image | Gap & action |
|------|--------|-----------|--------------|
| **Exercises** | 26 | 20 themed | **6 generic** (Squat, Push-ups, Pull-ups, Wall Sit, Plank, Crunch) from `0001` had no `imagePath` → `placeholder.jpg`. They're the exercises the hand-authored Lumber Route / Golem quests actually use, so they showed placeholder **during every workout** — higher impact than the covers. Fixed with **dedicated generated art** (`scripts/generate-exercises.py`, character-pose style) wired in `0009`, one image per exercise (no reuse/duplication). |
| **Quests** | 13 | 13 ✅ | Covered (the 11 below + the 4 Iron Lord quests already had art; overlap resolved). |
| **Adventures** | 3 | 3 ✅ | Covered (`lumber_route`, `the_golem`, `iron_lord_conquest`). |
| **Bosses** | 5 art PNGs exist | — | Nothing missing, but `BOSS_ASSETS`/`getBossAsset` are **never rendered** — the boss fight UI is only `BossHpBar`. Showing boss art is a *feature* (code), not an image gap. Flagged, not done. |

Generic→themed exercise image reuse (in `0009`): Squat→`goblin_squat`, Push-ups→`dragon_pushup`,
Pull-ups→`iron_grip_pullup`, Wall Sit→`wall_sentinel_hold`, Plank→`stone_guardian_plank`,
Crunch→`wizard_bicycle_crunch`.

## 📋 Priority list

| # | Cover | Target file |
|---|-------|-------------|
| 1 | The Lumber Route (adventure) | `assets/images/adventures/lumber_route.jpg` |
| 2 | The Golem (adventure/boss) | `assets/images/adventures/the_golem.jpg` |
| 3 | Chop Wood | `assets/images/quests/chop_wood.jpg` |
| 4 | Gather Stones | `assets/images/quests/gather_stones.jpg` |
| 5 | Raise the Shelter | `assets/images/quests/raise_the_shelter.jpg` |
| 6 | Golem Strike | `assets/images/quests/golem_strike.jpg` |
| 7 | Golem Core | `assets/images/quests/golem_core.jpg` |
| 8 | Tower Climb | `assets/images/quests/tower_climb.jpg` |
| 9 | Knight Push | `assets/images/quests/knight_push.jpg` |
| 10 | Shield Wall | `assets/images/quests/shield_wall.jpg` |
| 11 | Core Forge | `assets/images/quests/core_forge.jpg` |

## ✍️ Scene prompts (source of truth = `scripts/generate-covers.py`)

1. **lumber_route** — A misty pine forest at blue hour, a winding dirt path leading through towering evergreens toward a small clearing where a half-built wooden shelter stands; stacked logs, an axe buried in a tree stump, warm amber lantern glow. The start of a journey.
2. **the_golem** — A colossal stone golem's lair inside a shattered mountain cavern; a massive humanoid silhouette of grey boulders with glowing red magma cracks looming in the background mist, broken pillars and rubble, ominous scale, dust in shafts of cold light.
3. **chop_wood** — A woodcutter's clearing at the forest edge at dawn, a large tree stump with an axe buried in it, split logs stacked, wood chips scattered, soft morning light through pines.
4. **gather_stones** — A rocky quarry at the foot of a cliff, scattered heavy grey boulders and a wooden cart half-loaded with stones, a foundation trench dug in the earth, dusk light.
5. **raise_the_shelter** — A timber-frame shelter under construction, wooden beams and scaffolding rising, a raised roof frame, coils of rope and tools, torch-lit worksite at dusk, sense of progress.
6. **golem_strike** — A battle-scarred stone arena floor, a massive fractured stone fist embedded in the ground, cracks radiating with red glow, dust and rubble, the giant shadow of a golem looming.
7. **golem_core** — Close view of a stone golem's chest core: a glowing red-orange crystalline heart set in cracked grey rock, magma veins spreading outward, a dark cavern behind.
8. **tower_climb** — An impossibly tall ancient stone tower spiralling into storm clouds, worn stairs winding up the exterior, crumbling edges, dizzying vertical perspective looking up.
9. **knight_push** — A knight's training courtyard at dawn, stone flagstones, wooden training dummies and a weapon rack, banners on castle walls, disciplined martial atmosphere.
10. **shield_wall** — A fortress rampart at night, a row of tall interlocked shields lining the battlement, torches flickering, an approaching storm on the horizon, defensive stand.
11. **core_forge** — A blacksmith's forge interior focused on a glowing anvil and roaring forge fire, steel bars heating red-hot, hammers and tongs, flying sparks, intense heat glow.

## 🔌 Wiring (after images exist)

For each generated file, two edits are needed — see the last section of
`scripts/generate-covers.py` output, applied in `constants/assetMap.ts` and a new seed
migration:

1. **`assetMap.ts`** — add keys to `ADVENTURE_ASSETS` / `QUEST_ASSETS`
   (e.g. `lumber_route: require("@/assets/images/adventures/lumber_route.jpg")`).
2. **Seed SQL** (new migration) — set `imagePath`:
   ```sql
   UPDATE `adventures` SET `imagePath` = 'assets/images/adventures/lumber_route.jpg' WHERE `enTitle` = 'The Lumber Route';
   UPDATE `adventures` SET `imagePath` = 'assets/images/adventures/the_golem.jpg'    WHERE `enTitle` = 'The Golem';
   UPDATE `quests`     SET `imagePath` = 'assets/images/quests/chop_wood.jpg'         WHERE `enTitle` = 'Chop Wood';
   -- …one per quest
   ```
   Adventure-step images auto-inherit from their quest (`0008` already runs the copy).
