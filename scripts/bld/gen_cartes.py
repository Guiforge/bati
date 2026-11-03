#!/usr/bin/env python3
"""Writes the pilot maquette specs of the frozen cards (windmill, observatory) into
scripts/iso/blockouts/bld/pilote/, one spec per stage, one per add-on, teaser, gag and separate sail sheet.

    python3 scripts/bld/gen_cartes.py

Spec = docs/designs/village-buildings/cards/{windmill,observatory}.md, the numbers of the cards, nothing
else. Each stage starts from the previous one (WM rows, OB functions); the stand-in figures (knight, horse,
donkey, Sage, owl) are built from `seg`/`ball`/`cone`, flat and readable, painted later. Parts carry two
extras the Blender script ignores: `_plate` / `_marker` (as gen_pilot_specs.py) and `_tag` (a figure name,
so render_cartes.py can measure it alone), and the ribbons carry `layer` ("behind" | "sousAiles").
New format shape, tested in test_cartes.py: `sails` with `rects` (flat patches and figures in a blade's plane).
"""

import json
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import gen_pilot_specs as G  # noqa: E402
import kit_maquette as K  # noqa: E402

OUT = G.OUT / "pilote"
D = G.DIAG
S = [D, -D, 0.0]  # screen right
V = [D, D, 0.0]  # toward the viewer
HOOP, MER, EQ = [D, D, 0], [0.95, -0.31, 0], [0.12, -0.12, 0.985]
PX_Z, PX_U = 235.0, 271.5  # screen px per unit, up and along the screen's horizontal

MATS = {
    "crystal": {"tones": ["#5A88AC", "#5A88AC", "#3A5F86"]},
    "culotte": {"tones": ["#5F7A96", "#5F7A96", "#3F5068"]},
    "ruban": {"tones": ["#BCD6E4", "#BCD6E4", "#7FA3BC"]},
    "ciel": {"tones": ["#A8C2D2", "#A8C2D2", "#7C98A8"]},
    "laiton": {"tones": ["#9A7B45", "#9A7B45", "#5E4C34"]},
    "patine": {"tones": ["#6F8F80", "#6F8F80", "#46594F"]},
    "nuit": {"tones": ["#1B2340", "#1B2340", "#141A30"]},
    "fente": {"tones": ["#15192A", "#15192A", "#15192A"]},
}


def put(name, parts, **extra):
    used = {p["mat"] for p in parts}
    mats = {k: v for k, v in MATS.items() if k in used}
    if mats:
        extra["materials"] = mats
    G.OUT = OUT
    G.write(name, parts, **extra)


def tag(parts, name):
    return [{"_tag": name, **p} for p in parts]


def px_to_grid(px, py, z=0.0):
    """The grid point (x, y) whose projection at height z is the canvas pixel (px, py)."""
    d = (px - 448) / 192
    s = 4 + (py - 1280 + PX_Z * z) / 96.67
    return [(s + d) / 2, (s - d) / 2]


def frame(P, fwd):
    f = G.unit(fwd)
    side = [-f[1], f[0], 0.0]
    return lambda a, z=0.0, b=0.0: [P[0] + a * f[0] + b * side[0], P[1] + a * f[1] + b * side[1], P[2] + z]


def tseg(a, b, r, r2, mat, **kw):
    d = G.sub(b, a)
    return G.cone(a, r, r2, G.norm(d), mat, axis=G.unit(d), **kw)


def blob(c, r, mat, **kw):
    return G.part("sphere", mat, center=c, r=r, **kw)


# ---------------------------------------------------------------- stand-in figures

def animal(P, fwd, k, mat, donkey=False, head_up=False, gallop=False):
    """A quadruped in profile along `fwd`, k = 1 is about 0.46 long and 0.46 tall with its head."""
    lp = frame(P, fwd)
    h = 0.52 if head_up else 0.46
    out = [G.seg(lp(-0.14 * k, 0.27 * k), lp(0.12 * k, 0.27 * k), 0.075 * k, mat),
           G.seg(lp(0.10 * k, 0.30 * k), lp(0.19 * k, h * k), 0.045 * k, mat),
           G.seg(lp(0.19 * k, h * k), lp(0.30 * k, (h - 0.06) * k), 0.035 * k, mat),
           G.seg(lp(-0.14 * k, 0.30 * k), lp(-0.22 * k, 0.17 * k), 0.016 * k, "darkwood")]
    for ear in ((0.0,), (0.0,)) if donkey else ():
        out.append(tseg(lp(0.18 * k, (h + 0.02) * k), lp(0.17 * k, (h + 0.16) * k), 0.022 * k, 0.0, mat))
    for a, b in ((-0.11, -0.03), (-0.11, 0.03), (0.09, -0.03), (0.09, 0.03)):
        swing = (0.06 if gallop and a < 0 else -0.06 if gallop else 0.0) * k
        out.append(G.seg(lp(a * k, 0.25 * k, b * k), lp(a * k + swing, 0.0, b * k), 0.02 * k, mat))
    return out


