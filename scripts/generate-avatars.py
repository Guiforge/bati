#!/usr/bin/env python3
"""Generate the 6 hero avatars.

  python3 scripts/generate-avatars.py            # all six
  python3 scripts/generate-avatars.py shadow     # just one

Two things change from the art these replace, beyond the licence (see scripts/lib/flux.py):

**Square, not 4:3.** Both places an avatar appears render it as a circle — `Avatar circular
size="$6"` in HomeHeader, a 48x48 `borderRadius: 24` Image in the settings picker. The old files
were 1024x768, so the round mask ate the sides of every one of them.

**A portrait, not a scene.** At 48 pixels a full-body hero on a landscape is a smudge. These are
framed head-and-shoulders with the face filling much of the circle, and each hero is built around
one dominant accent hue, because at that size the colour is what tells them apart before the face
does.
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, run  # noqa: E402

# Identical for all six, appended verbatim. Consistency across a set comes from the style block
# being the same characters every time, far more than from any single prompt being clever.
STYLE = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel portrait: thick, confident black ink "
    "outlines and flat cel-shaded colour fills with hard-edged shadows and no soft airbrushing. "
    "Tight head-and-shoulders framing, the face large and centred and clearly readable, shoulders "
    "cropped by the bottom edge. The background is a flat deep obsidian blue (#0B0F19) void with a "
    "soft vignette, and a crisp rim light separates the silhouette from it. Square 1:1 composition, "
    "high contrast, clean and graphic, an illustration with no lettering, no signature and no "
    "watermark anywhere in the frame."
)

AVATARS = [
    (
        "shadow",
        "A hooded assassin with a scarf drawn across the lower face, only sharp eyes and a strip "
        "of pale skin showing beneath the hood. Deep violet energy glows in the eyes and traces "
        "the seams of the dark leather hood; wisps of shadow curl off the shoulders. The "
        "expression is cold, still and watchful.",
    ),
    (
        "scout",
        "A young woman ranger with short wind-blown hair and a light hood pushed back off her "
        "head, a leather pauldron on one shoulder and a spyglass strap across her chest. Spring "
        "green energy glows faintly in her eyes and along the stitching of her collar. Her chin is "
        "lifted and she looks off to one side, alert and quick.",
    ),
    (
        "guardian",
        "A heavy-set bearded warrior in battered plate armour, a hood over the helm, jaw set hard "
        "under a grey-streaked beard. Molten amber runes burn along the shoulder plates and the "
        "same amber light glows in his eyes. Stone-solid, immovable, faintly scarred.",
    ),
    (
        "archmage",
        "An elder sorceress with long dark hair and a high-collared embroidered robe, a single "
        "arcane sigil hovering and glowing just above her brow. Arcane cyan light fills her eyes "
        "and runs through the embroidery of her collar. Her look is serene, knowing and slightly "
        "amused.",
    ),
    (
        "elder",
        "A very old sage with a long white beard, deep-lined face and a plain heavy woollen cowl. "
        "Pale gold light glows in his eyes and catches the edge of the cowl. His expression is "
        "patient and kind, the calm of someone who has already seen how this ends.",
    ),
    (
        "archer",
        "A lean marksman with a topknot and a leather bracer visible on the raised forearm, the "
        "upper limb of a longbow crossing behind one shoulder, a feather fletching brushing the "
        "cheek. Crimson energy glows in the focused eyes and along the bowstring. One eye is "
        "narrowed in aim, absolutely still.",
    ),
]

if __name__ == "__main__":
    failed = run(
        [(slug, f"{subject} {STYLE}") for slug, subject in AVATARS],
        out_dir=ROOT / "assets" / "avatar",
        width=1024,
        height=1024,
        suffix=".jpg",
    )
    sys.exit(1 if failed else 0)
