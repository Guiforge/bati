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

# ---- gates.py ------------------------------------------------------------------------------------
import gates as G  # noqa: E402


def blob(name, box, canvas=(160, 200), colour=(120, 90, 60, 255)):
    im = Image.new("RGBA", canvas, (0, 0, 0, 0))
    ImageDraw.Draw(im).rectangle(box, fill=colour)
    p = tmp / f"{name}.png"
    im.save(p)
    return str(p)


# 1b. footprint: a wing 25 px above the foot escaped the old 12 px band, the whole mask sees it
wing = Image.open(b).convert("RGBA")
ImageDraw.Draw(wing).rectangle((120, 100, 150, 165), fill=(120, 90, 60, 255))
wing.save(tmp / "wing.png")
assert T.footprint([b, str(tmp / "wing.png")]) != [] and T.footprint([b, b]) == []
# an explicit .contact.png (the maquette's socle) wins over the lower profile
sock = Image.new("L", (160, 200), 0)
ImageDraw.Draw(sock).rectangle((40, 170, 120, 190), fill=255)
sock.save(tmp / "grand.contact.png")
assert T.contact(b)[0].getbbox() == (40, 170, 121, 191)

# 3. silhouette: layers and sails composed, patch removed, nothing written in the locked folders
body = blob("body", (60, 60, 100, 160))
teaser = blob("teaser", (0, 0, 20, 20))
patch = Image.new("L", (160, 200), 0)
ImageDraw.Draw(patch).rectangle((0, 150, 160, 200), fill=255)
area, h = G.stage_silhouette(body, tmp / "ss", patch=patch)
assert (area, h) == (41 * 90, 90), (area, h)  # rows 60..149 stay
area2, h2 = G.stage_silhouette(body, tmp / "ss2", layers=[(teaser, (70, 20))], patch=patch)
assert area2 == area + 21 * 21 and h2 == 130, (area2, h2)
sails = blob("sails", (0, 0, 39, 39), canvas=(40, 40))
area3, _ = G.stage_silhouette(body, tmp / "ss3", sails=(sails, (140, 40), 1.0), patch=patch)
assert area3 == area + 1600, area3
assert Image.open(tmp / "ss.sil.png").getpixel((80, 100)) == (0, 0, 0)
assert Image.open(tmp / "ss.sil.png").getpixel((80, 170)) == T.BG
try:
    G.stage_silhouette(body, pathlib.Path.home() / ".cache/bati-loupes-lock/x", patch=patch)
    raise AssertionError("a silhouette inside the lock must be refused")
except SystemExit:
    pass
# the patch from a real maquette export: socle dilated, tall volumes kept out
real = G.L.ROOT / "scripts/iso/blockouts/renders/forge_grand.anchor.json"
pm = G.patch_mask(real)
assert pm.size == (896, 1344) and pm.getbbox()[3] > 1250 and pm.getbbox()[1] > 900  # a flat diamond at the foot only

# 4. G-GROW: bigger stage passes, same size fails; ranks need a 1.5 % XOR; the canvas edge fails
def m(box, canvas=(200, 200)):
    x = Image.new("L", canvas, 0)
    ImageDraw.Draw(x).rectangle(box, fill=255)
    return x


s1, s2, s2b = m((50, 100, 100, 150)), m((50, 80, 100, 150)), m((50, 98, 100, 150))
assert G.grow([("a", "stage", s1), ("b", "stage", s2)]) == []  # +40 % height, +40 % area
assert G.grow([("a", "stage", s1), ("b", "stage", s2b)]) != []  # +4 %
r1 = m((50, 100, 100, 150))
r2 = m((50, 100, 100, 150)); ImageDraw.Draw(r2).rectangle((100, 140, 106, 150), fill=255)
assert G.grow([("a", "stage", s1), ("r", "rank", r1)]) != []  # identical
assert G.grow([("a", "stage", s1), ("r", "rank", r2)]) == []  # XOR 77 px of 2600 = 3 %
assert G.grow([("a", "stage", s1), ("b", "stage", m((0, 60, 100, 150)))]) != []  # touches the edge
assert G.grow([("a", "stage", s1), ("b", "stage", m((0, 60, 100, 150)))], margin=0) == []

