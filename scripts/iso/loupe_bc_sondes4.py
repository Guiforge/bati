#!/usr/bin/env python3
"""Loupe BC series 4: one native-resolution piece of ground (no upscale), built in two passes, plus recomposed trees. Nothing wired.

    python3 scripts/iso/loupe_bc_sondes4.py meadow [--n 2]                # pass a: meadow repaint of the whole piece (FLUX)
    python3 scripts/iso/loupe_bc_sondes4.py road --base vK [--n 2]       # pass b1: tight repaint window on a built road sketch
    python3 scripts/iso/loupe_bc_sondes4.py field --base road_vK [--n 2] # pass b2: same for the wheat field and its track
    python3 scripts/iso/loupe_bc_sondes4.py objets                       # 3 stooks, 2 scarecrows on magenta (FLUX)
    python3 scripts/iso/loupe_bc_sondes4.py piece road_vK field_vK       # final piece, soft mask on real terrain, planche
    python3 scripts/iso/loupe_bc_sondes4.py arbres | decals | objets-post   # no FLUX

cible.png is only read to sit beside our result: never sent to FLUX, not even as a reference. No Thronebreaker image.
Scales: terrain px (3 px a dp) x 0.35 = the phone at zoom 0.6 on a 720 px board.
"""
import argparse
import concurrent.futures
import json
import math
import pathlib
import random
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import iso_loop as I
import loupe_bc_sol as sol
import loupe_bc_sondes2 as S2
import loupe_bc_sondes3 as S3
from lib import flux
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

OUT = S2.LOUPES / "bc/r1/sondes-4"
CACHE = flux.ORIGINALS.parent / "loupes-bc-r4"
ISO = S2.ISO
BOX = (1284, 3832, 2820, 4856)  # 1536 x 1024 real px centred on tile (22, 28): about i 14..30, j 20..36, the lane under the gate
ROAD_WIN = (832, 0, 1536, 1024)  # 704 x 1024, native
FIELD_WIN = (360, 330, 1448, 1018)  # 1088 x 688, native
ROAD_PTS = [(1150, -30), (1170, 150), (1190, 330), (1250, 520), (1330, 700), (1400, 880), (1420, 1060)]  # follows the lane of meadow_v4
PHONE = 0.35


def q(m, f):  # run a slow Pillow filter at quarter size
    s = m.resize((m.width // 4, m.height // 4), Image.BILINEAR)
    return f(s).resize(m.size, Image.BILINEAR)


def real_piece():
    return sol.crop_px(*BOX)


def cover(g):
    """The forest-floor polygons (dark, not blue), as a soft mask, native size."""
    def f(s):
        lum = s.convert("L").filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v < 106 else 0)
        r, _, b = s.split()
        blue = ImageChops.subtract(b, r).point(lambda v: 255 if v > 22 else 0).filter(ImageFilter.MaxFilter(11))
        return ImageChops.subtract(lum, blue).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(2))
    return q(g, f).filter(ImageFilter.GaussianBlur(8))


def calm_meadow(size, seed):
    n = S2.noise(size, 30, seed)
    return Image.composite(Image.new("RGB", size, (118, 124, 72)), Image.new("RGB", size, (102, 110, 62)), n)


def tiled_meadow(g):
    """Cover texture: the real lit meadow of the piece (top right), mirrored and tiled, so the sketch keeps the paint's own grain."""
    patch = g.crop((900, 10, 1500, 200))
    out = Image.new("RGB", g.size)
    for ri, ty in enumerate(range(0, g.height, 190)):
        for ci, tx in enumerate(range(-300 * (ri % 2), g.width, 600)):
            pt = patch.transpose(Image.FLIP_LEFT_RIGHT) if (ri + ci) % 2 else patch
            if ri % 3 == 2:
                pt = pt.transpose(Image.FLIP_TOP_BOTTOM)
            out.paste(pt, (tx, ty))
    return out


