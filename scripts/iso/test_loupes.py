#!/usr/bin/env python3
"""Self-test of ab_pairs.py, loupe_crop.py and loupe_checks.py on fixtures made on the fly.

    python3 scripts/iso/test_loupes.py
"""

import json
import pathlib
import random
import shutil
import subprocess
import tempfile

from PIL import Image

import ab_pairs
import loupe_checks as C
import loupe_crop as K

tmp = pathlib.Path(tempfile.mkdtemp(prefix="test-loupes-"))
CAM = {"zoom": 1.0, "tx": 200, "ty": 0, "tileW": 64, "tileH": 32, "screenW": 400, "screenH": 400}


def solid(path, rgb, size=(64, 48)):
    Image.new("RGB", size, rgb).save(path)


def noise(size, seed=1):
    rng = random.Random(seed)
    im = Image.new("RGB", size)
    im.putdata([(v := rng.randrange(256), v, v) for _ in range(size[0] * size[1])])
    return im


# ---- ab_pairs ----
lp = tmp / "loupes"
for d in ("baseline", "forest/r1", "targets"):
    (lp / d).mkdir(parents=True)
for n, (old, new) in {"a.png": ((10, 10, 10), (200, 0, 0)), "b.png": ((20, 20, 20), (0, 200, 0))}.items():
    solid(lp / "baseline" / n, old)
    solid(lp / "forest/r1" / n, new)
solid(lp / "targets" / "a.png", (250, 250, 250))
ab_pairs.CACHE = tmp / "cache"
out, key = ab_pairs.build("forest", "1", loupes=lp, seed=7)
out2, key2 = ab_pairs.build("forest", "1", swap=True, loupes=lp)
pairs, sw = (json.loads(k.read_text())["pairs"] for k in (key, key2))
assert len(list(out.glob("pair-*.png"))) == 3 and len(list(out2.glob("pair-*.png"))) == 3
assert {p["kind"] for p in pairs} == {"crop", "canary"}
assert all(a["pair"] == b["pair"] and a["left"] == b["right"] for a, b in zip(pairs, sw))
assert "key" not in str(out) and str(key).startswith(str(tmp / "cache")), "key stays out of the batch folder"


def answers(pairs_, who):  # who: 'new' for everything, picks the side holding it
    return {p["pair"]: "left" if p[("left")] == who else "right" for p in pairs_}


ok = score_a = ab_pairs.score("forest", "1", answers(pairs, "new"), answers(sw, "new"))
assert sorted(ok["wins"]) == ["a.png", "b.png"] and not ok["void"], ok
old_wins = ab_pairs.score("forest", "1", answers(pairs, "old"), answers(sw, "old"))
assert old_wins["void"] == ["as made", "swapped"] and not old_wins["wins"], old_wins  # canary missed
half = ab_pairs.score("forest", "1", answers(pairs, "new"), {p["pair"]: "tie" for p in sw})
assert not half["wins"] and half["void"] == ["swapped"], half  # one context tied the canary: void, no win
print("ab_pairs ok:", ok)

# ---- loupe_crop ----
assert K.tile_to_px(CAM, 2, 1) == (232.0, 48.0)
assert K.tile_rect_px(CAM, 0, 0, 0, 0) == (168, 0, 232, 32)
im = noise((400, 400))
assert K.crop_tiles(im, CAM, (0, 0, 1, 1)).size == (128, 64)
a, b = tmp / "a.png", tmp / "b.png"
noise((100, 100)).save(a)
img = noise((100, 100))
img.paste((0, 0, 0), (0, 0, 10, 10))  # 1 % of the pixels
img.save(b)
assert K.diff_percent(Image.open(a), Image.open(a)) == 0
assert 0.9 < K.diff_percent(Image.open(a), Image.open(b)) <= 1.0 and K.diff_percent(Image.open(a), Image.open(b)) < K.KEEP_MAX
assert K.diff_percent(Image.open(a), Image.new("RGB", (5, 5))) == 100.0
if shutil.which("ffmpeg"):
    vid, sheet = tmp / "v.mp4", tmp / "sheet.png"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=64x64:rate=10:duration=2",
                    "-pix_fmt", "yuv420p", str(vid)], check=True)
    K.contact_sheet(vid, sheet)
    assert Image.open(sheet).size == (64 * 6, 64 * 2)
    try:
        K.contact_sheet(vid, sheet)
        raise AssertionError("must not replace")
    except FileExistsError:
        pass
print("loupe_crop ok")