def knight(P, fwd, k, z0, lance="up", hanging=False):
    """A thin knight in a dented helmet. z0 = the saddle, P the horse's origin."""
    lp = frame(P, fwd)
    out = [G.seg(lp(0, z0 * k), lp(0, (z0 + 0.20) * k), 0.045 * k, "iron"),
           G.seg(lp(0, z0 * k), lp(0.05 * k, (z0 - 0.12) * k), 0.025 * k, "iron"),
           G.seg(lp(0, (z0 + 0.17) * k), lp(0.10 * k, (z0 + 0.10) * k), 0.02 * k, "iron"),
           blob(lp(0, (z0 + 0.27) * k), 0.055 * k, "iron"),
           tseg(lp(0, (z0 + 0.30) * k), lp(-0.01 * k, (z0 + 0.40) * k), 0.045 * k, 0.0, "iron")]  # the dented helm's crest
    if lance == "up":
        out.append(G.seg(lp(0.10 * k, (z0 + 0.10) * k), lp(0.12 * k, (z0 + 0.62) * k), 0.012 * k, "wood"))
    elif lance == "fwd":
        out.append(G.seg(lp(-0.10 * k, (z0 + 0.12) * k), lp(0.62 * k, (z0 + 0.15) * k), 0.012 * k, "wood"))
    return out


def knight_on_horse(P, fwd, k, lance="up", head_up=False, gallop=False):
    return tag(animal(P, fwd, k, "darkwood", head_up=head_up, gallop=gallop), "cheval") + \
        tag(knight(P, fwd, k, 0.32, lance), "chevalier")


def sage(P, pose, k=1.0):
    """The Sage on his stool (cards: gag of the observatory). Poses 1 to 5, facing the screen's right."""
    lp = frame(P, S)
    out = []
    if pose != 4 and pose != 5:
        out.append(G.cyl(P, 0.07 * k, 0.17 * k, "wood"))  # the stool
    if pose in (1, 2, 3):
        out.append(tseg(lp(0, 0.17 * k), lp(0, 0.47 * k), 0.10 * k, 0.05 * k, "nuit"))  # robe
        out.append(G.seg(lp(0.02 * k, 0.20 * k), lp(0.13 * k, 0.04 * k), 0.025 * k, "nuit"))  # knee, shin
        hx = 0.04 * k if pose == 3 else 0.0
        out.append(blob(lp(hx, 0.55 * k), 0.06 * k, "plaster"))
        out.append(tseg(lp(hx, 0.58 * k), lp(hx - 0.03 * k, 0.74 * k), 0.075 * k, 0.0, "patine"))  # pointed hat
        out.append(tseg(lp(hx + 0.03 * k, 0.51 * k), lp(hx + 0.02 * k, 0.40 * k), 0.04 * k, 0.0, "plaster"))  # beard
        if pose == 1:  # looks up through the spyglass
            out.append(G.seg(lp(0.05 * k, 0.42 * k), lp(0.26 * k, 0.80 * k), 0.02 * k, "laiton"))
        elif pose == 2:  # smiling, points it at the mug on the ground
            out.append(G.seg(lp(0.05 * k, 0.40 * k), lp(0.26 * k, 0.06 * k), 0.02 * k, "laiton"))
            out.append(G.cyl(lp(0.30 * k, 0.0), 0.04 * k, 0.07 * k, "wood"))
        else:  # asleep, the spyglass across his knees, the owl on it
            sp = (lp(0.0, 0.30 * k), lp(0.30 * k, 0.36 * k))
            out.append(G.seg(*sp, 0.02 * k, "laiton"))
            out += owl(lp(0.22 * k, 0.37 * k), k)
    elif pose == 4:  # fallen backwards off the stool, legs in the air, stars around the head
        out.append(G.cyl(lp(0.10 * k, 0.0, 0.0), 0.07 * k, 0.17 * k, "wood", axis=[-0.9, 0, 0.45]))  # the stool tipped
        out.append(tseg(lp(-0.18 * k, 0.07 * k), lp(0.10 * k, 0.10 * k), 0.09 * k, 0.05 * k, "nuit"))
        out.append(G.seg(lp(0.10 * k, 0.12 * k), lp(0.20 * k, 0.45 * k), 0.025 * k, "nuit"))  # legs up
        out.append(G.seg(lp(0.12 * k, 0.12 * k, 0.04 * k), lp(0.25 * k, 0.40 * k, 0.04 * k), 0.025 * k, "nuit"))
        out.append(blob(lp(-0.24 * k, 0.10 * k), 0.06 * k, "plaster"))
        out.append(tseg(lp(-0.28 * k, 0.12 * k), lp(-0.42 * k, 0.16 * k), 0.07 * k, 0.0, "patine"))
        for i in range(3):  # stars
            a = math.radians(30 + 120 * i)
            out.append(blob(lp(-0.24 * k + 0.13 * k * math.cos(a), 0.22 * k + 0.13 * k * math.sin(a)), 0.022 * k, "plaster"))
        out += tseg_comet(lp, k)
        out += owl(lp(0.34 * k, 0.78 * k), 0.8 * k, flying=True)
    else:  # standing, waves at the little moon, the owl on his hat
        out.append(tseg(lp(0, 0), lp(0, 0.40 * k), 0.10 * k, 0.05 * k, "nuit"))
        out.append(blob(lp(0, 0.50 * k), 0.06 * k, "plaster"))
        out.append(tseg(lp(0, 0.53 * k), lp(-0.02 * k, 0.70 * k), 0.075 * k, 0.0, "patine"))
        out.append(G.seg(lp(0.03 * k, 0.36 * k), lp(0.16 * k, 0.62 * k), 0.022 * k, "nuit"))  # the waving arm
        out.append(blob(lp(0.17 * k, 0.65 * k), 0.03 * k, "plaster"))
        out += owl(lp(-0.02 * k, 0.70 * k), 0.8 * k)
    return tag(out, "sage")