def sketch_a():
    g = real_piece()
    def f(sm):
        lum = sm.convert("L").filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v < 106 else 0)
        return lum.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(2))
    cm = q(g, f).filter(ImageFilter.GaussianBlur(3)).point(lambda v: min(255, v * 3))  # near-hard, dilated: no dark fringe left
    g2 = ImageEnhance.Color(g).enhance(0.8)  # the worn earth less saturated
    return Image.composite(calm_meadow(g.size, 5), g2, cm), cm


PROMPT_A = ("Repaint image 1 as one continuous hand-painted meadow ground, same paint, no ink outlines. Keep its layout: the worn village ground at the "
            "top right, the light lane. Keep the same brush texture and grass tufts as image 1 but sparse: about half the flowers, large calm areas of short grass, detail only near the worn ground and the lane. The same flat grass colour all over. No water, no river, no blue. The worn earth "
            "soft and pale, no line around it. No dark patches. Flat ground only: nothing standing, no buildings, no cast shadows.")
PROMPT_ROAD = ("Repaint image 1 keeping its layout: the pale sand-grey dirt road, faint interrupted ruts, scattered pebbles, grass biting its ragged edges. "
               "Same hand-painted style and grass as the rest of image 1, no ink outline, no kerb, no edge stones, no dark centre line. Flat ground only, no shadows.")
PROMPT_FIELD = ("Repaint image 1 keeping its layout: one flat wheat field of straw-gold bands with bare brown earth visible between them, an irregular outline "
                "with soft corners blending into the grass, and a short dirt track from the field to the road. Same hand-painted style as the rest of image 1. "
                "Flat on the ground: no height, no side faces, no bales, no scarecrow, no fence, no ink outline, no cast shadows.")


# ---------------------------------------------------------------- constructed sketches


def smooth_path(pts, shift=(0, 0)):
    return S2.chaikin([(x - shift[0], y - shift[1]) for x, y in pts], 4)


def road_sketch(size, pts, w0, seed):
    """A built road: varying width and edge, sand-grey with value drift, broken ruts, grass dabs on the edge, pebbles."""
    random.seed(seed)
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    n = len(pts)
    rs = []
    for i, (x, y) in enumerate(pts):
        r = w0 / 2 * (1 + 0.2 * math.sin(i / 7) + 0.1 * math.sin(i / 2.3) + random.uniform(-0.05, 0.05))
        rs.append(r)
        d.ellipse((x - r, y - r * 0.8, x + r, y + r * 0.8), fill=255)
    m = S2.fray(m, seed, blur=6, k=0.9, lo=100, hi=150)
    drift = S2.noise(size, 22, seed + 1)
    col = Image.composite(Image.new("RGB", size, (206, 197, 170)), Image.new("RGB", size, (186, 177, 150)), drift)
    speck = S2.noise(size, 1.2, seed + 2).point(lambda v: int(120 + (v - 128) * 0.25))
    col = ImageChops.multiply(col, Image.merge("RGB", (speck.point(lambda v: min(255, v * 2)),) * 3)) if False else col
    rut = Image.new("L", size, 0)
    rd = ImageDraw.Draw(rut)
    for side in (-1, 1):
        for i in range(0, n - 1):
            if random.random() < 0.55:
                (x0, y0), (x1, y1) = pts[i], pts[i + 1]
                off = side * rs[i] * 0.42
                rd.line([(x0 + off, y0), (x1 + off, y1)], fill=255, width=7)
    rut = rut.filter(ImageFilter.GaussianBlur(1.6)).point(lambda v: int(v * 0.45))
    col = Image.composite(Image.new("RGB", size, (150, 140, 118)), col, rut)
    dd = ImageDraw.Draw(col)
    for i in range(0, n, 2):  # grass dabs biting the edge, pebbles inside
        x, y = pts[i]
        for side in (-1, 1):
            for _ in range(2):
                ex = x + side * rs[i] * random.uniform(0.82, 1.1)
                ey = y + random.uniform(-12, 12)
                a = random.uniform(5, 11)
                dd.ellipse((ex - a, ey - a * 0.6, ex + a, ey + a * 0.6), fill=(96, 110, 58))
        for _ in range(2):
            px, py = x + random.uniform(-0.7, 0.7) * rs[i], y + random.uniform(-14, 14)
            a = random.uniform(3, 6)
            dd.ellipse((px - a, py - a * 0.7, px + a, py + a * 0.7), fill=(146, 136, 116))
    col = col.filter(ImageFilter.GaussianBlur(0.7))
    return col, m


