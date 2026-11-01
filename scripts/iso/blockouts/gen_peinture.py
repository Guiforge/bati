"""Painting references of T36 lots D, F and G, written to peinture/ (argv[1] to override).

Why not pieces/: the villager and animal blockouts there are 33 % and 8 % of their 768 px canvas, so
FLUX painted bigger than the mask and the cut clipped the body (reviews/T36-lotA.md). These fill it:
each villager or animal spec sets its own `pxScale` and `anchorPx` (iso_blockout.py reads them before the canvas's),
fitted here (`fit`) so the subject, centred on its canvas, stands 70 to 85 % of the canvas
height. Same camera, same `light` (from the front, like the villagers), ink thicker than the pieces'.
Nothing here goes to the app: the pieces/ sprites keep their scale and their exports.

- D: villageois_<role>_face (the 7 roles): the face piece of gen_decor.py plus a big, readable tool.
- G: animal_chat_<dort|assis|etire|marche>, animal_poule_<picore|marche|sursaute|ailes>: the first
  clip of each `aPeindre` of vieAnimaux.ts, 4 per animal, heading screen right.
- F: decor_tas_bois, decor_cloture, decor_lanterne on `decor1x1`, inside their cell, under 0.9.
"""

import json
import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "exports"))
import heights as Hg  # noqa: E402

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "peinture"
FRONT_LIGHT = [0.55, 0.55, 0.63]
F, SIDE = (math.sqrt(0.5), math.sqrt(0.5)), (math.sqrt(0.5), -math.sqrt(0.5))
INK_PX = 12  # ink width in sprite px; lineScale = INK_PX / (lineThicknessPx 8 * pxScale)
ISO = json.loads((HERE.parent.parent.parent / "constants" / "isoSpec.json").read_text())
FILL, WIDE = 0.80, 0.94  # share of the canvas height the subject takes, and the width it must stay under


def fit(parts, canvas):
    """pxScale and anchorPx that centre the subject in its canvas at FILL of its height (WIDE of its width at most).

    A grid point (gx, gy, z) lands at k * ((gx - gy) S/2, (gx + gy - 1) S/4 - z pxPerUnit sin 60) from the anchor,
    k the pxScale (accroches.screen); the extent is taken on the parts' vertices, so a round part is a hair short.
    """
    o = 1.0 if ISO["canvases"][canvas]["anchor"] == "footprintBottom" else 0.5  # the anchor's grid point, per axis
    pts = [(((x - y) * ISO["S"] / 2), ((x + y - 2 * o) * ISO["S"] / 4 - z * ISO["pxPerUnit"] * math.sin(math.radians(60))))
           for q in parts for x, y, z in Hg.part_vertices(q)]
    x0, x1, y0, y1 = min(p[0] for p in pts), max(p[0] for p in pts), min(p[1] for p in pts), max(p[1] for p in pts)
    w, h = ISO["canvases"][canvas]["w"], ISO["canvases"][canvas]["h"]
    k = min((FILL * h - INK_PX) / (y1 - y0), (WIDE * w - INK_PX) / (x1 - x0))
    return round(k, 3), [round(w / 2 - k * (x0 + x1) / 2), round(h / 2 - k * (y0 + y1) / 2)]


def r(v):
    return round(v, 4) + 0.0


def P(s, f, z):
    """Local (s across the view toward the right, f toward the viewer, z up) to grid."""
    return [r(0.5 + f * F[0] + s * SIDE[0]), r(0.5 + f * F[1] + s * SIDE[1]), r(z)]


def cone(a, b, r1, r2, mat):
    """A cone or cylinder from local point a to b, radii r1 then r2."""
    pa, pb = P(*a), P(*b)
    d = [pb[i] - pa[i] for i in range(3)]
    n = math.sqrt(sum(x * x for x in d))
    return {"type": "cone", "center": pa, "r": r(r1), "r2": r(r2), "h": r(n), "axis": [r(x / n) for x in d], "mat": mat}


def blob(s, f, z0, rad, h, mat):
    c = P(s, f, z0)
    return [{"type": "cone", "center": c, "r": r(rad * 0.7), "r2": r(rad), "h": r(h * 0.4), "mat": mat},
            {"type": "cone", "center": [c[0], c[1], r(z0 + h * 0.4)], "r": r(rad), "r2": r(rad * 0.5),
             "h": r(h * 0.6), "mat": mat}]


