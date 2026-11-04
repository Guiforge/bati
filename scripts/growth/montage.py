#!/usr/bin/env python3
"""Tiers 1 to 12 of each proposal: the Klein rung concepts cut and laid by hand on the real atelier renders (one fixed camera).
A concept page only, never in the game. A pure montage cannot drift between tiers and nothing goes backwards, which chaining FLUX
edits from tier to tier did not hold (progress.md). Places are indicative: LAYOUT's enlarged map does not exist yet.
    montage.py        writes scratch/montage/<P>_<tier>.png, and img/bande-<P>.jpg
    montage.py nuit   then Klein night edits of tiers 3 6 9 12 from those montages (scratch/montage/nuit_<P>_<tier>.png, img/nuit-<P>.jpg)"""
import math
import pathlib
import random
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "growth"))
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps, ImageStat

D = ROOT / "docs/designs/village/growth"
S = D / "scratch"
FIXE, C, OUT = S / "fixe", S / "concepts", S / "montage"
CROP = (0, 480, 1080, 2183)
FIN = 99
DIRT, GRAVEL, COBBLE = ((122, 96, 62), 9), ((132, 122, 102), 11), ((112, 100, 88), 15)

# (first tier, last tier, concept, centre x, centre y, width), in the 1080 px frame. A rung is replaced in place by the next one.
LEAN = (1, FIN, "ferme1_x_v2", 400, 1785, 96)
P = {
    "R": {
        "pieces": [LEAN,
                   (5, 8, "hameau1_R_v2", 900, 1045, 92), (9, FIN, "hameau2_R_v2", 900, 1035, 160),
                   (7, FIN, "ferme3_R_v1", 965, 885, 140),
                   (10, FIN, "ferme4_R_v1", 215, 830, 175), (11, FIN, "ferme3_R_v2", 480, 720, 120),
                   (12, FIN, "bourg_R_v1", 740, 665, 235)],
        "roads": [(5, 7, DIRT, [(905, 1265), (975, 1130), (920, 1040), (850, 930), (800, 850)]),
                  (8, FIN, GRAVEL, [(905, 1265), (975, 1130), (920, 1040), (850, 930), (800, 850)]),
                  (7, FIN, DIRT, [(800, 850), (770, 780)]),
                  (10, FIN, DIRT, [(770, 780), (520, 770), (330, 800)]),
                  (12, FIN, COBBLE, [(770, 780), (760, 725)])],
    },
    "T": {
        "pieces": [LEAN,
                   (5, 8, "hameau1_T_v2", 300, 800, 96), (9, FIN, "hameau2_T_v2", 300, 790, 165),
                   (6, 6, "ferme3_T_v2", 985, 1050, 60), (7, FIN, "ferme3_T_v2", 985, 1040, 150),
                   (8, FIN, "hameau2_T_v1", 925, 910, 140),
                   (10, FIN, "ferme4_T_v2", 480, 715, 180),
                   (11, FIN, "ferme4_T_v1", 95, 1010, 150),
                   (12, FIN, "bourg_T_v1", 730, 665, 225)],
        "roads": [(5, 7, DIRT, [(880, 1270), (950, 1190)]),
                  (8, FIN, GRAVEL, [(880, 1270), (950, 1190)]),
                  (5, 7, DIRT, [(470, 1100), (400, 960), (330, 850)]),
                  (8, FIN, GRAVEL, [(470, 1100), (400, 960), (330, 850)]),
                  (12, FIN, COBBLE, [(400, 960), (620, 790), (720, 700)])],
    },
    "F": {
        # The lean-to stands by the camp: the south land is forest at tier 1.
        "pieces": [(1, FIN, "ferme1_x_v2", 770, 1395, 90),
                   (5, 8, "hameau1_F_v2", 120, 790, 100), (9, FIN, "hameau2_F_v1", 120, 780, 165),
                   (7, FIN, "ferme3_F_v1", 320, 700, 150),
                   (10, FIN, "ferme4_F_v1", 110, 625, 190),
                   (11, FIN, "ferme3_F_v2", 1000, 1000, 130),
                   (12, FIN, "bourg_F_v1", 540, 650, 235)],
        "roads": [(5, 8, DIRT, [(420, 1040), (300, 880), (170, 820)]),
                  (9, FIN, GRAVEL, [(420, 1040), (300, 880), (170, 820)]),
                  (7, FIN, DIRT, [(300, 880), (320, 750)]),
                  (12, FIN, COBBLE, [(320, 750), (470, 690)])],
        # The forest edge pulled back: polygons of cleared land, from their tier on. A rough mask, a concept only.
        "clear": [(3, [(0, 720), (0, 830), (150, 830), (205, 760), (120, 700), (60, 730)]),
                  (5, [(0, 680), (0, 830), (230, 830), (270, 760), (240, 690), (130, 660), (70, 700)]),
                  (7, [(0, 600), (0, 830), (260, 830), (420, 780), (440, 680), (380, 620), (250, 640), (150, 580), (60, 610)]),
                  (10, [(0, 540), (0, 830), (280, 830), (500, 770), (530, 690), (440, 610), (320, 620), (210, 550), (90, 530)]),
                  (12, [(0, 540), (0, 830), (280, 830), (500, 770), (690, 760), (710, 650), (620, 590), (480, 560), (330, 590), (210, 545), (90, 530)])],
    },
}


