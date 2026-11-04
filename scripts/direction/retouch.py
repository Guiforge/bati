#!/usr/bin/env python3
"""Second pass on the picked target images (direction A), Guillaume's request of 04/11. Targets, never assets.
    retouch.py day [--only r_t1_1,...] | retouch.py night BASE_DAY.png
Never overwrites. Reserve/settle through iso_loop (via bld/concepts.run)."""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "bld"))
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
import concepts
from iso_loop import FLUX3

OUT = ROOT / "docs/designs/village/direction/scratch/paint"
SUF = (" Isometric 2:1, same camera as image 1. Dark medieval fantasy, inked hand-painted map style, warm light from top-left, slate shadows. "
       "No people, no text, no writing, no banners with symbols. Matte surfaces, ink outlines #0F1518.")
FOREST = "Dense dark mixed forest of birch, oak and pine with distinct tints, darker than the village, closing in around it, never in front of a building."
T1 = ("Image 1 is the layout: keep its camera, its river and the course of its track. Image 2 is a reference for the forest only: copy none of its buildings. "
      "Repaint this as the very first day of a settlement: a lone camp with one campfire, one tent, one well, a stack of logs, a single tiny lean-to and one small patch of turned earth. "
      "Nothing else is built: no cabin, no house, no wall, no big field. "
      "One narrow rutted dirt track, a cart wide, with thin stakes along part of it, climbs from the bottom edge to the camp and fades into the grass before the river. "
      "The clearing has an irregular outline with fresh stumps at its edge, with a wide opening for the track. " + FOREST +
      " The campfire is the warmest point and the sunlit ochre ground around the camp the brightest area, value falling toward the edges. Clean even painted ground, no dark blotches.")
T6 = ("Image 1 is the village: keep its camera, every building, the lower palisade, the gate and the lower road, fields and cottages exactly. "
      "Make one street clearly readable as an S: cobbled through the fire square, then dirt, leaving the top of the village and crossing the river on a small timber bridge toward the forest. "
      "Lower half-timbered houses and narrow garden strips line both sides of it, filling the gaps between the buildings, more muted than the player's buildings. "
      "The fire square stays the brightest area, value falling toward the edges. " + FOREST)
T12 = ("Image 1 is the town: keep its camera, every building, the walls, the gate, the winding cobbled high street and the stone bridge. "
       "Image 2 shows the exact lower corner to keep: the road, the wheat, the fenced vegetable plot, the two cottages and the sheep pen, with no large house and no extra fields there. "
       "Make the town denser: many more low muted half-timbered houses in tight rows on both sides of the street above the river, with short herringbone lanes, a covered market and a tavern, and barely any empty ground. "
       "The fields are fewer and darker, desaturated, on the far edges only, always calmer than the square. "
       "The cobbled fire square inside the walls is clearly the brightest area of the picture, value falling toward the edges. The player's buildings stay the tallest and most visible. " + FOREST)
NIGHT = ("Image 1 is the town by day. Repaint the same scene at night, same layout, every building kept. Deep slate blue night, moss, ochre and stone colours still visible, trees keeping their tints, never a uniform blue filter. "
         "A large warm pool of amber light on the fire square is clearly the brightest part of the picture. A chain of lanterns draws the high street from the square up over the bridge, fading with distance. "
         "Warm amber windows glow in most houses, one by one, denser near the square. No flames except the central campfire.")
P = OUT / "flux3_A_%s.png"
C_T1 = OUT / "flux3_C_t1_v1.png"
DAY = {}
for i in (1, 2, 3):
    DAY[f"r_t1_{i}"] = (T1, (OUT / "flux3_A_t1_v2.png", C_T1), 71100 + i)
    DAY[f"r_t1_{i + 3}"] = (T1, (OUT / "ref_t1.png", C_T1), 71200 + i)
    DAY[f"r_t6_{i}"] = (T6, (OUT / "flux3_A_t6_v1.png",), 71300 + i)
    DAY[f"r_t12_{i}"] = (T12, (OUT / "flux3_A_t12_v2.png", OUT / "ref_t12.png"), 71400 + i)
T6B = ("Image 1 is the village: keep its camera, every building, the palisade, the winding street, the timber bridge and everything below the palisade exactly. "
       "Add only low muted half-timbered houses and garden strips along both sides of the street between the palisade and the river, and inside every empty gap of the village. "
       "Repaint the meadow above the river as one even natural grass, removing the dark straight-edged patches. The fire square stays the brightest area. " + FOREST)
T12B = ("Image 1 is the town: keep its camera, every building, the walls, the gate, the street, the bridge and all the houses exactly. Change only the light and the fields. "
        "Remove the large fields below the walls on the right, leaving plain grass and the small fenced plot. Make all remaining fields much darker and desaturated, in muted olive. "
        "Darken the ground, roofs and walls toward the edges of the picture and light the cobbled fire square inside the walls with warm sun, so it is clearly the brightest area of the whole picture.")
for i in (1, 2):
    DAY[f"r2_t6_{i}"] = (T6B, (OUT / "r_t6_1.png",), 71600 + i)
    DAY[f"r2_t12_{i}"] = (T12B, (OUT / "r_t12_3.png",), 71700 + i)
T12C = ("Image 1 is the town: keep its camera and composition. Keep exactly as they are: everything inside the walls, the walls, the gate, the windmill, the towers, the arena, the street, the bridge, the river, the two red-roofed cottages and the fenced plots at the bottom. "
        "Change only the added neighbourhood houses outside the walls and above the river: repaint them as quiet background houses with slate grey or dark thatch roofs and dull muted brown walls, no red tiles, no white walls, no signs, no flags, little inner detail, low and simple. "
        "They read a clear step darker and calmer than the buildings inside the walls. No house stands in front of the windmill, the towers or the arena. "
        "Warm the daylight on the old town inside the walls and on its fire square, so it is clearly the brightest and most colourful area; the street above the bridge is calmer than the square.")
DAY["r3_t12_1"] = (T12C, (OUT / "r2_t12_2.png",), 71801)


def go(items, label):
    concepts.SIZE = (832, 1312)
    jobs = [(OUT / f"{k}.png", t + SUF, s) for k, (t, _, s) in items.items()]
    concepts.free([j[0] for j in jobs])
    rf = {OUT / f"{k}.png": r for k, (_, r, _) in items.items()}
    concepts.run(jobs, 0.10, label, FLUX3, None, True, lambda o: rf[o])


if __name__ == "__main__":
    if sys.argv[1] == "night":
        base = pathlib.Path(sys.argv[2])
        go({f"r_t12n_{i}": (NIGHT, (base,), 71500 + i) for i in (1, 2, 3)}, "direction retouch night")
    else:
        only = sys.argv[3].split(",") if len(sys.argv) > 3 else list(DAY)
        go({k: DAY[k] for k in only}, "direction retouch day")