def tseg_comet(lp, k):
    return [tseg(lp(0.55 * k, 0.78 * k), lp(0.05 * k, 0.60 * k), 0.035 * k, 0.0, "patine"),
            blob(lp(0.57 * k, 0.79 * k), 0.035 * k, "ciel")]


def owl(c, k, flying=False):
    out = [tseg(c, G.add(c, [0, 0, 0.17 * k]), 0.065 * k, 0.05 * k, "wood"),
           blob(G.add(c, [0, 0, 0.21 * k]), 0.055 * k, "wood"),
           tseg(G.add(c, [0, 0, 0.25 * k]), G.add(c, [0.02, -0.02, 0.30 * k]), 0.02 * k, 0.0, "darkwood")]
    if flying:
        out += [G.box(G.add(c, [-0.1 * k, 0, 0.12 * k]), [0.2 * k, 0.02, 0.03 * k], "wood", rotZ=0)]
    return tag(out, "hibou")


# ---------------------------------------------------------------- windmill

WM = {  # stage: f (r bottom, r top, h) | cap (z base, r, z top, mat) | pivot | sails scale | sail width
    "rough": dict(f=(0.74, 0.64, 1.04), cap=(1.2, 0.78, 1.7, "thatch"), pivot=(1.4, 1.4, 1.5), scale=0.85, width=0.30),
    "solid": dict(f=(0.74, 0.62, 1.54), cap=(1.7, 0.82, 2.32, "thatch"), pivot=(1.49, 1.49, 2.08), scale=0.95, width=0.30),
    "grand": dict(f=(0.74, 0.60, 2.0), cap=(2.16, 0.86, 2.88, "tile"), pivot=(1.54, 1.54, 2.59), scale=1.05, width=0.30),
    "legendary": dict(f=(0.74, 0.58, 2.29), cap=(2.45, 0.90, 3.17, "tile"), pivot=(1.55, 1.55, 2.88), scale=1.10, width=0.44),
    "mythic": dict(f=(0.74, 0.58, 2.29), cap=(2.45, 0.90, 3.17, "tile"), pivot=(1.55, 1.55, 2.88), scale=1.18, width=0.44),
}
WM_ORDER = list(WM)
PERCHE_FOOT = (1.88, 0.12, 0.04)


def ane_parts():
    """The donkey and the horse tied to the tail pole (card: add-on, box 680-810 x 1010-1100)."""
    P = [*px_to_grid(695, 1096), 0.0]  # a little left of the box centre: the horse's tail stays in the 2 x 2
    lp = frame(P, S)
    a, h = lp(-0.04, 0.0, -0.12), lp(0.10, 0.0, 0.10)  # the donkey behind, the horse in front
    return tag(animal(a, [-D, D, 0], 0.72, "stone", donkey=True), "ane") + \
        tag(animal(h, [-D, D, 0], 0.82, "wood"), "cheval")


