#!/usr/bin/env python3
"""Loupe BC sondes-5: repaint a real capture's lower part (the try2 recipe), keep only the ground as a stamp.

    python3 scripts/iso/loupe_bc_sondes5.py prep | geom | paint [--try N] [--n 4] [--note ...] | check [--try N]
                                                | build [--try N] [--pick vK] | planche [--try N] [--pick vK]

Dev only, never wired into the app. FLUX goes through iso_loop's registry, generated in the cache then copied.
"""
import argparse
import concurrent.futures
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import loupe_bc_sol as sol
import loupe_targets as T
from cuire_sol import LARGEUR, PX, TERRAIN_XY, centre_px
from iso_loop import FLUX3, guard_endpoint, reserve, settle
from lib import flux
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

OUT = T.LOUPES / "bc/r1/sondes-5"
CACHE = flux.ORIGINALS.parent / "loupes-sondes5"
DUMP = json.loads((T.LOUPES / "baseline/p06-jour.json").read_text())
CAM = DUMP["camera"]
Z, TX, TY = CAM["zoom"], CAM["tx"], CAM["ty"]
UP = 2  # 3 px/dp wanted, the screen draws Z = 1.5 px/dp: 2 output px per screen px
# Pieces, crops in screen px. L = the first probe (try1, try2). A and B: full width, B overlaps A by 140 px.
PIECES = {"L": (200, 1280, 856, 2048), "A": (0, 1300, 1080, 1900), "B": (0, 1760, 1080, 2400)}
PIECE = "L"
GEN = 1
CROP = PIECES[PIECE]
W, H = (CROP[2] - CROP[0]) * UP, (CROP[3] - CROP[1]) * UP


def set_gen(g):
    global GEN
    GEN = g


def set_piece(name):
    global PIECE, CROP, W, H
    PIECE, CROP = name, PIECES[name]
    W, H = (CROP[2] - CROP[0]) * UP, (CROP[3] - CROP[1]) * UP
EACH = 0.14  # reservation per image, settled at the billed cost
# Baseline's screen-fixed bottom corner trees (defect G03), polygons in screen px, covered with meadow.
TREES = [
    [(1000, 1760), (1080, 1760), (1080, 2400), (700, 2400), (720, 2150), (760, 1960), (830, 1880)],
    [(0, 2000), (330, 2000), (330, 2400), (0, 2400)],
]


DY = 10  # measured on the road junction, terrain against capture: the vertex formula is ~10 screen px high


def scr2ter(sx, sy):
    """Screen px -> terrain px (a translate and a scale, the map is not rotated)."""
    return ((((sx - TX) / Z) + LARGEUR / 2 - TERRAIN_XY[0]) * PX, (((sy + DY - TY) / Z) - TERRAIN_XY[1]) * PX)


def base():
    return Image.open(T.LOUPES / "baseline/p06-jour.png").convert("RGB")


# Lift: the terrain's dark forest-floor polygons and the grey world edge, brought to the meadow's tone and value.
# Colour centres measured on the baseline (mean RGB of clean patches); the texture stays, only its mean moves.
MEADOW = (148, 142, 107)
CLASSES = ((110, 112, 97), (91, 87, 74))  # dark polygon floor, grey outside
LIFT_DIST = 18


def solid(c, size):
    return Image.new("RGB", size, c)


def lift(im):
    """Move the dark polygon floor and the grey outside to the meadow's mean tone, keeping their texture."""
    sm = im.filter(ImageFilter.GaussianBlur(5))
    out = im
    for c in CLASSES:
        d = ImageChops.difference(sm, solid(c, im.size))
        r, g, b = d.split()
        dist = ImageChops.lighter(ImageChops.lighter(r, g), b)
        m = dist.point(lambda v: 255 if v <= LIFT_DIST else 0)
        m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(5))
        m = m.filter(ImageFilter.GaussianBlur(3))
        target = MEADOW if GEN == 1 else (138, 135, 96)
        add = tuple(target[k] - c[k] for k in range(3))
        up = ImageChops.add(im, solid(add, im.size))
        # low-frequency patches so the lifted floor is not one flat value: +-7 on a 90 px grain, seeded by position
        if GEN >= 2:  # no low-frequency blotches in the input
            out = Image.composite(up, out, m)
            continue
        patch = Image.effect_noise(im.size, 40).filter(ImageFilter.GaussianBlur(40)).point(lambda v: min(255, max(0, (v - 128) * 3 + 128)))
        up = ImageChops.add(up, Image.merge("RGB", (patch, patch, patch)), 1, -128 + 0)
        out = Image.composite(up, out, m)
    return out


GAP = [  # more to paint out of the input: the left trunk at the edge, the real forest cluster at the road's end
    [(0, 1560), (90, 1560), (90, 1830), (0, 1830)],
    [(920, 1650), (1080, 1650), (1080, 1860), (920, 1860)],  # the real forest sprite at the right edge
    [(310, 2100), (380, 1960), (560, 1935), (700, 1955), (785, 2040), (775, 2185), (600, 2260), (430, 2225)],
]


