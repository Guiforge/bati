#!/usr/bin/env python3
"""Loupe BC sondes-10 (round 4): LOCAL retouches of the r3 corner stamp, one small window at a time.

    python3 scripts/iso/loupe_bc_sondes10.py prep | paint --win A|B|C|D [--try N] [--n 3]
        | build [--picks A=v0,B=v1,C=v2,D=v0] [--tries A=1,...] | planche | diff
        | sousbois-prep | sousbois-paint [--try N] [--n 4] | sousbois-key [--try N] | sousbois-export --pick v0.s0,v1.s1,v2.s2 [--try N]

The r3 stamp (bc/r3/sondes/sol_r3.webp) is the base and stays pixel identical outside the windows. Each window is a crop
of the screen (r3 ground in the game's light, the kept sprites over it), repainted by FLUX 3 with the style sheet only,
brought back to raw tones and laid over the stamp under a hand-shaped soft mask. The stamp's crop grows to screen row 2480
so that the ground reaches the bottom of the phone. Reuses sondes-9, -8, -7, -6 and -5 (crop, tint, keep boxes, key, strips).
Dev only, nothing wired but the installed ground. FLUX through iso_loop's registry. cible.png is never sent to FLUX.
"""
import argparse
import concurrent.futures
import json
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import loupe_bc_sondes5 as S5
import loupe_bc_sondes6 as M
import loupe_bc_sondes7 as P
import loupe_bc_sondes8 as S8
import loupe_bc_sondes9 as S9
import loupe_targets as T
from cuire_sol import centre_px
from iso_loop import FLUX3, guard_endpoint, reserve, settle
from lib import flux
from PIL import Image, ImageChops, ImageDraw, ImageFilter

R3 = T.LOUPES / "bc/r3"
OUT = T.LOUPES / "bc/r4/sondes"
CACHE = flux.ORIGINALS.parent / "loupes-sondes10"
UP = 2
TOP, BOT = M.TOP, 2480  # the stamp's crop: screen rows 1300..2480
CW, CH = 1080 * UP, (BOT - TOP) * UP
FILL = M.FILL
TILE = (25, 24)

