#!/usr/bin/env python3
"""Loupe BC sondes-6: the corner ground for real, in two passes (the meadow first, then the road and fields in context).

    python3 scripts/iso/loupe_bc_sondes6.py prep1                 # raw terrain crop with the forest floor replaced, no FLUX
    python3 scripts/iso/loupe_bc_sondes6.py paint1 --piece P1|P2 [--try N] [--n 2]
    python3 scripts/iso/loupe_bc_sondes6.py blend1 --pick P1=v0,P2=v1   # one continuous meadow, raw terrain tones
    python3 scripts/iso/loupe_bc_sondes6.py prep2 / paint2 [--n 3] / build2 --pick vK / planche

Pass 1 works on the RAW terrain (what cuire_sol stamps over), at its native 3 px a dp. Pass 2 works on the screen
(the capture's light over the clean meadow, under the real sprites) and the result goes back to raw tones through a
per-channel linear fit of capture against raw terrain, so the stamp is not tinted twice in the game.
FLUX goes through iso_loop's registry, generated in the cache then copied: provenance.json stays clean.
Dev only, never wired into the app. cible.png is never sent to FLUX, no Thronebreaker image.
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
import loupe_targets as T
from iso_loop import FLUX3, guard_endpoint, reserve, settle
from lib import flux
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

OUT = T.LOUPES / "bc/r1/sondes-6"
CACHE = flux.ORIGINALS.parent / "loupes-sondes6"
UP = 2  # raw px per screen px: 3 px a dp over the camera's 1.5 px a dp
TOP, BOT = 1300, 2260  # screen rows covered: just below the palisade to the tip of the ground
W, H = 1080 * UP, (BOT - TOP) * UP
PIECES = {"P1": (0, 1160), "P2": (760, 1920)}  # rows of the raw crop, 400 rows of overlap
FILL = (118, 119, 80)  # raw tone of the new meadow: olive, between the terrain's own meadow and #6A7442
EACH = 0.12

PROMPT1 = (
    "Repaint image 1 as one continuous hand-painted game ground, same paint, no ink outlines, flat ground seen from a high "
    "camera. Meadow grass everywhere: olive green like #6A7442 in sunlight, less green and not yellow, large calm areas, "
    "very few flowers, small tufts and pebbles here and there. No dark patches, no polygon, no straight edge, no road, no "
    "path, no field, no plot. The worn bare dirt stays only along the top edge, where it already is. Keep the detailed "
    "brush texture, small tufts, pebbles and flowers of the untouched parts of image 1 everywhere. Flat ground only: no "
    "buildings, no trees, nothing standing, no cast shadows, no tree shadows."
)


def raw_crop():
    p = CACHE / "raw.png"
    if not p.exists():
        x0, y0 = (round(v) for v in S5.scr2ter(0, TOP))
        CACHE.mkdir(parents=True, exist_ok=True)
        S5.sol.crop_px(x0, y0, x0 + W, y0 + H).save(p)
    return Image.open(p).convert("RGB")


def cover_mask(g):
    """The forest-floor polygons and the grey outside (dark, not blue), dilated so their edge goes under the fill."""
    lum = g.convert("L").filter(ImageFilter.GaussianBlur(5)).point(lambda v: 255 if v < 106 else 0)
    r, _, b = g.split()
    blue = ImageChops.subtract(b, r).point(lambda v: 255 if v > 22 else 0).filter(ImageFilter.MaxFilter(21))
    return ImageChops.subtract(lum, blue).filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.GaussianBlur(6))


def prep1():
    g = raw_crop()
    cm = cover_mask(g)
    grain = Image.effect_noise(g.size, 9).filter(ImageFilter.GaussianBlur(0.8))  # fine grain only, no blotches
    fill = ImageChops.add(Image.new("RGB", g.size, FILL), Image.merge("RGB", (grain, grain, grain)), 1, -128)
    src = Image.composite(fill, g, cm)
    OUT.mkdir(parents=True, exist_ok=True)
    g.save(OUT / "meadow_raw.png")
    cm.save(OUT / "meadow_cover.png")
    for name, (a, b) in PIECES.items():
        src.crop((0, a, W, b)).save(CACHE / f"in1_{name}.png")
        src.crop((0, a, W, b)).save(OUT / f"meadow_in_{name}.png")
    g.crop((560, 240, 1500, 640)).save(CACHE / "ref_meadow.png")  # the terrain's own clean meadow, a texture sample for image 2
    print("inputs", {k: (W, b - a) for k, (a, b) in PIECES.items()}, "cover share", round(sum(cm.histogram()[128:]) / (W * H), 2))


def paint1(piece, attempt, n):
    guard_endpoint(FLUX3)
    a, b = PIECES[piece]
    d = OUT / f"meadow_{piece}_try{attempt}"
    d.mkdir(parents=True, exist_ok=True)
    cache = CACHE / d.name
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"v{i}.png" for i in range(n)]
    if any(o.exists() for o in outs) or any(d.glob("v?.png")):
        sys.exit("variants exist: pass --try")
    refs = (CACHE / f"in1_{piece}.png", CACHE / "ref_meadow.png")
    prompt = PROMPT1 + " Image 2 is a sample of the meadow texture and brushwork to continue everywhere in image 1 where it is flat."
    batch = reserve(n, EACH, f"loupe bc sondes6 {d.name}", None)
    responses: list = []

    def one(io):
        flux.generate(slug="loupe_bc_sondes6", prompt=prompt, out=io[1], width=W, height=b - a, attempts=1,
                      references=refs, extra={"width": W, "height": b - a},
                      submitted_log=responses, endpoint=FLUX3, seed=6000 + 100 * attempt + io[0] + (50 if piece == "P2" else 0))

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


def blend1(picks):
    """P1 over P2 with a wide vertical ramp across their overlap, then the top rows matched to the raw terrain."""
    ims = {}
    for k, (folder, v) in picks.items():
        im = Image.open(OUT / folder / f"{v}.png").convert("RGB")
        a, b = PIECES[k]
        ims[k] = im.resize((W, b - a), Image.LANCZOS)
    full = Image.new("RGB", (W, H))
    full.paste(ims["P2"], (0, PIECES["P2"][0]))
    ramp = Image.new("L", (W, PIECES["P1"][1]), 255)
    rd = ImageDraw.Draw(ramp)
    o0, o1 = PIECES["P2"][0], PIECES["P1"][1]
    for y in range(o0, o1):
        rd.line([(0, y), (W, y)], fill=int(255 * (1 - (y - o0) / (o1 - o0))))
    full.paste(ims["P1"], (0, 0), ramp)
    raw = raw_crop()
    # the top edge meets the real terrain: shift the repaint's mean to the raw one over the first rows, fading by row 500
    top = (0, 0, W, 160)
    shift = tuple(ImageStat.Stat(raw.crop(top)).mean[i] - ImageStat.Stat(full.crop(top)).mean[i] for i in range(3))
    fade = Image.new("L", (W, H), 0)
    fd = ImageDraw.Draw(fade)
    for y in range(500):
        fd.line([(0, y), (W, y)], fill=int(255 * (1 - y / 500)))
    moved = ImageChops.add(full, Image.merge("RGB", tuple(Image.new("L", (W, H), int(round(128 + s))) for s in shift)), 1, -128)
    full = Image.composite(moved, full, fade)
    full.save(OUT / "meadow_blend.png")
    print("top shift", [round(s, 1) for s in shift])
    return full


# ---------------------------------------------------------------- pass 2: the road and the fields, in context
import rues_port as R  # noqa: E402

DUMP = S5.DUMP
Z, TX, TY = S5.Z, S5.TX, S5.TY
PX_C = 760  # pass 2 covers screen x 0..760 (the road and the plots stay there), full height
CW, CH = PX_C * UP, H
STYLE = [T.flat(p) for p in T.STYLE]
KEEP = ("building", "wall", "villager", "animal")
PROMPT2 = (
    "Paint over image 1, a crop of a screenshot of an isometric village game, keeping its exact camera and framing. "
    "ABSOLUTE RULE: every building, palisade fence and wall and villager stay exactly where they are, same size, same shape, same "
    "silhouette. Do not move, add or remove any building or any house. Do not change the camera. The walled village stays the same. "
    "The meadow below it is already painted: keep it, change only what is described here. The style is given by images 2 and 3: "
    "Franco-Belgian comic ink, matte, two or three values per surface, warm late-afternoon light from the top left.\n"
    "What to paint on the ground, at the faint places hinted in image 1:\n"
    "- A pale sand-grey packed-earth road with a winding course, hinted as a faint pale ribbon in image 1: follow it exactly. It starts at the "
    "gap of the palisade (the gate), winds down and to the right and reaches the bottom of the picture. Its width varies a little, small "
    "edge stones and grass tufts break its edges, a clean end at the gate with no dirt blob and no flowers there.\\n"
    "- One wheat plot to the left of the road, lower left: flat parallel bands of golden wheat on ochre earth, its edges irregular and "
    "softened into the meadow, never a rectangle and never a grid of squares, with a few stooks of wheat, and a short earth track joining "
    "it to the road.\n"
    "- One vegetable plot to the right of the road, above: tilled rows with green plants, a low wooden fence and a well, edges blended into the grass.\n"
    "- The meadow stays olive (like #6A7442 in sunlight), less green and not yellow, large calm areas, very few flowers.\n"
    "The ground carries NO trees at all and NO tree shadows and no cast shadows of any kind (trees are added later by the game): "
    "bushes under knee height and rocks are fine.\n"
    "No text, no letters, no runes, no glossy surfaces, no noise texture, no perfect symmetry, no vignette frame, no new houses, no sky. "
    "The camera stays high; the land fills the whole image. No small symbols or icons.\n"
).replace("\\n", "\n")


def fit_tint():
    """Per-channel linear map raw terrain -> capture (a, b), on sprite-free pixels, both blurred."""
    raw = raw_crop().resize((1080, BOT - TOP), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))
    cap = S5.base().crop((0, TOP, 1080, BOT)).filter(ImageFilter.GaussianBlur(6))
    bad = Image.new("L", raw.size, 0)
    bd = ImageDraw.Draw(bad)
    for s in DUMP["sprites"]:
        bd.rectangle((s["x"] - 30, s["y"] - TOP - 30, s["x"] + s["w"] + 30, s["y"] - TOP + s["h"] + 30), fill=255)
    for pol in S5.TREES + S5.GAP:
        bd.polygon([(x, y - TOP) for x, y in pol], fill=255)
    res = []
    for ch in range(3):
        xs, ys = [], []
        for y in range(40, raw.height - 40, 9):
            for x in range(40, 1040, 9):
                if bad.getpixel((x, y)) == 0:
                    r, c = raw.getpixel((x, y))[ch], cap.getpixel((x, y))[ch]
                    if r > 70:  # not the grey outside the ground
                        xs.append(r)
                        ys.append(c)
        n = len(xs)
        mx, my = sum(xs) / n, sum(ys) / n
        a = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
        res.append((a, my - a * mx, n))
    return res


def tint(im, inverse=False):
    fit = fit_tint()
    luts = []
    for a, b, _ in fit:
        luts += [int(max(0, min(255, round((v - b) / a if inverse else a * v + b)))) for v in range(256)]
    return im.point(luts)


def keep_boxes():
    """Kept sprites in screen px of the full crop (x, y relative to TOP)."""
    out = []
    for s in DUMP["sprites"]:
        if s.get("layer") in KEEP and not s.get("screenFixed") and s["y"] + s["h"] > TOP and s["y"] < BOT:
            out.append((s["x"], s["y"] - TOP, s["x"] + s["w"], s["y"] - TOP + s["h"]))
    return out


def keep_mask(size, scale, margin, soft):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for x0, y0, x1, y1 in keep_boxes():
        d.rectangle((x0 * scale, y0 * scale, x1 * scale, y1 * scale), fill=255)
    return m.filter(ImageFilter.MaxFilter(2 * margin + 1)).filter(ImageFilter.GaussianBlur(soft))


def g2s(g):
    return (g[0] - g[1]) * 24 * Z + TX, (g[0] + g[1]) * 12 * Z + TY - TOP  # crop-relative screen px


def route_line():
    route, voie = R.sortie(12, 19)
    street = [R.noeud(12, k) for k in range(16, 20)]
    return street + route[1:], voie


def hints(im):
    """A faint pale hint on the 2x pass-2 input: the road along the frozen nodes, the wheat, the vegetable plot, a track."""
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)

    def px(g):
        x, y = g2s(g)
        return x * UP, y * UP

    line, _ = route_line()
    pts = S5.resample([px(g) for g in line], 6)
    half = [(23 - 7 * k / len(pts)) * UP * (1 + 0.1 * math.sin(k / 7)) for k in range(len(pts))]
    d.polygon(S5.ribbon_poly(pts, half, 5), fill=(190, 179, 152, 150))

    def quad(r):
        x0, y0, x1, y1 = r
        return [px((x0, y0)), px((x1, y0)), px((x1, y1)), px((x0, y1))]

    d.polygon(quad(R.PARCELLES["ble"]), fill=(192, 150, 88, 120))
    d.polygon(quad(R.PARCELLES["potager"]), fill=(112, 92, 62, 110))
    wx0, wy0, wx1, wy1 = R.PARCELLES["ble"]
    near = min(line, key=lambda g: (g[0] - wx1) ** 2 + (g[1] - (wy0 + wy1) / 2) ** 2)
    tr = S5.resample([px(near), px((wx1 - 0.1, (wy0 + wy1) / 2))], 6)
    d.polygon(S5.ribbon_poly(tr, [8 * UP] * len(tr), 12), fill=(184, 168, 134, 140))
    ov = ov.filter(ImageFilter.GaussianBlur(5))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


def prep2():
    full = Image.open(OUT / "meadow_blend.png").convert("RGB")
    ground = tint(full).resize((1080, BOT - TOP), Image.LANCZOS)
    cap = S5.base().crop((0, TOP, 1080, BOT))
    keep = keep_mask(cap.size, 1, 14, 6)
    ctx = Image.composite(cap, ground, keep)
    ctx.save(OUT / "contexte_ecran.png")
    inp = ctx.crop((0, 0, PX_C, BOT - TOP)).resize((CW, CH), Image.LANCZOS)
    inp = hints(inp)
    inp.save(CACHE / "in2.png")
    inp.save(OUT / "entree_2.png")
    print("tint fit (a, b, n) per channel:", [tuple(round(v, 3) for v in f) for f in fit_tint()])
    print("input", inp.size)


def paint2(attempt, n):
    guard_endpoint(FLUX3)
    d = OUT / f"contexte_try{attempt}"
    d.mkdir(parents=True, exist_ok=True)
    cache = CACHE / d.name
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"v{i}.png" for i in range(n)]
    if any(o.exists() for o in outs) or any(d.glob("v?.png")):
        sys.exit("variants exist: pass --try")
    batch = reserve(n, EACH, f"loupe bc sondes6 {d.name}", None)
    responses: list = []

    def one(io):
        flux.generate(slug="loupe_bc_sondes6_ctx", prompt=PROMPT2, out=io[1], width=CW, height=CH, attempts=1,
                      references=(CACHE / "in2.png", *STYLE), extra={"width": CW, "height": CH}, submitted_log=responses,
                      endpoint=FLUX3, seed=7000 + 100 * attempt + io[0])

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            list(pool.map(one, enumerate(outs)))
    finally:
        entry = settle(batch, responses)
    for o in outs:
        if o.exists():
            Image.open(o).convert("RGB").save(d / o.name)
    (d / "prompt.txt").write_text(PROMPT2)
    print(json.dumps({"made": [o.name for o in outs if o.exists()], "cost": entry["cost"]}))


def check2(attempt):
    """Overlay of each draw over the input at 50 %, and how far each kept sprite moved (screen px)."""
    src = Image.open(CACHE / "in2.png").convert("RGB")
    edges = src.convert("L").filter(ImageFilter.FIND_EDGES)
    rep = {}
    for f in sorted((OUT / f"contexte_try{attempt}").glob("v?.png")):
        v = Image.open(f).convert("RGB").resize(src.size, Image.LANCZOS)
        Image.blend(v, src, 0.5).save(f.with_name(f.stem + ".overlay.png"))
        ve = v.convert("L").filter(ImageFilter.FIND_EDGES)
        moved = {}
        for i, (x0, y0, x1, y1) in enumerate(keep_boxes()):
            b = [int(max(0, min(l, c * UP))) for c, l in zip((x0, y0, x1, y1), (CW, CH, CW, CH))]
            if b[2] - b[0] < 60 or b[3] - b[1] < 60:
                continue
            tpl = edges.crop(tuple(b))
            best = None
            for dy in range(-40, 41, 4):
                for dx in range(-40, 41, 4):
                    if b[0] + dx < 0 or b[1] + dy < 0 or b[2] + dx > CW or b[3] + dy > CH:
                        continue
                    sc = ImageStat.Stat(ImageChops.difference(tpl, ve.crop((b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy)))).mean[0]
                    if best is None or sc < best[0]:
                        best = (sc, dx, dy)
            if best and max(abs(best[1]), abs(best[2])) > 16:
                moved[i] = (best[1] // UP, best[2] // UP)
        rep[f.name] = moved
    (OUT / f"contexte_try{attempt}" / "check.json").write_text(json.dumps(rep, indent=1))
    print(json.dumps(rep))


def ground_alpha():
    """Where the terrain really has ground (not the grey outside): the stamp stops at the world's edge, as the baseline does."""
    raw = raw_crop()
    lum = raw.convert("L").filter(ImageFilter.GaussianBlur(22)).point(lambda v: 255 if v > 64 else 0)
    return lum.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(6))


