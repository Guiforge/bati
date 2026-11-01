# Blockout toolchain

Renders in `renders/` were made with:

- Blender 5.1.1, flatpak `org.blender.Blender` (Fedora remote), engine `CYCLES` on the CPU, seed 0,
  no denoising, Freestyle on (`iso_blockout.py`; the anchor JSON records `blender` and `engine`).
  Its OpenColorIO (2.4.2) cannot read the bundled 2.5 config and falls back to its built-in mode;
  face colours still come out exact, which is what `scripts/iso/g0.py` checks (palette to ±2).
- ImageMagick `magick`, PNGs stripped of their timestamps (`-strip`, `png:exclude-chunks=date,time`).
- Pillow for the masks and the lossless WebP mock-ups.

A different Blender may move a line by a pixel and change every hash: rerun `scripts/iso/g0.py`
first, then re-render.

## Rendering a stage and its exports (L1-T01)

    scripts/iso/team/heavy.sh python3 scripts/iso/exports/stage_exports.py [slug ...]
    python3 scripts/iso/exports/test_exports.py
    python3 scripts/iso/exports/heights.py

`stage_exports.py` runs `iso_loop.py blockout` and then writes the rest; its docstring is the
format of the eight exports (`isoSpec.json` `exportsParStade`), indexed in each `.anchor.json`
under `exports`. Per stage `<slug>` in `renders/`:

| Export | Where |
| --- | --- |
| ancrage | `<slug>.anchor.json` `anchor` (canvas px) |
| ombre | `<slug>.anchor.json` `shadow` (per part, `grid` and `px` from the anchor) |
| flaques | `<slug>.anchor.json` `pools` (same forms) |
| volumes | `<slug>.anchor.json` `volumes` (per part: vertices `[gx, gy, z]`, `mat`, `emissive`, `noShadow`, `roof`) |
| pointsAccroche | `<slug>.anchor.json` `pointsAccroche.px` (sprite px, top left) and `.grid` (`[gx, gy, z]`) |
| masqueEmissif | `<slug>.emissive.png` (255 on seen emissive parts) |
| masqueToit | `<slug>.roof.png` (255 on seen upward roof faces) |
| masqueTap | `<slug>.mask.png` (alpha >= 128) |

Spec keys the exports read: `"accroche": "porte"` or `"cheminee"` on a part (a door or a chimney is
not told by its shape; `porte` is the middle of the door's foot, `cheminee` the top of the highest
tagged part); `"roof": true|false` overrides the default roof rule (a `roof` prism, `tile` or
`thatch`). `faite` is the top of the highest roof, `avantToits` up to 8 points around each roof's
lower rim, roofs one after the other. A missing part gives `null` (or `[]` for `avantToits`).

### The `.cls` pass, blue channel (L2-T02)

The scratch pass `<stem>.cls.png` (WORK/passes, 8 bit, unfiltered) is R = material index x 8,
G = tone class (20/80/140/200), B = a surface flag, set by `iso_blockout.py`:

| B | Meaning |
| --- | --- |
| 255 | upward (n.z > 0.2) face of a roof part: the roof mask (`>= 128`, `.roof.png`) |
| 64 | upward face of the socle: the one `box` at `[0, 0, 0]`, no `rotZ`, whose `size[:2]` is the canvas `footprint` |
| 0 | everything else |

No spec key, no extra pass or render; the outputs (`.png`, `.rgba.png`, `.green.png`, `.dark.png`,
`.mask.png`, `.roof.png`, exports, mock-ups) are byte for byte the same. `compose(stem, out)`
drops B from `.classes.png` (B there is the cast-shadow flag). For
`compose(..., socle_shadow=False)`: a pixel of the `.cls` pass with B in 32..160 (64 +- tolerance, never >= 128) is never
`occluded`, so it keeps the tone of its n.L, and `.classes.png` B is 0 there. The default `True`
changes nothing. The socle's side faces (n.z <= 0.2) are not flagged; other low surfaces on the socle (tent
floor, paving, field) are not either.

## Canvases

Farm and archery_range (2 × 3) use `building2x3` (1280 × 1280, anchor `[640, 1216]`): 1280 wide
because the anchor is centred and the footprint's right corner is 576 px from it; 1280 high leaves
3.1 units of height at the back corner. The other canvases are in `constants/isoSpec.json`.

L1-T03: campfire uses `decor1x1`; wizard_tower and training_dummy `tower1x1` (the dummy moved
there in round 2: its grand mock-up weighed 21 to 22 KB against decor1x1's 19.6 KB budget), tent and
druid_grove `building2x2`. The campfire has only its coal bed (`ember`, with a small `fire` core)
under the logs: the flame is the app's sheet (lot 4). The palette has no foliage: the grove's leaves
and ivy are `thatch`, tree crowns marked `"roof": true` (snow lands there), ivy and shrubs
`"roof": false`. The tent's cloth is `wood` (round 2: `canvas` was the board's lightest tone), its
ridge along gx so the long slope takes the moon and the door gable is in shadow.