HEAD = (
    "Paint over image 1, a crop of a screenshot of an isometric village game, keeping its exact camera, framing, scale and "
    "every painted element that is not named below, as it is. The style is given by images 2 and 3: Franco-Belgian comic ink, "
    "matte, two or three values per surface, warm late-afternoon light from the top left. Every building, palisade fence, post "
    "and villager stays exactly where it is. No trees, no tree shadows, no cast shadows on the ground, no text, no letters, "
    "no glossy surfaces, no noise texture, no vignette, no sky, no small symbols or icons.\n"
)
ROAD = (
    "the road is a wide cart road of packed earth in a warm pale sand, clearly lighter and warmer than the meadow, with two "
    "faint interrupted wheel ruts, small stones and tufts along its irregular edges where grass bites into the sand, "
    "NO dark outline, its width varying a little"
)
PROMPTS = {
    "A": HEAD + "The upper part of image 1 is the finished ground: a meadow with a sand road winding down. The lower part is a flat unpainted "
    "placeholder colour. Paint that lower part as the same ground, down to the very bottom edge of the image: olive-golden meadow like "
    "#7A7A44 in sunlight with grass tufts, a few small flowers and pebbles; " + ROAD + ". The road keeps its winding course along the "
    "faint pale ribbon of image 1, is as wide at the bottom edge as anywhere, leaves the image through the bottom edge with no fade, no "
    "smoke, no mist, no rounded end and no cut end, and joins the finished road above as one single road: repaint the end of the finished "
    "road, which fades out in image 1, so that it keeps its full width and warm sand colour. Towards the left, the right and the bottom "
    "corners the meadow darkens slowly into a quiet forest floor: moss, dead leaves, ferns, packed brown earth, no trees.\n",
    "B": HEAD + "Retouch the ground and the left farm of image 1 only in the places below; everything else stays. "
    "1) The wheat plot keeps its rows and its stooks, but its base is a broken earth outline that dissolves into grass in "
    "irregular tongues, with no sharp diamond edge and no straight line. "
    "2) The cottage stands in an IRREGULAR yard of trodden earth: a rough blob, grass growing in at its edges, never a diamond, never a "
    "slab with corners, like a worn patch where people walk. "
    "3) Redraw the cottage itself so that it differs from other farm cottages: its gable end faces the lower right with a tall pointed "
    "front gable, a small round attic window and a dark timber frame on cream plaster, terracotta tiles, a stone chimney; "
    "beside it a small haystack and a bundle of tools leaning on the wall, nothing else. Remove the flat orange square and the "
    "stone block beside the cottage. "
    "4) No cast shadow on the ground beside the cottage: only a soft dark contact line at the foot of its walls. "
    "5) One worn track, two faint foot traces with frayed edges, goes from the cottage door to the sand road at the right. "
    "Keep the colours as saturated and warm as in image 1, do not wash anything out, and keep the cottage's ink outline as thick as in image 1. "
    "The yard and the wheat base have already been eaten into by grass in image 1: keep those irregular edges and make them even more ragged. "
    "6) The meadow in the far left of the image, which has a dark blurred band and a violet stain, becomes plain olive meadow with "
    "grass tufts, ending on a broken edge of tufts. Keep the sand road at the right as it is.\n",
    "C": HEAD + "Retouch only these places of image 1, everything else stays as it is: "
    "1) The thin worn track that leaves the sand road towards the vegetable plot reaches the plot's low wooden fence at its lower-left "
    "side, and a small wooden gate is set in the fence exactly where the track arrives. "
    "2) The farm cottage on the right: remove the flat orange square and the stone block beside it; no cast shadow on the ground beside "
    "it, only a soft dark contact line at the foot of its walls; keep its roof, walls and yard of trodden earth, with a woodpile and a "
    "barrel beside it. The worn track from its door to the sand road has soft frayed edges. "
    "3) The worn track to the pasture reaches the pasture's light timber fence and ends at a small wooden gate set in the fence. "
    "Tracks are two faint foot or wheel traces with soft frayed edges and grass biting in, never a smooth pale stroke. "
    "Keep the sand road itself, the plots, the sheep and the meadow as they are.\n",
    "D": HEAD + "Retouch only the ground at the foot of the palisade, in front of its opening between the two gate posts: ONE single branch of "
    "the sand road enters the opening, between the posts, and widens a little at the opening into worn trodden sand; no fork, no second "
    "branch, no square or straight cut, no flat slab, no dark outline. The road then continues down as in image 1, as one road, "
    "in the same warm pale sand with a faint wheel rut and frayed edges where grass bites in. The villager and the posts stay.\n",
}
SIZE = {"A": (0, 1952, 1080, 2480), "B": (0, 1496, 496, 1928), "C": (480, 1620, 904, 1988), "D": (150, 1380, 526, 1580)}
EACH = {"A": 0.10, "B": 0.08, "C": 0.08, "D": 0.06}
# hand-shaped masks, screen px, one polygon per sub-window; the road's own pixels stay out of them
MASK = {
    "A": [[(0, 2012), (150, 2000), (330, 2022), (500, 2000), (690, 2024), (860, 2002), (1080, 2016), (1080, 2480), (0, 2480)]],
    "B": [[(0, 1500), (190, 1500), (215, 1520), (252, 1560), (300, 1583), (375, 1607), (420, 1642), (452, 1680), (460, 1730), (450, 1780), (462, 1822), (480, 1860), (486, 1915), (0, 1915)]],
    "C1": [
        [(530, 1650), (600, 1640), (690, 1612), (760, 1598), (778, 1630), (742, 1676), (700, 1702), (620, 1706), (545, 1696)]],
    "C2": [
        [(525, 1722), (600, 1704), (700, 1702), (790, 1742), (806, 1800), (782, 1852), (700, 1884), (600, 1884), (562, 1842), (540, 1790)]],
    "C3": [
        [(552, 1856), (640, 1848), (700, 1856), (716, 1880), (722, 1900), (650, 1908), (560, 1908)],
    ],
    "D": [[(160, 1432), (250, 1418), (330, 1414), (400, 1424), (470, 1445), (500, 1480), (470, 1530), (380, 1556), (280, 1560), (190, 1540), (160, 1490)]],
}
BLUR = {"A": 14, "B": 9, "C": 8, "D": 8}  # per window letter  # mask softness, raw px


