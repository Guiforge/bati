#!/usr/bin/env python3
"""Loupe BC sondes-12 (round 6): three retouches of the r5 corner stamp, in this order.

    python3 scripts/iso/loupe_bc_sondes12.py prep | paint [--try N] [--n 3]
        | build [--pick vK --try N] | diff | mesure | planche

  1. road head, FLUX 3 in context: a window of the REAL capture (image 1) plus the style sheet only, repainted, brought back to
     raw tones and kept only under a tight hand-shaped soft mask, over the r5 pixels. The stamp's alpha is never raised.
     No pick (or `--pick none`): the r5 pixels stay and the stamp only receives 2 and 3.
  2. south light, procedural, whole stamp: a luma S-curve around the ground's own mean (mean barely moves) and a chroma lift
     that tapers on already saturated pixels, so wheat, vegetables, meadow and road keep their own hues.
  3. cold shadows, procedural, whole stamp: dark ground pixels move to slate by a soft luma mask, luminance kept; the
     warm painted shadows under the cottages go with them.

Output bc/r6/sondes/sol_r6.webp and bc/r6/stamps.json (tile 25,24, band t4-6). Dev only. FLUX goes through iso_loop's
registry (reserve and settle); cible.png and moodboard/ are used for measuring only and never sent anywhere.
"""
import argparse
import concurrent.futures
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import loupe_bc_sondes5 as S5
import loupe_bc_sondes6 as M
import loupe_bc_sondes10 as S10
import loupe_targets as T
import mesure_ombres_bleues as MO
from iso_loop import FLUX3, guard_endpoint, reserve, settle
from lib import flux
from PIL import Image, ImageChops, ImageDraw, ImageFilter

BC = T.LOUPES / "bc"
SRC = BC / "r5/sondes/sol_r5.webp"
CAPTURE = BC / "r5/captures-2/p06-jour.png"
CIBLE = T.LOUPES / "targets/p06-jour/cible.png"  # measuring only
OUT = BC / "r6/sondes"
CACHE = flux.ORIGINALS.parent / "loupes-sondes12"
OFFSET = (0, 410)  # where the crop sits in the stamp canvas (as sondes-11)
UP, TOP, BOT = S10.UP, S10.TOP, S10.BOT
CW, CH = S10.CW, S10.CH
WIN = (130, 1384, 482, 1640)  # screen px, multiples of 16 once doubled
EACH = 0.06
# hand-shaped footprint of change 1, screen px: the road head and its edges, nothing of the palisade, the posts or the plots
# hand-shaped footprint of change 1, screen px: the whole old hook (its left lobe, the head and the pale smear left of it), the new
# straight ribbon to the gate gap and the meadow between; never the palisade, the gate posts or the cart
MASK1 = [(150, 1446), (230, 1420), (330, 1418), (356, 1426), (384, 1430), (420, 1448), (440, 1500), (432, 1560), (436, 1630), (330, 1630), (262, 1618), (205, 1590), (160, 1530)]
BLUR1 = 8  # raw px
OLD_ROAD = [(190, 1470), (235, 1425), (345, 1422), (372, 1440), (342, 1468), (330, 1500), (350, 1540), (385, 1585), (385, 1600), (300, 1600), (256, 1592), (212, 1560), (186, 1520)]  # the old hook, screen px
RIBBON_CENTRE = [(425, 1640), (418, 1590), (402, 1540), (386, 1490), (372, 1460), (364, 1442)]  # new road, from beside the cart up to the gate gap
RIBBON_HALF = 42
HEAD_LEFT = 10  # the stretch left of the road is spread over this many px: 70 px streaked the meadow
HEAD_SHIFT = [(1384, 0), (1402, 40), (1434, 62), (1470, 74), (1500, 72), (1535, 42), (1565, 10), (1592, 0), (1640, 0)]  # screen y, px to the right
PROMPT = (
    "Paint over image 1, a crop of a screenshot of an isometric village game, keeping its exact camera, framing, scale, ink style "
    "and every painted element that is not named below, exactly as it is. The style is given by images 2 and 3: Franco-Belgian "
    "comic ink, matte, two or three values per surface, warm late-afternoon light from the top left. "
    "Image 1 shows a meadow with a faint pale sand ribbon laid over it, going straight from the road at the bottom, just right of "
    "the wooden cart, up to the opening between the two gate posts of the wooden palisade at the top. Paint this ribbon as the same "
    "road as the one below it: one sand road of full width, straight, no bend, no hook, no curl, no loop, no side branch, no stray "
    "tongue of sand, joining the road below without a seam, with two faint parallel wheel ruts running straight into the gate "
    "opening, the same warm pale sand as the road below, small stones and tufts along its irregular edges where the grass bites in. "
    "Everywhere else around the ribbon it is plain olive meadow with grass tufts and a few flowers: no other road, no sand, no path. "
    "Every building, palisade fence, gate post, cart and villager stays exactly where it is. No cross, no post with a crossbar, no "
    "scarecrow, no religious symbol, no trees, no cast shadows on the ground, no text, no letters, no glossy surfaces, no noise "
    "texture, no vignette, no sky, no small symbols or icons.\n"
)

