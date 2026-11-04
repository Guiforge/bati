#!/usr/bin/env python3
"""GROWTH concepts, FLUX 3 Image Klein only. Throwaway images for Guillaume's pick: never assets, nothing placed.
    klein.py pieces [--only R,T] [--try N]    each rung of farms, hamlets and roads, alone on a plain ground, 2 variations
The night prompts and `run` serve montage.py. Never overwrites. Reserve and settle through iso_loop (via bld/concepts.run), under the probe growth_klein (2 $ cap)."""
import argparse
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "bld"))
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
import concepts
from iso_loop import KLEIN, klein_price

D = ROOT / "docs/designs/village/growth/scratch"
OUT = D / "concepts"
SIZE_PIECE, SIZE_BANDE = (768, 768), (832, 1312)
PROBE = "growth_klein"

STYLE_PIECE = ("Images 1 and 2 are style references only, for ink line, light and brushwork: copy none of their shapes. "
               "Isometric 2:1 game piece seen three-quarters from above, alone on a plain pale background, hand-painted with ink outlines #0F1518, "
               "warm light from the upper left. Muted and calm: slate or dark thatch roofs, dull walls, low simple shapes, little inner detail, "
               "dark low-saturation crops. Matte surfaces, two or three values per surface. No people, no animals, no letters, no signs, no flags, "
               "no red roofs, no painted cast shadow, no diamond-shaped ground plate. ")

# The rungs; a proposal not named in a rung uses the shared text.
PIECES = {
    "ferme1": {"*": "A freshly turned square patch of dark earth with a few furrows beside one very small open lean-to of rough poles and bark, a stack of logs. Barely a farm."},
    "ferme3": {"R": "A modest farmstead along a road edge: one low dark-thatched barn, one small house, a short row of dark orchard trees, a low wattle fence.",
               "T": "An orchard farm: one low slate barn, regular regular rows of round dark trees, a low dry-stone wall.",
               "F": "A forest-clearing farm: one low dark-thatched barn, a small irregular field with old tree stumps left in it, rough log fence."},
    "ferme4": {"R": "A prosperous farm group: two low houses, a long barn, a stack yard, strips of dark fields all facing one side.",
               "T": "A sheep upland holding: long low slate sheepfold, grey dry-stone walls enclosing long dull green strips of pasture.",
               "F": "Several farms among dark clumps of woodland: hedged irregular fields, low thatched houses, one small dark grove left in the middle."},
    "hameau1": {"R": "Three very small dark huts close together at a dirt roadside, a woodpile.",
                "T": "Two small stone shepherd huts and a round dry-stone pen on rough grass.",
                "F": "Three small woodcutter log cabins at a forest edge, cut logs and stumps around."},
    "hameau2": {"R": "A small hamlet of five low houses of different sizes around a stone well at a bend of a road, small vegetable strips.",
                "T": "A small orchard hamlet of five low houses of different sizes around a stone well, round dark trees among the houses.",
                "F": "A clearing hamlet of five low log and thatch houses around a stone well, ring of stumps at its edge."},
    "bourg": {"R": "A small market town: an open timber market hall with empty stalls, a dozen tightly packed low houses of varied heights and roofs, narrow lanes, no walls.",
              "T": "A small market town at a crossroads: an open timber market hall, a dozen packed low houses of varied heights, dry-stone walls, a stone trough.",
              "F": "A small market town in a large clearing: an open timber market hall, a dozen packed low timber houses of varied heights, a ring of dark forest stumps at its edge."},
    "route1": {"*": "A short straight piece of narrow beaten dirt road with wheel ruts on rough grass. Ground only, no ink on the ground."},
    "route2": {"*": "A short straight piece of gravel road with a few low stone markers along its edge on rough grass. Ground only, no ink on the ground."},
    "route3": {"*": "A short straight piece of road: matte grey-brown worn cobbles, never golden, at one end fading progressively into beaten dirt at the other end, on rough grass. Ground only, no ink on the ground."},
}

TAIL = (" Everything added is lower, darker and calmer than the village: slate and dark thatch, dull walls, dark crops. The village centre stays the brightest place. "
        "Isometric 2:1, inked hand-painted map style, warm light from upper left. No people, no letters, no flags, no red roofs, no painted cast shadows.")

NUIT = {
    "R": {3: "Only the campfire is lit.", 6: "One lit window in each cottage below the gate, one in the huts.",
          9: "Lit windows in the hamlet, one small lantern at its well, one window per farm.",
          12: "A chain of very small warm lights along the northern road fading with distance, the market town gently lit, always weaker than the village centre."},
    "T": {3: "Only the campfire is lit.", 6: "One lit window in each cottage below the gate, one small fire at the shepherd pen.",
          9: "Lit windows in the orchard hamlet and one at the barn.",
          12: "Three separate small groups of warm lights, far apart: south, orchards, and the market town the strongest, always weaker than the village centre."},
    "F": {3: "Only the campfire is lit.", 6: "One lit window in each cottage below the gate, one small charcoal-burner fire in the western clearing.",
          9: "One clearing lit by its windows, surrounded by black forest.",
          12: "A few clearings inside the dark mass of forest, one small light per clearing, a few more in the market town, always far weaker than the village centre."},
}
NUIT_TXT = ("Image 1 is this exact scene by day. Repaint the same scene at night, same layout, same camera, nothing moved. Slate blue sky-lit shadows, ground keeps visible moss, ochre and stone colours, "
            "the forest keeps its tints, no uniform blue filter. The village centre around the fire stays the brightest and warmest place. Outside the walls: ")


def run(jobs, label, refs_of, size):
    concepts.SIZE = size
    concepts.free([j[0] for j in jobs])
    concepts.run(jobs, klein_price(*size), label, KLEIN, PROBE, False, refs_of)  # False: guard_endpoint refuses Klein by design, as direction/paint.py


def pieces(only, attempt):
    style = concepts.refs(OUT, "growth")
    jobs = []
    for r, (rung, texts) in enumerate(PIECES.items()):
        for p, prop in enumerate("RTF"):
            if only and prop not in only:
                continue
            for v in (1, 2):
                if "*" in texts and prop != "R":
                    continue  # one design shared by all three
                text = texts.get(prop, texts.get("*"))
                name = f"{rung}_{'x' if '*' in texts else prop}_v{v}"
                jobs.append((OUT / f"{name}{'' if attempt == 1 else f'_t{attempt}'}.png", STYLE_PIECE + text, 71000 + 100 * r + 10 * p + v + 1000 * attempt))
    run(jobs, f"growth pieces t{attempt}", lambda _o: style, SIZE_PIECE)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["pieces"])
    ap.add_argument("--only", default="")
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    pieces(a.only.split(",") if a.only else [], a.attempt)
