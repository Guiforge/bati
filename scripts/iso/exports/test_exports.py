#!/usr/bin/env python3
"""Self-check of the per-stage exports (L1-T01), no Blender needed:

    python3 scripts/iso/exports/test_exports.py

For every blockout spec: the eight exports of isoSpec.json `exportsParStade` are there and read;
the ground shadow recomputed from the exported volumes under the moon falls on the exported one to
1 px; every px coordinate (shadow, pools, anchor points) agrees with its grid twin through
isoSpec.json `cellToScreen` to 1 px; the masks match the parts that should make them; the mock-up
WebP is lossless, under 60 KB per 2x2 canvas of pixels, on the same canvas and anchor as the render.
"""

import json
import math
import sys

from PIL import ImageChops, ImageStat

import accroches as A
import heights as Hg
import light_check
import stage_exports as X

L = X.L
ISO = L.ISO
S, K = ISO["S"], ISO["pxPerUnit"]
LX, LY, LZ = ISO["moon"]["L"]
NAMES = ISO["pointsAccroche"]["noms"]
# 60 KB on the 2x2 canvas, the same budget per pixel on the others (a 2x3 canvas has 1.36x the pixels).
MAX_MOCKUP_PER_PX = 60 * 1024 / (896 * 1344)


def screen(info, canvas):
    """Grid [gx, gy, z] -> canvas px: accroches.screen, held to a hand-made camera by test_accroches.py."""
    return A.screen(info, canvas, ISO)


def gap(a, b):
    return max(max(Hg.dist_to_polygon(p, b) for p in a), max(Hg.dist_to_polygon(p, a) for p in b))


