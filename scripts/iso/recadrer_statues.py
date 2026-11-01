#!/usr/bin/env python3
"""Crop the six totem statues (T25) from the 512 x 1280 tower1x1 canvas to their common box.

    python3 scripts/iso/recadrer_statues.py

Rewrites assets/images/village/iso/pieces/statue_<animal>.{webp,json} in place: one box for all
six (the union of their opaque areas + MARGE px), so the plinths line up; size, anchor (PIED) and the
8 px tap mask follow. Idempotent: a second run finds the cropped files and leaves them alone.

The 512 x 1280 sources are no longer in the repo (this run overwrote them, 30/10); the originals
are the art loop's candidates in ~/.cache/bati-art-loop/iso/pieces/statue_<animal>/. To redo the
crop, put the full-canvas files back at the paths above first, then run this script.
"""

import json
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
DIR = ROOT / "assets/images/village/iso/pieces"
ANIMAUX = ("ours", "hermine", "saumon", "cerf", "cheval", "sanglier")
MARGE = 8
CANVAS = (512, 1280)
# The ground point of the painted plinth in the cropped image (centre of its base, measured on the
# bear; the six share the box), the same as statue.ts PIED_PX. The canvas anchor is stale once cropped.
PIED = (130, 225)


def opaque(im: Image.Image) -> Image.Image:
    return im.getchannel("A").point(lambda v: 255 if v > 127 else 0)


def masque(im: Image.Image, step: int = 8) -> dict:
    """Same grid as iso_loop.tap_mask: one bit per 8 x 8 block holding any opaque pixel."""
    w, h = (im.width + step - 1) // step, (im.height + step - 1) // step
    a = opaque(im).resize((w, h), Image.BOX)
    rows = ["".join("1" if a.getpixel((x, y)) else "0" for x in range(w)) for y in range(h)]
    return {"step": step, "w": w, "h": h, "rows": rows}


def main() -> None:
    images = {n: Image.open(DIR / f"statue_{n}.webp").convert("RGBA") for n in ANIMAUX}
    if any(im.size != CANVAS for im in images.values()):
        print("already cropped")
        return
    boites = [opaque(im).getbbox() for im in images.values()]
    assert all(boites)
    x0 = max(0, min(b[0] for b in boites) - MARGE)
    y0 = max(0, min(b[1] for b in boites) - MARGE)
    x1 = min(CANVAS[0], max(b[2] for b in boites) + MARGE)
    y1 = min(CANVAS[1], max(b[3] for b in boites) + MARGE)
    for n, im in images.items():
        side = json.loads((DIR / f"statue_{n}.json").read_text())
        out = im.crop((x0, y0, x1, y1))
        out.save(DIR / f"statue_{n}.webp", quality=90, method=6)
        side["size"] = list(out.size)
        side["anchor"] = list(PIED)
        side["mask"] = masque(out)
        (DIR / f"statue_{n}.json").write_text(json.dumps(side) + "\n")
        print(n, side["size"])


main()