# zones for the measurements (screen px, x0, y0, x1, y1), on the 1080 x 2400 frame; the target is the same frame at factor 1.5
ZONES = {
    "prairie": ((800, 1450, 940, 1520), (660, 1500, 760, 1580)),
    "ble": ((110, 1580, 260, 1650), (100, 1490, 300, 1590)),
    "route": ((480, 1710, 520, 1780), (520, 1500, 590, 1560)),
}
SHADE_RECTS = {"prairie": (800, 1450, 140, 70), "route": (470, 1710, 60, 100), "ble": (110, 1580, 150, 70)}


# ------------------------------------------------------------------------------------------------------- stamp <-> crop
def load_crop(path=SRC):
    st = Image.open(path).convert("RGBA")
    return st, st.crop((OFFSET[0], OFFSET[1], OFFSET[0] + CW, OFFSET[1] + CH))


def to_crop(x, y):
    return (x * UP, (y - TOP) * UP)


def mask1():
    m = Image.new("L", (CW, CH), 0)
    ImageDraw.Draw(m).polygon([to_crop(x, y) for x, y in MASK1], fill=255)
    return m.filter(ImageFilter.GaussianBlur(BLUR1))


# -------------------------------------------------------------------------------------------------------- 1. FLUX window
def window_in():
    x0, y0, x1, y1 = WIN
    return Image.open(CAPTURE).convert("RGB").crop(WIN).resize(((x1 - x0) * UP, (y1 - y0) * UP), Image.LANCZOS)


def ghost_in():
    """Image 1 for FLUX: the real capture window, the old hook covered by meadow cloned from the meadow beside it, a pale sand ribbon
    laid straight from the road to the gate gap. Only a hint: the model repaints it."""
    im = window_in()
    x0, y0, x1, y1 = WIN
    patch = Image.open(CAPTURE).convert("RGB").crop((445, 1505, 535, 1570)).resize((135, 98), Image.LANCZOS)
    tex = Image.new("RGB", im.size)
    for ty in range(0, im.height, patch.height):
        for tx in range(0, im.width, patch.width):
            tex.paste(patch if (tx // patch.width + ty // patch.height) % 2 == 0 else patch.transpose(Image.FLIP_LEFT_RIGHT), (tx, ty))
    tex = tex.filter(ImageFilter.GaussianBlur(14))  # a flat meadow tone: the model paints its own tufts, a cloned pattern would repeat
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).polygon([((x - x0) * UP, (y - y0) * UP) for x, y in OLD_ROAD], fill=255)
    m = m.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(6))
    im = Image.composite(tex, im, m)
    rib = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(rib)
    pts = [((x - x0) * UP, (y - y0) * UP) for x, y in RIBBON_CENTRE]
    for a, b in zip(pts, pts[1:]):
        d.line([a, b], fill=255, width=RIBBON_HALF * 2 * UP)
    for x, y in pts:
        d.ellipse((x - RIBBON_HALF * UP, y - RIBBON_HALF * UP, x + RIBBON_HALF * UP, y + RIBBON_HALF * UP), fill=255)
    rib = rib.filter(ImageFilter.GaussianBlur(10)).point(lambda v: round(v * 0.8))
    return Image.composite(Image.new("RGB", im.size, (206, 188, 150)), im, rib)


def prep():
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    im = ghost_in()
    im.save(CACHE / "in.png")
    im.save(OUT / "entree.png")
    print("window", WIN, im.size)


def paint(attempt, n):
    guard_endpoint(FLUX3)
    d = OUT / f"fen_try{attempt}"
    d.mkdir(parents=True, exist_ok=True)
    cache = CACHE / d.name
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"v{i}.png" for i in range(n)]
    if any(o.exists() for o in outs) or any(d.glob("v?.png")):
        sys.exit("variants exist: pass --try")
    w, h = window_in().size
    batch = reserve(n, EACH, f"loupe bc sondes12 {d.name}", None)
    responses: list = []

    def one(io):
        flux.generate(slug="loupe_bc_sondes12", prompt=PROMPT, out=io[1], width=w, height=h, attempts=1,
                      references=(CACHE / "in.png", *M.STYLE), extra={"width": w, "height": h}, submitted_log=responses,
                      endpoint=FLUX3, seed=12000 + 100 * attempt + io[0])

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            list(pool.map(one, enumerate(outs)))
    finally:
        entry = settle(batch, responses)
    for o in outs:
        if o.exists():
            Image.open(o).convert("RGB").save(d / o.name)
    (d / "prompt.txt").write_text(PROMPT)
    print(json.dumps({"made": [o.name for o in outs if o.exists()], "cost": entry["cost"]}))