def slab(s, f, z0, ds, df, dz, mat):
    c = P(s, f, z0)
    return {"type": "box", "at": [r(c[0] - df / 2), r(c[1] - ds / 2), r(z0)], "size": [r(df), r(ds), r(dz)],
            "mat": mat, "rotZ": 45}


# --- D: villagers = the face piece + a tool you can read from the silhouette ----------------------
def tools(role):
    """Local frame (s, f, z): the right hand, screen right, is near s +0.09, z 0.2."""
    t = []
    if role == "smith":  # hammer held up: haft and a big iron head
        t += [cone((0.09, 0.03, 0.17), (0.12, 0.03, 0.44), 0.016, 0.016, "wood"),
              slab(0.12, 0.03, 0.41, 0.13, 0.06, 0.07, "iron")]
    elif role == "watcher":  # spyglass raised, a long brass tube
        t += [cone((0.06, 0.05, 0.3), (0.15, 0.06, 0.44), 0.02, 0.027, "iron"),
              cone((0.15, 0.06, 0.44), (0.16, 0.06, 0.455), 0.032, 0.032, "canvas")]
    elif role == "sage":  # tall staff topped with a ring
        t += [cone((0.11, 0.04, 0.0), (0.11, 0.04, 0.56), 0.017, 0.014, "wood"),
              cone((0.11, 0.04, 0.54), (0.11, 0.04, 0.62), 0.045, 0.02, "iron"),
              cone((0.11, 0.04, 0.62), (0.11, 0.04, 0.66), 0.02, 0.0, "iron")]
    elif role == "champion":  # raised sword: blade, crossguard
        t += [cone((0.12, 0.04, 0.2), (0.12, 0.04, 0.6), 0.02, 0.0, "iron"),
              slab(0.12, 0.04, 0.24, 0.13, 0.03, 0.03, "wood")]
    elif role == "herbalist":  # a big herb bundle held up and a basket on the hip
        t += [cone((-0.1, 0.04, 0.2), (-0.12, 0.04, 0.4), 0.016, 0.016, "wood")]
        t += blob(-0.12, 0.04, 0.36, 0.065, 0.12, "thatch")
        t += blob(0.14, 0.06, 0.04, 0.08, 0.09, "wood")
    elif role == "minstrel":  # lute held across the body, neck up to the right
        t += blob(-0.02, 0.1, 0.12, 0.06, 0.09, "wood")
        t += [cone((0.03, 0.1, 0.18), (0.14, 0.1, 0.34), 0.012, 0.012, "darkwood"),
              slab(0.15, 0.1, 0.34, 0.035, 0.025, 0.06, "darkwood")]
    elif role == "farmer":  # pitchfork: tall haft, bar, three tines
        t += [cone((0.11, 0.04, 0.0), (0.11, 0.04, 0.54), 0.016, 0.016, "wood"),
              slab(0.11, 0.04, 0.5, 0.14, 0.025, 0.025, "iron")]
        t += [cone((0.11 + k, 0.04, 0.5), (0.11 + k, 0.04, 0.64), 0.011, 0.0, "iron") for k in (-0.06, 0.0, 0.06)]
    return t


def villager(role):
    parts = json.loads((HERE / "pieces" / f"villageois_{role}_face.json").read_text())["parts"]
    return parts + tools(role)