# ---- dump-check ----
def spr(id_, i, j, flip=False, w=80, h=80, x=100, y=100, **kw):
    return {"id": id_, "x": x, "y": y, "w": w, "h": h, "flip": flip, "tileI": i, "tileJ": j, "z": 0, **kw}


def dump(*s):
    return {"camera": CAM, "sprites": list(s)}

assert C.dump_check(dump(spr("hut", 0, 0), spr("hut", 8, 0, flip=True))) == []
assert len(C.dump_check(dump(spr("hut", 0, 0), spr("hut", 8, 0)))) == 1  # same way
assert len(C.dump_check(dump(spr("hut", 0, 0), spr("hut", 3, 0, flip=True)))) == 1  # too close
assert C.dump_check(dump(spr("hut", 0, 0, w=40, h=40), spr("hut", 1, 0, w=40, h=40))) == []  # small
assert C.dump_check(dump(spr("hut", 0, 0), spr("hut", 1, 0, x=900))) == []  # second one off screen
assert C.dump_check(dump(spr("tree_a", 0, 0), spr("tree_a", 4, 0))) == []  # mass, apart
assert len(C.dump_check(dump(spr("tree_a", 0, 0), spr("tree_a", 1, 1)))) == 1  # mass, touching
stamps = [{"asset": "grass", "tile": [0, 0], "flip": False, "band": "g"}, {"asset": "grass", "tile": [2, 0], "flip": False, "band": "g"}]
assert len(C.dump_check(dump(), stamps)) == 1
assert C.dump_check(dump(spr("flame_a", 0, 0, container="hearth_1", w=10, h=10))) == []
assert "G17" in C.dump_check(dump(spr("flame_a", 0, 0, w=10, h=10)))[0]
print("dump-check ok")

# ---- vector-pixels ----
mixed = Image.new("RGB", (64, 32), (90, 90, 90))  # left half flat, right half noise
mixed.paste(noise((32, 32), 3), (32, 0))
stds, _ = C.block_stds(mixed)
assert all(v < 0.01 for (bx, _), v in stds.items() if bx < 2) and all(v > 20 for (bx, _), v in stds.items() if bx >= 2)
txt, _ = C.vector_pixels(mixed, k=3)
assert txt.startswith("4/8 blocks") and "##.." in txt, txt
assert "p50=" in C.vector_pixels(mixed)[0]
assert C.vector_pixels(mixed, 3, (32, 0, 32, 32))[0].startswith("0/4")
alpha0 = Image.new("RGBA", (32, 16), (0, 0, 0, 0))
assert C.block_stds(alpha0)[0] == {}
print("vector-pixels ok")

# ---- thumb ----
bright = Image.new("L", (128, 128), 20)
bright.paste(noise((32, 32), 5).convert("L"), (96, 0))  # top-right cell: bright and contrasted
size, cells = C.thumb(bright)
assert size == (16, 16) and max(cells, key=lambda k: cells[k][1]) == (0, 3)
assert "(0, 3)" in C.thumb_report(bright)
print("thumb ok")

# ---- vector-code, on a fake tree ----
root = tmp / "repo"
(root / "components/village/iso").mkdir(parents=True)
(root / "app").mkdir()
(root / "components/village/iso/Lueur.tsx").write_text(
    'import Svg, { Ellipse, Path } from "react-native-svg";\nconst a = <Ellipse cx={1} />;\nconst b = <Path d="" />;\n')
(root / "components/village/iso/Nope.tsx").write_text('import { Rect } from "react-native-svg";\n<Rect />\n')
(root / "components/village/iso/Plain.tsx").write_text('import { View } from "react-native";\n<View />\n')
(root / "app/dev-iso.tsx").write_text("export default 1;\n")
al = tmp / "al.json"
al.write_text(json.dumps({"files": {"components/village/iso/Lueur.tsx": {"allow": ["Ellipse"]}}}))
failing, allowed = C.vector_code(root, al)
assert failing == [("components/village/iso/Lueur.tsx", 3, "Path"), ("components/village/iso/Nope.tsx", 2, "Rect")], failing
assert allowed == [("components/village/iso/Lueur.tsx", 2, "Ellipse")]
real_fail, _ = C.vector_code()
assert real_fail, "the real tree must report decor drawn in vector (Rempart, Fierte, ...)"
print(f"vector-code ok ({len(real_fail)} real items outside the allowlist)")

# ---- loupe_dump_pull: chunks out of a logcat, the last complete set wins ----
import loupe_dump_pull as P

