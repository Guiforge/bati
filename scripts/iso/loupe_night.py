#!/usr/bin/env python3
"""S-night loupe: the numbers behind the contract (docs/designs/village-loop/loupes/s-night/contract.md).
Dev only, stdlib + Pillow (no numpy).

    loupe_night.py report  <dir> [--out report.json]   criteria 1 2 3 4 5 6 7 9 10, one line each
    loupe_night.py tuiles  <dir> [--out tuiles.json]   re-derive the road tiles (criterion 6) from <dir>
    loupe_night.py overlay <dir> <capture> <out.png> [--tuiles tuiles.json]   draw them on <dir>/<capture>.png

<dir> holds p06-jour, p06-nuit, p12-jour, p12-nuit (.png + .json dump). Masks, as the contract says:
  ground  = the crop rectangle minus the box of every sprite of the dump (day and night dumps united,
            so both captures are measured on the same pixels); field = the diamonds of the tiles
            of layer=field minus the other sprites; meadow = tiles 1 or 2 away from a field, not field,
            not a grid road, minus every sprite; system bars (y < 130, y > 2340) always out.
Criterion 6 road tiles are in tuiles.json (frozen data, `tuiles` re-derives it):
  p12 (route-porte): the `chemin` cells of constants/isoLayout.json (the code draws them, RuesDessinees);
  p06 (22,22 to 30,30): the road there is BAKED into the painted ground, no code names it; the tiles
  are those whose day colour reads as road (R-B of the tile core), see derive_painted.
Tile cores (half-size diamonds) are used for criterion 6 so a band that wanders does not leak.
Not measured here: 5 (blind test), 7 (diff part), 8, 11, 12.
"""

import argparse
import colorsys
import json
import math
import pathlib
import re
import sys

from PIL import Image, ImageChops, ImageDraw

import loupe_checks as C
import loupe_crop as K

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
NIGHT_DIR = ROOT / "docs/designs/village-loop/loupes/s-night"
BAR_TOP, BAR_BOT = 130, 2340
CROPS = {
    "sol-sud": ("p06", (8, 20, 30, 42)),
    "champs-nord": ("p06", (-4, -4, 10, 10)),
    "champs-est": ("p12", (4, 16, 18, 26)),
    "route-porte": ("p12", (12, 12, 26, 26)),
}
SOURCE = re.compile(r"flame|fire|(^|_)feu(_|$)|lanterne|torche|brasero", re.I)


# ---- captures and masks ------------------------------------------------------------------------

class Cap:
    def __init__(self, d, name):
        d = pathlib.Path(d)
        self.name = name
        self.rgb = Image.open(d / f"{name}.png").convert("RGB")
        self.dump = json.load(open(d / f"{name}.json"))
        self.cam = self.dump["camera"]
        self.sprites = self.dump["sprites"]
        self.lum = self.rgb.convert("L")
        self.size = self.rgb.size


def united(a, b):
    return a.sprites + b.sprites


def new_mask(size):
    return Image.new("L", size, 0)


def count(mask):
    return mask.histogram()[255]


def inter(a, b):
    return ImageChops.multiply(a, b)


def minus(a, b):
    return ImageChops.subtract(a, b)


def union(a, b):
    return ImageChops.lighter(a, b)


def diamond_pts(cam, i, j, s=1.0):
    h = 0.5 * s
    c = (i + 0.5, j + 0.5)
    return [K.tile_to_px(cam, c[0] + di * h, c[1] + dj * h) for di, dj in ((-1, -1), (1, -1), (1, 1), (-1, 1))]


def diamonds(size, cam, tiles, s=1.0):
    m = new_mask(size)
    d = ImageDraw.Draw(m)
    for i, j in tiles:
        d.polygon(diamond_pts(cam, i, j, s), fill=255)
    return m


def boxes(size, sprites):
    m = new_mask(size)
    d = ImageDraw.Draw(m)
    for s in sprites:
        d.rectangle([round(s["x"]), round(s["y"]), round(s["x"] + s["w"]) - 1, round(s["y"] + s["h"]) - 1], fill=255)
    return m


