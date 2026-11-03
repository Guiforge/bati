#!/usr/bin/env python3
"""Loupe crops: tile rectangles to pixels, motion contact sheet, KEEP pixel gap (PROMPT.md 10.1).

    loupe_crop.py crop  <img> <dump.json> i0,j0,i1,j1 <out.png>   crop a tile rectangle (inclusive tiles)
    loupe_crop.py sheet <video> <out.png> [--start S]             12 frames at 10 fps, 6x2, ffmpeg -n
    loupe_crop.py sheet-all <video> <out.png> [--square]          12 frames spread over the whole film, 6x2
    loupe_crop.py diff  <a.png> <b.png> [--tol N]                 % of pixels differing; exit 1 at 2 % or more

The camera is the one in the sprite dump (see loupe_checks.py header). Projection assumed:
  x = (i - j) * tileW / 2 * zoom + tx      y = (i + j) * tileH / 2 * zoom + ty
(i, j) is a tile corner; tile (i, j) covers corners (i, j) to (i+1, j+1).
This is the app's exact projection in screen pixels (tileW 48, tileH 24, zoom = camera zoom x display
density, tx/ty with the map area's offset and pivot folded in): see loupe_checks.py and
components/village/iso/dumpSprites.ts `cameraDump`.
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


SHEET_FRAMES = 12
MIN_FILM_S = 1.0  # under this a film is one frame (screenrecord writes nothing while the screen is still)


def sheet_fps(duration, frames=SHEET_FRAMES):
    """The fps that spreads `frames` over a film of `duration` seconds."""
    if not duration or duration < MIN_FILM_S:
        raise ValueError(f"film of {duration} s, under {MIN_FILM_S} s: nothing moved while it recorded")
    return frames / duration


def film_duration(video):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        raise ValueError(f"{video}: ffprobe reads no duration ({r.stderr.strip() or 'empty output'})") from None


def contact_sheet_all(video, out, square=False):
    """12 frames spread over the whole film (PROMPT.md 9.5), `square`: the centred square, where a lone building stands."""
    out = pathlib.Path(out)
    if out.exists():
        raise FileExistsError(f"{out} exists, ffmpeg -n replaces nothing")
    fps = sheet_fps(film_duration(video))
    vf = f"fps={fps:.6f}," + ("crop=iw:min(iw\\,ih)," if square else "") + "tile=6x2"
    subprocess.run(["ffmpeg", "-n", "-v", "error", "-i", str(video), "-vf", vf, "-frames:v", "1", str(out)], check=True)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("crop")
    c.add_argument("img"); c.add_argument("dump"); c.add_argument("tiles"); c.add_argument("out")
    s = sub.add_parser("sheet")
    s.add_argument("video"); s.add_argument("out"); s.add_argument("--start", type=float, default=0.0)
    sa = sub.add_parser("sheet-all")
    sa.add_argument("video"); sa.add_argument("out"); sa.add_argument("--square", action="store_true")
    d = sub.add_parser("diff")
    d.add_argument("a"); d.add_argument("b"); d.add_argument("--tol", type=int, default=0)
    a = ap.parse_args(argv)
    if a.cmd == "crop":
        cam = json.load(open(a.dump))["camera"]
        crop_tiles(Image.open(a.img), cam, [int(v) for v in a.tiles.split(",")]).save(a.out)
        print(a.out)
    elif a.cmd == "sheet":
        print(contact_sheet(a.video, a.out, a.start))
    elif a.cmd == "sheet-all":
        try:
            print(contact_sheet_all(a.video, a.out, a.square))
        except ValueError as e:
            print(f"loupe_crop.py sheet-all: {e}", file=sys.stderr)
            return 1
    else:
        p = diff_percent(Image.open(a.a), Image.open(a.b), a.tol)
        print(f"{p:.3f} % differ ({'KEEP passes' if p < KEEP_MAX else 'goes through A/B'})")
        return 0 if p < KEEP_MAX else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
