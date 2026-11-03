#!/usr/bin/env python3
"""Scripted gates of the buildings track (docs/designs/village-buildings/PROMPT.md sections 7, 9.5, 10).

    python3 scripts/bld/gates.py sil     <base.png> <out-prefix> [--layer a.png[:dx,dy]]... [--anchor x.anchor.json]
                                         [--sails sails.png --pivot x,y --scale 1.15]
    python3 scripts/bld/gates.py grow    stage:<img> rank:<img> ... [--margin 1]       (G-GROW)
    python3 scripts/bld/gates.py corner  <before> <after> <old-building-mask> <new-building-mask> [--out diff.png]
                                         [--dumps before.json after.json]   (villagers' boxes are excluded)
    python3 scripts/bld/gates.py blind   <building> <img>... [--decoys img...]
    python3 scripts/bld/gates.py canary  <building> --grand g.png --rough r.png --ladder img... [--locked c.png --locked-base b.png]

A "mask" below is the building: the alpha above 0.5 of an RGBA image, or, for a picture without
alpha (a capture, a `.sil.png`), what differs from its top-left pixel. Stdlib and Pillow only.
Nothing here writes in the locked loupes files (docs/designs/village-loop/loupes/bc/r6,
~/.cache/bati-loupes-lock): `refuse_locked` stops any output path inside them.
"""

import argparse
import json
import math
import pathlib
import secrets
import sys
import tempfile

from PIL import Image, ImageChops, ImageDraw

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import bldtools as T  # noqa: E402

A, L = T.A, T.L

LOCKED = [
    pathlib.Path.home() / ".cache" / "bati-loupes-lock",
    L.ROOT / "docs" / "designs" / "village-loop" / "loupes" / "bc" / "r6",
    pathlib.Path("/home/guiforge/Documents/code/bati/.claude/worktrees/iso/docs/designs/village-loop/loupes/bc/r6"),
]
SPEC = json.loads((L.ROOT / "constants" / "isoSpec.json").read_text())


def refuse_locked(path):
    p = pathlib.Path(path).resolve()
    for root in LOCKED:
        if root.resolve() == p or root.resolve() in p.parents:
            raise SystemExit(f"refusing to write inside the locked loupes files: {p}")
    return pathlib.Path(path)


# ---- masks ----------------------------------------------------------------------------------------

def mask_of(src, thr=24):
    im = Image.open(src)
    if "A" in im.getbands():
        return A.binary(im.convert("RGBA").getchannel("A"))  # alpha >= 128, i.e. above 0.5
    rgb = im.convert("RGB")
    d = ImageChops.difference(rgb, Image.new("RGB", rgb.size, rgb.getpixel((0, 0))))
    r, g, b = d.split()
    return ImageChops.lighter(ImageChops.lighter(r, g), b).point(lambda v: 255 if v > thr else 0)


def measure(mask):
    box = mask.getbbox()
    if box is None:
        raise SystemExit("empty silhouette")
    return A.count(mask), box[3] - box[1], box


# ---- 3. silhouette of a stage -----------------------------------------------------------------------

def _hull(points):
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts

    def half(seq):
        out = []
        for p in seq:
            while len(out) >= 2 and (out[-1][0] - out[-2][0]) * (p[1] - out[-2][1]) - (out[-1][1] - out[-2][1]) * (p[0] - out[-2][0]) <= 0:
                out.pop()
            out.append(p)
        return out[:-1]

    return half(pts) + half(pts[::-1])


def project(v, anchor, footprint):
    """Grid point (gx, gy, z) -> canvas px. The anchor is the footprint's bottom corner (fw, fh)."""
    s = SPEC["S"]
    hz = SPEC["pxPerUnit"] * math.sin(math.radians(SPEC["cameraRotationDeg"][0]))
    gx, gy, z = v
    return (anchor[0] + ((gx - footprint[0]) - (gy - footprint[1])) * s / 2,
            anchor[1] + ((gx - footprint[0]) + (gy - footprint[1])) * s / 4 - z * hz)


