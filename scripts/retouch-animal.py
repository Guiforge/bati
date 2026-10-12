#!/usr/bin/env python3
"""Retouch an accepted animal portrait (the 1024 px .jpg), before to-webp.py, with PIL alone.

    python3 scripts/retouch-animal.py assets/images/animals/bear-young.jpg \\
        --eye 731,332,3 --eye 714,338,6 --shadow 44,780,760,875 \\
        --note "four eye highlights painted out, the ground shadow erased"
    python3 scripts/retouch-animal.py assets/images/animals/bear-adult.jpg \\
        --eye 802,236,3 --fringe 56,88,937,846 --note "..."

FLUX paints a white catchlight in every eye whatever the prompt says, a cast shadow under a free
standing animal (the cutout leaves it as a dark smear on the village's cards) and, on a few
draws, a cold blue rim of light that survives the cutout as a blue outline. Each flag fixes one:

  --eye X,Y,R       Disc of radius R at (X,Y), in px of the 1024 original: every pixel brighter
                    than the median of the ring around it takes that median.
  --shadow X0,Y0,X1,Y1
                    In the box, pixels darker than the background, and neutral or blue (fur is
                    never), take the background colour. A 3 px band around anything that is not
                    background is spared, so the ink outline of a paw stays.
  --fringe X0,Y0,X1,Y1
                    In the box, pixels within --reach px (16 by default) of the subject's contour that read blue
                    (b - r > 15, luminance > 70) are desaturated, then tinted to the median of
                    the warm pixels next to them, keeping their own lightness, up to 1.2 times the fur. The distance is
                    square (Chebyshev), which is close enough for a rim.
  --fill X0,Y0,X1,Y1
                    The box takes the background colour outright: for stray droplets or specks
                    that --shadow spares (it only touches darker pixels) and that the cutout
                    would keep as floating islands. Check the box clears the animal at x3.
  --note TEXT       Writes `edited` in provenance.json (dated today),
                    the way the other retouched entries read.

The file is rewritten in place at JPEG q95: the candidate it came from is still in
~/.cache/bati-art-loop/animals/, and `accept` can bring it back. Run it before to-webp.py, never
after: the webp is lossy and the ledger entry follows the file.
"""

import argparse
import json
import pathlib
import statistics
import sys
from datetime import date

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
PROVENANCE = ROOT / "scripts" / "provenance.json"
DAY = date.today().isoformat()


def lum(p) -> float:
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def median_rgb(pixels) -> tuple[int, int, int]:
    return tuple(int(statistics.median(p[c] for p in pixels)) for c in range(3))  # type: ignore[return-value]


def background(im: Image.Image) -> tuple[int, int, int]:
    """The flat navy, read off the four corners."""
    w, h = im.size
    px = im.load()
    pts = [px[x, y] for x0, y0 in ((0, 0), (w - 24, 0), (0, h - 24), (w - 24, h - 24))
           for x in range(x0, x0 + 24) for y in range(y0, y0 + 24)]
    return median_rgb(pts)


def disc(cx: int, cy: int, r: int):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                yield x, y


def eye(im: Image.Image, src: Image.Image, cx: int, cy: int, r: int) -> int:
    """Pixels brighter than the ring's median take the median. The ring is read off `src`, the
    image as it was, so two discs that touch do not feed each other."""
    s, out = src.load(), im.load()
    ring = [s[x, y] for x, y in disc(cx, cy, r + 4) if (x - cx) ** 2 + (y - cy) ** 2 > (r + 1) ** 2]
    med = median_rgb(ring)
    ml = lum(med)
    n = 0
    for x, y in disc(cx, cy, r):
        if lum(s[x, y]) > ml:
            out[x, y] = med
            n += 1
    return n


def subject_mask(im: Image.Image) -> Image.Image:
    """255 where the subject is: everything the flood from the four corners (threshold 30, as in
    cutout.py) does not reach."""
    flooded = im.copy()
    w, h = im.size
    for corner in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(flooded, corner, (255, 0, 255), thresh=30)
    outside = ImageChops.difference(flooded, im).convert("L").point(lambda v: 255 if v else 0)
    # A subject pixel that happens to be changed by the flood is impossible (the flood only
    # repaints what it reaches), so "changed" is exactly "outside".
    return outside.point(lambda v: 0 if v else 255)


