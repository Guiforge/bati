#!/usr/bin/env python3
"""The art loop of the iso village POC, after scripts/art-loop.py.

    python3 scripts/iso/iso_loop.py blockout forge_solid           # Blender -> blockouts/renders/
    python3 scripts/iso/iso_loop.py prep-blockout forge_solid      # stand-in sprite + tap mask
    python3 scripts/iso/iso_loop.py candidates forge_solid 1       # 3 FLUX paintings, budget-guarded
    python3 scripts/iso/iso_loop.py candidates forge_solid 1 legacy    # the probe's #0B0F19 variant
    python3 scripts/iso/iso_loop.py candidates forge 1 triptych        # the probe's three-stage canvas
    python3 scripts/iso/iso_loop.py audit forge_solid 1            # (A), the measured audit
    python3 scripts/iso/iso_loop.py sheet forge_solid 1            # the review sheet, pages of 1600 px
    python3 scripts/iso/iso_loop.py review forge_solid 1           # the frozen review prompt, filled in
    python3 scripts/iso/iso_loop.py record-review forge_solid 1 verdict.json
    python3 scripts/iso/iso_loop.py accept forge_solid a1_c2       # ship it, with its provenance
    python3 scripts/iso/iso_loop.py budget                         # reserved, real, BFL balance
    python3 scripts/iso/iso_loop.py ground-guide rue_terre         # T22: 16 ground tiles, colour guide
    python3 scripts/iso/iso_loop.py ground-candidates rue_terre 1  # 3 Klein sheets = 3 variants
    python3 scripts/iso/iso_loop.py ground-cut rue_terre 1         # slice, geometric alpha, (A) per tile
    python3 scripts/iso/iso_loop.py ground-sheet rue_terre 1       # review pages, map patch
    python3 scripts/iso/iso_loop.py texture-candidates terre 1     # T22 round 2: 3 Klein textures on a colour swatch
    python3 scripts/iso/iso_loop.py texture-seam terre 1           # roll by half, repaint the cross, 256/512 px
    python3 scripts/iso/iso_loop.py texture-sheet terre 1 apercu.png   # x2, rolled, 3x3 mosaic, on the preview
    python3 scripts/iso/iso_loop.py ground-accept rue_terre 2 Guillaume --human "<why>" --review <file:pass> [--only c0,c2]
    python3 scripts/iso/iso_loop.py budget start-v1                # V1 marker, once, live balance
    python3 scripts/iso/iso_loop.py budget ack                     # resume after a 10 $ checkpoint
    python3 scripts/iso/iso_loop.py budget klein-ack               # lift a Klein billing stop (team lead)

Why a second loop rather than art-loop.py with options: that one judges a pose, this one judges a
shape, an angle and a cut. What carries over is the method: one reference we drew ourselves, four
seeds per attempt, a sheet, a verdict written down before anyone else's, three attempts at most.

Candidates, sheets and verdicts live in ~/.cache/bati-art-loop/iso/<slug>/, never /tmp. A
candidate is named `<variant>a<attempt>_c<i>`, the variant empty for the default magenta one.
"""

import concurrent.futures
import contextlib
import fcntl
import hashlib
import itertools
import json
import math
import os
import pathlib
import shutil
import sys
import time
import urllib.request

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageStat

import iso_audit as A
import isolib as L

sys.path.insert(0, str(L.ROOT / "scripts"))
from lib import flux  # noqa: E402

# V1 (L0-T10): the ceiling counts V1 spend only, from the `v1` marker in budget.json; the POC's
# 5.04 $ stay in the top-level fields. L0-T13: Guillaume sets the ceiling in VALIDATIONS.md, a file
# no agent can write; an env var could be set by anyone, so it no longer sets it.
VALIDATIONS = L.ROOT / "docs" / "designs" / "village-iso-v1" / "VALIDATIONS.md"
DEFAULT_CEILING = 40.0
ALERTE_FLUX = 10.0  # every 10 $ of V1 spend the loop stops until `budget ack`
PROBE_MAX = 2.00
# A probe with its own cap. The Klein trial (L1-T08, L1-T10): 0.50 $ for every attempt together.
# L2-T08: Klein is the model of the lot 2 (H1); variant `w5gp` bills `klein_prod_real`, 5 $, under the V1 ceiling.
PROBE_CAPS = {"klein_trial_real": 0.50, "klein_prod_real": 7.50}
CANDIDATES = 3
# 0.10 per image: above the 0.075 $ of a 2x2 canvas, room for the larger 2x3 and 3x3 ones (L0-T07).
RESERVE = {"image": 0.10, "triptych": 0.20, "klein": 0.02, "flux3": 0.10}  # klein: above its 2K tier (0.014 $)
# L1-T08, the trial Guillaume allowed at H0: the variant `w5gk` is `w5g` (same prompt, blockout and
# seeds) painted by FLUX 3 Image Klein. No other variant reaches another model.
KLEIN = "https://api.bfl.ai/v1/flux-3-image-klein"
KLEIN_VARIANTS = {"w5gk", "w5gp"}
# T41 round 2 (Guillaume 31/10): the variant `f3` repaints a finished sprite with FLUX 3 Image
# (`flux-3-image`, ~0.048 $ per image at 1k): image 1 = the green blockout, image 2 = the sprite
# today on green. Same reserve, same settle and same V1 ceiling as the other variants, no probe cap.
FLUX3 = "https://api.bfl.ai/v1/flux-3-image"
FLUX3_VARIANTS = {"f3"}
# $ per image by output tier (bfl.ai/pricing, read 2026-10-28), billed at the smallest tier with at
# least as many pixels; references are free ("text to image and image editing cost the same").
KLEIN_TIERS = ((768 * 768, 0.008), (1024 * 1024, 0.009), (1536 * 1536, 0.011), (2048 * 2048, 0.014))


def klein_price(width: int, height: int) -> float:
    return next((price for pixels, price in KLEIN_TIERS if width * height <= pixels), 0.036)

BUDGET = L.WORK / "budget.json"
REVIEW_PROMPT = L.ROOT / "docs" / "designs" / "village-iso-poc" / "REVUE-PROMPT.md"
STYLE_REFS = [
    ("assets/images/village/tier_3.webp", "tier_3 : lumière, couleurs et trait"),
    ("assets/images/village/tier_6.webp", "tier_6 : lumière, couleurs et trait"),
    ("assets/images/village/buildings/watchtower.webp", "trait seulement (liseré et éclairage hors DA iso)"),
    ("assets/images/villagers/smith_talk.webp", "trait seulement (liseré et éclairage hors DA iso)"),
]

# Image 1 is a blockout we rendered: it holds the geometry, the prompt only has to ask for paint.
# Said positively throughout (docs/content/image-style-prompt.md: models follow descriptions far
# better than negations), and the background colour in the first breath of its own sentence.
#
# Prompt v5 (§5.3): the blockout's colours are already the night colours, lit by the moon; the
# preamble asks to keep them as they are (darkening them again gives a muddy double night).
PREAMBLE = (
    "Image 1 is a flat-shaded blockout that fixes the exact shape, the orthographic camera angle, "
    "the framing, the footprint and the base colour of every material of this object. Paint "
    "exactly this object as an illustration: the same silhouette, every part in the same place and "
    "at the same size, and the colours of image 1 kept as they are, since they are already the "
    "colours of the night. It is night: cold moonlight comes from the upper left, so the faces "
    "turned to the left are pale and bluish and the faces turned to the right are in deep shadow, "
    "exactly as in image 1. The only warm colours are inside the openings, {warm}; the walls and the "
    "ground around them keep their cold night colours.The object stands alone on {background} that fills the whole image from edge to "
    "edge, all four corners included; the object ends at its own base and everything around it is "
    "that same flat colour. The base is bare, clean-cut stone or timber right up to its inked edge."
)
BACKGROUNDS = {
    "": "a flat, pure magenta (#FF00FF) background",
    "legacy": "a flat, deep obsidian blue (#0B0F19) background",
    # Second probe (Guillaume, 2026-10-28): a cold key, so the spill is cold too and never reads as
    # the forge's warm light, and the cut is clipped to the blockout (iso_audit.clip_to).
    "s2": "a flat, pure chroma-key green (#00FF00) background",
    # Prompt v5's probe: magenta and the historical navy, same seeds, judged first on the DA.
    "v5": "a flat, pure magenta (#FF00FF) background",
    "v5l": "a flat, deep obsidian blue (#0B0F19) background",
    # Guillaume's backdrop test on the windmill (2026-10-28): magenta against a green described as
    # a studio backdrop, so the night prompt does not darken it the way it darkened the magenta.
    "w5m": "a flat, pure magenta (#FF00FF) background",
    "w5g": "a flat studio backdrop of pure chroma green (#00FF00), evenly lit, untouched by the night scene,",
}
BACKGROUNDS["w5gk"] = BACKGROUNDS["w5g"]  # the Klein trial: the very same prompt
BACKGROUNDS["w5gp"] = BACKGROUNDS["w5g"]  # Klein in production: the same prompt again
# The warm sources each subject owns, named with their colour (prompt v5 §4 bis). The forge keeps
# the orange hearth of v5a1_c2, which Guillaume accepted with its glow on the wall (2026-10-28).
WARM = {
    "forge": "the windows glowing clearly in warm pale amber and the hearth in orange",
    "windmill": "a small window glowing clearly in warm pale amber",
    "dragon_lair": "the orange embers inside the cave mouth",
    "heroes_hall": "the windows glowing clearly in warm pale amber",
    "champion_arena": "the coals in the small iron baskets on the rim, in orange",
    "high_road": "the small lantern windows, where there are any, in warm pale amber",
    "watchtower": "the small lantern window, where there is one, in warm pale amber",
    "castle_wall": "the small windows, where there are any, glowing clearly in warm pale amber",
    "armory": "the small window glowing clearly in warm pale amber",
    "fountain": "the small lantern on the pillar, where there is one, in warm pale amber",
    "observatory": "the small windows glowing clearly in warm pale amber",
    "barn": "the small windows, where there are any, glowing clearly in warm pale amber",
    "campfire": "the bed of coals in orange",
    "farm": "the windows glowing clearly in warm pale amber",
    "well": "nothing",
    "archery_range": "nothing",
    "quarry": "the small hut window, where there is one, glowing clearly in warm pale amber",
    "wizard_tower": "the small windows glowing clearly in warm pale amber",
    "druid_grove": "nothing",
    "training_dummy": "nothing",
}
# L2-T05: the colour rules the beginnings family needed (L2-T04 review), said once for the next families.
FLAT = ("Every fill is flat, with no gradient: the stone is dull desaturated slate grey with no blue tint, the "
        "timber is dark umber brown, and every face turned right is in deep obsidian shadow. "
        "No purple, violet or lavender anywhere: the shadows are almost neutral blue-black with very little colour, and the stone, plaster and timber are all dull and desaturated.")
# L6-T01 attempt 2 (archery_range, quarry): attempt 1 failed `palette` on blue-violet shadows.
NEUTRAL = ("The shadowed faces are warm charcoal grey-brown, never blue: the only blue in the picture is a faint cool edge of moonlight.")
# L6-T01 (fresh eye, item 5, the commonest failure): image 1 still shows cast shadows on the base; FLUX copies them as hatching.
NOSHADOW = ("The base slab is one flat, evenly coloured surface: no shadow of any object and no hatching is painted on it; "
            "shadows are drawn only on the objects' own faces. Stone courses, plank joints and cracks are drawn as thin black ink lines.")
# L6-T01 tour 3 review: browns drift to pink/mauve under "cold moonlight" (measured: blockout brown (46,39,35) -> (71,53,62)).
NOMAUVE = ("Every brown surface stays a warm brown, with more red than blue: no pink, mauve, lilac or lavender tint on the ground, "
           "the planks or the roof; pale walls and gables are a cool light blue-grey, never beige-pink.")