def patch_mask(anchor_json, grow_px=14, tol=0.1):
    """The ground patch (headroom.md): the maquette's socle (first volume of `.anchor.json`) dilated by
    `grow_px`, minus every volume that rises more than `tol` above the socle's top."""
    from PIL import ImageDraw
    d = json.loads(pathlib.Path(anchor_json).read_text())
    fp = SPEC["canvases"][d["canvas"]]["footprint"]
    size = tuple(d["size"])
    vols = [[project(v, d["anchor"], fp) for v in vol["vertices"]] for vol in d["volumes"]]
    tops = [max(v[2] for v in vol["vertices"]) for vol in d["volumes"]]

    def fill(pts):
        m = Image.new("L", size, 0)
        ImageDraw.Draw(m).polygon(_hull(pts), fill=255)
        return m

    patch = A.dilate(fill(vols[0]), grow_px)
    for pts, top in zip(vols[1:], tops[1:]):
        if top > tops[0] + tol:
            patch = ImageChops.subtract(patch, fill(pts))
    return patch


def compose(base, layers=(), sails=None):
    """The stage painting with the add-ons and teasers of the rank ([(path, (dx, dy))]) and the
    windmill's sails (path, pivot, scale) at their fixed pose: the sprite is already drawn at 45°
    (an X), so no rotation is applied."""
    im = Image.open(base).convert("RGBA")
    todo = [(p, off) for p, off in layers]
    if sails:
        path, pivot, scale = sails
        s = Image.open(path).convert("RGBA")
        n = round(s.width * scale)
        todo.append((s.resize((n, n), Image.LANCZOS), (round(pivot[0] - n / 2), round(pivot[1] - n / 2))))
    for src, off in todo:
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        layer.paste(src if isinstance(src, Image.Image) else Image.open(src).convert("RGBA"), off)
        im = Image.alpha_composite(im, layer)
    return im


def stage_silhouette(base, out_prefix, layers=(), sails=None, patch=None, dp=96, density=2.75):
    """Black silhouette (`<prefix>.sil.png`) and its blur at `dp` (`<prefix>.<dp>.png`): alpha above
    0.5 of the composite, patch removed. Returns (area, height) of the silhouette."""
    refuse_locked(out_prefix)
    a = A.binary(compose(base, layers, sails).getchannel("A"))
    if patch is not None:
        a = ImageChops.subtract(a, patch)
    T.silhouette_of(a, str(out_prefix), dp, density)
    return measure(a)[:2]


# ---- 4. G-GROW ----------------------------------------------------------------------------------------

def grow(steps, min_area=0.15, min_height=0.10, min_xor=0.015, margin=1):
    """steps: [(label, "stage" | "rank", mask)], in order. A stage must beat the previous stage by
    `min_area` of area or `min_height` of height; a rank must differ from the previous step by
    `min_xor` of the area (XOR); everything inside the canvas (`margin` px clear of its edge).
    Returns the problems."""
    problems, prev, prev_stage = [], None, None
    for label, kind, m in steps:
        if prev is not None and m.size != prev[1].size:
            problems.append(f"{label}: canvas {m.size} != {prev[1].size}")
            continue
        area, h, box = measure(m)
        if box[0] < margin or box[1] < margin or box[2] > m.width - margin or box[3] > m.height - margin:
            problems.append(f"{label}: silhouette {box} leaves the canvas {m.size} (margin {margin})")
        if kind == "stage" and prev_stage is not None:
            pa, ph, _ = measure(prev_stage[1])
            if area < pa * (1 + min_area) and h < ph * (1 + min_height):
                problems.append(f"{label}: area {area / pa - 1:+.1%} and height {h / ph - 1:+.1%} against {prev_stage[0]}"
                                f" (needs {min_area:.0%} area or {min_height:.0%} height)")
        if kind == "rank" and prev is not None:
            xor = A.count(ImageChops.difference(prev[1], m))
            if xor < min_xor * max(area, measure(prev[1])[0]):
                problems.append(f"{label}: XOR with {prev[0]} is {xor / max(area, 1):.2%} of the area (needs {min_xor:.1%})")
        prev = (label, m)
        if kind == "stage":
            prev_stage = prev
    return problems


