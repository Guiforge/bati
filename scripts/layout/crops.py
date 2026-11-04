#!/usr/bin/env python3
"""Cuts the locked crops out of an atelier render: crops.py RENDER.png CHECK.json OUT_PREFIX.

Tiles are the loupes' (docs/designs/village-loop/loupes/bc/card.md); the camera is `camera` of the check's JSON
(a dump of the same opening state). Uses scripts/iso/loupe_crop.py's projection. Writes OUT_PREFIX-<name>.png.
"""
import json
import pathlib
import sys

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "iso"))
import loupe_crop  # noqa: E402

CROPS = {"porte": (11, 12, 23, 24), "lisiere": (-12, -12, 6, 8), "pieds": (-4, 0, 6, 10)}


def main():
    img = Image.open(sys.argv[1]).convert("RGB")
    d = json.loads(pathlib.Path(sys.argv[2]).read_text())
    cam = None
    for p in d["paliers"] if isinstance(d["paliers"], list) else d["paliers"].values():
        cam = p.get("camera") or cam
    if cam is None:
        sys.exit("no camera in the check json")
    cam = dict(cam, screenW=img.width, screenH=img.height)
    for nom, tiles in CROPS.items():
        try:
            loupe_crop.crop_tiles(img, cam, tiles).save(f"{sys.argv[3]}-{nom}.png")
        except ValueError as e:
            print(nom, e)


main()
