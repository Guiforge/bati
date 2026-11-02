#!/usr/bin/env python3
"""Self-check of bldtools.py on generated images. Run: python3 scripts/bld/test_bldtools.py"""

import json
import pathlib
import sys
import tempfile

from PIL import Image, ImageDraw

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
tmp = pathlib.Path(tempfile.mkdtemp(prefix="bldtools-"))
import os  # noqa: E402

os.environ["BATI_BUILDINGS_DIR"] = str(tmp / "keys")
import bldtools as T  # noqa: E402


def sprite(name, height=100, foot=(40, 160, 120, 190), colour=(180, 60, 40, 255)):
    """A tower of `height` px standing on a fixed footprint rectangle."""
    im = Image.new("RGBA", (160, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle((foot[0], foot[3] - height, foot[2], foot[3]), fill=colour)
    d.rectangle((foot[0], foot[3] - height, foot[2], foot[3] - height + 3), fill=(10, 10, 10, 255))
    p = tmp / f"{name}.png"
    im.save(p)
    return str(p)


a, b, c = sprite("rough", 40), sprite("grand", 120), sprite("shifted", 120, foot=(60, 160, 140, 190))
decoy = sprite("decoy", 80, colour=(40, 80, 200, 255))

# 1. shuffle: all images numbered, decoys marked, key outside the tmp output dir and the repo
key = T.shuffle("demo", [a, b], [decoy], tmp / "sh", seed=1)
k = json.loads(key.read_text())
assert sorted(k) == ["01", "02", "03"] and sorted(v["role"] for v in k.values()) == ["decoy", "stage", "stage"]
assert len(list((tmp / "sh").glob("*.png"))) == 3 and not list((tmp / "sh").glob("*.json"))
try:
    T.KEYS = T.L.ROOT / "k"
    T.write_key("x", "y", {})
    raise AssertionError("a key inside the repo must be refused")
except SystemExit:
    T.KEYS = tmp / "keys"

# 2. ab: both sides appear across seeds, key tells which is which
sides = {json.loads(T.ab("demo", [(a, b)], tmp / f"ab{s}", seed=s).read_text())["01"]["left"] == a for s in range(12)}
assert sides == {True, False}

# 3. grid
assert T.grid(a, tmp / "g.png", 4, 3) == 12 and Image.open(tmp / "g.png").size == (160, 200)

# 4. footprint: same feet pass at any height, shifted feet fail
assert T.footprint([a, b]) == []
assert T.footprint([a, c]) != []

# 5. silhouette: black where opaque, 96 dp on the long side = 96 * density px
size = T.silhouette(b, str(tmp / "s"), 96)
assert max(size) == 264
assert max(T.silhouette(b, str(tmp / "s1"), 96, density=1)) == 96
assert Image.open(tmp / "s.sil.png").getpixel((80, 150)) == (0, 0, 0)

# 6. sheet
T.sheet([a, b, c, decoy, a], tmp / "sheet.png", cols=3, cell=64)
assert Image.open(tmp / "sheet.png").size == (192, 128)

# 7. metrics: a red tower has saturation, a grey one has none, the outline is the 3 px band
m = T.metrics(b)
assert m["saturation"] > 0.5 and 0.5 < m["outline_px"] < 8, m
grey = sprite("grey", colour=(120, 120, 120, 255))
assert T.metrics(grey)["saturation"] == 0

# 8. diff: change inside the mask is free, outside counts and trips the threshold
base = Image.new("RGB", (50, 50), (100, 100, 100))
changed = base.copy()
ImageDraw.Draw(changed).rectangle((10, 10, 19, 19), fill=(200, 0, 0))
base.save(tmp / "d0.png"); changed.save(tmp / "d1.png")
inside = Image.new("L", (50, 50), 0)
ImageDraw.Draw(inside).rectangle((0, 0, 24, 24), fill=255)
inside.save(tmp / "m_in.png")
outside = Image.new("L", (50, 50), 0)
ImageDraw.Draw(outside).rectangle((30, 30, 49, 49), fill=255)
outside.save(tmp / "m_out.png")
assert T.diff_outside(tmp / "d0.png", tmp / "d1.png", tmp / "m_in.png") == 0
assert T.diff_outside(tmp / "d0.png", tmp / "d1.png", tmp / "m_out.png") == 100
assert T.main(["diff", str(tmp / "d0.png"), str(tmp / "d1.png"), str(tmp / "m_out.png"), "--max", "99"]) == 1
assert T.main(["diff", str(tmp / "d0.png"), str(tmp / "d1.png"), str(tmp / "m_out.png"), "--max", "100"]) == 0
assert T.main(["footprint", a, c]) == 1

print("bldtools: all checks passed")