def windmill(stage):
    s = WM[stage]
    k = WM_ORDER.index(stage)
    r0, r1, fh = s["f"]
    zc, rc, ztop, cmat = s["cap"]

    def rf(z):
        return r0 + (r1 - r0) * (z - 0.16) / fh

    P = [G.plate(),
         K.plinth([1, 1, 0.04], 0.82, 0.12),
         K.tower([1, 1, 0.16], r0, r1, fh),
         K.roof([1, 1, zc], rc, ztop - zc, cmat),
         G.box([0.82, 1.70, 0.16], [0.36, 0.06, 0.55], "darkwood", accroche="porte"),
         G.box([0.78, 1.72, 0.16], [0.44, 0.14, 0.05], "stone"),
         G.box([1 + rf(0.85) - 0.03, 0.9, 0.73], [0.06, 0.2, 0.24], "amber"),
         G.cyl(G.sub(s["pivot"], G.mul(G.AXIS, 0.46)), 0.08, 0.46, "wood" if stage == "rough" else "iron", axis=G.AXIS),
         G.seg(list(PERCHE_FOOT), [1.52, 0.48, zc - 0.02], 0.08, "wood")]
    for sgn in (-1, 1):  # struts, their top end at r 0.78
        a = math.radians(-45 + sgn * 15)
        zs = zc - 0.4
        P.append(G.seg([1 + (rf(zs) - 0.01) * math.cos(a), 1 + (rf(zs) - 0.01) * math.sin(a), zs],
                       [1 + 0.78 * math.cos(a), 1 + 0.78 * math.sin(a), zc - 0.02], 0.04, "wood"))
    if k >= 1:  # capstan with its two bars, three sacks
        P += [G.cyl([1.82, 0.18, 0.04], 0.16, 0.12, "wood"),
              G.box([1.66, 0.16, 0.16], [0.32, 0.04, 0.04], "wood"),
              G.box([1.80, 0.02, 0.2], [0.04, 0.32, 0.04], "wood"),
              G.cone([0.32, 1.84, 0.04], 0.14, 0.10, 0.16, "canvas"),
              G.cone([0.32, 1.84, 0.2], 0.10, 0.05, 0.14, "canvas"),
              G.cone([0.54, 1.82, 0.04], 0.10, 0.06, 0.14, "canvas")]
    if k >= 2:  # gallery r 0.86 with its rail (the tail pole passes by post 14), oven, chimney, mouth
        P.append(G.cyl([1, 1, 1.40], 0.86, 0.05, "wood"))
        pts = [[1 + 0.83 * math.cos(math.radians(22.5 * i)), 1 + 0.83 * math.sin(math.radians(22.5 * i)), 1.65] for i in range(16)]
        for i in range(16):
            if i != 14:
                P.append(G.cyl([pts[i][0], pts[i][1], 1.45], 0.025, 0.22, "wood"))
            if i not in (13, 14):
                P.append(G.seg(pts[i], pts[(i + 1) % 16], 0.025, "wood"))
        P += [G.box([0.04, 1.28, 0.04], [0.38, 0.38, 0.36], "stone"),
              G.cyl([0.16, 1.5, 0.4], 0.12, 0.85, "stone", accroche="cheminee"),
              G.box([0.16, 1.64, 0.1], [0.14, 0.04, 0.14], "amber")]
    # no breeches in the maquette: the cloth is painted apart and placed by script on the rail (sondes3)
    if k >= 4:  # one broken raw shard in one piece (no collar, no ring, no rim): a tilted cone and a jagged shoulder, top near px y 67
        P.append(G.cone([1, 1, 3.07], 0.19, 0.03, 1.27, "crystal", axis=G.unit([0.10, -0.08, 1.0])))
        P.append(G.box([0.9, 0.92, 3.3], [0.2, 0.14, 0.5], "crystal", rotZ=30))
    P.append(G.cyl([0.66, 1.78, 0.04], 0.08, 0.33, "banner", _marker="gardien"))
    P.append(G.cyl([1.72, 1.72, 0.04], 0.28, 0.01, "banner", _marker="gag"))
    put(f"windmill_{stage}", P, pivot=G.vec(s["pivot"]), sailsScale=s["scale"])


def sail_sheet(name, width, rects=(), mat="canvas"):
    """A sails sheet (768 canvas): the bare blades, then `rects` = (mat, [[blade, d0, d1, u0, u1], ...])."""
    parts = [{"type": "sails", "length": 1.25, "width": width, "hub": 0.09, "mat": mat}]
    for mat, rs in rects:
        parts.append({"type": "sails", "length": 1.25, "width": width, "hub": 0.09, "mat": mat, "rects": rs})
    mats = {k: v for k, v in MATS.items() if k in {p["mat"] for p in parts}}
    (OUT / f"windmill_sails_{name}.json").write_text(
        json.dumps({"canvas": "sails", **({"materials": mats} if mats else {}), "parts": parts}) + "\n", encoding="utf-8")


def knight_on_blade(length):
    """The knight hanging by his belt on the outer third of blade 0 (up right at rest), feet toward the tip:
    `length` is his height in sheet px / 271.5. Helmet toward the hub."""
    d0 = 1.25 - 0.06 - length
    h = length
    return ("iron", [[0, d0, d0 + 0.2 * h, -0.045, 0.045],  # helmet
                     [0, d0 + 0.2 * h, d0 + 0.6 * h, -0.05, 0.05],  # body
                     [0, d0 + 0.6 * h, d0 + h, -0.045, -0.005], [0, d0 + 0.6 * h, d0 + h, 0.005, 0.045],  # legs
                     [0, d0 + 0.25 * h, d0 + 0.5 * h, -0.11, 0.11]])  # arms flung out


def sails_all():
    # round 4: the old breeches patch moved from blade 2 (lower left, over the door) to blade 1 (upper left, in the open sky), 0.12 further out
    # final round: rects drew a ladder (one ink outline per rect), so the rough sheet is bare and final_guides.py draws the
    # breeches as one polygon with one outline (blade 1, waist toward the tip, legs toward the hub)
    sail_sheet("rough", 0.30)
    sail_sheet("solid", 0.30)
    sail_sheet("grand", 0.30)
    sail_sheet("grand_chevalier", 0.30, [knight_on_blade(76 / PX_U)])
    sail_sheet("legendary_chevalier", 0.44, [knight_on_blade(73 / PX_U)], "ciel")
    sail_sheet("legendary", 0.44, mat="ciel")

