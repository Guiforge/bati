#!/usr/bin/env python3
"""Loupe BC series 3: one strong sketch on the whole ground corner, tight tree clusters, whole decals. Nothing wired.

    python3 scripts/iso/loupe_bc_sondes3.py sketch                  # the opaque sketch of the corner, no FLUX
    python3 scripts/iso/loupe_bc_sondes3.py gen sol-coin [--n 3]    # FLUX 3 through iso_loop's registry
    python3 scripts/iso/loupe_bc_sondes3.py gen mixte|bouleaux|bord [--n 2] [--start 0]
    python3 scripts/iso/loupe_bc_sondes3.py post sol-coin|arbres|decals   # no FLUX

cible.png is only read by `post` to sit beside our result. Never sent to FLUX. No Thronebreaker image.
Scales on the board: terrain px (3 px a dp) x 0.35 = the phone at zoom 0.6, shown at 720 px wide (x 0.6, x 2.625, x 0.667).
"""
import argparse
import concurrent.futures
import json
import pathlib
import random
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import iso_loop as I
import loupe_bc_sol as sol
import loupe_bc_sondes2 as S2
from lib import flux
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = S2.ROOT
OUT = S2.LOUPES / "bc/r1/sondes-3"
CACHE = flux.ORIGINALS.parent / "loupes-bc-r3"
PHONE = 0.35
# Centred on the middle of tile (15, 16), so the whole composite is one stamp at that tile (cuire_sol.centre_px).
BOX = (512, 2710, 4312, 4610)  # 3800 x 1900 real px, tiles about i 8..28, j 8..30 around the gate
SIZE = (1536, 768)
K = SIZE[0] / 3800  # canvas px per real px
STRIP = (1500, 3100, 3800, 4600)  # a real meadow strip, for the trees and the decals preview
TARGET = {"route": (0, 950, 720, 1400), "arbres": (0, 440, 720, 760), "decals": (250, 1200, 720, 1500)}


def meadow_texture(size, seed):
    n = S2.noise(size, 3, seed)
    return Image.composite(Image.new("RGB", size, (122, 127, 74)), Image.new("RGB", size, (104, 111, 62)), n)


def cover_mask(g):
    """The forest-floor polygons (dark, not blue), dilated so their edge goes under the cover."""
    lum = g.convert("L").filter(ImageFilter.GaussianBlur(5)).point(lambda v: 255 if v < 106 else 0)
    r, _, b = g.split()
    blue = ImageChops.subtract(b, r).point(lambda v: 255 if v > 22 else 0).filter(ImageFilter.MaxFilter(21))
    return ImageChops.subtract(lum, blue).filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.GaussianBlur(6))


