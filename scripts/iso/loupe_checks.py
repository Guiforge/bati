#!/usr/bin/env python3
"""Objective loupe checks (PROMPT.md section 9). Dev only, stdlib + Pillow.

    loupe_checks.py dump-check <dump.json> [--stamps stamps.json] [--mass-prefix tree] [--tiles i0,j0,i1,j1]
    loupe_checks.py core <dump.json> <img>        (BC criterion 9: the village against its surroundings, 1/8 thumbnail)
    loupe_checks.py forest <dump.json> [--tiles i0,j0,i1,j1]   (BC criterion 4: width ratio, classes, near/far medians)
    loupe_checks.py vector-code [--allowlist scripts/iso/vector_allowlist.json]
    loupe_checks.py vector-pixels <img> [--k K] [--rect x,y,w,h]
    loupe_checks.py thumb <img>

Exit code 1 when a check fails (vector-pixels without --k only prints a distribution, exit 0).

Shared JSON formats (the app's dev hook writes the dump, the ground baker writes the stamps):

  dump.json   {"camera": {"zoom", "tx", "ty", "tileW", "tileH", "screenW", "screenH"},
               "sprites": [{"id": str, "x": num, "y": num, "w": num, "h": num, "flip": bool,
                            "tileI": num, "tileJ": num, "z": num, "container": str|null (optional)}]}
    x, y, w, h: SCREEN pixels of the drawn sprite box (top-left x, y), at the captured camera.
    tileI, tileJ: the tile the sprite stands on (its foot). flip: drawn mirrored.
    container: only for fire/flame sprites (id containing flame|fire|feu): the id of the hearth,
      brazier, torch or lantern holding it. A flame with no container is G17 failing.
  stamps.json [{"asset": str, "tile": [i, j], "flip": bool, "band": str}]   one entry per baked stamp
  Camera projection: x = (i - j) * tileW / 2 * zoom + tx ; y = (i + j) * tileH / 2 * zoom + ty.
    As the app writes it (dev-iso `?dump=`, components/village/iso/dumpSprites.ts `cameraDump`), checked
    against the map's transform: tileW = 48 and tileH = 24 (dp of one cell at map zoom 1), zoom = the
    camera's zoom x the display density (px per map dp), tx and ty already in screen px with the map
    area's offset and the map's centred pivot folded in. So the formula is exact in pixels, no dpr
    left to apply. A sprite flagged "screenFixed": true does not move with the camera (foreground).
    Optional "layer": str on a sprite (building, decor, forest, field, prop, wall, animal, villager,
    flame, foreground, ...).

Rule 3 (art rules, section 6) as coded: a sprite or stamp bigger than 48 px (w or h) that appears twice
in the same screen fails unless one of the two is flipped against the other AND they stand at least 6
tiles apart (Chebyshev distance on tiles). Sprites whose id starts with --mass-prefix (default "tree")
are single trees of a forest mass: they fail only when an identical pair touches (distance <= 1 tile).
Stamps carry no size, so every stamp is checked as if bigger than 48 px; only those inside the screen
count (projected with the camera).
With --tiles i0,j0,i1,j1 (both ends included) only the layer=forest sprites whose foot tile is in the box and the
manifest stamps in the box are checked (a flame is not, G17 is a whole-screen check).
"""

import argparse
import json
import pathlib
import re
import sys

from PIL import Image, ImageStat

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MIN_PX, MIN_TILES = 48, 6
FIRE = re.compile(r"flame|(^|_)fire|(^|_)feu(_|$)", re.I)


# ---- dump-check --------------------------------------------------------------------------------

def _dist(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]))


def _repeat_problems(label, items, mass_prefix):
    """items: [(id, flip, (i, j))] on screen. Returns one message per offending pair."""
    out, seen = [], {}
    for it in items:
        for prev in seen.get(it[0], []):
            d = _dist(it[2], prev[2])
            if mass_prefix and it[0].startswith(mass_prefix):
                if d <= 1:
                    out.append(f"{label} {it[0]}: identical pair touching at {prev[2]} and {it[2]}")
            elif not (it[1] != prev[1] and d >= MIN_TILES):
                why = "same orientation" if it[1] == prev[1] else f"only {d} tiles apart"
                out.append(f"{label} {it[0]}: repeated at {prev[2]} and {it[2]} ({why}, needs flipped and {MIN_TILES}+ tiles)")
        seen.setdefault(it[0], []).append(it)
    return out


def in_tiles(i, j, tiles):
    return tiles[0] <= i <= tiles[2] and tiles[1] <= j <= tiles[3]


