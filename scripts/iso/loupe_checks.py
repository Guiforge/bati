#!/usr/bin/env python3
"""Objective loupe checks (PROMPT.md section 9). Dev only, stdlib + Pillow.

    loupe_checks.py dump-check <dump.json> [--stamps stamps.json] [--mass-prefix tree]
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
FIRE = re.compile(r"flame|fire|feu", re.I)


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


def dump_check(dump, stamps=None, mass_prefix="tree"):
    cam, sprites = dump["camera"], dump["sprites"]
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


# ---- cli ---------------------------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("dump-check")
    d.add_argument("dump"); d.add_argument("--stamps"); d.add_argument("--mass-prefix", default="tree")
    v = sub.add_parser("vector-code")
    v.add_argument("--allowlist", default=str(HERE / "vector_allowlist.json"))
    p = sub.add_parser("vector-pixels")
    p.add_argument("img"); p.add_argument("--k", type=float); p.add_argument("--rect")
    t = sub.add_parser("thumb")
    t.add_argument("img")
    a = ap.parse_args(argv)
    if a.cmd == "dump-check":
        stamps = json.load(open(a.stamps)) if a.stamps else None
        probs = dump_check(json.load(open(a.dump)), stamps, a.mass_prefix)
        print("\n".join(probs) if probs else "dump-check: clean")
        return 1 if probs else 0
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
