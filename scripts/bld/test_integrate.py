#!/usr/bin/env python3
"""Self-check of integrate.py's pure parts. Run: python3 scripts/bld/test_integrate.py"""
import pathlib
import sys

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import integrate as I  # noqa: E402

im = Image.new("L", (20, 9), 0)
im.putpixel((9, 0), 255)  # block column 1, row 0
m = I.masque(im, 8)
assert (m["w"], m["h"]) == (3, 2), m
assert m["bits"] == "40", m  # row 0: 010 -> 0100 -> "4"; row 1: "0"
assert I.contact(384) == [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]
assert I.contact(192)[0] == [0.25, 0.25]
spec = {"teasers": [{"id": "r2"}, {"id": "r9"}]}
assert I.teasers(spec) == [("teaser_r2", 2, 3), ("teaser_r9", 9, 10)]
print("ok")