NOSHADOW_FAMILY = {"dragon_lair", "heroes_hall", "champion_arena", "high_road", "druid_grove", "watchtower", "castle_wall", "armory", "fountain", "observatory", "barn"}
NEUTRAL_FAMILY = {"dragon_lair", "heroes_hall", "champion_arena", "high_road", "watchtower", "castle_wall", "armory", "fountain", "observatory", "barn", "archery_range", "quarry", "wizard_tower", "druid_grove", "training_dummy"}
# L6-T01 tour 3 of the stages the fresh eye failed (reviews/L6-T01-art-f1.md): one colour or texture sentence each.
SLUG_EXTRA = {
    "archery_range_rough": "The posts and the target legs are dark umber brown and the ground is a flat dull warm brown, with no blue or mauve anywhere.",
    "archery_range_solid": "The timber stakes carry a few short black ink hatch lines along their grain, so they read as hand-drawn wood.",
    "archery_range_grand": "The tiled roof is a muted dull brick brown-red and the stone posts are dull slate grey, both unsaturated.",
    "druid_grove_rough": "Each slab carries a few black ink cracks and chips.",
    "druid_grove_solid": "Each slab carries a few black ink cracks and chips.",
    "wizard_tower_grand": "Every stone course and roof tile is drawn with its own black ink line, and the lit faces are clearly paler than the shaded faces. The tower is one opaque solid mass: the windows and the door are painted flat on its wall.",
    "druid_grove_grand": "Every stone slab and leaf cluster is drawn with its own black ink line, and the lit faces are clearly paler than the shaded faces. Each slab has a few black ink cracks and a thick black ink edge between its pale left face and dark right face.",
    "training_dummy_rough": "The post, the crossbar and the sacks carry black ink grain lines and stitched seams. The base planks show their joints as black ink lines.",
    "training_dummy_solid": "The wood is dark brown and the cloth dull grey-beige, with no blue anywhere.",
    "armory_solid": "The roof tiles are flat matt red-brown without any shine or highlight, drawn row by row with black ink lines. The only warm lights are the window panes; the left gable is a pale cool blue-grey.",
    "dragon_lair_rough": "Every rock facet is drawn with its own thick black ink line, and the lit facets are clearly paler than the shaded ones.",
    "heroes_hall_solid": "The walls and the portico are cool grey stone; the only warm colours are the small window panes, the two round shields and the roof.",
    "high_road_rough": "The road and the ground are a dull warm olive-brown, and the signpost is dark brown timber.",
    "high_road_solid": "The stone paving and the markers are neutral grey with no blue tint, and the gateway is dark warm brown timber.",
    "high_road_grand": "The stone paving and the pillars are neutral grey with no blue tint, and the signpost is dark warm brown timber.",
    "champion_arena_grand": "Every stone block and arch is drawn with its own thick black ink line, and the lit faces are clearly paler than the shaded faces.",
    "observatory_rough": "The dome is drawn in clearly separated flat plates with a black ink line between each plate.",
    "fountain_rough": "The only warm light in the picture is inside nothing: no glowing disc, no orange or peach shape anywhere; the water is dark and matte.",
    "observatory_solid": "The slab is exactly the same flat colour everywhere, with no dark patch, no smudge and no hatching on it.",
    "barn_rough": "Every outline is a thick, solid, even black line of constant width, drawn with a confident steady hand.",
    "watchtower_solid": "The four timber legs are thick and stout, with solid plank flooring on the platform.",
    "fountain_solid": "Every block of the basin and every tier of the pillar is separated by a clear black ink joint, and the water is calm and dark with no highlights.",
    "barn_rough": "The plank walls are dark umber brown and the ground is dull warm brown, with no violet or blue anywhere.",
    "barn_solid": "The roof is a dull brick red and the plank walls and ground are cool neutral grey-brown.",
    "quarry_rough": "The bare ground is a flat dull olive-brown, with no purple or mauve in it.",
}
FLAT_FAMILY = {"dragon_lair", "heroes_hall", "champion_arena", "high_road", "watchtower", "castle_wall", "armory", "fountain", "observatory", "barn", "forge", "windmill", "well", "farm", "archery_range", "quarry", "wizard_tower", "druid_grove", "training_dummy"}
# ISO_STYLE starts from SCENE_STYLE (scripts/generate-village.py) and keeps its sentence on the
# ink, the cel-shading and the hard-edged shadows word for word (prompt v5 §4 bis). Four changes:
#   - "the frame edges fall off into darkness like a soft vignette" is gone: a cut-out sprite has
#     no frame;
#   - "high-contrast volumetric lighting" becomes "hard-edged cool moonlight": volumetric asks for
#     rays and haze, which leave a half-transparent veil at the cut;
#   - "electric-blue accents" becomes a cold moonlight on the top edges: that phrase already drew a
#     cyan flame once (generate-village.py, the comment before tier_2);
#   - #0B0F19 is tied to the object's shadows, since the background is the key.
# The words "Clash", "Supercell", "mobile game", "3D render", "isometric game asset" never appear:
# they pull toward the look we refuse.
ISO_STYLE = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration with thick, confident "
    "black ink outlines and flat cel-shaded color fills with hard-edged shadows. The palette is a "
    "cold, desaturated night: the object's shadows are deep obsidian blue (#0B0F19), a cold pale "
    "moonlight catches its top edges, and hard-edged cool moonlight falls on it from the upper left. "
    "One object alone, seen from above in the same orthographic three-quarter view as image 1, on "
    "the flat background described above. Hand-made pre-industrial materials, named by what they "
    "are: dressed stone, rough-hewn timber, red-brown clay tiles, straw thatch, wrought iron, woven "
    "cloth. The artwork is unsigned and wordless."
)
STAGE = {
    "rough": "This is its earliest and roughest form: small and plainly made from unfinished "
             "timber, weathered, patched and slightly crooked, with a straw-thatched roof and no ornament.",
    "solid": "This is its sound, everyday form: straight walls, dressed stone and solid timber, neat and "
             "well kept, with a few plain iron fittings.",
    "grand": "This is its final and most accomplished form: larger and taller, richly detailed, with "
             "carved timber, red cloth banners and polished wrought-iron fittings, standing on a worked "
             "stone base.",
}
# Stages of a piece that is not a roofed building say their own growth (the generic STAGE talks of walls and thatch).
STAGE_OWN = {
    ("campfire", "rough"): "This is its earliest and roughest form: small and plainly made, a loose ring of "
                           "rough grey stones set on a flat square platform of plain dark umber-brown timber planks, with a few "
                           "crooked poles and no ornament.",
    ("campfire", "solid"): "This is its sound, everyday form: a neat ring of dressed grey stones two courses high "
                           "on a flat square base of dull grey flagstones, with two plain upright stone pillars.",
    ("campfire", "grand"): "This is its final and most accomplished form: a tall ring of dressed grey stones "
                           "on a worked grey stone base, an iron cooking pot hanging from the tripod, and two "
                           "tall grey stone pillars topped with small iron caps.",
    ("tent", "rough"): "This is its earliest and roughest form: small and low, patched canvas and thin poles, "
                       "on a flat square ground of plain dark umber-brown timber planks with no painted shadows.",
    ("tent", "solid"): "This is its sound, everyday form: taller, straight and well kept, with two plain "
                       "timber poles, on a flat square base of dull grey flagstones.",
    ("tent", "grand"): "This is its final and most accomplished form: larger and taller, a dull brick-red cloth band "
                       "along the ridge, four tall timber posts with iron tips at the corners, on a worked grey "
                       "stone base.",
}
STAGE_OWN.update({
    ("well", "rough"): "This is its earliest and roughest form: a low ring of rough grey stones, a small slate-grey "
                       "gabled roof on two thin crooked posts, a plain stump for a bucket, on bare dark umber-brown planks.",
    ("well", "solid"): "This is its sound, everyday form: a neat round wall of dressed stone, straight posts and a "
                       "dark brown plank roof, on a base of dull grey flagstones.",
    ("well", "grand"): "This is its final and most accomplished form: a taller wall of dressed stone, carved "
                       "timber posts and a red-brown tiled roof with a small iron finial, on a worked grey stone base.",
    ("farm", "rough"): "This is its earliest and roughest form: a small timber hut with a slate-grey roof, three "
                       "bare soil beds with a few rails, and a single small plot, on bare dark umber-brown ground.",
    ("farm", "solid"): "This is its sound, everyday form: a neat farmhouse with a slate-grey roof, two groups of "
                       "tilled beds and a timber fence, on a base of dull grey flagstones.",
    ("farm", "grand"): "This is its final and most accomplished form: a larger farmhouse with a red-brown tiled "
                       "roof and a stone chimney, four groups of tilled beds, a timber fence and a barn, on a worked "
                       "grey stone base.",
})
STAGE_OWN.update({
    # L6-T01, muscle family 2. Growth told in parts, as for the well and the farm.
    ("archery_range", "rough"): "This is its earliest and roughest form: one round target on three legs, a low row of "
                                "plain square-topped timber posts behind it, a fallen log and a small bare gate frame, "
                                "on bare dark umber-brown ground.",
    ("archery_range", "solid"): "This is its sound, everyday form: two round targets, a longer row of timber stakes "
                                "with pointed tops, an open shelter with a slate-grey pitched roof on four posts, and "
                                "a low timber rail fence, on a base of dull grey flagstones.",
    ("archery_range", "grand"): "This is its final and most accomplished form: three round targets, a tall row of "
                                "pointed timber stakes ending in stone posts, an open shelter with a red-brown tiled "
                                "pitched roof on four posts, a low timber rail fence and a small barrel, on a worked grey stone base.",
    ("quarry", "rough"): "This is its earliest and roughest form: a stepped cliff of three rough-cut grey stone terraces, "
                         "a few loose grey stone blocks at its foot, on bare dark umber-brown ground.",
    ("quarry", "solid"): "This is its sound, everyday form: a stepped cliff of five neatly cut grey stone terraces, "
                         "stacked squared stone blocks at its foot, a tall A-frame of dark brown timber poles with a rope "
                         "and pulley, on a base of dull grey flagstones.",
    ("quarry", "grand"): "This is its final and most accomplished form: a tall stepped cliff of six neatly cut grey stone "
                         "terraces, stacked squared stone blocks, a tall A-frame of dark brown timber poles with a rope "
                         "and a pulley, a small timber hut with a red-brown tiled roof, on a worked grey stone base.",
})
STAGE_OWN.update({
    ("wizard_tower", "rough"): "This is its earliest and roughest form: a short round tower of rough grey stone with a dark brown timber-walled "
                               "upper storey and a small window, a slate-grey conical roof, a few timber stumps and posts at its foot, on bare dark umber-brown ground.",
    ("wizard_tower", "solid"): "This is its sound, everyday form: a tall round tower of dressed grey stone, two small windows, a plank door at the "
                               "foot and a red-brown tiled conical roof with a small iron finial, on a base of dull grey flagstones.",
    ("wizard_tower", "grand"): "This is its final and most accomplished form: a taller round tower of dressed grey stone with a wide stone ring ledge "
                               "half way up, four small windows, a plank door between stone buttresses and a red-brown tiled conical roof with a tall iron spire, on a worked grey stone base.",
    ("druid_grove", "rough"): "This is its earliest and roughest form: a loose scatter of six upright grey stone slabs and one fallen flat slab, "
                              "two small round dark shrubs at the corners, on bare dark umber-brown ground.",
    ("druid_grove", "solid"): "This is its sound, everyday form: a ring of tall upright grey stone slabs around a low flat stone table, one taller "
                              "central slab with a rounded cap, a low round stone kerb, two small round shrubs, on dark umber-brown ground.",
    ("druid_grove", "grand"): "This is its final and most accomplished form: a dense ring of tall upright grey stone slabs around a low flat stone table, "
                              "a stone gateway of two uprights and a flat beam at the back, two slender trees with round crowns, a small shrub, on a worked grey stone base.",
    ("training_dummy", "rough"): "This is its earliest and roughest form: one small upright post with a round cloth head and a short crossbar, two small timber blocks on the ground, on bare dark umber-brown planks.",
    ("training_dummy", "solid"): "This is its sound, everyday form: a stout upright post with a round cloth head and a crossbar with a round padded sack at each end, "
                                 "a round dark wooden shield on its front, crossed timber feet and a leaning timber pole, on a base of dull grey flagstones.",
    ("training_dummy", "grand"): "This is its final and most accomplished form: a stout upright post with a brown cloth cap on its round head, a crossbar with padded sacks, "
                                 "a round shield with an iron boss, crossed timber feet and a tall timber pole, on a raised stone step on a worked grey stone base.",
})
STAGE_OWN.update({
    ("watchtower", "rough"): "This is its earliest and roughest form: a plain tall frame of four thin crooked timber legs with a few cross-braces and a ladder, a small square platform under a slate-grey pyramid roof, on bare dark umber-brown ground.",
    ("watchtower", "solid"): "This is its final and proudest form: a taller frame of four stout timber legs with neat cross-braces on stone footings and a ladder, a railed platform with a small lantern window glowing warm amber, and a bright red-brown tiled pyramid roof with an iron finial, on a base of grey flagstones.",
    ("castle_wall", "rough"): "This is its earliest and roughest form: a low plain wall of rough grey stone with stepped battlements, a plain timber gate and leaning timber props, on bare dark umber-brown ground.",
    ("castle_wall", "solid"): "This is its final and proudest form: a long tall wall of dressed grey stone with neat battlements, an arched gateway of studded timber doors, a round corner tower with a bright red-brown conical roof and small windows glowing warm amber, on a base of grey flagstones.",
    ("armory", "rough"): "This is its earliest and roughest form: a small low hut with plastered walls and a slate-grey gabled roof, a plank door, a small window, and three upright spears leaning at the front with clear gaps between them, on bare dark umber-brown ground.",
    ("armory", "solid"): "This is its final and proudest form: a sturdy stone-and-plaster hall with a bright red-brown tiled gabled roof and a stone chimney, a plank door, windows glowing warm amber, a few upright iron-tipped spears and a round shield with a red boss at the front, on a base of grey flagstones.",
    ("fountain", "rough"): "This is its earliest and roughest form: a low round basin of rough grey stones holding dark still water, a short stone post in the middle, two small stones beside it, on bare dark umber-brown ground.",
    ("fountain", "solid"): "This is its final and proudest form: a wide round basin of dressed grey stone holding dark still water, a tall tiered stone pillar with a bowl in the middle and a small iron lamp on top glowing warm amber, small stone posts around the rim, on a base of grey flagstones.",
    ("observatory", "rough"): "This is its earliest and roughest form: a round tower of grey stone with a plain pale plaster dome, a timber beam across its slit, a plank door, on bare dark umber-brown ground.",
    ("observatory", "solid"): "This is its final and proudest form: a taller round tower of dressed grey stone with a dome of dark slate segments, a long slim brass-coloured tube rising through the slit, small windows glowing warm amber and a plank door, on a base of grey flagstones.",
    ("barn", "rough"): "This is its earliest and roughest form: a long plain timber barn with weathered plank walls and a steep slate-grey roof, a wide plank door and a few stacked grey sacks, on bare dark umber-brown ground.",
    ("barn", "solid"): "This is its final and proudest form: a long timber barn with neat plank walls, a steep bright red-brown tiled roof, a loft hatch, a wide plank door, windows glowing warm amber and stacked grey sacks and crates, on a base of grey flagstones.",
})
STAGE_OWN.update({
    ("dragon_lair", "rough"): "This is its earliest and roughest form: a low heap of grey rock with one small dark cave mouth, two short stone spikes and a few bones on bare dark umber-brown ground.",
    ("dragon_lair", "solid"): "This is its sound, everyday form: a taller craggy mountain of grey rock with a wide dark cave mouth lined with pointed stone spikes, orange embers glowing inside it, bones and broken timber at the front, on a base of dark umber-brown earth.",
    ("dragon_lair", "grand"): "This is its final and most formidable form: a tall mountain of grey rock with several sharp peaks, a very wide cave mouth ringed with large pointed stone spikes, a bright orange glow of embers and a heap of gold inside it, two stone obelisks at the front, on a worked dark base.",
    ("heroes_hall", "rough"): "This is its earliest and roughest form: a plain long timber hall with a slate-grey roof, a plain stone gateway at the front, a small window, two bare thin timber poles on the ground, on bare dark umber-brown ground.",
    ("heroes_hall", "solid"): "This is its sound, everyday form: a stone hall with a bright red-brown tiled gabled roof and a stone chimney, a stone portico of two columns, two round red shields on the columns, windows glowing warm amber, two tall bare dark timber poles with small iron caps in front, on a base of grey flagstones.",
    ("heroes_hall", "grand"): "This is its final and proudest form: a larger stone hall with a bright red-brown tiled gabled roof, a small windowed cupola on the ridge, a grand portico of two tall columns with round red shields, many windows glowing warm amber, two tall bare dark timber poles with iron caps in front, on a worked grey stone base.",
    ("champion_arena", "rough"): "This is its earliest and roughest form: a round ring of pointed upright timber stakes around a bare earth floor with a single central post, on bare dark umber-brown ground.",
    ("champion_arena", "solid"): "This is its sound, everyday form: a round tiered stone wall with arched openings, an open gateway at the front, a central post, and small iron baskets of orange coals on the rim, on a base of grey flagstones.",
    ("champion_arena", "grand"): "This is its final and proudest form: a larger round tiered stone wall with many arches, a gatehouse with two round towers under red-brown conical roofs, iron baskets of bright orange coals around the rim, on a worked grey stone base.",
    ("high_road", "rough"): "This is its earliest and roughest form: a narrow strip of dirt road with a few stones, a tall plain signpost with two arrow boards, a low heap of rocks and a short stone marker, on bare dark umber-brown ground.",
    ("high_road", "solid"): "This is its sound, everyday form: a stone-paved road under a small timber gateway with two stout posts and a pitched plank roof, a signpost with two arrow boards, short stone marker posts, on a base of grey flagstones.",
    ("high_road", "grand"): "This is its final and proudest form: a stone-paved road between two tall stone pillars carrying a pitched red-brown tiled roof, small lantern windows glowing warm amber in the pillars, a signpost with arrow boards, short stone markers, on a worked grey stone base.",
})
SUBJECTS = {
    "dragon_lair": "A mountain of rock at night: heaped slate-grey angular rock with a dark cave mouth, pointed stone spikes, scattered bones and broken timber,",
    "heroes_hall": "A long stone hall at night: a gabled hall with a plank door, an arched stone portico with two columns, and two tall slender timber poles,",
    "champion_arena": "A round open-air enclosure at night: a circular wall around a bare earth floor with a central post,",
    "high_road": "A roadside gateway at night: a strip of road with stone paving, a timber or stone gateway spanning it, and a signpost with two arrow-shaped boards,",
    "watchtower": "A tall timber lookout at night: four dark brown timber legs with crossed braces, a ladder, a small railed platform and a pyramid roof,",
    "castle_wall": "A stone defensive wall at night: a long wall of slate-grey dressed stone with square battlements along the top and a timber gate,",
    "armory": "A small village hall at night: a low plastered building in a pale muted brown under a gabled roof, a timber door and a small window, with upright spear shafts at the front,",
    "fountain": "A round stone basin at night: a ring of slate-grey dressed stone around dark still water with a stone pillar in the middle,",
    "observatory": "A round stone tower at night: a cylinder of grey stone with a domed cap that has a slit, and a plank door,",
    "barn": "A long timber barn at night: plank walls of dark umber brown under a steep gabled roof, a wide plank door and stacked grey sacks,",
    "wizard_tower": "A tall round stone tower at night: a cylindrical shaft of grey dressed stone with small rectangular windows glowing warm amber, a conical roof, and a timber door,",
    "druid_grove": "A ring of standing stones at night: tall rectangular slabs of dull slate-grey stone, a low flat stone table in the middle, and small round shrubs of dark slate-teal leaves,",
    "training_dummy": "A timber post at night: an upright dark brown timber post with a round grey sackcloth head, a horizontal crossbar with a round padded sack at each end, and crossed timber feet,",
    "archery_range": "A practice ground at night: round straw targets painted with red and cream rings, each standing on "
                     "three dark brown timber legs, in front of a row of upright dark brown timber posts joined by a "
                     "crossbar, with a low timber rail fence, a bare wooden gate frame and a short wooden stump,",
    "quarry": "A stone quarry at night: a stepped cliff face of dull slate-grey cut stone terraces in flat fills, the faces "
              "turned right in deep obsidian shadow, squared grey stone blocks stacked at its foot, and dark brown "
              "timber poles with a coil of rope,",
    # The fire is a bed of coals below the hearth's rim: the flame itself is drawn and animated by
    # the app (forge_fire, §5.7), and nine attempts showed a painted flame lights the wall beside it.
    "forge": "A village blacksmith's forge at night: a dressed-stone workshop under a red-brown tiled "
             "gabled roof, a wooden door and small windows glowing warm pale amber, a tall stone "
             "chimney rising from the roof, and beside it on the flagstone base an open stone hearth "
             "holding a low bed of orange forge coals below its stone rim, and an iron anvil on a "
             "wooden block.",
    # L1-T10 (Klein attempt 3): the stone's colour named, Klein painted it saturated blue (L1-T08).
    # L1-T11 (attempt 4): the cap's colour named, attempt 3 painted it salmon pink.
    "windmill": "A village windmill at night: a round tower of cold, desaturated grey dressed stone with a conical timber "
                "cap in a muted, desaturated red-brown terracotta, a "
                "wooden door at its foot, a small window glowing warm pale amber, and a bare wooden axle "
                "sticking out of the cap toward the viewer, on a low flagstone base. The sails are a "
                "separate piece: the axle ends in a bare round hub.",
    # L2-T04: the beginnings family. Parts named, colours named; the flame is drawn by the app, so
    # the fire is a bed of coals, as at the forge. Each stage's growth is told in STAGE_OWN.
    "campfire": "A village campfire at night: a ring of dull slate-grey dressed stones, flat fills without any blue tint, the faces turned right in deep obsidian shadow, around a clearly visible low bed of bright orange "
                "coals, a tripod of three dark brown timber poles leaning together above the coals, a fallen "
                "dark brown log lying beside the ring, a small dark brown wooden stump, and a short grey stone "
                "pillar standing at the back and a low grey stone wall along the front,",
    "tent": "A traveller's tent at night: a ridge tent of dull, desaturated slate grey-blue canvas in flat fills with no gradient, its long right-hand slope in deep obsidian-blue shadow and its left gable pale with moonlight, pulled tight "
            "over two dark brown timber poles, held by taut ropes tied to small wooden pegs, with a dark "
            "doorway in its left gable, a small wooden crate and a small wooden barrel beside it,",
    "well": "A village well at night: a round wall of slate-grey dressed stones around a dark water mouth, two "
            "dark brown timber posts carrying a gabled timber roof, a winch axle with a rope and a small wooden "
            "bucket, on a flat square base,",
    "farm": "A village farm at night: a small low farmhouse with plastered walls in a pale muted brown under a "
            "gabled roof, a wooden door and small windows glowing warm pale amber, four plain rectangular "
            "beds of dark brown tilled soil with raised timber edges, a low timber fence along the front, a cone "
            "of grey grain, and a small timber outbuilding, on a flat square base,",
    "windmill_sails": "Four bare windmill sails seen flat and face-on: four identical wooden lattice "
                      "frames with canvas stretched over them, at right angles to each other around "
                      "a round wooden hub, perfectly symmetric.",
    "watchtower": "A wooden village watchtower: four tall timber legs with cross-bracing, a ladder, and "
                  "a railed lookout platform high at the top under a small pointed roof.",
    "grove": "A small grove: three leafy trees of different heights growing from a patch of grass.",
    "rocks": "A cluster of three grey boulders of different sizes with a few tufts of grass.",
}


# --- budget ----------------------------------------------------------------------------------