def ribbons():
    """Two thin wind ribbons, never joined (round 4: thinner, varying width, free of the tower except one pass at gallery height):
    60 cone steps each. Ribbon 1 swings round in the air and touches the tower at the gallery height (z 1.35 to 1.72) once;
    ribbon 2 starts above the gallery and climbs round the roof to the peak, ending at the peak radius + 0.12 as the card says."""
    r1 = dict(ph=200, z0=0.95, z1=2.30, tours=0.8, wob=0.0,
              rho=[(0.95, 1.30), (1.25, 1.22), (1.40, 0.98), (1.72, 0.98), (1.90, 1.22), (2.30, 1.30)])
    r2 = dict(ph=20, z0=1.95, z1=3.90, tours=1.5, wob=1.3,
              rho=[(1.95, 1.30), (2.45, 1.12), (3.05, 0.41), (3.22, 0.39), (3.52, 0.32), (3.90, 0.24)])
    out = []

    def rho_at(rho, z):
        for (za, ra), (zb, rb) in zip(rho, rho[1:]):
            if za <= z <= zb:
                return ra + (rb - ra) * (z - za) / (zb - za)
        return rho[-1][1]

    def at(spec, t):
        z = spec["z0"] + (spec["z1"] - spec["z0"]) * t
        a = math.radians(spec["ph"] + 360 * spec["tours"] * t)
        rho = rho_at(spec["rho"], z)
        return [1 + rho * (math.cos(a) * D - math.sin(a) * D), 1 + rho * (math.cos(a) * D + math.sin(a) * D), z]

    def rad(t, wob):  # r 0.05 at the widest (27 px, 5.4 dp), varying along the ribbon, pointed at both ends
        return 0.05 * math.sin(math.pi * t) ** 1.2 * (1 + 0.45 * math.sin(7 * t + wob)) + 0.004

    n = 60
    for spec in (r1, r2):
        for i in range(n):
            a, b = at(spec, i / n), at(spec, (i + 1) / n)
            mid = [(u + v) / 2 for u, v in zip(a, b)]
            layer = "sousAiles" if mid[0] + mid[1] > 2 else "behind"
            out.append(tseg(a, b, rad(i / n, spec["wob"]), rad((i + 1) / n, spec["wob"]), "ruban", layer=layer))
    put("windmill_rubans", out)


