#!/usr/bin/env python3
"""Loupe BC sondes-9 (round 3): the context pass of sondes-8 again, on the new road, plots and cottages of the code.

    python3 scripts/iso/loupe_bc_sondes9.py prep | paint [--try N] [--n 4] | check [--try N]
                                           | build [--try N] [--pick vK] | planche [--try N] [--pick vK]

Reuses sondes-8 (and through it 7, 6 and 5) by patching its module globals: crop, output folder, prompt, hints, tracks,
cottages. The clean meadow of sondes-6 stays the base. The road now runs through the middle of the screen to (36, 36)
and goes on off the bottom of the crop, so it has no end to round off; the plots are the ones of champs.ts. The three
shapes (wheat, cottage yards, apron) are hinted as irregular blobs, never as the diamond of the plot's rectangle.
Dev only, nothing wired. FLUX through iso_loop's registry. cible.png is never sent to FLUX.
"""
import argparse
import json
import math
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import loupe_bc_sondes5 as S5
import loupe_bc_sondes6 as M
import loupe_bc_sondes7 as P
import loupe_bc_sondes8 as S8
import loupe_targets as T
import rues_port as R
from lib import flux
from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = T.LOUPES / "bc/r3/sondes"
CACHE = flux.ORIGINALS.parent / "loupes-sondes9"
UP = 2
X0, Y0, X1, Y1 = 20, 1340, 1060, 2250
CW, CH = (X1 - X0) * UP, (Y1 - Y0) * UP
FADE = (2250, 2251)  # no fade: the road leaves the crop at its bottom

# Cottage footprints of champs/alentours.ts, grown by 30 % about their centre (the painting is larger than the lattice rect).
COTTAGES0 = {"A": (25.5, 21.0, 28.0, 23.5), "B": (20.5, 26.5, 23.5, 29.0)}