def fill_trees(im):
    """Paint the corner trees and the cluster out of the input with the dark floor's tone plus a fine grain."""
    w, h = im.size
    grain = Image.effect_noise(im.size, 14).filter(ImageFilter.GaussianBlur(0.8))
    cover = ImageChops.add(solid(CLASSES[0], im.size), Image.merge("RGB", (grain, grain, grain)), 1, -128)
    m = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(m)
    extra = []
    if GEN >= 2:  # the capture's field sprites (runtime, switched off here) and the baked flat road shape go too
        for sp in DUMP["sprites"]:
            if sp.get("layer") == "field" and sp["y"] + sp["h"] > 1290 and sp["y"] < 2100 and sp["x"] + sp["w"] > 0 and sp["x"] < 1080:
                extra.append([(sp["x"], sp["y"]), (sp["x"] + sp["w"], sp["y"]), (sp["x"] + sp["w"], sp["y"] + sp["h"]), (sp["x"], sp["y"] + sp["h"])])
        extra.append([(380, 1690), (580, 1690), (640, 1960), (520, 1960)])
    for pol in TREES + GAP + extra:
        d.polygon(pol, fill=255)
    return Image.composite(cover, im, m.filter(ImageFilter.GaussianBlur(4)))


def no_bars(im):
    """The Android bars are not the world: covered by a mirror of the rows next to them, as loupe_targets does."""
    w, h = im.size
    top, bottom = T.BARS
    im.paste(im.crop((0, top, w, 2 * top)).transpose(Image.FLIP_TOP_BOTTOM), (0, 0))
    im.paste(im.crop((0, h - 2 * bottom, w, h - bottom)).transpose(Image.FLIP_TOP_BOTTOM), (0, h - bottom))
    return im


def source_path():
    return CACHE / f"source_{PIECE}{'' if GEN == 1 else GEN}.png"


def prep(with_=None):
    im = base()
    if PIECE == "L":
        col = tuple(int(v) for v in ImageStat.Stat(im.crop((380, 1500, 460, 1560))).mean)  # meadow left of the road
        d = ImageDraw.Draw(im)
        for p in TREES:
            d.polygon(p, fill=col)
    else:
        im = lift(fill_trees(no_bars(im)))
        if with_:  # B: the chosen A repaint pasted over its own rows, so the road arrives from the piece above
            a_crop = PIECES["A"]
            a = Image.open(with_).convert("RGB").resize(((a_crop[2] - a_crop[0]), (a_crop[3] - a_crop[1])), Image.LANCZOS)
            ramp = Image.new("L", a.size, 0)
            ImageDraw.Draw(ramp).rectangle((0, 0, a.width, a.height - 150), fill=255)
            im.paste(a, (a_crop[0], a_crop[1]), ramp.filter(ImageFilter.GaussianBlur(40)))
            if GEN == 3:  # below A, flat grain invited inventions (B2): tile a clean meadow patch of A's own repaint instead
                patch = a.crop((700, 380, 1060, 560))  # screen px of A, plain meadow on the right
                lay = Image.new("RGB", im.size)
                for r, y in enumerate(range(1900, im.height, patch.height)):
                    for c, x in enumerate(range(-(r % 2) * 180, im.width, patch.width)):
                        lay.paste(patch.transpose(Image.FLIP_LEFT_RIGHT) if (r + c) % 2 else patch, (x, y))
                soft = Image.new("L", im.size, 0)
                ImageDraw.Draw(soft).rectangle((0, 1930, im.width, im.height), fill=255)
                im.paste(lay, (0, 0), soft.filter(ImageFilter.GaussianBlur(25)))
    im.crop(CROP).save(OUT / f"lifted_{PIECE}{'' if GEN == 1 else GEN}.png")
    im = im.crop(CROP).resize((W, H), Image.LANCZOS)
    if GEN >= 2:
        im = sketch(im)
        im.save(OUT / f"entree_{PIECE}{GEN}.png")
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(source_path())
    print("source", PIECE, im.size, "px per dp of the output:", UP * Z)