def match_tones(v):
    """FLUX re-tones a whole window (lighter, more contrast). Per channel mean and spread of the variant are set to the input's on the
    window's untouched ground: outside mask1's footprint grown by 40 px and outside every sprite, both blurred."""
    inp = window_in()
    x0, y0, x1, y1 = WIN
    foot = Image.new("L", (CW, CH), 0)
    ImageDraw.Draw(foot).polygon([to_crop(x, y) for x, y in MASK1], fill=255)
    foot = foot.filter(ImageFilter.MaxFilter(81)).crop((x0 * UP, (y0 - TOP) * UP, x1 * UP, (y1 - TOP) * UP))
    spr = sprite_mask((1080, 2400), 12).crop(WIN).resize(inp.size, Image.NEAREST)
    ok = Image.eval(ImageChops.lighter(foot, spr), lambda p: 255 - p)
    a, b = inp.filter(ImageFilter.GaussianBlur(3)), v.filter(ImageFilter.GaussianBlur(3))
    out = []
    for ca, cb, cv in zip(a.split(), b.split(), v.split()):
        xs = [(p, q) for p, q, m in zip(ca.getdata(), cb.getdata(), ok.getdata()) if m][::7]
        ma, mb = sum(p for p, _ in xs) / len(xs), sum(q for _, q in xs) / len(xs)
        sa = (sum((p - ma) ** 2 for p, _ in xs) / len(xs)) ** 0.5
        sb = (sum((q - mb) ** 2 for _, q in xs) / len(xs)) ** 0.5
        out.append(cv.point(lambda t, g=sa / sb, ma=ma, mb=mb: max(0, min(255, round(ma + g * (t - mb))))))
        print("tone match", round(ma, 1), round(mb, 1), "spread", round(sa, 1), round(sb, 1), "n", len(xs))
    return Image.merge("RGB", out)


def match_tone_road(v):
    """The new road painted lighter and pinker than the r5 road: its mean colour is brought to the old road's (a patch of the old
    road in the capture against a patch of the new one, both away from the edges), only under the ribbon."""
    inp = window_in()
    x0, y0, x1, y1 = WIN

    def mean(im, r):
        px = list(im.crop(tuple((a - o) * UP for a, o in zip(r, (x0, y0, x0, y0)))).getdata())
        return [sum(p[i] for p in px) / len(px) for i in range(3)]

    old, new = mean(inp, (232, 1486, 292, 1546)), mean(v, (388, 1500, 420, 1560))
    f = [o / n for o, n in zip(old, new)]
    print("road tone factor", [round(x, 3) for x in f])
    rib = Image.new("L", v.size, 0)
    d = ImageDraw.Draw(rib)
    pts = [((x - x0) * UP, (y - y0) * UP) for x, y in RIBBON_CENTRE]
    d.line(pts, fill=255, width=(RIBBON_HALF + 8) * 2 * UP)
    rib = rib.filter(ImageFilter.GaussianBlur(14))
    scaled = Image.merge("RGB", [c.point(lambda t, k=k: max(0, min(255, round(t * k)))) for c, k in zip(v.split(), f)])
    return Image.composite(scaled, v, rib)


def apply_window(crop, pick, attempt, k):
    """The variant in raw tones, under mask1, over the crop's RGB; alpha is the crop's own. FLUX saw the real capture, so the veil
    over the stamp (slope and offset `k` per channel, fitted on the capture) is undone before the tint is."""
    x0, y0, x1, y1 = WIN
    v = Image.open(OUT / f"fen_try{attempt}" / f"{pick}.png").convert("RGB").resize(((x1 - x0) * UP, (y1 - y0) * UP), Image.LANCZOS)
    v = match_tone_road(match_tones(v))
    v = Image.merge("RGB", [c.point(lambda t, f=f: max(0, min(255, round((t - f[1]) / f[0])))) for c, f in zip(v.split(), k)])
    layer = Image.new("RGB", crop.size)
    layer.paste(M.tint(v, inverse=True), (x0 * UP, (y0 - TOP) * UP))
    rgb = Image.composite(layer, crop.convert("RGB"), mask1())
    rgb.putalpha(crop.getchannel("A"))
    return rgb