def wobble_poly(pts, seed, amp=12):
    random.seed(seed)
    out = []
    for a, b in zip(pts, pts[1:] + pts[:1]):
        for t in (0, 0.33, 0.66):
            x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            out.append((x + random.uniform(-amp, amp), y + random.uniform(-amp, amp)))
    return out


def field_sketch(size, seed=9):
    """Irregular quadrilateral with softened corners, wheat bands with earth between them, a short track to the road."""
    poly = wobble_poly([(430, 650), (760, 440), (1090, 600), (850, 820)], seed)
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    m = S2.soft(m.filter(ImageFilter.GaussianBlur(14)), 110, 150).filter(ImageFilter.GaussianBlur(2))
    earth = Image.new("RGB", size, (140, 106, 66))
    bd = ImageDraw.Draw(earth)
    random.seed(seed + 1)
    slope = -0.6
    for k in range(-40, 70):
        off = k * 30
        j = random.randint(-14, 14)
        c = (214 + j, 182 + j, 100 + j // 2) if random.random() < 0.7 else (196 + j, 160 + j, 84)
        x0, y0 = -200, 150 + off
        bd.line([(x0, y0 - slope * x0 * 0 + 0), (x0 + 1600, y0 + slope * 1600)], fill=c, width=random.randint(15, 21))
    earth = earth.filter(ImageFilter.GaussianBlur(1.0))
    grain = S2.noise(size, 1.5, seed + 2).point(lambda v: int(128 + (v - 128) * 0.5))
    earth = ImageChops.add(earth, Image.merge("RGB", (grain,) * 3), 1, -128)
    tr = smooth_path_pts([(1070, 612), (1150, 630), (1230, 628), (1340, 642)])
    tcol, tm = road_sketch(size, tr, 34, seed + 3)
    return earth, m, tcol, tm


def smooth_path_pts(pts):
    return S2.chaikin(pts, 4)


# ---------------------------------------------------------------- FLUX


def call(name, prompt, ref, size, n, start, extra_refs=()):
    I.guard_endpoint(I.FLUX3)
    d = OUT / "morceau"
    d.mkdir(parents=True, exist_ok=True)
    cache = CACHE / name
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"{name}_v{i}.png" for i in range(start, start + n)]
    if any(o.exists() for o in outs):
        sys.exit("already painted: never re-rolled in place")
    batch = I.reserve(n, 0.10, f"loupe bc r4 {name}", None)
    resp = []

    def one(o):
        flux.generate(slug=f"loupe_bc4_{name}", prompt=prompt, out=o, width=size[0], height=size[1], attempts=1,
                      references=(ref, *extra_refs), extra={"width": size[0], "height": size[1]}, submitted_log=resp, endpoint=I.FLUX3)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            list(pool.map(one, outs))
    finally:
        entry = I.settle(batch, resp)
    for o in outs:
        if o.exists():
            Image.open(o).convert("RGB").save(d / o.name)
    (d / f"{name}.prompt.txt").write_text(prompt + "\n", encoding="utf-8")
    print(json.dumps({"name": name, "made": [o.name for o in outs if o.exists()], "cost": entry["cost"]}))


def load(name):
    return Image.open(OUT / "morceau" / f"{name}.png").convert("RGB")


def cmd_meadow(n, start):
    s, _ = sketch_a()
    (CACHE / "inputs").mkdir(parents=True, exist_ok=True)
    s.save(CACHE / "inputs/meadow.png")
    (OUT / "morceau").mkdir(parents=True, exist_ok=True)
    call("meadow", PROMPT_A, CACHE / "inputs/meadow.png", s.size, n, start)
    s.save(OUT / "morceau" / "esquisse_a.png")


