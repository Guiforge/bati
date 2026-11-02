#!/usr/bin/env python3
"""The maquette made for the painter (E5/E4, mara's corrections of E3): what FLUX is shown as image 1.

    python3 scripts/bld/maquette_peinture.py windmill_solid OUT.png [--mask OUT.mask.png]

From a stage's blockout spec: no cast shadows, no facets (two soft values per material, the lit/shade border blurred), a roof
in matte grey slate, a flag of rippled cloth instead of a box, knotted-neck sacks instead of cones, the stage's markers and
slab removed, and under it a ragged olive-and-earth ground patch dissolving into flat magenta. The ground patch only marks
the footprint; the painter is told it has no edge to keep. Dev only: Blender goes through isolib, like render_pilot.py.
"""
import argparse
import json
import math
import os
import pathlib
import random
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
OLIVE, EARTH = (0x6A, 0x74, 0x42), (0x7A, 0x5A, 0x38)
# [top, lit, shade]: top and lit are one value, so a material has two
DAY = {
    "stone": ["#BDB29C", "#BDB29C", "#8A8890"],
    "wood": ["#7A5A3C", "#7A5A3C", "#4E3C34"],
    "darkwood": ["#5E4430", "#5E4430", "#3A2E2C"],
    "tile": ["#8C8884", "#8C8884", "#5C5C66"],
    "iron": ["#5A5E62", "#5A5E62", "#3A3E48"],
    "canvas": ["#CDBF9C", "#CDBF9C", "#8E8478"],
    "banner": ["#A8432F", "#A8432F", "#6A3040"],
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
        if p["mat"] == "thatch":
            p = dict(p, mat="tile")
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


def soften(rgba, classes, radius=22):
    """Per material, two values (lit, shade) mixed by a blurred lit field: no polygon of light. The material comes from the
    pixel's exact flat colour (the render's material codes are too coarse to tell them apart)."""
    px, cl = rgba.load(), classes.load()
    w, h = rgba.size
    pair = {}
    for lit_hex, _, shade_hex in DAY.values():
        pair[L.hex_rgb(lit_hex)] = pair[L.hex_rgb(shade_hex)] = (L.hex_rgb(lit_hex), L.hex_rgb(shade_hex))
    lit = Image.new("L", (w, h), 0)
    lp = lit.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][:3] in pair and cl[x, y][1] < 140:
                lp[x, y] = 255
    soft = lit.filter(ImageFilter.GaussianBlur(radius)).load()
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


def ground(mask, seed=7):
    """Olive and earth mixed, edge frayed and dissolving: no slab edge, no diamond."""
    rnd = random.Random(seed)
    w, h = mask.size
    def noise(r):
        n = Image.effect_noise((w, h), 70)
        return n.filter(ImageFilter.GaussianBlur(r))
    mix = noise(40).point(lambda v: max(0, min(255, (v - 128) * 5 + 128)))
    tex = Image.composite(Image.new("RGB", (w, h), EARTH), Image.new("RGB", (w, h), OLIVE), mix)
    speck = Image.effect_noise((w, h), 60).filter(ImageFilter.GaussianBlur(1.5)).point(lambda v: 255 if v > 150 else 0)
    tex = Image.composite(Image.new("RGB", (w, h), (0x5A, 0x62, 0x38)), tex, speck.point(lambda v: v // 3))
    soft = mask.filter(ImageFilter.GaussianBlur(26))
    ragged = ImageChops.add(soft, noise(6).point(lambda v: v - 128), 1, 0)
    alpha = ragged.point(lambda v: max(0, min(255, (v - 100) * 4)))
    # fade the rim toward the key a little more, from the edge inward
    return tex, alpha.filter(ImageFilter.GaussianBlur(1.2))


def render(name, out, mask_out=None):
    L.ISO["tones"]["occludedRatio"] = 0  # no cast shadow anywhere
    work = CACHE / "peinture"
    work.mkdir(parents=True, exist_ok=True)
    spec, plate = painting_spec(name)
    bare = work / f"{name}.json"
    bare.write_text(json.dumps(spec))
    rgba_path = work / f"{name}.rgba.png"
    L.blender(bare, rgba_path, socle_shadow=False)
    rgba = Image.open(rgba_path).convert("RGBA")
    classes = Image.open(rgba_path.with_suffix(".classes.png")).convert("RGB")
    rgba = soften(rgba, classes)
    # the slab's footprint: the same spec with the slab, minus the building
    full = dict(spec, parts=plate + spec["parts"])
    (work / f"{name}.slab.json").write_text(json.dumps(full))
    slab_path = work / f"{name}.slab.rgba.png"
    L.blender(work / f"{name}.slab.json", slab_path, socle_shadow=False)
    slab = Image.open(slab_path).convert("RGBA").getchannel("A").point(lambda v: 255 if v >= 128 else 0)
    bld = rgba.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
    foot = ImageChops.subtract(slab, bld.filter(ImageFilter.MaxFilter(3)))
    tex, alpha = ground(ImageChops.lighter(foot, bld))
    canvas = Image.new("RGB", rgba.size, MAGENTA)
    canvas.paste(tex, (0, 0), alpha)
    canvas.paste(rgba.convert("RGB"), (0, 0), rgba.getchannel("A"))
    canvas.save(out)
    if mask_out:
        slab.save(mask_out)
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
