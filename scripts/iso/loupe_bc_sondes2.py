#!/usr/bin/env python3
"""Loupe BC series 2: probes repainted on a REAL crop of the in-game terrain, then masked offline. Nothing wired.

    python3 scripts/iso/loupe_bc_sondes2.py inputs                     # ground crops + soft hints, no FLUX
    python3 scripts/iso/loupe_bc_sondes2.py gen <name> [--n 3]         # FLUX 3 through iso_loop's registry
    python3 scripts/iso/loupe_bc_sondes2.py post <family>              # masks, preview, planche.webp, no FLUX

Names: route, champ, stooks, scarecrow, birch, oak, pine, tufts, stones, worn.
No hard shape ever goes to FLUX: only a blurred hint painted on the real ground. cible.png is only read by `post`,
to put a crop beside our result; it is never sent to FLUX. No Thronebreaker image.
"""
import argparse
import concurrent.futures
import importlib.util
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
from lib import flux
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = HERE.parents[1]
ISO = ROOT / "assets/images/village/iso"
LOUPES = ROOT / "docs/designs/village-loop/loupes"
OUT = LOUPES / "bc/r1/sondes-2"
CIBLE = LOUPES / "targets/p06-jour/cible.png"
CACHE = flux.ORIGINALS.parent / "loupes-bc-r2"
MAGENTA = (255, 0, 255)
BOX_A = (480, 700, 1120, 1000)  # meadow, worn ground, a bit of forest floor
SIZE_A = (1344, 640)
BOX_D = (500, 880, 900, 1040)  # flat meadow for decals
SIZE_D = (1344, 544)
PHONE = 720 / 1344  # the village at zoom 0.6 on the phone: the 1344 px canvas shown at 720 px

# ---------------------------------------------------------------- shapes (Pillow only, soft by construction)


def noise(size, sigma, seed):
    random.seed(seed)
    n = Image.effect_noise(size, 80).filter(ImageFilter.GaussianBlur(sigma))
    return n.point(lambda v: max(0, min(255, int(128 + (v - 128) * 6))))


def soft(m, lo, hi):
    return m.point(lambda v: 0 if v <= lo else 255 if v >= hi else int(255 * (v - lo) / (hi - lo)))


def fray(m, seed, blur=5, k=0.6, lo=90, hi=170):
    """Frayed, irregular, corner-free edge from a soft mask."""
    m = m.filter(ImageFilter.GaussianBlur(blur))
    n = noise(m.size, blur * 1.2, seed).point(lambda v: int(v * k))
    return soft(ImageChops.add(m, n, 1, -int(128 * k)), lo, hi).filter(ImageFilter.GaussianBlur(1.5))


def chaikin(pts, it=4):
    for _ in range(it):
        out = []
        for a, b in zip(pts, pts[1:]):
            out += [(0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1])]
        pts = [pts[0]] + out + [pts[-1]]
    return pts


def road_mask(size, wide=1.0):
    w, h = size
    pts = chaikin([(-0.02 * w, 0.93 * h), (0.25 * w, 0.90 * h), (0.48 * w, 0.78 * h), (0.68 * w, 0.62 * h), (0.84 * w, 0.40 * h), (1.02 * w, 0.22 * h)])
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    n = len(pts)
    for i, (x, y) in enumerate(pts):
        t = i / (n - 1)
        a = min(1.0, t / 0.16, (1 - t) / 0.16)  # both ends fade into the grass
        r = w * 0.03 * wide * (1 + 0.28 * math.sin(t * 11 + 1.3) + 0.12 * math.sin(t * 27))
        d.ellipse((x - r, y - r * 0.9, x + r, y + r * 0.9), fill=int(255 * max(a, 0)))
    return m.filter(ImageFilter.GaussianBlur(6))