# ----------------------------------------------------------------------------------------------------- the stamp, in crop space
def r3_crop():
    """The r3 stamp as an RGBA crop of CW x CH (screen rows TOP..BOT), the tile centre's place in it, and r3's raw pixels."""
    st = Image.open(R3 / "sondes/sol_r3.webp").convert("RGBA")
    mk = Image.open(R3 / "sondes/masque.png").convert("L")
    ys = [y for y in range(0, st.height - mk.height + 1) if ImageChops.difference(st.getchannel("A").crop((0, y, mk.width, y + mk.height)).filter(ImageFilter.GaussianBlur(0)), mk).getbbox() is None]
    assert ys, "r3 stamp does not carry masque.png"
    py0 = ys[0]
    x0, y0 = (round(t) for t in S5.scr2ter(0, TOP))
    tc = (centre_px(*TILE)[0] - x0, centre_px(*TILE)[1] - y0)  # tile centre in crop px
    crop = Image.new("RGBA", (CW, CH), FILL + (0,))
    crop.paste(st.crop((0, py0, mk.width, py0 + mk.height)), (0, 0))
    return crop, tc


def screen_ctx(crop):
    """The window context: the ground in the game's light over rows TOP..BOT, the kept sprites of the baseline over it."""
    rgb = Image.new("RGB", crop.size, FILL)
    rgb.paste(crop.convert("RGB"), mask=crop.getchannel("A").point(lambda v: 255 if v > 8 else 0))
    ground = M.tint(rgb).resize((1080, BOT - TOP), Image.LANCZOS)
    cap = Image.new("RGB", (1080, BOT - TOP))
    cap.paste(S5.base().crop((0, TOP, 1080, min(2400, BOT))), (0, 0))
    keep = Image.new("L", cap.size, 0)
    d = ImageDraw.Draw(keep)
    for x0, y0, x1, y1 in S8.keep_boxes():
        d.rectangle((x0, y0 - TOP, x1, y1 - TOP), fill=255)
    keep = keep.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(3))
    return Image.composite(cap, ground, keep)


def keep_alpha():
    """What r3 builds for the sprites: 255 where ground may be painted, 0 under the kept boxes (the road reaches the gate posts)."""
    keep = Image.new("L", (CW, CH), 0)
    kd = ImageDraw.Draw(keep)
    for a, b, c, e in S8.keep_boxes():
        kd.rectangle((a * UP, (b - TOP) * UP, c * UP, (e - TOP) * UP), fill=255)
    keep = keep.filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.GaussianBlur(12))
    cor = Image.new("L", (CW, CH), 0)
    pts = [(x * UP, (y - TOP) * UP) for x, y in S8.road_pts()[:70]]
    half = [(h + 10) * UP for h in S8.half_widths(len(pts))]
    ImageDraw.Draw(cor).polygon(S5.ribbon_poly(pts, half, 5), fill=255)
    keep = ImageChops.multiply(keep, Image.eval(cor.filter(ImageFilter.GaussianBlur(10)), lambda p: 255 - p))
    return Image.eval(keep, lambda p: 255 - p)


def wmask(name):
    """The window's soft mask over the whole crop, raw px."""
    m = Image.new("L", (CW, CH), 0)
    d = ImageDraw.Draw(m)
    for poly in MASK[name]:
        d.polygon([(x * UP, (y - TOP) * UP) for x, y in poly], fill=255)
    return m.filter(ImageFilter.GaussianBlur(BLUR[name[0]]))


# ------------------------------------------------------------------------------------------------------------------ hints
def px(win, g):
    x, y = M.g2s(g)
    return (x - SIZE[win][0]) * UP, (y + TOP - SIZE[win][1]) * UP


def ribbon(win, pts_screen, half, col, rad=1.5, seed=3):
    w, h = ((SIZE[win][2] - SIZE[win][0]) * UP, (SIZE[win][3] - SIZE[win][1]) * UP)
    pts = S5.resample([((x - SIZE[win][0]) * UP, (y - SIZE[win][1]) * UP) for x, y in pts_screen], 6)
    return S9.layer((w, h), S5.ribbon_poly(pts, [half * UP] * len(pts) if not isinstance(half, list) else [k * UP for k in half], seed), col, rad=rad)


def hints(win, im):
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    if win == "A":
        line, _ = M.route_line()
        pts = [(M.g2s(g)[0], M.g2s(g)[1] + TOP) for g in line if M.g2s(g)[1] + TOP > 1900]
        ov = Image.alpha_composite(ov, ribbon(win, S5.resample(pts, 3), 36, (196, 180, 142, 190)))
    if win == "C":
        for tr in (((535, 1690), (620, 1678), (705, 1663), (730, 1650)), ((525, 1748), (570, 1750), (610, 1756)), ((555, 1875), (620, 1872), (690, 1880))):
            ov = Image.alpha_composite(ov, ribbon(win, tr, 4.5, (186, 168, 130, 120)))
    if win == "B":
        for tr in (((420, 1800), (445, 1796), (468, 1790)),):
            ov = Image.alpha_composite(ov, ribbon(win, tr, 4.5, (186, 168, 130, 120)))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