def not_bars(size):
    m = new_mask(size)
    ImageDraw.Draw(m).rectangle([0, BAR_TOP, size[0] - 1, BAR_BOT - 1], fill=255)
    return m


def rect_mask(cap, tiles):
    x0, y0, x1, y1 = K.tile_rect_px(cap.cam, *tiles)
    m = new_mask(cap.size)
    ImageDraw.Draw(m).rectangle([x0, y0, x1 - 1, y1 - 1], fill=255)
    return inter(m, not_bars(cap.size))


def pixels(rgb, mask):
    bb = mask.getbbox()
    if bb is None:
        return []
    return [p for p, m in zip(rgb.crop(bb).get_flattened_data(), mask.crop(bb).get_flattened_data()) if m]


def lum_of(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def median(v):
    v = sorted(v)
    n = len(v)
    return 0.0 if not n else (v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2)


def mean(v):
    return sum(v) / len(v) if v else float("nan")


def spearman(a, b):
    """Rank correlation, ties get their average rank."""
    def ranks(v):
        order = sorted(range(len(v)), key=v.__getitem__)
        r = [0.0] * len(v)
        k = 0
        while k < len(order):
            e = k
            while e + 1 < len(order) and v[order[e + 1]] == v[order[k]]:
                e += 1
            for t in range(k, e + 1):
                r[order[t]] = (k + e) / 2
            k = e + 1
        return r
    ra, rb = ranks(a), ranks(b)
    ma, mb = mean(ra), mean(rb)
    num = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    den = math.sqrt(sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb))
    return num / den if den else float("nan")


def hue_deg(rgb):
    return colorsys.rgb_to_hsv(*(c / 255 for c in rgb))[0] * 360


def layout():
    return json.load(open(ROOT / "constants/isoLayout.json"))


def grid_roads(raw=None):
    raw = raw or layout()
    leg = raw["legende"]
    return {(gx, gy) for gy, row in enumerate(raw["sol"]) for gx, ch in enumerate(row) if leg[ch] in ("chemin", "pont")}


def line(n, name, vals, rule, ok):
    return {"id": n, "name": name, "values": vals, "threshold": rule, "pass": ok}


# ---- criteria ----------------------------------------------------------------------------------

def source_tiles(cap):
    out = set()
    for s in cap.sprites:
        if s.get("layer") == "flame" or SOURCE.search(s["id"]):
            for di in range(-2, 3):
                for dj in range(-2, 3):
                    out.add((s["tileI"] + di, s["tileJ"] + dj))
    return out


def c1(caps):
    vals, ok = {}, True
    for p in ("p06", "p12"):
        day, night = caps[p + "-jour"], caps[p + "-nuit"]
        both = united(day, night)
        excl = boxes(day.size, [s for s in both if s.get("layer") == "building"])
        excl = union(excl, diamonds(day.size, day.cam, source_tiles(day) | source_tiles(night)))
        valid = minus(not_bars(day.size), excl).reduce(8)
        a, b = day.lum.reduce(8), night.lum.reduce(8)
        keep = [k for k, m in enumerate(valid.get_flattened_data()) if m == 255]
        ad, bd = list(a.get_flattened_data()), list(b.get_flattened_data())
        vals[p] = round(spearman([ad[k] for k in keep], [bd[k] for k in keep]), 4)
        vals[p + "_cells"] = len(keep)
        ok = ok and vals[p] >= 0.987
    return line(1, "valeurs gardees (Spearman jour/nuit, 1/8)", vals, ">= 0.987 sur p06 et p12", ok)


def ground(day, night, tiles):
    both = united(day, night)
    return minus(rect_mask(day, tiles), boxes(day.size, both))


def crop_blocks(cap, tiles, gmask):
    """Median of the 16 px block luminance std over the blocks that sit wholly in the mask."""
    x0, y0, x1, y1 = K.tile_rect_px(cap.cam, *tiles)
    sub = cap.rgb.crop((x0, y0, x1, y1))
    stds, _ = C.block_stds(sub)
    mm = gmask.crop((x0, y0, x1, y1))
    B = C.BLOCK
    return median([v for (bx, by), v in stds.items() if mm.crop((bx * B, by * B, bx * B + B, by * B + B)).getextrema()[0] == 255])