def geom():
    x0, y0 = scr2ter(CROP[0], CROP[1])
    print("px per dp of the output:", UP * Z, "(terrain: 3)")
    print("crop in terrain px:", round(x0), round(y0), "size", W, H)
    ter = sol.crop_px(round(x0), round(y0), round(x0) + W, round(y0) + H)
    a = ter.resize((W // 2, H // 2)).convert("L")
    b = base().crop(CROP).convert("L")
    best = None
    for dy in range(-96, 97, 4):
        for dx in range(-96, 97, 4):
            t = b.crop((100 + dx, 100 + dy, b.width - 100 + dx, b.height - 100 + dy))
            s = ImageStat.Stat(ImageChops.difference(a.crop((100, 100, a.width - 100, a.height - 100)), t)).mean[0]
            if best is None or s < best[0]:
                best = (s, dx, dy)
    print("best offset terrain vs capture (screen px, 0,0 = exact):", best)


PROMPT = """Paint over image 1, a crop of a screenshot of an isometric village game, keeping its exact camera and framing.
ABSOLUTE RULE: every building, palisade fence and wall, villager and the river stay exactly where they are, same size, same shape, same silhouette. Do not move, add or remove any building or any house. Do not change the camera. The walled village stays the same.
Change only the land around the village, so that it looks like a hand-painted fantasy world map: rich, inked, painted with visible brush strokes, warm late-afternoon light from the top left. The style is given by images 2 and 3: Franco-Belgian comic ink, matte, two or three values per surface.
What to paint on the land:
- A pale sand-grey packed-earth road with a winding, curving course, wide at the palisade gate and reaching it, with small edge stones and grass tufts breaking its edges, leaving through the bottom of the picture.
- One wheat plot beside the road: flat parallel bands of golden wheat on ochre earth, its edges irregular and softened into the meadow, never a rectangle, with a few stooks of wheat and a scarecrow.
- One vegetable plot on the other side of the road: tilled rows with green plants, a low wooden fence and a well, edges blended into the grass.
- Everything touches the ground: dirt rings, tufts, pebbles at the foot of every object. Nothing floats. Calm meadow rest areas, detail falls off away from the road and the walls.
- Surroundings one or two value steps darker and less saturated than the village core; the village stays the brightest and most contrasted area.
- Shadows fall to the bottom right, cool slate blue (#2E3552), never black.
No text, no letters, no runes, no glossy surfaces, no noise texture, no perfect symmetry, no parallax, no vignette frame, no new houses.
MANDATORY REMOVALS: (a) the two huge dark trees in the bottom corners are already painted out, keep those corners as ordinary meadow with small trees of normal size; (b) the large flat darker polygon shapes in the meadow must disappear, replaced by living varied land; (c) every rectangular grid field and every straight green hedge strip must disappear; (d) the pale flat road shape becomes the real road described above. The camera stays high: no sky anywhere; the land fills the whole image. No small symbols or icons.
"""


PROMPT_A = PROMPT.split("MANDATORY REMOVALS")[0] + """The ground is already one continuous living meadow: keep it so, with soft lighter and darker patches, grass tufts, flowers and small stones, no flat polygon, no straight diagonal edge, no beige flat patch. Replace the rectangular grid field sprites and straight hedge strips with the plots described above. The camera stays high: no sky anywhere; the land fills the whole image. No small symbols or icons.
"""
PROMPT_B = """Paint over image 1, a crop of a screenshot of an isometric village game, keeping its exact camera and framing. The top part shows a packed-earth road coming down from a palisade gate, already painted: keep that part exactly as it is.
Continue the picture downwards, hand-painted like the top: rich, inked, painted with visible brush strokes, warm late-afternoon light from the top left, Franco-Belgian comic ink, matte, two or three values per surface (style given by images 2 and 3).
- The pale sand-grey road keeps going: it continues its winding course from the top and reaches the very bottom edge of the picture, never stops, never ends in a dead end, with small edge stones and grass tufts breaking its edges.
- Everything else is ordinary ground seen from a high camera, to the very edges: meadow with soft lighter and darker patches, forest floor with moss, ferns, fallen leaves, brambles, low bushes, flowers, stones and tufts. The grey cloudy area and the bare corners at the bottom must become this same ground, no grey, no flat colour, no void, no edge of the world.
- A few trees of normal size and a few saplings, scattered, with open ground between them, every trunk rooted in undergrowth. Never a continuous wall of trees, the road and the ground stay visible. No giant tree, no huge foreground tree, trees all about the same scale as in the top part.
- Shadows fall to the bottom right, cool slate blue (#2E3552), never black. Everything touches the ground, nothing floats.
No text, no letters, no runes, no glossy surfaces, no noise texture, no perfect symmetry, no vignette frame, no sky, no buildings, no houses, no fences. No small symbols or icons.
"""
PROMPT_FOR = {("L", 1): PROMPT, ("A", 1): PROMPT_A, ("B", 1): PROMPT_B}
NO_TREES = "The ground carries NO trees at all and NO tree shadows and no cast shadows of any kind (trees are added later by the game): bushes under knee height and rocks are fine. "
PROMPT_A2 = PROMPT.split("What to paint on the land")[0].replace("a crop of a screenshot", "a crop of a screenshot with a constructed sketch drawn on it") + """What to paint on the land (the sketch in image 1 gives the exact places, keep them):
- The pale sand-grey packed-earth road already sketched in image 1: keep its exact course. It starts at the gap of the palisade (the gate), runs gently down to the left and leaves the picture at the left edge. Narrow, its width varies a little, small edge stones and grass tufts break its edges, clean end at the gate with no dirt blob and no scattered flowers where it meets the walls. A thin side track sketched below it, ends in the field.
- One wheat plot beside the road as sketched: flat parallel bands of golden wheat on ochre earth, its edges irregular and softened into the meadow, never a rectangle and never a grid of squares, with a few stooks of wheat, and a short earth track from the road to it.
- One vegetable plot as sketched, east of the wheat: tilled rows with green plants and a low wooden fence, edges blended into the grass.
- The meadow is olive (like #6A7442 in sunlight), less green and not yellow, with large calm areas, very few flowers, small tufts and pebbles at the foot of things, no flat polygon, no straight diagonal edge, no beige flat patch.
- Surroundings one or two value steps darker and less saturated than the village core; the village stays the brightest area.
""" + NO_TREES + """
No text, no letters, no runes, no glossy surfaces, no noise texture, no perfect symmetry, no vignette frame, no new houses, no sky. Every building, fence, wall and villager of image 1 stays exactly where it is. The camera stays high; the land fills the whole image. No small symbols or icons.
"""
PROMPT_B2 = """Paint over image 1, a crop of a screenshot of an isometric village game, keeping its exact camera and framing. Its top part is already painted (a meadow, a road leaving at the left, a wheat plot and a vegetable plot): keep that part exactly as it is.
Continue the picture downwards in the same hand-painted style, rich, inked, painted with visible brush strokes, warm late-afternoon light from the top left, Franco-Belgian comic ink, matte, two or three values per surface (style given by images 2 and 3).
- Everything below is ordinary ground seen from a high camera, to the very edges: olive meadow (like #6A7442 in sunlight), less green and not yellow, large calm areas, forest floor with moss, ferns, fallen leaves, brambles and low bushes under knee height, rocks and stones, very few flowers. The grey cloudy area and bare corners at the bottom become this same ground: no grey, no flat colour, no void, no edge of the world.
- If a thin track is sketched, follow it exactly, narrow, pale sand-grey, irregular edges; add no other road.
""" + NO_TREES + """
No text, no letters, no runes, no glossy surfaces, no noise texture, no perfect symmetry, no vignette frame, no sky, no buildings, no houses, no fences. No small symbols or icons.
"""
PROMPT_FOR[("A", 2)] = PROMPT_A2
PROMPT_FOR[("B", 2)] = PROMPT_B2
PROMPT_FOR[("B", 3)] = PROMPT_B2 + "No road, no track, no path, no field, no wheat, no crops and no plot anywhere in this picture: only meadow, forest floor, low bushes and rocks, continuing the ground of image 1 to every edge.\n"


# the road on its real path: rues.ts ported in rues_port.py
from rues_port import hasard, noeud, serpente, sortie  # noqa: E402,F401


def g2s(g):
    """Grid point (continuous) -> screen px, the camera of the dump."""
    return (g[0] - g[1]) * 24 * Z + TX - 0, (g[0] + g[1]) * 12 * Z + TY


STREET = [(12, 16), (12, 17), (12, 18), (12, 19)]


def paths():
    route, voie = sortie(12, 19)
    street = [noeud(*c) for c in STREET]
    return street, route, voie


# the plots, in grid cells (all off the 20x20 grid: gy > 20), and the track to the wheat
WHEAT = (14.2, 21.6, 18.0, 23.4)
VEG = (19.2, 21.0, 22.8, 22.8)


def route_json():
    street, route, voie = paths()
    cells = {}
    pal = d_layout["paliers"]
    for name, line in (("rue", street), ("route", street[-1:] + route[1:]), ("voie", route[4:5] + voie[1:])):
        seq = []
        for a, b in zip(line, line[1:]):
            n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1))
            for k in range(n + 1):
                q = (a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)
                c = (math.floor(q[0]), math.floor(q[1]))
                if not seq or seq[-1] != c:
                    seq.append(c)
        cells[name] = seq
    def tier(c):
        if 0 <= c[0] < 20 and 0 <= c[1] < 20:
            ch = pal[c[1]][c[0]]
            return None if ch == "-" else "123456789abc".index(ch) + 1
        return None
    out = {
        "doc": "Frozen tile list of the road, derived from components/village/iso/rues.ts (noeud, serpente, SORTIES for the south exit (12, 19)) by scripts/iso/loupe_bc_sondes5.py. cases = [gx, gy, palier of the island cell or null when off the 20x20 grid]. rue = the street from the gate cell (12, 16) to (12, 19), already island cells at tiers 5 to 8; route and voie = the road and its fork, off the island.",
        "gate": [12, 16],
        "branches": {k: [[c[0], c[1], tier(c)] for c in v] for k, v in cells.items()},
        "noeuds_grille": {"rue": [[round(a, 3), round(b, 3)] for a, b in street], "route": [[round(a, 3), round(b, 3)] for a, b in route], "voie": [[round(a, 3), round(b, 3)] for a, b in voie]},
        "ecran_px": {"rue": [[round(x), round(y)] for x, y in map(g2s, street)], "route": [[round(x), round(y)] for x, y in map(g2s, route)], "voie": [[round(x), round(y)] for x, y in map(g2s, voie)]},
        "champ_ble": {"gx": [WHEAT[0], WHEAT[2]], "gy": [WHEAT[1], WHEAT[3]]},
        "potager": {"gx": [VEG[0], VEG[2]], "gy": [VEG[1], VEG[3]]},
    }
    (OUT / "route_tuiles.json").write_text(json.dumps(out, indent=1))
    return out