YARD = [(300, 1735), (432, 1782), (322, 1868), (166, 1792)]  # the old yard diamond of the left cottage, screen px
WHEAT = [(68, 1615), (190, 1560), (388, 1670), (260, 1710)]  # the earth under the wheat rows
CLEAN = False


def eat_rims(ctx):
    """Window B's second go: the hard rim of the yard and of the wheat's earth is bitten away by blotches of meadow, so that the model
    paints an irregular edge instead of keeping the diamond."""
    import random

    rng = random.Random(4)
    mea = ctx.crop((30, 1850 - TOP, 170, 1918 - TOP))
    tex = Image.new("RGB", ctx.size)
    for ty in range(0, ctx.height, mea.height):
        for tx in range(0, ctx.width, mea.width):
            tex.paste(mea if (tx // mea.width + ty // mea.height) % 2 == 0 else mea.transpose(Image.FLIP_LEFT_RIGHT), (tx, ty))
    ring = Image.new("L", ctx.size, 0)
    d = ImageDraw.Draw(ring)
    for poly, w in ((YARD, 22), (WHEAT, 15)):
        pts = [(x, y - TOP) for x, y in poly]
        for a, b in zip(pts, pts[1:] + pts[:1]):
            n = int(math.hypot(b[0] - a[0], b[1] - a[1]) / 9)
            for k in range(n):
                t = k / n
                cx, cy = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                if rng.random() < 0.72:
                    r = rng.uniform(0.5, 1.15) * w
                    d.ellipse((cx - r, cy - r * 0.6, cx + r, cy + r * 0.6), fill=255)
    ring = ring.filter(ImageFilter.GaussianBlur(2))
    ring = ImageChops.multiply(ring, ctx.convert("L").point(lambda v: 255))  # whole window
    keep = Image.new("L", ctx.size, 255)
    ImageDraw.Draw(keep).polygon([(x, y - TOP) for x, y in [(230, 1700), (350, 1740), (352, 1800), (290, 1850), (236, 1800)]], fill=0)  # the cottage itself
    return Image.composite(tex, ctx, ImageChops.multiply(ring, keep.filter(ImageFilter.GaussianBlur(4))))


def window_input(win):
    ctx = screen_ctx(r3_crop()[0])
    if CLEAN and win == "B":
        ctx = eat_rims(ctx)
    x0, y0, x1, y1 = SIZE[win]
    crop = ctx.crop((x0, y0 - TOP, x1, y1 - TOP)).resize(((x1 - x0) * UP, (y1 - y0) * UP), Image.LANCZOS)
    return hints(win, crop)


def prep():
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    P.PLAN_BLOCK = set()
    for w in SIZE if not CLEAN else "B":
        im = window_input(w)
        sfx = "_b" if CLEAN else ""
        im.save(CACHE / f"in_{w}{sfx}.png")
        im.save(OUT / f"entree_{w}{sfx}.png")
        print(w, im.size)


# ------------------------------------------------------------------------------------------------------------------ paint
def paint(win, attempt, n):
    guard_endpoint(FLUX3)
    d = OUT / f"fen{win}_try{attempt}"
    d.mkdir(parents=True, exist_ok=True)
    cache = CACHE / d.name
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"v{i}.png" for i in range(n)]
    if any(o.exists() for o in outs) or any(d.glob("v?.png")):
        sys.exit("variants exist: pass --try")
    x0, y0, x1, y1 = SIZE[win]
    w, h = (x1 - x0) * UP, (y1 - y0) * UP
    batch = reserve(n, EACH[win], f"loupe bc sondes10 {d.name}", None)
    responses: list = []

    def one(io):
        flux.generate(slug="loupe_bc_sondes10", prompt=PROMPTS[win], out=io[1], width=w, height=h, attempts=1,
                      references=(CACHE / f"in_{win}{'_b' if CLEAN else ''}.png", *M.STYLE), extra={"width": w, "height": h}, submitted_log=responses,
                      endpoint=FLUX3, seed=10000 + 100 * attempt + io[0] + 20 * "ABCD".index(win))

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            list(pool.map(one, enumerate(outs)))
    finally:
        entry = settle(batch, responses)
    for o in outs:
        if o.exists():
            Image.open(o).convert("RGB").save(d / o.name)
    (d / "prompt.txt").write_text(PROMPTS[win])
    print(json.dumps({"made": [o.name for o in outs if o.exists()], "cost": entry["cost"]}))


# ------------------------------------------------------------------------------------------------------------------- build
def apply(crop, win, pick, attempt):
    """Lay one window's draw over the crop: raw tones, the window's soft mask, never over the kept sprites."""
    x0, y0, x1, y1 = SIZE[win[0]]
    v = Image.open(OUT / f"fen{win[0]}_try{attempt}" / f"{pick}.png").convert("RGB").resize(((x1 - x0) * UP, (y1 - y0) * UP), Image.LANCZOS)
    v = M.tint(v, inverse=True)
    layer = Image.new("RGBA", crop.size, FILL + (0,))
    layer.paste(v, (x0 * UP, (y0 - TOP) * UP))
    layer.putalpha(ImageChops.multiply(wmask(win), keep_alpha()))
    return Image.alpha_composite(crop, layer)


def parse(s):
    return dict(kv.split("=") for kv in s.split(",") if kv)


def embed(crop, tc):
    """The crop back into a stamp canvas centred on the tile, as r3 and cuire_sol have it."""
    hw = max(round(tc[0]), CW - round(tc[0]))
    hh = max(round(tc[1]), CH - round(tc[1]))
    canvas = Image.new("RGBA", (2 * hw, 2 * hh), (0, 0, 0, 0))
    canvas.alpha_composite(crop, (hw - round(tc[0]), hh - round(tc[1])))
    return canvas


def build(picks, tries):
    crop, tc = r3_crop()
    base = crop.copy()
    P.PLAN_BLOCK = set()
    for win, pick in picks.items():
        crop = apply(crop, win, pick, int(tries.get(win, 1)))
    crop.save(CACHE / "crop_r4.png")
    base.save(CACHE / "crop_r3.png")
    canvas = embed(crop, tc)
    canvas.save(OUT / "sol_r4.webp", lossless=True)
    (OUT.parent / "stamps.json").write_text(json.dumps([{"asset": "sondes/sol_r4.webp", "tile": list(TILE), "flip": False, "band": "t4-6"}]))
    print("stamp", canvas.size, "tile", TILE, "picks", picks)


def shown(crop):
    rgb = M.tint(crop.convert("RGB")).resize((1080, BOT - TOP), Image.LANCZOS)
    al = crop.getchannel("A").resize((1080, BOT - TOP), Image.LANCZOS)
    over = Image.new("RGBA", (1080, BOT))
    rg = rgb.convert("RGBA")
    rg.putalpha(al)
    over.paste(rg, (0, TOP))
    cap = Image.new("RGB", (1080, BOT), (30, 30, 24))
    cap.paste(S5.base(), (0, 0))
    return Image.alpha_composite(cap.convert("RGBA"), over).convert("RGB")


def diff():
    """Pixels of the r4 crop against the r3 crop, outside every window's mask footprint: must all be zero."""
    a, b = Image.open(CACHE / "crop_r3.png"), Image.open(CACHE / "crop_r4.png")
    inside = Image.new("L", a.size, 0)
    for w in picks_built():
        inside = ImageChops.lighter(inside, wmask(w).point(lambda v: 255 if v > 0 else 0))
    changed = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 0 else 0)
    out_changed = ImageChops.multiply(changed, Image.eval(inside, lambda p: 255 - p))
    n_out = sum(out_changed.histogram()[1:])
    n_total = a.width * a.height
    n_in = sum(inside.histogram()[1:])
    print(json.dumps({"px_total": n_total, "px_in_windows": n_in, "px_changed_outside_windows": n_out, "px_changed_inside": sum(changed.histogram()[1:])}))
    return n_out


