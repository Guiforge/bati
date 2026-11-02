#!/usr/bin/env python3
"""Tools of the buildings track (docs/designs/village-buildings/PROMPT.md sections 7, 9, 12.4).

    python3 scripts/bld/bldtools.py <command> ...        (commands: shuffle ab grid footprint
                                                          silhouette sheet metrics diff)
    python3 scripts/bld/test_bldtools.py                 (self-check on generated images)

Stdlib and Pillow only, like scripts/iso (no numpy). Reuses isolib.alpha and iso_audit's mask
helpers. Judge keys (the answer to a blind shuffle or an A/B) are written under
~/.cache/bati-buildings/<building>/ and never in the repo: a key next to the images would be
read by the strangers who judge them.
"""

import argparse
import colorsys
import json
import os
import pathlib
import random
import sys
import time

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "iso"))
import iso_audit as A  # noqa: E402
import isolib as L  # noqa: E402

KEYS = pathlib.Path(os.environ.get("BATI_BUILDINGS_DIR", pathlib.Path.home() / ".cache" / "bati-buildings"))
BG = (232, 232, 228)


def write_key(building: str, kind: str, key: dict) -> pathlib.Path:
    folder = (KEYS / building).resolve()
    if L.ROOT in folder.parents or folder == L.ROOT:
        raise SystemExit(f"refusing to write a judge key inside the repo: {folder}")
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{kind}-{time.strftime('%Y%m%d-%H%M%S')}-{random.randrange(10**6):06d}.json"
    path.write_text(json.dumps(key, indent=1), encoding="utf-8")
    return path


def flat(path) -> Image.Image:
    """An image on a neutral background: judges see the same ground under every picture."""
    im = Image.open(path).convert("RGBA")
    out = Image.new("RGB", im.size, BG)
    out.paste(im, (0, 0), im)
    return out


def number(im: Image.Image, text: str) -> Image.Image:
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 8 * len(text) + 8, 16), fill=(255, 255, 255))
    d.text((4, 2), text, fill=(0, 0, 0))
    return im


def shuffle(building, images, decoys, out_dir, seed=None):
    """Numbered copies of images + decoys in random order. Key: number -> source and role."""
    rng = random.Random(seed)
    items = [(str(p), "stage") for p in images] + [(str(p), "decoy") for p in decoys]
    rng.shuffle(items)
    out = pathlib.Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    key = {}
    for n, (src, role) in enumerate(items, 1):
        number(flat(src), str(n)).save(out / f"{n:02d}.png")
        key[f"{n:02d}"] = {"source": src, "role": role}
    return write_key(building, "shuffle", key)


def ab(building, pairs, out_dir, seed=None):
    """Side by side pairs; which side holds which is random and only in the key."""
    rng = random.Random(seed)
    out = pathlib.Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    key = {}
    for n, pair in enumerate(pairs, 1):
        a, b = pair[:2]  # a third item, "canary", says a is the known winner (PROMPT.md section 10)
        left, right = (a, b) if rng.random() < 0.5 else (b, a)
        ims = [flat(left), flat(right)]
        w = max(i.width for i in ims)
        h = max(i.height for i in ims)
        sheet = Image.new("RGB", (2 * w + 8, h), (255, 255, 255))
        sheet.paste(ims[0], (0, 0))
        sheet.paste(ims[1], (w + 8, 0))
        sheet.save(out / f"pair_{n:02d}.png")
        key[f"{n:02d}"] = {"left": str(left), "right": str(right), "a": str(a), "b": str(b)}
        if len(pair) > 2:
            key[f"{n:02d}"]["canary_winner"] = str(a)
    return write_key(building, "ab", key)


def grid(src, out, cols, rows):
    """Cells numbered row by row from 1, drawn over the image. Returns the cell count."""
    im = flat(src)
    d = ImageDraw.Draw(im)
    cw, ch = im.width / cols, im.height / rows
    for r in range(rows):
        for c in range(cols):
            x, y = c * cw, r * ch
            d.rectangle((x, y, x + cw, y + ch), outline=(255, 0, 255))
            d.rectangle((x + 1, y + 1, x + 8 * len(str(r * cols + c + 1)) + 9, y + 15), fill=(255, 255, 255))
            d.text((x + 4, y + 3), str(r * cols + c + 1), fill=(0, 0, 0))
    im.save(out)
    return cols * rows


