#!/usr/bin/env python3
"""Windmill r1 final paint, step 1: the two guides (0 $). Outputs in windmill/r1/final/maquettes/, never overwritten.

    python3 scripts/bld/final_guides.py sails_rough   # blade 1's patch is a real pair of breeches, gallery colours
    python3 scripts/bld/final_guides.py rubans        # ribbons without per-step lines, a frayed edge, ink on one side only

The ribbons were 60 cone steps, each with its own ink outline: that drew the little cross bars and a double black line where
two steps meet. Now the Blender pass runs with no lines at all, and the ink is added here, on the lower right edge only
(light from the upper left), with the edge itself frayed by a noise warp and a ragged rim.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import gen_cartes  # noqa: E402
import maquette_peinture as M  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image, ImageFilter  # noqa: E402

R1 = pathlib.Path("/home/guiforge/Documents/code/bati/.claude/worktrees/iso/docs/designs/village-buildings/windmill/r1")
OUT = R1 / "final" / "maquettes"
INK = (15, 21, 24)


def _noise(shape, sigma, rng):
    n = Image.fromarray(rng.integers(0, 256, shape, dtype=np.uint8)).filter(ImageFilter.GaussianBlur(sigma))
    a = np.asarray(n, float)
    return (a - a.mean()) / max(a.std(), 1e-6)


def rubans_render(name="pilote/windmill_rubans", lines=False):
    """The softened ribbons maquette with no ink lines (RGBA, transparent around it)."""
    M.LOCAL_LIGHT = True
    M.L.ISO["tones"]["occludedRatio"] = 0
    spec, _ = M.painting_spec(name)
    work = M.CACHE / "peinture"
    work.mkdir(parents=True, exist_ok=True)
    stem = name.replace("/", "_") + "_nolines"
    bare = work / f"{stem}.json"
    bare.write_text(json.dumps(spec))
    rgba_path = work / f"{stem}.rgba.png"
    M.L.blender(bare, rgba_path, lines=lines, socle_shadow=False)
    return M.soften(Image.open(rgba_path).convert("RGBA"), Image.open(rgba_path.with_suffix(".classes.png")).convert("RGB"))


def fray_and_ink(rgba, seed=7):
    """Frayed alpha (a smooth warp of 2.5 px plus a ragged 3 px rim) and a 5 px ink line on the lower right side only."""
    rng = np.random.default_rng(seed)
    a = np.asarray(rgba, np.uint8).copy()
    h, w = a.shape[:2]
    alpha = a[..., 3] >= 128
    yy, xx = np.mgrid[0:h, 0:w]
    dx, dy = _noise((h, w), 4.0, rng) * 1.6, _noise((h, w), 4.0, rng) * 1.6
    sx, sy = np.clip(np.rint(xx + dx), 0, w - 1).astype(int), np.clip(np.rint(yy + dy), 0, h - 1).astype(int)
    rgb = a[..., :3][sy, sx]
    m = alpha[sy, sx]
    mi = Image.fromarray((m * 255).astype(np.uint8))
    rim = m & ~(np.asarray(mi.filter(ImageFilter.MinFilter(5))) > 0)  # the 2 px band along the edge
    keep = _noise((h, w), 1.3, rng) > -0.55  # a few fibres missing from the rim
    m = m & (~rim | keep)
    # frays: short fibres leaving the edge on the upper left side, a 1 px hair of the ribbon's own colour
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = rgb
    out[..., 3] = m * 255
    # ink on one side: the mask shifted down right by (5, 6), minus the mask itself, kept ragged by the same noise
    ink = np.zeros((h, w), bool)
    sh = np.zeros_like(m)
    for k in range(1, 6):  # a sweep of shifts so the band is solid, not two ghosts
        sh[k:, k - 1:] |= m[:h - k, :w - k + 1]
    ink = sh & ~m
    ink &= _noise((h, w), 2.0, rng) > -1.6
    out[ink, :3] = INK
    out[ink, 3] = 255
    return Image.fromarray(out)


def rubans():
    OUT.mkdir(parents=True, exist_ok=True)
    f = OUT / "rubans.peinture.png"
    if f.exists():
        sys.exit(f"{f} exists: never overwritten")
    im = fray_and_ink(rubans_render())
    im.save(OUT / "rubans.rgba.png")
    canvas = Image.new("RGB", im.size, M.MAGENTA)
    canvas.paste(im.convert("RGB"), (0, 0), im.getchannel("A"))
    canvas.save(f)


# breeches in blade coordinates (d from the hub along blade 1, u across), units of the sheet's 271.5 px
BREECHES = [(1.08, -.14), (1.08, .14), (.90, .14), (.50, .13), (.50, .022), (.78, .012), (.78, -.012), (.55, -.022), (.55, -.13), (.90, -.14)]
STRIPES = [(.72, .79), (.58, .65)]
FARINE, OCRE = (233, 226, 208), (196, 147, 74)
DIR1 = (-0.7071, -0.7071)  # blade 1 points up left on the sheet
PERP = (0.7071, -0.7071)


def _px(d, u, k=271.5):
    return (384 + k * (d * DIR1[0] + u * PERP[0]), 384 + k * (d * DIR1[1] + u * PERP[1]))


def draw_breeches(im):
    """One polygon, one outline: flour white, two ochre stripes across both legs, a darker side away from the light."""
    from PIL import ImageChops, ImageDraw
    s = 4  # supersample
    big = im.resize((im.width * s, im.height * s), Image.LANCZOS)
    poly = [tuple(v * s for v in _px(d, u)) for d, u in BREECHES]
    shape = Image.new("L", big.size, 0)
    ImageDraw.Draw(shape).polygon(poly, fill=255)
    layer = Image.new("RGB", big.size, FARINE)
    stripes = Image.new("L", big.size, 0)
    sd = ImageDraw.Draw(stripes)
    for d0, d1 in STRIPES:
        sd.polygon([tuple(v * s for v in _px(d, u)) for d, u in ((d0, -.2), (d0, .2), (d1, .2), (d1, -.2))], fill=255)
    layer.paste(Image.new("RGB", big.size, OCRE), (0, 0), ImageChops.multiply(stripes, shape))
    shade = Image.new("L", big.size, 0)
    ImageDraw.Draw(shade).polygon([tuple(v * s for v in _px(d, u)) for d, u in ((1.1, .09), (1.1, .2), (.4, .2), (.4, .07))], fill=90)
    layer.paste(Image.new("RGB", big.size, (150, 140, 118)), (0, 0), ImageChops.multiply(shade, shape))
    big.paste(layer, (0, 0), shape)
    ImageDraw.Draw(big).line(poly + [poly[0]], fill=(0, 0, 0), width=4 * s, joint="curve")
    return big.resize(im.size, Image.LANCZOS)


def sails_rough():
    OUT.mkdir(parents=True, exist_ok=True)
    f = OUT / "sails_rough.peinture.png"
    if f.exists():
        sys.exit(f"{f} exists: never overwritten")
    gen_cartes.sails_all()  # rewrites the six sail specs, only rough differs from what was committed (bare sheet)
    M.LOCAL_LIGHT = True
    tmp = OUT / "_sails_rough_bare.png"
    tmp.unlink(missing_ok=True)
    M.render("pilote/windmill_sails_rough", tmp)
    draw_breeches(Image.open(tmp).convert("RGB")).save(f)
    tmp.unlink()


if __name__ == "__main__":
    globals()[sys.argv[1]]()