def road_window(base):
    sk = base.copy()
    col, m = road_sketch(base.size, smooth_path(ROAD_PTS), 128, 21)
    sk.paste(col, (0, 0), m)
    zone = m
    return sk, zone


def cmd_road(base_name, n, start):
    base = load(base_name)
    sk, zone = road_window(base)
    w = sk.crop(ROAD_WIN)
    (CACHE / "inputs").mkdir(parents=True, exist_ok=True)
    w.save(CACHE / "inputs/road.png")
    call("road", PROMPT_ROAD, CACHE / "inputs/road.png", w.size, n, start)
    w.save(OUT / "morceau" / "esquisse_route.png")
    zone.save(CACHE / "inputs/road_zone.png")


def merge_window(base, v, win, zone):
    """Paste the repainted window over base, through the sketch zone dilated and blurred (tight, soft)."""
    z = q(zone, lambda s: s.filter(ImageFilter.MaxFilter(15))).filter(ImageFilter.GaussianBlur(14))
    full = base.copy()
    full.paste(v.resize((win[2] - win[0], win[3] - win[1])), (win[0], win[1]))
    return Image.composite(full, base, z), z


def cmd_field(base_name, n, start):
    base = load(base_name)
    earth, m, tcol, tm = field_sketch(base.size)
    sk = base.copy()
    sk.paste(tcol, (0, 0), tm)
    sk.paste(earth, (0, 0), m)
    w = sk.crop(FIELD_WIN)
    w.save(CACHE / "inputs/field.png")
    call("field", PROMPT_FIELD, CACHE / "inputs/field.png", w.size, n, start)
    w.save(OUT / "morceau" / "esquisse_champ.png")


def cmd_mergeroad(meadow_name, road_name):
    meadow = load(meadow_name)
    cur, _ = merge_window(meadow, load(road_name), ROAD_WIN, Image.open(CACHE / "inputs/road_zone.png"))
    cur.save(OUT / "morceau" / ("rm_" + road_name.split("_")[-1] + ".png"))


def cmd_piece(rm_name, field_name):
    d = OUT / "morceau"
    cur = load(rm_name)
    z1 = Image.open(CACHE / "inputs/road_zone.png")
    earth, m, tcol, tm = field_sketch(cur.size)
    final, z2 = merge_window(cur, load(field_name), FIELD_WIN, ImageChops.lighter(m, tm))
    final.save(d / "morceau_final.webp", quality=92)
    # composite on the real terrain through a very soft mask (no seam, no halo)
    real = real_piece()
    _, cm = sketch_a()
    mt = ImageChops.lighter(ImageChops.lighter(cm, z1), z2)
    mt = q(mt, lambda s: s.filter(ImageFilter.MaxFilter(7))).filter(ImageFilter.GaussianBlur(22))
    on = Image.composite(final, real, mt)
    on.save(d / "morceau_sur_sol.webp", quality=92)
    mt.save(d / "masque.png")
    S3.board(d / "planche.webp", on, (0.6, 0.5), S3.TARGET["route"], [Image.open(d / "esquisse_route.png"), Image.open(d / "esquisse_champ.png")])


OBJ = {
    "stook1": "Paint one small hay stook: a short squat conical sheaf of wheat tied near the top, few straws, a little tamped straw at its foot.",
    "stook2": "Paint one small hay stook: a short, wide, rounded sheaf of wheat with a twist of straw at the top, few straws, tamped straw at its foot.",
    "stook3": "Paint one small hay stook: a low conical sheaf of wheat leaning a little, a band tied around it, few straws, tamped straw at its foot.",
    "scarecrow1": "Paint one scarecrow in three-quarter view: a wooden post with a crossbar, slightly crooked, a patched coat hanging in front of the post, a straw hat on the top, straw hands, a tuft of grass at its foot. Little detail.",
    "scarecrow2": "Paint one scarecrow in three-quarter view: a wooden post leaning a little, arms on a crossbar, a worn coat in front of the post, a floppy straw hat, grass at its foot. Little detail.",
}
OBJ_TAIL = (" Same thin ink line, colours and brushwork as images 1 and 2, which are only a style reference: do not copy them. Seen from above at the same 2:1 isometric "
            "angle, the top visible. One object alone, centred, on a flat uniform pure magenta (#FF00FF) backdrop from edge to edge. No ground, no cast shadow, no text.")