def blob_mask(size, cx, cy, rx, ry, seed):
    """An irregular rounded patch: overlapping ellipses, blurred, frayed. No corner."""
    random.seed(seed)
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for _ in range(9):
        x, y = cx + random.uniform(-0.45, 0.45) * rx, cy + random.uniform(-0.45, 0.45) * ry
        a, b = rx * random.uniform(0.45, 0.8), ry * random.uniform(0.45, 0.8)
        d.ellipse((x - a, y - b, x + a, y + b), fill=255)
    return m.filter(ImageFilter.GaussianBlur(22))


def ground(box, size):
    return sol.crop(*box).resize(size, Image.LANCZOS)


def tint(g, mask, rgb, k):
    return Image.composite(Image.new("RGB", g.size, rgb), g, mask.point(lambda v: int(v * k)))


def hint(name):
    if name == "route":
        g = ground(BOX_A, SIZE_A)
        return tint(g, road_mask(SIZE_A), (206, 186, 146), 0.97)
    if name == "champ":
        g = ground(BOX_A, SIZE_A)
        return tint(g, blob_mask(SIZE_A, 0.6 * SIZE_A[0], 0.64 * SIZE_A[1], 0.26 * SIZE_A[0], 0.24 * SIZE_A[1], 7), (184, 146, 86), 0.97)
    if name in ("tufts", "stones", "worn"):
        return ground(BOX_D, SIZE_D)
    raise KeyError(name)


# ---------------------------------------------------------------- FLUX

STYLE_NOTE = "Same hand-painted style and palette as the ground, top-down three-quarter view. "
PROMPTS = {
    "route": ("Image 1 is a game ground with a pale path sketch. Repaint that path as a clearly visible, continuous worn dirt road: pale low-saturation dirt "
              "(#C9B48A), faint interrupted ruts, a few rare half-buried pebbles never in a line, frayed grass edges. "
              "No edge stones, no kerb, no ink line, no shadow. Keep all other grass exactly as it is."),
    "champ": ("Image 1 is a game ground with a soft ochre patch sketch. Repaint the whole patch, edge to edge, as one flat wheat field seen from above: painted "
              "golden wheat bands on ochre earth, flat on the ground, no height, no side faces, no bales, no scarecrow, no fence, "
              "no ink outline, no shadow, irregular rounded outline blending into the grass. Keep all other grass exactly as it is."),
    "stooks": ("Three hay stooks (conical wheat sheaves tied at the top), in a row with wide gaps, painted like the stooks in image 1, "
               "thin ink line. Nothing under them: no ground, no shadow. On a flat pure magenta (#FF00FF) backdrop."),
    "scarecrow": ("One scarecrow in one piece: a wooden cross post, a straw hat on the top of the cross, a patched coat, straw hands. "
                  "Painted like the stooks in image 1, thin ink line. Nothing under it: no ground, no shadow. On a flat pure magenta (#FF00FF) backdrop."),
    "tufts": ("Image 1 is a game ground. Paint on it six dark green grass tufts, widely spaced, with no earth under them, nothing cast, "
              "no dark line, no outline. Keep the ground exactly as it is."),
    "stones": ("Image 1 is a game ground. Paint on it six small stones half sunk in the ground, widely spaced, no dark line, no outline, "
               "no shadow. Keep the ground exactly as it is."),
    "worn": ("Image 1 is a game ground. Paint on it one irregular, low-contrast patch of worn bare earth in the middle, soft blended edge, "
             "no dark line, no outline. Keep the ground exactly as it is."),
}
TREE = ("Image 1, 2 and 3 are painted forest masses: match their brushwork, ink and colours. Paint three {sp} of different sizes, spaced apart, "
        "bumpy overlapping crowns, trunk only a fifth of the tree height, yellow-green sunlit leaves with blue-green shade, no beige. "
        "At each trunk base only roots, ferns and low bushes ending directly on the backdrop: no ground slab, no plate, no disc, "
        "no dirt ring, no shadow. On a flat pure magenta (#FF00FF) backdrop from edge to edge.")