def c2_3_9(caps):
    day, night = caps["p06-jour"], caps["p06-nuit"]
    tiles = CROPS["sol-sud"][1]
    g = ground(day, night, tiles)
    sd, sn = crop_blocks(day, tiles, g), crop_blocks(night, tiles, g)
    pd, pn = pixels(day.rgb, g), pixels(night.rgb, g)
    r2 = sn / sd if sd else float("nan")
    med = tuple(median([p[k] for p in pn]) for k in range(3))
    hue = hue_deg(med)
    ratio = median([lum_of(p) for p in pn]) / median([lum_of(p) for p in pd])
    return [
        line(2, "sol vivant (mediane std 16 px, nuit/jour)", {"jour": round(sd, 3), "nuit": round(sn, 3), "ratio": round(r2, 3), "pixels": len(pn)}, ">= 0.60", r2 >= 0.60),
        line(3, "pas d'aplat violet (teinte de la couleur mediane)", {"rgb": [int(v) for v in med], "teinte": round(hue, 1)}, "205 a 240 deg", 205 <= hue <= 240),
        line(9, "la nuit reste la nuit (L mediane nuit/jour)", {"ratio": round(ratio, 3)}, "0.25 a 0.55", 0.25 <= ratio <= 0.55),
    ]


def field_pre(day, night, tiles, roads):
    both = united(day, night)
    fields = {(s["tileI"], s["tileJ"]) for s in both if s.get("layer") == "field"}
    near = {(i + di, j + dj) for i, j in fields for di in range(-2, 3) for dj in range(-2, 3)} - fields - roads
    rect = rect_mask(day, tiles)
    fmask = minus(inter(diamonds(day.size, day.cam, fields), rect), boxes(day.size, [s for s in both if s.get("layer") != "field"]))
    pmask = minus(minus(inter(diamonds(day.size, day.cam, near), rect), boxes(day.size, both)), diamonds(day.size, day.cam, fields))
    return fmask, pmask


def lrb(cap, mask):
    px = pixels(cap.rgb, mask)
    return mean([lum_of(p) for p in px]), mean([p[0] - p[2] for p in px]), len(px), px


def double(day, night, a, b, l_max=1.10):
    """The criteria 4 and 6 measure: L ratio and R-B gap of region a against region b, night against day."""
    ld, rd, nd, _ = lrb(day, a)
    ld2, rd2, nd2, _ = lrb(day, b)
    ln, rn, nn, _ = lrb(night, a)
    ln2, rn2, nn2, _ = lrb(night, b)
    if not (nn and nn2 and nd and nd2):
        return {"non_mesurable": "aucun pixel champ ou pre", "px": [nn, nn2]}, None
    day_ratio, night_ratio = ld / ld2, ln / ln2
    day_gap, night_gap = rd - rd2, rn - rn2
    ok = night_ratio <= l_max * day_ratio and night_gap <= 0.60 * day_gap
    return {"L_ratio_jour": round(day_ratio, 3), "L_ratio_nuit": round(night_ratio, 3), "RB_ecart_jour": round(day_gap, 2),
            "RB_ecart_nuit": round(night_gap, 2), "px": [nn, nn2]}, ok


def c4_5(caps):
    roads = grid_roads()
    r4, r5, ok4, ok5 = {}, {}, True, True
    for name in ("champs-nord", "champs-est"):
        p, tiles = CROPS[name]
        day, night = caps[p + "-jour"], caps[p + "-nuit"]
        f, pre = field_pre(day, night, tiles, roads)
        v, ok = double(day, night, f, pre)
        r4[name], ok4 = v, ok4 and ok is True  # an empty crop fails: it would otherwise prove nothing
        if not count(f):
            r5[name] = {"non_mesurable": "aucun pixel champ"}
            continue
        dark = lambda cap: sum(lum_of(q) < 25 for q in pixels(cap.rgb, f)) / max(1, count(f))
        sd, sn = dark(day), dark(night)
        r5[name] = {"sombres_jour": round(sd, 3), "sombres_nuit": round(sn, 3), "ecart_pts": round(100 * (sn - sd), 1)}
        ok5 = ok5 and sn - sd <= 0.10
    return [line(4, "les champs ne brillent pas (champ/pre)", r4, "L nuit <= 1.10 x jour ET R-B nuit <= 60 % jour", ok4),
            line(5, "pas de grilles sombres (part L<25, partie pixels)", r5, "nuit - jour <= 10 points", ok5)]