def build2(attempt, pick):
    """The context draw back to raw tones, over the clean meadow, ground only: one RGBA stamp, band t4-6."""
    from cuire_sol import centre_px

    v = Image.open(OUT / f"contexte_try{attempt}" / f"{pick}.png").convert("RGB").resize((CW, CH), Image.LANCZOS)
    v = tint(v, inverse=True)
    full = Image.open(OUT / "meadow_blend.png").convert("RGB")
    ramp = Image.new("L", (CW, CH), 255)
    rd = ImageDraw.Draw(ramp)
    for x in range(CW - 200, CW):
        rd.line([(x, 0), (x, CH)], fill=int(255 * (1 - (x - (CW - 200)) / 200)))
    full.paste(v, (0, 0), ramp)
    # the crop's own edges against the terrain beyond: fade 90 px left, right and top
    edge = Image.new("L", (W, H), 0)
    ImageDraw.Draw(edge).rectangle((90, 90, W - 91, H), fill=255)
    alpha = ImageChops.multiply(Image.eval(keep_mask((W, H), UP, 30, 16), lambda p: 255 - p), edge.filter(ImageFilter.GaussianBlur(45)))
    alpha = ImageChops.multiply(alpha, ground_alpha())
    rgba = full.convert("RGBA")
    rgba.putalpha(alpha)
    x0, y0 = (round(t) for t in S5.scr2ter(0, TOP))
    cx, cy = x0 + W / 2, y0 + H / 2
    best = min(((i, j) for i in range(40) for j in range(40)), key=lambda t: (centre_px(*t)[0] - cx) ** 2 + (centre_px(*t)[1] - cy) ** 2)
    ox, oy = round(centre_px(*best)[0] - cx), round(centre_px(*best)[1] - cy)
    hw, hh = W // 2 + abs(ox), H // 2 + abs(oy)
    canvas = Image.new("RGBA", (2 * hw, 2 * hh), (0, 0, 0, 0))
    canvas.alpha_composite(rgba, (hw - ox - W // 2, hh - oy - H // 2))
    canvas.save(OUT / "sol_sondes6.webp", lossless=True)
    canvas.save(OUT / "stamp.png")
    alpha.save(OUT / "masque.png")
    (OUT / "stamps.json").write_text(json.dumps([{"asset": "sol_sondes6.webp", "tile": list(best), "flip": False, "band": "t4-6"}]))
    rgba.save(CACHE / "stamp_crop.png")
    print("stamp", canvas.size, "tile", best, "offset", ox, oy)


def planche(attempt, pick):
    build2(attempt, pick)
    st = Image.open(CACHE / "stamp_crop.png")
    rgb = tint(st.convert("RGB")).resize((1080, BOT - TOP), Image.LANCZOS)
    al = st.getchannel("A").resize((1080, BOT - TOP), Image.LANCZOS)
    cap = S5.base()
    over = Image.new("RGBA", cap.size)
    rg = rgb.convert("RGBA")
    rg.putalpha(al)
    over.paste(rg, (0, TOP))
    shown = Image.alpha_composite(cap.convert("RGBA"), over).convert("RGB")
    shown.save(OUT / "ecran.png")
    dbg = shown.copy()
    dd = ImageDraw.Draw(dbg)
    line, voie = route_line()
    for pts, col in ((line, (255, 40, 40)), (voie, (255, 0, 255))):
        sp = [(g2s(g)[0], g2s(g)[1] + TOP) for g in pts]
        dd.line(sp, fill=col, width=2)
        for q in sp:
            dd.ellipse((q[0] - 3, q[1] - 3, q[0] + 3, q[1] + 3), outline=col, width=1)
    for r, col in zip(R.PARCELLES.values(), ((255, 255, 0), (0, 255, 255))):
        sp = [(g2s(g)[0], g2s(g)[1] + TOP) for g in ((r[0], r[1]), (r[2], r[1]), (r[2], r[3]), (r[0], r[3]), (r[0], r[1]))]
        dd.line(sp, fill=col, width=2)
    dbg.crop((0, 1300, 1080, 2260)).save(OUT / "debug_route.png")
    w = 540
    left = shown.resize((w, int(shown.height * w / shown.width)), Image.LANCZOS)
    tgt = Image.open(T.LOUPES / "targets/p06-jour/cible.png").convert("RGB")
    right = tgt.resize((w, int(tgt.height * w / tgt.width)), Image.LANCZOS)
    top = Image.new("RGB", (2 * w + 10, max(left.height, right.height)), (20, 20, 20))
    top.paste(left, (0, 0))
    top.paste(right, (w + 10, 0))
    crops = [shown.crop((x, y, x + 270, y + 240)).resize((540, 480), Image.LANCZOS) for x, y in ((190, 1340), (40, 1690))]
    out = Image.new("RGB", (top.width, top.height + 10 + 480), (20, 20, 20))
    out.paste(top, (0, 0))
    for k, c in enumerate(crops):
        out.paste(c, (k * 550, top.height + 10))
    out.save(OUT / "planche.webp", quality=88)
    print("planche", out.size)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=("prep1", "paint1", "blend1", "prep2", "paint2", "check2", "build2", "planche"))
    ap.add_argument("--piece", default="P1", choices=tuple(PIECES))
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    ap.add_argument("--n", type=int, default=2)
    ap.add_argument("--pick", default="")
    a = ap.parse_args()
    if a.cmd == "prep1":
        prep1()
    elif a.cmd == "paint1":
        paint1(a.piece, a.attempt, a.n)
    elif a.cmd == "prep2":
        prep2()
    elif a.cmd == "paint2":
        paint2(a.attempt, a.n)
    elif a.cmd == "check2":
        check2(a.attempt)
    elif a.cmd == "build2":
        build2(a.attempt, a.pick or "v0")
    elif a.cmd == "planche":
        planche(a.attempt, a.pick or "v0")
    else:
        blend1({kv.split("=")[0]: tuple(kv.split("=")[1].split("/")) for kv in a.pick.split(",")})
