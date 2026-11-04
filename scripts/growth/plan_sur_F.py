#!/usr/bin/env python3
"""Guillaume's tier 12 plan (direction/target.md) projected on montage F, to see what F's places collide with.
A building's corner, from the plan's table, on the fixed camera (foyer=campfire, zoom 0.45). Writes img/plan-sur-F.jpg, prints the distances."""
import math
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
D = ROOT / "docs/designs/village/growth"
# Calibrated on the render: the campfire at (540, 1255), 1.18 px a dp (zoom 0.45 at 2.625). Checked on the mill [7, 0] and the gate [12, 16].
CX, CY, S = 540, 1255, 0.45 * 2.625
TOP = 480  # the montage's crop
PLAN = {"bosquet": (-3, -5), "grange": (-3, -2), "observatoire": (-6, 3), "moulin": (0, 5), "ferme": (-1, 9), "carriere": (3, 0), "antre": (10, 0), "sorcier": (16, 1)}
PIECES = {"hameau": (120, 780), "ferme d'essart": (320, 700), "champs": (110, 625), "bourg": (540, 650), "ferme est": (1000, 1000)}


def ecran(gx, gy):
    return CX + (gx - gy - 1) * 24 * S, CY + (gx + gy - 23) * 12 * S


im = Image.open(D / "scratch/montage/F_12.png").convert("RGB")
d = ImageDraw.Draw(im)
font = ImageFont.load_default(24)
for name, cell in PLAN.items():
    x, y = ecran(*cell)
    y -= TOP
    d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(240, 168, 72), outline=(15, 21, 24), width=2)
    d.text((x + 12, y - 12), name, fill=(255, 240, 200), font=font, stroke_width=3, stroke_fill=(15, 21, 24))
    near = min(PIECES, key=lambda p: math.dist(PIECES[p], (x, y + TOP)))
    print(f"{name:13} {round(x):5} {round(y + TOP):5}  pièce F la plus proche : {near}, {round(math.dist(PIECES[near], (x, y + TOP)) / (S * 48)):d} cases environ")
im.thumbnail((1080, 1703))
im.save(D / "img/plan-sur-F.jpg", quality=84)