def sketch():
    d = CACHE / "inputs"
    d.mkdir(parents=True, exist_ok=True)
    g = sol.crop_px(*BOX).resize(SIZE, Image.LANCZOS)
    cm = cover_mask(g)
    s = Image.composite(meadow_texture(SIZE, 3), g, cm.point(lambda v: int(v * 0.97)))
    # the road: from the gate side (top, under the worn ground) down the lane, as wide as the target's
    pts = S2.chaikin([(0.452 * SIZE[0], 0.40 * SIZE[1]), (0.455 * SIZE[0], 0.50 * SIZE[1]), (0.47 * SIZE[0], 0.60 * SIZE[1]), (0.50 * SIZE[0], 0.70 * SIZE[1]),
                      (0.485 * SIZE[0], 0.84 * SIZE[1]), (0.48 * SIZE[0], 1.04 * SIZE[1])], 4)
    road = Image.new("L", SIZE, 0)
    rd = ImageDraw.Draw(road)
    for i, (x, y) in enumerate(pts):
        r = min(27, 4 + i * 1.1) * (1 + 0.18 * __import__("math").sin(i / 6))
        rd.ellipse((x - r, y - r * 0.9, x + r, y + r * 0.9), fill=255)
    # the wheat field: ochre and straw bands inside an irregular outline, in the cleared lower right
    cx, cy = 0.74 * SIZE[0], 0.76 * SIZE[1]
    field = S2.blob_mask(SIZE, cx, cy, 150, 82, 11)
    field = S2.soft(field.filter(ImageFilter.GaussianBlur(6)), 120, 150)
    bands = Image.new("RGB", SIZE, (203, 163, 88))
    bd = ImageDraw.Draw(bands)
    random.seed(6)
    for k in range(-60, 120):
        j = random.randint(-14, 14)
        c = (222 + j, 190 + j, 104 + j // 2) if k % 2 else (186 + j, 140 + j, 78)
        w0 = random.randint(7, 16)
        bd.line([(cx - 400 + k * 22, cy + 200 + j), (cx - 100 + k * 22, cy + 50 - j), (cx + 400 + k * 22, cy - 200)], fill=c, width=w0)
    bands = bands.filter(ImageFilter.GaussianBlur(2))
    track = Image.new("L", SIZE, 0)
    td = ImageDraw.Draw(track)
    td.line(S2.chaikin([(cx - 120, cy + 10), (cx - 190, cy + 22), (0.55 * SIZE[0], 0.77 * SIZE[1])], 3), fill=255, width=17)
    roadlike = ImageChops.lighter(road, track).filter(ImageFilter.GaussianBlur(5))
    dirt = Image.composite(Image.new("RGB", SIZE, (206, 186, 146)), Image.new("RGB", SIZE, (193, 172, 132)), S2.noise(SIZE, 4, 8))
    s = Image.composite(dirt, s, roadlike)
    s = Image.composite(bands, s, field)
    s.save(d / "sol-coin.png")
    zone = ImageChops.lighter(ImageChops.lighter(cm, roadlike), field)
    zone.save(d / "zone.png")
    g.save(d / "sol-coin.reel.png")
    return s


PROMPTS = {
    "sol-coin": ("Repaint image 1 as one continuous hand-painted game ground, same paint, no ink outlines. Keep its layout exactly: "
                 "the wide pale dirt road, the wheat field of ochre and straw bands with its short track, the worn village ground, the river. "
                 "Meadow grass everywhere else, no dark patches. Keep the detailed brush texture, small tufts, pebbles and flowers of the untouched parts of image 1 everywhere, also on the road and the field. Flat ground only: no buildings, nothing standing, no cast shadows."),
    "mixte": ("Image 1, 2 and 3 are painted forest masses: match their brushwork, colours and their thin ink line. Paint one tight cluster "
              "of oak and pine trees: crowns overlapping into one bumpy mass, three clearly different sizes in the same group, trunks mostly "
              "hidden, only the feet showing with roots, ferns and low bushes. Yellow-green light, blue-green shade. No ground, no disc, "
              "no shadow. On a flat pure magenta (#FF00FF) backdrop."),
    "bouleaux": ("Image 1, 2 and 3 are painted forest masses: match their brushwork, colours and their thin ink line. Paint one tight cluster "
                 "of birch trees: crowns overlapping into one bumpy mass, three clearly different sizes in the same group, trunks mostly "
                 "hidden, only the white feet showing with roots, ferns and low bushes. Yellow-green light, blue-green shade. No ground, no disc, "
                 "no shadow. On a flat pure magenta (#FF00FF) backdrop."),
    "bord": ("Image 1, 2 and 3 are painted forest masses: match their brushwork, colours and their thin ink line. Paint one small edge group "
             "of five young trees, oak, pine and birch, crowns overlapping into one bumpy mass, three clearly different sizes, trunks mostly "
             "hidden, only the feet showing with roots, ferns and low bushes. Yellow-green light, blue-green shade. No ground, no disc, "
             "no shadow. On a flat pure magenta (#FF00FF) backdrop."),
}
FAM = {"sol-coin": "sol-coin", "mixte": "arbres", "bouleaux": "arbres", "bord": "arbres"}


def gen(name, n, start):
    I.guard_endpoint(I.FLUX3)
    d = OUT / FAM[name]
    d.mkdir(parents=True, exist_ok=True)
    cache = CACHE / name
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"{name}_v{i}.png" for i in range(start, start + n)]
    if any(o.exists() for o in outs):
        sys.exit("already painted: never re-rolled in place")
    if name == "sol-coin":
        sketch()
        refs, size = [CACHE / "inputs/sol-coin.png"], SIZE
    else:
        refs = [S2.on_magenta(S2.ISO / f"foret/{f}.webp", f"{f}.png") for f in ("melangee", "feuillus", "bouleaux")]
        size = (1344, 896)
    batch = I.reserve(n, 0.10, f"loupe bc r3 {name}", None)
    resp = []

    def one(o):
        flux.generate(slug=f"loupe_bc3_{name}", prompt=PROMPTS[name], out=o, width=size[0], height=size[1], attempts=1,
                      references=tuple(refs), extra={"width": size[0], "height": size[1]}, submitted_log=resp, endpoint=I.FLUX3)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            list(pool.map(one, outs))
    finally:
        entry = I.settle(batch, resp)
    for o in outs:
        if o.exists():
            Image.open(o).convert("RGB").save(d / o.name)
    (d / f"{name}.prompt.txt").write_text(PROMPTS[name] + "\n", encoding="utf-8")
    if name == "sol-coin":
        Image.open(CACHE / "inputs/sol-coin.png").save(d / "esquisse.png")
        Image.open(CACHE / "inputs/zone.png").save(d / "zone.png")
    print(json.dumps({"name": name, "made": [o.name for o in outs if o.exists()], "cost": entry["cost"]}))


