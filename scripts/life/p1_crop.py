#!/usr/bin/env python3
"""Measuring aid: p1_crop.py <code> <stage> <x0> <y0> <x1> <y1> <out.png> crops a painting with a 50 px canvas grid."""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
code, stage, x0, y0, x1, y1, out = sys.argv[1:8]
x0, y0, x1, y1 = map(int, (x0, y0, x1, y1))
im = Image.open(ROOT / f"assets/images/village/iso/peints/{code}/{stage}.jour.webp").convert("RGBA")
bg = Image.new("RGBA", im.size, (120, 130, 150, 255))
bg.alpha_composite(im)
c = bg.crop((x0, y0, x1, y1))
d = ImageDraw.Draw(c)
f = ImageFont.load_default(size=14)
for x in range((x0 // 50 + 1) * 50, x1, 50):
    d.line([x - x0, 0, x - x0, y1 - y0], fill=(255, 255, 0), width=1)
    d.text((x - x0 + 2, 2), str(x), fill=(255, 255, 0), font=f)
for y in range((y0 // 50 + 1) * 50, y1, 50):
    d.line([0, y - y0, x1 - x0, y - y0], fill=(255, 255, 0), width=1)
    d.text((2, y - y0 + 2), str(y), fill=(255, 255, 0), font=f)
c.save(out)
