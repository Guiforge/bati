#!/usr/bin/env python3
"""G14 and the quarter montages: concepts cut and laid on the real renders (scratch/fixe, one fixed camera), slots placed FROM GRID COORDINATES.
A concept page only, never in the game. Reuses montage.py (cut, smooth, road). No FLUX, 0 $.
    montage_plan.py debug   slots and footprints drawn on t12 (scratch/plan/debug.jpg): the grid check
    montage_plan.py F       img/bande-F2.jpg (G14)
    montage_plan.py A|B|C   img/quartiers-bande-<X>.jpg and the full frames, the core crop, the value thumbnails, the numbers
Frame: foyer=campfire zoom 0.45 (1.18 px a dp), the campfire [12, 11] at (540, 1255): screen = (540 + (gx - gy - 1) 28.35, 1255 + (gx + gy - 23) 14.17),
the same formula as plan_sur_F.py, checked on the buildings' footprints (debug). Tiers 3 to 12 share this frame to the pixel; tier 1 to +-2 px;
tier 2 is rendered 1.43 times closer and is rescaled onto the common frame (the border, which tier 2 does not cover, comes from tier 1)."""
import json
import pathlib
import random
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "growth"))
import montage as M
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageStat

D = M.D
FIXE = M.FIXE
QDIR = M.S / "quartiers"
WORK = M.S / "plan"
CROP = M.CROP  # (0, 480, 1080, 2183)
CX, CY, K = 540, 1255, 0.45 * 2.625
HX, HY = 24 * K, 12 * K  # half a cell on screen: 28.35 x 14.17
FIN = M.FIN
LAYOUT = json.loads((ROOT / "constants/isoLayout.json").read_text())
SPEC = json.loads((ROOT / "constants/isoSpec.json").read_text())
SLOTS = {s["id"]: s for s in json.loads((ROOT / "docs/designs/village/layout/slots.json").read_text())["slots"]}


def ecr(gx, gy):
    """Grid corner (gx, gy) to the frame's pixels."""
    return (CX + (gx - gy - 1) * HX, CY + (gx + gy - 23) * HY)


def centre(box):
    """Centre of a slot box [gx0, gy0, gx1, gy1] (cells, included), in grid corners."""
    return ((box[0] + box[2] + 1) / 2, (box[1] + box[3] + 1) / 2)


def diamond(gx0, gy0, gx1, gy1):
    return [ecr(gx0, gy0), ecr(gx1, gy0), ecr(gx1, gy1), ecr(gx0, gy1)]


# ---------------------------------------------------------------- frames
T2 = (1.43, -232.6, -484.9)  # t2 pixel = (ox + s x, oy + s y) of the common frame, measured on the crate, barrel, tent and lantern of t3


def frame(tier):
    im = Image.open(FIXE / f"t{tier}-jour.png").convert("RGB")
    if tier != 2:
        return im
    s, ox, oy = T2
    zoomed = im.transform(im.size, Image.AFFINE, (s, 0, ox, 0, s, oy), Image.BICUBIC)
    mask = Image.new("L", im.size, 0)
    x0, y0, x1, y1 = (-ox) / s, (-oy) / s, (im.width - ox) / s, (im.height - oy) / s
    ImageDraw.Draw(mask).rectangle((x0 + 30, y0 + 30, x1 - 30, y1 - 30), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(14))
    base = Image.open(FIXE / "t1-jour.png").convert("RGB")
    base.paste(zoomed, (0, 0), mask)
    return base


# ---------------------------------------------------------------- drawing
def stumps(canvas, polygon, seed, n=3):
    """A few stumps where the trees stood: on the polygon's edge, at the forest side only (above y 690)."""
    rng = random.Random(seed)
    d = ImageDraw.Draw(canvas)
    for a, b in zip(polygon, polygon[1:] + polygon[:1], strict=True):
        for _ in range(n):
            t = rng.random()
            x, y = a[0] + (b[0] - a[0]) * t + rng.uniform(-14, 14), a[1] + (b[1] - a[1]) * t + rng.uniform(-10, 10)
            if y < 690:
                d.ellipse((x - 6, y - 3.5, x + 6, y + 3.5), fill=(118, 94, 64), outline=(40, 34, 26))


MEADOW = (20, 700, 340, 830)  # the render's own open meadow, forest free at every tier: its texture fills a clearing


