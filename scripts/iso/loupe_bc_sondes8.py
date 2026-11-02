#!/usr/bin/env python3
"""Loupe BC sondes-8 (round 2): the context pass of sondes-7 again, with a dominant road that touches the gate, thin
tracks, a broken wheat plot and two cottages painted in the stamp. Plus the undergrowth family (magenta strips).

    python3 scripts/iso/loupe_bc_sondes8.py prep | paint [--try N] [--n 4] | check [--try N]
                                           | build [--try N] [--pick vK] | planche [--try N] [--pick vK]
                                           | sousbois-prep | sousbois-paint [--try N] [--n 2] | sousbois-key [--try N]
                                           | sousbois-export [--pick vA,vB,vC] [--try N]

Reuses sondes-7 (and through it sondes-6 and -5) by patching its module globals: the crop, the output folder, the
prompt, the hints and the stamp build. The clean meadow of sondes-6 is the base. Dev only, nothing wired.
FLUX through iso_loop's registry. cible.png is never sent to FLUX, no Thronebreaker or moodboard image.
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
import loupe_targets as T
import rues_port as R
from iso_loop import FLUX3, guard_endpoint, reserve, settle
from lib import flux
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = T.LOUPES / "bc/r2/sondes"
CACHE = flux.ORIGINALS.parent / "loupes-sondes8"
UP = P.UP
X0, Y0, X1, Y1 = 110, 1340, 1050, 2250  # screen px of the pass: down to the road's last cell (34, 35), at screen y 2169
CW, CH = (X1 - X0) * UP, (Y1 - Y0) * UP
FADE = (2150, 2236)  # the road fades only here, at its very end

# Cottage footprints, cells [i0, j0, i1, j1]: A shifted one cell down and right of the brief so that its roof clears the vegetable plot.
COTTAGES = {"A": (27.0, 17.5, 29.5, 19.5), "B": (23.5, 25.0, 26.0, 27.0)}
# Thin worn tracks, grid cells: a lane north of the wheat to cottage A and the vegetable plot, a spur to the wheat, the road to cottage B and on to the pasture gate.
TRACKS = {
    "lane": [(12.45, 19.9), (14.6, 20.2), (17.2, 19.4), (20.0, 18.9), (23.5, 19.0), (26.0, 19.1), (27.0, 19.4)],
    "ble": [(21.2, 18.95), (21.1, 19.8)],
    "potager": [(27.8, 17.6), (27.1, 16.9), (26.4, 16.2)],
    "B": [(22.04, 26.18), (22.9, 26.0), (23.6, 26.0)],
    "paturage": [(26.1, 25.6), (26.9, 25.0), (27.5, 24.2)],
}

PROMPT = (
    "Paint over image 1, a crop of a screenshot of an isometric village game, keeping its exact camera and framing. "
    "ABSOLUTE RULE: every building, palisade fence and wall, villager and the small wheat strips next to the east end of the "
    "palisade stay exactly where they are, same size, same shape, same silhouette. Do not move, add or remove any village building. "
    "Do not change the camera. The meadow below is already painted: keep it, change only what is described here. The style is given by "
    "images 2 and 3: Franco-Belgian comic ink, matte, two or three values per surface, warm late-afternoon light from the top left.\n"
    "What to paint on the ground, at the faint places hinted in image 1:\n"
    "- ONE main road, clearly the dominant element of the picture: wide packed earth in a warm pale sand-grey, hinted as a faint pale "
    "ribbon, follow it. It starts exactly in the opening of the palisade, between the two gate posts, right up to the posts and the "
    "villager standing there, with no gap and no cut end and no dirt blob, winds down the picture with a curving course, and runs all "
    "the way to the bottom where it thins out and fades into the grass. Its width varies a lot from place to place, never an even snake, "
    "edges frayed, grass biting into the road, small stones and tufts along it, no dark outline.\n"
    "- Thin worn earth tracks, much narrower and fainter than the road, curved, joining the plots to the road, never three equal branches.\n"
    "- One large wheat plot to the right of the road: flat parallel bands of golden wheat on ochre earth, its edges irregular and "
    "softened into the meadow, one corner of its outline broken and bitten by grass, a short row cut in the middle, never a rectangle "
    "and never a grid of squares, with a few stooks of wheat, big enough to read from far away.\n"
    "- One vegetable plot at the upper right: tilled rows with green plants, a low wooden fence and a well, edges blended into the grass.\n"
    "- One pasture at the lower right: a LIGHT thin timber fence round worn grass, 2 or 3 white sheep and a hay pile inside.\n"
    "- Two small farm cottages, painted flat into the ground like the rest, one at the right of the wheat between the vegetable plot "
    "and the pasture, one just right of the road lower down: thatched or terracotta-tiled roof, cream plastered walls with dark timber "
    "frame, a brick chimney, a wooden door facing its track, a stone base with a small yard, and a few objects around each (a barrel, a "
    "crate, a woodpile, a bench, a cart, a small garden bed). Each stands on the earth with a stone foundation, no cast shadow on the ground.\n"
    "- The meadow stays olive (like #6A7442 in sunlight), less green and not yellow, large calm areas, very few flowers.\n"
    "The ground carries NO trees at all and NO tree shadows and no cast shadows of any kind (trees are added later by the game): bushes "
    "under knee height and rocks are fine.\n"
    "No text, no letters, no runes, no glossy surfaces, no noise texture, no perfect symmetry, no vignette frame, no sky. "
    "The camera stays high; the land fills the whole image. No small symbols or icons.\n"
)


def px(g):
    x, y = M.g2s(g)
    return (x - X0) * UP, (y + M.TOP - Y0) * UP


def road_pts():
    line, _ = M.route_line()
    line = [(line[0][0] + 0.02, line[0][1] - 0.55)] + line  # up into the palisade opening
    return S5.resample([M.g2s(g) for g in line], 3)  # crop-relative screen px (y from M.TOP), 1x


def half_widths(n):
    return [(35 - 9 * k / n) * (1 + 0.22 * math.sin(k / 9.0) + 0.13 * math.sin(k / 3.1 + 1)) * (1 - 0.7 * max(0.0, (k / n - 0.9) / 0.1) ** 1.5) for k in range(n)]


def hints(im):
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    pts1 = road_pts()
    pts = [((x - X0) * UP, (y + M.TOP - Y0) * UP) for x, y in pts1]
    half = [h * UP for h in half_widths(len(pts))]
    road = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(road).polygon(S5.ribbon_poly(pts, half, 5), fill=(190, 179, 152, 175))
    fade = Image.new("L", im.size, 255)
    fd = ImageDraw.Draw(fade)
    for y in range(im.height):
        sy = Y0 + y / UP
        if sy > FADE[0]:
            fd.line([(0, y), (im.width, y)], fill=max(0, int(255 * (1 - (sy - FADE[0]) / (FADE[1] - FADE[0])))))
    road.putalpha(ImageChops.multiply(road.getchannel("A"), fade))
    ov = Image.alpha_composite(ov, road)
    d = ImageDraw.Draw(ov)

    def quad(r):
        a, b, c, e = r
        return [px((a, b)), px((c, b)), px((c, e)), px((a, e))]

    Pa = R.PARCELLES
    d.polygon(quad(Pa["ble"]), fill=(192, 150, 88, 120))
    d.polygon(quad(Pa["potager"]), fill=(112, 92, 62, 110))
    d.polygon(quad(Pa["paturage"]), fill=(150, 150, 96, 80))
    for k, tr in enumerate(TRACKS.values()):
        p = S5.resample([px(g) for g in tr], 6)
        d.polygon(S5.ribbon_poly(p, [4.5 * UP] * len(p), 12 + k), fill=(184, 168, 134, 135))
    for r in COTTAGES.values():  # a faint footprint and a roof ridge, so that the model finds where to put a house
        base = quad(r)
        d.polygon(base, fill=(205, 192, 160, 110))
        cx = sum(p[0] for p in base) / 4
        cy = sum(p[1] for p in base) / 4
        d.polygon([(cx - 70, cy - 20), (cx, cy - 95), (cx + 70, cy - 20), (cx, cy + 30)], fill=(150, 85, 62, 90))
    ov = ov.filter(ImageFilter.GaussianBlur(5))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


def keep_boxes():
    """The sondes-7 boxes, with the three sprites of the gate opening cut down so that the road reaches them."""
    boxes = []
    for s in M.DUMP["sprites"]:
        lay = s.get("layer")
        keep = lay in M.KEEP and not s.get("screenFixed") and s["y"] + s["h"] > M.TOP and s["y"] < M.BOT
        if lay == "field" and (s["tileI"], s["tileJ"]) in P.PLAN_BLOCK:
            boxes.append((s["x"], s["y"], s["x"] + s["w"], s["y"] + s["h"]))
        if not keep:
            continue
        x0, y0, x1, y1 = s["x"], s["y"], s["x"] + s["w"], s["y"] + s["h"]
        if lay == "wall" and s["tileJ"] == 16 and s["tileI"] in (11, 13):  # the two gate posts: only the post, not the grass under its box
            y1 -= 18
        if lay == "villager" and (s["tileI"], s["tileJ"]) == (12, 16):  # the gate villager: its figure only
            x0, y0, x1, y1 = x0 + 14, y0 + 6, x1 - 14, y1 - 6
        boxes.append((x0, y0, x1, y1))
    return boxes


def corridor(size, scale, origin_y, n_pts=70, extra=10):
    """The road's first stretch from the gate, as a soft mask in the pixels of a full-crop image of `size`."""
    m = Image.new("L", size, 0)
    pts = [(x * scale, (y - origin_y + M.TOP) * scale) for x, y in road_pts()[:n_pts]]
    half = [(h + extra) * scale for h in half_widths(len(pts))]
    ImageDraw.Draw(m).polygon(S5.ribbon_poly(pts, half, 5), fill=255)
    return m.filter(ImageFilter.GaussianBlur(10))