L1-T04 (tier 3, two stages each): watchtower on `tower1x1`, castle_wall on `building1x3` (the wall
runs along gy, merlons on its back edge, the gate through it toward +gx), armory, fountain and
observatory on `building2x2`, barn on `building2x3`. The fountain's water is `thatch`, like the
well's; the armory's brazier is `ember`, its flame the app's.

L1-T05 (tier 4, three stages each): dragon_lair, heroes_hall and champion_arena on `building3x3`
(1280 × 1600, anchor `[640, 1536]`), high_road on `building1x2` (896 × 1152, anchor `[448, 1088]`),
the road running along gy as `isoLayout.json` lays it, its gy 0 end on the village path. The lair is
a rock knoll of 4-vertex frustums (`rock`) with a fanged mouth on +gy; the hall's banners and the
road's lantern are the app's (poles and arm only); the arena's fire bowls and the lair's coals are
`ember`, and `heights.py` gives each separate hearth its own flame. A cone or cylinder takes
`"verts": 8` for a deliberately faceted dome (observatory solid), as `4` makes a pyramid; any other
count is raised to 32. Round 3 of L1-T03 and the L1-T04 art review: tent cloth in `thatch`, no walls,
guy ropes; the dummy's crossbar is back; the armory rough's rack stands out front; the barn's
carriage doors stand open.

L1-T05 round 2: the hall's masts are thick shafts with an iron collar, a pommel and a spike, no
crossbar (a T-bar read as a telegraph pole), and its rough is a small low longhouse; the road's rough
gets tall boundary stones, a stone heap and a cart wheel, its solid a timber arch; the tent grows
from a small low tent to a pavilion; the dummy's straw is `canvas` and the figure a third bigger;
the armory's door goes round to the shaded flank and its whole lit gable carries the rack of eight
spears and a great shield on crossed axes. `heights.py`: the grand road's lantern hangs at 1.28 to
1.68, under the lintel; a hearth of any shape is read by its vertices' box, largest bed first.

L1-T06, in `pieces/` (slug `pieces/<name>`, mock-up `blockout/pieces/<name>.webp`): none is a
building stage, so they stay out of the top level, which `heights.py` and
`__tests__/iso-layout.test.ts` read as the 57 stages. Decor `decor_{arbre_a,b,c, bosquet_a,b,
rochers_a,b}` on `decor1x1`, each inside its cell and under `heights.py` DECORS (checked there);
water `eau_canal_{droit,angle,berge,pont}` and `eau_cascade_bord` on `decor1x1`, flat `thatch`
water (`"roof": false`), canal along gy; `eau_cascade_chute`, the falling sheet, on `sails` (anchor =
the cascade cell's back corner at ground level), below ground and `noShadow`: it is the app's to
animate; scaffolds `echafaudage_{1x1,2x2}` on `decor1x1` and `building2x2`, see-through; villagers
`villageois_<role>_{face,dos}` on `villager` (pxScale 2), lit from the front by the spec's `light`
(ground shadow still under the moon) and inked at half width by `lineScale`, two spec keys
`iso_blockout.py` reads for any piece.

## Generators

The specs are generated, not hand-written (forge and windmill excepted). Each generator checks that
no vertex leaves the footprint and that every stage stays under its height cap, then writes its
specs here; format them after (`npx biome format --write scripts/iso/blockouts/`), then render.

    python3 scripts/iso/blockouts/gen_muscle.py    # quarry, well, farm, archery_range (L1-T02)
    python3 scripts/iso/blockouts/gen_specials.py  # wizard_tower, druid_grove, campfire, tent, training_dummy (L1-T03)
    python3 scripts/iso/blockouts/gen_tier3.py     # watchtower, castle_wall, armory, fountain, observatory, barn (L1-T04)
    python3 scripts/iso/blockouts/gen_tier4.py     # dragon_lair, heroes_hall, champion_arena, high_road (L1-T05)
    python3 scripts/iso/blockouts/gen_decor.py     # pieces/: decor, water, scaffolds, villagers (L1-T06)

Each exits 1 when a check fails (`<-- FIX` on the stage's line), and then writes nothing.

Well uses `decor1x1` (512 × 768, 2.2 units of height): a 1.5-unit well fits, and the painted
sprite costs less than on `tower1x1`.

The app's mock-up of each stage is `assets/images/village/iso/blockout/<name>`, `<name>` being the
painted sprite's own (`forge/solid.nuit.webp`; `windmill_sails.webp` for the sails), same canvas,
same anchor and same sidecar `.json` as `iso_loop.write_sprite`, so one replaces the other.

L4-T08b: three village animals in `pieces/animal_<chat|poule|corbeau>_<repos|a|b>` (`python3 scripts/iso/blockouts/gen_animaux.py`, then `scripts/iso/team/heavy.sh python3 scripts/iso/blockouts/render_animaux.py render [corbeau_a ...]`; `sheet` alone redoes `renders/animaux_planche.png`). `villager` canvas (anchor `[384, 704]`, pxScale 2), `light` and `lineScale` 0.3; 0.13 to 0.17 high (0.24 to 0.34 of a villager's 0.49), heading screen right. Their lot-1 mock-ups go to `renders/animaux-maquettes/`, not `assets/`.
