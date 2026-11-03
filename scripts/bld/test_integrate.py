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
full = Image.new("L", (896, 1152), 0)
for x in range(896):
    for y in range(1152):
        # the 1x1 diamond with its bottom corner on the anchor (448, 1088)
        if abs(x - 448) / 192 + abs(y - 992) / 96 <= 1:
            full.putpixel((x, y), 255)
c = I.contact(full, (448, 1088), (1, 1))
xs = [p[0] for p in c]
assert min(xs) <= 0.05 and max(xs) >= 0.95 and len(c) >= 4, c
half = Image.new("L", (896, 1152), 0)
for x in range(448, 896):
    for y in range(1152):
        if abs(x - 448) / 192 + abs(y - 992) / 96 <= 1:
            half.putpixel((x, y), 255)
assert min(p[0] - p[1] for p in I.contact(half, (448, 1088), (1, 1))) >= -0.06  # only the +gx side of the cell
assert I.teaser_ranks("r2_second_target") == {"fromRank": 2, "untilRank": 3}
assert I.teaser_ranks("b8_x") == {"fromRank": 3, "untilRank": 4, "fromBase": 8, "untilBase": 9}
assert I.genre({"gag": [{"rank": 1}, {"rank": 7}]}) == "upgrade"
assert I.genre({"gag": [{"rank": 2}, {"rank": 5}]}) == "deed"
assert I.genre({"gag": [{"rank": 2}, {"rank": 10}]}) == "ten"
assert I.beat_ranks("upgrade", 7) == {"rank": 3, "fromBase": 7}
print("ok")