def tile_set(tuiles, p, key):
    g = tuiles[p]
    if key == "roads":
        return {tuple(r["tile"]) for r in g["roads"]}
    return {tuple(t) for r in g["roads"] for t in r["pres"]}


def c6(caps, tuiles):
    vals, ok, total = {}, True, 0
    for p, label in (("p12", "route-porte"), ("p06", "p06-sud")):
        day, night = caps[p + "-jour"], caps[p + "-nuit"]
        road, pre = tile_set(tuiles, p, "roads"), tile_set(tuiles, p, "pres")
        total += len(road)
        both = united(day, night)
        sp = union(boxes(day.size, [q for q in both if q.get("layer") != "field"]),
                   diamonds(day.size, day.cam, {(q["tileI"], q["tileJ"]) for q in both if q.get("layer") == "field"}))
        bars = not_bars(day.size)
        a = minus(inter(diamonds(day.size, day.cam, road, 0.5), bars), sp)
        b = minus(inter(diamonds(day.size, day.cam, pre, 0.5), bars), sp)
        v, k = double(day, night, a, b, 1.02)  # tightened: the baseline passes at 1.10 (1.037), mid-way to 1
        v["tuiles_route"], v["tuiles_pre"] = len(road), len(pre)
        vals[label], ok = v, ok and k
    return line(6, "les chemins ne brillent pas (route/pre)", vals, f"meme double mesure que 4, >= 8 tuiles (ici {total})", ok and total >= 8)