def picks_built():
    return json.loads((CACHE / "picks.json").read_text())


def planche():
    a, b = Image.open(CACHE / "crop_r3.png"), Image.open(CACHE / "crop_r4.png")
    after, before = shown(b), shown(a)
    after.save(OUT / "ecran.png")
    w = 810
    left = after.crop((0, 0, 1080, 2400)).resize((w, int(2400 * w / 1080)), Image.LANCZOS)
    tgt = Image.open(T.LOUPES / "targets/p06-jour/cible.png").convert("RGB")
    right = tgt.resize((w, int(tgt.height * w / tgt.width)), Image.LANCZOS)
    top = Image.new("RGB", (2 * w + 10, max(left.height, right.height)), (20, 20, 20))
    top.paste(left, (0, 0))
    top.paste(right, (w + 10, 0))
    rows = []
    for win in sorted({w[0] for w in picks_built()}):
        x0, y0, x1, y1 = SIZE[win]
        cw = 520
        ch = round((y1 - y0) * cw / (x1 - x0))
        ch = min(ch, 560)
        cw = round((x1 - x0) * ch / (y1 - y0)) if ch == 560 else cw
        pair = Image.new("RGB", (2 * cw + 10, ch), (20, 20, 20))
        pair.paste(before.crop((x0, y0, x1, y1)).resize((cw, ch), Image.LANCZOS), (0, 0))
        pair.paste(after.crop((x0, y0, x1, y1)).resize((cw, ch), Image.LANCZOS), (cw + 10, 0))
        rows.append(pair)
    height = top.height + sum(r.height + 10 for r in rows)
    out = Image.new("RGB", (top.width, height), (20, 20, 20))
    out.paste(top, (0, 0))
    y = top.height + 10
    for r in rows:
        out.paste(r, (0, y))
        y += r.height + 10
    out.save(OUT / "planche.webp", quality=84)
    print("planche", out.size)