SPECIES = {"birch": "birch trees with white bark", "oak": "oak trees with broad crowns", "pine": "pine trees in layered tiers"}
FAMILY = {"route": "route", "champ": "champ", "stooks": "champ", "scarecrow": "champ", "birch": "arbres", "oak": "arbres",
          "pine": "arbres", "tufts": "decals", "stones": "decals", "worn": "decals"}


def on_magenta(p, name):
    out = CACHE / "refs" / name
    out.parent.mkdir(parents=True, exist_ok=True)
    a = Image.open(p).convert("RGBA")
    bg = Image.new("RGBA", a.size, MAGENTA + (255,))
    bg.alpha_composite(a)
    bg.convert("RGB").resize((a.width * 2, a.height * 2), Image.LANCZOS).save(out)
    return out


def inputs_for(name):
    d = CACHE / "inputs"
    d.mkdir(parents=True, exist_ok=True)
    if name in ("birch", "oak", "pine"):
        return [on_magenta(ISO / f"foret/{f}.webp", f"{f}.png") for f in ("melangee", "feuillus", "bouleaux")], (1344, 896)
    if name in ("stooks", "scarecrow"):
        p = OUT.parent / "sondes/champ/v0.png"  # series 1: gave the stook shape, ground and field shape not wanted
        return [p], (1344, 896)
    f = d / f"{name}.png"
    im = hint(name)
    im.save(f)
    return [f], im.size


def gen(name, n, start=0):
    I.guard_endpoint(I.FLUX3)
    fam = FAMILY[name]
    d = OUT / fam
    d.mkdir(parents=True, exist_ok=True)
    cache = CACHE / name
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"{name}_v{i}.png" for i in range(start, start + n)]
    if any(o.exists() or (OUT / FAMILY[name] / o.name).exists() for o in outs):
        sys.exit(f"{name} already painted: never re-rolled in place")
    prompt = TREE.format(sp=SPECIES[name]) if name in SPECIES else PROMPTS[name]
    refs, (w, h) = inputs_for(name)
    batch = I.reserve(n, 0.10, f"loupe bc r2 {name}", None)
    resp = []

    def one(o):
        flux.generate(slug=f"loupe_bc2_{name}", prompt=prompt, out=o, width=w, height=h, attempts=1, references=tuple(refs),
                      extra={"width": w, "height": h}, submitted_log=resp, endpoint=I.FLUX3)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            list(pool.map(one, outs))
    finally:
        entry = I.settle(batch, resp)
    for o in outs:
        if o.exists():
            Image.open(o).convert("RGB").save(d / o.name)
    (d / f"{name}.prompt.txt").write_text(prompt + "\n", encoding="utf-8")
    if name in ("route", "champ", "tufts", "stones", "worn"):
        Image.open(inputs_for(name)[0][0]).save(d / f"{name}_input.png")
    print(json.dumps({"name": name, "made": [o.name for o in outs if o.exists()], "cost": entry["cost"]}))


# ---------------------------------------------------------------- post: masks, previews, boards


def planches():
    spec = importlib.util.spec_from_file_location("planches", ROOT / "docs/designs/village-surroundings/stage-0/loop-2/planches.py")
    pl = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(pl)
    return pl


def cible(box):
    return Image.open(CIBLE).convert("RGB").crop(box)


