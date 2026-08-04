#!/usr/bin/env python3
"""Generate the boss illustrations: six monsters, and each one's legendary form.

  python3 scripts/generate-bosses.py                 # all twelve
  python3 scripts/generate-bosses.py fire_dragon     # one base painting
  python3 scripts/generate-bosses.py fire_dragon_legendary

**Square, not 2:1.** The first batch was rendered 1280x640 for the old letterboxed BossArena
(`min(width * 0.5, height * 0.28)`). The arena is now the full art-hero slot —
`sessionArtHeight = min(height * 0.42, width * 1.1)`, roughly square on a phone — so `contentFit:
"cover"` was throwing away almost half of every painting's width, wings and raised fists first.
These are 1024x1024 so the creature arrives whole.

The arena paints its own scrims: the top ~64px carries the session HUD, and a gradient covers the
lower 60% where the boss's name, the status line and the exercise chip sit. So the drama belongs in
the middle and upper half of the frame, and the lower third must stay dark and quiet.

Legendary forms are the same creature after the hero has beaten it once — the rematch spawn. Same
anatomy and silhouette so it reads as *that* monster, but ascended: burning gold, crowned in its
own element, visibly more than it was. The shared modifier keeps the transformation identical
across all six, the way generate-village.py's stage prompts do for buildings.
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, run  # noqa: E402

STYLE = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration: confident black ink "
    "outlines and flat cel-shaded colour with hard-edged shadows and high-contrast volumetric "
    "light. The palette is anchored in deep obsidian blue (#0B0F19); the creature is lit from "
    "below and rimmed in its own energy colour so it separates cleanly from the dark. A square "
    "composition filling the frame edge to edge, the creature large in the middle and upper half, "
    "the lower third kept dark and quiet, the edges falling off into darkness. No human figures "
    "anywhere in frame, no lettering, no watermark."
)

LEGENDARY = (
    "This is the creature's legendary form, returned stronger after a defeat: the same anatomy "
    "and silhouette, unmistakably the same monster, but ascended — wreathed in burning gold "
    "energy, cracks of radiant gold light running through its body, a faint crown or halo of its "
    "own element above its head, its eyes blazing white-gold, visibly more massive and more "
    "regal than before."
)

WOUNDED = (
    "This is the creature late in the fight, badly wounded but still dangerous: the same anatomy "
    "and silhouette, unmistakably the same monster, but battle-worn — deep glowing cracks and "
    "gashes torn across its body, pieces of it broken away or hanging loose, leaking light and "
    "smoke, its stance lower and more desperate, its eyes burning brighter with fury."
)

BOSSES = [
    ("fire_dragon",
     "A colossal red-scaled dragon rearing up inside a volcanic cavern, wings half-spread and "
     "filling the width of the frame, molten orange light glowing between its scales and deep in "
     "its throat, embers streaming upward past broken basalt columns, seen from a low angle that "
     "makes it tower over the viewer."),
    ("forest_titan",
     "A colossal humanoid titan built of living wood and moss standing among ancient trees, "
     "bark-plated shoulders and glowing emerald sap-light running in the seams of its body, roots "
     "trailing from its arms, drifting spores catching the light, seen from a low angle that makes "
     "it tower over the viewer."),
    ("shadow_serpent",
     "An enormous serpent of coiling darkness rising out of a black mirror-still lake, its scales "
     "drinking the light around them, violet witch-fire burning where its eyes should be, tendrils "
     "of shadow peeling off its coils into the air, seen from a low angle."),
    ("stone_golem",
     "A colossal golem of fitted grey boulders standing in a shattered quarry, red-orange magma "
     "glowing in every crack between its stones, one massive fist raised, grit and dust falling "
     "from its shoulders, seen from a low angle that makes it tower over the viewer."),
    ("wind_wraith",
     "A towering wraith of howling wind and torn grey burial cloth hanging above a storm-lashed "
     "moor, its lower body dissolving into spiralling air, pale cyan light burning where a face "
     "should be, debris and dead leaves caught spinning in its currents, seen from a low angle."),
    # The Golem finally gets its own monster — it shared stone_golem with The Guardian's Oath
    # since 0026, which read as intentional for the two wilderness campaigns sharing forest_titan
    # and not at all for a campaign literally named The Golem.
    ("iron_golem",
     "A colossal golem of riveted, rust-streaked iron plates standing in a collapsed foundry, "
     "white-hot furnace light blazing through the seams of its chest and out of its single "
     "rectangular eye slit, heavy chains hanging broken from its wrists, steam venting from its "
     "shoulder joints, seen from a low angle that makes it tower over the viewer."),
]

if __name__ == "__main__":
    items = [(slug, f"{scene} {STYLE}") for slug, scene in BOSSES]
    items += [(f"{slug}_legendary", f"{scene} {LEGENDARY} {STYLE}") for slug, scene in BOSSES]
    # ponytail: wounded forms exist for the base monsters only — a wounded legendary would double
    # the matrix again. Add them if the tier-1 fight reads flat below 50 %.
    items += [(f"{slug}_wounded", f"{scene} {WOUNDED} {STYLE}") for slug, scene in BOSSES]
    failed = run(
        items,
        out_dir=ROOT / "assets" / "images" / "bosses",
        width=1024,
        height=1024,
        quality=88,
        suffix=".jpg",
    )
    sys.exit(1 if failed else 0)