def cmd_objets(names):
    I.guard_endpoint(I.FLUX3)
    d = OUT / "objets"
    d.mkdir(parents=True, exist_ok=True)
    refs = [S2.on_magenta(ISO / "forge/solid.jour.webp", "forge.png"), S2.on_magenta(ISO / "champs/ble.webp", "ble.png")]
    batch = I.reserve(len(names), 0.10, "loupe bc r4 objets", None)
    resp = []

    def one(nm):
        o = CACHE / "objets" / f"{nm}.png"
        o.parent.mkdir(parents=True, exist_ok=True)
        flux.generate(slug=f"loupe_bc4_{nm}", prompt=OBJ[nm] + OBJ_TAIL, out=o, width=1024, height=1024, attempts=1, references=tuple(refs),
                      extra={"width": 1024, "height": 1024}, submitted_log=resp, endpoint=I.FLUX3)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(names)) as pool:
            list(pool.map(one, names))
    finally:
        entry = I.settle(batch, resp)
    for nm in names:
        o = CACHE / "objets" / f"{nm}.png"
        if o.exists():
            Image.open(o).convert("RGB").save(d / f"{nm}.png")
    (d / "prompts.txt").write_text("\n\n".join(f"{k}: {v}{OBJ_TAIL}" for k, v in OBJ.items()), encoding="utf-8")
    print(json.dumps({"made": [n for n in names if (d / f"{n}.png").exists()], "cost": entry["cost"]}))


# ---------------------------------------------------------------- recomposition and previews (no FLUX)


def piece_cut(name, box, feather=26):
    """A sub-cluster of an in-game mass: the crop, its cut sides (not the image edge) fading over `feather` px."""
    im = Image.open(ISO / f"foret/{name}.webp").convert("RGBA").crop(box)
    a = im.getchannel("A")
    w, h = im.size
    ramp = Image.new("L", im.size, 255)
    px = ramp.load()
    for y in range(h):
        for x in range(w):
            f = 1.0
            if box[0] > 0:
                f = min(f, x / feather)
            if box[2] < 448:
                f = min(f, (w - 1 - x) / feather)
            if box[1] > 0:
                f = min(f, y / feather)
            if box[3] < 384:
                f = min(f, (h - 1 - y) / feather)
            px[x, y] = int(255 * max(0.0, min(1.0, f)))
    im.putalpha(ImageChops.multiply(a, ramp))
    return im


CLUSTERS = {  # name: (scale, [(mass, box, (left, top), scale, flip)]) in asset px, painted back to front
    "mixte": (1.0, [("melangee", (88, 8, 348, 205), (190, 10), 1.0, False), ("melangee", (0, 110, 150, 384), (20, 90), 1.0, False),
                    ("feuillus", (330, 100, 448, 384), (330, 70), 1.0, False), ("bouleaux", (340, 95, 448, 384), (440, 120), 0.7, False),
                    ("melangee", (150, 150, 330, 384), (170, 120), 1.0, False)]),
    "bouleaux": (1.0, [("bouleaux", (150, 30, 345, 384), (120, 10), 1.0, False), ("bouleaux", (0, 40, 150, 384), (0, 80), 0.85, False),
                       ("bouleaux", (340, 95, 448, 384), (270, 105), 0.8, True)]),
    "bord": (0.65, [("bord_coniferes", (60, 55, 260, 384), (0, 20), 1.0, True), ("feuillus", (0, 90, 125, 330), (140, 110), 0.9, False),
                    ("bouleaux", (0, 40, 150, 384), (210, 120), 0.6, False)]),
}


