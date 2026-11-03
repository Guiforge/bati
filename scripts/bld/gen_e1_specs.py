#!/usr/bin/env python3
"""Writes the six E1 maquette specs (windmill A B C, observatory A B C, mythic) into
scripts/iso/blockouts/bld/e1/, from docs/designs/village-buildings/explore/E1/directions.md.

    python3 scripts/bld/gen_e1_specs.py

Same canvas, 2 x 2 slab and camera as the pilot stages (gen_pilot_specs.py, imported). Where
card-sheet.md "Consignes pour les cartes" and directions.md disagree, the card sheet wins; the
differences are marked `card-sheet:` below. Only this folder is written, the pilot specs are not touched.
"""

import json
import math
import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import gen_pilot_specs as G  # noqa: E402

OUT = pathlib.Path(__file__).resolve().parent.parent / "iso" / "blockouts" / "bld" / "e1"
DIAG = G.DIAG
CRYSTAL = {"crystal": {"tones": ["#A9D4E8", "#5F9FC4", "#2F5F86"]}}


def sphere(center, r, mat, **kw):
    return G.part("sphere", mat, center=center, r=r, **kw)


def pt(d, z, s=1):
    """directions.md `Pt(d, z)`: d along the screen's horizontal, s = +1 right, -1 left."""
    return [1 + DIAG * s * d, 1 - DIAG * s * d, z]


def capture(fn, *a):
    """The parts a pilot generator would write, without writing them."""
    got, real_out, real_write = {}, G.OUT, G.write
    G.OUT = pathlib.Path(tempfile.mkdtemp())
    G.write = lambda name, parts, **extra: got.update({name: (parts, extra)})
    try:
        fn(*a)
    finally:
        G.OUT, G.write = real_out, real_write
    return got


# ---------------------------------------------------------------- windmill

def windmill_base():
    parts, extra = capture(G.windmill, "legendary")["windmill_legendary"]
    out = []
    for p in parts:
        if p["type"] == "cyl" and p["r"] == 0.035:  # the mast
            continue
        iron_vane = p["mat"] == "iron" and (p.get("r") in (0.03, 0.07) or p.get("rotZ") == 45)
        if iron_vane:  # the whole vane down by 0.25
            k = "center" if "center" in p else "at"
            p = dict(p, **{k: [*p[k][:2], round(p[k][2] - 0.25, 4)]})
        if p["mat"] == "plaster" and p["type"] == "box" and p["at"] == [0.9, 1.57, 0.8]:
            p = dict(p, mat="amber")  # the crest, as the mythic
        out.append(p)
    return out, extra


def windmill_a():
    c = [G.cyl([1, 1, 3.05], 0.10, 0.22, "iron"),
         G.cone([1, 1, 3.22], 0.13, 0.24, 0.30, "crystal", verts=8),
         G.cone([1, 1, 3.52], 0.24, 0.0, 0.88, "crystal", verts=8),
         G.cone([1, 1, 3.30], 0.09, 0.0, 0.55, "crystal", verts=8, axis=[0.40, -0.40, 0.82]),
         G.cone([1, 1, 3.28], 0.07, 0.0, 0.40, "crystal", verts=8, axis=[-0.35, 0.35, 0.87])]
    return c, CRYSTAL


def windmill_b():
    return [G.cone([1, 1, 3.10], 0.14, 0.07, 0.25, "iron"),
            G.cyl([1, 1, 3.30], 0.07, 0.56, "iron"),
            G.cyl([1, 1, 3.80], 0.05, 0.25, "iron", axis=G.AXIS)], {}


def windmill_c():
    P = [G.cone([1, 1, 3.05], 0.20, 0.10, 0.20, "iron")]
    for s in (1, -1):
        way = [pt(0.06, 3.10, s), pt(0.40, 3.45, s), pt(0.50, 3.85, s), pt(0.42, 4.15, s), pt(0.58, 4.38, s)]
        for i in range(4):
            P.append(G.seg(way[i], way[i + 1], 0.065 if i < 3 else 0.05, "iron"))
    P.append(G.seg(pt(0.46, 4.10, 1), pt(0.46, 4.10, -1), 0.06, "iron"))
    for d in (-0.26, 0, 0.26):
        P.append(G.seg(pt(0.8 * d, 3.28), pt(d, 4.10), 0.022, "canvas"))
    return P, {}


# ---------------------------------------------------------------- observatory