# --- G: cat and hen -------------------------------------------------------------------------------
def chat(pose):
    m = "stone"

    def ears(s, z):
        return [cone((s, f, z), (s, f * 1.2, z + 0.03), 0.014, 0.0, m) for f in (-0.022, 0.022)]

    p = []
    if pose == "dort":  # a loaf: low body, big head on its paws, tail curled round the front
        p += blob(-0.02, 0, 0.0, 0.06, 0.115, m)
        p += blob(0.025, 0, 0.0, 0.06, 0.1, m)
        p += blob(0.075, 0.01, 0.0, 0.045, 0.1, m)
        p += ears(0.077, 0.095)
        p += [cone((-0.07, 0.04, 0.012), (-0.02, 0.08, 0.012), 0.017, 0.015, m),
              cone((-0.02, 0.08, 0.012), (0.06, 0.08, 0.012), 0.015, 0.012, m)]
    elif pose == "assis":  # upright, front legs straight, tail curled round the paws
        p.append(cone((-0.02, 0, 0.0), (-0.015, 0, 0.1), 0.055, 0.04, m))
        p += blob(0.0, 0, 0.09, 0.055, 0.07, m)
        p += ears(0.0, 0.15)
        p += [cone((0.03, f, 0.0), (0.03, f, 0.08), 0.012, 0.011, m) for f in (-0.018, 0.018)]
        p += [cone((-0.06, 0.04, 0.012), (0.0, 0.085, 0.012), 0.016, 0.014, m),
              cone((0.0, 0.085, 0.012), (0.08, 0.06, 0.012), 0.014, 0.012, m),
              cone((0.08, 0.06, 0.012), (0.1, 0.04, 0.05), 0.012, 0.0, m)]
    elif pose == "etire":  # front low and stretched out, back dipped, rump and tail up
        p.append(cone((-0.07, 0, 0.11), (0.03, 0, 0.05), 0.04, 0.036, m))
        p += blob(0.075, 0, 0.0, 0.045, 0.06, m)
        p += ears(0.075, 0.055)
        p += [cone((0.03, f, 0.05), (0.11, f, 0.004), 0.012, 0.01, m) for f in (-0.02, 0.02)]
        p += [cone((-0.07, f, 0.11), (-0.07, f, 0.0), 0.013, 0.011, m) for f in (-0.02, 0.02)]
        p.append(cone((-0.08, 0, 0.12), (-0.1, 0, 0.26), 0.014, 0.01, m))
    else:  # marche: four legs apart, tail up
        sw = 0.02
        p.append(cone((-0.07, 0, 0.09), (0.05, 0, 0.1), 0.04, 0.045, m))
        p += blob(0.085, 0, 0.085, 0.04, 0.06, m)
        p += ears(0.087, 0.14)
        for f, sign in ((0.025, 1), (-0.025, -1)):
            p.append(cone((0.045, f, 0.09), (0.045 + sw * sign, f, 0.0), 0.012, 0.01, m))
            p.append(cone((-0.055, f, 0.09), (-0.055 - sw * sign, f, 0.0), 0.013, 0.01, m))
        p += [cone((-0.07, 0, 0.1), (-0.1, 0, 0.15), 0.012, 0.011, m),
              cone((-0.1, 0, 0.15), (-0.105, 0, 0.27), 0.011, 0.008, m)]
    return p


def poule(pose):
    m = "plaster"
    tilt, head, swing, wing = {  # body tilt, head centre (s, z), leg swing, wings flung out
        "picore": (0.03, (0.09, 0.04), 0.0, False),
        "marche": (0.0, (0.08, 0.2), 0.03, False),
        "sursaute": (-0.01, (0.06, 0.27), 0.0, False),
        "ailes": (-0.005, (0.07, 0.23), 0.0, True),
    }[pose]
    dive = -0.012 if pose == "picore" else 0.0
    p = [cone((-0.05, 0, 0.09 + tilt), (0.045, 0, 0.09 - tilt), 0.045, 0.055, m)]
    p += blob(0.0, 0, 0.03, 0.055, 0.085, m)
    p.append(cone((-0.05, 0, 0.1 + tilt), (-0.1, 0, 0.21 + tilt * 2), 0.03, 0.008, "darkwood"))  # tail fan
    p.append(cone((0.04, 0, 0.1), (head[0], 0, head[1]), 0.026, 0.018, m))  # neck
    p += blob(head[0] + 0.005, 0, head[1] - 0.015, 0.026, 0.04, m)
    p.append(slab(head[0] + 0.005, 0, head[1] + 0.02, 0.035, 0.008, 0.02, "tile"))  # comb
    p.append(cone((head[0] + 0.03, 0, head[1] + dive), (head[0] + 0.058, 0, head[1] + 2 * dive), 0.011, 0.0, "wood"))
    for f, sign in ((0.02, 1), (-0.02, -1)):
        p.append(cone((0.0, f, 0.05), (swing * sign, f, 0.0), 0.007, 0.006, "wood"))
        p.append(slab(swing * sign + 0.012, f, 0.0, 0.04, 0.012, 0.01, "wood"))  # foot
    for f in (-1, 1):  # wings: folded along the flank, or flung out and up
        tip = (-0.07, f * 0.09, 0.26) if wing else (-0.07, f * 0.052, 0.1)
        p.append(cone((0.0, f * 0.045, 0.1), tip, 0.028, 0.006, m))
    return p


# --- F: the first tier's foreground ---------------------------------------------------------------
def fcyl(a, b, rad, mat):
    d = [b[i] - a[i] for i in range(3)]
    n = math.sqrt(sum(x * x for x in d))
    return {"type": "cyl", "center": [r(c) for c in a], "r": r(rad), "h": r(n), "axis": [r(x / n) for x in d], "mat": mat}