def clearing(canvas, polygon, seed):
    """A forest edge pulled back: the same frame's own meadow cloned over the trees (mirrored tiles, no flat colour), stumps along the edge."""
    src = canvas.crop(MEADOW)
    w, h = src.size
    tile = Image.new("RGB", (w * 2, h * 2))
    tile.paste(src, (0, 0))
    tile.paste(ImageOps.mirror(src), (w, 0))
    tile.paste(ImageOps.flip(src), (0, h))
    tile.paste(ImageOps.flip(ImageOps.mirror(src)), (w, h))
    fill = Image.new("RGB", canvas.size)
    for ty in range(0, canvas.height, h * 2):
        for tx in range(0, canvas.width, w * 2):
            fill.paste(tile, (tx, ty))
    # shift the tiling so the seam sits away from the polygon; match the tone at the polygon's lower edge
    ys = [p[1] for p in polygon]
    low = canvas.crop((20, int(max(ys)) - 4, 300, int(max(ys)) + 30)) if max(ys) < 1000 else src
    gain = [a / max(1, b) for a, b in zip(ImageStat.Stat(low).mean, ImageStat.Stat(fill.crop((0, int(min(ys)), 300, int(max(ys))))).mean, strict=True)]
    fill = Image.merge("RGB", [c.point(lambda v, g=g: min(255, int(v * g))) for c, g in zip(fill.split(), gain, strict=True)])
    mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    canvas.paste(fill, (0, 0), mask.filter(ImageFilter.GaussianBlur(10)))
    stumps(canvas, polygon, seed)


# ---------------------------------------------------------------- the player's buildings: nothing of ours may cover them
Z = 36  # px per unit of height, read on the wizard tower (3.49 units, 125 px) and the hall
HEIGHTS = json.loads((ROOT / "scripts/iso/exports/heights.json").read_text())["batiments"]


def hull(pts):
    pts = sorted(set((round(x, 1), round(y, 1)) for x, y in pts))

    def half(seq):
        h = []
        for p in seq:
            while len(h) >= 2 and (h[-1][0] - h[-2][0]) * (p[1] - h[-2][1]) - (h[-1][1] - h[-2][1]) * (p[0] - h[-2][0]) <= 0:
                h.pop()
            h.append(p)
        return h

    lo, up = half(pts), half(reversed(pts))
    return lo[:-1] + up[:-1]


def protect_mask():
    """Hull of each building's footprint and of the same footprint lifted by its tallest stage, plus the wall, the menhirs and the grove."""
    m = Image.new("L", (1079, 2399), 0)
    d = ImageDraw.Draw(m)
    for code, (gx, gy) in LAYOUT["batiments"].items():
        w, h = SPEC["batiments"][code]["emprise"]
        z = max(s["hauteurMax"] for s in HEIGHTS[code]["stades"].values()) * Z
        base = diamond(gx, gy, gx + w, gy + h)
        mx, my = sum(x for x, _ in base) / 4, sum(y for _, y in base) / 4
        shrink = lambda pts, f: [(mx + (x - mx) * f, my + (y - my) * f) for x, y in pts]  # a sprite is narrower than its footprint, higher up
        d.polygon(hull(shrink(base, 0.85) + [(x, y - z) for x, y in shrink(base, 0.55)]), fill=255)
    for gx, gy in LAYOUT["rempart"]:
        base = diamond(gx, gy, gx + 1, gy + 1)
        d.polygon(hull(base + [(x, y - 38) for x, y in base]), fill=255)
    for box in ((612, 755, 650, 825), (638, 795, 672, 855)):  # the two menhirs of the grove, drawn in the render
        d.rectangle(box, fill=255)
    return m.filter(ImageFilter.MaxFilter(5))


# ---------------------------------------------------------------- the grid check
def debug():
    WORK.mkdir(parents=True, exist_ok=True)
    im = frame(12)
    d = ImageDraw.Draw(im, "RGBA")
    font = ImageFont.load_default(22)
    for code, (gx, gy) in LAYOUT["batiments"].items():
        w, h = SPEC["batiments"][code]["emprise"]
        d.polygon(diamond(gx, gy, gx + w, gy + h), outline=(255, 160, 0, 255))
        d.text(ecr(gx + w / 2, gy + h / 2), code[:5], fill=(255, 255, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0, 255))
    for i, s in SLOTS.items():
        if s["kind"] == "quartier" or s["kind"] == "dehors" or i.startswith("H"):
            b = s["box"]
            d.polygon(diamond(b[0], b[1], b[2] + 1, b[3] + 1), outline=(255, 0, 255, 255), fill=(255, 0, 255, 40))
            d.text(ecr(*centre(b)), i, fill=(255, 200, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0, 255))
    for name, (a, b) in N_CELLS.items():
        for cx, cy in b:
            d.polygon(diamond(cx, cy, cx + 1, cy + 1), outline=(0, 255, 255, 255), fill=(0, 255, 255, 50))
        d.text(ecr(b[0][0] + 0.5, b[0][1] + 0.5), name, fill=(200, 255, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0, 255))
    pm = protect_mask()
    im.paste(Image.new("RGB", im.size, (255, 0, 0)), (0, 0), pm.point(lambda v: 70 if v else 0))
    for x, y in [ecr(*c) for c in LAYOUT["rue"]["cases"]]:
        d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(255, 0, 0, 255))
    im.crop(CROP).save(WORK / "debug.png")