def undergrowth(real):
    """Dark ground stamps cut out of the painted forest floor (dark polygon of the real piece), soft elliptical alpha."""
    patch = real.crop((300, 560, 760, 640))
    w, h = patch.size
    a = Image.radial_gradient("L").resize((w, h)).point(lambda v: max(0, min(255, int((150 - v) * 2.2))))
    st = patch.convert("RGBA")
    st.putalpha(a)
    return st


def build_cluster(name, real, flip=False):
    sc, parts = CLUSTERS[name]
    cv = Image.new("RGBA", (700, 430))
    for mass, box, (l, t), ps, fl in parts:
        im = piece_cut(mass, box)
        if fl:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        im = im.resize((max(1, int(im.width * ps)), max(1, int(im.height * ps))), Image.LANCZOS)
        cv.alpha_composite(im, (l, t))
    bb = cv.getbbox()
    cv = cv.crop(bb)
    pad = Image.new("RGBA", (cv.width, cv.height + 30))
    pad.alpha_composite(cv)
    cv = pad
    # the dark undergrowth over the feet: a few stamps along the bottom edge
    st = undergrowth(real)
    foot = cv.height - 50
    for k in range(0, cv.width - 60, 70):
        s2 = st.resize((int(st.width * 0.45), int(st.height * 0.7)), Image.LANCZOS)
        cv.alpha_composite(s2, (k, foot - s2.height // 2))
    if flip:
        cv = cv.transpose(Image.FLIP_LEFT_RIGHT)
    k = 1.125 * sc  # an in-game mass is 168 dp of 3 px for a 448 px asset
    return cv.resize((int(cv.width * k), int(cv.height * k)), Image.LANCZOS)


def keyed(path):
    cut = S2.planches().detoure(Image.open(path))[0]
    return cut.crop(cut.getbbox())


def foot_stamps(g, boxes, n=8):
    """Tufts and stones cut from the painted meadow itself: windows with the most grain, soft elliptical alpha, same scale and tone."""
    from PIL import ImageStat
    cand = []
    for y in range(40, g.height - 60, 28):
        for x in range(20, 1000, 28):
            if any(b[0] - 40 < x < b[2] and b[1] - 40 < y < b[3] for b in boxes):
                continue
            win = g.crop((x, y, x + 56, y + 40)).convert("L")
            cand.append((ImageStat.Stat(win).stddev[0], x, y))
    cand.sort(reverse=True)
    out, taken = [], []
    for sd, x, y in cand:
        if all(abs(x - tx) > 70 or abs(y - ty) > 60 for tx, ty in taken):
            a = Image.radial_gradient("L").resize((56, 40)).point(lambda v: max(0, min(255, int((205 - v) * 2.4))))
            st = g.crop((x, y, x + 56, y + 40)).convert("RGBA")
            st.putalpha(a)
            out.append(st)
            taken.append((x, y))
        if len(out) >= n:
            break
    return out


def cmd_scene():
    d = OUT
    final = Image.open(OUT / "morceau/morceau_final.webp").convert("RGB")
    real = real_piece()
    base = final.convert("RGBA")
    field_box = (430, 430, 1100, 830)
    road_box = (1100, 0, 1536, 1024)
    stamps = foot_stamps(final, [field_box, road_box], 8)
    (d / "decals").mkdir(parents=True, exist_ok=True)
    for i, st in enumerate(stamps):
        st.save(d / "decals" / f"stamp_{i}.png")
    # trees on the meadow at real in-game size
    spots = {"mixte": (330, 430, False), "bouleaux": (330, 1000, False), "bord": (800, 990, True)}
    feet = []
    for nm, (cx, foot, fl) in spots.items():
        c = build_cluster(nm, real, fl)
        base.alpha_composite(c, (cx - c.width // 2, foot - c.height))
        feet.append((cx, foot, c.width))
    # decals anchoring the feet of the clusters: grain stamps over the foot line, in front
    si = 0
    for cx, foot, w in feet:
        for k in (-0.38, 0.0, 0.34):
            if stamps:
                st = stamps[si % len(stamps)]
                si += 1
                base.alpha_composite(st, (int(cx + k * w) - 28, foot - 22))
    base.convert("RGB").save(d / "arbres/amas_sur_morceau.webp", quality=90) if (d / "arbres").mkdir(parents=True, exist_ok=True) is None else None
    S3.board(d / "arbres/planche.webp", base.convert("RGB"), (0.25, 0.6), S3.TARGET["arbres"], [Image.open(ISO / "foret/melangee.webp").convert("RGBA").resize((448, 384))])
    # objets on the field, no painted shadow
    base2 = final.convert("RGBA")
    objs = {}
    for nm in OBJ:
        f = OUT / "objets" / f"{nm}.png"
        if f.exists():
            objs[nm] = keyed(f)
            objs[nm].save(OUT / "objets" / f"{nm}_coupe.webp", quality=92)
    place = {"stook1": (640, 700, 100), "stook2": (840, 760, 96), "stook3": (560, 620, 92)}
    for nm, (x, y, w) in place.items():
        if nm in objs:
            o = objs[nm].resize((w, round(objs[nm].height * w / objs[nm].width)), Image.LANCZOS)
            base2.alpha_composite(o, (x - w // 2, y - o.height))
    for nm, (x, y, h) in {"scarecrow1": (760, 600, 210), "scarecrow2": (960, 660, 200)}.items():
        if nm in objs:
            o = objs[nm].resize((round(objs[nm].width * h / objs[nm].height), h), Image.LANCZOS)
            base2.alpha_composite(o, (x - o.width // 2, y - o.height))
    # feet anchored with meadow stamps
    for (x, y), st in zip([(640, 700), (840, 760), (560, 620), (760, 600), (960, 660)], stamps[3:]):
        base2.alpha_composite(st, (x - 28, y - 22))
    (d / "objets").mkdir(parents=True, exist_ok=True)
    base2.convert("RGB").save(d / "objets/objets_sur_champ.webp", quality=90)
    S3.board(d / "objets/planche.webp", base2.convert("RGB"), (0.55, 0.6), (0, 950, 420, 1200), [Image.open(OUT / "objets" / f"{n}.png") for n in ("stook1", "scarecrow1") if (OUT / "objets" / f"{n}.png").exists()])
    sd = Image.alpha_composite(final.convert("RGBA"), Image.new("RGBA", final.size))
    for i, st in enumerate(stamps):
        sd.alpha_composite(st, (150 + 150 * (i % 5), 120 + 120 * (i // 5)))
    S3.board(d / "decals/planche.webp", sd.convert("RGB"), (0.3, 0.2), S3.TARGET["decals"], [Image.open(d / "decals" / f"stamp_{i}.png").convert("RGB").resize((224, 160)) for i in range(2) if (d / "decals" / f"stamp_{i}.png").exists()])


CHOICE = {"meadow": "meadow_v0"}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd")
    ap.add_argument("args", nargs="*")
    ap.add_argument("--base")
    ap.add_argument("--n", type=int, default=2)
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--meadow", default="meadow_v0")
    a = ap.parse_args()
    CHOICE["meadow"] = a.meadow
    if a.cmd == "meadow":
        cmd_meadow(a.n, a.start)
    elif a.cmd == "road":
        cmd_road(a.base, a.n, a.start)
    elif a.cmd == "field":
        cmd_field(a.base, a.n, a.start)
    elif a.cmd == "objets":
        cmd_objets(a.args or list(OBJ))
    elif a.cmd == "scene":
        cmd_scene()
    elif a.cmd == "mergeroad":
        cmd_mergeroad(*a.args)
    elif a.cmd == "piece":
        cmd_piece(*a.args)