def context():
    ground = M.tint(Image.open(M.OUT / "meadow_blend.png").convert("RGB")).resize((1080, M.BOT - M.TOP), Image.LANCZOS)
    calm = ground.filter(ImageFilter.MedianFilter(9))
    ramp = Image.new("L", ground.size, 0)
    rd = ImageDraw.Draw(ramp)
    for x in range(560, 1080):
        rd.line([(x, 0), (x, ground.height)], fill=min(255, int(255 * (x - 560) / 200)))
    ground = Image.composite(calm, ground, ramp)
    cap = S5.base().crop((0, M.TOP, 1080, M.BOT))
    keep = Image.new("L", cap.size, 0)
    d = ImageDraw.Draw(keep)
    for x0, y0, x1, y1 in keep_boxes():
        d.rectangle((x0, y0 - M.TOP, x1, y1 - M.TOP), fill=255)
    keep = keep.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(3))
    return Image.composite(cap, ground, keep)


def prep():
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    ctx = context()
    ctx.save(OUT / "contexte_ecran.png")
    inp = hints(ctx.crop((X0, Y0 - M.TOP, X1, Y1 - M.TOP)).resize((CW, CH), Image.LANCZOS))
    inp.save(CACHE / "in.png")
    inp.save(OUT / "entree.png")
    print("input", inp.size)


