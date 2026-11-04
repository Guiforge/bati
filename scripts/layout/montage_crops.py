#!/usr/bin/env python3
"""montage_crops.py CROPS_DIR OUT.jpg: avant | apres for porte, lisiere, pieds, stacked, with the pixel difference of each."""
import pathlib
import sys

from PIL import Image, ImageChops, ImageDraw, ImageStat

d = pathlib.Path(sys.argv[1])
rows = []
for n in ("porte", "lisiere", "pieds"):
    a, b = Image.open(d / f"monde-{n}-avant.png").convert("RGB"), Image.open(d / f"monde-{n}-apres.png").convert("RGB")
    diff = 100 * sum(ImageStat.Stat(ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 8 else 0)).mean) / 255 if a.size == b.size else -1
    h = 420
    a, b = (im.resize((int(im.width * h / im.height), h)) for im in (a, b))
    row = Image.new("RGB", (a.width + b.width + 8, h + 18), "white")
    row.paste(a, (0, 18))
    row.paste(b, (a.width + 8, 18))
    ImageDraw.Draw(row).text((4, 2), f"{n}: avant (origin/track-layout) | apres (plan) | meme position monde", fill="black")
    rows.append(row)
    print(n, f"{diff:.2f} % of pixels differ (tolerance 8 levels)")
W = max(r.width for r in rows)
out = Image.new("RGB", (W, sum(r.height for r in rows)), "white")
y = 0
for r in rows:
    out.paste(r, (0, y))
    y += r.height
out.thumbnail((1080, 4000))
out.save(sys.argv[2], quality=85)