def shadow(im: Image.Image, box: tuple[int, int, int, int]) -> int:
    bg = background(im)
    bl = lum(bg)
    px = im.load()
    x0, y0, x1, y1 = box
    # What is clearly the animal: warm, or clearly lighter than the night. Its 3 px halo is spared.
    warm = Image.new("L", im.size, 0)
    wp = warm.load()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            p = px[x, y]
            if p[0] - p[2] >= 10 or lum(p) > bl + 30:
                wp[x, y] = 255
    spared = warm.filter(ImageFilter.MaxFilter(7))
    sp = spared.load()
    n = 0
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            p = px[x, y]
            if sp[x, y] == 0 and lum(p) < bl - 2 and p[0] - p[2] < 10:
                px[x, y] = bg
                n += 1
    return n


def fill(im: Image.Image, box: tuple[int, int, int, int]) -> int:
    x0, y0, x1, y1 = box
    ImageDraw.Draw(im).rectangle(box, fill=background(im))
    return (x1 - x0 + 1) * (y1 - y0 + 1)


def fringe(im: Image.Image, box: tuple[int, int, int, int], reach: int = 16) -> int:
    inside = subject_mask(im)
    core = inside.filter(ImageFilter.MinFilter(2 * reach + 1))  # `reach` px in from the contour
    band = ImageChops.subtract(inside, core).load()
    px = im.load()
    x0, y0, x1, y1 = box

    def blue(p) -> bool:
        return p[2] - p[0] > 15 and lum(p) > 70

    def warm(p) -> bool:
        return not blue(p) and p[0] >= p[2] and lum(p) > 35

    fixed = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if band[x, y] and blue(px[x, y]):
                fixed.append((x, y))
    todo = {}
    for x, y in fixed:
        near = [px[i, j] for j in range(y - 12, y + 13) for i in range(x - 12, x + 13)
                if 0 <= i < im.width and 0 <= j < im.height and warm(px[i, j])]
        if not near:
            continue
        med = median_rgb(near)
        k = min(1.2, max(0.5, lum(px[x, y]) / max(lum(med), 1)))
        todo[x, y] = tuple(min(255, int(c * k)) for c in med)
    for (x, y), c in todo.items():  # applied after, so a fixed pixel is never a neighbour
        px[x, y] = c
    return len(todo)


def note_it(path: pathlib.Path, note: str) -> None:
    key = str(path.resolve().relative_to(ROOT))
    ledger = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    if key not in ledger:
        sys.exit(f"no provenance entry for {key}: accept it first")
    ledger[key]["edited"] = f"{DAY}: {note}; the signed original is unchanged"
    PROVENANCE.write_text(json.dumps(dict(sorted(ledger.items())), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def ints(raw: str, n: int) -> tuple[int, ...]:
    parts = tuple(int(v) for v in raw.split(","))
    if len(parts) != n:
        raise argparse.ArgumentTypeError(f"{raw!r}: expected {n} comma-separated integers")
    return parts


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image", type=pathlib.Path)
    ap.add_argument("--eye", action="append", default=[], type=lambda s: ints(s, 3))
    ap.add_argument("--shadow", type=lambda s: ints(s, 4))
    ap.add_argument("--fill", action="append", default=[], type=lambda s: ints(s, 4))
    ap.add_argument("--fringe", type=lambda s: ints(s, 4))
    ap.add_argument("--reach", type=int, default=16, help="--fringe: how far from the contour, in px")
    ap.add_argument("--note")
    args = ap.parse_args()
    src = Image.open(args.image).convert("RGB")
    im = src.copy()
    for cx, cy, r in args.eye:
        print(f"eye ({cx},{cy}) r={r}: {eye(im, src, cx, cy, r)} px")
    if args.shadow:
        print(f"shadow: {shadow(im, args.shadow)} px")
    for box in args.fill:
        if not (0 <= box[0] <= box[2] < im.width and 0 <= box[1] <= box[3] < im.height):
            sys.exit(f"--fill {box}: outside the {im.width}x{im.height} image")
        print(f"fill {box}: {fill(im, box)} px")
    if args.fringe:
        print(f"fringe: {fringe(im, args.fringe, args.reach)} px")
    im.save(args.image, quality=95, subsampling=0)
    if args.note:
        note_it(args.image, args.note)


if __name__ == "__main__":
    main()