def grown(r, k=1.3):
    cx, cy, hw, hh = (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, (r[2] - r[0]) / 2 * k, (r[3] - r[1]) / 2 * k
    return (cx - hw, cy - hh, cx + hw, cy + hh)


COTTAGES = {k: grown(v) for k, v in COTTAGES0.items()}
# Thin worn tracks, grid cells: road to wheat, road to each cottage, road to the pasture, a lane up to the vegetable plot.
TRACKS = {
    "ble": [(16.0, 21.3), (16.7, 22.2), (16.2, 23.3)],
    "A": [(23.3, 23.1), (24.3, 22.9), (25.0, 22.5)],
    "B": [(24.0, 25.3), (23.1, 25.9), (22.6, 26.6)],
    "paturage": [(27.5, 26.3), (28.9, 25.5), (30.0, 24.7)],
    "potager": [(22.3, 21.7), (23.0, 20.0), (24.0, 18.6)],
}

PROMPT = (
    "Paint over image 1, a crop of a screenshot of an isometric village game, keeping its exact camera and framing. "
    "ABSOLUTE RULE: every building, palisade fence and wall and villager stay exactly where they are, same size, same shape, same "
    "silhouette. Do not move, add or remove any village building. Do not change the camera. The meadow below is already painted: "
    "keep its colours and brushwork, change only what is described here. The style is given by images 2 and 3: Franco-Belgian "
    "comic ink, matte, two or three values per surface, warm late-afternoon light from the top left.\n"
    "What to paint on the ground, at the faint places hinted in image 1:\n"
    "- ONE main road, clearly the dominant element of the picture, wide like a cart road: packed earth in a warm pale sand, "
    "clearly lighter and warmer than the meadow, hinted as a faint pale ribbon, follow it. It starts exactly in the opening of "
    "the palisade, between the two gate posts, right up to the posts and the villager there, with no gap and no cut end, where it "
    "fans out into a small worn apron of trodden sand in front of the gate. It winds down through the middle of the picture "
    "and keeps going to the very bottom edge of the image, as wide there as anywhere, with no rounded end and no fade. NO dark "
    "outline along its edges at all: the edges are broken and irregular, grass biting into the sand, a few small stones and "
    "tufts, and two faint interrupted wheel ruts inside it. Its width varies from place to place.\n"
    "- Thin worn earth tracks, much narrower and fainter than the road, curving, joining the plots and cottages to the road, "
    "made of two faint wheel or foot traces, never a row of grey stones.\n"
    "- One large wheat plot to the left of the road: flat golden bands of wheat on ochre earth, with a broken outline, one corner "
    "eaten away by grass, rows of unequal length, a rim of grass around it and one corner of tall unharvested wheat, never a "
    "diamond and never a straight edge, with a few stooks of wheat, big enough to read from far away.\n"
    "- One vegetable plot at the upper right: tilled rows with green plants, a low wooden fence a little irregular and not ruled, "
    "and a well.\n"
    "- One pasture at the lower right: a light thin timber fence, a little irregular, round worn grass, 2 or 3 white sheep and a hay pile.\n"
    "- Two farm cottages, each about as large as the small houses of the village in image 1 and drawn with the same thick dark "
    "ink outline and the same weight: terracotta-tiled roof, cream plastered walls with a dark timber frame, a wooden door "
    "facing its track, and a brick chimney on the roof ridge. One stands to the right of the road between the vegetable plot and "
    "the pasture, one to the left of the pasture track lower down. Each cottage stands in a small IRREGULAR yard of trodden "
    "earth, a rough blob with grass growing at its edges, no slab, no diamond and no hard edge, with a path to the road, a "
    "woodpile and a barrel or a crate beside it.\n"
    "- The meadow is warm and alive near the road and the plots: olive with a golden-warm tone like #7A7A44 in sunlight, "
    "not yellow, with grass tufts and a few small flowers.\n"
    "The ground carries NO trees at all and NO tree shadows, and no painted cast shadows on the ground anywhere: bushes under "
    "knee height and small rocks are fine.\n"
    "No text, no letters, no runes, no glossy surfaces, no noise texture, no perfect symmetry, no vignette frame, no sky. "
    "The camera stays high; the land fills the whole image. No small symbols or icons.\n"
)


def px(g):
    x, y = M.g2s(g)
    return (x - X0) * UP, (y + M.TOP - Y0) * UP


def road_line():
    line, _ = M.route_line()
    line = [(line[0][0] + 0.02, line[0][1] - 0.55)] + list(line)  # up into the palisade opening
    (ax, ay), (bx, by) = line[-2], line[-1]
    n = math.hypot(bx - ax, by - ay)
    return line + [(bx + (bx - ax) / n * k, by + (by - ay) / n * k) for k in (1.5, 3.0, 4.5)]  # runs off the crop's bottom


def half_widths(n):
    return [(40 - 8 * k / n) * (1 + 0.2 * math.sin(k / 9.0) + 0.12 * math.sin(k / 3.1 + 1)) for k in range(n)]


def blob(rng, rect, amp, eaten=()):
    """An irregular outline of a cell rectangle: every edge wobbles by up to `amp` cells, `eaten` corners are cut away."""
    a, b, c, e = rect
    pts = []
    corners = [(a, b), (c, b), (c, e), (a, e)]
    for k in range(4):
        (x0, y0), (x1, y1) = corners[k], corners[(k + 1) % 4]
        ph, f = rng.uniform(0, 6.3), rng.uniform(1.3, 2.6)
        for s in range(8):
            t = s / 8
            nx, ny = (y1 - y0), -(x1 - x0)
            nn = math.hypot(nx, ny)
            w = amp * (0.6 * math.sin(f * 6.3 * t + ph) + 0.4 * rng.uniform(-1, 1))
            pts.append((x0 + (x1 - x0) * t + nx / nn * w, y0 + (y1 - y0) * t + ny / nn * w))
    poly = [px(p) for p in pts]
    cuts = [(px(corners[k]), 1.6) for k in eaten]
    return poly, cuts


def layer(size, poly, fill, cuts=(), rad=3.0):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    d = ImageDraw.Draw(m)
    for (cx, cy), r in cuts:  # a bite out of the corner, an ellipse in the iso plane
        d.ellipse((cx - r * 36 * UP, cy - r * 18 * UP, cx + r * 36 * UP, cy + r * 18 * UP), fill=0)
    m = m.filter(ImageFilter.GaussianBlur(rad * UP))
    ov = Image.new("RGBA", size, fill[:3] + (0,))
    ov.putalpha(m.point(lambda v: v * fill[3] // 255))
    return ov


def hints(im):
    rng = random.Random(9)
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    pts = S5.resample([px(g) for g in road_line()], 6)
    half = [h * UP for h in half_widths(len(pts))]
    ov = Image.alpha_composite(ov, layer(im.size, S5.ribbon_poly(pts, half, 5), (196, 180, 142, 185), rad=1.5))
    gate = R.noeud(12, 17)  # the worn apron, wider than the road's mouth
    ap = [px((gate[0] + 1.35 * math.cos(t) - 0.0 * math.sin(t), gate[1] + 0.9 * math.sin(t) * (1 + 0.15 * math.sin(3 * t)))) for t in [i * math.pi / 12 for i in range(24)]]
    ov = Image.alpha_composite(ov, layer(im.size, ap, (196, 180, 142, 175), rad=2))
    Pa = R.PARCELLES
    poly, cuts = blob(rng, Pa["ble"], 0.4, eaten=(2,))
    ov = Image.alpha_composite(ov, layer(im.size, poly, (192, 150, 88, 125), cuts))
    ble = Pa["ble"]
    ov = Image.alpha_composite(ov, layer(im.size, [px((ble[0], ble[1])), px((ble[0] + 1.6, ble[1])), px((ble[0] + 1.6, ble[1] + 1.4)), px((ble[0], ble[1] + 1.4))], (222, 188, 104, 120), rad=4))  # tall wheat corner
    for name, col, a in (("potager", (112, 92, 62), 110), ("paturage", (176, 176, 112), 125)):
        poly, cuts = blob(rng, Pa[name], 0.12)
        ov = Image.alpha_composite(ov, layer(im.size, poly, col + (a,), cuts))
    for k, tr in enumerate(TRACKS.values()):
        p = S5.resample([px(g) for g in tr], 6)
        ov = Image.alpha_composite(ov, layer(im.size, S5.ribbon_poly(p, [4.5 * UP] * len(p), 12 + k), (186, 168, 130, 140), rad=1.5))
    for r in COTTAGES.values():
        cx, cy = (r[0] + r[2]) / 2, (r[1] + r[3]) / 2
        w, h = (r[2] - r[0]) / 2 + 0.9, (r[3] - r[1]) / 2 + 0.9
        ph1, ph2 = rng.uniform(0, 6.3), rng.uniform(0, 6.3)
        yard = [px((cx + w * math.cos(t) * (1 + 0.22 * math.sin(3 * t + ph1) + 0.12 * math.sin(5 * t + ph2)),
                    cy + h * math.sin(t) * (1 + 0.22 * math.sin(3 * t + ph1) + 0.12 * math.sin(5 * t + ph2)))) for t in [i * math.pi / 12 for i in range(24)]]
        ov = Image.alpha_composite(ov, layer(im.size, yard, (176, 146, 104, 120), rad=3))
        base = [px((r[0], r[1])), px((r[2], r[1])), px((r[2], r[3])), px((r[0], r[3]))]
        ov = Image.alpha_composite(ov, layer(im.size, base, (205, 192, 160, 70), rad=3))
        bx, by = sum(p[0] for p in base) / 4, sum(p[1] for p in base) / 4
        ov = Image.alpha_composite(ov, layer(im.size, [(bx - 90, by - 26), (bx, by - 125), (bx + 90, by - 26), (bx, by + 38)], (150, 85, 62, 95), rad=2))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


def build(attempt, pick):
    """sondes-8's build (stamp over the sondes-6 meadow), then the manifest renamed for this round."""
    S8.build(attempt, pick)
    src = OUT / "sol_r2.webp"
    src.rename(OUT / "sol_r3.webp")
    (OUT.parent / "stamps.json").write_text(json.dumps([{**json.loads((OUT.parent / "stamps.json").read_text())[0], "asset": "sondes/sol_r3.webp"}]))


def planche(attempt, pick):
    build(attempt, pick)
    shown = S8.shown_screen()
    shown.save(OUT / "ecran.png")
    w = 810
    left = shown.resize((w, int(shown.height * w / shown.width)), Image.LANCZOS)
    tgt = Image.open(T.LOUPES / "targets/p06-jour/cible.png").convert("RGB")
    right = tgt.resize((w, int(tgt.height * w / tgt.width)), Image.LANCZOS)
    top = Image.new("RGB", (2 * w + 10, max(left.height, right.height)), (20, 20, 20))
    top.paste(left, (0, 0))
    top.paste(right, (w + 10, 0))
    boxes = ((230, 1380, 500, 1620), (530, 1650, 800, 1890), (60, 1530, 330, 1770))  # gate apron, cottage A's yard, the wheat
    row = Image.new("RGB", (top.width, 480), (20, 20, 20))
    for k, (x, y, x2, y2) in enumerate(boxes):
        row.paste(shown.crop((x, y, x2, y2)).resize((540, 480), Image.LANCZOS), (k * 550, 0))
    out = Image.new("RGB", (top.width, top.height + 10 + row.height), (20, 20, 20))
    out.paste(top, (0, 0))
    out.paste(row, (0, top.height + 10))
    out.save(OUT / "planche.webp", quality=86)
    print("planche", out.size)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=("prep", "paint", "check", "build", "planche"))
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--pick", default="v0")
    a = ap.parse_args()
    for mod in (S8, P):  # sondes-8 and -7 read these as module globals
        mod.OUT, mod.CACHE, mod.X0, mod.Y0, mod.X1, mod.Y1, mod.CW, mod.CH, mod.FADE = OUT, CACHE, X0, Y0, X1, Y1, CW, CH, FADE
    S8.COTTAGES, S8.TRACKS, S8.PROMPT = COTTAGES, TRACKS, PROMPT
    P.PLAN_BLOCK = set()  # the code paves the plan's field strips over: no kept strip any more
    P.PROMPT, P.TRACKS, P.hints, P.keep_boxes, P.context, P.build = PROMPT, TRACKS, hints, S8.keep_boxes, S8.context, build
    S8.hints = hints
    _gen = flux.generate
    flux.generate = lambda **kw: _gen(**{**kw, "slug": kw["slug"].replace("sondes7", "sondes9")})
    _res = P.reserve
    P.reserve = lambda n, each, label, probe: _res(n, each, label.replace("sondes7", "sondes9"), probe)
    if a.cmd == "prep":
        S8.prep()
    elif a.cmd == "paint":
        P.paint(a.attempt, a.n)
    elif a.cmd == "check":
        P.check(a.attempt)
    elif a.cmd == "build":
        build(a.attempt, a.pick)
    else:
        planche(a.attempt, a.pick)
