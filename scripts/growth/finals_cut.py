#!/usr/bin/env python3
"""Cut the final paintings: key, trim, scale to the game's density, night grade, sidecar, provenance. 0 $, no model.

    finals_cut.py cut <id> <k> [<id> <k> ...]   -> scratch/final/<id>.jour.webp, .nuit.webp, .json (stumps: one set per piece)
    finals_cut.py check                         dark and light ground contact sheets of every cut, scratch/final/work/check_*.png

Density: the sprites of assets/images/village/iso keep one cell = 384 px wide (isoSpec S) and sit on screen at 0.19 of
that in the t12 render; a piece is fitted to the box `montage_plan.SIZES` gave it (render px / 0.19), the stall to the
height of the real etal_1's opaque pixels. Night: famille_jour.nuit, the grade of the existing nights (median abs
difference 3 levels on forge, hall, bridge, barn, stall), the small windows relit.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image, ImageChops, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
sys.path.insert(0, str(ROOT / "scripts"))
import famille_jour as FJ  # noqa: E402
import iso_loop  # noqa: E402
from lib import flux  # noqa: E402

F = ROOT / "docs/designs/village/growth/scratch/final"
RAW = F / "raw"
SC = 0.19
# id: (box in render px (w, h), canvas name of isoSpec, derived_from concept). Boxes: montage_plan.SIZES; F: widths of F_PIECES, height free.
BOX = {"A1a": (66, 48), "A1b": (66, 48), "A1c": (66, 48), "A2": (92, 50), "A3": (140, 64), "A5": (92, 52), "A6": (80, 56), "A7": (130, 50),
       "A8": (118, 56), "B5": (92, 50), "B6": (125, 52),
       "hameau1_F_v2": (150, 999), "hameau2_F_v1": (190, 999), "ferme3_F_v1": (150, 999), "ferme3_F_v2": (150, 999),
       "ferme4_F_v1": (190, 999), "bourg_F_v1": (260, 999)}
CANVAS = {"A1a": "decor1x1", "A1b": "decor1x1", "A1c": "decor1x1", "A2": "building1x2", "A3": "building2x3", "A5": "building1x2", "A6": "building1x2",
          "A7": "building1x3", "A8": "building2x3", "B5": "building1x2", "B6": "building2x3", "A4": "decor1x1"}
STUMP_W = 100  # px, the widest painted stump (about 1/7 of the sheet) after scaling: a quarter of a cell
LICENCE = "OpenAI output terms: the API account holder owns the output (gpt-image-2.5-sunburst), personal or commercial use"


def key(im: Image.Image) -> Image.Image:
    """Adaptive key: background = median of the border; every connected magenta region (border or enclosed) goes; soft 1 px edge, despilled."""
    rgb = np.asarray(im.convert("RGB")).astype(int)
    edge = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(edge, axis=0)
    dist = np.abs(rgb - bg).max(axis=2)
    cand = dist <= 70
    lab = label(cand)
    sizes = np.bincount(lab.ravel())
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    back = np.zeros_like(cand)
    for i in range(1, len(sizes)):
        if cand_region(lab, i, sizes, border):
            back |= lab == i
    back_img = Image.fromarray(back.astype(np.uint8) * 255)
    near = np.asarray(back_img.filter(ImageFilter.MaxFilter(9))) > 0  # within 4 px of the background
    # soft alpha on the fringe: how far the pixel is from the background colour (0 at 30, 1 at 90)
    soft = np.clip((dist - 40) / 60.0, 0, 1)
    alpha = np.where(back, 0.0, np.where(near, soft, 1.0))
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))).astype(float) / 255  # 1 px off
    out = rgb.astype(float)
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    spill = near & (b - g > 4) & (r - g > 4)  # pink on the fringe
    lim = np.maximum(g, 0) + 6
    out[..., 0] = np.where(spill, np.minimum(r, lim + (r - g) * 0.15), r)
    out[..., 2] = np.where(spill, np.minimum(b, lim + (b - g) * 0.15), b)
    return Image.fromarray(np.dstack([out.clip(0, 255), alpha * 255]).astype(np.uint8), "RGBA"), [int(v) for v in bg]


def label(mask):
    """4-connected labels, 0 = not in the mask (no scipy here: a flood on the flat array)."""
    h, w = mask.shape
    flat = mask.ravel()
    lab = np.zeros(flat.size, np.int32)
    n = 0
    for start in np.flatnonzero(flat):
        if lab[start]:
            continue
        n += 1
        lab[start] = n
        stack = [start]
        while stack:
            p = stack.pop()
            y, x = divmod(p, w)
            for q, ok in ((p - w, y > 0), (p + w, y < h - 1), (p - 1, x > 0), (p + 1, x < w - 1)):
                if ok and flat[q] and not lab[q]:
                    lab[q] = n
                    stack.append(q)
    return lab.reshape(h, w)


def cand_region(lab, i, sizes, border):
    return True  # every magenta region goes, enclosed gaps too (fence rails, crop rows, under a roof): a legit pixel is never that close to the key


def trim(im):
    box = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    return im.crop(box)


def anchor_of(im):
    a = np.asarray(im.getchannel("A")) > 127
    ys = np.nonzero(a.any(axis=1))[0]
    bottom = ys.max()
    xs = np.nonzero(a[max(0, bottom - 2): bottom + 1].any(axis=0))[0]
    return [round(float((xs.min() + xs.max()) / 2), 1), int(bottom)]


def lights(jour, name=""):
    """Tiny dim windows: warm blobs of 12-300 px framed by ink (dark ring). None for pieces with no window (stall, stumps, gardens, open sheds)."""
    if name == "A4" or name.startswith(("souche", "copeaux", "A3", "A7", "B6")):
        return None
    rgb = jour.convert("RGB")
    r, g, b = (np.asarray(c).astype(int) for c in rgb.split())
    lum = np.asarray(rgb.convert("L")).astype(int)
    warm = (r > 170) & (r - b > 90) & (r - g > 30) & (lum > 110)
    plein = np.asarray(jour.getchannel("A")) > 200
    lab = label(warm & plein)
    dark = lum < 70
    out = np.zeros(lab.shape, bool)
    for i in range(1, int(lab.max()) + 1):
        m = lab == i
        area = int(m.sum())
        ys, xs = np.nonzero(m)
        bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        if not 12 <= area <= 300 or max(bw, bh) > 22 or area < 0.55 * bw * bh:  # a pane is small and compact, a lit corner is not
            continue
        ring = np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(7))) > 0
        ring &= ~m
        if dark[ring].mean() >= 0.5:
            out |= m
    return Image.fromarray(out.astype(np.uint8) * 255)


def write(name, jour, canvas, src_raw, how, prompt_note=""):
    nuit = FJ.nuit(jour, lights(jour, name))
    side = {"slug": f"pieces/{name}", "source": "openai", "size": list(jour.size), "anchor": anchor_of(jour), "canvas": canvas, "mask": iso_loop.tap_mask(jour)}
    jour.save(F / f"{name}.jour.webp", "WEBP", quality=90, method=6)
    nuit.save(F / f"{name}.nuit.webp", "WEBP", quality=90, method=6)
    (F / f"{name}.json").write_text(json.dumps(side) + "\n")
    rel = lambda p: str(p.relative_to(ROOT))  # noqa: E731
    flux.PROVENANCE = ROOT / "scripts" / "provenance.json"
    for suffix, g in (("jour", "the painted day sprite"), ("nuit", "its night: the grade of the existing nights (famille_jour.nuit), small windows warmed, no model")):
        flux.record_derived(F / f"{name}.{suffix}.webp", RAW / src_raw, f"{how}: {g}; trimmed, keyed on the magenta, scaled to the game's density{prompt_note}")
    return side


def cut(i, k):
    raw = RAW / f"{i}_{k}.png"
    im, bg = key(Image.open(raw))
    if i == "A4":
        im = trim(im)
        # same size on screen as etal_1: the height of its opaque pixels (alpha >= 200)
        ref = Image.open(ROOT / "assets/images/village/iso/accessoires/etal_1.webp").convert("RGBA")
        h = ref.getchannel("A").point(lambda v: 255 if v >= 200 else 0).getbbox()
        s = (h[3] - h[1]) / im.height
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        side = write("A4", im, CANVAS["A4"], raw.name, "the real etal_1 stall repainted desaturated, same shape and stripes")
        return {"A4": (im.size, side["anchor"], bg)}
    if i == "souches":
        return stumps(im, raw, bg)
    im = trim(im)
    wmax, hmax = (BOX[i][0] / SC, BOX[i][1] / SC)
    s = min(wmax / im.width, hmax / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    side = write(i, im, CANVAS.get(i, "building2x3"), raw.name, "quarter or countryside piece painted from its concept")
    return {i: (im.size, side["anchor"], bg)}


def stumps(im, raw, bg):
    a = np.asarray(im.getchannel("A")) > 24
    grown = np.asarray(Image.fromarray(a.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(9))) > 0
    lab = label(grown)
    n = int(lab.max())
    boxes = []
    for j in range(1, n + 1):
        ys, xs = np.nonzero((lab == j) & a)
        if len(ys) > 400:
            boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, j))
    stumps_ = sorted([b for b in boxes], key=lambda b: -(b[2] - b[0]))
    # chip heaps are the two flattest; stumps the taller ones
    heaps = sorted(boxes, key=lambda b: (b[3] - b[1]) / (b[2] - b[0]))[:2]
    stumps_ = [b for b in stumps_ if b not in heaps]
    wide = max(b[2] - b[0] for b in stumps_)
    s = STUMP_W / wide
    out = {}
    for tag, group in (("souche", stumps_), ("copeaux", sorted(heaps, key=lambda b: -(b[2] - b[0])))):
        for n_, b in enumerate(group, 1):
            piece = im.copy()
            m = Image.fromarray(((lab == b[4]) * 255).astype(np.uint8))
            piece.putalpha(ImageChops.multiply(piece.getchannel("A"), m))
            piece = trim(piece)
            k = s
            if tag == "souche":  # size contrast softened: width goes with the square root of the painted width (a resize of the cut, no repaint)
                w0 = b[2] - b[0]
                k = STUMP_W * (w0 / wide) ** 0.5 / w0
            piece = piece.resize((max(1, round(piece.width * k)), max(1, round(piece.height * k))), Image.LANCZOS)
            name = f"{tag}_{n_}"
            side = write(name, piece, "decor1x1", raw.name, "one stump or chip heap cut from the sheet of seven")
            out[name] = (piece.size, side["anchor"], bg)
    return out


def check():
    names = sorted(p.name.removesuffix(".jour.webp") for p in F.glob("*.jour.webp"))
    for tag, col in (("dark", (34, 36, 40)), ("light", (226, 222, 210))):
        tiles = []
        for n in names:
            im = Image.open(F / f"{n}.jour.webp").convert("RGBA")
            bgim = Image.new("RGBA", im.size, col + (255,))
            bgim.alpha_composite(im)
            tiles.append((n, bgim.convert("RGB")))
        W = 1500
        x = y = rowh = 0
        placed = []
        for n, t in tiles:
            if x + t.width > W:
                x, y, rowh = 0, y + rowh + 4, 0
            placed.append((x, y, t))
            x += t.width + 4
            rowh = max(rowh, t.height)
        sheet = Image.new("RGB", (W, y + rowh), col)
        for x, y, t in placed:
            sheet.paste(t, (x, y))
        sheet.save(F / f"work/check_{tag}.png")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["cut"]:
        res = {}
        for i, k in zip(a[1::2], a[2::2]):
            res.update(cut(i, int(k)))
        print(json.dumps({n: {"size": list(v[0]), "anchor": v[1], "bg": v[2]} for n, v in res.items()}))
    elif a[:1] == ["check"]:
        check()
    else:
        sys.exit(__doc__)