def board(fam, previews, raw, cible_box, centre):
    """previews: composite 1344 wide. Left: phone scale, then 2x crop around `centre`. Right: the cible crop, then raw outputs."""
    d = OUT / fam
    pv = previews.resize((720, round(previews.height * PHONE)), Image.LANCZOS)
    big = previews.resize((1440, round(previews.height * 1440 / previews.width)), Image.LANCZOS)
    cx, cy = int(centre[0] * big.width), int(centre[1] * big.height)
    x0 = max(0, min(big.width - 720, cx - 360))
    y0 = max(0, min(big.height - 420, cy - 210))
    big = big.crop((x0, y0, x0 + 720, y0 + 420))
    ci = cible(cible_box)
    ci = ci.resize((720, round(ci.height * 720 / ci.width)), Image.LANCZOS)
    thumbs = [r.resize((360, round(r.height * 360 / r.width))) for r in raw]
    rh = max([t.height for t in thumbs] + [1])
    h1 = max(pv.height, ci.height)
    sheet = Image.new("RGB", (1470, h1 + 20 + max(big.height, rh) + 20), (40, 40, 40))
    sheet.paste(pv, (10, 10))
    sheet.paste(ci, (740, 10))
    sheet.paste(big, (10, h1 + 20))
    x = 740
    for t in thumbs[:2]:
        sheet.paste(t, (x, h1 + 20))
        x += 365
    sheet.save(d / "planche.webp", quality=90)


def post(fam):
    d = OUT / fam
    if fam == "route" or fam == "champ":
        name = fam
        g = ground(BOX_A, SIZE_A)
        outs = sorted(d.glob(f"{name}_v?.png"))
        m = fray(road_mask(SIZE_A, 1.12), 11) if name == "route" else fray(blob_mask(SIZE_A, 0.6 * SIZE_A[0], 0.64 * SIZE_A[1], 0.26 * SIZE_A[0], 0.24 * SIZE_A[1], 7), 5, blur=10)
        comps = []
        for o in outs:
            v = Image.open(o).convert("RGB").resize(SIZE_A, Image.LANCZOS)
            mk = m
            if name == "champ" and o.stem[-1] in "012":  # v0 to v2 were painted on the first, smaller sketch
                mk = fray(blob_mask(SIZE_A, 0.6 * SIZE_A[0], 0.66 * SIZE_A[1], 0.2 * SIZE_A[0], 0.2 * SIZE_A[1], 7), 5, blur=10)
            c = Image.composite(v, g, mk)
            c.save(d / f"{o.stem}_sur_sol.png")
            comps.append(c)
        m.save(d / f"{name}_masque.png")
        if comps:
            if name == "champ":
                comps = [stookify(c, d) for c in comps]
            board(fam, comps[-2] if name == "champ" else comps[-1], [Image.open(o) for o in outs[::-1]], (150, 1100, 720, 1500) if name == "route" else (0, 930, 400, 1150), (0.55, 0.5) if name == "route" else (0.6, 0.66))
    elif fam == "arbres":
        cluster(d)
    elif fam == "decals":
        scatter(d)


def stookify(c, d):
    """Place two keyed stooks and the scarecrow on the field preview."""
    pl = planches()
    cuts = {}
    for k in ("stooks", "scarecrow"):
        fs = sorted(d.glob(f"{k}_v?.png"))
        if fs:
            cuts[k] = pl.detoure(Image.open(fs[0]))[0]
    if "stooks" in cuts:
        s = cuts["stooks"].crop(cuts["stooks"].getbbox())
        s = s.resize((240, int(s.height * 240 / s.width)), Image.LANCZOS)
        c = c.copy()
        c.paste(s, (int(0.40 * c.width), int(0.50 * c.height)), s)
    if "scarecrow" in cuts:
        s = cuts["scarecrow"].crop(cuts["scarecrow"].getbbox())
        s = s.resize((int(s.width * 100 / s.height), 100), Image.LANCZOS)
        c.paste(s, (int(0.55 * c.width), int(0.40 * c.height)), s)
    return c