# ---------------------------------------------------------------- post


def window(img, centre, w=720, h=420):
    cx, cy = int(centre[0] * img.width), int(centre[1] * img.height)
    x0 = max(0, min(img.width - w, cx - w // 2))
    y0 = max(0, min(img.height - h, cy - h // 2))
    return img.crop((x0, y0, x0 + w, y0 + h))


def cible(box):
    ci = Image.open(S2.CIBLE).convert("RGB").crop(box)
    return ci.resize((720, round(ci.height * 720 / ci.width)), Image.LANCZOS)


def board(path, real, centre, tbox, extra=()):
    """real: composite at terrain px. Left: phone scale window and 2x window. Right: cible crop and extra images."""
    ph = real.resize((round(real.width * PHONE), round(real.height * PHONE)), Image.LANCZOS)
    big = real.resize((round(real.width * PHONE * 2), round(real.height * PHONE * 2)), Image.LANCZOS)
    a = window(ph, centre, 720, min(420, ph.height))
    b = window(big, centre, 720, 420)
    c = cible(tbox)
    h1 = max(a.height, c.height)
    ex = [e.resize((360, round(e.height * 360 / e.width))) for e in extra]
    h2 = max([b.height] + [e.height for e in ex])
    sheet = Image.new("RGB", (1470, h1 + h2 + 30), (40, 40, 40))
    sheet.paste(a, (10, 10))
    sheet.paste(c, (740, 10))
    sheet.paste(b, (10, h1 + 20))
    x = 740
    for e in ex[:2]:
        sheet.paste(e, (x, h1 + 20))
        x += 365
    sheet.save(path, quality=90)


def post_sol():
    d = OUT / "sol-coin"
    real = sol.crop_px(*BOX)
    zone = Image.open(d / "zone.png")
    # a very wide soft mask: the repaint fades into the untouched terrain over about 120 real px, no seam
    m = zone.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(28)).resize(real.size, Image.LANCZOS)
    m = m.filter(ImageFilter.GaussianBlur(30))
    outs = sorted(d.glob("sol-coin_v?.png"))
    comps = []
    for o in outs:
        v = Image.open(o).convert("RGB").resize(real.size, Image.LANCZOS)
        c = Image.composite(v, real, m)
        c.save(d / f"{o.stem}_sur_sol.webp", quality=88)
        comps.append((o, c, v))
    m.save(d / "masque.png")
    if comps:
        best = comps[-1] if not BEST.get("sol-coin") else next(t for t in comps if t[0].stem.endswith(BEST["sol-coin"]))
        stamp = best[2].convert("RGBA")
        stamp.putalpha(m)
        stamp.save(d / "stamp_t4-6.webp", quality=90)
        board(d / "planche.webp", best[1], (0.52, 0.78), TARGET["route"], [Image.open(d / "esquisse.png"), Image.open(d / best[0].name)])


BEST = {"sol-coin": None, "arbres": {"mixte": "v0", "bouleaux": "v0", "bord": "v0"}}


def cutout(path):
    cut = S2.planches().detoure(Image.open(path))[0]
    return cut.crop(cut.getbbox())


def post_arbres():
    d = OUT / "arbres"
    real = sol.crop_px(*STRIP)
    base = real.convert("RGBA")
    foot = 700
    wpx = 504  # a forest mass is 168 dp wide, 3 px a dp
    x = 150
    for nm in ("melangee", "feuillus", "bouleaux"):
        im = Image.open(S2.ISO / f"foret/{nm}.webp").convert("RGBA")
        im = im.resize((wpx, round(im.height * wpx / im.width)), Image.LANCZOS)
        base.alpha_composite(im, (x, foot - im.height))
        x += wpx + 40
    x, foot = 150, 1400
    for nm, scale in (("mixte", 1.0), ("bouleaux", 1.0), ("bord", 0.7)):
        f = d / f"{nm}_{BEST['arbres'][nm]}.png"
        if not f.exists():
            continue
        cut = cutout(f)
        w = int(wpx * scale)
        cut = cut.resize((w, round(cut.height * w / cut.width)), Image.LANCZOS)
        cut.save(d / f"{nm}_coupe.webp", quality=92)
        base.alpha_composite(cut, (x, foot - cut.height))
        x += w + 30
    base = base.convert("RGB")
    base.save(d / "amas_sur_sol.webp", quality=90)
    raw = [Image.open(sorted(d.glob(f"{nm}_v?.png"))[0]) for nm in ("mixte", "bouleaux", "bord") if sorted(d.glob(f"{nm}_v?.png"))]
    board(d / "planche.webp", base, (0.3, 0.72), TARGET["arbres"], raw)


def stamps_from(name, target_w):
    """Whole tufts or stones: keyed against the ground the repaint started from, soft threshold."""
    ground = Image.open(S2.CACHE / "inputs" / f"{name}.png").convert("RGB")
    d = S2.OUT / "decals"
    v = Image.open(d / f"{name}_v0.png").convert("RGB").resize(ground.size, Image.LANCZOS)
    diff = ImageChops.difference(v, ground).convert("L").filter(ImageFilter.GaussianBlur(1.2))
    m = S2.soft(diff, 22, 50).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
    out = []
    cw, ch = v.width // 3, v.height // 2
    for r in range(2):
        for c in range(3):
            box = (c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)
            mm = m.crop(box)
            bb = S2.soft(mm, 90, 140).getbbox()
            if not bb or bb[2] - bb[0] < 10 or bb[3] - bb[1] < 8:
                continue
            bb = (max(0, bb[0] - 3), max(0, bb[1] - 3), min(cw, bb[2] + 3), min(ch, bb[3] + 3))
            rgba = v.crop(box).convert("RGBA")
            rgba.putalpha(mm)
            rgba = rgba.crop(bb)
            k = target_w / rgba.width
            out.append(rgba.resize((max(6, int(rgba.width * k)), max(5, int(rgba.height * k))), Image.LANCZOS))
    return out


def lighten(s, k):
    """Dark tufts stay subtle: pulled toward the meadow tone, alpha kept."""
    rgb = Image.blend(s.convert("RGB"), Image.new("RGB", s.size, (104, 112, 64)), k)
    rgb = rgb.convert("RGBA")
    rgb.putalpha(s.getchannel("A"))
    return rgb


def post_decals():
    d = OUT / "decals"
    d.mkdir(parents=True, exist_ok=True)
    real = sol.crop_px(*STRIP).convert("RGBA")
    # decal images were painted on a ground crop 1344 px for 1600 real px: x 1.19 to real px, x 1.5 to read at the target's size
    tufts = [lighten(s, 0.35) for s in stamps_from("tufts", 70)]
    stones = stamps_from("stones", 56)
    for i, s in enumerate(tufts + stones):
        s.save(d / f"stamp_{i}.png")
    random.seed(4)
    spots = [(250, 500), (600, 420), (900, 560), (1250, 470), (1500, 600), (1800, 450), (400, 640), (1100, 650), (1650, 380), (2000, 560)]
    pool = (tufts[:4] + stones[:4]) * 2
    random.shuffle(pool)
    for i, (s, (x, y)) in enumerate(zip(pool, spots)):
        s = s.resize((int(s.width * 1.19 * 1.5), int(s.height * 1.19 * 1.5)), Image.LANCZOS)
        if i % 2:
            s = s.transpose(Image.FLIP_LEFT_RIGHT)
        real.alpha_composite(s, (x - s.width // 2, y - s.height // 2))
    # the worn earth patch, soft blob mask
    v = Image.open(S2.OUT / "decals/worn_v0.png").convert("RGB")
    wm = S2.fray(S2.blob_mask(v.size, v.width * 0.50, v.height * 0.54, v.width * 0.16, v.height * 0.14, 5), 9, blur=12)
    w = v.convert("RGBA")
    w.putalpha(wm)
    w = w.crop(wm.getbbox())
    w = w.resize((int(w.width * 1.19), int(w.height * 1.19)), Image.LANCZOS)
    real.alpha_composite(w, (1100, 520))
    real = real.convert("RGB")
    real.save(d / "decals_sur_sol.webp", quality=90)
    raw = [Image.open(S2.OUT / f"decals/{n}_v0.png") for n in ("tufts", "stones")]
    board(d / "planche.webp", real, (0.5, 0.62), TARGET["decals"], raw)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=("sketch", "gen", "post"))
    ap.add_argument("name", nargs="?")
    ap.add_argument("--n", type=int, default=2)
    ap.add_argument("--start", type=int, default=0)
    a = ap.parse_args()
    if a.cmd == "sketch":
        sketch()
    elif a.cmd == "gen":
        gen(a.name, a.n, a.start)
    else:
        {"sol-coin": post_sol, "arbres": post_arbres, "decals": post_decals}[a.name]()
