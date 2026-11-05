#!/usr/bin/env python3
"""G11: the 1/8 thumbnail difference between neighbouring tiers, the method of scratch/plan/numbers.txt (montage_plan.py `numbers`): the frame cropped
to (0, 480, 1080, 2183), grey, 1/8 box resize, blur radius 1, mean absolute pixel difference. "Before" = the renders without the pieces
(scratch/fixe), "after" = the real scene with them (scratch/fixe2).

    vignette_apres.py [tiers...]     default 6 to 12
"""
import pathlib
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
S = ROOT / "docs/designs/village/growth/scratch"
CROP = (0, 480, 1080, 2183)
CORE = (210, 520, 860, 870)


def thumb(im):
    g = im.convert("L")
    return np.asarray(g.resize((g.width // 8, g.height // 8), Image.BOX).filter(ImageFilter.GaussianBlur(1)), dtype=np.float64)


def load(folder, t):
    return Image.open(S / folder / f"t{t}-jour.png").convert("RGB").crop(CROP)


def main():
    tiers = [int(a) for a in sys.argv[1:]] or list(range(6, 13))
    out = ["tiers: 1/8 thumb d_pixel before -> after | whole d_pixel before -> after | core d_pixel before -> after"]
    for a, b in zip(tiers, tiers[1:], strict=False):
        row = []
        for folder in ("fixe3", "fixe4"):
            ia, ib = load(folder, a), load(folder, b)
            t = float(np.abs(thumb(ib) - thumb(ia)).mean())
            w = float(np.abs(np.asarray(ib.convert("L"), dtype=np.float64) - np.asarray(ia.convert("L"), dtype=np.float64)).mean())
            c = float(np.abs(np.asarray(ib.convert("L").crop(CORE), dtype=np.float64) - np.asarray(ia.convert("L").crop(CORE), dtype=np.float64)).mean())
            row.append((t, w, c))
        (t0, w0, c0), (t1, w1, c1) = row
        out.append(f"{a}->{b}: 1/8 thumb {t0:.2f} -> {t1:.2f} | whole {w0:.2f} -> {w1:.2f} | core {c0:.2f} -> {c1:.2f}")
    (S / "fixe4" / "vignette.txt").write_text("\n".join(out) + "\n")
    print("\n".join(out))


if __name__ == "__main__":
    main()