d_layout = json.loads((ROOT_ := T.ROOT / "constants/isoLayout.json").read_text())


def rnd(seed, i):
    return hasard(seed, i, 99, 5)


def ribbon_poly(line, half, seed):
    """Outline of a band along `line` (screen px at 2x), half-widths in px, edges wobbling a little."""
    left, right = [], []
    for i, (p, h) in enumerate(zip(line, half)):
        a, b = line[max(0, i - 1)], line[min(len(line) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy) or 1
        nx, ny = -dy / n, dx / n
        wl, wr = 1 + 0.18 * (rnd(seed, 2 * i) - 0.5), 1 + 0.18 * (rnd(seed, 2 * i + 1) - 0.5)
        left.append((p[0] + nx * h * wl, p[1] + ny * h * wl))
        right.append((p[0] - nx * h * wr, p[1] - ny * h * wr))
    return left + right[::-1]


def resample(line, step):
    out = [line[0]]
    for a, b in zip(line, line[1:]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / step))
        out += [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(1, n + 1)]
    return out


def sketch(im):
    """The constructed sketch on the 2x input: road from the gate along the code's path, wheat, vegetable plot, track."""
    street, route, voie = paths()
    ox, oy = CROP[0], CROP[1]

    def px(g):  # grid -> pixel of this piece's 2x image
        x, y = g2s(g)
        return ((x - ox) * UP, (y - oy) * UP)

    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    cell_px = 40 * UP  # one cell along an edge, px at 2x
    line = [px(g) for g in street] + [px(g) for g in route[1:]]
    line = resample(line, 6)
    # a little wider than the game's own band (0.5 to 0.72 cell) so the runtime street sits inside it
    half = [cell_px * (0.40 - 0.10 * k / len(line) + 0.04 * math.sin(k / 9)) / 2 * 1.6 for k in range(len(line))]
    sand, edge, light = (188, 178, 150, 255), (150, 140, 112, 255), (205, 196, 170, 255)
    poly = ribbon_poly(line, half, 7)
    d.polygon(poly, fill=sand)
    d.polygon(ribbon_poly(line, [h * 0.55 for h in half], 8), fill=light)
    d.line(poly[: len(line)] + [], fill=edge, width=3)
    d.line(poly[len(line):], fill=edge, width=3)
    # the fork's thin track: the code's `voie` from its fork node, narrower
    fk = resample([px(g) for g in voie], 6)
    if len(fk) > 1:
        fh = [cell_px * 0.16 * (1 - 0.5 * k / len(fk)) for k in range(len(fk))]
        d.polygon(ribbon_poly(fk, fh, 9), fill=sand)

    def quad(r, shrink=0.0):
        x0, y0, x1, y1 = r
        return [px((x0 + shrink, y0 + shrink)), px((x1 - shrink, y0 + shrink)), px((x1 - shrink, y1 - shrink)), px((x0 + shrink, y1 - shrink))]

    def wobble(pts, seed, amp):
        out = []
        for i, a in enumerate(pts):
            b = pts[(i + 1) % len(pts)]
            for m in range(4):
                t = m / 4
                out.append((a[0] + (b[0] - a[0]) * t + (rnd(seed, i * 4 + m) - 0.5) * amp, a[1] + (b[1] - a[1]) * t + (rnd(seed + 1, i * 4 + m) - 0.5) * amp))
        return out

    # wheat: ochre earth, flat golden bands along gx, stooks
    x0, y0, x1, y1 = WHEAT
    d.polygon(wobble(quad(WHEAT, -0.15), 21, 14), fill=(176, 138, 84, 255))
    nb = 4
    for b in range(nb):
        ya, yb = y0 + 0.1 + b * (y1 - y0 - 0.2) / nb, y0 + 0.1 + (b + 0.78) * (y1 - y0 - 0.2) / nb
        d.polygon(quad((x0 + 0.25, ya, x1 - 0.25, yb)), fill=(218, 178, 92, 255))
    for k, (gx, gy) in enumerate(((x0 + 0.7, y1 + 0.1), (x0 + 1.6, y1 + 0.25), (x0 + 2.6, y1 + 0.05))):
        c = px((gx, gy))
        d.polygon([(c[0] - 14, c[1]), (c[0], c[1] - 34), (c[0] + 14, c[1])], fill=(196, 160, 90, 255))
    # vegetable plot: brown earth, green rows along gx
    x0, y0, x1, y1 = VEG
    d.polygon(wobble(quad(VEG, -0.1), 31, 10), fill=(112, 88, 60, 255))
    nr = 5
    for b in range(nr):
        ya = y0 + 0.2 + b * (y1 - y0 - 0.4) / nr
        d.polygon(quad((x0 + 0.2, ya, x1 - 0.2, ya + 0.22)), fill=(88, 116, 62, 255))
    # the short track from the wheat to the road's node nearest to it
    wc = ((WHEAT[0] + WHEAT[2]) / 2, (WHEAT[1] + WHEAT[3]) / 2)
    near = min(route, key=lambda g: (g[0] - WHEAT[0]) ** 2 + (g[1] - wc[1]) ** 2)
    tr = resample([px(near), px((WHEAT[0] + 0.1, wc[1]))], 6)
    d.polygon(ribbon_poly(tr, [cell_px * 0.14] * len(tr), 12), fill=(176, 160, 126, 255))
    ov = ov.filter(ImageFilter.GaussianBlur(1.2))
    grain = Image.effect_noise(im.size, 10).filter(ImageFilter.GaussianBlur(0.7))  # fine grain only, no blotches
    tex = Image.merge("RGB", (grain, grain, grain))
    base_rgba = im.convert("RGBA")
    res = Image.alpha_composite(base_rgba, ov).convert("RGB")
    res = Image.composite(ImageChops.add(res, tex, 1, -128), res, ov.split()[3].point(lambda v: 255 if v > 128 else 0))
    return res