def dump_check(dump, stamps=None, mass_prefix="tree", tiles=None):
    cam, sprites = dump["camera"], dump["sprites"]
    if tiles:
        sprites = [s for s in sprites if s.get("layer") == "forest" and in_tiles(s["tileI"], s["tileJ"], tiles)]
        stamps = [st for st in stamps or [] if in_tiles(*st["tile"], tiles)]
    sw, sh = cam["screenW"], cam["screenH"]
    problems = []
    big = [s for s in sprites
           if (s["w"] > MIN_PX or s["h"] > MIN_PX)
           and s["x"] < sw and s["x"] + s["w"] > 0 and s["y"] < sh and s["y"] + s["h"] > 0]
    problems += _repeat_problems("sprite", [(s["id"], bool(s["flip"]), (s["tileI"], s["tileJ"])) for s in big], mass_prefix)
    if stamps:
        z = cam["zoom"]
        on = []
        for st in stamps:
            i, j = st["tile"]
            x, y = (i - j) * cam["tileW"] / 2 * z + cam["tx"], (i + j) * cam["tileH"] / 2 * z + cam["ty"]
            if 0 <= x < sw and 0 <= y < sh:
                on.append((st["asset"], bool(st["flip"]), (i, j)))
        problems += _repeat_problems("stamp", on, None)
    for s in sprites:  # G17
        if FIRE.search(s["id"]) and not s.get("container"):
            problems.append(f"G17 {s['id']} at tile ({s['tileI']}, {s['tileJ']}): flame with no container")
    return problems


# ---- vector-code -------------------------------------------------------------------------------

DRAWING = ("Path", "Rect", "Circle", "Polygon", "Polyline", "Line", "Ellipse", "Text", "TSpan")
SCAN = ["components/village/iso", "app/dev-iso.tsx"]


def vector_code(root=ROOT, allowlist=HERE / "vector_allowlist.json"):
    """Returns (failing, allowed): lists of (file, line, component). Image, G, Defs, ClipPath, gradients are not drawing."""
    allow = json.loads(pathlib.Path(allowlist).read_text())["files"]
    files = []
    for s in SCAN:
        p = root / s
        files += sorted(p.rglob("*.tsx")) if p.is_dir() else [p]
    failing, allowed = [], []
    for f in files:
        text = f.read_text()
        m = re.search(r"import\s+(?:\w+\s*,\s*)?\{([^}]*)\}\s*from\s*[\"']react-native-svg[\"']", text)
        if not m:
            continue
        names = {n.strip().split(" as ")[0] for n in m.group(1).split(",")} & set(DRAWING)
        rel = f.relative_to(root).as_posix()
        ok = set(allow.get(rel, {}).get("allow", []))
        for n in sorted(names):
            for ln, line in enumerate(text.splitlines(), 1):
                if re.search(rf"<{n}(?![A-Za-z])", line):
                    (allowed if n in ok else failing).append((rel, ln, n))
    return failing, allowed


# ---- vector-pixels -----------------------------------------------------------------------------

BLOCK = 16