def warp_head(crop):
    """Tighten the road's hook by sliding the painted ground sideways: stones, ruts and width stay the r5 paint, no FLUX.
    Horizontal only, zero outside the rows of WIN and left of HEAD_LEFT, alpha stays the crop's. Slope stays under 1, so nothing folds."""

    def shift_at(y):
        for (y0, d0), (y1, d1) in zip(HEAD_SHIFT, HEAD_SHIFT[1:]):
            if y0 <= y <= y1:
                t = (y - y0) / (y1 - y0)
                return d0 + (d1 - d0) * t * t * (3 - 2 * t)
        return 0.0

    def smooth(t):
        t = max(0.0, min(1.0, t))
        return t * t * (3 - 2 * t)

    rgb = crop.convert("RGB")
    src, dst = rgb.load(), rgb.copy()
    out = dst.load()
    x0, y0, x1, y1 = HEAD_LEFT, WIN[1], WIN[2], WIN[3]
    for cy in range((y0 - TOP) * UP, (y1 - TOP) * UP):
        d = shift_at(cy / UP + TOP) * UP
        for cx in range(x0 * UP, x1 * UP):
            sx = cx / UP
            sxf = cx - d * smooth((sx - x0) / 200) * smooth((x1 - sx) / 142)
            i = int(sxf)
            f = sxf - i
            a, b = src[i, cy], src[i + 1, cy]
            out[cx, cy] = tuple(round(a[k] * (1 - f) + b[k] * f) for k in range(3))
    dst.putalpha(crop.getchannel("A"))
    return dst


# ------------------------------------------------------------------------------ 4. straight edges (loupe BC r6, criterion 5)
# Screen px (1080 x 2400 frame; the route crop of the loupe is this frame from y 1512, 1:1).
BLE_BORD = ((60, 1631), (216, 1716))  # the wheat bed's straight lower left edge, about 4.5 tiles
BLE_DONNEUR = 38  # grass is cloned from this far outwards (down left) of the edge
PATH_X = (574, 672)  # the pasture path's straight stretch; the fence post stands right of 676 and stays
PATH_Y = 1512 + 376  # its centre row at mid stretch, screen px
PATH_AMP = 6.0  # px sideways at the largest bend
PATH_HALF = 24  # rows moved above and below the centre line (the path is about 20 px wide), tapering to zero


def _smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def retouche_ble(crop):
    """Break the wheat bed's ruler-straight lower edge in two moves, RGB only, alpha never touched. (1) A slight wave: the pixels within
    8 px inside and 16 px outside of the edge slide along its normal by at most 7.5 px (two sines), so the ink fringe stays sharp and the
    line bends. (2) Tongues: small hard-edged triangles of meadow cloned from 36 px outside notch the soil, and triangles of soil cloned
    from just inside push out into the grass, alternately. The rows, the stooks and the plot's far edges are out of reach (no move goes
    more than 8 px inside, where only bare soil lies)."""
    import math
    import random

    rnd = random.Random(60606)
    (ax, ay), (bx, by) = BLE_BORD
    L = math.hypot(bx - ax, by - ay)
    tx, ty = (bx - ax) / L, (by - ay) / L
    nx, ny = (-ty, tx) if tx > 0 else (ty, -tx)  # outwards of the bed: down and left
    if ny < 0:
        nx, ny = -nx, -ny
    rgb = crop.convert("RGB")
    base = rgb.copy()
    src, out = base.load(), rgb.load()
    ph = rnd.uniform(0, 6.28)
    for cy in range(round((min(ay, by) - 24 - TOP) * UP), round((max(ay, by) + 26 - TOP) * UP)):
        for cx in range(round((min(ax, bx) - 24) * UP), round((max(ax, bx) + 26) * UP)):
            px, py = cx / UP, cy / UP + TOP
            t = (px - ax) * tx + (py - ay) * ty
            s = (px - ax) * nx + (py - ay) * ny  # > 0 outside
            if t < -4 or t > L + 4 or s < -8 or s > 16:
                continue
            fade = _smooth((s + 8) / 8) * _smooth((16 - s) / 10) * _smooth((t + 4) / 12) * _smooth((L + 4 - t) / 12)
            d = 7.5 * (0.6 * math.sin(t / 17 + ph) + 0.4 * math.sin(t / 7.3 + 2 * ph)) * fade
            sx, sy = cx - d * nx * UP, cy - d * ny * UP
            i, j = int(sx), int(sy)
            fx, fy = sx - i, sy - j
            q = [src[i, j], src[i + 1, j], src[i, j + 1], src[i + 1, j + 1]]
            out[cx, cy] = tuple(
                round(q[0][k] * (1 - fx) * (1 - fy) + q[1][k] * fx * (1 - fy) + q[2][k] * (1 - fx) * fy + q[3][k] * fx * fy)
                for k in range(3)
            )
    warped = rgb.copy()
    t, grass = 8.0, True
    while t < L - 8:
        wdt, dep = rnd.uniform(10, 17), rnd.uniform(4.5, 9)
        if grass:  # meadow into the soil: base on the edge, apex inside
            quad = [(t, 1.0), (t + wdt, 1.0), (t + wdt * rnd.uniform(0.3, 0.7), -dep)]
            donor = (36 + rnd.uniform(-4, 6), rnd.uniform(-16, 16))
        else:  # soil out into the meadow
            quad = [(t, -1.0), (t + wdt, -1.0), (t + wdt * rnd.uniform(0.3, 0.7), dep)]
            donor = (-11 + rnd.uniform(-2, 1), rnd.uniform(-20, 20))
        pts = [((ax + tx * u + nx * v) * UP, (ay + ty * u + ny * v - TOP) * UP) for u, v in quad]
        m = Image.new("L", crop.size, 0)
        ImageDraw.Draw(m).polygon(pts, fill=255)
        m = m.filter(ImageFilter.GaussianBlur(0.8 * UP / 2))
        dx, dy = nx * donor[0] + tx * donor[1], ny * donor[0] + ty * donor[1]
        shifted = ImageChops.offset(warped, -round(dx * UP), -round(dy * UP))
        rgb.paste(shifted, (0, 0), m)
        t += wdt + rnd.uniform(5, 14)
        grass = not grass
    rgb.putalpha(crop.getchannel("A"))
    return rgb