def folder(n):
    return OUT / (f"try{n}" if PIECE == "L" else f"{PIECE}{n}")  # the generation is the attempt number


def paint(attempt, n, note):
    guard_endpoint(FLUX3)
    d = folder(attempt)
    d.mkdir(parents=True, exist_ok=True)
    cache = CACHE / folder(attempt).name
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"v{i}.png" for i in range(n)]
    if any(o.exists() for o in outs) or any(d.glob("v?.png")):
        sys.exit("variants exist: pass --try")
    prompt = PROMPT_FOR[(PIECE, GEN)] + (note + "\n" if note else "")
    refs = (source_path(), *[T.flat(p) for p in T.STYLE])
    batch = reserve(n, EACH, f"loupe bc sondes5 {folder(attempt).name}", None)
    responses: list = []

    def one(io):
        flux.generate(slug="loupe_bc_sondes5", prompt=prompt, out=io[1], width=W, height=H, attempts=1, references=refs,
                      extra={"width": W, "height": H}, submitted_log=responses, endpoint=FLUX3, seed=1000 * attempt + io[0] + (0 if PIECE == "L" else 500))

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            list(pool.map(one, enumerate(outs)))
    finally:
        entry = settle(batch, responses)
    for o in outs:
        if o.exists():
            Image.open(o).convert("RGB").save(d / o.name)
    (d / "prompt.txt").write_text(prompt)
    print(json.dumps({"made": [o.name for o in outs if o.exists()], "cost": entry["cost"]}))


