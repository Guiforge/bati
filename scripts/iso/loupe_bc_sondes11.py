#!/usr/bin/env python3
"""Loupe BC sondes-11 (round 5): three small procedural retouches of the r4 corner stamp. No FLUX, cost 0.

    python3 scripts/iso/loupe_bc_sondes11.py build | diff

The r4 stamp (bc/r4/sondes/sol_r4.webp) is the base and stays pixel identical outside the three windows, which are
cloned from the stamp's own neighbouring pixels (the soil and rows of the plot, the meadow, the tufts), never repainted
from nothing. Windows, in stamp-crop px (2 px per screen px, screen rows 1300..2480):
  1. the vegetable plot's flat meadow triangle (screen 690-780 x 1626-1656): flat olive pixels replaced by the plot's
     own rows shifted one lattice step along the row direction;
  2. the lighter meadow block left of the top of the road (screen 72-156 x 1464-1518): its straight edges broken by
     ragged tongues of the surrounding ground;
  3. the road's head: the pale sand tongue east of the ruts is replaced by the meadow below it, and the ruts run on
     into the paving by colour only (the stamp's alpha is never raised, so nothing paints over the gate sprites).
Output bc/r5/sondes/sol_r5.webp and bc/r5/stamps.json. A window whose clone fails keeps the r4 pixels (`WINDOWS`).
"""
import json
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import loupe_bc_sondes10 as S10
import loupe_targets as T
from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = T.LOUPES / "bc/r5/sondes"
SRC = S10.OUT / "sol_r4.webp"
OFFSET = (0, 410)  # where the r4 crop sits in its stamp canvas (S10.embed)
BOXES = {"1": (1320, 580, 1580, 665), "2": (0, 360, 420, 525), "3": (650, 235, 790, 335)}  # each window's footprint, crop px


def flat_mask(img, box, ref, tol):
    """Pixels of `box` whose colour lies within `tol` (sum of channel gaps) of `ref`, median-cleaned."""
    m = Image.new("L", img.size, 0)
    px, mp = img.convert("RGB").load(), m.load()
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            r, g, b = px[x, y]
            if abs(r - ref[0]) + abs(g - ref[1]) + abs(b - ref[2]) < tol:
                mp[x, y] = 255
    return m.filter(ImageFilter.MedianFilter(5))


def clone(img, mask, shift):
    """Pixel (x, y) takes (x + shift[0], y + shift[1]) where mask is on (feathered); alpha stays the destination's."""
    src = ImageChops.offset(img, -shift[0], -shift[1])
    mixed = Image.composite(src, img, mask)
    mixed.putalpha(img.getchannel("A"))
    return mixed


def win1(c):
    """Flat meadow triangle among the plot's rows: two passes, the second for the faded top."""
    for box, tol, poly in (
        ((1330, 590, 1560, 645), 26, [(1350, 600), (1560, 590), (1560, 650), (1350, 650)]),
        ((1400, 598, 1530, 628), 60, [(1405, 602), (1525, 596), (1525, 626), (1405, 626)]),
    ):
        m = flat_mask(c, box, (116, 117, 78), tol)
        p = Image.new("L", c.size, 0)
        ImageDraw.Draw(p).polygon(poly, fill=255)
        m = ImageChops.multiply(m, p).filter(ImageFilter.MaxFilter(7 if tol > 30 else 9)).filter(ImageFilter.GaussianBlur(2.5 if tol > 30 else 3))
        c = clone(c, m, (43, 20))
    return c


def blobs(size, rng, pts, rx, ry):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for x, y in pts:
        r = rng.uniform(*rx)
        w = r * (1 / ry if ry < 1 else 1)
        d.ellipse((x - w, y - r * ry, x + w, y + r * ry), fill=255)
    return m.filter(ImageFilter.GaussianBlur(2))


def line(rng, a, b, step=12, jit=6):
    n = max(1, int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) / step))
    return [(a[0] + (b[0] - a[0]) * k / n + rng.uniform(-jit, jit), a[1] + (b[1] - a[1]) * k / n + rng.uniform(-jit, jit)) for k in range(n + 1)]


