"""Generate the blockouts of L4-T08b into argv[1] (default: pieces/ beside this file): three village
animals, a cat (chat), a hen (poule) and a crow (corbeau), each in three poses.

Slugs are `pieces/animal_<name>_<pose>` (not building stages, like gen_decor's pieces). Poses, for an
8 fps cycle repos -> a -> b -> a: chat walks (a and b swap the diagonal pairs of legs, repos sits),
poule pecks (a leans, b beak on the ground), corbeau flaps (a wings raised, b wings spread low).

Same engine as the villagers of gen_decor.py: `villager` canvas (pxScale 2, anchor at the cell's
centre), lit from the front by `light`, inked at `lineScale`. The animal heads toward +s, screen right
(grid +gx -gy), and stands on the cell's centre: the app mirrors it to go the other way. Animals
are 0.13 to 0.17 high, a quarter to a third of a villager (0.49). The helpers are gen_decor's, copied
because that module writes its files when imported.
"""

import json
import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "exports"))
import heights as Hg  # noqa: E402

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "pieces"
FRONT_LIGHT = [0.55, 0.55, 0.63]
INK = 0.3  # a villager is inked at 0.5; these are a third as tall
F, SIDE = (math.sqrt(0.5), math.sqrt(0.5)), (math.sqrt(0.5), -math.sqrt(0.5))


def r(v):
    return round(v, 4) + 0.0


def P(s, f, z):
    """Local (s across the view toward the right, f toward the viewer, z up) to grid."""
    return [r(0.5 + f * F[0] + s * SIDE[0]), r(0.5 + f * F[1] + s * SIDE[1]), r(z)]


def cone(a, b, r1, r2, mat):
    """A cone or cylinder from point a to point b (local coordinates), radii r1 then r2."""
    pa, pb = P(*a), P(*b)
    d = [pb[i] - pa[i] for i in range(3)]
    n = math.sqrt(sum(x * x for x in d))
    return {"type": "cone", "center": pa, "r": r(r1), "r2": r(r2), "h": r(n),
            "axis": [r(x / n) for x in d], "mat": mat}


def blob(s, f, z0, rad, h, mat):
    """A rounded lump standing on z0: two frustums."""
    c = P(s, f, z0)
    return [{"type": "cone", "center": c, "r": r(rad * 0.7), "r2": r(rad), "h": r(h * 0.4), "mat": mat},
            {"type": "cone", "center": [c[0], c[1], r(z0 + h * 0.4)], "r": r(rad), "r2": r(rad * 0.5),
             "h": r(h * 0.6), "mat": mat}]


def slab(s, f, z0, ds, df, dz, mat):
    """A box ds long across the view, df deep, centred on (s, f), turned 45 degrees like gen_decor's fbox."""
    c = P(s, f, z0)
    return {"type": "box", "at": [r(c[0] - df / 2), r(c[1] - ds / 2), r(z0)], "size": [r(df), r(ds), r(dz)],
            "mat": mat, "rotZ": 45}


def chat(pose):
    p = []
    if pose == "repos":  # sitting, tail curled along the ground
        p += blob(-0.02, 0, 0.0, 0.05, 0.07, "stone")
        p.append(cone((-0.02, 0, 0.045), (0.025, 0, 0.09), 0.04, 0.034, "stone"))
        p += blob(0.04, 0, 0.065, 0.031, 0.04, "stone")
        p += [cone((0.04, f, 0.103), (0.04, f * 1.2, 0.135), 0.012, 0.0, "stone") for f in (-0.017, 0.017)]
        p += [cone((0.046, f, 0.0), (0.046, f, 0.06), 0.01, 0.009, "stone") for f in (-0.016, 0.016)]
        p += [cone((-0.06, 0.02, 0.014), (-0.11, 0.05, 0.014), 0.011, 0.009, "stone"),
              cone((-0.11, 0.05, 0.014), (-0.125, 0.09, 0.014), 0.009, 0.008, "stone")]
    else:  # walking: a and b swap the diagonal pairs
        sw = 0.025 if pose == "a" else -0.025
        bob = 0.004 if pose == "a" else 0.0
        p.append(cone((-0.07, 0, 0.07 + bob), (0.05, 0, 0.078 + bob), 0.035, 0.04, "stone"))
        p += blob(0.08, 0, 0.068 + bob, 0.03, 0.04, "stone")
        p += [cone((0.08, f, 0.105 + bob), (0.08, f * 1.2, 0.135 + bob), 0.012, 0.0, "stone") for f in (-0.017, 0.017)]
        for f, sign in ((0.02, 1), (-0.02, -1)):
            p.append(cone((0.045, f, 0.07), (0.045 + sw * sign, f, 0.004), 0.01, 0.009, "stone"))
            p.append(cone((-0.055, f, 0.07), (-0.055 - sw * sign, f, 0.004), 0.011, 0.009, "stone"))
        p += [cone((-0.07, 0, 0.075 + bob), (-0.115, 0, 0.1 + bob), 0.011, 0.01, "stone"),
              cone((-0.115, 0, 0.1 + bob), (-0.125, 0, 0.15 + bob), 0.01, 0.008, "stone")]
    return p


