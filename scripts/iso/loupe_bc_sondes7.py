#!/usr/bin/env python3
"""Loupe BC sondes-7: the context pass again, with the larger plots (wheat, vegetable plot, pasture) right of the road.

    python3 scripts/iso/loupe_bc_sondes7.py prep | paint [--try N] [--n 4] | check [--try N]
                                           | build [--try N] [--pick vK] | planche [--try N] [--pick vK]

The clean meadow of sondes-6 (meadow_blend.png, raw terrain tones) is kept: no new meadow pass. The input is the real
screen over that meadow, the kept sprites and the plan's field block near cell (18, 16) in place, the road, plots and
tracks hinted faintly. The result goes back to raw tones through sondes-6's per-channel fit. Dev only, nothing wired.
FLUX through iso_loop's registry, generated in the cache then copied. cible.png is never sent to FLUX.
"""
import argparse
import concurrent.futures
import json
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import loupe_bc_sondes6 as M
import loupe_bc_sondes5 as S5
import loupe_targets as T
import rues_port as R
from iso_loop import FLUX3, guard_endpoint, reserve, settle
from lib import flux
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

OUT = T.LOUPES / "bc/r1/sondes-7"
CACHE = flux.ORIGINALS.parent / "loupes-sondes7"
UP = 2
X0, Y0, X1, Y1 = 100, 1330, 1060, 2060  # screen px of the pass: the road, the three plots, the palisade opening
CW, CH = (X1 - X0) * UP, (Y1 - Y0) * UP
EACH = 0.14
FADE = (1940, 2040)  # the road fades out here, under the forest crowns of the game

# short worn tracks from each plot to the road, grid cells (the road's nodes are in route_tuiles.json)
TRACKS = {
    "ble": [(21.0, 22.8), (21.3, 24.3), (21.09, 25.45)],
    "potager": [(22.5, 15.5), (22.3, 17.9), (21.2, 18.9), (20.3, 20.4), (19.6, 22.6), (18.8, 24.8)],
    "paturage": [(27.5, 24.2), (25.5, 25.6), (23.9, 26.6), (22.9, 26.9)],
}
PLAN_BLOCK = {(i, j) for i in (18, 19, 20) for j in (16, 17)}  # the plan's field strips, drawn in game: kept as they are

PROMPT = (
    "Paint over image 1, a crop of a screenshot of an isometric village game, keeping its exact camera and framing. "
    "ABSOLUTE RULE: every building, palisade fence and wall, villager and the small wheat strips next to the east end of the "
    "palisade stay exactly where they are, same size, same shape, same silhouette. Do not move, add or remove any building or any house. "
    "Do not change the camera. The meadow below is already painted: keep it, change only what is described here. The style is given by "
    "images 2 and 3: Franco-Belgian comic ink, matte, two or three values per surface, warm late-afternoon light from the top left.\n"
    "What to paint on the ground, at the faint places hinted in image 1:\n"
    "- A pale sand-grey packed-earth road, hinted as a faint pale ribbon: follow it. It starts exactly in the opening of the palisade, "
    "the gate, with no gap and no dirt blob there, winds down and to the right, and fades out into the grass at the bottom of the picture. "
    "A little wide, its width varies a lot from place to place, never an even snake, edges frayed, grass biting into the road, small "
    "stones and tufts along it.\n"
    "- One large wheat plot to the right of the road: flat parallel bands of golden wheat on ochre earth, its edges irregular and softened "
    "into the meadow, never a rectangle and never a grid of squares, with several stooks of wheat, big enough to read from far away.\n"
    "- One vegetable plot at the upper right: tilled rows with green plants, a low wooden fence and a well, edges blended into the grass.\n"
    "- One pasture at the lower right: a rough timber fence round worn grass, 2 or 3 white sheep and a hay pile inside.\n"
    "- Each plot has a short worn earth track joining it to the road, so nothing floats.\n"
    "- The meadow stays olive (like #6A7442 in sunlight), less green and not yellow, large calm areas, very few flowers.\n"
    "The ground carries NO trees at all and NO tree shadows and no cast shadows of any kind (trees are added later by the game): bushes "
    "under knee height and rocks are fine.\n"
    "No text, no letters, no runes, no glossy surfaces, no noise texture, no perfect symmetry, no vignette frame, no new houses, no sky. "
    "The camera stays high; the land fills the whole image. No small symbols or icons.\n"
)


def px(g):
    """Grid point -> pixel of this pass's 2x image."""
    x, y = M.g2s(g)
    return (x - X0) * UP, (y + M.TOP - Y0) * UP