# 6. G-CORNER: change inside the dilated union of masks is free, 2 % outside fails
x0 = Image.new("RGB", (100, 100), (90, 90, 90))
x0.save(tmp / "c0.png")
x1 = x0.copy()
ImageDraw.Draw(x1).rectangle((30, 30, 39, 39), fill=(250, 0, 0))  # next to the new mask: inside the 6 px ring
x1.save(tmp / "c1.png")
om, nm = m((10, 10, 20, 20), (100, 100)), m((25, 25, 35, 35), (100, 100))
om.save(tmp / "om.png"); nm.save(tmp / "nm.png")
assert G.corner(tmp / "c0.png", tmp / "c1.png", tmp / "om.png", tmp / "nm.png")[1] is True
far = x0.copy()
ImageDraw.Draw(far).rectangle((60, 60, 79, 79), fill=(250, 0, 0))  # 400 px of ~9000 = 4 %
far.save(tmp / "c2.png")
part, ok = G.corner(tmp / "c0.png", tmp / "c2.png", tmp / "om.png", tmp / "nm.png")
assert not ok and 0.03 < part < 0.06, part
try:
    G.corner(tmp / "c0.png", tmp / "c2.png", tmp / "om.png", tmp / "nm.png", out=G.LOCKED[0] / "d.png")
    raise AssertionError("a diff written inside the lock must be refused")
except SystemExit:
    pass

# 7. blind set: neutral folder name, NN.png only, no metadata, key outside the folder and the repo
from PIL import PngImagePlugin  # noqa: E402
tagged = Image.open(a).convert("RGBA")
info = PngImagePlugin.PngInfo(); info.add_text("Source", "windmill_grand_round3")
tagged.save(tmp / "tagged.png", pnginfo=info)
assert "Source" in Image.open(tmp / "tagged.png").text
folder, key = G.blind("demo", [str(tmp / "tagged.png"), b], [decoy], parent=tmp, seed=3)
import re  # noqa: E402
assert re.fullmatch(r"blind-[0-9a-f]{8}", folder.name)
assert sorted(p.name for p in folder.iterdir()) == ["01.png", "02.png", "03.png"]
assert all(not getattr(Image.open(p), "text", {}) and not Image.open(p).info.get("exif") for p in folder.iterdir())
assert sorted(v["role"] for v in json.loads(key.read_text()).values()) == ["decoy", "stage", "stage"]
assert tmp / "keys" in key.parents and folder not in key.parents

# 7b. canaries: three known-answer pairs, the strangers' folder shows no giveaway name, wrong answer is caught
ladder = [sprite(f"l{i}", 40 + 30 * i) for i in range(3)]
(tmp / "scratch").mkdir()
pairs = G.canary_pairs(tmp / "scratch", b, a, ladder, locked=b, locked_base=a)
assert len(pairs) == 3 and all(p[2] == "canary" for p in pairs)
out = G.neutral_dir(tmp)
kp = T.ab("demo", pairs, out, seed=5)
assert sorted(p.name for p in out.iterdir()) == ["pair_01.png", "pair_02.png", "pair_03.png"]
ck = json.loads(kp.read_text())
right = {n: ("left" if k["left"] == k["canary_winner"] else "right") for n, k in ck.items()}
wrong = {n: ("right" if v == "left" else "left") for n, v in right.items()}
assert G.check_canaries(kp, right) == [] and G.check_canaries(kp, wrong) == ["01", "02", "03"]

# 8. lock_check: a lock that holds, then one altered file
import lock_check as K  # noqa: E402
(tmp / "lsrc" / "bc").mkdir(parents=True); (tmp / "ldst" / "bc").mkdir(parents=True)
for root in ("lsrc", "ldst"):
    (tmp / root / "bc" / "x.png").write_bytes(b"locked art")
(tmp / "ldst" / "sha256.txt").write_text(f"{K.sha(tmp / 'lsrc' / 'bc' / 'x.png')}  bc/x.png\n")
assert K.check(tmp / "lsrc", tmp / "ldst") == []
(tmp / "lsrc" / "bc" / "x.png").write_bytes(b"repainted")
assert len(K.check(tmp / "lsrc", tmp / "ldst")) == 1
assert K.check(tmp / "lsrc", tmp / "nolock") != []

print("bldtools: all checks passed")
