#!/usr/bin/env python3
"""Self-check of sans_losange.py on a synthetic image. Run: python3 scripts/bld/test_sans_losange.py"""
import pathlib
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import sans_losange as S  # noqa: E402

rng = np.random.default_rng(1)
a = np.zeros((300, 500, 4), np.uint8)
a[150:290, 20:480] = (138, 134, 134, 255)  # the flat plate, touching the outside
tex = rng.integers(-40, 40, (110, 200, 1))
a[100:210, 150:350, :3] = (140 + tex).clip(0, 255)  # a textured grey wall on top of it
a[100:210, 150:350, 3] = 255
im = Image.fromarray(a, "RGBA")
S.BAS = 300
out, m = S.retire(im)
o = np.asarray(out)
assert m[160:280, 30:140].all(), "the plate is gone"
assert o[200, 60, 3] == 0
assert not m[110:200, 160:340].any(), "the textured wall is kept"
assert (o[110:200, 160:340, 3] == 255).all()
assert S.part(im, out) > 0.2
print("ok")