def fbox(x, y, z, sx, sy, sz, mat, **kw):
    return {"type": "box", "at": [r(x - sx / 2), r(y - sy / 2), r(z)], "size": [r(sx), r(sy), r(sz)], "mat": mat, **kw}


def tas_bois():
    p = []
    rad, step = 0.055, 0.112
    for row, n in enumerate((5, 4, 3, 2)):
        for k in range(n):
            y = 0.5 + (k - (n - 1) / 2) * step
            z = rad + row * step * 0.88
            p.append(fcyl((0.18, y, z), (0.78, y, z), rad, "wood"))
            p.append(fcyl((0.78, y, z), (0.79, y, z), rad * 0.8, "darkwood"))  # the cut end, toward the viewer
    p.append(fcyl((0.1, 0.08, 0.0), (0.1, 0.08, 0.17), 0.075, "wood"))  # chopping block with an axe in it
    p += [fcyl((0.1, 0.08, 0.17), (0.1, 0.08, 0.175), 0.06, "darkwood"),
          fcyl((0.1, 0.1, 0.18), (0.2, 0.14, 0.28), 0.012, "wood"), fbox(0.21, 0.15, 0.27, 0.07, 0.015, 0.06, "iron")]
    return p


def cloture():
    p = [fbox(x, 0.5, 0.0, 0.07, 0.07, 0.34 - 0.02 * (k % 2), "darkwood", rotZ=r(8 * (k - 1.5)))
         for k, x in enumerate((0.08, 0.36, 0.64, 0.92))]
    p += [fbox(0.5, 0.545, z, 0.9, 0.035, 0.05, "wood") for z in (0.12, 0.25)]
    p.append(fbox(0.5, 0.455, 0.2, 0.62, 0.03, 0.04, "wood"))
    return p


def lanterne():
    return [fbox(0.5, 0.5, 0.0, 0.2, 0.2, 0.07, "stone", rotZ=15),
            fcyl((0.5, 0.5, 0.07), (0.5, 0.5, 0.82), 0.035, "darkwood"),
            fcyl((0.5, 0.5, 0.74), (0.7, 0.5, 0.78), 0.02, "darkwood"),
            fcyl((0.7, 0.5, 0.78), (0.7, 0.5, 0.74), 0.012, "iron"),
            fbox(0.7, 0.5, 0.5, 0.15, 0.15, 0.04, "iron"),
            fbox(0.7, 0.5, 0.54, 0.1, 0.1, 0.2, "amber", noShadow=True),
            fbox(0.7, 0.5, 0.74, 0.16, 0.16, 0.03, "iron"),
            {"type": "cone", "center": [0.7, 0.5, 0.77], "r": 0.1, "r2": 0.02, "h": 0.1, "mat": "iron", "verts": 4}]


S = {}
for role in ("smith", "watcher", "sage", "champion", "herbalist", "minstrel", "farmer"):
    S[f"villageois_{role}_face"] = ("villager", villager(role))
for pose in ("dort", "assis", "etire", "marche"):
    S[f"animal_chat_{pose}"] = ("villager", chat(pose))
for pose in ("picore", "marche", "sursaute", "ailes"):
    S[f"animal_poule_{pose}"] = ("villager", poule(pose))
S["decor_tas_bois"] = ("decor1x1", tas_bois())
S["decor_cloture"] = ("decor1x1", cloture())
S["decor_lanterne"] = ("decor1x1", lanterne())

bad = 0
specs = {}
for slug, (canvas, parts) in S.items():
    spec = {"canvas": canvas, "parts": [{**q, "roof": False} for q in parts]}
    px, anchor = fit(spec["parts"], canvas)
    spec |= {"pxScale": px, "anchorPx": anchor, "lineScale": r(INK_PX / (8 * px))}
    if canvas == "villager":
        spec["light"] = FRONT_LIGHT
    specs[slug] = spec
    zmax, worst = 0.0, 0.0
    for q in spec["parts"]:
        for x, y, z in Hg.part_vertices(q):
            worst = max(worst, -x, -y, x - 1, y - 1)
            zmax = max(zmax, z)
    ok = canvas != "decor1x1" or (worst <= 1e-6 and zmax <= 0.9)
    bad += not ok
    print(f"{slug:26s} parts {len(parts):3d} top {zmax:.3f} outside {worst:.4f}{'' if ok else '  <-- FIX'}")
if bad:
    sys.exit(1)
OUT.mkdir(parents=True, exist_ok=True)
for slug, spec in specs.items():
    (OUT / f"{slug}.json").write_text(json.dumps(spec) + "\n")
