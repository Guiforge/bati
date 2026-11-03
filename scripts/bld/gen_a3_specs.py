#!/usr/bin/env python3
"""Writes the observatory mythic A3 maquette specs (variants a, b, c) into scripts/iso/blockouts/bld/a3/.

    python3 scripts/bld/gen_a3_specs.py

A3: two posed CC0 figures (scripts/iso/blockouts/cc0/Farmer.fbx, see LICENSES.md there) stand on the slab,
knees bent, head down, and carry a sky globe on their raised hands. They replace the stiff stone cylinders
of A2. The drum, door, windows, sky map and slab come from gen_e1_specs.observatory_base (same footprint,
canvas and anchor as the pilot mythic). The figures are `figure` parts of iso_blockout.py: maquettes only,
the app never loads a model. The current pilot mythic (the astrolabe) is not touched.
"""

import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import gen_e1_specs as E  # noqa: E402
import gen_pilot_specs as G  # noqa: E402

OUT = pathlib.Path(__file__).resolve().parent.parent / "iso" / "blockouts" / "bld" / "a3"
FBX = "scripts/iso/blockouts/cc0/Farmer.fbx"
H = (G.DIAG, -G.DIAG, 0)  # screen right, in grid axes
D = (G.DIAG, G.DIAG, 0)  # toward the camera


def on_globe(c, r, side, phi, psi, k=1.04):
    """A point on (just outside) the globe's flank that faces a giant at `side` (-1 screen left, +1 right):
    phi up from the equator, psi toward the camera, degrees."""
    p, q = math.radians(phi), math.radians(psi)
    w = [side * math.cos(p) * math.cos(q) * h + math.cos(p) * math.sin(q) * d for h, d in zip(H, D)]
    return [c[i] + r * k * (w[i] + (math.sin(p) if i == 2 else 0)) for i in range(3)]


def local_x(t, at, rot):
    """The target's x in the figure's own frame (+x is the figure's left), as iso_blockout.figure reads it."""
    th = math.radians(-rot)
    return math.cos(th) * (t[0] - at[0]) + math.sin(th) * -(t[1] - at[1])


def figure(side, at, rot, height, hands, drop=0.42, spread=0.10, head=(0, -0.7, 0.7), lean=(0, -0.22, 1)):
    """One giant. side -1 stands at the screen left, +1 at the right."""
    pose = {"drop": drop, "feet": {"L": [spread, 0.0], "R": [-spread, 0.0]}, "knee": [0.3, -1, 0.0],
            "elbow": [0.25, -0.3, -0.5],
            "aim": {"Torso": lean, "Neck": (0, -0.35, 0.94), "Head": head},
            "hands": {k: [round(v, 4) for v in t] for k, t in hands.items()}}
    return {"type": "figure", "mat": "stone", "file": FBX, "at": [round(v, 4) for v in at], "rotZ": rot,
            "height": height, "pose": pose}


def spec(variant):
    P = E.observatory_base()
    marker = P.pop()
    assert marker.get("_marker") == "gag"
    # variant -> globe centre and r, giants' height, stance (h, t), rotZ left and right, hand angles (phi, psi)
    v = {
        # a: both face the camera, beside the drum, hands under the globe's lower flanks
        "a": dict(c=(1, 1, 3.05), r=0.80, h=2.7, at=(0.82, -0.15), rot=(-45, -45), hl=((-48, 30), (-62, -15))),
        # b: same place and size, turned three-quarters toward the globe, hands on its flanks
        "b": dict(c=(1, 1, 3.05), r=0.80, h=2.7, at=(0.92, 0.0), rot=(-90, 0), hl=((-42, 35), (-60, -10))),
        # c: taller, standing behind the drum (legs hidden by it), the globe higher between them
        "c": dict(c=(1, 1, 3.10), r=0.80, h=2.9, at=(0.78, -0.45), rot=(-45, -45), hl=((-48, 30), (-62, -15))),
    }[variant]
    c, r = list(v["c"]), v["r"]
    for s, rot in zip((-1, 1), v["rot"]):
        h, t = v["at"]  # h along the screen's horizontal from the drum axis, t toward the camera
        at = [1 + G.DIAG * (s * h + t), 1 - G.DIAG * (s * h - t), 0.04]
        near = [on_globe(c, r, s, *h) for h in v["hl"]]
        near.sort(key=lambda t: -local_x(t, at, rot))  # the larger local x is the left hand
        hands = dict(zip("LR", near))
        P.append(figure(s, at, rot, v["h"], hands, head=(0, -0.9, 0.6) if variant == "c" else (0, -0.7, 0.7)))
    P.append(E.sphere(c, r, "iron", verts=16, rings=12))
    P += G.telescope(c[2], 3.9, 0.075, "plaster", sleeve=True, foot_xy=(1, 1), tip_xy=(0.4, 1.6))
    P += G.ring(c, r + 0.16, [0.55, 0.55, 0.62], 24, 0.045, "iron")
    P.append(marker)
    return P


def main():
    G.OUT = OUT
    OUT.mkdir(parents=True, exist_ok=True)
    for variant in "abc":
        G.write(f"observatory_mythic_A3{variant}", spec(variant))
    print(f"3 specs in {OUT}")


if __name__ == "__main__":
    main()