# N cells from quartiers.md: name -> (label, cells)
N_CELLS = {
    "N1": ("marche", [(7, 12), (8, 12), (9, 12)]),
    "N2": ("pignons", [(10, 6), (12, 6), (13, 6), (14, 6)]),
    "N3": ("2e rang", [(7, 4), (7, 5), (9, 4), (7, 6), (8, 6), (9, 6)]),
    "N4": ("taverne", [(3, 12), (4, 12), (5, 12), (3, 13), (4, 13), (5, 13)]),
    "N5": ("pont", [(3, 9), (4, 9), (4, 8)]),
    "N6": ("est", [(15 + i, 4 + j) for i in range(5) for j in range(2)]),
}


# ---------------------------------------------------------------- placing
_CUT = {}
SIZES = {  # (max width, max height) in px, from the footprint in cells; heights capped at 2/3 of the hall (73 px: a storey is 37 px, read on the hall and the forge)
    "A1": (66, 48), "A2": (92, 50), "A3": (140, 64), "A4": (64, 52), "A5": (92, 52), "A6": (80, 56), "A7": (130, 50), "A8": (118, 56),
    "B1": (90, 52), "B2": (135, 56), "B3": (110, 52), "B4": (140, 60), "B5": (92, 50), "B6": (125, 52), "B7": (100, 50),
    "C1": (300, 190), "C2": (300, 190), "C3": (300, 190), "C4": (260, 170), "C5": (230, 150),
}


def defringe(im):
    """The pink glow of a flat-magenta ground that the flood fill leaves at a nappe's edge: made transparent."""
    r, g, b, a = (np.asarray(im.getchannel(c), dtype=np.int16) for c in "RGBA")
    pink = (b - g > 22) & (r - g > 38)
    a = np.where(pink, 0, a).astype(np.uint8)
    al = Image.fromarray(a).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(2))
    out = im.copy()
    out.putalpha(al)
    return out


def piece_img(name, size, mirror):
    key = (name, size, mirror)
    if key not in _CUT:
        base = defringe(M.cut(str(QDIR / name), 400))
        wmax, hmax = size
        f = min(wmax / base.width, hmax / base.height)
        im = base.resize((max(1, round(base.width * f)), max(1, round(base.height * f))), Image.LANCZOS)
        _CUT[key] = ImageOps.mirror(im) if mirror else im
    return _CUT[key]


def concept_img(name, width):
    key = ("F", name, width)
    if key not in _CUT:
        _CUT[key] = M.cut(name, width)
    return _CUT[key]


def paste_at(canvas, im, x, y):
    canvas.paste(im, (round(x - im.width / 2), round(y - 0.62 * im.height)), im)


def overlap(im, x, y, prot):
    """Pixels of the piece (alpha over 100) that fall on a player's building."""
    left, top = round(x - im.width / 2), round(y - 0.62 * im.height)
    a = np.asarray(im.getchannel("A")) > 100
    x0, y0 = max(left, 0), max(top, 0)
    x1, y1 = min(left + im.width, prot.width), min(top + im.height, prot.height)
    if x1 <= x0 or y1 <= y0:
        return 0
    p = np.asarray(prot.crop((x0, y0, x1, y1))) > 0
    return int((a[y0 - top : y1 - top, x0 - left : x1 - left] & p).sum())


NUDGES = [(0, 0), (0.35, 0), (-0.35, 0), (0, 0.35), (0, -0.35), (0.4, 0.4), (-0.4, -0.4), (0.4, -0.4), (-0.4, 0.4)]
NUDGES_C = [(0, 0), (0, -1), (0, -2), (0.5, -2.5), (1, -3), (-1, -1), (-1, -2), (1, -1), (0.5, 0.5), (-0.5, 0.5), (-1, 1)]  # a nappe is big: it may move a cell or three
LIMIT = 45  # pixels of a player's building a piece may cover: edge noise of the hull, not a building


def on_path_or_water(base, im, x, y):
    """Share of the piece's foot (an ellipse under its plate) that stands on the render's path brown or on the river: a house is not built on a path."""
    rx = max(10, im.width * 0.3)
    ry = rx / 2
    box = (round(x - rx), round(y - ry), round(x + rx), round(y + ry))
    a = np.asarray(base.crop(box)).astype(np.int16)
    if a.size == 0:
        return 0.0
    yy, xx = np.mgrid[0 : a.shape[0], 0 : a.shape[1]]
    inside = ((xx - a.shape[1] / 2) / (rx or 1)) ** 2 + ((yy - a.shape[0] / 2) / (ry or 1)) ** 2 <= 1
    path = np.abs(a - np.array(BRANCH)).max(axis=2) < 10
    water = (a[..., 2] > a[..., 0] + 8) & (a[..., 2] >= a[..., 1] - 4)
    return float(((path | water) & inside).sum() / max(1, inside.sum()))