# ---- 6. G-CORNER --------------------------------------------------------------------------------------

def villager_rects(*dumps, dilate_px=6):
    """Pixel boxes (x0, y0, x1, y1) of the `villager` layer in loupe dumps (loupe_checks.py format), each
    grown by `dilate_px`. Villagers walk by the date (marcheurs.ts `jourDe`), so two captures taken on
    different days differ where they stand, with no change of code."""
    boxes = []
    for d in dumps:
        data = json.load(open(d)) if isinstance(d, (str, pathlib.Path)) else d
        for s in data["sprites"]:
            if s.get("layer") == "villager":
                boxes.append((math.floor(s["x"]) - dilate_px, math.floor(s["y"]) - dilate_px,
                              math.ceil(s["x"] + s["w"]) + dilate_px, math.ceil(s["y"] + s["h"]) + dilate_px))
    return boxes


def corner(before, after, old_mask, new_mask, dilate_px=6, limit=0.02, thr=8, out=None, exclude=()):
    """Part of the pixels outside the mask that changed by more than `thr`, the mask being the old and
    the new building masks together, dilated by `dilate_px`. Returns (part, ok); ok under `limit`.
    The part is over the pixels outside the mask. `exclude`: pixel boxes (villager_rects) left out of
    both the changed pixels and the area they are a part of."""
    x, y = Image.open(before).convert("RGB"), Image.open(after).convert("RGB")
    if x.size != y.size:
        raise SystemExit(f"size {x.size} != {y.size}")
    m = A.dilate(ImageChops.lighter(mask_of(old_mask), mask_of(new_mask)), dilate_px)
    for box in exclude:
        ImageDraw.Draw(m).rectangle(box, fill=255)
    r, g, b = ImageChops.difference(x, y).split()
    changed = ImageChops.lighter(ImageChops.lighter(r, g), b).point(lambda v: 255 if v > thr else 0)
    outside = ImageChops.subtract(changed, m)
    if out:
        outside.save(refuse_locked(out))
    free = x.width * x.height - A.count(m)
    part = A.count(outside) / free if free else 0.0
    return part, part < limit


# ---- 7. blind sets and canaries -----------------------------------------------------------------------

def neutral_dir(parent=None):
    """A fresh folder `blind-<8 hex>` that tells a stranger nothing."""
    base = pathlib.Path(parent or tempfile.gettempdir())
    while True:
        d = base / f"blind-{secrets.token_hex(4)}"
        try:
            d.mkdir(mode=0o700)
            return d
        except FileExistsError:
            continue


def clean(path):
    """Pixels only, on the neutral ground: no PNG text chunk, no EXIF, no source name."""
    im = T.flat(path)
    out = Image.new("RGB", im.size)
    out.frombytes(im.tobytes())
    return out


def blind(building, images, decoys=(), parent=None, seed=None):
    """Copies in a neutral folder as NN.png, shuffled, metadata stripped. The key (NN -> source and
    role) goes to ~/.cache/bati-buildings/<building>/, out of the repo. Returns (folder, key path)."""
    import random
    rng = random.Random(seed)
    items = [(str(p), "stage") for p in images] + [(str(p), "decoy") for p in decoys]
    rng.shuffle(items)
    out = neutral_dir(parent)
    key = {}
    for n, (src, role) in enumerate(items, 1):
        clean(src).save(out / f"{n:02d}.png")
        key[f"{n:02d}"] = {"source": src, "role": role}
    return out, T.write_key(building, "blind", key)


def strip(paths, out, height=256):
    ims = [clean(p) for p in paths]
    ims = [i.resize((round(i.width * height / i.height), height), Image.LANCZOS) for i in ims]
    s = Image.new("RGB", (sum(i.width for i in ims), height), T.BG)
    x = 0
    for i in ims:
        s.paste(i, (x, 0))
        x += i.width
    s.save(out)
    return out