def check(slug, fail):
    stem = L.RENDERS / slug
    info = json.loads(stem.with_suffix(".anchor.json").read_text())
    canvas = ISO["canvases"][info["canvas"]]
    size = (canvas["w"], canvas["h"])
    to = screen(info, canvas)
    ax, ay = info["anchor"]

    # The eight exports, each where the index says.
    exports = info.get("exports", {})
    fail(sorted(exports) == sorted(ISO["exportsParStade"]), f"exports {sorted(exports)}")
    images = {}
    for name, where in exports.items():
        if where.startswith("#"):
            fail(where[1:] in info, f"{name}: no key {where}")
        else:
            image = L.Image.open(stem.with_suffix(where))
            fail(image.size == size, f"{name}: {image.size} vs {size}")
            images[name] = image.convert("L")

    # Shadow from the volumes, part by part, under the moon: on the exported polygons.
    casting = [v for v in info["volumes"] if not v["emissive"] and not v["noShadow"]]
    fail(len(casting) == len(info["shadow"]), f"{len(casting)} casting volumes, {len(info['shadow'])} shadows")
    worst = 0.0
    for vol, sh in zip(casting, info["shadow"]):
        ground = Hg.hull([(x - z * LX / LZ, y + z * LY / LZ) for x, y, z in vol["vertices"]])
        mine = [(px - ax, py - ay) for px, py in map(to, ground)]
        worst = max(worst, gap(mine, [tuple(p) for p in sh["px"]]))
        fail(gap(ground, [tuple(p) for p in sh["grid"]]) <= 1 / 192, f"shadow grid of part {vol['part']}")
        fail(sh["part"] == vol["mat"], f"shadow part {sh['part']} vs volume {vol['mat']}")
    fail(worst <= 1.0, f"recomputed shadow {worst:.3f} px from the exported one")

    for pool in info["pools"]:
        mine = [(px - ax, py - ay) for px, py in map(to, pool["grid"])]
        fail(max(math.dist(a, b) for a, b in zip(mine, pool["px"])) <= 1.0, "pool px vs grid")

    # Anchor points: the names of the spec, px and grid in agreement, null where the part is absent.
    hooks = info["pointsAccroche"]
    spec = json.loads((L.BLOCKOUTS / f"{slug}.json").read_text())
    tags = {p.get("accroche") for p in spec["parts"]}
    for form in ("px", "grid"):
        fail(list(hooks[form]) == NAMES, f"pointsAccroche.{form} keys {list(hooks[form])}")
    has_roof = any(v["roof"] for v in info["volumes"])
    fail((hooks["grid"]["faite"] is not None) == has_roof, "faite iff a roof")
    fail((hooks["grid"]["porte"] is not None) == ("porte" in tags), "porte iff a tagged door")
    fail((hooks["grid"]["cheminee"] is not None) == ("cheminee" in tags), "cheminee iff a tagged chimney")
    fail(bool(hooks["grid"]["avantToits"]) == has_roof, "avantToits iff a roof")
    for name in NAMES:
        g, p = hooks["grid"][name], hooks["px"][name]
        pairs = [] if g is None else list(zip(g, p)) if name == "avantToits" else [(g, p)]
        for gp, pp in pairs:
            fail(math.dist(to(gp), pp) <= 0.01, f"{name} px {pp} vs grid {gp} -> {to(gp)}")
            fail(0 <= pp[0] < size[0] and 0 <= pp[1] < size[1], f"{name} off the canvas: {pp}")

    # foyer and fenetres (L5-T03): a hearth iff a fire or ember volume, panes seen and sized, px = grid.
    foyer = hooks["foyer"]
    fail((foyer is not None) == any(v["mat"] in ("fire", "ember") for v in info["volumes"]), "foyer iff fire/ember")
    for pt in ([foyer] if foyer else []) + hooks["fenetres"]:
        # grid is rounded to 4 decimals, px is not: 0.05 px covers that
        fail(math.dist(to(pt["grid"]), pt["px"]) <= 0.05, f"point px {pt['px']} vs grid {pt['grid']}")
        fail(0 <= pt["px"][0] < size[0] and 0 <= pt["px"][1] < size[1], f"point off the canvas: {pt['px']}")
    fail(foyer is None or foyer["demiLargeur"] > 0, "foyer demiLargeur")
    for w in hooks["fenetres"]:
        fail(w["largeur"] > 0 and w["hauteur"] > 0 and w["face"] in ("gauche", "droite"), f"fenetre {w}")

    # Masks: emissive and roof only where such parts are, inside the tap mask.
    tap = images["masqueTap"]
    for name, flag in (("masqueEmissif", "emissive"), ("masqueToit", "roof")):
        mask = images[name]
        lit = mask.histogram()[255]
        fail((lit > 0) == any(v[flag] for v in info["volumes"]), f"{name}: {lit} px")
        outside = ImageChops.subtract(mask, tap).histogram()[255]
        fail(outside <= 0.01 * max(lit, 1), f"{name}: {outside} px outside the tap mask")

    # The mock-up: lossless copy of the render, small enough, its sidecar on the same anchor.
    out = X.mockup_path(slug)
    fail(out.stat().st_size <= MAX_MOCKUP_PER_PX * size[0] * size[1], f"mock-up {out.stat().st_size} bytes")
    webp, rgba = L.Image.open(out).convert("RGBA"), L.Image.open(stem.with_suffix(".rgba.png")).convert("RGBA")
    meta = json.loads(out.with_suffix(".json").read_text())
    if slug.startswith("pieces/animal_"):
        # recadrer_animaux.py: a lossy (q90) crop shared by the three poses, the sidecar anchor shifted with it.
        ox, oy = (round(a - b) for a, b in zip(info["anchor"], meta["anchor"]))
        crop = rgba.crop((ox, oy, ox + webp.width, oy + webp.height))
        fail(webp.size == tuple(meta["size"]), "mock-up sidecar size")
        box = rgba.getchannel("A").getbbox()
        fail(box is not None and box[0] >= ox and box[1] >= oy and box[2] <= ox + webp.width and box[3] <= oy + webp.height,
             "mock-up crop cuts the render")
        fail(max(ImageStat.Stat(ImageChops.difference(webp, crop)).mean) <= 1.5, "mock-up differs from the render crop")
        return worst
    fail(webp.size == size and ImageChops.difference(webp, rgba).getbbox() is None, "mock-up differs from the render")
    fail(meta["anchor"] == info["anchor"] and meta["size"] == list(size), "mock-up sidecar anchor or size")
    return worst


def main():
    failures = []
    slugs = X.all_slugs()
    for slug in slugs:
        def fail(ok, what, slug=slug):
            if not ok:
                failures.append(f"{slug}: {what}")
        worst = check(slug, fail)
        print(f"{slug}: shadow from volumes within {worst:.3f} px")
    if light_check.main():
        failures.append("light: a stage has no material judgeable by iso_audit.light (light_check.py)")
    print("\n".join(failures) or f"ok: {len(slugs)} stages, 8 exports each")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
