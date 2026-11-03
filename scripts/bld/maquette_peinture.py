#!/usr/bin/env python3
"""The maquette made for the painter (E5/E4, mara's corrections of E3): what FLUX is shown as image 1.

    python3 scripts/bld/maquette_peinture.py windmill_solid OUT.png [--mask OUT.mask.png]
    python3 scripts/bld/maquette_peinture.py pilote/windmill_solid OUT.png      (a spec of a subfolder of bld/)

From a stage's blockout spec: no cast shadows, no facets (two soft values per material, the lit/shade border blurred), a roof
in matte grey slate, a flag of rippled cloth instead of a box, knotted-neck sacks instead of cones, the stage's markers and
slab removed, on flat magenta. **No ground at all** (cards: no ground in the maquette nor in the painting; the ground is its own
sprite): the building and its accessories only. `--mask` still writes the slab's footprint, which is never sent to FLUX.
Dev only: Blender goes through isolib, like render_pilot.py.
"""
import argparse
import json
import hashlib
import math
import os
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = pathlib.Path.home() / ".cache" / "bati-buildings"
os.environ["ART_LOOP_DIR"] = str(CACHE / "art-loop")
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
import isolib as L  # noqa: E402
from PIL import Image, ImageChops, ImageFilter  # noqa: E402

SPECS = ROOT / "scripts" / "iso" / "blockouts" / "bld"
MAGENTA = (255, 0, 255)
# [top, lit, shade]: top and lit are one value, so a material has two
DAY = {
    "stone": ["#BDB29C", "#BDB29C", "#94866E"],
    "wood": ["#7A5A3C", "#7A5A3C", "#4E3C34"],
    "darkwood": ["#5E4430", "#5E4430", "#3A2E2C"],
    "tile": ["#8A5F4A", "#8A5F4A", "#5A4038"],
    "thatch": ["#B8965C", "#B8965C", "#7A6240"],
    "culotte": ["#5F7A96", "#5F7A96", "#3F5068"],
    "iron": ["#5A5E62", "#5A5E62", "#3A3E48"],
    "canvas": ["#CDBF9C", "#CDBF9C", "#8E8478"],
    "banner": ["#A8432F", "#A8432F", "#6A3040"],
    "plaster": ["#D6CEBE", "#D6CEBE", "#A09A94"],
    # cards windmill / observatory
    "crystal": ["#5A88AC", "#5A88AC", "#3A5F86"],
    "ruban": ["#BCD6E4", "#BCD6E4", "#7FA3BC"],
    "ciel": ["#A8C2D2", "#A8C2D2", "#7C98A8"],
    "laiton": ["#9A7B45", "#9A7B45", "#5E4C34"],
    "patine": ["#6F8F80", "#6F8F80", "#46594F"],
    "nuit": ["#1B2340", "#1B2340", "#141A30"],
    "fente": ["#15192A", "#15192A", "#15192A"],
}


def sack(x, y):
    """A sack with a knotted neck: belly, shoulder, tied neck, knot."""
    return [
        {"type": "cone", "mat": "canvas", "center": [x, y, 0.04], "r": 0.12, "r2": 0.14, "h": 0.1},
        {"type": "cone", "mat": "canvas", "center": [x, y, 0.14], "r": 0.14, "r2": 0.05, "h": 0.09},
        {"type": "cyl", "mat": "canvas", "center": [x, y, 0.23], "r": 0.04, "h": 0.05},
        {"type": "cone", "mat": "canvas", "center": [x, y, 0.28], "r": 0.065, "r2": 0.02, "h": 0.06},
    ]


def flag(x, y, z, w=0.3, hgt=0.15, n=6):
    """Cloth with a ripple: thin slices offset up and sideways in a wave."""
    seg = w / n
    out = []
    for i in range(n):
        out.append({"type": "box", "mat": "banner", "at": [round(x + i * seg, 4), round(y + 0.022 * math.sin(i * 1.3), 4),
                                                           round(z + 0.035 * math.sin(i * 1.3 + 0.6), 4)],
                    "size": [round(seg + 0.004, 4), 0.02, hgt]})
    return out


def painting_spec(name):
    spec = json.loads((SPECS / f"{name}.json").read_text())
    parts, seen = [], set()
    for p in spec["parts"]:
        if p.get("_plate") or p.get("_marker"):
            continue
        if p["type"] == "cone" and p["mat"] == "canvas" and p["r"] <= 0.2:
            xy = (round(p["center"][0], 1), round(p["center"][1], 1))
            if xy not in seen:
                seen.add(xy)
                parts += sack(*p["center"][:2])
            continue
        if p["type"] == "box" and p["mat"] == "banner" and p["at"][2] > 2 and p["size"][1] <= 0.03:
            parts += flag(*p["at"], w=p["size"][0], hgt=p["size"][2])
            continue
        parts.append(p)
    spec["parts"] = parts
    spec["materials"] = {k: {"tones": v, "source": "maquette_peinture day tones"} for k, v in DAY.items()}
    return spec, [q for q in json.loads((SPECS / f"{name}.json").read_text())["parts"] if q.get("_plate")]


LOCAL_LIGHT = False  # round 4 (windmill): the lit field is blurred inside each material, see local_field()


class _Field:
    """A (h, w) uint8 array read like a PixelAccess: field[x, y]."""

    def __init__(self, arr):
        self.arr = arr

    def __getitem__(self, xy):
        return int(self.arr[xy[1], xy[0]])