def canary_pairs(work, grand, rough, ladder, locked=None, locked_base=None):
    """The known-answer pairs of section 10, (winner, loser, "canary") each, for T.ab:
    more impressive: today's grand against today's rough; fits better / more beautiful: the locked
    beauty corner crop against its baseline; S-E: today's ladder against a strip repeating one image."""
    work = pathlib.Path(work)
    if locked is None:
        lock = pathlib.Path.home() / ".cache" / "bati-loupes-lock"
        locked, locked_base = lock / "bc" / "r6" / "bc-coin-bas.png", lock / "baseline" / "bc-coin-bas.png"
    return [
        (grand, rough, "canary"),
        (locked, locked_base, "canary"),
        (strip(ladder, work / "ladder.png"), strip([ladder[0]] * len(ladder), work / "repeat.png"), "canary"),
    ]


def check_canaries(key_path, answers):
    """answers: {"01": "left" | "right"}. Returns the canary pairs the context missed (empty = valid)."""
    key = json.loads(pathlib.Path(key_path).read_text())
    return [n for n, k in key.items() if "canary_winner" in k and k[answers.get(n, "tie")] != k["canary_winner"]]


# ---- CLI ---------------------------------------------------------------------------------------------

def _xy(s):
    x, y = s.split(",")
    return float(x), float(y)


def _layer(s):
    p, _, off = s.partition(":")
    return p, tuple(int(v) for v in off.split(",")) if off else (0, 0)


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sil")
    s.add_argument("base"); s.add_argument("out_prefix"); s.add_argument("--layer", action="append", default=[])
    s.add_argument("--anchor"); s.add_argument("--sails"); s.add_argument("--pivot", type=_xy)
    s.add_argument("--scale", type=float, default=1.0)
    s = sub.add_parser("grow")
    s.add_argument("steps", nargs="+", help="stage:<img> or rank:<img>"); s.add_argument("--margin", type=int, default=1)
    s = sub.add_parser("corner")
    s.add_argument("before"); s.add_argument("after"); s.add_argument("old_mask"); s.add_argument("new_mask")
    s.add_argument("--out"); s.add_argument("--dumps", nargs=2, metavar=("BEFORE_JSON", "AFTER_JSON"))
    s = sub.add_parser("blind")
    s.add_argument("building"); s.add_argument("images", nargs="+"); s.add_argument("--decoys", nargs="*", default=[])
    s.add_argument("--seed", type=int)
    s = sub.add_parser("canary")
    s.add_argument("building"); s.add_argument("--grand", required=True); s.add_argument("--rough", required=True)
    s.add_argument("--ladder", nargs="+", required=True); s.add_argument("--locked"); s.add_argument("--locked-base")
    s.add_argument("--seed", type=int)
    a = p.parse_args(argv)
    if a.cmd == "sil":
        sails = (a.sails, a.pivot, a.scale) if a.sails else None
        patch = patch_mask(a.anchor) if a.anchor else None
        print(stage_silhouette(a.base, a.out_prefix, [_layer(x) for x in a.layer], sails, patch))
    elif a.cmd == "grow":
        steps = [(x.partition(":")[2], x.partition(":")[0], mask_of(x.partition(":")[2])) for x in a.steps]
        bad = grow(steps, margin=a.margin)
        print("\n".join(bad) or "every step grows")
        return 1 if bad else 0
    elif a.cmd == "corner":
        part, ok = corner(a.before, a.after, a.old_mask, a.new_mask, out=a.out,
                          exclude=villager_rects(*a.dumps) if a.dumps else ())
        print(f"{part:.3%} changed outside the mask ({'pass' if ok else 'S-G needed'})")
        return 0 if ok else 1
    elif a.cmd == "blind":
        folder, key = blind(a.building, a.images, a.decoys, seed=a.seed)
        print(folder, key)
    elif a.cmd == "canary":
        scratch = tempfile.mkdtemp(prefix="canary-")  # the strips' names would give the answer away
        out = neutral_dir()
        pairs = canary_pairs(scratch, a.grand, a.rough, a.ladder, a.locked, a.locked_base)
        print(out, T.ab(a.building, pairs, out, a.seed))
    return 0


if __name__ == "__main__":
    sys.exit(main())