def block_stds(img, rect=None):
    """{(bx, by): luminance std} per full 16 px block; fully transparent blocks are skipped."""
    im = img.convert("RGBA")
    if rect:
        x, y, w, h = rect
        im = im.crop((x, y, x + w, y + h))
    lum, alpha = im.convert("L"), im.getchannel("A")
    out = {}
    for by in range(im.height // BLOCK):
        for bx in range(im.width // BLOCK):
            box = (bx * BLOCK, by * BLOCK, (bx + 1) * BLOCK, (by + 1) * BLOCK)
            if alpha.crop(box).getextrema()[1] == 0:
                continue
            out[(bx, by)] = ImageStat.Stat(lum.crop(box)).stddev[0]
    return out, (im.width // BLOCK, im.height // BLOCK)


def vector_pixels(img, k=None, rect=None):
    stds, (cols, rows) = block_stds(img, rect)
    vals = sorted(stds.values())
    if not vals:
        return "no opaque block", True
    if k is None:
        q = lambda p: vals[min(len(vals) - 1, int(p * len(vals)))]
        lines = [f"{len(vals)} blocks of {BLOCK} px, luminance std: "
                 + " ".join(f"p{int(p * 100)}={q(p):.2f}" for p in (0, .05, .1, .25, .5, .75, .9, 1 - 1e-9))]
        for lo, hi in ((0, 1), (1, 2), (2, 3), (3, 4), (4, 6), (6, 9), (9, 14), (14, 256)):
            n = sum(lo <= v < hi for v in vals)
            lines.append(f"  [{lo:>2},{hi:>3}) {n:>6} {100 * n / len(vals):5.1f} %")
        return "\n".join(lines), True
    flat = sum(v < k for v in vals)
    rows_txt = ["".join(" " if (bx, by) not in stds else "#" if stds[(bx, by)] < k else "." for bx in range(cols))
                for by in range(rows)]
    return f"{flat}/{len(vals)} blocks under std {k} ({100 * flat / len(vals):.1f} %), # = flat\n" + "\n".join(rows_txt), True


# ---- thumb -------------------------------------------------------------------------------------

def thumb(img):
    """Blur to 1/8 (box), then a 4x4 grid of mean luminance and contrast (std) on the blurred image."""
    small = img.convert("L").reduce(8)
    gw, gh = small.width // 4, small.height // 4
    cells = {}
    for r in range(4):
        for c in range(4):
            st = ImageStat.Stat(small.crop((c * gw, r * gh, (c + 1) * gw, (r + 1) * gh)))
            cells[(r, c)] = (st.mean[0], st.stddev[0])
    return small.size, cells


def thumb_report(img):
    size, cells = thumb(img)
    bright = max(cells, key=lambda k: cells[k][0])
    contrast = max(cells, key=lambda k: cells[k][1])
    lines = [f"thumbnail {size[0]}x{size[1]}", "mean luminance (row = top to bottom):"]
    lines += ["  " + " ".join(f"{cells[(r, c)][0]:5.1f}" for c in range(4)) for r in range(4)]
    lines += ["contrast (std):"]
    lines += ["  " + " ".join(f"{cells[(r, c)][1]:5.1f}" for c in range(4)) for r in range(4)]
    lines += [f"brightest cell (row, col) = {bright}, most contrasted = {contrast}"]
    return "\n".join(lines)


# ---- core (BC criterion 9) ---------------------------------------------------------------------

BAR_TOP, BAR_BOT = 130, 2340  # system bars of the 1080 x 2400 captures (same as loupe_night.py)


def _stats(lum, box):
    st = ImageStat.Stat(lum.crop(box))
    return st.mean[0], st.stddev[0]


def core(dump, img):
    """Returns (lines, ok). The box of the layer=building sprites on the 1/8 thumbnail, bars out."""
    k = 8
    size = img.size
    blds = [s for s in dump["sprites"] if s.get("layer") == "building"]
    if not blds:
        return ["no layer=building sprite in the dump"], False
    top, bot = BAR_TOP // k, BAR_BOT // k
    x0 = max(0, int(min(s["x"] for s in blds) // k))
    x1 = min(size[0] // k, -int(-max(s["x"] + s["w"] for s in blds) // k))
    y0 = max(top, int(min(s["y"] for s in blds) // k))
    y1 = min(bot, -int(-max(s["y"] + s["h"] for s in blds) // k))
    box = (x0, y0, x1, y1)
    bw, bh = x1 - x0, y1 - y0
    thumb_ = img.convert("RGB").reduce(k)
    lum, sat = thumb_.convert("L"), thumb_.convert("HSV").getchannel("S")
    mean, std = _stats(lum, box)
    beat, n = [], 0
    for wy in range(top, bot - bh + 1):
        for wx in range(0, thumb_.width - bw + 1):
            ix = max(0, min(wx + bw, x1) - max(wx, x0))
            iy = max(0, min(wy + bh, y1) - max(wy, y0))
            if ix * iy >= 0.25 * bw * bh:
                continue
            n += 1
            m, sd = _stats(lum, (wx, wy, wx + bw, wy + bh))
            if m >= mean or sd >= std:
                beat.append((wx, wy, m, sd))
    area = lambda im, b: sum(im.crop(b).get_flattened_data())
    band = (0, top, thumb_.width, bot)
    n_band = (bot - top) * thumb_.width
    n_box = bw * bh
    def outside(im):
        return (area(im, band) - area(im, box)) / (n_band - n_box)
    lv, ls = mean, outside(lum)
    sv, ss = area(sat, box) / n_box, outside(sat)
    ratio = lv / ls
    lines = [
        f"village box {box} on the {thumb_.width}x{thumb_.height} thumbnail ({bw}x{bh}), mean {mean:.1f} std {std:.1f}",
        f"{n} windows of the same size overlapping it under 25 %, {len(beat)} with mean >= or std >= the box"
        + "".join(f"\n  window ({w[0]},{w[1]}) mean {w[2]:.1f} std {w[3]:.1f}" for w in sorted(beat, key=lambda w: -w[2])[:5]),
        f"L village {lv:.1f} / L surroundings {ls:.1f} = {ratio:.2f} (wanted 1.10 to 1.50)",
        f"mean saturation village {sv:.1f}, surroundings {ss:.1f} (wanted surroundings < village)",
    ]
    ok = not beat and 1.10 <= ratio <= 1.50 and ss < sv
    return lines + ["core: " + ("ok" if ok else "FAIL")], ok


# ---- forest (BC criterion 4) -------------------------------------------------------------------

def forest(dump, tiles=None):
    """Returns (lines, ok): width max/min (>= 1.8), size classes (>= 3), median width near vs far quarter."""
    cam = dump["camera"]
    fs = [s for s in dump["sprites"] if s.get("layer") == "forest"
          and s["x"] < cam["screenW"] and s["x"] + s["w"] > 0 and s["y"] < cam["screenH"] and s["y"] + s["h"] > 0
          and (not tiles or in_tiles(s["tileI"], s["tileJ"], tiles))]
    blds = [s for s in dump["sprites"] if s.get("layer") == "building"]
    if len(fs) < 4 or not blds:
        return [f"{len(fs)} forest sprites and {len(blds)} buildings: too few to judge"], False
    ci = sum(b["tileI"] for b in blds) / len(blds)
    cj = sum(b["tileJ"] for b in blds) / len(blds)
    fs.sort(key=lambda s: _dist((s["tileI"], s["tileJ"]), (ci, cj)))
    ws = sorted(s["w"] for s in fs)
    ratio = ws[-1] / ws[0]
    classes = 1 + sum(b / a > 1.25 for a, b in zip(ws, ws[1:]))
    q = max(1, len(fs) // 4)
    med = lambda v: sorted(v)[len(v) // 2]
    near, far = med([s["w"] for s in fs[:q]]), med([s["w"] for s in fs[-q:]])
    ids = sorted({s["id"] for s in fs})
    lines = [
        f"{len(fs)} forest sprites on screen, widths {ws[0]:.0f} to {ws[-1]:.0f} px, max/min {ratio:.2f} (wanted >= 1.80)",
        f"{classes} size classes (gap > 25 % between sorted widths, wanted >= 3)",
        f"median width, quarter nearest the village {near:.0f} px, farthest {far:.0f} px (wanted nearest < farthest)",
        f"ids: {', '.join(ids)}  (birch, oak and pine all visible: judged by eye)",
    ]
    ok = ratio >= 1.8 and classes >= 3 and near < far
    return lines + ["forest: " + ("ok" if ok else "FAIL")], ok


# ---- cli ---------------------------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("dump-check")
    d.add_argument("dump"); d.add_argument("--stamps"); d.add_argument("--mass-prefix", default="tree")
    d.add_argument("--tiles")
    c = sub.add_parser("core")
    c.add_argument("dump"); c.add_argument("img")
    f = sub.add_parser("forest")
    f.add_argument("dump"); f.add_argument("--tiles")
    v = sub.add_parser("vector-code")
    v.add_argument("--allowlist", default=str(HERE / "vector_allowlist.json"))
    p = sub.add_parser("vector-pixels")
    p.add_argument("img"); p.add_argument("--k", type=float); p.add_argument("--rect")
    t = sub.add_parser("thumb")
    t.add_argument("img")
    a = ap.parse_args(argv)
    if a.cmd == "dump-check":
        stamps = json.load(open(a.stamps)) if a.stamps else None
        tiles = tuple(int(x) for x in a.tiles.split(",")) if a.tiles else None
        probs = dump_check(json.load(open(a.dump)), stamps, a.mass_prefix, tiles)
        print("\n".join(probs) if probs else "dump-check: clean")
        return 1 if probs else 0
    if a.cmd in ("core", "forest"):
        dump = json.load(open(a.dump))
        if a.cmd == "core":
            lines, ok = core(dump, Image.open(a.img))
        else:
            lines, ok = forest(dump, tuple(int(x) for x in a.tiles.split(",")) if a.tiles else None)
        print("\n".join(lines))
        return 0 if ok else 1
    if a.cmd == "vector-code":
        failing, allowed = vector_code(ROOT, a.allowlist)
        print(f"allowed: {len(allowed)} drawing elements")
        for f, ln, n in failing:
            print(f"FAIL {f}:{ln} <{n}> not in the allowlist")
        print(f"{len(failing)} outside the allowlist")
        return 1 if failing else 0
    if a.cmd == "vector-pixels":
        rect = tuple(int(x) for x in a.rect.split(",")) if a.rect else None
        text, _ = vector_pixels(Image.open(a.img), a.k, rect)
        print(text)
        return 0
    print(thumb_report(Image.open(a.img)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