def cluster(d):
    pl = planches()
    cuts = {}
    for sp in ("birch", "oak", "pine"):
        fs = sorted(d.glob(f"{sp}_v?.png"))
        if not fs:
            continue
        cut = pl.detoure(Image.open(fs[0]))[0]
        cut.save(d / f"{sp}_v0.cut.webp", quality=92)
        cuts[sp] = cut.crop(cut.getbbox())
    g = ground(BOX_A, SIZE_A)
    # back to front: pine, oak, birch; widths in px on the 1344 canvas, overlapping, y sorted.
    plan = [("pine", 330, 0.46, 0.60), ("oak", 300, 0.40, 0.72), ("birch", 260, 0.50, 0.78)]
    for sp, wpx, fx, fy in plan:
        if sp not in cuts:
            continue
        s = cuts[sp]
        s = s.resize((wpx, round(s.height * wpx / s.width)), Image.LANCZOS)
        g.paste(s, (int(fx * g.width) - s.width // 2, int(fy * g.height) - s.height), s)
    g.save(d / "amas_sur_sol.png")
    raw = [Image.open(f) for f in sorted(d.glob("*_v0.png"))]
    board("arbres", g, raw, (0, 440, 420, 700), (0.45, 0.5))


def scatter(d):
    g = ground(BOX_A, SIZE_A)
    random.seed(3)
    stamps = []
    for name, target in (("tufts", 70), ("stones", 56)):
        for f in sorted(d.glob(f"{name}_v?.png"))[:1]:
            v = Image.open(f).convert("RGB")
            bg = v.filter(ImageFilter.GaussianBlur(30))
            diff = ImageChops.difference(v, bg).convert("L").filter(ImageFilter.GaussianBlur(1.5))
            m = soft(diff, 14, 40).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(5))
            cw, ch = v.width // 3, v.height // 2
            for r in range(2):
                for c in range(3):
                    box = (c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)
                    mm = m.crop(box)
                    bb = soft(mm, 100, 140).getbbox()
                    if bb and (bb[2] - bb[0]) > 12:
                        rgba = v.crop(box).convert("RGBA")
                        rgba.putalpha(mm)
                        rgba = rgba.crop(bb)
                        k = target / max(rgba.width, 1)
                        stamps.append(rgba.resize((max(8, int(rgba.width * k)), max(6, int(rgba.height * k))), Image.LANCZOS))
    for f in sorted(d.glob("worn_v?.png"))[:1]:
        v = Image.open(f).convert("RGB")
        wm = fray(blob_mask(v.size, v.width * 0.50, v.height * 0.54, v.width * 0.16, v.height * 0.14, 5), 9, blur=12)
        rgba = v.convert("RGBA")
        rgba.putalpha(wm)
        rgba = rgba.crop(wm.getbbox())
        stamps += [rgba.resize((220, int(rgba.height * 220 / rgba.width)), Image.LANCZOS)] * 2
    spots = [(300, 570), (900, 430), (120, 540), (520, 560), (700, 520), (1000, 330), (1100, 200), (220, 470), (1050, 440), (620, 590)]
    worn = [x for x in stamps if x.width == 220]
    small = [x for x in stamps if x.width != 220]
    random.shuffle(small)
    order = worn[:2] + small[:8]  # worn earth stays on the green meadow: the stamp carries its own meadow
    for i, (s, (x, y)) in enumerate(zip(order, spots)):
        if i % 2:
            s = s.transpose(Image.FLIP_LEFT_RIGHT)
        g.paste(s, (x - s.width // 2, y - s.height // 2), s)
    g.save(d / "decals_sur_sol.png")
    raw = [Image.open(f) for f in sorted(d.glob("*_v0.png"))]
    board("decals", g, raw, (250, 1250, 720, 1500), (0.5, 0.6))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=("inputs", "gen", "post"))
    ap.add_argument("name", nargs="?")
    ap.add_argument("--n", type=int, default=3)
    ap.add_argument("--start", type=int, default=0)
    a = ap.parse_args()
    if a.cmd == "inputs":
        for nm in ("route", "champ", "tufts"):
            inputs_for(nm)
        print("inputs in", CACHE / "inputs")
    elif a.cmd == "gen":
        gen(a.name, a.n, a.start)
    else:
        post(a.name)
