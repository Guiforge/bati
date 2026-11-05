#!/usr/bin/env python3
"""docs/designs/village/growth/img/pieces-finales.jpg: every final at one scale on a mid ground, the forge and the hall beside them."""
import pathlib
import sys

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
F = ROOT / "docs/designs/village/growth/scratch/final"
ISO = ROOT / "assets/images/village/iso"
W, SCALE, GAP, MID = 1080, float(sys.argv[1]) if len(sys.argv) > 1 else 0.4, 10, (128, 124, 116)


def tile(path, name):
    im = Image.open(path).convert("RGBA")
    im = im.crop(im.getchannel("A").getbbox())
    im = im.resize((max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE))), Image.LANCZOS)
    return name, im


refs = [tile(ISO / "forge/solid.jour.webp", "forge (ref)"), tile(ISO / "heroes_hall/solid.jour.webp", "hall (ref)")]
names = sorted(p.name.removesuffix(".jour.webp") for p in F.glob("*.jour.webp"))
order = [n for n in names if n[0] in "AB" and n != "A4"] + [n for n in names if n.endswith("_F_v1") or n.endswith("_F_v2")] + \
        [n for n in names if n.startswith(("souche", "copeaux"))] + [n for n in names if n == "A4"]
tiles = refs + [tile(F / f"{n}.jour.webp", n) for n in order]
rows, row, x = [], [], 0
for t in tiles:
    if row and x + t[1].width > W - GAP:
        rows.append(row)
        row, x = [], 0
    row.append(t)
    x += t[1].width + GAP
rows.append(row)
heights = [max(t[1].height for t in r) + 16 for r in rows]
sheet = Image.new("RGB", (W, sum(heights) + GAP * len(rows)), MID)
d = ImageDraw.Draw(sheet)
y = 0
for r, h in zip(rows, heights):
    x = GAP // 2
    for name, im in r:
        sheet.paste(im, (x, y + h - im.height), im)
        d.text((x, y + 1), f"{name} {im.width}x{im.height}", fill=(255, 255, 255))
        x += im.width + GAP
    y += h + GAP
sheet.save(ROOT / "docs/designs/village/growth/img/pieces-finales.jpg", quality=88)
print(sheet.size)