def poule(pose):
    tilt, head = {"repos": (0.0, (0.052, 0.1)), "a": (0.012, (0.085, 0.07)), "b": (0.024, (0.11, 0.035))}[pose]
    hs, hz = head
    p = [cone((-0.045, 0, 0.075 + tilt), (0.04, 0, 0.07 - tilt), 0.034, 0.044, "plaster")]
    p += blob(0.0, 0, 0.012, 0.045, 0.07, "plaster")
    p.append(cone((-0.04, 0, 0.07 + tilt), (-0.095, 0, 0.115 + tilt * 2), 0.02, 0.006, "darkwood"))  # tail
    p.append(cone((0.035, 0, 0.065 - tilt), (hs, 0, hz), 0.022, 0.015, "plaster"))  # neck
    p += blob(hs + 0.008, 0, hz - 0.012, 0.02, 0.03, "plaster")
    p.append(slab(hs + 0.004, 0, hz + 0.016, 0.03, 0.007, 0.014, "tile"))  # comb
    p.append(cone((hs + 0.026, 0, hz + 0.003), (hs + 0.048, 0, hz - 0.001), 0.009, 0.0, "wood"))  # beak
    p += [cone((0.0, f, 0.02), (0.0, f, 0.0), 0.006, 0.005, "wood") for f in (-0.018, 0.018)]
    return p


def corbeau(pose):
    p = [cone((-0.06, 0, 0.05), (0.03, 0, 0.07), 0.02, 0.034, "iron")]
    p += blob(0.035, 0, 0.055, 0.03, 0.035, "iron")
    p += blob(0.052, 0, 0.082, 0.022, 0.035, "iron")
    p.append(cone((0.07, 0, 0.098), (0.108, 0, 0.09), 0.011, 0.0, "darkwood"))  # beak
    p.append(slab(-0.09, 0, 0.035, 0.06, 0.03, 0.012, "iron"))  # tail
    p += [cone((0.0, f, 0.045), (0.0, f, 0.0), 0.006, 0.005, "darkwood") for f in (-0.016, 0.016)]
    # wing: shoulder -> tip, and a second, shorter feather behind it
    tips = {"repos": ((-0.075, 0.034, 0.045), (-0.055, 0.034, 0.04)),
            "a": ((-0.03, 0.085, 0.165), (-0.06, 0.07, 0.15)),
            "b": ((-0.03, 0.115, 0.075), (-0.065, 0.1, 0.065))}[pose]
    for f in (1, -1):
        for k, tip in enumerate(tips):
            sh = (0.015 - 0.03 * k, f * 0.03, 0.07 - 0.005 * k)
            p.append(cone(sh, (tip[0], f * tip[1], tip[2]), 0.016 - 0.003 * k, 0.006, "iron"))
    return p


ANIMALS = {"chat": chat, "poule": poule, "corbeau": corbeau}
# name: (lowest top allowed, top cap): a quarter to a third of a villager's 0.49, wings up excepted
CAPS = {"chat": (0.12, 0.17), "poule": (0.11, 0.17), "corbeau": (0.1, 0.19)}
S = {}
for name, make in ANIMALS.items():
    for pose in ("repos", "a", "b"):
        S[f"animal_{name}_{pose}"] = {"canvas": "villager", "light": FRONT_LIGHT, "lineScale": INK,
                                      "parts": [{**q, "roof": False} for q in make(pose)]}

bad = 0
for slug, spec in S.items():
    lo, cap = CAPS[slug.split("_")[1]]
    zmax, worst = 0.0, 0.0
    for q in spec["parts"]:
        for x, y, z in Hg.part_vertices(q):
            worst = max(worst, -x, -y, x - 1, y - 1, -z)
            zmax = max(zmax, z)
    ok = worst <= 1e-6 and lo <= zmax <= cap
    bad += not ok
    print(f"{slug:24s} parts {len(spec['parts']):2d}  top {zmax:.3f} ({zmax / 0.49:.2f} villager)  outside {worst:.4f}"
          f"{'' if ok else '  <-- FIX'}")
if bad:
    sys.exit(1)
OUT.mkdir(parents=True, exist_ok=True)
for slug, spec in S.items():
    (OUT / f"{slug}.json").write_text(json.dumps(spec) + "\n")