def boxes():
    """Kept sprites in the crop, output px."""
    out = []
    for s in DUMP["sprites"]:
        if s.get("layer") in ("building", "wall", "villager", "animal") and not s.get("screenFixed"):
            b = ((s["x"] - CROP[0]) * UP, (s["y"] - CROP[1]) * UP, (s["x"] + s["w"] - CROP[0]) * UP, (s["y"] + s["h"] - CROP[1]) * UP)
            if b[2] > 0 and b[3] > 0 and b[0] < W and b[1] < H:
                out.append((s["id"], b))
    return out


def mask():
    """255 = take the repaint (ground), 0 = keep the capture's sprites; 28 px margin, 18 px soft edge."""
    m = Image.new("L", (W, H), 255)
    d = ImageDraw.Draw(m)
    for _, b in boxes():
        d.rectangle(b, fill=0)
    m = m.filter(ImageFilter.MinFilter(2 * 28 + 1)).filter(ImageFilter.GaussianBlur(18))
    # the crop's own border fades out over 90 px, so the stamp has no hard rectangle against the terrain around it
    ramp = Image.new("L", (W, H), 0)
    ImageDraw.Draw(ramp).rectangle((90, 90, W - 91, H - 91), fill=255)
    m = ImageChops.multiply(m, ramp.filter(ImageFilter.GaussianBlur(45)))
    if (PIECE, GEN) == ("B", 2):  # B2's top invented a road stub and a wheat blob: only its rows below y 2080 are taken
        cut = Image.new("L", (W, H), 0)
        ImageDraw.Draw(cut).rectangle((0, (2080 - CROP[1]) * UP, W, H), fill=255)
        m = ImageChops.multiply(m, cut.filter(ImageFilter.GaussianBlur(40)))
    return m