def keep_boxes():
    boxes = [(x0, y0 + M.TOP, x1, y1 + M.TOP) for x0, y0, x1, y1 in M.keep_boxes()]
    for s in M.DUMP["sprites"]:
        if s.get("layer") == "field" and (s["tileI"], s["tileJ"]) in PLAN_BLOCK:
            boxes.append((s["x"], s["y"], s["x"] + s["w"], s["y"] + s["h"]))
    return boxes


def context():
    """The real screen over the sondes-6 meadow, with the plan's field strips kept and the right half's flowers thinned."""
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
    keep = keep.filter(ImageFilter.MaxFilter(29)).filter(ImageFilter.GaussianBlur(6))
    return Image.composite(cap, ground, keep)


def hints(im):
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    line, _ = M.route_line()
    line = [(line[0][0], line[0][1] - 0.5)] + line  # into the palisade opening
    pts = S5.resample([px(g) for g in line], 6)
    half = [(30 - 11 * k / len(pts)) * UP * (1 + 0.22 * math.sin(k / 5.5) + 0.12 * math.sin(k / 2.1 + 1)) for k in range(len(pts))]
    road = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(road).polygon(S5.ribbon_poly(pts, half, 5), fill=(190, 179, 152, 170))
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

    P = R.PARCELLES
    d.polygon(quad(P["ble"]), fill=(192, 150, 88, 120))
    d.polygon(quad(P["potager"]), fill=(112, 92, 62, 110))
    d.polygon(quad(P["paturage"]), fill=(150, 150, 96, 80))
    for k, tr in enumerate(TRACKS.values()):
        p = S5.resample([px(g) for g in tr], 6)
        d.polygon(S5.ribbon_poly(p, [8 * UP] * len(p), 12 + k), fill=(184, 168, 134, 140))
    ov = ov.filter(ImageFilter.GaussianBlur(5))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


def prep():
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    ctx = context()
    ctx.save(OUT / "contexte_ecran.png")
    inp = hints(ctx.crop((X0, Y0 - M.TOP, X1, Y1 - M.TOP)).resize((CW, CH), Image.LANCZOS))
    inp.save(CACHE / "in.png")
    inp.save(OUT / "entree.png")
    print("input", inp.size)


def paint(attempt, n):
    guard_endpoint(FLUX3)
    d = OUT / f"contexte_try{attempt}"
    d.mkdir(parents=True, exist_ok=True)
    cache = CACHE / d.name
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"v{i}.png" for i in range(n)]
    if any(o.exists() for o in outs) or any(d.glob("v?.png")):
        sys.exit("variants exist: pass --try")
    batch = reserve(n, EACH, f"loupe bc sondes7 {d.name}", None)
    responses: list = []

    def one(io):
        flux.generate(slug="loupe_bc_sondes7", prompt=PROMPT, out=io[1], width=CW, height=CH, attempts=1,
                      references=(CACHE / "in.png", *M.STYLE), extra={"width": CW, "height": CH}, submitted_log=responses,
                      endpoint=FLUX3, seed=8000 + 100 * attempt + io[0])

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