def observatory_a2():
    """A2: after S-A, A read as a Well 8 times of 8 (low globe on two posts and a low drum). Two stiff telamons
    stand on the slab beside the drum (legs, hips, shoulders, head above the shoulder bar, arms folded up behind
    the head to the globe), under a globe bigger than the drum and raised, long telescope out of its slit at the
    upper left, two orrery ring arcs. Never a single figure holding a ball, never a famous statue pose."""
    P = observatory_base()
    P.append(G.cyl([1, 1, 1.0], 0.50, 0.18, "stone"))  # stump, no neck and no dome
    C = [1, 1, 3.25]
    D, K = 0.85, dict(roof=False)
    for s in (1, -1):
        for dd in (-0.14, 0.14):  # two legs, the gap between them reads against the sky map
            P.append(G.cyl(pt(D + dd, 0.04, s), 0.085, 1.11, "stone", **K))
        P.append(G.cone(pt(D, 1.15, s), 0.24, 0.20, 0.50, "stone", **K))  # hips and waist
        P.append(G.cone(pt(D, 1.65, s), 0.20, 0.27, 0.38, "stone", **K))  # chest
        P.append(G.seg(pt(D - 0.30, 2.0, s), pt(D + 0.30, 2.0, s), 0.115, "stone", **K))  # shoulders
        P.append(G.cyl(pt(D, 1.98, s), 0.085, 0.16, "stone", **K))  # neck
        P.extend(G.ball(pt(D, 2.35, s), 0.17, 6, "stone", **K))  # head, air on both sides of it
        # elbows out wide, forearms folded up behind the head to the globe
        for dsh, delb, zel, dh, zh in ((D - 0.30, D - 0.43, 2.35, D - 0.40, 2.68), (D + 0.30, D + 0.40, 2.40, D - 0.03, 2.95)):
            P.append(G.seg(pt(dsh, 2.0, s), pt(delb, zel, s), 0.095, "stone", **K))
            P.append(G.seg(pt(delb, zel, s), pt(dh, zh, s), 0.085, "stone", **K))
    P.append(sphere(C, 0.85, "iron"))  # a full globe, slit and band are paint
    P += G.telescope(C[2], 4.25, 0.075, "plaster", sleeve=True, foot_xy=(1, 1), tip_xy=(0.2, 1.8))
    P += G.ring(C, 1.0, [0.55, 0.55, 0.62], 24, 0.045, "iron")
    return P


def observatory_base():
    """observatory("mythic") without dome, titan, plinth and globe: slab, door, drum, windows, sky map,
    terrace pennant, drum banner, crest, gag slot."""
    P = [G.plate(),
         G.box([0.84, 1.82, 0.04], [0.32, 0.06, 0.55], "darkwood", accroche="porte"),
         G.cyl([1, 1, 0.04], 0.85, 0.96, "stone"),
         G.box([1.82, 0.82, 0.45], [0.06, 0.2, 0.28], "amber"),
         G.box([1.22, 1.76, 0.45], [0.16, 0.06, 0.28], "amber")]
    P += G.sky_map(1.0, (1.65, 0.95))
    P += [G.cyl([1.7, 1.25, 1.0], 0.025, 0.75, "iron"),
          G.box([1.72, 1.24, 1.55], [0.26, 0.02, 0.12], "banner"),
          G.box([0.42, 1.66, 0.42], [0.18, 0.05, 0.45], "banner"),
          G.box([0.92, 1.83, 0.7], [0.16, 0.05, 0.2], "amber"),
          G.cyl([0.22, 1.78, 0.04], 0.21, 0.01, "banner", _marker="gag")]
    return P


def dome_and_scope():
    """Neck and dome of observatory("grand"), telescope tip raised from z 3.2 to 3.8."""
    P = [G.cyl([1.1, 1.1, 1.0], 0.60, 0.45, "stone")]
    for z, ra, rb, h in ((1.45, 0.60, 0.52, 0.30), (1.75, 0.52, 0.30, 0.22), (1.97, 0.30, 0.0, 0.08)):
        P.append(G.cone([1.1, 1.1, z], ra, rb, h, "iron", roof=True))
    return P + G.telescope(1.1, 3.8, 0.075, "plaster", sleeve=True)


