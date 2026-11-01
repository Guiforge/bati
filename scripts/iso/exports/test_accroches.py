#!/usr/bin/env python3
"""accroches.screen against the orthographic camera worked by hand (no Blender, no numpy):

    python3 scripts/iso/exports/test_accroches.py

iso_blockout.py projects with the scene's camera (X 60 deg, Z 45 deg, 384 px per cell edge) and
accroches.main() with cellToScreen; both must give the same px. Here the camera is rebuilt from its
rotations: right = Rz(45) x, up = Rz(45) Rx(60) y, Blender point (gx, -gy, z), K = S / sqrt 2 px per
unit; px = anchor + K (p . right, -p . up), taken from the anchor's own grid point.
"""

import json
import math
import sys

import accroches as A
import stage_exports as X

ISO = X.L.ISO
K = ISO["S"] / math.sqrt(2)
c, s = math.cos(math.radians(45)), math.sin(math.radians(45))
c6, s6 = math.cos(math.radians(60)), math.sin(math.radians(60))
RIGHT, UP = (c, s, 0.0), (-s * c6, c * c6, s6)


def camera(g, scale):
    p = (g[0], -g[1], g[2] if len(g) > 2 else 0.0)
    return [K * scale * sum(a * b for a, b in zip(p, RIGHT)), -K * scale * sum(a * b for a, b in zip(p, UP))]


def main():
    worst, n = 0.0, 0
    for path in sorted(X.L.RENDERS.glob("*.anchor.json")):
        info = json.loads(path.read_text())
        if "pointsAccroche" not in info:
            continue
        canvas = ISO["canvases"][info["canvas"]]
        fw, fh = canvas["footprint"]
        origin = {"footprintBottom": (fw, fh, 0), "cellCenter": (0.5, 0.5, 0)}.get(info["anchorKind"], (0, 0, 0))
        scale = canvas.get("pxScale", 1)
        o = camera(origin, scale)
        to = A.screen(info, canvas, ISO)
        for v in info["volumes"][:6]:
            for g in v["vertices"][:4]:
                hand = [info["anchor"][i] + camera(g, scale)[i] - o[i] for i in (0, 1)]
                worst, n = max(worst, math.dist(hand, to(g))), n + 1
    print(f"{n} vertices, worst gap {worst:.5f} px")
    if n == 0 or worst > 0.01:
        print("FAIL: accroches.screen differs from the hand-made camera")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