def windmill_extras():
    # teaser r2: the capstan on wedges and cut stones, at the foot of the pole (1.78 ; 0.30)
    P = [G.box([1.62, 0.26, 0.04], [0.30, 0.10, 0.07], "wood"), G.box([1.66, 0.12, 0.04], [0.10, 0.30, 0.07], "wood"),
         G.cyl([1.78, 0.28, 0.11], 0.15, 0.15, "wood"), G.box([1.80, 0.40, 0.04], [0.20, 0.16, 0.12], "stone"),
         G.box([1.62, 0.44, 0.04], [0.14, 0.14, 0.09], "stone"), G.box([1.98 - 0.16, 0.30, 0.16], [0.16, 0.12, 0.08], "stone")]
    put("windmill_teaser_r2", P)
    # teaser r4: the base of the oven and a pile of bricks, at (0.23 ; 1.58)
    P = [G.box([0.04, 1.28, 0.04], [0.38, 0.38, 0.14], "stone"), G.box([0.10, 1.34, 0.18], [0.26, 0.26, 0.04], "stone"),
         G.box([0.04, 1.68, 0.04], [0.30, 0.14, 0.07], "tile"), G.box([0.08, 1.70, 0.11], [0.22, 0.12, 0.07], "tile"),
         G.box([0.20, 1.66, 0.18], [0.14, 0.10, 0.06], "tile")]
    put("windmill_teaser_r4", P)
    # teaser r6: a mast on the cap and the blue cloth rolled around it
    z = 2.88
    P = [G.cyl([1, 1, z], 0.03, 0.62, "wood"), G.cyl([1, 1, z + 0.20], 0.085, 0.26, "ciel"),
         G.seg([1, 1, z + 0.58], [1 + D * 0.22, 1 - D * 0.22, z + 0.50], 0.012, "wood")]
    put("windmill_teaser_r6", P)
    # teaser r8: a small hoist (A-frame, block and rope) on the cap, a raw crystal shard slung from it
    def cap_xy(z, a):
        r = 0.9 + (0.04 - 0.9) * (z - 2.45) / 0.72
        return [1 + r * math.cos(a), 1 + r * math.sin(a)]
    top = [1 + D * 0.0, 1 - D * 0.0, 3.62]
    P = []
    for ang in (math.radians(-135), math.radians(-30)):  # the two legs stand on the cap, one each side of the spike's place
        x, y = cap_xy(3.0, ang)
        P.append(G.seg([x, y, 3.0], [1 + D * 0.0 + 0.1 * math.cos(ang), 1 + 0.1 * math.sin(ang), 3.62], 0.035, "wood"))
    P += [G.seg([1, 1, 3.62], [1 - D * 0.24, 1 + D * 0.24, 3.50], 0.03, "wood"),
          G.cyl([1 - D * 0.24, 1 + D * 0.24, 3.30], 0.01, 0.20, "wood"),
          tseg([1 - D * 0.24, 1 + D * 0.24, 3.30], [1 - D * 0.30, 1 + D * 0.30, 3.08], 0.07, 0.0, "crystal")]
    put("windmill_teaser_r8", P)
    # teaser r9: the biggest scaffold around the half-built spike (collar, first section, hoisted second)
    cx, cy = 1.0, 1.0
    P = [G.cone([1, 1, 3.05], 0.11, 0.29, 0.17, "iron"), G.cone([1 + D * 0.03, 1 - D * 0.03, 3.22], 0.27, 0.20, 0.30, "crystal"),
         G.cone([1 - D * 0.04, 1 + D * 0.04, 3.52], 0.20, 0.11, 0.40, "crystal")]
    poles = [[cx + D * a + D * b, cy - D * a + D * b] for a in (-0.30, 0.30) for b in (-0.30, 0.30)]
    for x, y in poles:
        P.append(G.seg([x, y, 2.9], [x, y, 3.82], 0.03, "wood"))
    for zr in (3.05, 3.45, 3.82):
        for (x0, y0), (x1, y1) in ((poles[0], poles[1]), (poles[1], poles[3]), (poles[3], poles[2]), (poles[2], poles[0])):
            P.append(G.seg([x0, y0, zr], [x1, y1, zr], 0.022, "wood"))
    P += [G.seg([*poles[0], 3.05], [*poles[3], 3.45], 0.015, "wood"), G.seg([*poles[1], 3.05], [*poles[2], 3.45], 0.015, "wood")]
    put("windmill_teaser_r9", P)
    put("windmill_addon_ane", ane_parts())
    # gags: the knight and the horse in the slot (1.74 ; 1.74), the knight alone beside the keeper, the picnic
    slot = [1.74, 1.74, 0.04]
    put("windmill_gag_r2", knight_on_horse(slot, [-D, D, 0], 0.95, "up", head_up=True))
    put("windmill_gag_r4", knight_on_horse([1.66, 1.82, 0.04], [0.5, -1.0, 0], 1.0, "fwd", gallop=True)
        + [tseg([1.86, 1.70, 0.05 + 0.04 * i], [1.97, 1.74, 0.09 + 0.05 * i], 0.05, 0.02, "plaster") for i in range(3)])
    put("windmill_gag_r6", tag(animal(slot, [-D, D, 0], 0.95, "darkwood", head_up=True), "cheval"))
    # r8: the knight seated beside the keeper, helmet next to him, offering his bread (centre px 305, 1135)
    P0 = [*px_to_grid(305, 1160), 0.04]
    lp = frame(P0, S)
    kn = [tseg(lp(0, 0.04), lp(0, 0.30), 0.06, 0.045, "iron"), G.seg(lp(0, 0.06), lp(0.14, 0.04), 0.03, "iron"),
          G.seg(lp(0.14, 0.04), lp(0.16, 0.0), 0.025, "iron"), blob(lp(0, 0.36), 0.055, "iron"),
          G.seg(lp(0.02, 0.26), lp(0.18, 0.28), 0.02, "iron"), G.cyl(lp(0.19, 0.27), 0.03, 0.04, "canvas"),
          tseg(lp(-0.12, 0.0), lp(-0.12, 0.08), 0.05, 0.03, "iron")]
    put("windmill_gag_r8", tag(kn, "chevalier"))
    # r10: the knight and his squire picnic on the gallery rail, legs hanging, the lance as the gallery's mast
    base = [1 + 0.83 * D, 1 + 0.83 * D, 1.65]
    lp = frame(base, S)
    P = [G.box(G.sub(lp(-0.30, 0.0, 0.0), [0.0, 0.0, -0.0]), [0.50, 0.30, 0.02], "canvas", rotZ=-45)]
    for u, mat in ((-0.12, "iron"), (0.13, "wood")):
        P.append(tseg(lp(u, 0.0, 0.0), lp(u, 0.33), 0.055, 0.045, mat))
        P.append(blob(lp(u, 0.40), 0.05, "plaster"))
        P.append(G.seg(lp(u, 0.02, 0.0), lp(u, 0.02, 0.14), 0.03, mat))
        P.append(G.seg(lp(u, 0.02, 0.14), lp(u, -0.30, 0.16), 0.03, mat))
    P.append(G.seg([1.5, 1.5, 1.45], [1.5, 1.5, 2.50], 0.02, "wood"))
    P.append(G.box([1.5, 1.49, 2.30], [0.20, 0.01, 0.07], "ruban"))
    put("windmill_gag_r10", tag(P, "chevalier"))


# ---------------------------------------------------------------- observatory

OB_ORDER = ["rough", "solid", "grand", "legendary", "mythic"]
C = [0.82, 1.46, 3.61]
R = 0.66


def at_dir(p, dirv, d):
    return G.add(p, G.mul(G.unit(dirv), d))


def sx_sy(p):
    return 192 * (p[0] - p[1]), 96.67 * (p[0] + p[1]) - PX_Z * p[2]


PIVOT = [1.2, 0.95, 1.75]
TUBE_L = 2.2  # twice the old tube (1.1), straight
TUBE_DIR = G.unit([-0.11, 1.19, 1.85])
TUBE_TIP = G.add(PIVOT, G.mul(TUBE_DIR, TUBE_L))
DOME_C, DOME_Z, DOME_R, DOME_H = [1.2, 0.95], 1.45, 0.66, 1.05  # rounder and taller cap than solid (apex 2.05)