def win2(c):
    """The lighter block's straight sides: dark tongues down over its seam, grey ground tongues over its four edges."""
    rng = random.Random(7)
    sz = c.size

    def tongues(pts, rx, ry, shift):
        nonlocal c
        c = clone(c, blobs(sz, rng, pts, rx, ry), shift)

    tongues([(max(14, x), y + rng.uniform(0, 22)) for x, y in line(rng, (14, 392), (340, 392))], (9, 24), 0.45, (0, -60))
    tongues([(x + rng.uniform(-4, 16), y) for x, y in line(rng, (352, 408), (352, 490), 11)], (6, 16), 1.0, (-70, 0))
    tongues([(x + rng.uniform(-16, 4), y) for x, y in line(rng, (94, 412), (94, 488), 11)], (6, 16), 1.0, (70, 0))
    tongues([(x, y + rng.uniform(0, 14)) for x, y in line(rng, (100, 414), (346, 414), 16)], (6, 16), 1.0, (0, 45))
    tongues([(x, y + rng.uniform(-14, 0)) for x, y in line(rng, (100, 487), (346, 487), 16)], (6, 16), 1.0, (0, -45))
    return c


def win3(c):
    """The road's head: the pale sand tongue east of the ruts becomes the meadow just below it; the rut band is
    carried on to the paving by colour inside the alpha the stamp already has."""
    poly = [(672, 258), (700, 246), (764, 262), (764, 318), (700, 320), (672, 300)]
    zone = Image.new("L", c.size, 0)
    ImageDraw.Draw(zone).polygon(poly, fill=255)
    sand = Image.new("L", c.size, 0)
    px, sp = c.convert("RGB").load(), sand.load()
    for y in range(240, 330):
        for x in range(660, 780):
            r, g, b = px[x, y]
            if r > g + 10 and r > b + 25:
                sp[x, y] = 255
    m = ImageChops.multiply(sand.filter(ImageFilter.MedianFilter(5)), zone).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
    return clone(c, m, (30, 65))


WINDOWS = {"1": win1, "2": win2, "3": win3}


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    stamp = Image.open(SRC).convert("RGBA")
    crop = stamp.crop((OFFSET[0], OFFSET[1], OFFSET[0] + S10.CW, OFFSET[1] + S10.CH))
    base = crop.copy()
    out = crop
    for name, fn in WINDOWS.items():
        try:
            nxt = fn(out.copy())
            # the window must stay inside its footprint: anything else changed means the window failed, keep r4
            bad = ImageChops.difference(out, nxt).convert("L").point(lambda v: 255 if v else 0)
            keep = Image.new("L", out.size, 0)
            ImageDraw.Draw(keep).rectangle(BOXES[name], fill=255)
            if ImageChops.multiply(bad, Image.eval(keep, lambda p: 255 - p)).getbbox():
                raise RuntimeError(f"window {name} changed pixels outside its footprint")
            out = nxt
        except Exception as e:  # noqa: BLE001  a failed window keeps the r4 pixels, and says so
            print(f"window {name} FAILED, r4 pixels kept: {e}")
    canvas = stamp.copy()
    canvas.paste(out, OFFSET)
    canvas.save(OUT / "sol_r5.webp", lossless=True)
    (OUT.parent / "stamps.json").write_text(json.dumps([{"asset": "sondes/sol_r5.webp", "tile": list(S10.TILE), "flip": False, "band": "t4-6"}]))
    base.save(OUT / "crop_r4.png")
    out.save(OUT / "crop_r5.png")
    print("stamp", canvas.size, "tile", S10.TILE)


def diff():
    """Pixels of the r5 stamp against the r4 stamp outside the three footprints: must be zero."""
    a, b = Image.open(SRC).convert("RGBA"), Image.open(OUT / "sol_r5.webp").convert("RGBA")
    inside = Image.new("L", a.size, 0)
    d = ImageDraw.Draw(inside)
    for box in BOXES.values():
        d.rectangle((box[0] + OFFSET[0], box[1] + OFFSET[1], box[2] + OFFSET[0], box[3] + OFFSET[1]), fill=255)
    # lossless webp keeps no colour under alpha 0: only pixels either stamp shows, and the alpha itself, are compared
    shown = ImageChops.lighter(a.getchannel("A"), b.getchannel("A")).point(lambda v: 255 if v else 0)
    changed = ImageChops.lighter(ImageChops.multiply(ImageChops.difference(a.convert("RGB"), b.convert("RGB")).convert("L"), shown), ImageChops.difference(a.getchannel("A"), b.getchannel("A"))).point(lambda v: 255 if v else 0)
    n_out = sum(ImageChops.multiply(changed, Image.eval(inside, lambda p: 255 - p)).histogram()[1:])
    n_in = sum(ImageChops.multiply(changed, inside).histogram()[1:])
    print(json.dumps({"px_total": a.width * a.height, "px_changed_outside_windows": n_out, "px_changed_inside": n_in}))
    return n_out


if __name__ == "__main__":
    {"build": build, "diff": diff}[sys.argv[1] if len(sys.argv) > 1 else "build"]()