def ondule_chemin(crop):
    """Give the pasture path a slight wave by a small vertical warp (as `warp_head` does for the road, here on rows): inside PATH_X
    only, tapering to zero at both ends and above and below the path, so the road, the fence and the grass keep their pixels.
    Slope stays under 1. Alpha stays the crop's."""
    import math

    rgb = crop.convert("RGB")
    src, dst = rgb.load(), rgb.copy()
    out = dst.load()
    x0, x1 = PATH_X
    for cx in range(x0 * UP, x1 * UP):
        u = (cx / UP - x0) / (x1 - x0)
        d = PATH_AMP * math.sin(3 * math.pi * u) * _smooth(u / 0.15) * _smooth((1 - u) / 0.15)
        # the path's own centre line drifts down 11 px over the stretch (it is not level): follow it
        yc = PATH_Y + 11 * (u - 0.5)
        for cy in range(round((yc - PATH_HALF - TOP) * UP), round((yc + PATH_HALF - TOP) * UP)):
            sy = cy / UP + TOP
            sf = cy - d * UP * _smooth(1 - abs(sy - yc) / PATH_HALF)
            i = int(sf)
            f = sf - i
            a, b = src[cx, i], src[cx, i + 1]
            out[cx, cy] = tuple(round(a[k] * (1 - f) + b[k] * f) for k in range(3))
    dst.putalpha(crop.getchannel("A"))
    return dst


# -------------------------------------------------------------------------------------------- 2 and 3, procedural grading
def luma(p):
    return (299 * p[0] + 587 * p[1] + 114 * p[2]) // 1000


def calibrated(s5, k):
    return Image.merge("RGB", [c.point(lambda v, f=f: max(0, min(255, round(f[0] * v + f[1])))) for c, f in zip(s5.split(), k)])


def stamp_visible(cap, s5, k, tol=45):
    """Frame mask (255) of the pixels where the capture shows the stamp itself: the capture matches the calibrated r5 simulation
    (sprites, villagers and their ink do not), and the stamp is opaque there."""
    cal = calibrated(s5, k)
    diff = ImageChops.difference(cal, cap)
    r, g, b = diff.split()
    near = ImageChops.add(ImageChops.add(r, g), b).point(lambda v: 255 if v < tol else 0).filter(ImageFilter.MinFilter(5))
    a = Image.new("L", cap.size, 0)
    a.paste(Image.open(CACHE / "crop_r5.png").getchannel("A").resize((1080, BOT - TOP), Image.LANCZOS).point(lambda v: 255 if v > 200 else 0), (0, TOP))
    return ImageChops.multiply(ImageChops.multiply(near, a), Image.eval(sprite_mask(cap.size, 6), lambda p: 255 - p))


