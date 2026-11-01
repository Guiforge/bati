#!/usr/bin/env python3
"""Loupe crops: tile rectangles to pixels, motion contact sheet, KEEP pixel gap (PROMPT.md 10.1).

    loupe_crop.py crop  <img> <dump.json> i0,j0,i1,j1 <out.png>   crop a tile rectangle (inclusive tiles)
    loupe_crop.py sheet <video> <out.png> [--start S]             12 frames at 10 fps, 6x2, ffmpeg -n
    loupe_crop.py diff  <a.png> <b.png> [--tol N]                 % of pixels differing; exit 1 at 2 % or more

The camera is the one in the sprite dump (see loupe_checks.py header). Projection assumed:
  x = (i - j) * tileW / 2 * zoom + tx      y = (i + j) * tileH / 2 * zoom + ty
(i, j) is a tile corner; tile (i, j) covers corners (i, j) to (i+1, j+1).
"""

import argparse
import json
import pathlib
import subprocess
import sys

from PIL import Image, ImageChops

KEEP_MAX = 2.0  # % of pixels, PROMPT.md 10.1


def tile_to_px(cam, i, j):
    z = cam["zoom"]
    return ((i - j) * cam["tileW"] / 2 * z + cam["tx"], (i + j) * cam["tileH"] / 2 * z + cam["ty"])


def tile_rect_px(cam, i0, j0, i1, j1):
    """Pixel bounding box (x0, y0, x1, y1) of the tile rectangle, clamped to the screen."""
    pts = [tile_to_px(cam, i, j) for i in (i0, i1 + 1) for j in (j0, j1 + 1)]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return (max(0, round(min(xs))), max(0, round(min(ys))),
            min(cam["screenW"], round(max(xs))), min(cam["screenH"], round(max(ys))))


def crop_tiles(img, cam, tiles):
    box = tile_rect_px(cam, *tiles)
    if box[2] <= box[0] or box[3] <= box[1]:
        raise ValueError(f"crop {tiles} falls outside the screen: {box}")
    return img.crop(box)


def diff_percent(a, b, tol=0):
    if a.size != b.size:
        return 100.0
    r, g, bl = ImageChops.difference(a.convert("RGB"), b.convert("RGB")).split()
    m = ImageChops.lighter(ImageChops.lighter(r, g), bl).point(lambda v: 255 if v > tol else 0)
    return 100.0 * m.histogram()[255] / (a.size[0] * a.size[1])


def contact_sheet(video, out, start=0.0):
    out = pathlib.Path(out)
    if out.exists():
        raise FileExistsError(f"{out} exists, ffmpeg -n replaces nothing")
    cmd = ["ffmpeg", "-n", "-v", "error", "-ss", str(start), "-i", str(video),
           "-vf", "fps=10,tile=6x2", "-frames:v", "1", str(out)]
    subprocess.run(cmd, check=True)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("crop")
    c.add_argument("img"); c.add_argument("dump"); c.add_argument("tiles"); c.add_argument("out")
    s = sub.add_parser("sheet")
    s.add_argument("video"); s.add_argument("out"); s.add_argument("--start", type=float, default=0.0)
    d = sub.add_parser("diff")
    d.add_argument("a"); d.add_argument("b"); d.add_argument("--tol", type=int, default=0)
    a = ap.parse_args(argv)
    if a.cmd == "crop":
        cam = json.load(open(a.dump))["camera"]
        crop_tiles(Image.open(a.img), cam, [int(v) for v in a.tiles.split(",")]).save(a.out)
        print(a.out)
    elif a.cmd == "sheet":
        print(contact_sheet(a.video, a.out, a.start))
    else:
        p = diff_percent(Image.open(a.a), Image.open(a.b), a.tol)
        print(f"{p:.3f} % differ ({'KEEP passes' if p < KEEP_MAX else 'goes through A/B'})")
        return 0 if p < KEEP_MAX else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