dump = {"camera": CAM, "sprites": [{"id": "forge/solid", "x": 1, "y": 2, "w": 3, "h": 4, "flip": False, "tileI": 5, "tileJ": 6, "z": 11}]}
raw = json.dumps(dump, separators=(",", ":"))
cut = [raw[:40], raw[40:90], raw[90:]]
pre = "11-01 12:00:00.000  1  2 E ReactNativeJS: "
log = "\n".join(
    [pre + "ISO_DUMP other 1/1 {}", pre + f"ISO_DUMP a 1/3 {cut[0]}", pre + f"ISO_DUMP a 2/3 {cut[1]}"]  # first start: incomplete
    + [pre + f"ISO_DUMP a 1/3 {cut[0]}", pre + f"ISO_DUMP a 2/3 {cut[1]}", pre + f"ISO_DUMP a 3/3 {cut[2]}'", "noise"])
assert P.rebuild(log, "a") == dump and P.rebuild(log, "missing") is None
print("dump-pull ok")

# ---- loupe_night: Spearman on a known list, a mask on a tiny synthetic dump ----
import loupe_night as N

assert abs(N.spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-9
assert abs(N.spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-9
assert abs(N.spearman([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]) - 0.8) < 1e-9  # textbook: 1 - 6*4/(5*24)
assert abs(N.spearman([1, 2, 2, 3], [1, 2, 2, 3]) - 1) < 1e-9  # ties share their mean rank
ncam = {"zoom": 1.0, "tx": 200, "ty": 150, "tileW": 64, "tileH": 32, "screenW": 400, "screenH": 2400}
nd = {"camera": ncam, "sprites": [{"id": "forge/solid", "layer": "building", "x": 100, "y": 200, "w": 50, "h": 40, "flip": False, "tileI": 0, "tileJ": 0, "z": 1},
                                  {"id": "field_ble", "layer": "field", "x": 0, "y": 0, "w": 10, "h": 10, "flip": False, "tileI": 2, "tileJ": 2, "z": 0}]}
nd["sprites"][1].update(x=200 - 48, y=150 + 2 * 32 - 16, w=96, h=72)
(tmp / "n").mkdir()
Image.new("RGB", (400, 2400), (60, 60, 60)).save(tmp / "n/a.png")
(tmp / "n/a.json").write_text(json.dumps(nd))
cap = N.Cap(tmp / "n", "a")
bx = N.boxes(cap.size, cap.sprites[:1])
assert N.count(bx) == 50 * 40
rect = N.rect_mask(cap, (0, 0, 3, 3))
hit = N.count(N.inter(rect, bx))
assert hit > 0 and N.count(N.minus(rect, bx)) == N.count(rect) - hit  # ground = crop minus the box
f, pre = N.field_pre(cap, cap, (0, 0, 6, 6), set())
assert N.count(f) > 0 and N.count(pre) > 0 and N.count(N.inter(f, pre)) == 0
assert N.count(N.inter(N.not_bars(cap.size), N.boxes(cap.size, [{"x": 0, "y": 0, "w": 400, "h": 100}]))) == 0  # a system bar is never measured
print("loupe_night ok")

# ---- loupe_checks: tile filter, core, forest ----
fd = {"camera": CAM, "sprites": [spr("arbre_a", 0, 0, w=100), spr("arbre_a", 1, 0, w=100), spr("arbre_a", 30, 30, w=100),
                                 {**spr("caisse", 1, 1, w=100), "layer": "prop"}]}
for q in fd["sprites"][:3]:
    q["layer"] = "forest"
assert len(C.dump_check(fd, mass_prefix="arbre_")) == 1  # (0,0)-(1,0) touch; (30,30) is far
assert C.dump_check(fd, mass_prefix="arbre_", tiles=(5, 5, 40, 40)) == []  # only the far one counts
assert len(C.dump_check(fd, mass_prefix="arbre_", tiles=(0, 0, 1, 1))) == 1  # the prop is ignored, the touching pair stays
cimg = Image.new("RGB", (400, 2400), (60, 60, 60))
cimg.paste(Image.new("RGB", (160, 160), (200, 120, 80)), (120, 400))  # a bright saturated village box
cd_ = {"camera": CAM, "sprites": [{**spr("forge/solid", 0, 0, x=120, y=400, w=160, h=160), "layer": "building"}]}
lines, ok = C.core(cd_, cimg)
assert not ok and "FAIL" in lines[-1]  # ratio far over 1.50 and surroundings are not the box
cimg2 = Image.new("RGB", (400, 2400), (120, 120, 120))
chk = Image.new("RGB", (160, 160))
for bx in range(10):
    for by in range(10):  # 16 px cells alternate, so the 1/8 thumbnail keeps a texture
        chk.paste((230, 190, 150) if (bx + by) % 2 else (150, 110, 70), (bx * 16, by * 16, bx * 16 + 16, by * 16 + 16))
cimg2.paste(chk, (120, 400))
lines, ok = C.core(cd_, cimg2)
assert ok, lines  # brighter (1.3x), more textured and more saturated than its surroundings
ff = [{**spr(f"arbre_{k}", 2 * k, 0, w=w), "layer": "forest"} for k, w in enumerate((60, 60, 100, 100, 140, 140, 150, 150))]
ff.append({**spr("forge/solid", 0, 0), "layer": "building"})
lines, ok = C.forest({"camera": CAM, "sprites": ff})
assert ok and "max/min 2.50" in lines[0], lines  # three classes, small near the village, big far
print("loupe_checks ok")

# ---- cuire_sol: a synthetic decal on a temp copy of two ground tiles ----
import cuire_sol as G

sol = tmp / "sol"
sol.mkdir()
for r in range(G.ROWS):
    for c in range(G.COLS):
        Image.new("RGBA", (40, 30), (50, 90, 50, 255)).save(sol / f"terrain_{r}{c}.webp")
dec = Image.new("RGBA", (6, 6), (0, 0, 0, 0))
dec.paste(Image.new("RGBA", (4, 4), (250, 200, 50, 255)), (1, 1))
dec.save(tmp / "dirt.png")
G.PX, G.LARGEUR, G.TERRAIN_XY = 1, 0, (-20, 0)  # 1 px a dp: tile (0,0) centres on pixel (20, 12) of chunk 00
st = [{"asset": "dirt.png", "tile": [0, 0], "flip": False, "band": "t1-3"},
      {"asset": "dirt.png", "tile": [1, 0], "flip": True, "band": "t7-9"}]
assert G.centre_px(0, 0) == (20, 12) and G.centre_px(1, 0) == (44, 24)
out = tmp / "baked"
names = G.bake(out, st, sol, tmp)
# a band that adds nothing to a chunk is not written (the app takes the band below)
assert names == ["terrain_00.t1-3", "terrain_01.t7-9"], names
assert not list(sol.glob("*.t*")), "day files untouched, output apart"
assert all((out / f"{n}.nuit.webp").exists() for n in names)
assert json.loads((out / "stamps.json").read_text()) == st
px = lambda n, xy: Image.open(out / f"{n}.webp").getpixel(xy)[:3]
assert px("terrain_00.t1-3", (20, 12))[0] > 200 and px("terrain_00.t1-3", (2, 2))[0] < 80  # decal in, ground kept
assert px("terrain_01.t7-9", (4, 24))[0] > 200  # the second stamp lands in the next chunk, in its own band
# --install: the variants join the sol folder beside the day files, and the table of static requires lists them
sol2, ts = tmp / "sol2", tmp / "solBandes.ts"
shutil.copytree(sol, sol2)
assert G.install(out, sol2, ts) == names
table = ts.read_text()
assert 'terrain_01.t7-9.nuit.webp' in table and table.count("require(") == 4 and (sol2 / "terrain_00.webp").exists()
assert '"00.t1-3"' in table and '"01.t7-9"' in table
assert Image.open(out / "terrain_00.t1-3.nuit.webp").size == (40, 30)
pb = G.per_band(st)
assert [len(pb[b]) for b in G.BANDS] == [1, 1, 2, 2]
for bad in ([{"asset": "a", "tile": [0, 0], "flip": False, "band": "nope"}],):
    try:
        G.per_band(bad)
        raise SystemExit("unknown band accepted")
    except AssertionError:
        pass
try:
    G.bake(sol, st, sol, tmp)
    raise SystemExit("bake over the day files accepted")
except AssertionError:
    pass
print("cuire_sol ok")

import rues_port as R

# The port of rues.ts gives the frozen list that __tests__/iso-route-sud.test.tsx holds the TS road to.
froze = json.loads((R.ROOT / "docs/designs/village-loop/loupes/bc/route_tuiles.json").read_text())
assert R.tuiles() == froze["sorties"] and R.PARCELLES == froze["parcelles"], "rues_port.py and route_tuiles.json differ"
sud = froze["sorties"]["12,19"]["route"]
assert sud[0] == [12, 19] and len(sud) > 30
assert sum(froze["sorties"]["12,19"]["noeuds_route"][-1]) < R.FIN_SUD
print("rues_port ok")

shutil.rmtree(tmp)
print("test_loupes: all green")