def open_dome(pivot, tip, slot):
    """Dome as latitude rings of segments: a through-cut channel (screen space) around the tube is left empty,
    so the void shows in black. The base is plain cones."""
    c = DOME_C
    p0, p1 = sx_sy(pivot), sx_sy(tip)
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    dn = math.hypot(dx, dy)
    dx, dy = dx / dn, dy / dn

    def in_slot(q):
        u, v = q[0] - p0[0], q[1] - p0[1]
        return u * dx + v * dy > -8 and abs(u * dy - v * dx) < slot * 0.7 + 0.36 * (u * dx + v * dy)

    out = []
    for la, lb in ((0, 14),):
        ra, rb = DOME_R * math.cos(math.radians(la)), DOME_R * math.cos(math.radians(lb))
        za, zb = DOME_Z + DOME_H * math.sin(math.radians(la)), DOME_Z + DOME_H * math.sin(math.radians(lb))
        out.append(G.cone([*c, za], ra, rb, zb - za, "iron", roof=True))
    n = 28
    for lat in (18, 27, 36, 45, 54, 63, 72, 80, 86):
        rr = (DOME_R - 0.03) * math.cos(math.radians(lat))
        z = DOME_Z + DOME_H * math.sin(math.radians(lat))
        pts = [[c[0] + rr * math.cos(2 * math.pi * i / n), c[1] + rr * math.sin(2 * math.pi * i / n), z] for i in range(n + 1)]
        for a, b in zip(pts, pts[1:]):
            m = G.mul(G.add(a, b), 0.5)
            if not in_slot(sx_sy(m)):
                out.append(G.seg(a, b, 0.07, "iron", roof=True))
    return out


def armillary(c, R=0.32):
    """Two crossed rings and a tilted axis, on a foot, clear of the dome: reads as a sphere, not a coil."""
    ax = G.unit([0.12, -0.12, 0.985])
    P = G.ring(c, R, HOOP, 28, 0.03, "laiton") + G.ring(c, R, G.unit(G.add(G.mul(S, 0.8), [0, 0, 0.6])), 28, 0.03, "patine")
    low = G.sub(c, G.mul(ax, R + 0.20))
    P.append(G.seg(low, G.add(c, G.mul(ax, R + 0.12)), 0.022, "laiton"))
    P += [G.cyl([low[0], low[1], 0.04], 0.17, 0.08, "laiton"), G.cone([low[0], low[1], 0.12], 0.13, 0.065, 0.40, "laiton"),
          G.cyl([low[0], low[1], 0.52], 0.065, low[2] - 0.52, "laiton")]
    return P


def observatory(stage):
    k = OB_ORDER.index(stage)
    P = [G.plate(), G.box([0.84, 1.82, 0.04], [0.32, 0.06, 0.38 if k == 0 else 0.55], "darkwood", accroche="porte")]
    if k == 0:
        P += [G.cyl([1, 1, 0.04], 0.85, 0.46, "stone"), G.cyl([1, 1, 0.5], 0.80, 0.03, "wood")]
        P += G.telescope(1.05, 2.15, 0.09, "wood", foot_xy=(1.22, 0.92), tip_xy=(0.84, 1.22))
        for a in ([0.75, 1.45, 0.53], [1.45, 0.75, 0.53], [0.70, 0.70, 0.53]):
            P.append(G.seg(a, [1.05, 1.05, 1.40], 0.05, "wood"))
        P += G.sky_map(0.53, (1.62, 0.62))
    else:
        P += [G.cyl([1, 1, 0.04], 0.85, 0.96, "stone"),
              G.box([1.82, 0.82, 0.45], [0.06, 0.2, 0.28], "amber"), G.box([1.22, 1.76, 0.45], [0.16, 0.06, 0.28], "amber")]
        P += G.sky_map(1.0, (1.62, 0.62))
        P.append(G.cyl([1.25, 0.95, 1.0], 0.60, 0.45, "stone"))
        if k == 1:
            for z, ra, rb, h in ((1.45, 0.60, 0.52, 0.30), (1.75, 0.52, 0.30, 0.22), (1.97, 0.30, 0.0, 0.08)):
                P.append(G.cone([1.25, 0.95, z], ra, rb, h, "iron", roof=True))
            P += G.telescope(1.70, 2.39, 0.09, "darkwood", foot_xy=(1.25, 0.82), tip_xy=(1.095, 1.05))
            for a in ([1.44, 1.60, 1.0], [1.52, 1.62, 1.0], [1.58, 1.56, 1.0]):  # the folded tripod
                P.append(G.seg(a, [1.50, 1.52, 1.64], 0.04, "wood"))
        else:
            tip = {3: ((0.966, 1.242), 2.96)}.get(k)
            if k == 4:  # the spyglass aims at the middle of the disc, its tip just inside the sphere
                foot = [1.25, 0.82, 1.70]
                t = at_dir(C, G.sub(foot, C), 0.60)
                tip = ((t[0], t[1]), t[2])
            if k == 2:
                P += open_dome(PIVOT, TUBE_TIP, 70)
                P.append(G.seg([*DOME_C, DOME_Z], PIVOT, 0.08, "wood"))  # the tripod, now under the open dome
                # one straight tube out of the slot, a thin cap at the end: nothing that reads as a claw
                P.append(tseg(G.sub(PIVOT, G.mul(TUBE_DIR, 0.15)), G.sub(TUBE_TIP, G.mul(TUBE_DIR, 0.12)), 0.045, 0.06, "laiton"))
                P.append(G.seg(G.sub(TUBE_TIP, G.mul(TUBE_DIR, 0.14)), TUBE_TIP, 0.075, "laiton"))
            else:  # legendary and mythic keep their tube (the column's V): the dome opens along it
                foot = [1.25, 0.82, 1.70]
                P += open_dome(foot, [tip[0][0], tip[0][1], tip[1]], 52)
                P += G.telescope(1.70, tip[1], 0.09, "laiton", sleeve=True, foot_xy=(1.25, 0.82), tip_xy=tip[0])
            P += armillary([1.76, 0.26, 2.0])
    if k >= 3:
        P.append(G.cone([0.82, 1.46, 1.0], 0.29, 0.13, 1.95, "stone"))
        P.append(G.seg([0.82, 1.46, 2.35], [0.46, 1.82, 3.19], 0.07, "iron"))
        if k == 3:  # the cradle: half of the ring, t from 0 to 180 degrees
            pts = [[C[0] + R * math.cos(math.radians(7.5 * i)) * D, C[1] - R * math.cos(math.radians(7.5 * i)) * D,
                    C[2] - R * math.sin(math.radians(7.5 * i))] for i in range(25)]
            P += [G.seg(pts[i], pts[i + 1], 0.05, "laiton") for i in range(24)]
    if k == 4:
        P += G.ring(C, R, HOOP, 48, 0.05, "laiton") + G.ring(C, R, MER, 48, 0.05, "patine") + G.ring(C, R, EQ, 48, 0.05, "patine")
        P.append(G.cyl(G.sub(C, [0.01, 0, 0]), 0.30, 0.02, "nuit", axis=[1, 0, 0]))
        P += G.ring(C, 0.31, [1, 0, 0], 32, 0.02, "laiton")
        P.append(G.seg(G.add(C, [0, 0, 0.31]), G.add(C, [0, 0, R]), 0.02, "laiton"))
        P.append(G.seg(G.sub(C, [0, 0, 0.31]), G.sub(C, [0, 0, R]), 0.02, "laiton"))
        P += G.ball([1.177, 1.103, 4.034], 0.13, 8, "plaster")
    P.append(G.cyl([0.22, 1.78, 0.04], 0.21, 0.01, "banner", _marker="gag"))
    put(f"observatory_{stage}", P)


