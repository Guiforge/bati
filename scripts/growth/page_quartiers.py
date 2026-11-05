#!/usr/bin/env python3
"""The quarters' checkpoint page, one file with its images inlined: scratch/page-quartiers.html."""
import base64
import io
import json
import pathlib

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
D = ROOT / "docs/designs/village/growth"
S = D / "scratch"
CROP = (0, 480, 1080, 2183)


def uri(im, w, q=80):
    b = io.BytesIO()
    im.convert("RGB").resize((w, round(w * im.height / im.width)), Image.LANCZOS).save(b, "JPEG", quality=q)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()


images = {}
for key, name in {"foret": "foret-sud-t1-4", "bande-F2": "bande-F2", "bande-B": "quartiers-bande-B", "bande-C": "quartiers-bande-C", "coeur": "coeur-A-t12",
                  "vignette": "vignette-A", "sheet-B": "quartiers-B", "sheet-C": "quartiers-C"}.items():
    images[key] = uri(Image.open(D / f"img/{name}.jpg"), 1080, 84)
for t in range(6, 13):
    images[f"auj_{t:02d}"] = uri(Image.open(S / f"fixe/t{t}-jour.png").crop(CROP), 600)
    images[f"A_{t:02d}"] = uri(Image.open(S / f"plan/A_{t:02d}.png"), 600)
for p in ("A1a", "A1b", "A1c", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "B5", "B6"):
    for v in ("v1", "v2"):
        a = np.array(Image.open(S / f"quartiers/{p}_{v}.png").convert("RGB")).astype(int)
        # The concept's magenta ground would skew the eye's reading of value: same grey-green as the sheets.
        a[(a[..., 0] - a[..., 1] > 50) & (a[..., 2] - a[..., 1] > 30)] = (118, 126, 100)
        images[f"{p}_{v}"] = uri(Image.fromarray(a.astype("uint8")), 300)

page = (ROOT / "scripts/growth/page-quartiers.html").read_text()
html = page.replace("/*IMAGES*/{}", json.dumps(images))
assert html != page
(S / "page-quartiers.html").write_text(html)
print(round(len(html) / 1e6, 1), "MB", len(images), "images")