def contact(path, band=12):
    """The whole ground contact mask: for every column of the silhouette, the `band` px above its
    lowest opaque pixel, i.e. the entire lower profile (both front faces of the base), not only the
    band at the lowest row. A `<name>.contact.png` beside the image (white = ground contact, the
    socle alone, e.g. from the maquette) wins over this reading. Reads the alpha of an RGBA image,
    or the brightness of a grey `.mask.png`. The anchor is the middle of the lowest row, the foot.
    shortcut: the lower profile stands for the socle, so a stage that puts a porch in front of the
    base moves it (that is a footprint change anyway); export a `.contact.png` to be exact."""
    p = pathlib.Path(path)
    explicit = p.with_name(p.name.split(".")[0] + ".contact.png")
    im = Image.open(p)
    a = A.binary(im.getchannel("A") if "A" in im.getbands() else im.convert("L"))
    box = a.getbbox()
    if box is None:
        raise SystemExit(f"{path}: empty image")
    if explicit.exists():
        mask = A.binary(Image.open(explicit).convert("L"))
    else:
        mask = Image.new("L", a.size, 0)
        draw = ImageDraw.Draw(mask)
        for x in range(box[0], box[2]):
            col = a.crop((x, 0, x + 1, a.height)).getbbox()
            if col:
                draw.line((x, max(0, col[3] - band), x, col[3] - 1), fill=255)
    foot = a.crop((0, box[3] - 1, a.width, box[3])).getbbox()
    assert foot is not None
    return mask, ((foot[0] + foot[2]) / 2, box[3] - 1)


def footprint(paths, min_iou=0.98, anchor_px=1.0):
    """Each stage's contact mask against the first one. Returns the list of problems."""
    ref, ref_anchor = contact(paths[0])
    problems = []
    for p in paths[1:]:
        m, anchor = contact(p)
        if m.size != ref.size:
            problems.append(f"{p}: canvas {m.size} != {ref.size}")
            continue
        iou = A.iou(m, ref)
        if iou < min_iou:
            problems.append(f"{p}: contact mask IoU {iou:.3f} < {min_iou}")
        if max(abs(anchor[0] - ref_anchor[0]), abs(anchor[1] - ref_anchor[1])) > anchor_px:
            problems.append(f"{p}: anchor {anchor} != {ref_anchor}")
    return problems


def silhouette(src, out_prefix, dp=96, density=2.75):
    """Black silhouette on the neutral ground, and the picture at `dp` on its long side, i.e.
    dp * density px, blurred by 1 dp (density px).
    shortcut: density 2.75 px/dp is assumed, not measured; replace it with a real device figure."""
    return silhouette_of(A.binary(L.alpha(pathlib.Path(src)), 128), out_prefix, dp, density)


def silhouette_of(a, out_prefix, dp=96, density=2.75):
    """The same from a binary mask (255 = building)."""
    sil = Image.new("RGB", a.size, BG)
    sil.paste((0, 0, 0), (0, 0), a)
    sil.save(f"{out_prefix}.sil.png")
    k = dp * density / max(sil.size)
    small = sil.resize((max(1, round(sil.width * k)), max(1, round(sil.height * k))), Image.LANCZOS)
    small = small.filter(ImageFilter.GaussianBlur(density))
    small.save(f"{out_prefix}.{dp}.png")
    return small.size