def ground_pixels(crop):
    a = crop.getchannel("A")
    return [p for p, al in zip(crop.convert("RGB").getdata(), a.getdata()) if al > 128]


PARAMS = {"gamma": 1.1, "pivot_shift": -3, "green": 0.16, "cold": (-6, -4, 16)}
# hand-drawn soft polygons of the painted shadows on the ground under the two cottages, screen px (dark ground only inside them)
SHADOWS = [
    [(348, 1788), (370, 1793), (395, 1810), (387, 1820), (360, 1828), (332, 1836), (323, 1828), (337, 1813), (343, 1800)],
    [(727, 1775), (747, 1790), (767, 1800), (757, 1810), (727, 1813), (707, 1817), (710, 1793), (723, 1780)],
]


def grade(crop, prm=PARAMS):
    """2 then 3, both light. 2: a mild luma S-curve around the ground's own mean, ratio-preserving, and a small chroma lift on
    green-olive pixels only (the road and the wheat keep the r5 colours). 3: only inside the SHADOWS polygons, only on their darker
    pixels, a small slate shift. Alpha untouched."""
    ls = sorted(luma(p) for p in ground_pixels(crop))
    pivot = sum(ls) / len(ls) + prm["pivot_shift"]
    g = prm["gamma"]
    curve = []
    for x in range(256):
        if x < pivot:
            y = pivot * (x / pivot) ** g
        else:
            y = 255 - (255 - pivot) * ((255 - x) / (255 - pivot)) ** g
        curve.append(y)
    dr, dg, db = prm["cold"]
    rgb, al = crop.convert("RGB"), crop.getchannel("A")
    sh = Image.new("L", crop.size, 0)
    for poly in SHADOWS:
        ImageDraw.Draw(sh).polygon([to_crop(x, y) for x, y in poly], fill=255)
    sh = sh.filter(ImageFilter.GaussianBlur(7))
    inside = sorted(luma(p) for p, m in zip(rgb.getdata(), sh.getdata()) if m > 200)
    lo, hi = inside[len(inside) // 2], inside[int(len(inside) * 0.85)]  # median and 85th percentile of the shadows' own luma
    out = []
    for p, a, m in zip(rgb.getdata(), al.getdata(), sh.getdata()):
        if a == 0:
            out.append(p)
            continue
        l = luma(p)
        ly = curve[l]
        gain = ly / max(l, 1)
        c = [v * gain for v in p]
        # green-olive only: G at or above R and clearly above B
        gw = max(0.0, min(1.0, (p[1] - p[0] + 10) / 10)) * max(0.0, min(1.0, (p[1] - p[2] - 6) / 14))
        k = 1 + prm["green"] * gw
        c = [ly + k * (v - ly) for v in c]
        t = 1.0 if l <= lo else 0.0 if l >= hi else 1 - (l - lo) / max(1, hi - lo)
        w = (m / 255) * t
        out.append(tuple(max(0, min(255, round(c[i] + w * d))) for i, d in enumerate((dr, dg, db))))
    res = Image.new("RGB", crop.size)
    res.putdata(out)
    res.putalpha(al)
    return res, {"pivot": round(pivot, 1), "shadow_luma": (lo, hi)}


# --------------------------------------------------------------------------------------------------------------- build
def build(pick, attempt):
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    stamp, base = load_crop()
    base.save(CACHE / "crop_r5.png")
    cap = Image.open(CAPTURE).convert("RGB")
    s5 = sim(CACHE / "crop_r5.png")
    vk = veil_slopes(s5, cap)
    step1 = ondule_chemin(retouche_ble(warp_head(base))) if pick == "warp" else apply_window(base, pick, attempt, vk) if pick else base.copy()
    step1.save(CACHE / "crop_step1.png")
    final, info = grade(step1)
    final.save(CACHE / "crop_r6.png")
    canvas = stamp.copy()
    canvas.paste(final, OFFSET)
    canvas.save(OUT / "sol_r6.webp", lossless=True)
    (OUT.parent / "stamps.json").write_text(json.dumps([{"asset": "sondes/sol_r6.webp", "tile": list(S10.TILE), "flip": False, "band": "t4-6"}]))
    print("stamp", canvas.size, "pick", pick, info)


def shown(crop):
    """What the game shows of a stamp crop: tint (the capture's own raw -> screen map), alpha, over the baseline capture."""
    return S10.shown(crop)


def diff():
    """Proof of change 1: step1 against r5, outside mask1's footprint, on every pixel either shows, and the alpha everywhere."""
    a, b = Image.open(CACHE / "crop_r5.png"), Image.open(CACHE / "crop_step1.png")
    foot = mask1().point(lambda v: 255 if v > 0 else 0)
    shown_px = ImageChops.lighter(a.getchannel("A"), b.getchannel("A")).point(lambda v: 255 if v else 0)
    ch = ImageChops.multiply(ImageChops.difference(a.convert("RGB"), b.convert("RGB")).convert("L").point(lambda v: 255 if v else 0), shown_px)
    n_out = sum(ImageChops.multiply(ch, Image.eval(foot, lambda p: 255 - p)).histogram()[1:])
    n_in = sum(ImageChops.multiply(ch, foot).histogram()[1:])
    n_alpha = sum(ImageChops.difference(a.getchannel("A"), b.getchannel("A")).point(lambda v: 255 if v else 0).histogram()[1:])
    f, r6 = Image.open(CACHE / "crop_r6.png"), Image.open(OUT / "sol_r6.webp").convert("RGBA")
    n_alpha_final = sum(ImageChops.difference(a.getchannel("A"), r6.crop((OFFSET[0], OFFSET[1], OFFSET[0] + CW, OFFSET[1] + CH)).getchannel("A")).point(lambda v: 255 if v else 0).histogram()[1:])
    r5full = Image.open(SRC).convert("RGBA")
    n_alpha_stamp = sum(ImageChops.difference(r5full.getchannel("A"), r6.getchannel("A")).point(lambda v: 255 if v else 0).histogram()[1:])
    print(json.dumps({"step1_px_changed_outside_window": n_out, "step1_px_changed_inside": n_in, "step1_alpha_diff_px": n_alpha,
                      "final_alpha_diff_px_crop": n_alpha_final, "final_alpha_diff_px_whole_stamp": n_alpha_stamp, "px_shown": sum(shown_px.histogram()[1:])}))
    return n_out + n_alpha + n_alpha_stamp


# ------------------------------------------------------------------------------------------------------------ measures
def zone_stats(img, r):
    px = list(img.convert("RGB").crop(r).getdata())
    ls = sorted(luma(p) for p in px)
    n = len(px)
    sat = [(max(p) - min(p)) / max(1, max(p)) * 100 for p in px]
    mean = [sum(p[i] for p in px) / n for i in range(3)]
    return {"L": round(sum(ls) / n, 1), "p10": ls[n // 10], "p90": ls[n * 9 // 10], "sat": round(sum(sat) / n, 1), "rgb": [round(m) for m in mean]}


def sim(path_crop):
    return shown(Image.open(path_crop)).crop((0, 0, 1080, 2400))


def sprite_mask(size, margin=30):
    """255 where a sprite or a forest polygon covers the stamp on screen (frame px)."""
    bad = Image.new("L", size, 0)
    bd = ImageDraw.Draw(bad)
    for s in M.DUMP["sprites"]:
        bd.rectangle((s["x"] - margin, s["y"] - margin, s["x"] + s["w"] + margin, s["y"] + s["h"] + margin), fill=255)
    for pol in S5.TREES + S5.GAP:
        bd.polygon(pol, fill=255)
    return bad


def veil_slopes(s5, cap):
    """Per channel slope of capture against the r5 simulation on sprite-free ground, both blurred: the capture has a veil over the
    stamp that the simulation lacks, so a change of the stamp reaches the screen scaled by this slope."""
    a, b = s5.filter(ImageFilter.GaussianBlur(6)), cap.filter(ImageFilter.GaussianBlur(6))
    bad = sprite_mask(a.size)
    out = []
    for ch in range(3):
        xs, ys = [], []
        for y in range(1340, 2360, 9):
            for x in range(40, 1040, 9):
                if bad.getpixel((x, y)) == 0:
                    xs.append(a.getpixel((x, y))[ch])
                    ys.append(b.getpixel((x, y))[ch])
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        k = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
        out.append((k, my - k * mx))
    return out


def predicted(cap, s5, s6, k):
    """What the capture will show: the r5 capture plus the simulated change of the stamp, scaled by the veil's slope, only where the
    capture shows the stamp itself (not a sprite, a fence or a shadow sprite over it)."""
    free = stamp_visible(cap, s5, k, tol=130).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1))
    chans = []
    for c, x, y, kk in zip(cap.split(), s5.split(), s6.split(), (f[0] for f in k)):
        vals = [max(0, min(255, round(cv + kk * (yv - xv) * fr / 255))) for cv, xv, yv, fr in zip(c.getdata(), x.getdata(), y.getdata(), free.getdata())]
        ch = Image.new("L", c.size)
        ch.putdata(vals)
        chans.append(ch)
    return Image.merge("RGB", chans)


def mesure():
    cap, tgt = Image.open(CAPTURE).convert("RGB"), Image.open(CIBLE).convert("RGB").resize((1080, 2400), Image.LANCZOS)
    s5, s6 = sim(CACHE / "crop_r5.png"), sim(CACHE / "crop_r6.png")
    k = veil_slopes(s5, cap)
    s5_raw = s5
    print("veil slope capture/simulation per channel", [round(v[0], 3) for v in k])
    p6 = predicted(cap, s5, s6, k)
    cap.save(CACHE / "sim_r5.png")
    p6.save(CACHE / "sim_r6.png")
    s5, s6 = cap, p6  # from here on: the r5 capture itself, and the capture as r6 will make it
    rows = {}
    for name, (rc, rt) in ZONES.items():
        rows[name] = {"r5 (capture)": zone_stats(s5, rc), "r6 (predicted)": zone_stats(s6, rc), "cible": zone_stats(tgt, rt)}
        print(name)
        for lab, v in rows[name].items():
            print("   ", lab.ljust(14), v)
    # whole stamp: mean luma of the shown ground, and the darkest 10 % (what criterion 10 reads, here on the stamp alone)
    for tag, path in (("r5", CACHE / "crop_r5.png"), ("r6", CACHE / "crop_r6.png")):
        px = ground_pixels(Image.open(path))
        ls = [luma(p) for p in px]
        print(f"stamp {tag}: mean raw luma {sum(ls) / len(ls):.1f}, n {len(ls)}")
    for tag, im in (("r5", s5), ("r6", s6)):
        sh = {k: MO.measure(im, r)["mean_rgb"] for k, r in SHADE_RECTS.items()}
        print("darkest 10 % mean RGB, simulation", tag, sh)
    # criterion 10 on the whole visible ground: stamp alpha > 200 and no sprite or forest over it (the rects above can hold sprites)
    vis = stamp_visible(cap, s5_raw, k)
    for tag, im in (("r5", s5), ("r6", s6)):
        px = [p for p, al in zip(im.getdata(), vis.getdata()) if al]
        px.sort(key=luma)
        dk = px[: len(px) // 10]
        m = [round(sum(p[i] for p in dk) / len(dk), 1) for i in range(3)]
        print(f"darkest 10 % of the visible bare ground ({len(px)} px), {tag}", m, "PASS B>R and B>G" if m[2] > m[0] and m[2] > m[1] else "FAIL")


def planche():
    # the stamp as the game shows it without the olive veil (the veil's slope is not constant, a prediction through it blends
    # an old road back in under a big change): tint, alpha, over the baseline capture
    s5, s6 = sim(CACHE / "crop_r5.png"), sim(CACHE / "crop_r6.png")
    tgt = Image.open(CIBLE).convert("RGB").resize((1080, 2400), Image.LANCZOS)
    parts = []
    for box in ((0, 1380, 1080, 2400),):
        w = 540
        h = round((box[3] - box[1]) * w / 1080)
        row = Image.new("RGB", (3 * w + 20, h), (20, 20, 20))
        for i, im in enumerate((s5, s6, tgt)):
            row.paste(im.crop(box).resize((w, h), Image.LANCZOS), (i * (w + 10), 0))
        parts.append(row)
    x0, y0, x1, y1 = WIN
    det = Image.new("RGB", (2 * (x1 - x0) * 2 + 10, (y1 - y0) * 2), (20, 20, 20))
    for i, im in enumerate((s5, s6)):
        det.paste(im.crop(WIN).resize(((x1 - x0) * 2, (y1 - y0) * 2), Image.LANCZOS), (i * ((x1 - x0) * 2 + 10), 0))
    parts.append(det)
    out = Image.new("RGB", (max(p.width for p in parts), sum(p.height + 10 for p in parts)), (20, 20, 20))
    y = 0
    for p in parts:
        out.paste(p, (0, y))
        y += p.height + 10
    out.save(OUT / "planche_r6.webp", quality=88)
    out.save(CACHE / "planche_r6.png")
    print("planche", out.size)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=("prep", "paint", "build", "diff", "mesure", "planche"))
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    ap.add_argument("--n", type=int, default=3)
    ap.add_argument("--pick", default="none")
    a = ap.parse_args()
    if a.cmd == "prep":
        prep()
    elif a.cmd == "paint":
        paint(a.attempt, a.n)
    elif a.cmd == "build":
        build(None if a.pick == "none" else a.pick, a.attempt)
    elif a.cmd == "diff":
        sys.exit(1 if diff() else 0)
    elif a.cmd == "mesure":
        mesure()
    else:
        planche()