def observatory_a():
    P = observatory_base()
    P.append(G.cyl([1, 1, 1.0], 0.50, 0.18, "stone"))  # stump, no neck and no dome
    for s in (1, -1):
        k = dict(roof=False)
        P.append(G.cyl(pt(0.64, 1.0, s), 0.25, 0.10, "stone", **k))
        P.append(G.cone(pt(0.64, 1.10, s), 0.21, 0.17, 0.55, "stone", **k))
        P.append(G.cone(pt(0.64, 1.65, s), 0.17, 0.23, 0.80, "stone", **k))
        P.append(sphere(pt(0.40, 2.50, s), 0.15, "stone", **k))
        # card-sheet: arms folded behind the head, the hand on the globe (directions.md: the hand
        # up at Pt(0.74 ; 3.22), which reads as a figure holding a ball up)
        P.append(G.seg(pt(0.88, 2.36, s), pt(1.14, 2.72, s), 0.105, "stone", **k))
        P.append(G.seg(pt(1.14, 2.72, s), pt(0.52, 2.85, s), 0.095, "stone", **k))
    P.append(sphere([1, 1, 3.20], 0.66, "iron"))  # card-sheet: a full globe (slit and band are paint)
    P += G.telescope(3.20, 4.20, 0.075, "plaster", sleeve=True, foot_xy=(1, 1), tip_xy=(0.30, 1.70))
    for n in ([0.30, -0.30, 0.905], [-0.42, 0.42, 0.80]):
        P += G.ring([1, 1, 3.20], 0.90, n, 24, 0.045, "iron")
    return P


def observatory_b():
    P = observatory_base() + dome_and_scope()
    P += [G.cone([1.1, 1.1, 2.05], 0.20, 0.09, 0.35, "iron"),
          G.cyl([1.1, 1.1, 2.05], 0.11, 1.65, "iron"),
          sphere([1.1, 1.1, 3.75], 0.30, "plaster")]
    for c, R, arm, mat in (([1.62, 0.58, 2.50], 0.22, 0.07, "banner"), ([1.47, 0.73, 3.05], 0.15, 0.065, "canvas"),
                           ([1.36, 0.84, 3.40], 0.11, 0.06, "plaster")):
        P.append(G.seg([1.1, 1.1, c[2]], c, arm, "iron"))
        P.append(sphere(c, R, mat, verts=8 if R > 0.2 else 6))
    P += G.ring([1.62, 0.58, 2.50], 0.33, [0.25, -0.25, 0.935], 16, 0.035, "iron")
    return P


def observatory_c():
    P = observatory_base() + dome_and_scope()

    def q(d, z):
        return [0.75 + DIAG * d, 0.75 - DIAG * d, z]

    P += G.ring([0.75, 0.75, 2.62], 0.95, [DIAG, DIAG, 0], 32, 0.075, "iron")
    P += G.ring([0.75, 0.75, 2.92], 0.52, [DIAG, DIAG, 0], 20, 0.045, "iron")
    P.append(G.cyl([0.75, 0.75, 1.0], 0.26, 0.35, "stone"))
    for sgn in (-1, 1):
        P.append(G.seg(q(0.34 * sgn, 1.0), q(0.34 * sgn, 1.746), 0.09, "stone"))
    P.append(G.seg([0.75, 0.75, 2.62], q(0.70, 3.22), 0.05, "iron"))
    for k in range(9):
        a = math.radians(20 + 17.5 * k)
        a0, a1 = q(0.95 * math.cos(a), 2.62 + 0.95 * math.sin(a)), q(1.08 * math.cos(a), 2.62 + 1.08 * math.sin(a))
        if all(0 <= v <= 2 for v in a0[:2] + a1[:2]):
            P.append(G.seg(a0, a1, 0.035, "iron"))
    return P


def main():
    G.OUT = OUT
    OUT.mkdir(parents=True, exist_ok=True)
    base, extra = windmill_base()
    for letter, fn in (("A", windmill_a), ("B", windmill_b), ("C", windmill_c)):
        parts, mats = fn()
        marker = [i for i, p in enumerate(base) if p.get("_marker")][0]  # markers stay last
        G.write(f"windmill_mythic_{letter}", base[:marker] + parts + base[marker:], **extra, **({"materials": mats} if mats else {}))
    sails = {"canvas": "sails", "parts": [{"type": "sails", "length": 1.25, "width": 0.50, "hub": 0.09, "mat": "canvas"}]}
    rosette = {"canvas": "sails", "parts": [{"type": "sails", "length": 0.36, "width": 0.19, "hub": 0.06, "mat": "canvas", "count": 6}]}
    (OUT / "windmill_sails.json").write_text(json.dumps(sails) + "\n", encoding="utf-8")
    (OUT / "windmill_rosette.json").write_text(json.dumps(rosette) + "\n", encoding="utf-8")
    for letter, fn in (("A", observatory_a), ("B", observatory_b), ("C", observatory_c)):
        G.write(f"observatory_mythic_{letter}", fn())
    G.write("observatory_mythic_A2", observatory_a2())
    print(f"{len(list(OUT.glob('*.json')))} specs in {OUT}")


if __name__ == "__main__":
    main()
