#!/usr/bin/env python3
"""Copy the picked paintings to img/ as JPEG (max 1080 px wide) and build the 4-image board."""
import pathlib

from PIL import Image

D = pathlib.Path(__file__).resolve().parent.parent.parent / "docs/designs/village/direction"
PICKS = {"t1-jour": "r_t1_3", "t6-jour": "r2_t6_1", "t12-jour": "r2_t12_2", "t12-nuit": "r_t12n_1"}
ims = []
for name, src in PICKS.items():
    im = Image.open(D / f"scratch/paint/{src}.png").convert("RGB")
    im.save(D / f"img/cible-{name}.jpg", quality=88)
    ims.append(im.resize((540, 852), Image.LANCZOS))
b = Image.new("RGB", (4 * 548 - 8, 852), (20, 20, 20))
for i, im in enumerate(ims):
    b.paste(im, (i * 548, 0))
b.save(D / "img/cible-planche.jpg", quality=85)
