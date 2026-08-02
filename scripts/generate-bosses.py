#!/usr/bin/env python3
"""Generate the 5 boss illustrations.

  python3 scripts/generate-bosses.py                 # all five
  python3 scripts/generate-bosses.py fire_dragon

**Wide, not 4:3.** BossArena sizes its art `min(width * 0.5, height * 0.28)` across the full
screen width, which is a 2:1 letterbox on any phone. The previous art was 4:3, so `contentFit:
"cover"` was cutting the top and bottom off every boss — exactly where the head and the raised
limbs are. These are rendered 2:1 so the creature arrives whole.

The arena paints its own gradient scrim over the lower 70% of the art and lays the HP bar and
damage numbers on top, so the bottom of the frame must stay quiet: the drama belongs in the upper
two thirds, where nothing covers it.
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, run  # noqa: E402

STYLE = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration: confident black ink "
    "outlines and flat cel-shaded colour with hard-edged shadows and high-contrast volumetric "
    "light. The palette is anchored in deep obsidian blue (#0B0F19); the creature is lit from "
    "below and rimmed in its own energy colour so it separates cleanly from the dark. A wide "
    "cinematic 2:1 composition filling the frame edge to edge, the creature large in the upper two "
    "thirds with the lower third kept dark and quiet, the edges falling off into darkness. No "
    "human figures anywhere in frame, no lettering, no watermark."
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
]

if __name__ == "__main__":
    failed = run(
        [(slug, f"{scene} {STYLE}") for slug, scene in BOSSES],
        out_dir=ROOT / "assets" / "images" / "bosses",
        width=1280,
        height=640,
        quality=88,
        suffix=".jpg",
    )
    sys.exit(1 if failed else 0)