# ----------------------------------------------------------------------------------------------------- undergrowth family
SB_PROMPT = (
    "Paint three low wide strips of forest undergrowth, side by side stacked vertically on a flat solid magenta #FF00FF "
    "background, each strip separated from the next by plain magenta. Each strip is a long thin band seen from a high isometric "
    "camera, the ground cover that lies at the foot of a forest in warm late-afternoon light: three really different strips. "
    "Strip one: ferns and dry golden grass tufts over brown packed earth and fallen oak leaves. Strip two: moss clumps in olive "
    "green, tangled brown tree roots and a few acorns and mushrooms. Strip three: small ochre and grey stones, bramble and low "
    "green bushes with a few dead leaves. Colours: olive and moss greens, golden yellow-green on the top-left parts, warm browns, "
    "ochre and earth, NO teal and NO blue-green. Franco-Belgian comic ink like the forest masses of image 1, thin dark ink "
    "outline, matte, two or three values per surface. Each strip is wide and low, about four times wider than tall, with a ragged top "
    "edge and a ragged lower edge that breaks up into separate tufts, little clods of earth and loose leaves, "
    "fading out unevenly, never a straight or a smooth line, no ground slab, no disc, no oval base, no flat ground under it, no "
    "shadow, only the plants and earth clumps themselves floating on the magenta. No trunk, no tree, no text, no letters, "
    "no frame, no border, no magenta inside the plants.\n"
)


def sb_setup():
    S8.OUT, S8.CACHE, S8.SB_PROMPT, S8.SB_EACH = OUT, CACHE, SB_PROMPT, 0.07
    _gen = flux.generate
    flux.generate = lambda **kw: _gen(**{**kw, "slug": kw["slug"].replace("sondes8", "sondes10")})
    _res = S8.reserve
    S8.reserve = lambda n, each, label, probe: _res(n, each, label.replace("sondes8", "sondes10"), probe)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=("prep", "paint", "build", "planche", "diff", "sousbois-prep", "sousbois-paint", "sousbois-key", "sousbois-export"))
    ap.add_argument("--win", default="A")
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    ap.add_argument("--n", type=int, default=3)
    ap.add_argument("--picks", default="")
    ap.add_argument("--tries", default="")
    ap.add_argument("--pick", default="v0.s0,v1.s1,v2.s2")
    ap.add_argument("--clean", action="store_true")
    a = ap.parse_args()
    CLEAN = a.clean
    if a.cmd == "prep":
        prep()
    elif a.cmd == "paint":
        paint(a.win, a.attempt, a.n)
    elif a.cmd == "build":
        pk = parse(a.picks)
        (CACHE / "picks.json").write_text(json.dumps(list(pk)))
        build(pk, parse(a.tries))
    elif a.cmd == "planche":
        planche()
    elif a.cmd == "diff":
        diff()
    else:
        sb_setup()
        if a.cmd == "sousbois-prep":
            S8.sousbois_prep()
        elif a.cmd == "sousbois-paint":
            S8.sousbois_paint(a.attempt, a.n)
        elif a.cmd == "sousbois-key":
            S8.sousbois_key(a.attempt)
        else:
            S8.sousbois_export(a.pick.split(","), a.attempt)
