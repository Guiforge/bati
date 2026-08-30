#!/usr/bin/env python3
"""Generate the rest-screen campfire scenes — one resting hero per avatar archetype.

  python3 scripts/generate-rest.py                       # all six
  python3 scripts/generate-rest.py rest_campfire_elder   # just one

`RestView` draws one of these at random behind the rest timer, so the family shares one scene —
a hero slumped on the same fallen log by the same small fire, pines in fog behind — and one
archetype per image, matching the six avatars of generate-avatars.py down to their accent hue
(the faint energy glow that marks the player character; villagers never glow).

The STYLE paragraph is the generate-backgrounds.py one minus its "no people" clause — the resting
hero *is* the subject — and with the face turned away or lowered, because a figure meeting the
viewer's eyes reads as a portrait, not a pause. `rest_campfire` (the guardian) was the first
render of the family and keeps its exact original wording: a re-run must reproduce the shipped
image, and the seed only holds if the prompt does too.
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, run  # noqa: E402


def style(who: str) -> str:
    return (
        "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration: confident black "
        "ink outlines and flat cel-shaded colour with hard-edged shadows. The palette is anchored "
        "in deep obsidian blue (#0B0F19), overall very dark and low in contrast with no harsh "
        "light source pointed at the viewer, the mood calm and exhausted, the scene falling off "
        "into darkness at every border. A wide 4:3 composition filling the frame edge to edge. "
        f"The {who}'s face is turned away or lowered, never looking at the viewer. No lettering "
        "and no watermark."
    )


SCENE = (
    "sitting on a fallen log beside a small campfire at night, elbows on knees, head bowed in "
    "exhausted rest, breath misting in the cold air, dark pines fading into fog behind."
)

JOBS = [
    ("rest_campfire",
     "A weary armoured warrior sitting on a fallen log beside a small campfire at night, elbows "
     "on knees, head bowed, sword planted in the earth beside them, breath misting in the cold "
     "air, dark pines fading into fog behind. " + style("warrior")),
    ("rest_campfire_scout",
     "A weary young woman ranger with short wind-blown hair, a light hood pushed back and a "
     "leather pauldron on one shoulder, " + SCENE + " Her longbow is propped against the log and "
     "a quiver rests in the grass; a faint spring-green energy glows along the stitching of her "
     "collar. " + style("figure")),
    ("rest_campfire_archmage",
     "A weary elder sorceress in a high-collared embroidered robe, long dark hair loose over her "
     "shoulders, " + SCENE + " Her staff leans against the log beside her; a faint arcane cyan "
     "light runs through the embroidery of her collar. " + style("figure")),
    ("rest_campfire_shadow",
     "A weary hooded assassin, a scarf drawn across the lower face and the hood pulled low, "
     + SCENE + " Twin daggers lie sheathed in the grass at their feet; a faint violet energy "
     "traces the seams of the dark leather hood. " + style("figure")),
    ("rest_campfire_elder",
     "A weary very old sage with a long white beard, a deeply lined face and a plain heavy "
     "woollen cowl pushed back, " + SCENE + " A gnarled wooden staff leans against the log "
     "beside him; a faint pale gold light catches the edge of the cowl. " + style("figure")),
    ("rest_campfire_archer",
     "A weary lean marksman with a topknot and a leather bracer on one forearm, " + SCENE
     + " His unstrung longbow rests across his knees and a quiver leans against the log; a faint "
     "crimson energy glows along the coiled bowstring at his belt. " + style("figure")),
]

if __name__ == "__main__":
    failed = run(
        JOBS,
        out_dir=ROOT / "assets" / "images" / "rest",
        width=1280,
        height=960,
        quality=86,
        suffix=".jpg",
    )
    sys.exit(1 if failed else 0)