def scaffold(centre, half, z0, z1, rungs, braces=True):
    """Four poles at `half` on the screen's horizontal and depth, rungs between them."""
    cx, cy = centre
    poles = [[cx + D * a + D * b, cy - D * a + D * b] for a in (-half, half) for b in (-half * 0.6, half * 0.6)]
    out = [G.seg([x, y, z0], [x, y, z1], 0.03, "wood") for x, y in poles]
    ring_order = (poles[0], poles[1], poles[3], poles[2])
    for zr in rungs:
        for i in range(4):
            a, b = ring_order[i], ring_order[(i + 1) % 4]
            out.append(G.seg([*a, zr], [*b, zr], 0.022, "wood"))
    if braces:
        out += [G.seg([*poles[0], rungs[0]], [*poles[3], rungs[-1]], 0.015, "wood"),
                G.seg([*poles[1], rungs[0]], [*poles[2], rungs[-1]], 0.015, "wood")]
    return out


def observatory_extras():
    # teaser b6: the first drums of the column under a hoist, on the terrace (column foot 0.82 ; 1.46)
    P = [G.cyl([0.82, 1.46, 1.0], 0.29, 0.20, "stone"), G.cyl([0.84, 1.44, 1.20], 0.26, 0.20, "stone")]
    P += [G.seg([0.56, 1.62, 1.0], [0.62, 1.50, 1.92], 0.04, "wood"), G.seg([0.74, 1.74, 1.0], [0.62, 1.50, 1.92], 0.04, "wood"),
          G.seg([0.62, 1.50, 1.92], [0.86, 1.36, 1.84], 0.035, "wood"), G.cyl([0.86, 1.36, 1.55], 0.01, 0.29, "wood"),
          G.box([0.80, 1.31, 1.36], [0.12, 0.10, 0.12], "stone")]
    put("observatory_teaser_b6", P)
    # teaser b9: a scaffold around the cradle, the tarpaulined disc being hoisted
    P = scaffold((C[0], C[1]), 0.40, 3.04, 4.02, (3.25, 3.62, 3.98))
    P.append(G.cyl(G.sub(C, [0.01, 0, 0]), 0.30, 0.05, "canvas", axis=[1, 0, 0]))
    P.append(G.seg(G.add(C, [0, 0, 0.30]), [C[0], C[1], 3.98], 0.012, "wood"))
    P += [G.seg([0.82, 1.46, 2.35], [C[0] - 0.2, C[1] - 0.12, 3.04], 0.035, "wood")]
    put("observatory_teaser_b9", P)
    slot = [*px_to_grid(148, 1100), 0.04]
    for i in range(1, 6):
        put(f"observatory_gag_{i}", sage(slot, i))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for f in OUT.glob("*.json"):
        f.unlink()
    for st in WM_ORDER:
        windmill(st)
    sails_all()
    ribbons()
    windmill_extras()
    for st in OB_ORDER:
        observatory(st)
    observatory_extras()
    print(f"{len(list(OUT.glob('*.json')))} specs in {OUT}")


if __name__ == "__main__":
    main()
