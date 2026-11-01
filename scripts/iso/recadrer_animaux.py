#!/usr/bin/env python3
"""Crop the nine animal poses (L4-T08c) into the app's mock-up folder.

    python3 scripts/iso/recadrer_animaux.py

Reads scripts/iso/blockouts/renders/pieces/animal_<nom>_<pose>.rgba.png (768 x 768, anchor
[384, 704]); writes assets/images/village/iso/blockout/pieces/animal_<nom>_<pose>.{webp,json}.
One tight box per animal, the union of its three poses (same size, same shifted anchor), so the
poses stack as they were drawn. The sidecar is the part of a figurine's that the index reads.
"""

import json
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "scripts/iso/blockouts/renders/pieces"
OUT = ROOT / "assets/images/village/iso/blockout/pieces"
POSES = ("repos", "a", "b")
MARGE = 2


def main() -> None:
    for nom in ("chat", "poule", "corbeau"):
        images = {p: Image.open(SRC / f"animal_{nom}_{p}.rgba.png").convert("RGBA") for p in POSES}
        boites = [im.getchannel("A").getbbox() for im in images.values()]
        assert all(boites), nom
        x0 = min(b[0] for b in boites) - MARGE
        y0 = min(b[1] for b in boites) - MARGE
        x1 = max(b[2] for b in boites) + MARGE
        y1 = max(b[3] for b in boites) + MARGE
        for p, im in images.items():
            anchor = json.loads((SRC / f"animal_{nom}_{p}.anchor.json").read_text())["anchor"]
            slug = f"pieces/animal_{nom}_{p}"
            im.crop((x0, y0, x1, y1)).save(OUT / f"animal_{nom}_{p}.webp", quality=90, method=6)
            side = {
                "slug": slug,
                "source": "blockout",
                "size": [x1 - x0, y1 - y0],
                "anchor": [anchor[0] - x0, anchor[1] - y0],
                "canvas": "villager",
            }
            (OUT / f"animal_{nom}_{p}.json").write_text(json.dumps(side) + "\n")
            print(slug, side["size"], side["anchor"])


main()