def ceiling() -> tuple[float, str]:
    """The last `<date> BUDGET_FLUX_V1: <number>` line under `## Lignes` of VALIDATIONS.md (the
    examples above that heading hold one too), else 40. Read at each use, so a line Guillaume adds
    mid-session applies to the next batch."""
    text = VALIDATIONS.read_text(encoding="utf-8") if VALIDATIONS.is_file() else ""
    _, found, lines = text.partition("\n## Lignes")
    value, source = DEFAULT_CEILING, f"default {DEFAULT_CEILING:g} (no BUDGET_FLUX_V1 line in {VALIDATIONS.name})"
    for line in lines.splitlines() if found else []:
        if "BUDGET_FLUX_V1:" in line:
            raw = line.split("BUDGET_FLUX_V1:", 1)[1].strip()
            try:
                value = float(raw.replace(",", "."))
            except ValueError:
                sys.exit(f"{VALIDATIONS.name}: {line.strip()!r} is not a number; ask Guillaume to fix the line")
            source = f"{VALIDATIONS.name}: {line.strip()}"
    if not math.isfinite(value) or value <= 0:
        sys.exit(f"BUDGET_FLUX_V1 is {value} ({source}): a finite ceiling above 0 is required")
    env = os.environ.get("BUDGET_FLUX_V1")
    if env is not None:
        try:
            same = float(env) == value
        except ValueError:
            same = False
        if not same:
            sys.exit(f"!! env BUDGET_FLUX_V1={env} disagrees with the ceiling {value:g} ({source}). The ceiling is "
                     f"read from {VALIDATIONS.name} only: unset the variable.")
    return value, source


def credits() -> float:
    request = urllib.request.Request("https://api.bfl.ai/v1/credits", headers={"x-key": flux.load_key()})
    with urllib.request.urlopen(request, timeout=30) as response:
        return float(json.loads(response.read())["credits"])


def ledger() -> dict:
    if BUDGET.is_file():
        return json.loads(BUDGET.read_text(encoding="utf-8"))
    return {"initial_credits": None, "reserved": 0.0, "real": 0.0, "probe_real": 0.0, "batches": []}


def save_ledger(data: dict) -> None:
    """Atomic: a crash mid-write leaves the previous ledger, never half of one."""
    BUDGET.parent.mkdir(parents=True, exist_ok=True)
    tmp = BUDGET.with_name(BUDGET.name + ".tmp")
    tmp.write_text(json.dumps(data, indent=2) + "\n")
    os.replace(tmp, BUDGET)


@contextlib.contextmanager
def locked():
    """Every read-modify-write of the ledger holds this, so two `candidates` runs cannot both
    reserve the last dollars or overwrite each other's settle."""
    BUDGET.parent.mkdir(parents=True, exist_ok=True)
    with open(BUDGET.with_name("budget.lock"), "w") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        yield


def spent(data: dict) -> float:
    """What counts: the larger of the summed `cost` fields and the balance drop (the reconciliation).
    Pass the `v1` block for V1 spend; the top level is the POC's."""
    return max(data["real"], data.get("by_balance", 0.0))


def start_v1() -> None:
    """Write the V1 start marker once, with the live balance as its initial credits."""
    with locked():
        data = ledger()
        if "v1" in data:
            sys.exit(f"V1 already started at {data['v1']['started']}")
        balance = credits()
        data["v1"] = {"started": time.strftime("%Y-%m-%d %H:%M"), "initial_credits": balance, "balance": balance,
                      "reserved": 0.0, "real": 0.0, "by_balance": 0.0, "alert_ack": 0, "batches": []}
        save_ledger(data)
    print(json.dumps({k: v for k, v in data["v1"].items() if k != "batches"}, indent=2))


def checkpoint(v1: dict, limit: float) -> str:
    return (f"checkpoint: V1 spent {spent(v1):.2f} $ of {limit:.2f} $,{len(v1['batches'])} batches; "
            f"tell the team lead, then `iso_loop.py budget ack`")