def sheet(paths, out, cols=4, cell=192):
    rows = -(-len(paths) // cols)
    s = Image.new("RGB", (cols * cell, rows * cell), (255, 255, 255))
    for i, p in enumerate(paths):
        im = flat(p)
        im.thumbnail((cell, cell))
        x, y = (i % cols) * cell, (i // cols) * cell
        s.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        ImageDraw.Draw(s).text((x + 4, y + 3), str(i + 1), fill=(0, 0, 0))
    s.save(out)


def metrics(src, rim=8):
    """G-SET numbers. outline_px: dark pixels (luma < 60) in a `rim` band inside the silhouette,
    over the silhouette's perimeter. value and saturation: means over the opaque pixels, 0 to 1."""
    im = Image.open(src).convert("RGBA")
    a = A.binary(im.getchannel("A"))
    n = A.count(a)
    if n == 0:
        raise SystemExit(f"{src}: empty image")
    band = ImageChops.subtract(a, A.erode(a, rim))
    perimeter = A.count(ImageChops.subtract(a, A.erode(a, 1)))
    dark = im.convert("L").point(lambda v: 255 if v < 60 else 0)
    outline = A.count(ImageChops.multiply(dark, band)) / max(1, perimeter)
    rgb = im.convert("RGB")
    value = ImageStat.Stat(rgb.convert("L"), a).mean[0] / 255
    hsv = ImageStat.Stat(rgb.convert("HSV"), a).mean
    return {"outline_px": round(outline, 2), "value": round(value, 3), "saturation": round(hsv[1] / 255, 3)}


def diff_outside(before, after, mask, thr=8):
    """Pixels that changed by more than `thr` in any channel where `mask` is not set."""
    x, y = Image.open(before).convert("RGB"), Image.open(after).convert("RGB")
    if x.size != y.size:
        raise SystemExit(f"size {x.size} != {y.size}")
    m = A.binary(Image.open(mask).convert("L"))
    d = ImageChops.difference(x, y)
    r, g, b = d.split()
    changed = ImageChops.lighter(ImageChops.lighter(r, g), b).point(lambda v: 255 if v > thr else 0)
    return A.count(ImageChops.subtract(changed, m))


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("shuffle")
    s.add_argument("building"); s.add_argument("out_dir"); s.add_argument("images", nargs="+")
    s.add_argument("--decoys", nargs="*", default=[]); s.add_argument("--seed", type=int)
    s = sub.add_parser("ab")
    s.add_argument("building"); s.add_argument("out_dir")
    s.add_argument("pairs", nargs="+", help="a.png:b.png"); s.add_argument("--seed", type=int)
    s = sub.add_parser("grid")
    s.add_argument("image"); s.add_argument("out")
    s.add_argument("--cols", type=int, default=8); s.add_argument("--rows", type=int, default=6)
    s = sub.add_parser("footprint")
    s.add_argument("images", nargs="+", help="first is the reference stage")
    s.add_argument("--min-iou", type=float, default=0.98)
    s = sub.add_parser("silhouette")
    s.add_argument("image"); s.add_argument("out_prefix"); s.add_argument("--dp", type=int, default=96)
    s.add_argument("--density", type=float, default=2.75)
    s = sub.add_parser("sheet")
    s.add_argument("out"); s.add_argument("images", nargs="+"); s.add_argument("--cols", type=int, default=4)
    s = sub.add_parser("metrics")
    s.add_argument("image")
    s = sub.add_parser("diff")
    s.add_argument("before"); s.add_argument("after"); s.add_argument("mask")
    s.add_argument("--max", type=int, default=0, help="changed pixels allowed outside the mask")
    a = p.parse_args(argv)
    if a.cmd == "shuffle":
        print(shuffle(a.building, a.images, a.decoys, a.out_dir, a.seed))
    elif a.cmd == "ab":
        print(ab(a.building, [tuple(x.split(":", 1)) for x in a.pairs], a.out_dir, a.seed))
    elif a.cmd == "grid":
        print(grid(a.image, a.out, a.cols, a.rows))
    elif a.cmd == "footprint":
        bad = footprint(a.images, a.min_iou)
        print("\n".join(bad) or "footprints match")
        return 1 if bad else 0
    elif a.cmd == "silhouette":
        print(silhouette(a.image, a.out_prefix, a.dp, a.density))
    elif a.cmd == "sheet":
        sheet(a.images, a.out, a.cols)
    elif a.cmd == "metrics":
        print(json.dumps(metrics(a.image)))
    elif a.cmd == "diff":
        n = diff_outside(a.before, a.after, a.mask)
        print(n)
        return 1 if n > a.max else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
