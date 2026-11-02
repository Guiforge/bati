#!/usr/bin/env python3
"""The `sphere` part and `sails` `count` of iso_blockout.py, read back from the anchor JSON's volumes.

    python3 scripts/iso/test_blockout_shapes.py     (a few Blender runs, about a minute)
"""

import json
import math
import os
import pathlib
import sys
import tempfile

tmp = pathlib.Path(tempfile.mkdtemp(prefix="blockout-shapes-"))
os.environ["ART_LOOP_DIR"] = str(tmp / "art-loop")  # isolib's WORK: not the art loop's passes
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import isolib as L  # noqa: E402


def volumes(name, canvas, parts):
    spec = tmp / f"{name}.json"
    spec.write_text(json.dumps({"canvas": canvas, "parts": parts}))
    return L.blender(spec, tmp / f"{name}.rgba.png", lines=False, socle_shadow=False)["volumes"]


# sphere: segments x rings gives u * (v - 1) + 2 vertices, all at R from the centre, defaults 8 x 6
C, R = (1.0, 1.0, 1.5), 0.6
for extra, n in (({}, 8 * 5 + 2), ({"verts": 12, "rings": 8}, 12 * 7 + 2)):
    v = volumes("sphere", "building2x2", [{"type": "sphere", "mat": "iron", "center": C, "r": R, **extra}])[0]["vertices"]
    assert len(v) == n, (len(v), n)
    assert all(abs(math.dist(p, C) - R) < 1e-4 for p in v), "a vertex is off the sphere"

# sails: four blades by default (the stages in use), six on request; a blade is 4 corners, the hub 32
for extra, n in (({}, 4 * 4 + 32), ({"count": 6}, 6 * 4 + 32)):
    parts = [{"type": "sails", "mat": "canvas", "length": 0.36, "width": 0.19, "hub": 0.06, **extra}]
    assert len(volumes("sails", "sails", parts)[0]["vertices"]) == n

print("test_blockout_shapes: ok")