def ack() -> None:
    """Run by the team lead only, after the checkpoint (team rule, not enforced here)."""
    with locked():
        data = ledger()
        v1 = data["v1"]
        v1["alert_ack"] = int(spent(v1) // ALERTE_FLUX)
        save_ledger(data)
    print(f"acknowledged up to {v1['alert_ack'] * ALERTE_FLUX:.0f} $")


def klein_ack() -> None:
    """Lift a Klein billing stop, and clear reservations left by a batch that never settled (killed
    by SIGTERM or SIGKILL, which skip the `finally`). Run by the team lead only, with no batch in
    flight, after reading the gap (team rule, not enforced here), like `budget ack`."""
    with locked():
        data = ledger()
        stop = data["v1"].pop("klein_stop", None)
        orphans = {"v1": data["v1"]["reserved"], **data.get("reserved_by_probe", {})}
        data["v1"]["reserved"] = 0.0
        data["reserved_by_probe"] = {probe: 0.0 for probe in data.get("reserved_by_probe", {})}
        save_ledger(data)
    print(f"Klein billing stop lifted: {stop}; orphan reservations cleared: {orphans}")


def reserve(n: int, each: float, label: str, probe: str | None) -> dict:
    """`probe` names the top-level ledger key of a POC probe this batch counts against, or None."""
    limit, source = ceiling()
    if n < 1:
        sys.exit(f"{n} candidates: at least 1")
    with locked():
        data = ledger()
        v1 = data.get("v1")
        if v1 is None:
            sys.exit("no V1 start marker in budget.json: run `iso_loop.py budget start-v1` first")
        amount = math.ceil(round(n * each * 100, 6)) / 100  # up to the cent: never under the cost
        if int(spent(v1) // ALERTE_FLUX) > v1["alert_ack"]:
            sys.exit("alert stop, " + checkpoint(v1, limit))
        if v1.get("klein_stop"):
            sys.exit(f"Klein billing stop: {v1['klein_stop']}; tell the team lead, then `iso_loop.py budget klein-ack`")
        if spent(v1) + v1["reserved"] + amount > limit:
            sys.exit(f"hard stop: {spent(v1):.2f} spent + {v1['reserved']:.2f} reserved + {amount:.2f} > {limit} ({source})")
        cap = PROBE_CAPS.get(probe, PROBE_MAX)
        # A probe's batches still in flight count too, so two runs at once cannot both fit under it.
        in_flight = data.setdefault("reserved_by_probe", {})
        if probe and data.get(probe, 0.0) + in_flight.get(probe, 0.0) + amount > cap:
            sys.exit(f"probe budget {probe}: {data.get(probe, 0.0):.3f} spent + {in_flight.get(probe, 0.0):.2f} "
                     f"reserved + {amount:.2f} > {cap}")
        if probe:
            in_flight[probe] = round(in_flight.get(probe, 0.0) + amount, 4)
        v1["reserved"] = round(v1["reserved"] + amount, 4)
        save_ledger(data)
    return {"label": label, "amount": amount, "probe": probe, "ceiling": limit, "ceiling_source": source}


def settle(batch: dict, responses: list) -> dict:
    with locked():
        data = ledger()
        v1 = data["v1"]
        cost = sum(float(r.get("cost") or 0) for r in responses) / 100  # 1 credit = 0.01 $
        v1["reserved"] = round(max(0.0, v1["reserved"] - batch["amount"]), 4)
        v1["real"] = round(v1["real"] + cost, 4)
        if batch["probe"]:
            data[batch["probe"]] = round(data.get(batch["probe"], 0.0) + cost, 4)
            in_flight = data.setdefault("reserved_by_probe", {})
            in_flight[batch["probe"]] = round(max(0.0, in_flight.get(batch["probe"], 0.0) - batch["amount"]), 4)
        # Klein billed otherwise than its published tier: a stop kept in the ledger, so a rerun or a
        # batch that raised in flight cannot slip past it; only `budget klein-ack` lifts it.
        stop = None
        if batch.get("expected") is not None:
            billed = [round(float(r.get("cost") or 0) / 100, 4) for r in responses]
            if any(abs(b - batch["expected"]) > 1e-6 for b in billed):
                stop = v1["klein_stop"] = f"Klein billed {billed} $ per image, expected {batch['expected']} $ ({batch['label']})"
        # Written now, before the network read below: a Ctrl-C there must not lose the cost, the
        # freed reservation or the stop.
        save_ledger(data)
        try:
            balance = credits()
        except Exception as error:  # the reconciliation is a stop condition, not a nicety
            save_ledger(data)
            sys.exit(f"credits read failed after {batch['label']}: {error}; generation stopped")
        # A rise is a top-up, never spend: move the starting point up by it, so the drop stays V1 spend.
        # Only a rise counts (a balance lagging one batch is not a top-up); its size is measured
        # against the balance this batch's cost should have left, since the top-up hid that drop.
        previous = v1.get("balance", v1["initial_credits"])
        if balance > previous:
            topup = round(balance - (previous - cost * 100), 4)
            v1["initial_credits"] = round(v1["initial_credits"] + topup, 4)
            v1.setdefault("topups", []).append({"credits": topup, "at": time.strftime("%Y-%m-%d %H:%M")})
        v1["balance"] = balance
        v1["by_balance"] = round((v1["initial_credits"] - balance) / 100, 4)
        gap = abs(v1["by_balance"] - v1["real"])
        entry = {"label": batch["label"], "posts": len(responses), "cost": round(cost, 4),
                 "input_mp": [r.get("input_mp") for r in responses], "output_mp": [r.get("output_mp") for r in responses],
                 "balance": balance, "ceiling": batch["ceiling"], "ceiling_source": batch["ceiling_source"],
                 "at": time.strftime("%Y-%m-%d %H:%M")}
        if v1["real"] and gap > 0.02 * max(v1["real"], v1["by_balance"]):
            entry["mismatch"] = f"balance says {v1['by_balance']:.4f}, cost fields say {v1['real']:.4f}"
        if stop:
            entry["klein_stop"] = stop
        v1["batches"].append(entry)
        save_ledger(data)
    if int(spent(v1) // ALERTE_FLUX) > v1["alert_ack"]:
        print(checkpoint(v1, batch["ceiling"]))  # the next reserve() refuses until `budget ack`
    return entry


# --- candidates ------------------------------------------------------------------------------


def guard_endpoint(endpoint: str | None = None) -> None:
    """`endpoint` is a per-call model (the FLUX 3 variants); the default is FLUX_ENDPOINT. Klein is
    not accepted here: its own batches pass through their own variants and never name it."""
    endpoint = endpoint or flux.ENDPOINT
    if not endpoint.endswith(("flux-2-pro-preview", "/flux-3-image")):
        sys.exit(f"FLUX endpoint is {endpoint}; the V1 runs on flux-2-pro-preview and flux-3-image only, a model change is Guillaume's")
    if flux.ENDPOINT != endpoint and not flux.ENDPOINT.endswith("flux-2-pro-preview"):
        sys.exit(f"FLUX_ENDPOINT is {flux.ENDPOINT}; unset it, the variant names its own model")
    if "FLUX_SEED_SALT" in os.environ:
        sys.exit("FLUX_SEED_SALT is set; seeds here are spaced by attempt, unset it")


def subject_of(slug: str) -> tuple[str, str | None]:
    base, _, stage = slug.rpartition("_")
    if stage in A_STAGES and base in SUBJECTS:
        return base, stage
    return slug, None


A_STAGES = ("rough", "solid", "grand")


SLUG_EXTRA.update({
    "pieces/decor_arbre_a": "The leaves are a dark blue-tinged pine green, far from any bright green. The crown is drawn as separate leaf clumps with thick black outlines: the left side of each clump is paler, the right side is in deep shadow, so it is not lit everywhere.",
    "pieces/decor_arbre_b": "Every outline is thick, solid black ink, including the edge of each tier, and each tier shows rows of needle strokes in black ink.",
    "pieces/decor_arbre_c": "The crowns are clumpy leaf masses with scalloped edges and thick black outlines, not smooth lampshade shapes; the right side of each crown is in deep shadow.",
    "pieces/decor_bosquet_b": "The leaves are matt flat deep forest green with no shiny highlight, and no green line follows the outlines.",
    "pieces/decor_rochers_b": "Every face of every boulder is outlined with its own thick black ink line. The tops of the boulders are pale warm grey, not cyan, and their right faces are in deep shadow.",
})
SLUG_EXTRA.update({
    "pieces/decor_bosquet_a": "Exactly four separate rounded bushes as in image 1: one taller bush standing above three lower ones, leaving gaps between them.",
    "pieces/decor_rochers_a": "Exactly three angular boulders as in image 1: one tall boulder and two small ones at its left, no other stones.",
    "high_road_rough": "The road is plain dirt between two low rock heaps, the signpost stands clear of them, and the ground is a flat dull olive-brown.",
})
SLUG_EXTRA.update({
    # L6-T01 review f4: one sentence per stage for the next attempt.
    "watchtower_rough": "The roof is in shade, a dark muted red-brown with no bright highlight, and the platform has no bright specks.",
    "watchtower_solid": "The four timber legs are thick and stout, and the stone footings are plain flat grey blocks with no bright specks or sparkles.",
    "fountain_rough": "Every outline is a crisp, sharp, solid black line, with no blur and no soft edge anywhere.",
    "observatory_solid": "No soft shadow or dark gradient lies on the slab: the slab is one uniform flat grey with a hard clean edge.",
    "dragon_lair_rough": "The rock heap is a bold, simple, tall dark silhouette with one large dark cave mouth, readable at a small size.",
    "heroes_hall_solid": "No shadow of the poles, the columns or the hall lies on the ground slab.",
    "heroes_hall_grand": "The gable walls are cool pale blue-grey stone with no orange on them: the only orange is inside the windows and the two round shields.",
    "champion_arena_rough": "No shadow lies under the stakes: the ground inside and outside the ring is one flat colour.",
    "high_road_solid": "The stone paving is neutral warm grey with no blue or mauve tint, and the gateway is dark warm brown timber with a pitched plank roof.",
    "high_road_grand": "The stone paving is neutral warm grey with no blue or mauve tint, and the signpost is dark warm brown timber.",
    "champion_arena_grand": "Every stone block and arch is drawn with its own thick black ink line, and the red-brown cones of the two towers are the warmest colour.",
})


# L6-T01, the pieces (decor, water, scaffolds): one subject per piece, parts named, no function word.
_WATER = ("A square tile of calm dark slate-teal water at night, perfectly flat and matt with no highlight, ripple or foam, "
          "{curb}, ")
PIECES = {
    "decor_arbre_a": "A single broadleaf oak tree at night: a thick straight dark brown trunk carrying one round, full crown of deep forest-green leaf clumps,",
    "decor_arbre_b": "A single fir tree at night: three stacked tiers of deep forest-green needles narrowing to a point, on a short dark brown stump,",
    "decor_arbre_c": "A single birch tree at night: a slender pale grey trunk with black bark marks and a small grey stone at its foot, carrying two rounded crowns of deep olive-green leaf clumps,",
    "decor_bosquet_a": "A cluster of rounded shrubs at night: one taller rounded bush above three low rounded bushes, all dense dark slate-teal leaves,",
    "decor_bosquet_b": "A small cluster at night: three small trees on thin dark brown trunks with rounded crowns and one low round bush, all dark slate-teal leaves,",
    "decor_rochers_a": "A cluster of angular slate-grey boulders of different sizes with flat faces, and a few small stones,",
    "decor_rochers_b": "A low group of angular slate-grey boulders with flat faces, one large and two small, and a small stone,",
    "eau_canal_droit": _WATER.format(curb="held by a low curb of pale grey stone blocks along two opposite sides"),
    "eau_canal_angle": _WATER.format(curb="held by a low curb of pale grey stone blocks along two adjacent sides"),
    "eau_canal_berge": _WATER.format(curb="held by a low curb of pale grey stone blocks along one side and bare earth on another"),
    "eau_canal_pont": _WATER.format(curb="crossed by a small dark brown timber footbridge of planks with two low railings"),
    "eau_cascade_bord": _WATER.format(curb="with a curb of pale grey stone blocks and a few small upright grey stones"),
    "eau_cascade_chute": "A low ledge of slate-grey stone blocks over which calm dark slate-teal water falls in a few flat vertical bands into a still pool,",
    "echafaudage_1x1": "An open scaffold frame at night: slender dark brown timber poles at the four corners joined by crossbars and diagonal braces, "
                       "two plank platforms and a ladder, with nothing inside,",
    "echafaudage_2x2": "A large open scaffold frame at night: slender dark brown timber poles around a square joined by crossbars and diagonal braces, "
                       "two plank platforms, a ladder and short ropes, with nothing inside,",
}
for _name, _text in PIECES.items():
    SUBJECTS[f"pieces/{_name}"] = _text
    WARM[f"pieces/{_name}"] = "nothing"
    FLAT_FAMILY.add(f"pieces/{_name}")
    NEUTRAL_FAMILY.add(f"pieces/{_name}")


# T25: the totem statues. Neutral pale stone so the app can tint it (wood, bronze, gold); parts named, no function word.
_STATUE = ("A carved statue of {what}, in light cream-beige limestone, carved with smooth rounded sculpted surfaces and no blocky facets, standing on a low "
           "octagonal plinth of the same light stone, ")
STATUES = {
    "statue_ours": "a standing bear on four stout legs, with a heavy rounded head, small round ears and a thick hunched shoulder",
    "statue_hermine": "a long low slender weasel with a short pointed muzzle, small round ears, a long body held low and a thin tail with a dark tip",
    "statue_saumon": "a single fish, slightly arched, with its head up and its tail below, with a small fin on each side, a high fin on its back and a forked tail, resting on the plinth",
    "statue_cerf": "a standing stag on four slender legs, with a raised head and a tall branching pair of antlers",
    "statue_cheval": "a standing horse on four slender legs, with a long arched neck, a flowing mane and a long tail",
    "statue_sanglier": "a standing wild boar on four short legs, with a heavy sloped back, a bristled ridge along it, a long snout and two curved tusks",
}
for _name, _what in STATUES.items():
    SUBJECTS[f"pieces/{_name}"] = _STATUE.format(what=_what)
    WARM[f"pieces/{_name}"] = "nothing"
    FLAT_FAMILY.add(f"pieces/{_name}")
    NEUTRAL_FAMILY.add(f"pieces/{_name}")


# L6-T01 redo of six (Guillaume, 2026-10-30), attempt 4: one sentence per slug on the defect the fresh eye named.
SLUG_EXTRA.update({
    "archery_range_rough": "The ground slab is one flat matt brown surface with a clean hard edge, with no grain, no texture and no shadow on it; every outline is thick black ink.",
    "druid_grove_rough": "Every outline is firm, thick black ink of constant width, and each stone meets the flat ground directly, with no hatching or shading around its foot.",
    "observatory_rough": "The dome is dark blue-grey slate plates, each separated by a thick black ink line, and the plaster is not white.",
    "fountain_rough": "The water is a dark matte slate-teal and the stones are dull warm grey, with no bright blue, no white speck and no highlight anywhere.",
    "dragon_lair_rough": "The cave mouth is a large, clean, black arch in the front face of the rock, with a few pale bones lying before it and a warm orange glow deep inside.",
    "high_road_solid": "The road passes between a short stone marker post and a low timber signboard with two arrow boards; nothing is built over the road and no beam or lintel crosses it.",
})
STAGE_OWN.update({
    ("observatory", "rough"): "This is its earliest and roughest form: a round tower of grey stone with a dome of dark blue-grey slate plates, a timber beam across its slit, a plank door, on bare dark umber-brown ground.",
    ("high_road", "solid"): "This is its sound, everyday form: a stone-paved road with a short stone marker post and a low timber signboard with two arrow boards beside it, and a few short stone posts, on a base of grey flagstones.",
})


def prompt_for(slug: str, variant: str) -> str:
    base, stage = subject_of(slug)
    background = BACKGROUNDS[variant if variant in BACKGROUNDS else ""]
    parts = [PREAMBLE.format(background=background, warm=WARM.get(base, "nothing else")), SUBJECTS[base]]
    if stage:
        parts.append(STAGE_OWN.get((base, stage)) or STAGE[stage])
    if base in FLAT_FAMILY:
        parts.append(FLAT)
    if base in NEUTRAL_FAMILY:
        parts.append(NEUTRAL)
    if base in NOSHADOW_FAMILY and variant == "w5gp":
        parts.append(NOSHADOW)
    if base in NOSHADOW_FAMILY and base != "castle_wall" and variant == "w5gp":
        parts.append(NOMAUVE)
    if slug in SLUG_EXTRA and variant == "w5gp":
        parts.append(SLUG_EXTRA[slug])
    parts.append(ISO_STYLE)
    return " ".join(parts)


def triptych_prompt(building: str) -> str:
    return (
        PREAMBLE.format(background=BACKGROUNDS[""], warm=WARM.get(building, "nothing else")).replace("this object", "these three objects")
        + " Image 1 shows the same building three times side by side, at three stages of growth, "
        "left to right: rough, solid, grand. Paint all three in their places, as one family. "
        + SUBJECTS[building] + " Left: " + STAGE["rough"] + " Middle: " + STAGE["solid"]
        + " Right: " + STAGE["grand"] + " " + ISO_STYLE
    )


def triptych_ref(building: str) -> pathlib.Path:
    out = L.RENDERS / f"{building}_triptych.png"
    import subprocess

    subprocess.run(["magick", *[str(L.RENDERS / f"{building}_{s}.png") for s in A_STAGES], "+append",
                    *L.REPRODUCIBLE, str(out)], check=True)
    return out


def candidate_dir(slug: str) -> pathlib.Path:
    path = L.WORK / slug
    path.mkdir(parents=True, exist_ok=True)
    return path


# T41 round 2: what FLUX 3 adds to each sprite, said by its visible parts (a name promises its
# function: no "magic", no "festival"). Colours frank but matt, never neon; light only on the
# magical and festive parts; no violet.
F3_COMMON = (
    "Image 1 is a flat blockout that fixes the silhouette and the camera angle; image 2 is the finished night painting "
    "of the same building. Repaint image 2 keeping its exact shape, framing and thick black ink outline style, every part "
    "in the same place and at the same size, on a flat studio backdrop of pure chroma green (#00FF00) that fills the "
    "picture to every edge; the building meets that green in a thick black ink line, with no lighter fringe or green "
    "outline along its edge. ADD the following, painted in the same hand with thick black ink outlines and flat "
    "cel-shaded fills: {add} The colours of these additions are frank and matt, like gouache, never fluorescent. "
    "Everything else keeps the muted night palette of image 2: warm greys, browns, deep greens and dull gold. "
    "No purple, violet, mauve or lavender anywhere; the shadows are warm charcoal brown. The ground base stays bare "
    "and flat, with no painted cast shadow, no texture laid over it and no white outline. The hearths, the windowpanes "
    "and {glow} shine softly; nothing else shines. The artwork is unsigned and wordless."
)
F3_ADD = {  # slug -> (parts added, what may shine)
    "champion_arena_grand": ("Long cloth pennants in crimson red, deep teal blue and warm yellow, flat matt cloth, flying from the "
                             "top of each turret; at the centre of the arena, a golden trophy cup on a stone pedestal beside a tall "
                             "standard pole with a cloth flag.", "the little pennant tips"),
    "farm_rough": ("In each square plot of the farm, young sprouts in dull deep green on dark umber soil.", "the lit windows"),
    "farm_solid": ("In each square plot of the farm, rows of growing crops in dull deep green with a few ears of wheat in muted straw ochre.", "the lit windows"),
    "farm_grand": ("In each square plot of the farm, dense rows of crops in dull deep green with plenty of ears of wheat in muted straw ochre, on dark umber soil.", "the lit windows"),
    "tent_grand": ("Strings of small triangular pennants in crimson red, mustard yellow and deep teal blue; a garland of small "
                   "round lanterns in warm amber hung along the tent; a tall wooden mast beside the tent flying a cloth banner.", "the lanterns"),
    "wizard_tower_grand": ("A wide timber balcony jutting out of the upper part of the tower, in dark umber wood against the pale stone, "
                           "with a railing of vertical balusters and a floor of planks, clearly visible from outside; on the point "
                           "of the roof, a crescent moon of gold metal with a small star beside it.", "the crescent moon and the star"),
}


def f3_prompt(slug: str) -> str:
    add, glow = F3_ADD[slug]
    return F3_COMMON.format(add=add, glow=glow)


def f3_refs(slug: str) -> tuple[pathlib.Path, pathlib.Path]:
    """The blockout on green, then the sprite as the app draws it today, on the same green."""
    return L.RENDERS / f"{slug}.green.png", L.WORK / "t41p" / slug / "current_on_green.png"


def candidates(slug: str, attempt: int, variant: str = "", n: int = CANDIDATES) -> None:
    f3 = variant in FLUX3_VARIANTS
    guard_endpoint(FLUX3 if f3 else None)
    triptych = variant.endswith("triptych")
    if triptych:
        ref, size = triptych_ref(slug), (L.ISO["triptych"]["w"], L.ISO["triptych"]["h"])
        prompt, each = triptych_prompt(slug), RESERVE["triptych"]
    elif f3:
        info = json.loads((L.RENDERS / f"{slug}.anchor.json").read_text(encoding="utf-8"))
        ref, size = f3_refs(slug), tuple(info["size"])
        prompt, each = f3_prompt(slug), RESERVE["flux3"]
    else:
        info = json.loads((L.RENDERS / f"{slug}.anchor.json").read_text(encoding="utf-8"))
        ref = L.RENDERS / {"legacy": f"{slug}.dark.png", "v5l": f"{slug}.dark.png", "s2": f"{slug}.green.png",
                           "w5g": f"{slug}.green.png", "w5gk": f"{slug}.green.png", "w5gp": f"{slug}.green.png"}.get(variant, f"{slug}.png")
        size = tuple(info["size"])
        prompt, each = prompt_for(slug, variant), RESERVE["image"]
    klein = variant in KLEIN_VARIANTS
    if klein:
        each = max(RESERVE["klein"], klein_price(*size))
    probe = (("klein_prod_real" if variant == "w5gp" else "klein_trial_real") if klein
             else "probe_real" if (slug, variant) in {("forge_solid", ""), ("forge_solid", "legacy"), ("forge", "triptych")}
             else "probe2_real" if (slug, variant) == ("forge_solid", "s2")
             else "probe3_real" if (slug, variant) in {("forge_solid", "v5"), ("forge_solid", "v5l"), ("forge", "v5triptych")}
             else None)
    prefix = f"{variant}a{attempt}" if variant else f"a{attempt}"
    out_dir = candidate_dir(slug)
    outs = [out_dir / f"{prefix}_c{i}.png" for i in range(n)]
    if any(o.exists() for o in outs):
        sys.exit(f"{prefix} of {slug} already exists: an attempt is never re-rolled in place")
    # v5: both backgrounds draw the same seeds, so the comparison is the background alone.
    base_seed = flux.seed_for(slug + ("_v5" if variant.startswith("v5") else "_w5" if variant.startswith("w5") else f"_{variant}" if variant else ""))
    expected = klein_price(*size) if klein else None  # settle() checks each `cost` against it
    batch = reserve(n, each, f"{slug} {prefix}", probe)
    batch["expected"] = expected
    responses: list = []
    seconds: dict = {}

    def paint(i: int, out: pathlib.Path) -> None:
        start = time.monotonic()
        # Klein's schema refuses `disable_pup` (its upsampler has no switch); FLUX.2 pro keeps it.
        flux.generate(slug=slug, prompt=prompt, out=out, width=size[0], height=size[1], attempts=1,
                      seed=base_seed + 1000 * attempt + i, references=ref if f3 else (ref,),
                      extra=None if klein else {"width": size[0], "height": size[1]} if f3 else {"disable_pup": True}, submitted_log=responses,
                      endpoint=KLEIN if klein else FLUX3 if f3 else None)
        seconds[out] = round(time.monotonic() - start, 1)  # submit to downloaded, polling included

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            futures = [pool.submit(paint, i, out) for i, out in enumerate(outs)]
            for future in futures:
                future.result()
    finally:
        # A render failing in flight (IncompleteRead, OSError, Ctrl-C) still frees the reservation
        # and books what was already billed: `responses` holds every accepted submission.
        entry = settle(batch, responses)
    for out in outs:
        if not out.exists():
            continue
        side = json.loads(out.with_suffix(".json").read_text(encoding="utf-8"))
        original = flux.ORIGINALS / side["signed_original"]["file"]
        with Image.open(original) as image:
            side["original_size"] = list(image.size)
        side["seconds"] = seconds.get(out)
        out.with_suffix(".json").write_text(json.dumps(side, indent=2, ensure_ascii=False))
    print(json.dumps({"made": [o.name for o in outs if o.exists()], "batch": entry, "prompt": prompt}, indent=2))
    if entry.get("klein_stop"):
        sys.exit(f"!! {entry['klein_stop']}: stop and report")


# --- audit -----------------------------------------------------------------------------------


def candidate_files(slug: str, prefix: str) -> list[pathlib.Path]:
    return sorted(p for p in candidate_dir(slug).glob(f"{prefix}_c?.png"))


def audit(slug: str, attempt: int, variant: str = "") -> dict:
    prefix = f"{variant}a{attempt}" if variant else f"a{attempt}"
    results = {}
    if variant.endswith("triptych"):
        return audit_triptych(slug, attempt, variant)
    for path in candidate_files(slug, prefix):
        side = json.loads(path.with_suffix(".json").read_text(encoding="utf-8"))
        kwargs = {}
        if variant in ("legacy", "v5l"):
            import cutout

            copy = path.with_name(path.stem + ".flood.webp")
            Image.open(path).convert("RGB").save(copy, "WEBP", quality=100)
            share = cutout.cut_out(copy, cutout.FAMILIES["emblems"])
            kwargs = {"precut": copy, "background": L.ISO["background"]["legacy"], "clip": variant == "v5l"}
            side["flood_cleared"] = share
        elif variant.startswith("s2"):
            kwargs = {"background": L.ISO["background"]["green"], "clip": True}
        elif variant == "v5":
            # §5.6: whatever falls outside the silhouette is the app's (a painted moon, a cast shadow).
            kwargs = {"clip": True}
        result = A.audit(path, slug, side.get("original_size"), registered_out=path.with_name(path.stem + ".cut.png"), **kwargs)
        results[path.stem] = result
        print(f"{path.stem}: {'PASS' if result['pass'] else 'fail'}  " + ", ".join(
            f"{k}={c['value']}{'' if c['pass'] else ' ✗'}" for k, c in result["checks"].items() if k != "size"))
    (candidate_dir(slug) / f"{prefix}_audit.json").write_text(json.dumps(results, indent=2) + "\n")
    return results


def clean_residue(image: Image.Image) -> tuple[Image.Image, int]:
    """L6-T01: green-key residue (mint, cyan) left in the voids of a cut, which despill misses in
    open frames and bushes. Deterministic chain step run on the cut BEFORE registration and audit A
    (`recut`), so the image shipped is the image audited: opaque pixels of a strong green to cyan
    hue within 7 px of transparency are cleared. Returns the image and the number cleared."""
    image = image.convert("RGBA")
    r, g, b, a = image.split()
    h, sat, val = image.convert("RGB").convert("HSV").split()
    hue = h.point(lambda v: 255 if 57 <= v <= 142 else 0)  # 80 to 200 degrees
    strong = ImageChops.multiply(sat.point(lambda v: 255 if v > 100 else 0), val.point(lambda v: 255 if v > 50 else 0))
    greener = ImageChops.subtract(g, r).point(lambda v: 255 if v > 25 else 0)
    mint = ImageChops.multiply(ImageChops.multiply(hue, strong), ImageChops.multiply(greener, a.point(lambda v: 255 if v > 0 else 0)))
    void = a.point(lambda v: 255 if v < 40 else 0).filter(ImageFilter.MaxFilter(15))
    kill = ImageChops.multiply(mint, void)
    count = sum(1 for v in kill.get_flattened_data() if v)
    if count:
        image.putalpha(ImageChops.subtract(a, kill))
    return image, count


def recut(slug: str, attempt: int, variant: str) -> dict:
    """Guillaume's adaptive cut (2026-10-28): key on the background measured on the signed original.

    Same audit, same thresholds; only the key colour changes, and the cut is clipped to the
    blockout's silhouette (it clears the painted moons). Results go beside the first ones, never
    over them: `<prefix>_audit_adaptive.json` and `<id>.adaptive.cut.png`.
    """
    prefix = f"{variant}a{attempt}" if variant else f"a{attempt}"
    results = {}
    for path in candidate_files(slug, prefix):
        side = json.loads(path.with_suffix(".json").read_text(encoding="utf-8"))
        original = flux.ORIGINALS / side["signed_original"]["file"]
        background = A.measure_background(original)
        precut, cleared = A.key(Image.open(original).convert("RGB"), background), 0
        if not slug.startswith("pieces/") or slug == "pieces/decor_bosquet_b":  # (bosquet_b: green line between cones, L6-T01 f7) teal leaves and water are legitimate green-cyan: the clean would punch holes in them
            precut, cleared = clean_residue(precut)
        precut_file = path.with_name(path.stem + ".precut.png")
        precut.save(precut_file)
        result = A.audit(original, slug, side.get("original_size"),
                         registered_out=path.with_name(path.stem + ".adaptive.cut.png"),
                         precut=precut_file, background=background, clip=True)
        result["background"] = background
        result["residue_cleared_px"] = cleared
        results[path.stem] = result
        failed = [k for k, c in result["checks"].items() if not c["pass"]]
        print(f"{path.stem}: bg {background} {'PASS' if result['pass'] else 'fail'} {failed}")
    (candidate_dir(slug) / f"{prefix}_audit_adaptive.json").write_text(json.dumps(results, indent=2) + "\n")
    return results


def audit_triptych(building: str, attempt: int, variant: str = "triptych") -> dict:
    """Each third of a triptych is cut out and audited as the sprite of its stage."""
    prefix = f"{variant}a{attempt}"
    results = {}
    third = L.ISO["canvases"]["building2x2"]["w"]
    for path in candidate_files(building, prefix):
        side = json.loads(path.with_suffix(".json").read_text(encoding="utf-8"))
        whole = Image.open(path).convert("RGB")
        for index, stage in enumerate(A_STAGES):
            slug = f"{building}_{stage}"
            piece = path.with_name(f"{path.stem}_{stage}.png")
            whole.crop((index * third, 0, (index + 1) * third, whole.height)).save(piece)
            original = side.get("original_size")
            size = [original[0] // 3, original[1]] if original and original[0] % 3 == 0 else original
            result = A.audit(piece, slug, size, registered_out=piece.with_name(piece.stem + ".cut.png"))
            results[piece.stem] = result
            print(f"{piece.stem}: {'PASS' if result['pass'] else 'fail'}  " + ", ".join(
                f"{k}={c['value']}{'' if c['pass'] else ' ✗'}" for k, c in result["checks"].items() if k != "size"))
    (candidate_dir(building) / f"{prefix}_audit.json").write_text(json.dumps(results, indent=2) + "\n")
    return results


# --- sheet -----------------------------------------------------------------------------------


def font(size: int):
    # Pillow's built-in face has no accents: "référence" came out as boxes.
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size)
    except OSError:
        return ImageFont.load_default(size=size)


def checker(size, square=16) -> Image.Image:
    image = Image.new("RGB", size, (200, 200, 200))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], square):
        for x in range((y // square) % 2 * square, size[0], 2 * square):
            draw.rectangle((x, y, x + square - 1, y + square - 1), fill=(150, 150, 150))
    return image


def on(background, sprite: Image.Image) -> Image.Image:
    base = background(sprite.size) if callable(background) else Image.new("RGB", sprite.size, background)
    base.paste(sprite, (0, 0), sprite)
    return base


def weakest_ink(cut: Image.Image, n=4, tile=64) -> list[tuple[int, int]]:
    """Centres of the `n` tiles where the inner ring is least black: where a reviewer should look."""
    mask = A.binary(cut.getchannel("A"))
    ring = A.ImageChops.subtract(mask, A.erode(mask, A.T["ink_ring_px"]))
    luma = cut.convert("RGB").convert("L", (0.2126, 0.7152, 0.0722, 0))
    dark = luma.point(lambda v: 255 if v / 255 < A.T["ink_luma"] else 0)
    ink = A.ImageChops.darker(dark, ring)
    scores = []
    for y in range(0, cut.height - tile + 1, tile):
        for x in range(0, cut.width - tile + 1, tile):
            box = (x, y, x + tile, y + tile)
            total = A.count(ring.crop(box))
            if total >= 40:
                scores.append((A.count(ink.crop(box)) / total, x + tile // 2, y + tile // 2))
    scores.sort()
    return [(x, y) for _, x, y in scores[:n]]


def label(image: Image.Image, text: str, colour=(0, 0, 0)) -> Image.Image:
    face = font(22)
    width = max(image.width, round(ImageDraw.Draw(image).textlength(text, font=face)) + 12)
    out = Image.new("RGB", (width, image.height + 36), (255, 255, 255))
    out.paste(image, (0, 36))
    ImageDraw.Draw(out).text((6, 6), text, fill=colour, font=face)
    return out


def fit(image: Image.Image, box: int) -> Image.Image:
    scale = min(1.0, box / max(image.size))
    return image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.LANCZOS)


def grid(tiles: list[Image.Image], columns: int, gap=12) -> Image.Image:
    rows = [tiles[i : i + columns] for i in range(0, len(tiles), columns)]
    width = max(sum(t.width for t in row) + gap * (len(row) - 1) for row in rows)
    height = sum(max(t.height for t in row) for row in rows) + gap * (len(rows) - 1)
    page = Image.new("RGB", (width, height), (255, 255, 255))
    y = 0
    for row in rows:
        x = 0
        for tile in row:
            page.paste(tile, (x, y))
            x += tile.width + gap
        y += max(t.height for t in row) + gap
    return page


AMBIANCE = "nuit"  # V1 paints the night only (isoSpec.json `ambiances`)


def sprite_path(slug: str) -> pathlib.Path:
    """A staged slug `<building>_<stade>` ships under isoSpec.json `nomImage`, the name the app's
    `nomImage()` reads; its tap mask is the same stem in `.json`. A piece without a stage (the
    windmill's sails, a decor) has no name in the spec yet and keeps `<slug>.webp`."""
    building, _, stage = slug.rpartition("_")
    if not building or stage not in A_STAGES:
        return L.SPRITES / f"{slug}.webp"
    name = L.ISO["nomImage"].replace("<slug>", building).replace("<stade>", stage).replace("<ambiance>", AMBIANCE)
    return L.SPRITES / name


def accepted_stages(slug: str) -> list[tuple[str, pathlib.Path]]:
    base, stage = subject_of(slug)
    if not stage:
        return []
    return [(f"{base}_{s}", sprite_path(f"{base}_{s}")) for s in A_STAGES
            if s != stage and sprite_path(f"{base}_{s}").exists() and accepted(f"{base}_{s}")]


def accepted(slug: str) -> bool:
    meta = sprite_path(slug).with_suffix(".json")
    return meta.exists() and json.loads(meta.read_text(encoding="utf-8")).get("source") == "flux"


def sheet(slug: str, attempt: int, variant: str = "", only: list[str] | None = None) -> list[pathlib.Path]:
    """Deterministic pages of 1600 px at most: a Read of anything larger is shrunk on display."""
    prefix = f"{variant}a{attempt}" if variant else f"a{attempt}"
    out_dir = candidate_dir(slug)
    cuts = sorted(out_dir.glob(f"{prefix}_c?*.cut.png"))
    if only:
        cuts = [c for c in cuts if c.name.split(".")[0] in only]
    pages = []

    first = [label(fit(Image.open(L.RENDERS / f"{subject_slug(slug, c)}.png").convert("RGB"), 700),
                   f"blockout {subject_slug(slug, c)} (forme, angle, emprise)") for c in cuts[:1]] if cuts else []
    if variant.endswith("triptych"):
        first = [label(fit(Image.open(L.RENDERS / f"{slug}_{s}.png").convert("RGB"), 500), f"blockout {slug}_{s} (forme, angle, emprise)")
                 for s in A_STAGES]
    for name, path in accepted_stages(slug):
        first.append(label(fit(on((255, 255, 255), Image.open(path).convert("RGBA")), 500), f"déjà accepté : {name}"))
    for ref, caption in STYLE_REFS:
        first.append(label(fit(on((11, 15, 25), Image.open(L.ROOT / ref).convert("RGBA")), 420), caption))
    pages.append(grid(first, 3))

    grass = L.hex_rgb(L.raw_colour("isoGrass"))
    for cut_path in cuts:
        cid = cut_path.name.split(".")[0]
        subject = subject_slug(slug, cut_path)
        cut = Image.open(cut_path).convert("RGBA")
        spots = weakest_ink(cut)
        # A pink or pale fringe only shows on dark: the crops go on the night ground too.
        for name, background in (("fond clair", (238, 238, 238)), ("damier", checker), ("sol de nuit", grass)):
            crops = []
            for x, y in spots:
                box = (max(0, x - 48), max(0, y - 48), min(cut.width, x + 48), min(cut.height, y + 48))
                piece = cut.crop(box)
                crops.append(label(on(background, piece).resize((piece.width * 2, piece.height * 2), Image.NEAREST), f"x2 @{x},{y}"))
            reduced = cut.resize((round(cut.width * 0.3), round(cut.height * 0.3)), Image.LANCZOS)
            tiles = [label(fit(on(background, cut), 1100), f"{cid} taille réelle, {name}"),
                     grid([grid(crops, 2), label(on((11, 15, 25), reduced), "vue réduite 30 %", (0, 0, 0))], 1)]
            pages.append(grid(tiles, 2))
        patch = night_patch(cut, subject)
        pages.append(label(fit(patch, 1560), f"{cid} posé au centre d'un sol de nuit 4x4, ombre portée et flaque calculées, 100 %"))
        small = patch.resize((round(patch.width * 0.3), round(patch.height * 0.3)), Image.LANCZOS)
        pages.append(grid([label(small, f"{cid} sur le sol de nuit, vue réduite 30 %"),
                           same_hand(cut, subject, cid)], 2))
    paths = []
    for index, page in enumerate(pages):
        page = fit(page, 1600)
        path = out_dir / f"{prefix}_sheet{index}.png"
        page.save(path)
        paths.append(path)
    print("\n".join(map(str, paths)))
    return paths


TIER6_HOUSE = (215, 200, 320, 370)  # a half-timbered house of tier_6, in its 800 px preview


def tier6_crop() -> Image.Image:
    image = Image.open(L.ROOT / "assets/images/village/tier_6.webp").convert("RGB")
    s = image.width / 800
    return image.crop(tuple(round(v * s) for v in TIER6_HOUSE))  # never enlarged


def same_hand(cut: Image.Image, subject: str, cid: str) -> Image.Image:
    """The candidate brought to a tier_6 building's size (footprint ~200 px), beside one."""
    info = json.loads((L.RENDERS / f"{subject}.anchor.json").read_text(encoding="utf-8"))
    fw, fh = L.ISO["canvases"][info["canvas"]]["footprint"] or (1, 1)
    if not (fw + fh):  # L6-T01: the waterfall piece has a [0, 0] footprint
        fw, fh = 1, 1
    scale = 200 / (L.ISO["S"] * (fw + fh) / 2)
    box = cut.getbbox() or (0, 0, cut.width, cut.height)
    small = cut.crop(box).resize((max(1, round((box[2] - box[0]) * scale)), max(1, round((box[3] - box[1]) * scale))), Image.LANCZOS)
    return grid([label(on((11, 15, 25), small), f"{cid} à l'échelle de tier_6"),
                 label(tier6_crop(), "tier_6, recadrage non agrandi : lumière, couleurs et trait")], 2)


def night_patch(sprite: Image.Image, subject: str, cells: int = 4) -> Image.Image:
    """The sprite at the centre of a cells x cells night ground, as the app will draw it (§3.2, §5.6).

    Flat cel tones from rawColors.ts, the cast shadow and the contact shadow in the grass's
    shadow tone (one union, never darker where two overlap), the amber pools on top, the
    island's cliff and ink edge. Pillow, not the app: the app's version is phase 2.
    """
    info = json.loads((L.RENDERS / f"{subject}.anchor.json").read_text(encoding="utf-8"))
    canvas = L.ISO["canvases"][info["canvas"]]
    fw, fh = canvas["footprint"] if canvas["footprint"][0] else (1, 1)
    S = L.ISO["S"]
    ox, oy, cliff = cells * S // 2, 520, 48  # oy: room above for a grand stage's chimney
    width, height = cells * S, oy + cells * S // 2 + cliff + 8
    col = {k: L.hex_rgb(L.raw_colour(k)) for k in ("isoGrass", "isoGrassAlt", "isoGrassShadow", "isoCliff",
                                                   "isoCliffShadow", "isoAmberPool", "isoInk")}
    ink = L.ISO["lineThicknessPx"]

    def at(gx, gy):
        return (ox + (gx - gy) * S / 2, oy + (gx + gy) * S / 4)

    page = Image.new("RGB", (width, height), L.hex_rgb(L.raw_colour("bgDark")))
    draw = ImageDraw.Draw(page)
    left, bottom, right = at(0, cells), at(cells, cells), at(cells, 0)
    draw.polygon([left, bottom, (bottom[0], bottom[1] + cliff), (left[0], left[1] + cliff)], fill=col["isoCliff"])
    draw.polygon([bottom, right, (right[0], right[1] + cliff), (bottom[0], bottom[1] + cliff)], fill=col["isoCliffShadow"])
    for gx in range(cells):
        for gy in range(cells):
            draw.polygon([at(gx, gy), at(gx + 1, gy), at(gx + 1, gy + 1), at(gx, gy + 1)],
                         fill=col["isoGrass"] if (gx + gy) % 2 == 0 else col["isoGrassAlt"])
    # Shadows: one mask (a union), clipped to the island, then filled once in the shadow tone.
    shift = ((cells - fw) / 2, (cells - fh) / 2)
    island = Image.new("L", page.size, 0)
    ImageDraw.Draw(island).polygon([at(0, 0), right, bottom, left], fill=255)
    shade = Image.new("L", page.size, 0)
    sd = ImageDraw.Draw(shade)
    for poly in info["shadow"]:
        sd.polygon([at(x + shift[0], y + shift[1]) for x, y in poly["grid"]], fill=255)
    grow = 4 * 3 / (S / 2)  # 4 dp at 3 px per dp, in cells along a diamond edge
    sd.polygon([at(shift[0] - grow, shift[1] - grow), at(shift[0] + fw + grow, shift[1] - grow),
                at(shift[0] + fw + grow, shift[1] + fh + grow), at(shift[0] - grow, shift[1] + fh + grow)], fill=255)
    page.paste(col["isoGrassShadow"], (0, 0, *page.size), ImageChops.darker(shade, island))
    for pool in info["pools"]:
        pool_mask = Image.new("L", page.size, 0)
        ImageDraw.Draw(pool_mask).polygon([at(x + shift[0], y + shift[1]) for x, y in pool["grid"]], fill=255)
        page.paste(col["isoAmberPool"], (0, 0, *page.size), ImageChops.darker(pool_mask, island))
    draw.line([left, bottom, right], fill=col["isoInk"], width=ink)
    draw.line([left, (left[0], left[1] + cliff), (bottom[0], bottom[1] + cliff), (right[0], right[1] + cliff), right],
              fill=col["isoInk"], width=ink)
    draw.line([bottom, (bottom[0], bottom[1] + cliff)], fill=col["isoInk"], width=ink)
    draw.line([left, at(0, 0), right], fill=col["isoInk"], width=ink)
    corner = at(shift[0] + fw, shift[1] + fh)
    anchor = info["anchor"]
    page.paste(sprite, (round(corner[0] - anchor[0]), round(corner[1] - anchor[1])), sprite)
    return page


def subject_slug(slug: str, cut_path: pathlib.Path) -> str:
    """A triptych piece is named `..._c0_<stage>`: its blockout is that stage's."""
    stem = cut_path.name.split(".")[0]
    for stage in A_STAGES:
        if stem.endswith(f"_{stage}") and not slug.endswith(stage):
            return f"{slug}_{stage}"
    return slug


# --- review ----------------------------------------------------------------------------------


def review(slug: str, attempt: int, kind: str, variant: str = "", ids: str = "") -> None:
    """Print the frozen prompt with its three fields filled; nothing else goes to the reviewer."""
    prefix = f"{variant}a{attempt}" if variant else f"a{attempt}"
    record = candidate_dir(slug) / f"{prefix}_review.json"
    if record.exists():
        sys.exit(f"{record} exists: one review per (slug, attempt), whatever the sheet")
    pages = sorted(candidate_dir(slug).glob(f"{prefix}_sheet*.png"))
    text = REVIEW_PROMPT.read_text(encoding="utf-8").split("\n---\n", 1)[1].strip()
    ids = ids or ", ".join(sorted({p.name.split(".")[0] for p in candidate_dir(slug).glob(f"{prefix}_c?*.cut.png")}))
    text = (text.replace("<TYPE>", kind).replace("<CHEMINS>", ", ".join(map(str, pages)))
            .replace("<IDENTIFIANTS>", ids))
    (candidate_dir(slug) / f"{prefix}_review.prompt.txt").write_text(text + "\n")
    print(text)


def record_review(slug: str, attempt: int, verdict_file: str, variant: str = "") -> None:
    prefix = f"{variant}a{attempt}" if variant else f"a{attempt}"
    record = candidate_dir(slug) / f"{prefix}_review.json"
    if record.exists():
        sys.exit(f"{record} exists: one review per (slug, attempt)")
    verdict = json.loads(pathlib.Path(verdict_file).read_text(encoding="utf-8"))
    pages = sorted(candidate_dir(slug).glob(f"{prefix}_sheet*.png"))
    record.write_text(json.dumps({"verdict": verdict, "sheets": {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                                                                 for p in pages}}, indent=2, ensure_ascii=False) + "\n")
    print(record)


# --- accept / stand-ins ----------------------------------------------------------------------


def tap_mask(rgba: Image.Image, step=8) -> dict:
    """One bit per 8x8 block, set if any pixel there is opaque: generous by up to 8 px at the edge."""
    a = A.binary(rgba.getchannel("A"))
    w, h = (rgba.width + step - 1) // step, (rgba.height + step - 1) // step
    small = a.resize((w, h), Image.BOX).point(lambda v: 255 if v > 0 else 0)
    rows = ["".join("1" if small.getpixel((x, y)) else "0" for x in range(w)) for y in range(h)]
    return {"step": step, "w": w, "h": h, "rows": rows}


def write_sprite(slug: str, rgba: Image.Image, source: str) -> pathlib.Path:
    info = json.loads((L.RENDERS / f"{slug}.anchor.json").read_text(encoding="utf-8"))
    out = sprite_path(slug)
    out.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(out, "WEBP", quality=90, method=6)
    meta = {"slug": slug, "source": source, "size": info["size"], "anchor": info["anchor"],
            "canvas": info["canvas"], "mask": tap_mask(rgba)}
    for key in ("pivot", "sailsScale"):
        if key in info:
            meta[key] = info[key]
    out.with_suffix(".json").write_text(json.dumps(meta) + "\n")
    if out.stat().st_size > 2 * 1024 * 1024:
        print(f"!! {out} is over 2 MB: the hook refuses it, keep it in ~/.cache and link it")
    return out


def prep_blockout(slug: str) -> None:
    rgba = Image.open(L.RENDERS / f"{slug}.rgba.png").convert("RGBA")
    out = write_sprite(slug, rgba, "blockout")
    flux._record(str(out.relative_to(L.ROOT)), {
        "derived_from": f"scripts/iso/blockouts/renders/{slug}.rgba.png",
        "how": "our own Blender blockout, used as a stand-in until the painting is accepted",
        "licence": "CC BY-SA 4.0, made for this repository",
    })
    print(out)


def parse_review(spec: str) -> dict:
    """`--review <file>:<pass|fail|none>[:<item,item>]` -> the provenance `review` field (fresh-eye verdict, L2-T13)."""
    file, verdict, items = (spec.split(":") + ["", ""])[:3]  # shortcut: no colon in the file path
    if verdict not in ("pass", "fail", "none"):
        sys.exit(f"--review {spec}: verdict must be pass, fail or none")
    return {"verdict": verdict, "failed_items": [i for i in items.split(",") if i], "file": file}


def accept(slug: str, candidate: str, by: str | None = None, human: str | None = None, review: str | None = None) -> None:
    """Ship a candidate that passed (A), with its provenance. `by` names a human who accepted it in
    place of the fresh review (Guillaume, forge_solid, 2026-10-28). `human` (the reason) lets a named human
    accept a candidate that failed audit (A): the override, its reason and its date go in the provenance (L2-T09)."""
    building, _, stage = slug.rpartition("_")
    folder = candidate_dir(slug if not candidate.startswith("triptych") else building)
    prefix = candidate.rsplit("_c", 1)[0]
    stem = candidate.split("_")[0] + "_" + candidate.split("_")[1]
    # The adaptive cut (key on the measured backdrop) is the method since 2026-10-28.
    adaptive = (folder / f"{candidate}.adaptive.cut.png").exists()
    cut_path = folder / (f"{candidate}.adaptive.cut.png" if adaptive else f"{candidate}.cut.png")
    if not cut_path.exists():
        sys.exit(f"no cut for {candidate}")
    entry = json.loads((folder / f"{stem}.json").read_text(encoding="utf-8"))
    # A Klein candidate ships like a FLUX.2 pro one: its API outputs fall under the same BFL
    # Developer Terms (L1-R01, research/klein-licence.md); the sidecar already names its model.
    audit_file = folder / (f"{prefix}_audit_adaptive.json" if adaptive else f"{prefix}_audit.json")
    result = json.loads(audit_file.read_text(encoding="utf-8"))[candidate]
    if not result["pass"] and not (human and by):
        sys.exit(f"{candidate} failed audit (A); it cannot be accepted (a named human: `accept <slug> <candidate> <name> --human \"<reason>\"`)")
    rgba = Image.open(cut_path).convert("RGBA")
    out = write_sprite(slug, rgba, "flux")
    key = result.get("background", L.ISO["background"]["key"])
    entry.update({
        "cutout": f"global ΔE76 key on the backdrop {key} measured on the signed original, below {A.T['key_de']}, "
                  f"soft ring to {A.T['soft_de']}, despilled, clipped to the blockout silhouette grown by {A.T['clip_px']} px",
        "registration": result["registration"],
        "reencoded": "WebP q90 with alpha (scripts/iso/iso_loop.py accept)",
        "edited": False,
    })
    if by:
        entry["accepted_by"] = by
    if human and not result["pass"]:
        entry["human_override"] = {"reason": human, "date": time.strftime("%Y-%m-%d"),
                                   "audit_failed": sorted(k for k, c in result["checks"].items() if not c["pass"])}
    if result.get("residue_cleared_px") is not None:
        entry["residue_cleaned"] = {"px": result["residue_cleared_px"], "audited_after": True}
    if review:
        entry["review"] = parse_review(review)
    if candidate.startswith("triptych"):
        entry["triptych_third"] = stage
    flux.record(str(out.relative_to(L.ROOT)), entry)
    print(f"accepted {candidate} -> {out.relative_to(L.ROOT)}")
    if stage in A_STAGES:
        areas = [json.loads((L.RENDERS / f"{building}_{s}.anchor.json").read_text()) and A.count(A.binary(
            Image.open(sprite_path(f"{building}_{s}")).convert("RGBA").getchannel("A")))
            for s in A_STAGES if accepted(f"{building}_{s}")]
        print(f"growth {areas}: {'ok' if A.growth_ok(areas) else 'FAILS rough < solid < grand'}")


def budget() -> None:
    data = ledger()
    try:
        balance_now = credits()
    except Exception as error:
        balance_now = f"unreadable: {error}"
    v1 = data.get("v1")
    poc = {k: v for k, v in data.items() if k not in ("batches", "v1", "reserved_by_probe", *PROBE_CAPS)}
    print("POC (not counted in V1):", json.dumps(poc), f"{len(data['batches'])} batches")
    if v1 is None:
        print("V1 not started: `iso_loop.py budget start-v1`")
    else:
        limit, source = ceiling()
        print(json.dumps({"v1_spent": spent(v1), "v1_reserved": v1["reserved"], "ceiling": limit,
                          "ceiling_source": source,
                          "left": round(limit - spent(v1) - v1["reserved"], 4), "alert_every": ALERTE_FLUX,
                          "alert_ack": v1["alert_ack"] * ALERTE_FLUX, "started": v1["started"],
                          "initial_credits": v1["initial_credits"], "balance_now": balance_now,
                          "probes": {k: f"{data.get(k, 0.0)} spent, {data.get('reserved_by_probe', {}).get(k, 0.0)} "
                                        f"reserved, of {cap}" for k, cap in PROBE_CAPS.items()},
                          "klein_stop": v1.get("klein_stop")}, indent=2))
        for batch in v1["batches"]:
            print(json.dumps(batch))


def blockout(slug: str) -> dict:
    """Render the blockout, flatten it on the key colour and on the legacy navy, write its mask."""
    L.RENDERS.mkdir(parents=True, exist_ok=True)
    rgba = L.RENDERS / f"{slug}.rgba.png"
    spec = L.BLOCKOUTS / f"{slug}.json"
    if not spec.is_file():
        sys.exit(f"no blockout spec {spec}")
    info = L.blender(spec, rgba, socle_shadow=False)  # the image FLUX is given: no base-top shadow (L2-T03)
    L.flatten(rgba, L.RENDERS / f"{slug}.png", L.ISO["background"]["key"])
    L.flatten(rgba, L.RENDERS / f"{slug}.dark.png", L.ISO["background"]["legacy"])
    L.flatten(rgba, L.RENDERS / f"{slug}.green.png", L.ISO["background"]["green"])
    L.alpha(rgba).point(lambda a: 255 if a >= 128 else 0).save(L.RENDERS / f"{slug}.mask.png")
    shutil.move(rgba.with_suffix(".anchor.json"), L.RENDERS / f"{slug}.anchor.json")
    shutil.move(rgba.with_suffix(".classes.png"), L.RENDERS / f"{slug}.classes.png")
    print(json.dumps(info))
    return info


# --- T22: ground tiles (streets, stream), painted 16 to a sheet ------------------------------
#
# A street or stream cell is a flat diamond, so its image 1 is a colour guide drawn here rather than
# a Blender blockout: 16 tiles on one 2048 px Klein canvas (0.014 $ an image), one tile per set of
# open edges, so a sheet's tiles share one hand and one palette. The 3 candidates of a sheet are the
# 3 variants. The cut is geometric: the surface (road or water) is opaque, the grass around a road
# fades out (the app's grass shows through), a stream keeps its banks, and every surface fades to
# transparent over the last FONDU cell before an open edge, where the app draws a flat underlay of
# the surface colour: two pieces meet in that flat colour, never edge to edge, so no seam.
# Edge names as in components/village/iso/pieces.ts: n = -gy, s = +gy, o = -gx, e = +gx.

SOL = L.WORK / "sol"
SOL_CELL, SOL_COLS, SOL_TILE = 512, 2, (384, 256)  # tile: the diamond (384 x 192) and 64 px above it
SOL_ORIGIN = (64, 128)  # the tile's top left inside its 512 px cell
FONDU, GRASS_FADE, BANK = 0.10, 0.10, 0.09  # in cells
EDGE_MID = {"n": (0.5, 0.0), "s": (0.5, 1.0), "o": (0.0, 0.5), "e": (1.0, 0.5)}
_ALL = [s for k in range(1, 5) for s in ("".join(c) for c in itertools.combinations("nsoe", k))]
SOL_FAMILIES = {
    "rue_terre": {"surface": "isoChemin", "width": 0.46, "tiles": _ALL + ["plein"],
                  "what": "a path of packed ochre-brown earth with a few small flat pebbles and some paler worn patches"},
    "rue_pierres": {"surface": "isoRueEmpierree", "width": 0.60, "tiles": _ALL + ["plein"],
                    "what": "a lane of packed ochre earth set with flat, rounded beige-brown sandstone cobbles"},
    "rue_pavee": {"surface": "isoRuePave", "width": 0.74, "tiles": _ALL + ["plein"],
                  "what": "a paving of large flat pale grey-beige flagstones fitted closely together"},
    "ruisseau": {"surface": "isoEauVive", "width": 0.56,
                 "tiles": ["n", "s", "o", "e", "ns", "oe", "no", "ne", "so", "se", "nso", "nse", "noe", "soe", "pont_ns", "pont_oe"],
                 "what": "calm clear deep-blue water, flat, with a few soft pale-blue ripples"},
}
# Attempt 1 (16 tiles on 2048 px) failed: Klein drew its own 4 x 7 grid of 28 slabs, the guide's
# layout ignored (as the triptych did, KNOWLEDGE). Attempt 2 changes the layout only: 4 tiles on a
# 1024 px canvas (0.009 $ an image), so a family of 16 shapes is 4 sheets `<family><page>`.
SOL_SHEETS = {f"{name}{page + 1}": {**spec, "family": name, "tiles": spec["tiles"][4 * page : 4 * page + 4]}
              for name, spec in SOL_FAMILIES.items() for page in range(4)}


def sol_uv(x: float, y: float) -> tuple[float, float]:
    """Tile pixel -> cell-local grid (u along gx, v along gy), top vertex at (192, 64)."""
    a, b = (x - 192) / 192, (y - 64) / 96
    return (a + b) / 2, (b - a) / 2


def _seg(p, a, b) -> float:
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy or 1)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def sol_fields(sheet: str, tile: str):
    """Per tile pixel: (inside the diamond, distance to the surface's centre line, distance to the
    nearest open edge, on the bridge deck). Distances in cells."""
    edges = tile.removeprefix("pont_") if tile != "plein" else "nsoe"
    w, h = SOL_TILE
    out = []
    for y in range(h):
        for x in range(w):
            u, v = sol_uv(x + 0.5, y + 0.5)
            inside = 0 <= u <= 1 and 0 <= v <= 1
            if tile == "plein":
                centre = 0.0
            else:
                centre = min(_seg((u, v), (0.5, 0.5), EDGE_MID[e]) for e in edges)
            to_open = min({"n": v, "s": 1 - v, "o": u, "e": 1 - u}[e] for e in edges)
            deck = False
            if tile.startswith("pont_"):  # the deck crosses the water: along gx over an ns stream
                across, along = (u, v) if edges == "ns" else (v, u)
                deck = 0.06 <= across <= 0.94 and abs(along - 0.5) <= 0.2
            out.append((inside, centre, to_open, deck))
    return out


def _smooth(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def sol_masks(sheet: str, tile: str) -> tuple[Image.Image, Image.Image]:
    """(guide RGBA of the tile, alpha of the cut). Pure geometry, the same for every candidate."""
    spec = SOL_SHEETS[sheet]
    water, half = spec["family"] == "ruisseau", spec["width"] / 2
    col = {k: L.hex_rgb(L.raw_colour(k)) for k in ("isoPre", "isoTerre", "isoTerreSombre", spec["surface"])}
    w, h = SOL_TILE
    guide, cut = Image.new("RGBA", SOL_TILE, (0, 0, 0, 0)), Image.new("L", SOL_TILE, 0)
    gp, cp = guide.load(), cut.load()
    for i, (inside, centre, to_open, deck) in enumerate(sol_fields(sheet, tile)):
        x, y = i % w, i // w
        if deck:
            gp[x, y], cp[x, y] = (*col["isoTerreSombre"], 255), 255
            continue
        if not inside:
            continue
        on_surface = centre <= half
        if on_surface:
            gp[x, y] = (*col[spec["surface"]], 255)
            a = _smooth(to_open / FONDU)
            if not water:  # a road keeps none of the painted grass: it fades out inside its own edge,
                # where Klein inks the border, into the app's grass (attempt 2: ink and grass of another green)
                a *= 1 - _smooth((centre - half + GRASS_FADE) / GRASS_FADE)
        elif water and centre <= half + BANK:
            gp[x, y] = (*col["isoTerre"], 255)
            a = 1.0
        else:
            gp[x, y] = (*col["isoPre"], 255)
            a = 0.0 if not water else 1 - _smooth((centre - half - BANK) / GRASS_FADE)
        cp[x, y] = round(255 * a)
    if tile.startswith("pont_"):  # railings stand above the deck: keep 40 px over it
        deck = cut.point(lambda v: 255 if v == 255 else 0)
        lifted = Image.new("L", SOL_TILE, 0)
        for dy in range(0, 41, 4):
            lifted = ImageChops.lighter(lifted, ImageChops.offset(deck, 0, -dy))
        cut = ImageChops.lighter(cut, ImageChops.darker(lifted, Image.new("L", SOL_TILE, 255)))
    return guide, cut


def sol_box(index: int) -> tuple[int, int, int, int]:
    x = (index % SOL_COLS) * SOL_CELL + SOL_ORIGIN[0]
    y = (index // SOL_COLS) * SOL_CELL + SOL_ORIGIN[1]
    return x, y, x + SOL_TILE[0], y + SOL_TILE[1]


def sol_guide(sheet: str) -> pathlib.Path:
    out_dir = SOL / sheet
    out_dir.mkdir(parents=True, exist_ok=True)
    green = L.hex_rgb(L.ISO["background"]["green"])
    page = Image.new("RGB", (SOL_CELL * SOL_COLS,) * 2, green)
    for index, tile in enumerate(SOL_SHEETS[sheet]["tiles"]):
        guide, cut = sol_masks(sheet, tile)
        page.paste(guide, sol_box(index)[:2], guide)
        cut.save(out_dir / f"{tile}.cut.png")
        guide.save(out_dir / f"{tile}.guide.png")
    path = out_dir / "guide.png"
    page.save(path)
    print(path)
    return path


# DECISIONS 30/10 (Guillaume): street pieces carry no ink outline and no small ink strokes, so
# ISO_STYLE (thick black ink outlines) is lifted for them; this block says the rest of it again.
SOL_STYLE_RUE = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration painted without outlines: flat cel-shaded colour "
    "fills with soft-edged patches, and no ink line on the ground or around it. Hand-made pre-industrial materials, named "
    "by what they are: packed earth, sandstone, flagstone, grass. The artwork is unsigned and wordless."
)


def sol_prompt(sheet: str) -> str:
    spec = SOL_SHEETS[sheet]
    if spec["family"] == "ruisseau":
        body = (f"On each tile the blue band is {spec['what']}, held between low banks of brown earth topped with short grass "
                "and a few small grey pebbles; the green around it is a short meadow turf. Where the blue band reaches a tile edge, "
                "the water runs straight to that edge with no bank across it.")
        # Attempt 1 said this on every sheet and Klein put jetties on 8 tiles of 12 without a deck:
        # attempt 2 says it only on the sheet that has the bridges.
        if any(t.startswith("pont_") for t in spec["tiles"]):
            body += (" On the tiles where image 1 shows a dark brown deck, a small footbridge of dark brown planks with two "
                     "low timber railings crosses the water exactly there.")
    else:
        body = (f"On each tile the band is {spec['what']}; the green around it is a short meadow turf. Where the band meets the grass "
                "its edge is soft and broken by small tufts of grass, with no outline. The band is painted in soft flat tones; "
                "its texture is made of patches of colour.")
    return (
        "Image 1 is a flat colour guide of four separate diamond-shaped ground tiles laid out in a two by two grid, "
        "all seen from above in the same orthographic three-quarter view. Paint exactly these four tiles as one illustration: "
        "each tile in the same place, at the same size and with the same diamond outline as in image 1, every band running exactly "
        "where image 1 shows it and reaching the tile edges at the same points, and the colours of image 1 kept as they are. "
        f"{body} The tiles are flat ground with nothing standing on them. Cool moonlight comes from the upper left. Around and "
        f"between the tiles is {BACKGROUNDS['w5g']} that fills the whole image from edge to edge, all four corners included. "
        + (ISO_STYLE if spec["family"] == "ruisseau" else SOL_STYLE_RUE)
    )


def sol_candidates(sheet: str, attempt: int, n: int = CANDIDATES) -> None:
    guard_endpoint()
    ref = SOL / sheet / "guide.png"
    if not ref.exists():
        sys.exit(f"no guide for {sheet}: run `ground-guide {sheet}` first")
    size, slug = (SOL_CELL * SOL_COLS,) * 2, f"sol/{sheet}"
    prompt, each = sol_prompt(sheet), max(RESERVE["klein"], klein_price(*size))
    prefix = f"w5gpa{attempt}"
    outs = [SOL / sheet / f"{prefix}_c{i}.png" for i in range(n)]
    if any(o.exists() for o in outs):
        sys.exit(f"{prefix} of {sheet} already exists: an attempt is never re-rolled in place")
    batch = reserve(n, each, f"{slug} {prefix}", "klein_prod_real")
    batch["expected"] = klein_price(*size)
    responses: list = []

    def paint(i: int, out: pathlib.Path) -> None:
        flux.generate(slug=slug, prompt=prompt, out=out, width=size[0], height=size[1], attempts=1,
                      seed=flux.seed_for(slug + "_w5") + 1000 * attempt + i, references=(ref,),
                      submitted_log=responses, endpoint=KLEIN)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            for future in [pool.submit(paint, i, out) for i, out in enumerate(outs)]:
                future.result()
    finally:
        entry = settle(batch, responses)
    print(json.dumps({"made": [o.name for o in outs if o.exists()], "batch": entry, "prompt": prompt}, indent=2))
    if entry.get("klein_stop"):
        sys.exit(f"!! {entry['klein_stop']}: stop and report")


def sol_cut(sheet: str, attempt: int) -> dict:
    """Slice each candidate: key on the measured backdrop, align each tile on its guide diamond
    (a shift only, measured on the keyed silhouette), take the geometric alpha, then audit (A) each
    tile in a decor1x1 frame against its guide, the frozen audit untouched (its RENDERS pointed at
    the guides for the call)."""
    prefix, out_dir = f"w5gpa{attempt}", SOL / sheet
    renders = out_dir / "renders"
    renders.mkdir(exist_ok=True)
    frame, at = L.ISO["canvases"]["decor1x1"], (64, 448)  # tile bottom vertex (192, 256) -> anchor (256, 704)
    green = L.hex_rgb(L.ISO["background"]["green"])
    results = {}
    for index, tile in enumerate(SOL_SHEETS[sheet]["tiles"]):  # the guides as the audit's blockouts
        guide = Image.open(out_dir / f"{tile}.guide.png")
        cut = Image.open(out_dir / f"{tile}.cut.png")
        rgba = Image.new("RGBA", (frame["w"], frame["h"]), (0, 0, 0, 0))
        rgba.paste(guide, at, guide)
        a = Image.new("L", rgba.size, 0)
        a.paste(cut, at)
        rgba.putalpha(ImageChops.darker(a, rgba.getchannel("A")))
        name = f"{sheet}_{tile}"
        rgba.save(renders / f"{name}.rgba.png")
        rgba.getchannel("A").point(lambda v: 255 if v >= 128 else 0).save(renders / f"{name}.mask.png")
        cls = rgba.getchannel("A").point(lambda v: 8 if v >= 128 else 0)
        Image.merge("RGB", (cls, cls.point(lambda v: 20 if v else 0), Image.new("L", rgba.size, 0))).save(renders / f"{name}.classes.png")
        (renders / f"{name}.anchor.json").write_text(json.dumps({"canvas": "decor1x1", "anchor": [256, 704], "shadow": [], "pools": []}))
    saved, L.RENDERS = L.RENDERS, renders
    try:
        for path in sorted(out_dir.glob(f"{prefix}_c?.png")):
            side = json.loads(path.with_suffix(".json").read_text(encoding="utf-8"))
            original = flux.ORIGINALS / side["signed_original"]["file"]
            background = A.measure_background(original)
            painted = Image.open(original).convert("RGB")
            keyed = A.key(painted, background)
            for index, tile in enumerate(SOL_SHEETS[sheet]["tiles"]):
                box = sol_box(index)
                want = Image.open(out_dir / f"{tile}.guide.png").getchannel("A").point(lambda v: 255 if v else 0)
                # Klein paints each diamond larger than the guide and off its place (attempt 2: about
                # 460 px wide for 384): find the painted diamond by its widest rows (the left and right
                # vertices; tufts on top and the drop shadow below never make the widest row), then
                # scale and shift it onto the guide's diamond, whose centre is (192, 160) in the tile.
                cx0, cy0 = box[0] - SOL_ORIGIN[0], box[1] - SOL_ORIGIN[1]
                cell = A.binary(keyed.crop((cx0, cy0, cx0 + SOL_CELL, cy0 + SOL_CELL)).getchannel("A"))
                cp, spans = cell.load(), []
                for y in range(SOL_CELL):
                    xs = [x for x in range(0, SOL_CELL, 2) if cp[x, y]]
                    if xs:
                        spans.append((xs[-1] - xs[0], y, (xs[0] + xs[-1]) / 2))
                widest = max(s[0] for s in spans)
                rows = sorted(s for s in spans if s[0] >= 0.98 * widest)
                _, cy, cx = rows[len(rows) // 2]
                scale = widest / SOL_TILE[0]
                src = (cx0 + cx - 192 * scale, cy0 + cy - 160 * scale, cx0 + cx + 192 * scale, cy0 + cy + 96 * scale)
                piece = keyed.transform(SOL_TILE, Image.EXTENT, src, Image.BICUBIC)
                registered = A.binary(piece.getchannel("A"))
                alpha = ImageChops.darker(Image.open(out_dir / f"{tile}.cut.png"), piece.getchannel("A"))
                piece.putalpha(alpha)
                inter, union = A.count(ImageChops.darker(registered, want)), A.count(ImageChops.lighter(registered, want))
                shift = (round(cx - SOL_CELL / 2), round(cy - SOL_ORIGIN[1] - 160), round(scale, 3))
                cid = f"{path.stem}_{tile}"
                piece.save(out_dir / f"{cid}.tile.png")
                framed = Image.new("RGBA", (frame["w"], frame["h"]), (0, 0, 0, 0))
                framed.paste(piece, at)
                framed.save(out_dir / f"{cid}.framed.png")
                flat = Image.new("RGB", framed.size, green)
                flat.paste(framed, (0, 0), framed)
                flat.save(out_dir / f"{cid}.flat.png")
                try:
                    result = A.audit(out_dir / f"{cid}.flat.png", f"{sheet}_{tile}", None,
                                     registered_out=out_dir / f"{cid}.adaptive.cut.png",
                                     precut=out_dir / f"{cid}.framed.png", background=background, clip=True)
                except ZeroDivisionError:  # frozen palette(): no cold pixel to average on an all-surface guide (plein)
                    result = {"pass": False, "checks": {"palette": {"value": "guide without a cold pixel", "pass": False}}}
                result.update(background=background, shift=list(shift), diamond_iou=round(inter / (union or 1), 4))
                results[cid] = result
                failed = [k for k, c in result["checks"].items() if not c["pass"]]
                print(f"{cid}: shift {shift} iou {result['diamond_iou']} {'PASS' if result['pass'] else 'fail'} {failed}")
    finally:
        L.RENDERS = saved
    (out_dir / f"{prefix}_audit.json").write_text(json.dumps(results, indent=2) + "\n")
    return results


def sol_assemble(tiles: dict, grid: list[str], underlay: tuple, grass: tuple, seed: int = 7) -> Image.Image:
    """A patch of the map as the app would lay it: grass, the flat underlay of the surface under each
    surface cell, then a piece per cell, the variant picked by a hash of the cell (like varianteDecor)."""
    rows, cols = len(grid), len(grid[0])
    S = 384
    width = (rows + cols) * S // 2 + 64
    height = (rows + cols) * S // 4 + 128
    ox, oy = rows * S // 2 + 32, 96
    page = Image.new("RGB", (width, height), (11, 15, 25))
    draw = ImageDraw.Draw(page)

    def at(gx, gy):
        return (ox + (gx - gy) * S / 2, oy + (gx + gy) * S / 4)

    on = lambda x, y: 0 <= y < rows and 0 <= x < cols and grid[y][x] != "."
    for gy in range(rows):
        for gx in range(cols):
            draw.polygon([at(gx, gy), at(gx + 1, gy), at(gx + 1, gy + 1), at(gx, gy + 1)], fill=grass)
    for gy in range(rows):  # the underlay: centre to centre of linked cells, the pieces' width
        for gx in range(cols):
            if on(gx, gy):
                for dx, dy in ((1, 0), (0, 1)):
                    if on(gx + dx, gy + dy):
                        a, b = at(gx + 0.5, gy + 0.5), at(gx + 0.5 + dx, gy + 0.5 + dy)
                        draw.line([a, b], fill=underlay, width=round(tiles["_underlay"] * S * 0.447))
    for gy in range(rows):
        for gx in range(cols):
            if not on(gx, gy):
                continue
            shape = grid[gy][gx] if grid[gy][gx] not in "#~" else "".join(
                e for e, (dx, dy) in zip("nsoe", ((0, -1), (0, 1), (-1, 0), (1, 0))) if on(gx + dx, gy + dy))
            variants = tiles.get(shape, [])
            if not variants:
                continue
            h = ((gx * 73856093) ^ (gy * 19349663) ^ seed) & 0xFFFFFFFF
            piece = variants[h % len(variants)]
            top = at(gx, gy)
            page.paste(piece, (round(top[0] - 192), round(top[1] - 64)), piece)
    return page


SOL_PATCH = {  # test patches of the map: '#' or '~' = a surface cell, its shape read from its neighbours
    "rue": ["..#....", "..#....", "#######", "..#..#.", "..####.", ".....#."],
    "ruisseau": ["..~....", "..~~...", "...~...", "..~~...", "..~....", "..~~~~."],
}


def sol_surface_colour(family: str, prefix: str) -> tuple:
    """The underlay the app should draw: the median of the painted surface (fully opaque pixels on
    the guide's surface colour) over every tile of the family's candidates."""
    surface = L.hex_rgb(L.raw_colour(SOL_FAMILIES[family]["surface"]))
    pixels = []
    for s in (s for s in SOL_SHEETS if SOL_SHEETS[s]["family"] == family):
        for tile in SOL_SHEETS[s]["tiles"]:
            guide = Image.open(SOL / s / f"{tile}.guide.png").convert("RGBA").get_flattened_data()
            for f in (SOL / s).glob(f"{prefix}_c?_{tile}.tile.png"):
                data = Image.open(f).convert("RGBA").get_flattened_data()
                pixels += [d[:3] for g, d in zip(guide[::7], data[::7]) if g[:3] == surface and d[3] == 255]
    if not pixels:
        return surface
    return tuple(sorted(p[i] for p in pixels)[len(pixels) // 2] for i in range(3))


def sol_sheet(family: str, attempt: int) -> list[pathlib.Path]:
    """Review pages of a family (its 4 sheets): the guides and the style refs; per candidate index its
    16 tiles on the map's grass and four x2 crops of the tile centres; then a patch of the map
    mixing the 3 candidates by cell hash over the flat underlay, at 100 % and 30 %."""
    prefix, out_dir = f"w5gpa{attempt}", SOL / family
    out_dir.mkdir(parents=True, exist_ok=True)
    spec = SOL_FAMILIES[family]
    sheets = [s for s in SOL_SHEETS if SOL_SHEETS[s]["family"] == family]
    grass = L.hex_rgb(L.raw_colour("isoPre"))
    underlay = sol_surface_colour(family, prefix)
    first = [label(fit(Image.open(SOL / s / "guide.png").convert("RGB"), 520), f"guide {s} (forme, angle, emprise)") for s in sheets]
    for ref, caption in STYLE_REFS:
        first.append(label(fit(on((11, 15, 25), Image.open(L.ROOT / ref).convert("RGBA")), 420), caption))
    pages = [grid(first, 4)]
    # A road's underlay stays inside the opaque core (its sides fade over GRASS_FADE); a stream's
    # banks are opaque, so its underlay is the water's full width.
    by_shape: dict = {"_underlay": spec["width"] - (0 if family == "ruisseau" else 2 * GRASS_FADE)}
    for c in range(CANDIDATES):
        tiles, crops = [], []
        for s in sheets:
            for tile in SOL_SHEETS[s]["tiles"]:
                f = SOL / s / f"{prefix}_c{c}_{tile}.tile.png"
                if not f.exists():
                    continue
                piece = Image.open(f).convert("RGBA")
                by_shape.setdefault(tile, []).append(piece)
                tiles.append(label(on(grass, piece), f"{tile} ({s})"))
                if tile in ("ns", "oe", "se", "nsoe", "pont_ns"):
                    crop = on(grass, piece).crop((96, 112, 288, 208))
                    crops.append(label(crop.resize((crop.width * 2, crop.height * 2), Image.NEAREST), f"{tile} x2, centre"))
        if tiles:
            pages.append(grid([label(grid(tiles, 4), f"{prefix}_c{c} : les pièces sur l'herbe de la carte (isoPre)"), grid(crops[:4], 2)], 1))
    patch = sol_assemble(by_shape, SOL_PATCH["ruisseau" if family == "ruisseau" else "rue"], underlay, grass)
    pages.append(label(fit(patch, 1560), f"{family} {prefix} : morceau de carte, les 3 candidats mêlés par hachage de case, sous-couche plate #{bytes(underlay).hex().upper()} (médiane peinte)"))
    small = patch.resize((round(patch.width * 0.3), round(patch.height * 0.3)), Image.LANCZOS)
    pages.append(label(small, "même morceau, vue réduite 30 %"))
    paths = []
    for index, page in enumerate(pages):
        path = out_dir / f"{prefix}_sheet{index}.png"
        fit(page, 1600).save(path)
        paths.append(path)
    print("\n".join(map(str, paths)))
    return paths


# --- T22 round 2: seamless night textures (motifs.ts: terre, pierres, paves, eau) --------------
#
# Round 1's per-cell pieces failed the fresh review (daylight, soft edges, seams, checkerboard): the
# app now draws the streets and the stream as continuous shapes and fills them with a texture that
# repeats. A texture is painted once on 1024 px (image 1: a flat swatch of its target colour), then
# made seamless the way a hand would: rolled by half, so its old edges meet in a cross in the middle,
# the cross covered in green and repainted by Klein with the texture around it, and only the cross
# composited back (feathered). Its edges are then the painting's own middle, so they wrap exactly.

TEX = L.WORK / "textures"
TEX_SIZE, TEX_CROSS, TEX_FEATHER = 1024, 112, 40
TEX_STYLE = ("Painted in the hand of a dark-fantasy Franco-Belgian graphic novel at night: flat cel-shaded patches of muted, "
             "desaturated colour with soft edges, every shape drawn in colour alone. The artwork is unsigned and wordless.")
TEXTURES = {  # target mean colour (night, desaturated tones of the island ground) and the parts, named
    "terre": ("#76603F", "packed bare earth, dull ochre-brown, with faint paler worn patches and a few tiny scattered pebbles"),
    "pierres": ("#857256", "small rounded cobblestones of dull beige-brown sandstone set close together in packed earth, "
                           "about thirty cobbles across the square"),
    "paves": ("#8A8576", "large flat irregular flagstones of dull grey-beige stone fitted closely together, about eight "
                         "flagstones across the square, the narrow joints between them a slightly darker grey-brown"),
    "eau": ("#2E4A63", "calm dark water seen from straight above, a muted slate blue, with a few soft long ripples a little "
                       "darker and a little paler than the water, the palest ripple a muted grey-blue"),
}


def tex_prompt(motif: str) -> str:
    return ("Image 1 gives the exact average colour of this picture. A square, flat texture seen from straight above: only "
            f"{TEXTURES[motif][1]}, from edge to edge and corner to corner, evenly lit by soft cool moonlight, the same "
            "brightness everywhere, so that it can repeat as a tile. " + TEX_STYLE)


def tex_seam_prompt(motif: str, band: str = "pure green (#00FF00)") -> str:
    return (f"Image 1 is a square texture of {TEXTURES[motif][1]}, crossed by a flat band of plain {band} in the shape "
            "of a plus sign. Paint the same texture inside the green band so that it continues seamlessly from the texture "
            "around it on every side, with the same colours, the same size of details and the same even light, and keep "
            "everything outside the band exactly as it is in image 1. " + TEX_STYLE)


def tex_cross(size: int = TEX_SIZE, band: int = TEX_CROSS, feather: int = 0) -> Image.Image:
    """The plus-shaped band over the middle row and column; `feather` px of soft edge outside it."""
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    lo, hi = size // 2 - band // 2, size // 2 + band // 2
    d.rectangle((lo, 0, hi, size), fill=255)
    d.rectangle((0, lo, size, hi), fill=255)
    if feather:
        m = m.filter(ImageFilter.MaxFilter(2 * (feather // 2) + 1)).filter(ImageFilter.GaussianBlur(feather / 2))
        m = ImageChops.lighter(m, tex_cross(size, band))
    return m


def roll(image: Image.Image) -> Image.Image:
    return ImageChops.offset(image, image.width // 2, image.height // 2)


def tex_paint(motif: str, label_: str, outs: list[pathlib.Path], prompt: str, refs: list[pathlib.Path], salt: int) -> dict:
    guard_endpoint()
    if any(o.exists() for o in outs):
        sys.exit(f"{outs[0].name} of {motif} already exists: an attempt is never re-rolled in place")
    slug, size = f"textures/{motif}", (TEX_SIZE, TEX_SIZE)
    batch = reserve(len(outs), max(RESERVE["klein"], klein_price(*size)), f"{slug} {label_}", "klein_prod_real")
    batch["expected"] = klein_price(*size)
    responses: list = []

    def paint(i: int, out: pathlib.Path) -> None:
        flux.generate(slug=slug, prompt=prompt, out=out, width=size[0], height=size[1], attempts=1,
                      seed=flux.seed_for(slug) + salt + i, references=(refs[i],), submitted_log=responses, endpoint=KLEIN)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(outs)) as pool:
            for future in [pool.submit(paint, i, out) for i, out in enumerate(outs)]:
                future.result()
    finally:
        entry = settle(batch, responses)
    print(json.dumps({"made": [o.name for o in outs if o.exists()], "cost": entry["cost"]}))
    if entry.get("klein_stop"):
        sys.exit(f"!! {entry['klein_stop']}: stop and report")
    return entry


def tex_candidates(motif: str, attempt: int) -> None:
    out_dir = TEX / motif
    out_dir.mkdir(parents=True, exist_ok=True)
    swatch = out_dir / "swatch.png"
    Image.new("RGB", (TEX_SIZE, TEX_SIZE), L.hex_rgb(TEXTURES[motif][0])).save(swatch)
    prefix = f"w5gpa{attempt}"
    tex_paint(motif, prefix, [out_dir / f"{prefix}_c{i}.png" for i in range(CANDIDATES)], tex_prompt(motif),
              [swatch] * CANDIDATES, 1000 * attempt)


def tex_seam(motif: str, attempt: int, seam: int = 1) -> None:
    """Roll each candidate by half, cover the cross, have it repainted, composite the cross back.
    Seam pass 1 covered it in green and Klein painted moss there (a green-tinted cross on every
    texture); pass 2 changes that one thing: the cross is the texture's own target colour."""
    out_dir, prefix = TEX / motif, f"w5gpa{attempt}"
    tag = "" if seam == 1 else str(seam)
    band = L.hex_rgb(L.ISO["background"]["green"]) if seam == 1 else L.hex_rgb(TEXTURES[motif][0])
    words = "pure green (#00FF00)" if seam == 1 else f"flat colour {TEXTURES[motif][0]}, with no detail"
    cands = sorted(out_dir.glob(f"{prefix}_c?.png"))
    refs: list[pathlib.Path] = []
    for c in cands:
        rolled = roll(Image.open(c).convert("RGB").resize((TEX_SIZE, TEX_SIZE), Image.LANCZOS))
        rolled.save(c.with_name(c.stem + ".roule.png"))
        green = rolled.copy()
        green.paste(band, (0, 0, TEX_SIZE, TEX_SIZE), tex_cross())
        green.save(c.with_name(c.stem + f".croix{tag}.png"))
        refs.append(c.with_name(c.stem + f".croix{tag}.png"))
    outs = [c.with_name(c.stem + f".reprise{tag}.png") for c in cands]
    tex_paint(motif, f"{prefix} couture{tag}", outs, tex_seam_prompt(motif, words), refs, 1000 * attempt + 500 * seam)
    mask = tex_cross(feather=TEX_FEATHER)
    for c, out in zip(cands, outs):
        if not out.exists():
            continue
        rolled = Image.open(c.with_name(c.stem + ".roule.png")).convert("RGB")
        fill = Image.open(out).convert("RGB").resize((TEX_SIZE, TEX_SIZE), Image.LANCZOS)
        final = Image.composite(fill, rolled, mask)
        final.save(c.with_name(c.stem + ".1024.png"))
        final.resize((512, 512), Image.LANCZOS).save(c.with_name(c.stem + ".512.png"))
        final.resize((256, 256), Image.LANCZOS).save(c.with_name(c.stem + ".256.png"))
    tex_measure(motif, attempt)


def _seam_path(err: list[list[float]]) -> list[int]:
    """Minimum-error top-to-bottom path through `err` (rows x columns), one column per row, steps of 1."""
    h, w = len(err), len(err[0])
    cost = [row[:] for row in err]
    for y in range(1, h):
        prev = cost[y - 1]
        cost[y] = [err[y][x] + min(prev[max(0, x - 1) : x + 2]) for x in range(w)]
    path = [min(range(w), key=lambda x: cost[h - 1][x])]
    for y in range(h - 2, -1, -1):
        x = path[-1]
        path.append(min(range(max(0, x - 1), min(w, x + 2)), key=lambda c: cost[y][c]))
    return path[::-1]


def _quilt_vertical(image: Image.Image, band: int = 160, overlap: int = 40) -> Image.Image:
    """Cover the vertical seam in the middle of a rolled texture with a strip of the same texture taken
    a quarter further left (rolled, so it wraps top to bottom), its two sides cut along the path of
    least difference (image quilting, Efros and Freeman 2001): real texture over the seam, no ghost."""
    w, h = image.size
    at, src = w // 2 - band // 2, w // 4 - band // 2
    strip = ImageChops.offset(image, at - src, 0)
    luma_a, luma_b = image.convert("L").load(), strip.convert("L").load()
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    left = _seam_path([[(luma_a[at + x, y] - luma_b[at + x, y]) ** 2 for x in range(overlap)] for y in range(h)])
    right = _seam_path([[(luma_a[at + band - overlap + x, y] - luma_b[at + band - overlap + x, y]) ** 2
                         for x in range(overlap)] for y in range(h)])
    for y in range(h):
        d.line([(at + left[y], y), (at + band - overlap + right[y], y)], fill=255)
    return Image.composite(strip, image, mask.filter(ImageFilter.GaussianBlur(1.2)))


def tex_quilt(motif: str, attempt: int) -> None:
    """Attempt 1's repainted cross came back tinted (the green made Klein paint moss): seamless by
    quilting instead, no FLUX. Roll by half, quilt the vertical seam, then the horizontal one (on the
    transpose). The edges are the painting's middle, so they wrap exactly."""
    out_dir, prefix = TEX / motif, f"w5gpa{attempt}"
    for c in sorted(out_dir.glob(f"{prefix}_c?.png")):
        rolled = roll(Image.open(c).convert("RGB").resize((TEX_SIZE, TEX_SIZE), Image.LANCZOS))
        once = _quilt_vertical(rolled)
        final = _quilt_vertical(once.transpose(Image.Transpose.TRANSPOSE)).transpose(Image.Transpose.TRANSPOSE)
        final.save(c.with_name(c.stem + ".1024.png"))
        final.resize((512, 512), Image.LANCZOS).save(c.with_name(c.stem + ".512.png"))
        final.resize((256, 256), Image.LANCZOS).save(c.with_name(c.stem + ".256.png"))
    tex_measure(motif, attempt)


def tex_blend(motif: str, attempt: int, band: int = 300, feather: int = 90) -> None:
    """For the soft textures (earth, water), where Klein repaints the plain cross flat (seam pass 2)
    and quilting leaves cut steps in the ripples. The rolled painting R has its seams on the middle
    column and row. The middle column is covered by the painting rolled vertically only (continuous
    across that column, wrapping top to bottom, its own seam on the middle row), the middle row by the
    painting rolled horizontally only, and the centre by the painting itself: each cover hides the
    seam the one before leaves, through wide soft masks, and the tile's edges stay R's, so it wraps."""
    out_dir, prefix = TEX / motif, f"w5gpa{attempt}"
    s, lo, hi = TEX_SIZE, TEX_SIZE // 2 - band // 2, TEX_SIZE // 2 + band // 2

    def soft(box: tuple) -> Image.Image:
        m = Image.new("L", (s, s), 0)
        ImageDraw.Draw(m).rectangle(box, fill=255)
        return m.filter(ImageFilter.GaussianBlur(feather / 2))

    column, row = soft((lo, -s, hi, 2 * s)), soft((-s, lo, 2 * s, hi))
    centre = soft((lo, lo, hi, hi))
    for c in sorted(out_dir.glob(f"{prefix}_c?.png")):
        flat = Image.open(c).convert("RGB").resize((s, s), Image.LANCZOS)
        final = Image.composite(ImageChops.offset(flat, 0, s // 2), roll(flat), column)
        final = Image.composite(ImageChops.offset(flat, s // 2, 0), final, row)
        final = Image.composite(flat, final, centre)
        final.save(c.with_name(c.stem + ".1024.png"))
        final.resize((512, 512), Image.LANCZOS).save(c.with_name(c.stem + ".512.png"))
        final.resize((256, 256), Image.LANCZOS).save(c.with_name(c.stem + ".256.png"))
    tex_measure(motif, attempt)


def tex_accept(motif: str, attempt: int, candidate: str, by: str | None, review: str | None) -> None:
    """Ship a texture's 256 px seamless tile as `motifs/<motif>.nuit.webp` (isoSpec `nomImage`, family
    `motifs`), WebP only (no sidecar: a pattern has no anchor or tap mask), and file its provenance:
    the painting's sidecar, the seam pass's if Klein repainted the cross, and how it was made seamless."""
    out_dir, stem = TEX / motif, f"w5gpa{attempt}_{candidate}"
    tile = out_dir / f"{stem}.256.png"
    if not tile.exists():
        sys.exit(f"no 256 px texture {tile}")
    entry = json.loads((out_dir / f"{stem}.json").read_text(encoding="utf-8"))
    measures = json.loads((out_dir / f"w5gpa{attempt}_mesures.json").read_text(encoding="utf-8")).get(stem, {})
    seam = out_dir / f"{stem}.reprise2.json"
    if motif in ("terre", "eau"):
        how = ("rolled by half; the middle column covered by the painting rolled vertically only, the middle row by it rolled "
               "horizontally only, the centre by the painting itself, through soft masks (tex_blend); no second painting")
    elif seam.exists():
        how = ("rolled by half; the cross covered in the target colour and repainted by Klein (seam pass 2), the cross "
               f"composited back through a {TEX_FEATHER} px feather (tex_seam)")
        entry["seam_painting"] = json.loads(seam.read_text(encoding="utf-8"))
    else:
        how = "rolled by half; the seams quilted with a strip of the same painting cut on the least-difference path (tex_quilt)"
    out = L.SPRITES / L.ISO["nomImage"].replace("<slug>", "motifs").replace("<stade>", motif).replace("<ambiance>", AMBIANCE)
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.open(tile).convert("RGB").save(out, "WEBP", quality=90, method=6)
    entry.update({"seamless": how, "measures": {k: v for k, v in measures.items() if k != "palette"},
                  "reencoded": "1024 px seamless, Lanczos to 256 px, WebP q90 (scripts/iso/iso_loop.py texture-accept)",
                  "edited": False})
    if by:
        entry["accepted_by"] = by
    if review:
        entry["review"] = parse_review(review)
    flux.record(str(out.relative_to(L.ROOT)), entry)
    print(f"accepted {motif} {stem} -> {out.relative_to(L.ROOT)}")


def wrap_ratio(image: Image.Image) -> float:
    """Mean colour step across the wrap edges over the mean step between neighbouring rows and columns
    inside: about 1 for a texture that tiles, well above 1 for a visible seam."""
    rgb = image.convert("RGB")
    w, h = rgb.size
    px = rgb.load()

    def step(a, b):
        return sum(abs(x - y) for x, y in zip(a, b)) / 3

    edge = [step(px[w - 1, y], px[0, y]) for y in range(h)] + [step(px[x, h - 1], px[x, 0]) for x in range(w)]
    inner = [step(px[x, y], px[x + 1, y]) for y in range(0, h, 4) for x in range(w - 1)]
    inner += [step(px[x, y], px[x, y + 1]) for x in range(0, w, 4) for y in range(h - 1)]
    return round((sum(edge) / len(edge)) / ((sum(inner) / len(inner)) or 1), 3)


def tex_measure(motif: str, attempt: int) -> dict:
    """Seamlessness (wrap ratio of the 256 px texture and of the raw painting), mean colour against
    the target, saturation, share of near-white pixels (a white glint), and the frozen palette()
    measure for reference."""
    out_dir, prefix = TEX / motif, f"w5gpa{attempt}"
    results = {}
    for f in sorted(out_dir.glob(f"{prefix}_c?.256.png")):
        image = Image.open(f).convert("RGB")
        raw = Image.open(out_dir / f.name.replace(".256.png", ".png")).convert("RGB").resize((256, 256), Image.LANCZOS)
        stat = ImageStat.Stat(image)
        mean = "#{:02X}{:02X}{:02X}".format(*(round(v) for v in stat.mean))
        hsv = ImageStat.Stat(image.convert("HSV"))
        white = sum(1 for p in image.get_flattened_data() if min(p) > 200) / (256 * 256)
        results[f.name.split(".")[0]] = {
            "wrap_ratio": wrap_ratio(image), "wrap_ratio_raw": wrap_ratio(raw), "mean": mean, "target": TEXTURES[motif][0],
            "saturation_mean": round(hsv.mean[1] / 255, 3), "white_share": round(white, 5),
            "palette": A.palette(image.convert("RGBA"), openings=False)["values"],
        }
        print(f.name, json.dumps({k: v for k, v in results[f.name.split('.')[0]].items() if k != "palette"}))
    (out_dir / f"{prefix}_mesures.json").write_text(json.dumps(results, indent=2) + "\n")
    return results


APERCU = {"terre": (142, 107, 62), "pierres": (154, 127, 88), "paves": (168, 160, 138), "eau": (42, 107, 181)}
TEX_REPEAT = (192, 96)  # map units (COTE = 48 per cell): one repeat spans 4 cells, squashed 2:1 for the iso ground


def tex_on_apercu(apercu: pathlib.Path, textures: dict, px_per_unit: float = 2.0) -> Image.Image:
    """Each flat fill of the engineer's preview replaced by its texture, tiled from (0, 0) like a
    userSpaceOnUse Pattern of TEX_REPEAT map units; the soft edges keep their blend (weight by colour distance)."""
    base = Image.open(apercu).convert("RGB")
    rw, rh = round(TEX_REPEAT[0] * px_per_unit), round(TEX_REPEAT[1] * px_per_unit)
    out = base.copy()
    for motif, colour in APERCU.items():
        if motif not in textures:
            continue
        tile = textures[motif].convert("RGB").resize((rw, rh), Image.LANCZOS)
        tiled = Image.new("RGB", base.size)
        for y in range(0, base.height, rh):
            for x in range(0, base.width, rw):
                tiled.paste(tile, (x, y))
        dist = Image.new("L", base.size)
        dist.putdata([max(0, 255 - round(6 * (abs(p[0] - colour[0]) + abs(p[1] - colour[1]) + abs(p[2] - colour[2])) / 3))
                      for p in base.get_flattened_data()])
        out = Image.composite(tiled, out, dist)
    return out


def tex_sheet(motif: str, attempt: int, apercu: pathlib.Path | None = None) -> list[pathlib.Path]:
    """Per candidate: the 256 px texture at x2, the same rolled by half (a seam would show as a cross
    in the middle), a 3 x 3 mosaic at 100 %, and the mosaic squashed 2:1 as the map lays it; then the
    engineer's preview with every candidate's texture in place (one page per candidate index)."""
    out_dir, prefix = TEX / motif, f"w5gpa{attempt}"
    pages, paths = [], []
    for f in sorted(out_dir.glob(f"{prefix}_c?.256.png")):
        cid = f.name.split(".")[0]
        tex = Image.open(f).convert("RGB")
        mosaic = Image.new("RGB", (768, 768))
        for i in range(9):
            mosaic.paste(tex, (256 * (i % 3), 256 * (i // 3)))
        flat = mosaic.resize((768, 384), Image.LANCZOS)
        pages.append(grid([label(tex.resize((512, 512), Image.NEAREST), f"{cid} 256 px, x2"),
                           label(roll(tex).resize((512, 512), Image.NEAREST), "décalé de moitié (bords au centre), x2"),
                           label(mosaic, "mosaïque 3 x 3, 100 %"),
                           label(flat, "mosaïque écrasée 2:1 comme sur la carte")], 2))
        if apercu and apercu.exists():
            pages.append(label(fit(tex_on_apercu(apercu, {motif: tex}), 1560),
                               f"{cid} posé sur l'aperçu des tracés de l'ingénieur, répétition {TEX_REPEAT[0]} x {TEX_REPEAT[1]} unités de carte (4 cases)"))
    for index, page in enumerate(pages):
        path = out_dir / f"{prefix}_planche{index}.png"
        fit(page, 1600).save(path)
        paths.append(path)
    print("\n".join(map(str, paths)))
    return paths


SOL_FILE = {"rue_terre": "rue_terre", "rue_pierres": "rue_pierres", "rue_pavee": "rue_pavee", "ruisseau": "eau_ruisseau"}


def sol_accept(family: str, attempt: int, by: str | None, human: str | None, review: str | None,
               only: list[str] | None = None) -> None:
    """Ship every tile of a family's candidates (c0, c1, c2 -> variants a, b, c) as
    `pieces/<family file>_<shape>_<variant>.webp`, keyed `<rue|eau>/<rank|ruisseau>_<shape>_<variant>.nuit.webp`,
    with its sidecar and provenance. All-or-nothing: every tile is checked before any is written.
    A tile that failed (A) ships only with a named human and a reason, as `accept` (L2-T09)."""
    prefix = f"w5gpa{attempt}"
    cands = only or [f"c{i}" for i in range(CANDIDATES)]
    jobs = []
    for sheet in (s for s in SOL_SHEETS if SOL_SHEETS[s]["family"] == family):
        audits = json.loads((SOL / sheet / f"{prefix}_audit.json").read_text(encoding="utf-8"))
        for c in cands:
            side = json.loads((SOL / sheet / f"{prefix}_{c}.json").read_text(encoding="utf-8"))
            for tile in SOL_SHEETS[sheet]["tiles"]:
                cid = f"{prefix}_{c}_{tile}"
                result = audits.get(cid)
                if result is None or not (SOL / sheet / f"{cid}.tile.png").exists():
                    sys.exit(f"{family}: no cut or audit for {cid} in {sheet}")
                if not result["pass"] and not (human and by):
                    sys.exit(f"{cid} failed audit (A); name a human and a reason: "
                             "`ground-accept <family> <attempt> <name> --human \"<reason>\"`")
                jobs.append((sheet, c, tile, cid, result, side))
    for sheet, c, tile, cid, result, side in jobs:
        variant = "abc"[int(c[1:])]
        rgba = Image.open(SOL / sheet / f"{cid}.tile.png").convert("RGBA")
        out = L.SPRITES / "pieces" / f"{SOL_FILE[family]}_{tile}_{variant}.webp"
        out.parent.mkdir(parents=True, exist_ok=True)
        rgba.save(out, "WEBP", quality=90, method=6)
        meta = {"slug": f"sol/{family}/{tile}_{variant}", "source": "flux", "size": list(SOL_TILE), "anchor": [192, 256],
                "canvas": "sol1x1", "openEdges": "" if tile == "plein" else tile.removeprefix("pont_"), "mask": tap_mask(rgba)}
        out.with_suffix(".json").write_text(json.dumps(meta) + "\n")
        entry = dict(side)
        entry.update({
            "sheet": {"guide": f"~/.cache/bati-art-loop/iso/sol/{sheet}/guide.png", "tile": tile,
                      "index": SOL_SHEETS[sheet]["tiles"].index(tile)},
            "cutout": f"global ΔE76 key on the backdrop {result.get('background')} measured on the signed original; the "
                      "painted diamond scaled and shifted onto the guide's (registration); alpha from the guide's geometry "
                      f"(surface opaque, fading over {FONDU} cell before each open edge; road sides fading inside the band "
                      f"over {GRASS_FADE} cell; stream banks opaque)",
            "registration": {"shift_scale": result.get("shift"), "diamond_iou": result.get("diamond_iou")},
            "reencoded": "WebP q90 with alpha (scripts/iso/iso_loop.py ground-accept)",
            "edited": False,
        })
        if by:
            entry["accepted_by"] = by
        if human and not result["pass"]:
            entry["human_override"] = {"reason": human, "date": time.strftime("%Y-%m-%d"),
                                       "audit_failed": sorted(k for k, v in result["checks"].items() if not v["pass"])}
        if review:
            entry["review"] = parse_review(review)
        flux.record(str(out.relative_to(L.ROOT)), entry)
        print(f"accepted {sheet} {cid} -> {out.relative_to(L.ROOT)}")


def main() -> int:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    command, rest = sys.argv[1], sys.argv[2:]
    if command == "blockout":
        for slug in rest:
            blockout(slug)
    elif command == "prep-blockout":
        for slug in rest:
            prep_blockout(slug)
    elif command == "candidates":
        candidates(rest[0], int(rest[1]), rest[2] if len(rest) > 2 else "", int(rest[3]) if len(rest) > 3 else CANDIDATES)
    elif command == "recut":
        recut(rest[0], int(rest[1]), rest[2] if len(rest) > 2 else "")
    elif command == "audit":
        audit(rest[0], int(rest[1]), rest[2] if len(rest) > 2 else "")
    elif command == "sheet":
        sheet(rest[0], int(rest[1]), rest[2] if len(rest) > 2 else "", rest[3].split(",") if len(rest) > 3 else None)
    elif command == "review":
        review(rest[0], int(rest[1]), rest[2], rest[3] if len(rest) > 3 else "", rest[4] if len(rest) > 4 else "")
    elif command == "record-review":
        record_review(rest[0], int(rest[1]), rest[2], rest[3] if len(rest) > 3 else "")
    elif command == "accept":
        reason = rest[rest.index("--human") + 1] if "--human" in rest else None
        rev = rest[rest.index("--review") + 1] if "--review" in rest else None
        names = [a for a in rest[2:] if a not in ("--human", "--review", reason, rev)]
        accept(rest[0], rest[1], names[0] if names else None, reason, rev)
    elif command == "ground-guide":
        for name in rest:
            sol_guide(name)
    elif command == "ground-candidates":
        sol_candidates(rest[0], int(rest[1]))
    elif command == "ground-cut":
        sol_cut(rest[0], int(rest[1]))
    elif command == "ground-sheet":
        sol_sheet(rest[0], int(rest[1]))
    elif command == "texture-candidates":
        tex_candidates(rest[0], int(rest[1]))
    elif command == "texture-seam":
        tex_seam(rest[0], int(rest[1]), int(rest[2]) if len(rest) > 2 else 1)
    elif command == "texture-accept":
        opt = {k: rest[rest.index(k) + 1] for k in ("--by", "--review") if k in rest}
        tex_accept(rest[0], int(rest[1]), rest[2], opt.get("--by"), opt.get("--review"))
    elif command == "texture-blend":
        tex_blend(rest[0], int(rest[1]))
    elif command == "texture-quilt":
        tex_quilt(rest[0], int(rest[1]))
    elif command == "texture-measure":
        tex_measure(rest[0], int(rest[1]))
    elif command == "texture-sheet":
        tex_sheet(rest[0], int(rest[1]), pathlib.Path(rest[2]) if len(rest) > 2 else None)
    elif command == "ground-accept":
        opt = {k: rest[rest.index(k) + 1] for k in ("--human", "--review", "--only") if k in rest}
        names = [a for a in rest[2:] if a not in opt and a not in opt.values()]
        sol_accept(rest[0], int(rest[1]), names[0] if names else None, opt.get("--human"), opt.get("--review"),
                   opt["--only"].split(",") if "--only" in opt else None)
    elif command == "budget":
        {"start-v1": start_v1, "ack": ack, "klein-ack": klein_ack}.get(rest[0] if rest else "", budget)()
    else:
        sys.exit(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main())
