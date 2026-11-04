#!/usr/bin/env python3
"""Cuts the locked crops out of two atelier renders BY WORLD POSITION and compares them.

    crops.py AVANT.png AVANT-check.json APRES.png APRES-check.json OUT_PREFIX

Tiles are the loupes' (docs/designs/village-loop/loupes/bc/card.md). Each render has its own camera (`camera` of its
check's JSON, a dump of the same opening state); a crop is resampled from the tile rectangle's world box (dp, the
projection of loupe_crop.py) to the same pixel scale, so the same pixel is the same ground in both. Parts outside a
screen are black and left out of the comparison. Writes OUT_PREFIX-<crop>-avant.png / -apres.png and prints, for each crop,
the share of compared pixels that differ by more than 8 levels (on the grey image) and of the compared area.
"""
import json
import pathlib
import sys

from PIL import Image, ImageChops

CROPS = {"porte": (11, 12, 23, 24), "lisiere": (-12, -12, 6, 8), "pieds": (-4, 0, 6, 10)}
ECHELLE = 2.0  # output px per dp


def camera(chemin):
    cam = None
    d = json.loads(pathlib.Path(chemin).read_text())
    for p in d["paliers"]:
        cam = p.get("camera") or cam
    if cam is None:
        sys.exit(f"no camera in {chemin}")
    return cam


def boite(tiles):
    i0, j0, i1, j1 = tiles
    pts = [((i - j) * 24, (i + j) * 12) for i in (i0, i1 + 1) for j in (j0, j1 + 1)]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def coupe(img, cam, tiles):
    x0, y0, x1, y1 = boite(tiles)
    w, h = int((x1 - x0) * ECHELLE), int((y1 - y0) * ECHELLE)
    z = cam["zoom"]
    k = z / ECHELLE
    data = (k, 0, z * x0 + cam["tx"], 0, k, z * y0 + cam["ty"])
    vue = img.transform((w, h), Image.AFFINE, data, Image.BILINEAR, fillcolor=(0, 0, 0))
    masque = Image.new("L", img.size, 255).transform((w, h), Image.AFFINE, data, Image.NEAREST, fillcolor=0)
    return vue, masque


def main():
    a_png, a_json, b_png, b_json, sortie = sys.argv[1:6]
    a, b = Image.open(a_png).convert("RGB"), Image.open(b_png).convert("RGB")
    ca, cb = camera(a_json), camera(b_json)
    print(f"camera avant zoom {ca['zoom']:.3f} tx {ca['tx']:.1f} ty {ca['ty']:.1f}; apres zoom {cb['zoom']:.3f} tx {cb['tx']:.1f} ty {cb['ty']:.1f}")
    for nom, tiles in CROPS.items():
        va, ma = coupe(a, ca, tiles)
        vb, mb = coupe(b, cb, tiles)
        commun = ImageChops.multiply(ma, mb).point(lambda v: 255 if v > 200 else 0)
        n = sum(1 for v in commun.getdata() if v)
        diff = ImageChops.difference(va.convert("L"), vb.convert("L")).point(lambda v: 255 if v > 8 else 0)
        d = sum(1 for v, c in zip(diff.getdata(), commun.getdata()) if v and c)
        va.save(f"{sortie}-{nom}-avant.png")
        vb.save(f"{sortie}-{nom}-apres.png")
        print(f"{nom}: {100 * n / (va.width * va.height):.0f} % of the crop on both screens, {100 * d / max(1, n):.1f} % of those pixels differ")


main()