def cut(name, width):
    """A concept on its pale ground: flood from the corners, feather, scale, a step calmer than the player's buildings."""
    im = Image.open(C / f"{name}.png").convert("RGB")
    w, h = im.size
    mask = im.copy()
    for corner in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(mask, corner, (255, 0, 255), thresh=46)
    alpha = Image.eval(mask.convert("RGB").split()[1], lambda g: g)  # magenta has green 0
    # Eat the plate's inked rim, then a wide soft edge, so the plate reads as ground and not as a tile.
    alpha = alpha.point(lambda g: 0 if g == 0 else 255).filter(ImageFilter.MinFilter(15)).filter(ImageFilter.GaussianBlur(9))
    im.putalpha(alpha)
    im = im.crop(alpha.point(lambda a: 255 if a > 40 else 0).getbbox())
    rgb = ImageEnhance.Brightness(im.convert("RGB")).enhance(0.86)
    rgb = ImageEnhance.Color(rgb).enhance(0.82)
    rgb.putalpha(im.getchannel("A"))
    return rgb.resize((width, round(width * im.height / im.width)), Image.LANCZOS)


def smooth(points, n=12):
    """Catmull-Rom through the road's points: no road is ruled, as a real road bends."""
    pts = [points[0], *points, points[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        a, b, c, d = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for k in range(n):
            t = k / n
            out.append(tuple(0.5 * (2 * b[j] + (c[j] - a[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t * t + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * t ** 3) for j in (0, 1)))
    return [*out, points[-1]]


def road(canvas, kind, points):
    """No ink on a road: a soft band, wider and paler with its rank."""
    (colour, width) = kind
    layer = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(layer).line(smooth(points), fill=255, width=width, joint="curve")
    layer = layer.filter(ImageFilter.GaussianBlur(1.6))
    canvas.paste(Image.new("RGB", canvas.size, colour), (0, 0), layer)


def clearing(canvas, polygon, seed):
    """Cleared land: meadow taken from the render itself, stumps scattered at its edge."""
    mean = ImageStat.Stat(canvas.crop((130, 830, 330, 900))).mean
    rng = random.Random(seed)
    noise = Image.new("L", (54, 85))  # broad soft patches, no tile, no second bright strip from the source meadow
    noise.putdata([rng.randint(0, 255) for _ in range(54 * 85)])
    noise = noise.resize(canvas.size, Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))
    fill = Image.merge("RGB", [noise.point(lambda v, m=m: max(0, min(255, int(m * 0.86 + (v - 128) * 0.07)))) for m in mean[:3]])
    mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(9))
    canvas.paste(fill, (0, 0), mask)
    d = ImageDraw.Draw(canvas)
    for a, b in zip(polygon, polygon[1:] + polygon[:1], strict=True):
        for _ in range(8):
            t = rng.random()
            x, y = a[0] + (b[0] - a[0]) * t + rng.uniform(-30, 30), a[1] + (b[1] - a[1]) * t + rng.uniform(-30, 30)
            d.ellipse((x - 4, y - 2.5, x + 4, y + 2.5), fill=(120, 96, 66), outline=(15, 21, 24))


# F: forest on the south land at tiers 1 to 3 (Guillaume, 04/11), where the corner arrives at tier 4. Polygons in the full frame, the path's corridor left open.
SUD_G = [(0, 1380), (200, 1435), (440, 1560), (460, 1600), (530, 1730), (470, 1850), (440, 1900), (0, 1900)]
SUD_D = [(550, 1575), (850, 1425), (1080, 1580), (1080, 1900), (580, 1930), (530, 1880), (580, 1730)]
# The line the forest has pulled back to, by tier: all of it at tier 1, then less, and gone at tier 4.
SUD_LIGNE = {1: 0, 2: 1610, 3: 1760}


def foret_sud(canvas, tier):
    """The real south forest of the render, moved up over the bare land, with stumps along the line it has pulled back to."""
    limite = SUD_LIGNE[tier]
    mask = Image.new("L", canvas.size, 0)
    d = ImageDraw.Draw(mask)
    d.polygon(SUD_G, fill=255)
    d.polygon(SUD_D, fill=255)
    # An irregular cut, a stand of trees and not a ruled line.
    d.polygon([(0, 0), (1080, 0), *[(x, limite + 34 * math.sin(x / 70) + 18 * math.sin(x / 23)) for x in range(1080, -1, -20)]], fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(7))
    forest = canvas.copy()  # outside every patch: the render itself, never black
    gauche, droite = canvas.crop((0, 1810, 430, 2180)), canvas.crop((620, 1780, 1080, 2135))
    for patch, at in ((gauche, (0, 1660)), (ImageOps.mirror(droite), (620, 1680)), (gauche, (0, 1380)), (droite, (620, 1425))):
        edge = Image.new("L", patch.size, 0)  # soft on all sides, so no patch shows a ruled edge
        ImageDraw.Draw(edge).rectangle((26, 26, patch.width - 26, patch.height - 26), fill=255)
        forest.paste(patch, at, edge.filter(ImageFilter.GaussianBlur(18)))
    canvas.paste(forest, (0, 0), mask)
    if limite:
        rng = random.Random(tier)
        draw = ImageDraw.Draw(canvas)
        for _ in range(26):
            x = rng.choice((rng.uniform(20, 430), rng.uniform(610, 1060)))
            y = limite - rng.uniform(6, 70)
            draw.ellipse((x - 5, y - 3, x + 5, y + 3), fill=(120, 96, 66), outline=(15, 21, 24))


def compose(prop, tier):
    canvas = Image.open(FIXE / f"t{tier}-jour.png").convert("RGB")
    spec = P[prop]
    if prop == "F" and tier in SUD_LIGNE:
        foret_sud(canvas, tier)
    last = None
    for first, polygon in spec.get("clear", []):
        if first <= tier:
            last = (first, polygon)
    if last:
        clearing(canvas, last[1], last[0])
    for first, end, kind, points in spec["roads"]:
        if first <= tier <= end:
            road(canvas, kind, points)
    rows = [p for p in spec["pieces"] if p[0] <= tier <= p[1]]
    for _first, _end, name, x, y, width in sorted(rows, key=lambda p: p[4]):
        piece = cut(name, width)
        canvas.paste(piece, (x - piece.width // 2, y - piece.height // 2), piece)
    return canvas.crop(CROP)


def strip(files, cols, dst, width=1080):
    cell = width // cols
    h = round(cell * 1703 / 1080)
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cell * cols, h * rows))
    for i, f in enumerate(files):
        sheet.paste(Image.open(f).convert("RGB").resize((cell, h), Image.LANCZOS), (i % cols * cell, i // cols * h))
    sheet.save(dst, quality=86)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (D / "img").mkdir(exist_ok=True)
    for prop in P:
        files = []
        for tier in range(1, 13):
            f = OUT / f"{prop}_{tier:02d}.png"
            compose(prop, tier).save(f)
            files.append(f)
        strip(files, 6, D / "img" / f"bande-{prop}.jpg")
    if "nuit" in sys.argv:
        night()


def night():
    """Night keeps the montage's layout: Klein on the day image (the night of a raw render stays a blue filter)."""
    import klein as growth

    SIZE = growth.SIZE_BANDE
    for prop in P:
        jobs = []
        for t, txt in growth.NUIT[prop].items():
            ref = OUT / f"ref_{prop}_{t:02d}.png"
            if not ref.exists():
                Image.open(OUT / f"{prop}_{t:02d}.png").resize(SIZE, Image.LANCZOS).save(ref)
            jobs.append((OUT / f"nuit_{prop}_{t:02d}.png", growth.NUIT_TXT + txt + growth.TAIL, 76000 + 1000 * "RTF".index(prop) + t))
        todo = [j for j in jobs if not j[0].exists()]
        if todo:
            growth.run(todo, f"growth nuit {prop}", lambda o, p=prop: (OUT / o.name.replace("nuit_", "ref_"),), SIZE)
        strip([j[0] for j in jobs], 4, D / "img" / f"nuit-{prop}.jpg")


if __name__ == "__main__":
    main()
