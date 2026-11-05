#!/usr/bin/env python3
"""GROWTH concepts of quarter pieces, FLUX 3 Image Klein only. Throwaway images for Guillaume's pick: never assets.
    quartiers.py [--only A1a,B3] [--try N]    2 variations each, scratch/quartiers/<id>_v<k>.png. Never overwrites: rerun with --only for the missing ones.
Reserve and settle through iso_loop (via bld/concepts.run), probe growth_klein (2 $ cap)."""
import argparse
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "growth"))
import klein
from klein import concepts

OUT = klein.D / "quartiers"
SIZE = (768, 768)
HEAD = "Images 1 and 2 are style references only, for ink line, light and brushwork: copy none of their shapes. "
V = "warm grey-brown slate or dark thatch, mid value, same olive-ochre hue family as the ground, no cold blue-grey"
STYLE = ("single storey, squat, roof dominant, simple flat shapes, very few details, same line weight as the village art, "
         "dense fine hatching like hand-inked map art, isolated isometric 2:1 view, hand-inked outlines, muted desaturated palette, flat magenta background #FF00FF, ")
NO = "no people, no letters, no flags, no red roofs, no painted cast shadow, no diamond-shaped ground plate"
CITY = "roofs as large simple shapes in 3 value steps, lanes as thin pale lines, ground fading out to the magenta, no hard edge, no meadow plate, "

P = {
    "A1a": f"Small low cottage with a thatch roof, {V}, dull plaster and timber walls, one small chimney, ",
    "A1b": f"Small low cottage with a wooden shingle roof, {V}, dull plaster and timber walls, one small chimney, ",
    "A1c": f"Small low cottage with a slate roof, {V}, dull plaster and timber walls, one small chimney, ",
    "A2": f"Long low cottage, weathered thatch roof, {V}, dull stone walls, ",
    "A3": "Narrow strip gardens with low hurdle fences and dark soil rows, very low, muted dull greens and browns, ",
    "A4": "Small market stall with plain faded grey canvas on a timber frame, crates beneath, no stripes, ",
    "A5": f"Low timber workshop with an open lean-to and stacked planks, roof {V}, ",
    "A6": f"Narrow town house, 1.5 storey, plain plaster, low roof, {V}, ",
    "A7": f"Long low open market hall, heavy timber posts, roof {V}, empty beneath, ",
    "A8": f"Low 2x2 tavern, thatch roof, {V}, dull stone walls, a small empty yard on one side, no courtyard, no sign, ",
    "B1": f"Low masons' shed with cut stone blocks stacked beside it, roof {V}, only one small stack of stones, ",
    "B2": f"Wide low stone-yard hangar on timber posts around a small working yard, roof {V}, only one small stack of stones, ",
    "B3": f"Small potter's yard with a squat domed clay kiln and a low hut, thatch roof, {V}, no flames, ",
    "B4": f"Market gardener's cottage among long narrow vegetable strips, thatch roof, {V}, muted dull greens, ",
    "B5": f"Woodcutter's low cabin with fresh stumps, shingle roof, {V}, only one small stack of logs, ",
    "B6": f"Low open sawpit shed with one long log, roof {V}, only one small stack of logs, ",
    "B7": f"Low basket-weavers' cottage with reed drying racks, thatch roof, {V}, ",
    "C1": f"Meadow patch with three small cottages on one dirt lane, roofs {V}, " + CITY,
    "C2": f"Dense small town quarter with a central lane and side lanes in a fishbone pattern, varied low roofs, {V}, strip gardens, " + CITY,
    "C3": f"The same kind of dense town quarter with a tiny square and a well at its centre, an L-shaped tavern and two workshops, varied low roofs, {V}, no sign, " + CITY,
    "C4": f"Four low cottages along one edge of a dirt lane with strip gardens behind, varied roofs, {V}, " + CITY,
    "C5": f"Three woodcutters' cabins in a clearing with stumps and stacked logs, darker than the village, not black, roofs {V}, " + CITY,
}

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    only = a.only.split(",") if a.only else list(P)
    style = concepts.refs(klein.OUT, "growth")
    jobs = [(OUT / f"{k}_v{v}{'' if a.attempt == 1 else f'_t{a.attempt}'}.png", HEAD + P[k] + STYLE + NO,
             73000 + 100 * list(P).index(k) + 7 * v + 1000 * a.attempt) for k in only for v in (1, 2)]
    klein.run(jobs, f"quartiers t{a.attempt}", lambda _o: style, SIZE)