def build(attempt, pick):
    """The draw back to raw tones over the sondes-6 meadow, ground only: one RGBA stamp for band t4-6."""
    from cuire_sol import centre_px

    v = M.tint(Image.open(OUT / f"contexte_try{attempt}" / f"{pick}.png").convert("RGB").resize((CW, CH), Image.LANCZOS), inverse=True)
    full = Image.open(M.OUT / "meadow_blend.png").convert("RGB")
    ramp = Image.new("L", (CW, CH), 0)
    ImageDraw.Draw(ramp).rectangle((120, 120, CW - 121, CH - 61), fill=255)
    full.paste(v, (X0 * UP, (Y0 - M.TOP) * UP), ramp.filter(ImageFilter.GaussianBlur(50)))
    W, H = M.W, M.H
    edge = Image.new("L", (W, H), 0)
    ImageDraw.Draw(edge).rectangle((90, 90, W - 91, H), fill=255)
    keep = Image.new("L", (W, H), 0)
    kd = ImageDraw.Draw(keep)
    for a, b, c, e in keep_boxes():
        kd.rectangle((a * UP, (b - M.TOP) * UP, c * UP, (e - M.TOP) * UP), fill=255)
    keep = keep.filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.GaussianBlur(12))
    keep = ImageChops.multiply(keep, Image.eval(corridor((W, H), UP, 0), lambda p: 255 - p))  # the road goes right up to the posts
    alpha = ImageChops.multiply(Image.eval(keep, lambda p: 255 - p), edge.filter(ImageFilter.GaussianBlur(45)))
    alpha = ImageChops.multiply(alpha, M.ground_alpha())
    rgba = full.convert("RGBA")
    rgba.putalpha(alpha)
    x0, y0 = (round(t) for t in S5.scr2ter(0, M.TOP))
    cx, cy = x0 + W / 2, y0 + H / 2
    best = min(((i, j) for i in range(40) for j in range(40)), key=lambda t: (centre_px(*t)[0] - cx) ** 2 + (centre_px(*t)[1] - cy) ** 2)
    ox, oy = round(centre_px(*best)[0] - cx), round(centre_px(*best)[1] - cy)
    hw, hh = W // 2 + abs(ox), H // 2 + abs(oy)
    canvas = Image.new("RGBA", (2 * hw, 2 * hh), (0, 0, 0, 0))
    canvas.alpha_composite(rgba, (hw - ox - W // 2, hh - oy - H // 2))
    canvas.save(OUT / "sol_r2.webp", lossless=True)
    canvas.save(OUT / "stamp.png")
    alpha.save(OUT / "masque.png")
    (OUT.parent / "stamps.json").write_text(json.dumps([{"asset": "sondes/sol_r2.webp", "tile": list(best), "flip": False, "band": "t4-6"}]))
    rgba.save(CACHE / "stamp_crop.png")
    print("stamp", canvas.size, "tile", best, "offset", ox, oy)


def shown_screen():
    st = Image.open(CACHE / "stamp_crop.png")
    rgb = M.tint(st.convert("RGB")).resize((1080, M.BOT - M.TOP), Image.LANCZOS)
    al = st.getchannel("A").resize((1080, M.BOT - M.TOP), Image.LANCZOS)
    over = Image.new("RGBA", S5.base().size)
    rg = rgb.convert("RGBA")
    rg.putalpha(al)
    over.paste(rg, (0, M.TOP))
    return Image.alpha_composite(S5.base().convert("RGBA"), over).convert("RGB")


def sb_panels(shown):
    """The forest mass alone, then with the three strips at its foot, on the stamped ground at in-game size (mass 300 px wide)."""
    box = (480, 1720, 1020, 2080)
    sc = 300 / 448
    masse = Image.open(SB / "feuillus.webp").convert("RGBA")
    masse = masse.resize((round(masse.width * sc), round(masse.height * sc)), Image.LANCZOS)
    panels = []
    for strips in (False, True):
        pn = shown.crop(box).convert("RGBA")
        x, y = (pn.width - masse.width) // 2, pn.height - masse.height - 60
        if strips:
            for n, dx in ((2, -120), (1, -40), (3, 70)):
                st = Image.open(SB / f"sousbois_{n}.webp").convert("RGBA")
                st = st.resize((round(st.width * sc), round(st.height * sc)), Image.LANCZOS)
                pn.alpha_composite(st, (x + dx, y))
        pn.alpha_composite(masse, (x, y))
        if strips:  # the strips lie at the foot: drawn again over the trunks' base, behind nothing
            for n, dx in ((2, -120), (1, -40), (3, 70)):
                st = Image.open(SB / f"sousbois_{n}.webp").convert("RGBA")
                st = st.resize((round(st.width * sc), round(st.height * sc)), Image.LANCZOS)
                lower = st.crop((0, st.height * 3 // 4, st.width, st.height))
                pn.alpha_composite(lower, (x + dx, y + st.height * 3 // 4))
        panels.append(pn.convert("RGB"))
    row = Image.new("RGB", (1090, panels[0].height), (20, 20, 20))
    row.paste(panels[0], (0, 0))
    row.paste(panels[1], (550, 0))
    return row


def planche(attempt, pick):
    build(attempt, pick)
    shown = shown_screen()
    shown.save(OUT / "ecran.png")
    w = 540
    left = shown.resize((w, int(shown.height * w / shown.width)), Image.LANCZOS)
    tgt = Image.open(T.LOUPES / "targets/p06-jour/cible.png").convert("RGB")
    right = tgt.resize((w, int(tgt.height * w / tgt.width)), Image.LANCZOS)
    top = Image.new("RGB", (2 * w + 10, max(left.height, right.height)), (20, 20, 20))
    top.paste(left, (0, 0))
    top.paste(right, (w + 10, 0))
    gate = shown.crop((250, 1300, 520, 1460)).resize((1080, 640), Image.LANCZOS)
    row = sb_panels(shown)
    out = Image.new("RGB", (top.width, top.height + 10 + 640 + 10 + row.height), (20, 20, 20))
    out.paste(top, (0, 0))
    out.paste(gate, (0, top.height + 10))
    out.paste(row, (0, top.height + 10 + 640 + 10))
    out.save(OUT / "planche.webp", quality=88)
    print("planche", out.size)


# ----------------------------------------------------------------------------------------------- undergrowth family
SB = ROOT / "assets/images/village/iso/foret"
SB_W, SB_H = 0, 0  # set from the size of foret/bord_crete.webp in sb_size()
SB_EACH = 0.07
SB_PROMPT = (
    "Paint three low wide strips of forest undergrowth, side by side stacked vertically on a flat solid magenta #FF00FF "
    "background, each strip separated from the next by plain magenta. Each strip is a long thin band seen from a high isometric "
    "camera, the ground cover that lies at the foot of a forest: ferns, moss clumps, tangled tree roots, grass tufts, small "
    "stones, fallen leaves, a few mushrooms. Strip one mostly ferns, strip two mostly moss and roots, strip three mostly small stones "
    "and grass. Franco-Belgian comic ink like the forest masses of image 1, thin dark ink outline, matte, two or three values per "
    "surface. Warm yellow-green light on the top-left parts, blue-green cool shade on the underside. Each strip is wide and low, about "
    "four times wider than tall, with a ragged top edge and a ragged bottom edge that dissolve into nothing, no ground slab, no disc, "
    "no oval base, no shadow, no flat ground under it, only the plants themselves floating on the magenta. No trunk, no tree, "
    "no text, no letters, no frame, no border, no magenta inside the plants.\n"
)


def sb_size():
    return Image.open(SB / "bord_crete.webp").size


def sousbois_prep():
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    refs = []
    for name in ("feuillus", "bouleaux"):
        im = Image.open(SB / f"{name}.webp").convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 0, 255))  # the reference sits on magenta, as the answer must
        bg.paste(im, mask=im.getchannel("A"))
        p = CACHE / f"ref_{name}.png"
        bg.save(p)
        refs.append(p)
    print("refs", [Image.open(p).size for p in refs], "ratchet size", sb_size())


def sousbois_paint(attempt, n):
    guard_endpoint(FLUX3)
    d = OUT / f"sousbois_try{attempt}"
    d.mkdir(parents=True, exist_ok=True)
    cache = CACHE / d.name
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"v{i}.png" for i in range(n)]
    if any(o.exists() for o in outs) or any(d.glob("v?.png")):
        sys.exit("variants exist: pass --try")
    refs = (CACHE / "ref_feuillus.png", CACHE / "ref_bouleaux.png")
    batch = reserve(n, SB_EACH + 0.03, f"loupe bc sondes8 {d.name}", None)
    responses: list = []

    def one(io):
        flux.generate(slug="loupe_bc_sondes8_sousbois", prompt=SB_PROMPT, out=io[1], width=1024, height=1024, attempts=1,
                      references=refs, extra={"width": 1024, "height": 1024}, submitted_log=responses,
                      endpoint=FLUX3, seed=9000 + 100 * attempt + io[0])

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            list(pool.map(one, enumerate(outs)))
    finally:
        entry = settle(batch, responses)
    for o in outs:
        if o.exists():
            Image.open(o).convert("RGB").save(d / o.name)
    (d / "prompt.txt").write_text(SB_PROMPT)
    print(json.dumps({"made": [o.name for o in outs if o.exists()], "cost": entry["cost"]}))


def key_magenta(im):
    """Magenta to alpha, the fringe eaten by one px and despilled, so no pink rim stays on the ink."""
    im = im.convert("RGB")
    r, g, b = im.split()
    mag = ImageChops.subtract(ImageChops.darker(r, b), g).point(lambda v: 255 if v > 70 else 0)
    mag = mag.filter(ImageFilter.MaxFilter(3))  # the pink halo of the antialiased edge goes with the background
    alpha = ImageChops.invert(mag).filter(ImageFilter.GaussianBlur(0.6))
    spill = ImageChops.subtract(ImageChops.darker(r, b), g).point(lambda v: max(0, v - 10))
    r = ImageChops.subtract(r, spill)
    b = ImageChops.subtract(b, spill)
    return Image.merge("RGBA", (r, g, b, alpha))


def split_strips(keyed):
    """The bands of rows that hold alpha, each cropped tight, in reading order."""
    a = keyed.getchannel("A")
    rows = [a.crop((0, y, a.width, y + 1)).getbbox() is not None and sum(a.crop((0, y, a.width, y + 1)).point(lambda v: v > 128 and 255).histogram()[255:]) > 6 for y in range(a.height)]
    out, start = [], None
    for y, on in enumerate(rows + [False]):
        if on and start is None:
            start = y
        elif not on and start is not None:
            if y - start > 40:
                band = keyed.crop((0, start, a.width, y))
                out.append(band.crop(band.getchannel("A").point(lambda v: v > 40 and 255).getbbox()))
            start = None
    return out


def sousbois_key(attempt):
    d = OUT / f"sousbois_try{attempt}"
    rep = {}
    for f in sorted(d.glob("v?.png")):
        k = key_magenta(Image.open(f))
        k.save(d / f"{f.stem}.keyed.png")
        strips = split_strips(k)
        for i, s in enumerate(strips):
            s.save(d / f"{f.stem}.s{i}.png")
        rep[f.name] = [s.size for s in strips]
    print(json.dumps(rep))


def sousbois_export(picks, attempt):
    """Three strips on one canvas size, the size of the family's other masses (448 x 384), then their nights.

    nuit_alentours.cuire is called on these three files only: its main would regrade every asset of the branch.
    """
    import nuit_alentours as N

    w, h = sb_size()
    d = OUT / f"sousbois_try{attempt}"
    for n, pick in enumerate(picks, 1):
        s = Image.open(d / f"{pick}.png").convert("RGBA")
        sc = (w - 8) / s.width
        s = s.resize((max(1, round(s.width * sc)), max(1, round(s.height * sc))), Image.LANCZOS)
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        canvas.alpha_composite(s, ((w - s.width) // 2, h - s.height - 4))  # the strip's foot sits on the canvas' foot
        dst = SB / f"sousbois_{n}.webp"
        canvas.save(dst, "WEBP", quality=80, method=6)
        print(dst.name, canvas.size, dst.stat().st_size)
        N.cuire(dst)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=("prep", "paint", "check", "build", "planche", "sousbois-prep", "sousbois-paint", "sousbois-key", "sousbois-export"))
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--pick", default="v0")
    a = ap.parse_args()
    # patch sondes-7's globals: its paint and check then run on this pass's crop, prompt, hints and folders
    P.OUT, P.CACHE, P.X0, P.Y0, P.X1, P.Y1, P.CW, P.CH, P.FADE = OUT, CACHE, X0, Y0, X1, Y1, CW, CH, FADE
    P.PROMPT, P.TRACKS, P.hints, P.keep_boxes, P.context, P.build = PROMPT, TRACKS, hints, keep_boxes, context, build
    _gen = flux.generate
    flux.generate = lambda **kw: _gen(**{**kw, "slug": kw["slug"].replace("sondes7", "sondes8")})
    _res = P.reserve
    P.reserve = lambda n, each, label, probe: _res(n, each, label.replace("sondes7", "sondes8"), probe)
    if a.cmd == "prep":
        prep()
    elif a.cmd == "paint":
        P.paint(a.attempt, a.n)
    elif a.cmd == "check":
        P.check(a.attempt)
    elif a.cmd == "build":
        build(a.attempt, a.pick)
    elif a.cmd == "planche":
        planche(a.attempt, a.pick)
    elif a.cmd == "sousbois-prep":
        sousbois_prep()
    elif a.cmd == "sousbois-paint":
        sousbois_paint(a.attempt, a.n)
    elif a.cmd == "sousbois-key":
        sousbois_key(a.attempt)
    else:
        sousbois_export(a.pick.split(","), a.attempt)