def resolve(rows, prot, label, base):
    """One position per piece, valid at every tier (a piece never moves): the first nudge that covers no building, else dropped. -> kept, dropped."""
    kept, dropped = [], []
    for r in rows:
        first, last, name, size, (gx, gy), mirror, why = r
        im = piece_img(name, size, mirror)
        for dx, dy in (NUDGES if name[0] != "C" else NUDGES_C):
            x, y = ecr(gx + dx, gy + dy)
            flat = name[0] == "C"  # a nappe replaces the ground, paths included: only the buildings count, with a looser limit for its soft rim
            if overlap(im, x, y, prot) <= (250 if flat else LIMIT) and (flat or on_path_or_water(base, im, x, y) < 0.2):
                kept.append((first, last, name, size, (gx + dx, gy + dy), mirror, why, (x, y)))
                break
        else:
            dropped.append(f"{label} {why} {name} at ({gx:.1f}, {gy:.1f}) from tier {first}: covers a building, or stands on a path or the river")
    return kept, dropped


HOUSE = ["A1a_v1", "A1b_v2", "A1c_v1", "A1a_v2", "A1b_v1", "A1c_v2"]


class Houses:
    """Cottages cycling over A1a, A1b, A1c (both takes) with a mirror every other lap, a small offset each: never the same image twice in a row."""

    def __init__(self, seed=3):
        self.i = 0
        self.rng = random.Random(seed)

    def __call__(self, first, pos, why, last=FIN):
        i = self.i
        self.i += 1
        gx, gy = pos
        return (first, last, HOUSE[i % 6], SIZES["A1"], (gx + self.rng.uniform(-0.12, 0.12), gy + self.rng.uniform(-0.12, 0.12)), (i // 3) % 2 == 1, why)


def P(first, name, pos, why, last=FIN, mirror=False):
    return (first, last, name, SIZES[name[:2]], pos, mirror, why)


def pieces_A():
    h = Houses()
    return [
        # N1, the market: etal_1 is in the render at [9, 12]; stalls beside it, the hall of tier 11 in place of the stalls
        P(8, "A4_v1", (8.5, 12.5), "N1", last=10), P(9, "A4_v2", (7.5, 12.5), "N1", last=10, mirror=True), P(11, "A7_v1", (8.5, 12.5), "N1"),
        # N2, gables behind the hall and forge
        h(6, (10.5, 6.5), "N2"), h(6, (13.5, 6.5), "N2"), P(8, "A5_v2", (12.5, 6.5), "N2"), h(10, (14.5, 6.5), "N2"),
        # N3, roofs of the second rank
        h(7, (7.5, 5.5), "N3"), h(8, (9.5, 4.5), "N3"), h(10, (7.5, 4.5), "N3"), h(10, (7.5, 6.5), "N3"), h(10, (9.5, 6.5), "N3"),
        # N4, strip gardens, houses, the tavern of 12 in their place
        P(6, "A3_v2", (4.5, 13.0), "N4", last=11), h(7, (3.5, 12.5), "N4", last=11), h(10, (5.5, 12.5), "N4", last=11), P(12, "A8_v2", (4.5, 13.0), "N4"),
        # N5, the bridge head
        P(6, "A3_v1", (3.5, 9.5), "N5"), h(7, (4.5, 8.5), "N5"), h(12, (4.5, 9.5), "N5"),
        # N6, behind the armoury and the watch
        h(8, (16.5, 4.5), "N6"), h(8, (18.5, 5.5), "N6"), h(9, (15.5, 5.5), "N6"), h(9, (17.5, 4.5), "N6"), h(12, (19.5, 4.5), "N6"),
        # Q1, a lane from gy 2: 3 / 5 / 8 / 9 / 14 + a workshop / the square of 12
        h(6, (4.4, -2.0), "Q1"), h(6, (7.0, -2.9), "Q1"), h(6, (4.4, -3.5), "Q1"),
        h(7, (7.0, -4.3), "Q1"), h(7, (4.4, -5.0), "Q1"),
        h(8, (8.6, -3.6), "Q1"), h(8, (4.2, -6.0), "Q1"), h(8, (7.0, -5.6), "Q1"),
        h(9, (8.6, -5.2), "Q1"),
        h(10, (3.2, -3.0), "Q1"), h(10, (3.2, -4.6), "Q1"), h(11, (8.8, -1.8), "Q1"), h(11, (6.0, -6.4), "Q1"), h(11, (5.6, -4.1), "Q1"), P(11, "A5_v1", (7.6, -6.4), "Q1"),
        P(12, "A6_v1", (6.0, -2.2), "Q1"), P(12, "A6_v2", (7.6, -4.6), "Q1", mirror=True), P(12, "A2_v2", (5.0, -5.6), "Q1"), P(12, "A5_v2", (6.4, -3.2), "Q1"), P(12, "A5_v1", (4.7, -4.3), "Q1", mirror=True),
        # Q3, four houses facing the street gx -4, a second rank at 11
        h(8, (-5.2, -1.6), "Q3"), h(8, (-5.2, -0.1), "Q3"), h(8, (-5.2, 1.3), "Q3"), h(8, (-5.2, -3.0), "Q3"), h(9, (-6.8, 0.5), "Q3"),
        h(11, (-6.8, -1.0), "Q3"), h(11, (-6.8, -2.4), "Q3"), h(11, (-7.2, 1.8), "Q3"), h(12, (-7.4, 0.0), "Q3"), h(12, (-7.2, -3.4), "Q3"),
        # Q4, cabins at the forest edge, logs (B5_v2 carries them), the sawpit at 11
        P(9, "B5_v2", (-6.0, -6.6), "Q4"), P(9, "B5_v2", (-7.2, -5.6), "Q4", mirror=True), P(9, "A2_v1", (-4.8, -7.2), "Q4"),
        h(12, (-7.5, -7.4), "Q4"), P(11, "B6_v2", (-5.6, -5.4), "Q4"), h(11, (-5.4, -7.8), "Q4"), h(12, (-7.9, -6.4), "Q4"),
        # Q5, two houses with gardens at 7, four at 10
        P(7, "A3_v2", (-6.0, 8.6), "Q5"), h(7, (-5.6, 7.6), "Q5"), h(7, (-7.2, 8.0), "Q5"), h(11, (-6.4, 7.2), "Q5"), h(12, (-7.6, 9.0), "Q5"),
        # Q6, gardens on gy 17 and a shed, a second shed at 12
        P(7, "A3_v1", (16.0, 17.6), "Q6"), P(7, "A1c_v2", (16.8, 18.6), "Q6"), P(12, "A1b_v1", (15.8, 18.8), "Q6"),
        # Q2, gardens and three houses at 10, five at 11, eight at 12 (half the quarter is out of frame)
        P(10, "A3_v2", (-4.4, 12.2), "Q2"), h(10, (-5.0, 13.8), "Q2"), h(10, (-6.4, 12.8), "Q2"), h(10, (-5.6, 15.0), "Q2"),
        h(11, (-3.8, 14.4), "Q2"), h(11, (-7.0, 14.6), "Q2"), h(11, (-4.4, 11.8), "Q2"),
        h(12, (-4.6, 15.8), "Q2"), h(12, (-6.2, 11.4), "Q2"), h(12, (-7.2, 13.2), "Q2"),
    ]


def lanes_A():
    """(first, points in grid corners, width). Curved, joined to an existing path at the first point, the render's own brown and width."""
    return [
        (6, [(5.5, 2.4), (5.9, 0.4), (5.2, -1.8), (5.9, -3.7), (5.3, -5.8)], 22),
        (8, [(5.7, -2.5), (7.0, -3.0), (8.6, -2.6)], 14),
        (8, [(5.5, -4.8), (4.2, -5.2), (3.3, -4.8)], 14),
        (7, [(-3.6, 8.0), (-5.0, 7.6), (-6.6, 8.3)], 16),
        (8, [(-3.7, 4.9), (-4.3, 2.0), (-4.0, -0.5), (-4.4, -2.8)], 20),
        (9, [(-1.2, -7.4), (-3.4, -7.6), (-5.4, -7.0), (-6.8, -6.2)], 18),
        (10, [(-3.6, 13.0), (-5.0, 13.4), (-6.6, 13.2)], 16),
    ]


BRANCH = (123, 102, 71)


def snap(base, pt, r=34):
    """The nearest pixel of the render's own path brown within r px of pt: a lane starts on an existing path."""
    a = np.asarray(base)
    x, y = round(pt[0]), round(pt[1])
    x0, y0 = max(0, x - r), max(0, y - r)
    win = a[y0 : y + r, x0 : x + r].astype(np.int16)
    ok = np.abs(win - np.array(BRANCH)).max(axis=2) < 9
    ys, xs = np.nonzero(ok)
    if not len(xs):
        return pt
    k = np.argmin((xs + x0 - pt[0]) ** 2 + (ys + y0 - pt[1]) ** 2)
    return (float(xs[k] + x0), float(ys[k] + y0))


def draw_lane(canvas, prot, pts, width, colour=BRANCH, outline=(72, 73, 62)):
    """Brown band, thin dark rim, never over a building (cut by the protect mask)."""
    inv = ImageOps.invert(prot.filter(ImageFilter.GaussianBlur(2)))
    sm = M.smooth(pts)
    for w, col, a in ((width + 4, outline, 0.8), (width, colour, 1.0)):
        layer = Image.new("L", canvas.size, 0)
        ImageDraw.Draw(layer).line(sm, fill=int(255 * a), width=w, joint="curve")
        layer = ImageChops.multiply(layer.filter(ImageFilter.GaussianBlur(1.3)), inv)
        canvas.paste(Image.new("RGB", canvas.size, col), (0, 0), layer)


def pieces_B():
    """Directions B: the trades. N1 and N2 are A's (audit); N3, N5, N6 stay bare."""
    h = Houses(seed=11)
    keep = [r for r in pieces_A() if r[6] in ("N1", "N2")]
    return keep + [
        P(6, "B1_v1", (4.4, -2.0), "Q1"), P(6, "B1_v2", (7.0, -3.0), "Q1", last=10), P(7, "B1_v2", (4.4, -4.0), "Q1", last=10, mirror=True), P(9, "B1_v1", (7.0, -5.0), "Q1", mirror=True),
        P(10, "B1_v2", (4.2, -5.8), "Q1"), P(10, "B1_v1", (8.7, -3.7), "Q1"), P(11, "B2_v1", (5.7, -3.5), "Q1"),
        h(12, (4.4, -3.0), "Q1"), h(12, (8.4, -5.5), "Q1"), h(12, (6.0, -6.2), "Q1"), h(12, (5.8, -1.6), "Q1"),
        P(7, "B3_v1", (-6.2, 8.4), "Q5"), h(7, (-5.4, 7.6), "Q5"), P(10, "B3_v2", (-7.4, 8.4), "Q5", mirror=True), h(12, (-6.4, 7.0), "Q5"), h(12, (-7.6, 9.4), "Q5"),
        P(7, "A3_v1", (16.0, 17.6), "Q6"), P(7, "A1c_v2", (16.8, 18.6), "Q6"), P(12, "A1b_v1", (15.8, 18.8), "Q6"),
        P(8, "B4_v2", (-6.2, -0.4), "Q3"), h(8, (-5.2, -2.2), "Q3"), h(8, (-5.2, 1.2), "Q3"), h(8, (-7.4, 1.2), "Q3"), h(9, (-5.2, -0.5), "Q3"),
        h(11, (-7.4, -2.2), "Q3"), h(11, (-7.6, -1.0), "Q3"), h(12, (-6.4, 1.8), "Q3"), h(12, (-5.4, -3.2), "Q3"),
        P(9, "B5_v1", (-6.0, -6.6), "Q4", last=10), P(9, "B5_v2", (-7.2, -5.6), "Q4", mirror=True), P(9, "B5_v1", (-4.8, -7.2), "Q4", mirror=True),
        P(11, "B6_v2", (-6.0, -6.6), "Q4"), h(12, (-7.9, -7.0), "Q4"), h(12, (-5.4, -5.4), "Q4"),
        P(10, "B7_v1", (-4.8, 13.4), "Q2"), P(10, "B7_v2", (-6.2, 12.4), "Q2"), P(10, "B7_v1", (-5.6, 14.8), "Q2", mirror=True),
        P(11, "B7_v2", (-3.9, 14.6), "Q2", mirror=True), P(11, "B7_v1", (-7.0, 14.4), "Q2"), h(12, (-4.6, 15.8), "Q2"), h(12, (-6.4, 11.4), "Q2"),
        P(6, "A3_v2", (4.5, 13.0), "N4", last=11), P(12, "A8_v2", (4.5, 13.0), "N4"),
    ]


def pieces_C():
    """Direction C: nappes. No concept for Q5 and Q2 (C has C1 to C5 for Q1, Q3, Q4): C1 small stands for them, and for Q1's nappe b (8, 9)."""
    keep = [r for r in pieces_A() if r[6] == "N1" and r[2] in ("A4_v1", "A7_v1")]
    return keep + [
        P(6, "C1_v2", (6.0, -3.0), "Q1", last=7), P(8, "C1_v1", (6.0, -3.0), "Q1", last=9), P(10, "C2_v2", (6.0, -3.0), "Q1", last=11), P(12, "C3_v2", (6.0, -3.0), "Q1"),
        (7, FIN, "C1_v1", (150, 110), (-6.0, 8.2), False, "Q5"),
        P(8, "C4_v2", (-6.5, -0.5), "Q3", last=10), P(11, "C4_v1", (-6.5, -0.5), "Q3"),
        P(9, "C5_v2", (-6.0, -6.3), "Q4", last=11), P(12, "C5_v1", (-6.0, -6.3), "Q4"),
        (10, 11, "C1_v2", (170, 120), (-5.2, 13.6), False, "Q2"), (12, FIN, "C2_v1", (210, 140), (-5.2, 13.6), False, "Q2"),
        P(6, "A3_v2", (4.5, 13.0), "N4"), P(7, "A3_v1", (16.0, 17.6), "Q6"),
    ]


# ---------------------------------------------------------------- F (G14)
# (first, last, concept, width, grid centre). The slots' boxes are in the plan; H2 and H3 are half out of the frame, the positions are kept.
H1C, H2A, H2B, H3C = (-12.5, 1.0), (-11.0, 5.5), (-11.0, 8.5), (-18.5, 0.0)
F_PIECES = [(7, 8, "hameau1_F_v2", 150, H1C), (9, FIN, "hameau2_F_v1", 190, H1C),
            (10, FIN, "ferme3_F_v1", 150, H2A), (11, FIN, "ferme3_F_v2", 150, H2B),
            (12, FIN, "bourg_F_v1", 260, H3C)]
DIRT, GRAVEL = ((123, 102, 71), 18), ((152, 130, 90), 20)
# (first, last, kind, grid points): from the north street's end (-1, -8) and from the west street (gx -4) to H1, around the observatory, the windmill and the grove
F_WEST = [(-3.6, 5.6), (-6.2, 6.2), (-9.0, 4.6), (-11.6, 2.2)]
F_ROADS = [(7, 8, DIRT, F_WEST), (9, FIN, GRAVEL, F_WEST)]
# Forest pulled back, only by tier: (first tier, box [gx0, gy0, gx1, gy1] in corners, margin in cells). Clipped to the forest edge (y 725).
F_CLEAR = [(7, (-16, -2, -9, 4), 1.0), (9, (-16, -2, -9, 4), 2.2), (10, (-16, 4, -9, 10), 1.0), (11, (-16, 4, -9, 10), 1.8), (12, (-21, -4, -16, 4), 1.8)]


def clear_poly(box, m):
    x0, y0, x1, y1 = box
    return [(x, min(y, 725)) for x, y in diamond(x0 - m, y0 - m, x1 + m, y1 + m)]


def compose_F(tier, prot):
    canvas = frame(tier)
    latest = {}
    for first, box, m in F_CLEAR:
        if first <= tier:
            latest[box] = (first, m)
    for box, (first, m) in latest.items():
        clearing(canvas, clear_poly(box, m), first)
    for first, last, kind, pts in F_ROADS:
        if first <= tier <= last:
            px = [ecr(*p) for p in pts]
            px[0] = snap(canvas, px[0])
            draw_lane(canvas, prot, px, kind[1], colour=kind[0])
    rows = sorted((p for p in F_PIECES if p[0] <= tier <= p[1]), key=lambda p: ecr(*p[4])[1])
    for _first, _last, name, width, pos in rows:
        x, y = ecr(*pos)
        paste_at(canvas, concept_img(name, width), x, y)
    return canvas.crop(CROP)


# ---------------------------------------------------------------- the quarters
ETAL = (385, 1172, 480, 1252)  # etal_1 at [9, 12] in the frame: hidden from tier 11 by pavement cloned from the plaza, the hall stands in its place


def hide_etal(canvas):
    src = canvas.crop((470, 1262, 565, 1342))
    m = Image.new("L", src.size, 0)
    ImageDraw.Draw(m).ellipse((6, 6, src.width - 6, src.height - 6), fill=255)
    canvas.paste(src, (ETAL[0], ETAL[1]), m.filter(ImageFilter.GaussianBlur(6)))


def compose(direction, tier, rows, lanes, prot):
    canvas = frame(tier)
    if tier >= 11 and direction in ("A", "B", "C") and any(r[2] == "A7_v1" for r in rows):
        hide_etal(canvas)
    for first, pts, width in lanes:
        if first <= tier:
            px = [ecr(*p) for p in pts]
            px[0] = snap(canvas, px[0])
            draw_lane(canvas, prot, px, width)
    for _first, _last, name, size, _pos, mirror, _why, (x, y) in sorted((r for r in rows if r[0] <= tier <= r[1]), key=lambda r: r[7][1]):
        paste_at(canvas, piece_img(name, size, mirror), x, y)
    return canvas.crop(CROP)


def lum(im, mask=None):
    a = np.asarray(im.convert("L"), dtype=np.float64)
    return float(a.mean() if mask is None else a[np.asarray(mask) > 0].mean())


def sheet(images, cols, dst, labels=None):
    w = 1080 // cols
    h = round(w * images[0].height / images[0].width)
    rows = (len(images) + cols - 1) // cols
    out = Image.new("RGB", (w * cols, h * rows), (24, 28, 26))
    font = ImageFont.load_default(18)
    for i, im in enumerate(images):
        out.paste(im.resize((w, h), Image.LANCZOS), (i % cols * w, i // cols * h))
        if labels:
            ImageDraw.Draw(out).text((i % cols * w + 6, i // cols * h + 4), labels[i], fill=(255, 240, 200), font=font, stroke_width=2, stroke_fill=(15, 21, 24))
    out.save(dst, quality=88)


def run_quarters(X, prot, tiers, rows_fn, lanes):
    rows, dropped = resolve(rows_fn(), prot, X, frame(12))
    imgs = {t: compose(X, t, rows, lanes, prot) for t in tiers}
    for t, im in imgs.items():
        im.save(WORK / f"{X}_{t:02d}.png")
    (WORK / f"dropped_{X}.txt").write_text("\n".join(dropped) + "\n")
    print(f"{X}: {len(rows)} pieces kept, {len(dropped)} dropped")
    for d in dropped:
        print("  dropped:", d)
    return imgs, rows


def numbers(X, imgs, base_imgs):
    """Luminance: whole frame and core, between neighbouring tiers; the square against each quarter at the last tier."""
    core = (210, 520, 860, 870)  # square and street, in the crop's pixels
    ts = sorted(imgs)
    out = [f"## {X}: neighbouring tiers (mean luminance 0-255; signed difference of the means, then mean absolute pixel difference)"]
    for a, b in zip(ts, ts[1:], strict=False):
        ia, ib = imgs[a].convert("L"), imgs[b].convert("L")
        dm = lum(ib) - lum(ia)
        dp = float(np.abs(np.asarray(ib, dtype=np.float64) - np.asarray(ia, dtype=np.float64)).mean())
        ca, cb = ia.crop(core), ib.crop(core)
        cm = lum(cb) - lum(ca)
        cp = float(np.abs(np.asarray(cb, dtype=np.float64) - np.asarray(ca, dtype=np.float64)).mean())
        base = float(np.abs(np.asarray(base_imgs[b].convert("L"), dtype=np.float64) - np.asarray(base_imgs[a].convert("L"), dtype=np.float64)).mean())
        # the 1/8 blurred thumbnail the vignette shows
        ta, tb = (np.asarray(thumb(i), dtype=np.float64) for i in (imgs[a], imgs[b]))
        out.append(f"{a}->{b}: whole d_mean {dm:+.2f} d_pixel {dp:.2f} | core d_mean {cm:+.2f} d_pixel {cp:.2f} | 1/8 thumb d_pixel {np.abs(tb - ta).mean():.2f} | the renders alone d_pixel {base:.2f}")
    t = ts[-1]
    square = Image.new("L", (1079, 2399), 0)
    ImageDraw.Draw(square).polygon(diamond(9, 10, 15, 15), fill=255)
    square = square.crop(CROP)
    out.append(f"## {X}: tier {t}, the square against each quarter (mean luminance of the slot's diamond, clipped to the frame)")
    out.append(f"square (cells 9,10 to 14,14): {lum(imgs[t], square):.1f}")
    for q in ("Q1", "Q2", "Q3", "Q4", "Q5", "Q6"):
        b = SLOTS[q]["box"]
        m = Image.new("L", (1079, 2399), 0)
        ImageDraw.Draw(m).polygon(diamond(b[0], b[1], b[2] + 1, b[3] + 1), fill=255)
        m = m.crop(CROP)
        n = int((np.asarray(m) > 0).sum())
        out.append(f"{q}: {lum(imgs[t], m):.1f}  ({n} px in frame)")
    return out


def thumb(im):
    g = im.convert("L")
    return g.resize((g.width // 8, g.height // 8), Image.BOX).filter(ImageFilter.GaussianBlur(1))


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    (D / "img").mkdir(exist_ok=True)
    what = sys.argv[1:] or ["F", "A", "B", "C"]
    if what == ["debug"]:
        return debug()
    prot = protect_mask()
    notes = []
    if "F" in what:
        imgs = [compose_F(t, prot) for t in range(1, 13)]
        sheet(imgs, 4, D / "img" / "bande-F2.jpg", [f"tier {t}" for t in range(1, 13)])
        for t in (1, 7, 9, 10, 11, 12):
            imgs[t - 1].save(WORK / f"F2_{t:02d}.png")
    base = {t: frame(t).crop(CROP) for t in range(1, 13)}
    if "A" in what:
        imgs, rows = run_quarters("A", prot, range(6, 13), pieces_A, lanes_A())
        sheet([imgs[t] for t in range(6, 13)], 4, D / "img" / "quartiers-bande-A.jpg", [f"A tier {t}" for t in range(6, 13)])
        for t in (8, 10, 11, 12):
            imgs[t].resize((1080, round(1080 * imgs[t].height / imgs[t].width)), Image.LANCZOS).save(D / "img" / f"quartiers-A-t{t}.jpg", quality=88)
        core = imgs[12].crop((230, 520, 850, 960))
        core.resize((1080, round(1080 * core.height / core.width)), Image.LANCZOS).save(D / "img" / "coeur-A-t12.jpg", quality=90)
        th = [thumb(imgs[t]).resize((270, 426), Image.BILINEAR).convert("RGB") for t in (9, 10, 11, 12)]
        v = Image.new("RGB", (1080, 426))
        for i, im in enumerate(th):
            v.paste(im, (i * 270, 0))
        v.save(D / "img" / "vignette-A.jpg", quality=90)
        notes += numbers("A", imgs, base)
    for X, fn in (("B", pieces_B), ("C", pieces_C)):
        if X in what:
            imgs, rows = run_quarters(X, prot, (8, 10, 12), fn, lanes_A() if X == "B" else [])
            sheet([imgs[t] for t in (8, 10, 12)], 3, D / "img" / f"quartiers-bande-{X}.jpg", [f"{X} tier {t}" for t in (8, 10, 12)])
            notes += numbers(X, imgs, base)
    (WORK / "numbers.txt").write_text("\n".join(notes) + "\n")
    print("\n".join(notes))


if __name__ == "__main__":
    main()