def darkest10(px):
    px = sorted(px, key=lum_of)[: max(1, len(px) // 10)]
    m = tuple(mean([p[k] for p in px]) for k in range(3))
    return {"rgb_moyen": [round(v, 1) for v in m], "L_mediane": round(median([lum_of(p) for p in px]), 1),
            "B>R": m[2] > m[0], "B>G": m[2] > m[1]}, m[2] > m[0] and m[2] > m[1] and median([lum_of(p) for p in px]) >= 30


def c7(caps):
    day, night = caps["p06-jour"], caps["p06-nuit"]
    g = ground(day, night, CROPS["sol-sud"][1])
    _, pre = field_pre(day, night, CROPS["champs-nord"][1], grid_roads())
    a, ka = darkest10(pixels(night.rgb, g))
    b, kb = darkest10(pixels(night.rgb, pre))
    return line(7, "ombres froides (10 % les plus sombres, partie pixels)", {"sol-sud": a, "pre champs-nord": b}, "B>R, B>G, L mediane >= 30", ka and kb)


def c10(caps):
    vals, ok = {}, True
    for p in ("p06", "p12"):
        night = caps[p + "-nuit"]
        t = night.lum.reduce(8)
        W, H = t.size
        v = list(t.get_flattened_data())
        top, bot = math.ceil(BAR_TOP / 8), BAR_BOT // 8
        bl = [s for s in night.sprites if s.get("layer") == "building"]
        bx0 = max(0, int(min(s["x"] for s in bl) // 8))
        bx1 = min(W, int(-(-max(s["x"] + s["w"] for s in bl) // 8)))
        by0 = max(top, int(min(s["y"] for s in bl) // 8))
        by1 = min(bot, int(-(-max(s["y"] + s["h"] for s in bl) // 8)))
        bw, bh = bx1 - bx0, by1 - by0
        # summed-area tables of L and L^2
        S, S2 = [[0.0] * (W + 1) for _ in range(H + 1)], [[0.0] * (W + 1) for _ in range(H + 1)]
        for y in range(H):
            r = r2 = 0.0
            for x in range(W):
                r += v[y * W + x]
                r2 += v[y * W + x] ** 2
                S[y + 1][x + 1] = S[y][x + 1] + r
                S2[y + 1][x + 1] = S2[y][x + 1] + r2

        def ms(x, y):
            n = bw * bh
            a = S[y + bh][x + bw] - S[y][x + bw] - S[y + bh][x] + S[y][x]
            b = S2[y + bh][x + bw] - S2[y][x + bw] - S2[y + bh][x] + S2[y][x]
            return a / n, math.sqrt(max(0.0, b / n - (a / n) ** 2))
        bm, bs = ms(bx0, by0)
        bad = n = 0
        worst = (0.0, 0.0)
        for y in range(top, bot - bh + 1):
            for x in range(0, W - bw + 1):
                ox = max(0, min(x + bw, bx1) - max(x, bx0))
                oy = max(0, min(y + bh, by1) - max(y, by0))
                if ox * oy >= 0.25 * bw * bh:
                    continue
                n += 1
                m, s = ms(x, y)
                worst = (max(worst[0], m), max(worst[1], s))
                bad += m >= bm or s >= bs
        vals[p] = {"coeur_moy": round(bm, 2), "coeur_std": round(bs, 2), "fenetres": n, "fenetres_au_dessus": bad,
                   "max_moy_fenetre": round(worst[0], 2), "max_std_fenetre": round(worst[1], 2), "boite_cellules": [bw, bh]}
        ok = ok and n > 0 and bad == 0
    return line(10, "le coeur reste le plus lumineux (miniature 1/8)", vals, "aucune fenetre (recouvrement < 25 %) avec moy ou std >=", ok)


def report(d, tuiles_path=None):
    caps = {n: Cap(d, n) for n in ("p06-jour", "p06-nuit", "p12-jour", "p12-nuit")}
    tuiles = json.load(open(tuiles_path or NIGHT_DIR / "tuiles.json"))
    lines = [c1(caps), *c2_3_9(caps), *c4_5(caps), c6(caps, tuiles), c7(caps), c10(caps)]
    return sorted(lines, key=lambda x: x["id"])


# ---- road tiles (criterion 6) ------------------------------------------------------------------

def free_frac(cam, size, boxmask, tile, s=0.5):
    core = diamonds(size, cam, [tile], s)
    n = count(core)
    return count(minus(core, boxmask)) / n if n else 0.0


def on_screen(cam, tile):
    x, y = K.tile_to_px(cam, tile[0] + .5, tile[1] + .5)
    return 0 <= x < cam["screenW"] and BAR_TOP <= y < BAR_BOT


def cheb(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]))


def core_rb(cap, tile):
    m = diamonds(cap.size, cap.cam, [tile], 0.5)
    px = pixels(cap.rgb, m)
    return mean([p[0] - p[2] for p in px])


def derive_painted(cap, lo, hi, rb_road=28, rb_pre=12, free=0.9):
    """The road baked in the painted ground south of the village: tiles lo..hi whose day core reads R-B >= 28,
    past the sand plain (i + j >= 48). Meadow = exactly 2 tiles from the road tile, 2 or more from every road tile, R-B <= 12."""
    sp = boxes(cap.size, [q for q in cap.sprites if q.get("layer") != "field"])
    road = [(i, j) for i in range(lo, hi + 1) for j in range(lo, hi + 1)
            if i + j >= 48 and on_screen(cap.cam, (i, j)) and free_frac(cap.cam, cap.size, sp, (i, j)) >= free and core_rb(cap, (i, j)) >= rb_road]
    near_road = {(a, b) for a in range(18, 36) for b in range(18, 36)
                 if (a, b) not in road and min(cheb((a, b), r) for r in road) >= 2}
    out = []
    for r in road:
        pres = [t for t in sorted(near_road) if cheb(t, r) == 2 and on_screen(cap.cam, t)
                and free_frac(cap.cam, cap.size, sp, t) >= free and core_rb(cap, t) <= rb_pre]
        if pres:
            out.append({"tile": list(r), "pres": [list(t) for t in pres]})
    return out


def derive_p12(cap, free=0.7):
    """The code's streets in route-porte (tiles 12..26): `chemin` cells of isoLayout.json (pont excluded) the sprites leave
    visible; meadow = `herbe` cells exactly 2 cells from the street cell and 2 or more from every street cell."""
    raw = layout()
    streets = grid_roads(raw)
    herbe = {(gx, gy) for gy, row in enumerate(raw["sol"]) for gx, ch in enumerate(row) if raw["legende"][ch] == "herbe"}
    sp = union(boxes(cap.size, [q for q in cap.sprites if q.get("layer") != "field"]),
               diamonds(cap.size, cap.cam, {(q["tileI"], q["tileJ"]) for q in cap.sprites if q.get("layer") == "field"}))
    out = []
    for r in sorted(streets):
        if not (12 <= r[0] <= 26 and 12 <= r[1] <= 26) or raw["legende"][raw["sol"][r[1]][r[0]]] != "chemin":
            continue
        if not on_screen(cap.cam, r) or free_frac(cap.cam, cap.size, sp, r) < free:
            continue
        pres = [t for t in sorted(herbe) if cheb(t, r) == 2 and min(cheb(t, q) for q in streets) >= 2
                and on_screen(cap.cam, t) and free_frac(cap.cam, cap.size, sp, t) >= free]
        if pres:
            out.append({"tile": list(r), "pres": [list(t) for t in pres]})
    return out


def derive(d):
    p06, p12 = Cap(d, "p06-jour"), Cap(d, "p12-jour")
    return {"_doc": "Road tiles of criterion 6, frozen. p12: isoLayout.json chemin cells (code roads) in route-porte; p06: the road "
                    "baked in the painted ground, tiles whose day core reads as road (loupe_night.py derive_painted). Each road tile "
                    "lists its meadow neighbours (exactly 2 tiles away, nothing on them). Re-derive: loupe_night.py tuiles <dir>.",
            "p06": {"capture": "p06", "source": "painted road, colour of the day core", "roads": derive_painted(p06, 22, 30)},
            "p12": {"capture": "p12", "source": "isoLayout.json chemin cells the sprites leave free + the painted road in 20..26", "roads": derive_p12(p12) + derive_painted(p12, 20, 26)}}


def overlay(d, name, out, tuiles_path=None):
    cap = Cap(d, name)
    tuiles = json.load(open(tuiles_path or NIGHT_DIR / "tuiles.json"))
    p = name.split("-")[0]
    im = cap.rgb.copy()
    dr = ImageDraw.Draw(im)
    for t in tile_set(tuiles, p, "pres"):
        dr.polygon(diamond_pts(cap.cam, *t, 0.5), outline=(60, 255, 60), width=3)
    for t in tile_set(tuiles, p, "roads"):
        dr.polygon(diamond_pts(cap.cam, *t, 0.5), outline=(255, 40, 40), width=3)
        x, y = K.tile_to_px(cap.cam, t[0] + .5, t[1] + .5)
        dr.text((x - 14, y - 5), f"{t[0]},{t[1]}", fill=(255, 255, 255))
    im.save(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("report")
    r.add_argument("dir"); r.add_argument("--out"); r.add_argument("--tuiles")
    t = sub.add_parser("tuiles")
    t.add_argument("dir"); t.add_argument("--out", default=str(NIGHT_DIR / "tuiles.json"))
    o = sub.add_parser("overlay")
    o.add_argument("dir"); o.add_argument("capture"); o.add_argument("out"); o.add_argument("--tuiles")
    a = ap.parse_args(argv)
    if a.cmd == "tuiles":
        data = derive(a.dir)
        pathlib.Path(a.out).write_text(json.dumps(data, indent=1) + "\n")
        print(a.out, {k: len(v["roads"]) for k, v in data.items() if k != "_doc"})
        return 0
    if a.cmd == "overlay":
        overlay(a.dir, a.capture, a.out, a.tuiles)
        print(a.out)
        return 0
    res = report(a.dir, a.tuiles)
    for x in res:
        print(f"{x['id']:>2} {x['name']}: {json.dumps(x['values'], ensure_ascii=False)} | seuil {x['threshold']} | {'PASS' if x['pass'] else 'FAIL'}")
    print("non mesures ici: 5 (test a l'aveugle), 7 (diff), 8, 11, 12")
    if a.out:
        pathlib.Path(a.out).write_text(json.dumps(res, indent=1, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
