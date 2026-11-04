#!/usr/bin/env python3
"""GROWTH concepts, FLUX 3 Image Klein only. Throwaway images for Guillaume's pick: never assets, nothing placed.
    concepts.py pieces [--only R,T] [--try N]    each rung of farms, hamlets and roads, alone on a plain ground, 2 variations
    concepts.py bande R|T|F [--try N]            tiers 1 to 12 on one camera, each tier edited from the render and the tier before
    concepts.py nuit R|T|F [--try N]             tiers 3 6 9 12 by night, from the painted day of the same proposal
Never overwrites. Reserve and settle through iso_loop (via bld/concepts.run), under the probe growth_klein (2 $ cap)."""
import argparse
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "bld"))
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
import concepts
from iso_loop import KLEIN, klein_price
from PIL import Image

D = ROOT / "docs/designs/village/growth/scratch"
FIXE, OUT = D / "fixe", D / "concepts"
SIZE_PIECE, SIZE_BANDE = (768, 768), (832, 1312)
CROP = (0, 480, 1080, 2183)  # the fixed camera's frame, land on every side
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

KEEP = ("Image 1 is the real game scene. Keep everything inside and on the village walls exactly as it is, the camera, the river, the existing corner fields "
        "and cottages below the gate, and the dark forest. Paint only on the empty land outside the walls. ")
SUITE = "Image 2 is the same land one tier earlier: everything it already shows outside the walls stays in the same place, and only the following is added. "
TAIL = (" Everything added is lower, darker and calmer than the village: slate and dark thatch, dull walls, dark crops. The village centre stays the brightest place. "
        "Isometric 2:1, inked hand-painted map style, warm light from upper left. No people, no letters, no flags, no red roofs, no painted cast shadows.")

# What each proposal adds at each tier, on the whole scene. Empty: the tier adds nothing outside (a tier band's first step shows it).
BANDE = {
    "R": {1: "A tiny turned earth patch and one small lean-to beside the narrow track south of the camp.",
          4: "Nothing more than what is there.",
          5: "Three very small huts at the first bend of a thin dirt road that now climbs north across the river.",
          7: "On the thin road, a low barn and a short row of orchard trees to the east of the village, not below the wall, and a small timber bridge where the road crosses the river.",
          8: "The road to the north is now gravel with small stone markers, one covered cart stopped at the roadside.",
          9: "The three huts have grown into a small hamlet of five low houses and a well at the road's bend.",
          10: "A second low farm with dark field strips turned to the road, on the west side.",
          11: "A third low farm further along the northern road.",
          12: "Past the bridge at the top, a small market town: an open market hall and a dozen packed low houses, the road matte grey-brown cobbles there, never golden, fading back to dirt beyond it."},
    "T": {1: "A tiny turned earth patch and one small lean-to beside the narrow track south of the camp.",
          4: "Nothing more than what is there.",
          5: "Two small stone shepherd huts and a round dry-stone pen far to the north, with a thin dirt path.",
          6: "To the east, not below the wall, a first short row of round dark young trees, a dirt path to it.",
          7: "The row becomes a first orchard: regular rows of round dark trees and one low slate barn.",
          8: "The orchard grows wider, with a small hamlet of five low houses and a well inside it; the paths turn to gravel.",
          10: "To the north, grey dry-stone walls now enclose long pastures of the same dull tone as the rest of the land, with a long low sheepfold.",
          11: "To the west, long narrow strips of fields of the same dull tone along the river, told apart by their shape only.",
          12: "At the northern crossroads, a small market town with an open market hall and a dozen packed low houses, cobbles only at the crossing."},
    "F": {1: "Old stumps at the forest edge, a tiny turned earth patch among them and one small lean-to, stacked logs.",
          3: "More stumps: the forest edge visibly pulled back on the north-west, turned earth between the stumps.",
          5: "On the north-west a first irregular clearing of medium value, never bright, with stumps and short hedges; three small log cabins at the forest edge.",
          7: "The north-west forest is now pulled back a long way, an obvious change, with irregular canopy edges and brush at its foot; in the clearing a low thatched barn and an irregular small field with stumps left in it.",
          9: "A clearing hamlet of five low houses and a well, a gravel track from the village.",
          10: "Several hedged irregular fields, with low dark groves left standing between them, far from the village; the forest is farther but still dark and tight all round.",
          11: "A second farm in a new clearing on the east, not below the wall.",
          12: "A large clearing at the top holds a small market town: an open market hall and a dozen packed low houses, cobbles only in the town."},
}

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


def base(tier, light="jour"):
    f = OUT / f"ref_t{tier}_{light}.png"
    if not f.exists():
        Image.open(FIXE / f"t{tier}-{light}.png").convert("RGB").crop(CROP).resize(SIZE_BANDE, Image.LANCZOS).save(f)
    return f


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


def bande(prop, attempt):
    tag = "" if attempt == 1 else f"_t{attempt}"
    previous = None
    for tier in range(1, 13):
        add = BANDE[prop].get(tier)
        o = OUT / f"bande_{prop}_{tier:02d}{tag}.png"
        if add is None:  # nothing new: the land stays as the tier before, on this tier's village
            add = "Nothing new outside the walls."
        text = KEEP + (SUITE if previous else "") + add + TAIL
        refs = (base(tier), previous) if previous else (base(tier),)
        run([(o, text, 73000 + 1000 * "RTF".index(prop) + tier + 100 * attempt)], f"growth bande {prop} {tier}", lambda _o, r=refs: r, SIZE_BANDE)
        previous = o


def nuit(prop, attempt):
    tag = "" if attempt == 1 else f"_t{attempt}"
    jobs = [(OUT / f"nuit_{prop}_{t:02d}{tag}.png", NUIT_TXT + txt + TAIL, 75000 + 1000 * "RTF".index(prop) + t + 100 * attempt) for t, txt in NUIT[prop].items()]
    day = {j[0]: OUT / f"bande_{prop}_{int(j[0].stem.split('_')[2]):02d}{tag}.png" for j in jobs}
    run(jobs, f"growth nuit {prop}", lambda o: (day[o],), SIZE_BANDE)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["pieces", "bande", "nuit"])
    ap.add_argument("prop", nargs="?", default="")
    ap.add_argument("--only", default="")
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if a.cmd == "pieces":
        pieces(a.only.split(",") if a.only else [], a.attempt)
    elif a.cmd == "bande":
        bande(a.prop, a.attempt)
    else:
        nuit(a.prop, a.attempt)