def check(attempt):
    src = Image.open(source_path()).convert("RGB")
    edges = src.convert("L").filter(ImageFilter.FIND_EDGES)
    report = {}
    for f in sorted(folder(attempt).glob("v?.png")):
        v = Image.open(f).convert("RGB")
        if v.size != (W, H):
            v = v.resize((W, H), Image.LANCZOS)
        Image.blend(v, src, 0.5).save(f.with_name(f.stem + ".overlay.png"))
        ve = v.convert("L").filter(ImageFilter.FIND_EDGES)
        moved = {}
        for i, b in boxes():
            x0, y0, x1, y1 = (int(max(0, min(lim, c))) for c, lim in zip(b, (W, H, W, H)))
            if x1 - x0 < 60 or y1 - y0 < 60:
                continue
            tpl = edges.crop((x0, y0, x1, y1))
            best = None
            for dy in range(-40, 41, 4):
                for dx in range(-40, 41, 4):
                    if x0 + dx < 0 or y0 + dy < 0 or x1 + dx > W or y1 + dy > H:
                        continue
                    s = ImageStat.Stat(ImageChops.difference(tpl, ve.crop((x0 + dx, y0 + dy, x1 + dx, y1 + dy)))).mean[0]
                    if best is None or s < best[0]:
                        best = (s, dx, dy)
            if best and max(abs(best[1]), abs(best[2])) > 16:  # more than 8 screen px
                moved[i] = (best[1] // UP, best[2] // UP)
        report[f.name] = {"moved_screen_px": moved}
    (folder(attempt) / "check.json").write_text(json.dumps(report, indent=1))
    print(json.dumps(report, indent=1))


def build(attempt, pick):
    v = Image.open(folder(attempt) / f"{pick}.png").convert("RGB").resize((W, H), Image.LANCZOS)
    m = mask()
    sfx = "" if PIECE == "L" else f"_{PIECE}" + ("" if GEN == 1 else str(GEN))
    m.save(OUT / f"masque{sfx}.png")
    rgba = v.convert("RGBA")
    rgba.putalpha(m)
    # decal canvas centred on the middle of a tile: the nearest tile centre to the crop centre
    cx, cy = scr2ter(CROP[0] + (CROP[2] - CROP[0]) / 2, CROP[1] + (CROP[3] - CROP[1]) / 2)
    best = min(((i, j) for i in range(20) for j in range(20)), key=lambda t: (centre_px(*t)[0] - cx) ** 2 + (centre_px(*t)[1] - cy) ** 2)
    ox, oy = round(centre_px(*best)[0] - cx), round(centre_px(*best)[1] - cy)
    hw, hh = W // 2 + abs(ox), H // 2 + abs(oy)
    canvas = Image.new("RGBA", (2 * hw, 2 * hh), (0, 0, 0, 0))
    canvas.alpha_composite(rgba, (hw - ox - W // 2, hh - oy - H // 2))
    name = f"sol_sonde5{sfx}.webp"
    canvas.save(OUT / f"stamp{sfx}.png")
    canvas.save(OUT / name, lossless=True)
    (OUT / f"stamps{sfx}.json").write_text(json.dumps([{"asset": name, "tile": list(best), "flip": False, "band": "t4-6"}]))
    print("stamp", canvas.size, "tile", best, "offset", ox, oy)
    return rgba


def planche(attempt, pick):
    rgba = build(attempt, pick)
    over = Image.new("RGBA", base().size)
    over.paste(rgba.resize((W // UP, H // UP), Image.LANCZOS), (CROP[0], CROP[1]))
    shown = Image.alpha_composite(base().convert("RGBA"), over).convert("RGB")
    w = 540
    left = shown.resize((w, int(shown.height * w / shown.width)), Image.LANCZOS)
    tgt = Image.open(T.LOUPES / "targets/p06-jour/cible.png").convert("RGB")
    right = tgt.resize((w, int(tgt.height * w / tgt.width)), Image.LANCZOS)
    top = Image.new("RGB", (2 * w + 10, max(left.height, right.height)), (20, 20, 20))
    top.paste(left, (0, 0))
    top.paste(right, (w + 10, 0))
    # 2x crops (phone px) of the road and the wheat: the composite, then the raw draw
    zs = Image.open(folder(attempt) / f"{pick}.png").convert("RGB").resize((W, H))
    a = shown.crop((CROP[0], 1560, CROP[0] + 270, 1800)).resize((w, int(240 * w / 270)), Image.LANCZOS)
    b = zs.crop((0, 560, 540, 1040)).resize((w, int(480 * w / 540)), Image.LANCZOS)
    out = Image.new("RGB", (top.width, top.height + 10 + a.height), (20, 20, 20))
    out.paste(top, (0, 0))
    out.paste(a, (0, top.height + 10))
    out.paste(b, (w + 10, top.height + 10))
    out.save(OUT / "planche.webp", quality=88)
    print("planche", out.size)


def planche2(pick_a, pick_b):
    """Both pieces composited over the baseline (stamp under the kept sprites, approximated by the mask)."""
    shown = base().convert("RGBA")
    for piece, pick in (("A", pick_a), ("B", pick_b)):
        set_piece(piece)
        rgba = build(1, pick)
        over = Image.new("RGBA", shown.size)
        over.paste(rgba.resize((W // UP, H // UP), Image.LANCZOS), (CROP[0], CROP[1]))
        shown = Image.alpha_composite(shown, over)
    shown = shown.convert("RGB")
    shown.save(OUT / "ecran_AB.png")
    w = 540
    left = shown.resize((w, int(shown.height * w / shown.width)), Image.LANCZOS)
    tgt = Image.open(T.LOUPES / "targets/p06-jour/cible.png").convert("RGB")
    right = tgt.resize((w, int(tgt.height * w / tgt.width)), Image.LANCZOS)
    top = Image.new("RGB", (2 * w + 10, max(left.height, right.height)), (20, 20, 20))
    top.paste(left, (0, 0))
    top.paste(right, (w + 10, 0))
    # 2x crops (phone px, 270x240 -> 540x480) of each join: A top (palisade), A/B overlap, B bottom
    joins = [(0, 1260), (330, 1700), (330, 2080)]
    crops = [shown.crop((x, y, x + 270, y + 240)).resize((540, 480), Image.LANCZOS) for x, y in joins]
    out = Image.new("RGB", (3 * 540 + 20, top.height + 10 + 480), (20, 20, 20))
    out.paste(top.resize((top.width, top.height)), ((out.width - top.width) // 2, 0))
    for k, c in enumerate(crops):
        out.paste(c, (k * 550, top.height + 10))
    out.save(OUT / "planche_AB.webp", quality=88)
    print("planche_AB", out.size)


def planche3(gen, pick_a, pick_b):
    """Gen 2: both pieces over the baseline, the debug image of the code's path, the alignment check."""
    import colorsys

    shown = base().convert("RGBA")
    for piece, pick in (("A", pick_a), ("B", pick_b)):
        set_piece(piece)
        set_gen(gen)
        rgba = build(gen, pick)
        over = Image.new("RGBA", shown.size)
        over.paste(rgba.resize((W // UP, H // UP), Image.LANCZOS), (CROP[0], CROP[1]))
        shown = Image.alpha_composite(shown, over)
    shown = shown.convert("RGB")
    shown.save(OUT / f"ecran_AB{gen}.png")
    street, route, voie = paths()
    # debug: the code's path as a thin line over the stamped screen, nodes as dots
    dbg = shown.copy()
    dd = ImageDraw.Draw(dbg)
    for line, col in ((street, (0, 255, 255)), (route, (255, 40, 40)), (voie, (255, 0, 255))):
        pts = [g2s(g) for g in line]
        dd.line(pts, fill=col, width=2)
        for q in pts:
            dd.ellipse((q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4), outline=col, width=2)
    dd.rectangle([g2s((12, 16)), g2s((13, 17))], outline=(255, 255, 0), width=1)
    dbg.crop((0, 1300, 1080, 1900)).save(OUT / f"debug_route{gen}.png")
    # alignment: at each node, is there road colour (light, low saturation) within 10 px?
    set_piece("A")
    drawn = Image.open(folder(gen) / f"{pick_a}.png").convert("RGB").resize((CROP[2] - CROP[0], CROP[3] - CROP[1]))
    res = {}
    for name, line in (("rue", street), ("route", route)):
        out = []
        for g in line:
            x, y = g2s(g)
            n = tot = 0
            for yy in range(int(y) - 10, int(y) + 11, 2):
                for xx in range(int(x) - 10, int(x) + 11, 2):
                    if 0 <= xx < drawn.width and 0 <= yy - CROP[1] < drawn.height:
                        r, gg, b = drawn.getpixel((xx, yy - CROP[1]))
                        h, sat, v = colorsys.rgb_to_hsv(r / 255, gg / 255, b / 255)
                        tot += 1
                        n += sat < 0.3 and v > 0.6
            out.append(f"{100 * n // max(1, tot)}%")
        res[name] = out
    print("road-coloured share within 10 px of each node:", res)
    w = 540
    left = shown.resize((w, int(shown.height * w / shown.width)), Image.LANCZOS)
    tgt = Image.open(T.LOUPES / "targets/p06-jour/cible.png").convert("RGB")
    right = tgt.resize((w, int(tgt.height * w / tgt.width)), Image.LANCZOS)
    top = Image.new("RGB", (2 * w + 10, max(left.height, right.height)), (20, 20, 20))
    top.paste(left, (0, 0))
    top.paste(right, (w + 10, 0))
    crops = [shown.crop((x, y, x + 270, y + 240)).resize((540, 480), Image.LANCZOS) for x, y in ((230, 1330), (140, 1470))]
    out = Image.new("RGB", (top.width, top.height + 10 + 480), (20, 20, 20))
    out.paste(top, (0, 0))
    for k, c in enumerate(crops):
        out.paste(c, (k * 550, top.height + 10))
    out.save(OUT / f"planche_AB{gen}.webp", quality=88)
    print("planche", out.size)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=("prep", "geom", "paint", "check", "build", "planche", "planche2", "planche3"))
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--note", default="")
    ap.add_argument("--pick", default="v0")
    ap.add_argument("--piece", default="L", choices=tuple(PIECES))
    ap.add_argument("--with", dest="with_", default=None, help="B: the chosen A draw to paste in the overlap")
    a = ap.parse_args()
    set_piece(a.piece)
    set_gen(a.attempt if a.cmd in ("prep", "paint", "check", "build") and a.piece != "L" else 1)
    if a.cmd == "prep":
        prep(a.with_)
    elif a.cmd == "geom":
        geom()
    elif a.cmd == "paint":
        paint(a.attempt, a.n, a.note)
    elif a.cmd == "check":
        check(a.attempt)
    elif a.cmd == "build":
        build(a.attempt, a.pick)
    elif a.cmd == "planche3":
        planche3(a.attempt, "v0", "v2")
    elif a.cmd == "planche2":
        planche2("v1", "v2")
    else:
        planche(a.attempt, a.pick)