def check(attempt):
    src = Image.open(CACHE / "in.png").convert("RGB")
    edges = src.convert("L").filter(ImageFilter.FIND_EDGES)
    rep = {}
    for f in sorted((OUT / f"contexte_try{attempt}").glob("v?.png")):
        v = Image.open(f).convert("RGB").resize(src.size, Image.LANCZOS)
        Image.blend(v, src, 0.5).save(f.with_name(f.stem + ".overlay.png"))
        ve = v.convert("L").filter(ImageFilter.FIND_EDGES)
        moved = {}
        for i, (a, b, c, e) in enumerate(keep_boxes()):
            bx = [int(max(0, min(lim, (v_ - o) * UP))) for v_, o, lim in ((a, X0, CW), (b, Y0, CH), (c, X0, CW), (e, Y0, CH))]
            if bx[2] - bx[0] < 60 or bx[3] - bx[1] < 60:
                continue
            tpl = edges.crop(tuple(bx))
            best = None
            for dy in range(-40, 41, 4):
                for dx in range(-40, 41, 4):
                    if bx[0] + dx < 0 or bx[1] + dy < 0 or bx[2] + dx > CW or bx[3] + dy > CH:
                        continue
                    sc = ImageStat.Stat(ImageChops.difference(tpl, ve.crop((bx[0] + dx, bx[1] + dy, bx[2] + dx, bx[3] + dy)))).mean[0]
                    if best is None or sc < best[0]:
                        best = (sc, dx, dy)
            if best and max(abs(best[1]), abs(best[2])) > 16:
                moved[i] = (best[1] // UP, best[2] // UP)
        rep[f.name] = moved
    (OUT / f"contexte_try{attempt}" / "check.json").write_text(json.dumps(rep, indent=1))
    print(json.dumps(rep))


def build(attempt, pick):
    """The draw back to raw tones over the sondes-6 meadow, ground only, one RGBA stamp for band t4-6."""
    from cuire_sol import centre_px

    v = M.tint(Image.open(OUT / f"contexte_try{attempt}" / f"{pick}.png").convert("RGB").resize((CW, CH), Image.LANCZOS), inverse=True)
    full = Image.open(M.OUT / "meadow_blend.png").convert("RGB")
    ramp = Image.new("L", (CW, CH), 0)
    ImageDraw.Draw(ramp).rectangle((120, 120, CW - 121, CH - 121), fill=255)
    full.paste(v, (X0 * UP, (Y0 - M.TOP) * UP), ramp.filter(ImageFilter.GaussianBlur(50)))
    W, H = M.W, M.H
    edge = Image.new("L", (W, H), 0)
    ImageDraw.Draw(edge).rectangle((90, 90, W - 91, H), fill=255)
    keep = Image.new("L", (W, H), 0)
    kd = ImageDraw.Draw(keep)
    for a, b, c, e in keep_boxes():
        kd.rectangle((a * UP, (b - M.TOP) * UP, c * UP, (e - M.TOP) * UP), fill=255)
    keep = keep.filter(ImageFilter.MaxFilter(61)).filter(ImageFilter.GaussianBlur(16))
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
    canvas.save(OUT / "sol_sondes7.webp", lossless=True)
    canvas.save(OUT / "stamp.png")
    alpha.save(OUT / "masque.png")
    (OUT / "stamps.json").write_text(json.dumps([{"asset": "sol_sondes7.webp", "tile": list(best), "flip": False, "band": "t4-6"}]))
    rgba.save(CACHE / "stamp_crop.png")
    print("stamp", canvas.size, "tile", best, "offset", ox, oy)


def planche(attempt, pick):
    build(attempt, pick)
    st = Image.open(CACHE / "stamp_crop.png")
    rgb = M.tint(st.convert("RGB")).resize((1080, M.BOT - M.TOP), Image.LANCZOS)
    al = st.getchannel("A").resize((1080, M.BOT - M.TOP), Image.LANCZOS)
    cap = S5.base()
    over = Image.new("RGBA", cap.size)
    rg = rgb.convert("RGBA")
    rg.putalpha(al)
    over.paste(rg, (0, M.TOP))
    shown = Image.alpha_composite(cap.convert("RGBA"), over).convert("RGB")
    shown.save(OUT / "ecran.png")
    dbg = shown.copy()
    dd = ImageDraw.Draw(dbg)
    line, voie = M.route_line()
    for pts, col in ((line, (255, 40, 40)), (voie, (255, 0, 255))):
        sp = [(M.g2s(g)[0], M.g2s(g)[1] + M.TOP) for g in pts]
        dd.line(sp, fill=col, width=2)
    for r, col in zip(R.PARCELLES.values(), ((255, 255, 0), (0, 255, 255), (255, 160, 0))):
        sp = [(M.g2s(g)[0], M.g2s(g)[1] + M.TOP) for g in ((r[0], r[1]), (r[2], r[1]), (r[2], r[3]), (r[0], r[3]), (r[0], r[1]))]
        dd.line(sp, fill=col, width=2)
    dbg.crop((0, 1300, 1080, 2260)).save(OUT / "debug_route.png")
    w = 540
    left = shown.resize((w, int(shown.height * w / shown.width)), Image.LANCZOS)
    tgt = Image.open(T.LOUPES / "targets/p06-jour/cible.png").convert("RGB")
    right = tgt.resize((w, int(tgt.height * w / tgt.width)), Image.LANCZOS)
    top = Image.new("RGB", (2 * w + 10, max(left.height, right.height)), (20, 20, 20))
    top.paste(left, (0, 0))
    top.paste(right, (w + 10, 0))
    crops = [shown.crop((x, y, x + 270, y + 240)).resize((540, 480), Image.LANCZOS) for x, y in ((220, 1340), (420, 1620))]
    out = Image.new("RGB", (top.width, top.height + 10 + 480), (20, 20, 20))
    out.paste(top, (0, 0))
    for k, c in enumerate(crops):
        out.paste(c, (k * 550, top.height + 10))
    out.save(OUT / "planche.webp", quality=88)
    print("planche", out.size)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=("prep", "paint", "check", "build", "planche"))
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--pick", default="v0")
    a = ap.parse_args()
    if a.cmd == "prep":
        prep()
    elif a.cmd == "paint":
        paint(a.attempt, a.n)
    elif a.cmd == "check":
        check(a.attempt)
    elif a.cmd == "build":
        build(a.attempt, a.pick)
    else:
        planche(a.attempt, a.pick)