def local_field(rgba, classes, pair, radius):
    """Per material: blur(lit pixels) / blur(member pixels). A neighbour of another material (a dark roof, the gallery deck,
    an ink line) no longer darkens the stone: the global blur leaked the dark roof and deck into each short band of shaft and
    tilted its iso-lines into diagonals (round 3). Where a material is too thin to divide by, an 8 px blur stands in."""
    import numpy as np
    a = np.asarray(rgba)
    rgb, opaque = a[..., :3], a[..., 3] == 255
    lit_class = np.asarray(classes)[..., 1] < 140
    out = np.zeros(rgb.shape[:2], np.uint8)

    def blur(m, r):
        return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), float)

    for lit_c in sorted({v[0] for v in pair.values()}):
        shade_c = next(v[1] for v in pair.values() if v[0] == lit_c)
        member = opaque & ((rgb == lit_c).all(-1) | (rgb == shade_c).all(-1))
        if not member.any():
            continue
        lit = member & lit_class
        b, l = blur(member, radius), blur(lit, radius)
        b8, l8 = blur(member, 8), blur(lit, 8)
        t = np.where(b >= 40, l / np.maximum(b, 1), l8 / np.maximum(b8, 1))
        out[member] = np.clip(np.round(t[member] * 255), 0, 255).astype(np.uint8)
    return out


def soften(rgba, classes, radius=70):
    """Per material, two values (lit, shade) mixed by a blurred lit field: no polygon of light. The material comes from the
    pixel's exact flat colour (the render's material codes are too coarse to tell them apart)."""
    px, cl = rgba.load(), classes.load()
    w, h = rgba.size
    pair = {}
    for lit_hex, _, shade_hex in DAY.values():
        pair[L.hex_rgb(lit_hex)] = pair[L.hex_rgb(shade_hex)] = (L.hex_rgb(lit_hex), L.hex_rgb(shade_hex))
    # The antialiased pixels where a lit facet meets a shaded one match no flat colour, so they escaped the blend and drew a
    # 2 px vertical seam down the shaft (round 3). A pixel with the same material on both sides, within 3 px on a row or a
    # column, takes that material's lit or shade value by its own class and is then blended like the rest.
    fixes = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 255 and px[x, y][:3] not in pair:
                for dx, dy in ((1, 0), (0, 1)):
                    a = b = None
                    for k in (1, 2, 3):
                        if a is None and x - dx * k >= 0 and y - dy * k >= 0 and px[x - dx * k, y - dy * k][:3] in pair:
                            a = pair[px[x - dx * k, y - dy * k][:3]]
                        if b is None and x + dx * k < w and y + dy * k < h and px[x + dx * k, y + dy * k][:3] in pair:
                            b = pair[px[x + dx * k, y + dy * k][:3]]
                    if a and a == b:
                        fixes.append((x, y, a[0] if cl[x, y][1] < 140 else a[1]))
                        break
    for x, y, c in fixes:
        px[x, y] = (*c, 255)
    lit = Image.new("L", (w, h), 0)
    lp = lit.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][:3] in pair and cl[x, y][1] < 140:
                lp[x, y] = 255
    soft = _Field(local_field(rgba, classes, pair, radius)) if LOCAL_LIGHT else lit.filter(ImageFilter.GaussianBlur(radius)).load()
    out = rgba.copy()
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if (r, g, b) in pair:
                lc, sc = pair[(r, g, b)]
                t = soft[x, y] / 255
                op[x, y] = tuple(round(sc[i] + (lc[i] - sc[i]) * t) for i in range(3)) + (a,)
    return out


def render_rgba(name, redo=False):
    """The softened maquette, transparent around it (cached by spec and tones, in the cache folder)."""
    L.ISO["tones"]["occludedRatio"] = 0  # no cast shadow anywhere
    work = CACHE / "peinture"
    work.mkdir(parents=True, exist_ok=True)
    spec, _ = painting_spec(name)
    stem = name.replace("/", "_")
    key = hashlib.sha1((json.dumps(spec, sort_keys=True) + pathlib.Path(__file__).read_text() + str(LOCAL_LIGHT)).encode()).hexdigest()[:10]
    done = work / f"{stem}.{key}.png"
    if done.exists() and not redo:
        return Image.open(done).convert("RGBA")
    bare = work / f"{stem}.json"
    bare.write_text(json.dumps(spec))
    rgba_path = work / f"{stem}.rgba.png"
    L.blender(bare, rgba_path, socle_shadow=False)
    rgba = soften(Image.open(rgba_path).convert("RGBA"), Image.open(rgba_path.with_suffix(".classes.png")).convert("RGB"))
    rgba.save(done)
    return rgba


def render(name, out, mask_out=None):
    rgba = render_rgba(name)
    canvas = Image.new("RGB", rgba.size, MAGENTA)
    canvas.paste(rgba.convert("RGB"), (0, 0), rgba.getchannel("A"))
    canvas.save(out)
    if mask_out:  # the slab's footprint, from the same spec with its slab and no building
        spec, plate = painting_spec(name)
        work = CACHE / "peinture"
        (work / f"{name.replace('/', '_')}.slab.json").write_text(json.dumps(dict(spec, parts=plate)))
        slab = work / f"{name.replace('/', '_')}.slab.rgba.png"
        L.blender(work / f"{name.replace('/', '_')}.slab.json", slab, socle_shadow=False)
        Image.open(slab).convert("RGBA").getchannel("A").point(lambda v: 255 if v >= 128 else 0).save(mask_out)
    return canvas


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("out", type=pathlib.Path)
    ap.add_argument("--mask", type=pathlib.Path)
    a = ap.parse_args()
    if a.out.exists():
        sys.exit(f"{a.out} exists: never overwritten")
    render(a.name, a.out, a.mask)
